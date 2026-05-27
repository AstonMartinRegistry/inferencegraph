export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 10_000);
    }
  }
  return 1500 * (attempt + 1);
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502;
}
