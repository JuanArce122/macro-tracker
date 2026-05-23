"use client";

/**
 * HU-06: Wizard de preferencias para generar plan semanal.
 *
 * Pasos:
 *  1. Dieta + alergias
 *  2. Comidas/día (3-5)
 *  3. Tiempo + costo
 *
 * Al confirmar, POST /api/meal-plans y navega a /plan.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChefHat, Loader2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

type Diet = "vegano" | "vegetariano" | "keto" | "paleo" | "sin-gluten";
type Allergy = "lacteos" | "gluten" | "frutos-secos" | "mariscos" | "huevo" | "soja";

const DIETS: { value: Diet; label: string }[] = [
  { value: "vegano", label: "Vegano" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "sin-gluten", label: "Sin gluten" },
];

const ALLERGIES: { value: Allergy; label: string }[] = [
  { value: "lacteos", label: "Lácteos" },
  { value: "gluten", label: "Gluten" },
  { value: "frutos-secos", label: "Frutos secos" },
  { value: "mariscos", label: "Mariscos" },
  { value: "huevo", label: "Huevo" },
  { value: "soja", label: "Soja" },
];

const COST_LABELS = ["Solo bajo", "Bajo o medio", "Cualquiera"];

export default function PlanSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [diet, setDiet] = useState<Diet[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [mealsPerDay, setMealsPerDay] = useState<3 | 4 | 5>(3);
  const [maxPrepMinutes, setMaxPrepMinutes] = useState(60);
  const [costLevel, setCostLevel] = useState<1 | 2 | 3>(3);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDiet(d: Diet) {
    setDiet((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function toggleAllergy(a: Allergy) {
    setAllergies((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function generate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: { diet, allergies, mealsPerDay, maxPrepMinutes, costLevel },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No pudimos generar tu plan");
      }
      router.push("/plan");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="sticky top-0 bg-bg-primary border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? setStep((step - 1) as 1 | 2 | 3) : router.back())}
            className="p-1 -ml-1"
            aria-label="Volver"
          >
            <Icon icon={ChevronLeft} size={24} />
          </button>
          <h1 className="text-lg font-medium">Plan semanal</h1>
          <span className="ml-auto text-xs text-text-secondary">Paso {step}/3</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {step === 1 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Icon icon={ChefHat} size={28} />
              <div>
                <h2 className="text-xl font-medium">Dieta y alergias</h2>
                <p className="text-sm text-text-secondary">
                  Seleccioná lo que aplique (opcional).
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Dieta</h3>
              <div className="flex flex-wrap gap-2">
                {DIETS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => toggleDiet(d.value)}
                    className={`px-4 py-2 rounded-full text-sm border ${
                      diet.includes(d.value)
                        ? "bg-text-primary text-bg-primary border-text-primary"
                        : "border-border text-text-primary"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Alergias</h3>
              <div className="flex flex-wrap gap-2">
                {ALLERGIES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => toggleAllergy(a.value)}
                    className={`px-4 py-2 rounded-full text-sm border ${
                      allergies.includes(a.value)
                        ? "bg-text-primary text-bg-primary border-text-primary"
                        : "border-border text-text-primary"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={() => setStep(2)} size="lg" className="w-full">
              Siguiente
            </Button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-medium">¿Cuántas comidas por día?</h2>
              <p className="text-sm text-text-secondary mt-1">
                Distribuimos tus calorías a lo largo del día.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setMealsPerDay(n as 3 | 4 | 5)}
                  className={`p-6 rounded-lg border text-center ${
                    mealsPerDay === n
                      ? "border-text-primary bg-bg-tertiary"
                      : "border-border"
                  }`}
                >
                  <div className="text-3xl font-medium">{n}</div>
                  <div className="text-xs text-text-secondary mt-1">
                    {n === 3 ? "estándar" : n === 4 ? "+ snack" : "+ 2 snacks"}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} size="lg" className="flex-1">
                Atrás
              </Button>
              <Button onClick={() => setStep(3)} size="lg" className="flex-1">
                Siguiente
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-medium">Tiempo y costo</h2>
              <p className="text-sm text-text-secondary mt-1">
                Ajustá los filtros finales.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">
                Tiempo máximo por comida: <strong>{maxPrepMinutes} min</strong>
              </h3>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={maxPrepMinutes}
                onChange={(e) => setMaxPrepMinutes(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-text-secondary">
                <span>15 min</span>
                <span>120 min</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Costo de ingredientes</h3>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCostLevel(c as 1 | 2 | 3)}
                    className={`p-4 rounded-lg border text-center ${
                      costLevel === c
                        ? "border-text-primary bg-bg-tertiary"
                        : "border-border"
                    }`}
                  >
                    <div className="text-sm font-medium">{COST_LABELS[c - 1]}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep(2)}
                size="lg"
                className="flex-1"
                disabled={submitting}
              >
                Atrás
              </Button>
              <Button
                onClick={generate}
                size="lg"
                className="flex-1"
                disabled={submitting}
                leadingIcon={submitting ? <Loader2 className="animate-spin" size={18} /> : null}
              >
                {submitting ? "Generando…" : "Generar plan"}
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
