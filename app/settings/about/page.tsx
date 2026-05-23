"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Search, BarChart3, Target, Download, Mail, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

const VERSION = "1.0.0";

const FEATURES = [
  { icon: Camera,    text: "Fotografía comidas y obtén macros con IA" },
  { icon: Search,    text: "Busca en una base de datos de miles de alimentos" },
  { icon: BarChart3, text: "Visualiza tu progreso diario e historial" },
  { icon: Target,    text: "Configura metas de calorías y macros personalizadas" },
  { icon: Download,  text: "Exporta tu historial en CSV" },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]">
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-display text-3xl tracking-[-0.02em] font-medium text-text-primary">Sobre la app</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-10 flex flex-col gap-6">
        {/* Logo + nombre */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <Image
            src="/icon.svg"
            alt="Macro Tracker"
            width={80}
            height={80}
            className="w-20 h-20"
          />
          <div className="text-center">
            <h2 className="font-display text-2xl tracking-[-0.02em] font-medium text-text-primary">Macro Tracker</h2>
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mt-1">Versión {VERSION}</p>
          </div>
          <p className="text-sm text-center text-text-secondary max-w-[280px] leading-relaxed">
            Registra tus macros diarios con IA. Fotografía tu plato y obtén el desglose nutricional al instante.
          </p>
        </div>

        {/* Funcionalidades */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-1">¿Qué puedes hacer?</p>
          {FEATURES.map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-text-secondary mt-0.5 flex-shrink-0">
                <Icon icon={icon} size={18} />
              </span>
              <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden divide-y divide-border">
          <a
            href="mailto:jarceandrade@gmail.com?subject=Macro Tracker — Feedback"
            className="flex items-center gap-3.5 px-5 py-4 active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
          >
            <span className="w-8 flex items-center justify-center text-text-secondary flex-shrink-0">
              <Icon icon={Mail} size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">Enviar feedback</p>
              <p className="text-xs text-text-tertiary mt-0.5">Ideas, errores o sugerencias</p>
            </div>
            <span className="text-text-tertiary flex-shrink-0">
              <Icon icon={ChevronRight} size={18} />
            </span>
          </a>

          <div className="flex items-center gap-3.5 px-5 py-4">
            <span className="w-8 flex items-center justify-center text-text-secondary flex-shrink-0">
              <Icon icon={Lock} size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">Privacidad</p>
              <p className="text-xs text-text-tertiary mt-0.5">Tus datos nunca se comparten con terceros</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
