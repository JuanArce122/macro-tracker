import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/insights
 *
 * Retorna los insights ACTIVOS del usuario (no descartados, no más
 * viejos de 14 días). Ordenados por createdAt desc.
 *
 * Query params:
 *   - includeDismissed: si "true", incluye los descartados (para historial admin)
 *   - limit: max insights (default 10)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const includeDismissed = req.nextUrl.searchParams.get("includeDismissed") === "true";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "10"), 50);

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const insights = await prisma.insight.findMany({
    where: {
      userId,
      createdAt: { gte: since },
      ...(includeDismissed ? {} : { dismissedAt: null }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      dataJson: true,
      createdAt: true,
      dismissedAt: true,
      pushedAt: true,
    },
  });

  // Parsear dataJson para conveniencia del cliente
  const items = insights.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
    dismissedAt: i.dismissedAt?.toISOString() ?? null,
    pushedAt: i.pushedAt?.toISOString() ?? null,
    data: safeParseJson(i.dataJson),
  }));

  return Response.json({ items });
}

function safeParseJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
