import { Section } from "@/components/Section";
import { site, stats } from "@/lib/data";
import { formatNumber } from "@/lib/format";

// Decisions Dany made, as recorded in notes/build-log.md and the project's working notes.
const DECISIONS = [
  "Wrote the brief: the idea, the three ratings, and the rules (never invent a quote or a number, no usernames, respect robots.txt, say what the data can't tell you).",
  "Chose the lead finding, where no option shows proof, over an earlier headline about engineers using general AI tools.",
  "Kept some points about incident.io's own older pages off this public page, to raise privately instead.",
  "Approved the vendor pages before any were fetched.",
  "Left Reddit out when it refused automated access, rather than set up its API, and said so in Methods.",
  "Chose, from the options Claude laid out, to add “AI can't do this job yet” as an objection and to add a second model that can only remove items.",
  "Skipped hand-labelling to save time. It's the first thing I'd change.",
];

// Entries from notes/build-log.md, shortened. They happened as described.
const LESSONS = [
  {
    title: "Every number checked out, but the sentences didn't",
    what: "The first draft findings passed every automated check and still overstated. One called a habit common among sceptics when most who had it were positive; one added counts that overlapped.",
    caught: "Recomputing the number behind every sentence.",
    changed: "Rules on overlaps, small counts and subgroups, numbers written as placeholders that code fills, and checks that fail the build if a phrase like “only” stops being true.",
  },
  {
    title: "The agreement score flattered the labels",
    what: `It counted two empty label sets as a perfect match, which made objection agreement look far better than it was. Where either model named an objection (${stats.agreement.objectionLabelled} items), agreement is ${stats.agreement.objectionJaccard}.`,
    caught: "A second review after launch, which re-checked every number on the page.",
    changed: "The score now counts only items with an objection, and the build recomputes every number on the page, not just some of them.",
  },
  {
    title: "The first relevance filter let general AI-coding talk through",
    what: "Many items the model called relevant were about coding agents, not incidents. They would have inflated objections such as “wrong cause”.",
    caught: "Claude reading random samples from both the kept and the rejected piles.",
    changed: "A sharper test in the prompt, more effort from the model, and a second model that can only remove items. Some still gets through, so the two rows behind the lead finding were read in full.",
  },
];

const DIFFERENTLY = [
  "Label a sample by hand before writing any prompts. Agreement between two models says little; a set labelled by a working SRE would say more.",
  "Rate competitors on as many pages as incident.io, not one product page each.",
  "Record when each vendor page was published; a date changes what a claim means.",
  "Go beyond Hacker News: it is one community, with few buyers in it.",
];

function Lesson({ l }: { l: (typeof LESSONS)[number] }) {
  return (
    <div>
      <p className="font-semibold">{l.title}</p>
      <p className="mt-1 text-[15px] leading-relaxed">{l.what}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">
        <span className="font-medium">Caught by:</span> {l.caught}
      </p>
      <p className="text-sm leading-relaxed text-ink-2">
        <span className="font-medium">Changed:</span> {l.changed}
      </p>
    </div>
  );
}

export function HowIBuilt() {
  const steps = [
    { name: "Collect", detail: `${formatNumber(stats.nCollected)} Hacker News items and ${stats.vendorPages} vendor pages` },
    { name: "Classify", detail: `${stats.nRelevant} relevant, after a second model's check` },
    { name: "Verify quotes", detail: `${stats.quotesKept} quotes, each word for word in its source` },
    { name: "Synthesise", detail: `${stats.claims} vendor claims, ${stats.ratings} ratings, ${site.findings.length} findings` },
    { name: "Site", detail: "A static page; no live API calls" },
  ];
  return (
    <Section
      id="build"
      title="How I built it"
      intro="I wrote the brief and made the decisions; Claude Code wrote the code, ran the pipeline and did most of the checking. Code computes every number; the models only choose and write words, and code checks what they write."
    >
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

      <h3 className="mt-10 text-lg font-semibold">Decisions I made</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
        {DECISIONS.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <h3 className="mt-10 text-lg font-semibold">What went wrong</h3>
      <div className="mt-4">
        <Lesson l={LESSONS[0]} />
      </div>
      <details className="group mt-6">
        <summary className="cursor-pointer list-none font-medium text-accent-ink">
          Two more <span className="group-open:hidden">(show)</span>
        </summary>
        <div className="mt-4 space-y-6">
          {LESSONS.slice(1).map((l) => (
            <Lesson key={l.title} l={l} />
          ))}
        </div>
      </details>

      <details className="group mt-10">
        <summary className="cursor-pointer list-none text-lg font-semibold">
          What I&apos;d do differently <span className="text-sm font-normal text-accent-ink group-open:hidden">Show</span>
        </summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
          {DIFFERENTLY.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </details>
    </Section>
  );
}
