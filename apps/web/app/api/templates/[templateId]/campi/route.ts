import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const updateFieldSchema = z.object({
  nomeCampo: z.string(),
  sorgenteDato: z.string(),
});

// GET: list extracted fields for a template (for the mapping UI)
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campi = await db.templateField.findMany({
    where: { templateId: params.templateId },
  });

  return NextResponse.json({ success: true, campi });
}

// PUT: update the sorgenteDato mapping for a field (user tells system where field maps)
export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SEGRETERIA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nomeCampo, sorgenteDato } = updateFieldSchema.parse(body);

    const field = await db.templateField.updateMany({
      where: { templateId: params.templateId, nomeCampo },
      data: { sorgenteDato },
    });

    return NextResponse.json({ success: true, field });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
