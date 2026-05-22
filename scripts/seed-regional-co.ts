/**
 * Seed script (HU-12): inserta los alimentos típicos colombianos en
 * la tabla Food con regionCode = "CO".
 *
 * Uso:
 *   npx tsx scripts/seed-regional-co.ts
 *
 * Idempotente: usa upsert por nombre exacto + regionCode. Si el
 * alimento ya existe con el mismo regionCode, actualiza sus macros.
 */
import { FOODS_CO } from "../lib/foods-regional-co";
import { prisma } from "../lib/prisma";

async function main() {
  console.log(`Seeding ${FOODS_CO.length} alimentos regionales (CO + LAC)…`);

  let inserted = 0;
  let updated = 0;

  for (const food of FOODS_CO) {
    // Buscar por nombre + regionCode (no podemos usar @@unique sobre estos
    // dos campos sin migración adicional, así que hacemos manual upsert).
    const existing = await prisma.food.findFirst({
      where: {
        nombre: food.nombre,
        regionCode: food.regionCode,
        userId: null,
      },
    });

    if (existing) {
      await prisma.food.update({
        where: { id: existing.id },
        data: {
          cal: food.cal,
          p: food.p,
          c: food.c,
          f: food.f,
          gramsPerUnit: food.gramsPerUnit ?? null,
          unitLabel: food.unitLabel ?? null,
          categoria: food.categoria,
        },
      });
      updated++;
    } else {
      await prisma.food.create({
        data: {
          nombre: food.nombre,
          categoria: food.categoria,
          cal: food.cal,
          p: food.p,
          c: food.c,
          f: food.f,
          gramsPerUnit: food.gramsPerUnit ?? null,
          unitLabel: food.unitLabel ?? null,
          source: "user", // categoría especial: curados por nosotros, no USDA ni OFF
          regionCode: food.regionCode,
          userId: null, // null = global, disponible para todos los usuarios
        },
      });
      inserted++;
    }
  }

  const totalCo = await prisma.food.count({
    where: { regionCode: "CO", userId: null },
  });

  console.log(`Insertados: ${inserted}`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Total alimentos CO en DB: ${totalCo}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
