"use client";

import { Camera, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type Props = {
  onSelect: (mode: "camera" | "search") => void;
  onBack: () => void;
};

export default function StepMode({ onSelect, onBack }: Props) {
  return (
    <div className="flex flex-col flex-1 p-5 bg-bg-primary">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-text-tertiary active:text-text-primary text-sm mb-6 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]"
      >
        <Icon icon={ChevronLeft} size={16} />
        Cancelar
      </button>

      <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary mb-2">Agregar comida</h1>
      <p className="text-sm text-text-tertiary mb-8">¿Cómo quieres registrarla?</p>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => onSelect("camera")}
          className="flex items-center gap-4 p-5 bg-bg-secondary rounded-xl border border-border active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)] text-left"
        >
          <div className="w-14 h-14 bg-bg-tertiary rounded-xl flex items-center justify-center flex-shrink-0 text-text-primary">
            <Icon icon={Camera} size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary">Foto con IA</p>
            <p className="text-sm text-text-tertiary mt-0.5">Toma una foto y Gemini estima los macros automáticamente</p>
          </div>
          <Icon icon={ChevronRight} size={18} className="text-text-tertiary flex-shrink-0" />
        </button>

        <button
          onClick={() => onSelect("search")}
          className="flex items-center gap-4 p-5 bg-bg-secondary rounded-xl border border-border active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)] text-left"
        >
          <div className="w-14 h-14 bg-bg-tertiary rounded-xl flex items-center justify-center flex-shrink-0 text-text-primary">
            <Icon icon={Search} size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary">Buscar alimento</p>
            <p className="text-sm text-text-tertiary mt-0.5">Escribe el nombre e ingresa el peso para calcular los macros exactos</p>
          </div>
          <Icon icon={ChevronRight} size={18} className="text-text-tertiary flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}
