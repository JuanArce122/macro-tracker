import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, category, weightG, calories, protein, carbs, fat, items } = body;

    const meal = await prisma.meal.update({
      where: { id: Number(id) },
      data: {
        ...(name != null && { name }),
        ...(category != null && { category }),
        ...(weightG != null && { weightG: Number(weightG) }),
        ...(calories != null && { calories: Number(calories) }),
        ...(protein != null && { protein: Number(protein) }),
        ...(carbs != null && { carbs: Number(carbs) }),
        ...(fat != null && { fat: Number(fat) }),
        ...(items !== undefined && { items: items ? JSON.stringify(items) : null }),
      },
    });

    return Response.json(meal);
  } catch (error) {
    console.error("[meals PUT]", error);
    return Response.json({ error: "Error al editar comida" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const meal = await prisma.meal.findUnique({ where: { id: Number(id) } });

    if (!meal) {
      return Response.json({ error: "Comida no encontrada" }, { status: 404 });
    }

    if (meal.imageUrl) {
      const filepath = join(process.cwd(), "public", meal.imageUrl);
      await unlink(filepath).catch(() => null);
    }

    await prisma.meal.delete({ where: { id: Number(id) } });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[meals DELETE]", error);
    return Response.json({ error: "Error al eliminar comida" }, { status: 500 });
  }
}
