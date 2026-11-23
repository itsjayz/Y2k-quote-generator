"use client";

import { useSyncExternalStore } from "react";

/** Tiny localStorage-backed store, hydration-safe via useSyncExternalStore. */
export function createStore<T>(key: string, fallback: T) {
  let value = fallback;
  let loaded = false;
  const subs = new Set<() => void>();

  const load = () => {
    if (loaded) return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) value = JSON.parse(raw) as T;
    } catch {
      /* storage unavailable — keep fallback */
    }
  };

  return {
    subscribe(cb: () => void) {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    get() {
      load();
      return value;
    },
    getServer() {
      return fallback;
    },
    set(next: T) {
      value = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      subs.forEach((f) => f());
    },
  };
}

export function useStore<T>(store: ReturnType<typeof createStore<T>>) {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

const fmt = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function useClock() {
  return useSyncExternalStore(
    (cb) => {
      const t = window.setInterval(cb, 5000);
      return () => window.clearInterval(t);
    },
    fmt,
    () => "--:--"
  );
}
