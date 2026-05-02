import BottomNav from "@/app/components/BottomNav";

function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700 ${className}`} />
  );
}

export default function DayLoading() {
  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header skeleton */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <Skeleton className="w-8 h-8" />
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="w-16 h-5" />
          <Skeleton className="w-28 h-3.5" />
        </div>
        <Skeleton className="w-8 h-8 opacity-0" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* MacroSummary skeleton */}
        <div className="px-4 pt-4 pb-2 flex flex-col gap-3">
          {/* Calorías card */}
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-28 h-3.5" />
            </div>
            <Skeleton className="w-32 h-9 mt-1" />
            <Skeleton className="w-full h-2 rounded-full" />
          </div>

          {/* Grid macros */}
          <div className="grid grid-cols-3 gap-2">
            {["bg-blue-50 dark:bg-blue-900/20", "bg-amber-50 dark:bg-amber-900/20", "bg-violet-50 dark:bg-violet-900/20"].map((bg, i) => (
              <div key={i} className={`rounded-2xl p-3 ${bg} flex flex-col gap-2`}>
                <Skeleton className="w-12 h-3.5" />
                <Skeleton className="w-16 h-7" />
                <Skeleton className="w-full h-1.5 rounded-full" />
                <Skeleton className="w-14 h-3" />
              </div>
            ))}
          </div>
        </div>

        {/* Botón agregar skeleton */}
        <div className="px-4 py-3">
          <Skeleton className="w-full h-14 rounded-2xl" />
        </div>

        {/* Lista de comidas skeleton */}
        <div className="px-4 pb-4 flex flex-col gap-3">
          {[1, 2].map((group) => (
            <div key={group} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700/50">
                <Skeleton className="w-20 h-4" />
              </div>
              {[1, 2].map((item) => (
                <div key={item} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-1/2 h-3.5" />
                  </div>
                  <Skeleton className="w-7 h-7 rounded-xl flex-shrink-0" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
