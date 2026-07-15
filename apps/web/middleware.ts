import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/jwt";
import { getSessionToken } from "./lib/session";

const PREVIEW_MODE = true; // TODO: remove — bypass temporaneo per test senza login, login rotto da sistemare
const PREVIEW_USER = {
  id: "cmrex51bi0000qi34k6c344eb", // s.grassi@iltucano.net
  email: "s.grassi@iltucano.net",
  ruolo: "SUPERADMIN",
  nome: "Stefano",
  cognome: "Grassi",
};

export function middleware(request: NextRequest) {
  if (PREVIEW_MODE) {
    const response = NextResponse.next();
    response.headers.set("x-user-id", PREVIEW_USER.id);
    response.headers.set("x-user-email", PREVIEW_USER.email);
    response.headers.set("x-user-role", PREVIEW_USER.ruolo);
    response.headers.set("x-user-name", PREVIEW_USER.nome);
    response.headers.set("x-user-surname", PREVIEW_USER.cognome);
    return response;
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
  const user = verifyToken(token);

  if (!user) {
    // Invalid or expired token → redirect to login
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token valid → attach user to request headers
  const response = NextResponse.next();
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-email", user.email);
  response.headers.set("x-user-role", user.ruolo);
  if (user.nome) response.headers.set("x-user-name", user.nome);
  if (user.cognome) response.headers.set("x-user-surname", user.cognome);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
