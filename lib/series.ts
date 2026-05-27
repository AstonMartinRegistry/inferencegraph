import { PROVIDERS } from "./providers";
import type { LatencyPoint, ProviderId } from "./types";

export type Series = Record<ProviderId, LatencyPoint[]>;

export function emptySeries(): Series {
  const series = {} as Series;
  for (const provider of PROVIDERS) {
    series[provider.id] = [];
  }
  return series;
}
