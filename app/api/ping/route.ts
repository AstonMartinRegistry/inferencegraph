import { pingAllProviders } from "@/lib/inference";
import { createPingHandler } from "@/lib/pingRoute";

export const GET = createPingHandler("chat", pingAllProviders);
