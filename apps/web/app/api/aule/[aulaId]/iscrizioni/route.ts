import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const addIscrizioneSchema = z.object({
  discenteId: z.string(),
  cantiere: z.string().optional(),
  sottocantiere: z.string().optional(),
  responsabile: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const iscrizioni = await withUserContext(user, (tx) =>
    tx.iscrizioneAula.findMany({
      where: { aulaId: params.aulaId, deletedAt: null },
      include: { discente: true },
    })
  );

  return NextResponse.json({ success: true, iscrizioni });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = addIscrizioneSchema.parse(body);

    const iscrizione = await withUserContext(user, (tx) =>
      tx.iscrizioneAula.create({
        data: {
          aulaId: params.aulaId,
          discenteId: data.discenteId,
          cantiere: data.cantiere,
          sottocantiere: data.sottocantiere,
          responsabile: data.responsabile,
        },
        include: { discente: true },
      })
    );

    return NextResponse.json({ success: true, iscrizione });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const discenteId = searchParams.get("discenteId");

  if (!discenteId) {
    return NextResponse.json({ error: "discenteId required" }, { status: 400 });
  }

  await withUserContext(user, (tx) =>
    tx.iscrizioneAula.updateMany({
      where: { aulaId: params.aulaId, discenteId },
      data: { deletedAt: new Date() },
    })
  );

  return NextResponse.json({ success: true });
}
