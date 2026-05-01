"use client";

import { useRouter } from "next/navigation";

export default function AddMealButton({ date }: { date: string }) {
  const router = useRouter();

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => router.push(`/day/${date}/add`)}
        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Agregar comida
      </button>
    </div>
  );
}
