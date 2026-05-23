/**
 * Detección suave de patrones potencialmente preocupantes (HU-11).
 *
 * D7: Umbrales decididos:
 *   - high_frequency: >12 registros/día durante 3+ días en última semana
 *   - perfect_tracking: 14+ días con calorías = goal ± 2 kcal (extremo)
 *
 * Tono: empático, NUNCA diagnóstica. El usuario siempre puede descartar
 * el aviso. Si los patrones persisten, ofrecemos modo hábitos como
 * alternativa más relajada y un link al recurso profesional ACAB Colombia.
 *
 * IMPORTANT: este archivo NO toca DB para que sea testeable como función
 * pura. El caller (endpoint /api/safe-use/check) carga los datos y los
 * pasa pre-agregados.
 */

export type DailyStats = {
  /** YYYY-MM-DD */
  date: string;
  /** Cantidad de meals registrados ese día */
  mealCount: number;
  /** Suma de calorías ese día (0 si sin registro) */
  totalCalories: number;
  /** Meta calórica del usuario (snapshot, mismo valor para todos los días aquí) */
  goalCalories: number;
};

export type TcaSignal = "high_frequency" | "perfect_tracking" | "obsessive_editing";

export type SignalMessage = {
  title: string;
  body: string;
  suggestHabits: boolean;
};

export type DetectionResult = {
  signal: TcaSignal;
  message: SignalMessage;
};

// ─── Constantes ────────────────────────────────────────────────────────

const HIGH_FREQ_THRESHOLD = 12;
const HIGH_FREQ_DAYS_REQUIRED = 3;
const HIGH_FREQ_WINDOW = 7;
const PERFECT_TRACKING_TOLERANCE_KCAL = 2;
const PERFECT_TRACKING_MIN_DAYS = 14;
const MIN_DAYS_FOR_DETECTION = 7;

// ─── Mensajes (tono empático, en español neutro/CO) ───────────────────

export const SIGNAL_MESSAGES: Record<TcaSignal, SignalMessage> = {
  high_frequency: {
    title: "Has estado registrando muy seguido",
    body:
      "Notamos varios días con más de 12 registros. Si te sientes ansioso/a con los números, probar el modo hábitos puede ayudarte a relajar el seguimiento.",
    suggestHabits: true,
  },
  perfect_tracking: {
    title: "Tu tracking es muy preciso",
    body:
      "Llevas más de dos semanas llegando exactamente a tu meta. La flexibilidad también es parte de una relación sana con la comida — no pasa nada si un día te sales un poco del número.",
    suggestHabits: false,
  },
  obsessive_editing: {
    title: "¿Te ayudaría algo más simple?",
    body:
      "Editas mucho las mismas comidas. El modo hábitos enfoca en porciones visuales, no en números exactos.",
    suggestHabits: true,
  },
};

// ─── Recursos profesionales (D7: ACAB Colombia) ───────────────────────

export const RESOURCES_CO = {
  acabUrl: "https://acabcolombia.org",
  acabPhone: "+57 318 7770977",
  description:
    "Asociación Colombiana de Bulimia y Anorexia — apoyo gratuito, confidencial, sin juicios.",
};

// ─── Detección ─────────────────────────────────────────────────────────

/**
 * Evalúa los stats pre-agregados y devuelve la señal más urgente, o
 * null si no hay nada que reportar.
 *
 * Las señales se priorizan así (más urgente arriba):
 *   1. high_frequency (puede indicar ansiedad activa con la app)
 *   2. perfect_tracking (señal sutil, larga duración)
 *
 * `obsessive_editing` queda como futuro — requiere log de PATCHs a meal
 * que aún no persistimos.
 */
export function detectFromDailyStats(stats: DailyStats[]): DetectionResult | null {
  if (stats.length < MIN_DAYS_FOR_DETECTION) return null;

  // Señal 1: high_frequency
  const recent = stats.slice(-HIGH_FREQ_WINDOW);
  const excessDays = recent.filter((d) => d.mealCount > HIGH_FREQ_THRESHOLD).length;
  if (excessDays >= HIGH_FREQ_DAYS_REQUIRED) {
    return {
      signal: "high_frequency",
      message: SIGNAL_MESSAGES.high_frequency,
    };
  }

  // Señal 2: perfect_tracking
  const last14 = stats.slice(-PERFECT_TRACKING_MIN_DAYS);
  if (last14.length === PERFECT_TRACKING_MIN_DAYS) {
    const allPerfect = last14.every((d) =>
      Math.abs(d.totalCalories - d.goalCalories) <= PERFECT_TRACKING_TOLERANCE_KCAL
    );
    if (allPerfect) {
      return {
        signal: "perfect_tracking",
        message: SIGNAL_MESSAGES.perfect_tracking,
      };
    }
  }

  return null;
}
