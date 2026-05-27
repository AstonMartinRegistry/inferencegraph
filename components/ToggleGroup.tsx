"use client";

import type { ReactNode } from "react";

type Option<T extends string> = {
  value: T;
  label: ReactNode;
};

type Props<T extends string> = {
  value: T;
  options: readonly Option<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
};

export function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: Props<T>) {
  return (
    <div
      className={className ? `window-toggle ${className}` : "window-toggle"}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
