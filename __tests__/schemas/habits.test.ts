import { describe, it, expect } from "vitest";
import { HabitEntryUpsertSchema, TrackingModeSchema } from "@/lib/schemas";

describe("TrackingModeSchema", () => {
  it("acepta los 2 modos válidos", () => {
    expect(TrackingModeSchema.safeParse("macros").success).toBe(true);
    expect(TrackingModeSchema.safeParse("habits").success).toBe(true);
  });

  it("rechaza otros valores", () => {
    expect(TrackingModeSchema.safeParse("calories").success).toBe(false);
    expect(TrackingModeSchema.safeParse("").success).toBe(false);
    expect(TrackingModeSchema.safeParse(null).success).toBe(false);
  });
});

describe("HabitEntryUpsertSchema", () => {
  it("acepta entry con todas las porciones", () => {
    const ok = HabitEntryUpsertSchema.safeParse({
      proteinPortions: 4,
      vegPortions: 5,
      carbPortions: 3,
      fatPortions: 2,
      fruitPortions: 2,
    });
    expect(ok.success).toBe(true);
  });

  it("acepta entry parcial (solo algunas porciones)", () => {
    expect(
      HabitEntryUpsertSchema.safeParse({ proteinPortions: 3 }).success
    ).toBe(true);
  });

  it("acepta date YYYY-MM-DD opcional", () => {
    expect(
      HabitEntryUpsertSchema.safeParse({ date: "2026-05-22", proteinPortions: 2 }).success
    ).toBe(true);
  });

  it("acepta porciones en 0", () => {
    expect(
      HabitEntryUpsertSchema.safeParse({ proteinPortions: 0, vegPortions: 0 }).success
    ).toBe(true);
  });

  it("rechaza porciones negativas", () => {
    expect(
      HabitEntryUpsertSchema.safeParse({ proteinPortions: -1 }).success
    ).toBe(false);
  });

  it("rechaza porciones > 99", () => {
    expect(
      HabitEntryUpsertSchema.safeParse({ proteinPortions: 100 }).success
    ).toBe(false);
  });

  it("rechaza decimales en porciones", () => {
    expect(
      HabitEntryUpsertSchema.safeParse({ proteinPortions: 1.5 }).success
    ).toBe(false);
  });

  it("rechaza date en formato incorrecto", () => {
    expect(
      HabitEntryUpsertSchema.safeParse({ date: "22/05/2026", proteinPortions: 2 }).success
    ).toBe(false);
  });
});
