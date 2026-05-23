import { describe, it, expect } from "vitest";
import { WeightCreateSchema, GoalAdjustmentModeSchema } from "@/lib/schemas";

describe("WeightCreateSchema", () => {
  it("acepta peso normal", () => {
    expect(WeightCreateSchema.safeParse({ weightKg: 70.5 }).success).toBe(true);
  });

  it("acepta date opcional en formato YYYY-MM-DD", () => {
    expect(WeightCreateSchema.safeParse({ weightKg: 70, date: "2026-05-22" }).success).toBe(true);
  });

  it("rechaza date en formato incorrecto", () => {
    expect(WeightCreateSchema.safeParse({ weightKg: 70, date: "22/05/2026" }).success).toBe(false);
  });

  it("rechaza weightKg muy bajo", () => {
    expect(WeightCreateSchema.safeParse({ weightKg: 5 }).success).toBe(false);
  });

  it("rechaza weightKg muy alto", () => {
    expect(WeightCreateSchema.safeParse({ weightKg: 600 }).success).toBe(false);
  });

  it("rechaza Infinity / NaN", () => {
    expect(WeightCreateSchema.safeParse({ weightKg: Infinity }).success).toBe(false);
    expect(WeightCreateSchema.safeParse({ weightKg: NaN }).success).toBe(false);
  });

  it("rechaza missing weightKg", () => {
    expect(WeightCreateSchema.safeParse({}).success).toBe(false);
  });
});

describe("GoalAdjustmentModeSchema", () => {
  it("acepta los 3 modos válidos", () => {
    for (const m of ["manual", "suggested", "auto"]) {
      expect(GoalAdjustmentModeSchema.safeParse(m).success).toBe(true);
    }
  });

  it("rechaza otros valores", () => {
    expect(GoalAdjustmentModeSchema.safeParse("automatic").success).toBe(false);
    expect(GoalAdjustmentModeSchema.safeParse("").success).toBe(false);
    expect(GoalAdjustmentModeSchema.safeParse(null).success).toBe(false);
  });
});
