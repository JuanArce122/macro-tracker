/**
 * Cliente para USDA FoodData Central API (HU-07).
 *
 * Endpoint base: https://api.nal.usda.gov/fdc/v1
 * Requiere API key gratuita: https://fdc.nal.usda.gov/api-key-signup.html
 *
 * Set en producción: USDA_FDC_API_KEY
 */

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const FDC_TIMEOUT_MS = Number(process.env.USDA_FDC_TIMEOUT_MS) || 8_000;

// ─── Tipos ────────────────────────────────────────────────────────────

export type FDCNutrient = {
  // Formato del endpoint de BÚSQUEDA (/foods/search):
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  // Formato "full" del endpoint de DETALLE (/food/{fdcId}):
  nutrient?: { id: number; name?: string; unitName?: string };
  amount?: number;
};

export type FDCFood = {
  fdcId: number;
  description: string;
  dataType: string;        // "Foundation", "SR Legacy", "Branded", "Survey (FNDDS)"
  foodNutrients: FDCNutrient[];
};

/**
 * Subconjunto de campos de Food que extraemos desde un FDCFood.
 * Las macros van por separado (cal/p/c/f) y los 15 micros nullable.
 */
export type ExtractedNutrition = Partial<{
  cal: number;
  p: number;
  c: number;
  f: number;
  fiber: number;
  sugar: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  vitaminD: number;
  vitaminB12: number;
  vitaminA: number;
  folate: number;
  magnesium: number;
  zinc: number;
  omega3: number;
  omega6: number;
}>;

// ─── Mapeo de nutrientIds USDA a nuestros campos ──────────────────────
//
// Referencia: https://fdc.nal.usda.gov/portal-data/external/dataDictionary
// Solo incluimos los nutrientes que efectivamente persistimos.

export const NUTRIENT_ID_MAP: Record<number, keyof ExtractedNutrition> = {
  1003: "p",          // Protein
  1004: "f",          // Total lipid (fat)
  1005: "c",          // Carbohydrate, by difference
  1008: "cal",        // Energy (kcal)
  1079: "fiber",      // Fiber, total dietary
  2000: "sugar",      // Sugars, total including NLEA
  1093: "sodium",     // Sodium, Na
  1092: "potassium",  // Potassium, K
  1087: "calcium",    // Calcium, Ca
  1089: "iron",       // Iron, Fe
  1162: "vitaminC",   // Vitamin C, total ascorbic acid
  1114: "vitaminD",   // Vitamin D (D2 + D3)
  1178: "vitaminB12", // Vitamin B-12
  1106: "vitaminA",   // Vitamin A, RAE
  1190: "folate",     // Folate, DFE
  1090: "magnesium",  // Magnesium, Mg
  1095: "zinc",       // Zinc, Zn
  1404: "omega3",     // 18:3 (ALA) — proxy de omega-3
  1316: "omega6",     // 18:2 (LA) — proxy de omega-6
};

// ─── Funciones públicas ────────────────────────────────────────────────

class FDCTimeoutError extends Error {
  constructor() { super(`USDA FDC timeout (${FDC_TIMEOUT_MS}ms)`); this.name = "FDCTimeoutError"; }
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FDC_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new FDCTimeoutError();
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Busca alimentos en USDA FDC por query. Filtra a Foundation + SR Legacy
 * (los datasets curados; evita Branded que tiene productos comerciales
 * con variaciones de marca).
 */
export async function searchUSDA(
  query: string,
  pageSize = 10
): Promise<FDCFood[]> {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    throw new Error("USDA_FDC_API_KEY no configurada");
  }

  // API key por header (X-Api-Key), no en la query string → no se filtra a
  // logs ni proxies (I11).
  const url =
    `${FDC_BASE}/foods/search?query=${encodeURIComponent(query)}` +
    `&pageSize=${Math.min(pageSize, 50)}` +
    `&dataType=Foundation,SR%20Legacy`;

  const res = await fetchWithTimeout(url, { headers: { "X-Api-Key": apiKey } });
  if (!res || !res.ok) return [];

  const data = (await res.json()) as { foods?: FDCFood[] };
  return data.foods ?? [];
}

/**
 * Fetch directo de un alimento por fdcId.
 */
export async function fetchFDC(fdcId: number): Promise<FDCFood | null> {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    throw new Error("USDA_FDC_API_KEY no configurada");
  }

  const url = `${FDC_BASE}/food/${fdcId}`;
  const res = await fetchWithTimeout(url, { headers: { "X-Api-Key": apiKey } });
  if (!res || !res.ok) return null;
  return (await res.json()) as FDCFood;
}

/**
 * Extrae los nutrientes que nos interesan desde un FDCFood, ignorando
 * los desconocidos. Si un nutriente no tiene valor, queda sin definir.
 */
export function extractMicros(food: FDCFood): ExtractedNutrition {
  const out: ExtractedNutrition = {};
  for (const n of food.foodNutrients) {
    // El endpoint de búsqueda usa {nutrientId, value}; el de detalle (full) usa
    // {nutrient:{id}, amount}. Soportamos ambos para que el modo `fdcIds` no
    // importe 0 alimentos en silencio (I9).
    const id = n.nutrientId ?? n.nutrient?.id;
    const value = typeof n.value === "number" ? n.value : n.amount;
    if (id == null || typeof value !== "number") continue;
    const key = NUTRIENT_ID_MAP[id];
    if (!key) continue;
    out[key] = value;
  }
  return out;
}
