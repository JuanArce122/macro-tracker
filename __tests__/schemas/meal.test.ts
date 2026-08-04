import { describe, it, expect } from "vitest";
import { MealCreateSchema, MealItemSchema, MealCategorySchema } from "@/lib/schemas";

describe("MealCategorySchema", () => {
  it("accepts valid categories (español — lo que envía el frontend)", () => {
    for (const cat of ["desayuno", "almuerzo", "cena", "snack"]) {
      expect(MealCategorySchema.safeParse(cat).success).toBe(true);
    }
  });

  it("rejects English categories (regresión B1: el contrato es español)", () => {
    for (const cat of ["breakfast", "lunch", "dinner"]) {
      expect(MealCategorySchema.safeParse(cat).success).toBe(false);
    }
  });

  it("rejects invalid categories", () => {
    expect(MealCategorySchema.safeParse("breakfast").success).toBe(false);
    expect(MealCategorySchema.safeParse("brunch").success).toBe(false);
    expect(MealCategorySchema.safeParse("").success).toBe(false);
  });
});

describe("MealItemSchema", () => {
  it("accepts a complete item", () => {
    const item = {
      nombre: "Pollo",
      unidades: 1,
      pesoG: 100,
      calorias: 165,
      proteina: 31,
      carbs: 0,
      grasa: 3.6,
      confianza: 0.95,
    };
    expect(MealItemSchema.safeParse(item).success).toBe(true);
  });

  it("defaults unidades to 1 when missing", () => {
    const item = {
      nombre: "Arroz",
      pesoG: 50,
      calorias: 65,
      proteina: 1.4,
      carbs: 14,
      grasa: 0.1,
      confianza: 0.9,
    };
    const result = MealItemSchema.parse(item);
    expect(result.unidades).toBe(1);
  });

  it("rejects confianza > 1", () => {
    const item = {
      nombre: "X",
      pesoG: 10,
      calorias: 10,
      proteina: 0,
      carbs: 0,
      grasa: 0,
      confianza: 1.5,
    };
    expect(MealItemSchema.safeParse(item).success).toBe(false);
  });

  it("rejects negative pesoG", () => {
    const item = {
      nombre: "X",
      pesoG: -10,
      calorias: 10,
      proteina: 0,
      carbs: 0,
      grasa: 0,
      confianza: 0.5,
    };
    expect(MealItemSchema.safeParse(item).success).toBe(false);
  });
});

describe("MealCreateSchema", () => {
  const validMeal = {
    date: "2026-05-22T12:00:00.000Z",
    dateLocal: "2026-05-22",
    category: "almuerzo" as const,
    name: "Almuerzo de prueba",
    weightG: 300,
    calories: 500,
    protein: 30,
    carbs: 50,
    fat: 15,
    confidence: 0.8,
  };

  it("accepts a complete meal", () => {
    expect(MealCreateSchema.safeParse(validMeal).success).toBe(true);
  });

  it("rejects empty name", () => {
    const meal = { ...validMeal, name: "" };
    expect(MealCreateSchema.safeParse(meal).success).toBe(false);
  });

  it("rejects invalid dateLocal format", () => {
    const meal = { ...validMeal, dateLocal: "22/05/2026" };
    expect(MealCreateSchema.safeParse(meal).success).toBe(false);
  });

  it("defaults confidence to 1 when missing", () => {
    const meal = { ...validMeal };
    delete (meal as { confidence?: number }).confidence;
    const parsed = MealCreateSchema.parse(meal);
    expect(parsed.confidence).toBe(1);
  });

  it("accepts null dateLocal", () => {
    const meal = { ...validMeal, dateLocal: null };
    expect(MealCreateSchema.safeParse(meal).success).toBe(true);
  });
});
