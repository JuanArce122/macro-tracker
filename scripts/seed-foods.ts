/**
 * Seed script: inserta los 126 alimentos USDA en la tabla Food.
 * Uso: npx tsx scripts/seed-foods.ts
 */
import { FOODS } from "../lib/foods";
import { prisma } from "../lib/prisma";

async function main() {
  console.log(`Seeding ${FOODS.length} foods…`);

  // Upsert manual por (nombre, source=usda, userId=null): idempotente y NO
  // destructivo — preserva IDs, verificación (HU-04), micros (HU-07) y votos de
  // las filas existentes, y no rompe la FK RESTRICT de RecipeIngredient (D5).
  let created = 0;
  let updated = 0;
  for (const food of FOODS) {
    const base = {
      categoria: food.categoria,
      cal: food.cal,
      p: food.p,
      c: food.c,
      f: food.f,
      gramsPerUnit: food.gramsPerUnit ?? null,
      unitLabel: food.unitLabel ?? null,
    };
    const existing = await prisma.food.findFirst({
      where: { nombre: food.nombre, source: "usda", userId: null },
      select: { id: true },
    });
    if (existing) {
      await prisma.food.update({ where: { id: existing.id }, data: base });
      updated++;
    } else {
      await prisma.food.create({
        data: { nombre: food.nombre, source: "usda", userId: null, ...base },
      });
      created++;
    }
  }
  console.log(`  ${created} creados, ${updated} actualizados`);

  const count = await prisma.food.count({ where: { userId: null } });
  console.log(`✅ Done. Total global foods in DB: ${count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
