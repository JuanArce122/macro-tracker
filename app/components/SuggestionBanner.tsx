"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, X, Loader2, Check } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

type SuggestResponse =
  | {
      shouldSuggest: true;
      currentGoal: { calories: number; protein: number; carbs: number; fat: number };
      suggestedGoal: { calories: number; protein: number; carbs: number; fat: number };
      reason: string;
      message: string;
      trendKgPerWeek: number;
      adherence: number;
    }
  | { shouldSuggest: false };

const DISMISS_KEY_PREFIX = "macros-suggestion-dismissed-";

/**
 * Banner que aparece en el home cuando la app sugiere ajustar las metas
 * y el modo de ajuste del usuario es "suggested" (HU-05).
 *
 * El componente se monta siempre pero:
 *   - Solo hace fetch si adjustmentMode === "suggested"
 *   - Si shouldSuggest === false → no renderiza nada
 *   - Si el usuario lo descartó hoy → no renderiza (localStorage)
 */
/** Lee de localStorage si ya descartó la sugerencia hoy. SSR-safe. */
function readDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().split("T")[0];
  return !!window.localStorage.getItem(`${DISMISS_KEY_PREFIX}${today}`);
}

export default function SuggestionBanner({ adjustmentMode }: { adjustmentMode: string }) {
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  // Inicializamos con lazy initializer para no hacer setState sync en el
  // effect (react-hooks/set-state-in-effect). En SSR siempre será false;
  // en cliente leemos localStorage en el primer render.
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissedToday());
  const router = useRouter();

  // Solo fetch si el modo es "suggested" Y no descartado hoy.
  // Los setState aquí son en callbacks de .then/.catch (no sync body
  // del effect), así que no rompen react-hooks/set-state-in-effect.
  useEffect(() => {
    if (adjustmentMode !== "suggested" || dismissed) return;

    let cancelled = false;
    fetch("/api/goals/suggest", { method: "POST" })
      .then((r) => r.ok ? r.json() : { shouldSuggest: false })
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ shouldSuggest: false }); });

    return () => { cancelled = true; };
  }, [adjustmentMode, dismissed]);

  // Loading derivado: si el modo lo amerita y aún no hay respuesta del
  // server, estamos cargando.
  const loading = adjustmentMode === "suggested" && !dismissed && data === null;

  if (adjustmentMode !== "suggested" || dismissed || loading || !data || !data.shouldSuggest) {
    return null;
  }

  const { currentGoal, suggestedGoal, message, trendKgPerWeek } = data;
  const calorieDelta = suggestedGoal.calories - currentGoal.calories;
  const sign = calorieDelta > 0 ? "+" : "";

  function dismiss() {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      window.localStorage.setItem(`${DISMISS_KEY_PREFIX}${today}`, "1");
    }
    setDismissed(true);
  }

  async function apply() {
    setApplying(true);
    try {
      const res = await fetch("/api/goals/apply-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "suggested" }),
      });
      if (!res.ok) throw new Error();
      setApplied(true);
      // Refrescar la vista: MacroSummary (server component) debe mostrar la meta
      // nueva, no la vieja (F11).
      router.refresh();
      // Después de 2s, ocultamos el banner
      setTimeout(() => setDismissed(true), 2000);
    } catch {
      // Si falla, mantenemos el banner para que el usuario reintente
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-5 mx-4 my-3 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-accent-warm flex-shrink-0 mt-0.5">
          <Icon icon={Lightbulb} size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">Sugerencia de ajuste</p>
            <button
              onClick={dismiss}
              aria-label="Descartar sugerencia"
              className="text-text-tertiary active:text-text-primary p-1 -m-1"
            >
              <Icon icon={X} size={16} />
            </button>
          </div>
          <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{message}</p>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs tabular-nums">
            <div>
              <p className="text-text-tertiary">Meta actual</p>
              <p className="text-text-primary">
                <span className="font-numbers tracking-[0.01em]">{currentGoal.calories}</span> kcal
              </p>
            </div>
            <div>
              <p className="text-text-tertiary">Sugerencia</p>
              <p className="text-text-primary">
                <span className="font-numbers tracking-[0.01em]">{suggestedGoal.calories}</span> kcal
                <span className="text-text-tertiary ml-1">
                  (<span className="font-numbers tracking-[0.01em]">{sign}{calorieDelta}</span>)
                </span>
              </p>
            </div>
          </div>

          <p className="text-[10px] text-text-tertiary mt-2 tabular-nums">
            Tendencia: <span className="font-numbers tracking-[0.01em]">{trendKgPerWeek > 0 ? "+" : ""}{trendKgPerWeek.toFixed(2)}</span> kg/sem
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={apply}
          disabled={applying || applied}
          leadingIcon={
            applied ? <Icon icon={Check} size={14} /> :
            applying ? <Icon icon={Loader2} size={14} className="animate-spin" /> :
            undefined
          }
          className="flex-1"
        >
          {applied ? "Aplicada" : applying ? "Aplicando…" : "Aplicar ajuste"}
        </Button>
        <Button variant="secondary" onClick={dismiss} className="flex-1">
          Más tarde
        </Button>
      </div>
    </div>
  );
}
