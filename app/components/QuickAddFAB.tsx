"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StepCamera, { type AnalysisResult } from "./add/StepCamera";
import StepSearch from "./add/StepSearch";
import StepConfirm from "./add/StepConfirm";

type Step = "closed" | "sheet" | "camera" | "search" | "confirm";

type RecentFood = {
  id: number;
  nombre: string;
  cal: number;
  p: number;
  c: number;
  f: number;
  source: string;
};

export default function QuickAddFAB({ date }: { date: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [recentsFetched, setRecentsFetched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);

  // Animación de entrada del sheet
  useEffect(() => {
    if (step === "sheet") {
      requestAnimationFrame(() => setSheetVisible(true));
    } else {
      setSheetVisible(false);
    }
  }, [step]);

  // Fetch recientes la primera vez que se abre
  const fetchRecents = useCallback(async () => {
    if (recentsFetched) return;
    try {
      const res = await fetch("/api/foods/user");
      if (!res.ok) return;
      const data = await res.json();
      setRecentFoods((data.recentFoods ?? []).slice(0, 5));
      setRecentsFetched(true);
    } catch { /* silencioso */ }
  }, [recentsFetched]);

  function openSheet() {
    setStep("sheet");
    fetchRecents();
  }

  function closeAll() {
    setStep("closed");
    setResult(null);
    setSearchQuery("");
  }

  function handleResult(r: AnalysisResult) {
    setResult(r);
    setStep("confirm");
  }

  function handleSaved() {
    // Cierra el overlay inmediatamente; StepConfirm hace router.push + refresh
    closeAll();
  }

  // Bloquear scroll del body cuando hay overlay abierto
  useEffect(() => {
    if (step !== "closed") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [step]);

  const isOpen = step !== "closed";

  return (
    <>
      {/* ── FAB ── */}
      <button
        onClick={openSheet}
        aria-label="Agregar comida"
        className="fixed z-20 left-1/2 -translate-x-1/2 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 rounded-full shadow-lg flex items-center justify-center transition-all"
        style={{
          bottom: "calc(4rem + env(safe-area-inset-bottom) + 0.75rem)",
          boxShadow: "0 4px 20px rgba(16,185,129,0.45)",
        }}
      >
        <svg
          className={`w-7 h-7 text-white transition-transform duration-200 ${isOpen ? "rotate-45" : "rotate-0"}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* ── Overlays ── */}
      {isOpen && (
        <div className="fixed inset-0 z-30" style={{ maxWidth: 430, margin: "0 auto" }}>

          {/* ── BOTTOM SHEET ── */}
          {step === "sheet" && (
            <>
              {/* Backdrop */}
              <div
                className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${sheetVisible ? "opacity-100" : "opacity-0"}`}
                onClick={closeAll}
              />

              {/* Panel */}
              <div
                className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${sheetVisible ? "translate-y-0" : "translate-y-full"}`}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-2 pb-4">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Agregar comida</h2>
                  <button
                    onClick={closeAll}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 active:bg-gray-200 dark:active:bg-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Acciones principales */}
                <div className="px-4 flex flex-col gap-3">
                  <button
                    onClick={() => setStep("camera")}
                    className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl active:bg-emerald-100 dark:active:bg-emerald-900/30 transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-2xl">📷</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Foto con IA</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gemini estima los macros automáticamente</p>
                    </div>
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => { setSearchQuery(""); setStep("search"); }}
                    className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl active:bg-blue-100 dark:active:bg-blue-900/30 transition-colors text-left"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Buscar alimento</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Base de datos + tus alimentos guardados</p>
                    </div>
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Recientes */}
                {recentFoods.length > 0 && (
                  <div className="mt-4 px-4 pb-2">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                      Recientes
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                      {recentFoods.map((food) => (
                        <button
                          key={food.id}
                          onClick={() => { setSearchQuery(food.nombre); setStep("search"); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{food.nombre}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{food.cal}</span>
                              {" kcal · "}
                              <span className="text-blue-500">{food.p}g P</span>
                              {" · "}
                              <span className="text-amber-500">{food.c}g C</span>
                              {" · "}
                              <span className="text-violet-500">{food.f}g G</span>
                              <span className="text-gray-300 dark:text-gray-600"> /100g</span>
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safe area bottom */}
                <div className="h-8" />
              </div>
            </>
          )}

          {/* ── OVERLAYS FULL-SCREEN ── */}
          {(step === "camera" || step === "search" || step === "confirm") && (
            <div className="absolute inset-0 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto">
              {step === "camera" && (
                <StepCamera
                  onResult={handleResult}
                  onBack={() => setStep("sheet")}
                  onSwitchToSearch={() => setStep("search")}
                />
              )}
              {step === "search" && (
                <StepSearch
                  initialQuery={searchQuery}
                  onResult={handleResult}
                  onBack={() => setStep("sheet")}
                />
              )}
              {step === "confirm" && result && (
                <StepConfirm
                  result={result}
                  date={date}
                  onBack={() => setStep(result.imagePreviewUrl ? "camera" : "search")}
                  onSaved={handleSaved}
                />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
