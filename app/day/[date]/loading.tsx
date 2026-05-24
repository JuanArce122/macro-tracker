import BottomNav from "@/app/components/BottomNav";

function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-bg-tertiary ${className}`} />
  );
}

export default function DayLoading() {
  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header skeleton */}
      <header className="flex items-center justify-between gap-3 px-5 pt-7 pb-6">
        <Skeleton className="w-6 h-6" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="w-20 h-7" />
          <Skeleton className="w-32 h-3" />
        </div>
        <Skeleton className="w-6 h-6 opacity-0" />
      </header>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* MacroSummary skeleton */}
        <div className="px-4 pt-2 pb-2 flex flex-col gap-2">
          {/* Hero calorías */}
          <div className="bg-bg-secondary border border-border rounded-xl px-5 py-4 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <Skeleton className="w-16 h-3" />
              <Skeleton className="w-28 h-3" />
            </div>
            <Skeleton className="w-32 h-[48px]" />
            <Skeleton className="w-full h-1 rounded-full" />
          </div>

          {/* Grid macros */}
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-bg-secondary border border-border rounded-xl px-3.5 py-3 flex flex-col gap-2">
                <Skeleton className="w-12 h-2.5" />
                <Skeleton className="w-14 h-6" />
                <Skeleton className="w-full h-[3px] rounded-full" />
                <Skeleton className="w-16 h-2.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Lista de comidas skeleton */}
        <div className="px-4 pt-3 flex flex-col gap-3">
          {[0, 1].map((group) => (
            <div key={group} className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2.5">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="w-24 h-5" />
              </div>
              {[0, 1].map((item) => (
                <div key={item} className="flex items-center gap-3 px-5 py-4 border-b border-border last:border-0">
                  <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                    <Skeleton className="w-2/3 h-3" />
                  </div>
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
