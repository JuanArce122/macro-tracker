/**
 * Ranking de resultados de búsqueda de alimentos (HU-12).
 *
 * Da prioridad a:
 *   1. Alimentos con regionCode === userCountry (país del usuario)
 *   2. Alimentos LAC genéricos (regionCode === "LAC")
 *   3. Alimentos personales del usuario (source === "user")
 *   4. Verificados USDA (source === "usda")
 *   5. Boost adicional por usageCount (uso histórico)
 *
 * Diseñado para correr en el server post-fetch de Prisma.
 */

export type RankableFood = {
  id: number;
  source: string;
  regionCode: string | null;
  usageCount: number;
  userId: number | null;
};

const REGIONAL_BOOST = 1000;
const LAC_BOOST = 500;
const USER_SOURCE_BOOST = 100;
const USDA_SOURCE_BOOST = 50;
const USAGE_CAP = 30;

/**
 * Calcula un score para un alimento dado el país del usuario.
 * Mayor score → mayor prioridad en los resultados.
 */
export function scoreFood(food: RankableFood, userCountry: string | null): number {
  let score = 0;

  if (userCountry && food.regionCode === userCountry) {
    score += REGIONAL_BOOST;
  } else if (food.regionCode === "LAC") {
    score += LAC_BOOST;
  }

  if (food.source === "user") {
    score += USER_SOURCE_BOOST;
  } else if (food.source === "usda") {
    score += USDA_SOURCE_BOOST;
  }

  // Cap usageCount para que la popularidad no eclipse la prioridad regional
  score += Math.min(food.usageCount, USAGE_CAP);

  return score;
}

/**
 * Ordena un array de alimentos por relevancia para el usuario y devuelve
 * los primeros `limit` resultados.
 */
export function rankFoods<T extends RankableFood>(
  foods: T[],
  userCountry: string | null,
  limit: number
): T[] {
  return [...foods]
    .map((food) => ({ food, score: scoreFood(food, userCountry) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ food }) => food);
}
