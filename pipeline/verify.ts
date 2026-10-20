import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { BattleCard, ClassifiedFile, OBJECTIONS, RawItem, Stats, Synthesis } from "../lib/schema";
import { computeNumbers, half } from "../lib/numbers";
import { buildStats } from "../lib/stats";
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

// 3. Every number recomputes: site items must match the classified data, then every key in
// site.numbers must equal what lib/numbers.ts computes (and no key may be missing or extra).
const base = classified.items.filter((i) => i.relevant && !i.author_is_vendor);
if (site.items.length !== base.length) fail(`site has ${site.items.length} items, data has ${base.length}`);
const siteItem = new Map(site.items.map((i) => [i.id, i]));
for (const c of base) {
  const s = siteItem.get(c.id);
  if (!s) {
    fail(`item ${c.id} missing from the site`);
    continue;
  }
  const same =
    s.date === c.date.slice(0, 10) &&
    s.stance === c.stance &&
    JSON.stringify(s.objections) === JSON.stringify(c.objections) &&
    s.kind === (c.kind === "story" ? "story" : "comment") &&
    s.thread === (c.title ?? "");
  if (!same) fail(`item ${c.id} differs from classified.json`);
}
const audits = readJson("audits.json");
const expected = computeNumbers(site.items, site.coverage, { nCollected: classified.meta.nItems, nRelevant: classified.items.filter((i) => i.relevant).length }, audits.rowReads ?? {});
// The DIY tags on site items must be the pipeline's (synthesis.json), not edited afterwards.
const synthItems = new Map((readJson("synthesis.json").items as { id: string; usesGeneralAI: boolean; productUnneeded: boolean }[]).map((i) => [i.id, i]));
for (const s of site.items) {
  const t = synthItems.get(s.id);
  if (!t || t.usesGeneralAI !== s.usesGeneralAI || t.productUnneeded !== s.productUnneeded) fail(`item ${s.id}: DIY tags differ from synthesis.json`);
}
// A row read must cover exactly that row's posts, each once.
for (const [o, groups] of Object.entries((audits.rowReads ?? {}) as Record<string, Record<string, unknown>>)) {
  if (!OBJECTIONS.includes(o as never)) continue;
  const ids = Object.values(groups).filter(Array.isArray).flat() as string[];
  const row = base.filter((i) => i.objections.includes(o as never)).map((i) => i.id);
  if (ids.length !== new Set(ids).size || ids.length !== row.length || row.some((id) => !ids.includes(id))) fail(`row read for ${o} doesn't cover that row's ${row.length} posts exactly`);
}
for (const k of new Set([...Object.keys(expected), ...Object.keys(site.numbers)])) {
  if (site.numbers[k] !== expected[k]) fail(`number ${k}: site says ${site.numbers[k]}, data gives ${expected[k]}`);
}
for (const o of OBJECTIONS) {
  const hits = base.filter((i) => i.objections.includes(o));
  const stat = site.objections.find((s) => s.objection === o)!;
  if (stat.count !== hits.length) fail(`objection ${o}: count ${stat.count}, data ${hits.length}`);
  for (const b of stat.byHalf) if (b.count !== hits.filter((i) => half(i.date) === b.half).length) fail(`objection ${o} ${b.half} miscounted`);
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
// Every figure in stats.json (audits and agreement included) must be what the data files give.
{
  const rebuilt = buildStats(site, classified, readJson("cost.json"), readJson("agreement.json"), audits);
  for (const [k, v] of Object.entries(rebuilt)) if (JSON.stringify(v) !== JSON.stringify((stats as Record<string, unknown>)[k])) fail(`stats.${k} doesn't match the data files`);
}
// Every rating cell is the pipeline's, or a correction logged in overrides.json.
{
  const synthCov = readJson("synthesis.json").coverage as { vendor: string; objection: string; rating: string; reason: string; claimIds: string[] }[];
  const ovCov = ((existsSync(path.join(DATA, "overrides.json")) ? readJson("overrides.json").coverage : []) ?? []) as typeof synthCov;
  for (const c of site.coverage) {
    const src = ovCov.find((x) => x.vendor === c.vendor && x.objection === c.objection) ?? synthCov.find((x) => x.vendor === c.vendor && x.objection === c.objection);
    if (!src || src.rating !== c.rating || src.reason !== c.reason || JSON.stringify(src.claimIds) !== JSON.stringify(c.claimIds)) fail(`coverage ${c.vendor}/${c.objection} isn't the pipeline's or a logged correction`);
  }
}
// Agreement figures recompute from their per-item labels; audit figures match audits.json.
{
  const ag = readJson("agreement.json");
  const jac = (a: string[], b: string[]) => [...new Set(a)].filter((x) => b.includes(x)).length / new Set([...a, ...b]).size;
  const pairs = (ag.perItem as { haiku: { stance: string; objections: string[] }; reference: { stance: string; objections: string[] } }[]).filter((p) => p.haiku.objections.length || p.reference.objections.length);
  const mean = Number((pairs.reduce((s, p) => s + jac(p.haiku.objections, p.reference.objections), 0) / pairs.length).toFixed(2));
  const a = stats.agreement;
  if (a.objectionJaccard !== mean || a.objectionLabelled !== pairs.length) fail(`agreement: stats say ${a.objectionJaccard} over ${a.objectionLabelled}, per-item labels give ${mean} over ${pairs.length}`);
  if (a.stanceAgree !== (ag.perItem as { stanceMatch: boolean }[]).filter((p) => p.stanceMatch).length) fail("agreement: stance count doesn't recompute");
  const au = stats.audits;
  const checks: [string, number, number][] = [
    ["quotesReviewed", au.quotesReviewed, audits.quoteReview.n],
    ["quotesFailed", au.quotesFailed, audits.quoteReview.problems],
    ["ratingsCorrected", au.ratingsCorrected, audits.ratingReview.corrected],
    ["keptOnTopic", au.keptOnTopic, audits.relevanceKept.onTopic],
    ["postLaunchRatingsChanged", au.postLaunchRatingsChanged, audits.postLaunch.ratingsChanged],
  ];
  for (const [k, shown, actual] of checks) if (shown !== actual) fail(`audits.${k}: stats say ${shown}, audits.json ${actual}`);
}

// 4. Findings: the filled text matches its template, each has n and two real quotes.
const templates = readJson("synthesis.json").findingTemplates as Record<string, { headline: string; implication: string }>;
const overrides = existsSync(path.join(DATA, "overrides.json")) ? readJson("overrides.json") : { findings: [] };
const fill = (t: string) => t.replace(/\{([^{}]+)\}/g, (_, k: string) => (k in site.numbers ? site.numbers[k].toLocaleString("en-GB") : `{${k}}`));
for (const f of site.findings) {
  const o = (overrides.findings as { id: string; headline?: string; short?: string; implication?: string; note?: string }[]).find((x) => x.id === f.id);
  const headline = fill(o?.headline ?? templates[f.id].headline);
  const implication = fill(o?.implication ?? templates[f.id].implication.replace(/^What this means[^:]*:\s*/i, ""));
  if (headline !== f.headline) fail(`finding ${f.id}: headline doesn't match its template`);
  if (implication !== f.implication) fail(`finding ${f.id}: implication doesn't match its template`);
  if (o?.short && fill(o.short) !== f.short) fail(`finding ${f.id}: short headline doesn't match its template`);
  if (o?.note && fill(o.note) !== f.note) fail(`finding ${f.id}: note doesn't match its template`);
  if (f.n !== (f.scope === "since_2025" ? expected.base_since_2025 : base.length)) fail(`finding ${f.id}: n ${f.n} doesn't match its scope (${f.scope})`);
  if (f.quotes.length !== 2) fail(`finding ${f.id}: needs 2 quotes`);
  for (const id of f.claimIds) if (!site.claims.some((c) => c.id === id && c.vendor === "incident.io")) fail(`finding ${f.id}: claim ${id} is not an incident.io claim`);
}

// 4b. The words around the numbers. Each check backs a phrase in the findings; if the data
// changes so a phrase stops being true, the build fails until the text is rewritten.
const cell = (v: string, o: string) => site.coverage.find((c) => c.vendor === v && c.objection === o)?.rating;
const worksObjections = ["not_capable_yet", "wrong_or_hallucinated_cause", "cant_verify_reasoning"];
const rated = OBJECTIONS.filter((o) => o !== "other").sort((a, b) => expected[`count:${b}`] - expected[`count:${a}`]);
const phrases: [string, boolean][] = [
  ["f2: deskilling and production access are common objections (both in the five most raised)", rated.slice(0, 5).includes("deskills_or_replaces_engineers") && rated.slice(0, 5).includes("data_access_and_security")],
  ["f2: none of the options shows proof on either", expected["shown:deskills_or_replaces_engineers"] === 0 && expected["shown:data_access_and_security"] === 0],
  ["f2/f3: Investigations shows proof on whether it works", worksObjections.every((o) => cell("incident.io", o) === "SHOWN")],
  ["f2: incident.io names the only outside audit (SOC 2) among the claims", site.claims.filter((c) => /SOC ?2/.test(c.quote)).every((c) => c.vendor === "incident.io")],
  ["f1: only a minority of general-AI users say a product is unnecessary", expected["diy:uses:unneeded"] * 2 < expected["diy:uses"]],
  ["map: every competitor column rests on the same number of pages", new Set(["PagerDuty", "Rootly", "Datadog", "Resolve.ai"].map((v) => stats.pagesByVendor[v])).size === 1],
];
for (const [what, ok] of phrases) if (!ok) fail(`phrase no longer true: ${what}`);

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
  ...site.findings.flatMap((f) => [[`finding ${f.id}`, `${f.headline} ${f.short ?? ""} ${f.implication} ${f.note ?? ""}`]] as [string, string][]),
  ...site.coverage.map((c) => [`reason ${c.vendor}/${c.objection}`, c.reason] as [string, string]),
  ...card.rows.map((r) => [`battle card ${r.quoteId}`, `${r.respond} ${r.ask} ${r.sendLabel}`] as [string, string]),
  ["battle card avoid", card.avoid.join(" ")],
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
