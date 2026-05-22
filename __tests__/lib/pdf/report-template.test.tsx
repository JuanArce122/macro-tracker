import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportTemplate } from "@/lib/pdf/report-template";
import type { ExportData } from "@/lib/export/build-export-data";

const baseExport: ExportData = {
  exportedAt: "2026-05-22T10:00:00.000Z",
  user: {
    email: "user@test.com",
    name: "Juan",
    avatarEmoji: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  profile: {
    age: 30,
    sex: "male",
    weightKg: 70,
    heightCm: 175,
    activityLevel: "moderate",
    fitnessGoal: "maintain",
    countryCode: "CO",
  },
  goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
  meals: [],
  customFoods: [],
  summary: { totalMeals: 0, totalDays: 0, totalCalories: 0, avgCaloriesPerDay: 0 },
};

describe("ReportTemplate (PDF)", () => {
  it("generates a non-empty PDF buffer with empty meals", async () => {
    const buffer = await renderToBuffer(<ReportTemplate data={baseExport} />);
    expect(buffer.length).toBeGreaterThan(1000); // un PDF mínimo pesa varios KB
    // PDFs comienzan con "%PDF-"
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
  }, 15_000);

  it("generates a multi-page PDF for many meals", async () => {
    const meals = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      date: "2026-05-22T12:00:00.000Z",
      dateLocal: "2026-05-22",
      category: "lunch",
      name: `Meal ${i + 1}`,
      imageUrl: null,
      weightG: 200,
      calories: 400,
      protein: 25,
      carbs: 40,
      fat: 10,
      confidence: 0.9,
      items: null,
      createdAt: "2026-05-22T12:00:00.000Z",
    }));
    const data: ExportData = {
      ...baseExport,
      meals,
      summary: { totalMeals: 60, totalDays: 1, totalCalories: 24000, avgCaloriesPerDay: 24000 },
    };
    const buffer = await renderToBuffer(<ReportTemplate data={data} />);
    expect(buffer.length).toBeGreaterThan(3000);
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
  }, 30_000);

  it("works with null goals", async () => {
    const data: ExportData = { ...baseExport, goals: null };
    const buffer = await renderToBuffer(<ReportTemplate data={data} />);
    expect(buffer.length).toBeGreaterThan(1000);
  }, 15_000);

  it("works with range in cover", async () => {
    const data: ExportData = {
      ...baseExport,
      range: { from: "2026-05-01", to: "2026-05-31" },
    };
    const buffer = await renderToBuffer(<ReportTemplate data={data} />);
    expect(buffer.length).toBeGreaterThan(1000);
  }, 15_000);
});
