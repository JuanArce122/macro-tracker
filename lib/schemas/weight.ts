import { z } from "zod";
import { DateLocalSchema } from "./common";

/**
 * Body para POST /api/weight (HU-05).
 *
 * Si `date` no se envía, el endpoint usa la fecha local del usuario (hoy).
 * El rango de peso es generoso (10–500 kg) para soportar todos los casos
 * reales y permitir validación de errores de input (no detectamos
 * decimales mal interpretados).
 */
export const WeightCreateSchema = z.object({
  weightKg: z
    .number()
    .min(10, "Peso mínimo 10 kg")
    .max(500, "Peso máximo 500 kg")
    .finite("Peso debe ser un número válido"),
  date: DateLocalSchema.optional(),
});

export type WeightCreateInput = z.infer<typeof WeightCreateSchema>;

/**
 * Schema para Goal.adjustmentMode (HU-05).
 */
export const GoalAdjustmentModeSchema = z.enum([
  "manual",
  "suggested",
  "auto",
]);

export type GoalAdjustmentMode = z.infer<typeof GoalAdjustmentModeSchema>;
