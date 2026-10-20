import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";

// Laptop runs read .env.local; in the cloud container the key comes from the environment.
loadEnv({ path: ".env.local", quiet: true });

export const MODELS = {
  classify: "claude-haiku-5-5",
  synthesise: "claude-sonnet-5-5",
} as const;

// USD per million tokens, first-party API rates (checked 2026-10-19).
// Haiku 5.5 prices apply to prompts up to 100K tokens; our batches stay well under that.
export const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  // Models a declined Sonnet request may fall back to (server-side fallback, "default" mode).
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
};

// The fields we read from a response's usage (shared by the regular and beta endpoints).
export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function getClient(): Anthropic {
  // The cloud environment holds the key as SCEPTIC_MAP_ANTHROPIC_KEY; a laptop's .env.local
  // uses ANTHROPIC_API_KEY.
  const apiKey = process.env.SCEPTIC_MAP_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No API key: set SCEPTIC_MAP_ANTHROPIC_KEY in the cloud environment's variables (new session needed), or ANTHROPIC_API_KEY in .env.local on a laptop.",
    );
  }
  // baseURL and authToken are pinned because the cloud container presets
  // ANTHROPIC_BASE_URL for Claude Code's own traffic.
  return new Anthropic({ apiKey, authToken: null, baseURL: "https://api.anthropic.com", maxRetries: 6 });
}

export interface UsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
}

export function emptyUsage(): UsageTotals {
  return { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUsd: 0 };
}

const warnedModels = new Set<string>();

export function costOf(model: string, usage: UsageLike): number {
  let p = PRICES[model];
  if (!p) {
    // Don't crash after a paid call; over-estimate with the dearest listed price and say so.
    if (!warnedModels.has(model)) console.warn(`No price for ${model}; costing it at Opus rates. Add it to PRICES.`);
    warnedModels.add(model);
    p = PRICES["claude-opus-4-8"];
  }
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  // Cache writes bill at 1.25x input; we don't use prompt caching yet, so this is usually 0.
  return (
    (usage.input_tokens * p.input +
      cacheWrite * p.input * 1.25 +
      cacheRead * p.cacheRead +
      usage.output_tokens * p.output) /
    1_000_000
  );
}

export function addUsage(totals: UsageTotals, model: string, usage: UsageLike): void {
  totals.calls += 1;
  totals.inputTokens += usage.input_tokens + (usage.cache_creation_input_tokens ?? 0);
  totals.outputTokens += usage.output_tokens;
  totals.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
  totals.costUsd += costOf(model, usage);
}

export function formatUsage(label: string, t: UsageTotals): string {
  return `${label}: ${t.calls} calls, ${t.inputTokens.toLocaleString()} input + ${t.outputTokens.toLocaleString()} output tokens, est. $${t.costUsd.toFixed(4)}`;
}
