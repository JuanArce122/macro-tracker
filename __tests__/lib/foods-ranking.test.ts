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

  it("prefers personal user food (userId set) over verified USDA", () => {
    // HU-04: solo cuenta como "personal" si userId no es null
    const personalFood = makeFood({ source: "user", userId: 1 });
    const verifiedUsda = makeFood({ source: "usda", verifiedAt: new Date() });
    expect(scoreFood(personalFood, null)).toBeGreaterThan(scoreFood(verifiedUsda, null));
  });

  it("does NOT give USER boost to curated regional foods (userId=null, source=user)", () => {
    // HU-12 + HU-04: seed regional CO usa source=user pero userId=null;
    // esos son globales curados, NO personales del usuario.
    const curatedRegional = makeFood({ source: "user", userId: null });
    const personalFood = makeFood({ source: "user", userId: 1 });
    expect(scoreFood(personalFood, null)).toBeGreaterThan(scoreFood(curatedRegional, null));
  });

  it("usageCount adds to score but is capped at 30", () => {
    const lowUsage = makeFood({ source: "openfoodfacts", usageCount: 5 });
    const highUsage = makeFood({ source: "openfoodfacts", usageCount: 100 });
    const veryHighUsage = makeFood({ source: "openfoodfacts", usageCount: 1000 });
    expect(scoreFood(lowUsage, null)).toBe(5);
    expect(scoreFood(highUsage, null)).toBe(30); // cap
    expect(scoreFood(veryHighUsage, null)).toBe(30); // still cap
  });

  it("regional CO beats verified USDA + high usage", () => {
    const regional = makeFood({ regionCode: "CO", source: "openfoodfacts", usageCount: 0 });
    const popularUsda = makeFood({ regionCode: null, source: "usda", verifiedAt: new Date(), usageCount: 30 });
    expect(scoreFood(regional, "CO")).toBeGreaterThan(scoreFood(popularUsda, "CO"));
  });

  // ── HU-04: BD dos capas ──────────────────────────────────────────
  it("gives a verified boost when verifiedAt is set", () => {
    const verified = makeFood({ verifiedAt: new Date() });
    const unverified = makeFood({ verifiedAt: null });
    expect(scoreFood(verified, null)).toBeGreaterThan(scoreFood(unverified, null));
  });

  it("penalizes foods marked needsReview", () => {
    const flagged = makeFood({ needsReview: true });
    const normal = makeFood({ needsReview: false });
    expect(scoreFood(flagged, null)).toBeLessThan(scoreFood(normal, null));
  });

  it("voteScore raises ranking (positive)", () => {
    const liked = makeFood({ voteScore: 10 });
    const neutral = makeFood({ voteScore: 0 });
    expect(scoreFood(liked, null)).toBeGreaterThan(scoreFood(neutral, null));
  });

  it("voteScore lowers ranking (negative)", () => {
    const disliked = makeFood({ voteScore: -10 });
    const neutral = makeFood({ voteScore: 0 });
    expect(scoreFood(disliked, null)).toBeLessThan(scoreFood(neutral, null));
  });

  it("voteScore is capped at ±20", () => {
    const extremePositive = makeFood({ voteScore: 9999 });
    const cappedPositive = makeFood({ voteScore: 20 });
    expect(scoreFood(extremePositive, null)).toBe(scoreFood(cappedPositive, null));
  });

  it("needsReview penalty pushes a flagged food below the same food unflagged", () => {
    // HU-04: dos alimentos idénticos excepto needsReview; el flagged debe rankear menos
    const flagged = makeFood({ regionCode: "CO", needsReview: true });
    const clean = makeFood({ regionCode: "CO", needsReview: false });
    expect(scoreFood(flagged, "CO")).toBeLessThan(scoreFood(clean, "CO"));
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
