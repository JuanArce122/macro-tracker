import { test, expect } from "@playwright/test";

/**
 * E2E smoke de los endpoints de hábitos + safe-use (HU-11).
 *
 * Cobertura profunda en tests unit:
 * - __tests__/lib/tca-detection.test.ts (13 tests con fixtures de stats diarias)
 * - __tests__/schemas/habits.test.ts (10 tests del schema)
 *
 * Flujo completo (cambiar a modo hábitos → tap +/- en portions → ver
 * banner safe-use cuando aplica) se valida en QA manual.
 */

test.describe("HU-11 — Modo hábitos + uso seguro", () => {
  test("GET /api/habits sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/habits");
    expect(res.status()).toBe(401);
  });

  test("POST /api/habits sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/habits", { data: { proteinPortions: 3 } });
    expect(res.status()).toBe(401);
  });

  test("POST /api/habits con porción negativa retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/habits", { data: { proteinPortions: -1 } });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/habits con porción > 99 retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/habits", { data: { proteinPortions: 100 } });
    expect([400, 401]).toContain(res.status());
  });

  test("GET /api/safe-use/check sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/safe-use/check");
    expect(res.status()).toBe(401);
  });

  test("PUT /api/profile con trackingMode inválido retorna 400 o 401", async ({ request }) => {
    const res = await request.put("/api/profile", { data: { trackingMode: "calories" } });
    expect([400, 401]).toContain(res.status());
  });
});
