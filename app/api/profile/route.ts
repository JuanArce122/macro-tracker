import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { ProfileUpdateSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";

const PROFILE_SELECT = {
  name: true,
  avatarEmoji: true,
  age: true,
  sex: true,
  weightKg: true,
  heightCm: true,
  activityLevel: true,
  fitnessGoal: true,
  countryCode: true,
  trackingMode: true,
} as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...PROFILE_SELECT, email: true },
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

    const parsed = await validateBody(req, ProfileUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;

    // Construir el data del update: solo trackingMode usa "preservar si
    // no se envía" porque tiene un default; el resto sí queremos que
    // null sea "borrar".
    const updateData = {
      name: data.name ?? null,
      avatarEmoji: data.avatarEmoji ?? null,
      age: data.age ?? null,
      sex: data.sex ?? null,
      weightKg: data.weightKg ?? null,
      heightCm: data.heightCm ?? null,
      activityLevel: data.activityLevel ?? null,
      fitnessGoal: data.fitnessGoal ?? null,
      countryCode: data.countryCode ?? null,
      ...(data.trackingMode !== undefined ? { trackingMode: data.trackingMode } : {}),
    };

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: PROFILE_SELECT,
    });

    return Response.json(user);
  } catch (error) {
    console.error("[profile PUT]", error);
    return Response.json({ error: "Error al guardar perfil" }, { status: 500 });
  }
}
