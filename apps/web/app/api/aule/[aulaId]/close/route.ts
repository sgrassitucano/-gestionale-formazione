import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { calculateRicavo, calculateCostoDocenti, calculateBilancio } from "@gestionale/utils/bilancio-calculator";
import { calculateCentriCosto } from "@gestionale/utils/centri-costo-calculator";

export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const aula = await db.aula.findUnique({
      where: { id: params.aulaId },
      include: {
        corso: {
          include: { listiniPrezzi: true },
        },
        iscrizioni: { where: { deletedAt: null } },
        docentilezioni: {
          where: { deletedAt: null, dataFine: null },
          include: { docente: true },
        },
        bilancioSnapshot: true,
      },
    });

    if (!aula) {
      return NextResponse.json({ error: "Aula not found" }, { status: 404 });
    }

    if (aula.bilancioSnapshot) {
      return NextResponse.json({ error: "Aula already closed (snapshot exists)" }, { status: 409 });
    }

    if (aula.stato === "CONCLUSA") {
      return NextResponse.json({ error: "Aula already closed" }, { status: 409 });
    }

    // Determine tipoErogazione — assume AULA_FAD if aula has physical luogo/lezioni, E_LEARNING otherwise
    // Simplification: derive from listino availability; prefer AULA_FAD listino if exists
    const listinoAula = aula.corso.listiniPrezzi.find((l) => l.tipoErogazione === "AULA_FAD");
    const listinoElearning = aula.corso.listiniPrezzi.find((l) => l.tipoErogazione === "E_LEARNING");
    const tipoErogazione = listinoAula ? "AULA_FAD" : "E_LEARNING";
    const listino = listinoAula || listinoElearning;

    if (!listino) {
      return NextResponse.json(
        { error: "No listino prezzi configured for this corso" },
        { status: 400 }
      );
    }

    const ricavo = calculateRicavo(
      tipoErogazione as any,
      Number(listino.costo),
      aula.iscrizioni.length
    );

    const costoTotale = calculateCostoDocenti(
      aula.docentilezioni.map((dl) => ({
        oreEffettiveDocenza: Number(dl.oreEffettiveDocenza),
        tariffaOraria: Number(dl.docente.tariffaOraria),
        trasferAcosto: Number(dl.trasferAcosto),
      }))
    );

    const bilancio = calculateBilancio(ricavo, costoTotale);

    // Transaction: update aula state + create bilancio snapshot + centri costo snapshots
    const result = await db.$transaction(async (tx) => {
      await tx.aula.update({
        where: { id: params.aulaId },
        data: { stato: "CONCLUSA", dataFine: new Date() },
      });

      const snapshot = await tx.aulaBilancioSnapshot.create({
        data: {
          aulaId: params.aulaId,
          ricavo: bilancio.ricavo,
          costoTotale: bilancio.costoTotale,
          margine: bilancio.margine,
          dataChiusura: new Date(),
        },
      });

      let centriCosto: any[] = [];
      if (tipoErogazione === "AULA_FAD") {
        const distribuzione = calculateCentriCosto(bilancio.costoTotale, aula.iscrizioni);

        for (const entry of distribuzione) {
          const cc = await tx.centriCostoSnapshot.create({
            data: {
              aulaId: params.aulaId,
              cantiere: entry.cantiere,
              sottocantiere: entry.sottocantiere,
              responsabile: entry.responsabile,
              costoAttribuito: entry.costoAttribuito,
            },
          });
          centriCosto.push(cc);
        }
      }

      await tx.logAudit.create({
        data: {
          utenteId: user.id,
          azione: "CHIUDE_AULA",
          tabella: "Aula",
          recordId: params.aulaId,
          dettagli: { bilancio, centriCostoCount: centriCosto.length },
        },
      });

      return { snapshot, centriCosto };
    });

    return NextResponse.json({
      success: true,
      bilancio,
      snapshot: result.snapshot,
      centriCosto: result.centriCosto,
    });
  } catch (error) {
    console.error("Close aula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
