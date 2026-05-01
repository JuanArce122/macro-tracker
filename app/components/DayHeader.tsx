"use client";

import { useRouter } from "next/navigation";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function DayHeader({ date }: { date: string }) {
  const router = useRouter();
  const parsed = parseISO(date);

  const prev = format(subDays(parsed, 1), "yyyy-MM-dd");
  const next = format(addDays(parsed, 1), "yyyy-MM-dd");
  const isTodayDate = isToday(parsed);

  const label = isTodayDate
    ? "Hoy"
    : format(parsed, "EEEE d 'de' MMMM", { locale: es });

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      <button
        onClick={() => router.push(`/day/${prev}`)}
        className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        aria-label="Día anterior"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="text-center">
        <p className={`font-semibold text-base capitalize ${isTodayDate ? "text-emerald-600" : "text-gray-800"}`}>
          {label}
        </p>
        {!isTodayDate && (
          <p className="text-xs text-gray-400">{format(parsed, "yyyy")}</p>
        )}
      </div>

      <button
        onClick={() => router.push(`/day/${next}`)}
        className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        aria-label="Día siguiente"
        disabled={isTodayDate}
      >
        <svg className={`w-5 h-5 ${isTodayDate ? "text-gray-200" : "text-gray-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </header>
  );
}
