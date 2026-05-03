"use client";

import { useRouter } from "next/navigation";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type Profile = { name: string | null; avatarEmoji: string | null } | null;

function greeting(name: string | null): string {
  const h = new Date().getHours();
  const saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  return name ? `${saludo}, ${name.split(" ")[0]}` : saludo;
}

export default function DayHeader({ date, profile }: { date: string; profile?: Profile }) {
  const router = useRouter();
  const parsed = parseISO(date);

  const prev = format(subDays(parsed, 1), "yyyy-MM-dd");
  const next = format(addDays(parsed, 1), "yyyy-MM-dd");
  const isTodayDate = isToday(parsed);

  const label = isTodayDate
    ? "Hoy"
    : format(parsed, "EEEE d 'de' MMMM", { locale: es });

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={() => router.push(`/day/${prev}`)}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
        aria-label="Día anterior"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="text-center">
        {isTodayDate && profile !== undefined ? (
          <>
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <span>{profile?.avatarEmoji ?? "🙂"}</span>
              <span>{greeting(profile?.name ?? null)}</span>
            </p>
            <p className="font-semibold text-base capitalize text-emerald-600">{label}</p>
          </>
        ) : (
          <>
            <p className={`font-semibold text-base capitalize ${isTodayDate ? "text-emerald-600" : "text-gray-800 dark:text-gray-100"}`}>
              {label}
            </p>
            {!isTodayDate && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{format(parsed, "yyyy")}</p>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => router.push(`/day/${next}`)}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
        aria-label="Día siguiente"
        disabled={isTodayDate}
      >
        <svg className={`w-5 h-5 ${isTodayDate ? "text-gray-200 dark:text-gray-700" : "text-gray-600 dark:text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </header>
  );
}
