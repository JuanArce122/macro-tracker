import { z } from "zod";

/** YYYY-MM-DD */
export const DateLocalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe tener formato YYYY-MM-DD");

/** ISO 8601 con o sin timezone */
export const ISODateSchema = z.string().datetime({ offset: true });

/** Número positivo (gramos, calorías, etc.) */
export const PositiveNumberSchema = z
  .number()
  .min(0, "Debe ser mayor o igual a 0")
  .finite("Debe ser un número válido");

/** ID de DB (entero positivo) */
export const DbIdSchema = z.number().int().positive();

/** ISO 3166-1 alpha-2 (CO, MX, AR, etc.) */
export const CountryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Código de país debe ser 2 letras mayúsculas")
  .nullable()
  .optional();
