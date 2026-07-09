import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // TODO: Implement JWT validation and RLS context injection
  // Check session cookie/JWT token
  // Validate token signature and expiry
  // Attach user info to request headers for API routes

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
