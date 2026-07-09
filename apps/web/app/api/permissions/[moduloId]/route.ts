import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { z } from "zod";

const updatePermissionSchema = z.object({
  ruolo: z.enum(["SUPERADMIN", "SEGRETERIA", "AMMINISTRAZIONE", "VISUALIZZATORE"]),
  visible: z.boolean(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { moduloId: string } }
) {
  try {
    const user = getSessionUserFromRequest(request);

    if (!user || user.ruolo !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const moduloId = parseInt(params.moduloId);
    const body = await request.json();

    const { ruolo, visible } = updatePermissionSchema.parse(body);

    const permission = await db.moduloPermesso.upsert({
      where: {
        ruolo_moduloId: {
          ruolo,
          moduloId,
        },
      },
      create: {
        ruolo,
        moduloId,
        visible,
      },
      update: {
        visible,
      },
    });

    return NextResponse.json({
      success: true,
      permission,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    console.error("Update permission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
