/**
 * Cálculo de adherencia al tracking (HU-05).
 *
 * Separado de lib/weight-trend.ts porque toca DB (Prisma) — mantenemos
 * weight-trend libre de I/O para tests rápidos.
 */

import { prisma } from "@/lib/prisma";

const ADHERENCE_WINDOW_DAYS = 14;

/**
 * Retorna el porcentaje (0..1) de días con al menos 1 comida registrada
 * en los últimos 14 días.
 */
export async function calcAdherence(userId: number): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - ADHERENCE_WINDOW_DAYS);
  const sinceStr = since.toISOString().split("T")[0];

  const days = await prisma.meal.findMany({
    where: {
      userId,
      OR: [
        { dateLocal: { gte: sinceStr } },
        { dateLocal: null, date: { gte: since } },
      ],
    },
    select: { dateLocal: true, date: true },
  });

  const distinctDays = new Set(
    days.map((d) => d.dateLocal ?? d.date.toISOString().split("T")[0])
  );
  return distinctDays.size / ADHERENCE_WINDOW_DAYS;
}
