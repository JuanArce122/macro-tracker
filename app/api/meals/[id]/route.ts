import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { del } from "@vercel/blob";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { id } = await params;
    const body = await req.json();
    const { name, category, weightG, calories, protein, carbs, fat, items } = body;

    // Verificar que la comida pertenece al usuario
    const existing = await prisma.meal.findFirst({ where: { id: Number(id), userId } });
    if (!existing) {
      return Response.json({ error: "Comida no encontrada" }, { status: 404 });
    }

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
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { id } = await params;

    // Verificar que la comida pertenece al usuario
    const meal = await prisma.meal.findFirst({ where: { id: Number(id), userId } });
    if (!meal) {
      return Response.json({ error: "Comida no encontrada" }, { status: 404 });
    }

    await prisma.meal.delete({ where: { id: Number(id) } });

    // Borrar la foto de Vercel Blob (best-effort). Evita blobs huérfanos y
    // fotos que seguían públicas tras borrar la comida (I6).
    if (meal.imageUrl?.includes("blob.vercel-storage.com")) {
      await del(meal.imageUrl).catch((e) =>
        console.error("[meals DELETE] blob del failed:", e)
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[meals DELETE]", error);
    return Response.json({ error: "Error al eliminar comida" }, { status: 500 });
  }
}
