import { db } from "@gestionale/db";
import { decrypt } from "@gestionale/utils/encryption";

export async function getSetting(chiave: string): Promise<string | null> {
  const setting = await db.systemSettings.findUnique({ where: { chiave } });
  if (!setting) return null;

  try {
    return decrypt(setting.valoreEncrypted);
  } catch {
    return null;
  }
}

export async function getGoogleOAuthConfig(): Promise<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null> {
  const [clientId, clientSecret, redirectUri] = await Promise.all([
    getSetting("google_oauth_client_id"),
    getSetting("google_oauth_client_secret"),
    getSetting("google_oauth_redirect_uri"),
  ]);

  if (!clientId || !clientSecret || !redirectUri) return null;

  return { clientId, clientSecret, redirectUri };
}
