"use client";

import { useEffect, useState } from "react";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Flame,
  Bell,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Insight = {
  id: number;
  type: string;
  title: string;
  body: string;
  data: unknown;
  createdAt: string;
};

type InsightsResponse = {
  items: Insight[];
};

const TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
  trend_calories:  { icon: TrendingUp,   color: "text-accent-warm" },
  adherence:       { icon: Bell,         color: "text-text-secondary" },
  streak:          { icon: Flame,        color: "text-macro-protein" },
  macro_imbalance: { icon: TrendingDown, color: "text-macro-protein" },
};

const DEFAULT_META = { icon: Lightbulb, color: "text-accent-warm" };

/**
 * Insights del usuario en la home (HU-09).
 *
 * Hace fetch UNA vez al montar y muestra el más reciente. El usuario
 * puede descartarlo con X (POST /api/insights/[id]/dismiss).
 *
 * Si no hay activos, el componente no renderiza nada — la UX es opcional,
 * no intrusiva.
 */
export default function InsightCard() {
  const [items, setItems] = useState<Insight[] | null>(null);
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/insights?limit=3")
      .then((r) => (r.ok ? r.json() : ({ items: [] } as InsightsResponse)))
      .then((d: InsightsResponse) => {
        if (!cancelled) setItems(d.items ?? []);
      })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  async function dismiss(id: number, reason: "seen" | "not_useful" = "seen") {
    setDismissingId(id);
    try {
      await fetch(`/api/insights/${id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    } finally {
      setDismissingId(null);
    }
  }

  if (!items || items.length === 0) return null;

  // Mostramos solo el más reciente; los otros quedan disponibles tras dismiss
  const insight = items[0];
  const meta = TYPE_META[insight.type] ?? DEFAULT_META;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-5 mx-4 my-3 relative">
      <button
        onClick={() => dismiss(insight.id, "seen")}
        disabled={dismissingId === insight.id}
        aria-label="Cerrar"
        className="absolute top-3 right-3 text-text-tertiary active:text-text-primary p-1 -m-1 disabled:opacity-40"
      >
        <Icon icon={X} size={16} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className={`flex-shrink-0 mt-0.5 ${meta.color}`}>
          <Icon icon={meta.icon} size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{insight.title}</p>
          <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{insight.body}</p>

          <div className="flex gap-3 mt-3">
            <button
              onClick={() => dismiss(insight.id, "not_useful")}
              disabled={dismissingId === insight.id}
              className="text-xs text-text-tertiary underline active:text-text-primary disabled:opacity-40"
            >
              No me sirve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
