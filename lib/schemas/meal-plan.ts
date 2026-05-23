import { z } from "zod";
import { DateLocalSchema } from "./common";

/**
 * Schemas para meal planning (HU-06).
 *
 * Las preferencias se persisten serializadas en MealPlan.preferences,
 * así que validamos al crear y también al leer (con parse).
 */

export const DietTagSchema = z.enum([
  "vegano",
  "vegetariano",
  "keto",
  "paleo",
  "sin-gluten",
]);

export const AllergyTagSchema = z.enum([
  "lacteos",
  "gluten",
  "frutos-secos",
  "mariscos",
  "huevo",
  "soja",
]);

export const MealPlanPreferencesSchema = z.object({
  diet: z.array(DietTagSchema).default([]),
  allergies: z.array(AllergyTagSchema).default([]),
  mealsPerDay: z.union([z.literal(3), z.literal(4), z.literal(5)]).default(3),
  maxPrepMinutes: z.number().int().min(10).max(180).default(60),
  costLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(3),
});

export type MealPlanPreferences = z.infer<typeof MealPlanPreferencesSchema>;

/**
 * Body para POST /api/meal-plans.
 *
 * Si `startDate` no se envía, server usa el lunes de esta semana.
 */
export const MealPlanCreateSchema = z.object({
  preferences: MealPlanPreferencesSchema,
  startDate: DateLocalSchema.optional(),
});

export type MealPlanCreateInput = z.infer<typeof MealPlanCreateSchema>;

/**
 * Body para POST /api/meal-plans/[id]/log-meal.
 *
 * Marca un PlannedMeal como consumido y crea un Meal real.
 */
export const LogPlannedMealSchema = z.object({
  plannedMealId: z.number().int().positive(),
  /** Override opcional del peso si el user comió más/menos */
  weightG: z.number().positive().optional(),
});

export type LogPlannedMealInput = z.infer<typeof LogPlannedMealSchema>;
