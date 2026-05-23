"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, X, ExternalLink } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

type CheckResponse =
  | { signal: null }
  | {
      signal: string;
      title: string;
      body: string;
      suggestHabits: boolean;
    };

const DISMISS_KEY = "macros-safe-use-dismissed";
// Una vez descartado, no volvemos a mostrar el banner durante 14 días.
const DISMISS_TTL_DAYS = 14;

const RESOURCES_CO = {
  acabUrl: "https://acabcolombia.org",
  acabPhone: "+57 318 7770977",
};

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return ageDays < DISMISS_TTL_DAYS;
}

/**
 * Banner de uso seguro (HU-11).
 *
 * Aparece SOLO si el usuario:
 *   - Está en modo "macros" (modo hábitos ya es la mitigación)
 *   - No ha descartado el banner en los últimos 14 días
 *   - Los patrones recientes disparan alguna señal de TCA
 *
 * El banner ofrece:
 *   1. CTA "Probar modo hábitos" → /settings/tracking-mode (si suggestHabits)
 *   2. Link a recurso profesional (ACAB Colombia)
 *   3. Descartar (con TTL 14 días para evitar repetición)
 */
export default function SafeUseBanner({ trackingMode }: { trackingMode: string }) {
  const router = useRouter();
  const [data, setData] = useState<CheckResponse | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  useEffect(() => {
    // No fetch si modo es habits (banner es para usuarios en macros)
    // o si ya descartado en los últimos 14 días
    if (trackingMode === "habits" || dismissed) return;

    let cancelled = false;
    fetch("/api/safe-use/check")
      .then((r) => (r.ok ? r.json() : ({ signal: null } as CheckResponse)))
      .then((d: CheckResponse) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ signal: null }); });
    return () => { cancelled = true; };
  }, [trackingMode, dismissed]);

  if (trackingMode === "habits" || dismissed || !data || !data.signal) {
    return null;
  }

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDismissed(true);
  }

  function tryHabitsMode() {
    router.push("/settings/tracking-mode");
  }

  if (data.signal === null) return null;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-5 mx-4 my-3 relative">
      <button
        onClick={dismiss}
        aria-label="Descartar mensaje"
        className="absolute top-3 right-3 text-text-tertiary active:text-text-primary p-1 -m-1"
      >
        <Icon icon={X} size={16} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="text-accent-warm flex-shrink-0 mt-0.5">
          <Icon icon={Heart} size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{data.title}</p>
          <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{data.body}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-3">
        {data.suggestHabits && (
          <Button variant="primary" onClick={tryHabitsMode} className="w-full">
            Probar modo hábitos
          </Button>
        )}
        <a
          href={RESOURCES_CO.acabUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 text-xs text-text-tertiary underline active:text-text-primary py-2"
        >
          Recursos profesionales — ACAB Colombia
          <Icon icon={ExternalLink} size={12} />
        </a>
      </div>
    </div>
  );
}
