import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

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
