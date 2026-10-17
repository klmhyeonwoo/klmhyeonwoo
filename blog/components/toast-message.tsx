"use client";

import { useEffect, useRef } from "react";
import { ToastTone, useToast } from "./toast-provider";

export function ToastMessage({ message, tone = "info" }: { message: string; tone?: ToastTone }) {
  const toast = useToast();
  const previous = useRef("");

  useEffect(() => {
    if (!message || message === previous.current) return;
    previous.current = message;
    toast({ message, tone });
  }, [message, toast, tone]);

  useEffect(() => {
    if (!message) previous.current = "";
  }, [message]);

  return null;
}
