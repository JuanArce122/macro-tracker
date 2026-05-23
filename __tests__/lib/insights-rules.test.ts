import { describe, it, expect } from "vitest";
import {
  ruleCaloriesTrend,
  ruleAdherenceLow,
  ruleStreak,
  ruleMacroImbalance,
  type DailyTotal,
  type Goal,
} from "@/lib/insights/rules";

// ─── Helpers ───────────────────────────────────────────────────────────

const GOAL: Goal = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

function days(n: number, from = "2026-05-01"): string[] {
  const start = new Date(from);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function mkTotals(dailyKcal: number[]): DailyTotal[] {
  return days(dailyKcal.length).map((date, i) => ({
    date,
    calories: dailyKcal[i],
    protein: 100,
    carbs: 150,
    fat: 50,
  }));
}

// ─── ruleCaloriesTrend ─────────────────────────────────────────────────

describe("ruleCaloriesTrend", () => {
  it("retorna null con menos de 7 días registrados", () => {
    const totals = mkTotals([2000, 2000, 2000]);
    expect(ruleCaloriesTrend(totals, GOAL)).toBeNull();
  });

  it("retorna null cuando el avg está dentro de ±10% de la meta", () => {
    // avg = 2050 → 2.5% de desviación
    const totals = mkTotals([2050, 2050, 2050, 2050, 2050, 2050, 2050]);
    expect(ruleCaloriesTrend(totals, GOAL)).toBeNull();
  });

  it("dispara flag 'encima de tu meta' cuando excede 10%", () => {
    // avg = 2400 → +20%
    const totals = mkTotals([2400, 2400, 2400, 2400, 2400, 2400, 2400]);
    const insight = ruleCaloriesTrend(totals, GOAL);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("trend_calories");
    expect(insight!.title.toLowerCase()).toContain("encima");
  });

  it("dispara flag 'debajo de tu meta' cuando es menos del 10% de la meta", () => {
    // avg = 1700 → -15%
    const totals = mkTotals([1700, 1700, 1700, 1700, 1700, 1700, 1700]);
    const insight = ruleCaloriesTrend(totals, GOAL);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("trend_calories");
    expect(insight!.title.toLowerCase()).toContain("debajo");
  });

  it("incluye avgCal y pctDiff en data", () => {
    const totals = mkTotals([2500, 2500, 2500, 2500, 2500, 2500, 2500]);
    const insight = ruleCaloriesTrend(totals, GOAL);
    expect(insight!.data).toMatchObject({
      avgCal: 2500,
      targetCal: 2000,
      pctDiff: 25,
    });
  });
});

// ─── ruleAdherenceLow ──────────────────────────────────────────────────

describe("ruleAdherenceLow", () => {
  it("retorna null cuando adherencia >= 60%", () => {
    expect(ruleAdherenceLow(0.6)).toBeNull();
    expect(ruleAdherenceLow(0.85)).toBeNull();
    expect(ruleAdherenceLow(1.0)).toBeNull();
  });

  it("dispara flag cuando adherencia < 60%", () => {
    const insight = ruleAdherenceLow(0.4);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("adherence");
    expect(insight!.title.toLowerCase()).toContain("sin registrar");
  });

  it("incluye el porcentaje en el body", () => {
    const insight = ruleAdherenceLow(0.42);
    expect(insight!.body).toContain("42");
  });
});

// ─── ruleStreak ────────────────────────────────────────────────────────

describe("ruleStreak", () => {
  it("retorna null para racha de 6 (no es hito)", () => {
    expect(ruleStreak(6)).toBeNull();
  });

  it("dispara hito en racha = 7", () => {
    const insight = ruleStreak(7);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("streak");
    expect(insight!.data).toMatchObject({ streak: 7 });
  });

  it("dispara hito en 14, 30, 60, 90", () => {
    for (const n of [14, 30, 60, 90]) {
      expect(ruleStreak(n)).not.toBeNull();
    }
  });

  it("no dispara en 8 (no hito)", () => {
    expect(ruleStreak(8)).toBeNull();
  });

  it("no dispara en 0 o 1", () => {
    expect(ruleStreak(0)).toBeNull();
    expect(ruleStreak(1)).toBeNull();
  });
});

// ─── ruleMacroImbalance ────────────────────────────────────────────────

describe("ruleMacroImbalance", () => {
  it("retorna null cuando proteína >= 70% del goal", () => {
    // 7 días con avg 110g (73% de 150g)
    const totals = mkTotals([2000, 2000, 2000, 2000, 2000, 2000, 2000]).map((t) => ({
      ...t,
      protein: 110,
    }));
    expect(ruleMacroImbalance(totals, GOAL)).toBeNull();
  });

  it("dispara cuando proteína < 70% del goal en últimos 7 días", () => {
    // avg = 90g (60% de 150g)
    const totals = mkTotals([2000, 2000, 2000, 2000, 2000, 2000, 2000]).map((t) => ({
      ...t,
      protein: 90,
    }));
    const insight = ruleMacroImbalance(totals, GOAL);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("macro_imbalance");
    expect(insight!.title.toLowerCase()).toContain("prote");
  });

  it("retorna null con menos de 3 días registrados (señal débil)", () => {
    const totals = mkTotals([2000, 2000]).map((t) => ({ ...t, protein: 0 }));
    expect(ruleMacroImbalance(totals, GOAL)).toBeNull();
  });

  it("incluye avg + goal en data", () => {
    const totals = mkTotals([2000, 2000, 2000, 2000, 2000, 2000, 2000]).map((t) => ({
      ...t,
      protein: 80,
    }));
    const insight = ruleMacroImbalance(totals, GOAL);
    expect(insight!.data).toMatchObject({
      avgProtein: 80,
      goalProtein: 150,
    });
  });
});
