export const HOUR_MS = 60 * 60 * 1000;

/** Floor a Date to the start of its hour. */
export function floorToHour(date: Date): Date {
  return new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);
}

/** Floor a unix-ms timestamp to the start of its hour, as an ISO string. */
export function floorToHourIso(ms: number): string {
  return new Date(Math.floor(ms / HOUR_MS) * HOUR_MS).toISOString();
}

/** Format a Date as a clean full-hour ISO string: YYYY-MM-DDTHH:00:00Z */
export function toHourIso(date: Date): string {
  return date.toISOString().slice(0, 13) + ":00:00Z";
}
