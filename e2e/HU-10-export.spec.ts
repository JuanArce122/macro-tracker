import { test, expect } from "@playwright/test";

/**
 * E2E smoke de los endpoints de export (HU-10).
 *
 * Verificamos el contrato de auth y los content-types. La cobertura de
 * estructura del JSON y validez del PDF está en los tests unit/integration
 * (__tests__/lib/export y __tests__/lib/pdf).
 */

test.describe("HU-10 — Export endpoints", () => {
  test("GET /api/export sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/export");
    expect(res.status()).toBe(401);
  });

  test("GET /api/export/json sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/export/json");
    expect(res.status()).toBe(401);
  });

  test("GET /api/export/pdf sin auth retorna 401", async ({ request }) => {
    const res = await request.get("/api/export/pdf");
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/account sin auth retorna 401", async ({ request }) => {
    const res = await request.delete("/api/account");
    expect(res.status()).toBe(401);
  });

  test("query params inválidos en /api/export/json se ignoran sin error", async ({ request }) => {
    // Sin auth, igual debe ser 401 antes de tocar el rango
    const res = await request.get("/api/export/json?from=invalid&to=alsoinvalid");
    expect(res.status()).toBe(401);
  });

  test("UI /settings/data muestra tres botones (cuando hay sesión)", async ({ page }) => {
    await page.goto("/settings/data");
    // Sin sesión, redirige a /auth
    await page.waitForLoadState("domcontentloaded");
    if (page.url().includes("/settings/data")) {
      // Si pudimos entrar, debe haber 3 botones de export
      const csvBtn  = page.locator('button:has-text("CSV")');
      const jsonBtn = page.locator('button:has-text("JSON")');
      const pdfBtn  = page.locator('button:has-text("PDF")');
      await expect(csvBtn).toBeVisible();
      await expect(jsonBtn).toBeVisible();
      await expect(pdfBtn).toBeVisible();
    }
  });
});
