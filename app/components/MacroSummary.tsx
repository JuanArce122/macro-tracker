type MacroCardProps = {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  bgColor: string;
  trackColor: string;
  fillColor: string;
};

function MacroCard({ label, value, goal, unit, color, bgColor, trackColor, fillColor }: MacroCardProps) {
  const pct = Math.min((value / goal) * 100, 100);
  const remaining = Math.max(goal - value, 0);

  return (
    <div className={`rounded-2xl p-3 ${bgColor} flex flex-col gap-2`}>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <p className={`text-2xl font-bold leading-none ${color}`}>
        {value.toFixed(1)}
        <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-0.5">{unit}</span>
      </p>
      <div className={`h-1.5 rounded-full ${trackColor}`}>
        <div
          className={`h-1.5 rounded-full transition-all ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs font-medium ${color}`}>{remaining.toFixed(1)}{unit} rest.</p>
    </div>
  );
}

type Props = {
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein: number; carbs: number; fat: number };
};

export default function MacroSummary({ totals, goals }: Props) {
  const calPct = Math.min((totals.calories / goals.calories) * 100, 100);

  return (
    <div className="px-4 pt-4 pb-2 flex flex-col gap-3">
      {/* Calorías — card grande */}
      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Calorías</span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {Math.max(goals.calories - totals.calories, 0).toFixed(0)} kcal restantes
          </span>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{totals.calories.toFixed(0)}</span>
          <span className="text-sm text-gray-400 dark:text-gray-500">/ {goals.calories} kcal</span>
        </div>
        <div className="h-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
          <div
            className="h-2 bg-emerald-500 rounded-full transition-all"
            style={{ width: `${calPct}%` }}
          />
        </div>
      </div>

      {/* Grid 3 macros */}
      <div className="grid grid-cols-3 gap-2">
        <MacroCard
          label="Proteína"
          value={totals.protein}
          goal={goals.protein}
          unit="g"
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/30"
          trackColor="bg-blue-100 dark:bg-blue-900/50"
          fillColor="bg-blue-500 dark:bg-blue-400"
        />
        <MacroCard
          label="Carbs"
          value={totals.carbs}
          goal={goals.carbs}
          unit="g"
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-900/30"
          trackColor="bg-amber-100 dark:bg-amber-900/50"
          fillColor="bg-amber-500 dark:bg-amber-400"
        />
        <MacroCard
          label="Grasa"
          value={totals.fat}
          goal={goals.fat}
          unit="g"
          color="text-violet-600 dark:text-violet-400"
          bgColor="bg-violet-50 dark:bg-violet-900/30"
          trackColor="bg-violet-100 dark:bg-violet-900/50"
          fillColor="bg-violet-500 dark:bg-violet-400"
        />
      </div>
    </div>
  );
}
