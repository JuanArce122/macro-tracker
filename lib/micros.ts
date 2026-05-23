/**
 * RDA y priorización de micronutrientes (HU-07).
 *
 * RDAs basadas en USDA Dietary Reference Intakes (DRI 2020–2025) para
 * adultos. Ajustes para mujeres en edad fértil y adulto mayor donde
 * aplica. No se modelan deficiencias específicas (medicación, embarazo,
 * etc.) — el usuario con condiciones debería ajustar con su nutricionista.
 *
 * Funciones puras testeables sin DB.
 */

export type Sex = "male" | "female";
export type FitnessGoal = "lose" | "maintain" | "gain";

export type UserProfile = {
  sex: Sex | null;
  age: number | null;
  fitnessGoal: FitnessGoal | null;
};

export type MicroKey =
  | "fiber" | "sugar"
  | "sodium" | "potassium" | "calcium" | "iron"
  | "vitaminC" | "vitaminD" | "vitaminB12" | "vitaminA" | "folate"
  | "magnesium" | "zinc"
  | "omega3" | "omega6";

export const MICRO_KEYS: readonly MicroKey[] = [
  "fiber", "sugar",
  "sodium", "potassium", "calcium", "iron",
  "vitaminC", "vitaminD", "vitaminB12", "vitaminA", "folate",
  "magnesium", "zinc",
  "omega3", "omega6",
];

export type RDAEntry = {
  /** Valor mínimo recomendado (RDI/AI). 0 = no hay min (ej. sugar) */
  min: number;
  /** Valor máximo seguro (UL). undefined = no aplica límite estricto */
  max?: number;
  /** Unidad ("g", "mg", "µg") */
  unit: string;
};

const UNKNOWN_RDA: RDAEntry = { min: 0, unit: "" };

/**
 * Retorna la RDA del nutriente para el perfil del usuario.
 *
 * Se asume adulto (≥ 19 años). Para perfiles incompletos usa valores
 * "neutros" promedio. NUNCA retorna undefined — el caller siempre
 * recibe algo usable.
 */
export function getRDA(nutrient: string, profile: UserProfile): RDAEntry {
  const isMale = profile.sex === "male";
  const isFemaleFertile =
    profile.sex === "female" &&
    (profile.age ?? 30) >= 15 &&
    (profile.age ?? 30) <= 50;

  const RDAS: Record<MicroKey, RDAEntry> = {
    fiber:      { min: isMale ? 38 : 25, unit: "g" },
    sugar:      { min: 0, max: 50, unit: "g" }, // < 10% kcal en 2000 kcal
    sodium:     { min: 1500, max: 2300, unit: "mg" },
    potassium:  { min: 4700, unit: "mg" },
    calcium:    { min: 1000, max: 2500, unit: "mg" },
    iron:       { min: isFemaleFertile ? 18 : 8, max: 45, unit: "mg" },
    vitaminC:   { min: isMale ? 90 : 75, unit: "mg" },
    vitaminD:   { min: 15, max: 100, unit: "µg" },
    vitaminB12: { min: 2.4, unit: "µg" },
    vitaminA:   { min: isMale ? 900 : 700, max: 3000, unit: "µg" },
    folate:     { min: 400, max: 1000, unit: "µg" },
    magnesium:  { min: isMale ? 420 : 320, unit: "mg" },
    zinc:       { min: isMale ? 11 : 8, max: 40, unit: "mg" },
    omega3:     { min: isMale ? 1.6 : 1.1, unit: "g" },
    omega6:     { min: isMale ? 17 : 12, unit: "g" },
  };

  return RDAS[nutrient as MicroKey] ?? UNKNOWN_RDA;
}

// ─── Priorización por perfil ──────────────────────────────────────────

type PriorityRule = {
  predicate: (p: UserProfile) => boolean;
  micros: MicroKey[];
};

/**
 * Reglas evaluadas en orden de prioridad. La primera que matchea define
 * los 5 micros que se muestran en el dashboard. Si ninguna matchea,
 * caemos a DEFAULT_PRIORITY.
 *
 * Una mujer fértil con fitnessGoal=lose recibirá la regla de "mujer
 * fértil" porque está primero — el peso del género/edad supera al goal
 * fitness en términos de salud.
 */
const PRIORITY_RULES: PriorityRule[] = [
  {
    // Mujer en edad fértil (15-50)
    predicate: (p) =>
      p.sex === "female" &&
      (p.age ?? 30) >= 15 &&
      (p.age ?? 30) <= 50,
    micros: ["iron", "folate", "calcium", "vitaminD", "fiber"],
  },
  {
    // Adulto mayor (≥ 50)
    predicate: (p) => (p.age ?? 0) >= 50,
    micros: ["calcium", "vitaminD", "vitaminB12", "potassium", "magnesium"],
  },
  {
    // Ganancia muscular
    predicate: (p) => p.fitnessGoal === "gain",
    micros: ["zinc", "magnesium", "potassium", "iron", "vitaminD"],
  },
  {
    // Pérdida de grasa (priorizamos saciedad + energía)
    predicate: (p) => p.fitnessGoal === "lose",
    micros: ["fiber", "potassium", "magnesium", "vitaminD", "vitaminB12"],
  },
];

const DEFAULT_PRIORITY: MicroKey[] = ["fiber", "potassium", "vitaminD", "iron", "calcium"];

/**
 * Retorna los 5 micros priorizados para el perfil del usuario.
 * Garantiza sin duplicados y todos son MicroKey válidos.
 */
export function prioritizeMicros(profile: UserProfile): MicroKey[] {
  for (const rule of PRIORITY_RULES) {
    if (rule.predicate(profile)) {
      return [...new Set(rule.micros)].slice(0, 5);
    }
  }
  return [...DEFAULT_PRIORITY];
}

/**
 * Etiquetas legibles en español para cada micro. Usadas en UI.
 */
export const MICRO_LABELS: Record<MicroKey, string> = {
  fiber:      "Fibra",
  sugar:      "Azúcar",
  sodium:     "Sodio",
  potassium:  "Potasio",
  calcium:    "Calcio",
  iron:       "Hierro",
  vitaminC:   "Vitamina C",
  vitaminD:   "Vitamina D",
  vitaminB12: "Vitamina B12",
  vitaminA:   "Vitamina A",
  folate:     "Folato",
  magnesium:  "Magnesio",
  zinc:       "Zinc",
  omega3:     "Omega-3",
  omega6:     "Omega-6",
};
