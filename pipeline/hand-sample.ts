import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClassifiedFile, OBJECTION_LABELS, OBJECTIONS } from "../lib/schema";
import { objectionDefinitions } from "./lib/classifier";

// Draws the hand-labelling sample: N random posts from the counted base (seeded, so it can be
// redrawn), written without the model's labels so the labeller works blind.
// Usage: npx tsx pipeline/hand-sample.ts <out.json> [n] [seed]
const out = process.argv[2];
const n = Number(process.argv[3] ?? 40);
let seed = Number(process.argv[4] ?? 2027);
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

const classified = ClassifiedFile.parse(JSON.parse(readFileSync(path.join("data", "classified.json"), "utf8")));
const base = classified.items.filter((i) => i.relevant && !i.author_is_vendor);
const pool = [...base];
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}
const defs = objectionDefinitions();
const sample = {
  drawn: { from: `${base.length} posts in the counted base`, n, seed: Number(process.argv[4] ?? 2027) },
  objections: OBJECTIONS.map((o) => ({ id: o, label: OBJECTION_LABELS[o], definition: defs[o] ?? "" })),
  items: pool.slice(0, n).map((i) => ({ id: i.id, url: i.url, date: i.date.slice(0, 10), kind: i.kind, thread: i.title ?? "", text: i.text ?? "" })),
};
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(sample));
console.log(`${n} items written to ${out} (seed ${sample.drawn.seed}); text lengths: ${sample.items.map((i) => i.text.length).sort((a, b) => b - a).slice(0, 5).join(", ")} (longest)`);
