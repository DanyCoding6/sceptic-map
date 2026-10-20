import { Section } from "@/components/Section";
import { site, stats } from "@/lib/data";
import { formatNumber } from "@/lib/format";

// Three entries from notes/build-log.md, shortened. They happened as described.
const LESSONS = [
  {
    title: "The first relevance filter let general AI-coding talk through",
    what: "Many items the model called relevant were about coding agents, not incidents. They would have inflated objections such as “wrong cause”.",
    caught: "Reading random samples from both the kept and the rejected piles.",
    changed: "A sharper test in the prompt, more effort from the model, and a second, stronger model that can only remove items.",
  },
  {
    title: "Every number checked out, but the sentences didn't",
    what: "The first draft findings passed every automated check and still overstated. One called a habit common among sceptics when most who had it were positive; one added counts that overlapped; one claimed a shift from a single half-year.",
    caught: "Recomputing the number behind every sentence by hand.",
    changed: "Rules on overlaps, small counts and subgroups, and numbers written as placeholders that code fills from the data.",
  },
  {
    title: "Mock-ups counted as proof",
    what: "Sample screens on vendor pages were counted as demos, which gave one competitor three “shown with proof” ratings from a single made-up example.",
    caught: "Reading every claim behind every “shown with proof” rating.",
    changed: "Real incidents and illustrations are now separate categories, and illustrations don't count as proof.",
  },
];

const DIFFERENTLY = [
  "Label a small set by hand before writing any prompts. The agreement figure here is one model against another; a set labelled by a working SRE would make it mean more.",
  "Record when each vendor page was published. One rating nearly described Investigations using a post written before it launched.",
  "Ask a few SREs to check the objection list first. The most common objection, “AI can't do this job yet”, wasn't on my starting list.",
  "Go beyond Hacker News: it is one community, with few buyers in it.",
];

export function HowIBuilt() {
  const steps = [
    { name: "Collect", detail: `${formatNumber(stats.nCollected)} Hacker News items and ${stats.vendorPages} vendor pages` },
    { name: "Classify", detail: `${stats.nRelevant} relevant, after a second model's check` },
    { name: "Verify quotes", detail: `${stats.quotesKept} quotes, each word for word in its source` },
    { name: "Synthesise", detail: `${stats.claims} vendor claims, ${stats.ratings} ratings, ${site.findings.length} findings` },
    { name: "Site", detail: "A static page; no live API calls" },
  ];
  return (
    <Section id="build" title="How I built it" intro="Code computes every number; the models only choose and write words, and code checks what they write.">
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch" aria-label="Pipeline, in order">
        {steps.map((s, i) => (
          <li key={s.name} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 self-stretch rounded-lg border border-line p-3">
              <p className="text-sm font-semibold">
                <span className="text-accent-ink">{i + 1}.</span> {s.name}
              </p>
              <p className="mt-1 text-xs leading-snug text-ink-2">{s.detail}</p>
            </div>
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="hidden text-muted sm:block">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[17px] leading-relaxed">
        Total API cost: <span className="font-semibold">${stats.costUsd.toFixed(2)}</span>, including runs I threw away while tuning.
      </p>

      <h3 className="mt-10 text-lg font-semibold">Three things that went wrong</h3>
      <div className="mt-4 space-y-6">
        {LESSONS.map((l) => (
          <div key={l.title}>
            <p className="font-semibold">{l.title}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{l.what}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              <span className="font-medium">How I caught it:</span> {l.caught}
            </p>
            <p className="text-sm leading-relaxed text-ink-2">
              <span className="font-medium">What I changed:</span> {l.changed}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-[17px] leading-relaxed">
        How I build in general: ship early, then improve from what people tell me. JuniorTrader went live and got better through rounds of feedback from the people using it.
      </p>

      <h3 className="mt-10 text-lg font-semibold">What I&apos;d do differently</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
        {DIFFERENTLY.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </Section>
  );
}
