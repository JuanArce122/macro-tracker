"use client";

import { useRef, useState } from "react";

export type MealItem = {
  nombre: string;
  unidades: number;
  pesoG: number;
  calorias: number;
  proteina: number;
  carbs: number;
  grasa: number;
  confianza: number;
};

export type AnalysisResult = {
  nombrePlato: string;
  items: MealItem[];
  imageBase64: string;
  mimeType: string;
  imagePreviewUrl: string;
};

type Props = {
  onResult: (result: AnalysisResult) => void;
  onBack: () => void;
};

export default function StepCamera({ onResult, onBack }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewUrl(dataUrl);
      // Separar el prefijo para quedarnos solo con el base64 puro
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setMimeType(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Error al analizar la imagen. Intenta de nuevo.");
        return;
      }

      onResult({
        nombrePlato: data.nombre_plato,
        items: data.items.map((item: { nombre: string; unidades: number; peso_g: number; calorias: number; proteina_g: number; carbs_g: number; grasa_g: number; confianza: number }) => ({
          nombre: item.nombre,
          unidades: item.unidades ?? 1,
          pesoG: item.peso_g,
          calorias: item.calorias,
          proteina: item.proteina_g,
          carbs: item.carbs_g,
          grasa: item.grasa_g,
          confianza: item.confianza,
        })),
        imageBase64,
        mimeType,
        imagePreviewUrl: previewUrl!,
      });
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 text-sm mb-6 -ml-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Atrás
      </button>

      <h1 className="text-xl font-bold text-gray-800 mb-6">Foto con IA</h1>

      {/* Inputs ocultos */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <div className="relative mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-h-64 object-cover rounded-2xl"
          />
          <button
            onClick={() => {
              setPreviewUrl(null);
              setImageBase64("");
              if (cameraRef.current) cameraRef.current.value = "";
              if (galleryRef.current) galleryRef.current.value = "";
            }}
            className="absolute top-2 right-2 bg-black/40 text-white rounded-full p-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 h-36 bg-white border border-gray-100 rounded-2xl shadow-sm active:bg-gray-50 transition-colors"
          >
            <span className="text-4xl">📷</span>
            <span className="text-sm font-semibold text-gray-700">Cámara</span>
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 h-36 bg-white border border-gray-100 rounded-2xl shadow-sm active:bg-gray-50 transition-colors"
          >
            <span className="text-4xl">🖼️</span>
            <span className="text-sm font-semibold text-gray-700">Librería</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!imageBase64 || loading}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors mt-auto"
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analizando con IA…
          </>
        ) : (
          <>✨ Analizar con IA</>
        )}
      </button>
    </div>
  );
}
