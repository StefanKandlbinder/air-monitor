import { sleep } from "@/lib/time";

const OPENAQ_BASE = "https://api.openaq.org";

export async function openaqGet<T>(
  path: string,
  query?: Record<string, string | string[]>,
  next?: NextFetchRequestConfig
): Promise<T> {
  const url = new URL(`${OPENAQ_BASE}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers = {
    "X-API-Key": process.env.OPENAQ_API_KEY ?? "",
    Accept: "application/json",
  };

  const fetchOptions = { headers, ...(next ? { next } : { cache: "no-store" as const }) };

  const t0 = performance.now();
  let response = await fetch(url.toString(), fetchOptions);
  const elapsed = performance.now() - t0;
  const source = elapsed < 50 ? "cache" : "network";
  console.log(`[openaq] ${response.status} ${path} (${elapsed.toFixed(1)}ms, ${source})`);

  // On 429, respect Retry-After and retry once
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? "5");
    console.log(`[openaq] 429 – retrying after ${retryAfter}s`);
    await sleep(Math.min(retryAfter, 30) * 1000);
    response = await fetch(url.toString(), fetchOptions);
    console.log(`[openaq] retry ${response.status} ${path} (${(performance.now() - t0).toFixed(1)}ms total, network)`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAQ API error ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json() as T;
}
