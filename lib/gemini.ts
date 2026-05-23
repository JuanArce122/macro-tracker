import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Lazy singleton del cliente Gemini.
 *
 * `new GoogleGenerativeAI(undefined)` no crashea en el constructor, pero
 * `generateContent()` falla en runtime con un error opaco. Mantener la
 * instanciación a nivel de módulo además rompe el build de Vercel cuando
 * `GEMINI_API_KEY` no está en el entorno (ej. previews sin secrets de prod).
 *
 * El factory tardío garantiza que:
 *   - El módulo se puede importar durante "Collecting page data" sin la env.
 *   - Si la env falta cuando se hace una request real, lanza un error claro
 *     que el handler puede capturar y reportar al usuario.
 */
let cached: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (!cached) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada en el entorno");
    }
    cached = new GoogleGenerativeAI(apiKey);
  }
  return cached;
}
