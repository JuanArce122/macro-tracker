import { describe, it, expect } from "vitest";
import {
  smoothExponential,
  calcTrendSlope,
  decideAdjustment,
  type WeightPoint,
} from "@/lib/weight-trend";

function pts(weights: number[]): WeightPoint[] {
  return weights.map((w, i) => ({ date: `2026-05-${String(i + 1).padStart(2, "0")}`, weightKg: w }));
}

describe("smoothExponential", () => {
  it("retorna [] para input vacío", () => {
    expect(smoothExponential([])).toEqual([]);
  });

  it("retorna el mismo valor para 1 punto", () => {
    expect(smoothExponential(pts([70]))).toEqual([70]);
  });

  it("suaviza una tendencia creciente", () => {
    // 70, 71, 72, 73, 74 — un alpha de 0.3 dejará el último valor por
    // debajo del crudo (suavizado)
    const smoothed = smoothExponential(pts([70, 71, 72, 73, 74]), 0.3);
    expect(smoothed.length).toBe(5);
    expect(smoothed[0]).toBe(70);
    expect(smoothed[smoothed.length - 1]).toBeLessThan(74);
    expect(smoothed[smoothed.length - 1]).toBeGreaterThan(70);
  });

  it("respeta alpha=1 (sin suavizado)", () => {
    const smoothed = smoothExponential(pts([70, 75, 80]), 1);
    expect(smoothed).toEqual([70, 75, 80]);
  });

  it("respeta alpha=0 (mantiene primer valor)", () => {
    const smoothed = smoothExponential(pts([70, 80, 90]), 0);
    expect(smoothed).toEqual([70, 70, 70]);
  });
});

describe("calcTrendSlope", () => {
  it("retorna 0 con menos de 7 puntos", () => {
    expect(calcTrendSlope([])).toBe(0);
    expect(calcTrendSlope(pts([70]))).toBe(0);
    expect(calcTrendSlope(pts([70, 71, 72, 73, 74, 75]))).toBe(0);
  });

  it("detecta tendencia negativa (perdiendo peso)", () => {
    // 14 días bajando 0.05 kg/día = ~0.35 kg/sem
    const weights = Array.from({ length: 14 }, (_, i) => 75 - i * 0.05);
    const slope = calcTrendSlope(pts(weights));
    expect(slope).toBeLessThan(0);
    expect(slope).toBeGreaterThan(-1);
  });

  it("detecta tendencia positiva (subiendo peso)", () => {
    const weights = Array.from({ length: 14 }, (_, i) => 70 + i * 0.04);
    const slope = calcTrendSlope(pts(weights));
    expect(slope).toBeGreaterThan(0);
  });

  it("retorna ~0 para peso estable", () => {
    const weights = Array.from({ length: 14 }, () => 70);
    expect(Math.abs(calcTrendSlope(pts(weights)))).toBeLessThan(0.01);
  });
});

describe("decideAdjustment", () => {
  const baseGoal = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

  it("sugiere reducir calorías cuando perdiendo lento (lose mode)", () => {
    // target -0.5 kg/sem; trend = -0.1 → delta = +0.4 (lento)
    const result = decideAdjustment(baseGoal, -0.1, "lose");
    expect(result).not.toBeNull();
    expect(result!.newGoal.calories).toBeLessThan(2000);
    expect(result!.reason).toBe("trend_loss_too_slow");
  });

  it("sugiere subir calorías cuando perdiendo demasiado rápido (lose mode)", () => {
    // target -0.5; trend = -1.2 → delta = -0.7
    const result = decideAdjustment(baseGoal, -1.2, "lose");
    expect(result).not.toBeNull();
    expect(result!.newGoal.calories).toBeGreaterThan(2000);
    expect(result!.reason).toBe("trend_loss_too_fast");
  });

  it("sugiere subir calorías cuando ganando lento (gain mode)", () => {
    // target +0.25; trend = -0.1 → delta = -0.35
    const result = decideAdjustment(baseGoal, -0.1, "gain");
    expect(result).not.toBeNull();
    expect(result!.newGoal.calories).toBeGreaterThan(2000);
    expect(result!.reason).toBe("trend_gain_too_slow");
  });

  it("sugiere bajar calorías cuando ganando demasiado rápido (gain mode)", () => {
    // target +0.25; trend = +1.0 → delta = +0.75
    const result = decideAdjustment(baseGoal, 1.0, "gain");
    expect(result).not.toBeNull();
    expect(result!.newGoal.calories).toBeLessThan(2000);
    expect(result!.reason).toBe("trend_gain_too_fast");
  });

  it("retorna null cuando trend está dentro de ±0.2 del target (lose)", () => {
    // target -0.5; trend = -0.45 → delta = +0.05 (dentro de banda)
    expect(decideAdjustment(baseGoal, -0.45, "lose")).toBeNull();
    expect(decideAdjustment(baseGoal, -0.6, "lose")).toBeNull();
  });

  it("retorna null cuando trend está cerca de 0 en maintain mode", () => {
    expect(decideAdjustment(baseGoal, 0.1, "maintain")).toBeNull();
    expect(decideAdjustment(baseGoal, -0.15, "maintain")).toBeNull();
  });

  it("capea el ajuste a ±200 kcal incluso si la desviación es enorme", () => {
    // delta enorme — debería capearse
    const big = decideAdjustment(baseGoal, -5.0, "lose");
    expect(big).not.toBeNull();
    expect(Math.abs(big!.newGoal.calories - baseGoal.calories)).toBeLessThanOrEqual(200);
  });

  it("ajusta P/C/G proporcionalmente al cambio de calorías", () => {
    const result = decideAdjustment(baseGoal, -0.1, "lose");
    expect(result).not.toBeNull();
    const ratio = result!.newGoal.calories / baseGoal.calories;
    expect(result!.newGoal.protein).toBe(Math.round(baseGoal.protein * ratio));
    expect(result!.newGoal.carbs).toBe(Math.round(baseGoal.carbs * ratio));
    expect(result!.newGoal.fat).toBe(Math.round(baseGoal.fat * ratio));
  });

  it("redondea las calorías a múltiplos de 10", () => {
    const result = decideAdjustment(baseGoal, -0.27, "lose");
    if (result) {
      expect(result.newGoal.calories % 10).toBe(0);
    }
  });
});
