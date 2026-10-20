import { type CoverageCell, type Objection, OBJECTIONS, Rating, type SiteItem, VENDORS } from "./schema";

// Every number the site's text may cite, by placeholder key. synthesise.ts and merge.ts write
// them and verify.ts recomputes them, all with this one function, so a number can't drift.

const RATED: Objection[] = OBJECTIONS.filter((o) => o !== "other");
const NAMED = ["incident.io", "PagerDuty", "Rootly", "Datadog", "Resolve.ai"] as const;
export const half = (date: string) => `${date.slice(0, 4)}-H${Number(date.slice(5, 7)) <= 6 ? 1 : 2}`;

// A hand read of every post in a row (data/audits.json rowReads): ids grouped by whether they fit the label.
export type RowReads = Partial<Record<string, Record<string, string[] | string>>>;

export function computeNumbers(
  items: SiteItem[],
  coverage: CoverageCell[],
  meta: { nCollected: number; nRelevant: number },
  reads: RowReads = {},
): Record<string, number> {
  const halves = [...new Set(items.map((i) => half(i.date)))].sort();
  const uses = items.filter((i) => i.usesGeneralAI);
  const since2025 = items.filter((i) => i.date >= "2025-01-01");
  const counts = OBJECTIONS.map((o) => ({ o, n: items.filter((i) => i.objections.includes(o)).length })).sort((a, b) => b.n - a.n);

  const numbers: Record<string, number> = {
    n_collected: meta.nCollected,
    n_relevant: meta.nRelevant,
    n_vendor: meta.nRelevant - items.length,
    n_base: items.length,
    n_comments: items.filter((i) => i.kind === "comment").length,
    n_stories: items.filter((i) => i.kind === "story").length,
    vendors_rated: VENDORS.length,
    "diy:uses": uses.length,
    "diy:unneeded": items.filter((i) => i.productUnneeded).length,
    "diy:uses:unneeded": uses.filter((i) => i.productUnneeded).length,
    "diy:objection": counts.find((c) => c.o === "diy_with_general_agent")!.n,
    "diy:mentions": items.filter((i) => i.vendors.includes("General AI tools")).length,
    "named:any_vendor": items.filter((i) => i.vendors.some((v) => (NAMED as readonly string[]).includes(v))).length,
    base_since_2025: since2025.length,
  };
  for (const v of NAMED) numbers[`named:${v}`] = items.filter((i) => i.vendors.includes(v)).length;
  for (const h of halves) {
    numbers[`base:${h}`] = items.filter((i) => half(i.date) === h).length;
    numbers[`diy:uses:${h}`] = uses.filter((i) => half(i.date) === h).length;
  }
  for (const st of ["sceptical", "positive", "mixed", "neutral"] as const) numbers[`diy:uses:${st}`] = uses.filter((i) => i.stance === st).length;
  for (const { o } of counts) {
    const hits = items.filter((i) => i.objections.includes(o));
    numbers[`count:${o}`] = hits.length;
    numbers[`sceptical:${o}`] = hits.filter((i) => i.stance === "sceptical").length;
    numbers[`threads:${o}`] = new Set(hits.map((i) => i.thread)).size;
    numbers[`count_since_2025:${o}`] = since2025.filter((i) => i.objections.includes(o)).length;
    for (const h of halves) numbers[`count:${o}:${h}`] = hits.filter((i) => half(i.date) === h).length;
  }
  const top = counts.filter((c) => c.o !== "other").slice(0, 6).map((c) => c.o);
  for (const [i, a] of top.entries()) {
    for (const b of top.slice(i + 1)) numbers[`either:${a}+${b}`] = items.filter((x) => x.objections.includes(a) || x.objections.includes(b)).length;
  }
  // Hand reads of whole rows: how many posts in each group, and how many fit the label at all.
  for (const [o, groups] of Object.entries(reads)) {
    if (!groups || !OBJECTIONS.includes(o as Objection)) continue;
    let fit = 0;
    for (const [g, ids] of Object.entries(groups)) {
      if (!Array.isArray(ids)) continue;
      numbers[`read:${o}:${g}`] = ids.length;
      if (g !== "notFit") fit += ids.length;
    }
    numbers[`read:${o}:fit_all`] = fit;
  }
  // Coverage tallies, after any hand corrections: per objection and per vendor.
  for (const r of Rating.options) {
    const key = r.toLowerCase();
    for (const o of RATED) numbers[`${key}:${o}`] = coverage.filter((c) => c.objection === o && c.rating === r).length;
    for (const v of VENDORS) numbers[`${key}:vendor:${v}`] = coverage.filter((c) => c.vendor === v && c.rating === r).length;
  }
  return numbers;
}
