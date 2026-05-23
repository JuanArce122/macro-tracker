"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Check, AlertTriangle, Loader2, Watch, ExternalLink } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

type WearableProvider = "fitbit" | "oura" | "garmin";

const PROVIDERS: { key: WearableProvider; label: string; desc: string; available: boolean }[] = [
  { key: "fitbit", label: "Fitbit",     desc: "Pasos, sueño, HRV y peso",         available: true },
  { key: "oura",   label: "Oura Ring",  desc: "Sueño, HRV, ritmo cardíaco basal", available: true },
  { key: "garmin", label: "Garmin",     desc: "Próximamente — requiere Connect IQ Developer", available: false },
];

type Connection = {
  id: number;
  provider: string;
  connectedAt: string;
  lastSyncedAt: string | null;
  expiresAt: string;
};

const ERROR_LABELS: Record<string, string> = {
  state_mismatch:        "Hubo un problema de seguridad. Intenta de nuevo.",
  token_exchange_failed: "El proveedor rechazó la conexión. Intenta de nuevo en unos minutos.",
  missing_params:        "Faltaron parámetros. Reinicia la conexión desde aquí.",
  db_failed:             "No se pudo guardar la conexión. Intenta de nuevo.",
  access_denied:         "Cancelaste la conexión.",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "Nunca";
  const date = new Date(iso);
  const minsAgo = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minsAgo < 1) return "Hace un momento";
  if (minsAgo < 60) return `Hace ${minsAgo} min`;
  const hoursAgo = Math.floor(minsAgo / 60);
  if (hoursAgo < 24) return `Hace ${hoursAgo}h`;
  const daysAgo = Math.floor(hoursAgo / 24);
  return `Hace ${daysAgo}d`;
}

/**
 * Lee el banner inicial desde searchParams sin disparar setState sync
 * en un effect (react-hooks/set-state-in-effect).
 */
function readInitialBanner(
  searchParams: URLSearchParams
): { type: "success" | "error"; text: string } | null {
  const connected = searchParams.get("connected");
  if (connected) {
    const label = PROVIDERS.find((p) => p.key === connected)?.label ?? connected;
    return { type: "success", text: `${label} conectado correctamente.` };
  }
  const error = searchParams.get("error");
  if (error) {
    return { type: "error", text: ERROR_LABELS[error] ?? "Hubo un error al conectar." };
  }
  return null;
}

export default function WearablesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<WearableProvider | null>(null);
  // Banner inicial derivado de searchParams via lazy initializer (no
  // dispara setState sync en effect)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    () => readInitialBanner(new URLSearchParams(searchParams.toString()))
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wearables/list")
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((d: { connections: Connection[] }) => {
        if (!cancelled) setConnections(d.connections ?? []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function disconnect(provider: WearableProvider) {
    setDisconnecting(provider);
    try {
      const res = await fetch(`/api/wearables/disconnect/${provider}`, { method: "DELETE" });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.provider !== provider));
        const label = PROVIDERS.find((p) => p.key === provider)?.label ?? provider;
        setBanner({ type: "success", text: `${label} desconectado.` });
      }
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-text-tertiary active:text-text-primary p-1 -ml-1"
          aria-label="Volver"
        >
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary">Dispositivos</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-3">
        {banner && (
          <div className={`bg-bg-secondary border ${banner.type === "success" ? "border-macro-protein/40" : "border-accent-warm/40"} rounded-xl p-4 flex items-start gap-3`}>
            <span className={`${banner.type === "success" ? "text-macro-protein" : "text-accent-warm"} flex-shrink-0 mt-0.5`}>
              <Icon icon={banner.type === "success" ? Check : AlertTriangle} size={18} />
            </span>
            <div className="flex-1">
              <p className="text-text-primary text-sm">{banner.text}</p>
            </div>
          </div>
        )}

        <p className="text-xs text-text-tertiary px-1 leading-relaxed">
          Conecta tu wearable para que la app importe automáticamente tus pasos, actividad, sueño y HRV.
          Los datos se sincronizan una vez al día en background.
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Icon icon={Loader2} size={20} className="text-text-tertiary animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {PROVIDERS.map((p) => {
              const conn = connections.find((c) => c.provider === p.key);
              const isConnected = !!conn;
              const isDisconnecting = disconnecting === p.key;

              return (
                <div
                  key={p.key}
                  className={`bg-bg-secondary border border-border rounded-xl p-5 ${!p.available ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center flex-shrink-0 text-text-tertiary">
                      <Icon icon={Watch} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                        {p.label}
                        {isConnected && (
                          <span className="text-[10px] uppercase tracking-[0.08em] bg-macro-protein/10 text-macro-protein px-2 py-0.5 rounded-full font-medium">
                            Conectado
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">{p.desc}</p>
                      {isConnected && (
                        <p className="text-xs text-text-tertiary mt-1.5 tabular-nums">
                          Última sync: {timeAgo(conn.lastSyncedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {p.available && (
                    <div className="mt-4">
                      {isConnected ? (
                        <Button
                          variant="secondary"
                          onClick={() => disconnect(p.key)}
                          disabled={isDisconnecting}
                          leadingIcon={isDisconnecting ? <Icon icon={Loader2} size={14} className="animate-spin" /> : undefined}
                          className="w-full"
                        >
                          {isDisconnecting ? "Desconectando…" : "Desconectar"}
                        </Button>
                      ) : (
                        <a
                          href={`/api/wearables/connect/${p.key}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium bg-text-primary text-bg-primary active:opacity-90 transition-opacity"
                        >
                          Conectar {p.label}
                          <Icon icon={ExternalLink} size={14} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
