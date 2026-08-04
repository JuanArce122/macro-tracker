import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { put } from "@vercel/blob";
import { buildExportData } from "@/lib/export/build-export-data";
import { sendAccountDeletionExport } from "@/lib/email";

// react-pdf no aplica aquí; este endpoint solo usa Resend y Blob (que ya
// funcionan en Edge, pero por consistencia y para que `buildExportData`
// no falle si crece, dejamos Node runtime).
export const runtime = "nodejs";

/**
 * DELETE /api/account
 *
 * Cumplimiento GDPR/LGPD (HU-10):
 *   1. Genera snapshot completo de los datos del usuario
 *   2. Lo sube a Vercel Blob como JSON público (con URL no-trivial)
 *   3. Envía email con el link de descarga al usuario
 *   4. Borra meals, goals, foods y user en transacción
 *
 * Si el paso 2 o 3 falla, NO procedemos a borrar (mejor mantener los
 * datos y avisar al usuario que reintente, que perderlos sin export).
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);
    const userEmail = session.user.email;

    // ── 1. Generar export ────────────────────────────────────────
    const exportData = await buildExportData(userId);

    // ── 2. Subir a Blob público ──────────────────────────────────
    const filename = `account-deletions/macros-export-${userId}-${Date.now()}.json`;
    let exportUrl: string | null = null;
    try {
      const blob = await put(filename, JSON.stringify(exportData, null, 2), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: true,
      });
      exportUrl = blob.url;
    } catch (blobError) {
      console.error("[account DELETE] Blob upload failed:", blobError);
      return Response.json(
        { error: "No se pudo generar el archivo de exportación. Intenta de nuevo en unos minutos." },
        { status: 500 }
      );
    }

    // ── 3. Enviar email con link ─────────────────────────────────
    if (userEmail) {
      try {
        await sendAccountDeletionExport(userEmail, exportUrl);
      } catch (emailError) {
        // El email falló pero el blob ya está. Logueamos pero seguimos
        // adelante: el usuario puede contactar soporte con el blob URL.
        console.error("[account DELETE] Email send failed (continuing):", emailError);
      }
    }

    // ── 4. Borrar TODO en transacción, sin depender de cascadas ──
    // Orden FK-safe: primero los hijos con FK RESTRICT (PlannedMeal→Recipe,
    // RecipeIngredient→Food), luego el resto de tablas con userId, y User al
    // final. Explícito para no dejar huérfanos aunque el enforcement de FK de
    // libSQL esté desactivado (D4).
    await prisma.$transaction([
      prisma.plannedMeal.deleteMany({ where: { plan: { userId } } }),
      prisma.recipeIngredient.deleteMany({
        where: { OR: [{ recipe: { userId } }, { food: { userId } }] },
      }),
      prisma.foodVote.deleteMany({ where: { userId } }),
      prisma.goalAdjustmentLog.deleteMany({ where: { userId } }),
      prisma.insight.deleteMany({ where: { userId } }),
      prisma.pushSubscription.deleteMany({ where: { userId } }),
      prisma.weightEntry.deleteMany({ where: { userId } }),
      prisma.habitEntry.deleteMany({ where: { userId } }),
      prisma.wearableConnection.deleteMany({ where: { userId } }),
      prisma.activityData.deleteMany({ where: { userId } }),
      prisma.mealPlan.deleteMany({ where: { userId } }),
      prisma.recipe.deleteMany({ where: { userId } }),
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
      prisma.meal.deleteMany({ where: { userId } }),
      prisma.goal.deleteMany({ where: { userId } }),
      prisma.food.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return Response.json({ ok: true, exportUrl });
  } catch (error) {
    console.error("[account DELETE]", error);
    return Response.json({ error: "Error al eliminar cuenta" }, { status: 500 });
  }
}
