import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const updateDocenteSchema = z.object({
  nome: z.string().optional(),
  cognome: z.string().optional(),
  email: z.string().email().optional(),
  tariffaOraria: z.number().min(0).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateDocenteSchema.parse(body);

    const docente = await db.docente.update({ where: { id: params.id }, data });

    return NextResponse.json({ success: true, docente });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.docente.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

  return NextResponse.json({ success: true });
}
