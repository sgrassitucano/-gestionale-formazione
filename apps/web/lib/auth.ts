import { db } from "@gestionale/db";
import { withServiceContext } from "@gestionale/db/context";
import { type SessionUser, type ProfiloUtente, Ruolo } from "@gestionale/types";
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from "./crypto";
import { blindIndex } from "@gestionale/utils/encryption";
import { MODULI_VISIBILI } from "./matrice-moduli";

const JWT_SECRET = process.env.NEXT_PUBLIC_SESSION_SECRET || "dev-secret-change-me";

// Rate limiting login: account-based (persistito su riga utente, non
// in-memory) perché su Vercel ogni invocazione serverless può girare su
// un'istanza diversa — un contatore per-processo non vedrebbe i tentativi
// falliti fatti su altre istanze, rendendo il limite aggirabile a costo
// zero. 5 tentativi falliti consecutivi bloccano l'account per 15 minuti.
const MAX_TENTATIVI_FALLITI = 5;
const LOCKOUT_MINUTI = 15;

export type LoginResult =
  | { esito: "ok"; user: SessionUser; token: string }
  | { esito: "credenziali_errate" }
  | { esito: "bloccato"; minutiResidui: number };

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

      // Seed permessi modulo per questo ruolo, secondo la matrice decisa
      // (MODULI_VISIBILI) — non più "tutti visibili di default" (bug: dava
      // visible:true a ogni combinazione ruolo/modulo indipendentemente
      // dalla matrice reale, e copriva solo i moduli 1-5, mai 6/7).
      for (let moduloId = 1; moduloId <= 7; moduloId++) {
        const visible = MODULI_VISIBILI[ruolo]?.includes(moduloId) ?? false;
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
            visible,
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

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  try {
    const user = await withServiceContext((tx) =>
      tx.profiloUtente.findUnique({
        where: { emailHash: blindIndex(email) },
      })
    );

    if (!user || user.deletedAt) {
      // Nessun account con questa email: nessun contatore da incrementare
      // (eviterebbe comunque l'enumerazione, ma non c'è una riga su cui
      // persisterlo). Risposta identica a password errata, non distingue
      // "email inesistente" da "password sbagliata".
      return { esito: "credenziali_errate" };
    }

    if (user.bloccatoFino && user.bloccatoFino > new Date()) {
      const minutiResidui = Math.ceil((user.bloccatoFino.getTime() - Date.now()) / 60000);
      return { esito: "bloccato", minutiResidui };
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      const tentativi = user.tentativiFalliti + 1;
      const bloccato = tentativi >= MAX_TENTATIVI_FALLITI;
      await withServiceContext((tx) =>
        tx.profiloUtente.update({
          where: { id: user.id },
          data: {
            tentativiFalliti: bloccato ? 0 : tentativi,
            bloccatoFino: bloccato ? new Date(Date.now() + LOCKOUT_MINUTI * 60000) : null,
          },
        })
      );
      if (bloccato) {
        return { esito: "bloccato", minutiResidui: LOCKOUT_MINUTI };
      }
      return { esito: "credenziali_errate" };
    }

    // Login riuscito: azzera il contatore (un tentativo corretto dopo N
    // falliti-ma-non-abbastanza-per-bloccare non deve restare "a metà").
    if (user.tentativiFalliti > 0 || user.bloccatoFino) {
      await withServiceContext((tx) =>
        tx.profiloUtente.update({
          where: { id: user.id },
          data: { tentativiFalliti: 0, bloccatoFino: null },
        })
      );
    }

    const sessionUser = sessionUserFromProfilo(user);
    const token = await generateJWT(sessionUser, JWT_SECRET);

    return { esito: "ok", user: sessionUser, token };
  } catch (error) {
    console.error("Error logging in:", error);
    return { esito: "credenziali_errate" };
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
