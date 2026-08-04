import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { GoalUpdateSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";

const DEFAULT_GOAL = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  adjustmentMode: "manual",
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const goal = await prisma.goal.findUnique({ where: { userId } });

    if (!goal) {
      return Response.json(DEFAULT_GOAL);
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

    const parsed = await validateBody(req, GoalUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const { calories, protein, carbs, fat, adjustmentMode } = parsed.data;

    // Solo actualizamos adjustmentMode si fue provisto; preservamos el
    // valor anterior si no.
    const baseData = { calories, protein, carbs, fat };
    const update =
      adjustmentMode !== undefined
        ? { ...baseData, adjustmentMode }
        : baseData;

    // upsert atómico por userId (Goal.@@unique([userId])): dos PUT concurrentes
    // ya no crean metas duplicadas (D6).
    const goal = await prisma.goal.upsert({
      where: { userId },
      update,
      create: { userId, ...baseData, adjustmentMode: adjustmentMode ?? "manual" },
    });

    return Response.json(goal);
  } catch (error) {
    console.error("[goals PUT]", error);
    return Response.json({ error: "Error al guardar metas" }, { status: 500 });
  }
}
