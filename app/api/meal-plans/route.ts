/**
 * HU-06: Meal planning — endpoints principales.
 *
 *   POST /api/meal-plans    → genera y persiste un plan semanal
 *   GET  /api/meal-plans    → plan activo del usuario (con plannedMeals + recipe)
 *
 * El POST desactiva planes anteriores del usuario (un único plan activo).
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { MealPlanCreateSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/api/validate";
import {
  generatePlan,
  filterRecipesByPreferences,
  type PlannerRecipe,
  type Preferences,
} from "@/lib/meal-planner";

const DEFAULT_GOAL = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

/** Lunes ISO de la fecha local del cliente (UTC, YYYY-MM-DD). */
function mondayOfWeek(dateISO?: string): string {
  const base = dateISO ? new Date(`${dateISO}T00:00:00.000Z`) : new Date();
  const day = base.getUTCDay(); // 0 dom .. 6 sab
  const offset = day === 0 ? -6 : 1 - day; // lunes
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() + offset);
  return monday.toISOString().split("T")[0];
}

function addDaysISO(start: string, days: number): string {
  const d = new Date(`${start}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function parseCsv(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const parsed = await validateBody(req, MealPlanCreateSchema);
    if (!parsed.ok) return parsed.response;
    const { preferences, startDate } = parsed.data;

    // Goal del usuario para meta calórica
    const goal = await prisma.goal.findFirst({
      where: { userId },
      orderBy: { id: "desc" },
    });
    const goalDist = {
      calories: goal?.calories ?? DEFAULT_GOAL.calories,
      protein: goal?.protein ?? DEFAULT_GOAL.protein,
      carbs: goal?.carbs ?? DEFAULT_GOAL.carbs,
      fat: goal?.fat ?? DEFAULT_GOAL.fat,
    };

    // Recetas candidatas: públicas (userId=null) o del propio user
    const recipesRaw = await prisma.recipe.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
    });

    const candidates: PlannerRecipe[] = recipesRaw.map((r) => ({
      id: r.id,
      name: r.name,
      cuisineCode: r.cuisineCode,
      dietTags: parseCsv(r.dietTags),
      allergyTags: parseCsv(r.allergyTags),
      costLevel: r.costLevel,
      prepTimeMin: r.prepTimeMin,
      cookTimeMin: r.cookTimeMin,
      caloriesPerServing: r.caloriesPerServing,
      proteinPerServing: r.proteinPerServing,
      carbsPerServing: r.carbsPerServing,
      fatPerServing: r.fatPerServing,
    }));

    const prefs: Preferences = {
      diet: preferences.diet,
      allergies: preferences.allergies,
      mealsPerDay: preferences.mealsPerDay,
      maxPrepMinutes: preferences.maxPrepMinutes,
      costLevel: preferences.costLevel,
    };

    const filtered = filterRecipesByPreferences(candidates, prefs);

    const monday = mondayOfWeek(startDate);
    const sunday = addDaysISO(monday, 6);

    let entries;
    try {
      entries = generatePlan({
        candidates: filtered,
        goal: goalDist,
        preferences: prefs,
        startDate: monday,
      });
    } catch (err) {
      // Mensaje del planner es human-friendly (ej. "necesitamos 14, hay 5")
      const message = err instanceof Error ? err.message : "Error generando plan";
      return Response.json({ error: message }, { status: 422 });
    }

    // Transacción: desactivar planes previos + crear el nuevo
    const created = await prisma.$transaction(async (tx) => {
      await tx.mealPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      const plan = await tx.mealPlan.create({
        data: {
          userId,
          startDate: monday,
          endDate: sunday,
          preferences: JSON.stringify(preferences),
          isActive: true,
        },
      });

      await tx.plannedMeal.createMany({
        data: entries.map((e) => ({
          planId: plan.id,
          date: e.date,
          mealType: e.mealType,
          recipeId: e.recipeId,
          servings: e.servings,
        })),
      });

      return plan;
    });

    // Cargar el plan completo para responder
    const full = await prisma.mealPlan.findUnique({
      where: { id: created.id },
      include: {
        plannedMeals: {
          include: { recipe: true },
          orderBy: [{ date: "asc" }, { mealType: "asc" }],
        },
      },
    });

    return Response.json(full, { status: 201 });
  } catch (error) {
    console.error("[meal-plans POST]", error);
    return Response.json({ error: "Error al crear plan" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = Number(session.user.id);

    const plan = await prisma.mealPlan.findFirst({
      where: { userId, isActive: true },
      orderBy: { id: "desc" },
      include: {
        plannedMeals: {
          include: { recipe: true },
          orderBy: [{ date: "asc" }, { mealType: "asc" }],
        },
      },
    });

    if (!plan) return Response.json(null);

    return Response.json(plan);
  } catch (error) {
    console.error("[meal-plans GET]", error);
    return Response.json({ error: "Error al obtener plan" }, { status: 500 });
  }
}
