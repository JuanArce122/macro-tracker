/**
 * Ranking de resultados de búsqueda de alimentos (HU-12 + HU-04).
 *
 * Da prioridad a:
 *   1. Alimentos con regionCode === userCountry (país del usuario)
 *   2. Alimentos LAC genéricos (regionCode === "LAC")
 *   3. Alimentos personales del usuario (source === "user" + userId)
 *   4. Alimentos verificados (verifiedAt no-null — HU-04)
 *   5. Penalización para los marcados needsReview (HU-04)
 *   6. Boost adicional por usageCount (uso histórico)
 *
 * Diseñado para correr en el server post-fetch de Prisma.
 */

export type RankableFood = {
  id: number;
  source: string;
  regionCode: string | null;
  usageCount: number;
  userId: number | null;
  /** HU-04: fecha de verificación admin (null = comunitario) */
  verifiedAt?: Date | string | null;
  /** HU-04: flag de outlier/voto bajo pendiente de revisión */
  needsReview?: boolean;
  /** HU-04: voteScore denormalizado (puede ser negativo) */
  voteScore?: number;
};

const REGIONAL_BOOST = 1000;
const LAC_BOOST = 500;
const USER_SOURCE_BOOST = 100;
const VERIFIED_BOOST = 60;          // antes USDA_SOURCE_BOOST = 50
const NEEDS_REVIEW_PENALTY = -200;  // empuja outliers/votados negativos al fondo
const USAGE_CAP = 30;
const VOTE_SCORE_CAP = 20;          // cap a voteScore para que no domine

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

  // Alimentos personales del usuario
  if (food.source === "user" && food.userId !== null) {
    score += USER_SOURCE_BOOST;
  }

  // HU-04: cualquier alimento verificado (USDA + curados CO + verificados
  // manualmente por admin) recibe boost. Esto reemplaza el boost antiguo
  // limitado a source === "usda".
  if (food.verifiedAt) {
    score += VERIFIED_BOOST;
  }

  // HU-04: outliers / votos negativos van al fondo
  if (food.needsReview) {
    score += NEEDS_REVIEW_PENALTY;
  }

  // HU-04: voteScore aporta señal de calidad comunitaria, capeado
  if (typeof food.voteScore === "number") {
    score += Math.max(-VOTE_SCORE_CAP, Math.min(VOTE_SCORE_CAP, food.voteScore));
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
