import { test, expect } from "@playwright/test";

/**
 * E2E smoke del endpoint de voz (HU-02).
 *
 * El flujo completo con Web Speech API no se prueba en Playwright porque
 * el navegador headless no expone reconocimiento de voz funcional. Se
 * valida en QA manual sobre dispositivo real con micrófono.
 *
 * Cobertura profunda:
 * - __tests__/lib/voice-match.test.ts (14 tests de conversiones)
 * - __tests__/api/parse-voice.test.ts (10 tests del endpoint con Gemini mock)
 */

test.describe("HU-02 — Voz es-CO", () => {
  test("POST /api/parse-voice sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/parse-voice", {
      data: { transcript: "dos huevos con arepa" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/parse-voice con transcript vacío retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/parse-voice", { data: { transcript: "" } });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/parse-voice con transcript > 2000 chars retorna 400 o 401", async ({ request }) => {
    const long = "a".repeat(2001);
    const res = await request.post("/api/parse-voice", { data: { transcript: long } });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/parse-voice sin body retorna 400 o 401", async ({ request }) => {
    const res = await request.post("/api/parse-voice", { data: {} });
    expect([400, 401]).toContain(res.status());
  });
});
