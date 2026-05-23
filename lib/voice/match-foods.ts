/**
 * Match de items parseados por voz contra la DB de alimentos (HU-02).
 *
 * Funciones puras testeables:
 *  - parsedToWeightGrams: convierte unidad+cantidad a gramos
 *  - computeMacros: escala kcal/p/c/f del food al peso real
 *
 * Función con DB:
 *  - matchFoods: busca cada ítem parseado contra Food (respeta countryCode
 *    del usuario para HU-12)
 */

import { prisma } from "@/lib/prisma";
import { rankFoods } from "@/lib/foods/ranking";

// ─── Tipos ────────────────────────────────────────────────────────────

export type VoiceUnit = "g" | "ml" | "unidad" | "taza" | "cucharada" | "porcion";

export type ParsedVoiceItem = {
  nombre: string;
  cantidad: number;
  unidad: VoiceUnit;
  confianza: number;
};

export type MatchedVoiceItem = ParsedVoiceItem & {
  foodId: number | null;
  weightG: number;
  calorias: number;
  proteina: number;
  carbs: number;
  grasa: number;
};

// ─── Conversiones ─────────────────────────────────────────────────────

/**
 * Pesos aproximados en gramos para unidades imprecisas.
 * "porcion" es deliberadamente ambiguo — Gemini lo usa para "un plato de…"
 * sin más info; 150 g cubre desayunos y snacks.
 */
const UNIT_GRAMS: Record<Exclude<VoiceUnit, "g" | "ml" | "unidad">, number> = {
  taza: 240,        // 1 taza estándar ≈ 240 ml (asumiendo densidad ~1 g/ml)
  cucharada: 15,    // 1 tbsp ≈ 15 g (rango 10-20 según sólido)
  porcion: 150,     // porción genérica
};

const DEFAULT_UNIT_WEIGHT = 100;

/**
 * Convierte cantidad+unidad a peso en gramos.
 *
 * - g / ml → cantidad directa (ml asume densidad ~1, suficiente para
 *   bebidas comunes; aceite/miel serían imprecisos pero salen por
 *   confianza baja del LLM)
 * - taza / cucharada / porcion → multiplicador fijo
 * - unidad → usa gramsPerUnit del food matcheado, fallback 100 g
 */
export function parsedToWeightGrams(
  item: Pick<ParsedVoiceItem, "unidad" | "cantidad">,
  food: { gramsPerUnit?: number | null } | null
): number {
  const { unidad, cantidad } = item;

  if (unidad === "g" || unidad === "ml") {
    return Math.round(cantidad);
  }

  if (unidad === "unidad") {
    const perUnit = food?.gramsPerUnit ?? DEFAULT_UNIT_WEIGHT;
    return Math.round(cantidad * perUnit);
  }

  // taza, cucharada, porcion
  return Math.round(cantidad * UNIT_GRAMS[unidad]);
}

/**
 * Escala los macros del alimento (por 100 g) al peso real.
 * Redondea calorías a entero y proteína/carbs/grasa a 1 decimal.
 */
export function computeMacros(
  food: { cal: number; p: number; c: number; f: number },
  weightG: number
): { calorias: number; proteina: number; carbs: number; grasa: number } {
  const factor = weightG / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    calorias: Math.round(food.cal * factor),
    proteina: round1(food.p * factor),
    carbs: round1(food.c * factor),
    grasa: round1(food.f * factor),
  };
}

// ─── Match contra DB ───────────────────────────────────────────────────

/**
 * Busca cada ítem parseado contra la DB de Food, priorizando por
 * countryCode del usuario (HU-12). Si no se encuentra match, retorna
 * el item sin foodId y con macros en 0 (el usuario podrá editar en
 * StepConfirm).
 */
export async function matchFoods(
  items: ParsedVoiceItem[],
  userId: number
): Promise<MatchedVoiceItem[]> {
  if (items.length === 0) return [];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { countryCode: true },
  });
  const userCountry = user?.countryCode ?? null;

  const matched: MatchedVoiceItem[] = [];

  for (const item of items) {
    const nombre = item.nombre.toLowerCase().trim();
    if (!nombre) {
      matched.push({
        ...item,
        foodId: null,
        weightG: 0,
        calorias: 0,
        proteina: 0,
        carbs: 0,
        grasa: 0,
      });
      continue;
    }

    // Buscar por nombre (substring case-insensitive), respetando ownership
    const candidates = await prisma.food.findMany({
      where: {
        nombre: { contains: nombre },
        OR: [{ userId: null }, { userId }],
      },
      take: 30,
    });

    const ranked = rankFoods(candidates, userCountry, 1);
    const food = ranked[0] ?? null;

    if (!food) {
      matched.push({
        ...item,
        foodId: null,
        weightG: 0,
        calorias: 0,
        proteina: 0,
        carbs: 0,
        grasa: 0,
      });
      continue;
    }

    const weightG = parsedToWeightGrams(item, food);
    const macros = computeMacros(food, weightG);

    matched.push({
      ...item,
      foodId: food.id,
      weightG,
      ...macros,
    });
  }

  return matched;
}
