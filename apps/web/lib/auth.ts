import { db } from "@gestionale/db";
import { withServiceContext } from "@gestionale/db/context";
import { type SessionUser, type ProfiloUtente, Ruolo } from "@gestionale/types";
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from "./crypto";
import { blindIndex } from "@gestionale/utils/encryption";

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

    const user = await withServiceContext(async (tx) => {
      const created = await tx.profiloUtente.create({
        data: {
          email,
          emailHash: blindIndex(email), // il middleware la ricalcola comunque; qui serve solo per soddisfare il tipo
          passwordHash,
          ruolo,
          nome,
          cognome,
        },
      });

      // Seed module permissions for this role
      const modules = [1, 2, 3, 4, 5];
      for (const moduloId of modules) {
        await tx.moduloPermesso.upsert({
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

      return created;
    });

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
    const user = await withServiceContext((tx) =>
      tx.profiloUtente.findUnique({
        where: { emailHash: blindIndex(email) },
      })
    );

    if (!user || user.deletedAt) {
      return null;
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return null;
    }

    const sessionUser = sessionUserFromProfilo(user);
    const token = await generateJWT(sessionUser, JWT_SECRET);

    return { user: sessionUser, token };
  } catch (error) {
    console.error("Error logging in:", error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<ProfiloUtente | null> {
  try {
    return await withServiceContext((tx) =>
      tx.profiloUtente.findUnique({
        where: { emailHash: blindIndex(email) },
      })
    );
  } catch (error) {
    return null;
  }
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  const payload = await verifyJWT(token, JWT_SECRET);
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
    const user = await withServiceContext((tx) =>
      tx.profiloUtente.findUnique({
        where: { id: userId },
      })
    );

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
