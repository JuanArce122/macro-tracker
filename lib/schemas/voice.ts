import { z } from "zod";

/**
 * Schema para POST /api/parse-voice (HU-02).
 *
 * El cliente envía el transcript completo (string). El server llama a
 * Gemini con el prompt es-CO y retorna items matcheados.
 */
export const VoiceParseRequestSchema = z.object({
  transcript: z
    .string()
    .min(1, "Transcript vacío")
    .max(2000, "Transcript demasiado largo"),
});

export type VoiceParseRequest = z.infer<typeof VoiceParseRequestSchema>;
