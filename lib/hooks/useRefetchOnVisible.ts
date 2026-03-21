"use client";

import { useEffect } from "react";

export function useRefetchOnVisible(onVisible: () => void) {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") onVisible();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [onVisible]);
}
