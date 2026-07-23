import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const updateListinoSchema = z.object({
  costo: z.number().min(0).optional(),
  costoPiattaformaPerDiscente: z.number().min(0).optional().nullable(),
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
    const data = updateListinoSchema.parse(body);

    const listino = await withUserContext(user, (tx) =>
      tx.listinoPrezzi.update({ where: { id: params.id }, data, include: { corso: true } })
    );

    return NextResponse.json({ success: true, listino });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
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
    tx.listinoPrezzi.update({ where: { id: params.id }, data: { deletedAt: new Date() } })
  );

  return NextResponse.json({ success: true });
}
