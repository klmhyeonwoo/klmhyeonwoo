"use client";

const initialRetryDelay = 8_000;
const maxRetryDelay = 30_000;
const timeout = 3 * 60 * 1_000;

type WaitForDeploymentOptions = {
  id: string;
  version?: string;
  deleted?: boolean;
  signal?: AbortSignal;
};

export async function waitForDeployment({ id, version, deleted = false, signal }: WaitForDeploymentOptions) {
  const deadline = Date.now() + timeout;
  let attempts = 0;

  while (Date.now() < deadline && !signal?.aborted) {
    try {
      const response = await fetch(`/posts/${id}/status?check=${Date.now()}`, {
        cache: "no-store",
        signal,
      });
      if ((deleted && response.status === 404) || (!deleted && response.ok && (await response.json() as { version?: string }).version === version)) {
        return true;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
    }

    // Deployment completion is normally not observable for tens of seconds.
    // The longer backoff limits one publish to roughly eight status checks.
    const delay = Math.min(initialRetryDelay * (1.5 ** attempts), maxRetryDelay);
    attempts += 1;
    await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
  }

  return false;
}
