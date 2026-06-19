"use client";

import { create } from "zustand";
import { TokenColor } from "@/lib/engine";

export interface Flight {
  id: number;
  color: TokenColor;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  delay: number;
  kind?: "coin" | "card";
}

let seq = 0;

interface FlyState {
  flights: Flight[];
  spawn: (flights: Omit<Flight, "id">[]) => void;
  remove: (id: number) => void;
}

export const useFly = create<FlyState>((set) => ({
  flights: [],
  spawn: (fs) =>
    set((s) => ({ flights: [...s.flights, ...fs.map((f) => ({ ...f, id: ++seq }))] })),
  remove: (id) => set((s) => ({ flights: s.flights.filter((f) => f.id !== id) })),
}));
