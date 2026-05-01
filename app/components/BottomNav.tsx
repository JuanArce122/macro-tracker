"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

export default function BottomNav() {
  const pathname = usePathname();

  const isDay = pathname.startsWith("/day") || pathname === "/";
  const isHistory = pathname.startsWith("/history");
  const isSettings = pathname.startsWith("/settings");

  return (
    <nav className="sticky bottom-0 bg-white border-t border-gray-100 flex items-center justify-around h-16 z-10">
      <Link
        href={`/day/${today()}`}
        className={`flex flex-col items-center gap-0.5 text-xs px-6 py-2 ${
          isDay ? "text-emerald-600" : "text-gray-400"
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Hoy
      </Link>

      <Link
        href="/history"
        className={`flex flex-col items-center gap-0.5 text-xs px-6 py-2 ${
          isHistory ? "text-emerald-600" : "text-gray-400"
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Historial
      </Link>

      <Link
        href="/settings"
        className={`flex flex-col items-center gap-0.5 text-xs px-6 py-2 ${
          isSettings ? "text-emerald-600" : "text-gray-400"
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Ajustes
      </Link>
    </nav>
  );
}
