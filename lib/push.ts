/**
 * Cliente Web Push para HU-09 (coaching contextual).
 *
 * Variables de entorno requeridas en producción:
 *   - VAPID_PUBLIC_KEY  (también expuesta como NEXT_PUBLIC_VAPID_PUBLIC_KEY al cliente)
 *   - VAPID_PRIVATE_KEY
 *   - VAPID_SUBJECT (ej. "mailto:admin@macrotracker.app")
 *
 * Generar con: npx web-push generate-vapid-keys
 *
 * Si las VAPID keys no están configuradas, sendPushToUser hace early
 * return (no rompe el flujo de coaching — los insights se persisten
 * igual y aparecen in-app).
 */

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function configureIfNeeded(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!pub || !priv || !subject) return false;

  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
    return true;
  } catch (err) {
    console.warn("[push] setVapidDetails falló:", err);
    return false;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  insightId?: number;
};

/**
 * Envía un push a todas las subscriptions del usuario. Si una sub está
 * expirada (HTTP 410), la borramos. Errores de otras subs NO bloquean
 * el resto.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!configureIfNeeded()) {
    // Web Push no configurado — fallback silencioso. Los insights
    // siguen existiendo in-app.
    return;
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 410 Gone = subscription expirada
        // 404 Not Found = endpoint inválido
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => null);
          return;
        }
        // Otros errores los logueamos pero no rompemos el batch
        console.warn(`[push] error enviando a sub ${sub.id}:`, err);
      }
    })
  );
}

/**
 * Retorna la VAPID public key para el cliente (la necesita para
 * suscribirse al PushManager). Si no está configurada, retorna null
 * y el cliente sabe que push está deshabilitado.
 */
export function getPublicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
}
