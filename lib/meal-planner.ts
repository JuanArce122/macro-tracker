/**
 * Motor de planificación de comidas (HU-06).
 *
 * Funciones puras testeables sin DB:
 *   - filterRecipesByPreferences: filtros estrictos (diet, allergy, tiempo, costo)
 *   - scoreRecipe: ranking según ajuste a meta de calorías + variedad
 *   - generatePlan: motor greedy que arma el plan semanal
 *
 * El caller (endpoint /api/meal-plans) se encarga de cargar las recetas
 * desde DB, llamar generatePlan y persistir el resultado.
 */

export type FitnessGoalDistribution = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Preferences = {
  /** Tags dieta que el user requiere (la receta debe tener todos) */
  diet: string[];
  /** Tags alergia: la receta NO debe tener ninguno */
  allergies: string[];
  mealsPerDay: 3 | 4 | 5;
  maxPrepMinutes: number;
  /** 1 (solo bajo) | 2 (medio o menor) | 3 (cualquiera) */
  costLevel: 1 | 2 | 3;
};

export type PlannerRecipe = {
  id: number;
  name: string;
  cuisineCode: string | null;
  dietTags: string[];
  allergyTags: string[];
  costLevel: number;
  prepTimeMin: number;
  cookTimeMin: number;
  caloriesPerServing: number | null;
  proteinPerServing: number | null;
  carbsPerServing: number | null;
  fatPerServing: number | null;
};

export type PlannedMealEntry = {
  date: string;
  // snack1/snack2 son los dos snacks del plan de 5 comidas; deben diferir
  // para no violar @@unique([planId, date, mealType]) al persistir.
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "snack1" | "snack2";
  recipeId: number;
  servings: number;
};

const MIN_CANDIDATES = 14;

// ─── Distribución calórica por slot ───────────────────────────────────

const SLOT_RATIO_3: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.40,
  dinner: 0.35,
};
const SLOT_RATIO_4: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  snack: 0.10,
  dinner: 0.30,
};
const SLOT_RATIO_5: Record<string, number> = {
  breakfast: 0.20,
  snack1: 0.10,
  lunch: 0.30,
  snack2: 0.10,
  dinner: 0.30,
};

function getSlotsForMealsPerDay(n: 3 | 4 | 5): Array<{ name: string; ratio: number; mealType: PlannedMealEntry["mealType"] }> {
  if (n === 3) {
    return [
      { name: "breakfast", ratio: SLOT_RATIO_3.breakfast, mealType: "breakfast" },
      { name: "lunch",     ratio: SLOT_RATIO_3.lunch,     mealType: "lunch" },
      { name: "dinner",    ratio: SLOT_RATIO_3.dinner,    mealType: "dinner" },
    ];
  }
  if (n === 4) {
    return [
      { name: "breakfast", ratio: SLOT_RATIO_4.breakfast, mealType: "breakfast" },
      { name: "lunch",     ratio: SLOT_RATIO_4.lunch,     mealType: "lunch" },
      { name: "snack",     ratio: SLOT_RATIO_4.snack,     mealType: "snack" },
      { name: "dinner",    ratio: SLOT_RATIO_4.dinner,    mealType: "dinner" },
    ];
  }
  return [
    { name: "breakfast", ratio: SLOT_RATIO_5.breakfast, mealType: "breakfast" },
    { name: "snack1",    ratio: SLOT_RATIO_5.snack1,    mealType: "snack1" },
    { name: "lunch",     ratio: SLOT_RATIO_5.lunch,     mealType: "lunch" },
    { name: "snack2",    ratio: SLOT_RATIO_5.snack2,    mealType: "snack2" },
    { name: "dinner",    ratio: SLOT_RATIO_5.dinner,    mealType: "dinner" },
  ];
}

// ─── Filtrado ─────────────────────────────────────────────────────────

/**
 * Excluye recetas que no cumplen las preferencias estrictas:
 *   - Toda dieta requerida debe estar en dietTags
 *   - Ninguna alergia del user puede estar en allergyTags
 *   - prepTime + cookTime <= maxPrepMinutes
 *   - costLevel de la receta <= preferences.costLevel
 */
export function filterRecipesByPreferences(
  recipes: PlannerRecipe[],
  preferences: Preferences
): PlannerRecipe[] {
  return recipes.filter((r) => {
    // Diet: la receta debe tener TODOS los tags solicitados
    for (const d of preferences.diet) {
      if (!r.dietTags.includes(d)) return false;
    }
    // Alergia: la receta no debe tener NINGUNO
    for (const a of preferences.allergies) {
      if (r.allergyTags.includes(a)) return false;
    }
    if (r.prepTimeMin + r.cookTimeMin > preferences.maxPrepMinutes) return false;
    if (r.costLevel > preferences.costLevel) return false;
    return true;
  });
}

// ─── Score por slot ───────────────────────────────────────────────────

function scoreRecipeForSlot(
  recipe: PlannerRecipe,
  targetCal: number,
  usedCount: number,
  countriesUsed: Map<string, number>
): number {
  // Distancia normalizada a la meta calórica (cap a 1)
  const cal = recipe.caloriesPerServing ?? 0;
  if (cal === 0) return -Infinity;
  const calDiff = Math.abs(cal - targetCal) / targetCal;
  let score = 100 - calDiff * 100;

  // Penalización por repetición — fuerte para evitar misma receta 3 veces
  if (usedCount >= 2) score -= 1000; // cap absoluto: máximo 2 veces por semana
  else if (usedCount === 1) score -= 30;

  // Penalización por exceso de país (max 3 del mismo país por semana)
  if (recipe.cuisineCode) {
    const cnt = countriesUsed.get(recipe.cuisineCode) ?? 0;
    if (cnt >= 3) score -= 50;
  }

  return score;
}

// ─── Generador greedy ─────────────────────────────────────────────────

function addDaysISO(start: string, days: number): string {
  const d = new Date(`${start}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function scaleServings(recipeCal: number, targetCal: number): number {
  if (recipeCal <= 0) return 1;
  const raw = targetCal / recipeCal;
  // Clamp a [0.5, 2] para no recomendar 0.1 porciones o 5 porciones
  const clamped = Math.max(0.5, Math.min(2, raw));
  // Redondear a 0.25 (porciones medias razonables)
  return Math.round(clamped * 4) / 4;
}

export type GeneratePlanInput = {
  candidates: PlannerRecipe[];
  goal: FitnessGoalDistribution;
  preferences: Preferences;
  startDate: string; // YYYY-MM-DD (lunes)
};

/**
 * Motor greedy:
 *  1. Para cada día (7) y cada slot (3-5):
 *  2.   Calcula targetCal del slot
 *  3.   Elige la receta con mejor score (cerca de target, no muy repetida)
 *  4.   Escala servings al target real
 *  5.   Registra y avanza
 *
 * Lanza si hay menos de MIN_CANDIDATES recetas (poca variedad → planes
 * monótonos).
 */
export function generatePlan(input: GeneratePlanInput): PlannedMealEntry[] {
  const { candidates, goal, preferences, startDate } = input;
  const filtered = candidates.filter(
    (r) => typeof r.caloriesPerServing === "number" && r.caloriesPerServing > 0
  );

  if (filtered.length < MIN_CANDIDATES) {
    throw new Error(
      `No hay suficientes recetas que cumplan tus preferencias (necesitamos ${MIN_CANDIDATES}, hay ${filtered.length}). Relaja restricciones.`
    );
  }

  const slots = getSlotsForMealsPerDay(preferences.mealsPerDay);
  const usedCount = new Map<number, number>();
  const countriesUsed = new Map<string, number>();
  const out: PlannedMealEntry[] = [];

  for (let day = 0; day < 7; day++) {
    const date = addDaysISO(startDate, day);

    for (const slot of slots) {
      const targetCal = goal.calories * slot.ratio;

      // Elegir la mejor receta candidata
      let best: PlannerRecipe | null = null;
      let bestScore = -Infinity;

      for (const r of filtered) {
        const score = scoreRecipeForSlot(
          r,
          targetCal,
          usedCount.get(r.id) ?? 0,
          countriesUsed
        );
        if (score > bestScore) {
          best = r;
          bestScore = score;
        }
      }

      if (!best) continue;

      const servings = scaleServings(best.caloriesPerServing ?? 0, targetCal);
      out.push({
        date,
        mealType: slot.mealType,
        recipeId: best.id,
        servings,
      });

      usedCount.set(best.id, (usedCount.get(best.id) ?? 0) + 1);
      if (best.cuisineCode) {
        countriesUsed.set(best.cuisineCode, (countriesUsed.get(best.cuisineCode) ?? 0) + 1);
      }
    }
  }

  return out;
}
