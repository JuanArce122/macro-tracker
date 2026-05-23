import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { calcTrendSlope, decideAdjustment, type FitnessGoal } from "@/lib/weight-trend";

/**
 * POST /api/goals/apply-suggestion
 *
 * Aplica la sugerencia actual al goal del usuario y registra el cambio
 * en GoalAdjustmentLog. Re-computa la sugerencia en el momento (no
 * confiamos en el cliente para enviar el newGoal, porque el peso o
 * adherencia pueden haber cambiado).
 *
 * Body opcional: { mode: "suggested" | "auto" } — default "suggested"
 *
 * El cliente pasa "auto" cuando el cron de Auto-mode aplica el ajuste
 * sin intervención manual (futuro).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  let mode: "suggested" | "auto" = "suggested";
  try {
    const body = (await req.json().catch(() => ({}))) as { mode?: string };
    if (body.mode === "auto") mode = "auto";
  } catch {
    // Body opcional — ignoramos errores
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fitnessGoal: true },
  });
  const goal = await prisma.goal.findFirst({
    where: { userId },
    orderBy: { id: "desc" },
  });

  if (!user?.fitnessGoal || !goal) {
    return Response.json({ error: "Perfil o meta incompletos" }, { status: 400 });
  }

  const recent = await prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
    select: { date: true, weightKg: true },
  });
  const entries = [...recent].reverse();

  const trendKgPerWeek = calcTrendSlope(entries);
  const adjustment = decideAdjustment(
    { calories: goal.calories, protein: goal.protein, carbs: goal.carbs, fat: goal.fat },
    trendKgPerWeek,
    user.fitnessGoal as FitnessGoal
  );

  if (!adjustment) {
    return Response.json({ error: "No hay ajuste a aplicar" }, { status: 400 });
  }

  // Transacción: actualizar Goal + crear log
  const [updatedGoal, log] = await prisma.$transaction([
    prisma.goal.update({
      where: { id: goal.id },
      data: adjustment.newGoal,
    }),
    prisma.goalAdjustmentLog.create({
      data: {
        userId,
        goalId: goal.id,
        oldCalories: goal.calories,
        oldProtein: goal.protein,
        oldCarbs: goal.carbs,
        oldFat: goal.fat,
        newCalories: adjustment.newGoal.calories,
        newProtein: adjustment.newGoal.protein,
        newCarbs: adjustment.newGoal.carbs,
        newFat: adjustment.newGoal.fat,
        reason: adjustment.reason,
        mode,
      },
    }),
  ]);

  return Response.json({
    ok: true,
    goal: updatedGoal,
    log: {
      id: log.id,
      reason: log.reason,
      mode: log.mode,
      createdAt: log.createdAt.toISOString(),
    },
  });
}
