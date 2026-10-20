import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { RawItem } from "../lib/schema";
import { BlockedError, cachedFetch, fetchJson, RobotsDisallowedError, stats } from "./lib/http";
import { fragmentToText, normaliseWhitespace, pageToText, textHash } from "./lib/text";
import { VENDOR_LIST_APPROVED, VENDOR_PAGES } from "./vendor-urls";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const SINCE = 1704067200; // 1 Jan 2024 00:00 UTC
// Fixed end of the window (20 Oct 2026 00:00 UTC), so a rerun in a fresh container returns the same set.
const UNTIL = 1792454400;
const inWindow = (t: number) => t > SINCE && t < UNTIL;

// ---------- Hacker News (Algolia) ----------

// `label` is the brief's query; `algolia` is what we send. Product names are quoted as phrases,
// because unquoted Algolia matches "Bits AI" to any comment with "bit" and "AI" in it.
// Typo tolerance is off: with it on, "SRE" matched "are" and "AI SRE" returned 200K+ comments.
const HN_QUERIES: { label: string; algolia: string[] }[] = [
  { label: "AI SRE", algolia: ["AI SRE"] },
  { label: "AI root cause", algolia: ["AI root cause"] },
  { label: "root cause analysis LLM", algolia: ["root cause analysis LLM"] },
  { label: "AI incident response", algolia: ["AI incident response"] },
  { label: "AI on-call", algolia: ["AI on-call"] },
  { label: "LLM on-call", algolia: ["LLM on-call"] },
  { label: "AIOps", algolia: ["AIOps"] },
  { label: "AI postmortem", algolia: ["AI postmortem"] },
  { label: "incident management AI", algolia: ["incident management AI"] },
  { label: "incident.io", algolia: ['"incident.io"'] },
  { label: "Resolve.ai", algolia: ['"resolve.ai"', '"Resolve AI"'] },
  { label: "Cleric", algolia: ['"Cleric"'] },
  { label: "Traversal", algolia: ['"Traversal"'] },
  { label: "Bits AI", algolia: ['"Bits AI"'] },
  { label: "Datadog Bits", algolia: ['"Datadog Bits"'] },
  { label: "Rootly", algolia: ['"Rootly"'] },
  { label: "PagerDuty AI", algolia: ["PagerDuty AI"] },
  { label: "FireHydrant", algolia: ['"FireHydrant"'] },
  { label: "MCP incident", algolia: ["MCP incident"] },
  { label: "Claude Code incident", algolia: ["Claude Code incident"] },
  { label: "agent production debugging", algolia: ["agent production debugging"] },
  { label: "AI SRE benchmark", algolia: ["AI SRE benchmark"] },
];

// Which threads to open in full: more than 10 comments, and a title that names both an AI tool
// and incident/ops work. Deliberately simple so it can be stated in Methods. (A first rule,
// "title contains the query words", opened 7 threads and missed launches such as HyperProbe.)
const AI_TERMS = /\b(ai|llms?|agents?|agentic|gpt|claude|copilot|mcp|aiops)\b/i;
const OPS_TERMS =
  /\b(sre|incidents?|on-?call|root[- ]cause|rca|post-?mortems?|outages?|observability|debug\w*|pager\w*|production|alerts?|runbooks?)\b/i;

interface AlgoliaHit {
  objectID: string;
  created_at: string;
  created_at_i: number;
  title?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  story_title?: string | null;
  num_comments?: number | null;
  story_id?: number | null;
}
interface AlgoliaPage {
  hits: AlgoliaHit[];
  nbHits: number;
  nbPages: number;
}
interface AlgoliaItem {
  id: number;
  created_at: string;
  created_at_i: number;
  type: string;
  title?: string | null;
  text?: string | null;
  children: AlgoliaItem[];
}

const hnUrl = (id: string | number) => `https://news.ycombinator.com/item?id=${id}`;

function searchUrl(endpoint: "search" | "search_by_date", query: string, tag: string, page: number): string {
  const params = new URLSearchParams({
    query,
    tags: tag,
    numericFilters: `created_at_i>${SINCE},created_at_i<${UNTIL}`,
    hitsPerPage: "100",
    page: String(page),
    typoTolerance: "false",
    queryType: "prefixNone",
  });
  return `https://hn.algolia.com/api/v1/${endpoint}?${params}`;
}

// Algolia serves at most 1,000 hits per query. Relevance order first; if a query has more
// than that, add the newest 1,000 by date as well.
async function searchAll(query: string, tag: string): Promise<{ hits: AlgoliaHit[]; nbHits: number }> {
  const hits: AlgoliaHit[] = [];
  const first = await fetchJson<AlgoliaPage>(searchUrl("search", query, tag, 0));
  hits.push(...first.hits);
  for (let p = 1; p < Math.min(first.nbPages, 10); p++) {
    hits.push(...(await fetchJson<AlgoliaPage>(searchUrl("search", query, tag, p))).hits);
  }
  if (first.nbHits > 1000) {
    for (let p = 0; p < 10; p++) {
      const page = await fetchJson<AlgoliaPage>(searchUrl("search_by_date", query, tag, p));
      hits.push(...page.hits);
      if (p + 1 >= page.nbPages) break;
    }
  }
  return { hits, nbHits: first.nbHits };
}

function addOrMerge(map: Map<string, RawItem>, item: RawItem): void {
  const existing = map.get(item.id);
  if (!existing) {
    map.set(item.id, item);
    return;
  }
  for (const q of item.queries) if (!existing.queries.includes(q)) existing.queries.push(q);
  // A search hit is stronger provenance than "was in a thread we opened".
  if (existing.via === "thread" && item.via === "search") {
    existing.via = "search";
    existing.query = item.query;
  }
}

function flatten(node: AlgoliaItem, out: AlgoliaItem[]): void {
  for (const child of node.children ?? []) {
    out.push(child);
    flatten(child, out);
  }
}

async function collectHn(): Promise<void> {
  const items = new Map<string, RawItem>();
  const strongStories = new Map<string, { title: string; comments: number; query: string }>();
  const hitCounts: Record<string, { story: number; comment: number }> = {};

  for (const { label, algolia } of HN_QUERIES) {
    hitCounts[label] = { story: 0, comment: 0 };
    for (const query of algolia) {
      for (const tag of ["story", "comment"] as const) {
        const { hits, nbHits } = await searchAll(query, tag);
        hitCounts[label][tag] += nbHits;
        for (const h of hits) {
          if (!inWindow(h.created_at_i)) continue;
          if (tag === "story") {
            const title = h.title ?? "";
            const body = h.story_text ? fragmentToText(h.story_text) : "";
            addOrMerge(items, {
              id: `hn:${h.objectID}`,
              platform: "hn",
              url: hnUrl(h.objectID),
              date: h.created_at,
              text: body ? `${title}\n\n${body}` : title,
              query: label,
              queries: [label],
              kind: "story",
              via: "search",
              title,
            });
            if ((h.num_comments ?? 0) > 10 && AI_TERMS.test(title) && OPS_TERMS.test(title)) {
              if (!strongStories.has(h.objectID)) {
                strongStories.set(h.objectID, { title, comments: h.num_comments ?? 0, query: label });
              }
            }
          } else {
            if (!h.comment_text) continue;
            addOrMerge(items, {
              id: `hn:${h.objectID}`,
              platform: "hn",
              url: hnUrl(h.objectID),
              date: h.created_at,
              text: fragmentToText(h.comment_text),
              query: label,
              queries: [label],
              kind: "comment",
              via: "search",
              title: h.story_title ?? undefined,
            });
          }
        }
      }
    }
    console.log(
      `  ${label.padEnd(28)} stories ${String(hitCounts[label].story).padStart(5)}  comments ${String(hitCounts[label].comment).padStart(5)}`,
    );
  }

  console.log(`\nOpening ${strongStories.size} threads with more than 10 comments whose title names AI and ops work:`);
  for (const [id, s] of strongStories) {
    const tree = await fetchJson<AlgoliaItem>(`https://hn.algolia.com/api/v1/items/${id}`);
    const comments: AlgoliaItem[] = [];
    flatten(tree, comments);
    let added = 0;
    for (const c of comments) {
      if (c.type !== "comment" || !c.text || !inWindow(c.created_at_i)) continue;
      addOrMerge(items, {
        id: `hn:${c.id}`,
        platform: "hn",
        url: hnUrl(c.id),
        date: c.created_at,
        text: fragmentToText(c.text),
        query: s.query,
        queries: [s.query],
        kind: "comment",
        via: "thread",
        title: s.title,
      });
      added += 1;
    }
    console.log(`  ${s.title.slice(0, 80).padEnd(80)} ${added} comments  [${s.query}]`);
  }

  const out = [...items.values()].filter((i) => normaliseWhitespace(i.text).length > 0);
  writeJson("hn.json", out);
  console.log(`\nHN: ${out.length} unique items written to data/raw/hn.json`);
}

// Reddit isn't collected: its public JSON returned 403 on the first probe, and Dany chose to skip
// it rather than register an OAuth app (19 Oct 2026). The data is Hacker News only.

// ---------- Vendor pages ----------

async function collectVendors(): Promise<void> {
  if (!VENDOR_LIST_APPROVED) {
    console.log("Vendor pages: not fetched. The URL list in pipeline/vendor-urls.ts is waiting for Dany's OK.");
    return;
  }
  const out: RawItem[] = [];
  const problems: string[] = [];
  for (const page of VENDOR_PAGES) {
    try {
      const res = await cachedFetch(page.url, { headers: { Accept: "text/html" } });
      if (res.status !== 200) {
        problems.push(`${page.url}: HTTP ${res.status}`);
        continue;
      }
      const { title, text } = pageToText(res.body);
      out.push({
        id: `vendor:${page.slug}`,
        platform: "vendor",
        url: res.url, // after redirects (e.g. /ai-sre now lands on /solution/ai-sre)
        date: res.fetchedAt,
        text,
        query: page.group,
        queries: [page.group],
        kind: "vendor_page",
        via: "vendor_list",
        title,
        vendor: page.vendor,
      });
    } catch (err) {
      if (err instanceof BlockedError || err instanceof RobotsDisallowedError) {
        problems.push(`${page.url}: ${err.message}`);
        continue;
      }
      throw err;
    }
  }
  writeJson("vendors.json", out);
  console.log(`Vendor pages: ${out.length} of ${VENDOR_PAGES.length} fetched.`);
  for (const p of problems) console.log(`  SKIPPED ${p}`);
}

// ---------- Merge, dedupe and report ----------

function writeJson(file: string, data: unknown): void {
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(path.join(RAW_DIR, file), JSON.stringify(data, null, 1));
}

function readRaw(file: string): RawItem[] {
  const p = path.join(RAW_DIR, file);
  if (!existsSync(p)) return [];
  return RawItem.array().parse(JSON.parse(readFileSync(p, "utf8")));
}

function report(): void {
  const all = [...readRaw("hn.json"), ...readRaw("vendors.json")];

  // Dedupe by URL, then by normalised text hash (keeps the earliest copy of reposted text).
  all.sort((a, b) => a.date.localeCompare(b.date));
  const seenUrl = new Set<string>();
  const seenText = new Map<string, RawItem>();
  const kept: RawItem[] = [];
  let urlDupes = 0;
  let textDupes = 0;
  for (const item of all) {
    if (seenUrl.has(item.url)) {
      urlDupes += 1;
      continue;
    }
    seenUrl.add(item.url);
    const h = textHash(item.text);
    const first = seenText.get(h);
    if (first) {
      textDupes += 1;
      for (const q of item.queries) if (!first.queries.includes(q)) first.queries.push(q);
      continue;
    }
    seenText.set(h, item);
    kept.push(item);
  }
  writeJson("items.json", kept);

  const discussion = kept.filter((i) => i.platform !== "vendor");
  const years = [...new Set(discussion.map((i) => i.date.slice(0, 4)))].sort();
  const row = (label: string, cells: (string | number)[]) =>
    console.log(`  ${label.padEnd(30)}${cells.map((c) => String(c).padStart(7)).join("")}`);

  console.log(`\nItems after dedupe: ${kept.length} (removed ${urlDupes} URL duplicates, ${textDupes} repeated texts)`);
  console.log(`Date range: ${discussion[0]?.date.slice(0, 10)} to ${discussion.at(-1)?.date.slice(0, 10)}\n`);

  for (const platform of ["hn"] as const) {
    const items = discussion.filter((i) => i.platform === platform);
    if (items.length === 0) {
      console.log(`${platform.toUpperCase()}: no items\n`);
      continue;
    }
    console.log(`${platform.toUpperCase()}: counts by query and year (an item found by two queries counts under both)`);
    row("query", [...years, "total"]);
    const labels = [...new Set(items.flatMap((i) => i.queries))];
    for (const label of HN_QUERIES.map((q) => q.label).filter((l) => labels.includes(l))) {
      const search = items.filter((i) => i.via === "search" && i.queries.includes(label));
      row(label, [...years.map((y) => search.filter((i) => i.date.startsWith(y)).length), search.length]);
    }
    const threads = items.filter((i) => i.via === "thread");
    row("(comments from opened threads)", [...years.map((y) => threads.filter((i) => i.date.startsWith(y)).length), threads.length]);
    row("ALL UNIQUE", [...years.map((y) => items.filter((i) => i.date.startsWith(y)).length), items.length]);
    const byKind = (k: string) => items.filter((i) => i.kind === k).length;
    console.log(`  by kind: ${byKind("story")} stories, ${byKind("comment")} comments, ${byKind("post")} posts\n`);
  }

  const vendors = kept.filter((i) => i.platform === "vendor");
  if (vendors.length) {
    console.log("Vendor pages:");
    for (const v of vendors) console.log(`  ${(v.vendor ?? "").padEnd(14)}${String(v.text.length).padStart(7)} chars  ${v.url}`);
  }
}

async function main() {
  const step = process.argv[2] ?? "all";
  const started = Date.now();
  try {
    if (step === "hn" || step === "all") await collectHn();
    if (step === "vendors" || step === "all") await collectVendors();
    report();
  } catch (err) {
    if (err instanceof BlockedError) {
      console.error(`STOPPED: ${err.message}. Not retrying; skip this source and log why.`);
      process.exit(2);
    }
    throw err;
  }
  console.log(
    `\nHTTP: ${stats.network} network requests, ${stats.cached} from cache, ${((Date.now() - started) / 1000).toFixed(0)}s. No model calls in this step (spend $0).`,
  );
}

main();
