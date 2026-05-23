/**
 * Tipos compartidos para los clientes OAuth de wearables (HU-08).
 */

export type WearableProvider = "fitbit" | "oura" | "garmin";

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos hasta expiración
  providerUserId: string;
};

/**
 * Datos diarios normalizados que persistimos en ActivityData.
 * Todos opcionales — no todos los wearables proveen todo.
 */
export type DailyActivity = {
  date: string; // YYYY-MM-DD
  steps?: number;
  caloriesBurned?: number;
  activeMinutes?: number;
  distanceKm?: number;
  sleepMinutes?: number;
  sleepEfficiency?: number; // 0-1
  hrv?: number;             // ms
  restingHR?: number;       // bpm
};

/**
 * Peso reportado por un wearable. Si llega por aquí, source = "wearable".
 * El upsert en WeightEntry preserva valores "manual" como source-of-truth.
 */
export type WearableWeightSample = {
  date: string;       // YYYY-MM-DD
  weightKg: number;
  recordedAt: string; // ISO timestamp
};
