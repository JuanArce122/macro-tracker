"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Props = {
  foodId: number;
  initialScore: number;
  /** Voto actual del usuario: -1, 0 (sin voto), o +1 */
  initialUserVote: -1 | 0 | 1;
  /** Si es true, los botones se renderizan disabled (alimentos verificados no se votan) */
  disabled?: boolean;
};

/**
 * Botones +/- de voto comunitario para un alimento (HU-04).
 *
 * - Click en el voto actual del usuario → retracta (DELETE)
 * - Click en el voto contrario → cambia (POST flip)
 * - Click sin voto previo → crea (POST)
 *
 * Optimistic update: ajustamos el score local antes de la respuesta del
 * server. Si el fetch falla, revertimos.
 */
export default function FoodVoteButton({
  foodId,
  initialScore,
  initialUserVote,
  disabled,
}: Props) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(initialUserVote);
  const [busy, setBusy] = useState(false);

  async function castVote(direction: 1 | -1) {
    if (disabled || busy) return;

    const isRetracting = userVote === direction;
    const nextVote: -1 | 0 | 1 = isRetracting ? 0 : direction;
    const delta = nextVote - userVote;

    // Optimistic
    const prevScore = score;
    const prevVote = userVote;
    setScore(score + delta);
    setUserVote(nextVote);
    setBusy(true);

    try {
      const url = `/api/foods/${foodId}/vote`;
      const res = isRetracting
        ? await fetch(url, { method: "DELETE" })
        : await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vote: nextVote }),
          });

      if (!res.ok) throw new Error("vote failed");

      const data = (await res.json()) as { voteScore: number };
      // Sincronizar con el servidor (puede haber diferencia por votos concurrentes)
      setScore(data.voteScore);
    } catch {
      // Revertir
      setScore(prevScore);
      setUserVote(prevVote);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-0.5" role="group" aria-label="Voto comunitario">
      <button
        onClick={(e) => { e.stopPropagation(); castVote(1); }}
        disabled={disabled || busy}
        aria-label="Voto positivo"
        aria-pressed={userVote === 1}
        className={`w-6 h-6 inline-flex items-center justify-center rounded transition-colors duration-150 ${
          userVote === 1
            ? "text-macro-protein"
            : "text-text-tertiary active:text-text-primary"
        } disabled:opacity-40`}
      >
        <Icon icon={ChevronUp} size={14} />
      </button>
      <span className="text-xs tabular-nums w-6 text-center text-text-secondary">
        {score}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); castVote(-1); }}
        disabled={disabled || busy}
        aria-label="Voto negativo"
        aria-pressed={userVote === -1}
        className={`w-6 h-6 inline-flex items-center justify-center rounded transition-colors duration-150 ${
          userVote === -1
            ? "text-accent-warm"
            : "text-text-tertiary active:text-text-primary"
        } disabled:opacity-40`}
      >
        <Icon icon={ChevronDown} size={14} />
      </button>
    </div>
  );
}
