import { describe, it, expect } from "vitest";
import { scoreFood, rankFoods, type RankableFood } from "@/lib/foods/ranking";

function makeFood(overrides: Partial<RankableFood>): RankableFood {
  return {
    id: 1,
    source: "usda",
    regionCode: null,
    usageCount: 0,
    userId: null,
    ...overrides,
  };
}

describe("scoreFood", () => {
  it("gives highest score to regional matches with user country", () => {
    const food = makeFood({ regionCode: "CO" });
    const score = scoreFood(food, "CO");
    expect(score).toBeGreaterThanOrEqual(1000);
  });

  it("gives LAC boost when food is regional LATAM and user has no country", () => {
    const food = makeFood({ regionCode: "LAC" });
    expect(scoreFood(food, null)).toBeGreaterThanOrEqual(500);
  });

  it("does NOT give regional boost when food region differs from user country", () => {
    const food = makeFood({ regionCode: "MX" });
    const score = scoreFood(food, "CO");
    // Sin boost regional, solo el de source y usageCount
    expect(score).toBeLessThan(500);
  });

  it("prefers user source over usda source", () => {
    const userFood = makeFood({ source: "user" });
    const usdaFood = makeFood({ source: "usda" });
    expect(scoreFood(userFood, null)).toBeGreaterThan(scoreFood(usdaFood, null));
  });

  it("usageCount adds to score but is capped at 30", () => {
    const lowUsage = makeFood({ source: "openfoodfacts", usageCount: 5 });
    const highUsage = makeFood({ source: "openfoodfacts", usageCount: 100 });
    const veryHighUsage = makeFood({ source: "openfoodfacts", usageCount: 1000 });
    expect(scoreFood(lowUsage, null)).toBe(5);
    expect(scoreFood(highUsage, null)).toBe(30); // cap
    expect(scoreFood(veryHighUsage, null)).toBe(30); // still cap
  });

  it("regional CO beats USDA + high usage", () => {
    const regional = makeFood({ regionCode: "CO", source: "openfoodfacts", usageCount: 0 });
    const popularUsda = makeFood({ regionCode: null, source: "usda", usageCount: 30 });
    expect(scoreFood(regional, "CO")).toBeGreaterThan(scoreFood(popularUsda, "CO"));
  });
});

describe("rankFoods", () => {
  it("returns CO foods first when user is CO", () => {
    const foods = [
      makeFood({ id: 1, regionCode: null,  source: "usda" }),
      makeFood({ id: 2, regionCode: "CO",  source: "user" }),
      makeFood({ id: 3, regionCode: "MX",  source: "usda" }),
      makeFood({ id: 4, regionCode: "LAC", source: "openfoodfacts" }),
    ];
    const ranked = rankFoods(foods, "CO", 4);
    expect(ranked[0].id).toBe(2); // CO + user wins
  });

  it("returns at most `limit` foods", () => {
    const foods = Array.from({ length: 20 }, (_, i) => makeFood({ id: i + 1 }));
    const ranked = rankFoods(foods, null, 5);
    expect(ranked.length).toBe(5);
  });

  it("LAC foods rank above pure global when user has no country", () => {
    const foods = [
      makeFood({ id: 1, regionCode: null, source: "openfoodfacts" }),
      makeFood({ id: 2, regionCode: "LAC", source: "openfoodfacts" }),
    ];
    const ranked = rankFoods(foods, null, 2);
    expect(ranked[0].id).toBe(2);
  });

  it("returns empty array when input is empty", () => {
    expect(rankFoods([], "CO", 10)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const foods = [
      makeFood({ id: 1, regionCode: null }),
      makeFood({ id: 2, regionCode: "CO" }),
    ];
    const originalOrder = foods.map((f) => f.id);
    rankFoods(foods, "CO", 2);
    expect(foods.map((f) => f.id)).toEqual(originalOrder);
  });
});
