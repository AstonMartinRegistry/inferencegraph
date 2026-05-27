import { getConfiguredProviders, type ProviderKind } from "./providers";
import type { PingResult } from "./types";

export function createPingHandler(
  kind: ProviderKind,
  pingAll: () => Promise<PingResult[]>,
) {
  return async function GET() {
    const configured = getConfiguredProviders(kind);

    if (configured.length === 0) {
      return Response.json({ providers: [], results: [] });
    }

    const results = await pingAll();

    return Response.json({
      providers: configured.map((p) => p.id),
      results,
    });
  };
}
