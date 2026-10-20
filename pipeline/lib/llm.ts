import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Anthropic, { AnthropicError } from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { addUsage, costOf, emptyUsage, formatUsage, getClient, type UsageLike, type UsageTotals } from "./anthropic";
import { sha256 } from "./text";

const CACHE_DIR = path.join(process.cwd(), "cache", "llm");
const COST_FILE = path.join(process.cwd(), "data", "cost.json");
// Every paid call is appended here as it returns, so spend survives a crash mid-run.
const CALL_LOG = path.join(process.cwd(), "cache", "calls.jsonl");

export interface CallOptions<T extends z.ZodType> {
  model: string;
  system: string;
  user: string;
  schema: T;
  effort: "low" | "medium" | "high";
  maxTokens: number;
  // Extra check on the parsed output (e.g. "every input id came back"). Return an error message or null.
  validate?: (output: z.infer<T>) => string | null;
  // Sonnet 5.5 can decline on safety grounds; opt into the server-side fallback so a declined
  // batch is retried on another model instead of failing. (Haiku 5.5 has no server-side fallback.)
  fallbacks?: boolean;
}

interface CachedResponse {
  model: string;
  text: string;
  usage: UsageLike;
}

// Per-run ledger. Every network call is metered, including ones whose output failed to parse.
export const ledger = {
  byModel: new Map<string, UsageTotals>(),
  cachedCalls: 0,
  fallbackCalls: 0,
  failures: [] as string[],
};

let client: Anthropic | null = null;

export async function callStructured<T extends z.ZodType>(label: string, opts: CallOptions<T>): Promise<z.infer<T> | null> {
  const format = opts.fallbacks ? betaZodOutputFormat(opts.schema) : zodOutputFormat(opts.schema);
  const key = sha256(
    JSON.stringify({
      model: opts.model,
      system: opts.system,
      user: opts.user,
      effort: opts.effort,
      maxTokens: opts.maxTokens,
      schema: format.schema,
      ...(opts.fallbacks ? { fallbacks: "default" } : {}),
    }),
  );
  const file = path.join(CACHE_DIR, `${key}.json`);

  const check = (text: string): { ok: true; value: z.infer<T> } | { ok: false; error: string } => {
    try {
      const value = format.parse(text) as z.infer<T>;
      const problem = opts.validate?.(value) ?? null;
      return problem ? { ok: false, error: problem } : { ok: true, value };
    } catch (err) {
      if (err instanceof AnthropicError) return { ok: false, error: err.message.split("\n")[0] };
      throw err;
    }
  };

  if (existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, "utf8")) as CachedResponse;
    const result = check(cached.text);
    if (result.ok) {
      ledger.cachedCalls += 1;
      return result.value;
    }
  }

  client ??= getClient();
  let lastError = "";
  // One retry on a parse or validation failure, then log and skip.
  for (let attempt = 0; attempt < 2; attempt++) {
    const request = {
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      // On the retry, say what was wrong rather than resending the identical request.
      messages: [{ role: "user" as const, content: attempt === 0 ? opts.user : `${opts.user}\n\nYour previous answer was rejected: ${lastError}. Please fix that.` }],
    };
    const response = opts.fallbacks
      ? await client.beta.messages.create({
          ...request,
          output_config: { effort: opts.effort, format: format as ReturnType<typeof betaZodOutputFormat> },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        })
      : await client.messages.create({
          ...request,
          output_config: { effort: opts.effort, format: format as ReturnType<typeof zodOutputFormat> },
        });
    if (response.model !== opts.model) ledger.fallbackCalls += 1;
    const totals = ledger.byModel.get(response.model) ?? emptyUsage();
    addUsage(totals, response.model, response.usage);
    ledger.byModel.set(response.model, totals);
    mkdirSync(path.dirname(CALL_LOG), { recursive: true });
    appendFileSync(
      CALL_LOG,
      JSON.stringify({ at: new Date().toISOString(), label, model: response.model, usage: response.usage, costUsd: costOf(response.model, response.usage) }) + "\n",
    );

    if (response.stop_reason === "refusal") {
      lastError = `refused (${response.stop_details?.category ?? "no category"})`;
      break;
    }
    const text = (response.content as { type: string; text?: string }[])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const result = check(text);
    if (result.ok) {
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(file, JSON.stringify({ model: response.model, text, usage: response.usage } satisfies CachedResponse));
      return result.value;
    }
    lastError = `${response.stop_reason === "max_tokens" ? "hit max_tokens; " : ""}${result.error}`;
  }
  ledger.failures.push(`${label}: ${lastError}`);
  return null;
}

// Print the run's spend and append it to data/cost.json (cache-only reruns add nothing).
export function reportSpend(script: string): void {
  const all = emptyUsage();
  for (const [model, t] of ledger.byModel) {
    console.log(formatUsage(`  ${model}`, t));
    all.calls += t.calls;
    all.inputTokens += t.inputTokens;
    all.outputTokens += t.outputTokens;
    all.cacheReadTokens += t.cacheReadTokens;
    all.costUsd += t.costUsd;
  }
  console.log(formatUsage("This run (network calls)", all));
  console.log(`  ${ledger.cachedCalls} responses served from cache at no cost`);
  if (ledger.fallbackCalls) console.log(`  ${ledger.fallbackCalls} calls were declined and answered by a fallback model`);
  if (ledger.failures.length) {
    console.log(`  ${ledger.failures.length} calls failed after one retry and were skipped:`);
    for (const f of ledger.failures) console.log(`    ${f}`);
  }
  if (all.calls === 0) return;

  const costs = existsSync(COST_FILE) ? (JSON.parse(readFileSync(COST_FILE, "utf8")) as { runs: unknown[] }) : { runs: [] };
  costs.runs.push({
    script,
    date: new Date().toISOString(),
    byModel: Object.fromEntries(ledger.byModel),
    costUsd: Number(all.costUsd.toFixed(4)),
  });
  mkdirSync(path.dirname(COST_FILE), { recursive: true });
  writeFileSync(COST_FILE, JSON.stringify(costs, null, 2));
}

// Run async jobs with a fixed number in flight.
export async function pool<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
