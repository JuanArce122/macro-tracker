"use client";

/**
 * Overlay sobre el preview de la cámara/galería con guía visual de
 * encuadre (HU-01).
 *
 * Renderiza un marco con esquinas y un texto centrado abajo. Se posiciona
 * absoluto, asume que el padre tiene `position: relative`.
 *
 * NO bloquea clicks: usa pointer-events: none.
 */
export default function CameraGuide({ active = true }: { active?: boolean }) {
  if (!active) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center"
      aria-hidden="true"
    >
      {/* Marco cuadrado central con 4 esquinas */}
      <div className="relative w-3/4 aspect-square max-w-[280px]">
        {/* Esquina superior izquierda */}
        <span className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-white/80" />
        {/* Esquina superior derecha */}
        <span className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-white/80" />
        {/* Esquina inferior izquierda */}
        <span className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-white/80" />
        {/* Esquina inferior derecha */}
        <span className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-white/80" />
      </div>

      <p className="absolute bottom-4 text-white/90 text-xs uppercase tracking-[0.08em] bg-black/30 px-3 py-1 rounded-full">
        Encuadra el plato completo
      </p>
    </div>
  );
}
