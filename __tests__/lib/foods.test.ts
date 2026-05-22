import { describe, it, expect } from "vitest";
import { searchFoods, calcMacros, FOODS, type Food } from "@/lib/foods";

describe("searchFoods", () => {
  it("returns empty array for empty query", () => {
    expect(searchFoods("")).toEqual([]);
    expect(searchFoods("   ")).toEqual([]);
  });

  it("finds 'pollo' in seed data", () => {
    const results = searchFoods("pollo");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].nombre.toLowerCase()).toContain("pollo");
  });

  it("supports multi-word queries (AND)", () => {
    const results = searchFoods("pechuga pollo");
    expect(results.length).toBeGreaterThan(0);
    for (const f of results) {
      const n = f.nombre.toLowerCase();
      expect(n).toContain("pechuga");
      expect(n).toContain("pollo");
    }
  });

  it("caps at 10 results", () => {
    // "de" probablemente aparece en muchos nombres
    const results = searchFoods("de");
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("merges extra foods before searching", () => {
    const extra: Food[] = [
      { id: 9999, nombre: "Mi alimento custom", categoria: "proteina", cal: 100, p: 20, c: 5, f: 1 },
    ];
    const results = searchFoods("custom", extra);
    expect(results.some((f) => f.id === 9999)).toBe(true);
  });
});

describe("calcMacros", () => {
  const food: Food = {
    id: 1,
    nombre: "Test",
    categoria: "proteina",
    cal: 100,
    p: 20,
    c: 0,
    f: 2,
  };

  it("scales correctly for 100g", () => {
    const result = calcMacros(food, 100);
    expect(result).toEqual({ calorias: 100, proteina: 20, carbs: 0, grasa: 2 });
  });

  it("scales correctly for 50g", () => {
    const result = calcMacros(food, 50);
    expect(result.calorias).toBe(50);
    expect(result.proteina).toBe(10);
    expect(result.grasa).toBe(1);
  });

  it("scales correctly for 200g", () => {
    const result = calcMacros(food, 200);
    expect(result.calorias).toBe(200);
    expect(result.proteina).toBe(40);
  });

  it("rounds to 1 decimal place", () => {
    const result = calcMacros(food, 33);
    // 100 * 0.33 = 33; 20 * 0.33 = 6.6
    expect(result.proteina).toBe(6.6);
  });
});

describe("FOODS data integrity", () => {
  it("has at least 100 entries", () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(100);
  });

  it("all entries have valid macros", () => {
    for (const food of FOODS) {
      expect(food.id).toBeGreaterThan(0);
      expect(food.nombre).not.toBe("");
      expect(food.cal).toBeGreaterThanOrEqual(0);
      expect(food.p).toBeGreaterThanOrEqual(0);
      expect(food.c).toBeGreaterThanOrEqual(0);
      expect(food.f).toBeGreaterThanOrEqual(0);
    }
  });

  it("all IDs are unique", () => {
    const ids = FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
