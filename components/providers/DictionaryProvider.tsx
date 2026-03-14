"use client";

import { createContext, useContext } from "react";
import type en from "@/dictionaries/en.json";

export type Dictionary = typeof en;

const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({
  dict,
  children,
}: {
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={dict}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): Dictionary {
  const dict = useContext(DictionaryContext);
  if (!dict)
    throw new Error("useDictionary must be used within DictionaryProvider");
  return dict;
}
