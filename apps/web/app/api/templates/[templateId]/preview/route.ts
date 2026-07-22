import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { withUserContext } from "@gestionale/db/context";
import { downloadFile, BUCKETS } from "@/lib/storage";
import {
  generateDocxFromTemplate,
  generateHtmlFromTemplate,
  fillXlsxTemplate,
  resolveFieldMappings,
} from "@gestionale/utils/document-generator";

const SAMPLE_CONTEXT = {
  discente: {
    nome: "Mario",
    cognome: "Rossi",
    codiceFiscale: "RSSMRA80A01H501U",
    dataNascita: new Date("1980-01-01"),
  },
  corso: {
    titolo: "Formazione Generale Lavoratori",
    codice: "FORM_BASE",
  },
  aula: {
    luogo: { nome: "Sede di esempio" },
    dataInizio: new Date(),
    dataFine: new Date(),
  },
  docente: {
    nome: "Luigi",
    cognome: "Bianchi",
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const template = await withUserContext(user, (tx) =>
      tx.template.findUnique({
        where: { id: params.templateId },
        include: { campi: true },
      })
    );

    if (!template || template.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = resolveFieldMappings(
      template.campi.map((c) => ({ nomeCampo: c.nomeCampo, sorgenteDato: c.sorgenteDato })),
      SAMPLE_CONTEXT
    );

    const templatePath = new URL(template.fileUrl).pathname.split("/").pop()!;
    const templateBuffer = await downloadFile(BUCKETS.TEMPLATES, templatePath);

    if (template.mimeType.includes("wordprocessingml")) {
      const outputBuffer = await generateDocxFromTemplate(templateBuffer, data);
      return new NextResponse(new Uint8Array(outputBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="anteprima_${template.nome}.docx"`,
        },
      });
    }

    if (template.mimeType.includes("spreadsheetml")) {
      const columnFields = template.campi.map((c) => ({ column: c.placeholder, sorgenteDato: c.sorgenteDato }));
      const outputBuffer = await fillXlsxTemplate(templateBuffer, columnFields, [SAMPLE_CONTEXT]);
      return new NextResponse(new Uint8Array(outputBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="anteprima_${template.nome}.xlsx"`,
        },
      });
    }

    const html = await generateHtmlFromTemplate(templateBuffer.toString("utf-8"), data);
    return NextResponse.json({ success: true, html });
  } catch (error) {
    console.error("Preview template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
