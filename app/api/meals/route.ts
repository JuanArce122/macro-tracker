import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

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

    const body = await req.json();
    const { date, dateLocal, category, name, imageBase64, mimeType, weightG, calories, protein, carbs, fat, confidence, items } = body;

    if (!date || !category || !name || weightG == null || calories == null || protein == null || carbs == null || fat == null || confidence == null) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    let imageUrl: string | null = null;

    if (imageBase64) {
      try {
        const buffer = Buffer.from(imageBase64, "base64");
        const resized = await sharp(buffer)
          .resize({ width: 600, withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer();

        const filename = `meal-${Date.now()}.jpg`;
        const blob = await put(filename, resized, {
          access: "public",
          contentType: "image/jpeg",
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
        weightG: Number(weightG),
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        confidence: Number(confidence),
        items: items ? JSON.stringify(items) : null,
      },
    });

    return Response.json(meal, { status: 201 });
  } catch (error) {
    console.error("[meals POST]", error);
    return Response.json({ error: "Error al crear comida" }, { status: 500 });
  }
}
