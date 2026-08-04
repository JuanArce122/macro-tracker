import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { HabitEntryUpsertSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";
import { getUserTodayById } from "@/lib/user-date-server";

const SELECT_FIELDS = {
  id: true,
  date: true,
  proteinPortions: true,
  vegPortions: true,
  carbPortions: true,
  fatPortions: true,
  fruitPortions: true,
  updatedAt: true,
} as const;

/**
 * GET /api/habits?date=YYYY-MM-DD
 *
 * Si `date` no se envía, retorna el de hoy. Si no existe entry para
 * ese día, retorna uno con 0 en todas las porciones (no error).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const date = req.nextUrl.searchParams.get("date") ?? (await getUserTodayById(userId));

  const entry = await prisma.habitEntry.findUnique({
    where: { userId_date: { userId, date } },
    select: SELECT_FIELDS,
  });

  if (!entry) {
    return Response.json({
      date,
      proteinPortions: 0,
      vegPortions: 0,
      carbPortions: 0,
      fatPortions: 0,
      fruitPortions: 0,
    });
  }

  return Response.json(entry);
}

/**
 * POST /api/habits
 *
 * Upsert por (userId, date). El body envía cantidades absolutas
 * (no deltas) para evitar drift.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const parsed = await validateBody(req, HabitEntryUpsertSchema);
  if (!parsed.ok) return parsed.response;

  const { date: dateInput, ...portions } = parsed.data;
  const date = dateInput ?? (await getUserTodayById(userId));

  // Si no se envía ninguna porción, no hay nada que actualizar
  if (Object.keys(portions).length === 0) {
    return Response.json({ error: "Envía al menos una porción" }, { status: 400 });
  }

  const entry = await prisma.habitEntry.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      proteinPortions: portions.proteinPortions ?? 0,
      vegPortions: portions.vegPortions ?? 0,
      carbPortions: portions.carbPortions ?? 0,
      fatPortions: portions.fatPortions ?? 0,
      fruitPortions: portions.fruitPortions ?? 0,
    },
    update: portions,
    select: SELECT_FIELDS,
  });

  return Response.json({ ok: true, entry });
}
