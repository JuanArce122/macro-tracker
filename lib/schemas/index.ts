/**
 * Schemas Zod compartidos por toda la app.
 *
 * Convenciones:
 * - Schemas en PascalCase: `MealCreateSchema`
 * - Tipos derivados: `type MealCreateInput = z.infer<typeof MealCreateSchema>`
 * - Validar siempre en API routes antes de tocar Prisma
 * - Mensajes de error en español (UX directa)
 */

export * from "./meal";
export * from "./food";
export * from "./profile";
export * from "./vote";
export * from "./weight";
export * from "./common";
