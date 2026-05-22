"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, TrendingDown, Scale, TrendingUp, Check, Loader2 } from "lucide-react";
import Avatar from "@/app/components/ui/Avatar";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import { LAC_COUNTRIES } from "@/lib/regions";

type Profile = {
  name: string | null;
  age: number | null;
  sex: string | null;
  weightKg: number | null;
  heightCm: number | null;
  activityLevel: string | null;
  fitnessGoal: string | null;
  countryCode: string | null;
};

const ACTIVITY_OPTIONS = [
  { value: "sedentary",  label: "Sedentario", desc: "Sin ejercicio o muy poco" },
  { value: "light",      label: "Ligero",     desc: "1-2 días/semana" },
  { value: "moderate",   label: "Moderado",   desc: "3-4 días/semana" },
  { value: "active",     label: "Activo",     desc: "5-6 días/semana" },
  { value: "very_active",label: "Muy activo", desc: "Entrenamiento 2x/día" },
];

const GOAL_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "lose",     label: "Perder grasa",  icon: TrendingDown },
  { value: "maintain", label: "Mantener peso", icon: Scale },
  { value: "gain",     label: "Ganar músculo", icon: TrendingUp },
];

const inputClass = "w-full bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 py-3 text-sm focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [countryCode, setCountryCode] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p: Profile) => {
        setName(p.name ?? "");
        setAge(p.age ? String(p.age) : "");
        setSex((p.sex as "male" | "female" | "") ?? "");
        setWeightKg(p.weightKg ? String(p.weightKg) : "");
        setHeightCm(p.heightCm ? String(p.heightCm) : "");
        setActivityLevel(p.activityLevel ?? "");
        setFitnessGoal(p.fitnessGoal ?? "");
        setCountryCode(p.countryCode ?? "");
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
          avatarEmoji: null,
          age: age ? Number(age) : null,
          sex: sex || null,
          weightKg: weightKg ? Number(weightKg) : null,
          heightCm: heightCm ? Number(heightCm) : null,
          activityLevel: activityLevel || null,
          fitnessGoal: fitnessGoal || null,
          countryCode: countryCode || null,
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
      <div className="flex flex-col flex-1 bg-bg-primary items-center justify-center">
        <p className="text-text-tertiary text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-bg-primary">
      {/* Header */}
      <div className="px-5 pt-7 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-tertiary active:text-text-primary p-1 -ml-1 transition-colors duration-200 ease-[var(--ease-editorial)]">
          <Icon icon={ChevronLeft} size={20} />
        </button>
        <h1 className="font-serif text-3xl tracking-[-0.02em] text-text-primary">Perfil</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-3 pb-5 flex flex-col gap-5">

        {/* Avatar (iniciales) */}
        <div className="flex flex-col items-center gap-3">
          <Avatar name={name || null} size="xl" className="w-24 h-24 text-3xl" />
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Iniciales · {name.trim() ? name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") : "Completa tu nombre"}</p>
        </div>

        {/* Nombre */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Nombre</label>
          <input
            type="text"
            placeholder="¿Cómo te llamamos?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Datos físicos */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Datos físicos</p>

          {/* Sexo */}
          <div>
            <label className="text-xs text-text-tertiary block mb-2">Sexo biológico</label>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ease-[var(--ease-editorial)] ${
                    sex === s
                      ? "bg-text-primary text-bg-primary"
                      : "bg-bg-tertiary text-text-secondary active:opacity-80"
                  }`}
                >
                  {s === "male" ? "Hombre" : "Mujer"}
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
                <label className="text-xs text-text-tertiary block mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-xl text-text-primary placeholder:text-text-tertiary px-3 py-2.5 text-sm font-medium tabular-nums focus:outline-none focus:border-text-primary transition-colors duration-200 ease-[var(--ease-editorial)] pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                    {suffix}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* País (HU-12) */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">País</p>
          <div className="relative">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className={`${inputClass} appearance-none pr-10`}
              aria-label="Selecciona tu país"
            >
              <option value="">Selecciona tu país…</option>
              {LAC_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag}  {c.name}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
              ▾
            </span>
          </div>
          <p className="text-xs text-text-tertiary leading-relaxed">
            Priorizamos alimentos típicos de tu país en las búsquedas.
          </p>
        </div>

        {/* Nivel de actividad */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Nivel de actividad</p>
          <div className="flex flex-col gap-2">
            {ACTIVITY_OPTIONS.map(({ value, label, desc }) => {
              const isActive = activityLevel === value;
              return (
                <button
                  key={value}
                  onClick={() => setActivityLevel(value)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors duration-200 ease-[var(--ease-editorial)] ${
                    isActive
                      ? "bg-text-primary text-bg-primary"
                      : "bg-bg-tertiary text-text-primary active:opacity-80"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className={`text-xs mt-0.5 ${isActive ? "opacity-70" : "text-text-tertiary"}`}>
                      {desc}
                    </p>
                  </div>
                  {isActive && <Icon icon={Check} size={16} className="flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Objetivo fitness */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Objetivo principal</p>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map(({ value, label, icon }) => {
              const isActive = fitnessGoal === value;
              return (
                <button
                  key={value}
                  onClick={() => setFitnessGoal(value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors duration-200 ease-[var(--ease-editorial)] ${
                    isActive
                      ? "bg-text-primary text-bg-primary"
                      : "bg-bg-tertiary text-text-primary active:opacity-80"
                  }`}
                >
                  <Icon icon={icon} size={22} />
                  <span className="text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Botón guardar fijo */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-4 pb-6 pt-3 bg-bg-primary border-t border-border">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={saving || saved}
          leadingIcon={
            saved ? <Icon icon={Check} size={18} /> :
            saving ? <Icon icon={Loader2} size={18} className="animate-spin" /> :
            undefined
          }
          className="w-full"
        >
          {saved ? "¡Guardado!" : saving ? "Guardando…" : "Guardar perfil"}
        </Button>
      </div>
    </div>
  );
}
