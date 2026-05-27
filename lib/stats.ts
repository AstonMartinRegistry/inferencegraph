import { metricValue, type LatencyPoint, type MetricKey } from "./types";

export function averageOverWindow(
  points: LatencyPoint[],
  metric: MetricKey,
  windowMs: number,
): number | null {
  const cutoff = Date.now() - windowMs;
  let sum = 0;
  let count = 0;
  for (const p of points) {
    if (p.timestamp < cutoff) continue;
    const v = metricValue(p, metric);
    if (v === null) continue;
    sum += v;
    count++;
  }
  return count === 0 ? null : sum / count;
}
