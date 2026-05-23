import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, requireAdmin } from "@/lib/auth/admin";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/foods/[id]/verify
 *
 * Marca un alimento como verificado por el admin actual y limpia el
 * flag `needsReview`. Solo accesible para admins.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const admin = await getAdminSession();
  // requireAdmin garantiza que admin existe, pero TS no lo infiere
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const foodId = Number(id);

  if (!Number.isInteger(foodId) || foodId <= 0) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  const food = await prisma.food.findUnique({ where: { id: foodId } });
  if (!food) {
    return Response.json({ error: "Alimento no encontrado" }, { status: 404 });
  }

  const updated = await prisma.food.update({
    where: { id: foodId },
    data: {
      verifiedAt: new Date(),
      verifiedBy: admin.email,
      needsReview: false,
    },
    select: {
      id: true,
      nombre: true,
      verifiedAt: true,
      verifiedBy: true,
      needsReview: true,
    },
  });

  return Response.json({ ok: true, food: updated });
}

/**
 * DELETE /api/admin/foods/[id]/verify
 *
 * Retira la verificación (vuelve a estado comunitario). Útil si el admin
 * cometió un error al verificar.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const foodId = Number(id);
  if (!Number.isInteger(foodId) || foodId <= 0) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  const food = await prisma.food.findUnique({ where: { id: foodId } });
  if (!food) {
    return Response.json({ error: "Alimento no encontrado" }, { status: 404 });
  }

  const updated = await prisma.food.update({
    where: { id: foodId },
    data: {
      verifiedAt: null,
      verifiedBy: null,
    },
    select: {
      id: true,
      nombre: true,
      verifiedAt: true,
    },
  });

  return Response.json({ ok: true, food: updated });
}
