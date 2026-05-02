import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AuthForm from "./AuthForm";

export const metadata = {
  title: "Macro Tracker — Acceder",
};

export default async function AuthPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Cabecera esmeralda */}
      <div className="bg-emerald-500 pt-16 pb-20 flex flex-col items-center gap-3 px-6">
        <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
          <span className="text-3xl font-black text-white">M</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Macro Tracker</h1>
        <p className="text-emerald-100 text-sm">Seguimiento nutricional con IA</p>
      </div>

      {/* Card del formulario */}
      <div className="flex-1 flex flex-col px-5 -mt-10">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden w-full max-w-[430px] mx-auto">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50 dark:bg-gray-800 rounded-3xl" />}>
            <AuthForm />
          </Suspense>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6 pb-8">
          Tus datos son privados y solo tú puedes verlos.
        </p>
      </div>
    </div>
  );
}
