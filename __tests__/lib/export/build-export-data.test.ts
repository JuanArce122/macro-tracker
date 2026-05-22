import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildExportData, type ExportRange } from "@/lib/export/build-export-data";

// Mock de Prisma global — cada test resetea sus mocks
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    meal: { findMany: vi.fn() },
    goal: { findFirst: vi.fn() },
    food: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const USER_ID = 42;

const mockUser = {
  id: USER_ID,
  email: "user@test.com",
  name: "Juan",
  avatarEmoji: null,
  age: 30,
  sex: "male",
  weightKg: 70,
  heightCm: 175,
  activityLevel: "moderate",
  fitnessGoal: "maintain",
  countryCode: "CO",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const mockGoal = {
  id: 1,
  userId: USER_ID,
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

const mockMeal = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: USER_ID,
  date: new Date("2026-05-22T12:00:00.000Z"),
  dateLocal: "2026-05-22",
  category: "lunch",
  name: "Test meal",
  imageUrl: null,
  weightG: 200,
  calories: 400,
  protein: 25,
  carbs: 40,
  fat: 10,
  confidence: 0.9,
  items: null,
  createdAt: new Date("2026-05-22T12:00:00.000Z"),
  ...overrides,
});

describe("buildExportData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(mockGoal as never);
    vi.mocked(prisma.meal.findMany).mockResolvedValue([mockMeal()] as never);
    vi.mocked(prisma.food.findMany).mockResolvedValue([] as never);
  });

  it("includes user profile (sin passwordHash)", async () => {
    const data = await buildExportData(USER_ID);
    expect(data.user.email).toBe("user@test.com");
    expect(data.user.name).toBe("Juan");
    // SEGURIDAD: passwordHash NUNCA debe estar en el export
    expect("passwordHash" in data.user).toBe(false);
  });

  it("includes profile data (age, sex, weight, etc.)", async () => {
    const data = await buildExportData(USER_ID);
    expect(data.profile.age).toBe(30);
    expect(data.profile.weightKg).toBe(70);
    expect(data.profile.countryCode).toBe("CO");
  });

  it("includes goals", async () => {
    const data = await buildExportData(USER_ID);
    expect(data.goals).toEqual({
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    });
  });

  it("includes meals array", async () => {
    const data = await buildExportData(USER_ID);
    expect(Array.isArray(data.meals)).toBe(true);
    expect(data.meals.length).toBe(1);
    expect(data.meals[0].name).toBe("Test meal");
  });

  it("includes summary counts", async () => {
    vi.mocked(prisma.meal.findMany).mockResolvedValue([
      mockMeal({ id: 1, dateLocal: "2026-05-20" }),
      mockMeal({ id: 2, dateLocal: "2026-05-20" }),
      mockMeal({ id: 3, dateLocal: "2026-05-21" }),
    ] as never);
    const data = await buildExportData(USER_ID);
    expect(data.summary.totalMeals).toBe(3);
    expect(data.summary.totalDays).toBe(2);
  });

  it("includes exportedAt as ISO string", async () => {
    const data = await buildExportData(USER_ID);
    expect(data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null goals when user has none set", async () => {
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(null);
    const data = await buildExportData(USER_ID);
    expect(data.goals).toBeNull();
  });

  it("filters meals by date range (dateLocal)", async () => {
    const range: ExportRange = { from: "2026-05-01", to: "2026-05-15" };
    await buildExportData(USER_ID, range);
    const call = vi.mocked(prisma.meal.findMany).mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(JSON.stringify(call)).toContain("2026-05-01");
    expect(JSON.stringify(call)).toContain("2026-05-15");
  });

  it("works without date range", async () => {
    const data = await buildExportData(USER_ID);
    expect(data.meals).toBeDefined();
    expect(data.range).toBeUndefined();
  });

  it("returns range info when provided", async () => {
    const data = await buildExportData(USER_ID, { from: "2026-05-01", to: "2026-05-15" });
    expect(data.range).toEqual({ from: "2026-05-01", to: "2026-05-15" });
  });

  it("throws when user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(buildExportData(999)).rejects.toThrow();
  });

  it("includes customFoods (source = user)", async () => {
    vi.mocked(prisma.food.findMany).mockResolvedValue([
      { id: 1, nombre: "Mi receta", cal: 200, p: 10, c: 30, f: 5, source: "user", userId: USER_ID } as unknown as never,
    ]);
    const data = await buildExportData(USER_ID);
    expect(data.customFoods.length).toBe(1);
    expect(data.customFoods[0].nombre).toBe("Mi receta");
  });
});
