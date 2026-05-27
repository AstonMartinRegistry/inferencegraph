import { getConfiguredProviders, INFERENCE_PROMPT, type ProviderConfig } from "./providers";
import { isRetryableStatus, retryDelayMs, sleep } from "./http";
import { classifyFailure, REQUEST_TIMEOUT_MS, type PingResult } from "./types";

type ChunkDelta = {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
};

type StreamChunk = {
  choices?: Array<{
    delta?: ChunkDelta;
    finish_reason?: string | null;
  }>;
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
    total_tokens?: number;
  } | null;
};

function deltaHasToken(delta: ChunkDelta | undefined): boolean {
  if (!delta) return false;
  return (
    (typeof delta.content === "string" && delta.content.length > 0) ||
    (typeof delta.reasoning_content === "string" && delta.reasoning_content.length > 0) ||
    (typeof delta.reasoning === "string" && delta.reasoning.length > 0)
  );
}

async function streamProvider(
  provider: ProviderConfig,
  apiKey: string,
): Promise<Omit<PingResult, "id">> {
  const start = Date.now();

  try {
    let response: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(provider.url, {
        method: "POST",
        headers: {
          ...provider.headers(apiKey),
          Accept: "text/event-stream",
        },
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

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      return {
        ttft: null,
        ttlt: Date.now() - start,
        completionTokens: null,
        ok: false,
        failure: classifyFailure(text, response.status),
        status: response.status,
        error: text.slice(0, 500) || response.statusText,
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let ttft: number | null = null;
    let completionTokens: number | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIdx: number;
      while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);

        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          let parsed: StreamChunk;
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }

          if (ttft === null && deltaHasToken(parsed.choices?.[0]?.delta)) {
            ttft = Date.now() - start;
          }

          if (parsed.usage?.completion_tokens != null) {
            completionTokens = parsed.usage.completion_tokens;
          }
        }
      }
    }

    const ttlt = Date.now() - start;
    return {
      ttft,
      ttlt,
      completionTokens,
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

export async function pingAllProviders(): Promise<PingResult[]> {
  return Promise.all(
    getConfiguredProviders("chat").map(async (provider) => {
      const apiKey = process.env[provider.envKey]!.trim();
      const result = await streamProvider(provider, apiKey);
      return { id: provider.id, ...result };
    }),
  );
}
