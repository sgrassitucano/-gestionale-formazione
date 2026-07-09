import { NextRequest, NextResponse } from "next/server";
import { db } from "@gestionale/db";
import { getGoogleOAuthConfig } from "@/lib/settings";
import { exchangeCodeForToken } from "@gestionale/utils/google-calendar-oauth";
import { encrypt } from "@gestionale/utils/encryption";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state"); // userId passed as state

  if (!code || !userId) {
    return NextResponse.redirect(new URL("/modulo-3/aule?gcal_error=missing_params", request.url));
  }

  try {
    const config = await getGoogleOAuthConfig();
    if (!config) {
      return NextResponse.redirect(new URL("/modulo-3/aule?gcal_error=not_configured", request.url));
    }

    const tokens = await exchangeCodeForToken(config.clientId, config.clientSecret, config.redirectUri, code);

    await db.googleCalendarConfig.upsert({
      where: { utenteId: userId },
      create: {
        utenteId: userId,
        calendarId: "primary",
        accessTokenEncrypted: encrypt(tokens.accessToken),
        refreshTokenEncrypted: encrypt(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        syncEnabled: true,
      },
      update: {
        accessTokenEncrypted: encrypt(tokens.accessToken),
        refreshTokenEncrypted: encrypt(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        syncEnabled: true,
      },
    });

    return NextResponse.redirect(new URL("/modulo-3/aule?gcal_success=1", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/modulo-3/aule?gcal_error=exchange_failed", request.url));
  }
}
