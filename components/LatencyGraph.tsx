"use client";

import { METRICS } from "@/components/MetricToggle";
import {
  chartPointsForWindow,
  formatChartValue,
  POLL_INTERVAL_MS,
  type ChartPoint,
} from "@/lib/chartSeries";
import { PROVIDER_MAP } from "@/lib/providers";
import { providerColor } from "@/lib/rankColors";
import {
  type LatencyPoint,
  type MetricKey,
  type ProviderId,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  series: Record<ProviderId, LatencyPoint[]>;
  activeProviders: ProviderId[];
  colors: Map<ProviderId, string>;
  windowMs: number;
  bucketSize: number;
  metric: MetricKey;
  focusedId: ProviderId | null;
  onFocusedIdChange: (id: ProviderId | null) => void;
};

type Snapshot = {
  timestamp: number;
  values: Partial<Record<ProviderId, number>>;
};

const WIDTH = 920;
const HEIGHT = 340;
const PAD = { top: 24, right: 20, bottom: 36, left: 48 };
const Y_LABEL_X = PAD.left - 6;
const UNIT_Y = 10;
const X_LABEL_Y = HEIGHT - PAD.bottom + 16;

const Y_MAX: Record<MetricKey, number> = {
  ttlt: 5_000,
  ttft: 1_500,
  tpot: 75,
};

const DIMMED_LINE_COLOR = "#cfcfcf";
const DIMMED_FILL = "rgba(200, 200, 200, 0.06)";

function lineRenderOrder(
  activeProviders: ProviderId[],
  focusedId: ProviderId | null,
): ProviderId[] {
  if (!focusedId || !activeProviders.includes(focusedId)) {
    return activeProviders;
  }
  return [
    ...activeProviders.filter((id) => id !== focusedId),
    focusedId,
  ];
}

function formatTickTime(ts: number, now: number): string {
  const diffMs = now - ts;
  if (diffMs < 30_000) return "now";
  const h = diffMs / 3_600_000;
  if (h < 1) return `${Math.round(diffMs / 60_000)}m`;
  return `${Math.round(h)}h`;
}

function formatHoverTime(ts: number, now: number): string {
  const diffMs = Math.max(0, now - ts);
  if (diffMs < 60_000) return `${Math.round(diffMs / 1000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)}m ago`;
  return `${Math.round(diffMs / 3_600_000)}h ago`;
}

function formatYTick(value: number, metric: MetricKey): string {
  if (metric === "tpot") {
    if (value >= 100) return value.toFixed(0);
    if (value >= 10) return value.toFixed(1);
    return value.toFixed(2);
  }
  return String(Math.round(value));
}

function formatTooltipValue(point: ChartPoint, metric: MetricKey): string {
  return formatChartValue(point.value, metric);
}

function nearestChartPoint(
  points: ChartPoint[],
  ts: number,
): ChartPoint | null {
  if (points.length === 0) return null;
  let best = points[0];
  let bestDist = Math.abs(best.timestamp - ts);
  for (const point of points) {
    const dist = Math.abs(point.timestamp - ts);
    if (dist < bestDist) {
      best = point;
      bestDist = dist;
    }
  }
  return best;
}

function nearestSnapshot(snapshots: Snapshot[], ts: number): Snapshot | null {
  if (snapshots.length === 0) return null;
  let best = snapshots[0];
  let bestDist = Math.abs(best.timestamp - ts);
  for (const snap of snapshots) {
    const dist = Math.abs(snap.timestamp - ts);
    if (dist < bestDist) {
      best = snap;
      bestDist = dist;
    }
  }
  return best;
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function distanceToLine(
  svgX: number,
  svgY: number,
  points: Array<{ timestamp: number; value: number }>,
  x: (ts: number) => number,
  y: (value: number) => number,
): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) {
    return Math.hypot(svgX - x(points[0].timestamp), svgY - y(points[0].value));
  }

  let minDist = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dist = distToSegment(
      svgX,
      svgY,
      x(a.timestamp),
      y(a.value),
      x(b.timestamp),
      y(b.value),
    );
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

export function LatencyGraph({
  series,
  activeProviders,
  colors,
  windowMs,
  bucketSize,
  metric,
  focusedId,
  onFocusedIdChange,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const graphRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    timestamp: number;
    svgX: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (focusedId && !activeProviders.includes(focusedId)) {
      onFocusedIdChange(null);
    }
  }, [focusedId, activeProviders, onFocusedIdChange]);

  const orderedProviders = lineRenderOrder(activeProviders, focusedId);

  const toggleFocus = useCallback(
    (id: ProviderId) => {
      onFocusedIdChange(focusedId === id ? null : id);
    },
    [focusedId, onFocusedIdChange],
  );

  useEffect(() => {
    if (!focusedId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (graphRef.current?.contains(event.target as Node)) return;
      onFocusedIdChange(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [focusedId, onFocusedIdChange]);

  const minTime = now - windowMs;
  const maxTime = now;
  const timeSpan = Math.max(maxTime - minTime, 1);

  const maxValue = Y_MAX[metric];

  const valuedSeries = useMemo(() => {
    const out = {} as Record<ProviderId, ChartPoint[]>;
    for (const id of activeProviders) {
      out[id] = chartPointsForWindow(
        series[id] ?? [],
        metric,
        maxValue,
        minTime,
        bucketSize,
      );
    }
    return out;
  }, [series, activeProviders, metric, minTime, maxValue, bucketSize]);

  const snapshots = useMemo(() => {
    const map = new Map<number, Partial<Record<ProviderId, number>>>();
    for (const id of activeProviders) {
      for (const point of valuedSeries[id]) {
        const values = map.get(point.timestamp) ?? {};
        values[id] = point.value;
        map.set(point.timestamp, values);
      }
    }
    return Array.from(map.entries())
      .map(([timestamp, values]) => ({ timestamp, values }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [valuedSeries, activeProviders]);

  const allValues = activeProviders.flatMap((id) =>
    valuedSeries[id].map((p) => p.value),
  );

  const chartW = WIDTH - PAD.left - PAD.right;
  const chartH = HEIGHT - PAD.top - PAD.bottom;

  const x = (ts: number) => PAD.left + ((ts - minTime) / timeSpan) * chartW;
  const y = (value: number) =>
    PAD.top + chartH - (Math.min(value, maxValue) / maxValue) * chartH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxValue * t);

  const xTickCount = 6;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
    const ts = minTime + (timeSpan * i) / xTickCount;
    return { ts, x: x(ts) };
  });

  const hasData = allValues.length > 0;

  const clientToSvg = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    return {
      svgX: (event.clientX - rect.left) * scaleX,
      svgY: (event.clientY - rect.top) * scaleY,
    };
  }, []);

  const isInChartBounds = useCallback((svgX: number, svgY: number) => {
    return (
      svgX >= PAD.left &&
      svgX <= WIDTH - PAD.right &&
      svgY >= PAD.top &&
      svgY <= HEIGHT - PAD.bottom
    );
  }, []);

  const findNearestProvider = useCallback(
    (svgX: number, svgY: number): ProviderId | null => {
      let bestId: ProviderId | null = null;
      let bestDist = Infinity;

      for (const id of activeProviders) {
        const points = valuedSeries[id];
        const dist = distanceToLine(svgX, svgY, points, x, y);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      }

      return bestId;
    },
    [activeProviders, valuedSeries, x, y],
  );

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    if (!hasData || snapshots.length === 0) return;

    const { svgX, svgY } = clientToSvg(event);

    if (!isInChartBounds(svgX, svgY)) {
      setHover(null);
      return;
    }

    const ts = minTime + ((svgX - PAD.left) / chartW) * timeSpan;
    const snapshot = nearestSnapshot(snapshots, ts);
    if (!snapshot) return;

    setHover({
      timestamp: snapshot.timestamp,
      svgX: x(snapshot.timestamp),
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  function handleSvgClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!hasData) return;

    const { svgX, svgY } = clientToSvg(event);
    if (!isInChartBounds(svgX, svgY)) return;

    const nearest = findNearestProvider(svgX, svgY);
    if (nearest) toggleFocus(nearest);
  }

  const tooltipRows = hover
    ? activeProviders
        .map((id) => {
          const point =
            valuedSeries[id].find((p) => p.timestamp === hover.timestamp) ??
            nearestChartPoint(valuedSeries[id], hover.timestamp);
          if (!point) return null;
          return {
            id,
            name: PROVIDER_MAP[id].name,
            color: providerColor(colors, id),
            point,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((a, b) => a.point.value - b.point.value)
    : [];

  return (
    <div className="graph" ref={graphRef}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="graph-svg"
        role="img"
        aria-label={`${METRICS[metric].label} over time`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleSvgClick}
      >
        <defs>
          <filter
            id="area-soft-blur"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {activeProviders.map((id) => {
            const color = providerColor(colors, id);
            return (
              <linearGradient
                key={`grad-${id}`}
                id={`grad-${id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity="0.32" />
                <stop offset="45%" stopColor={color} stopOpacity="0.1" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            );
          })}
        </defs>

        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className={`graph-grid-line${i === 0 ? " baseline" : ""}`}
            />
            {i > 0 ? (
              <text
                x={Y_LABEL_X}
                y={y(tick) + 3.5}
                className="graph-axis-label y"
              >
                {formatYTick(tick, metric)}
              </text>
            ) : null}
          </g>
        ))}

        <text x={Y_LABEL_X} y={UNIT_Y} className="graph-axis-label y">
          {METRICS[metric].unit}
        </text>

        {xTicks.map(({ ts, x: xPos }, i) => {
          const isFirst = i === 0;
          const isLast = i === xTicks.length - 1;
          const anchor = isFirst ? "start" : isLast ? "end" : "middle";
          const labelX = isFirst
            ? Math.max(xPos, PAD.left)
            : isLast
              ? Math.min(xPos, WIDTH - PAD.right)
              : xPos;

          return (
            <text
              key={i}
              x={labelX}
              y={X_LABEL_Y}
              textAnchor={anchor}
              className="graph-axis-label x"
            >
              {isLast ? "now" : formatTickTime(ts, now)}
            </text>
          );
        })}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={chartW}
          height={chartH}
          fill="transparent"
          className="graph-hit-area"
        />

        {orderedProviders.map((id) => {
          const points = valuedSeries[id];
          if (points.length < 2) return null;
          const baseColor = providerColor(colors, id);
          const isFocused = focusedId === id;
          const isDimmed = focusedId !== null && !isFocused;
          const stroke = isDimmed ? DIMMED_LINE_COLOR : baseColor;
          const strokeWidth = isFocused ? 2.2 : 1.6;

          const linePath = points
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"} ${x(p.timestamp).toFixed(2)} ${y(p.value).toFixed(2)}`,
            )
            .join(" ");

          const areaPath = `${linePath} L ${x(points[points.length - 1].timestamp).toFixed(2)} ${y(0).toFixed(2)} L ${x(points[0].timestamp).toFixed(2)} ${y(0).toFixed(2)} Z`;

          return (
            <g
              key={id}
              className={`graph-line-group${isFocused ? " focused" : ""}${isDimmed ? " dimmed" : ""}`}
            >
              <path
                d={areaPath}
                fill={isDimmed ? DIMMED_FILL : `url(#grad-${id})`}
                filter={isDimmed ? undefined : "url(#area-soft-blur)"}
              />
              <path
                d={linePath}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="graph-line-visible"
              />
            </g>
          );
        })}

        {hover && (
          <g className="graph-crosshair">
            <line
              x1={hover.svgX}
              x2={hover.svgX}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              className="graph-crosshair-line"
            />
            {tooltipRows.map((row) => {
              const isDimmed =
                focusedId !== null && focusedId !== row.id;
              return (
                <circle
                  key={`hover-${row.id}`}
                  cx={hover!.svgX}
                  cy={y(row.point.value)}
                  r={4}
                  fill={isDimmed ? DIMMED_LINE_COLOR : row.color}
                  className="graph-hover-dot"
                />
              );
            })}
          </g>
        )}

        {activeProviders.map((id) => {
          const points = valuedSeries[id];
          if (points.length === 0) return null;
          const last = points[points.length - 1];
          const baseColor = providerColor(colors, id);
          const isDimmed = focusedId !== null && focusedId !== id;
          const color = isDimmed ? DIMMED_LINE_COLOR : baseColor;
          const isHovered = hover?.timestamp === last.timestamp;
          if (isHovered) return null;
          return (
            <circle
              key={`dot-${id}`}
              cx={x(last.timestamp)}
              cy={y(last.value)}
              r={focusedId === id ? 4 : 3}
              fill={color}
              className={isDimmed ? "graph-end-dot dimmed" : "graph-end-dot"}
            />
          );
        })}

        {!hasData && (
          <text
            x={WIDTH / 2}
            y={PAD.top + chartH / 2}
            className="graph-empty"
          >
            collecting measurements…
          </text>
        )}
      </svg>

      {hover && tooltipRows.length > 0 && (
        <div
          className="graph-tooltip"
          style={{
            left: Math.min(hover.clientX + 14, window.innerWidth - 180),
            top: hover.clientY + 14,
          }}
        >
          <p className="graph-tooltip-time">
            {formatHoverTime(hover.timestamp, now)}
          </p>
          <ul className="graph-tooltip-list">
            {tooltipRows.map((row) => {
              const isDimmed =
                focusedId !== null && focusedId !== row.id;
              return (
                <li
                  key={row.id}
                  className={isDimmed ? "dimmed" : undefined}
                >
                  <span
                    className="graph-tooltip-dot"
                    style={{
                      background: isDimmed ? DIMMED_LINE_COLOR : row.color,
                    }}
                    aria-hidden
                  />
                  <span className="graph-tooltip-name">{row.name}</span>
                  <span className="graph-tooltip-value">
                    {formatTooltipValue(row.point, metric)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
