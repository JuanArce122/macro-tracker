/**
 * Seed script: inserta los 126 alimentos USDA en la tabla Food.
 * Uso: npx tsx scripts/seed-foods.ts
 */
import { FOODS } from "../lib/foods";
import { prisma } from "../lib/prisma";

async function main() {
  console.log(`Seeding ${FOODS.length} foods…`);

  // Limpiar alimentos globales anteriores para evitar duplicados
  await prisma.food.deleteMany({ where: { userId: null, source: "usda" } });

  // Insertar en lotes de 50
  const BATCH = 50;
  for (let i = 0; i < FOODS.length; i += BATCH) {
    const batch = FOODS.slice(i, i + BATCH);
    await prisma.food.createMany({
      data: batch.map((f) => ({
        nombre: f.nombre,
        categoria: f.categoria,
        cal: f.cal,
        p: f.p,
        c: f.c,
        f: f.f,
        gramsPerUnit: f.gramsPerUnit ?? null,
        unitLabel: f.unitLabel ?? null,
        source: "usda",
        userId: null,
      })),
    });
    console.log(`  Inserted ${Math.min(i + BATCH, FOODS.length)} / ${FOODS.length}`);
  }

  const count = await prisma.food.count({ where: { userId: null } });
  console.log(`✅ Done. Total global foods in DB: ${count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
