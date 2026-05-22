"use client";

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export function getStrength(password: string): StrengthLevel {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score as StrengthLevel;
}

const LABEL = ["", "Débil", "Regular", "Buena", "Fuerte"];

// Colores tierra para cada nivel
const BAR_COLOR = [
  "",
  "bg-accent-warm",     // 1 — terracota (warning)
  "bg-macro-fat",       // 2 — mostaza
  "bg-text-secondary",  // 3 — neutro intermedio
  "bg-macro-protein",   // 4 — verde botánico
];

const TEXT_COLOR = [
  "",
  "text-accent-warm",
  "text-macro-fat",
  "text-text-secondary",
  "text-macro-protein",
];

export default function PasswordStrength({ password }: { password: string }) {
  const level = getStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ease-[var(--ease-editorial)] ${
              i <= level ? BAR_COLOR[level] : "bg-bg-tertiary"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${TEXT_COLOR[level]}`}>
        {LABEL[level]}
        {level < 3 && (
          <span className="text-text-tertiary font-normal">
            {" — "}
            {level === 1 && "Agrega mayúsculas, números o símbolos"}
            {level === 2 && "Agrega un número o símbolo"}
          </span>
        )}
      </p>
    </div>
  );
}
