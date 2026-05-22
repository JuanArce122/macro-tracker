"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Check, Loader2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import PasswordStrength, { getStrength } from "../PasswordStrength";

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
        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center text-macro-protein">
          <Icon icon={Check} size={28} />
        </div>
        <div>
          <h2 className="font-serif text-2xl tracking-[-0.02em] text-text-primary mb-2">¡Contraseña actualizada!</h2>
          <p className="text-sm text-text-secondary">Redirigiendo al inicio de sesión…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-2xl tracking-[-0.02em] text-text-primary mb-1.5">Nueva contraseña</h2>
        <p className="text-sm text-text-secondary">Elige una contraseña segura para tu cuenta.</p>
      </div>

      {/* Password */}
      <div>
        <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary block mb-1.5">
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
            className={`w-full bg-bg-primary border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 pr-12 py-3.5 focus:outline-none transition-colors duration-200 ease-[var(--ease-editorial)] ${
              passwordError
                ? "border-red-600 focus:border-red-600"
                : "border-border focus:border-text-primary"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary active:text-text-primary p-1 transition-colors duration-200 ease-[var(--ease-editorial)]"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Icon icon={showPassword ? Eye : EyeOff} size={18} />
          </button>
        </div>
        {passwordError && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Icon icon={AlertCircle} size={14} className="text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-600">{passwordError}</p>
          </div>
        )}
        <PasswordStrength password={password} />
      </div>

      {globalError && (
        <div className="flex items-center gap-2 bg-bg-tertiary border border-border rounded-xl px-4 py-3">
          <Icon icon={AlertCircle} size={16} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-text-primary">{globalError}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={loading}
        leadingIcon={loading ? <Icon icon={Loader2} size={18} className="animate-spin" /> : undefined}
        className="w-full"
      >
        {loading ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
