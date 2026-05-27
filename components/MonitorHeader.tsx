"use client";

import { ColorBlurBackground } from "@/components/ColorBlurBackground";
import { MetricToggle } from "@/components/MetricToggle";
import { PageNav } from "@/components/PageNav";
import { WindowToggle, type WindowKey } from "@/components/WindowToggle";
import type { MetricKey, ProviderId } from "@/lib/types";
import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  metric: MetricKey;
  onMetricChange?: (metric: MetricKey) => void;
  windowKey: WindowKey;
  onWindowChange: (windowKey: WindowKey) => void;
  activeProviders: ProviderId[];
  colors: Map<ProviderId, string>;
  focusedId?: ProviderId | null;
};

export function MonitorHeader({
  title,
  metric,
  onMetricChange,
  windowKey,
  onWindowChange,
  activeProviders,
  colors,
  focusedId = null,
}: Props) {
  return (
    <header className="header">
      <h1 className="title">{title}</h1>
      <div className="header-controls">
        <ColorBlurBackground
          activeProviders={activeProviders}
          colors={colors}
          focusedId={focusedId}
        />
        <PageNav />
        <div className="header-toggles-right">
          {onMetricChange ? (
            <MetricToggle value={metric} onChange={onMetricChange} />
          ) : null}
          <WindowToggle value={windowKey} onChange={onWindowChange} />
        </div>
      </div>
    </header>
  );
}
