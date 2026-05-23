import { describe, it, expect } from "vitest";
import {
  extractMicros,
  type FDCFood,
  NUTRIENT_ID_MAP,
} from "@/lib/usda/client";

function makeFood(nutrients: Array<{ nutrientId: number; value: number }>): FDCFood {
  return {
    fdcId: 1,
    description: "Test",
    dataType: "Foundation",
    foodNutrients: nutrients.map((n) => ({
      nutrientId: n.nutrientId,
      nutrientName: "?",
      unitName: "?",
      value: n.value,
    })),
  };
}

describe("NUTRIENT_ID_MAP", () => {
  it("incluye las macros estándar", () => {
    expect(NUTRIENT_ID_MAP[1003]).toBe("p");          // Protein
    expect(NUTRIENT_ID_MAP[1004]).toBe("f");          // Fat
    expect(NUTRIENT_ID_MAP[1005]).toBe("c");          // Carbs
    expect(NUTRIENT_ID_MAP[1008]).toBe("cal");        // Energy
  });

  it("incluye los 15 micros priorizados", () => {
    const micros = ["fiber", "sugar", "sodium", "potassium", "calcium", "iron",
                    "vitaminC", "vitaminD", "vitaminB12", "vitaminA", "folate",
                    "magnesium", "zinc", "omega3", "omega6"];
    const mapped = Object.values(NUTRIENT_ID_MAP);
    for (const m of micros) {
      expect(mapped).toContain(m);
    }
  });
});

describe("extractMicros", () => {
  it("extrae macros básicas desde nutrientIds estándar", () => {
    const food = makeFood([
      { nutrientId: 1008, value: 150 },  // cal
      { nutrientId: 1003, value: 30 },   // p
      { nutrientId: 1004, value: 5 },    // f
      { nutrientId: 1005, value: 0 },    // c
    ]);
    const result = extractMicros(food);
    expect(result.cal).toBe(150);
    expect(result.p).toBe(30);
  });

  it("extrae micros conocidos", () => {
    const food = makeFood([
      { nutrientId: 1079, value: 5 },     // fiber
      { nutrientId: 1093, value: 200 },   // sodium
      { nutrientId: 1162, value: 15 },    // vitC
    ]);
    const result = extractMicros(food);
    expect(result.fiber).toBe(5);
    expect(result.sodium).toBe(200);
    expect(result.vitaminC).toBe(15);
  });

  it("ignora nutrientIds desconocidos sin error", () => {
    const food = makeFood([
      { nutrientId: 99999, value: 100 },  // desconocido
      { nutrientId: 1008, value: 50 },    // cal — válido
    ]);
    const result = extractMicros(food);
    expect(result.cal).toBe(50);
    expect(Object.keys(result).length).toBe(1);
  });

  it("retorna {} para foodNutrients vacío", () => {
    expect(extractMicros(makeFood([]))).toEqual({});
  });

  it("ignora nutrients sin value (null/undefined)", () => {
    const food: FDCFood = {
      fdcId: 1,
      description: "x",
      dataType: "x",
      foodNutrients: [
        { nutrientId: 1003, nutrientName: "p", unitName: "g" }, // value missing
        { nutrientId: 1008, nutrientName: "cal", unitName: "kcal", value: 100 },
      ],
    };
    const result = extractMicros(food);
    expect(result.p).toBeUndefined();
    expect(result.cal).toBe(100);
  });
});
