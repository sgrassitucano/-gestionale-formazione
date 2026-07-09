import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateJWT(
  payload: Record<string, any>,
  secret: string,
  expiresIn: string = "24h"
): string {
  // Simple JWT generation (use jsonwebtoken package in production)
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");

  const crypto = require("crypto");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifyJWT(token: string, secret: string): Record<string, any> | null {
  try {
    const [headerB64, bodyB64, signatureB64] = token.split(".");

    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${bodyB64}`)
      .digest("base64url");

    if (expectedSignature !== signatureB64) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(bodyB64, "base64url").toString());

    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}
