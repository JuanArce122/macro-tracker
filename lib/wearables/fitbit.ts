/**
 * Cliente OAuth + sync para Fitbit (HU-08).
 *
 * Docs: https://dev.fitbit.com/build/reference/web-api/
 *
 * Variables de entorno requeridas en producción:
 *   FITBIT_CLIENT_ID
 *   FITBIT_CLIENT_SECRET
 *
 * Redirect URI configurado en Fitbit dev console:
 *   {NEXTAUTH_URL}/api/wearables/callback/fitbit
 */

import type { DailyActivity, TokenResponse, WearableWeightSample } from "./types";

const FITBIT_AUTH = "https://www.fitbit.com/oauth2/authorize";
const FITBIT_TOKEN = "https://api.fitbit.com/oauth2/token";
const FITBIT_API = "https://api.fitbit.com";

export const FITBIT_SCOPES = ["activity", "heartrate", "sleep", "weight"];

function getRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/api/wearables/callback/fitbit`;
}

function basicAuth(): string {
  const id = process.env.FITBIT_CLIENT_ID;
  const secret = process.env.FITBIT_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("FITBIT_CLIENT_ID / FITBIT_CLIENT_SECRET no configurados");
  }
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

/**
 * Construye la URL a la que redirigimos al usuario para iniciar OAuth.
 * `state` es un token CSRF que validamos al recibir el callback.
 */
export function getAuthUrl(state: string): string {
  const clientId = process.env.FITBIT_CLIENT_ID;
  if (!clientId) throw new Error("FITBIT_CLIENT_ID no configurado");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: FITBIT_SCOPES.join(" "),
    redirect_uri: getRedirectUri(),
    state,
    expires_in: "604800", // 7 días — Fitbit permite hasta 30
  });
  return `${FITBIT_AUTH}?${params}`;
}

type FitbitTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
};

/**
 * Intercambia el `code` del callback por accessToken + refreshToken.
 */
export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(FITBIT_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Fitbit token exchange failed: ${res.status}`);
  }
  const data = (await res.json()) as FitbitTokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    providerUserId: data.user_id,
  };
}

/**
 * Refresca tokens cuando están por expirar.
 */
export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(FITBIT_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Fitbit token refresh failed: ${res.status}`);
  }
  const data = (await res.json()) as FitbitTokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    providerUserId: data.user_id,
  };
}

/**
 * Wrapper de fetch que añade el Authorization header y maneja 401.
 */
async function authFetch(accessToken: string, url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Fitbit fetch ${res.status}: ${url}`);
  }
  return res.json();
}

// ─── Endpoints de datos ────────────────────────────────────────────────

type ActivitiesResponse = {
  summary?: {
    steps?: number;
    caloriesOut?: number;
    activeMinutes?: number;
    fairlyActiveMinutes?: number;
    veryActiveMinutes?: number;
    distances?: Array<{ activity?: string; distance?: number }>;
  };
};

type SleepResponse = {
  summary?: {
    totalMinutesAsleep?: number;
  };
  sleep?: Array<{
    efficiency?: number;
    minutesAsleep?: number;
  }>;
};

type HrvResponse = {
  hrv?: Array<{
    value?: { dailyRmssd?: number };
  }>;
};

type WeightResponse = {
  weight?: Array<{ date: string; weight: number; time?: string }>;
};

/**
 * Trae actividad + sueño + HRV + peso para un día específico.
 * Cada sub-fetch puede fallar independientemente sin romper el resto.
 */
export async function fetchDayData(
  accessToken: string,
  date: string
): Promise<{ activity: DailyActivity; weights: WearableWeightSample[] }> {
  const [activity, sleep, hrv, weight] = await Promise.all([
    authFetch(accessToken, `${FITBIT_API}/1/user/-/activities/date/${date}.json`).catch(() => null),
    authFetch(accessToken, `${FITBIT_API}/1.2/user/-/sleep/date/${date}.json`).catch(() => null),
    authFetch(accessToken, `${FITBIT_API}/1/user/-/hrv/date/${date}.json`).catch(() => null),
    authFetch(accessToken, `${FITBIT_API}/1/user/-/body/log/weight/date/${date}.json`).catch(() => null),
  ]);

  const activityData = activity as ActivitiesResponse | null;
  const sleepData = sleep as SleepResponse | null;
  const hrvData = hrv as HrvResponse | null;
  const weightData = weight as WeightResponse | null;

  // Calcular activeMinutes = sum(fairlyActive, veryActive)
  const s = activityData?.summary;
  const activeMins =
    s?.activeMinutes ??
    (s?.fairlyActiveMinutes ?? 0) + (s?.veryActiveMinutes ?? 0);

  // Distance en km (Fitbit retorna por tipo; tomamos "total" si está)
  const totalDistance = s?.distances?.find((d) => d.activity === "total")?.distance;

  // Sleep efficiency: tomamos la del primer registro (sueño principal)
  const sleepEff = sleepData?.sleep?.[0]?.efficiency;

  const result: DailyActivity = {
    date,
    steps: s?.steps,
    caloriesBurned: s?.caloriesOut,
    activeMinutes: activeMins || undefined,
    distanceKm: typeof totalDistance === "number" ? totalDistance : undefined,
    sleepMinutes: sleepData?.summary?.totalMinutesAsleep ?? sleepData?.sleep?.[0]?.minutesAsleep,
    sleepEfficiency: typeof sleepEff === "number" ? sleepEff / 100 : undefined,
    hrv: hrvData?.hrv?.[0]?.value?.dailyRmssd,
    // restingHR no viene en este endpoint; requiere /heart/date/X.json
  };

  const weights: WearableWeightSample[] = (weightData?.weight ?? []).map((w) => ({
    date: w.date,
    weightKg: w.weight,
    recordedAt: w.time ? `${w.date}T${w.time}Z` : `${w.date}T12:00:00Z`,
  }));

  return { activity: result, weights };
}
