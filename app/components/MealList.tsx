"use client";

import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Sunrise, Sun, Moon, Apple, UtensilsCrossed, Pencil, Trash2 } from "lucide-react";
import EditMealSheet from "./EditMealSheet";
import Toast from "./Toast";
import Icon from "@/app/components/ui/Icon";

type Meal = {
  id: number;
  category: string;
  name: string;
  imageUrl: string | null;
  weightG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  items?: string | null;
};

type ToastState = {
  message: string;
  type: "success" | "error";
  action?: { label: string; onClick: () => void };
} | null;

const CATEGORIES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "desayuno", label: "Desayuno", icon: Sunrise },
  { key: "almuerzo", label: "Almuerzo", icon: Sun },
  { key: "cena",     label: "Cena",     icon: Moon },
  { key: "snack",    label: "Snack",    icon: Apple },
];

function ConfidenceDot({ confidence }: { confidence: number }) {
  if (confidence >= 0.85) return <span className="w-2 h-2 rounded-full bg-macro-protein inline-block flex-shrink-0" title="Alta confianza" />;
  if (confidence >= 0.6)  return <span className="w-2 h-2 rounded-full bg-macro-fat inline-block flex-shrink-0" title="Confianza media" />;
  return <span className="w-2 h-2 rounded-full bg-accent-warm inline-block flex-shrink-0" title="Baja confianza" />;
}

function MealItem({
  meal,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-4 px-5 border-b border-border last:border-0">
      {meal.imageUrl ? (
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-bg-tertiary">
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-14 h-14 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0 text-text-tertiary">
          <Icon icon={UtensilsCrossed} size={22} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <ConfidenceDot confidence={meal.confidence} />
          <p className="font-medium text-sm text-text-primary truncate">{meal.name}</p>
        </div>
        {meal.items && (() => {
          try {
            const parsed: { nombre: string; unidades: number }[] = JSON.parse(meal.items);
            return (
              <p className="text-xs text-text-tertiary truncate">
                {parsed.map((item) => item.unidades > 1 ? `${item.unidades}× ${item.nombre}` : item.nombre).join(" · ")}
              </p>
            );
          } catch { return null; }
        })()}
        <p className="text-xs mt-1 tabular-nums">
          <span className="text-text-primary font-medium">{meal.calories.toFixed(0)} kcal</span>
          <span className="text-text-tertiary"> · </span>
          <span className="text-macro-protein">{meal.protein.toFixed(1)}P</span>
          <span className="text-text-tertiary"> · </span>
          <span className="text-macro-carbs">{meal.carbs.toFixed(1)}C</span>
          <span className="text-text-tertiary"> · </span>
          <span className="text-macro-fat">{meal.fat.toFixed(1)}G</span>
        </p>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => onEdit(meal)}
          className="p-2 text-text-tertiary active:text-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]"
          aria-label="Editar"
        >
          <Icon icon={Pencil} size={18} />
        </button>
        <button
          onClick={() => onDelete(meal.id)}
          className="p-2 text-text-tertiary active:text-accent-warm transition-colors duration-200 ease-[var(--ease-editorial)]"
          aria-label="Eliminar"
        >
          <Icon icon={Trash2} size={18} />
        </button>
      </div>
    </div>
  );
}

export default function MealList({ meals, date: _date }: { meals: Meal[]; date: string }) {
  const router = useRouter();
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // IDs ocultadas optimistamente (pendientes de borrado)
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const deleteTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const deletedMeals = useRef<Map<number, Meal>>(new Map());

  const dismissToast = useCallback(() => setToast(null), []);

  function handleDelete(id: number) {
    const meal = meals.find((m) => m.id === id);
    if (!meal) return;

    // Guardar referencia y ocultar de UI
    deletedMeals.current.set(id, meal);
    setHiddenIds((prev) => new Set([...prev, id]));

    // Timer: ejecutar DELETE real después de 5s
    const timer = setTimeout(async () => {
      deleteTimers.current.delete(id);
      deletedMeals.current.delete(id);
      try {
        const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setHiddenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        router.refresh();
      } catch {
        // Restaurar si falla
        setHiddenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        setToast({ message: "Error al eliminar. Intenta de nuevo.", type: "error" });
      }
    }, 5000);

    deleteTimers.current.set(id, timer);

    setToast({
      message: "Comida eliminada",
      type: "success",
      action: {
        label: "Deshacer",
        onClick: () => {
          const t = deleteTimers.current.get(id);
          if (t) { clearTimeout(t); deleteTimers.current.delete(id); }
          deletedMeals.current.delete(id);
          setHiddenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        },
      },
    });
  }

  const visibleMeals = meals.filter((m) => !hiddenIds.has(m.id));
  const filled = CATEGORIES.filter(({ key }) => visibleMeals.some((m) => m.category === key));

  if (filled.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <span className="text-text-tertiary mb-4">
            <Icon icon={UtensilsCrossed} size={48} />
          </span>
          <p className="text-text-secondary font-medium">Sin comidas registradas</p>
          <p className="text-text-tertiary text-sm mt-1">Pulsa «Agregar comida» abajo para empezar</p>
        </div>
        {toast && <Toast {...toast} onDismiss={dismissToast} />}
      </>
    );
  }

  return (
    <>
      <div className="px-4 pb-4 flex flex-col gap-3">
        {filled.map(({ key, label, icon }) => {
          const group = visibleMeals.filter((m) => m.category === key);
          return (
            <div key={key} className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
                <span className="text-text-tertiary flex-shrink-0">
                  <Icon icon={icon} size={18} />
                </span>
                <h3 className="font-display text-xl tracking-[-0.02em] font-medium text-text-primary capitalize leading-none">
                  {label}
                </h3>
              </div>
              {group.map((meal) => (
                <MealItem
                  key={meal.id}
                  meal={meal}
                  onEdit={setEditingMeal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          );
        })}
      </div>

      {editingMeal && (
        <EditMealSheet
          key={editingMeal.id}
          meal={editingMeal}
          onClose={() => setEditingMeal(null)}
        />
      )}

      {toast && <Toast {...toast} onDismiss={dismissToast} />}
    </>
  );
}
