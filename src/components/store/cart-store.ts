"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type CartLine = { productId: string; quantity: number };

export const MAX_QUANTITY = 20;

const EMPTY: CartLine[] = [];
const cache = new Map<string, { raw: string | null; lines: CartLine[] }>();
const listeners = new Set<() => void>();

function parse(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    return value.filter(
      (line): line is CartLine =>
        typeof line?.productId === "string" && Number.isInteger(line?.quantity) && line.quantity > 0,
    );
  } catch {
    return EMPTY;
  }
}

function read(key: string) {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {}
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.lines;
  const lines = parse(raw);
  cache.set(key, { raw, lines });
  return lines;
}

function write(key: string, lines: CartLine[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(lines));
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useCart(shopId: string) {
  const key = `namma-angadi:cart:${shopId}`;
  const lines = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => EMPTY,
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const current = read(key);
      const clamped = Math.min(Math.max(0, quantity), MAX_QUANTITY);
      const next = current.some((line) => line.productId === productId)
        ? current.map((line) => (line.productId === productId ? { ...line, quantity: clamped } : line))
        : [...current, { productId, quantity: clamped }];
      write(
        key,
        next.filter((line) => line.quantity > 0),
      );
    },
    [key],
  );

  const add = useCallback(
    (productId: string, quantity = 1) => {
      const existing = read(key).find((line) => line.productId === productId);
      setQuantity(productId, (existing?.quantity ?? 0) + quantity);
    },
    [key, setQuantity],
  );

  const clear = useCallback(() => write(key, EMPTY), [key]);

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  return { lines, count, add, setQuantity, clear };
}
