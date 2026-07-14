import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { uploadFile, BUCKETS } from "@/lib/storage";
import { extractFieldsFromTemplate, COMMON_FIELD_MAPPINGS } from "@gestionale/utils/template-field-extractor";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await db.template.findMany({
    where: { deletedAt: null },
    include: { mappings: { include: { corso: true } }, campi: true },
    orderBy: { createdAt: "desc" },
  });

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

    if (!file || !nome) {
      return NextResponse.json({ error: "File and nome required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${Date.now()}_${file.name}`;

    const fileUrl = await uploadFile(BUCKETS.TEMPLATES, path, buffer, file.type);

    const template = await db.template.create({
      data: {
        nome,
        fileUrl,
        mimeType: file.type,
        creatoDay: user.id,
      },
    });

    // Auto-extract fields
    let extractedFields: any[] = [];
    try {
      extractedFields = await extractFieldsFromTemplate(buffer, file.type);

      for (const field of extractedFields) {
        await db.templateField.create({
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
