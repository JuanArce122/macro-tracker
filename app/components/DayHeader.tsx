"use client";

import { useRouter } from "next/navigation";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

export default function DayHeader({ date }: { date: string }) {
  const router = useRouter();
  const parsed = parseISO(date);

  const prev = format(subDays(parsed, 1), "yyyy-MM-dd");
  const next = format(addDays(parsed, 1), "yyyy-MM-dd");
  const isTodayDate = isToday(parsed);

  const dayLabel = isTodayDate
    ? "Hoy"
    : format(parsed, "EEEE", { locale: es });
  const dateLabel = format(parsed, "d 'de' MMMM", { locale: es });
  const yearLabel = format(parsed, "yyyy");

  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-7 pb-6 bg-bg-primary">
      <button
        onClick={() => router.push(`/day/${prev}`)}
        className="text-text-tertiary active:text-text-primary transition-colors duration-200 ease-[var(--ease-editorial)] p-1 -ml-1 flex-shrink-0"
        aria-label="Día anterior"
      >
        <Icon icon={ChevronLeft} size={22} />
      </button>

      <div className="flex flex-col items-center text-center min-w-0">
        <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary capitalize leading-tight">
          {dayLabel}
        </h1>
        <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mt-1 capitalize">
          {dateLabel}{!isTodayDate && ` · ${yearLabel}`}
        </p>
      </div>

      <button
        onClick={() => router.push(`/day/${next}`)}
        disabled={isTodayDate}
        className={`p-1 -mr-1 flex-shrink-0 transition-colors duration-200 ease-[var(--ease-editorial)] ${
          isTodayDate ? "text-bg-tertiary" : "text-text-tertiary active:text-text-primary"
        }`}
        aria-label="Día siguiente"
      >
        <Icon icon={ChevronRight} size={22} />
      </button>
    </header>
  );
}
