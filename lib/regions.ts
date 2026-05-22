/**
 * Soporte regional (HU-12)
 *
 * D5: CO primero, luego el resto de LAC (MX, AR, PE, CL, VE, EC).
 * También incluimos ES y US porque son hispanohablantes relevantes.
 *
 * Convención: códigos ISO 3166-1 alpha-2, siempre en MAYÚSCULAS.
 */

export type CountryEntry = {
  code: string;
  name: string;
  flag: string;
};

export const LAC_COUNTRIES: readonly CountryEntry[] = [
  // Colombia primero (D5)
  { code: "CO", name: "Colombia",          flag: "🇨🇴" },
  { code: "MX", name: "México",            flag: "🇲🇽" },
  { code: "AR", name: "Argentina",         flag: "🇦🇷" },
  { code: "PE", name: "Perú",              flag: "🇵🇪" },
  { code: "CL", name: "Chile",             flag: "🇨🇱" },
  { code: "VE", name: "Venezuela",         flag: "🇻🇪" },
  { code: "EC", name: "Ecuador",           flag: "🇪🇨" },
  { code: "UY", name: "Uruguay",           flag: "🇺🇾" },
  { code: "PY", name: "Paraguay",          flag: "🇵🇾" },
  { code: "BO", name: "Bolivia",           flag: "🇧🇴" },
  { code: "CR", name: "Costa Rica",        flag: "🇨🇷" },
  { code: "PA", name: "Panamá",            flag: "🇵🇦" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴" },
  { code: "GT", name: "Guatemala",         flag: "🇬🇹" },
  { code: "HN", name: "Honduras",          flag: "🇭🇳" },
  { code: "SV", name: "El Salvador",       flag: "🇸🇻" },
  { code: "NI", name: "Nicaragua",         flag: "🇳🇮" },
  { code: "CU", name: "Cuba",              flag: "🇨🇺" },
  { code: "PR", name: "Puerto Rico",       flag: "🇵🇷" },
  { code: "ES", name: "España",            flag: "🇪🇸" },
  { code: "US", name: "Estados Unidos",    flag: "🇺🇸" },
] as const;

/**
 * Búsqueda de país por código ISO. Retorna null si no se encuentra
 * o si el código no es válido.
 */
export function getCountryByCode(code: string | null | undefined): CountryEntry | null {
  if (!code) return null;
  return LAC_COUNTRIES.find((c) => c.code === code) ?? null;
}

/**
 * Verifica que un código sea válido (ISO alpha-2, en mayúsculas, y
 * presente en nuestra lista LAC).
 */
export function isValidCountryCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return LAC_COUNTRIES.some((c) => c.code === code);
}

/**
 * Mapa rápido código → bandera. Incluye una bandera genérica para
 * "LAC" (alimentos latinoamericanos genéricos sin país específico).
 */
export const REGION_FLAGS: Record<string, string> = Object.fromEntries([
  ...LAC_COUNTRIES.map((c) => [c.code, c.flag] as const),
  ["LAC", "🌎"],
]);
