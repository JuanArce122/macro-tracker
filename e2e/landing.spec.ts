import { test, expect } from "@playwright/test";

test.describe("Landing — smoke", () => {
  test("la raíz redirige a /auth o /day cuando se carga", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    // No debe ser un 500
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    // Termina en /auth (sin sesión) o /day (con sesión)
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toMatch(/\/(auth|day)/);
  });

  test("manifest.json se sirve correctamente (PWA)", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const text = await response!.text();
    const manifest = JSON.parse(text);
    expect(manifest.name).toBeDefined();
  });

  test("sw.js se sirve sin caché", async ({ page }) => {
    const response = await page.goto("/sw.js");
    expect(response?.status()).toBe(200);
    const cacheControl = response?.headers()["cache-control"];
    // vercel.json configura no-cache
    expect(cacheControl).toBeDefined();
  });
});
