"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type MicroProgress = {
  key: string;
  label: string;
  consumed: number;
  target: number;
  pctOfTarget: number;
  unit: string;
  status: "low" | "ok" | "good" | "over";
};

type Deficit = {
  nutrient: string;
  label: string;
  consecutiveDays: number;
  target: number;
  unit: string;
};

type MicrosResponse = {
  date: string;
  priorityMicros: string[];
  progress: MicroProgress[];
  deficits: Deficit[];
};

const STATUS_COLORS: Record<MicroProgress["status"], string> = {
  low:  "bg-red-600/80",
  ok:   "bg-accent-warm",
  good: "bg-macro-protein",
  over: "bg-accent-warm",
};

/**
 * Card de micros priorizados en home (HU-07).
 *
 * Muestra 3-5 micros priorizados según perfil con barra de progreso.
 * Si hay deficits sostenidos (3+ días), aparece un aviso debajo con CTA.
 *
 * Solo se renderiza cuando hay datos del día (alguna meal con micros).
 */
export default function MicrosCard({ date }: { date: string }) {
  const [data, setData] = useState<MicrosResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/micros/today?date=${encodeURIComponent(date)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MicrosResponse | null) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-5 mx-4 my-3 flex items-center justify-center h-24">
        <Icon icon={Loader2} size={18} className="text-text-tertiary animate-spin" />
      </div>
    );
  }

  if (!data || !data.priorityMicros || data.priorityMicros.length === 0) {
    return null;
  }

  // Filtrar progress al subset prioritario
  const priorityProgress = data.progress.filter((p) => data.priorityMicros.includes(p.key));

  // Si el usuario no ha registrado nada todavía (todo 0), no mostramos
  // para evitar ruido visual.
  const totalConsumed = priorityProgress.reduce((s, p) => s + p.consumed, 0);
  if (totalConsumed === 0) return null;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-5 mx-4 my-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon={Sparkles} size={14} className="text-text-tertiary" />
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Micros clave</p>
        </div>
        <Link
          href="/micros"
          className="text-xs text-text-tertiary underline active:text-text-primary inline-flex items-center gap-1"
        >
          Ver todos
          <Icon icon={ChevronRight} size={12} />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {priorityProgress.map((m) => {
          const pct = Math.min(100, m.pctOfTarget);
          return (
            <div key={m.key} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs tabular-nums">
                <span className="text-text-primary font-medium">{m.label}</span>
                <span className="text-text-tertiary">
                  {m.consumed.toFixed(0)} / {m.target.toFixed(0)} {m.unit}
                </span>
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ease-[var(--ease-editorial)] ${STATUS_COLORS[m.status]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {data.deficits.length > 0 && (
        <div className="bg-bg-primary border border-border rounded-lg p-3 flex items-start gap-2 mt-1">
          <span className="text-accent-warm flex-shrink-0 mt-0.5">
            <Icon icon={AlertTriangle} size={14} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-primary leading-relaxed">
              Llevas{" "}
              {data.deficits.length === 1 ? (
                <>
                  <span className="font-medium">{data.deficits[0].consecutiveDays} días</span>{" "}
                  con <span className="font-medium">{data.deficits[0].label.toLowerCase()}</span> por debajo de tu meta.
                </>
              ) : (
                <>
                  varios días con déficit en {data.deficits.length} micros priorizados.
                </>
              )}{" "}
              <Link href="/micros" className="text-text-secondary underline">
                Ver detalles
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
