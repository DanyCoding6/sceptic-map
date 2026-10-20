import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type ClassifiedFile, type ClassifiedItem, OBJECTIONS, RawItem } from "../lib/schema";
import { MODELS } from "./lib/anthropic";
import { classifyBatch, confirmBatch, makeBatches, storyBody } from "./lib/classifier";
import { pool, reportSpend } from "./lib/llm";
import { isVerbatim, normaliseWhitespace } from "./lib/text";

const DATA = path.join(process.cwd(), "data");
const MAX_QUOTE_CHARS = 320; // the prompt asks for at most 280; allow a little slack, then drop
const SAMPLE_SIZE = 30;
const SAMPLE_SEED = 2027;
const THIN_DATA_THRESHOLD = 150;

// Small seeded PRNG so the hand-label sample is the same on every run.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  const raw = RawItem.array().parse(JSON.parse(readFileSync(path.join(DATA, "raw", "items.json"), "utf8")));
  const discussion = raw.filter((i) => i.platform !== "vendor").slice(0, limit);
  const batches = makeBatches(discussion);
  console.log(`Classifying ${discussion.length} items in ${batches.length} batches with ${MODELS.classify}...`);

  let done = 0;
  const results = await pool(batches, 8, async (batch, i) => {
    // Medium, not low: on a hand-judged set of 33 items, low effort marked general AI-coding
    // talk as relevant (precision 0.81); medium reached 0.91 with the same recall.
    const labels = await classifyBatch(MODELS.classify, batch, `batch ${i + 1}`, "medium");
    done += 1;
    if (done % 25 === 0 || done === batches.length) console.log(`  ${done}/${batches.length} batches`);
    return labels;
  });

  // Second pass: Sonnet re-applies the relevance test to every item Haiku kept, and can only remove.
  // Added after a hand audit put first-pass precision at about 80% (see build log).
  const haikuRelevant = batches.flatMap((batch, i) => batch.filter((raw) => results[i]?.get(raw.id)?.relevant));
  const confirmBatches = makeBatches(haikuRelevant);
  console.log(`Second pass: checking ${haikuRelevant.length} relevant items in ${confirmBatches.length} batches with ${MODELS.synthesise}...`);
  const confirmed = new Map<string, boolean>();
  let confirmDone = 0;
  await pool(confirmBatches, 6, async (batch, i) => {
    const verdicts = await confirmBatch(batch, `confirm batch ${i + 1}`);
    for (const [id, ok] of verdicts ?? []) confirmed.set(id, ok);
    confirmDone += 1;
    if (confirmDone % 20 === 0 || confirmDone === confirmBatches.length) console.log(`  ${confirmDone}/${confirmBatches.length} batches`);
  });

  const items: ClassifiedItem[] = [];
  let skipped = 0;
  batches.forEach((batch, i) => {
    const labels = results[i];
    for (const raw of batch) {
      const l = labels?.get(raw.id);
      if (!l) {
        skipped += 1;
        continue;
      }
      const base = {
        id: raw.id,
        url: raw.url,
        date: raw.date,
        kind: raw.kind as ClassifiedItem["kind"],
        via: raw.via as ClassifiedItem["via"],
        queries: raw.queries,
        title: raw.title,
      };
      const secondPass = !l.relevant ? undefined : !confirmed.has(raw.id) ? "failed" : confirmed.get(raw.id) ? "confirmed" : "removed";
      if (!l.relevant || secondPass === "removed") {
        items.push({ ...base, relevant: false, stance: "neutral", objections: [], best_quote: null, quote_check: "none", vendors_mentioned: [], buyer_signal: "unknown", author_is_vendor: false, second_pass: secondPass });
        continue;
      }
      const quote = normaliseWhitespace(l.best_quote);
      // Check against the body only: a story title is not a quote.
      const quoteCheck: ClassifiedItem["quote_check"] = !quote
        ? "none"
        : !isVerbatim(quote, storyBody(raw))
          ? "not_verbatim"
          : quote.length > MAX_QUOTE_CHARS
            ? "too_long"
            : "ok";
      items.push({
        ...base,
        relevant: true,
        stance: l.stance,
        objections: [...new Set(l.objections)],
        best_quote: quoteCheck === "ok" ? quote : null,
        quote_check: quoteCheck,
        vendors_mentioned: [...new Set(l.vendors_mentioned.map((v) => v.trim()).filter(Boolean))],
        buyer_signal: l.buyer_signal === "unknown" ? "unknown" : l.buyer_signal === "true",
        author_is_vendor: l.author_is_vendor,
        second_pass: secondPass,
        text: raw.text,
      });
    }
  });

  const dates = discussion.map((i) => i.date).sort();
  const out: ClassifiedFile = {
    meta: {
      model: MODELS.classify,
      confirmModel: MODELS.synthesise,
      classifiedAt: new Date().toISOString(),
      source: "Hacker News (Algolia API)",
      window: { from: dates[0]?.slice(0, 10) ?? "", to: dates.at(-1)?.slice(0, 10) ?? "" },
      nItems: discussion.length,
      nSkipped: skipped,
    },
    items,
  };
  if (limit === Infinity) writeFileSync(path.join(DATA, "classified.json"), JSON.stringify(out, null, 1));
  else writeFileSync(path.join(DATA, "..", "cache", "classified-pilot.json"), JSON.stringify(out, null, 1));

  // ---------- Report ----------
  const relevant = items.filter((i) => i.relevant);
  const count = <T,>(xs: T[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>());
  console.log(`\nClassified ${items.length} of ${discussion.length} items (${skipped} skipped after a failed retry).`);
  const passes = count(items.map((i) => i.second_pass ?? "not checked"));
  console.log(
    `Haiku marked ${haikuRelevant.length} relevant; Sonnet confirmed ${passes.get("confirmed") ?? 0}, removed ${passes.get("removed") ?? 0}, and ${passes.get("failed") ?? 0} were kept unchecked after a failed call.`,
  );
  console.log(`Relevant: ${relevant.length}. Window: ${out.meta.window.from} to ${out.meta.window.to}.`);
  console.log(`Stance: ${[...count(relevant.map((i) => i.stance))].map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`Buyer signal: ${[...count(relevant.map((i) => String(i.buyer_signal)))].map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`Written by a vendor or founder about their own product: ${relevant.filter((i) => i.author_is_vendor).length}`);
  const objCounts = count(relevant.flatMap((i) => i.objections));
  console.log("Objections (an item can raise several):");
  for (const o of OBJECTIONS) console.log(`  ${o.padEnd(32)}${String(objCounts.get(o) ?? 0).padStart(5)}`);
  console.log(`  ${"(items with no objection)".padEnd(32)}${String(relevant.filter((i) => i.objections.length === 0).length).padStart(5)}`);

  const qc = count(relevant.map((i) => i.quote_check));
  console.log(
    `Quote check on relevant items: ${qc.get("ok") ?? 0} verbatim and kept; dropped ${qc.get("not_verbatim") ?? 0} not verbatim and ${qc.get("too_long") ?? 0} too long; ${qc.get("none") ?? 0} had no quote.`,
  );
  const kept = relevant.filter((i) => i.best_quote !== null);
  const recheck = kept.filter((i) => isVerbatim(i.best_quote!, i.text!)).length;
  console.log(`Re-check of kept quotes: ${recheck}/${kept.length} are exact substrings of their source.`);

  if (limit === Infinity) {
    const rand = mulberry32(SAMPLE_SEED);
    const shuffled = [...relevant].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const sample = shuffled.slice(0, SAMPLE_SIZE);
    const rows = ["id,url,thread,text,my_stance,my_objections"].concat(
      sample.map((i) => [i.id, i.url, i.kind === "comment" ? (i.title ?? "") : "", i.text ?? "", "", ""].map(csvCell).join(",")),
    );
    writeFileSync(path.join(DATA, "labels_sample.csv"), rows.join("\n") + "\n");
    console.log(`\nWrote data/labels_sample.csv: ${sample.length} random relevant items (seed ${SAMPLE_SEED}), without the model's labels.`);
    if (relevant.length < THIN_DATA_THRESHOLD) {
      console.log(`\nTHIN DATA: only ${relevant.length} relevant items (threshold ${THIN_DATA_THRESHOLD}). Stop and review the queries before going on.`);
    }
  }

  console.log("\nSpend:");
  reportSpend(limit === Infinity ? "classify" : `classify --limit ${limit}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
