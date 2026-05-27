"use client";

import { ColorBlurBackground } from "@/components/ColorBlurBackground";
import { PROVIDER_MAP } from "@/lib/providers";
import { providerColor } from "@/lib/rankColors";
import { averageOverWindow } from "@/lib/stats";
import {
  formatMetricDisplay,
  metricValue,
  parseApiError,
  type LatencyPoint,
  type MetricKey,
  type ProviderId,
} from "@/lib/types";
import { useState } from "react";

type Props = {
  activeProviders: ProviderId[];
  series: Record<ProviderId, LatencyPoint[]>;
  colors: Map<ProviderId, string>;
  metric: MetricKey;
  windowMs: number;
  focusedId?: ProviderId | null;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function latestReading(points: LatencyPoint[]): LatencyPoint | null {
  const cutoff = Date.now() - 60_000;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].timestamp >= cutoff) return points[i];
  }
  return null;
}

function previousValidValue(points: LatencyPoint[], metric: MetricKey): number | null {
  for (let i = points.length - 2; i >= 0; i--) {
    const v = metricValue(points[i], metric);
    if (v !== null) return v;
  }
  return null;
}

function isFailedReading(point: LatencyPoint | null): boolean {
  return (
    point?.failure === "timeout" ||
    point?.failure === "rate_limit" ||
    (point !== null && !point.ok)
  );
}

function percentileOverWindow(
  points: LatencyPoint[],
  metric: MetricKey,
  windowMs: number,
  p: number,
): number | null {
  const cutoff = Date.now() - windowMs;
  const values: number[] = [];
  for (const pt of points) {
    if (pt.timestamp < cutoff) continue;
    const v = metricValue(pt, metric);
    if (v === null) continue;
    values.push(v);
  }
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  const idx = (p / 100) * (values.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return values[lo];
  return values[lo] + (values[hi] - values[lo]) * (idx - lo);
}

function countTimeoutsOverWindow(points: LatencyPoint[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  let count = 0;
  for (const p of points) {
    if (p.timestamp < cutoff) continue;
    if (p.failure === "timeout" || p.failure === "rate_limit") count++;
  }
  return count;
}

// ── formatting ────────────────────────────────────────────────────────────────

function formatNumber(value: number, metric: MetricKey): string {
  if (metric === "tpot") {
    if (value >= 100) return `${value.toFixed(0)} ms/tok`;
    if (value >= 10) return `${value.toFixed(1)} ms/tok`;
    return `${value.toFixed(2)} ms/tok`;
  }
  return `${Math.round(value)} ms`;
}

function formatDeltaMagnitude(value: number, metric: MetricKey): string {
  const abs = Math.abs(value);
  if (metric === "tpot") {
    if (abs >= 100) return abs.toFixed(0);
    if (abs >= 10) return abs.toFixed(1);
    return abs.toFixed(2);
  }
  return String(Math.round(abs));
}

function formatCost(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 10) return `$${value.toFixed(1)}`;
  return `$${value.toFixed(2)}`;
}

// ── sorting ───────────────────────────────────────────────────────────────────

type SortColumn = "recent" | "average" | "p90" | "p95" | "timeout";

const SORT_COLUMNS: { key: SortColumn; label: string }[] = [
  { key: "recent",  label: "recent" },
  { key: "average", label: "average" },
  { key: "p90",     label: "p90" },
  { key: "p95",     label: "p95" },
  { key: "timeout", label: "timeout" },
];

function compareSortValues(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

// ── component ─────────────────────────────────────────────────────────────────

export function ProviderList({
  activeProviders,
  series,
  colors,
  metric,
  windowMs,
  focusedId = null,
}: Props) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("average");

  if (activeProviders.length === 0) return null;

  const averages = new Map<ProviderId, number | null>();
  const p90s     = new Map<ProviderId, number | null>();
  const p95s     = new Map<ProviderId, number | null>();
  const timeouts = new Map<ProviderId, number>();

  for (const id of activeProviders) {
    const pts = series[id] ?? [];
    averages.set(id, averageOverWindow(pts, metric, windowMs));
    p90s.set(id, percentileOverWindow(pts, metric, windowMs, 90));
    p95s.set(id, percentileOverWindow(pts, metric, windowMs, 95));
    timeouts.set(id, countTimeoutsOverWindow(pts, windowMs));
  }

  const getVal = (id: ProviderId, col: SortColumn): number | null => {
    const pts = series[id] ?? [];
    if (col === "recent") {
      const last = latestReading(pts);
      if (!last || isFailedReading(last)) return null;
      return metricValue(last, metric);
    }
    if (col === "average") return averages.get(id) ?? null;
    if (col === "p90")     return p90s.get(id) ?? null;
    if (col === "p95")     return p95s.get(id) ?? null;
    if (col === "timeout") return timeouts.get(id) ?? null;
    return null;
  };

  const sorted = [...activeProviders].sort((a, b) => {
    if (focusedId) {
      if (a === focusedId) return -1;
      if (b === focusedId) return 1;
    }
    return compareSortValues(getVal(a, sortColumn), getVal(b, sortColumn));
  });

  return (
    <div className="provider-list-section">
      <div className="provider-list-header">
        <ColorBlurBackground
          activeProviders={activeProviders}
          colors={colors}
          focusedId={focusedId}
        />
        <div className="provider-grid provider-header-row" role="row">
          <span className="banner-pill provider-col">
            <span className="banner-pill-label">provider</span>
          </span>
          <div className="provider-stat-toggle-track" aria-hidden />
          {SORT_COLUMNS.map(({ key, label }, index) => {
            const isLast = index === SORT_COLUMNS.length - 1;
            return (
              <button
                key={key}
                type="button"
                className="provider-stat-toggle-btn"
                aria-pressed={sortColumn === key}
                onClick={() => setSortColumn(key)}
                style={{
                  gridColumn: index + 3,
                  gridRow: 1,
                  ...(index === 0 ? { justifySelf: "start", marginLeft: "3px" } : {}),
                  ...(isLast ? { justifySelf: "end", marginRight: "3px" } : {}),
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="provider-list">
        {sorted.map((id) => {
          const provider   = PROVIDER_MAP[id];
          const pts        = series[id] ?? [];
          const last       = latestReading(pts);
          const failed     = isFailedReading(last);
          const latestVal  = last && !failed ? metricValue(last, metric) : null;
          const prevVal    = previousValidValue(pts, metric);
          const delta      = latestVal !== null && prevVal !== null ? latestVal - prevVal : null;
          const direction  = delta === null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
          const arrow      = direction === "up" ? "↑" : direction === "down" ? "↓" : "·";
          const errorDetail = failed ? parseApiError(last?.error)?.toLowerCase() ?? null : null;
          const isDimmed   = focusedId !== null && focusedId !== id;

          return (
            <li
              key={id}
              className={`provider-grid provider-row${isDimmed ? " dimmed" : ""}`}
            >
              <span
                className="provider-dot"
                style={{ background: isDimmed ? "#cfcfcf" : providerColor(colors, id) }}
                aria-hidden
              />

              <span className="provider-name-cell">
                <span className="provider-name">
                  {provider.name}
                  {provider.modelUrl && (
                    <a
                      className="provider-inline-link"
                      href={provider.modelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      link
                    </a>
                  )}
                </span>
                {(provider.cost?.input != null || provider.cost?.output != null) && (
                  <span className="provider-pricing">
                    {provider.cost?.input != null && (
                      <span className="cost-pill cost-pill-in">
                        {formatCost(provider.cost.input)} in
                      </span>
                    )}
                    {provider.cost?.output != null && (
                      <span className="cost-pill cost-pill-out">
                        {formatCost(provider.cost.output)} out
                      </span>
                    )}
                  </span>
                )}
              </span>

              {/* recent */}
              <span
                className={`provider-stat${failed ? " err" : ""}`}
                title={errorDetail ?? undefined}
                style={{ paddingRight: "13px" }}
              >
                <span className="provider-stat-value">
                  {formatMetricDisplay(last, metric)}
                </span>
                {delta !== null && direction !== null && (
                  <span className={`provider-delta ${direction}`}>
                    {arrow} {formatDeltaMagnitude(delta, metric)}
                  </span>
                )}
              </span>

              {/* average */}
              <span className="provider-stat">
                <span className="provider-stat-value">
                  {averages.get(id) != null ? formatNumber(averages.get(id)!, metric) : "—"}
                </span>
              </span>

              {/* p90 */}
              <span className="provider-stat">
                <span className="provider-stat-value">
                  {p90s.get(id) != null ? formatNumber(p90s.get(id)!, metric) : "—"}
                </span>
              </span>

              {/* p95 */}
              <span className="provider-stat">
                <span className="provider-stat-value">
                  {p95s.get(id) != null ? formatNumber(p95s.get(id)!, metric) : "—"}
                </span>
              </span>

              {/* timeout */}
              <span className="provider-stat" style={{ paddingLeft: "6px" }}>
                <span className={`provider-stat-value${timeouts.get(id)! > 0 ? " warn" : ""}`}>
                  {timeouts.get(id)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
