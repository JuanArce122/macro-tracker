"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, ChevronLeft, AlertTriangle, Loader2, Sparkles,
} from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import type { AnalysisResult, MealItem } from "./StepCamera";
import type { MatchedVoiceItem } from "@/lib/voice/match-foods";

// ─── Tipos Web Speech API (no incluidos en lib.dom.d.ts) ──────────────

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: { [index: number]: SpeechRecognitionResult; length: number };
};
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type Props = {
  onResult: (result: AnalysisResult) => void;
  onBack: () => void;
};

/**
 * Convierte items matcheados a AnalysisResult para que StepConfirm los
 * muestre como cualquier otro flujo de captura.
 */
function matchedToAnalysisResult(items: MatchedVoiceItem[], transcript: string): AnalysisResult {
  const mealItems: MealItem[] = items.map((it) => ({
    nombre: it.nombre,
    unidades: it.unidad === "unidad" ? Math.round(it.cantidad) : 1,
    pesoG: it.weightG,
    calorias: it.calorias,
    proteina: it.proteina,
    carbs: it.carbs,
    grasa: it.grasa,
    confianza: it.confianza,
  }));

  return {
    nombrePlato: transcript.slice(0, 80),
    items: mealItems,
    imageBase64: "",
    mimeType: "",
    imagePreviewUrl: "",
  };
}

/**
 * Componente de captura por voz (HU-02). Usa Web Speech API con lang=es-CO.
 *
 * Estado finito:
 *   - idle:       sin haber grabado todavía
 *   - recording:  grabando + transcript en vivo
 *   - parsing:    enviado a /api/parse-voice
 *   - error:      error irrecuperable (sin soporte, permiso denegado, etc.)
 */
type State =
  | { phase: "idle" }
  | { phase: "recording" }
  | { phase: "parsing" }
  | { phase: "error"; message: string };

/**
 * Lazy initializer: detecta soporte Web Speech sin disparar setState
 * sync en el effect (react-hooks/set-state-in-effect).
 */
function detectSpeechSupport(): boolean {
  if (typeof window === "undefined") return true; // SSR: asumimos OK
  type WindowWithSpeech = typeof window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  const w = window as WindowWithSpeech;
  return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

export default function StepVoice({ onResult, onBack }: Props) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  // Lazy initializer evita setState sync en el effect
  const [supported] = useState<boolean>(() => detectSpeechSupport());
  const unsupported = !supported;

  useEffect(() => {
    if (unsupported) return;

    type WindowWithSpeech = typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const w = window as WindowWithSpeech;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "es-CO"; // D6
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) setTranscript((t) => (t + " " + finalText).trim());
      setInterim(interimText);
    };

    recognition.onerror = (e) => {
      const err = (e.error ?? "").toString();
      if (err === "not-allowed" || err === "service-not-allowed") {
        setState({ phase: "error", message: "Permiso de micrófono denegado. Permítelo en los ajustes del navegador." });
      } else if (err === "no-speech") {
        setState({ phase: "idle" });
      } else {
        setState({ phase: "error", message: "Error al escuchar. Intenta de nuevo." });
      }
    };

    recognition.onend = () => {
      setState((curr) => (curr.phase === "recording" ? { phase: "idle" } : curr));
      setInterim("");
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch { /* no-op */ }
    };
  }, [unsupported]);

  function startRecording() {
    if (!recognitionRef.current) return;
    setTranscript("");
    setInterim("");
    setState({ phase: "recording" });
    try {
      recognitionRef.current.start();
    } catch {
      setState({ phase: "error", message: "No se pudo iniciar la grabación." });
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setState({ phase: "idle" });
  }

  async function handleProcess() {
    if (!transcript.trim()) return;
    setState({ phase: "parsing" });
    try {
      const res = await fetch("/api/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        setState({
          phase: "error",
          message: data.error ?? "No se pudo procesar el dictado. Intenta más despacio o usa la búsqueda.",
        });
        return;
      }
      const data = (await res.json()) as { items: MatchedVoiceItem[]; transcript: string; message?: string };
      if (data.items.length === 0) {
        setState({
          phase: "error",
          message: data.message ?? "No detectamos alimentos. Intenta ser más específico.",
        });
        return;
      }
      onResult(matchedToAnalysisResult(data.items, data.transcript));
    } catch {
      setState({ phase: "error", message: "Sin conexión. Intenta de nuevo cuando estés en línea." });
    }
  }

  const recording = state.phase === "recording";
  const parsing = state.phase === "parsing";

  if (unsupported) {
    return (
      <div className="flex flex-col flex-1 p-5 bg-bg-primary">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-text-tertiary active:text-text-primary text-sm mb-6"
        >
          <Icon icon={ChevronLeft} size={16} />
          Atrás
        </button>
        <h1 className="font-display text-3xl tracking-[-0.02em] font-medium text-text-primary mb-4">Registro por voz</h1>
        <div className="bg-bg-secondary border border-border rounded-xl p-5 flex items-start gap-3">
          <span className="text-accent-warm flex-shrink-0 mt-0.5">
            <Icon icon={AlertTriangle} size={20} />
          </span>
          <div>
            <p className="text-text-primary text-sm font-medium">Tu navegador no soporta dictado por voz</p>
            <p className="text-text-tertiary text-xs mt-2 leading-relaxed">
              Web Speech API no está disponible. Usa la búsqueda manual o intenta con Chrome/Safari moderno.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-5 bg-bg-primary">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-text-tertiary active:text-text-primary text-sm mb-6 -ml-1"
      >
        <Icon icon={ChevronLeft} size={16} />
        Atrás
      </button>

      <h1 className="font-display text-3xl tracking-[-0.02em] font-medium text-text-primary mb-2">Registro por voz</h1>
      <p className="text-xs text-text-tertiary mb-6">
        Dí lo que comiste, ej. <span className="text-text-secondary">&quot;dos huevos revueltos con una arepa y café con leche&quot;</span>.
      </p>

      {/* Transcript */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4 min-h-28 mb-6">
        {transcript || interim ? (
          <p className="text-text-primary text-base leading-relaxed">
            {transcript}
            <span className="text-text-tertiary"> {interim}</span>
          </p>
        ) : (
          <p className="text-text-tertiary text-sm italic">Toca el micrófono para empezar a hablar.</p>
        )}
      </div>

      {/* Botón micrófono */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={state.phase === "error" || parsing}
          aria-label={recording ? "Detener grabación" : "Iniciar grabación"}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-200 ease-[var(--ease-editorial)] ${
            recording ? "bg-accent-warm text-white" : "bg-text-primary text-bg-primary"
          } disabled:opacity-40`}
        >
          <Icon icon={recording ? MicOff : Mic} size={32} />
        </button>
        <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">
          {recording ? "Toca para detener" : "Toca para hablar"}
        </p>
      </div>

      {/* Error inline */}
      {state.phase === "error" && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4 mb-4 flex items-start gap-2.5">
          <span className="text-accent-warm flex-shrink-0 mt-0.5">
            <Icon icon={AlertTriangle} size={18} />
          </span>
          <div className="flex-1">
            <p className="text-text-primary text-sm">{state.message}</p>
            <button
              onClick={() => setState({ phase: "idle" })}
              className="text-text-tertiary underline text-xs mt-2"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        onClick={handleProcess}
        disabled={!transcript.trim() || parsing || recording}
        leadingIcon={parsing ? <Icon icon={Loader2} size={18} className="animate-spin" /> : <Icon icon={Sparkles} size={18} />}
        className="w-full mt-auto"
      >
        {parsing ? "Procesando…" : "Procesar dictado"}
      </Button>
    </div>
  );
}
