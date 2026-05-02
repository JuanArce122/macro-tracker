"use client";

import { useEffect } from "react";

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

  return (
    <div
      className={`fixed bottom-24 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-white toast-slide-up ${
        type === "error" ? "bg-red-600" : "bg-gray-800"
      }`}
    >
      <p className="text-sm font-medium flex-1">{message}</p>
      {action && (
        <button
          onClick={() => { action.onClick(); onDismiss(); }}
          className="text-sm font-bold underline flex-shrink-0 active:opacity-70"
        >
          {action.label}
        </button>
      )}
      <button onClick={onDismiss} className="text-white/50 flex-shrink-0 active:opacity-70">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
