import { z } from "zod";
import { PositiveNumberSchema } from "./common";
import { GoalAdjustmentModeSchema } from "./weight";

/**
 * Body para PUT /api/goals (HU-05 actualizado).
 *
 * Acepta el modo de ajuste opcionalmente; si no se envía, no toca el
 * campo (preservamos el valor previo).
 */
export const GoalUpdateSchema = z.object({
  calories: PositiveNumberSchema,
  protein: PositiveNumberSchema,
  carbs: PositiveNumberSchema,
  fat: PositiveNumberSchema,
  adjustmentMode: GoalAdjustmentModeSchema.optional(),
});

export type GoalUpdateInput = z.infer<typeof GoalUpdateSchema>;
