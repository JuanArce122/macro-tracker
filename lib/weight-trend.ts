/**
 * Algoritmo de tendencia de peso y decisión de ajuste de metas (HU-05).
 *
 * Tres funciones puras:
 *   - smoothExponential: suaviza la serie con EMA (alpha por defecto 0.3)
 *   - calcTrendSlope: pendiente en kg/semana por regresión lineal
 *   - decideAdjustment: dado un goal y trend, decide si proponer cambio
 *
 * La adherencia (% días con registro) se calcula en lib/weight-adherence.ts
 * porque requiere acceso a DB y queremos mantener este archivo libre de I/O.
 */

export type WeightPoint = { date: string; weightKg: number };

export type FitnessGoal = "lose" | "maintain" | "gain";

export type MacroGoal = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type AdjustmentSuggestion = {
  newGoal: MacroGoal;
  reason: AdjustmentReason;
};

export type AdjustmentReason =
  | "trend_loss_too_slow"
  | "trend_loss_too_fast"
  | "trend_gain_too_slow"
  | "trend_gain_too_fast"
  | "trend_maintenance_drift_up"
  | "trend_maintenance_drift_down";

// ─── Constantes del algoritmo ──────────────────────────────────────────

/** Objetivo semanal de cambio de peso (kg/sem) por fitnessGoal del usuario. */
const WEEKLY_TARGETS: Record<FitnessGoal, number> = {
  lose: -0.5,
  maintain: 0,
  gain: 0.25,
};

/** Banda muerta: si |trend - target| < BAND_KG_WEEK no proponemos cambio. */
const BAND_KG_WEEK = 0.2;

/** Conversión aproximada: 100 kcal/día sostenidos ≈ 0.1 kg/sem. */
const KCAL_PER_KG_WEEK = 1000;

/** Máximo cambio absoluto en un ajuste, en kcal/día. */
const MAX_ADJUST_KCAL = 200;

/** Mínimo de puntos para calcular pendiente (1 semana de data). */
const MIN_POINTS_FOR_SLOPE = 7;

// ─── Funciones públicas ────────────────────────────────────────────────

/**
 * Smoothing exponencial simple sobre la serie temporal.
 *
 * alpha=0.3 es un buen balance entre responsividad y robustez al ruido
 * (típico para pesos diarios donde hay variación natural de ±1 kg por
 * hidratación, glucógeno, etc.).
 *
 * S[0] = x[0]
 * S[i] = alpha * x[i] + (1 - alpha) * S[i-1]
 */
export function smoothExponential(points: WeightPoint[], alpha = 0.3): number[] {
  if (points.length === 0) return [];
  const out = [points[0].weightKg];
  for (let i = 1; i < points.length; i++) {
    out.push(alpha * points[i].weightKg + (1 - alpha) * out[i - 1]);
  }
  return out;
}

/**
 * Pendiente (kg/semana) calculada por regresión lineal sobre los puntos
 * suavizados. El eje X es el índice (asumimos puntos consecutivos diarios).
 *
 * Retorna 0 si hay menos de 7 puntos.
 */
export function calcTrendSlope(points: WeightPoint[]): number {
  if (points.length < MIN_POINTS_FOR_SLOPE) return 0;

  const smoothed = smoothExponential(points);
  const n = smoothed.length;
  const meanX = (n - 1) / 2; // promedio de 0..n-1
  const meanY = smoothed.reduce((s, y) => s + y, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (smoothed[i] - meanY);
    den += (i - meanX) ** 2;
  }
  if (den === 0) return 0;

  const slopePerDay = num / den;
  return slopePerDay * 7;
}

/**
 * Dado el goal actual, la tendencia observada (kg/sem) y el objetivo
 * fitness, decide si proponer un ajuste y cuál.
 *
 * Retorna null si la tendencia está dentro de la banda muerta del target.
 */
export function decideAdjustment(
  currentGoal: MacroGoal,
  trendKgPerWeek: number,
  fitnessGoal: FitnessGoal
): AdjustmentSuggestion | null {
  const target = WEEKLY_TARGETS[fitnessGoal];
  const delta = trendKgPerWeek - target;

  // Banda muerta — no proponemos micro-cambios
  if (Math.abs(delta) < BAND_KG_WEEK) return null;

  // Si delta > 0 → estamos por encima del target (subimos más / bajamos menos
  // de lo deseado). Necesitamos REDUCIR calorías → calorieAdjust < 0.
  // Si delta < 0 → al revés.
  const rawAdjust = -delta * KCAL_PER_KG_WEEK;
  // Redondeo a múltiplos de 10
  const rounded = Math.round(rawAdjust / 10) * 10;
  const clamped = Math.max(-MAX_ADJUST_KCAL, Math.min(MAX_ADJUST_KCAL, rounded));

  // Si tras clamping el ajuste es 0 (caso raro con redondeo), no proponemos
  if (clamped === 0) return null;

  const newCalories = currentGoal.calories + clamped;
  const ratio = newCalories / currentGoal.calories;

  const reason = pickReason(fitnessGoal, delta);

  return {
    newGoal: {
      calories: newCalories,
      protein: Math.round(currentGoal.protein * ratio),
      carbs: Math.round(currentGoal.carbs * ratio),
      fat: Math.round(currentGoal.fat * ratio),
    },
    reason,
  };
}

/**
 * Decide el código de razón para el log/UI según el modo y signo del delta.
 *
 * - lose + delta>0 (perdiendo lento o ganando): "loss_too_slow"
 * - lose + delta<0 (perdiendo demasiado rápido): "loss_too_fast"
 * - gain + delta<0 (ganando lento o perdiendo): "gain_too_slow"
 * - gain + delta>0 (ganando demasiado rápido):  "gain_too_fast"
 * - maintain + delta>0 (subiendo):              "maintenance_drift_up"
 * - maintain + delta<0 (bajando):               "maintenance_drift_down"
 */
function pickReason(fitnessGoal: FitnessGoal, delta: number): AdjustmentReason {
  if (fitnessGoal === "lose") {
    return delta > 0 ? "trend_loss_too_slow" : "trend_loss_too_fast";
  }
  if (fitnessGoal === "gain") {
    return delta > 0 ? "trend_gain_too_fast" : "trend_gain_too_slow";
  }
  return delta > 0 ? "trend_maintenance_drift_up" : "trend_maintenance_drift_down";
}
