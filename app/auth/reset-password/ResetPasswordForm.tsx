"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Strength (reutilizado del AuthForm) ──────────────────────────────────────

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getStrength(password: string): StrengthLevel {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score as StrengthLevel;
}

const STRENGTH_COLOR = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-500"];
const STRENGTH_LABEL = ["", "Débil", "Regular", "Buena", "Fuerte"];
const STRENGTH_TEXT  = ["", "text-red-500", "text-amber-500", "text-blue-500", "text-emerald-600"];

function PasswordStrength({ password }: { password: string }) {
  const level = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= level ? STRENGTH_COLOR[level] : "bg-gray-100 dark:bg-gray-800"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${STRENGTH_TEXT[level]}`}>
        {STRENGTH_LABEL[level]}
        {level < 3 && (
          <span className="text-gray-400 font-normal">
            {" — "}
            {level === 1 && "Agrega mayúsculas, números o símbolos"}
            {level === 2 && "Agrega un número o símbolo"}
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function validatePassword() {
    if (!password) { setPasswordError("La contraseña es requerida."); return false; }
    if (password.length < 8) { setPasswordError("Mínimo 8 caracteres."); return false; }
    setPasswordError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePassword()) return;

    if (getStrength(password) < 2) {
      setPasswordError("La contraseña es muy débil. Agrega letras y números.");
      return;
    }

    setLoading(true);
    setGlobalError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Error al restablecer la contraseña.");
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/auth"), 2500);
    } catch {
      setGlobalError("No se pudo conectar. Intenta de nuevo.");
      setLoading(false);
    }
  }

  // Estado: contraseña actualizada
  if (done) {
    return (
      <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Redirigiendo al inicio de sesión…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Nueva contraseña</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Elige una contraseña segura para tu cuenta.</p>
      </div>

      {/* Password */}
      <div>
        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1.5">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(""); }}
            onBlur={validatePassword}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            style={{ fontSize: "16px" }}
            className={`w-full rounded-2xl border px-4 py-3.5 pr-12 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all ${
              passwordError
                ? "border-red-300 dark:border-red-700 focus:ring-red-200"
                : "border-gray-200 dark:border-gray-700 focus:ring-emerald-200 focus:border-emerald-400"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 p-1 active:opacity-60"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        </div>
        {passwordError && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-red-500">{passwordError}</p>
          </div>
        )}
        <PasswordStrength password={password} />
      </div>

      {globalError && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors shadow-sm"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Guardando…
          </>
        ) : (
          "Guardar nueva contraseña"
        )}
      </button>
    </form>
  );
}
