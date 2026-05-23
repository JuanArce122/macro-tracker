import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import Image from "next/image";
import Icon from "@/app/components/ui/Icon";
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
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 gap-8">
        {/* Logo + branding */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/icon.svg"
            alt="Macro Tracker"
            width={64}
            height={64}
            priority
            className="w-16 h-16"
          />
          <div>
            <h1 className="font-display text-4xl tracking-[-0.02em] font-semibold text-text-primary">Macro Tracker</h1>
            <p className="text-sm text-text-tertiary mt-2">Nueva contraseña</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-[400px] bg-bg-secondary rounded-xl border border-border overflow-hidden">
          {!valid ? (
            <InvalidToken reason={reason!} />
          ) : (
            <Suspense fallback={<div className="h-72 animate-pulse bg-bg-tertiary" />}>
              <ResetPasswordForm token={token!} />
            </Suspense>
          )}
        </div>

        <a
          href="/auth"
          className="inline-flex items-center gap-1 text-sm text-text-tertiary active:text-text-primary transition-colors duration-200 ease-[var(--ease-editorial)]"
        >
          <Icon icon={ChevronLeft} size={16} />
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
      <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center text-accent-warm">
        <Icon icon={AlertTriangle} size={28} />
      </div>
      <div>
        <h2 className="font-display text-2xl tracking-[-0.02em] font-medium text-text-primary mb-2">
          {isExpired ? "Enlace expirado" : "Enlace no válido"}
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {isExpired
            ? "Este enlace de recuperación ya expiró. Los enlaces son válidos por 15 minutos."
            : "Este enlace de recuperación no es válido o ya fue usado."}
        </p>
      </div>
      <a
        href="/auth/forgot-password"
        className="w-full inline-flex items-center justify-center bg-text-primary text-bg-primary font-medium rounded-xl py-3 px-6 text-sm active:opacity-90 transition-opacity duration-200 ease-[var(--ease-editorial)]"
      >
        Solicitar nuevo enlace
      </a>
    </div>
  );
}
