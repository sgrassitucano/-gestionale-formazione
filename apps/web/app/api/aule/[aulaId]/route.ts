import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const aula = await withUserContext(user, (tx) =>
    tx.aula.findUnique({
      where: { id: params.aulaId },
      include: {
        corso: true,
        luogo: true,
        lezioni: { where: { deletedAt: null }, orderBy: { data: "asc" } },
        iscrizioni: { where: { deletedAt: null }, include: { discente: true } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
        archivio: { where: { deletedAt: null } },
        chiusura: true,
      },
    })
  );

  if (!aula || aula.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, aula });
}

// Transizioni valide della state machine (Pianificata -> In Corso -> Conclusa,
// vedi CLAUDE.md). Nessun salto, nessun ritorno indietro: una volta Conclusa
// l'aula è definitiva (i report Mod.5/6/7 la considerano chiusa e la
// includono nei calcoli filtrando stato: CONCLUSA — riportarla indietro la
// farebbe silenziosamente sparire da quei report senza errore).
const TRANSIZIONI_VALIDE: Record<string, string[]> = {
  PIANIFICATA: ["IN_CORSO"],
  IN_CORSO: ["CONCLUSA"],
  CONCLUSA: [],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const aula = await withUserContext(user, async (tx) => {
      const existing = await tx.aula.findUnique({ where: { id: params.aulaId } });
      if (!existing || existing.deletedAt) {
        return { status: 404 as const, body: { error: "Aula non trovata" } };
      }

      if (existing.stato === "CONCLUSA") {
        return {
          status: 409 as const,
          body: { error: "Aula conclusa: non è più modificabile (luogo, date, stato)" },
        };
      }

      const allowedFields = ["luogoId", "stato", "dataInizio", "dataFine"];
      const data: any = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) {
          data[key] = key.includes("data") && body[key] ? new Date(body[key]) : body[key];
        }
      }

      if (data.stato !== undefined && data.stato !== existing.stato) {
        const permesse = TRANSIZIONI_VALIDE[existing.stato] ?? [];
        if (!permesse.includes(data.stato)) {
          return {
            status: 409 as const,
            body: { error: `Transizione di stato non valida: ${existing.stato} -> ${data.stato}` },
          };
        }
      }

      const updated = await tx.aula.update({ where: { id: params.aulaId }, data });

      await tx.logAudit.create({
        data: {
          utenteId: user.id,
          azione: "AGGIORNA_AULA",
          tabella: "Aula",
          recordId: params.aulaId,
          dettagli: { campiModificati: Object.keys(data), statoPrecedente: existing.stato },
        },
      });

      return { status: 200 as const, body: { success: true, aula: updated } };
    });

    return NextResponse.json(aula.body, { status: aula.status });
  } catch (error) {
    console.error("Update aula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
