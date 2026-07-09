import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.template.update({
    where: { id: params.templateId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
