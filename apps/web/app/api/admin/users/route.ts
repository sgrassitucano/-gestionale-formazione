import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getSessionUserFromRequest } from "@/lib/session";
import { createUser } from "@/lib/auth";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  ruolo: z.enum(["SUPERADMIN", "SEGRETERIA", "AMMINISTRAZIONE", "VISUALIZZATORE"]),
  nome: z.string().optional(),
  cognome: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await db.profiloUtente.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      ruolo: true,
      nome: true,
      cognome: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, users });
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user || user.ruolo !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createUserSchema.parse(body);

    const existing = await db.profiloUtente.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const newUser = await createUser(
      data.email,
      data.password,
      data.ruolo as any,
      data.nome,
      data.cognome
    );

    if (!newUser) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    await db.logAudit.create({
      data: {
        utenteId: user.id,
        azione: "CREATE_USER",
        tabella: "ProfiloUtente",
        recordId: newUser.id,
        dettagli: { email: data.email, ruolo: data.ruolo },
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
