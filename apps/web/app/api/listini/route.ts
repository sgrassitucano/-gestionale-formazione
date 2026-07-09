import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const upsertListinoSchema = z.object({
  corsoCodec: z.string(),
  tipoErogazione: z.enum(["AULA_FAD", "E_LEARNING"]),
  costo: z.number().min(0),
});

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listini = await db.listinoPrezzi.findMany({
    where: { deletedAt: null },
    include: { corso: true },
    orderBy: { corsoCodec: "asc" },
  });

  return NextResponse.json({ success: true, listini });
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "AMMINISTRAZIONE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = upsertListinoSchema.parse(body);

    const listino = await db.listinoPrezzi.upsert({
      where: {
        corsoCodec_tipoErogazione: {
          corsoCodec: data.corsoCodec,
          tipoErogazione: data.tipoErogazione as any,
        },
      },
      create: data as any,
      update: { costo: data.costo },
    });

    return NextResponse.json({ success: true, listino });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
