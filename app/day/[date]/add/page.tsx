"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import StepMode from "@/app/components/add/StepMode";
import StepCamera from "@/app/components/add/StepCamera";
import StepSearch from "@/app/components/add/StepSearch";
import StepConfirm from "@/app/components/add/StepConfirm";
import type { AnalysisResult } from "@/app/components/add/StepCamera";

type Step = "mode" | "camera" | "search" | "confirm";

export default function AddMealPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const router = useRouter();

  const [step, setStep] = useState<Step>("mode");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function handleResult(r: AnalysisResult) {
    setResult(r);
    setStep("confirm");
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-[430px] w-full flex flex-col min-h-screen bg-white dark:bg-gray-900">
        {step === "mode" && (
          <StepMode
            onSelect={(mode) => setStep(mode)}
            onBack={() => router.push(`/day/${date}`)}
          />
        )}
        {step === "camera" && (
          <StepCamera
            onResult={handleResult}
            onBack={() => setStep("mode")}
            onSwitchToSearch={() => setStep("search")}
          />
        )}
        {step === "search" && (
          <StepSearch
            onResult={handleResult}
            onBack={() => setStep("mode")}
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
