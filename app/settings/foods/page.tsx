"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Food = {
  id: number;
  nombre: string;
  cal: number;
  p: number;
  c: number;
  f: number;
};

type NewFood = { nombre: string; cal: string; p: string; c: string; f: string };

const EMPTY: NewFood = { nombre: "", cal: "", p: "", c: "", f: "" };

export default function FoodsPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewFood>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/foods/user")
      .then((r) => r.json())
      .then((d) => setFoods(d.myFoods ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!form.nombre.trim() || !form.cal) {
      setError("Nombre y calorías son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          cal: Number(form.cal),
          p: Number(form.p) || 0,
          c: Number(form.c) || 0,
          f: Number(form.f) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      const { food } = await res.json();
      setFoods((prev) => [...prev, food].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setForm(EMPTY);
      setShowForm(false);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await fetch(`/api/foods/${id}`, { method: "DELETE" });
      setFoods((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // silencioso
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 dark:text-gray-500 p-1 -ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mis alimentos</h1>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(null); setForm(EMPTY); }}
          className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center active:bg-emerald-600 transition-colors"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            {showForm
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            }
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8 flex flex-col gap-4">
        {/* Formulario nuevo alimento */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nuevo alimento (por 100 g)</p>

            <input
              type="text"
              placeholder="Nombre *"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "cal", label: "Calorías *", unit: "kcal", color: "focus:ring-emerald-300" },
                { key: "p",   label: "Proteína",   unit: "g",    color: "focus:ring-blue-300" },
                { key: "c",   label: "Carbos",     unit: "g",    color: "focus:ring-amber-300" },
                { key: "f",   label: "Grasa",      unit: "g",    color: "focus:ring-violet-300" },
              ].map(({ key, label, unit, color }) => (
                <div key={key} className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={label}
                    value={form[key as keyof NewFood]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={`w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 ${color} pr-10`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">{unit}</span>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-xs px-1">{error}</p>
            )}

            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Guardando…
                </>
              ) : (
                "Agregar alimento"
              )}
            </button>
          </div>
        )}

        {/* Lista de alimentos */}
        {loading ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-12">Cargando…</p>
        ) : foods.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-5xl">🥗</span>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Aún no tienes alimentos guardados</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs max-w-[220px]">
              Agrega tus alimentos habituales para registrarlos rápidamente.
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full active:bg-emerald-600 transition-colors"
              >
                + Agregar primero
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
            {foods.map((food) => (
              <div key={food.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{food.nombre}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{food.cal}</span>
                    {" kcal · "}
                    <span className="text-blue-500">{food.p}g P</span>
                    {" · "}
                    <span className="text-amber-500">{food.c}g C</span>
                    {" · "}
                    <span className="text-violet-500">{food.f}g G</span>
                    <span className="text-gray-300 dark:text-gray-600"> — por 100g</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(food.id)}
                  disabled={deletingId === food.id}
                  className="w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 active:text-red-400 dark:active:text-red-500 transition-colors flex-shrink-0"
                >
                  {deletingId === food.id ? (
                    <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center px-4">
          Los valores son por cada 100 g del alimento.
        </p>
      </div>
    </div>
  );
}
