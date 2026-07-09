import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/session";
import { getGoogleOAuthConfig } from "@/lib/settings";
import { getAuthUrl } from "@gestionale/utils/google-calendar-oauth";

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Google OAuth not configured. Configure it in Impostazioni first." },
      { status: 400 }
    );
  }

  const authUrl = getAuthUrl(config.clientId, config.clientSecret, config.redirectUri, user.id);

  return NextResponse.json({ success: true, authUrl });
}
