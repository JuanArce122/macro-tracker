"use client";

type Props = {
  onSelect: (mode: "camera" | "search") => void;
  onBack: () => void;
};

export default function StepMode({ onSelect, onBack }: Props) {
  return (
    <div className="flex flex-col flex-1 p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 text-sm mb-6 -ml-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Cancelar
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">Agregar comida</h1>
      <p className="text-gray-400 text-sm mb-8">¿Cómo quieres registrarla?</p>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => onSelect("camera")}
          className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors text-left"
        >
          <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">📷</span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Foto con IA</p>
            <p className="text-sm text-gray-400 mt-0.5">Toma una foto y Gemini estima los macros automáticamente</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => onSelect("search")}
          className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors text-left"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🔍</span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Buscar alimento</p>
            <p className="text-sm text-gray-400 mt-0.5">Escribe el nombre e ingresa el peso para calcular los macros exactos</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
