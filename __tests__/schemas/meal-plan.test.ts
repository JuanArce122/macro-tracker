import { describe, it, expect } from "vitest";
import {
  MealPlanPreferencesSchema,
  MealPlanCreateSchema,
  LogPlannedMealSchema,
} from "@/lib/schemas";

describe("MealPlanPreferencesSchema", () => {
  it("acepta preferencias mínimas con defaults", () => {
    const parsed = MealPlanPreferencesSchema.parse({});
    expect(parsed.diet).toEqual([]);
    expect(parsed.allergies).toEqual([]);
    expect(parsed.mealsPerDay).toBe(3);
    expect(parsed.maxPrepMinutes).toBe(60);
    expect(parsed.costLevel).toBe(3);
  });

  it("acepta dieta + alergias válidas", () => {
    const ok = MealPlanPreferencesSchema.safeParse({
      diet: ["vegano", "sin-gluten"],
      allergies: ["lacteos"],
      mealsPerDay: 4,
      maxPrepMinutes: 45,
      costLevel: 2,
    });
    expect(ok.success).toBe(true);
  });

  it("rechaza dieta inválida", () => {
    expect(
      MealPlanPreferencesSchema.safeParse({ diet: ["carnivoro"] }).success
    ).toBe(false);
  });

  it("rechaza mealsPerDay distinto de 3/4/5", () => {
    expect(MealPlanPreferencesSchema.safeParse({ mealsPerDay: 2 }).success).toBe(false);
    expect(MealPlanPreferencesSchema.safeParse({ mealsPerDay: 6 }).success).toBe(false);
  });

  it("rechaza maxPrepMinutes fuera de rango", () => {
    expect(MealPlanPreferencesSchema.safeParse({ maxPrepMinutes: 5 }).success).toBe(false);
    expect(MealPlanPreferencesSchema.safeParse({ maxPrepMinutes: 200 }).success).toBe(false);
  });

  it("rechaza costLevel fuera de 1-3", () => {
    expect(MealPlanPreferencesSchema.safeParse({ costLevel: 0 }).success).toBe(false);
    expect(MealPlanPreferencesSchema.safeParse({ costLevel: 4 }).success).toBe(false);
  });
});

describe("MealPlanCreateSchema", () => {
  it("acepta solo preferences", () => {
    expect(
      MealPlanCreateSchema.safeParse({ preferences: {} }).success
    ).toBe(true);
  });

  it("acepta startDate opcional YYYY-MM-DD", () => {
    expect(
      MealPlanCreateSchema.safeParse({
        preferences: {},
        startDate: "2026-05-25",
      }).success
    ).toBe(true);
  });

  it("rechaza startDate con formato incorrecto", () => {
    expect(
      MealPlanCreateSchema.safeParse({
        preferences: {},
        startDate: "25/05/2026",
      }).success
    ).toBe(false);
  });
});

describe("LogPlannedMealSchema", () => {
  it("acepta plannedMealId positivo", () => {
    expect(LogPlannedMealSchema.safeParse({ plannedMealId: 42 }).success).toBe(true);
  });

  it("acepta weightG opcional", () => {
    expect(
      LogPlannedMealSchema.safeParse({ plannedMealId: 1, weightG: 250 }).success
    ).toBe(true);
  });

  it("rechaza id 0 o negativo", () => {
    expect(LogPlannedMealSchema.safeParse({ plannedMealId: 0 }).success).toBe(false);
    expect(LogPlannedMealSchema.safeParse({ plannedMealId: -5 }).success).toBe(false);
  });

  it("rechaza weightG negativo", () => {
    expect(
      LogPlannedMealSchema.safeParse({ plannedMealId: 1, weightG: -5 }).success
    ).toBe(false);
  });
});
