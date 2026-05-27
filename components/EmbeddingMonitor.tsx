"use client";

import { MonitorPage } from "@/components/MonitorPage";
import { useEmbeddingMonitor } from "@/components/MonitorProvider";

export function EmbeddingMonitor() {
  const { series, activeIds } = useEmbeddingMonitor();

  return (
    <MonitorPage
      title={
        <>
          qwen embedding 8b
          <br />
          inference latency graph
        </>
      }
      series={series}
      activeIds={activeIds}
      metric="ttlt"
    />
  );
}
