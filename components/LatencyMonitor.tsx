"use client";

import { MonitorPage } from "@/components/MonitorPage";
import { useChatMonitor } from "@/components/MonitorProvider";
import type { MetricKey } from "@/lib/types";
import { useState } from "react";

export function LatencyMonitor() {
  const { series, activeIds } = useChatMonitor();
  const [metric, setMetric] = useState<MetricKey>("ttlt");

  return (
    <MonitorPage
      title={
        <>
          gpt oss 120b
          <br />
          inference latency graph
        </>
      }
      series={series}
      activeIds={activeIds}
      metric={metric}
      onMetricChange={setMetric}
    />
  );
}
