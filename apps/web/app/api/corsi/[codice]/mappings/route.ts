import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const createMappingSchema = z.object({
  templateId: z.string(),
  modalita: z.enum(["PRESENZA", "FAD_SINCRONA", "FAD_ASINCRONA"]).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { codice: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mappings = await db.templateMapping.findMany({
    where: { corsoCodec: params.codice },
    include: { template: true },
  });

  return NextResponse.json({ success: true, mappings });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { codice: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { templateId, modalita } = createMappingSchema.parse(body);

    const mapping = await db.templateMapping.create({
      data: { corsoCodec: params.codice, templateId, modalita: modalita || null },
      include: { template: true },
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
  { params }: { params: { codice: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || !("SEGRETERIA" === user.ruolo || "SUPERADMIN" === user.ruolo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mappingId = searchParams.get("id");
  if (!mappingId) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.templateMapping.delete({ where: { id: mappingId } });

  return NextResponse.json({ success: true });
}
