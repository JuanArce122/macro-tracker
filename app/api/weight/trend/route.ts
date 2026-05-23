import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { calcTrendSlope, smoothExponential } from "@/lib/weight-trend";
import { calcAdherence } from "@/lib/weight-adherence";

/**
 * GET /api/weight/trend
 *
 * Devuelve la tendencia de peso del usuario en kg/semana, la adherencia
 * al tracking (0..1) y los puntos suavizados para gráficos.
 *
 * Query params:
 *   - window: cuántos días considerar (default 30, max 90)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const windowParam = Number(req.nextUrl.searchParams.get("window") ?? "30");
  const windowDays = Math.min(Math.max(7, windowParam), 90);

  const recent = await prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: windowDays,
    select: { date: true, weightKg: true },
  });
  const entries = [...recent].reverse();

  const trendKgPerWeek = calcTrendSlope(entries);
  const smoothed = smoothExponential(entries);
  const adherence = await calcAdherence(userId);

  return Response.json({
    entries,
    smoothed,
    trendKgPerWeek,
    adherence,
    windowDays,
    points: entries.length,
  });
}
