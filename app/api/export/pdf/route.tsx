import { createElement } from "react";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { buildExportData } from "@/lib/export/build-export-data";
import { ReportTemplate } from "@/lib/pdf/report-template";

// @react-pdf/renderer necesita Node runtime (depende de APIs que no
// existen en el Edge runtime de Vercel).
export const runtime = "nodejs";
// El PDF puede tardar más que el límite por defecto (10s en plan hobby);
// en plan Pro lo subimos a 30s.
export const maxDuration = 30;

/**
 * GET /api/export/pdf
 *
 * Descarga un reporte PDF con portada + resumen + tabla de comidas.
 *
 * Query params opcionales:
 *   - from: YYYY-MM-DD
 *   - to: YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const isValidDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const range = isValidDate(from) && isValidDate(to)
      ? { from: from!, to: to! }
      : undefined;

    const data = await buildExportData(userId, range);

    // createElement (en lugar de JSX) evita el falso positivo de
    // react-hooks/error-boundaries: renderToBuffer no usa el reconciler
    // de React, así que no hay riesgo real de errores no atrapados.
    const element = createElement(ReportTemplate, { data }) as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    const filename = `macros-report-${new Date().toISOString().split("T")[0]}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[export/pdf GET]", error);
    return Response.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
