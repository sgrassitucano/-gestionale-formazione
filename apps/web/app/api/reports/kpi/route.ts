import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { calculateRicavo, calculateCostoDocenti, calculateBilancio } from "@gestionale/utils/bilancio-calculator";
import { buildRevenueTrend } from "@gestionale/utils/kpi-calculator";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dataInizioStr = searchParams.get("dataInizio");
  const dataFineStr = searchParams.get("dataFine");
  const corsoCodec = searchParams.get("corso");

  const where: any = { deletedAt: null };
  if (dataInizioStr && dataFineStr) {
    where.dataInizio = { gte: new Date(dataInizioStr), lte: new Date(dataFineStr) };
  }
  if (corsoCodec) where.corsoCodec = corsoCodec;

  const [aulesAttive, aulesConcluse, aule] = await Promise.all([
    db.aula.count({ where: { stato: { in: ["PIANIFICATA", "IN_CORSO"] }, deletedAt: null } }),
    db.aula.count({ where: { stato: "CONCLUSA", deletedAt: null } }),
    db.aula.findMany({
      where,
      include: {
        corso: { include: { listiniPrezzi: true } },
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
      },
    }),
  ]);

  const discentiPerCorso: Record<string, number> = {};
  const marginePerTipo: Record<string, number> = {};
  const revenueSnapshots: Array<{ dataChiusura: Date; ricavo: number }> = [];
  let discentiTotalCount = 0;
  let margineTotaleSum = 0;
  let ricavoTotaleSum = 0;

  for (const a of aule) {
    const tipoErogazione = a.modalita === "FAD_ASINCRONA" ? "E_LEARNING" : "AULA_FAD";
    const listino = a.corso.listiniPrezzi.find((l) => l.tipoErogazione === tipoErogazione);
    const ricavo = calculateRicavo(tipoErogazione as any, listino ? Number(listino.costo) : 0, a.iscrizioni.length);
    const costoDocenti = calculateCostoDocenti(
      a.docentilezioni.map((dl) => ({
        oreEffettiveDocenza: Number(dl.oreEffettiveDocenza),
        tariffaOraria: Number(dl.docente.tariffaOraria),
        trasferAcosto: Number(dl.trasferAcosto),
      }))
    );
    const bilancio = calculateBilancio(ricavo, costoDocenti + Number(a.costoAffitto));

    const corsoTitolo = a.corso.titolo;
    discentiPerCorso[corsoTitolo] = (discentiPerCorso[corsoTitolo] || 0) + a.iscrizioni.length;
    discentiTotalCount += a.iscrizioni.length;

    marginePerTipo[a.corso.tipo] = (marginePerTipo[a.corso.tipo] || 0) + bilancio.margine;
    margineTotaleSum += bilancio.margine;
    ricavoTotaleSum += bilancio.ricavo;

    if (a.dataInizio) revenueSnapshots.push({ dataChiusura: a.dataInizio, ricavo: bilancio.ricavo });
  }

  const costoMedioDiscente = discentiTotalCount > 0 ? margineTotaleSum / discentiTotalCount : 0;
  const revenueTrend = buildRevenueTrend(revenueSnapshots);

  return NextResponse.json({
    success: true,
    kpi: {
      aulesAttiveCount: aulesAttive,
      aulesConcluseCount: aulesConcluse,
      discentiTotalCount,
      discentiPerCorso,
      costoMedioDiscente,
      marginePerTipo,
      revenueTrend,
      ricavoTotale: ricavoTotaleSum,
      margineTotale: margineTotaleSum,
    },
  });
}
