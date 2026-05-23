import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DayHeader from "@/app/components/DayHeader";
import MacroSummary from "@/app/components/MacroSummary";
import MealList from "@/app/components/MealList";
import QuickAddFAB from "@/app/components/QuickAddFAB";
import BottomNav from "@/app/components/BottomNav";
import SuggestionBanner from "@/app/components/SuggestionBanner";
import InsightCard from "@/app/components/InsightCard";
import HabitsDashboard from "@/app/components/HabitsDashboard";
import SafeUseBanner from "@/app/components/SafeUseBanner";
import MicrosCard from "@/app/components/MicrosCard";

async function getMeals(userId: number, date: string) {
  return prisma.meal.findMany({
    where: {
      userId,
      OR: [
        { dateLocal: date },
        { dateLocal: null, date: { gte: new Date(`${date}T00:00:00.000Z`), lte: new Date(`${date}T23:59:59.999Z`) } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

async function getGoals(userId: number) {
  const goal = await prisma.goal.findFirst({ where: { userId }, orderBy: { id: "desc" } });
  return (
    goal ?? {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
      adjustmentMode: "manual",
    }
  );
}

async function getProfileForDashboard(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { trackingMode: true, fitnessGoal: true },
  });
}

function todayLocal(): string {
  return new Date().toISOString().split("T")[0];
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = Number(session.user.id);
  const { date } = await params;

  const [meals, goals, userInfo] = await Promise.all([
    getMeals(userId, date),
    getGoals(userId),
    getProfileForDashboard(userId),
  ]);

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // HU-05: solo mostramos el banner de sugerencia cuando el usuario
  // está viendo el día de hoy. En días pasados es menos relevante y
  // evitamos un fetch extra por cada navegación al historial.
  const isToday = date === todayLocal();
  const adjustmentMode = "adjustmentMode" in goals ? goals.adjustmentMode : "manual";
  // HU-11: si el usuario está en modo hábitos, reemplazamos MacroSummary
  // por HabitsDashboard. MealList se mantiene en ambos modos porque
  // refleja datos crudos que son útiles independientemente del modo.
  const isHabitsMode = userInfo?.trackingMode === "habits";
  const fitnessGoal = userInfo?.fitnessGoal as "lose" | "maintain" | "gain" | null | undefined;

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      <DayHeader date={date} />
      <div className="flex-1 overflow-y-auto pb-32">
        {isHabitsMode ? (
          <HabitsDashboard date={date} fitnessGoal={fitnessGoal ?? null} />
        ) : (
          <>
            <MacroSummary totals={totals} goals={goals} />
            <MicrosCard date={date} />
          </>
        )}
        {isToday && (
          <>
            <SafeUseBanner trackingMode={userInfo?.trackingMode ?? "macros"} />
            <SuggestionBanner adjustmentMode={adjustmentMode} />
            <InsightCard />
          </>
        )}
        <MealList meals={meals} date={date} />
      </div>
      <QuickAddFAB date={date} />
      <BottomNav />
    </div>
  );
}
