import { z } from "zod";

/**
 * Schema para POST /api/foods/[id]/vote
 *
 * El usuario solo puede votar +1 o -1 (sin gradaciones).
 * DELETE retracta el voto y no acepta body.
 */
export const FoodVoteSchema = z.object({
  vote: z
    .union([z.literal(1), z.literal(-1)])
    .describe("Voto positivo (+1) o negativo (-1)"),
});

export type FoodVoteInput = z.infer<typeof FoodVoteSchema>;
