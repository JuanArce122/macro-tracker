import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";

// La key debe estar seteada ANTES de importar lib/crypto (lo evalúa al
// cargar el módulo). Usamos 32 bytes hex = 64 chars.
beforeAll(() => {
  process.env.WEARABLE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
});

describe("crypto (AES-256-GCM)", () => {
  it("hace roundtrip encrypt → decrypt", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plain = "fitbit-access-token-abc-12345";
    const enc = encrypt(plain);
    expect(decrypt(enc)).toBe(plain);
  });

  it("encripta el mismo plaintext distinto cada vez (IV random)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const a = encrypt("same-secret");
    const b = encrypt("same-secret");
    expect(a).not.toBe(b);
  });

  it("formato del ciphertext es 'iv:tag:body' en hex", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const enc = encrypt("x");
    const parts = enc.split(":");
    expect(parts.length).toBe(3);
    // IV: 12 bytes = 24 hex chars
    expect(parts[0].length).toBe(24);
    // Tag: 16 bytes = 32 hex chars
    expect(parts[1].length).toBe(32);
    // Body: al menos 2 chars (mín 1 byte)
    expect(parts[2].length).toBeGreaterThan(0);
    // Todo debe ser hex válido
    expect(parts.every((p) => /^[0-9a-f]*$/.test(p))).toBe(true);
  });

  it("decrypt falla con ciphertext modificado (auth tag)", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const enc = encrypt("secret");
    const [iv, tag, body] = enc.split(":");
    // Cambiar 1 char en el body → auth tag inválido
    const tampered = `${iv}:${tag}:${body.slice(0, -2)}00`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt falla con formato inválido", async () => {
    const { decrypt } = await import("@/lib/crypto");
    expect(() => decrypt("not-a-valid-format")).toThrow();
    expect(() => decrypt("only:two")).toThrow();
  });

  it("soporta strings largos (típico para refresh tokens)", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const longToken = "a".repeat(500);
    expect(decrypt(encrypt(longToken))).toBe(longToken);
  });

  it("soporta unicode / caracteres especiales", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const plain = "tøkén 🔐 con éñfaß";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });
});
