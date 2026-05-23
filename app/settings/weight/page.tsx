"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Loader2, Scale } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import WeightTrendChart from "@/app/components/WeightTrendChart";

type WeightEntry = { date: string; weightKg: number; source: string };
type TrendResponse = {
  entries: { date: string; weightKg: number }[];
  smoothed: number[];
  trendKgPerWeek: number;
  adherence: number;
  windowDays: number;
  points: number;
};

function todayLocal(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTrend(kgWeek: number): { label: string; color: string } {
  if (Math.abs(kgWeek) < 0.05) return { label: "Estable", color: "text-text-secondary" };
  const sign = kgWeek > 0 ? "+" : "";
  const label = `${sign}${kgWeek.toFixed(2)} kg/sem`;
  // Sin juicio de color — el "bueno" depende del fitnessGoal del usuario
  return { label, color: "text-text-primary" };
}

export default function WeightPage() {
  const router = useRouter();
  const [weightInput, setWeightInput] = useState("");
  const [today] = useState(todayLocal());
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/weight?limit=60").then((r) => r.ok ? r.json() : { entries: [] }),
      fetch("/api/weight/trend?window=30").then((r) => r.ok ? r.json() : null),
    ])
      .then(([w, t]) => {
        setEntries(w.entries ?? []);
        setTrend(t);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const parsed = Number(weightInput);
    if (!parsed || parsed < 10 || parsed > 500) {
      setError("Ingresa un peso válido (entre 10 y 500 kg).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: parsed, date: today }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setWeightInput("");
      // Recargar entries + trend
      const [w, t] = await Promise.all([
        fetch("/api/weight?limit=60").then((r) => r.json()),
        fetch("/api/weight/trend?window=30").then((r) => r.json()),
      ]);
      setEntries(w.entries ?? []);
      setTrend(t);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const trendLabel = trend ? formatTrend(trend.trendKgPerWeek) : null;
  const adherencePct = trend ? Math.round(trend.adherence * 100) : 0;

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]"
          aria-label="Volver"
        >
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary">Peso</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-4">

        {/* Input de hoy */}
        <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-1">Peso de hoy</p>
            <p className="text-xs text-text-tertiary tabular-nums">{today}</p>
          </div>

          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="ej. 70.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 py-3 text-base font-medium tabular-nums focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)] pr-12"
              aria-label="Peso en kilogramos"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary text-sm font-medium pointer-events-none">
              kg
            </span>
          </div>

          {error && <p className="text-red-600 text-xs px-1">{error}</p>}

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || saved || !weightInput}
            leadingIcon={
              saved ? <Icon icon={Check} size={16} /> :
              saving ? <Icon icon={Loader2} size={16} className="animate-spin" /> :
              undefined
            }
            className="w-full"
          >
            {saved ? "Guardado" : saving ? "Guardando…" : "Registrar peso de hoy"}
          </Button>
        </div>

        {/* Tendencia */}
        <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Tendencia (30 días)</p>
            {trendLabel && (
              <span className={`text-xs font-medium tabular-nums ${trendLabel.color}`}>
                {trendLabel.label}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Icon icon={Loader2} size={20} className="text-text-tertiary animate-spin" />
            </div>
          ) : trend && trend.entries.length > 0 ? (
            <WeightTrendChart
              entries={trend.entries}
              smoothed={trend.smoothed}
              trendKgPerWeek={trend.trendKgPerWeek}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="text-text-tertiary">
                <Icon icon={Scale} size={28} />
              </span>
              <p className="text-text-secondary text-sm">Aún no hay datos suficientes</p>
              <p className="text-text-tertiary text-xs max-w-[240px]">
                Registra tu peso unos días y verás tu tendencia aquí.
              </p>
            </div>
          )}

          {trend && trend.entries.length > 0 && (
            <p className="text-xs text-text-tertiary text-center tabular-nums">
              Adherencia tracking: {adherencePct}%
            </p>
          )}
        </div>

        {/* Historial */}
        {!loading && entries.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary px-1 pb-2">Historial</p>
            <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden divide-y divide-border">
              {[...entries].reverse().slice(0, 30).map((e) => (
                <div key={e.date} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-text-secondary tabular-nums">{e.date}</span>
                  <span className="text-sm text-text-primary font-medium tabular-nums">
                    {e.weightKg.toFixed(1)} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
