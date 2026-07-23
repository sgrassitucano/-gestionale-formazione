import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { hasRuolo, RUOLI_PREFATTURAZIONE_CENTRI_COSTO } from "@/lib/permessi";
import { calculateCostoPiattaforma } from "@gestionale/utils/bilancio-calculator";

function monthRange(mese: string) {
  const [year, month] = mese.split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59) };
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!hasRuolo(user, RUOLI_PREFATTURAZIONE_CENTRI_COSTO)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mese = searchParams.get("mese");
  if (!mese) return NextResponse.json({ error: "mese richiesto (YYYY-MM)" }, { status: 400 });

  const { start, end } = monthRange(mese);

  const aule = await withUserContext(user, (tx) =>
    tx.aula.findMany({
      // stato: CONCLUSA — senza, proponeva di fatturare corsi ancora
      // PIANIFICATA/IN_CORSO (non svolti, potenzialmente annullabili),
      // in contrasto col trigger dichiarato in CLAUDE.md per Modulo 5.
      where: { deletedAt: null, dataInizio: { gte: start, lte: end }, stato: "CONCLUSA" },
      include: {
        corso: { include: { listiniPrezzi: true } },
        luogo: true,
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
        bilancio: true,
      },
    })
  );

  // Preferisce lo snapshot immutabile (vedi BilancioAula in schema.prisma):
  // l'importo da fatturare deve combaciare con quanto poi appare nei report
  // Mod.6, non ricalcolato al prezzo di OGGI se cambiato nel frattempo.
  const singole = aule
    .filter((a) => a.modalita === "PRESENZA" || a.modalita === "FAD_SINCRONA")
    .map((a) => {
      if (a.bilancio) {
        return {
          aulaId: a.id,
          corso: a.corso.titolo,
          modalita: a.modalita,
          luogo: a.luogo?.nome ?? "",
          discentiCount: a.bilancio.discentiCount,
          dataInizio: a.dataInizio,
          importoDaFatturare: Number(a.bilancio.ricavo),
          costoAtteso: {
            docenti: Number(a.bilancio.costoDocenti),
            affitto: Number(a.bilancio.costoAffitto),
            piattaforma: Number(a.bilancio.costoPiattaforma),
            totale: Number(a.bilancio.costoTotale),
          },
        };
      }

      const listino = a.corso.listiniPrezzi.find((l) => l.tipoErogazione === "AULA_FAD");
      const importo = listino ? Number(listino.costo) : 0;
      const costoDocenti = a.docentilezioni.reduce(
        (sum, dl) => sum + Number(dl.oreEffettiveDocenza) * Number(dl.docente.tariffaOraria) + Number(dl.trasferAcosto),
        0
      );
      const costoPiattaforma = calculateCostoPiattaforma(
        listino?.costoPiattaformaPerDiscente != null ? Number(listino.costoPiattaformaPerDiscente) : null,
        a.iscrizioni.length
      );

      return {
        aulaId: a.id,
        corso: a.corso.titolo,
        modalita: a.modalita,
        luogo: a.luogo?.nome ?? "",
        discentiCount: a.iscrizioni.length,
        dataInizio: a.dataInizio,
        importoDaFatturare: importo,
        costoAtteso: {
          docenti: costoDocenti,
          affitto: Number(a.costoAffitto),
          piattaforma: costoPiattaforma,
          totale: costoDocenti + Number(a.costoAffitto) + costoPiattaforma,
        },
      };
    });

  // Prezzo e-learning per aula, non un unico prezzo globale preso dalla
  // prima aula del mese: con più corsi asincroni a listino diverso nello
  // stesso mese, usare asincrone[0] applicava il prezzo di UN corso a
  // TUTTI i discenti (sotto/sovra-fatturazione reale), e senza orderBy
  // "il primo" non era nemmeno deterministico tra una run e l'altra.
  const asincrone = aule.filter((a) => a.modalita === "FAD_ASINCRONA");
  const asincroneConImporto = asincrone.map((a) => {
    if (a.bilancio) {
      const discentiCount = a.bilancio.discentiCount;
      const importo = Number(a.bilancio.ricavo);
      return {
        aulaId: a.id,
        corso: a.corso.titolo,
        discentiCount,
        costoUnitario: discentiCount > 0 ? importo / discentiCount : 0,
        importo,
      };
    }
    const listino = a.corso.listiniPrezzi.find((l) => l.tipoErogazione === "E_LEARNING");
    const costoUnitario = listino ? Number(listino.costo) : 0;
    return {
      aulaId: a.id,
      corso: a.corso.titolo,
      discentiCount: a.iscrizioni.length,
      costoUnitario,
      importo: costoUnitario * a.iscrizioni.length,
    };
  });
  const totalDiscentiAsincrone = asincroneConImporto.reduce((sum, a) => sum + a.discentiCount, 0);
  const importoAsincrone = asincroneConImporto.reduce((sum, a) => sum + a.importo, 0);

  return NextResponse.json({
    success: true,
    mese,
    singole,
    aggregato: {
      aule: asincroneConImporto,
      totalDiscenti: totalDiscentiAsincrone,
      importoDaFatturare: importoAsincrone,
    },
  });
}
