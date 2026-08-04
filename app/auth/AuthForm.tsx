"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import PasswordStrength, { getStrength } from "./PasswordStrength";

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
      <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary">{label}</label>
      <div className="relative">
        <input
          type={showToggle ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          className={`w-full bg-bg-primary border rounded-xl text-text-primary placeholder:text-text-tertiary py-3.5 focus:outline-none transition-colors duration-200 ease-[var(--ease-editorial)] ${
            showToggle ? "px-4 pr-12" : "px-4"
          } ${
            error
              ? "border-red-600 focus:border-red-600"
              : "border-border focus:border-text-primary"
          }`}
          style={{ fontSize: "16px" }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary active:text-text-primary p-1 transition-colors duration-200 ease-[var(--ease-editorial)]"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Icon icon={showPassword ? Eye : EyeOff} size={18} />
          </button>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5">
          <Icon icon={AlertCircle} size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
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
  // Solo rutas relativas (evita open redirect a dominios externos, S13).
  const rawCallback = searchParams.get("callbackUrl") ?? "/";
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/";
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

  function switchTab(t: Tab) {
    setTab(t);
    setEmailError("");
    setPasswordError("");
    setGlobalError(null);
    setShowPassword(false);
  }

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const v1 = validateEmail();
    const v2 = validatePassword();
    if (!(v1 && v2)) return;

    setLoading(true);
    setGlobalError(null);

    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setGlobalError("Email o contraseña incorrectos.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      // signIn puede lanzar (red caída): sin esto, loading quedaba en true para
      // siempre y el botón "Entrando…" se colgaba (F13).
      setGlobalError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const v1 = validateEmail();
    const v2 = validatePassword();
    if (!(v1 && v2)) return;

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
      {/* Tabs con underline */}
      <div className="flex border-b border-border">
        {(["login", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`flex-1 py-4 text-sm font-medium border-b-2 -mb-px transition-colors duration-200 ease-[var(--ease-editorial)] ${
              tab === t
                ? "border-text-primary text-text-primary"
                : "border-transparent text-text-tertiary active:text-text-secondary"
            }`}
          >
            {t === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>

      {/* Campos */}
      <div className="px-5 py-6 flex flex-col gap-4">
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
          <div className="flex items-center gap-2 bg-bg-tertiary border border-border rounded-xl px-4 py-3">
            <Icon icon={AlertCircle} size={16} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-text-primary">{globalError}</p>
          </div>
        )}

        {/* Botón submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          leadingIcon={loading ? <Icon icon={Loader2} size={18} className="animate-spin" /> : undefined}
          className="w-full mt-1"
        >
          {loading
            ? (tab === "login" ? "Entrando…" : "Creando cuenta…")
            : (tab === "login" ? "Iniciar sesión" : "Crear cuenta")}
        </Button>

        {/* Hint de contraseña olvidada */}
        {tab === "login" && (
          <p className="text-center text-sm text-text-tertiary">
            ¿Olvidaste tu contraseña?{" "}
            <a href="/auth/forgot-password" className="text-text-primary font-medium underline underline-offset-4 decoration-border hover:decoration-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]">
              Recupérala aquí
            </a>
          </p>
        )}
      </div>
    </form>
  );
}
