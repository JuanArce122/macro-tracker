"use client";

import { ShieldCheck, Users } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Props = {
  /** Si tiene fecha → es un alimento verificado (USDA o admin) */
  verifiedAt: Date | string | null;
  /** Total de votos comunitarios — informativo para no-verificados */
  voteCount?: number;
  /** Si se proporciona, sobreescribe el comportamiento por defecto */
  className?: string;
};

/**
 * Badge que distingue alimentos verificados (USDA + curados) de
 * alimentos comunitarios (Open Food Facts + creados por usuarios).
 *
 * Verificado → ShieldCheck verde (macro-protein).
 * Comunidad  → Users gris con count opcional.
 */
export default function FoodBadge({ verifiedAt, voteCount = 0, className }: Props) {
  if (verifiedAt) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-macro-protein font-medium ${className ?? ""}`}
        title="Verificado por nuestro equipo"
        aria-label="Alimento verificado"
      >
        <Icon icon={ShieldCheck} size={11} />
        Verificado
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-text-tertiary font-medium ${className ?? ""}`}
      title="Alimento comunitario — verifica los datos antes de usarlo seguido"
      aria-label="Alimento comunitario"
    >
      <Icon icon={Users} size={11} />
      Comunidad{voteCount > 0 ? ` · ${voteCount}` : ""}
    </span>
  );
}
