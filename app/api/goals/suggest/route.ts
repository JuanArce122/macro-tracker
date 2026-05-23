import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { calcTrendSlope, decideAdjustment, type FitnessGoal } from "@/lib/weight-trend";
import { calcAdherence } from "@/lib/weight-adherence";

/**
 * Mínimo de pesos consecutivos para que la sugerencia sea estadísticamente
 * útil. El algoritmo retorna trend=0 con menos puntos, pero queremos un
 * mensaje claro al usuario antes de llegar a ese caso.
 */
const MIN_WEIGHT_ENTRIES = 14;

/**
 * Mínimo de adherencia (% de días con tracking en últimos 14 días) para
 * proponer ajuste. Si el usuario no está registrando comidas, no podemos
 * confiar en que el peso refleje calorías reales.
 */
const MIN_ADHERENCE = 0.5;

/**
 * Días mínimos entre dos sugerencias aplicadas. Evita que el usuario
 * reciba ajustes oscilantes cada vez que entra.
 */
const COOLDOWN_DAYS_SINCE_LAST_ADJUST = 14;

const REASON_MESSAGES: Record<string, string> = {
  trend_loss_too_slow:
    "Estás perdiendo peso más lento de lo que esperabas. Sugerimos reducir un poco las calorías para acelerar el progreso.",
  trend_loss_too_fast:
    "Estás bajando demasiado rápido. Subir las calorías ayudará a preservar masa muscular y a sostener el ritmo.",
  trend_gain_too_slow:
    "Estás ganando peso más lento de lo objetivo. Subir las calorías ayudará a llegar a tu meta.",
  trend_gain_too_fast:
    "Estás ganando peso más rápido de lo deseado. Bajar un poco las calorías evitará exceso de grasa.",
  trend_maintenance_drift_up:
    "Tu peso está subiendo aunque quieres mantener. Sugerimos bajar un poco las calorías.",
  trend_maintenance_drift_down:
    "Tu peso está bajando aunque quieres mantener. Sugerimos subir un poco las calorías.",
};

/**
 * POST /api/goals/suggest
 *
 * Calcula (sin aplicar) una sugerencia de ajuste de meta calórica basada
 * en la tendencia de peso del usuario. Útil para mostrar al usuario antes
 * de aplicar.
 *
 * Reglas:
 *   1. Usuario debe tener fitnessGoal definido (lose / maintain / gain)
 *   2. Mínimo 14 pesos registrados
 *   3. Adherencia mínima 50% en últimos 14 días
 *   4. Mínimo 14 días desde el último ajuste automático/sugerido
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  // Perfil + goal actual
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fitnessGoal: true },
  });
  const goal = await prisma.goal.findFirst({
    where: { userId },
    orderBy: { id: "desc" },
  });

  if (!user?.fitnessGoal || !goal) {
    return Response.json({
      shouldSuggest: false,
      reason: "no_profile",
      message: "Completa tu perfil (objetivo fitness) y configura tus metas primero.",
    });
  }

  // Tomamos hasta 30 pesos recientes (suficientes para tendencia)
  const recent = await prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
    select: { date: true, weightKg: true },
  });
  const entries = [...recent].reverse();

  if (entries.length < MIN_WEIGHT_ENTRIES) {
    return Response.json({
      shouldSuggest: false,
      reason: "not_enough_data",
      message: `Necesitamos al menos ${MIN_WEIGHT_ENTRIES} pesos registrados (tienes ${entries.length}). Sigue registrando y te sugerimos ajustes en unos días.`,
      pointsAvailable: entries.length,
    });
  }

  // Adherencia
  const adherence = await calcAdherence(userId);
  if (adherence < MIN_ADHERENCE) {
    return Response.json({
      shouldSuggest: false,
      reason: "low_adherence",
      message: `Tu adherencia al tracking es ${(adherence * 100).toFixed(0)}%. Registra tus comidas con más constancia para que las sugerencias sean confiables.`,
      adherence,
    });
  }

  // Cooldown
  const cooldownStart = new Date();
  cooldownStart.setDate(cooldownStart.getDate() - COOLDOWN_DAYS_SINCE_LAST_ADJUST);
  const lastAdjust = await prisma.goalAdjustmentLog.findFirst({
    where: { userId, createdAt: { gte: cooldownStart } },
    orderBy: { createdAt: "desc" },
  });
  if (lastAdjust) {
    const daysAgo = Math.floor(
      (Date.now() - lastAdjust.createdAt.getTime()) / 86400000
    );
    return Response.json({
      shouldSuggest: false,
      reason: "cooldown",
      message: `Ya ajustamos tu meta hace ${daysAgo} día${daysAgo !== 1 ? "s" : ""}. Espera al menos ${COOLDOWN_DAYS_SINCE_LAST_ADJUST} para que el nuevo ajuste tenga señal estadística.`,
      lastAdjustAt: lastAdjust.createdAt.toISOString(),
    });
  }

  // Calcular
  const trendKgPerWeek = calcTrendSlope(entries);
  const adjustment = decideAdjustment(
    { calories: goal.calories, protein: goal.protein, carbs: goal.carbs, fat: goal.fat },
    trendKgPerWeek,
    user.fitnessGoal as FitnessGoal
  );

  if (!adjustment) {
    return Response.json({
      shouldSuggest: false,
      reason: "on_target",
      message: "Tu tendencia está alineada con tu objetivo. ¡Sigue así!",
      trendKgPerWeek,
      adherence,
    });
  }

  return Response.json({
    shouldSuggest: true,
    currentGoal: {
      calories: goal.calories,
      protein: goal.protein,
      carbs: goal.carbs,
      fat: goal.fat,
    },
    suggestedGoal: adjustment.newGoal,
    reason: adjustment.reason,
    message: REASON_MESSAGES[adjustment.reason] ?? "Considera ajustar tus metas.",
    trendKgPerWeek,
    adherence,
  });
}
