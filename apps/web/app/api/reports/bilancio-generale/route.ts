import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { hasRuolo, RUOLI_REPORT_KPI } from "@/lib/permessi";
import { withUserContext } from "@gestionale/db/context";
import { calculateRicavo, calculateCostoDocenti } from "@gestionale/utils/bilancio-calculator";

// Conta quanti mesi (inclusivi) intercorrono tra due date allo stesso "anno-mese"
function countMonthsOverlap(voceStart: Date, voceEnd: Date | null, rangeStart: Date, rangeEnd: Date): number {
  const effectiveStart = voceStart > rangeStart ? voceStart : rangeStart;
  const effectiveEndRaw = voceEnd && voceEnd < rangeEnd ? voceEnd : rangeEnd;
  if (effectiveStart > effectiveEndRaw) return 0;

  const startMonths = effectiveStart.getFullYear() * 12 + effectiveStart.getMonth();
  const endMonths = effectiveEndRaw.getFullYear() * 12 + effectiveEndRaw.getMonth();
  return Math.max(0, endMonths - startMonths + 1);
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!hasRuolo(user, RUOLI_REPORT_KPI)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const daParam = searchParams.get("da"); // YYYY-MM
  const aParam = searchParams.get("a"); // YYYY-MM

  const now = new Date();
  const defaultDa = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const da = daParam || defaultDa;
  const a = aParam || defaultDa;

  const [daY, daM] = da.split("-").map(Number);
  const [aY, aM] = a.split("-").map(Number);
  const rangeStart = new Date(daY, daM - 1, 1);
  const rangeEnd = new Date(aY, aM, 0, 23, 59, 59);

  // Entrate/uscite derivate dalle aule
  const { aule, voci } = await withUserContext(user, async (tx) => {
    const aule = await tx.aula.findMany({
      where: { deletedAt: null, stato: "CONCLUSA", dataInizio: { gte: rangeStart, lte: rangeEnd } },
      include: {
        corso: { include: { listiniPrezzi: true } },
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
        bilancio: true,
      },
    });

    const voci = await tx.voceContabile.findMany({
      where: {
        deletedAt: null,
        dataInizio: { lte: rangeEnd },
        OR: [{ dataFine: null }, { dataFine: { gte: rangeStart } }],
      },
    });

    return { aule, voci };
  });

  let entrateAule = 0;
  let usciteDocenti = 0;
  let usciteAffitto = 0;

  for (const aula of aule) {
    // Preferisce lo snapshot immutabile (vedi BilancioAula in
    // schema.prisma); fallback al calcolo live solo per aule concluse
    // prima dell'introduzione dello snapshot e non ancora backfillate.
    if (aula.bilancio) {
      entrateAule += Number(aula.bilancio.ricavo);
      usciteDocenti += Number(aula.bilancio.costoDocenti);
      usciteAffitto += Number(aula.bilancio.costoAffitto);
      continue;
    }
    const tipoErogazione = aula.modalita === "FAD_ASINCRONA" ? "E_LEARNING" : "AULA_FAD";
    const listino = aula.corso.listiniPrezzi.find((l) => l.tipoErogazione === tipoErogazione);
    entrateAule += calculateRicavo(tipoErogazione as any, listino ? Number(listino.costo) : 0, aula.iscrizioni.length);
    usciteDocenti += calculateCostoDocenti(
      aula.docentilezioni.map((dl) => ({
        oreEffettiveDocenza: Number(dl.oreEffettiveDocenza),
        tariffaOraria: Number(dl.docente.tariffaOraria),
        trasferAcosto: Number(dl.trasferAcosto),
      }))
    );
    usciteAffitto += Number(aula.costoAffitto);
  }

  const categorie: Record<string, { entrate: number; uscite: number }> = {
    Aule: { entrate: entrateAule, uscite: 0 },
    Docenti: { entrate: 0, uscite: usciteDocenti },
    "Affitto Locali": { entrate: 0, uscite: usciteAffitto },
  };

  const vociDettaglio: any[] = [];

  for (const voce of voci) {
    const mesi = voce.ricorrente
      ? countMonthsOverlap(voce.dataInizio, voce.dataFine, rangeStart, rangeEnd)
      : voce.dataInizio >= rangeStart && voce.dataInizio <= rangeEnd
        ? 1
        : 0;

    if (mesi === 0) continue;

    const importoTotale = Number(voce.importo) * mesi;

    if (!categorie[voce.categoria]) categorie[voce.categoria] = { entrate: 0, uscite: 0 };
    if (voce.tipo === "ENTRATA") categorie[voce.categoria].entrate += importoTotale;
    else categorie[voce.categoria].uscite += importoTotale;

    vociDettaglio.push({
      id: voce.id,
      descrizione: voce.descrizione,
      categoria: voce.categoria,
      tipo: voce.tipo,
      importoMensile: Number(voce.importo),
      mesiConteggiati: mesi,
      importoTotale,
      ricorrente: voce.ricorrente,
    });
  }

  const totaleEntrate = Object.values(categorie).reduce((s, c) => s + c.entrate, 0);
  const totaleUscite = Object.values(categorie).reduce((s, c) => s + c.uscite, 0);

  return NextResponse.json({
    success: true,
    periodo: { da, a },
    categorie,
    totaleEntrate,
    totaleUscite,
    margine: totaleEntrate - totaleUscite,
    vociManuali: vociDettaglio,
    auleCount: aule.length,
  });
}
