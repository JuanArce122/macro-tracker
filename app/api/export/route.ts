import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const meals = await prisma.meal.findMany({
      where: from && to ? {
        OR: [
          { dateLocal: { gte: from, lte: to } },
          { dateLocal: null, date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) } },
        ],
      } : undefined,
      orderBy: [{ dateLocal: "asc" }, { date: "asc" }],
    });

    const header = "Fecha,Categoría,Nombre,Peso (g),Calorías,Proteína (g),Carbohidratos (g),Grasa (g),Confianza";
    const rows = meals.map((m) => {
      const date = m.dateLocal ?? m.date.toISOString().split("T")[0];
      const name = `"${m.name.replace(/"/g, '""')}"`;
      return [date, m.category, name, m.weightG, m.calories, m.protein, m.carbs, m.fat, m.confidence.toFixed(2)].join(",");
    });

    const csv = [header, ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="macros-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[export GET]", error);
    return Response.json({ error: "Error al exportar" }, { status: 500 });
  }
}
