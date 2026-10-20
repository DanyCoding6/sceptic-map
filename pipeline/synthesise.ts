import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  type Claim,
  ClassifiedFile,
  type ClassifiedItem,
  type CoverageCell,
  type Finding,
  OBJECTION_LABELS,
  type Objection,
  OBJECTIONS,
  type ObjectionStat,
  type QuoteRef,
  ModelRating,
  RawItem,
  type SiteItem,
  Synthesis,
  type Vendor,
  VENDORS,
} from "../lib/schema";
import { computeNumbers, half } from "../lib/numbers";
import { MODELS } from "./lib/anthropic";
import { itemsPrompt, objectionDefinitions } from "./lib/classifier";
import { callStructured, ledger, pool, reportSpend } from "./lib/llm";
import { checkStyle, STYLE_RULES } from "./lib/style";
import { isVerbatim, normaliseWhitespace } from "./lib/text";

const DATA = path.join(process.cwd(), "data");
const readJson = (file: string) => JSON.parse(readFileSync(path.join(DATA, file), "utf8"));
const RATED: Objection[] = OBJECTIONS.filter((o) => o !== "other");
const MAX_CLAIM_CHARS = 400;

const isProof = (c: Claim) => c.proof !== "none" && c.proof !== "illustration";
const quoteRef = (i: ClassifiedItem): QuoteRef => ({ id: i.id, quote: i.best_quote!, url: i.url, date: i.date.slice(0, 10), thread: i.title });

// Names in vendors_mentioned, mapped to the filter options on the site. Anything else is dropped.
const GENERAL_AI = /^(claude|claude code|chatgpt|openai|gpt[-\w. ]*|codex|cursor|gemini[\w. ]*|copilot|github copilot|anthropic|llama[\w. -]*|deepseek[\w. ]*|mcp|qwen[\w. ]*)$/;
function normaliseVendor(name: string): string | null {
  const n = name.toLowerCase().trim();
  if (n === "incident.io") return "incident.io";
  if (n.startsWith("pagerduty")) return "PagerDuty";
  if (n === "rootly") return "Rootly";
  if (n.startsWith("datadog") || n === "bits ai") return "Datadog";
  if (n.startsWith("resolve")) return "Resolve.ai";
  if (GENERAL_AI.test(n)) return "General AI tools";
  return null;
}

// ---------- Prompts ----------

const DEFS = objectionDefinitions();
const objectionList = (objs: readonly Objection[]) => objs.map((o) => `- ${o}: ${DEFS[o]}`).join("\n");

const QUOTE_PROMPT = `You pick quotes for a one-page research site on how engineers talk about AI tools for incident response. For one objection you get candidate quotes from Hacker News, each with an id, date and thread title.

Pick the 3 that best show this objection to a reader who sees nothing else:
- each must express this objection clearly on its own;
- specific beats general: a concrete reason, experience or example beats a slogan;
- together they should cover different angles, not repeat one point;
- when quality is similar, prefer recent quotes and authors marked [buyer] (they appear to run or buy for a team);
- avoid jokes or sarcasm that could be misread, and quotes that only make sense inside the thread.

Return the ids best first, each with a few words on why.`;

const DIY_PROMPT = `You read Hacker News items about AI tools for incident response, on-call and production debugging. For each item, answer two questions about the author.

general_agent_for_ops: true if the author describes using, or recommends, a general-purpose AI tool for incident, on-call or production-debugging work: a chat assistant or coding agent (ChatGPT, Claude, Claude Code, Cursor, Codex, Copilot, Gemini), MCP servers, or an agent or scripts they built themselves, rather than a dedicated AI incident product. Discussing such tools without saying they use them, or recommending them, for this work is false.

product_unneeded: true if the author argues that a dedicated AI incident or SRE product is unnecessary because a general tool, or something they built, already does the job.

Return exactly one entry per item, using the item's id.`;

const CLAIMS_PROMPT = `You extract claims from a public web page for a research project that compares how AI incident-investigation tools answer engineers' objections.

Extract every distinct claim the page makes about AI investigation, root-cause analysis, on-call or SRE-agent capabilities: models of the customer's systems, integrations, security and data handling, setup, pricing, accuracy, speed, verification and evidence. Also extract any other claim that speaks to the objections listed below. Skip claims about unrelated features (status pages, dark mode, billing screens and so on) unless they bear on those objections. For a first-hand write-up by an engineer, a claim is a statement of what the approach did, found or required.

For each claim:
- quote: copied exactly, character for character, from the page text: one or two consecutive sentences, at most 300 characters. Don't fix typos, join separate passages or add words.
- proof: "number" if the claim itself reports a specific measured result (a time, a count, a rate, an accuracy figure); a figure that describes a method or a grading scale, or how long the vendor spent building, is not proof. "named_customer" if it names a real customer or quotes one by name; "demo" if it walks through a real incident that actually happened (the vendor's own or a customer's), with what was found; "illustration" if it shows a sample output, a mock-up or a hypothetical walkthrough; otherwise "none". A quote from an unnamed customer counts only if it reports a measured figure ("number"). A bare adjective such as "fast" or "accurate" is "none".
- proof_note: a few words on what the proof is, or "" if none.
- addresses: the objections below that the claim speaks to, if any.

Objections:
${objectionList(RATED)}

If the page makes no such claims, return an empty list.`;

const COVERAGE_PROMPT = `You rate how a vendor's public messaging answers engineers' objections to AI tools for incident response. You get the objections engineers raise (how often, with example quotes) and every claim extracted verbatim from the vendor's pages, each with an id and a proof type.

For each objection, rate the vendor's messaging:
- SHOWN: at least one claim answers this objection and carries specific proof that bears on it: a measured number, a named customer, or a demo of a real incident that visibly shows it. An illustration (sample output, mock-up or hypothetical walkthrough) is not proof. Proof about something else (e.g. a speed figure when the objection is about accuracy) doesn't count, and nor does proof about another of the vendor's products (e.g. a migration to its paging or on-call platform): rate that SAID at most.
- SAID: claims address the objection, but only assert it.
- NOT_YET: no claim addresses it.

Cite the 1 to 3 claim ids that best support the rating (none for NOT_YET). Give a one-line reason, under 25 words, that the vendor's own product marketer would find fair.
For "DIY", the "vendor" is a set of first-hand write-ups of engineers using a general coding agent with MCP servers; rate them the same way.

${STYLE_RULES}

Return exactly one entry per objection.`;

const FINDINGS_PROMPT = `You help an independent student write a research site for incident.io's product marketing team. Their new product, Investigations, is an agent that does root-cause analysis during live incidents, built on Nexus, which they describe as a living model of a customer's production environment. It launched on 5 August 2026. The readers decide what the company claims and how it proves it. They already know engineers are sceptical and that proof is hard.

From the data below, write exactly 3 candidate headline findings, ranked by how useful each would be to that team. Useful means surprising, actionable and backed by the data. An obvious point ("engineers worry about hallucinations") is weak unless the data gives it a new angle. Check specifically whether doing it yourself with a general AI tool is a real competitive alternative in this data, and say honestly what the data shows, either way.

Each finding has:
- headline: one sentence stating the finding, including its count and the base it comes from.
- implication: "What this means for how Investigations is told": 2 or 3 sentences, concrete and constructive: what sceptical engineers need to hear, and how incident.io could show it. Base any statement about incident.io's messaging on the incident.io claims listed below, and cite their ids in claim_ids.
- quote_ids: exactly 2 ids from the quote list that best support the finding.
- why_ranked: one sentence on why it sits at this rank.

Numbers: never type a digit. Write every number as a placeholder from the numbers table, in braces, e.g. "{count:not_capable_yet} of {n_base} comments". Years may be written as digits. Don't spell numbers out as words, and don't use percentages.
Care with the numbers:
- Counts for different objections overlap, because one comment can raise several. Never add them or say "more"; use an either: key for a combined figure.
- Every half-year count is small, and the last half-year runs only to the end of the window. Don't claim a trend or shift from a single half-year or from counts under ten. If you describe change over time, cite several half-years and say the counts are small.
- Only describe a group (e.g. "sceptical engineers") if the number you cite is for that group. Stance counts for engineers who use a general AI tool are in the table.
The data is public Hacker News comments, which skew sceptical, senior and non-buyer, so don't overstate.
Commenters are talking about AI incident tools in general. Don't say they are talking about Investigations or incident.io unless the quote names it.
When you mention an incident.io claim, name the product exactly as the claim does (for example Nexus, not Investigations).
Don't start the implication with a label such as "What this means".

${STYLE_RULES}`;

// ---------- Steps ----------

async function pickQuotes(objection: Objection, candidates: ClassifiedItem[]): Promise<QuoteRef[]> {
  if (candidates.length <= 3) return candidates.map(quoteRef);
  const want = 3;
  const list = candidates
    .map((i) => `[${i.id}] ${i.date.slice(0, 10)} · thread: "${i.title ?? ""}"${i.buyer_signal === true ? " [buyer]" : ""}\n${i.best_quote}`)
    .join("\n\n");
  const out = await callStructured(`quotes ${objection}`, {
    model: MODELS.synthesise,
    system: QUOTE_PROMPT,
    user: `Objection: ${OBJECTION_LABELS[objection]} (${objection}): ${DEFS[objection]}\n\nCandidates:\n\n${list}`,
    schema: z.object({ picks: z.array(z.object({ id: z.string(), why: z.string() })) }),
    effort: "medium",
    maxTokens: 16000,
    fallbacks: true,
    validate: (o) => {
      const ids = o.picks.map((p) => p.id);
      if (ids.length !== want || new Set(ids).size !== want) return `need ${want} distinct ids, got ${ids.join(",")}`;
      const bad = ids.find((id) => !candidates.some((c) => c.id === id));
      return bad ? `unknown id ${bad}` : null;
    },
  });
  // Fall back to the most recent quotes if the model call failed.
  const ids = out?.picks.map((p) => p.id) ?? [...candidates].sort((a, b) => b.date.localeCompare(a.date)).slice(0, want).map((c) => c.id);
  return ids.map((id) => quoteRef(candidates.find((c) => c.id === id)!));
}

export async function tagDiy(base: ClassifiedItem[], raw: Map<string, RawItem>) {
  const items = base.map((i) => raw.get(i.id)!);
  const batches: RawItem[][] = [];
  for (let i = 0; i < items.length; i += 10) batches.push(items.slice(i, i + 10));
  const tags = new Map<string, { uses: boolean; unneeded: boolean }>();
  await pool(batches, 6, async (batch, b) => {
    const out = await callStructured(`diy batch ${b + 1}`, {
      model: MODELS.synthesise,
      system: DIY_PROMPT,
      user: itemsPrompt(batch),
      schema: z.object({ items: z.array(z.object({ id: z.string(), general_agent_for_ops: z.boolean(), product_unneeded: z.boolean() })) }),
      effort: "medium",
      maxTokens: 16000,
      fallbacks: true,
      validate: (o) => {
        const ids = o.items.map((x) => x.id).sort();
        const expected = batch.map((_, i) => String(i + 1)).sort();
        return JSON.stringify(ids) === JSON.stringify(expected) ? null : `expected ids ${expected.join(",")}, got ${ids.join(",")}`;
      },
    });
    for (const x of out?.items ?? []) tags.set(batch[Number(x.id) - 1].id, { uses: x.general_agent_for_ops, unneeded: x.product_unneeded });
  });
  return tags;
}

async function extractClaims(vendorPages: RawItem[]): Promise<{ claims: Claim[]; dropped: string[] }> {
  const claims: Claim[] = [];
  const dropped: string[] = [];
  const ClaimsOut = z.object({
    claims: z.array(
      z.object({
        quote: z.string(),
        proof: z.enum(["number", "named_customer", "demo", "illustration", "none"]),
        proof_note: z.string(),
        addresses: z.array(z.enum(OBJECTIONS)),
      }),
    ),
  });
  const results = await pool(vendorPages, 6, async (page) => {
    const slug = page.id.replace("vendor:", "");
    const out = await callStructured(`claims ${slug}`, {
      model: MODELS.synthesise,
      system: CLAIMS_PROMPT,
      user: `Vendor: ${page.vendor}\nPage title: ${page.title ?? ""}\nURL: ${page.url}\n\nPage text:\n${page.text.slice(0, 30000)}`,
      schema: ClaimsOut,
      effort: "medium",
      maxTokens: 16000,
      fallbacks: true,
    });
    return { page, slug, out };
  });
  for (const { page, slug, out } of results) {
    if (!out) {
      dropped.push(`${slug}: extraction failed`);
      continue;
    }
    let n = 0;
    for (const c of out.claims) {
      const quote = normaliseWhitespace(c.quote);
      if (!isVerbatim(quote, page.text)) {
        dropped.push(`${slug}: not verbatim: ${quote.slice(0, 70)}`);
        continue;
      }
      if (quote.length > MAX_CLAIM_CHARS) {
        dropped.push(`${slug}: too long (${quote.length} chars)`);
        continue;
      }
      claims.push({
        id: `${slug}#${++n}`,
        vendor: page.vendor as Vendor,
        url: page.url,
        pageTitle: page.title ?? "",
        quote,
        proof: c.proof,
        proofNote: c.proof_note,
        addresses: [...new Set(c.addresses.filter((a) => a !== "other"))],
      });
    }
  }
  return { claims, dropped };
}

async function rateCoverage(vendor: Vendor, claims: Claim[], stats: ObjectionStat[], pageUrls: string[]): Promise<CoverageCell[]> {
  const mine = claims.filter((c) => c.vendor === vendor);
  const objectionsBlock = RATED.map((o) => {
    const s = stats.find((x) => x.objection === o)!;
    const examples = s.quotes.slice(0, 2).map((q) => `    "${q.quote}"`).join("\n");
    return `${o} (${OBJECTION_LABELS[o]}), raised in ${s.count} comments: ${DEFS[o]}\n${examples}`;
  }).join("\n\n");
  const claimsBlock = mine.map((c) => `[${c.id}] proof=${c.proof}${c.proofNote ? ` (${c.proofNote})` : ""}: ${c.quote}`).join("\n");
  const out = await callStructured(`coverage ${vendor}`, {
    model: MODELS.synthesise,
    system: COVERAGE_PROMPT,
    user: `Vendor: ${vendor}\n\nObjections:\n\n${objectionsBlock}\n\nClaims from ${vendor}'s pages (${mine.length}):\n${claimsBlock || "(none)"}`,
    schema: z.object({
      cells: z.array(z.object({ objection: z.enum(OBJECTIONS), rating: ModelRating, claim_ids: z.array(z.string()), reason: z.string() })),
    }),
    effort: "high",
    maxTokens: 16000,
    fallbacks: true,
    validate: (o) => {
      const objs = o.cells.map((c) => c.objection).sort();
      if (JSON.stringify(objs) !== JSON.stringify([...RATED].sort())) return `need one cell per objection, got ${objs.join(",")}`;
      for (const c of o.cells) {
        const cited = c.claim_ids.map((id) => mine.find((m) => m.id === id));
        if (cited.some((x) => !x)) return `${c.objection}: unknown claim id`;
        if (c.rating === "NOT_YET" && c.claim_ids.length) return `${c.objection}: NOT_YET must cite no claims`;
        if (c.rating !== "NOT_YET" && !c.claim_ids.length) return `${c.objection}: ${c.rating} must cite a claim`;
        if (c.rating === "SHOWN" && !cited.some((x) => isProof(x!))) return `${c.objection}: SHOWN needs a cited claim with proof (an illustration isn't)`;
      }
      return checkStyle(o.cells.map((c) => c.reason), `coverage ${vendor}`);
    },
  });
  if (!out) throw new Error(`Coverage for ${vendor} failed twice; see the log.`);
  return out.cells.map((c) => ({
    vendor,
    objection: c.objection,
    rating: c.rating,
    claimIds: c.claim_ids,
    reason: c.reason,
    urls: c.claim_ids.length ? [...new Set(c.claim_ids.map((id) => mine.find((m) => m.id === id)!.url))] : pageUrls,
  }));
}

// A finding plus the placeholder text it was filled from, so merge.ts can re-fill edited wording.
type DraftFinding = Finding & { template: { headline: string; implication: string } };

// Fill {key} placeholders from the numbers table. Unknown keys are an error.
function fill(template: string, numbers: Record<string, number>): { text: string; missing: string[] } {
  const missing: string[] = [];
  const text = template.replace(/\{([^{}]+)\}/g, (_, key: string) => {
    if (!(key in numbers)) missing.push(key);
    return key in numbers ? numbers[key].toLocaleString("en-GB") : `{${key}}`;
  });
  return { text, missing };
}

// Digits are only allowed inside placeholders, in years and in dates such as "5 August".
const strayDigits = (template: string) =>
  template
    .replace(/\{[^{}]+\}/g, "")
    .replace(/\b20\d\d\b/g, "")
    .replace(/\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)\b/g, "")
    .match(/\d/);

async function writeFindings(ctx: {
  numbers: Record<string, number>;
  stats: ObjectionStat[];
  coverage: CoverageCell[];
  claims: Claim[];
  diyQuotes: QuoteRef[];
  window: { from: string; to: string };
}): Promise<DraftFinding[]> {
  const { numbers, stats, coverage, claims, diyQuotes } = ctx;
  const quotePool = [...stats.flatMap((s) => s.quotes), ...diyQuotes].filter((q, i, a) => a.findIndex((x) => x.id === q.id) === i);
  const iioClaims = claims.filter((c) => c.vendor === "incident.io");
  const usedKeys = Object.keys(numbers).filter((k) => !/:20\d\d-H\d$/.test(k) || /^(count:(not_capable_yet|wrong_or_hallucinated_cause|deskills_or_replaces_engineers|data_access_and_security|cant_verify_reasoning|diy_with_general_agent)|base|diy:uses):/.test(k));
  const numbersBlock = usedKeys.map((k) => `${k} = ${numbers[k]}`).join("\n");
  const objectionBlock = stats
    .map((s) => `${s.objection} (${s.label}): ${s.count} comments, ${s.sceptical} sceptical, ${s.mixed} mixed; by half-year ${s.byHalf.map((h) => `${h.half}:${h.count}`).join(" ")}`)
    .join("\n");
  const matrix = RATED.map((o) => `${o}: ${VENDORS.map((v) => `${v}=${coverage.find((c) => c.vendor === v && c.objection === o)!.rating}`).join(", ")}`).join("\n");
  const iioCells = coverage
    .filter((c) => c.vendor === "incident.io")
    .map((c) => `${c.objection}: ${c.rating} [${c.claimIds.join(", ")}] ${c.reason}`)
    .join("\n");
  const user = `The window ends on ${ctx.window.to}, so the last half-year is partial.

Base: ${numbers.n_base} relevant Hacker News stories and comments not written by a vendor or founder, ${ctx.window.from} to ${ctx.window.to} (from ${numbers.n_collected} collected; ${numbers.n_vendor} vendor or founder posts set aside).

Numbers table (placeholder = value):
${numbersBlock}

Objections:
${objectionBlock}

Do it yourself with a general AI tool: ${numbers["diy:uses"]} of the base describe using or recommending a general AI tool for incident work; ${numbers["diy:unneeded"]} argue a dedicated product is unnecessary; ${numbers["diy:objection"]} raise "I could do this myself" as an objection; ${numbers["diy:mentions"]} mention a general AI tool by name.

Coverage matrix (how each vendor's public pages answer each objection):
${matrix}

incident.io's coverage, with cited claims and reasons:
${iioCells}

incident.io claims:
${iioClaims.map((c) => `[${c.id}] proof=${c.proof}: ${c.quote}`).join("\n")}

Quote list:
${quotePool.map((q) => `[${q.id}] ${q.date}: ${q.quote}`).join("\n")}`;

  const out = await callStructured("findings", {
    model: MODELS.synthesise,
    system: FINDINGS_PROMPT,
    user,
    schema: z.object({
      findings: z.array(
        z.object({ rank: z.number(), headline: z.string(), implication: z.string(), quote_ids: z.array(z.string()), claim_ids: z.array(z.string()), why_ranked: z.string() }),
      ),
    }),
    effort: "high",
    maxTokens: 16000,
    fallbacks: true,
    validate: (o) => {
      if (o.findings.length !== 3) return `need exactly 3 findings, got ${o.findings.length}`;
      if (JSON.stringify(o.findings.map((f) => f.rank).sort()) !== "[1,2,3]") return "ranks must be 1, 2 and 3";
      for (const f of o.findings) {
        for (const t of [f.headline, f.implication]) {
          const { missing } = fill(t, numbers);
          if (missing.length) return `unknown placeholder(s): ${missing.join(", ")}`;
          if (strayDigits(t)) return `a digit outside a placeholder in: ${t.slice(0, 80)}`;
        }
        if (!/\{[^{}]+\}/.test(f.headline)) return "each headline needs at least one number placeholder";
        if (f.quote_ids.length !== 2 || new Set(f.quote_ids).size !== 2) return "each finding needs exactly 2 distinct quote ids";
        const badQuote = f.quote_ids.find((id) => !quotePool.some((q) => q.id === id));
        if (badQuote) return `quote id ${badQuote} is not in the quote list`;
        const badClaim = f.claim_ids.find((id) => !iioClaims.some((c) => c.id === id));
        if (badClaim) return `claim id ${badClaim} is not an incident.io claim`;
      }
      return checkStyle(o.findings.flatMap((f) => [f.headline, f.implication, f.why_ranked]), "findings");
    },
  });
  if (!out) throw new Error("Findings failed twice; see the log.");
  return [...out.findings]
    .sort((a, b) => a.rank - b.rank)
    .map((f, i) => ({
      id: `f${i + 1}`,
      rank: f.rank,
      headline: fill(f.headline, numbers).text,
      implication: fill(f.implication.replace(/^What this means[^:]*:\s*/i, ""), numbers).text,
      whyRanked: f.why_ranked.replace(/\}+\s*$/, ""),
      n: numbers.n_base,
      scope: "all" as const,
      quotes: f.quote_ids.map((id) => quotePool.find((q) => q.id === id)!),
      claimIds: f.claim_ids,
      template: { headline: f.headline, implication: f.implication },
    }));
}

// ---------- Main ----------

async function main() {
  const classified = ClassifiedFile.parse(readJson("classified.json"));
  const raw = new Map(RawItem.array().parse(readJson("raw/items.json")).map((i) => [i.id, i]));
  const vendorPages = RawItem.array().parse(readJson("raw/vendors.json"));

  const relevant = classified.items.filter((i) => i.relevant);
  const base = relevant.filter((i) => !i.author_is_vendor);
  const window = classified.meta.window;
  const halves = [...new Set(base.map((i) => half(i.date)))].sort();
  console.log(`Base: ${base.length} relevant items not written by a vendor or founder (${relevant.length - base.length} set aside), ${window.from} to ${window.to}.`);

  // 1. Frequency, stance and trend per objection (code only).
  const stats: ObjectionStat[] = OBJECTIONS.map((o) => {
    const items = base.filter((i) => i.objections.includes(o));
    return {
      objection: o,
      label: OBJECTION_LABELS[o],
      count: items.length,
      sceptical: items.filter((i) => i.stance === "sceptical").length,
      mixed: items.filter((i) => i.stance === "mixed").length,
      byHalf: halves.map((h) => ({ half: h, count: items.filter((i) => half(i.date) === h).length })),
      quotes: [],
    };
  }).sort((a, b) => b.count - a.count);

  // 2. The three best quotes per objection (Sonnet chooses by id; the text comes from the data).
  console.log("Picking quotes...");
  await pool(stats, 4, async (s) => {
    const candidates = base.filter((i) => i.objections.includes(s.objection) && i.best_quote);
    s.quotes = await pickQuotes(s.objection, candidates);
  });

  // 3. Is "do it yourself with a general AI tool" a real alternative in the data?
  console.log(`Tagging ${base.length} items for DIY use...`);
  const diyTags = await tagDiy(base, raw);
  const usesDiy = base.filter((i) => diyTags.get(i.id)?.uses);
  const diyQuoteCandidates = usesDiy.filter((i) => i.best_quote);
  const diyQuotes = await pickQuotes("diy_with_general_agent", diyQuoteCandidates);

  // 4. Claims from every vendor page, kept only if verbatim.
  console.log(`Extracting claims from ${vendorPages.length} vendor pages...`);
  const { claims, dropped } = await extractClaims(vendorPages);

  // 5. Coverage: how each vendor's messaging answers each objection.
  console.log("Rating coverage...");
  const pageUrlsByVendor = (v: Vendor) => vendorPages.filter((p) => p.vendor === v).map((p) => p.url);
  const coverage = (await pool([...VENDORS], 3, (v) => rateCoverage(v, claims, stats, pageUrlsByVendor(v)))).flat();

  // 6. Every number a finding may cite (the same function merge.ts and verify.ts use).
  const items: SiteItem[] = base.map((i) => ({
    id: i.id,
    url: i.url,
    date: i.date.slice(0, 10),
    stance: i.stance,
    objections: i.objections,
    vendors: [...new Set(i.vendors_mentioned.map(normaliseVendor).filter((v): v is string => v !== null))],
    buyer_signal: i.buyer_signal,
    usesGeneralAI: diyTags.get(i.id)?.uses ?? false,
    productUnneeded: diyTags.get(i.id)?.unneeded ?? false,
    kind: i.kind === "story" ? "story" : "comment",
    thread: i.title ?? "",
    quote: i.best_quote,
  }));
  const numbers = computeNumbers(items, coverage, { nCollected: classified.meta.nItems, nRelevant: relevant.length });

  // 7. Three ranked findings, written with placeholders that code fills.
  console.log("Writing findings...");
  const findings = await writeFindings({ numbers, stats, coverage, claims, diyQuotes, window });


  const synthesis = Synthesis.parse({
    meta: {
      generatedAt: new Date().toISOString(),
      models: { classify: classified.meta.model, synthesise: MODELS.synthesise },
      source: classified.meta.source,
      window,
      nCollected: classified.meta.nItems,
      nRelevant: relevant.length,
      nVendorAuthored: relevant.length - base.length,
      nBase: base.length,
      halves: halves.map((h) => ({ half: h, base: numbers[`base:${h}`] })),
    },
    numbers,
    objections: stats,
    diy: {
      objectionCount: numbers["diy:objection"],
      usesGeneralAgent: numbers["diy:uses"],
      saysProductUnneeded: numbers["diy:unneeded"],
      mentionsGeneralAI: numbers["diy:mentions"],
      byHalf: halves.map((h) => ({ half: h, uses: numbers[`diy:uses:${h}`], base: numbers[`base:${h}`] })),
      quotes: diyQuotes,
    },
    claims,
    coverage,
    findings,
    items,
  });
  // Keep the placeholder templates alongside, so merge.ts can re-fill edited text.
  const templates = Object.fromEntries(findings.map((f) => [f.id, f.template]));
  writeFileSync(path.join(DATA, "synthesis.json"), JSON.stringify({ ...synthesis, findingTemplates: templates }, null, 1));

  // ---------- Report ----------
  console.log(`\nClaims: ${claims.length} kept (all verbatim), ${dropped.length} dropped.`);
  for (const v of VENDORS) console.log(`  ${v.padEnd(12)} ${claims.filter((c) => c.vendor === v).length} claims, ${claims.filter((c) => c.vendor === v && isProof(c)).length} with proof`);
  if (dropped.length) console.log(`  dropped: ${dropped.slice(0, 8).join(" | ")}${dropped.length > 8 ? " ..." : ""}`);

  console.log(`\nObjections (base ${base.length}):`);
  for (const s of stats) console.log(`  ${String(s.count).padStart(4)}  ${s.label}  [${s.byHalf.map((h) => h.count).join(" ")}]`);
  console.log(`  half-years: ${halves.join(" ")}; base per half: ${halves.map((h) => numbers[`base:${h}`]).join(" ")}`);

  console.log(`\nDIY: ${numbers["diy:uses"]} describe using or recommending a general AI tool for incident work; ${numbers["diy:unneeded"]} say a dedicated product is unnecessary; ${numbers["diy:objection"]} raise it as an objection; ${numbers["diy:mentions"]} name a general AI tool.`);
  console.log(`  uses by half: ${halves.map((h) => `${h} ${numbers[`diy:uses:${h}`]}/${numbers[`base:${h}`]}`).join(", ")}`);

  const short = { SHOWN: "SHOWN", SAID: "said", NOT_YET: "-", NA: "n/a" } as const;
  console.log(`\nCoverage (SHOWN = with proof, said = asserted, - = not yet):`);
  console.log(`  ${"objection".padEnd(32)}${VENDORS.map((v) => v.padEnd(12)).join("")}`);
  for (const o of RATED) {
    console.log(`  ${o.padEnd(32)}${VENDORS.map((v) => short[coverage.find((c) => c.vendor === v && c.objection === o)!.rating].padEnd(12)).join("")}`);
  }
  console.log("\nincident.io, cell by cell:");
  for (const c of coverage.filter((c) => c.vendor === "incident.io")) console.log(`  ${c.objection}: ${c.rating} [${c.claimIds.join(", ")}] ${c.reason}`);

  console.log("\nFindings:");
  for (const f of findings) {
    console.log(`\n#${f.rank} ${f.headline}\n   n=${f.n}, ${window.from} to ${window.to}`);
    for (const q of f.quotes) console.log(`   > "${q.quote}" (${q.date}, ${q.url})`);
    console.log(`   What this means: ${f.implication}`);
    if (f.claimIds.length) console.log(`   Cites: ${f.claimIds.join(", ")}`);
    console.log(`   Why this rank: ${f.whyRanked}`);
  }

  // Acceptance checks.
  const noUrl = coverage.filter((c) => !c.urls.length).length;
  const badQuotes = findings.flatMap((f) => f.quotes).filter((q) => !isVerbatim(q.quote, classified.items.find((i) => i.id === q.id)!.text!)).length;
  console.log(`\nChecks: ${coverage.length} ratings, ${noUrl} without a URL; ${findings.length} findings, each with n=${base.length}; ${badQuotes} finding quotes not verbatim.`);
  console.log(`Model calls failed after retry: ${ledger.failures.length}`);
  console.log("\nSpend:");
  reportSpend("synthesise");
}

// Only run when executed directly, so other scripts can import tagDiy.
if (process.argv[1]?.endsWith("synthesise.ts")) main().catch((err) => {
  console.error(err);
  console.log("\nFailures:");
  for (const f of ledger.failures) console.log(`  ${f}`);
  console.log("\nSpend (run stopped early):");
  reportSpend("synthesise (stopped early)");
  process.exit(1);
});
