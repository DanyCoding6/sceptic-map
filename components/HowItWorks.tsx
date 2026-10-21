import { Icon } from "@/components/Badge";
import { Section } from "@/components/Section";
import { site, stats } from "@/lib/data";
import { formatMonth, formatNumber } from "@/lib/format";
import type { Rating } from "@/lib/schema";

// The method in plain words, before any results, so the map and findings make sense. Detail lives in Methods.
const KEY: [Rating, string, string][] = [
  ["SHOWN", "Shown with proof", "a measured result, a named customer's result on that worry, or a real incident"],
  ["SAID", "Said, not shown", "claimed, but not backed up on that worry"],
  ["NOT_YET", "Not yet addressed", "not answered on the pages checked"],
  ["NA", "Doesn't apply", "the DIY column on its own worry"],
];

export function HowItWorks() {
  const { window } = site.meta;
  const steps = [
    {
      title: "Collect",
      text: `${formatNumber(stats.nCollected)} Hacker News stories and comments from ${formatMonth(window.from)} to ${formatMonth(window.to)}, found by searching for AI tools for incidents.`,
    },
    {
      title: "Sort",
      text: `Claude models kept ${stats.nRelevant} on topic, set aside ${stats.nVendorAuthored} written by vendors or founders, and tagged the worries in the other ${stats.nBase}.`,
    },
    {
      title: "Compare",
      text: `${stats.claims} claims, word for word, from ${stats.vendorPages} public pages of incident.io, four competitors and the do-it-yourself route, rated against each worry.`,
    },
  ];
  return (
    <Section
      id="how"
      title="What I did"
      intro={
        <>
          Your team&apos;s job ad gives &ldquo;analyse a few hundred Gong calls&rdquo; as an example task. I can&apos;t see your calls, so I did the same thing on public
          data.
        </>
      }
    >
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-lg border border-line p-4">
            <p className="font-semibold">
              <span className="text-accent-ink">{i + 1}.</span> {s.title}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
          </li>
        ))}
      </ol>
      <h3 className="mt-10 text-lg font-semibold">How each answer is rated</h3>
      <dl className="mt-4 space-y-2 text-[15px] leading-relaxed">
        {KEY.map(([r, label, meaning]) => (
          <div key={r} className="flex flex-wrap items-center gap-x-2">
            <dt className="flex items-center gap-2 font-medium">
              <Icon rating={r} /> {label}:
            </dt>
            <dd className="text-ink-2">{meaning}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
        Every quote is word for word and linked to its source; code fills in every number. The details and limits are in &ldquo;Methods and limits&rdquo;, under the map.
      </p>
    </Section>
  );
}
