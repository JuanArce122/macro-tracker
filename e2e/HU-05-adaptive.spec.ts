import { test, expect } from "@playwright/test";

/**
 * E2E smoke de los endpoints de peso + sugerencias adaptativas (HU-05).
 *
 * La cobertura profunda del algoritmo (smoothing, slope, decideAdjustment)
 * está en __tests__/lib/weight-trend.test.ts con 18 tests.
 *
 * Los flujos completos con auth (registrar peso → ver gráfica → recibir
 * sugerencia) requieren factory de session que excede el scope de smoke;
 * se validan en QA manual.
 */

test.describe("HU-05 — Targets adaptativos", () => {
  test("POST /api/weight sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/weight", { data: { weightKg: 70 } });
    expect(res.status()).toBe(401);
  });

  test("GET /api/weight sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/weight");
    expect(res.status()).toBe(401);
  });

  test("GET /api/weight/trend sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/weight/trend");
    expect(res.status()).toBe(401);
  });

  test("POST /api/goals/suggest sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/goals/suggest");
    expect(res.status()).toBe(401);
  });

  test("POST /api/goals/apply-suggestion sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/goals/apply-suggestion");
    expect(res.status()).toBe(401);
  });

  test("PUT /api/goals con adjustmentMode inválido retorna 400 o 401", async ({ request }) => {
    const res = await request.put("/api/goals", {
      data: { calories: 2000, protein: 150, carbs: 200, fat: 65, adjustmentMode: "invalid" },
    });
    expect([400, 401]).toContain(res.status());
  });
});
