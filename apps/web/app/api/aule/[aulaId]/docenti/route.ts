import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const assignDocenteSchema = z.object({
  docenteId: z.string(),
  oreEffettiveDocenza: z.number().min(0),
  trasferAcosto: z.number().min(0).default(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = assignDocenteSchema.parse(body);

    const docenteLezione = await db.docenteLezione.create({
      data: {
        aulaId: params.aulaId,
        docenteId: data.docenteId,
        oreEffettiveDocenza: data.oreEffettiveDocenza,
        trasferAcosto: data.trasferAcosto,
      },
      include: { docente: true },
    });

    return NextResponse.json({ success: true, docenteLezione });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const docenteLezioneId = searchParams.get("id");

  if (!docenteLezioneId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Soft-delete with substitution history: set dataFine
  await db.docenteLezione.update({
    where: { id: docenteLezioneId },
    data: { dataFine: new Date() },
  });

  return NextResponse.json({ success: true });
}
