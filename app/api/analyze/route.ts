import { NextRequest } from "next/server";
import { getGemini } from "@/lib/gemini";
import { auth } from "@/auth";

// El cliente Gemini vive en lib/gemini.ts con inicialización lazy. Si
// `GEMINI_API_KEY` no está en el entorno, getGemini() lanza un error
// claro en el primer call (no en module load).

// HU-01: timeout duro para evitar UX colgada. Gemini Flash retorna típicamente
// en 2–4s; le damos 8s antes de cancelar y mostrar mensaje claro al usuario.
const ANALYZE_TIMEOUT_MS = 8_000;

// Permitir override por env para pruebas y casos extremos. El cap absoluto
// está en `maxDuration` de Vercel (no podemos exceder ese límite hard).
const TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS) || ANALYZE_TIMEOUT_MS;

// El Node runtime nos permite usar AbortController y Promise.race sin trabas
// del Edge runtime.
export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_IMAGE_B64 = 8_000_000; // ~6 MB de imagen decodificada

const PROMPT_BASE = `Eres un nutricionista experto. Analiza la imagen de comida proporcionada e identifica TODOS los alimentos o ingredientes visibles por separado. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones.

Responde con exactamente esta estructura:
{
  "nombre_plato": "nombre descriptivo del plato completo",
  "items": [
    {
      "nombre": "nombre del alimento",
      "unidades": número entero (1 si no aplica por unidades),
      "peso_g": número en gramos del total de este ítem,
      "calorias": número,
      "proteina_g": número,
      "carbs_g": número,
      "grasa_g": número,
      "confianza": número entre 0 y 1
    }
  ]
}

Reglas:
- Identifica cada alimento visible por separado (no agrupes todo en uno).
- Si un alimento aparece en múltiples unidades (ej: 3 huevos), usa el campo "unidades" y que "peso_g" sea el peso total de todas las unidades.
- Basa los valores nutricionales en tablas estándar (USDA o equivalente) para el peso total del ítem.
- Si no puedes identificar un ingrediente con certeza, inclúyelo igual pero con confianza baja.
- Mínimo 1 ítem, sin límite máximo.`;

/**
 * Error sentinela: cuando Gemini tarda más de TIMEOUT_MS.
 * No es un Error nativo para que se pueda detectar con instanceof sin
 * depender del mensaje.
 */
class AnalyzeTimeoutError extends Error {
  constructor() {
    super(`Gemini tardó más de ${TIMEOUT_MS}ms`);
    this.name = "AnalyzeTimeoutError";
  }
}

/**
 * Envuelve la llamada a Gemini con un timeout duro. Si Gemini no resuelve
 * antes de TIMEOUT_MS, lanza AnalyzeTimeoutError.
 *
 * Nota: el SDK de @google/generative-ai no acepta AbortSignal en todas
 * sus versiones. Usamos Promise.race que funciona en cualquier versión —
 * la llamada subyacente puede seguir corriendo en background pero el
 * caller ya no espera.
 */
async function generateWithTimeout(
  promise: Promise<unknown>,
  timeoutMs: number
): Promise<unknown> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new AnalyzeTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Requiere sesión: sin esto es un proxy abierto a Gemini facturable (S1).
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { imageBase64, mimeType, weightG } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return Response.json({ error: "Se requiere imageBase64" }, { status: 400 });
    }
    if (imageBase64.length > MAX_IMAGE_B64) {
      return Response.json({ error: "La imagen es demasiado grande." }, { status: 413 });
    }
    const mime = typeof mimeType === "string" && ALLOWED_MIME.includes(mimeType) ? mimeType : "image/jpeg";
    const weightValid = typeof weightG === "number" && Number.isFinite(weightG) && weightG > 0 && weightG < 5000;

    const model = getGemini().getGenerativeModel({ model: "gemini-2.5-flash" });

    const weightNote = weightValid
      ? `El usuario indica que el peso total del plato es ${weightG}g. Distribuye ese peso entre los ítems detectados de forma proporcional.`
      : "El usuario no proporcionó el peso total, estima visualmente el peso de cada ítem.";

    type GeminiResult = { response: { text: () => string } };

    const result = (await generateWithTimeout(
      model.generateContent([
        {
          inlineData: {
            mimeType: mime,
            data: imageBase64,
          },
        },
        { text: `${PROMPT_BASE}\n\n${weightNote}` },
      ]),
      TIMEOUT_MS
    )) as GeminiResult;

    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const json = JSON.parse(cleaned);

    return Response.json(json);
  } catch (error) {
    if (error instanceof AnalyzeTimeoutError) {
      console.warn("[analyze] timeout", error.message);
      return Response.json(
        {
          error: "El análisis tardó demasiado. Intenta con una foto más simple o usa la búsqueda manual.",
          code: "timeout",
        },
        { status: 504 }
      );
    }
    console.error("[analyze]", error);
    return Response.json(
      { error: "Error al analizar la imagen. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
