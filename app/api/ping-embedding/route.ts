import { pingAllEmbeddingProviders } from "@/lib/embedding";
import { createPingHandler } from "@/lib/pingRoute";

export const GET = createPingHandler("embedding", pingAllEmbeddingProviders);
