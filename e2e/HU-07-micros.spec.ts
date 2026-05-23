import { test, expect } from "@playwright/test";

/**
 * E2E smoke de los endpoints de micros + sync USDA (HU-07).
 *
 * Cobertura profunda en tests unit:
 * - __tests__/lib/usda-client.test.ts (7 tests del cliente FDC)
 * - __tests__/lib/micros.test.ts (15 tests de RDA + priorización)
 *
 * El flujo completo (sync USDA → registrar meal → ver MicrosCard) se
 * valida en QA manual con USDA_FDC_API_KEY configurada.
 */

test.describe("HU-07 — Micronutrientes", () => {
  test("GET /api/micros/today sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/micros/today");
    expect(res.status()).toBe(401);
  });

  test("GET /api/micros/details sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/micros/details");
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/foods/sync-usda sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/admin/foods/sync-usda", {
      data: { query: "chicken" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/foods/sync-usda con body inválido retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/admin/foods/sync-usda", { data: {} });
    expect([400, 401, 403]).toContain(res.status());
  });
});
