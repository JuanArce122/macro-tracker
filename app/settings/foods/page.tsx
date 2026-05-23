"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Salad, ChevronLeft, Plus, X, Trash2, Loader2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

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

const inputClass = "w-full bg-bg-primary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]";
const inputClassSmall = "w-full bg-bg-primary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-3 py-2.5 text-sm font-medium tabular-nums focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]";

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
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]">
            <Icon icon={ChevronLeft} size={20} />
          </button>
          <h1 className="font-display text-3xl tracking-[-0.02em] font-medium text-text-primary truncate">Mis alimentos</h1>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(null); setForm(EMPTY); }}
          className="w-9 h-9 rounded-full bg-text-primary text-bg-primary flex items-center justify-center active:opacity-90 transition-opacity duration-200 ease-[var(--ease-editorial)] flex-shrink-0"
          aria-label={showForm ? "Cerrar" : "Agregar alimento"}
        >
          <Icon icon={showForm ? X : Plus} size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-8 flex flex-col gap-4">
        {/* Formulario nuevo alimento */}
        {showForm && (
          <div className="bg-bg-secondary rounded-xl border border-border p-5 flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Nuevo alimento (por 100 g)</p>

            <input
              type="text"
              placeholder="Nombre *"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "cal", label: "Calorías *", unit: "kcal" },
                { key: "p",   label: "Proteína",   unit: "g" },
                { key: "c",   label: "Carbos",     unit: "g" },
                { key: "f",   label: "Grasa",      unit: "g" },
              ].map(({ key, label, unit }) => (
                <div key={key} className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={label}
                    value={form[key as keyof NewFood]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={`${inputClassSmall} pr-10`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">{unit}</span>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-red-600 text-xs px-1">{error}</p>
            )}

            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={saving}
              leadingIcon={saving ? <Icon icon={Loader2} size={16} className="animate-spin" /> : undefined}
              className="w-full"
            >
              {saving ? "Guardando…" : "Agregar alimento"}
            </Button>
          </div>
        )}

        {/* Lista de alimentos */}
        {loading ? (
          <p className="text-text-tertiary text-sm text-center py-12">Cargando…</p>
        ) : foods.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-text-tertiary">
              <Icon icon={Salad} size={48} />
            </span>
            <p className="text-text-secondary font-medium text-sm">Aún no tienes alimentos guardados</p>
            <p className="text-text-tertiary text-xs max-w-[240px]">
              Agrega tus alimentos habituales para registrarlos rápidamente.
            </p>
            {!showForm && (
              <Button
                variant="primary"
                onClick={() => setShowForm(true)}
                leadingIcon={<Icon icon={Plus} size={16} />}
                className="mt-2"
              >
                Agregar primero
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden divide-y divide-border">
            {foods.map((food) => (
              <div key={food.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{food.nombre}</p>
                  <p className="text-xs text-text-tertiary mt-0.5 tabular-nums">
                    <span className="font-numbers tracking-[0.01em] text-text-primary">{food.cal}</span>
                    <span className="text-text-primary"> kcal</span>
                    {" · "}
                    <span className="text-macro-protein">
                      <span className="font-numbers tracking-[0.01em]">{food.p}</span>g P
                    </span>
                    {" · "}
                    <span className="text-macro-carbs">
                      <span className="font-numbers tracking-[0.01em]">{food.c}</span>g C
                    </span>
                    {" · "}
                    <span className="text-macro-fat">
                      <span className="font-numbers tracking-[0.01em]">{food.f}</span>g G
                    </span>
                    <span className="text-text-tertiary"> — por <span className="font-numbers tracking-[0.01em]">100</span>g</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(food.id)}
                  disabled={deletingId === food.id}
                  className="w-9 h-9 flex items-center justify-center text-text-tertiary active:text-accent-warm transition-colors duration-200 ease-[var(--ease-editorial)] flex-shrink-0"
                  aria-label="Eliminar alimento"
                >
                  {deletingId === food.id ? (
                    <Icon icon={Loader2} size={16} className="animate-spin" />
                  ) : (
                    <Icon icon={Trash2} size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-text-tertiary text-center px-4">
          Los valores son por cada 100 g del alimento.
        </p>
      </div>
    </div>
  );
}
