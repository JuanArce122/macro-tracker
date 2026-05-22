/**
 * Construye el snapshot completo de datos del usuario (HU-10).
 *
 * Consumido por:
 *   - GET /api/export/json
 *   - GET /api/export/pdf (vía la plantilla react-pdf)
 *   - DELETE /api/account (GDPR auto-export antes de borrar)
 *
 * Nunca incluye `passwordHash`. Si agregamos nuevos campos sensibles
 * (tokens, secretos, etc.) deben quedar fuera explícitamente.
 */

import { prisma } from "@/lib/prisma";

export type ExportRange = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

export type ExportedMeal = {
  id: number;
  date: string;          // ISO 8601
  dateLocal: string | null;
  category: string;
  name: string;
  imageUrl: string | null;
  weightG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  items: unknown;
  createdAt: string;
};

export type ExportedFood = {
  id: number;
  nombre: string;
  categoria: string;
  cal: number;
  p: number;
  c: number;
  f: number;
  gramsPerUnit: number | null;
  unitLabel: string | null;
  source: string;
  usageCount: number;
};

export type ExportData = {
  exportedAt: string;
  range?: ExportRange;
  user: {
    email: string;
    name: string | null;
    avatarEmoji: string | null;
    createdAt: string;
  };
  profile: {
    age: number | null;
    sex: string | null;
    weightKg: number | null;
    heightCm: number | null;
    activityLevel: string | null;
    fitnessGoal: string | null;
    countryCode: string | null;
  };
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  meals: ExportedMeal[];
  customFoods: ExportedFood[];
  summary: {
    totalMeals: number;
    totalDays: number;
    totalCalories: number;
    avgCaloriesPerDay: number;
  };
};

export async function buildExportData(
  userId: number,
  range?: ExportRange
): Promise<ExportData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      avatarEmoji: true,
      age: true,
      sex: true,
      weightKg: true,
      heightCm: true,
      activityLevel: true,
      fitnessGoal: true,
      countryCode: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const goal = await prisma.goal.findFirst({
    where: { userId },
    orderBy: { id: "desc" },
  });

  const mealsFilter = range
    ? {
        userId,
        OR: [
          { dateLocal: { gte: range.from, lte: range.to } },
          {
            dateLocal: null,
            date: {
              gte: new Date(`${range.from}T00:00:00.000Z`),
              lte: new Date(`${range.to}T23:59:59.999Z`),
            },
          },
        ],
      }
    : { userId };

  const rawMeals = await prisma.meal.findMany({
    where: mealsFilter,
    orderBy: [{ dateLocal: "asc" }, { date: "asc" }],
  });

  const customFoods = await prisma.food.findMany({
    where: { userId, source: "user" },
    orderBy: { nombre: "asc" },
  });

  // Estadísticas básicas
  const distinctDays = new Set(
    rawMeals.map((m) => m.dateLocal ?? m.date.toISOString().split("T")[0])
  );
  const totalCalories = rawMeals.reduce((sum, m) => sum + m.calories, 0);
  const avgCaloriesPerDay = distinctDays.size > 0
    ? Math.round(totalCalories / distinctDays.size)
    : 0;

  const meals: ExportedMeal[] = rawMeals.map((m) => ({
    id: m.id,
    date: m.date.toISOString(),
    dateLocal: m.dateLocal,
    category: m.category,
    name: m.name,
    imageUrl: m.imageUrl,
    weightG: m.weightG,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    confidence: m.confidence,
    items: m.items ? safeParseJson(m.items) : null,
    createdAt: m.createdAt.toISOString(),
  }));

  const exportedFoods: ExportedFood[] = customFoods.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    categoria: f.categoria,
    cal: f.cal,
    p: f.p,
    c: f.c,
    f: f.f,
    gramsPerUnit: f.gramsPerUnit,
    unitLabel: f.unitLabel,
    source: f.source,
    usageCount: f.usageCount,
  }));

  return {
    exportedAt: new Date().toISOString(),
    ...(range ? { range } : {}),
    user: {
      email: user.email,
      name: user.name,
      avatarEmoji: user.avatarEmoji,
      createdAt: user.createdAt.toISOString(),
    },
    profile: {
      age: user.age,
      sex: user.sex,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      activityLevel: user.activityLevel,
      fitnessGoal: user.fitnessGoal,
      countryCode: user.countryCode,
    },
    goals: goal
      ? {
          calories: goal.calories,
          protein: goal.protein,
          carbs: goal.carbs,
          fat: goal.fat,
        }
      : null,
    meals,
    customFoods: exportedFoods,
    summary: {
      totalMeals: meals.length,
      totalDays: distinctDays.size,
      totalCalories: Math.round(totalCalories),
      avgCaloriesPerDay,
    },
  };
}

/**
 * Parsea un JSON guardado en DB sin crashear si es inválido.
 * Los items de Meal vienen como string serializado.
 */
function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
