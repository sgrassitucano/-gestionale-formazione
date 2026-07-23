import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const assignDocenteSchema = z.object({
  docenteId: z.string(),
  oreEffettiveDocenza: z.number().min(0),
  trasferAcosto: z.number().min(0).default(0),
});

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
    const data = assignDocenteSchema.parse(body);

    const result = await withUserContext(user, async (tx) => {
      const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
      if (!aula || aula.deletedAt) {
        return { status: 404 as const, body: { error: "Aula non trovata" } };
      }
      if (aula.stato === "CONCLUSA") {
        return { status: 409 as const, body: { error: "Aula conclusa: assegnazione docenti non più modificabile" } };
      }

      const docenteLezione = await tx.docenteLezione.create({
        data: {
          aulaId: params.aulaId,
          docenteId: data.docenteId,
          oreEffettiveDocenza: data.oreEffettiveDocenza,
          trasferAcosto: data.trasferAcosto,
        },
        include: { docente: true },
      });

      return { status: 200 as const, body: { success: true, docenteLezione } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateDocenteLezioneSchema = z.object({
  docenteLezioneId: z.string(),
  oreEffettiveDocenza: z.number().min(0),
  trasferAcosto: z.number().min(0).default(0),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { aulaId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateDocenteLezioneSchema.parse(body);

    const result = await withUserContext(user, async (tx) => {
      const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
      if (!aula || aula.deletedAt) {
        return { status: 404 as const, body: { error: "Aula non trovata" } };
      }
      if (aula.stato === "CONCLUSA") {
        return { status: 409 as const, body: { error: "Aula conclusa: assegnazione docenti non più modificabile" } };
      }

      const esistente = await tx.docenteLezione.findUnique({ where: { id: data.docenteLezioneId } });
      if (!esistente || esistente.aulaId !== params.aulaId) {
        return { status: 404 as const, body: { error: "Assegnazione non trovata per questa aula" } };
      }

      const docenteLezione = await tx.docenteLezione.update({
        where: { id: data.docenteLezioneId },
        data: {
          oreEffettiveDocenza: data.oreEffettiveDocenza,
          trasferAcosto: data.trasferAcosto,
        },
        include: { docente: true },
      });

      return { status: 200 as const, body: { success: true, docenteLezione } };
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
  const docenteLezioneId = searchParams.get("id");

  if (!docenteLezioneId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const result = await withUserContext(user, async (tx) => {
    const aula = await tx.aula.findUnique({ where: { id: params.aulaId } });
    if (!aula || aula.deletedAt) {
      return { status: 404 as const, body: { error: "Aula non trovata" } };
    }
    if (aula.stato === "CONCLUSA") {
      return { status: 409 as const, body: { error: "Aula conclusa: assegnazione docenti non più modificabile" } };
    }

    const docenteLezione = await tx.docenteLezione.findUnique({ where: { id: docenteLezioneId } });
    if (!docenteLezione || docenteLezione.aulaId !== params.aulaId) {
      return { status: 404 as const, body: { error: "Assegnazione non trovata per questa aula" } };
    }

    // Soft-delete with substitution history: set dataFine
    await tx.docenteLezione.update({
      where: { id: docenteLezioneId },
      data: { dataFine: new Date() },
    });

    return { status: 200 as const, body: { success: true } };
  });

  return NextResponse.json(result.body, { status: result.status });
}
