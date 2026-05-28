"use client";

import { create } from "zustand";

/**
 * Global "vi navigerar"-state. Initieras av BoardSwitcher/Link-klick,
 * nollställs av NavProgress-komponenten när pathname har bytts.
 *
 * Användning:
 *   const start = useNavStore(s => s.start);
 *   start(); router.push(...);
 */
type NavStore = {
  navigating: boolean;
  /** Vilket board vi är på väg till (för fade-target etc.) */
  targetId: string | null;
  start: (targetId?: string) => void;
  stop: () => void;
};

export const useNavStore = create<NavStore>((set) => ({
  navigating: false,
  targetId: null,
  start: (targetId) => set({ navigating: true, targetId: targetId ?? null }),
  stop: () => set({ navigating: false, targetId: null }),
}));
