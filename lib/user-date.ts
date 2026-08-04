/**
 * Fuente única del "día del usuario" (Fase 3, causa raíz #1).
 *
 * El día se deriva de la zona horaria del usuario (por su `countryCode`,
 * decisión D-B) para que el servidor (Vercel corre en UTC) y el cliente
 * coincidan. Sin dependencias externas: usamos `Intl`. Países con varios husos
 * (US, MX) usan uno representativo — suficiente para el mercado LAC de la app.
 *
 * Módulo isomórfico (sin imports server-only): `getUserToday` se usa en el
 * servidor; `todayLocalClient` en el cliente.
 */

const COUNTRY_TZ: Record<string, string> = {
  CO: "America/Bogota",
  MX: "America/Mexico_City",
  AR: "America/Argentina/Buenos_Aires",
  PE: "America/Lima",
  CL: "America/Santiago",
  VE: "America/Caracas",
  EC: "America/Guayaquil",
  UY: "America/Montevideo",
  PY: "America/Asuncion",
  BO: "America/La_Paz",
  CR: "America/Costa_Rica",
  PA: "America/Panama",
  DO: "America/Santo_Domingo",
  GT: "America/Guatemala",
  HN: "America/Tegucigalpa",
  SV: "America/El_Salvador",
  NI: "America/Managua",
  CU: "America/Havana",
  PR: "America/Puerto_Rico",
  ES: "Europe/Madrid",
  US: "America/New_York",
};

export const DEFAULT_TZ = "America/Bogota";

export function tzForCountry(code: string | null | undefined): string {
  return (code && COUNTRY_TZ[code]) || DEFAULT_TZ;
}

/** "YYYY-MM-DD" del instante `now` en la zona `tz`. */
export function todayInTz(tz: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "Hoy" (YYYY-MM-DD) en la zona del usuario, derivada de su `countryCode`. */
export function getUserToday(
  user: { countryCode?: string | null } | null | undefined,
  now?: Date
): string {
  return todayInTz(tzForCountry(user?.countryCode), now);
}

/**
 * Cliente: "hoy" (YYYY-MM-DD) en la zona local del dispositivo. Para el usuario
 * en su país coincide con `getUserToday`; el servidor no conoce la tz del
 * dispositivo, así que las escrituras usan esta fecha local real.
 */
export function todayLocalClient(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}
