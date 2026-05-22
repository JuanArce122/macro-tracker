type Size = "sm" | "md" | "lg" | "xl";
type Color = "primary" | "protein" | "carbs" | "fat" | "calories" | "accent";

type Props = {
  value: string | number;
  label?: string;
  unit?: string;
  size?: Size;
  color?: Color;
  className?: string;
};

const sizeClass: Record<Size, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-5xl",
  xl: "text-[72px] leading-none",
};

const colorClass: Record<Color, string> = {
  primary:  "text-text-primary",
  protein:  "text-macro-protein",
  carbs:    "text-macro-carbs",
  fat:      "text-macro-fat",
  calories: "text-macro-calories",
  accent:   "text-accent-primary",
};

export default function Stat({
  value,
  label,
  unit,
  size = "md",
  color = "primary",
  className = "",
}: Props) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-xs uppercase tracking-[0.08em] text-text-tertiary">
          {label}
        </span>
      )}
      <div className={`font-serif tabular-nums tracking-[-0.02em] ${sizeClass[size]} ${colorClass[color]}`}>
        {value}
        {unit && (
          <span className="font-sans text-sm tracking-normal text-text-tertiary ml-1">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
