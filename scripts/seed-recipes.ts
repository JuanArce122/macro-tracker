/**
 * Seed script (HU-06): inserta las recetas iniciales en DB.
 *
 * Uso:
 *   npx tsx scripts/seed-recipes.ts
 *
 * Idempotente: usa upsert por nombre exacto + source="seed" + userId=null.
 * Si la receta ya existe, actualiza ingredientes y macros.
 *
 * Para los ingredientes: cada hint busca un Food por nombre (LIKE).
 * Si no encuentra, omite ese ingrediente (no rompe la creación de la
 * receta). Los Foods deben estar seedeados antes (USDA + CO).
 */

import { RECIPES_SEED, type RecipeSeed } from "../lib/recipes-seed";
import { prisma } from "../lib/prisma";

async function findFoodByHint(hint: string): Promise<number | null> {
  // Búsqueda por substring case-insensitive
  const food = await prisma.food.findFirst({
    where: {
      nombre: { contains: hint.toLowerCase() },
      OR: [{ userId: null }],
    },
    orderBy: [{ source: "asc" }, { id: "asc" }], // preferimos USDA + curados
  });
  return food?.id ?? null;
}

async function upsertRecipe(seed: RecipeSeed): Promise<{ inserted: boolean; ingredientsMatched: number }> {
  // Buscar existente por nombre + seed
  const existing = await prisma.recipe.findFirst({
    where: { name: seed.name, source: "seed", userId: null },
  });

  // Resolver ingredient IDs antes de armar el upsert
  const ingredientPairs: Array<{ foodId: number; gramsPerServing: number; optional: boolean }> = [];
  for (const hint of seed.ingredientHints) {
    const foodId = await findFoodByHint(hint.hint);
    if (foodId !== null) {
      ingredientPairs.push({
        foodId,
        gramsPerServing: hint.gramsPerServing,
        optional: hint.optional ?? false,
      });
    }
  }

  const data = {
    name: seed.name,
    description: seed.description ?? null,
    instructions: seed.instructions,
    prepTimeMin: seed.prepTimeMin,
    cookTimeMin: seed.cookTimeMin,
    servings: seed.servings,
    dietTags: seed.dietTags.join(","),
    allergyTags: seed.allergyTags.join(","),
    costLevel: seed.costLevel,
    cuisineCode: seed.cuisineCode,
    source: "seed",
    userId: null,
    caloriesPerServing: seed.caloriesPerServing,
    proteinPerServing: seed.proteinPerServing,
    carbsPerServing: seed.carbsPerServing,
    fatPerServing: seed.fatPerServing,
  };

  let recipeId: number;
  if (existing) {
    const updated = await prisma.recipe.update({
      where: { id: existing.id },
      data,
    });
    recipeId = updated.id;
    // Re-crear ingredientes (más simple que diff)
    await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
  } else {
    const created = await prisma.recipe.create({ data });
    recipeId = created.id;
  }

  if (ingredientPairs.length > 0) {
    await prisma.recipeIngredient.createMany({
      data: ingredientPairs.map((p) => ({ recipeId, ...p })),
    });
  }

  return { inserted: !existing, ingredientsMatched: ingredientPairs.length };
}

async function main() {
  console.log(`Seeding ${RECIPES_SEED.length} recetas…`);

  let inserted = 0;
  let updated = 0;
  let totalIngredientsMatched = 0;
  let recipesWithoutIngredients = 0;

  for (const r of RECIPES_SEED) {
    const result = await upsertRecipe(r);
    if (result.inserted) inserted++;
    else updated++;
    totalIngredientsMatched += result.ingredientsMatched;
    if (result.ingredientsMatched === 0 && r.ingredientHints.length > 0) {
      recipesWithoutIngredients++;
      console.warn(`⚠️  "${r.name}": 0/${r.ingredientHints.length} ingredientes matcheados`);
    }
  }

  console.log(`\n✅ Done`);
  console.log(`Insertadas: ${inserted}`);
  console.log(`Actualizadas: ${updated}`);
  console.log(`Ingredientes matcheados: ${totalIngredientsMatched}`);
  console.log(`Recetas sin ingredientes matcheados: ${recipesWithoutIngredients}`);

  const total = await prisma.recipe.count({ where: { source: "seed" } });
  console.log(`Total recetas seed en DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
