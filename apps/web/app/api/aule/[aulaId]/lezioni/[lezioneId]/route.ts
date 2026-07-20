import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
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

    const result = await withUserContext(user, async (tx) => {
      // Il parametro aulaId nell'URL era decorativo: la lezione veniva
      // aggiornata cercandola solo per lezioneId, senza verificare che
      // appartenesse davvero a quest'aula (un id di lezione di un'aula
      // diversa passava comunque).
      const existing = await tx.lezione.findUnique({ where: { id: params.lezioneId }, include: { aula: true } });
      if (!existing || existing.deletedAt || existing.aulaId !== params.aulaId) {
        return { status: 404 as const, body: { error: "Lezione non trovata per questa aula" } };
      }
      if (existing.aula.stato === "CONCLUSA") {
        return { status: 409 as const, body: { error: "Aula conclusa: lezioni non più modificabili" } };
      }

      const lezione = await tx.lezione.update({ where: { id: params.lezioneId }, data });
      return { status: 200 as const, body: { success: true, lezione } };
    });

    return NextResponse.json(result.body, { status: result.status });
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

  const result = await withUserContext(user, async (tx) => {
    const existing = await tx.lezione.findUnique({ where: { id: params.lezioneId }, include: { aula: true } });
    if (!existing || existing.deletedAt || existing.aulaId !== params.aulaId) {
      return { status: 404 as const, body: { error: "Lezione non trovata per questa aula" } };
    }
    if (existing.aula.stato === "CONCLUSA") {
      return { status: 409 as const, body: { error: "Aula conclusa: lezioni non più modificabili" } };
    }

    await tx.lezione.update({ where: { id: params.lezioneId }, data: { deletedAt: new Date() } });
    return { status: 200 as const, body: { success: true } };
  });

  return NextResponse.json(result.body, { status: result.status });
}
