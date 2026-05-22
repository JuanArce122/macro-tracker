import { z } from "zod";

export const SexSchema = z.enum(["male", "female"]);

export const ActivityLevelSchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);

export const FitnessGoalSchema = z.enum([
  "lose",
  "maintain",
  "gain",
]);

/**
 * Body aceptado por `PUT /api/profile`.
 * Todos los campos opcionales (parcial); null se acepta como "borrar".
 */
export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(80).nullable().optional(),
  avatarEmoji: z.string().max(8).nullable().optional(),
  age: z
    .number()
    .int()
    .min(10, "Edad mínima 10 años")
    .max(120, "Edad máxima 120 años")
    .nullable()
    .optional(),
  sex: SexSchema.nullable().optional(),
  weightKg: z
    .number()
    .min(20, "Peso mínimo 20 kg")
    .max(400, "Peso máximo 400 kg")
    .nullable()
    .optional(),
  heightCm: z
    .number()
    .min(50, "Altura mínima 50 cm")
    .max(280, "Altura máxima 280 cm")
    .nullable()
    .optional(),
  activityLevel: ActivityLevelSchema.nullable().optional(),
  fitnessGoal: FitnessGoalSchema.nullable().optional(),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
