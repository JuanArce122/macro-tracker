import { z } from "zod";

/**
 * Schema para POST /api/push/subscribe (HU-09).
 *
 * Forma estándar del Web Push API: el cliente hace
 *   const sub = await registration.pushManager.subscribe({ ... });
 *   sub.toJSON() devuelve { endpoint, keys: { p256dh, auth } }
 */
// Hosts de los servicios de push conocidos. Restringir el endpoint a estos
// evita SSRF ciego: el server hace POSTs a esa URL en cada insight (S10).
const PUSH_HOSTS = [
  "push.services.mozilla.com",
  "fcm.googleapis.com",
  "android.googleapis.com",
  "notify.windows.com",
  "push.apple.com",
];

export const PushSubscribeSchema = z.object({
  endpoint: z
    .url("Endpoint debe ser una URL válida")
    .refine((u) => {
      try {
        const host = new URL(u).hostname;
        return PUSH_HOSTS.some((h) => host === h || host.endsWith("." + h));
      } catch {
        return false;
      }
    }, "Endpoint de push no reconocido"),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;
