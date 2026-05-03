"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  name: string | null;
  avatarEmoji: string | null;
  age: number | null;
  sex: string | null;
  weightKg: number | null;
  heightCm: number | null;
  activityLevel: string | null;
  fitnessGoal: string | null;
};

const AVATARS = [
  "😀","😎","🤩","🥳","💪","🏃","🧘","🏋️","🦁","🐯",
  "🦊","🐼","🦋","🌟","⚡","🔥","🎯","🚀","🌈","🍀",
  "🦅","🐬","🧠","🫀",
];

const ACTIVITY_OPTIONS = [
  { value: "sedentary",  label: "Sedentario", desc: "Sin ejercicio o muy poco" },
  { value: "light",      label: "Ligero",     desc: "1-2 días/semana" },
  { value: "moderate",   label: "Moderado",   desc: "3-4 días/semana" },
  { value: "active",     label: "Activo",     desc: "5-6 días/semana" },
  { value: "very_active",label: "Muy activo", desc: "Entrenamiento 2x/día" },
];

const GOAL_OPTIONS = [
  { value: "lose",     label: "Perder grasa",    emoji: "📉" },
  { value: "maintain", label: "Mantener peso",   emoji: "⚖️" },
  { value: "gain",     label: "Ganar músculo",   emoji: "📈" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [name, setName] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("🙂");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: Profile) => {
        setName(p.name ?? "");
        setAvatarEmoji(p.avatarEmoji ?? "🙂");
        setAge(p.age ? String(p.age) : "");
        setSex((p.sex as "male" | "female" | "") ?? "");
        setWeightKg(p.weightKg ? String(p.weightKg) : "");
        setHeightCm(p.heightCm ? String(p.heightCm) : "");
        setActivityLevel(p.activityLevel ?? "");
        setFitnessGoal(p.fitnessGoal ?? "");
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          avatarEmoji,
          age: age ? Number(age) : null,
          sex: sex || null,
          weightKg: weightKg ? Number(weightKg) : null,
          heightCm: heightCm ? Number(heightCm) : null,
          activityLevel: activityLevel || null,
          fitnessGoal: fitnessGoal || null,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => router.back(), 800);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 dark:text-gray-500 p-1 -ml-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Perfil</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 py-5 flex flex-col gap-5">

        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="w-24 h-24 rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
          >
            <span className="text-5xl">{avatarEmoji}</span>
          </button>
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            {showEmojiPicker ? "Cerrar" : "Cambiar avatar"}
          </button>

          {showEmojiPicker && (
            <div className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 shadow-sm">
              <div className="grid grid-cols-8 gap-1">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { setAvatarEmoji(emoji); setShowEmojiPicker(false); }}
                    className={`text-2xl p-2 rounded-xl transition-colors ${
                      avatarEmoji === emoji
                        ? "bg-emerald-100 dark:bg-emerald-900/40"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nombre */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nombre</p>
          <input
            type="text"
            placeholder="¿Cómo te llamamos?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        {/* Datos físicos */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col gap-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Datos físicos</p>

          {/* Sexo */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">Sexo biológico</label>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    sex === s ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {s === "male" ? "♂ Hombre" : "♀ Mujer"}
                </button>
              ))}
            </div>
          </div>

          {/* Edad, Peso, Altura */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Edad", value: age, set: setAge, suffix: "años", placeholder: "25" },
              { label: "Peso", value: weightKg, set: setWeightKg, suffix: "kg", placeholder: "70" },
              { label: "Altura", value: heightCm, set: setHeightCm, suffix: "cm", placeholder: "175" },
            ].map(({ label, value, set, suffix, placeholder }) => (
              <div key={label}>
                <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">{label}</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300 pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
                    {suffix}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nivel de actividad */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nivel de actividad</p>
          <div className="flex flex-col gap-2">
            {ACTIVITY_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setActivityLevel(value)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                  activityLevel === value
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className={`text-xs mt-0.5 ${activityLevel === value ? "text-emerald-100" : "text-gray-400 dark:text-gray-500"}`}>
                    {desc}
                  </p>
                </div>
                {activityLevel === value && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Objetivo fitness */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Objetivo principal</p>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setFitnessGoal(value)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors ${
                  fitnessGoal === value
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Botón guardar fijo */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-4 pb-6 pt-3 bg-gray-50 dark:bg-gray-900">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`w-full font-semibold rounded-2xl py-4 transition-all flex items-center justify-center gap-2 shadow-lg ${
            saved
              ? "bg-emerald-500 text-white"
              : "bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white"
          }`}
        >
          {saved ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              ¡Guardado!
            </>
          ) : saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Guardando…
            </>
          ) : (
            "Guardar perfil"
          )}
        </button>
      </div>
    </div>
  );
}
