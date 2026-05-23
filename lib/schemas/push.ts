import { z } from "zod";

/**
 * Schema para POST /api/push/subscribe (HU-09).
 *
 * Forma estándar del Web Push API: el cliente hace
 *   const sub = await registration.pushManager.subscribe({ ... });
 *   sub.toJSON() devuelve { endpoint, keys: { p256dh, auth } }
 */
export const PushSubscribeSchema = z.object({
  endpoint: z.url("Endpoint debe ser una URL válida"),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;
