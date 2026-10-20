import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BattleCard, ClassifiedFile, Synthesis } from "../lib/schema";
import { fetchJson } from "./lib/http";
import { fragmentToText } from "./lib/text";

// Phase 5 helper: every prominently shown quote, with its full comment, thread title and the
// comment it replied to (fetched from the HN Algolia items API, cached and rate-limited).
const DATA = path.join(process.cwd(), "data");
const site = Synthesis.parse(JSON.parse(readFileSync(path.join(DATA, "site.json"), "utf8")));
const card = BattleCard.parse(JSON.parse(readFileSync(path.join(DATA, "battlecard.json"), "utf8")));
const classified = ClassifiedFile.parse(JSON.parse(readFileSync(path.join(DATA, "classified.json"), "utf8")));
const byId = new Map(classified.items.map((i) => [i.id, i]));

interface AlgoliaItem { id: number; parent_id: number | null; type: string; title: string | null; text: string | null }

async function main() {
  const shown = new Map<string, string[]>();
  const add = (id: string, where: string) => shown.set(id, [...(shown.get(id) ?? []), where]);
  site.findings.forEach((f) => f.quotes.forEach((q) => add(q.id, `finding ${f.rank}`)));
  site.objections.forEach((o) => o.quotes.forEach((q) => add(q.id, `map: ${o.objection}`)));
  site.diy.quotes.forEach((q) => add(q.id, "diy"));
  card.rows.forEach((r) => add(r.quoteId, "battle card"));
  // Optional: check specific candidate ids instead (comma-separated), e.g. replacement quotes.
  if (process.argv[3]) {
    shown.clear();
    for (const id of process.argv[3].split(",")) add(id, "candidate");
  }

  const out = [];
  for (const [id, where] of shown) {
    const item = byId.get(id)!;
    const node = await fetchJson<AlgoliaItem>(`https://hn.algolia.com/api/v1/items/${id.slice(3)}`);
    let parent = "";
    if (node.parent_id && node.type === "comment") {
      const p = await fetchJson<AlgoliaItem>(`https://hn.algolia.com/api/v1/items/${node.parent_id}`);
      parent = p.type === "story" ? `(top-level reply to the story "${p.title}")` : fragmentToText(p.text ?? "");
    }
    out.push({ id, url: item.url, date: item.date.slice(0, 10), shownIn: where, thread: item.title, labels: { stance: item.stance, objections: item.objections }, quote: item.best_quote, fullText: item.text, parentText: parent.slice(0, 2500) });
  }
  writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  console.log(`${out.length} shown quotes written with context to ${process.argv[2]}`);
}
main();
