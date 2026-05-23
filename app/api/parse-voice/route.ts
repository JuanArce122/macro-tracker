import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { VoiceParseRequestSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";
import { VOICE_PARSE_SYSTEM } from "@/lib/voice/parse-prompt";
import { matchFoods, type ParsedVoiceItem, type VoiceUnit } from "@/lib/voice/match-foods";
import { getGemini } from "@/lib/gemini";

// Permitimos override por env para tests (igual que en /api/analyze)
const PARSE_VOICE_TIMEOUT_MS = Number(process.env.PARSE_VOICE_TIMEOUT_MS) || 6_000;

export const runtime = "nodejs";
export const maxDuration = 15;

const VALID_UNITS: VoiceUnit[] = ["g", "ml", "unidad", "taza", "cucharada", "porcion"];

class VoiceTimeoutError extends Error {
  constructor() { super(`Voice parse > ${PARSE_VOICE_TIMEOUT_MS}ms`); this.name = "VoiceTimeoutError"; }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return (await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new VoiceTimeoutError()), ms);
      }),
    ])) as T;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

/**
 * Sanea la respuesta de Gemini: elimina items malformados y normaliza
 * la unidad a un valor permitido. Sin tirar la request si algo falla.
 */
function sanitizeItems(raw: unknown): ParsedVoiceItem[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { items?: unknown };
  if (!Array.isArray(obj.items)) return [];

  const out: ParsedVoiceItem[] = [];
  for (const it of obj.items as unknown[]) {
    if (!it || typeof it !== "object") continue;
    const candidate = it as Partial<ParsedVoiceItem>;
    if (typeof candidate.nombre !== "string" || !candidate.nombre.trim()) continue;
    const cantidad = Number(candidate.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) continue;
    const unidad = candidate.unidad as string | undefined;
    if (!unidad || !VALID_UNITS.includes(unidad as VoiceUnit)) continue;
    let confianza = Number(candidate.confianza);
    if (!Number.isFinite(confianza)) confianza = 0.5;
    confianza = Math.max(0, Math.min(1, confianza));

    out.push({
      nombre: candidate.nombre.trim(),
      cantidad,
      unidad: unidad as VoiceUnit,
      confianza,
    });
  }
  return out;
}

/**
 * POST /api/parse-voice
 *
 * Body: { transcript: string }
 *
 * Pasos:
 *   1. Llama a Gemini con prompt es-CO + transcript
 *   2. Parsea el JSON, saneando items malformados
 *   3. Matchea cada item contra Food (respeta countryCode HU-12)
 *   4. Retorna { items, transcript }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const parsed = await validateBody(req, VoiceParseRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { transcript } = parsed.data;

  try {
    const model = getGemini().getGenerativeModel({ model: "gemini-2.5-flash" });

    type GeminiResult = { response: { text: () => string } };

    const result = (await withTimeout(
      model.generateContent([
        { text: VOICE_PARSE_SYSTEM },
        { text: `\n\nTranscript del usuario:\n${transcript}` },
      ]),
      PARSE_VOICE_TIMEOUT_MS
    )) as GeminiResult;

    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    let json: unknown;
    try {
      json = JSON.parse(cleaned);
    } catch {
      return Response.json(
        { error: "No pudimos entender el audio. Intenta repetir más despacio o usa la búsqueda manual." },
        { status: 502 }
      );
    }

    const items = sanitizeItems(json);
    if (items.length === 0) {
      return Response.json({
        items: [],
        transcript,
        message: "No detectamos alimentos. Intenta de nuevo siendo más específico (ej. 'dos huevos con una arepa').",
      });
    }

    const matched = await matchFoods(items, userId);

    return Response.json({ items: matched, transcript });
  } catch (error) {
    if (error instanceof VoiceTimeoutError) {
      console.warn("[parse-voice] timeout", error.message);
      return Response.json(
        { error: "El parseo tardó demasiado. Intenta un dictado más corto.", code: "timeout" },
        { status: 504 }
      );
    }

    // Log enriquecido para diagnosticar en Vercel: mensaje + stack + tipo.
    const errMessage = error instanceof Error ? error.message : String(error);
    const errName    = error instanceof Error ? error.name    : "UnknownError";
    const errStack   = error instanceof Error ? error.stack   : undefined;
    console.error("[parse-voice]", { name: errName, message: errMessage, stack: errStack });

    // GEMINI_API_KEY ausente: getGemini() lanza con mensaje claro.
    if (errMessage.includes("GEMINI_API_KEY")) {
      return Response.json(
        { error: "Servicio de voz no configurado. Contacta al administrador.", code: "missing_api_key" },
        { status: 503 }
      );
    }

    return Response.json({ error: "Error al procesar el audio" }, { status: 500 });
  }
}
