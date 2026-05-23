import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { detectFromDailyStats, type DailyStats } from "@/lib/tca-detection";

/**
 * Carga las stats diarias del usuario para la ventana de 14 días.
 */
async function loadDailyStats(userId: number): Promise<DailyStats[]> {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().split("T")[0];

  const goal = await prisma.goal.findFirst({
    where: { userId },
    orderBy: { id: "desc" },
    select: { calories: true },
  });
  const goalCalories = goal?.calories ?? 2000;

  const meals = await prisma.meal.findMany({
    where: {
      userId,
      OR: [
        { dateLocal: { gte: sinceStr } },
        { dateLocal: null, date: { gte: since } },
      ],
    },
    select: { dateLocal: true, date: true, calories: true },
    orderBy: { date: "asc" },
  });

  // Agrupar por día
  const byDay = new Map<string, { mealCount: number; totalCalories: number }>();
  for (const m of meals) {
    const day = m.dateLocal ?? m.date.toISOString().split("T")[0];
    const acc = byDay.get(day);
    if (acc) {
      acc.mealCount += 1;
      acc.totalCalories += m.calories;
    } else {
      byDay.set(day, { mealCount: 1, totalCalories: m.calories });
    }
  }

  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, mealCount: v.mealCount, totalCalories: v.totalCalories, goalCalories }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * GET /api/safe-use/check
 *
 * Evalúa los patrones del usuario (últimos 14 días) y retorna una señal
 * si detecta algo preocupante, o null si todo está bien.
 *
 * NUNCA diagnostica TCA. Solo ofrece alternativas y recursos.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const stats = await loadDailyStats(userId);
  const result = detectFromDailyStats(stats);

  if (!result) {
    return Response.json({ signal: null });
  }

  return Response.json({
    signal: result.signal,
    title: result.message.title,
    body: result.message.body,
    suggestHabits: result.message.suggestHabits,
  });
}
