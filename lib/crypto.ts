import crypto from "node:crypto";

// A NAV hitelesítő adatok titkosítása AES-256-GCM-mel.
// A kulcs a CREDENTIALS_ENCRYPTION_KEY (32 bájt, base64).
// Formátum: v1:<iv base64>:<authTag base64>:<ciphertext base64>

const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Hiányzik a CREDENTIALS_ENCRYPTION_KEY környezeti változó.");
  }

  // Elfogadjuk a base64 (openssl rand -base64 32) és a hex alakot is.
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    key = Buffer.from(raw, "hex");
  }

  if (key.length !== 32) {
    throw new Error(
      `A CREDENTIALS_ENCRYPTION_KEY 32 bájtos kell legyen, de ${key.length} bájtos. ` +
        "Generáld újra: openssl rand -base64 32"
    );
  }

  return key;
}

export function encrypt(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Érvénytelen titkosított adat formátum.");
  }

  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

// Segédfüggvény: null-safe titkosítás opcionális mezőkre.
export function encryptOptional(plain: string | null | undefined): string | null {
  if (!plain) return null;
  return encrypt(plain);
}
