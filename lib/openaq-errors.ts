import { NextResponse } from "next/server";

export type OpenAQErrorCode =
  | "openaq.unauthorized"
  | "openaq.forbidden"
  | "openaq.notFound"
  | "openaq.methodNotAllowed"
  | "openaq.timeout"
  | "openaq.gone"
  | "openaq.unprocessableContent"
  | "openaq.rateLimited"
  | "openaq.serverError"
  | "openaq.unknown";

function parseStatus(error: unknown): number {
  if (error instanceof Error) {
    const match = error.message.match(/OpenAQ API error (\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return 500;
}

export function statusToErrorCode(status: number): OpenAQErrorCode {
  if (status === 401) return "openaq.unauthorized";
  if (status === 403) return "openaq.forbidden";
  if (status === 404) return "openaq.notFound";
  if (status === 405) return "openaq.methodNotAllowed";
  if (status === 408) return "openaq.timeout";
  if (status === 410) return "openaq.gone";
  if (status === 422) return "openaq.unprocessableContent";
  if (status === 429) return "openaq.rateLimited";
  if (status >= 500) return "openaq.serverError";
  return "openaq.unknown";
}

/** Build a structured error response from a caught OpenAQ fetch error. */
export function openaqErrorResponse(error: unknown): NextResponse {
  const status = parseStatus(error);
  const errorCode = statusToErrorCode(status);
  const message = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json({ error: message, errorCode }, { status });
}
