import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { title: "Nueva contraseña — Macro Tracker" };

async function validateToken(token: string) {
  if (!token) return { valid: false, reason: "no-token" as const };

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return { valid: false, reason: "invalid" as const };
  if (record.expiresAt < new Date()) return { valid: false, reason: "expired" as const };

  return { valid: true, reason: null };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { token } = await searchParams;
  const { valid, reason } = await validateToken(token ?? "");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="bg-emerald-500 pt-16 pb-20 flex flex-col items-center gap-3 px-6">
        <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
          <span className="text-3xl font-black text-white">M</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Macro Tracker</h1>
        <p className="text-emerald-100 text-sm">Nueva contraseña</p>
      </div>

      <div className="flex-1 flex flex-col px-5 -mt-10">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden w-full max-w-[430px] mx-auto">
          {!valid ? (
            <InvalidToken reason={reason!} />
          ) : (
            <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50 dark:bg-gray-800 rounded-3xl" />}>
              <ResetPasswordForm token={token!} />
            </Suspense>
          )}
        </div>

        <a
          href="/auth"
          className="flex items-center justify-center gap-1.5 text-sm text-gray-400 dark:text-gray-600 mt-6 pb-8 active:opacity-60"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio de sesión
        </a>
      </div>
    </div>
  );
}

function InvalidToken({ reason }: { reason: "no-token" | "invalid" | "expired" }) {
  const isExpired = reason === "expired";
  return (
    <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          {isExpired ? "Enlace expirado" : "Enlace no válido"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {isExpired
            ? "Este enlace de recuperación ya expiró. Los enlaces son válidos por 15 minutos."
            : "Este enlace de recuperación no es válido o ya fue usado."}
        </p>
      </div>
      <a
        href="/auth/forgot-password"
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl py-3.5 text-center transition-colors"
      >
        Solicitar nuevo enlace
      </a>
    </div>
  );
}
