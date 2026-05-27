"use client";

import { ColorBlurBackground } from "@/components/ColorBlurBackground";
import { ToggleGroup } from "@/components/ToggleGroup";
import type { ProviderId } from "@/lib/types";
import type { ReactNode } from "react";
import { useState } from "react";

type Tab = "methodology" | "thoughts" | "about";

type Props = {
  activeProviders: ProviderId[];
  colors: Map<ProviderId, string>;
  focusedId?: ProviderId | null;
};

const METHODOLOGY: ReactNode[] = [
  "each provider is pinged every 30 seconds with a standard llm completion request. latency is measured end-to-end: ttft captures time to first token, tpot measures per-token generation speed, and total is the full round trip.",
  "data lives in memory and rolls off after 12 hours. cost figures are pulled from provider pricing pages and updated manually.",
];

const THOUGHTS: ReactNode[] = [
  "latency is going to be very important. as inference gets embedded in real-time products the gap between fast and slow providers will keep widening.",
  "groq is currently doing very well with networking. their ttft numbers are consistently strong across runs.",
  "cerebras is the clear standout on tpot. if generation speed is what you care about, they are the benchmark right now.",
  "mara and sambanova are worth watching more closely. still finding their footing but the trajectory is interesting.",
  "still working through how openrouter fits into all of this. useful as an aggregator, but the routing layer adds overhead that shows up in the numbers.",
];

const ABOUT: ReactNode[] = [
  "this was built because i wanted more clarity on the endpoints for each of these models as a normal developer.",
  <>
    i can be reached at{" "}
    <a href="mailto:dkiss@stanford.edu" className="provider-model-link">
      dkiss@stanford.edu
    </a>
    .
  </>,
];

const CONTENT: Record<Tab, ReactNode[]> = {
  methodology: METHODOLOGY,
  thoughts: THOUGHTS,
  about: ABOUT,
};

export function AboutPanel({
  activeProviders,
  colors,
  focusedId = null,
}: Props) {
  const [tab, setTab] = useState<Tab>("methodology");

  return (
    <>
      <footer className="about-panel">
        <ColorBlurBackground
          activeProviders={activeProviders}
          colors={colors}
          focusedId={focusedId}
        />
        <ToggleGroup<Tab>
          value={tab}
          onChange={setTab}
          ariaLabel="About section"
          options={[
            { value: "methodology", label: "methodology" },
            { value: "thoughts", label: "thoughts" },
            { value: "about", label: "about" },
          ]}
        />
      </footer>
      <div className="about-panel-body">
        {CONTENT[tab].map((p, i) => (
          <p key={i} className="about-panel-text">
            {p}
          </p>
        ))}
      </div>
    </>
  );
}
