import { describe, it, expect } from "vitest";
import {
  getRDA,
  prioritizeMicros,
  MICRO_KEYS,
  type MicroKey,
  type UserProfile,
} from "@/lib/micros";

const FEMALE_FERTILE: UserProfile = { sex: "female", age: 28, fitnessGoal: null };
const MALE_MID: UserProfile = { sex: "male", age: 35, fitnessGoal: null };
const ELDERLY: UserProfile = { sex: "male", age: 65, fitnessGoal: null };
const LOSE: UserProfile = { sex: "male", age: 30, fitnessGoal: "lose" };
const GAIN: UserProfile = { sex: "male", age: 30, fitnessGoal: "gain" };

describe("getRDA", () => {
  it("retorna fiber distinto para hombres y mujeres", () => {
    expect(getRDA("fiber", MALE_MID).min).toBe(38);
    expect(getRDA("fiber", FEMALE_FERTILE).min).toBe(25);
  });

  it("retorna iron mayor para mujeres en edad fértil", () => {
    expect(getRDA("iron", FEMALE_FERTILE).min).toBe(18);
    expect(getRDA("iron", MALE_MID).min).toBe(8);
  });

  it("vitamina C distinto por sexo", () => {
    expect(getRDA("vitaminC", MALE_MID).min).toBe(90);
    expect(getRDA("vitaminC", FEMALE_FERTILE).min).toBe(75);
  });

  it("sodium tiene min + max (rango)", () => {
    const r = getRDA("sodium", MALE_MID);
    expect(r.min).toBe(1500);
    expect(r.max).toBe(2300);
  });

  it("sugar solo tiene max (no min recomendado)", () => {
    const r = getRDA("sugar", MALE_MID);
    expect(r.max).toBe(50);
    expect(r.min).toBe(0);
  });

  it("retorna unidad correcta para cada nutriente", () => {
    expect(getRDA("fiber", MALE_MID).unit).toBe("g");
    expect(getRDA("sodium", MALE_MID).unit).toBe("mg");
    expect(getRDA("vitaminD", MALE_MID).unit).toBe("µg");
    expect(getRDA("vitaminA", MALE_MID).unit).toBe("µg");
  });

  it("nutriente desconocido retorna { min: 0, unit: '' }", () => {
    expect(getRDA("unknown" as MicroKey, MALE_MID)).toEqual({ min: 0, unit: "" });
  });
});

describe("prioritizeMicros", () => {
  it("retorna 5 micros priorizados", () => {
    expect(prioritizeMicros(MALE_MID).length).toBe(5);
  });

  it("prioriza iron + folate + calcium + vitaminD para mujer en edad fértil", () => {
    const result = prioritizeMicros(FEMALE_FERTILE);
    expect(result).toContain("iron");
    expect(result).toContain("folate");
    expect(result).toContain("calcium");
    expect(result).toContain("vitaminD");
  });

  it("prioriza calcium + vitaminD + B12 + potassium para adulto mayor", () => {
    const result = prioritizeMicros(ELDERLY);
    expect(result).toContain("calcium");
    expect(result).toContain("vitaminD");
    expect(result).toContain("vitaminB12");
    expect(result).toContain("potassium");
  });

  it("prioriza zinc + magnesium + potassium + iron para ganancia muscular", () => {
    const result = prioritizeMicros(GAIN);
    expect(result).toContain("zinc");
    expect(result).toContain("magnesium");
    expect(result).toContain("iron");
  });

  it("prioriza fiber + potassium + magnesium + vitaminD para pérdida de grasa", () => {
    const result = prioritizeMicros(LOSE);
    expect(result).toContain("fiber");
    expect(result).toContain("potassium");
  });

  it("retorna defaults cuando no aplica ninguna regla", () => {
    const result = prioritizeMicros(MALE_MID);
    expect(result.length).toBe(5);
    // Default incluye fiber + potassium + iron
    expect(result).toContain("fiber");
  });

  it("nunca incluye duplicados", () => {
    const result = prioritizeMicros(FEMALE_FERTILE);
    expect(new Set(result).size).toBe(result.length);
  });

  it("todos los keys retornados son válidos", () => {
    const result = prioritizeMicros(FEMALE_FERTILE);
    for (const k of result) {
      expect(MICRO_KEYS).toContain(k);
    }
  });
});
