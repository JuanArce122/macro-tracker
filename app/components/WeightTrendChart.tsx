"use client";

import { useMemo } from "react";

type Point = { date: string; weightKg: number };

type Props = {
  entries: Point[];
  smoothed: number[];
  /** Width en px del SVG; default fluid (100%) */
  height?: number;
  /** kg/sem para mostrar como label informativo */
  trendKgPerWeek?: number;
};

/**
 * Gráfica SVG inline de la tendencia de peso (HU-05).
 *
 * Diseño minimalista:
 *  - Línea raw (text-tertiary 40% opacity, puntos chicos)
 *  - Línea smoothed (text-primary, gruesa)
 *  - Sin ejes con números; mostramos primer y último valor como labels
 *  - Sin librerías pesadas (recharts/d3) — solo SVG nativo
 */
export default function WeightTrendChart({ entries, smoothed, height = 140 }: Props) {
  const { rawPath, smoothPath, minWeight, maxWeight, firstLabel, lastLabel } = useMemo(() => {
    if (entries.length === 0) {
      return { rawPath: "", smoothPath: "", minWeight: 0, maxWeight: 0, firstLabel: null, lastLabel: null };
    }

    const ws = entries.map((e) => e.weightKg);
    const sw = smoothed.length > 0 ? smoothed : ws;
    const all = [...ws, ...sw];
    const min = Math.min(...all);
    const max = Math.max(...all);

    // Padding del rango Y para que la línea no toque los bordes
    const pad = Math.max(0.5, (max - min) * 0.15);
    const yMin = min - pad;
    const yMax = max + pad;

    const n = entries.length;
    const xStep = n > 1 ? 100 / (n - 1) : 0;

    function toY(value: number): number {
      if (yMax === yMin) return 50;
      return 100 - ((value - yMin) / (yMax - yMin)) * 100;
    }

    const rawPathBuilder = ws
      .map((w, i) => `${i === 0 ? "M" : "L"}${(i * xStep).toFixed(2)},${toY(w).toFixed(2)}`)
      .join(" ");

    const smoothPathBuilder = sw
      .map((w, i) => `${i === 0 ? "M" : "L"}${(i * xStep).toFixed(2)},${toY(w).toFixed(2)}`)
      .join(" ");

    return {
      rawPath: rawPathBuilder,
      smoothPath: smoothPathBuilder,
      minWeight: min,
      maxWeight: max,
      firstLabel: { date: entries[0].date, weight: entries[0].weightKg },
      lastLabel: { date: entries[n - 1].date, weight: entries[n - 1].weightKg },
    };
  }, [entries, smoothed]);

  if (entries.length === 0) {
    return (
      <div className="text-text-tertiary text-sm text-center py-8" aria-label="Sin datos de peso">
        Aún no hay registros de peso.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          width="100%"
          height={height}
          className="overflow-visible"
          aria-label="Gráfica de tendencia de peso"
          role="img"
        >
          {/* Línea raw (gris claro) */}
          {rawPath && (
            <path
              d={rawPath}
              fill="none"
              stroke="currentColor"
              className="text-text-tertiary"
              strokeOpacity={0.35}
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Línea smoothed (oscura, gruesa) */}
          {smoothPath && (
            <path
              d={smoothPath}
              fill="none"
              stroke="currentColor"
              className="text-text-primary"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>

      <div className="flex justify-between text-xs text-text-tertiary tabular-nums px-1">
        {firstLabel && (
          <span>
            {firstLabel.date} · {firstLabel.weight.toFixed(1)} kg
          </span>
        )}
        {lastLabel && (
          <span className="text-right">
            {lastLabel.date} · {lastLabel.weight.toFixed(1)} kg
          </span>
        )}
      </div>

      <div className="text-xs text-text-tertiary text-center tabular-nums">
        Rango: {minWeight.toFixed(1)} – {maxWeight.toFixed(1)} kg
      </div>
    </div>
  );
}
