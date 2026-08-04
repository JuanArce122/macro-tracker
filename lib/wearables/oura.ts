/**
 * Cliente OAuth + sync para Oura Ring (HU-08).
 *
 * Docs: https://cloud.ouraring.com/v2/docs
 *
 * Variables de entorno requeridas en producción:
 *   OURA_CLIENT_ID
 *   OURA_CLIENT_SECRET
 *
 * Redirect URI configurado en Oura dev console:
 *   {NEXTAUTH_URL}/api/wearables/callback/oura
 */

import type { DailyActivity, TokenResponse } from "./types";

const OURA_AUTH = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN = "https://api.ouraring.com/oauth/token";
const OURA_API = "https://api.ouraring.com/v2";

export const OURA_SCOPES = ["daily", "heartrate", "personal"];

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/wearables/callback/oura`;
}

export function getAuthUrl(state: string): string {
  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) throw new Error("OURA_CLIENT_ID no configurado");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: OURA_SCOPES.join(" "),
    redirect_uri: getRedirectUri(),
    state,
  });
  return `${OURA_AUTH}?${params}`;
}

type OuraTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  // Oura no retorna user_id en el token; lo obtenemos del /personal_info endpoint
};

async function fetchPersonalInfo(accessToken: string): Promise<{ id: string }> {
  const res = await fetch(`${OURA_API}/usercollection/personal_info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Oura personal_info failed: ${res.status}`);
  return (await res.json()) as { id: string };
}

async function postToken(params: URLSearchParams): Promise<TokenResponse> {
  const clientId = process.env.OURA_CLIENT_ID;
  const secret = process.env.OURA_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("OURA_CLIENT_ID / OURA_CLIENT_SECRET no configurados");
  }

  // Oura acepta credentials en el body o en Basic auth header — usamos body
  params.set("client_id", clientId);
  params.set("client_secret", secret);

  const res = await fetch(OURA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    throw new Error(`Oura token request failed: ${res.status}`);
  }
  const data = (await res.json()) as OuraTokenResponse;

  // Oura no incluye user_id en el token response → segundo fetch
  const personal = await fetchPersonalInfo(data.access_token);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    providerUserId: personal.id,
  };
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    })
  );
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
}

// ─── Endpoints de datos ────────────────────────────────────────────────

async function authFetch<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Oura fetch ${res.status}: ${url}`);
  return (await res.json()) as T;
}

type DailyActivityResponse = {
  data?: Array<{
    day: string;
    steps?: number;
    active_calories?: number;
    target_calories?: number;
    high_activity_time?: number;     // segundos
    medium_activity_time?: number;
    low_activity_time?: number;
    equivalent_walking_distance?: number; // metros
  }>;
};

type DailySleepResponse = {
  data?: Array<{
    day: string;
    score?: number;
    contributors?: { efficiency?: number };
  }>;
};

type SleepResponse = {
  data?: Array<{
    day: string;
    total_sleep_duration?: number;    // segundos
    efficiency?: number;              // 0-100
    average_hrv?: number;             // ms
    average_heart_rate?: number;
    lowest_heart_rate?: number;
  }>;
};

/**
 * Trae actividad + sueño para un día específico de Oura.
 * Cada sub-fetch puede fallar independientemente.
 */
export async function fetchDayData(
  accessToken: string,
  date: string
): Promise<{ activity: DailyActivity }> {
  const dayRange = `start_date=${date}&end_date=${date}`;

  const [act, dailySleep, sleep] = await Promise.all([
    authFetch<DailyActivityResponse>(accessToken, `${OURA_API}/usercollection/daily_activity?${dayRange}`).catch(() => null),
    authFetch<DailySleepResponse>(accessToken, `${OURA_API}/usercollection/daily_sleep?${dayRange}`).catch(() => null),
    authFetch<SleepResponse>(accessToken, `${OURA_API}/usercollection/sleep?${dayRange}`).catch(() => null),
  ]);

  const actDay = act?.data?.[0];
  const sleepDay = sleep?.data?.[0];
  const dailySleepDay = dailySleep?.data?.[0];

  const activeMins = actDay
    ? Math.round(
        ((actDay.high_activity_time ?? 0) + (actDay.medium_activity_time ?? 0)) / 60
      )
    : undefined;

  const distanceKm = actDay?.equivalent_walking_distance
    ? Math.round((actDay.equivalent_walking_distance / 1000) * 100) / 100
    : undefined;

  // Sleep efficiency: preferimos el dato directo, fallback al daily_sleep score
  const efficiency =
    sleepDay?.efficiency ??
    dailySleepDay?.contributors?.efficiency ??
    undefined;

  const result: DailyActivity = {
    date,
    steps: actDay?.steps,
    caloriesBurned: actDay?.active_calories,
    activeMinutes: activeMins,
    distanceKm,
    sleepMinutes: sleepDay?.total_sleep_duration
      ? Math.round(sleepDay.total_sleep_duration / 60)
      : undefined,
    sleepEfficiency: typeof efficiency === "number" ? efficiency / 100 : undefined,
    hrv: sleepDay?.average_hrv,
    restingHR: sleepDay?.lowest_heart_rate,
  };

  return { activity: result };
}
