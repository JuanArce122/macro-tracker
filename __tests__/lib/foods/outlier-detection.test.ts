import { describe, it, expect } from "vitest";
import { detectOutliersFromFoods, type FoodForOutlierCheck } from "@/lib/foods/outlier-detection";

function makeFood(id: number, cal: number, categoria = "proteina"): FoodForOutlierCheck {
  return { id, cal, categoria, verifiedAt: null };
}

describe("detectOutliersFromFoods", () => {
  it("returns empty array when no foods provided", () => {
    expect(detectOutliersFromFoods([])).toEqual([]);
  });

  it("ignores categories with fewer than 10 items", () => {
    // 5 alimentos en una categoría: insuficiente para estadística
    const foods = Array.from({ length: 5 }, (_, i) => makeFood(i + 1, 100 + i, "experimental"));
    expect(detectOutliersFromFoods(foods)).toEqual([]);
  });

  it("flags a food >3σ from the category mean", () => {
    // 20 proteínas con media ~120 kcal, σ ~10 → outlier es uno con 500 kcal
    const foods: FoodForOutlierCheck[] = [
      ...Array.from({ length: 20 }, (_, i) => makeFood(i + 1, 110 + i)),
      makeFood(100, 500), // outlier obvio
    ];
    const outliers = detectOutliersFromFoods(foods);
    expect(outliers.map((o) => o.id)).toContain(100);
  });

  it("ignores already-verified foods (no flag)", () => {
    const foods: FoodForOutlierCheck[] = [
      ...Array.from({ length: 20 }, (_, i) => makeFood(i + 1, 110 + i)),
      { id: 100, cal: 500, categoria: "proteina", verifiedAt: new Date() }, // verificado
    ];
    const outliers = detectOutliersFromFoods(foods);
    expect(outliers.map((o) => o.id)).not.toContain(100);
  });

  it("does NOT flag mild outliers (between 1σ and 3σ)", () => {
    // Distribución amplia (σ ~ 28) con media ~150. Un valor en 200 está
    // a ~1.7σ — debajo del umbral 3σ → no debe flagear.
    const cals = [100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195];
    const foods: FoodForOutlierCheck[] = cals.map((c, i) => makeFood(i + 1, c));
    foods.push(makeFood(100, 200)); // borderline pero <3σ
    const outliers = detectOutliersFromFoods(foods);
    expect(outliers.map((o) => o.id)).not.toContain(100);
  });

  it("computes outliers per category independently", () => {
    // proteinas centradas en 120, carbohidratos en 350
    // Un carbo con 350 está dentro de su categoría → no outlier
    // Un proteina con 350 SÍ es outlier (muy lejos de su media 120)
    const foods: FoodForOutlierCheck[] = [
      ...Array.from({ length: 15 }, (_, i) => makeFood(i + 1, 110 + i, "proteina")),
      ...Array.from({ length: 15 }, (_, i) => makeFood(i + 100, 340 + i, "carbo")),
      makeFood(999, 350, "proteina"), // proteina anómala
      makeFood(1000, 355, "carbo"),   // carbo normal
    ];
    const outliers = detectOutliersFromFoods(foods);
    const ids = outliers.map((o) => o.id);
    expect(ids).toContain(999);
    expect(ids).not.toContain(1000);
  });

  it("returns a stable list (no duplicates)", () => {
    const foods: FoodForOutlierCheck[] = [
      ...Array.from({ length: 20 }, (_, i) => makeFood(i + 1, 110 + i)),
      makeFood(100, 500),
      makeFood(101, 600),
    ];
    const outliers = detectOutliersFromFoods(foods);
    const ids = outliers.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
