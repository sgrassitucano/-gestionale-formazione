import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { downloadFile, BUCKETS } from "@/lib/storage";
import {
  generateDocxFromTemplate,
  generateHtmlFromTemplate,
  fillXlsxTemplate,
  resolveFieldMappings,
} from "@gestionale/utils/document-generator";

function discenteRowData(discente: any) {
  return {
    nomeCompleto: `${discente.cognome} ${discente.nome}`,
    dataNascita: discente.dataNascita ? new Date(discente.dataNascita).toLocaleDateString("it-IT") : "",
    luogoNascita: discente.luogoNascita || "",
    codiceFiscale: discente.codiceFiscale || "",
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("templateId");

  if (!templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  try {
    const [template, aula] = await Promise.all([
      db.template.findUnique({
        where: { id: templateId },
        include: { campi: true },
      }),
      db.aula.findUnique({
        where: { id: params.aulaId },
        include: {
          corso: true,
          luogo: true,
          iscrizioni: { include: { discente: true } },
          docentilezioni: { include: { docente: true } },
        },
      }),
    ]);

    if (!template || !aula) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // STATICO: passthrough, nessuna generazione
    if (template.tipoGenerazione === "STATICO") {
      const templatePath = new URL(template.fileUrl).pathname.split("/").pop()!;
      const templateBuffer = await downloadFile(BUCKETS.TEMPLATES, templatePath);
      return new NextResponse(new Uint8Array(templateBuffer), {
        headers: {
          "Content-Type": template.mimeType,
          "Content-Disposition": `attachment; filename="${template.nome}"`,
        },
      });
    }

    const primaryDocente = aula.docentilezioni[0]?.docente;
    const baseContext = {
      corso: aula.corso,
      aula,
      docente: primaryDocente,
    };

    const templatePath = new URL(template.fileUrl).pathname.split("/").pop()!;
    const templateBuffer = await downloadFile(BUCKETS.TEMPLATES, templatePath);
    const isDocx = template.mimeType.includes("wordprocessingml.document");
    const isXlsx = template.mimeType.includes("spreadsheetml");

    // PER_AULA_LISTA + XLSX: compila un foglio con una riga per discente (es. export EBAFOS/piattaforma)
    if (isXlsx && template.tipoGenerazione === "PER_AULA_LISTA") {
      if (aula.iscrizioni.length === 0) {
        return NextResponse.json({ error: "Nessun discente iscritto" }, { status: 400 });
      }

      const columnFields = template.campi.map((c) => ({ column: c.placeholder, sorgenteDato: c.sorgenteDato }));
      const rowContexts = aula.iscrizioni.map((i) => ({ ...baseContext, discente: i.discente }));
      const outputBuffer = await fillXlsxTemplate(templateBuffer, columnFields, rowContexts);

      return new NextResponse(new Uint8Array(outputBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${template.nome}_${aula.id}.xlsx"`,
        },
      });
    }

    // PER_DISCENTE: un documento per ogni discente iscritto, zippati insieme
    if (template.tipoGenerazione === "PER_DISCENTE") {
      if (aula.iscrizioni.length === 0) {
        return NextResponse.json({ error: "Nessun discente iscritto" }, { status: 400 });
      }

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const iscrizione of aula.iscrizioni) {
        const context = { ...baseContext, discente: iscrizione.discente };
        const data = resolveFieldMappings(
          template.campi.map((c) => ({ nomeCampo: c.nomeCampo, sorgenteDato: c.sorgenteDato })),
          context
        );

        const nomeFile = `${iscrizione.discente.cognome}_${iscrizione.discente.nome}`.replace(/\s+/g, "_");

        if (isDocx) {
          const buf = await generateDocxFromTemplate(templateBuffer, data);
          zip.file(`${template.nome}_${nomeFile}.docx`, buf);
        } else {
          const html = await generateHtmlFromTemplate(templateBuffer.toString("utf-8"), data);
          zip.file(`${template.nome}_${nomeFile}.html`, html);
        }
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${template.nome}_${aula.id}.zip"`,
        },
      });
    }

    // PER_AULA_LISTA: un documento per aula, con tabella discenti ripetuta via loop {{#discenti}}
    // PER_AULA_SEMPLICE: un documento per aula, nessun dato discente-specifico
    const context: Record<string, any> = { ...baseContext };
    if (template.tipoGenerazione === "PER_AULA_LISTA") {
      context.discenti = aula.iscrizioni.map((i) => discenteRowData(i.discente));
    } else {
      context.discente = aula.iscrizioni[0]?.discente;
    }

    const data = resolveFieldMappings(
      template.campi.map((c) => ({ nomeCampo: c.nomeCampo, sorgenteDato: c.sorgenteDato })),
      context
    );
    if (template.tipoGenerazione === "PER_AULA_LISTA") {
      data.discenti = context.discenti;
    }

    let outputBuffer: Buffer;
    let contentType: string;
    let filename: string;

    if (isDocx) {
      outputBuffer = await generateDocxFromTemplate(templateBuffer, data);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      filename = `${template.nome}_${aula.id}.docx`;
    } else {
      const html = await generateHtmlFromTemplate(templateBuffer.toString("utf-8"), data);
      outputBuffer = Buffer.from(html, "utf-8");
      contentType = "text/html";
      filename = `${template.nome}_${aula.id}.html`;
    }

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Generate document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
