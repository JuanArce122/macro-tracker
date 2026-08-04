import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { FoodVoteSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";

type Params = { params: Promise<{ id: string }> };

/**
 * Umbral por debajo del cual un alimento NO verificado se marca para revisión.
 * Si voteScore <= NEEDS_REVIEW_THRESHOLD y el alimento no está verificado,
 * marcamos needsReview = true para que aparezca en el dashboard de admin.
 */
const NEEDS_REVIEW_THRESHOLD = -3;

/**
 * Actualiza voteScore/voteCount denormalizados y, si corresponde,
 * marca el alimento como needsReview.
 *
 * Se llama después de cada upsert/delete de FoodVote.
 */
async function recomputeFoodVotes(foodId: number) {
  const aggregate = await prisma.foodVote.aggregate({
    where: { foodId },
    _sum: { vote: true },
    _count: true,
  });
  const voteScore = aggregate._sum.vote ?? 0;
  const voteCount = aggregate._count;

  // Solo elevar needsReview cuando el alimento no está verificado y el
  // score es bajo. Nunca lo bajamos automáticamente (eso lo hace el admin
  // al verificar).
  const food = await prisma.food.findUnique({
    where: { id: foodId },
    select: { verifiedAt: true, needsReview: true },
  });
  if (!food) return null;

  const shouldFlag =
    !food.verifiedAt && voteScore <= NEEDS_REVIEW_THRESHOLD;

  return prisma.food.update({
    where: { id: foodId },
    data: {
      voteScore,
      voteCount,
      ...(shouldFlag && !food.needsReview ? { needsReview: true } : {}),
    },
    select: {
      voteScore: true,
      voteCount: true,
      needsReview: true,
    },
  });
}

/**
 * POST /api/foods/[id]/vote
 *
 * Crea o actualiza el voto del usuario para ese alimento.
 * Body: { vote: 1 | -1 }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const { id } = await params;
  const foodId = Number(id);

  if (!Number.isInteger(foodId) || foodId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const parsed = await validateBody(req, FoodVoteSchema);
  if (!parsed.ok) return parsed.response;
  const { vote } = parsed.data;

  // Verificar que el alimento exista y sea votable. Los votos son para la BD
  // comunitaria (alimentos globales); un alimento privado no se vota — así se
  // evita marcar needsReview el alimento privado de otro usuario (S11).
  const food = await prisma.food.findUnique({ where: { id: foodId } });
  if (!food) {
    return NextResponse.json({ error: "Alimento no encontrado" }, { status: 404 });
  }
  if (food.userId !== null) {
    return NextResponse.json({ error: "No se puede votar un alimento privado" }, { status: 403 });
  }

  // Upsert: un usuario solo tiene 1 voto activo por alimento
  await prisma.foodVote.upsert({
    where: { userId_foodId: { userId, foodId } },
    create: { userId, foodId, vote },
    update: { vote },
  });

  const aggregate = await recomputeFoodVotes(foodId);

  return NextResponse.json({
    ok: true,
    userVote: vote,
    voteScore: aggregate?.voteScore ?? 0,
    voteCount: aggregate?.voteCount ?? 0,
    needsReview: aggregate?.needsReview ?? false,
  });
}

/**
 * DELETE /api/foods/[id]/vote
 *
 * Retracta el voto del usuario para ese alimento.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const { id } = await params;
  const foodId = Number(id);

  if (!Number.isInteger(foodId) || foodId <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // deleteMany no falla si no existe (preferible a findUnique + delete)
  await prisma.foodVote.deleteMany({
    where: { userId, foodId },
  });

  const aggregate = await recomputeFoodVotes(foodId);

  return NextResponse.json({
    ok: true,
    userVote: 0,
    voteScore: aggregate?.voteScore ?? 0,
    voteCount: aggregate?.voteCount ?? 0,
  });
}
