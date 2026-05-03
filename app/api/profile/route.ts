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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        avatarEmoji: true,
        age: true,
        sex: true,
        weightKg: true,
        heightCm: true,
        activityLevel: true,
        fitnessGoal: true,
        email: true,
      },
    });

    if (!user) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
    return Response.json(user);
  } catch (error) {
    console.error("[profile GET]", error);
    return Response.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { name, avatarEmoji, age, sex, weightKg, heightCm, activityLevel, fitnessGoal } =
      await req.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name ?? null,
        avatarEmoji: avatarEmoji ?? null,
        age: age ? Number(age) : null,
        sex: sex ?? null,
        weightKg: weightKg ? Number(weightKg) : null,
        heightCm: heightCm ? Number(heightCm) : null,
        activityLevel: activityLevel ?? null,
        fitnessGoal: fitnessGoal ?? null,
      },
      select: {
        name: true,
        avatarEmoji: true,
        age: true,
        sex: true,
        weightKg: true,
        heightCm: true,
        activityLevel: true,
        fitnessGoal: true,
      },
    });

    return Response.json(user);
  } catch (error) {
    console.error("[profile PUT]", error);
    return Response.json({ error: "Error al guardar perfil" }, { status: 500 });
  }
}
