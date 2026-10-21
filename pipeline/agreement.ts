import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClassifiedFile, type Objection, OBJECTIONS, RawItem, type Stance } from "../lib/schema";
import { MODELS } from "./lib/anthropic";
import { classifyBatch } from "./lib/classifier";
import { reportSpend } from "./lib/llm";

// Measures how far to trust the Haiku labels, on the 30-item sample in data/labels_sample.csv.
// If Daniyaal filled in my_stance and my_objections, compare against those (hand labels).
// Otherwise re-classify the same items independently with Sonnet (model-to-model), and say so.

const DATA = path.join(process.cwd(), "data");
const STANCES: Stance[] = ["sceptical", "positive", "mixed", "neutral"];

// Minimal RFC 4180 parser: quoted fields may contain commas, quotes ("") and newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim()));
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / new Set([...A, ...B]).size;
}

function cohensKappa(a: Stance[], b: Stance[]): number {
  const n = a.length;
  const po = a.filter((x, i) => x === b[i]).length / n;
  const pe = STANCES.reduce((sum, s) => sum + (a.filter((x) => x === s).length / n) * (b.filter((x) => x === s).length / n), 0);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

interface Labels {
  relevant: boolean;
  stance: Stance;
  objections: Objection[];
}

async function main() {
  const [header, ...rows] = parseCsv(readFileSync(path.join(DATA, "labels_sample.csv"), "utf8"));
  const col = (name: string) => header.indexOf(name);
  const sample = rows.map((r) => ({
    id: r[col("id")],
    myStance: r[col("my_stance")]?.trim().toLowerCase() ?? "",
    myObjections: r[col("my_objections")]?.trim().toLowerCase() ?? "",
  }));

  const classified = ClassifiedFile.parse(JSON.parse(readFileSync(path.join(DATA, "classified.json"), "utf8")));
  const haiku = new Map(classified.items.map((i) => [i.id, i]));

  const handLabelled = sample.every((s) => s.myStance);
  let method: string;
  const reference = new Map<string, Labels>();

  if (handLabelled) {
    method = `Daniyaal's hand labels vs ${MODELS.classify}`;
    for (const s of sample) {
      if (!STANCES.includes(s.myStance as Stance)) throw new Error(`${s.id}: my_stance "${s.myStance}" is not one of ${STANCES.join(", ")}`);
      const objections = s.myObjections && s.myObjections !== "none" ? s.myObjections.split(/[;,\s]+/).filter(Boolean) : [];
      for (const o of objections) if (!OBJECTIONS.includes(o as Objection)) throw new Error(`${s.id}: unknown objection "${o}"`);
      reference.set(s.id, { relevant: true, stance: s.myStance as Stance, objections: objections as Objection[] });
    }
  } else {
    method = `model-to-model: ${MODELS.synthesise} (independent re-run, same prompt) vs ${MODELS.classify}`;
    const raw = new Map(RawItem.array().parse(JSON.parse(readFileSync(path.join(DATA, "raw", "items.json"), "utf8"))).map((i) => [i.id, i]));
    const items = sample.map((s) => raw.get(s.id)!);
    for (let i = 0; i < items.length; i += 10) {
      const labels = await classifyBatch(MODELS.synthesise, items.slice(i, i + 10), `agreement batch ${i / 10 + 1}`, "medium");
      if (!labels) throw new Error("Sonnet re-classification failed twice; see the log above.");
      for (const [id, l] of labels) reference.set(id, { relevant: l.relevant, stance: l.stance, objections: l.objections });
    }
  }

  const perItem = sample.map((s) => {
    const h = haiku.get(s.id)!;
    const r = reference.get(s.id)!;
    return {
      id: s.id,
      haiku: { stance: h.stance, objections: h.objections },
      reference: r,
      stanceMatch: h.stance === r.stance,
      objectionJaccard: Number(jaccard(h.objections, r.objections).toFixed(3)),
    };
  });
  const n = perItem.length;
  const stanceAgree = perItem.filter((p) => p.stanceMatch).length;
  const kappa = cohensKappa(
    perItem.map((p) => p.haiku.stance),
    perItem.map((p) => p.reference.stance),
  );
  // Two empty sets agree trivially, so the overlap is measured only where either side named an objection.
  const labelled = perItem.filter((p) => p.haiku.objections.length || p.reference.objections.length);
  const meanJaccard = labelled.reduce((s, p) => s + p.objectionJaccard, 0) / labelled.length;
  const exactMatch = labelled.filter((p) => p.objectionJaccard === 1).length;
  const vendorAuthored = sample.filter((s) => haiku.get(s.id)!.author_is_vendor).length;
  const relevantAgree = perItem.filter((p) => p.reference.relevant).length;

  const out = {
    method,
    n,
    measuredAt: new Date().toISOString(),
    relevance: { referenceAlsoRelevant: relevantAgree, of: n },
    stance: { agree: stanceAgree, of: n, cohensKappa: Number(kappa.toFixed(2)) },
    objections: { meanJaccard: Number(meanJaccard.toFixed(2)), labelled: labelled.length, exactMatch },
    vendorAuthored,
    perItem,
  };
  writeFileSync(path.join(DATA, "agreement.json"), JSON.stringify(out, null, 2));

  console.log(`Agreement on ${n} sampled relevant items (${method})`);
  console.log(`  Relevance: the reference also marks ${relevantAgree} of ${n} as relevant`);
  console.log(`  Stance: same label on ${stanceAgree} of ${n}; Cohen's kappa ${kappa.toFixed(2)}`);
  console.log(`  Objections: on the ${labelled.length} items where either side named one, mean Jaccard overlap ${meanJaccard.toFixed(2)}; identical sets on ${exactMatch}`);
  console.log(`  ${vendorAuthored} of the ${n} sampled items were written by vendors or founders (outside the counted base)`);
  console.log("\nDisagreements:");
  for (const p of perItem.filter((p) => !p.stanceMatch || p.objectionJaccard < 1)) {
    console.log(`  ${p.id}: haiku ${p.haiku.stance} [${p.haiku.objections.join(", ")}] vs ${p.reference.stance} [${p.reference.objections.join(", ")}]${p.reference.relevant ? "" : " (reference: not relevant)"}`);
  }
  console.log("\nSpend:");
  reportSpend("agreement");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
