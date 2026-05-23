import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * GET /api/admin/foods/review
 *
 * Lista los alimentos que requieren revisión humana:
 *   - needsReview = true (marcados por outlier detection o votos negativos)
 *   - O voteScore < -3 sin verificar todavía
 *
 * Solo accesible para admins (allowlist por ADMIN_EMAILS env var).
 *
 * Query params:
 *   - limit: cuántos retornar (default 50, max 100)
 *   - cursor: id desde el cual continuar (paginación)
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const cursor = searchParams.get("cursor");

  const foods = await prisma.food.findMany({
    where: {
      OR: [
        { needsReview: true },
        { voteScore: { lt: -3 }, verifiedAt: null },
      ],
    },
    orderBy: [{ voteScore: "asc" }, { id: "asc" }],
    take: limit + 1, // +1 para saber si hay más página
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    select: {
      id: true,
      nombre: true,
      categoria: true,
      cal: true,
      p: true,
      c: true,
      f: true,
      source: true,
      regionCode: true,
      voteScore: true,
      voteCount: true,
      needsReview: true,
      verifiedAt: true,
    },
  });

  const hasMore = foods.length > limit;
  const items = hasMore ? foods.slice(0, limit) : foods;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return Response.json({ items, nextCursor });
}
