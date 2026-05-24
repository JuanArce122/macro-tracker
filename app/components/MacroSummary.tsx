type MacroCardProps = {
  label: string;
  value: number;
  goal: number;
  unit: string;
  textColor: string;  // ej "text-macro-protein"
  fillColor: string;  // ej "bg-macro-protein"
};

function MacroCard({ label, value, goal, unit, textColor, fillColor }: MacroCardProps) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl px-3.5 py-3 flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.08em] text-text-tertiary">{label}</span>
      <p className={`font-numbers text-2xl leading-none tabular-nums tracking-[0.01em] ${textColor}`}>
        {value.toFixed(1)}
        <span className="font-body text-xs tracking-normal text-text-tertiary ml-1">{unit}</span>
      </p>
      <div className="h-[3px] bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-[var(--ease-editorial)] ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type Props = {
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein: number; carbs: number; fat: number };
};

export default function MacroSummary({ totals, goals }: Props) {
  const calPct = goals.calories > 0 ? Math.min((totals.calories / goals.calories) * 100, 100) : 0;
  const calRemaining = Math.max(goals.calories - totals.calories, 0);

  return (
    <div className="px-4 pt-2 pb-2 flex flex-col gap-2">
      {/* Hero calorías */}
      <div className="bg-bg-secondary border border-border rounded-xl px-5 py-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-[0.08em] text-text-tertiary">Calorías</span>
          <span className="text-xs text-text-tertiary tabular-nums">
            {calRemaining.toFixed(0)} kcal restantes
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-numbers text-[64px] leading-none tabular-nums tracking-[0.01em] text-text-primary">
            {totals.calories.toFixed(0)}
          </span>
          <span className="text-xs text-text-tertiary tabular-nums">
            / {goals.calories.toFixed(0)} kcal
          </span>
        </div>
        <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-text-primary rounded-full transition-all duration-300 ease-[var(--ease-editorial)]"
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
          textColor="text-macro-protein"
          fillColor="bg-macro-protein"
        />
        <MacroCard
          label="Carbs"
          value={totals.carbs}
          goal={goals.carbs}
          unit="g"
          textColor="text-macro-carbs"
          fillColor="bg-macro-carbs"
        />
        <MacroCard
          label="Grasa"
          value={totals.fat}
          goal={goals.fat}
          unit="g"
          textColor="text-macro-fat"
          fillColor="bg-macro-fat"
        />
      </div>
    </div>
  );
}
