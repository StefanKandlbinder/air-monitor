import https from "node:https";

const API_BASE_URL = "https://www2.land-oberoesterreich.gv.at/imm/jaxrs";
const OOE_HOSTNAME = "www2.land-oberoesterreich.gv.at";

export async function fetchUpperAustriaJson<T>(
  path: string,
  query?: Record<string, string>
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  return await new Promise<T>((resolve, reject) => {
    // The upstream endpoint currently serves an incomplete TLS chain.
    const agent = new https.Agent({
      rejectUnauthorized: url.hostname !== OOE_HOSTNAME
    });

    https
      .get(
        url,
        {
          agent,
          headers: {
            "User-Agent": "linzair-nextjs"
          }
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          response.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            if ((response.statusCode ?? 500) >= 400) {
              reject(new Error(`Upstream HTTP error: ${response.statusCode}`));
              return;
            }

            try {
              resolve(JSON.parse(body) as T);
            } catch {
              reject(new Error("Invalid JSON returned by upstream"));
            }
          });
        }
      )
      .on("error", reject);
  });
}
