import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { hasRuolo, RUOLI_PREFATTURAZIONE_CENTRI_COSTO } from "@/lib/permessi";
import { withUserContext } from "@gestionale/db/context";
import { z } from "zod";

const createVoceSchema = z.object({
  descrizione: z.string().min(1),
  categoria: z.string().min(1),
  tipo: z.enum(["ENTRATA", "USCITA"]),
  importo: z.number().min(0),
  dataInizio: z.string(),
  dataFine: z.string().optional().nullable(),
  ricorrente: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!hasRuolo(user, RUOLI_PREFATTURAZIONE_CENTRI_COSTO)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const voci = await withUserContext(user, (tx) =>
    tx.voceContabile.findMany({
      where: { deletedAt: null },
      orderBy: { dataInizio: "desc" },
    })
  );

  return NextResponse.json({ success: true, voci });
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("AMMINISTRAZIONE" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createVoceSchema.parse(body);

    const voce = await withUserContext(user, (tx) =>
      tx.voceContabile.create({
        data: {
          descrizione: data.descrizione,
          categoria: data.categoria,
          tipo: data.tipo,
          importo: data.importo,
          dataInizio: new Date(data.dataInizio),
          dataFine: data.dataFine ? new Date(data.dataFine) : null,
          ricorrente: data.ricorrente,
          creatoDay: user.id,
        },
      })
    );

    return NextResponse.json({ success: true, voce });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Create voce contabile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
