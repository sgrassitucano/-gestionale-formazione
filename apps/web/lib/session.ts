import { type NextRequest, type NextResponse } from "next/server";
import { type SessionUser } from "@gestionale/types";
import { verifyToken } from "./auth";

const SESSION_COOKIE_NAME = "session_token";

export function getSessionUserFromRequest(request: NextRequest): SessionUser | null {
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  const userRole = request.headers.get("x-user-role");

  if (!userId || !userEmail || !userRole) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
    ruolo: userRole as any,
    nome: request.headers.get("x-user-name") || undefined,
    cognome: request.headers.get("x-user-surname") || undefined,
  };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
  });
}

export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}
