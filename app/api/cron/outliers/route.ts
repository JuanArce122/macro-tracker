import { NextRequest } from "next/server";
import { runOutlierDetection } from "@/lib/foods/outlier-detection";

// Necesita Node runtime para Prisma + estadística sin restricciones de Edge.
export const runtime = "nodejs";
// Algunos batches pueden tardar; en plan hobby está cap a 60s, en Pro 300s.
export const maxDuration = 60;

/**
 * GET /api/cron/outliers
 *
 * Job programado (lunes 9:00 UTC) que escanea todos los alimentos NO
 * verificados y marca outliers nutricionales por categoría con
 * `needsReview = true`. Los admins ven el listado en /api/admin/foods/review.
 *
 * Auth: Vercel Cron envía `Authorization: Bearer <CRON_SECRET>` —
 * verificamos contra `process.env.CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.error("[cron/outliers] CRON_SECRET no configurado en producción");
    return Response.json({ error: "Cron no configurado" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expected}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const stats = await runOutlierDetection();
    console.log("[cron/outliers]", stats);
    return Response.json({ ok: true, ...stats });
  } catch (error) {
    console.error("[cron/outliers]", error);
    return Response.json({ error: "Error en el cron" }, { status: 500 });
  }
}
