"use client";

const retryDelay = 5_000;
const timeout = 4 * 60 * 1_000;

type WaitForDeploymentOptions = {
  id: string;
  version?: string;
  deleted?: boolean;
  signal?: AbortSignal;
};

export async function waitForDeployment({ id, version, deleted = false, signal }: WaitForDeploymentOptions) {
  const deadline = Date.now() + timeout;

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

    await new Promise<void>((resolve) => window.setTimeout(resolve, retryDelay));
  }

  return false;
}
