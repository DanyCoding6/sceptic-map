import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { computeNumbers } from "../lib/numbers";
import { buildStats } from "../lib/stats";
import { Claim, ClassifiedFile, Objection, Rating, Synthesis, Vendor } from "../lib/schema";

// data/synthesis.json + data/overrides.json (hand corrections, each with a note saying who proposed
// it and why) -> data/site.json.
// Overrides may change a coverage rating, a finding's wording, rank or quotes, or an objection's
// quotes. Numbers in edited text must still be {placeholders}, filled here from synthesis.numbers.

const DATA = path.join(process.cwd(), "data");

const Overrides = z.object({
  coverage: z
    .array(
      z.object({
        vendor: Vendor,
        objection: Objection,
        rating: Rating,
        claimIds: z.array(z.string()).default([]),
        reason: z.string(),
        note: z.string().optional(), // why it was changed; not shown on the site
      }),
    )
    .default([]),
  findings: z
    .array(
      z.object({
        id: z.string(),
        rank: z.number().optional(),
        headline: z.string().optional(),
        short: z.string().optional(),
        title: z.string().optional(),
        explain: z.string().optional(),
        fix: z.string().optional(),
        note: z.string().optional(), // a line under the n, e.g. what a hand read of the posts found
        implication: z.string().optional(),
        scope: z.enum(["all", "since_2025"]).optional(),
        quoteIds: z.array(z.string()).length(2).optional(),
        claimIds: z.array(z.string()).optional(), // incident.io claims the edited wording rests on
        why: z.string().optional(), // why it was changed; not shown on the site
      }),
    )
    .default([]),
  quotes: z.partialRecord(Objection, z.array(z.string()).max(3)).default({}),
  // Quotes a review found misleading out of context: never shown anywhere (the items still count).
  hideQuotes: z.array(z.object({ id: z.string(), why: z.string() })).default([]),
  // Vendor sentences the extraction missed but the page needs; verify.ts checks them verbatim like any claim.
  extraClaims: z.array(Claim.extend({ note: z.string() })).default([]),
});

const readJson = (file: string) => JSON.parse(readFileSync(path.join(DATA, file), "utf8"));

// Every pipeline fact the site quotes (lib/stats.ts), written to data/stats.json.
function writeStats(site: Synthesis) {
  const stats = buildStats(site, ClassifiedFile.parse(readJson("classified.json")), readJson("cost.json"), readJson("agreement.json"), readJson("audits.json"), readJson("blind_agreement.json"), readJson("blind_read.json").labels, Synthesis.parse(readJson("synthesis.json")));
  writeFileSync(path.join(DATA, "stats.json"), JSON.stringify(stats, null, 2));
}

function main() {
  const raw = JSON.parse(readFileSync(path.join(DATA, "synthesis.json"), "utf8"));
  const site = Synthesis.parse(raw); // drops findingTemplates
  const file = path.join(DATA, "overrides.json");
  if (!existsSync(file)) {
    writeFileSync(path.join(DATA, "site.json"), JSON.stringify(site, null, 1));
    writeStats(site);
    console.log("No data/overrides.json; data/site.json is the synthesis as generated.");
    return;
  }
  const ov = Overrides.parse(JSON.parse(readFileSync(file, "utf8")));
  const problems: string[] = [];

  const fill = (t: string) =>
    t.replace(/\{([^{}]+)\}/g, (_, key: string) => {
      if (!(key in site.numbers)) problems.push(`unknown placeholder {${key}}`);
      return key in site.numbers ? site.numbers[key].toLocaleString("en-GB") : `{${key}}`;
    });
  // Digits allowed outside placeholders: years, and names that contain one ("SOC 2").
  const handTyped = (t: string) => t.replace(/\{[^{}]+\}/g, "").replace(/\b20\d\d\b/g, "").replace(/\bSOC 2\b/g, "").match(/\d/);
  const quoteFor = (id: string) => {
    const item = site.items.find((i) => i.id === id);
    if (!item?.quote) {
      problems.push(`${id} is not an engineer item with a checked quote`);
      return null;
    }
    return { id, quote: item.quote, url: item.url, date: item.date };
  };

  for (const extra of ov.extraClaims) {
    const c = Claim.parse(extra); // drops the note
    if (site.claims.some((x) => x.id === c.id)) problems.push(`extra claim ${c.id} already exists`);
    else site.claims.push(c);
  }

  // Hide reviewed-out quotes first, so nothing below can pick them.
  const hidden = new Set(ov.hideQuotes.map((h) => h.id));
  for (const item of site.items) if (hidden.has(item.id)) item.quote = null;
  for (const stat of site.objections) stat.quotes = stat.quotes.filter((q) => !hidden.has(q.id));
  site.diy.quotes = site.diy.quotes.filter((q) => !hidden.has(q.id));

  for (const o of ov.coverage) {
    const cell = site.coverage.find((c) => c.vendor === o.vendor && c.objection === o.objection);
    if (!cell) {
      problems.push(`no coverage cell ${o.vendor} / ${o.objection}`);
      continue;
    }
    const claims = o.claimIds.map((id) => site.claims.find((c) => c.id === id && c.vendor === o.vendor));
    if (claims.some((c) => !c)) {
      problems.push(`${o.vendor} / ${o.objection}: a claim id isn't one of ${o.vendor}'s claims`);
      continue;
    }
    if (o.rating === "SHOWN" && !claims.some((c) => c!.proof !== "none" && c!.proof !== "illustration")) console.warn(`  note: ${o.vendor} / ${o.objection} set to SHOWN without a claim marked as carrying proof`);
    Object.assign(cell, {
      rating: o.rating,
      claimIds: o.claimIds,
      reason: o.reason,
      urls: claims.length ? [...new Set(claims.map((c) => c!.url))] : cell.urls,
      overridden: true,
    });
  }

  // Coverage tallies change with the corrections above, so recompute every number now.
  site.numbers = computeNumbers(site.items, site.coverage, { nCollected: site.meta.nCollected, nRelevant: site.meta.nRelevant }, readJson("audits.json").rowReads ?? {});

  // Re-fill every finding from its template (or its override), so no text keeps a stale number.
  const templates = raw.findingTemplates as Record<string, { headline: string; implication: string }>;
  for (const f of site.findings) {
    f.headline = fill(templates[f.id].headline);
    f.implication = fill(templates[f.id].implication.replace(/^What this means[^:]*:\s*/i, ""));
  }

  for (const o of ov.findings) {
    const f = site.findings.find((x) => x.id === o.id);
    if (!f) {
      problems.push(`no finding ${o.id}`);
      continue;
    }
    for (const field of ["headline", "short", "title", "explain", "fix", "implication", "note"] as const) {
      const text = o[field];
      if (text === undefined) continue;
      if (handTyped(text)) problems.push(`${o.id}.${field} has a typed number; use a {placeholder} from synthesis.json "numbers"`);
      f[field] = fill(text);
    }
    if (o.rank !== undefined) f.rank = o.rank;
    if (o.scope) f.scope = o.scope;
    if (o.claimIds) {
      const bad = o.claimIds.filter((id) => !site.claims.some((c) => c.id === id && c.vendor === "incident.io"));
      if (bad.length) problems.push(`${o.id}: not incident.io claims: ${bad.join(", ")}`);
      else f.claimIds = o.claimIds;
    }
    if (o.quoteIds) {
      const quotes = o.quoteIds.map(quoteFor);
      if (quotes.every((q) => q)) f.quotes = quotes as typeof f.quotes;
    }
    f.overridden = true;
  }
  for (const f of site.findings) f.n = f.scope === "since_2025" ? site.numbers.base_since_2025 : site.numbers.n_base;
  site.findings.sort((a, b) => a.rank - b.rank);
  for (const f of site.findings) {
    const bad = f.quotes.filter((q) => hidden.has(q.id));
    if (bad.length) problems.push(`${f.id} still uses hidden quote(s) ${bad.map((q) => q.id).join(", ")}; override its quoteIds`);
  }

  for (const [objection, ids] of Object.entries(ov.quotes)) {
    const stat = site.objections.find((s) => s.objection === objection)!;
    const quotes = ids.map(quoteFor);
    if (quotes.every((q) => q)) stat.quotes = quotes as typeof stat.quotes;
  }

  if (problems.length) {
    console.error("Overrides not applied:\n" + problems.map((p) => `  - ${p}`).join("\n"));
    process.exit(1);
  }
  writeFileSync(path.join(DATA, "site.json"), JSON.stringify(Synthesis.parse(site), null, 1));
  writeStats(site);
  console.log(
    `Applied overrides: ${ov.coverage.length} coverage cells, ${ov.findings.length} findings, ${Object.keys(ov.quotes).length} quote sets, ${hidden.size} hidden quotes. Wrote data/site.json.`,
  );
}

main();
