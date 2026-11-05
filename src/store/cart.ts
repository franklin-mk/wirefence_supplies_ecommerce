"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/lib/types";

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

/** Guest cart: lives in localStorage, no account needed until checkout. Updates are synchronous (optimistic). */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, qty = 1) =>
        set((s) => {
          const exists = s.lines.some((l) => l.variantId === line.variantId);
          return {
            lines: exists
              ? s.lines.map((l) => (l.variantId === line.variantId ? { ...l, qty: l.qty + qty } : l))
              : [...s.lines, { ...line, qty }],
          };
        }),
      setQty: (variantId, qty) =>
        set((s) => ({
          lines: qty <= 0 ? s.lines.filter((l) => l.variantId !== variantId) : s.lines.map((l) => (l.variantId === variantId ? { ...l, qty } : l)),
        })),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "wf-cart" }
  )
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.price, 0);
export const cartWeight = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.weightKg, 0);
