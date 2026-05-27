import { chartMetricValue, type LatencyPoint, type MetricKey } from "./types";

export const POLL_INTERVAL_MS = 20_000;

export type ChartPoint = {
  timestamp: number;
  value: number;
  sources: LatencyPoint[];
};

export function chartPointsForWindow(
  points: LatencyPoint[],
  metric: MetricKey,
  yMax: number,
  minTime: number,
  bucketSize: number,
): ChartPoint[] {
  const inWindow = points.filter((p) => p.timestamp >= minTime);

  if (bucketSize <= 1) {
    return inWindow
      .map((p) => {
        const value = chartMetricValue(p, metric, yMax);
        if (value === null) return null;
        return { timestamp: p.timestamp, value, sources: [p] };
      })
      .filter((p): p is ChartPoint => p !== null);
  }

  const out: ChartPoint[] = [];
  for (let i = 0; i < inWindow.length; i += bucketSize) {
    const chunk = inWindow.slice(i, i + bucketSize);
    let sum = 0;
    let count = 0;
    let tsSum = 0;

    for (const p of chunk) {
      const value = chartMetricValue(p, metric, yMax);
      tsSum += p.timestamp;
      if (value === null) continue;
      sum += value;
      count++;
    }

    if (count === 0) continue;

    out.push({
      timestamp: tsSum / chunk.length,
      value: sum / count,
      sources: chunk,
    });
  }

  return out;
}

export function formatChartValue(value: number, metric: MetricKey): string {
  if (metric === "tpot") {
    if (value >= 100) return `${value.toFixed(0)} ms/tok`;
    if (value >= 10) return `${value.toFixed(1)} ms/tok`;
    return `${value.toFixed(2)} ms/tok`;
  }
  return `${Math.round(value)} ms`;
}
