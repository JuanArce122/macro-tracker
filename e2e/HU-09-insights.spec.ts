import { test, expect } from "@playwright/test";

/**
 * E2E smoke de los endpoints de coaching (HU-09).
 *
 * Cobertura profunda en tests unit:
 * - __tests__/lib/insights-rules.test.ts (17 tests TDD de las 4 reglas)
 *
 * Los flujos completos (generar insights con fixtures + verificar push)
 * requieren mock de web-push y factory de sesiones; se validan en QA
 * manual con datos reales.
 */

test.describe("HU-09 — Coaching contextual", () => {
  test("GET /api/insights sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/insights");
    expect(res.status()).toBe(401);
  });

  test("POST /api/insights/1/dismiss sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/insights/1/dismiss");
    expect(res.status()).toBe(401);
  });

  test("POST /api/push/subscribe sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/push/subscribe", {
      data: { endpoint: "https://example.com/x", keys: { p256dh: "a", auth: "b" } },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/push/subscribe sin auth retorna 401", async ({ request }) => {
    const res = await request.delete("/api/push/subscribe?endpoint=https://example.com/x");
    expect(res.status()).toBe(401);
  });

  test("GET /api/cron/insights sin Bearer correcto retorna 401 o 500", async ({ request }) => {
    const res = await request.get("/api/cron/insights");
    expect([401, 500]).toContain(res.status());
  });

  test("POST /api/push/subscribe con endpoint inválido retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/push/subscribe", {
      data: { endpoint: "not-a-url", keys: { p256dh: "a", auth: "b" } },
    });
    expect([400, 401]).toContain(res.status());
  });
});
