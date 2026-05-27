export type ProviderId =
  | "deepinfra"
  | "cerebras"
  | "openrouter"
  | "groq"
  | "fireworks"
  | "nebius"
  | "huggingface"
  | "novita"
  | "mara"
  | "sambanova"
  | "deepinfra-emb"
  | "openrouter-emb"
  | "fireworks-emb"
  | "nebius-emb"
  | "huggingface-emb"
  | "novita-emb";

export type MetricKey = "ttft" | "ttlt" | "tpot";

export type PingFailure = "timeout" | "error" | "rate_limit";

export const REQUEST_TIMEOUT_MS = 60_000;

export type LatencyPoint = {
  timestamp: number;
  ttft: number | null;
  ttlt: number | null;
  completionTokens: number | null;
  ok: boolean;
  failure?: PingFailure | null;
  error?: string | null;
};

export type PingResult = {
  id: ProviderId;
  ttft: number | null;
  ttlt: number;
  completionTokens: number | null;
  ok: boolean;
  failure?: PingFailure | null;
  status?: number;
  error?: string;
};

export function classifyFailure(
  error?: string,
  status?: number,
): PingFailure {
  if (status === 429) return "rate_limit";
  const msg = (error ?? "").toLowerCase();
  if (
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("too many requests")
  ) {
    return "rate_limit";
  }
  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("aborted") ||
    msg.includes("abort")
  ) {
    return "timeout";
  }
  return "error";
}

export function parseApiError(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; code?: string };
      message?: string;
      detail?: string | Array<string | { msg?: string; message?: string }>;
    };

    if (typeof parsed.detail === "string" && parsed.detail.length > 0) {
      return parsed.detail;
    }
    if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
      const first = parsed.detail[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        const msg = first.msg ?? first.message;
        if (typeof msg === "string" && msg.length > 0) return msg;
      }
    }

    const msg = parsed.error?.message ?? parsed.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
    const code = parsed.error?.code;
    if (typeof code === "string" && code.length > 0) return code;
  } catch {
    // not JSON — use raw text below
  }
  return raw;
}

export function formatFailureLabel(point: LatencyPoint): string {
  if (point.failure === "timeout") return "timeout";
  if (point.failure === "rate_limit") return "rate limit";

  const msg = parseApiError(point.error);
  if (msg) {
    const lower = msg.toLowerCase();
    if (lower.includes("rate limit") || lower.includes("rate_limit")) {
      return "rate limit";
    }
    if (
      lower.includes("unable to process") ||
      lower.includes("repeat the request later")
    ) {
      return "unavailable";
    }
    if (msg.length > 28) return `${msg.slice(0, 25).toLowerCase()}…`;
    return msg.toLowerCase();
  }

  return "err";
}

export function computeTpot(point: {
  ttft: number | null;
  ttlt: number | null;
  completionTokens: number | null;
}): number | null {
  if (
    point.ttft === null ||
    point.ttlt === null ||
    point.completionTokens === null ||
    point.completionTokens <= 0
  ) {
    return null;
  }
  const decodeMs = point.ttlt - point.ttft;
  if (decodeMs <= 0) return null;
  return decodeMs / point.completionTokens;
}

export function metricValue(
  point: LatencyPoint,
  metric: MetricKey,
): number | null {
  if (!point.ok) return null;
  if (metric === "ttft") return point.ttft;
  if (metric === "ttlt") return point.ttlt;
  return computeTpot(point);
}

/** Value to plot — timeouts on Total show at the chart ceiling. */
export function chartMetricValue(
  point: LatencyPoint,
  metric: MetricKey,
  yMax: number,
): number | null {
  if (point.failure === "timeout") {
    if (metric === "ttlt") return yMax;
    return null;
  }
  return metricValue(point, metric);
}

export function formatMetricDisplay(
  point: LatencyPoint | null,
  metric: MetricKey,
): string {
  if (!point) return "—";
  if (!point.ok) return formatFailureLabel(point);

  const value = metricValue(point, metric);
  if (value === null) return "—";

  if (metric === "tpot") {
    if (value >= 100) return `${value.toFixed(0)} ms/tok`;
    if (value >= 10) return `${value.toFixed(1)} ms/tok`;
    return `${value.toFixed(2)} ms/tok`;
  }
  return `${Math.round(value)} ms`;
}

export function metricSortKey(
  point: LatencyPoint | null,
  metric: MetricKey,
): number {
  if (!point) return Number.POSITIVE_INFINITY;
  if (point.failure === "timeout" || point.failure === "rate_limit") {
    return Number.POSITIVE_INFINITY;
  }
  if (!point.ok) return Number.POSITIVE_INFINITY - 1;
  const value = metricValue(point, metric);
  if (value === null) return Number.POSITIVE_INFINITY - 0.5;
  return value;
}
