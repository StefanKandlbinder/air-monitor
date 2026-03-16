export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_MS = 7 * DAY_MS;

/** Seconds remaining until the start of the next hour, plus a 5-minute buffer, minimum 60. */
export function secondsUntilNextHour(): number {
  const now = new Date();
  return Math.max(3600 - (now.getMinutes() * 60 + now.getSeconds()) + 300, 60);
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
