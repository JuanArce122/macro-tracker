import { describe, it, expect } from "vitest";
import { FoodVoteSchema } from "@/lib/schemas";

describe("FoodVoteSchema", () => {
  it("accepts +1", () => {
    expect(FoodVoteSchema.safeParse({ vote: 1 }).success).toBe(true);
  });

  it("accepts -1", () => {
    expect(FoodVoteSchema.safeParse({ vote: -1 }).success).toBe(true);
  });

  it("rejects 0", () => {
    expect(FoodVoteSchema.safeParse({ vote: 0 }).success).toBe(false);
  });

  it("rejects values outside ±1", () => {
    expect(FoodVoteSchema.safeParse({ vote: 2 }).success).toBe(false);
    expect(FoodVoteSchema.safeParse({ vote: -10 }).success).toBe(false);
  });

  it("rejects missing vote field", () => {
    expect(FoodVoteSchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-numeric vote", () => {
    expect(FoodVoteSchema.safeParse({ vote: "1" }).success).toBe(false);
  });
});
