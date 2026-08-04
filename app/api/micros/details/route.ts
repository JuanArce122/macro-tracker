import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getRDA, MICRO_KEYS, MICRO_LABELS, type UserProfile, type MicroKey } from "@/lib/micros";
import { sumMicrosForDay, computeMicroProgress } from "@/lib/micros-aggregate";
import { getUserToday } from "@/lib/user-date";

/**
 * GET /api/micros/details?date=YYYY-MM-DD
 *
 * Similar a /today pero retorna los 15 micros sin priorizar — útil para
 * la vista expandida /micros que muestra todos.
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

  const rdas = MICRO_KEYS.reduce((acc, k) => {
    acc[k] = getRDA(k, profile);
    return acc;
  }, {} as Record<MicroKey, ReturnType<typeof getRDA>>);

  const totals = await sumMicrosForDay(userId, date);
  const progress = computeMicroProgress(totals, rdas).map((p) => ({
    ...p,
    label: MICRO_LABELS[p.key],
    rdaMin: rdas[p.key].min,
    rdaMax: rdas[p.key].max ?? null,
  }));

  return Response.json({
    date,
    micros: progress,
  });
}
