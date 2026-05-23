import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Icon from "@/app/components/ui/Icon";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = { title: "Recuperar contraseña — Macro Tracker" };

export default async function ForgotPasswordPage() {
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
            <h1 className="font-serif text-4xl tracking-[-0.02em] text-text-primary">Macro Tracker</h1>
            <p className="text-sm text-text-tertiary mt-2">Recuperar contraseña</p>
          </div>
        </div>

        {/* Card del formulario */}
        <div className="w-full max-w-[400px] bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <ForgotPasswordForm />
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
