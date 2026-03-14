"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import type { Dictionary } from "@/components/providers/DictionaryProvider";

function getErrorMessage(error: unknown, dict: Dictionary): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error) {
    return error;
  }
  return dict.toast.unknownRequestError;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const dict = useDictionary();
  const dictRef = useRef(dict);
  dictRef.current = dict;

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            toast.error(dictRef.current.toast.requestFailed, {
              description: getErrorMessage(error, dictRef.current),
            });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            toast.error(dictRef.current.toast.actionFailed, {
              description: getErrorMessage(error, dictRef.current),
            });
          },
        }),
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
