import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { calculateRicavo, calculateCostoDocenti, calculateBilancio } from "@gestionale/utils/bilancio-calculator";
import { calculateCentriCosto } from "@gestionale/utils/centri-costo-calculator";

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

      // Snapshot immutabile bilancio/centri-costo alla chiusura (transizione
      // -> CONCLUSA): "blocca" ricavo/costi alle tariffe vigenti ORA, così i
      // report Mod.5/6/7 non cambiano più retroattivamente se in futuro si
      // aggiorna un prezzo listino o una tariffa docente (vedi
      // packages/db/prisma/schema.prisma, modello BilancioAula per il
      // dettaglio del problema che risolve).
      if (data.stato === "CONCLUSA") {
        const aulaCompleta = await tx.aula.findUniqueOrThrow({
          where: { id: params.aulaId },
          include: {
            corso: { include: { listiniPrezzi: true } },
            iscrizioni: { where: { deletedAt: null } },
            docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
          },
        });

        const tipoErogazione = aulaCompleta.modalita === "FAD_ASINCRONA" ? "E_LEARNING" : "AULA_FAD";
        const listino = aulaCompleta.corso.listiniPrezzi.find((l) => l.tipoErogazione === tipoErogazione);
        const ricavo = calculateRicavo(tipoErogazione as any, listino ? Number(listino.costo) : 0, aulaCompleta.iscrizioni.length);
        const costoDocenti = calculateCostoDocenti(
          aulaCompleta.docentilezioni.map((dl) => ({
            oreEffettiveDocenza: Number(dl.oreEffettiveDocenza),
            tariffaOraria: Number(dl.docente.tariffaOraria),
            trasferAcosto: Number(dl.trasferAcosto),
          }))
        );
        const costoAffitto = Number(aulaCompleta.costoAffitto);
        const costoTotale = costoDocenti + costoAffitto;
        const bilancio = calculateBilancio(ricavo, costoTotale);

        await tx.bilancioAula.upsert({
          where: { aulaId: params.aulaId },
          create: {
            aulaId: params.aulaId,
            corsoTitolo: aulaCompleta.corso.titolo,
            modalita: aulaCompleta.modalita,
            discentiCount: aulaCompleta.iscrizioni.length,
            ricavo: bilancio.ricavo,
            costoDocenti,
            costoAffitto,
            costoTotale: bilancio.costoTotale,
            margine: bilancio.margine,
            marginePct: bilancio.marginePct,
          },
          update: {}, // immutabile: se esiste già (non dovrebbe, la state machine impedisce di richiudere), non lo tocchiamo
        });

        const distribuzione = calculateCentriCosto(costoTotale, aulaCompleta.iscrizioni);
        await tx.centroCostoSnapshot.deleteMany({ where: { aulaId: params.aulaId } });
        if (distribuzione.length > 0) {
          await tx.centroCostoSnapshot.createMany({
            data: distribuzione.map((d) => ({
              aulaId: params.aulaId,
              cantiere: d.cantiere,
              sottocantiere: d.sottocantiere,
              responsabile: d.responsabile,
              discentiCount: d.discentiCount,
              costoAttribuito: d.costoAttribuito,
            })),
          });
        }
      }

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
