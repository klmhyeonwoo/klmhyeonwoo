"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { IconCheckmarkCircleFill, IconExclamationmarkCircleFill, IconXmarkCircleFill, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";

export type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };
type ToastInput = { message: string; tone?: ToastTone };

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <IconCheckmarkCircleFill size={22} />;
  if (tone === "error") return <IconXmarkCircleFill size={22} />;
  return <IconExclamationmarkCircleFill size={22} />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback(({ message, tone = "info" }: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1_000);
    setToasts((current) => [...current, { id, message, tone }].slice(-3));
  }, []);
  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((item) => item.id !== id)), []);

  useEffect(() => {
    const timers = toasts.map((item) => window.setTimeout(() => dismiss(item.id), item.tone === "error" ? 5_000 : 3_600));
    return () => timers.forEach(window.clearTimeout);
  }, [dismiss, toasts]);

  const value = useMemo(() => toast, [toast]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite" aria-atomic="true">{toasts.map((item) => <div className={`service-toast ${item.tone}`} key={item.id} role={item.tone === "error" ? "alert" : "status"}><ToastIcon tone={item.tone} /><p>{item.message}</p><button type="button" aria-label="알림 닫기" onClick={() => dismiss(item.id)}><IconXmarkLine size={18} /></button></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used within ToastProvider");
  return toast;
}
