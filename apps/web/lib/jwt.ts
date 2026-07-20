import { type SessionUser } from "@gestionale/types";
import { verifyJWT } from "./crypto";

const JWT_SECRET = process.env.NEXT_PUBLIC_SESSION_SECRET || "dev-secret-change-me";

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
