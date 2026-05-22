"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import StepCamera from "@/app/components/add/StepCamera";
import StepSearch from "@/app/components/add/StepSearch";
import StepConfirm from "@/app/components/add/StepConfirm";
import type { AnalysisResult } from "@/app/components/add/StepCamera";

type Step = "camera" | "search" | "confirm";

export default function AddMealPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const router = useRouter();

  const [step, setStep] = useState<Step>("search");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handlePhotoSelected(file: File) {
    setPendingFile(file);
    setStep("camera");
  }

  function handleResult(r: AnalysisResult) {
    setResult(r);
    setStep("confirm");
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-[430px] w-full flex flex-col min-h-screen bg-bg-primary">
        {step === "search" && (
          <StepSearch
            onResult={handleResult}
            onBack={() => router.push(`/day/${date}`)}
            onPhotoSelected={handlePhotoSelected}
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
        {step === "confirm" && result && (
          <StepConfirm
            result={result}
            date={date}
            onBack={() => setStep(result.imagePreviewUrl ? "camera" : "search")}
          />
        )}
      </div>
    </div>
  );
}
