"use client";

import { AlertTriangle } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Props = {
  /** 0..1 — confianza retornada por Gemini (HU-01) */
  confidence: number;
  /** Si true (default) muestra etiqueta Alta/Media/Baja. Si false, solo "Verificar" en bajas. */
  showAll?: boolean;
  className?: string;
};

/**
 * Badge de nivel de confianza para un ítem identificado por IA (HU-01).
 *
 * Modo default (`showAll: true`):
 *   - high (≥ 0.85): "Alta" en macro-protein (verde)
 *   - medium (0.6–0.85): "Media" en macro-fat (amarillo)
 *   - low (< 0.6): "Baja" con AlertTriangle en accent-warm (rojo)
 *
 * Modo compacto (`showAll: false`):
 *   - solo aparece para confianza baja (< 0.6) con texto "Verificar"
 *
 * El borde y el resaltado del card lo hace el padre (StepConfirm).
 */
export default function ConfidenceBadge({ confidence, showAll = true, className }: Props) {
  if (confidence >= 0.85) {
    if (!showAll) return null;
    return (
      <span
        className={`inline-flex items-center text-[10px] uppercase tracking-[0.08em] font-semibold bg-bg-tertiary text-macro-protein px-2 py-0.5 rounded-full ${className ?? ""}`}
        title="La IA identificó este alimento con confianza alta"
        aria-label="Confianza alta"
      >
        Alta
      </span>
    );
  }

  if (confidence >= 0.6) {
    if (!showAll) return null;
    return (
      <span
        className={`inline-flex items-center text-[10px] uppercase tracking-[0.08em] font-semibold bg-bg-tertiary text-macro-fat px-2 py-0.5 rounded-full ${className ?? ""}`}
        title="La IA identificó este alimento con confianza media"
        aria-label="Confianza media"
      >
        Media
      </span>
    );
  }

  // Baja confianza siempre se muestra
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] font-semibold bg-bg-tertiary text-accent-warm px-2 py-0.5 rounded-full ${className ?? ""}`}
      title="La IA tiene baja confianza en este ítem — verifica antes de guardar"
      aria-label="Confianza baja, verifica el ítem"
    >
      <Icon icon={AlertTriangle} size={10} />
      {showAll ? "Baja" : "Verificar"}
    </span>
  );
}
