const OPENAQ_BASE = "https://api.openaq.org";

export async function openaqGet<T>(
  path: string,
  query?: Record<string, string>,
  next?: NextFetchRequestConfig
): Promise<T> {
  const url = new URL(`${OPENAQ_BASE}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "X-API-Key": process.env.OPENAQ_API_KEY ?? "",
      Accept: "application/json",
    },
    ...(next ? { next } : { cache: "no-store" }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAQ API error ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json() as T;
}
