import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";
import { createHmac } from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY not set");

  const key = decodeBase64(ENCRYPTION_KEY);
  const nonce = nacl.randomBytes(24);
  const encrypted = nacl.secretbox(Buffer.from(text), nonce, key);

  return encodeBase64(Buffer.concat([nonce, encrypted]));
}

export function decrypt(encrypted: string): string {
  if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY not set");

  const key = decodeBase64(ENCRYPTION_KEY);
  const data = decodeBase64(encrypted);

  const nonce = data.slice(0, 24);
  const box = data.slice(24);

  const decrypted = nacl.secretbox.open(box, nonce, key);
  if (!decrypted) throw new Error("Failed to decrypt");

  return Buffer.from(decrypted).toString("utf-8");
}

/**
 * Indice cieco (blind index): HMAC-SHA256 deterministico, stesso valore
 * normalizzato produce sempre lo stesso hash. Usato per poter cercare per
 * uguaglianza esatta (email, codice fiscale) anche quando il campo vero e
 * proprio è cifrato in modo probabilistico (nonce casuale, quindi non
 * confrontabile direttamente). NON permette ricerche parziali (contains) —
 * limite intrinseco di qualunque schema di encryption-at-rest con lookup.
 */
export function blindIndex(value: string): string {
  if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY not set");
  const normalizzato = value.trim().toLowerCase();
  return createHmac("sha256", ENCRYPTION_KEY).update(normalizzato).digest("hex");
}
