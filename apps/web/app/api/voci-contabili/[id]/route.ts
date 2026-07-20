import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { withUserContext } from "@gestionale/db/context";
import { z } from "zod";

const updateVoceSchema = z.object({
  descrizione: z.string().min(1).optional(),
  categoria: z.string().min(1).optional(),
  tipo: z.enum(["ENTRATA", "USCITA"]).optional(),
  importo: z.number().min(0).optional(),
  dataInizio: z.string().optional(),
  dataFine: z.string().optional().nullable(),
  ricorrente: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("AMMINISTRAZIONE" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateVoceSchema.parse(body);

    const voce = await withUserContext(user, (tx) =>
      tx.voceContabile.update({
        where: { id: params.id },
        data: {
          ...data,
          dataInizio: data.dataInizio ? new Date(data.dataInizio) : undefined,
          dataFine: data.dataFine !== undefined ? (data.dataFine ? new Date(data.dataFine) : null) : undefined,
        },
      })
    );

    return NextResponse.json({ success: true, voce });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Update voce contabile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("AMMINISTRAZIONE" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await withUserContext(user, (tx) =>
    tx.voceContabile.update({ where: { id: params.id }, data: { deletedAt: new Date() } })
  );

  return NextResponse.json({ success: true });
}
