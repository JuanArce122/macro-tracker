import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/wearables/list
 *
 * Lista las conexiones activas del usuario. NO retorna tokens
 * (siguen encriptados en DB y solo se usan server-side).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const connections = await prisma.wearableConnection.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      connectedAt: true,
      lastSyncedAt: true,
      expiresAt: true,
    },
    orderBy: { connectedAt: "asc" },
  });

  return Response.json({
    connections: connections.map((c) => ({
      ...c,
      connectedAt: c.connectedAt.toISOString(),
      lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
      expiresAt: c.expiresAt.toISOString(),
    })),
  });
}
