import { NextRequest } from "next/server";
import { generateInsightsForAllActiveUsers } from "@/lib/insights/generator";

// Necesita Node runtime para Prisma + web-push.
export const runtime = "nodejs";
// Permitimos hasta 5 min para procesar batches grandes en plan Pro.
// En hobby está cap a 60s, lo que cubre ~50 usuarios activos.
export const maxDuration = 300;

/**
 * GET /api/cron/insights
 *
 * Job programado (domingos 14:00 UTC ≈ 9:00 Bogotá) que evalúa insights
 * para todos los usuarios activos (≥1 comida en últimos 14 días) y
 * envía notificaciones push.
 *
 * Auth: Vercel Cron envía Authorization: Bearer ${CRON_SECRET}.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.error("[cron/insights] CRON_SECRET no configurado");
    return Response.json({ error: "Cron no configurado" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expected}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const stats = await generateInsightsForAllActiveUsers();
    console.log("[cron/insights]", stats);
    return Response.json({ ok: true, ...stats });
  } catch (error) {
    console.error("[cron/insights]", error);
    return Response.json({ error: "Error en el cron" }, { status: 500 });
  }
}
