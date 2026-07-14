import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: { aulaId: string; lezioneId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data: any = {};
    if (body.data) data.data = new Date(body.data);
    if (body.oraInizio) data.oraInizio = body.oraInizio;
    if (body.oraFine) data.oraFine = body.oraFine;

    const lezione = await db.lezione.update({
      where: { id: params.lezioneId },
      data,
    });

    return NextResponse.json({ success: true, lezione });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { aulaId: string; lezioneId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.lezione.update({
    where: { id: params.lezioneId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
