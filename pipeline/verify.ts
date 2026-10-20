import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { BattleCard, ClassifiedFile, OBJECTIONS, RawItem, Stats, Synthesis } from "../lib/schema";
import { isVerbatim } from "./lib/text";

// Runs before every build (npm "prebuild"). Fails the build if anything on the page can't be
// traced back to the data: a quote that isn't verbatim, a number that doesn't recompute,
// a rating without a source, a battle-card reference that doesn't exist, or a banned word.

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const readJson = (f: string) => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const site = Synthesis.parse(readJson("site.json"));
const stats = Stats.parse(readJson("stats.json"));
const card = BattleCard.parse(readJson("battlecard.json"));
const classified = ClassifiedFile.parse(readJson("classified.json"));
const source = new Map(classified.items.map((i) => [i.id, i]));

// 1. Every engineer quote is verbatim in its source and links to it.
const quotes = [
  ...site.objections.flatMap((o) => o.quotes),
  ...site.findings.flatMap((f) => f.quotes),
  ...site.diy.quotes,
  ...site.items.filter((i) => i.quote).map((i) => ({ id: i.id, quote: i.quote!, url: i.url })),
];
for (const q of quotes) {
  const s = source.get(q.id);
  if (!s?.text) fail(`quote ${q.id}: no source text`);
  else if (!isVerbatim(q.quote, s.text)) fail(`quote ${q.id} is not verbatim`);
  else if (s.url !== q.url) fail(`quote ${q.id} links to ${q.url}, source is ${s.url}`);
}

// 2. Vendor claims are verbatim in their page (only where the raw pages exist; they're not committed).
const vendorFile = path.join(DATA, "raw", "vendors.json");
let claimsChecked = false;
if (existsSync(vendorFile)) {
  const pages = new Map(RawItem.array().parse(JSON.parse(readFileSync(vendorFile, "utf8"))).map((p) => [p.url, p]));
  for (const c of site.claims) {
    const page = pages.get(c.url);
    if (!page) fail(`claim ${c.id}: page ${c.url} not fetched`);
    else if (!isVerbatim(c.quote, page.text)) fail(`claim ${c.id} is not verbatim`);
  }
  claimsChecked = true;
}

// 3. Every number recomputes from the classified data.
const base = classified.items.filter((i) => i.relevant && !i.author_is_vendor);
const half = (d: string) => `${d.slice(0, 4)}-H${Number(d.slice(5, 7)) <= 6 ? 1 : 2}`;
const expect = (key: string, actual: number) => {
  if (site.numbers[key] !== actual) fail(`number ${key}: site says ${site.numbers[key]}, data gives ${actual}`);
};
expect("n_base", base.length);
expect("n_relevant", classified.items.filter((i) => i.relevant).length);
expect("n_collected", classified.meta.nItems);
if (site.items.length !== base.length) fail(`site has ${site.items.length} items, data has ${base.length}`);
for (const o of OBJECTIONS) {
  const hits = base.filter((i) => i.objections.includes(o));
  expect(`count:${o}`, hits.length);
  expect(`sceptical:${o}`, hits.filter((i) => i.stance === "sceptical").length);
  const stat = site.objections.find((s) => s.objection === o)!;
  if (stat.count !== hits.length) fail(`objection ${o}: count ${stat.count}, data ${hits.length}`);
  for (const b of stat.byHalf) if (b.count !== hits.filter((i) => half(i.date) === b.half).length) fail(`objection ${o} ${b.half} miscounted`);
}
for (const h of site.meta.halves) expect(`base:${h.half}`, base.filter((i) => half(i.date) === h.half).length);
expect("diy:uses", site.items.filter((i) => i.usesGeneralAI).length);
for (const [key, value] of Object.entries(site.numbers)) {
  const m = key.match(/^either:(\w+)\+(\w+)$/);
  if (m) {
    const n = base.filter((i) => i.objections.includes(m[1] as never) || i.objections.includes(m[2] as never)).length;
    if (n !== value) fail(`number ${key}: ${value} vs ${n}`);
  }
  const s = key.match(/^count_since_2025:(\w+)$/);
  if (s) {
    const n = base.filter((i) => i.date >= "2025-01-01" && i.objections.includes(s[1] as never)).length;
    if (n !== value) fail(`number ${key}: ${value} vs ${n}`);
  }
}
const statsCheck: [string, number, number][] = [
  ["nBase", stats.nBase, base.length],
  ["nCollected", stats.nCollected, classified.meta.nItems],
  ["quotesKept", stats.quotesKept, classified.items.filter((i) => i.relevant && i.quote_check === "ok").length],
  ["claims", stats.claims, site.claims.length],
  ["ratings", stats.ratings, site.coverage.length],
  ["buyerSignal", stats.buyerSignal, base.filter((i) => i.buyer_signal === true).length],
  ["costUsd", stats.costUsd, Number((readJson("cost.json").runs as { costUsd: number }[]).reduce((a, r) => a + r.costUsd, 0).toFixed(2))],
];
for (const [k, shown, actual] of statsCheck) if (shown !== actual) fail(`stats.${k}: ${shown} vs ${actual}`);

// 4. Findings: the filled text matches its template, each has n and two real quotes.
const templates = readJson("synthesis.json").findingTemplates as Record<string, { headline: string; implication: string }>;
const overrides = existsSync(path.join(DATA, "overrides.json")) ? readJson("overrides.json") : { findings: [] };
const fill = (t: string) => t.replace(/\{([^{}]+)\}/g, (_, k: string) => (k in site.numbers ? site.numbers[k].toLocaleString("en-GB") : `{${k}}`));
for (const f of site.findings) {
  const o = (overrides.findings as { id: string; headline?: string; short?: string; implication?: string }[]).find((x) => x.id === f.id);
  const headline = fill(o?.headline ?? templates[f.id].headline);
  const implication = fill(o?.implication ?? templates[f.id].implication.replace(/^What this means[^:]*:\s*/i, ""));
  if (headline !== f.headline) fail(`finding ${f.id}: headline doesn't match its template`);
  if (implication !== f.implication) fail(`finding ${f.id}: implication doesn't match its template`);
  if (o?.short && fill(o.short) !== f.short) fail(`finding ${f.id}: short headline doesn't match its template`);
  if (f.n !== base.length) fail(`finding ${f.id}: n ${f.n}`);
  if (f.quotes.length !== 2) fail(`finding ${f.id}: needs 2 quotes`);
  for (const id of f.claimIds) if (!site.claims.some((c) => c.id === id && c.vendor === "incident.io")) fail(`finding ${f.id}: claim ${id} is not an incident.io claim`);
}

// 5. Coverage: every rating has a URL, cites its own vendor's claims, and SHOWN cites real proof.
for (const c of site.coverage) {
  if (!c.urls.length) fail(`coverage ${c.vendor}/${c.objection}: no URL`);
  const cited = c.claimIds.map((id) => site.claims.find((x) => x.id === id));
  if (cited.some((x) => !x || x.vendor !== c.vendor)) fail(`coverage ${c.vendor}/${c.objection}: cites a missing or another vendor's claim`);
  if (c.rating === "SHOWN" && !cited.some((x) => x && x.proof !== "none" && x.proof !== "illustration")) fail(`coverage ${c.vendor}/${c.objection}: SHOWN without proof`);
}

// 6. Battle card references.
for (const row of card.rows) {
  const item = site.items.find((i) => i.id === row.quoteId);
  if (!item?.quote) fail(`battle card: ${row.quoteId} has no checked quote`);
  else if (!item.objections.includes(card.objection)) fail(`battle card: ${row.quoteId} doesn't raise ${card.objection}`);
  for (const id of [...row.respondClaimIds, row.sendClaimId]) {
    if (!site.claims.some((c) => c.id === id && c.vendor === "incident.io")) fail(`battle card: ${id} is not an incident.io claim`);
  }
}

// 7. Banned words in everything we wrote (vendor claims are their words, so they're excluded).
const BANNED = /\b(ai-powered|revolutionary|game-changing|leverag(e|es|ed|ing)|unlock(s|ed|ing)?|seamless(ly)?|cutting-edge)\b|in today's fast-paced world/i;
const ours: [string, string][] = [
  ...site.findings.flatMap((f) => [[`finding ${f.id}`, `${f.headline} ${f.short ?? ""} ${f.implication}`]] as [string, string][]),
  ...site.coverage.map((c) => [`reason ${c.vendor}/${c.objection}`, c.reason] as [string, string]),
  ...card.rows.map((r) => [`battle card ${r.quoteId}`, `${r.respond} ${r.ask} ${r.sendLabel}`] as [string, string]),
];
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(tsx?|css)$/.test(e.name) ? [path.join(dir, e.name)] : []));
for (const f of [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "components")), path.join(ROOT, "lib", "config.ts")]) {
  ours.push([path.relative(ROOT, f), readFileSync(f, "utf8")]);
}
for (const [where, text] of ours) {
  const m = text.match(BANNED);
  if (m) fail(`banned word "${m[0]}" in ${where}`);
}

if (errors.length) {
  console.error(`verify: ${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(
  `verify: OK. ${quotes.length} quotes verbatim; ${claimsChecked ? `${site.claims.length} claims verbatim` : "claims not re-checked (raw pages not present)"}; ` +
    `numbers recompute; ${site.coverage.length} ratings sourced; battle card references valid; no banned words.`,
);
