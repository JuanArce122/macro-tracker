import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { validateBody } from "@/lib/api/validate";

type Params = { params: Promise<{ id: string }> };

/**
 * Razones por las que el usuario puede descartar un insight.
 * Útil para iterar sobre las reglas en futuras versiones.
 */
const DismissSchema = z.object({
  reason: z
    .enum(["not_useful", "seen", "not_relevant"])
    .optional()
    .default("seen"),
});

/**
 * POST /api/insights/[id]/dismiss
 *
 * Marca el insight como descartado (dismissedAt = NOW + reason).
 * El usuario solo puede descartar sus propios insights.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { id } = await params;
  const insightId = Number(id);
  if (!Number.isInteger(insightId) || insightId <= 0) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  // El body es opcional (default reason = "seen")
  let reason: "not_useful" | "seen" | "not_relevant" = "seen";
  try {
    const parsed = await validateBody(req, DismissSchema);
    if (parsed.ok) reason = parsed.data.reason;
  } catch {
    // body vacío → usa default
  }

  // updateMany con userId asegura que el usuario solo puede descartar
  // sus propios insights (sin riesgo de leak via 404 vs 403)
  const result = await prisma.insight.updateMany({
    where: { id: insightId, userId, dismissedAt: null },
    data: { dismissedAt: new Date(), dismissReason: reason },
  });

  if (result.count === 0) {
    return Response.json(
      { error: "Insight no encontrado o ya descartado" },
      { status: 404 }
    );
  }

  return Response.json({ ok: true, reason });
}
