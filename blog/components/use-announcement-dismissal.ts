"use client";

import { useCallback, useEffect, useState } from "react";

type StoredDismissal = { signature: string; expiresAt: number };

export function useAnnouncementDismissal(kind: "banner" | "popup", settings: object) {
  const signature = JSON.stringify(settings);
  const key = `bloging:announcement-dismissal:${kind}`;
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(key);
      const saved = value ? JSON.parse(value) as StoredDismissal : null;
      setOpen(!(saved && saved.signature === signature && saved.expiresAt > Date.now()));
    } catch {
      setOpen(true);
    } finally {
      setReady(true);
    }
  }, [key, signature]);

  const dismissFor = useCallback((days: number) => {
    try {
      window.localStorage.setItem(key, JSON.stringify({ signature, expiresAt: Date.now() + days * 24 * 60 * 60 * 1_000 } satisfies StoredDismissal));
    } catch {
      // Dismissing still works for the current visit if browser storage is unavailable.
    }
    setOpen(false);
  }, [key, signature]);

  return { open: ready && open, dismissFor };
}
