import { describe, it, expect } from "vitest";
import { ProfileUpdateSchema, SexSchema, ActivityLevelSchema, FitnessGoalSchema } from "@/lib/schemas";

describe("Enum schemas", () => {
  it("SexSchema accepts male/female only", () => {
    expect(SexSchema.safeParse("male").success).toBe(true);
    expect(SexSchema.safeParse("female").success).toBe(true);
    expect(SexSchema.safeParse("other").success).toBe(false);
  });

  it("ActivityLevelSchema accepts the 5 valid levels", () => {
    const levels = ["sedentary", "light", "moderate", "active", "very_active"];
    for (const l of levels) {
      expect(ActivityLevelSchema.safeParse(l).success).toBe(true);
    }
    expect(ActivityLevelSchema.safeParse("extreme").success).toBe(false);
  });

  it("FitnessGoalSchema accepts lose/maintain/gain", () => {
    expect(FitnessGoalSchema.safeParse("lose").success).toBe(true);
    expect(FitnessGoalSchema.safeParse("bulk").success).toBe(false);
  });
});

describe("ProfileUpdateSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(ProfileUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a complete profile", () => {
    const result = ProfileUpdateSchema.safeParse({
      name: "Juan",
      age: 30,
      sex: "male",
      weightKg: 70.5,
      heightCm: 175,
      activityLevel: "moderate",
      fitnessGoal: "maintain",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null values for all fields (allows clearing)", () => {
    const result = ProfileUpdateSchema.safeParse({
      name: null,
      age: null,
      weightKg: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects age below 10", () => {
    expect(ProfileUpdateSchema.safeParse({ age: 5 }).success).toBe(false);
  });

  it("rejects weight above 400 kg", () => {
    expect(ProfileUpdateSchema.safeParse({ weightKg: 500 }).success).toBe(false);
  });

  it("rejects height below 50 cm", () => {
    expect(ProfileUpdateSchema.safeParse({ heightCm: 30 }).success).toBe(false);
  });

  it("rejects invalid sex value", () => {
    expect(ProfileUpdateSchema.safeParse({ sex: "X" }).success).toBe(false);
  });

  // ── HU-12: countryCode ────────────────────────────────────────────
  it("accepts CO as countryCode", () => {
    expect(ProfileUpdateSchema.safeParse({ countryCode: "CO" }).success).toBe(true);
  });

  it("accepts null countryCode (clearing)", () => {
    expect(ProfileUpdateSchema.safeParse({ countryCode: null }).success).toBe(true);
  });

  it("rejects unknown country code", () => {
    expect(ProfileUpdateSchema.safeParse({ countryCode: "XX" }).success).toBe(false);
  });

  it("rejects lowercase country code", () => {
    expect(ProfileUpdateSchema.safeParse({ countryCode: "co" }).success).toBe(false);
  });
});
