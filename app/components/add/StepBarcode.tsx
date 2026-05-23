"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Barcode, ChevronLeft, AlertTriangle, Loader2, X } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import type { AnalysisResult } from "./StepCamera";

type Props = {
  /** Llamado cuando el usuario escanea y el producto se identifica en DB u OFF */
  onResult: (result: AnalysisResult) => void;
  /** Llamado cuando OFF no encuentra el producto — el padre puede ofrecer creación manual */
  onNotFound: (barcode: string) => void;
  /** Volver al paso anterior (StepSearch) */
  onBack: () => void;
};

/**
 * Estado interno del scanner (HU-03).
 *
 * - idle:      esperando permiso o cámara
 * - scanning:  cámara activa, esperando lectura
 * - looking:   código detectado, consultando endpoint
 * - notfound:  endpoint retornó 404 (el padre decide el siguiente paso)
 * - error:     error irrecuperable (permiso denegado, no cámara, fetch falló)
 */
type ScannerState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "looking"; barcode: string }
  | { phase: "notfound"; barcode: string }
  | { phase: "error"; message: string };

/**
 * Formatos a buscar. Limitamos a EAN/UPC/Code128 (los usados en productos
 * empacados) para mejorar la tasa de detección y reducir falsos positivos.
 */
const ENABLED_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];

/**
 * Convierte el food del backend a un AnalysisResult con un solo ítem (100g).
 * El usuario podrá editar el peso en StepConfirm como con cualquier otro alimento.
 */
function foodToAnalysisResult(food: {
  nombre: string;
  cal: number;
  p: number;
  c: number;
  f: number;
}): AnalysisResult {
  return {
    nombrePlato: food.nombre,
    items: [
      {
        nombre: food.nombre,
        unidades: 1,
        pesoG: 100,
        calorias: food.cal,
        proteina: food.p,
        carbs: food.c,
        grasa: food.f,
        confianza: 1.0,
      },
    ],
    imageBase64: "",
    mimeType: "",
    imagePreviewUrl: "",
  };
}

export default function StepBarcode({ onResult, onNotFound, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [state, setState] = useState<ScannerState>({ phase: "idle" });

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, ENABLED_FORMATS);
    const reader = new BrowserMultiFormatReader(hints);
    let cancelled = false;

    async function start() {
      try {
        if (!videoRef.current) return;
        setState({ phase: "scanning" });

        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined, // device id — undefined = "elige el mejor"
          videoRef.current,
          (result, _err, controls) => {
            if (cancelled) {
              controls.stop();
              return;
            }
            if (!result) return;

            const barcode = result.getText();
            // Detener inmediatamente para evitar lecturas repetidas
            controls.stop();
            setState({ phase: "looking", barcode });
            void lookupBarcode(barcode);
          }
        );
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "No se pudo abrir la cámara";
        if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setState({ phase: "error", message: "Permiso de cámara denegado. Permítelo en los ajustes del navegador." });
        } else {
          setState({ phase: "error", message: "No se pudo abrir la cámara. Verifica que tu dispositivo tenga una." });
        }
      }
    }

    async function lookupBarcode(barcode: string) {
      try {
        const res = await fetch(`/api/foods/barcode/${encodeURIComponent(barcode)}`);
        if (cancelled) return;

        if (res.ok) {
          const { food } = await res.json();
          onResult(foodToAnalysisResult(food));
          return;
        }

        if (res.status === 404) {
          setState({ phase: "notfound", barcode });
          return;
        }

        if (res.status === 400) {
          setState({ phase: "error", message: "Código de barras inválido. Intenta otro producto." });
          return;
        }

        setState({ phase: "error", message: "Error al consultar el producto. Intenta de nuevo." });
      } catch {
        if (cancelled) return;
        setState({ phase: "error", message: "Sin conexión. Intenta de nuevo cuando estés en línea." });
      }
    }

    void start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // onResult/onNotFound son stable en práctica, no queremos restart del scanner

  return (
    <div className="flex flex-col flex-1 bg-bg-primary relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-7 pb-4 z-10">
        <button
          onClick={onBack}
          className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]"
          aria-label="Volver"
        >
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-display text-2xl tracking-[-0.02em] font-medium text-text-primary">Escanear código</h1>
        <button onClick={onBack} className="w-7 opacity-0" aria-hidden="true" tabIndex={-1}>
          <Icon icon={X} size={20} />
        </button>
      </div>

      {/* Área de cámara */}
      <div className="relative mx-4 rounded-2xl overflow-hidden bg-bg-tertiary aspect-[3/4] max-h-[60vh]">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Marco de escaneo (overlay decorativo) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-4/5 h-24 border-2 border-white/80 rounded-xl">
            {/* Línea horizontal central, sugiere "alinea el código aquí" */}
            <div className="absolute top-1/2 left-2 right-2 h-px bg-accent-warm/60" />
          </div>
        </div>

        {/* Estado looking — overlay con loader */}
        {state.phase === "looking" && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
            <Icon icon={Loader2} size={32} className="text-white animate-spin" />
            <p className="text-white text-sm tabular-nums">Buscando {state.barcode}…</p>
          </div>
        )}
      </div>

      {/* Mensaje inferior según estado */}
      <div className="px-5 pt-4 pb-6 flex flex-col gap-3">
        {state.phase === "idle" && (
          <p className="text-text-tertiary text-sm text-center">Inicializando cámara…</p>
        )}
        {state.phase === "scanning" && (
          <p className="text-text-tertiary text-sm text-center inline-flex items-center justify-center gap-2">
            <Icon icon={Barcode} size={16} />
            Apunta al código de barras del producto
          </p>
        )}
        {state.phase === "notfound" && (
          <div className="bg-bg-secondary border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-accent-warm flex-shrink-0 mt-0.5">
                <Icon icon={AlertTriangle} size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium">Producto no encontrado</p>
                <p className="text-text-tertiary text-xs mt-1 tabular-nums">
                  No hay datos para el código <span className="text-text-secondary">{state.barcode}</span>. Puedes crearlo manualmente o usar la búsqueda.
                </p>
              </div>
            </div>
            <Button variant="primary" onClick={() => onNotFound(state.barcode)} className="w-full">
              Crear alimento manualmente
            </Button>
            <Button variant="secondary" onClick={onBack} className="w-full">
              Volver a buscar
            </Button>
          </div>
        )}
        {state.phase === "error" && (
          <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-start gap-2.5">
            <span className="text-accent-warm flex-shrink-0 mt-0.5">
              <Icon icon={AlertTriangle} size={18} />
            </span>
            <div className="flex-1">
              <p className="text-text-primary text-sm">{state.message}</p>
              <button
                onClick={onBack}
                className="text-text-tertiary underline text-xs mt-2 active:text-text-primary"
              >
                Volver a la búsqueda
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
