"use client";

import { ToggleGroup } from "@/components/ToggleGroup";

export type WindowKey = "1h" | "6h" | "12h";

export const WINDOWS: Record<
  WindowKey,
  { label: string; ms: number; bucketSize: number }
> = {
  "1h": { label: "1h", ms: 60 * 60 * 1000, bucketSize: 1 },
  "6h": { label: "6h", ms: 6 * 60 * 60 * 1000, bucketSize: 6 },
  "12h": { label: "12h", ms: 12 * 60 * 60 * 1000, bucketSize: 12 },
};

const ORDER: WindowKey[] = ["1h", "6h", "12h"];

type Props = {
  value: WindowKey;
  onChange: (next: WindowKey) => void;
};

export function WindowToggle({ value, onChange }: Props) {
  return (
    <ToggleGroup
      value={value}
      onChange={onChange}
      ariaLabel="Time window"
      options={ORDER.map((key) => ({
        value: key,
        label: WINDOWS[key].label,
      }))}
    />
  );
}
