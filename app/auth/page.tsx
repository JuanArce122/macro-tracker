import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import AuthForm from "./AuthForm";

export const metadata = {
  title: "Macro Tracker — Acceder",
};

export default async function AuthPage() {
  const session = await auth();
  if (session) redirect("/");

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
            <p className="text-sm text-text-tertiary mt-2">Seguimiento nutricional con IA</p>
          </div>
        </div>

        {/* Card del formulario */}
        <div className="w-full max-w-[400px] bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <Suspense fallback={<div className="h-72 animate-pulse bg-bg-tertiary" />}>
            <AuthForm />
          </Suspense>
        </div>

        <p className="text-xs text-text-tertiary text-center max-w-[280px]">
          Tus datos son privados y solo tú puedes verlos.
        </p>
      </div>
    </div>
  );
}
