import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PushSubscribeSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";

/**
 * POST /api/push/subscribe
 *
 * Body: { endpoint, keys: { p256dh, auth } } — formato estándar PushSubscription.toJSON()
 *
 * Idempotente por endpoint UNIQUE: si ya existe, actualizamos las keys
 * (el usuario puede regenerar la suscripción al rotar permisos).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);

  const parsed = await validateBody(req, PushSubscribeSchema);
  if (!parsed.ok) return parsed.response;
  const { endpoint, keys } = parsed.data;

  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      userId, // si cambió el usuario, reasignamos
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return Response.json({ ok: true, subscriptionId: sub.id });
}

/**
 * DELETE /api/push/subscribe?endpoint=...
 *
 * Cuando el usuario desactiva las notificaciones (browser settings,
 * unsubscribe del SW), el cliente debe llamar este endpoint para
 * limpiar la sub del lado server.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const endpoint = req.nextUrl.searchParams.get("endpoint");

  if (!endpoint) {
    return Response.json({ error: "Falta endpoint" }, { status: 400 });
  }

  // deleteMany no falla si no existe; mejor que findUnique+delete
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });

  return Response.json({ ok: true });
}
