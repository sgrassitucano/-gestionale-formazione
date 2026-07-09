import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const createMappingSchema = z.object({
  corsoCodec: z.string(),
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
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { corsoCodec } = createMappingSchema.parse(body);

    const mapping = await db.templateMapping.create({
      data: {
        templateId: params.templateId,
        corsoCodec,
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
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const corsoCodec = searchParams.get("corsoCodec");

  if (!corsoCodec) {
    return NextResponse.json({ error: "corsoCodec required" }, { status: 400 });
  }

  await db.templateMapping.deleteMany({
    where: { templateId: params.templateId, corsoCodec },
  });

  return NextResponse.json({ success: true });
}
