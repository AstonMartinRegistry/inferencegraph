"use client";

import { POLL_INTERVAL_MS } from "@/lib/chartSeries";
import { emptySeries, type Series } from "@/lib/series";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { PingResult, ProviderId } from "@/lib/types";

const MAX_POINTS = 4500;

type PingResponse = {
  providers: ProviderId[];
  results: PingResult[];
};

type MonitorState = {
  series: Series;
  chatActiveIds: ProviderId[];
  embeddingActiveIds: ProviderId[];
  chatPolling: boolean;
  embeddingPolling: boolean;
};

const MonitorContext = createContext<MonitorState | null>(null);

function usePollLoop(
  endpoint: string,
  setPolling: (polling: boolean) => void,
  setActiveIds: (ids: ProviderId[]) => void,
  recordResults: (results: PingResult[]) => void,
) {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPolling(true);
      try {
        const res = await fetch(endpoint);
        const data = (await res.json()) as PingResponse;
        if (cancelled) return;
        setActiveIds(data.providers);
        recordResults(data.results);
      } catch {
        // network/server error — leave existing series alone
      } finally {
        if (!cancelled) setPolling(false);
      }
    };

    run();
    const id = setInterval(run, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [endpoint, setPolling, setActiveIds, recordResults]);
}

export function MonitorProvider({ children }: { children: React.ReactNode }) {
  const [series, setSeries] = useState<Series>(emptySeries);
  const [chatActiveIds, setChatActiveIds] = useState<ProviderId[]>([]);
  const [embeddingActiveIds, setEmbeddingActiveIds] = useState<ProviderId[]>([]);
  const [chatPolling, setChatPolling] = useState(false);
  const [embeddingPolling, setEmbeddingPolling] = useState(false);

  const recordResults = useCallback((results: PingResult[]) => {
    const timestamp = Date.now();
    setSeries((prev) => {
      const next = { ...prev };
      for (const result of results) {
        const history = [
          ...(next[result.id] ?? []),
          {
            timestamp,
            ttft: result.ttft,
            ttlt: result.ttlt,
            completionTokens: result.completionTokens,
            ok: result.ok,
            failure: result.ok ? null : (result.failure ?? "error"),
            error: result.ok ? null : (result.error ?? null),
          },
        ].slice(-MAX_POINTS);
        next[result.id] = history;
      }
      return next;
    });
  }, []);

  usePollLoop("/api/ping", setChatPolling, setChatActiveIds, recordResults);
  usePollLoop(
    "/api/ping-embedding",
    setEmbeddingPolling,
    setEmbeddingActiveIds,
    recordResults,
  );

  return (
    <MonitorContext.Provider
      value={{
        series,
        chatActiveIds,
        embeddingActiveIds,
        chatPolling,
        embeddingPolling,
      }}
    >
      {children}
    </MonitorContext.Provider>
  );
}

function useMonitor(): MonitorState {
  const ctx = useContext(MonitorContext);
  if (!ctx) throw new Error("useMonitor must be used inside <MonitorProvider>");
  return ctx;
}

export function useChatMonitor() {
  const { series, chatActiveIds, chatPolling } = useMonitor();
  return { series, activeIds: chatActiveIds, polling: chatPolling };
}

export function useEmbeddingMonitor() {
  const { series, embeddingActiveIds, embeddingPolling } = useMonitor();
  return { series, activeIds: embeddingActiveIds, polling: embeddingPolling };
}
