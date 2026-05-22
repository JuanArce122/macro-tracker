import { describe, it, expect } from "vitest";
import { FoodCreateSchema, FoodSourceSchema } from "@/lib/schemas";

describe("FoodSourceSchema", () => {
  it("accepts allowed sources", () => {
    expect(FoodSourceSchema.safeParse("usda").success).toBe(true);
    expect(FoodSourceSchema.safeParse("openfoodfacts").success).toBe(true);
    expect(FoodSourceSchema.safeParse("user").success).toBe(true);
  });

  it("rejects unknown sources", () => {
    expect(FoodSourceSchema.safeParse("ai").success).toBe(false);
    expect(FoodSourceSchema.safeParse("").success).toBe(false);
  });
});

describe("FoodCreateSchema", () => {
  it("accepts minimal food (only nombre + cal)", () => {
    const result = FoodCreateSchema.safeParse({ nombre: "Manzana", cal: 52 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.p).toBe(0);
      expect(result.data.c).toBe(0);
      expect(result.data.f).toBe(0);
    }
  });

  it("trims whitespace in nombre", () => {
    const result = FoodCreateSchema.parse({ nombre: "  Arepa  ", cal: 220 });
    expect(result.nombre).toBe("Arepa");
  });

  it("rejects empty nombre", () => {
    expect(FoodCreateSchema.safeParse({ nombre: "", cal: 100 }).success).toBe(false);
  });

  it("rejects negative cal", () => {
    expect(FoodCreateSchema.safeParse({ nombre: "X", cal: -10 }).success).toBe(false);
  });

  it("accepts gramsPerUnit + unitLabel", () => {
    const result = FoodCreateSchema.safeParse({
      nombre: "Huevo",
      cal: 70,
      gramsPerUnit: 50,
      unitLabel: "huevo",
    });
    expect(result.success).toBe(true);
  });
});
