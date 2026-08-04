import { prisma } from "@/lib/prisma";
import { getUserToday } from "@/lib/user-date";

/**
 * "Hoy" del usuario (YYYY-MM-DD) resolviendo su `countryCode` desde la DB.
 * Úsalo en route handlers para el default de `date` cuando el cliente no lo
 * envía. Server-only (importa prisma).
 */
export async function getUserTodayById(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { countryCode: true },
  });
  return getUserToday(user);
}
