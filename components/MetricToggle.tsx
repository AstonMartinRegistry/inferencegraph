"use client";

import { ToggleGroup } from "@/components/ToggleGroup";
import type { MetricKey } from "@/lib/types";

export const METRICS: Record<MetricKey, { label: string; unit: string }> = {
  ttlt: { label: "total", unit: "ms" },
  ttft: { label: "ttft", unit: "ms" },
  tpot: { label: "tpot", unit: "ms/tok" },
};

const ORDER: MetricKey[] = ["ttlt", "ttft", "tpot"];

type Props = {
  value: MetricKey;
  onChange: (next: MetricKey) => void;
};

export function MetricToggle({ value, onChange }: Props) {
  return (
    <ToggleGroup
      value={value}
      onChange={onChange}
      ariaLabel="Metric"
      options={ORDER.map((key) => ({
        value: key,
        label: METRICS[key].label,
      }))}
    />
  );
}
