/**
 * Cliente para Open Food Facts barcode API + utilidades de validación (HU-03).
 *
 * OFF expone los productos por código de barras en:
 *   https://world.openfoodfacts.org/api/v0/product/{barcode}.json
 *
 * Response shape:
 *   { status: 0 | 1, product?: { product_name, nutriments, countries_tags, ... } }
 *
 * status === 1 → producto encontrado
 * status === 0 → no existe en la base de OFF
 */

const OFF_PRODUCT_BASE = "https://world.openfoodfacts.org/api/v0/product";

/** Tiempos máximo de espera (ms) para llamadas a OFF */
const OFF_TIMEOUT_MS = Number(process.env.OFF_TIMEOUT_MS) || 4_000;

// ─── Validación / normalización ──────────────────────────────────────

/**
 * Verifica que un código tenga formato EAN-8, UPC-A o EAN-13.
 * Aceptamos solo dígitos (8, 12 o 13).
 *
 * Nota: NO validamos el checksum porque algunos scanners de baja calidad
 * reportan códigos sin checksum válido pero correctos en la base. La
 * verificación dura ocurre en el lookup contra OFF.
 */
export function isValidBarcode(code: string): boolean {
  if (typeof code !== "string") return false;
  if (!/^\d+$/.test(code)) return false;
  const len = code.length;
  return len === 8 || len === 12 || len === 13;
}

/**
 * Normaliza un código antes de buscarlo:
 *  - Trim de espacios laterales
 *  - UPC-A de 11 dígitos → padding con leading zero a 12
 *
 * NO valida (eso lo hace isValidBarcode separadamente). Retorna el input
 * sin cambios si no es numérico — el caller decide si validar después.
 */
export function normalizeBarcode(code: string): string {
  if (typeof code !== "string") return code;
  const trimmed = code.trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  if (trimmed.length === 11) return `0${trimmed}`;
  return trimmed;
}

/**
 * ¿El producto OFF corresponde al país del usuario?
 *
 * OFF marca los países en `countries_tags` con prefijos como
 * `en:colombia`, `es:colombia`, etc. Buscamos coincidencia
 * case-insensitive con el ISO alpha-2.
 */
export function matchesRegion(
  countriesTags: string[] | undefined,
  countryCode: string | null
): boolean {
  if (!countryCode || !countriesTags) return false;
  const needle = countryCode.toLowerCase();
  // ISO alpha-2 → palabra que OFF usa en sus tags (los 21 países de regions.ts).
  const countryWord: Record<string, string> = {
    co: "colombia", mx: "mexico", ar: "argentina", pe: "peru", cl: "chile",
    ve: "venezuela", ec: "ecuador", uy: "uruguay", py: "paraguay", bo: "bolivia",
    cr: "costa-rica", pa: "panama", do: "dominican-republic", gt: "guatemala",
    hn: "honduras", sv: "el-salvador", ni: "nicaragua", cu: "cuba",
    pr: "puerto-rico", es: "spain", us: "united-states",
  };
  const word = countryWord[needle];
  // Sin fallback al código de 2 letras: evitaba matches por substring — falsos
  // positivos (DO en "indonesia") y falsos negativos (GT no matchea "guatemala") (L10).
  if (!word) return false;
  return countriesTags.some((t) => t.toLowerCase().includes(word));
}

// ─── Tipos OFF ────────────────────────────────────────────────────────

export type OFFNutriments = {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
};

export type OFFProduct = {
  product_name?: string;
  brands?: string;
  nutriments?: OFFNutriments;
  countries_tags?: string[];
};

export type OFFResponse = {
  status: 0 | 1;
  product?: OFFProduct;
};

// ─── Fetch + normalización ────────────────────────────────────────────

/**
 * Llama a la API de OFF por código de barras con timeout.
 * Retorna null si el endpoint falla o tarda más de OFF_TIMEOUT_MS.
 */
export async function fetchFromOFF(barcode: string): Promise<OFFResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);

  try {
    const res = await fetch(`${OFF_PRODUCT_BASE}/${barcode}.json`, {
      signal: controller.signal,
      // OFF exige un User-Agent descriptivo; bloquean UAs genéricos (I10).
      headers: { "User-Agent": "MacroTracker/1.0 (+https://fit-app-nu-weld.vercel.app)" },
      // OFF cachea bien — 1h de revalidation es razonable.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as OFFResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export type NormalizedOFF = {
  nombre: string;
  cal: number;
  p: number;
  c: number;
  f: number;
};

/**
 * Convierte un producto OFF en la forma que usa nuestra DB (Food).
 * Retorna null si:
 *  - No tiene product_name
 *  - No tiene datos nutricionales útiles (cal=0 y prot=0)
 *  - Tiene valores imposibles (>1000 kcal/100g, etc.)
 */
export function normalizeOFFProduct(p: OFFProduct): NormalizedOFF | null {
  const name = p.product_name?.trim();
  if (!name) return null;

  const cal = p.nutriments?.["energy-kcal_100g"] ?? 0;
  const prot = p.nutriments?.proteins_100g ?? 0;
  const carbs = p.nutriments?.carbohydrates_100g ?? 0;
  const fat = p.nutriments?.fat_100g ?? 0;

  // Sin datos útiles
  if (cal === 0 && prot === 0) return null;

  // Valores imposibles → datos corruptos
  if (cal > 1000 || prot > 100 || carbs > 100 || fat > 100) return null;

  return {
    nombre: name,
    cal: Math.round(cal * 10) / 10,
    p: Math.round(prot * 10) / 10,
    c: Math.round(carbs * 10) / 10,
    f: Math.round(fat * 10) / 10,
  };
}
