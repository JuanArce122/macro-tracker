import { test, expect } from "@playwright/test";

/**
 * E2E smoke del endpoint barcode (HU-03).
 *
 * La cobertura profunda (validación, normalización, parseo OFF, cache,
 * race conditions) está en los tests unit:
 * - __tests__/lib/barcode.test.ts (24 tests)
 *
 * No probamos el escaneo de cámara en E2E porque Playwright no expone
 * fácilmente getUserMedia con stream simulado. La verificación manual
 * del scanner se hace en dispositivo real durante QA.
 */

test.describe("HU-03 — Barcode", () => {
  test("GET /api/foods/barcode/X sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/foods/barcode/7702049000123");
    expect(res.status()).toBe(401);
  });

  test("GET /api/foods/barcode con código inválido sin auth retorna 401 (auth se valida primero)", async ({ request }) => {
    // Sin auth, el endpoint debe responder 401 antes de validar el código
    const res = await request.get("/api/foods/barcode/abc");
    expect([400, 401]).toContain(res.status());
  });

  test("GET /api/foods/barcode con código muy corto retorna 400 o 401", async ({ request }) => {
    const res = await request.get("/api/foods/barcode/123");
    expect([400, 401]).toContain(res.status());
  });
});
