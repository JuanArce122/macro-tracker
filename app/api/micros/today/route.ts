import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getRDA, prioritizeMicros, MICRO_KEYS, MICRO_LABELS, type UserProfile, type MicroKey } from "@/lib/micros";
import { sumMicrosForDay, computeMicroProgress, consecutiveDeficitDays } from "@/lib/micros-aggregate";
import { getUserToday } from "@/lib/user-date";

/**
 * GET /api/micros/today?date=YYYY-MM-DD
 *
 * Retorna:
 *   - priorityMicros: los 5 priorizados según perfil
 *   - progress: todos los 15 con consumed/target/pctOfTarget/status
 *   - deficits: micros con racha de 3+ días por debajo del 60% del RDA
 *
 * Si date no se envía, usa hoy.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sex: true, age: true, fitnessGoal: true, countryCode: true },
  });

  const date = req.nextUrl.searchParams.get("date") ?? getUserToday(user);

  const profile: UserProfile = {
    sex: (user?.sex as "male" | "female" | null) ?? null,
    age: user?.age ?? null,
    fitnessGoal: (user?.fitnessGoal as UserProfile["fitnessGoal"]) ?? null,
  };

  const priorityMicros = prioritizeMicros(profile);
  const rdas = MICRO_KEYS.reduce((acc, k) => {
    acc[k] = getRDA(k, profile);
    return acc;
  }, {} as Record<MicroKey, ReturnType<typeof getRDA>>);

  const totals = await sumMicrosForDay(userId, date);
  const progress = computeMicroProgress(totals, rdas);

  // Detect deficits sostenidos solo en los priority (3+ días con <60%)
  const deficitChecks = await Promise.all(
    priorityMicros.map(async (k) => {
      const days = await consecutiveDeficitDays(userId, k, rdas[k].min, 7);
      return { micro: k, consecutiveDays: days };
    })
  );
  const deficits = deficitChecks
    .filter((d) => d.consecutiveDays >= 3)
    .map((d) => ({
      nutrient: d.micro,
      label: MICRO_LABELS[d.micro],
      consecutiveDays: d.consecutiveDays,
      target: rdas[d.micro].min,
      unit: rdas[d.micro].unit,
    }));

  // Etiquetas legibles + RDAs serializadas para el cliente
  const progressWithLabels = progress.map((p) => ({
    ...p,
    label: MICRO_LABELS[p.key],
  }));

  return Response.json({
    date,
    priorityMicros,
    progress: progressWithLabels,
    deficits,
  });
}
