"use client";

import { useEffect, useState, useTransition } from "react";

function dailyKey(key: string): string {
  return `${key}:${new Date().toISOString().slice(0, 10)}`;
}

export function useSessionFlag(key: string): boolean {
  const [active, setActive] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const k = dailyKey(key);
    if (!localStorage.getItem(k)) {
      localStorage.setItem(k, "1");
      startTransition(() => setActive(true));
    }
  }, [key, startTransition]);

  return active;
}
