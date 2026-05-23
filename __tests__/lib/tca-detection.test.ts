import { describe, it, expect } from "vitest";
import {
  detectFromDailyStats,
  type DailyStats,
  RESOURCES_CO,
  SIGNAL_MESSAGES,
} from "@/lib/tca-detection";

function days(stats: Partial<DailyStats>[]): DailyStats[] {
  return stats.map((s, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, "0")}`,
    mealCount: 0,
    totalCalories: 0,
    goalCalories: 2000,
    ...s,
  }));
}

describe("detectFromDailyStats", () => {
  it("retorna null cuando todo está normal (1-5 comidas/día, calorías razonables)", () => {
    const stats = days([
      { mealCount: 3 }, { mealCount: 4 }, { mealCount: 3 },
      { mealCount: 5 }, { mealCount: 2 }, { mealCount: 4 }, { mealCount: 3 },
    ]);
    expect(detectFromDailyStats(stats)).toBeNull();
  });

  // ── Señal 1: high_frequency ────────────────────────────────────────
  it("dispara 'high_frequency' con >12 comidas/día en 3+ días de la última semana", () => {
    const stats = days([
      { mealCount: 14 }, { mealCount: 15 }, { mealCount: 13 },
      { mealCount: 5 },  { mealCount: 3 },  { mealCount: 4 }, { mealCount: 2 },
    ]);
    const result = detectFromDailyStats(stats);
    expect(result?.signal).toBe("high_frequency");
  });

  it("NO dispara 'high_frequency' con solo 2 días de >12 comidas", () => {
    const stats = days([
      { mealCount: 14 }, { mealCount: 15 },
      { mealCount: 5 }, { mealCount: 4 }, { mealCount: 3 }, { mealCount: 2 }, { mealCount: 4 },
    ]);
    expect(detectFromDailyStats(stats)).toBeNull();
  });

  // ── Señal 2: perfect_tracking ──────────────────────────────────────
  it("dispara 'perfect_tracking' con 14+ días con kcal dentro de ±2 de meta", () => {
    const stats = days(
      Array.from({ length: 14 }, () => ({ totalCalories: 2000, mealCount: 3 }))
    );
    const result = detectFromDailyStats(stats);
    expect(result?.signal).toBe("perfect_tracking");
  });

  it("acepta diferencia exacta de 2 kcal como 'perfecto'", () => {
    const stats = days(
      Array.from({ length: 14 }, () => ({ totalCalories: 2002, mealCount: 3 }))
    );
    const result = detectFromDailyStats(stats);
    expect(result?.signal).toBe("perfect_tracking");
  });

  it("rechaza diferencia de 3+ kcal como 'perfecto'", () => {
    const stats = days(
      Array.from({ length: 14 }, () => ({ totalCalories: 2003, mealCount: 3 }))
    );
    const result = detectFromDailyStats(stats);
    expect(result?.signal).not.toBe("perfect_tracking");
  });

  it("NO dispara 'perfect_tracking' con solo 13 días perfectos", () => {
    const stats = days(
      Array.from({ length: 13 }, () => ({ totalCalories: 2000, mealCount: 3 }))
    );
    const result = detectFromDailyStats(stats);
    expect(result?.signal).not.toBe("perfect_tracking");
  });

  // ── Prioridad ──────────────────────────────────────────────────────
  it("prioriza high_frequency sobre perfect_tracking (más urgente)", () => {
    const stats = days([
      ...Array.from({ length: 14 }, () => ({ totalCalories: 2000, mealCount: 14 })),
    ]);
    const result = detectFromDailyStats(stats);
    expect(result?.signal).toBe("high_frequency");
  });

  // ── Datos insuficientes ────────────────────────────────────────────
  it("retorna null con menos de 7 días de datos", () => {
    const stats = days([{ mealCount: 14 }, { mealCount: 14 }, { mealCount: 14 }]);
    expect(detectFromDailyStats(stats)).toBeNull();
  });
});

describe("SIGNAL_MESSAGES", () => {
  it("tiene mensaje empático para cada señal", () => {
    expect(SIGNAL_MESSAGES.high_frequency.title).toBeTruthy();
    expect(SIGNAL_MESSAGES.high_frequency.body).toBeTruthy();
    expect(SIGNAL_MESSAGES.perfect_tracking.title).toBeTruthy();
    expect(SIGNAL_MESSAGES.perfect_tracking.body).toBeTruthy();
  });

  it("high_frequency sugiere modo hábitos", () => {
    expect(SIGNAL_MESSAGES.high_frequency.suggestHabits).toBe(true);
  });

  it("perfect_tracking NO sugiere modo hábitos directamente (recurso, no toggle)", () => {
    expect(SIGNAL_MESSAGES.perfect_tracking.suggestHabits).toBe(false);
  });
});

describe("RESOURCES_CO", () => {
  it("expone link y teléfono de ACAB Colombia", () => {
    expect(RESOURCES_CO.acabUrl).toContain("acabcolombia");
    expect(RESOURCES_CO.acabPhone).toBeTruthy();
    expect(RESOURCES_CO.description).toBeTruthy();
  });
});
