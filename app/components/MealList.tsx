"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import EditMealSheet from "./EditMealSheet";

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

const CATEGORIES = [
  { key: "desayuno", label: "Desayuno", emoji: "🌅" },
  { key: "almuerzo", label: "Almuerzo", emoji: "☀️" },
  { key: "cena", label: "Cena", emoji: "🌙" },
  { key: "snack", label: "Snack", emoji: "🍎" },
];

function ConfidenceDot({ confidence }: { confidence: number }) {
  if (confidence >= 0.85) return <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Alta confianza" />;
  if (confidence >= 0.6) return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Confianza media" />;
  return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" title="Baja confianza" />;
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
    <div className="flex items-center gap-3 py-3 px-4 border-b border-gray-50 last:border-0">
      {meal.imageUrl ? (
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🍽️</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <ConfidenceDot confidence={meal.confidence} />
          <p className="font-medium text-sm text-gray-800 truncate">{meal.name}</p>
        </div>
        {meal.items && (() => {
          try {
            const parsed: { nombre: string; unidades: number }[] = JSON.parse(meal.items);
            return (
              <p className="text-xs text-gray-400 truncate">
                {parsed.map((item) => item.unidades > 1 ? `${item.unidades}x ${item.nombre}` : item.nombre).join(" · ")}
              </p>
            );
          } catch { return null; }
        })()}
        <div className="flex gap-2 mt-1 text-xs">
          <span className="text-emerald-600 font-semibold">{meal.calories.toFixed(0)} kcal</span>
          <span className="text-blue-500">{meal.protein.toFixed(1)}P</span>
          <span className="text-amber-500">{meal.carbs.toFixed(1)}C</span>
          <span className="text-violet-500">{meal.fat.toFixed(1)}G</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(meal)}
          className="p-2 text-gray-300 hover:text-blue-400 active:text-blue-500 transition-colors"
          aria-label="Editar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(meal.id)}
          className="p-2 text-gray-300 hover:text-red-400 active:text-red-500 transition-colors"
          aria-label="Eliminar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function MealList({ meals, date: _date }: { meals: Meal[]; date: string }) {
  const router = useRouter();
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta comida?")) return;
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const filled = CATEGORIES.filter(({ key }) => meals.some((m) => m.category === key));

  if (filled.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <span className="text-5xl mb-3">🍽️</span>
        <p className="text-gray-500 font-medium">Sin comidas registradas</p>
        <p className="text-gray-400 text-sm mt-1">Toca el botón verde para agregar</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pb-4 flex flex-col gap-3">
        {filled.map(({ key, label, emoji }) => {
          const group = meals.filter((m) => m.category === key);
          return (
            <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span>{emoji}</span>
                <span className="text-sm font-semibold text-gray-700 capitalize">{label}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {group.reduce((s, m) => s + m.calories, 0).toFixed(0)} kcal
                </span>
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

      <EditMealSheet
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
      />
    </>
  );
}
