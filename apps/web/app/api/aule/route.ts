import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const createAulaSchema = z.object({
  corsoCodec: z.string(),
  luogo: z.string().min(1),
  dataInizio: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const stato = searchParams.get("stato");
  const corsoCodec = searchParams.get("corso");

  const where: any = { deletedAt: null };
  if (stato) where.stato = stato;
  if (corsoCodec) where.corsoCodec = corsoCodec;

  const aule = await db.aula.findMany({
    where,
    include: {
      corso: true,
      iscrizioni: { where: { deletedAt: null } },
      docentilezioni: { where: { deletedAt: null, dataFine: null }, include: { docente: true } },
      bilancioSnapshot: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, aule });
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createAulaSchema.parse(body);

    const aula = await db.aula.create({
      data: {
        corsoCodec: data.corsoCodec,
        luogo: data.luogo,
        dataInizio: data.dataInizio ? new Date(data.dataInizio) : undefined,
        creatoDay: user.id,
        stato: "PIANIFICATA",
      },
      include: { corso: true },
    });

    await db.logAudit.create({
      data: {
        utenteId: user.id,
        azione: "CREA_AULA",
        tabella: "Aula",
        recordId: aula.id,
      },
    });

    return NextResponse.json({ success: true, aula });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Create aula error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
