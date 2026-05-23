import { z } from "zod";

/**
 * Body para POST /api/admin/foods/sync-usda (HU-07).
 *
 * Dos modos:
 *  - Por query: importa los primeros N resultados que matcheen el query
 *  - Por fdcIds: importa una lista específica de IDs USDA
 *
 * Al menos uno debe enviarse.
 */
export const UsdaSyncRequestSchema = z
  .object({
    query: z.string().min(1).max(100).optional(),
    fdcIds: z.array(z.number().int().positive()).max(50).optional(),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .refine((data) => data.query || (data.fdcIds && data.fdcIds.length > 0), {
    message: "Debes enviar 'query' o 'fdcIds'",
  });

export type UsdaSyncRequest = z.infer<typeof UsdaSyncRequestSchema>;
