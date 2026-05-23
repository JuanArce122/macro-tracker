import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { WeightCreateSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";

/**
 * Devuelve la fecha local del día en formato YYYY-MM-DD.
 * (Server-side; el usuario puede pasar `date` si quiere registrar otro día.)
 */
function todayLocal(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * POST /api/weight
 *
 * Body: { weightKg: number, date?: "YYYY-MM-DD" }
 * Si `date` no se envía, usamos hoy.
 *
 * Es idempotente por día (UNIQUE userId+date): si ya existe un peso para
 * ese día, lo actualizamos. Esto permite al usuario corregir el valor
 * sin tener que borrar primero.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const parsed = await validateBody(req, WeightCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { weightKg, date } = parsed.data;
  const dateStr = date ?? todayLocal();

  const entry = await prisma.weightEntry.upsert({
    where: { userId_date: { userId, date: dateStr } },
    create: { userId, date: dateStr, weightKg, source: "manual" },
    update: { weightKg, source: "manual" },
    select: { id: true, date: true, weightKg: true, source: true },
  });

  return Response.json({ ok: true, entry });
}

/**
 * GET /api/weight?limit=30
 *
 * Retorna los últimos `limit` (default 30, max 365) pesos del usuario,
 * ordenados de más viejo a más reciente (útil para gráficos cronológicos).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "30");
  const limit = Math.min(Math.max(1, limitParam), 365);

  // Tomamos los más recientes pero los devolvemos ordenados ascendentes
  const recent = await prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    select: { date: true, weightKg: true, source: true },
  });

  const entries = [...recent].reverse();

  return Response.json({ entries });
}
