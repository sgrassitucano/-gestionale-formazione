import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { buildRevenueTrend } from "@gestionale/utils/kpi-calculator";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dataInizioStr = searchParams.get("dataInizio");
  const dataFineStr = searchParams.get("dataFine");
  const corsoCodec = searchParams.get("corso");

  const where: any = {};
  if (dataInizioStr && dataFineStr) {
    where.dataChiusura = {
      gte: new Date(dataInizioStr),
      lte: new Date(dataFineStr),
    };
  }
  if (corsoCodec) {
    where.aula = { corsoCodec };
  }

  const [aulesAttive, aulesConcluse, snapshots] = await Promise.all([
    db.aula.count({ where: { stato: { in: ["PIANIFICATA", "IN_CORSO"] }, deletedAt: null } }),
    db.aula.count({ where: { stato: "CONCLUSA", deletedAt: null } }),
    db.aulaBilancioSnapshot.findMany({
      where,
      include: {
        aula: {
          include: {
            corso: true,
            iscrizioni: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ]);

  const discentiPerCorso: Record<string, number> = {};
  const marginePerTipo: Record<string, number> = {};
  let discentiTotalCount = 0;
  let margineTotaleSum = 0;

  for (const s of snapshots) {
    const corsoTitolo = s.aula.corso.titolo;
    const nDiscenti = s.aula.iscrizioni.length;

    discentiPerCorso[corsoTitolo] = (discentiPerCorso[corsoTitolo] || 0) + nDiscenti;
    discentiTotalCount += nDiscenti;

    const tipo = s.aula.corso.tipo;
    marginePerTipo[tipo] = (marginePerTipo[tipo] || 0) + Number(s.margine);
    margineTotaleSum += Number(s.margine);
  }

  const costoMedioDiscente = discentiTotalCount > 0 ? margineTotaleSum / discentiTotalCount : 0;

  const revenueTrend = buildRevenueTrend(
    snapshots.map((s) => ({ dataChiusura: s.dataChiusura, ricavo: Number(s.ricavo) }))
  );

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
      ricavoTotale: snapshots.reduce((sum, s) => sum + Number(s.ricavo), 0),
      margineTotale: margineTotaleSum,
    },
  });
}
