import type { ProviderId } from "./types";

export const INFERENCE_PROMPT = "who has the fastest inference?";

export type ProviderKind = "chat" | "embedding";

export type ProviderCost = {
  input: number;
  output?: number;
};

export type ProviderConfig = {
  id: ProviderId;
  name: string;
  color: string;
  url: string;
  model: string;
  modelUrl?: string;
  modelLabel?: string;
  envKey: string;
  kind: ProviderKind;
  cost?: ProviderCost;
  headers: (apiKey: string) => Record<string, string>;
  body: (model: string, prompt: string) => Record<string, unknown>;
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "cerebras",
    name: "Cerebras",
    color: "#7FA890",
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: "gpt-oss-120b",
    modelUrl: "https://inference-docs.cerebras.ai/models/openai-oss",
    envKey: "CEREBRAS_API_KEY",
    kind: "chat",
    cost: { input: 0.35, output: 0.75 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "deepinfra",
    name: "DeepInfra",
    color: "#9B8BC4",
    url: "https://api.deepinfra.com/v1/openai/chat/completions",
    model: "openai/gpt-oss-120b",
    modelUrl: "https://deepinfra.com/openai/gpt-oss-120b",
    envKey: "DEEPINFRA_API_KEY",
    kind: "chat",
    cost: { input: 0.04, output: 0.19 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "groq",
    name: "Groq",
    color: "#F55036",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "openai/gpt-oss-120b",
    modelUrl: "https://console.groq.com/docs/model/openai/gpt-oss-120b",
    envKey: "GROQ_API_KEY",
    kind: "chat",
    cost: { input: 0.15, output: 0.6 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 128,
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "fireworks",
    name: "Fireworks",
    color: "#6B9FC4",
    url: "https://api.fireworks.ai/inference/v1/chat/completions",
    model: "accounts/fireworks/models/gpt-oss-120b",
    modelUrl: "https://fireworks.ai/models/fireworks/gpt-oss-120b",
    modelLabel: "models/gpt-oss-120b",
    envKey: "FIREWORKS_API_KEY",
    kind: "chat",
    cost: { input: 0.15, output: 0.6 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "nebius",
    name: "Nebius",
    color: "#E85D04",
    url: "https://api.tokenfactory.nebius.com/v1/chat/completions",
    model: "openai/gpt-oss-120b",
    modelUrl: "https://tokenfactory.nebius.com/models",
    envKey: "NEBIUS_API_KEY",
    kind: "chat",
    cost: { input: 0.15, output: 0.6 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "huggingface",
    name: "HuggingFace",
    color: "#5F8E9E",
    url: "https://router.huggingface.co/v1/chat/completions",
    model: "openai/gpt-oss-120b:fastest",
    envKey: "HF_TOKEN",
    kind: "chat",
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    color: "#D4A95E",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-oss-120b",
    modelUrl: "https://openrouter.ai/openai/gpt-oss-120b",
    envKey: "OPENROUTER_API_KEY",
    kind: "chat",
    cost: { input: 0.12, output: 0.43 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "gpt oss 120b inference latency graph",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
      usage: { include: true },
    }),
  },
  {
    id: "novita",
    name: "Novita",
    color: "#7C6BF0",
    url: "https://api.novita.ai/openai/v1/chat/completions",
    model: "openai/gpt-oss-120b",
    modelUrl: "https://novita.ai/models/model-detail/openai-gpt-oss-120b",
    envKey: "NOVITA_API_KEY",
    kind: "chat",
    cost: { input: 0.05, output: 0.25 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      reasoning_effort: "low",
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "mara",
    name: "MARA",
    color: "#3D7A5F",
    url: "https://api.cloud.mara.com/v1/chat/completions",
    model: "gpt-oss-120b",
    modelUrl: "https://cloud.mara.com/dashboard",
    envKey: "MARA_API_KEY",
    kind: "chat",
    cost: { input: 0.15, output: 0.75 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "sambanova",
    name: "SambaNova",
    color: "#B87B4F",
    url: "https://api.sambanova.ai/v1/chat/completions",
    model: "gpt-oss-120b",
    modelUrl: "https://cloud.sambanova.ai/dashboard",
    envKey: "SAMBANOVA_API_KEY",
    kind: "chat",
    cost: { input: 0.22, output: 0.59 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 128,
      stream: true,
      stream_options: { include_usage: true },
    }),
  },
  {
    id: "deepinfra-emb",
    name: "DeepInfra",
    color: "#9B8BC4",
    url: "https://api.deepinfra.com/v1/openai/embeddings",
    model: "Qwen/Qwen3-Embedding-8B",
    modelUrl: "https://deepinfra.com/Qwen/Qwen3-Embedding-8B",
    envKey: "DEEPINFRA_API_KEY",
    kind: "embedding",
    cost: { input: 0.01, output: 0 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      input: prompt,
      encoding_format: "float",
    }),
  },
  {
    id: "openrouter-emb",
    name: "OpenRouter",
    color: "#D4A95E",
    url: "https://openrouter.ai/api/v1/embeddings",
    model: "qwen/qwen3-embedding-8b",
    modelUrl: "https://openrouter.ai/qwen/qwen3-embedding-8b",
    envKey: "OPENROUTER_API_KEY",
    kind: "embedding",
    cost: { input: 0.01, output: 0 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "qwen embedding 8b latency graph",
    }),
    body: (model, prompt) => ({
      model,
      input: prompt,
    }),
  },
  {
    id: "fireworks-emb",
    name: "Fireworks",
    color: "#6B9FC4",
    url: "https://api.fireworks.ai/inference/v1/embeddings",
    model: "accounts/fireworks/models/qwen3-embedding-8b",
    modelUrl: "https://fireworks.ai/models/fireworks/qwen3-embedding-8b",
    modelLabel: "models/qwen3-embedding-8b",
    envKey: "FIREWORKS_API_KEY",
    kind: "embedding",
    cost: { input: 0.01, output: 0 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      input: prompt,
    }),
  },
  {
    id: "nebius-emb",
    name: "Nebius",
    color: "#E85D04",
    url: "https://api.studio.nebius.com/v1/embeddings",
    model: "Qwen/Qwen3-Embedding-8B",
    modelUrl: "https://tokenfactory.nebius.com/models",
    envKey: "NEBIUS_API_KEY",
    kind: "embedding",
    cost: { input: 0.01, output: 0 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      input: prompt,
    }),
  },
  {
    id: "huggingface-emb",
    name: "HuggingFace",
    color: "#5F8E9E",
    url: "https://router.huggingface.co/v1/embeddings",
    model: "Qwen/Qwen3-Embedding-8B",
    envKey: "HF_TOKEN",
    kind: "embedding",
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      input: prompt,
    }),
  },
  {
    id: "novita-emb",
    name: "Novita",
    color: "#7C6BF0",
    url: "https://api.novita.ai/openai/v1/embeddings",
    model: "qwen/qwen3-embedding-8b",
    modelUrl:
      "https://novita.ai/models-console/model-detail/qwen-qwen3-embedding-8b",
    envKey: "NOVITA_API_KEY",
    kind: "embedding",
    cost: { input: 0.07, output: 0 },
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
    body: (model, prompt) => ({
      model,
      input: prompt,
    }),
  },
];

export const PROVIDER_MAP = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p]),
) as Record<ProviderId, ProviderConfig>;

export function getConfiguredProviders(kind?: ProviderKind): ProviderConfig[] {
  return PROVIDERS.filter(
    (p) =>
      Boolean(process.env[p.envKey]?.trim()) &&
      (kind === undefined || p.kind === kind),
  );
}
