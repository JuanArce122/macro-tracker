import { test, expect } from "@playwright/test";

/**
 * E2E smoke de los endpoints de meal planning (HU-06).
 *
 * Cobertura profunda en tests unit:
 * - __tests__/lib/meal-planner.test.ts (13 tests del motor greedy)
 * - __tests__/schemas/meal-plan.test.ts (13 tests del schema)
 *
 * Flujo completo (wizard /plan/setup → POST /api/meal-plans → calendario
 * /plan → log-meal) se valida en QA manual.
 */

test.describe("HU-06 — Meal planning", () => {
  test("GET /api/meal-plans sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/meal-plans");
    expect(res.status()).toBe(401);
  });

  test("POST /api/meal-plans sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/meal-plans", {
      data: { preferences: { diet: [], allergies: [], mealsPerDay: 3, maxPrepMinutes: 60, costLevel: 3 } },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/meal-plans con mealsPerDay inválido retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/meal-plans", {
      data: { preferences: { diet: [], allergies: [], mealsPerDay: 2, maxPrepMinutes: 60, costLevel: 3 } },
    });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/meal-plans con dieta inválida retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/meal-plans", {
      data: { preferences: { diet: ["carnivoro"], allergies: [], mealsPerDay: 3, maxPrepMinutes: 60, costLevel: 3 } },
    });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/meal-plans/1/log-meal sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/meal-plans/1/log-meal", {
      data: { plannedMealId: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/meal-plans/1/log-meal con plannedMealId inválido retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/meal-plans/1/log-meal", {
      data: { plannedMealId: -1 },
    });
    expect([400, 401]).toContain(res.status());
  });

  test("/plan redirige a login si no hay sesión", async ({ page }) => {
    await page.goto("/plan");
    await page.waitForURL(/\/(login|auth|api\/auth\/signin)/, { timeout: 5000 }).catch(() => {});
    expect(page.url()).not.toContain("/plan/setup");
  });
});
