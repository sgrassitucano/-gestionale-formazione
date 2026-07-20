import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@gestionale/db/context";
import { getSessionUserFromRequest } from "@/lib/session";
import { createUser } from "@/lib/auth";
import { blindIndex } from "@gestionale/utils/encryption";
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

  const users = await withUserContext(user, (tx) =>
    tx.profiloUtente.findMany({
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
    })
  );

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

    const existing = await withUserContext(user, (tx) =>
      tx.profiloUtente.findUnique({ where: { emailHash: blindIndex(data.email) } })
    );
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

    await withUserContext(user, (tx) =>
      tx.logAudit.create({
        data: {
          utenteId: user.id,
          azione: "CREATE_USER",
          tabella: "ProfiloUtente",
          recordId: newUser.id,
          dettagli: { email: data.email, ruolo: data.ruolo },
        },
      })
    );

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
