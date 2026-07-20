import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { withUserContext } from "@gestionale/db/context";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ success: true, discenti: [] });

  // nome/cognome/codiceFiscale sono cifrati a riposo: nessuna query SQL
  // "contains" è possibile su un valore cifrato. Carichiamo un set ragionevole
  // di candidati (il middleware li decifra in automatico in lettura) e
  // filtriamo in memoria — accettabile alla scala di una singola agenzia
  // (centinaia/migliaia di discenti, non milioni).
  const candidati = await withUserContext(user, (tx) =>
    tx.discente.findMany({
      where: { deletedAt: null },
      include: {
        azienda: true,
        iscrizioni: {
          where: { deletedAt: null },
          include: { aula: { include: { corso: true, luogo: true } } },
          orderBy: { aula: { dataInizio: "desc" } },
        },
      },
      take: 5000,
    })
  );

  const qLower = q.toLowerCase();
  const discenti = candidati
    .filter(
      (d) =>
        d.nome?.toLowerCase().includes(qLower) ||
        d.cognome?.toLowerCase().includes(qLower) ||
        d.codiceFiscale?.toLowerCase().includes(qLower)
    )
    .slice(0, 30);

  return NextResponse.json({ success: true, discenti });
}
