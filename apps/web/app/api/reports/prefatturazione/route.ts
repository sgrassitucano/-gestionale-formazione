import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { hasRuolo, RUOLI_REPORT_KPI } from "@/lib/permessi";
import { withUserContext } from "@gestionale/db/context";
import { calculateRicavo, calculateCostoDocenti, calculateCostoPiattaforma, calculateBilancio } from "@gestionale/utils/bilancio-calculator";
import { exportToXlsx } from "@gestionale/utils/xlsx-exporter";

function monthRange(mese: string) {
  const [year, month] = mese.split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59) };
}

// Bilancio Aule (live) — usato dal Modulo Report
export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!hasRuolo(user, RUOLI_REPORT_KPI)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mese = searchParams.get("mese");
  const corsoCodec = searchParams.get("corso");
  const format = searchParams.get("format");

  const where: any = { deletedAt: null, stato: "CONCLUSA" };
  if (mese) {
    const { start, end } = monthRange(mese);
    where.dataInizio = { gte: start, lte: end };
  }
  if (corsoCodec) where.corsoCodec = corsoCodec;

  const aule = await withUserContext(user, (tx) =>
    tx.aula.findMany({
      where,
      include: {
        corso: { include: { listiniPrezzi: true } },
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
        bilancio: true,
      },
      orderBy: { dataInizio: "desc" },
    })
  );

  // Preferisce lo snapshot immutabile (vedi BilancioAula in schema.prisma);
  // fallback al calcolo live solo per aule concluse prima dell'introduzione
  // dello snapshot e non ancora backfillate.
  const report = aule.map((a) => {
    if (a.bilancio) {
      return {
        aulaId: a.id,
        corso: a.corso.titolo,
        corsoCodice: a.corso.codice,
        modalita: a.modalita,
        discentiCount: a.bilancio.discentiCount,
        ricavo: Number(a.bilancio.ricavo),
        costo: Number(a.bilancio.costoTotale),
        margine: Number(a.bilancio.margine),
        marginePct: Number(a.bilancio.marginePct),
        dataInizio: a.dataInizio,
      };
    }

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
    const costoPiattaforma = calculateCostoPiattaforma(
      listino?.costoPiattaformaPerDiscente != null ? Number(listino.costoPiattaformaPerDiscente) : null,
      a.iscrizioni.length
    );
    const costoTotale = costoDocenti + Number(a.costoAffitto) + costoPiattaforma;
    const bilancio = calculateBilancio(ricavo, costoTotale);

    return {
      aulaId: a.id,
      corso: a.corso.titolo,
      corsoCodice: a.corso.codice,
      modalita: a.modalita,
      discentiCount: a.iscrizioni.length,
      ricavo: bilancio.ricavo,
      costo: bilancio.costoTotale,
      margine: bilancio.margine,
      marginePct: bilancio.marginePct,
      dataInizio: a.dataInizio,
    };
  });

  if (format === "xlsx") {
    const buffer = exportToXlsx(
      report.map((r) => ({
        Corso: r.corso,
        Modalita: r.modalita,
        Discenti: r.discentiCount,
        "Ricavo (€)": r.ricavo,
        "Costo (€)": r.costo,
        "Margine (€)": r.margine,
        "Margine (%)": r.marginePct.toFixed(2),
        Data: r.dataInizio?.toISOString().split("T")[0] || "",
      })),
      "Bilancio Aule"
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bilancio_${mese || "tutti"}.xlsx"`,
      },
    });
  }

  const totals = report.reduce(
    (acc, r) => ({ ricavo: acc.ricavo + r.ricavo, costo: acc.costo + r.costo, margine: acc.margine + r.margine }),
    { ricavo: 0, costo: 0, margine: 0 }
  );

  return NextResponse.json({ success: true, report, totals });
}
