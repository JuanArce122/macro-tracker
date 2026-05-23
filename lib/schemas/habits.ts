import { z } from "zod";
import { DateLocalSchema } from "./common";

/**
 * Modo de tracking del usuario (HU-11).
 *   - "macros": dashboard tradicional con calorías y macros exactos
 *   - "habits": dashboard simplificado con porciones visuales
 */
export const TrackingModeSchema = z.enum(["macros", "habits"]);

export type TrackingMode = z.infer<typeof TrackingModeSchema>;

/**
 * Schema para POST/PATCH /api/habits (HU-11).
 *
 * Todas las porciones son enteros >= 0. El cliente envía las cantidades
 * absolutas (no deltas) para evitar drift; el server hace upsert.
 *
 * `date` opcional → hoy.
 */
export const HabitEntryUpsertSchema = z.object({
  date: DateLocalSchema.optional(),
  proteinPortions: z.number().int().min(0).max(99).optional(),
  vegPortions: z.number().int().min(0).max(99).optional(),
  carbPortions: z.number().int().min(0).max(99).optional(),
  fatPortions: z.number().int().min(0).max(99).optional(),
  fruitPortions: z.number().int().min(0).max(99).optional(),
});

export type HabitEntryUpsertInput = z.infer<typeof HabitEntryUpsertSchema>;
