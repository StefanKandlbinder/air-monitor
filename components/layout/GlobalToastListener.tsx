"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/components/providers/DictionaryProvider";

export function GlobalToastListener() {
  const dict = useDictionary();
  const { unexpectedError, unknownError, unhandledRejection, unhandledRequestFailed } = dict.toast;

  useEffect(() => {
    const onGlobalError = (event: ErrorEvent) => {
      toast.error(unexpectedError, {
        description: event.message || unknownError,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : unhandledRequestFailed;

      toast.error(unhandledRejection, {
        description: reason,
      });
    };

    window.addEventListener("error", onGlobalError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onGlobalError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [unexpectedError, unknownError, unhandledRejection, unhandledRequestFailed]);

  return null;
}
