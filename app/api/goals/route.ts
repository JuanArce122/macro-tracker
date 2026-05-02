import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const goal = await prisma.goal.findFirst({
      where: { userId },
      orderBy: { id: "desc" },
    });

    if (!goal) {
      return Response.json({ calories: 2000, protein: 150, carbs: 200, fat: 65 });
    }

    return Response.json(goal);
  } catch (error) {
    console.error("[goals GET]", error);
    return Response.json({ error: "Error al obtener metas" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { calories, protein, carbs, fat } = await req.json();

    if (calories == null || protein == null || carbs == null || fat == null) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const existing = await prisma.goal.findFirst({
      where: { userId },
      orderBy: { id: "desc" },
    });

    const goal = existing
      ? await prisma.goal.update({
          where: { id: existing.id },
          data: {
            calories: Number(calories),
            protein: Number(protein),
            carbs: Number(carbs),
            fat: Number(fat),
          },
        })
      : await prisma.goal.create({
          data: {
            userId,
            calories: Number(calories),
            protein: Number(protein),
            carbs: Number(carbs),
            fat: Number(fat),
          },
        });

    return Response.json(goal);
  } catch (error) {
    console.error("[goals PUT]", error);
    return Response.json({ error: "Error al guardar metas" }, { status: 500 });
  }
}
