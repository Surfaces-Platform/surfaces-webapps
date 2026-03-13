import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;

function resolveSecretMaterial(): string {
  const value =
    process.env.SURFACEOPS_SECRET_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim();
  if (!value) {
    throw new Error("SURFACEOPS_SECRET_KEY or SESSION_SECRET must be configured for contract workbench secrets.");
  }
  return value;
}

function deriveKey(): Buffer {
  return createHash("sha256").update(resolveSecretMaterial()).digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const key = deriveKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptJson<T>(ciphertext: string): T {
  const [ivBase64, tagBase64, payloadBase64] = String(ciphertext).split(".");
  if (!ivBase64 || !tagBase64 || !payloadBase64) {
    throw new Error("Invalid ciphertext payload.");
  }
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}
