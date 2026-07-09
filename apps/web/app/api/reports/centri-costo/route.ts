import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { exportToXlsx } from "@gestionale/utils/xlsx-exporter";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const aulaId = searchParams.get("aulaId");
  const cantiere = searchParams.get("cantiere");
  const dataInizio = searchParams.get("dataInizio");
  const dataFine = searchParams.get("dataFine");
  const format = searchParams.get("format");

  const where: any = {};
  if (aulaId) where.aulaId = aulaId;
  if (cantiere) where.cantiere = cantiere;
  if (dataInizio && dataFine) {
    where.dataCalcolo = { gte: new Date(dataInizio), lte: new Date(dataFine) };
  }

  const snapshots = await db.centriCostoSnapshot.findMany({
    where,
    include: {
      aula: { include: { corso: true } },
    },
    orderBy: { dataCalcolo: "desc" },
  });

  const report = snapshots.map((s) => ({
    id: s.id,
    aulaId: s.aulaId,
    corso: s.aula.corso.titolo,
    cantiere: s.cantiere,
    sottocantiere: s.sottocantiere,
    responsabile: s.responsabile,
    costoAttribuito: Number(s.costoAttribuito),
    dataCalcolo: s.dataCalcolo,
  }));

  if (format === "xlsx") {
    const buffer = exportToXlsx(
      report.map((r) => ({
        Corso: r.corso,
        Cantiere: r.cantiere,
        Sottocantiere: r.sottocantiere || "",
        Responsabile: r.responsabile || "",
        "Costo Attribuito (€)": r.costoAttribuito,
        Data: r.dataCalcolo.toISOString().split("T")[0],
      })),
      "Centri Costo"
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="centri_costo.xlsx"`,
      },
    });
  }

  // Group by cantiere for drill-down structure
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

  return NextResponse.json({
    success: true,
    report,
    drillDown,
  });
}
