/**
 * Encriptación AES-256-GCM para tokens de OAuth de wearables (HU-08).
 *
 * Usado por lib/wearables/* para nunca persistir tokens en plaintext en
 * la DB. Si la clave se compromete o se pierde, NO se pueden recuperar
 * los tokens — el usuario debe re-conectar el wearable.
 *
 * Variable de entorno requerida:
 *   WEARABLE_ENCRYPTION_KEY = 32 bytes en hex (64 chars)
 *
 * Generar con: openssl rand -hex 32
 *
 * Formato del ciphertext: "iv:tag:body" todos en hex.
 *   - iv:  12 bytes (recomendado para GCM)
 *   - tag: 16 bytes (auth tag)
 *   - body: ciphertext de longitud variable
 */

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = process.env.WEARABLE_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "WEARABLE_ENCRYPTION_KEY no configurada. Genera con `openssl rand -hex 32`."
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      `WEARABLE_ENCRYPTION_KEY debe ser 32 bytes hex (64 chars); recibido ${hex.length} chars.`
    );
  }
  cachedKey = Buffer.from(hex, "hex");
  return cachedKey;
}

/**
 * Encripta un string con AES-256-GCM. Cada llamada usa un IV nuevo
 * aleatorio para que el mismo plaintext produzca ciphertexts distintos.
 *
 * Retorna "iv:tag:body" en hex (concat con ':' como separador, igual
 * que cookies firmadas).
 */
export function encrypt(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${body.toString("hex")}`;
}

/**
 * Descifra un string encriptado con `encrypt()`. Lanza si:
 *   - el formato no es "iv:tag:body"
 *   - el auth tag no valida (alguien manipuló el ciphertext)
 *   - la key cambió desde que se encriptó
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de ciphertext inválido");
  }
  const [ivHex, tagHex, bodyHex] = parts;
  if (ivHex.length !== IV_BYTES * 2 || tagHex.length !== TAG_BYTES * 2) {
    throw new Error("IV o auth tag con longitud inválida");
  }

  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const body = Buffer.from(bodyHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(body), decipher.final()]);
  return decrypted.toString("utf8");
}
