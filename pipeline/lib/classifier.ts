import { z } from "zod";
import { OBJECTIONS, type RawItem, Stance } from "../../lib/schema";
import { MODELS } from "./anthropic";
import { callStructured } from "./llm";

const MAX_ITEM_CHARS = 6000;
const MAX_BATCH_ITEMS = 10;
const MAX_BATCH_CHARS = 24000;

// Shared by the Haiku labelling pass and the Sonnet second pass, so both apply the same test.
const RELEVANCE_RULES = `relevant: true only if the item is genuinely about using AI or LLM tools (AI SRE products, AIOps, agents, copilots, chatbots, general coding agents such as Claude Code or Cursor, MCP servers) for incident response, on-call, alert triage, root-cause analysis, debugging production systems, postmortems or other SRE and operations work. Opinions on whether AI can or can't do this work count.
The test: does the item talk about AI doing, helping with or being trusted with operations work on live systems (investigating incidents, alerts or outages, being on call, finding the root cause of a production problem, running runbooks, writing postmortems, replacing SREs)? Judge a story by its title and text together.
General AI-assisted coding is not relevant, even when it mentions bugs, debugging, hallucinations, code review or productivity, unless it is about production incidents or operations work.
Not relevant:
- monitoring, evaluating or debugging AI/LLM applications themselves (LLM observability, evals, agent tracing);
- incidents caused by AI, or outages of AI services, unless the item also discusses using AI to investigate or respond;
- AI for writing code in general, or for debugging code and tests during development, with no production, incident or operations angle;
- general AI products (enterprise search, chat over documents, analytics, sales or support bots) unless the item ties them to incidents, on-call or running production systems;
- security threat detection or SOC work with no production-incident angle;
- job ads, unrelated senses of a word (tree traversal, path traversal, a religious cleric) and anything else off-topic.`;

export const SYSTEM_PROMPT = `You label Hacker News stories and comments for a research project on how engineers talk about AI tools for incident response.

For each item, decide:

${RELEVANCE_RULES}
If relevant is false, set stance "neutral", objections [], best_quote "", vendors_mentioned [], buyer_signal "unknown" and author_is_vendor false.

stance, toward using AI tools for this work:
- sceptical: doubts it works, raises problems with it, or argues against it.
- positive: says it works or helps, recommends it, or is enthusiastic.
- mixed: clearly both.
- neutral: asks a question or states facts without a view.

objections: every objection to AI tools for incident and operations work that the author raises or agrees with. Don't count objections the author mentions only to rebut them. Use [] if there are none. A positive item can still raise one (e.g. "works well but took weeks to set up").
- wrong_or_hallucinated_cause: the AI gives wrong, invented or confidently mistaken causes or answers.
- cant_verify_reasoning: you can't see or check how it reached its answer; checking its work takes as long as doing it yourself; it needs evidence, citations or a track record before it is trusted.
- data_access_and_security: giving an AI or a vendor access to production systems, logs, code or data; privacy, compliance, write access or blast-radius risk.
- cost_or_pricing: too expensive, token costs, pricing that doesn't make sense.
- setup_and_integration_effort: hard to set up, needs many integrations, or needs ongoing maintenance or tuning.
- just_an_llm_wrapper: a thin wrapper over a general model with no real substance or moat.
- diy_with_general_agent: you could get the same result with a general model or coding agent yourself (ChatGPT, Claude, Claude Code, Cursor, MCP servers, scripts), or the author's team built their own.
- lacks_context_of_our_systems: it doesn't know the team's architecture, history, tribal knowledge or business context, and that context is the hard part.
- alert_noise_unsolved: the real problem is noisy or bad alerts, poor telemetry or missing runbooks, which AI doesn't fix (garbage in, garbage out).
- deskills_or_replaces_engineers: engineers lose skills or understanding, juniors don't learn, the team stops learning from incidents (e.g. AI-written postmortems), it is meant to replace engineers, or accountability gets blurred.
- vendor_lock_in: dependence on one vendor or platform.
- not_capable_yet: a general doubt that AI can do this work at all yet, or that it is hype ("AI is not there yet", "I'll believe it when it can fix an outage at 3am"). Use wrong_or_hallucinated_cause instead when the author describes specific wrong or invented answers.
- other: a different objection to AI for this work.

best_quote: the one or two consecutive sentences from the item's text that best show its stance or main objection. Copy them exactly, character for character, from <text> only, never from <title> or <thread>: keep the original spelling, punctuation and capitalisation, and don't add, remove or join words or use ellipses. At most 280 characters. If no sentence fits, or <text> is empty, use "".

vendors_mentioned: names of products or companies in AI, incident management, on-call or observability that the text mentions (e.g. "incident.io", "PagerDuty", "Datadog", "Rootly", "Claude Code", "ChatGPT"), written as in the text. [] if none.

buyer_signal: "true" if the author appears to run, lead, manage or buy tools for an engineering, SRE, platform or on-call team (e.g. a CTO or engineering manager, "we evaluated X for our team", "we pay for Y"). Being an engineer or SRE is not enough on its own. "false" if they clearly don't (e.g. a student, a hobbyist, an individual contributor with no say). Otherwise "unknown".

author_is_vendor: true if the author builds, sells or works for an AI incident, SRE or observability product and is talking about it (launch posts, founders answering questions in their own thread).

Return exactly one entry per item, using the item's id.`;

const Label = z.object({
  id: z.string(),
  relevant: z.boolean(),
  stance: Stance,
  objections: z.array(z.enum(OBJECTIONS)),
  best_quote: z.string(),
  vendors_mentioned: z.array(z.string()),
  buyer_signal: z.enum(["true", "false", "unknown"]),
  author_is_vendor: z.boolean(),
});
export type Label = z.infer<typeof Label>;
const BatchOutput = z.object({ items: z.array(Label) });

const forModel = (text: string) =>
  text.length > MAX_ITEM_CHARS ? `${text.slice(0, MAX_ITEM_CHARS)}\n[rest of item cut for length]` : text;

// Greedy batching in input order, so a pilot run on the first N items reuses the same cache entries.
export function makeBatches(items: RawItem[]): RawItem[][] {
  const batches: RawItem[][] = [];
  let current: RawItem[] = [];
  let chars = 0;
  for (const item of items) {
    const len = Math.min(item.text.length, MAX_ITEM_CHARS);
    if (current.length && (current.length >= MAX_BATCH_ITEMS || chars + len > MAX_BATCH_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += len;
  }
  if (current.length) batches.push(current);
  return batches;
}

// Stories carry their title as the first line of `text`; split it out so the title is never
// mistaken for something an engineer said.
export function storyBody(item: RawItem): string {
  return item.kind === "story" && item.title && item.text.startsWith(item.title)
    ? item.text.slice(item.title.length).trim()
    : item.text;
}

function idCheck(items: { id: string }[], batch: RawItem[]): string | null {
  const ids = items.map((l) => l.id).sort();
  const expected = batch.map((_, i) => String(i + 1)).sort();
  return JSON.stringify(ids) === JSON.stringify(expected) ? null : `expected ids ${expected.join(",")}, got ${ids.join(",")}`;
}

export function itemsPrompt(batch: RawItem[]): string {
  const blocks = batch.map((item, i) => {
    const context =
      item.kind === "story" ? `<title>${item.title ?? ""}</title>\n` : item.title ? `<thread>${item.title}</thread>\n` : "";
    return `<item id="${i + 1}">\n${context}<text>\n${forModel(storyBody(item))}\n</text>\n</item>`;
  });
  return `Label these ${batch.length} items.\n\n${blocks.join("\n\n")}`;
}

// Returns labels keyed by item id, or null if the batch failed twice.
export async function classifyBatch(
  model: string,
  batch: RawItem[],
  label: string,
  effort: "low" | "medium" = "low",
): Promise<Map<string, Label> | null> {
  const output = await callStructured(label, {
    model,
    system: SYSTEM_PROMPT,
    user: itemsPrompt(batch),
    schema: BatchOutput,
    effort,
    maxTokens: 8000,
    fallbacks: model === MODELS.synthesise,
    validate: (out) => idCheck(out.items, batch),
  });
  if (!output) return null;
  return new Map(output.items.map((l) => [batch[Number(l.id) - 1].id, l]));
}

export const CONFIRM_PROMPT = `You check items that a first-pass classifier marked as relevant for a research project on how engineers talk about AI tools for incident response. Some of them are not relevant, mostly general talk about AI for coding.

For each item, apply this definition:

${RELEVANCE_RULES}

Comments are replies inside the thread named in <thread>, so read them in that context. A reply in a thread about an AI tool for incidents, on-call or SRE work that discusses the tool or the idea (its reliability, accuracy, cost, security, usefulness, or whether it replaces engineers) is relevant even if the reply doesn't mention AI itself.

Mark relevant false for items that are about something else: most often general AI-assisted coding, AI products for other jobs, or off-topic talk. Keep items that meet the test. Return exactly one entry per item, using the item's id.`;

const ConfirmOutput = z.object({ items: z.array(z.object({ id: z.string(), relevant: z.boolean() })) });

// Second pass: Sonnet re-applies the relevance test to items Haiku kept. It can only remove items.
export async function confirmBatch(batch: RawItem[], label: string): Promise<Map<string, boolean> | null> {
  const output = await callStructured(label, {
    model: MODELS.synthesise,
    system: CONFIRM_PROMPT,
    user: itemsPrompt(batch),
    schema: ConfirmOutput,
    effort: "medium",
    maxTokens: 16000,
    fallbacks: true,
    validate: (out) => idCheck(out.items, batch),
  });
  if (!output) return null;
  return new Map(output.items.map((l) => [batch[Number(l.id) - 1].id, l.relevant]));
}

// The objection definitions, read back out of the labelling prompt so later steps use the same words.
export function objectionDefinitions(): Record<string, string> {
  const defs: Record<string, string> = {};
  for (const m of SYSTEM_PROMPT.matchAll(/^- ([a-z_]+): (.+)$/gm)) {
    if ((OBJECTIONS as readonly string[]).includes(m[1])) defs[m[1]] = m[2];
  }
  return defs;
}
