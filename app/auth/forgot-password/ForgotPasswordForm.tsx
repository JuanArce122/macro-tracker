"use client";

import { useState } from "react";

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
      // Siempre mostramos éxito (no filtramos si el email existe)
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
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Revisa tu email</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Si <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span> está registrado,
            recibirás un enlace para restablecer tu contraseña. El enlace expira en 15 minutos.
          </p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600">¿No lo ves? Revisa la carpeta de spam.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">¿Olvidaste tu contraseña?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Ingresa tu email y te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
          onBlur={validateEmail}
          autoComplete="email"
          inputMode="email"
          placeholder="tucorreo@ejemplo.com"
          style={{ fontSize: "16px" }}
          className={`w-full rounded-2xl border px-4 py-3.5 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all ${
            emailError
              ? "border-red-300 dark:border-red-700 focus:ring-red-200"
              : "border-gray-200 dark:border-gray-700 focus:ring-emerald-200 focus:border-emerald-400"
          }`}
        />
        {emailError && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-red-500">{emailError}</p>
          </div>
        )}
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
        disabled={status === "loading"}
        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors shadow-sm"
      >
        {status === "loading" ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Enviando…
          </>
        ) : (
          "Enviar enlace"
        )}
      </button>
    </form>
  );
}
