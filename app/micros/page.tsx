"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Info } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type MicroDetail = {
  key: string;
  label: string;
  consumed: number;
  target: number;
  rdaMin: number;
  rdaMax: number | null;
  pctOfTarget: number;
  unit: string;
  status: "low" | "ok" | "good" | "over";
};

type DetailsResponse = {
  date: string;
  micros: MicroDetail[];
};

const STATUS_LABEL: Record<MicroDetail["status"], string> = {
  low:  "Bajo",
  ok:   "Cerca",
  good: "Meta",
  over: "Excede",
};

const STATUS_COLOR: Record<MicroDetail["status"], string> = {
  low:  "bg-red-600/80",
  ok:   "bg-accent-warm",
  good: "bg-macro-protein",
  over: "bg-accent-warm",
};

export default function MicrosPage() {
  const router = useRouter();
  const [data, setData] = useState<DetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sin ?date: el servidor usa el "hoy" del usuario (según su zona horaria).
    fetch("/api/micros/details")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DetailsResponse | null) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-text-tertiary active:text-text-primary p-1 -ml-1"
          aria-label="Volver"
        >
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-display text-3xl tracking-[-0.02em] font-medium text-text-primary">Micronutrientes</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-4">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Icon icon={Loader2} size={24} className="text-text-tertiary animate-spin" />
          </div>
        )}

        {!loading && data && (
          <>
            <p className="text-xs text-text-tertiary px-1 leading-relaxed">
              Los valores diarios están basados en USDA Dietary Reference Intakes para adultos.
              Si tienes una condición médica, consulta con tu nutricionista para metas
              personalizadas.
            </p>

            <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden divide-y divide-border">
              {data.micros.map((m) => (
                <div key={m.key} className="px-5 py-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">{m.label}</p>
                    <span
                      className={`text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full font-medium ${
                        m.status === "good"
                          ? "bg-macro-protein/10 text-macro-protein"
                          : m.status === "over"
                          ? "bg-accent-warm/10 text-accent-warm"
                          : m.status === "ok"
                          ? "bg-accent-warm/10 text-accent-warm"
                          : "bg-red-600/10 text-red-600"
                      }`}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs tabular-nums">
                    <span className="text-text-tertiary">
                      <span className="font-numbers tracking-[0.01em]">{m.consumed.toFixed(m.consumed < 10 ? 1 : 0)}</span> {m.unit}
                    </span>
                    <span className="text-text-tertiary">
                      Meta: <span className="font-numbers tracking-[0.01em]">{m.rdaMin.toFixed(0)}</span>
                      {m.rdaMax ? <> · UL <span className="font-numbers tracking-[0.01em]">{m.rdaMax.toFixed(0)}</span></> : null} {m.unit}
                    </span>
                  </div>

                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ease-[var(--ease-editorial)] ${STATUS_COLOR[m.status]}`}
                      style={{ width: `${Math.min(100, m.pctOfTarget)}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-text-tertiary tabular-nums">
                    <span className="font-numbers tracking-[0.01em]">{m.pctOfTarget}</span>% de la meta
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-start gap-3 mt-2">
              <span className="text-text-tertiary flex-shrink-0 mt-0.5">
                <Icon icon={Info} size={16} />
              </span>
              <p className="text-xs text-text-tertiary leading-relaxed">
                Solo contamos micros de alimentos que tienen datos. Si la mayoría aparece en cero,
                es porque tus comidas vienen de fuentes (como fotos con IA) que no incluyen
                micronutrientes. Usa la búsqueda o el barcode para obtener mejores datos.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
