/**
 * Validación + dispatch de providers de wearables (HU-08).
 *
 * Centraliza qué providers están soportados y delega al cliente correcto.
 */

import * as fitbit from "./fitbit";
import * as oura from "./oura";
import type { TokenResponse, WearableProvider } from "./types";

export const SUPPORTED_PROVIDERS: WearableProvider[] = ["fitbit", "oura"];

export function isSupportedProvider(p: string): p is WearableProvider {
  return (SUPPORTED_PROVIDERS as string[]).includes(p);
}

export function getAuthUrl(provider: WearableProvider, state: string): string {
  if (provider === "fitbit") return fitbit.getAuthUrl(state);
  if (provider === "oura") return oura.getAuthUrl(state);
  throw new Error(`Provider sin soporte OAuth: ${provider}`);
}

export async function exchangeCode(
  provider: WearableProvider,
  code: string
): Promise<TokenResponse> {
  if (provider === "fitbit") return fitbit.exchangeCode(code);
  if (provider === "oura") return oura.exchangeCode(code);
  throw new Error(`Provider sin soporte OAuth: ${provider}`);
}

export const PROVIDER_LABELS: Record<WearableProvider, string> = {
  fitbit: "Fitbit",
  oura: "Oura Ring",
  garmin: "Garmin",
};
