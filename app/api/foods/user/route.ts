import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/foods/user — alimentos propios del usuario + recientes
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const [myFoods, recentFoods] = await Promise.all([
    // Alimentos creados por el usuario
    prisma.food.findMany({
      where: { userId, source: "user" },
      orderBy: { nombre: "asc" },
    }),
    // Últimos 5 alimentos usados (cualquier fuente)
    prisma.food.findMany({
      where: {
        lastUsedAt: { not: null },
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { lastUsedAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ myFoods, recentFoods });
}
