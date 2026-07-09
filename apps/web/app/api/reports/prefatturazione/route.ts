import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { exportToXlsx } from "@gestionale/utils/xlsx-exporter";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mese = searchParams.get("mese"); // "2026-07"
  const corsoCodec = searchParams.get("corso");
  const stato = searchParams.get("stato");
  const format = searchParams.get("format"); // "xlsx" for export

  const where: any = {};

  if (mese) {
    const [year, month] = mese.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    where.dataChiusura = { gte: start, lte: end };
  }

  if (corsoCodec) {
    where.aula = { corsoCodec };
  }

  const snapshots = await db.aulaBilancioSnapshot.findMany({
    where,
    include: {
      aula: {
        include: {
          corso: true,
          iscrizioni: true,
        },
      },
    },
    orderBy: { dataChiusura: "desc" },
  });

  const filtered = stato
    ? snapshots.filter((s) => s.aula.stato === stato)
    : snapshots;

  const report = filtered.map((s) => ({
    aulaId: s.aulaId,
    corso: s.aula.corso.titolo,
    corsoCodice: s.aula.corso.codice,
    discentiCount: s.aula.iscrizioni.length,
    ricavo: Number(s.ricavo),
    costo: Number(s.costoTotale),
    margine: Number(s.margine),
    marginePct: Number(s.ricavo) > 0 ? (Number(s.margine) / Number(s.ricavo)) * 100 : 0,
    dataChiusura: s.dataChiusura,
  }));

  if (format === "xlsx") {
    const buffer = exportToXlsx(
      report.map((r) => ({
        "Aula ID": r.aulaId,
        Corso: r.corso,
        "Codice Corso": r.corsoCodice,
        Discenti: r.discentiCount,
        "Ricavo (€)": r.ricavo,
        "Costo (€)": r.costo,
        "Margine (€)": r.margine,
        "Margine (%)": r.marginePct.toFixed(2),
        "Data Chiusura": r.dataChiusura.toISOString().split("T")[0],
      })),
      "Prefatturazione"
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="prefatturazione_${mese || "tutti"}.xlsx"`,
      },
    });
  }

  const totals = report.reduce(
    (acc, r) => ({
      ricavo: acc.ricavo + r.ricavo,
      costo: acc.costo + r.costo,
      margine: acc.margine + r.margine,
    }),
    { ricavo: 0, costo: 0, margine: 0 }
  );

  return NextResponse.json({
    success: true,
    report,
    totals,
  });
}
