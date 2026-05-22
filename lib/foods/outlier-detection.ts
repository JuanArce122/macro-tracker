/**
 * Detección de outliers nutricionales (HU-04).
 *
 * Para cada categoría con al menos MIN_SAMPLES alimentos NO verificados,
 * calculamos media y desviación estándar de las calorías. Cualquier
 * alimento que esté a más de Z_THRESHOLD desviaciones estándar de la media
 * se considera outlier y se marca para revisión.
 *
 * La función `runOutlierDetection()` aplica el cambio en DB; la versión
 * pura `detectOutliersFromFoods()` existe para tests sin Prisma.
 */

import { prisma } from "@/lib/prisma";

/** Tamaño mínimo de la muestra para que la estadística sea significativa. */
export const MIN_SAMPLES = 10;

/** Z-score umbral: más de 3σ de la media → outlier. */
export const Z_THRESHOLD = 3;

export type FoodForOutlierCheck = {
  id: number;
  cal: number;
  categoria: string;
  verifiedAt: Date | null;
};

/**
 * Versión pura: recibe un array de alimentos y retorna los IDs que
 * deberían marcarse como `needsReview`. NO toca la DB.
 *
 * - Excluye alimentos ya verificados de la muestra Y del set de candidatos.
 * - Categorías con menos de MIN_SAMPLES alimentos NO verificados se ignoran.
 */
export function detectOutliersFromFoods(foods: FoodForOutlierCheck[]): FoodForOutlierCheck[] {
  // Solo consideramos alimentos NO verificados (los curados por nosotros
  // son la fuente de verdad y no deberían ser flageados por estadística).
  const unverified = foods.filter((f) => f.verifiedAt === null);

  // Agrupar por categoría
  const byCategory = new Map<string, FoodForOutlierCheck[]>();
  for (const food of unverified) {
    const existing = byCategory.get(food.categoria) ?? [];
    existing.push(food);
    byCategory.set(food.categoria, existing);
  }

  const outliers: FoodForOutlierCheck[] = [];
  const seenIds = new Set<number>();

  for (const [, categoryFoods] of byCategory) {
    if (categoryFoods.length < MIN_SAMPLES) continue;

    const cals = categoryFoods.map((f) => f.cal);
    const mean = cals.reduce((s, c) => s + c, 0) / cals.length;
    const variance = cals.reduce((s, c) => s + (c - mean) ** 2, 0) / cals.length;
    const stddev = Math.sqrt(variance);

    // Si toda la categoría tiene el mismo valor (σ = 0), no hay outliers
    if (stddev === 0) continue;

    for (const food of categoryFoods) {
      const z = Math.abs(food.cal - mean) / stddev;
      if (z > Z_THRESHOLD && !seenIds.has(food.id)) {
        outliers.push(food);
        seenIds.add(food.id);
      }
    }
  }

  return outliers;
}

/**
 * Versión completa con DB: lee todos los alimentos relevantes, computa
 * outliers, y marca `needsReview = true` para los identificados.
 *
 * Retorna estadísticas del run (útil para logs del cron).
 */
export async function runOutlierDetection(): Promise<{
  totalChecked: number;
  outliersMarked: number;
  byCategory: Record<string, number>;
}> {
  const foods = await prisma.food.findMany({
    where: { verifiedAt: null },
    select: { id: true, cal: true, categoria: true, verifiedAt: true },
  });

  const outliers = detectOutliersFromFoods(foods);
  const byCategory: Record<string, number> = {};

  if (outliers.length > 0) {
    // Markar en batch
    await prisma.food.updateMany({
      where: { id: { in: outliers.map((o) => o.id) } },
      data: { needsReview: true },
    });

    for (const o of outliers) {
      byCategory[o.categoria] = (byCategory[o.categoria] ?? 0) + 1;
    }
  }

  return {
    totalChecked: foods.length,
    outliersMarked: outliers.length,
    byCategory,
  };
}
