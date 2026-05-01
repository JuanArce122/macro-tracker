import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q");

    if (search) {
      // Búsqueda por nombre de alimento
      const meals = await prisma.meal.findMany({
        where: { name: { contains: search } },
        orderBy: { date: "desc" },
        take: 50,
      });
      return Response.json(meals);
    }

    // Resumen por día: agrupamos en JS (SQLite no tiene GROUP BY con aggregates fácil en Prisma)
    const meals = await prisma.meal.findMany({
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
      },
    });

    // Agrupar por fecha (YYYY-MM-DD)
    const byDay = new Map<string, { date: string; calories: number; protein: number; carbs: number; fat: number }>();

    for (const meal of meals) {
      const day = meal.date.toISOString().split("T")[0];
      const existing = byDay.get(day);
      if (existing) {
        existing.calories += meal.calories;
        existing.protein += meal.protein;
        existing.carbs += meal.carbs;
        existing.fat += meal.fat;
      } else {
        byDay.set(day, {
          date: day,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
        });
      }
    }

    const days = Array.from(byDay.values()).sort((a, b) => b.date.localeCompare(a.date));

    return Response.json(days);
  } catch (error) {
    console.error("[history GET]", error);
    return Response.json({ error: "Error al obtener historial" }, { status: 500 });
  }
}
