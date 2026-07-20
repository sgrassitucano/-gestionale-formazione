import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";

function monthRange(mese: string) {
  const [year, month] = mese.split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59) };
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mese = searchParams.get("mese");
  if (!mese) return NextResponse.json({ error: "mese richiesto (YYYY-MM)" }, { status: 400 });

  const { start, end } = monthRange(mese);

  const aule = await withUserContext(user, (tx) =>
    tx.aula.findMany({
      where: { deletedAt: null, dataInizio: { gte: start, lte: end } },
      include: {
        corso: { include: { listiniPrezzi: true } },
        luogo: true,
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
      },
    })
  );

  const singole = aule
    .filter((a) => a.modalita === "PRESENZA" || a.modalita === "FAD_SINCRONA")
    .map((a) => {
      const listino = a.corso.listiniPrezzi.find((l) => l.tipoErogazione === "AULA_FAD");
      const importo = listino ? Number(listino.costo) : 0;
      const costoDocenti = a.docentilezioni.reduce(
        (sum, dl) => sum + Number(dl.oreEffettiveDocenza) * Number(dl.docente.tariffaOraria) + Number(dl.trasferAcosto),
        0
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
          totale: costoDocenti + Number(a.costoAffitto),
        },
      };
    });

  const asincrone = aule.filter((a) => a.modalita === "FAD_ASINCRONA");
  const totalDiscentiAsincrone = asincrone.reduce((sum, a) => sum + a.iscrizioni.length, 0);

  let importoAsincrone = 0;
  if (asincrone.length > 0) {
    const listino = asincrone[0].corso.listiniPrezzi.find((l) => l.tipoErogazione === "E_LEARNING");
    const costoUnitario = listino ? Number(listino.costo) : 0;
    importoAsincrone = costoUnitario * totalDiscentiAsincrone;
  }

  return NextResponse.json({
    success: true,
    mese,
    singole,
    aggregato: {
      aule: asincrone.map((a) => ({ aulaId: a.id, corso: a.corso.titolo, discentiCount: a.iscrizioni.length })),
      totalDiscenti: totalDiscentiAsincrone,
      importoDaFatturare: importoAsincrone,
    },
  });
}
