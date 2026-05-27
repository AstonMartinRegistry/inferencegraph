"use client";

import { AboutPanel } from "@/components/AboutPanel";
import { LatencyGraph } from "@/components/LatencyGraph";
import { MonitorHeader } from "@/components/MonitorHeader";
import { ProviderList } from "@/components/ProviderList";
import { WINDOWS, type WindowKey } from "@/components/WindowToggle";
import { colorsByAverageRank } from "@/lib/rankColors";
import type { LatencyPoint, MetricKey, ProviderId } from "@/lib/types";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type Props = {
  title: ReactNode;
  series: Record<ProviderId, LatencyPoint[]>;
  activeIds: ProviderId[];
  metric: MetricKey;
  onMetricChange?: (metric: MetricKey) => void;
};

export function MonitorPage({
  title,
  series,
  activeIds,
  metric,
  onMetricChange,
}: Props) {
  const [windowKey, setWindowKey] = useState<WindowKey>("1h");
  const [focusedId, setFocusedId] = useState<ProviderId | null>(null);

  const { ms: windowMs, bucketSize } = WINDOWS[windowKey];

  const colors = useMemo(
    () => colorsByAverageRank(activeIds, series, metric, windowMs),
    [activeIds, series, metric, windowMs],
  );

  useEffect(() => {
    setFocusedId(null);
  }, [metric, windowKey]);

  return (
    <main className="page">
      <MonitorHeader
        title={title}
        metric={metric}
        onMetricChange={onMetricChange}
        windowKey={windowKey}
        onWindowChange={setWindowKey}
        activeProviders={activeIds}
        colors={colors}
        focusedId={focusedId}
      />

      <div className="graph-card">
        <LatencyGraph
          series={series}
          activeProviders={activeIds}
          colors={colors}
          windowMs={windowMs}
          bucketSize={bucketSize}
          metric={metric}
          focusedId={focusedId}
          onFocusedIdChange={setFocusedId}
        />
      </div>

      <ProviderList
        activeProviders={activeIds}
        series={series}
        colors={colors}
        metric={metric}
        windowMs={windowMs}
        focusedId={focusedId}
      />

      <AboutPanel
        activeProviders={activeIds}
        colors={colors}
        focusedId={focusedId}
      />
    </main>
  );
}
