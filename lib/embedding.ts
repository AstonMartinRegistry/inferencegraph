import { getConfiguredProviders, INFERENCE_PROMPT, type ProviderConfig } from "./providers";
import { isRetryableStatus, retryDelayMs, sleep } from "./http";
import { classifyFailure, REQUEST_TIMEOUT_MS, type PingResult } from "./types";

async function embedProvider(
  provider: ProviderConfig,
  apiKey: string,
): Promise<Omit<PingResult, "id">> {
  const start = Date.now();

  try {
    let response: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(provider.url, {
        method: "POST",
        headers: provider.headers(apiKey),
        body: JSON.stringify(provider.body(provider.model, INFERENCE_PROMPT)),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (isRetryableStatus(response.status) && attempt < 2) {
        await sleep(retryDelayMs(response, attempt));
        continue;
      }
      break;
    }

    if (!response) {
      return {
        ttft: null,
        ttlt: Date.now() - start,
        completionTokens: null,
        ok: false,
        failure: "error",
        error: "No response",
      };
    }

    const text = await response.text();
    const ttlt = Date.now() - start;

    if (!response.ok) {
      return {
        ttft: null,
        ttlt,
        completionTokens: null,
        ok: false,
        failure: classifyFailure(text, response.status),
        status: response.status,
        error: text.slice(0, 500) || response.statusText,
      };
    }

    return {
      ttft: null,
      ttlt,
      completionTokens: null,
      ok: true,
      status: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return {
      ttft: null,
      ttlt: Date.now() - start,
      completionTokens: null,
      ok: false,
      failure: classifyFailure(message),
      error: message,
    };
  }
}

export async function pingAllEmbeddingProviders(): Promise<PingResult[]> {
  return Promise.all(
    getConfiguredProviders("embedding").map(async (provider) => {
      const apiKey = process.env[provider.envKey]!.trim();
      const result = await embedProvider(provider, apiKey);
      return { id: provider.id, ...result };
    }),
  );
}
