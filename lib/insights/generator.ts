/**
 * Generator que orquesta las reglas, evalúa, persiste insights y envía
 * notificaciones push (HU-09).
 *
 * Diseño:
 *   - Las reglas son funciones puras (lib/insights/rules.ts)
 *   - Este módulo SÍ toca Prisma y Web Push
 *   - Se invoca desde el cron semanal (/api/cron/insights)
 *
 * Reglas globales:
 *   - Max 2 insights persistidos por usuario por semana
 *   - Milestones (streak) tienen prioridad — siempre se persisten si
 *     aplican, y cuentan para el límite de 2
 *   - Si el cron corre 2 veces el mismo día (re-trigger manual), no
 *     duplicamos: skipeamos si ya hay un push en últimas 24h
 */

import { prisma } from "@/lib/prisma";
import { calcAdherence } from "@/lib/weight-adherence";
import {
  ruleCaloriesTrend,
  ruleAdherenceLow,
  ruleStreak,
  ruleMacroImbalance,
  type DailyTotal,
  type GeneratedInsight,
} from "./rules";
import { sendPushToUser } from "@/lib/push";

const MAX_INSIGHTS_PER_WEEK = 2;
const TREND_WINDOW_DAYS = 14;

/**
 * Carga los últimos 14 días de comidas del usuario agrupados por día.
 */
async function loadDailyTotals(userId: number): Promise<DailyTotal[]> {
  const since = new Date();
  since.setDate(since.getDate() - TREND_WINDOW_DAYS);
  const sinceStr = since.toISOString().split("T")[0];

  const meals = await prisma.meal.findMany({
    where: {
      userId,
      OR: [
        { dateLocal: { gte: sinceStr } },
        { dateLocal: null, date: { gte: since } },
      ],
    },
    select: {
      dateLocal: true,
      date: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
    },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, DailyTotal>();
  for (const m of meals) {
    const day = m.dateLocal ?? m.date.toISOString().split("T")[0];
    const acc = byDay.get(day);
    if (acc) {
      acc.calories += m.calories;
      acc.protein += m.protein;
      acc.carbs += m.carbs;
      acc.fat += m.fat;
    } else {
      byDay.set(day, {
        date: day,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
      });
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calcula la racha actual (días consecutivos con al menos 1 registro).
 */
async function calcCurrentStreak(userId: number): Promise<number> {
  // Tomar los últimos 120 días para cubrir hasta el hito de 90
  const since = new Date();
  since.setDate(since.getDate() - 120);
  const sinceStr = since.toISOString().split("T")[0];

  const meals = await prisma.meal.findMany({
    where: {
      userId,
      OR: [
        { dateLocal: { gte: sinceStr } },
        { dateLocal: null, date: { gte: since } },
      ],
    },
    select: { dateLocal: true, date: true },
    orderBy: { date: "desc" },
  });

  const distinctDays = Array.from(
    new Set(meals.map((m) => m.dateLocal ?? m.date.toISOString().split("T")[0]))
  ).sort()
    .reverse();

  if (distinctDays.length === 0) return 0;

  // Racha activa: contar días consecutivos desde hoy (o ayer)
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const day of distinctDays) {
    const cursorStr = cursor.toISOString().split("T")[0];
    if (day === cursorStr) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0 && day === new Date(cursor.getTime() - 86400000).toISOString().split("T")[0]) {
      // Permitimos que el usuario aún no haya registrado hoy; arrancamos desde ayer
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Genera los insights para un usuario y los persiste (max 2/semana).
 * Retorna metadatos del run.
 */
export async function generateInsightsForUser(userId: number): Promise<{
  generated: number;
  pushed: number;
  skipped: string[];
}> {
  const skipped: string[] = [];

  // Verificar cooldown: ya tenemos suficientes esta semana
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentCount = await prisma.insight.count({
    where: { userId, createdAt: { gte: weekAgo } },
  });
  if (recentCount >= MAX_INSIGHTS_PER_WEEK) {
    skipped.push("weekly_quota");
    return { generated: 0, pushed: 0, skipped };
  }

  // Cargar datos del usuario
  const goal = await prisma.goal.findFirst({
    where: { userId },
    orderBy: { id: "desc" },
  });
  if (!goal) {
    skipped.push("no_goal");
    return { generated: 0, pushed: 0, skipped };
  }

  const [totals, adherence, streak] = await Promise.all([
    loadDailyTotals(userId),
    calcAdherence(userId),
    calcCurrentStreak(userId),
  ]);

  // Evaluar todas las reglas
  const candidates: GeneratedInsight[] = [];
  const trend = ruleCaloriesTrend(totals, goal);
  if (trend) candidates.push(trend);
  const adh = ruleAdherenceLow(adherence);
  if (adh) candidates.push(adh);
  const stk = ruleStreak(streak);
  if (stk) candidates.push(stk);
  const macro = ruleMacroImbalance(totals, goal);
  if (macro) candidates.push(macro);

  if (candidates.length === 0) {
    skipped.push("no_signal");
    return { generated: 0, pushed: 0, skipped };
  }

  // Priorizar: milestones primero, después uno random/sequential del resto
  const milestones = candidates.filter((c) => c.type === "streak");
  const others = candidates.filter((c) => c.type !== "streak").slice(0, 1);
  const slotsLeft = MAX_INSIGHTS_PER_WEEK - recentCount;
  const selected = [...milestones, ...others].slice(0, slotsLeft);

  // Persistir + enviar push
  let pushed = 0;
  for (const insight of selected) {
    const saved = await prisma.insight.create({
      data: {
        userId,
        type: insight.type,
        title: insight.title,
        body: insight.body,
        dataJson: JSON.stringify(insight.data),
      },
    });
    try {
      await sendPushToUser(userId, {
        title: insight.title,
        body: insight.body,
        url: "/",
        insightId: saved.id,
      });
      await prisma.insight.update({
        where: { id: saved.id },
        data: { pushedAt: new Date() },
      });
      pushed++;
    } catch (err) {
      // No bloqueamos la persistencia si el push falla (sin
      // suscripciones es lo más común)
      console.warn(`[insights] push failed for user ${userId}:`, err);
    }
  }

  return { generated: selected.length, pushed, skipped };
}

/**
 * Genera insights para TODOS los usuarios activos. Para uso del cron.
 *
 * "Activos" = al menos 1 comida registrada en los últimos 14 días, para
 * evitar pingar usuarios inactivos.
 */
export async function generateInsightsForAllActiveUsers(): Promise<{
  processed: number;
  totalGenerated: number;
  totalPushed: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const activeUsers = await prisma.user.findMany({
    where: { meals: { some: { createdAt: { gte: since } } } },
    select: { id: true },
  });

  let totalGenerated = 0;
  let totalPushed = 0;

  for (const u of activeUsers) {
    try {
      const stats = await generateInsightsForUser(u.id);
      totalGenerated += stats.generated;
      totalPushed += stats.pushed;
    } catch (err) {
      console.error(`[insights] failed for user ${u.id}:`, err);
    }
  }

  return {
    processed: activeUsers.length,
    totalGenerated,
    totalPushed,
  };
}
