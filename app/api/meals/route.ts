import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { MealCreateSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";
import { MICRO_KEYS, type MicroKey } from "@/lib/micros";

/**
 * Si se provee foodId, server hace snapshot de los 15 micros escalando
 * del valor por 100g del Food al weightG real del meal. Retorna {} si
 * el food no existe (no rompemos la creación del meal por esto).
 */
async function snapshotMicrosFromFood(
  foodId: number,
  weightG: number
): Promise<Partial<Record<MicroKey, number>>> {
  const food = await prisma.food.findUnique({
    where: { id: foodId },
    select: {
      fiber: true, sugar: true,
      sodium: true, potassium: true, calcium: true, iron: true,
      vitaminC: true, vitaminD: true, vitaminB12: true, vitaminA: true, folate: true,
      magnesium: true, zinc: true,
      omega3: true, omega6: true,
    },
  });
  if (!food) return {};

  const factor = weightG / 100;
  const out: Partial<Record<MicroKey, number>> = {};
  for (const k of MICRO_KEYS) {
    const v = (food as Record<string, number | null>)[k];
    if (typeof v === "number") {
      out[k] = Math.round(v * factor * 100) / 100;
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return Response.json({ error: "Se requiere el parámetro date (YYYY-MM-DD)" }, { status: 400 });
    }

    const meals = await prisma.meal.findMany({
      where: {
        userId,
        OR: [
          { dateLocal: date },
          { dateLocal: null, date: { gte: new Date(`${date}T00:00:00.000Z`), lte: new Date(`${date}T23:59:59.999Z`) } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    return Response.json(meals);
  } catch (error) {
    console.error("[meals GET]", error);
    return Response.json({ error: "Error al obtener comidas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const parsed = await validateBody(req, MealCreateSchema);
    if (!parsed.ok) return parsed.response;
    const { date, dateLocal, category, name, imageBase64, weightG, calories, protein, carbs, fat, confidence, items, foodId } = parsed.data;

    // HU-07: snapshot de micros si el cliente identifica el Food
    const microsSnapshot = foodId
      ? await snapshotMicrosFromFood(foodId, weightG)
      : {};

    let imageUrl: string | null = null;

    if (imageBase64) {
      try {
        const buffer = Buffer.from(imageBase64, "base64");
        const resized = await sharp(buffer)
          .resize({ width: 600, withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer();

        const filename = `meal-${userId}-${Date.now()}.jpg`;
        const blob = await put(filename, resized, {
          access: "public",
          contentType: "image/jpeg",
          // Sufijo aleatorio: la URL deja de ser adivinable por timestamp (S5)
          // y evita colisiones entre usuarios que suben en el mismo ms.
          addRandomSuffix: true,
        });
        imageUrl = blob.url;
      } catch (blobError) {
        // Si el upload falla, guardamos la comida sin imagen
        console.error("[meals POST] Blob upload failed (comida guardada sin imagen):", blobError);
      }
    }

    const meal = await prisma.meal.create({
      data: {
        userId,
        date: new Date(date),
        dateLocal: dateLocal ?? null,
        category,
        name,
        imageUrl,
        weightG,
        calories,
        protein,
        carbs,
        fat,
        confidence,
        items: items ? JSON.stringify(items) : null,
        // Snapshot micros (HU-07): solo si foodId estaba presente
        ...microsSnapshot,
      },
    });

    return Response.json(meal, { status: 201 });
  } catch (error) {
    console.error("[meals POST]", error);
    return Response.json({ error: "Error al crear comida" }, { status: 500 });
  }
}
