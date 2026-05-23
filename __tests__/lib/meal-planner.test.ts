import { describe, it, expect } from "vitest";
import {
  generatePlan,
  filterRecipesByPreferences,
  type Preferences,
  type PlannerRecipe,
} from "@/lib/meal-planner";

const baseGoal = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

function mkRecipe(overrides: Partial<PlannerRecipe>): PlannerRecipe {
  return {
    id: 1,
    name: "Recipe",
    cuisineCode: null,
    dietTags: [],
    allergyTags: [],
    costLevel: 2,
    prepTimeMin: 20,
    cookTimeMin: 20,
    caloriesPerServing: 500,
    proteinPerServing: 30,
    carbsPerServing: 50,
    fatPerServing: 15,
    ...overrides,
  };
}

function mkPrefs(overrides: Partial<Preferences> = {}): Preferences {
  return {
    diet: [],
    allergies: [],
    mealsPerDay: 3,
    maxPrepMinutes: 60,
    costLevel: 3,
    ...overrides,
  };
}

describe("filterRecipesByPreferences", () => {
  it("excluye recetas con allergyTag que el user tiene", () => {
    const recipes = [
      mkRecipe({ id: 1, allergyTags: ["lacteos"] }),
      mkRecipe({ id: 2, allergyTags: [] }),
    ];
    const result = filterRecipesByPreferences(recipes, mkPrefs({ allergies: ["lacteos"] }));
    expect(result.map((r) => r.id)).toEqual([2]);
  });

  it("excluye recetas que NO tienen el dietTag que el user requiere", () => {
    const recipes = [
      mkRecipe({ id: 1, dietTags: ["vegano"] }),
      mkRecipe({ id: 2, dietTags: ["vegetariano"] }),
      mkRecipe({ id: 3, dietTags: [] }),
    ];
    const result = filterRecipesByPreferences(recipes, mkPrefs({ diet: ["vegano"] }));
    expect(result.map((r) => r.id)).toEqual([1]);
  });

  it("filtra por maxPrepMinutes (prep + cook)", () => {
    const recipes = [
      mkRecipe({ id: 1, prepTimeMin: 10, cookTimeMin: 20 }),  // 30 total
      mkRecipe({ id: 2, prepTimeMin: 30, cookTimeMin: 30 }),  // 60 total
      mkRecipe({ id: 3, prepTimeMin: 60, cookTimeMin: 30 }),  // 90 total
    ];
    const result = filterRecipesByPreferences(recipes, mkPrefs({ maxPrepMinutes: 60 }));
    expect(result.map((r) => r.id)).toEqual([1, 2]);
  });

  it("filtra por costLevel <= preferences.costLevel", () => {
    const recipes = [
      mkRecipe({ id: 1, costLevel: 1 }),
      mkRecipe({ id: 2, costLevel: 2 }),
      mkRecipe({ id: 3, costLevel: 3 }),
    ];
    const result = filterRecipesByPreferences(recipes, mkPrefs({ costLevel: 2 }));
    expect(result.map((r) => r.id)).toEqual([1, 2]);
  });

  it("vegano implica vegetariano (no excluye vegetarianas con sus propios tags)", () => {
    const recipes = [
      mkRecipe({ id: 1, dietTags: ["vegano"] }),
      mkRecipe({ id: 2, dietTags: ["vegano", "vegetariano"] }),
    ];
    const result = filterRecipesByPreferences(recipes, mkPrefs({ diet: ["vegano"] }));
    expect(result.length).toBe(2);
  });
});

describe("generatePlan", () => {
  const candidates: PlannerRecipe[] = [
    mkRecipe({ id: 1, caloriesPerServing: 400, name: "Breakfast easy" }),
    mkRecipe({ id: 2, caloriesPerServing: 700, name: "Lunch big" }),
    mkRecipe({ id: 3, caloriesPerServing: 600, name: "Dinner" }),
    mkRecipe({ id: 4, caloriesPerServing: 500 }),
    mkRecipe({ id: 5, caloriesPerServing: 450 }),
    mkRecipe({ id: 6, caloriesPerServing: 550 }),
    mkRecipe({ id: 7, caloriesPerServing: 380 }),
    mkRecipe({ id: 8, caloriesPerServing: 620 }),
    mkRecipe({ id: 9, caloriesPerServing: 530 }),
    mkRecipe({ id: 10, caloriesPerServing: 480 }),
    mkRecipe({ id: 11, caloriesPerServing: 510 }),
    mkRecipe({ id: 12, caloriesPerServing: 470 }),
    mkRecipe({ id: 13, caloriesPerServing: 520 }),
    mkRecipe({ id: 14, caloriesPerServing: 490 }),
  ];

  it("genera 21 entradas (7 días × 3 comidas) con mealsPerDay=3", () => {
    const plan = generatePlan({
      candidates,
      goal: baseGoal,
      preferences: mkPrefs({ mealsPerDay: 3 }),
      startDate: "2026-05-25",
    });
    expect(plan.length).toBe(21);
  });

  it("genera 28 entradas con mealsPerDay=4", () => {
    const plan = generatePlan({
      candidates,
      goal: baseGoal,
      preferences: mkPrefs({ mealsPerDay: 4 }),
      startDate: "2026-05-25",
    });
    expect(plan.length).toBe(28);
  });

  it("genera 35 entradas con mealsPerDay=5", () => {
    const plan = generatePlan({
      candidates,
      goal: baseGoal,
      preferences: mkPrefs({ mealsPerDay: 5 }),
      startDate: "2026-05-25",
    });
    expect(plan.length).toBe(35);
  });

  it("lanza si <14 recetas tras filtrado", () => {
    expect(() =>
      generatePlan({
        candidates: candidates.slice(0, 5),
        goal: baseGoal,
        preferences: mkPrefs(),
        startDate: "2026-05-25",
      })
    ).toThrow();
  });

  it("incluye date secuencial desde startDate", () => {
    const plan = generatePlan({
      candidates,
      goal: baseGoal,
      preferences: mkPrefs({ mealsPerDay: 3 }),
      startDate: "2026-05-25",
    });
    const dates = Array.from(new Set(plan.map((p) => p.date))).sort();
    expect(dates).toEqual([
      "2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28",
      "2026-05-29", "2026-05-30", "2026-05-31",
    ]);
  });

  it("limita repeticiones de la misma receta a máximo 2 por semana", () => {
    const plan = generatePlan({
      candidates,
      goal: baseGoal,
      preferences: mkPrefs({ mealsPerDay: 3 }),
      startDate: "2026-05-25",
    });
    const counts = plan.reduce<Record<number, number>>((acc, p) => {
      acc[p.recipeId] = (acc[p.recipeId] ?? 0) + 1;
      return acc;
    }, {});
    expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2);
  });

  it("mealType corresponde al slot (breakfast/lunch/dinner)", () => {
    const plan = generatePlan({
      candidates,
      goal: baseGoal,
      preferences: mkPrefs({ mealsPerDay: 3 }),
      startDate: "2026-05-25",
    });
    const types = new Set(plan.map((p) => p.mealType));
    expect(types.has("breakfast")).toBe(true);
    expect(types.has("lunch")).toBe(true);
    expect(types.has("dinner")).toBe(true);
  });

  it("servings se ajusta al target del slot (no más de 2x ni menos de 0.5x)", () => {
    const plan = generatePlan({
      candidates,
      goal: baseGoal,
      preferences: mkPrefs(),
      startDate: "2026-05-25",
    });
    for (const p of plan) {
      expect(p.servings).toBeGreaterThanOrEqual(0.5);
      expect(p.servings).toBeLessThanOrEqual(2);
    }
  });
});
