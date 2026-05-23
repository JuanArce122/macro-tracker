import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSupportedProvider } from "@/lib/wearables/providers";

export const runtime = "nodejs";

type Params = { params: Promise<{ provider: string }> };

/**
 * DELETE /api/wearables/disconnect/[provider]
 *
 * Borra la WearableConnection del usuario. NO borramos ActivityData
 * histórica — esos son datos del usuario que tiene sentido conservar.
 *
 * Idempotente: si ya no estaba conectado, retorna ok igual.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const { provider } = await params;
  if (!isSupportedProvider(provider)) {
    return Response.json({ error: "Provider no soportado" }, { status: 400 });
  }

  // deleteMany no falla si no existe; mejor que findUnique + delete
  const result = await prisma.wearableConnection.deleteMany({
    where: { userId, provider },
  });

  return Response.json({ ok: true, deleted: result.count > 0 });
}
