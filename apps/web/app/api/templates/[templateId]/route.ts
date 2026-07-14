import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const updateTemplateSchema = z.object({
  nome: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const template = await db.template.findUnique({
    where: { id: params.templateId },
    include: { mappings: { include: { corso: true } }, campi: true },
  });

  if (!template || template.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, template });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nome } = updateTemplateSchema.parse(body);

    const template = await db.template.update({
      where: { id: params.templateId },
      data: { nome },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.template.update({
    where: { id: params.templateId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
