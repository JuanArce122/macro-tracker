import { test, expect } from "@playwright/test";

test.describe("Auth — smoke", () => {
  test("auth page se carga con formulario", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveTitle(/Macro Tracker|Auth|Login/i);

    // Debe haber un campo de email y password visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("rutas protegidas redirigen a /auth si no hay sesión", async ({ page }) => {
    // Cualquier intento de entrar a /settings sin sesión debe terminar en /auth
    await page.goto("/settings");
    await page.waitForURL(/\/auth/);
    expect(page.url()).toMatch(/\/auth/);
  });
});
