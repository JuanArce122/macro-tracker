import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, weightG } = await req.json();

    if (!imageBase64) {
      return Response.json({ error: "Se requiere imageBase64" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const weightNote = weightG
      ? `El usuario indica que el peso total del plato es ${weightG}g. Distribuye ese peso entre los ítems detectados de forma proporcional.`
      : "El usuario no proporcionó el peso total, estima visualmente el peso de cada ítem.";

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType ?? "image/jpeg",
          data: imageBase64,
        },
      },
      { text: `${PROMPT_BASE}\n\n${weightNote}` },
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const json = JSON.parse(cleaned);

    return Response.json(json);
  } catch (error) {
    console.error("[analyze]", error);
    return Response.json(
      { error: "Error al analizar la imagen. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
