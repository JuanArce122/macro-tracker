"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, Image as ImageIcon, AlertTriangle, Sparkles, ChevronLeft, X, Search, Pencil, Loader2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import CameraGuide from "./CameraGuide";

export type MealItem = {
  nombre: string;
  unidades: number;
  pesoG: number;
  calorias: number;
  proteina: number;
  carbs: number;
  grasa: number;
  confianza: number;
  // HU-07: id del Food de la DB cuando el ítem viene de búsqueda/barcode/voz.
  // Permite que el server tome snapshot de micros (se envía si el meal es de
  // un solo alimento). Ausente en items del análisis por foto.
  foodId?: number;
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

  // Validación derivada del prop: si el archivo inicial es demasiado
  // grande, mostramos el error directamente sin pasar por state.
  const initialFileTooLarge = !!initialFile && initialFile.size > 15 * 1024 * 1024;

  // Error a mostrar: el de tamaño tiene prioridad (derivado del prop);
  // los demás vienen del state (normalización async, fetch a Gemini, etc.).
  const displayError = initialFileTooLarge
    ? "La imagen es demasiado grande (máx. 15 MB). Elige otra."
    : error;

  // Procesando: tenemos foto inicial, aún sin preview ni error. Sin state.
  const processing = !!initialFile && !previewUrl && !displayError;

  // Procesado async de la foto pre-seleccionada. Sin setState sync en el
  // body del efecto: solo en los callbacks de .then/.catch.
  useEffect(() => {
    if (!initialFile || initialFileTooLarge) return;

    let cancelled = false;
    normalizeImage(initialFile)
      .then(({ dataUrl, base64 }) => {
        if (cancelled) return;
        setPreviewUrl(dataUrl);
        setImageBase64(base64);
      })
      .catch(() => {
        if (cancelled) return;
        setError("No se pudo leer la imagen. Intenta con otra.");
      });

    return () => { cancelled = true; };
  }, [initialFile, initialFileTooLarge]);

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
    <div className="flex flex-col flex-1 p-5 bg-bg-primary">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-text-tertiary active:text-text-primary text-sm mb-6 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]"
      >
        <Icon icon={ChevronLeft} size={16} />
        Atrás
      </button>

      <h1 className="font-display text-3xl tracking-[-0.02em] font-medium text-text-primary mb-8">Foto con IA</h1>

      {/* Inputs ocultos — solo usados si no hay initialFile */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Estado: procesando foto inicial */}
      {processing && (
        <div className="flex items-center justify-center h-36 mb-4">
          <Icon icon={Loader2} size={28} className="text-accent-primary animate-spin" />
        </div>
      )}

      {/* Preview de la foto (con guía de encuadre superpuesta — HU-01) */}
      {!processing && previewUrl && (
        <div className="relative mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-cover rounded-xl" />
          <CameraGuide />
          <button
            onClick={clearPhoto}
            className="absolute top-2 right-2 bg-black/40 text-white rounded-full p-1.5 z-10"
            aria-label="Quitar foto"
          >
            <Icon icon={X} size={16} />
          </button>
        </div>
      )}

      {/* Selector cámara/galería — solo si no hay foto y no hay initialFile */}
      {!processing && !previewUrl && !initialFile && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 h-36 bg-bg-secondary border border-border rounded-xl active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)] text-text-primary"
          >
            <Icon icon={Camera} size={32} />
            <span className="text-sm font-medium">Cámara</span>
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 h-36 bg-bg-secondary border border-border rounded-xl active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)] text-text-primary"
          >
            <Icon icon={ImageIcon} size={32} />
            <span className="text-sm font-medium">Librería</span>
          </button>
        </div>
      )}

      {/* Errores */}
      {displayError && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 mb-4 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-accent-warm flex-shrink-0 mt-0.5">
              <Icon icon={AlertTriangle} size={18} />
            </span>
            <p className="text-text-primary text-sm leading-snug">{displayError}</p>
          </div>
          {imageBase64 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">¿Qué quieres hacer?</p>
              {onSwitchToSearch && (
                <Button
                  variant="primary"
                  onClick={onSwitchToSearch}
                  leadingIcon={<Icon icon={Search} size={16} />}
                  className="justify-start"
                >
                  Usar búsqueda manual
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleManualFallback}
                leadingIcon={<Icon icon={Pencil} size={16} />}
                className="justify-start"
              >
                Ingresar macros manualmente
              </Button>
            </div>
          )}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        onClick={handleAnalyze}
        disabled={!imageBase64 || loading || processing}
        leadingIcon={loading ? <Icon icon={Loader2} size={18} className="animate-spin" /> : <Icon icon={Sparkles} size={18} />}
        className="w-full mt-auto"
      >
        {loading ? "Analizando con IA…" : "Analizar con IA"}
      </Button>
    </div>
  );
}
