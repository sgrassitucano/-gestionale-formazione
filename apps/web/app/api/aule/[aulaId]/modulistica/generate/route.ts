import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { downloadFile, BUCKETS } from "@/lib/storage";
import {
  generateDocxFromTemplate,
  generateHtmlFromTemplate,
  resolveFieldMappings,
} from "@gestionale/utils/document-generator";

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

    // For simplicity: generate one document per discente iscritto (or aula-level if no discente placeholder used)
    const primaryDiscente = aula.iscrizioni[0]?.discente;
    const primaryDocente = aula.docentilezioni[0]?.docente;

    const context = {
      discente: primaryDiscente,
      corso: aula.corso,
      aula,
      docente: primaryDocente,
    };

    const data = resolveFieldMappings(
      template.campi.map((c) => ({ nomeCampo: c.nomeCampo, sorgenteDato: c.sorgenteDato })),
      context
    );

    const templatePath = new URL(template.fileUrl).pathname.split("/").pop()!;
    const templateBuffer = await downloadFile(BUCKETS.TEMPLATES, templatePath);

    let outputBuffer: Buffer;
    let contentType: string;
    let filename: string;

    if (template.mimeType.includes("wordprocessingml")) {
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
