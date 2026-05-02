import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { searchFoods } from "@/lib/foods"; // fallback local

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "10"), 20);
  const userId = Number(session.user.id);

  if (!q || q.length < 2) return NextResponse.json({ foods: [] });

  try {
    // Buscar en DB: alimentos globales (userId null) + alimentos propios del usuario
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);

    // Construir condiciones OR para cada palabra
    const dbFoods = await prisma.food.findMany({
      where: {
        AND: words.map((word) => ({
          nombre: { contains: word },
        })),
        OR: [
          { userId: null },
          { userId },
        ],
      },
      orderBy: [
        { userId: "asc" }, // alimentos propios primero (null = global = mayor)
        { nombre: "asc" },
      ],
      take: limit,
    });

    return NextResponse.json({ foods: dbFoods, source: "db" });
  } catch {
    // Fallback: búsqueda en el array estático local
    const localResults = searchFoods(q);
    return NextResponse.json({ foods: localResults, source: "local" });
  }
}
