/**
 * Agregación de micros para un día del usuario (HU-07).
 *
 * Separado de lib/micros.ts porque toca Prisma — mantenemos micros.ts
 * libre de I/O.
 */

import { prisma } from "@/lib/prisma";
import { MICRO_KEYS, type MicroKey } from "@/lib/micros";

export type DailyMicroTotals = Record<MicroKey, number>;

function emptyTotals(): DailyMicroTotals {
  return MICRO_KEYS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as DailyMicroTotals);
}

/**
 * Suma los micros de todas las comidas del usuario en una fecha local.
 * Trata null/undefined como 0 (alimento sin datos para ese micro).
 */
export async function sumMicrosForDay(
  userId: number,
  date: string
): Promise<DailyMicroTotals> {
  const meals = await prisma.meal.findMany({
    where: {
      userId,
      OR: [
        { dateLocal: date },
        { dateLocal: null, date: { gte: new Date(`${date}T00:00:00.000Z`), lte: new Date(`${date}T23:59:59.999Z`) } },
      ],
    },
    select: {
      fiber: true, sugar: true,
      sodium: true, potassium: true, calcium: true, iron: true,
      vitaminC: true, vitaminD: true, vitaminB12: true, vitaminA: true, folate: true,
      magnesium: true, zinc: true,
      omega3: true, omega6: true,
    },
  });

  const totals = emptyTotals();
  for (const m of meals) {
    for (const k of MICRO_KEYS) {
      const v = (m as Record<string, number | null>)[k];
      if (typeof v === "number") totals[k] += v;
    }
  }
  return totals;
}

/**
 * Para cada micro consumido, calcula el % de la RDA cubierto.
 * Útil para detectar deficits sostenidos.
 *
 * Retorna [{ key, consumed, target, pctOfTarget }, ...]
 */
export function computeMicroProgress(
  totals: DailyMicroTotals,
  rdas: Record<MicroKey, { min: number; max?: number; unit: string }>
): Array<{
  key: MicroKey;
  consumed: number;
  target: number;
  pctOfTarget: number;
  unit: string;
  /** "low" si < 60%, "ok" si 60-100%, "good" si >= 100%, "over" si > UL */
  status: "low" | "ok" | "good" | "over";
}> {
  return MICRO_KEYS.map((k) => {
    const rda = rdas[k];
    const consumed = totals[k] ?? 0;
    const target = rda.min;
    const pctOfTarget = target > 0 ? (consumed / target) * 100 : 0;

    let status: "low" | "ok" | "good" | "over" = "low";
    if (rda.max !== undefined && consumed > rda.max) status = "over";
    else if (pctOfTarget >= 100) status = "good";
    else if (pctOfTarget >= 60) status = "ok";

    return {
      key: k,
      consumed,
      target,
      pctOfTarget: Math.round(pctOfTarget),
      unit: rda.unit,
      status,
    };
  });
}

/**
 * Cuenta días consecutivos donde un micro estuvo por debajo del 60%
 * de su RDA. Usado para alertas de déficit sostenido.
 *
 * Implementación: seleccionamos los 15 micros + date/dateLocal y
 * filtramos por `micro` en JS. Más simple que armar un select dinámico
 * que rompe la inferencia de Prisma.
 */
export async function consecutiveDeficitDays(
  userId: number,
  micro: MicroKey,
  rdaMin: number,
  maxLookback = 14
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - maxLookback);
  const sinceStr = since.toISOString().split("T")[0];

  const meals = await prisma.meal.findMany({
    where: {
      userId,
      OR: [
        { dateLocal: { gte: sinceStr } },
        { dateLocal: null, date: { gte: since } },
      ],
    },
    select: {
      dateLocal: true,
      date: true,
      fiber: true, sugar: true,
      sodium: true, potassium: true, calcium: true, iron: true,
      vitaminC: true, vitaminD: true, vitaminB12: true, vitaminA: true, folate: true,
      magnesium: true, zinc: true,
      omega3: true, omega6: true,
    },
    orderBy: { date: "desc" },
  });

  // Agrupar por día
  const byDay = new Map<string, number>();
  for (const m of meals) {
    const day = m.dateLocal ?? m.date.toISOString().split("T")[0];
    const record = m as unknown as Record<string, number | null>;
    const v = record[micro] ?? 0;
    byDay.set(day, (byDay.get(day) ?? 0) + v);
  }

  // Contar racha de días con déficit
  const sorted = Array.from(byDay.entries()).sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  let streak = 0;
  for (const [, total] of sorted) {
    if (total < rdaMin * 0.6) streak++;
    else break;
  }
  return streak;
}
