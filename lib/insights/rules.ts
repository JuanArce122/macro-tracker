/**
 * Reglas puras para generar insights del usuario (HU-09).
 *
 * Cada regla recibe datos pre-agregados (DailyTotal[], adherence, streak)
 * y devuelve un GeneratedInsight o null. NO tocan Prisma — esa
 * responsabilidad es del generator (`lib/insights/generator.ts`).
 *
 * Esta separación facilita los tests (sin DB) y el reuso del cron
 * + tests E2E con fixtures.
 */

export type DailyTotal = {
  date: string;       // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Goal = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type GeneratedInsight = {
  type: "trend_calories" | "adherence" | "streak" | "macro_imbalance" | "milestone";
  title: string;
  body: string;
  data: Record<string, unknown>;
};

// ─── Constantes ────────────────────────────────────────────────────────

const TREND_MIN_DAYS = 7;
const TREND_PCT_THRESHOLD = 10; // % desviación que dispara el insight
const ADHERENCE_THRESHOLD = 0.6;
const MACRO_PROTEIN_MIN_PCT_OF_GOAL = 70;
const MACRO_MIN_DAYS = 3;
const STREAK_MILESTONES = [7, 14, 30, 60, 90];

// ─── Rules ─────────────────────────────────────────────────────────────

/**
 * Regla 1: tendencia de calorías vs meta (últimos 14 días, mín 7).
 *
 * - Requiere ≥7 días con registro
 * - Calcula avg kcal/día y compara contra goal.calories
 * - Si |diff| > 10% → dispara con tono empático
 */
export function ruleCaloriesTrend(
  totals: DailyTotal[],
  goal: Goal
): GeneratedInsight | null {
  if (totals.length < TREND_MIN_DAYS) return null;

  const sum = totals.reduce((s, t) => s + t.calories, 0);
  const avgCal = Math.round(sum / totals.length);
  const pctDiff = ((avgCal - goal.calories) / goal.calories) * 100;

  if (Math.abs(pctDiff) < TREND_PCT_THRESHOLD) return null;

  const over = pctDiff > 0;
  return {
    type: "trend_calories",
    title: over
      ? "Estás comiendo por encima de tu meta"
      : "Estás comiendo por debajo de tu meta",
    body: over
      ? `Tu promedio reciente es ${avgCal} kcal/día (meta ${goal.calories}). Considera ajustar porciones para acercarte a tu objetivo.`
      : `Tu promedio reciente es ${avgCal} kcal/día (meta ${goal.calories}). Asegúrate de comer suficiente para sostener tu energía.`,
    data: {
      avgCal,
      targetCal: goal.calories,
      pctDiff: Math.round(pctDiff),
      days: totals.length,
    },
  };
}

/**
 * Regla 2: adherencia baja (< 60% en últimos 14 días).
 *
 * Se calcula afuera (lib/weight-adherence). Acepta el valor 0..1.
 */
export function ruleAdherenceLow(adherence: number): GeneratedInsight | null {
  if (adherence >= ADHERENCE_THRESHOLD) return null;

  const pct = Math.round(adherence * 100);
  return {
    type: "adherence",
    title: "Llevas días sin registrar",
    body: `Has registrado el ${pct}% de los últimos 14 días. Activa los recordatorios desde Ajustes para mantener consistencia.`,
    data: { adherence, pct },
  };
}

/**
 * Regla 3: racha actual. Solo dispara en hitos específicos para evitar
 * spam diario (7, 14, 30, 60, 90 días consecutivos).
 */
export function ruleStreak(streak: number): GeneratedInsight | null {
  if (!STREAK_MILESTONES.includes(streak)) return null;

  const titles: Record<number, string> = {
    7:  "¡7 días seguidos registrando!",
    14: "¡2 semanas de racha!",
    30: "¡30 días sin saltarte un registro!",
    60: "60 días — eres una máquina",
    90: "90 días seguidos. Esto ya es un hábito.",
  };

  return {
    type: "streak",
    title: titles[streak],
    body:
      streak === 7
        ? "La consistencia es la base de cualquier objetivo. Sigue así."
        : "Tu disciplina está pagando. Mantén el momentum.",
    data: { streak },
  };
}

/**
 * Regla 4: desbalance de proteína (avg < 70% del goal en últimos 7 días).
 *
 * Por ahora solo proteína porque es el macro más comúnmente sub-consumido
 * y el que más afecta composición corporal. Carbos/grasas suelen entrar
 * solos por preferencia.
 */
export function ruleMacroImbalance(
  totals: DailyTotal[],
  goal: Goal
): GeneratedInsight | null {
  if (totals.length < MACRO_MIN_DAYS) return null;
  if (goal.protein <= 0) return null;

  const recent = totals.slice(-7);
  const sumProt = recent.reduce((s, t) => s + t.protein, 0);
  const avgProtein = Math.round(sumProt / recent.length);
  const pctOfGoal = (avgProtein / goal.protein) * 100;

  if (pctOfGoal >= MACRO_PROTEIN_MIN_PCT_OF_GOAL) return null;

  return {
    type: "macro_imbalance",
    title: "Proteína por debajo de tu meta",
    body: `Tu promedio es ${avgProtein}g/día (meta ${goal.protein}g). Considera huevos, lácteos, legumbres, pollo o pescado para llegar.`,
    data: {
      avgProtein,
      goalProtein: goal.protein,
      pctOfGoal: Math.round(pctOfGoal),
    },
  };
}
