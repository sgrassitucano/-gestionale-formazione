import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Firma HMAC-SHA256 via Web Crypto (SubtleCrypto): funziona sia in Node sia
// in Edge Runtime. Node's `crypto.createHmac` (require("crypto")) NON è
// disponibile in Edge Runtime — il middleware.ts gira su Edge di default in
// Next.js, quindi la vecchia implementazione falliva sempre silenziosamente
// (try/catch la intercettava, verifyToken tornava sempre null → 401 anche
// con credenziali corrette).

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToString(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return atob(padded);
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

export async function generateJWT(
  payload: Record<string, any>,
  secret: string,
  expiresIn: string = "24h"
): Promise<string> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }))
  );

  const signatureBytes = await hmacSha256(secret, `${header}.${body}`);
  const signature = base64UrlEncode(signatureBytes);

  return `${header}.${body}.${signature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const [headerB64, bodyB64, signatureB64] = token.split(".");
    if (!headerB64 || !bodyB64 || !signatureB64) return null;

    const expectedSignatureBytes = await hmacSha256(secret, `${headerB64}.${bodyB64}`);
    const expectedSignature = base64UrlEncode(expectedSignatureBytes);

    if (expectedSignature !== signatureB64) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecodeToString(bodyB64));

    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}
