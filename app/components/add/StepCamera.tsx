"use client";

import { useRef, useState, useEffect } from "react";

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
  onSwitchToSearch?: () => void;
  initialFile?: File;
};

// Normaliza orientación (EXIF) y redimensiona vía canvas
function normalizeImage(file: File): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ dataUrl, base64: dataUrl.split(",")[1] });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export default function StepCamera({ onResult, onBack, onSwitchToSearch, initialFile }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Si llega una foto pre-seleccionada, procesarla directamente
  useEffect(() => {
    if (!initialFile) return;
    if (initialFile.size > 15 * 1024 * 1024) {
      setError("La imagen es demasiado grande (máx. 15 MB). Elige otra.");
      return;
    }
    setProcessing(true);
    setError(null);
    normalizeImage(initialFile)
      .then(({ dataUrl, base64 }) => {
        setPreviewUrl(dataUrl);
        setImageBase64(base64);
      })
      .catch(() => setError("No se pudo leer la imagen. Intenta con otra."))
      .finally(() => setProcessing(false));
  }, [initialFile]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("La imagen es demasiado grande (máx. 15 MB). Elige otra.");
      return;
    }

    setError(null);

    try {
      const { dataUrl, base64 } = await normalizeImage(file);
      setPreviewUrl(dataUrl);
      setImageBase64(base64);
    } catch {
      setError("No se pudo leer la imagen. Intenta con otra.");
    }
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
        items: data.items.map((item: {
          nombre: string; unidades: number; peso_g: number;
          calorias: number; proteina_g: number; carbs_g: number; grasa_g: number; confianza: number;
        }) => ({
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

  function handleManualFallback() {
    onResult({
      nombrePlato: "",
      items: [],
      imageBase64,
      mimeType,
      imagePreviewUrl: previewUrl ?? "",
    });
  }

  function clearPhoto() {
    setPreviewUrl(null);
    setImageBase64("");
    setError(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  return (
    <div className="flex flex-col flex-1 p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-sm mb-6 -ml-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Atrás
      </button>

      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Foto con IA</h1>

      {/* Inputs ocultos — solo usados si no hay initialFile */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Estado: procesando foto inicial */}
      {processing && (
        <div className="flex items-center justify-center h-36 mb-4">
          <svg className="w-7 h-7 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}

      {/* Preview de la foto */}
      {!processing && previewUrl && (
        <div className="relative mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-cover rounded-2xl" />
          <button
            onClick={clearPhoto}
            className="absolute top-2 right-2 bg-black/40 text-white rounded-full p-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Selector cámara/galería — solo si no hay foto y no hay initialFile */}
      {!processing && !previewUrl && !initialFile && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 h-36 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
          >
            <span className="text-4xl">📷</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cámara</span>
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 h-36 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
          >
            <span className="text-4xl">🖼️</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Librería</span>
          </button>
        </div>
      )}

      {/* Errores */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl p-4 mb-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <p className="text-red-600 dark:text-red-400 text-sm leading-snug">{error}</p>
          </div>
          {imageBase64 && (
            <div className="flex flex-col gap-2 border-t border-red-100 dark:border-red-900/40 pt-3">
              <p className="text-xs text-red-500 dark:text-red-400 font-medium">¿Qué quieres hacer?</p>
              {onSwitchToSearch && (
                <button
                  onClick={onSwitchToSearch}
                  className="flex items-center gap-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl px-3 py-2.5 active:bg-emerald-600 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Usar búsqueda manual
                </button>
              )}
              <button
                onClick={handleManualFallback}
                className="flex items-center gap-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl px-3 py-2.5 active:bg-red-50 dark:active:bg-red-900/20 transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Ingresar macros manualmente
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!imageBase64 || loading || processing}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors mt-auto"
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
