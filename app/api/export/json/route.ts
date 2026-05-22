import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { buildExportData } from "@/lib/export/build-export-data";

/**
 * GET /api/export/json
 *
 * Descarga el snapshot completo de datos del usuario en JSON.
 *
 * Query params opcionales:
 *   - from: YYYY-MM-DD (inicio del rango de meals)
 *   - to: YYYY-MM-DD (fin del rango de meals)
 *
 * Si solo se provee uno (no ambos), se ignora el rango.
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

    // Validar formato YYYY-MM-DD si vienen
    const isValidDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const range = isValidDate(from) && isValidDate(to)
      ? { from: from!, to: to! }
      : undefined;

    const data = await buildExportData(userId, range);

    const filename = `macros-export-${new Date().toISOString().split("T")[0]}.json`;

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[export/json GET]", error);
    return Response.json({ error: "Error al exportar JSON" }, { status: 500 });
  }
}
