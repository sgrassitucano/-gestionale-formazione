import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const updateCorsoSchema = z.object({
  titolo: z.string().min(1).optional(),
  oreAula: z.number().min(1).optional(),
  oreElearning: z.number().min(0).optional(),
  validitaAnni: z.number().min(1).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { codice: string } }
) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const corso = await db.catalogoCorso.findUnique({
      where: { codice: params.codice },
    });

    if (!corso || corso.deletedAt) {
      return NextResponse.json(
        { error: "Corso not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      corso,
    });
  } catch (error) {
    console.error("Get corso error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { codice: string } }
) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user || user.ruolo !== "SEGRETERIA") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateCorsoSchema.parse(body);

    const corso = await db.catalogoCorso.update({
      where: { codice: params.codice },
      data,
    });

    return NextResponse.json({
      success: true,
      corso,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    console.error("Update corso error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { codice: string } }
) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user || user.ruolo !== "SEGRETERIA") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const corso = await db.catalogoCorso.update({
      where: { codice: params.codice },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Corso deleted",
    });
  } catch (error) {
    console.error("Delete corso error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
