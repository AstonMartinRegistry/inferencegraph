"use client";

import { providerColor, spreadColorBlobs } from "@/lib/rankColors";
import type { ProviderId } from "@/lib/types";

type Props = {
  activeProviders: ProviderId[];
  colors: Map<ProviderId, string>;
  focusedId?: ProviderId | null;
  spread?: boolean;
};

export function ColorBlurBackground({
  activeProviders,
  colors,
  focusedId = null,
  spread = false,
}: Props) {
  if (activeProviders.length === 0) return null;

  return (
    <div
      className={`color-blur-bg${spread ? " color-blur-bg-spread" : ""}`}
      aria-hidden
    >
      {spread
        ? spreadColorBlobs(activeProviders, colors).map((blob, i) => (
            <span
              key={i}
              className="color-blur-blob"
              style={{
                left: `${blob.left}%`,
                backgroundColor: blob.color,
              }}
            />
          ))
        : activeProviders.map((id, i) => {
            const isDimmed = focusedId !== null && focusedId !== id;
            const isFocused = focusedId === id;
            return (
              <span
                key={id}
                className={`color-blur-blob${isDimmed ? " dimmed" : ""}${isFocused ? " focused" : ""}`}
                style={{
                  left: `${((i + 0.5) / activeProviders.length) * 100}%`,
                  backgroundColor: providerColor(colors, id),
                }}
              />
            );
          })}
      <span className="color-blur-grain" aria-hidden />
    </div>
  );
}
