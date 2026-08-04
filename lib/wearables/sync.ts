/**
 * Orquestador del sync de wearables (HU-08).
 *
 * Cada conexión activa se sincroniza con su provider correspondiente:
 *   - Refresh tokens si expira en menos de 1 día
 *   - Fetch últimos 2 días (yesterday + today) para cubrir cambios
 *   - Upsert en ActivityData por (userId, date, provider) UNIQUE
 *   - Para Fitbit: importa también peso (idempotente con manual)
 *
 * Errores por sub-provider no rompen el batch entero.
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import type { WearableProvider, DailyActivity, WearableWeightSample, TokenResponse } from "./types";
import * as fitbit from "./fitbit";
import * as oura from "./oura";

const TOKEN_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 1 día

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// ─── Refresh helper ───────────────────────────────────────────────────

type Connection = {
  id: number;
  userId: number;
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

async function ensureFreshToken(conn: Connection): Promise<string> {
  const accessTokenPlain = decrypt(conn.accessToken);
  const refreshTokenPlain = decrypt(conn.refreshToken);

  const expiresInMs = conn.expiresAt.getTime() - Date.now();
  if (expiresInMs > TOKEN_REFRESH_THRESHOLD_MS) {
    return accessTokenPlain;
  }

  // Necesita refresh
  let refreshed: TokenResponse;
  if (conn.provider === "fitbit") {
    refreshed = await fitbit.refreshTokens(refreshTokenPlain);
  } else if (conn.provider === "oura") {
    refreshed = await oura.refreshTokens(refreshTokenPlain);
  } else {
    throw new Error(`Provider sin refresh implementado: ${conn.provider}`);
  }

  const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
  await prisma.wearableConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: encrypt(refreshed.accessToken),
      refreshToken: encrypt(refreshed.refreshToken),
      expiresAt: newExpiresAt,
    },
  });

  return refreshed.accessToken;
}

// ─── Upsert helpers ───────────────────────────────────────────────────

async function upsertActivity(
  userId: number,
  provider: WearableProvider,
  activity: DailyActivity,
  rawJson: string
) {
  await prisma.activityData.upsert({
    where: {
      userId_date_provider: { userId, date: activity.date, provider },
    },
    create: {
      userId,
      date: activity.date,
      provider,
      steps: activity.steps,
      caloriesBurned: activity.caloriesBurned,
      activeMinutes: activity.activeMinutes,
      distanceKm: activity.distanceKm,
      sleepMinutes: activity.sleepMinutes,
      sleepEfficiency: activity.sleepEfficiency,
      hrv: activity.hrv,
      restingHR: activity.restingHR,
      rawJson,
    },
    update: {
      steps: activity.steps,
      caloriesBurned: activity.caloriesBurned,
      activeMinutes: activity.activeMinutes,
      distanceKm: activity.distanceKm,
      sleepMinutes: activity.sleepMinutes,
      sleepEfficiency: activity.sleepEfficiency,
      hrv: activity.hrv,
      restingHR: activity.restingHR,
      rawJson,
    },
  });
}

/**
 * Importa pesos desde wearable. Reglas:
 *   - Si no existe entry para ese día → insert con source="wearable"
 *   - Si existe con source="manual" → preservamos (el usuario tiene
 *     prioridad sobre el wearable)
 *   - Si existe con source="wearable" → actualizamos
 */
async function importWeights(userId: number, samples: WearableWeightSample[]) {
  for (const s of samples) {
    const existing = await prisma.weightEntry.findUnique({
      where: { userId_date: { userId, date: s.date } },
    });
    if (existing && existing.source === "manual") continue;

    await prisma.weightEntry.upsert({
      where: { userId_date: { userId, date: s.date } },
      create: {
        userId,
        date: s.date,
        weightKg: s.weightKg,
        source: "wearable",
      },
      update: {
        weightKg: s.weightKg,
        source: "wearable",
      },
    });
  }
}

// ─── Sync por provider ────────────────────────────────────────────────

async function syncFitbit(conn: Connection): Promise<{ days: number }> {
  const accessToken = await ensureFreshToken(conn);
  const dates = [yesterdayStr(), todayStr()];
  let days = 0;

  for (const date of dates) {
    try {
      const { activity, weights } = await fitbit.fetchDayData(accessToken, date);
      await upsertActivity(conn.userId, "fitbit", activity, JSON.stringify(activity));
      if (weights.length > 0) await importWeights(conn.userId, weights);
      days++;
    } catch (err) {
      console.warn(`[wearables/fitbit] day ${date} failed:`, err);
    }
  }
  return { days };
}

async function syncOura(conn: Connection): Promise<{ days: number }> {
  const accessToken = await ensureFreshToken(conn);
  const dates = [yesterdayStr(), todayStr()];
  let days = 0;

  for (const date of dates) {
    try {
      const { activity } = await oura.fetchDayData(accessToken, date);
      await upsertActivity(conn.userId, "oura", activity, JSON.stringify(activity));
      days++;
    } catch (err) {
      console.warn(`[wearables/oura] day ${date} failed:`, err);
    }
  }
  return { days };
}

// ─── Sync público ────────────────────────────────────────────────────

export async function syncConnection(conn: Connection): Promise<{ days: number }> {
  let result: { days: number };
  if (conn.provider === "fitbit") {
    result = await syncFitbit(conn);
  } else if (conn.provider === "oura") {
    result = await syncOura(conn);
  } else {
    throw new Error(`Provider sin sync implementado: ${conn.provider}`);
  }

  // Solo marcar como sincronizado si de verdad importamos algún día. Si los
  // fetches fallaron (token revocado, red), `days === 0` y NO tocamos
  // lastSyncedAt → la UI muestra la última sync REAL, no una mentira (I4).
  if (result.days > 0) {
    await prisma.wearableConnection.update({
      where: { id: conn.id },
      data: { lastSyncedAt: new Date() },
    });
  }

  return result;
}

export async function syncAllConnections(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const conns = await prisma.wearableConnection.findMany();
  let succeeded = 0;
  let failed = 0;

  for (const c of conns) {
    try {
      await syncConnection(c);
      succeeded++;
    } catch (err) {
      console.error(`[wearables/sync] conn ${c.id} (${c.provider}) failed:`, err);
      failed++;
    }
  }

  return { processed: conns.length, succeeded, failed };
}
