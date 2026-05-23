import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { UsdaSyncRequestSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";
import { searchUSDA, fetchFDC, extractMicros, type FDCFood } from "@/lib/usda/client";

// Necesita Node runtime para Prisma + fetch sin Edge limitations.
export const runtime = "nodejs";
// Importar 50 foods puede tomar varios segundos (1 fetch por food).
export const maxDuration = 60;

/**
 * Convierte un FDCFood a los datos que necesita Food.create.
 * Si no tiene cal/p/c/f mínimos, retorna null (alimento inutilizable).
 */
function fdcFoodToCreateData(food: FDCFood) {
  const nutrition = extractMicros(food);
  if (!nutrition.cal && !nutrition.p && !nutrition.c && !nutrition.f) {
    return null;
  }

  return {
    nombre: food.description,
    categoria: "otros",
    cal: nutrition.cal ?? 0,
    p: nutrition.p ?? 0,
    c: nutrition.c ?? 0,
    f: nutrition.f ?? 0,
    source: "usda",
    fdcId: food.fdcId,
    verifiedAt: new Date(),
    verifiedBy: "usda-sync",
    // Micros (todos nullable)
    fiber: nutrition.fiber ?? null,
    sugar: nutrition.sugar ?? null,
    sodium: nutrition.sodium ?? null,
    potassium: nutrition.potassium ?? null,
    calcium: nutrition.calcium ?? null,
    iron: nutrition.iron ?? null,
    vitaminC: nutrition.vitaminC ?? null,
    vitaminD: nutrition.vitaminD ?? null,
    vitaminB12: nutrition.vitaminB12 ?? null,
    vitaminA: nutrition.vitaminA ?? null,
    folate: nutrition.folate ?? null,
    magnesium: nutrition.magnesium ?? null,
    zinc: nutrition.zinc ?? null,
    omega3: nutrition.omega3 ?? null,
    omega6: nutrition.omega6 ?? null,
  };
}

/**
 * POST /api/admin/foods/sync-usda
 *
 * Body:
 *  - { query: "chicken", limit?: 10 } → busca y importa los primeros N
 *  - { fdcIds: [1234, 5678] } → importa lista específica
 *
 * Solo accesible para admins (allowlist por ADMIN_EMAILS).
 * Idempotente vía Food.fdcId UNIQUE: si ya existe, actualiza micros.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  if (!process.env.USDA_FDC_API_KEY) {
    return Response.json(
      { error: "USDA_FDC_API_KEY no configurada en producción" },
      { status: 500 }
    );
  }

  const parsed = await validateBody(req, UsdaSyncRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { query, fdcIds, limit } = parsed.data;

  // ── 1. Determinar la lista de foods a importar ────────────────────
  let foods: FDCFood[] = [];

  if (fdcIds && fdcIds.length > 0) {
    // Modo: lista explícita
    const fetched = await Promise.all(fdcIds.map((id) => fetchFDC(id).catch(() => null)));
    foods = fetched.filter((f): f is FDCFood => f !== null);
  } else if (query) {
    foods = await searchUSDA(query, limit);
  }

  if (foods.length === 0) {
    return Response.json({
      ok: true,
      inserted: 0,
      updated: 0,
      skipped: 0,
      message: "No se encontraron alimentos para esos parámetros.",
    });
  }

  // ── 2. Upsert por fdcId UNIQUE ────────────────────────────────────
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const food of foods) {
    const data = fdcFoodToCreateData(food);
    if (!data) {
      skipped++;
      continue;
    }

    const existing = await prisma.food.findUnique({ where: { fdcId: food.fdcId } });
    if (existing) {
      await prisma.food.update({
        where: { fdcId: food.fdcId },
        data: {
          // No tocamos nombre/categoria/source (puede haber sido editado);
          // sí actualizamos macros + micros con datos frescos.
          cal: data.cal,
          p: data.p,
          c: data.c,
          f: data.f,
          fiber: data.fiber,
          sugar: data.sugar,
          sodium: data.sodium,
          potassium: data.potassium,
          calcium: data.calcium,
          iron: data.iron,
          vitaminC: data.vitaminC,
          vitaminD: data.vitaminD,
          vitaminB12: data.vitaminB12,
          vitaminA: data.vitaminA,
          folate: data.folate,
          magnesium: data.magnesium,
          zinc: data.zinc,
          omega3: data.omega3,
          omega6: data.omega6,
        },
      });
      updated++;
    } else {
      await prisma.food.create({ data });
      inserted++;
    }
  }

  return Response.json({
    ok: true,
    inserted,
    updated,
    skipped,
    total: foods.length,
  });
}
