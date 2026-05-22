"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Icon from "@/app/components/ui/Icon";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
};

export default function Toast({ message, type = "success", action, onDismiss }: ToastProps) {
  useEffect(() => {
    if (action) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [action, onDismiss]);

  const isError = type === "error";

  return (
    <div
      className={`fixed bottom-24 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl toast-slide-up shadow-[var(--shadow-subtle)] ${
        isError ? "bg-red-600 text-white" : "bg-text-primary text-bg-primary"
      }`}
    >
      <p className="text-sm font-medium flex-1">{message}</p>
      {action && (
        <button
          onClick={() => { action.onClick(); onDismiss(); }}
          className={`text-sm font-medium underline underline-offset-4 flex-shrink-0 active:opacity-70 transition-opacity duration-200 ease-[var(--ease-editorial)] ${
            isError ? "decoration-white/60" : "decoration-bg-primary/60"
          }`}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className={`flex-shrink-0 active:opacity-70 transition-opacity duration-200 ease-[var(--ease-editorial)] ${
          isError ? "text-white/60" : "text-bg-primary/60"
        }`}
        aria-label="Cerrar"
      >
        <Icon icon={X} size={14} />
      </button>
    </div>
  );
}
