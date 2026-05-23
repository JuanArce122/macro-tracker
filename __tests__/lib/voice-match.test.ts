import { describe, it, expect } from "vitest";
import {
  parsedToWeightGrams,
  computeMacros,
  type ParsedVoiceItem,
} from "@/lib/voice/match-foods";

describe("parsedToWeightGrams", () => {
  it("retorna cantidad directa si unidad = 'g'", () => {
    expect(parsedToWeightGrams({ unidad: "g", cantidad: 150 }, null)).toBe(150);
  });

  it("retorna cantidad directa si unidad = 'ml' (aprox densidad agua)", () => {
    expect(parsedToWeightGrams({ unidad: "ml", cantidad: 240 }, null)).toBe(240);
  });

  it("convierte 'taza' a 240 g", () => {
    expect(parsedToWeightGrams({ unidad: "taza", cantidad: 1 }, null)).toBe(240);
  });

  it("convierte 'cucharada' a 15 g", () => {
    expect(parsedToWeightGrams({ unidad: "cucharada", cantidad: 2 }, null)).toBe(30);
  });

  it("convierte 'porcion' a 150 g (fallback)", () => {
    expect(parsedToWeightGrams({ unidad: "porcion", cantidad: 1 }, null)).toBe(150);
  });

  it("usa gramsPerUnit del food matcheado cuando unidad='unidad'", () => {
    const food = { gramsPerUnit: 50 } as { gramsPerUnit: number };
    expect(parsedToWeightGrams({ unidad: "unidad", cantidad: 3 }, food)).toBe(150);
  });

  it("usa 100g default cuando unidad='unidad' y food no tiene gramsPerUnit", () => {
    expect(parsedToWeightGrams({ unidad: "unidad", cantidad: 2 }, { gramsPerUnit: null })).toBe(200);
    expect(parsedToWeightGrams({ unidad: "unidad", cantidad: 2 }, null)).toBe(200);
  });

  it("redondea a entero el resultado final", () => {
    // 1.5 cucharadas = 22.5 g → 23
    expect(parsedToWeightGrams({ unidad: "cucharada", cantidad: 1.5 }, null)).toBe(23);
  });
});

describe("computeMacros", () => {
  const food = { cal: 100, p: 20, c: 5, f: 2 };

  it("escala correctamente para 100 g", () => {
    expect(computeMacros(food, 100)).toEqual({ calorias: 100, proteina: 20, carbs: 5, grasa: 2 });
  });

  it("escala correctamente para 200 g", () => {
    expect(computeMacros(food, 200)).toEqual({ calorias: 200, proteina: 40, carbs: 10, grasa: 4 });
  });

  it("escala correctamente para 50 g", () => {
    expect(computeMacros(food, 50)).toEqual({ calorias: 50, proteina: 10, carbs: 2.5, grasa: 1 });
  });

  it("redondea proteína/carbs/grasa a 1 decimal", () => {
    const f = { cal: 100, p: 21.789, c: 5.123, f: 2.555 };
    const r = computeMacros(f, 100);
    expect(r.proteina).toBe(21.8);
    expect(r.carbs).toBe(5.1);
    expect(r.grasa).toBe(2.6);
  });

  it("redondea calorías a entero", () => {
    expect(computeMacros({ cal: 153.7, p: 0, c: 0, f: 0 }, 100).calorias).toBe(154);
  });
});

describe("ParsedVoiceItem type guards", () => {
  it("acepta items con unidades válidas", () => {
    const valid: ParsedVoiceItem[] = [
      { nombre: "x", cantidad: 1, unidad: "g", confianza: 1 },
      { nombre: "x", cantidad: 1, unidad: "ml", confianza: 1 },
      { nombre: "x", cantidad: 1, unidad: "unidad", confianza: 1 },
      { nombre: "x", cantidad: 1, unidad: "taza", confianza: 1 },
      { nombre: "x", cantidad: 1, unidad: "cucharada", confianza: 1 },
      { nombre: "x", cantidad: 1, unidad: "porcion", confianza: 1 },
    ];
    expect(valid.length).toBe(6);
  });
});
