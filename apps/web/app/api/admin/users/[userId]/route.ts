import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { hashPassword } from "@/lib/crypto";
import { z } from "zod";

const updateUserSchema = z.object({
  ruolo: z.enum(["SUPERADMIN", "SEGRETERIA", "AMMINISTRAZIONE", "VISUALIZZATORE"]).optional(),
  nome: z.string().optional(),
  cognome: z.string().optional(),
  password: z.string().min(6).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const updateData: any = {
      ruolo: data.ruolo,
      nome: data.nome,
      cognome: data.cognome,
    };

    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    const updated = await db.profiloUtente.update({
      where: { id: params.userId },
      data: updateData,
    });

    await db.logAudit.create({
      data: {
        utenteId: user.id,
        azione: "UPDATE_USER",
        tabella: "ProfiloUtente",
        recordId: params.userId,
        dettagli: { changes: data },
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (params.userId === user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  await db.profiloUtente.update({
    where: { id: params.userId },
    data: { deletedAt: new Date() },
  });

  await db.logAudit.create({
    data: {
      utenteId: user.id,
      azione: "DELETE_USER",
      tabella: "ProfiloUtente",
      recordId: params.userId,
    },
  });

  return NextResponse.json({ success: true });
}
