import { z } from "zod";
import { DateLocalSchema, PositiveNumberSchema } from "./common";

/**
 * Categorías de comida del día.
 * Coincide con `Meal.category` en la DB.
 */
export const MealCategorySchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export type MealCategory = z.infer<typeof MealCategorySchema>;

/**
 * Cada ítem identificado dentro de un meal (por ej., del análisis de Gemini).
 * Se serializa como JSON en `Meal.items`.
 */
export const MealItemSchema = z.object({
  nombre: z.string().min(1).max(120),
  unidades: z.number().int().positive().default(1),
  pesoG: PositiveNumberSchema,
  calorias: PositiveNumberSchema,
  proteina: PositiveNumberSchema,
  carbs: PositiveNumberSchema,
  grasa: PositiveNumberSchema,
  confianza: z.number().min(0).max(1),
});

export type MealItem = z.infer<typeof MealItemSchema>;

/**
 * Body aceptado por `POST /api/meals`.
 *
 * - `date`: ISO 8601 (timestamp UTC del registro)
 * - `dateLocal`: YYYY-MM-DD del usuario (zona horaria local)
 * - `imageBase64`: opcional, se sube a blob y queda en `imageUrl` server-side
 */
export const MealCreateSchema = z.object({
  date: z.string().min(1, "Fecha requerida"), // ISO 8601 o YYYY-MM-DD
  dateLocal: DateLocalSchema.nullable().optional(),
  category: MealCategorySchema,
  name: z.string().min(1, "Nombre requerido").max(200),
  imageBase64: z.string().nullable().optional(),
  weightG: PositiveNumberSchema,
  calories: PositiveNumberSchema,
  protein: PositiveNumberSchema,
  carbs: PositiveNumberSchema,
  fat: PositiveNumberSchema,
  confidence: z.number().min(0).max(1).default(1),
  items: z.array(MealItemSchema).optional(),
});

export type MealCreateInput = z.infer<typeof MealCreateSchema>;

/**
 * Body aceptado por `PATCH /api/meals/[id]`.
 * Todos los campos opcionales (parcial).
 */
export const MealUpdateSchema = MealCreateSchema.partial();

export type MealUpdateInput = z.infer<typeof MealUpdateSchema>;
