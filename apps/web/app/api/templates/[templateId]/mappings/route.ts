import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const createMappingSchema = z.object({
  corsoCodec: z.string().nullable().optional(),
  modalita: z.enum(["PRESENZA", "FAD_SINCRONA", "FAD_ASINCRONA"]).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mappings = await db.templateMapping.findMany({
    where: { templateId: params.templateId },
    include: { corso: true },
  });

  return NextResponse.json({ success: true, mappings });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { corsoCodec, modalita } = createMappingSchema.parse(body);

    const mapping = await db.templateMapping.create({
      data: {
        templateId: params.templateId,
        corsoCodec: corsoCodec || null,
        modalita: modalita || null,
      },
    });

    return NextResponse.json({ success: true, mapping });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const corsoCodec = searchParams.get("corsoCodec");
  const modalita = searchParams.get("modalita");

  if (!corsoCodec) {
    return NextResponse.json({ error: "corsoCodec required" }, { status: 400 });
  }

  await db.templateMapping.deleteMany({
    where: { templateId: params.templateId, corsoCodec, modalita: (modalita as any) || null },
  });

  return NextResponse.json({ success: true });
}
