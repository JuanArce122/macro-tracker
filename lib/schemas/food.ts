import { z } from "zod";
import { PositiveNumberSchema } from "./common";

/**
 * Origen de la entrada de Food. Coincide con valores guardados en `Food.source`.
 */
export const FoodSourceSchema = z.enum([
  "usda",
  "openfoodfacts",
  "user",
]);

export type FoodSource = z.infer<typeof FoodSourceSchema>;

/**
 * Categoría macro principal (informativa).
 */
export const FoodCategorySchema = z.enum([
  "proteina",
  "carbohidrato",
  "verdura",
  "fruta",
  "grasa",
  "lacteo",
  "bebida",
  "otros",
  "user",
]);

export type FoodCategory = z.infer<typeof FoodCategorySchema>;

/**
 * Body aceptado por `POST /api/foods` (crear alimento de usuario).
 */
export const FoodCreateSchema = z.object({
  nombre: z
    .string()
    .min(1, "Nombre requerido")
    .max(120, "Nombre muy largo")
    .transform((s) => s.trim()),
  cal: PositiveNumberSchema,
  p: PositiveNumberSchema.default(0),
  c: PositiveNumberSchema.default(0),
  f: PositiveNumberSchema.default(0),
  gramsPerUnit: PositiveNumberSchema.nullable().optional(),
  unitLabel: z.string().max(40).nullable().optional(),
});

export type FoodCreateInput = z.infer<typeof FoodCreateSchema>;
