"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, ChevronLeft, ChevronRight, Download, Check, Loader2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

type Modal = "history" | "account" | null;

function ConfirmModal({
  title,
  description,
  keyword,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  description: string;
  keyword: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [typed, setTyped] = useState("");
  const match = typed.trim().toUpperCase() === keyword.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-[420px] bg-bg-primary rounded-xl border border-border p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="text-accent-warm flex-shrink-0 mt-0.5">
            <Icon icon={AlertTriangle} size={22} />
          </span>
          <div>
            <h2 className="font-serif text-2xl tracking-[-0.02em] text-text-primary leading-tight">{title}</h2>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary">
            Escribe <span className="text-text-primary">{keyword}</span> para confirmar
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={keyword}
            autoFocus
            className="w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <button
            onClick={onConfirm}
            disabled={!match || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium bg-red-600 text-white active:bg-red-700 disabled:bg-bg-tertiary disabled:text-text-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
          >
            {loading ? (
              <>
                <Icon icon={Loader2} size={16} className="animate-spin" />
                Procesando…
              </>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DataPage() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  function buildExportUrl() {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    return `/api/export${qs ? `?${qs}` : ""}`;
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(buildExportUrl());
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `macros-${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silencioso — el navegador mostrará el error de descarga
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteHistory() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/meals/all", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setModal(null);
      setSuccessMsg("Historial eliminado correctamente.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setModal(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      window.location.href = "/auth";
    } catch {
      setModal(null);
      setActionLoading(false);
    }
  }

  const inputDate = "w-full bg-bg-primary border border-border rounded-xl text-text-primary px-3 py-2.5 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)] tabular-nums";

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Modales */}
      {modal === "history" && (
        <ConfirmModal
          title="Borrar historial"
          description="Se eliminarán todas tus comidas registradas. Esta acción no se puede deshacer. Tu perfil, metas y alimentos personalizados se conservarán."
          keyword="BORRAR"
          confirmLabel="Borrar historial"
          danger
          onConfirm={handleDeleteHistory}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}
      {modal === "account" && (
        <ConfirmModal
          title="Eliminar cuenta"
          description="Se eliminarán tu cuenta, historial, metas y alimentos personalizados de forma permanente. No podrás recuperar tus datos."
          keyword="ELIMINAR"
          confirmLabel="Eliminar mi cuenta"
          danger
          onConfirm={handleDeleteAccount}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}

      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]">
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary">Mis datos</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-10 flex flex-col gap-4">

        {successMsg && (
          <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-macro-protein flex-shrink-0">
              <Icon icon={Check} size={16} />
            </span>
            <p className="text-text-primary text-sm">{successMsg}</p>
          </div>
        )}

        {/* Exportar CSV */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary mb-1">Exportar historial</p>
            <p className="text-xs text-text-tertiary">Descarga un CSV con todas tus comidas registradas.</p>
          </div>

          {/* Rango de fechas opcional */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-text-tertiary">Rango de fechas (opcional)</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-tertiary">Desde</label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || today}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={inputDate}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-tertiary">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={today}
                  onChange={(e) => setToDate(e.target.value)}
                  className={inputDate}
                />
              </div>
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(""); setToDate(""); }}
                className="text-xs text-text-tertiary self-start underline active:text-text-primary"
              >
                Limpiar rango
              </button>
            )}
          </div>

          <Button
            variant="primary"
            onClick={handleExport}
            disabled={exporting}
            leadingIcon={exporting ? <Icon icon={Loader2} size={16} className="animate-spin" /> : <Icon icon={Download} size={16} />}
            className="w-full"
          >
            {exporting
              ? "Exportando…"
              : (fromDate && toDate ? `Exportar ${fromDate} → ${toDate}` : "Exportar todo")}
          </Button>
        </div>

        {/* Zona de peligro */}
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-red-600 px-1 pt-2 pb-2">Zona de peligro</p>
          <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden divide-y divide-border">

            {/* Borrar historial */}
            <button
              onClick={() => setModal("history")}
              className="w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
            >
              <span className="w-8 flex items-center justify-center text-red-600 flex-shrink-0">
                <Icon icon={Trash2} size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-600">Borrar historial</p>
                <p className="text-xs text-text-tertiary mt-0.5">Elimina todas tus comidas registradas</p>
              </div>
              <span className="text-text-tertiary flex-shrink-0">
                <Icon icon={ChevronRight} size={18} />
              </span>
            </button>

            {/* Borrar cuenta */}
            <button
              onClick={() => setModal("account")}
              className="w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-bg-tertiary transition-colors duration-200 ease-[var(--ease-editorial)]"
            >
              <span className="w-8 flex items-center justify-center text-red-600 flex-shrink-0">
                <Icon icon={AlertTriangle} size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-600">Eliminar mi cuenta</p>
                <p className="text-xs text-text-tertiary mt-0.5">Borra tu cuenta y todos tus datos permanentemente</p>
              </div>
              <span className="text-text-tertiary flex-shrink-0">
                <Icon icon={ChevronRight} size={18} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
