"use client";

import { useRouter } from "next/navigation";
import { Leaf, Camera, Search, BarChart3, Target, Download, Mail, Lock } from "lucide-react";
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
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 dark:text-gray-500 p-1 -ml-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Sobre la app</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-10 flex flex-col gap-6">
        {/* Logo + nombre */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center shadow-md text-white">
            <Icon icon={Leaf} size={36} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Macro Tracker</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Versión {VERSION}</p>
          </div>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 max-w-[260px] leading-relaxed">
            Registra tus macros diarios con IA. Fotografia tu plato y obtén el desglose nutricional al instante.
          </p>
        </div>

        {/* Funcionalidades */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">¿Qué puedes hacer?</p>
          {FEATURES.map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0">
                <Icon icon={icon} size={18} />
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
          <a
            href="mailto:jarceandrade@gmail.com?subject=Macro Tracker — Feedback"
            className="flex items-center gap-3.5 px-4 py-3.5 active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
          >
            <span className="w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Icon icon={Mail} size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Enviar feedback</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ideas, errores o sugerencias</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <span className="w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Icon icon={Lock} size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Privacidad</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Tus datos nunca se comparten con terceros</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
