export async function assertResponseOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { errorCode?: string; error?: string };
    throw new Error(body.errorCode ?? body.error ?? "openaq.unknown");
  }
}
