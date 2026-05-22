import { test, expect } from "@playwright/test";

test.describe("API validation con Zod — smoke", () => {
  test("POST /api/meals sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/meals", {
      data: { category: "lunch", name: "Test", weightG: 100 },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/foods sin auth retorna 401", async ({ request }) => {
    const res = await request.post("/api/foods", {
      data: { nombre: "Test", cal: 100 },
    });
    expect(res.status()).toBe(401);
  });

  test("PUT /api/profile sin auth retorna 401", async ({ request }) => {
    const res = await request.put("/api/profile", {
      data: { name: "Test" },
    });
    expect(res.status()).toBe(401);
  });
});
