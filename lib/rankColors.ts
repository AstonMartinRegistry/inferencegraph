import { averageOverWindow } from "./stats";
import type { LatencyPoint, MetricKey, ProviderId } from "./types";

/** Slowest (index 0) → fastest (last index). */
export const LATENCY_RANK_COLORS = [
  "#F0F0C9",
  "#F1EAB1",
  "#F1E398",
  "#F1D667",
  "#F2BB05",
  "#E58507",
  "#D74E09",
  "#A32E0A",
  "#6E0E0A",
] as const;

export function colorsByAverageRank(
  activeProviders: ProviderId[],
  series: Record<ProviderId, LatencyPoint[]>,
  metric: MetricKey,
  windowMs: number,
): Map<ProviderId, string> {
  const ranked = activeProviders
    .map((id) => ({
      id,
      avg: averageOverWindow(series[id] ?? [], metric, windowMs),
    }))
    .filter((entry): entry is { id: ProviderId; avg: number } => entry.avg !== null)
    .sort((a, b) => a.avg - b.avg);

  const colors = new Map<ProviderId, string>();
  const paletteLen = LATENCY_RANK_COLORS.length;

  for (let rank = 0; rank < ranked.length; rank++) {
    const colorIndex =
      ranked.length === 1
        ? paletteLen - 1
        : paletteLen -
          1 -
          Math.round((rank * (paletteLen - 1)) / (ranked.length - 1));
    colors.set(ranked[rank].id, LATENCY_RANK_COLORS[colorIndex]);
  }

  for (const id of activeProviders) {
    if (!colors.has(id)) {
      colors.set(id, LATENCY_RANK_COLORS[0]);
    }
  }

  return colors;
}

export function providerColor(
  colors: Map<ProviderId, string>,
  id: ProviderId,
): string {
  return colors.get(id) ?? LATENCY_RANK_COLORS[0];
}

function paletteIndex(color: string): number {
  const index = LATENCY_RANK_COLORS.indexOf(
    color as (typeof LATENCY_RANK_COLORS)[number],
  );
  return index === -1 ? 0 : index;
}

export function spreadColorBlobs(
  activeProviders: ProviderId[],
  colors: Map<ProviderId, string>,
  count = 3,
): { color: string; left: number }[] {
  if (activeProviders.length === 0) return [];

  const sorted = [...activeProviders].sort(
    (a, b) =>
      paletteIndex(providerColor(colors, a)) -
      paletteIndex(providerColor(colors, b)),
  );

  const picks =
    sorted.length <= count
      ? sorted
      : Array.from({ length: count }, (_, i) =>
          sorted[Math.round((i * (sorted.length - 1)) / (count - 1))],
        );

  const positions =
    picks.length === 1
      ? [50]
      : picks.length === 2
        ? [28, 72]
        : [12, 50, 88];

  return picks.map((id, i) => ({
    color: providerColor(colors, id),
    left: positions[i] ?? 50,
  }));
}
