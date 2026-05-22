import { test, expect } from "@playwright/test";

/**
 * E2E smoke de los endpoints de votación + admin (HU-04).
 *
 * La cobertura profunda (upsert, denormalización, outliers, badge UI)
 * está en los tests unit/integration:
 * - __tests__/schemas/vote.test.ts
 * - __tests__/lib/foods/outlier-detection.test.ts
 * - __tests__/lib/foods-ranking.test.ts (HU-04 boosts y penalties)
 * - __tests__/components/FoodBadge.test.tsx
 */

test.describe("HU-04 — Votación y admin", () => {
  test("POST /api/foods/1/vote sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/foods/1/vote", { data: { vote: 1 } });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/foods/1/vote sin auth retorna 401", async ({ request }) => {
    const res = await request.delete("/api/foods/1/vote");
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/foods/review sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/admin/foods/review");
    expect(res.status()).toBe(401);
  });

  test("POST /api/admin/foods/1/verify sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/admin/foods/1/verify");
    expect(res.status()).toBe(401);
  });

  test("GET /api/cron/outliers sin Bearer token retorna 401 o 500 (no autorizado)", async ({ request }) => {
    const res = await request.get("/api/cron/outliers");
    // 401 si CRON_SECRET está configurado, 500 si no lo está
    expect([401, 500]).toContain(res.status());
  });

  test("GET /api/cron/outliers con Bearer wrong retorna 401", async ({ request }) => {
    const res = await request.get("/api/cron/outliers", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect([401, 500]).toContain(res.status());
  });
});
