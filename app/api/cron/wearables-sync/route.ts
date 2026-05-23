import { NextRequest } from "next/server";
import { syncAllConnections } from "@/lib/wearables/sync";

export const runtime = "nodejs";
// Sincronización completa puede tardar — un fetch por provider por user
// por día (Fitbit hace 4 fetches paralelos por día). 5 min cap en Pro.
export const maxDuration = 300;

/**
 * GET /api/cron/wearables-sync
 *
 * Job diario (4:00 UTC) que sincroniza todos los wearables conectados.
 * Refresca tokens si están por expirar, importa últimas 2 días de
 * datos (yesterday + today para cubrir cambios tardíos).
 *
 * Auth: Vercel Cron envía Authorization: Bearer ${CRON_SECRET}.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.error("[cron/wearables-sync] CRON_SECRET no configurado");
    return Response.json({ error: "Cron no configurado" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expected}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const stats = await syncAllConnections();
    console.log("[cron/wearables-sync]", stats);
    return Response.json({ ok: true, ...stats });
  } catch (error) {
    console.error("[cron/wearables-sync]", error);
    return Response.json({ error: "Error en el cron" }, { status: 500 });
  }
}
