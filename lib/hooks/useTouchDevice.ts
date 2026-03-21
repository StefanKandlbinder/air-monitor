"use client";

import { useState } from "react";

export function useTouchDevice(): boolean {
  const [isTouchDevice] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  return isTouchDevice;
}
