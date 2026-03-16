import { sleep } from "@/lib/time";

/** Run tasks with at most `limit` concurrent executions, with an optional delay (ms) between each task start. */
export async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  delayMs = 0
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      if (delayMs > 0) await sleep(i * delayMs);
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
