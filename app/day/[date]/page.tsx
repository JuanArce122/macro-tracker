import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DayHeader from "@/app/components/DayHeader";
import MacroSummary from "@/app/components/MacroSummary";
import MealList from "@/app/components/MealList";
import AddMealButton from "@/app/components/AddMealButton";
import BottomNav from "@/app/components/BottomNav";

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
  return goal ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 };
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

  const [meals, goals] = await Promise.all([getMeals(userId, date), getGoals(userId)]);

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      <DayHeader date={date} />
      <div className="flex-1 overflow-y-auto">
        <MacroSummary totals={totals} goals={goals} />
        <AddMealButton date={date} />
        <MealList meals={meals} date={date} />
      </div>
      <BottomNav />
    </div>
  );
}
