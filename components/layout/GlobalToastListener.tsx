"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function GlobalToastListener() {
  useEffect(() => {
    const onGlobalError = (event: ErrorEvent) => {
      toast.error("Unexpected application error", {
        description: event.message || "An unknown error occurred.",
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "An unhandled request failed.";

      toast.error("Unhandled promise rejection", {
        description: reason,
      });
    };

    window.addEventListener("error", onGlobalError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onGlobalError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
