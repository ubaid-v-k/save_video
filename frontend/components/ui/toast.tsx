"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const contextValue: ToastContextType = {
    success: (msg, title) => addToast("success", msg, title),
    error: (msg, title) => addToast("error", msg, title),
    warning: (msg, title) => addToast("warning", msg, title),
    info: (msg, title) => addToast("info", msg, title),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border animate-fade-in text-sm backdrop-blur-md transition-all ${
              t.type === "success"
                ? "bg-[#111c1d]/90 border-emerald-500/30 text-emerald-100"
                : t.type === "error"
                ? "bg-[#231219]/90 border-rose-500/30 text-rose-100"
                : t.type === "warning"
                ? "bg-[#251e12]/90 border-amber-500/30 text-amber-100"
                : "bg-[#141829]/90 border-indigo-500/30 text-indigo-100"
            }`}
          >
            <span className="shrink-0 mt-0.5">
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === "error" && <XCircle className="w-5 h-5 text-rose-400" />}
              {t.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === "info" && <Info className="w-5 h-5 text-indigo-400" />}
            </span>
            <div className="flex-1 overflow-hidden pr-1">
              {t.title && <p className="font-semibold text-white mb-0.5">{t.title}</p>}
              <p className="opacity-90 break-words leading-snug">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-white/50 hover:text-white p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
