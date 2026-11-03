"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Session = { authenticated: boolean | null; updateSession: (authenticated: boolean) => void };
const SessionContext = createContext<Session | null>(null);
const sessionEvent = "wavy-admin-session";
const signedOutHint = "wavy-signed-out-until";
const signedOutHintMs = 5 * 60 * 1000;

function rememberSignedOut(signedOut: boolean) {
  try {
    if (signedOut) sessionStorage.setItem(signedOutHint, String(Date.now() + signedOutHintMs));
    else sessionStorage.removeItem(signedOutHint);
  } catch { /* Storage is optional; the server remains authoritative. */ }
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/login", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      if (!response.ok) throw new Error("Session check failed");
      const data = await response.json();
      if (!controller.signal.aborted) {
        const isAuthenticated = data.authenticated === true;
        rememberSignedOut(!isAuthenticated);
        setAuthenticated(isAuthenticated);
      }
    } catch {
      if (!controller.signal.aborted) setAuthenticated(false);
    }
  }, []);
  const updateSession = useCallback((value: boolean) => {
    request.current?.abort();
    setAuthenticated(value);
    rememberSignedOut(!value);
    // Only a notification is stored, never the session cookie or login secret.
    try { localStorage.setItem(sessionEvent, crypto.randomUUID()); } catch { /* Storage may be disabled. */ }
  }, []);
  useEffect(() => {
    let recentlySignedOut = false;
    try { recentlySignedOut = Number(sessionStorage.getItem(signedOutHint)) > Date.now(); } catch { /* Fall back to checking the server. */ }
    if (recentlySignedOut) setAuthenticated(false);
    else void refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === sessionEvent) { rememberSignedOut(false); void refresh(); }
    };
    window.addEventListener("storage", onStorage);
    return () => { request.current?.abort(); window.removeEventListener("storage", onStorage); };
  }, [refresh]);
  const value = useMemo(() => ({ authenticated, updateSession }), [authenticated, updateSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAdminSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("AdminSessionProvider is required");
  return value;
}
