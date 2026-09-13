import crypto from "crypto";

// Messages are encrypted at rest using AES-256-GCM.
// MESSAGE_ENCRYPTION_KEY must be a 32-byte value (64 hex chars) in production,
// managed via a real secrets manager / KMS -- never committed to source control.
const rawKey = process.env.MESSAGE_ENCRYPTION_KEY || "";
const key = crypto.createHash("sha256").update(rawKey).digest(); // normalize to 32 bytes

export function encryptMessage(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptMessage({ ciphertext, iv, authTag }) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
