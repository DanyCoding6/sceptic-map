import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ClassifiedFile, Objection, Stance } from "../lib/schema";

// Compares a blind read of a random sample (labels made without seeing the pipeline's) with the
// pipeline's labels on the same posts.
// Usage: npx tsx pipeline/hand-agreement.ts [labels file, default data/blind_read.json] [out file]
const DATA = path.join(process.cwd(), "data");
const HandLabel = z.object({
  id: z.string(),
  relevant: z.enum(["yes", "no", "unsure"]),
  stance: Stance,
  objections: z.array(Objection),
  ownProduct: z.enum(["yes", "no", "unsure"]).optional(), // written by someone promoting their own tool
});
const file = process.argv[2] ?? path.join(DATA, "blind_read.json");
const outFile = process.argv[3] ?? path.join(DATA, "blind_agreement.json");
if (!existsSync(file)) {
  console.log(`No ${file} yet.`);
  process.exit(0);
}
const input = JSON.parse(readFileSync(file, "utf8"));
const hand = HandLabel.array().parse(Array.isArray(input) ? input : input.labels);
const model = new Map(ClassifiedFile.parse(JSON.parse(readFileSync(path.join(DATA, "classified.json"), "utf8"))).items.map((i) => [i.id, i]));

const STANCES = Stance.options;
const jaccard = (a: string[], b: string[]) => {
  const A = new Set(a), B = new Set(b);
  return [...A].filter((x) => B.has(x)).length / new Set([...A, ...B]).size;
};
const onTopic = hand.filter((h) => h.relevant === "yes");
const pairs = onTopic.map((h) => ({ h, m: model.get(h.id)! }));
const stanceAgree = pairs.filter((p) => p.h.stance === p.m.stance).length;
const n = pairs.length;
const po = stanceAgree / n;
const pe = STANCES.reduce((s, st) => s + (pairs.filter((p) => p.h.stance === st).length / n) * (pairs.filter((p) => p.m.stance === st).length / n), 0);
const labelled = pairs.filter((p) => p.h.objections.length || p.m.objections.length);
const overlap = labelled.reduce((s, p) => s + jaccard(p.h.objections, p.m.objections), 0) / (labelled.length || 1);
const out = {
  method: `${Array.isArray(input) ? "blind labels" : input.by} vs the pipeline's labels (Claude Haiku, after the Sonnet relevance check)`,
  n: hand.length,
  relevance: { onTopic: onTopic.length, offTopic: hand.filter((h) => h.relevant === "no").length, unsure: hand.filter((h) => h.relevant === "unsure").length },
  ownProduct: { yes: hand.filter((h) => h.ownProduct === "yes").length, unsure: hand.filter((h) => h.ownProduct === "unsure").length },
  stance: { of: n, agree: stanceAgree, cohensKappa: Number(((po - pe) / (1 - pe)).toFixed(2)) },
  objections: {
    labelled: labelled.length,
    meanJaccard: Number(overlap.toFixed(2)),
    exactMatch: labelled.filter((p) => jaccard(p.h.objections, p.m.objections) === 1).length,
    handOnly: labelled.filter((p) => p.h.objections.length && !p.m.objections.length).length,
    modelOnly: labelled.filter((p) => !p.h.objections.length && p.m.objections.length).length,
  },
  perItem: pairs.map((p) => ({ id: p.h.id, hand: { stance: p.h.stance, objections: p.h.objections }, model: { stance: p.m.stance, objections: p.m.objections } })),
};
writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`On topic: ${out.relevance.onTopic} of ${out.n} (off topic ${out.relevance.offTopic}, unsure ${out.relevance.unsure}); own-product posts ${out.ownProduct.yes} (+${out.ownProduct.unsure} unsure).`);
console.log(`Stance: same on ${stanceAgree} of ${n} (kappa ${out.stance.cohensKappa}).`);
console.log(`Objections, where either named one (${labelled.length}): overlap ${out.objections.meanJaccard}, identical ${out.objections.exactMatch}; hand only ${out.objections.handOnly}, model only ${out.objections.modelOnly}.`);
