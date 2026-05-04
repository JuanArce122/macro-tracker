"use client";

import { useState, useEffect } from "react";
import StepCamera, { type AnalysisResult } from "./add/StepCamera";
import StepSearch from "./add/StepSearch";
import StepConfirm from "./add/StepConfirm";

type Step = "closed" | "camera" | "search" | "confirm";

export default function QuickAddFAB({ date }: { date: string }) {
  const [step, setStep] = useState<Step>("closed");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function openSearch() {
    setStep("search");
  }

  function closeAll() {
    setStep("closed");
    setResult(null);
  }

  function handleResult(r: AnalysisResult) {
    setResult(r);
    setStep("confirm");
  }

  function handleSaved() {
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
        onClick={openSearch}
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

      {/* ── Overlay full-screen ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto"
          style={{ maxWidth: 430, margin: "0 auto" }}
        >
          {step === "search" && (
            <StepSearch
              onResult={handleResult}
              onBack={closeAll}
              onCamera={() => setStep("camera")}
            />
          )}
          {step === "camera" && (
            <StepCamera
              onResult={handleResult}
              onBack={() => setStep("search")}
              onSwitchToSearch={() => setStep("search")}
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
    </>
  );
}
