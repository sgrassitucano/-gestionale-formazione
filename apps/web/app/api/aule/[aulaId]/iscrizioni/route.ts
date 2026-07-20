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

    const result = await withUserContext(user, async (tx) => {
      const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
      if (!aula || aula.deletedAt) {
        return { status: 404 as const, body: { error: "Aula non trovata" } };
      }
      // Aula conclusa: la lista discenti è definitiva, non più modificabile
      // (i report Mod.5/6/7 la calcolano dal conteggio iscrizioni corrente).
      if (aula.stato === "CONCLUSA") {
        return { status: 409 as const, body: { error: "Aula conclusa: elenco discenti non più modificabile" } };
      }

      const iscrizione = await tx.iscrizioneAula.create({
        data: {
          aulaId: params.aulaId,
          discenteId: data.discenteId,
          cantiere: data.cantiere,
          sottocantiere: data.sottocantiere,
          responsabile: data.responsabile,
        },
        include: { discente: true },
      });

      return { status: 200 as const, body: { success: true, iscrizione } };
    });

    return NextResponse.json(result.body, { status: result.status });
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

  const result = await withUserContext(user, async (tx) => {
    const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
    if (!aula || aula.deletedAt) {
      return { status: 404 as const, body: { error: "Aula non trovata" } };
    }
    if (aula.stato === "CONCLUSA") {
      return { status: 409 as const, body: { error: "Aula conclusa: elenco discenti non più modificabile" } };
    }

    await tx.iscrizioneAula.updateMany({
      where: { aulaId: params.aulaId, discenteId },
      data: { deletedAt: new Date() },
    });

    return { status: 200 as const, body: { success: true } };
  });

  return NextResponse.json(result.body, { status: result.status });
}
