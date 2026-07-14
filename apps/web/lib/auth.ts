import { db } from "@gestionale/db";
import { type SessionUser, type ProfiloUtente, Ruolo } from "@gestionale/types";
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from "./crypto";

const JWT_SECRET = process.env.NEXT_PUBLIC_SESSION_SECRET || "dev-secret-change-me";

export async function createUser(
  email: string,
  password: string,
  ruolo: Ruolo = "VISUALIZZATORE",
  nome?: string,
  cognome?: string
): Promise<SessionUser | null> {
  try {
    const passwordHash = await hashPassword(password);

    const user = await db.profiloUtente.create({
      data: {
        email,
        passwordHash,
        ruolo,
        nome,
        cognome,
      },
    });

    // Seed module permissions for this role
    const modules = [1, 2, 3, 4, 5];
    for (const moduloId of modules) {
      await db.moduloPermesso.upsert({
        where: {
          ruolo_moduloId: {
            ruolo: ruolo,
            moduloId,
          },
        },
        create: {
          ruolo,
          moduloId,
          visible: true,
        },
        update: {},
      });
    }

    return sessionUserFromProfilo(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: SessionUser; token: string } | null> {
  try {
    const user = await db.profiloUtente.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return null;
    }

    const sessionUser = sessionUserFromProfilo(user);
    const token = generateJWT(sessionUser, JWT_SECRET);

    return { user: sessionUser, token };
  } catch (error) {
    console.error("Error logging in:", error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<ProfiloUtente | null> {
  try {
    return await db.profiloUtente.findUnique({
      where: { email },
    });
  } catch (error) {
    return null;
  }
}

export function verifyToken(token: string): SessionUser | null {
  const payload = verifyJWT(token, JWT_SECRET);
  if (!payload) return null;

  return {
    id: payload.id,
    email: payload.email,
    ruolo: payload.ruolo,
    nome: payload.nome,
    cognome: payload.cognome,
  };
}

export async function getUserById(userId: string): Promise<SessionUser | null> {
  try {
    const user = await db.profiloUtente.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    return sessionUserFromProfilo(user);
  } catch (error) {
    return null;
  }
}

function sessionUserFromProfilo(profilo: ProfiloUtente): SessionUser {
  return {
    id: profilo.id,
    email: profilo.email,
    ruolo: profilo.ruolo,
    nome: profilo.nome,
    cognome: profilo.cognome,
  };
}
