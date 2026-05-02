import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = { title: "Recuperar contraseña — Macro Tracker" };

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Cabecera */}
      <div className="bg-emerald-500 pt-16 pb-20 flex flex-col items-center gap-3 px-6">
        <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
          <span className="text-3xl font-black text-white">M</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Macro Tracker</h1>
        <p className="text-emerald-100 text-sm">Recuperar contraseña</p>
      </div>

      <div className="flex-1 flex flex-col px-5 -mt-10">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden w-full max-w-[430px] mx-auto">
          <ForgotPasswordForm />
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
