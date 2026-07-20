import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { withUserContext } from "@gestionale/db/context";
import { uploadFile, BUCKETS } from "@/lib/storage";
import { extractFieldsFromTemplate, COMMON_FIELD_MAPPINGS } from "@gestionale/utils/template-field-extractor";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await withUserContext(user, (tx) =>
    tx.template.findMany({
      where: { deletedAt: null },
      include: { mappings: { include: { corso: true } }, campi: true },
      orderBy: { createdAt: "desc" },
    })
  );

  return NextResponse.json({ success: true, templates });
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const nome = formData.get("nome") as string;
    const tipoGenerazione = (formData.get("tipoGenerazione") as string) || "PER_AULA_SEMPLICE";

    if (!file || !nome) {
      return NextResponse.json({ error: "File and nome required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${Date.now()}_${file.name}`;

    const fileUrl = await uploadFile(BUCKETS.TEMPLATES, path, buffer, file.type);

    const { template, extractedFields } = await withUserContext(user, async (tx) => {
      const template = await tx.template.create({
        data: {
          nome,
          fileUrl,
          mimeType: file.type,
          tipoGenerazione: tipoGenerazione as any,
          creatoDay: user.id,
        },
      });

      // Auto-extract fields (non per i template statici, non generati)
      let extractedFields: any[] = [];
      if (tipoGenerazione !== "STATICO") {
        try {
          extractedFields = await extractFieldsFromTemplate(buffer, file.type);

          for (const field of extractedFields) {
            await tx.templateField.create({
              data: {
                templateId: template.id,
                nomeCampo: field.nomeCampo,
                placeholder: field.placeholder,
                sorgenteDato: COMMON_FIELD_MAPPINGS[field.nomeCampo] || "",
              },
            });
          }
        } catch (extractError) {
          console.error("Field extraction error:", extractError);
        }
      }

      return { template, extractedFields };
    });

    return NextResponse.json({
      success: true,
      template,
      extractedFields,
    });
  } catch (error) {
    console.error("Upload template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
