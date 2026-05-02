"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Strength ────────────────────────────────────────────────────────────────

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

const STRENGTH_LABEL = ["", "Débil", "Regular", "Buena", "Fuerte"];
const STRENGTH_COLOR = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-500"];
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
          <span className="text-gray-400 dark:text-gray-600 font-normal">
            {" — "}
            {level === 1 && "Agrega mayúsculas, números o símbolos"}
            {level === 2 && "Agrega un número o símbolo"}
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Eye icon ─────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

type FieldProps = {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  autoComplete: string;
  inputMode?: "email" | "text";
  placeholder?: string;
  showToggle?: boolean;
  showPassword?: boolean;
  onToggleShow?: () => void;
};

function Field({
  label, type, value, onChange, onBlur, error,
  autoComplete, inputMode, placeholder,
  showToggle, showPassword, onToggleShow,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <div className="relative">
        <input
          type={showToggle ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          className={`w-full rounded-2xl border px-4 py-3.5 text-base bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all pr-${showToggle ? "12" : "4"} ${
            error
              ? "border-red-300 dark:border-red-700 focus:ring-red-200 dark:focus:ring-red-900"
              : "border-gray-200 dark:border-gray-700 focus:ring-emerald-200 dark:focus:ring-emerald-900 focus:border-emerald-400"
          }`}
          style={{ fontSize: "16px" }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 p-1 active:opacity-60 transition-opacity"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <EyeIcon open={showPassword!} />
          </button>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

type Tab = "login" | "register";

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Campos
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Errores inline
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Limpiar errores al cambiar de tab
  function switchTab(t: Tab) {
    setTab(t);
    setEmailError("");
    setPasswordError("");
    setGlobalError(null);
    setShowPassword(false);
  }

  // Validaciones en blur
  const validateEmail = useCallback(() => {
    if (!email) { setEmailError("El email es requerido."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Ingresa un email válido."); return false; }
    setEmailError("");
    return true;
  }, [email]);

  const validatePassword = useCallback(() => {
    if (!password) { setPasswordError("La contraseña es requerida."); return false; }
    if (tab === "register" && password.length < 8) {
      setPasswordError("Mínimo 8 caracteres.");
      return false;
    }
    setPasswordError("");
    return true;
  }, [password, tab]);

  // Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const v1 = validateEmail();
    const v2 = validatePassword();
    const ok = v1 && v2;
    if (!ok) return;

    setLoading(true);
    setGlobalError(null);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setGlobalError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  // Registro
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const v1 = validateEmail();
    const v2 = validatePassword();
    const ok = v1 && v2;
    if (!ok) return;

    if (getStrength(password) < 2) {
      setPasswordError("La contraseña es muy débil. Agrega letras y números.");
      return;
    }

    setLoading(true);
    setGlobalError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error ?? "Error al crear la cuenta.");
        setLoading(false);
        return;
      }

      // Auto-login tras registro exitoso
      const loginResult = await signIn("credentials", { email, password, redirect: false });
      if (loginResult?.error) {
        setGlobalError("Cuenta creada. Inicia sesión manualmente.");
        setTab("login");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setGlobalError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={tab === "login" ? handleLogin : handleRegister} noValidate>
      {/* Tab toggle */}
      <div className="flex p-1.5 gap-1 bg-gray-100 dark:bg-gray-800 m-5 rounded-2xl">
        {(["login", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 active:bg-white/50"
            }`}
          >
            {t === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>

      {/* Campos */}
      <div className="px-5 pb-5 flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(v) => { setEmail(v); if (emailError) setEmailError(""); }}
          onBlur={validateEmail}
          error={emailError}
          autoComplete="email"
          inputMode="email"
          placeholder="tucorreo@ejemplo.com"
        />

        <div>
          <Field
            label="Contraseña"
            type="password"
            value={password}
            onChange={(v) => { setPassword(v); if (passwordError) setPasswordError(""); }}
            onBlur={validatePassword}
            error={passwordError}
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            placeholder={tab === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"}
            showToggle
            showPassword={showPassword}
            onToggleShow={() => setShowPassword((s) => !s)}
          />
          {tab === "register" && <PasswordStrength password={password} />}
        </div>

        {/* Error global */}
        {globalError && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl px-4 py-3">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
          </div>
        )}

        {/* Botón submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors mt-1 shadow-sm"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {tab === "login" ? "Entrando…" : "Creando cuenta…"}
            </>
          ) : (
            tab === "login" ? "Iniciar sesión" : "Crear cuenta"
          )}
        </button>

        {/* Hint de contraseña olvidada */}
        {tab === "login" && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-600">
            ¿Olvidaste tu contraseña?{" "}
            <a href="/auth/reset-password" className="text-emerald-600 dark:text-emerald-400 font-medium underline-offset-2 hover:underline">
              Recupérala aquí
            </a>
          </p>
        )}
      </div>
    </form>
  );
}
