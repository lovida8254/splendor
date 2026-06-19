"use client";

import { create } from "zustand";

export type ToastTone = "score" | "ai" | "info";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  sub?: string;
}

let seq = 0;
const TTL = 3200;

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  remove: (id: number) => void;
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-4) }));
    if (typeof window !== "undefined") {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), TTL);
    }
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const pushToast = (t: Omit<Toast, "id">) => useToasts.getState().push(t);
