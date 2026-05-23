"use client";

import { useState } from "react";
import { Mail, AlertCircle, Loader2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";

type Status = "idle" | "loading" | "sent";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [globalError, setGlobalError] = useState("");

  function validateEmail() {
    if (!email) { setEmailError("El email es requerido."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Ingresa un email válido."); return false; }
    setEmailError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail()) return;

    setStatus("loading");
    setGlobalError("");

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus("sent");
    } catch {
      setGlobalError("No se pudo conectar. Intenta de nuevo.");
      setStatus("idle");
    }
  }

  // Estado: email enviado
  if (status === "sent") {
    return (
      <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center text-text-primary">
          <Icon icon={Mail} size={28} />
        </div>
        <div>
          <h2 className="font-display text-2xl tracking-[-0.02em] font-medium text-text-primary mb-2">Revisa tu email</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Si <span className="text-text-primary font-medium">{email}</span> está registrado,
            recibirás un enlace para restablecer tu contraseña. El enlace expira en 15 minutos.
          </p>
        </div>
        <p className="text-xs text-text-tertiary">¿No lo ves? Revisa la carpeta de spam.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl tracking-[-0.02em] font-medium text-text-primary mb-1.5">¿Olvidaste tu contraseña?</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Ingresa tu email y te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
          onBlur={validateEmail}
          autoComplete="email"
          inputMode="email"
          placeholder="tucorreo@ejemplo.com"
          style={{ fontSize: "16px" }}
          className={`w-full bg-bg-primary border rounded-xl text-text-primary placeholder:text-text-tertiary px-4 py-3.5 focus:outline-none transition-colors duration-200 ease-[var(--ease-editorial)] ${
            emailError
              ? "border-red-600 focus:border-red-600"
              : "border-border focus:border-text-primary"
          }`}
        />
        {emailError && (
          <div className="flex items-center gap-1.5">
            <Icon icon={AlertCircle} size={14} className="text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-600">{emailError}</p>
          </div>
        )}
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
        disabled={status === "loading"}
        leadingIcon={status === "loading" ? <Icon icon={Loader2} size={18} className="animate-spin" /> : undefined}
        className="w-full"
      >
        {status === "loading" ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
