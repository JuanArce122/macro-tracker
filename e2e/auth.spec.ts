import { test, expect } from "@playwright/test";

test.describe("Auth — smoke", () => {
  test("auth page se carga con formulario", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveTitle(/Macro Tracker|Auth|Login/i);

    // Debe haber un campo de email y password visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("APIs protegidas devuelven 401 sin sesión", async ({ request }) => {
    // La protección de rutas vive en las APIs (no en middleware Next),
    // así que las páginas cargan pero los fetches retornan 401 y la UI
    // queda sin datos. Validamos el contrato real.
    const profile = await request.get("/api/profile");
    expect(profile.status()).toBe(401);

    const goals = await request.get("/api/goals");
    expect(goals.status()).toBe(401);
  });
});
