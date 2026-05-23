"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import StepCamera, { type AnalysisResult } from "./add/StepCamera";
import StepSearch from "./add/StepSearch";
import StepBarcode from "./add/StepBarcode";
import StepVoice from "./add/StepVoice";
import StepConfirm from "./add/StepConfirm";
import Icon from "@/app/components/ui/Icon";

type Step = "closed" | "camera" | "search" | "barcode" | "voice" | "confirm";

export default function QuickAddFAB({ date }: { date: string }) {
  const [step, setStep] = useState<Step>("closed");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function openSearch() {
    setStep("search");
  }

  function closeAll() {
    setStep("closed");
    setResult(null);
    setPendingFile(null);
  }

  function handlePhotoSelected(file: File) {
    setPendingFile(file);
    setStep("camera");
  }

  function handleScanBarcode() {
    setStep("barcode");
  }

  function handleVoice() {
    setStep("voice");
  }

  function handleBarcodeNotFound(_barcode: string) {
    // Cuando el barcode no se encuentra en OFF, volvemos a la búsqueda.
    // En el futuro podríamos pre-poblar un form de "crear alimento" con
    // el barcode pre-llenado, pero por ahora la búsqueda es buen fallback.
    setStep("search");
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
      {/* ── Pill horizontal sticky ── */}
      <button
        onClick={openSearch}
        aria-label="Agregar comida"
        className="fixed z-20 left-1/2 -translate-x-1/2 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-text-primary text-bg-primary text-sm font-medium active:opacity-90 transition-opacity duration-200 ease-[var(--ease-editorial)] shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
        style={{
          bottom: "calc(4rem + env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        <Icon icon={Plus} size={18} />
        Agregar comida
      </button>

      {/* ── Overlay full-screen ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-bg-primary flex flex-col overflow-y-auto"
          style={{ maxWidth: 430, margin: "0 auto" }}
        >
          {step === "search" && (
            <StepSearch
              onResult={handleResult}
              onBack={closeAll}
              onPhotoSelected={handlePhotoSelected}
              onScanBarcode={handleScanBarcode}
              onVoice={handleVoice}
            />
          )}
          {step === "camera" && (
            <StepCamera
              onResult={handleResult}
              onBack={() => { setPendingFile(null); setStep("search"); }}
              onSwitchToSearch={() => { setPendingFile(null); setStep("search"); }}
              initialFile={pendingFile ?? undefined}
            />
          )}
          {step === "barcode" && (
            <StepBarcode
              onResult={handleResult}
              onNotFound={handleBarcodeNotFound}
              onBack={() => setStep("search")}
            />
          )}
          {step === "voice" && (
            <StepVoice
              onResult={handleResult}
              onBack={() => setStep("search")}
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
