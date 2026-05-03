"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Modal = "history" | "account" | null;

function ConfirmModal({
  title,
  description,
  keyword,
  confirmLabel,
  danger,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-6">
      <div className="w-full max-w-[420px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Escribe <span className="font-bold text-gray-800 dark:text-gray-100">{keyword}</span> para confirmar
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={keyword}
            autoFocus
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!match || loading}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              danger
                ? "bg-red-500 hover:bg-red-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white"
            }`}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Procesando…
              </>
            ) : (
              confirmLabel
            )}
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
      // Redirigir a login tras eliminar cuenta
      window.location.href = "/auth";
    } catch {
      setModal(null);
      setActionLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
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
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 dark:text-gray-500 p-1 -ml-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mis datos</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-10 flex flex-col gap-5">

        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-emerald-700 dark:text-emerald-400 text-sm">{successMsg}</p>
          </div>
        )}

        {/* Exportar CSV */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Exportar historial</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Descarga un CSV con todas tus comidas registradas.</p>
          </div>

          {/* Rango de fechas opcional */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Rango de fechas (opcional)</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 dark:text-gray-500">Desde</label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || today}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 dark:text-gray-500">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={today}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(""); setToDate(""); }}
                className="text-xs text-gray-400 dark:text-gray-500 self-start underline"
              >
                Limpiar rango
              </button>
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Exportando…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {fromDate && toDate ? `Exportar ${fromDate} → ${toDate}` : "Exportar todo"}
              </>
            )}
          </button>
        </div>

        {/* Zona de peligro */}
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider px-1 mb-2">Zona de peligro</p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm overflow-hidden divide-y divide-red-50 dark:divide-red-900/30">

            {/* Borrar historial */}
            <button
              onClick={() => setModal("history")}
              className="w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-red-50 dark:active:bg-red-900/20 transition-colors"
            >
              <span className="text-xl w-8 text-center flex-shrink-0">🗑️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-500">Borrar historial</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Elimina todas tus comidas registradas</p>
              </div>
              <svg className="w-4 h-4 text-red-300 dark:text-red-800 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Borrar cuenta */}
            <button
              onClick={() => setModal("account")}
              className="w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-red-50 dark:active:bg-red-900/20 transition-colors"
            >
              <span className="text-xl w-8 text-center flex-shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-500">Eliminar mi cuenta</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Borra tu cuenta y todos tus datos permanentemente</p>
              </div>
              <svg className="w-4 h-4 text-red-300 dark:text-red-800 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
