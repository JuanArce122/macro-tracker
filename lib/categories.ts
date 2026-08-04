/**
 * Fuente única de verdad de las categorías de comida del día (`Meal.category`).
 *
 * El dominio de la app está en español: la DB guarda estos valores y la UI
 * (`MealList`, `StepConfirm`) agrupa por ellos. El schema Zod
 * (`MealCreateSchema`) valida contra este mismo set — así el contrato
 * frontend↔API no vuelve a divergir. Esa divergencia (schema en inglés,
 * cliente enviando español) era la causa de B1: guardar una comida que no
 * fuera "snack" fallaba con 400.
 */

export const MEAL_CATEGORIES = ["desayuno", "almuerzo", "cena", "snack"] as const;

export type MealCategory = (typeof MEAL_CATEGORIES)[number];

/** Etiquetas capitalizadas para la UI. */
export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Cena",
  snack: "Snack",
};

/**
 * Traduce el `mealType` del plan semanal (valores internos de meal-planning en
 * inglés: breakfast/lunch/dinner/snack/snack1/snack2) a la categoría en español
 * que se persiste en `Meal.category` al registrar una comida del plan.
 */
export function plannedTypeToCategory(mealType: string): MealCategory {
  switch (mealType) {
    case "breakfast":
      return "desayuno";
    case "lunch":
      return "almuerzo";
    case "dinner":
      return "cena";
    default:
      // snack, snack1, snack2 → snack
      return "snack";
  }
}
