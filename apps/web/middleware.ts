import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/jwt";
import { getSessionToken } from "./lib/session";

const PREVIEW_MODE = true; // TODO: rimuovere quando si vuole attivare il login vero (bug risolto, verificato — vedi lib/crypto.ts)
const PREVIEW_USER = {
  id: "cmrex51bi0000qi34k6c344eb", // s.grassi@iltucano.net
  email: "s.grassi@iltucano.net",
  ruolo: "SUPERADMIN",
  nome: "Stefano",
  cognome: "Grassi",
};

export async function middleware(request: NextRequest) {
  if (PREVIEW_MODE) {
    const requestHeaders = buildUserHeaders(request, PREVIEW_USER);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const pathname = request.nextUrl.pathname;

  // Skip middleware for auth routes and static files
  if (
    pathname === "/login" ||
    pathname === "/logout" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Get JWT token from cookie
  const token = getSessionToken(request);

  if (!token) {
    // No session → redirect to login
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token
  const user = await verifyToken(token);

  if (!user) {
    // Invalid or expired token → redirect to login
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token valid → attach user alla request forwardata all'handler (non alla
  // response al client: NextResponse.next() da sola non basta, serve
  // l'override { request: { headers } } — altrimenti l'handler legge gli
  // header ORIGINALI del client, forgeabili da chiunque mandi
  // "x-user-role: SUPERADMIN" a mano, bypassando login/RLS interamente).
  const requestHeaders = buildUserHeaders(request, user);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function buildUserHeaders(
  request: NextRequest,
  user: { id: string; email: string; ruolo: string; nome?: string | null; cognome?: string | null }
): Headers {
  // Riparte sempre dagli header originali del client, ma SOVRASCRIVE i
  // campi x-user-* — non fidarsi di eventuali x-user-* già presenti nella
  // request in ingresso (altrimenti il forgery resterebbe possibile lo
  // stesso se il client li avesse già impostati prima che arrivassero qui).
  const headers = new Headers(request.headers);
  headers.set("x-user-id", user.id);
  headers.set("x-user-email", user.email);
  headers.set("x-user-role", user.ruolo);
  if (user.nome) headers.set("x-user-name", user.nome);
  else headers.delete("x-user-name");
  if (user.cognome) headers.set("x-user-surname", user.cognome);
  else headers.delete("x-user-surname");
  return headers;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
