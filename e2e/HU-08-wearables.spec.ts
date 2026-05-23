import { test, expect } from "@playwright/test";

/**
 * E2E smoke de los endpoints OAuth de wearables (HU-08).
 *
 * Cobertura profunda en tests unit:
 * - __tests__/lib/crypto.test.ts (7 tests del AES-256-GCM)
 *
 * Los flujos completos con OAuth (connect → callback → sync) se prueban
 * en QA manual contra el sandbox de Fitbit / Oura.
 */

test.describe("HU-08 — Wearables OAuth", () => {
  test("GET /api/wearables/list sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/wearables/list");
    expect(res.status()).toBe(401);
  });

  test("GET /api/wearables/connect/fitbit sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/wearables/connect/fitbit", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test("GET /api/wearables/connect/invalid retorna 400 o 401", async ({ request }) => {
    const res = await request.get("/api/wearables/connect/invalid-provider", { maxRedirects: 0 });
    expect([400, 401]).toContain(res.status());
  });

  test("DELETE /api/wearables/disconnect/fitbit sin auth retorna 401", async ({ request }) => {
    const res = await request.delete("/api/wearables/disconnect/fitbit");
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/wearables/disconnect/garmin (no implementado) retorna 400 o 401", async ({ request }) => {
    const res = await request.delete("/api/wearables/disconnect/garmin");
    expect([400, 401]).toContain(res.status());
  });

  test("GET /api/cron/wearables-sync sin Bearer correcto retorna 401 o 500", async ({ request }) => {
    const res = await request.get("/api/cron/wearables-sync");
    expect([401, 500]).toContain(res.status());
  });
});
