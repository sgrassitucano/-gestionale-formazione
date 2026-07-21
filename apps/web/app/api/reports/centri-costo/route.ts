import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { hasRuolo, RUOLI_PREFATTURAZIONE_CENTRI_COSTO } from "@/lib/permessi";
import { withUserContext } from "@gestionale/db/context";
import { calculateCentriCosto } from "@gestionale/utils/centri-costo-calculator";
import { calculateCostoDocenti } from "@gestionale/utils/bilancio-calculator";
import { exportToXlsx } from "@gestionale/utils/xlsx-exporter";

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
  const format = searchParams.get("format");

  const where: any = { deletedAt: null, stato: "CONCLUSA" };
  if (mese) {
    const { start, end } = monthRange(mese);
    where.dataInizio = { gte: start, lte: end };
  }

  const aule = await withUserContext(user, (tx) =>
    tx.aula.findMany({
      where,
      include: {
        corso: true,
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
        centriCosto: true,
      },
    })
  );

  const report: Array<{
    aulaId: string;
    corso: string;
    cantiere: string;
    sottocantiere: string | null;
    responsabile: string | null;
    costoAttribuito: number;
    dataInizio: Date | null;
  }> = [];

  // Preferisce lo snapshot immutabile (vedi CentroCostoSnapshot in
  // schema.prisma); fallback al calcolo live solo per aule concluse prima
  // dell'introduzione dello snapshot e non ancora backfillate.
  for (const a of aule) {
    if (a.centriCosto.length > 0) {
      for (const entry of a.centriCosto) {
        report.push({
          aulaId: a.id,
          corso: a.corso.titolo,
          cantiere: entry.cantiere,
          sottocantiere: entry.sottocantiere,
          responsabile: entry.responsabile,
          costoAttribuito: Number(entry.costoAttribuito),
          dataInizio: a.dataInizio,
        });
      }
      continue;
    }

    const costoDocenti = calculateCostoDocenti(
      a.docentilezioni.map((dl) => ({
        oreEffettiveDocenza: Number(dl.oreEffettiveDocenza),
        tariffaOraria: Number(dl.docente.tariffaOraria),
        trasferAcosto: Number(dl.trasferAcosto),
      }))
    );
    const costoTotale = costoDocenti + Number(a.costoAffitto);

    const distribuzione = calculateCentriCosto(costoTotale, a.iscrizioni);
    for (const entry of distribuzione) {
      report.push({
        aulaId: a.id,
        corso: a.corso.titolo,
        cantiere: entry.cantiere,
        sottocantiere: entry.sottocantiere,
        responsabile: entry.responsabile,
        costoAttribuito: entry.costoAttribuito,
        dataInizio: a.dataInizio,
      });
    }
  }

  if (format === "xlsx") {
    const buffer = exportToXlsx(
      report.map((r) => ({
        Corso: r.corso,
        Cantiere: r.cantiere,
        Sottocantiere: r.sottocantiere || "",
        Responsabile: r.responsabile || "",
        "Costo Attribuito (€)": r.costoAttribuito,
        Data: r.dataInizio?.toISOString().split("T")[0] || "",
      })),
      "Centri Costo"
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="centri_costo_${mese || "tutti"}.xlsx"`,
      },
    });
  }

  const byCantiere = new Map<string, { cantiere: string; totale: number; sottocantieri: Map<string, { nome: string; totale: number; responsabile: string | null }> }>();

  for (const r of report) {
    if (!byCantiere.has(r.cantiere)) {
      byCantiere.set(r.cantiere, { cantiere: r.cantiere, totale: 0, sottocantieri: new Map() });
    }
    const group = byCantiere.get(r.cantiere)!;
    group.totale += r.costoAttribuito;

    const subKey = r.sottocantiere || "N/A";
    if (!group.sottocantieri.has(subKey)) {
      group.sottocantieri.set(subKey, { nome: subKey, totale: 0, responsabile: r.responsabile });
    }
    group.sottocantieri.get(subKey)!.totale += r.costoAttribuito;
  }

  const drillDown = Array.from(byCantiere.values()).map((g) => ({
    cantiere: g.cantiere,
    totale: g.totale,
    sottocantieri: Array.from(g.sottocantieri.values()),
  }));

  return NextResponse.json({ success: true, drillDown });
}
