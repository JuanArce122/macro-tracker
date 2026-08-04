/**
 * HU-06: marca un PlannedMeal como consumido y crea un Meal real.
 *
 *   POST /api/meal-plans/[id]/log-meal
 *   body: { plannedMealId: number, weightG?: number }
 *
 * - Verifica que el plan pertenezca al user
 * - Verifica que el plannedMeal pertenezca al plan
 * - Marca consumed = true + consumedAt
 * - Crea Meal con macros escaladas por servings (o weightG override)
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { LogPlannedMealSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const { id: planIdStr } = await ctx.params;
    const planId = Number(planIdStr);
    if (!Number.isFinite(planId) || planId <= 0) {
      return Response.json({ error: "ID de plan inválido" }, { status: 400 });
    }

    const parsed = await validateBody(req, LogPlannedMealSchema);
    if (!parsed.ok) return parsed.response;
    const { plannedMealId, weightG } = parsed.data;

    // El plan debe pertenecer al user
    const plan = await prisma.mealPlan.findFirst({
      where: { id: planId, userId },
    });
    if (!plan) {
      return Response.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    const planned = await prisma.plannedMeal.findFirst({
      where: { id: plannedMealId, planId },
      include: { recipe: true },
    });
    if (!planned) {
      return Response.json({ error: "Comida planificada no encontrada" }, { status: 404 });
    }
    if (planned.consumed) {
      return Response.json({ error: "Ya marcada como consumida" }, { status: 409 });
    }

    const recipe = planned.recipe;

    // Macros por serving × servings planificadas. Si el user override con
    // weightG, escalamos proporcionalmente al peso típico de receta (no
    // tenemos peso por porción guardado; aproximamos usando servings=1).
    const servings = planned.servings;
    const calPerServing = recipe.caloriesPerServing ?? 0;
    const proPerServing = recipe.proteinPerServing ?? 0;
    const carbPerServing = recipe.carbsPerServing ?? 0;
    const fatPerServing = recipe.fatPerServing ?? 0;

    // weightG es opcional; si no viene, usamos 350g como gramaje típico
    // por porción × servings (aproximación razonable para platos compuestos).
    const TYPICAL_G_PER_SERVING = 350;
    const totalWeight = weightG ?? Math.round(servings * TYPICAL_G_PER_SERVING);

    const calories = Math.round(calPerServing * servings);
    const protein = Math.round(proPerServing * servings * 10) / 10;
    const carbs = Math.round(carbPerServing * servings * 10) / 10;
    const fat = Math.round(fatPerServing * servings * 10) / 10;

    // Mapeo PlannedMeal.mealType → Meal.category. snack1/snack2 (plan de 5
    // comidas) colapsan a "snack". La unificación es↔en de categorías se
    // resuelve en la Fase 2.
    const category =
      planned.mealType === "snack1" || planned.mealType === "snack2"
        ? "snack"
        : planned.mealType;

    const result = await prisma.$transaction(async (tx) => {
      const meal = await tx.meal.create({
        data: {
          userId,
          date: new Date(),
          dateLocal: planned.date,
          category,
          name: recipe.name,
          weightG: totalWeight,
          calories,
          protein,
          carbs,
          fat,
          confidence: 1,
          items: null,
        },
      });

      await tx.plannedMeal.update({
        where: { id: planned.id },
        data: { consumed: true, consumedAt: new Date() },
      });

      return meal;
    });

    return Response.json({ meal: result, plannedMealId: planned.id }, { status: 201 });
  } catch (error) {
    console.error("[meal-plans log-meal POST]", error);
    return Response.json({ error: "Error al registrar comida" }, { status: 500 });
  }
}
