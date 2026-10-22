"use client";

const initialRetryDelay = 5_000;
const maxRetryDelay = 20_000;
const timeout = 4 * 60 * 1_000;

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
    // Back off after the first checks so one publish does not create nearly
    // fifty uncached status-route invocations during a slow deployment.
    const delay = Math.min(initialRetryDelay * (1.5 ** attempts), maxRetryDelay);
    attempts += 1;
    await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
  }

  return false;
}
