import { Icon } from "@/components/Badge";
import { Section } from "@/components/Section";
import { site, stats } from "@/lib/data";
import { formatMonth, formatNumber } from "@/lib/format";

// The method in plain words, before any results, so the map and findings make sense.
export function HowItWorks() {
  const { window } = site.meta;
  const steps = [
    {
      title: "Collect",
      text: `I gathered ${formatNumber(stats.nCollected)} Hacker News stories and comments from ${formatMonth(window.from)} to ${formatMonth(window.to)} that mention AI tools for incidents, on-call or root-cause analysis.`,
    },
    {
      title: "Sort",
      text: `Claude models kept the ${stats.nRelevant} that are on topic and set aside ${stats.nVendorAuthored} written by vendors or founders about their own products. For each of the remaining ${stats.nBase}, they labelled the author's stance and the objections the post raises, such as “it gets the cause wrong” or “it deskills engineers”.`,
    },
    {
      title: "Compare",
      text: `Claude then pulled ${stats.claims} claims, word for word, from ${stats.vendorPages} public pages of incident.io, PagerDuty, Rootly, Datadog, Resolve.ai and engineers who built their own with a general AI tool, and rated how each answers each objection. Reviews checked and corrected the ratings.`,
    },
  ];
  return (
    <Section
      id="how"
      title="What I did"
      intro={
        <>
          Your team&apos;s job ad gives &ldquo;analyse a few hundred Gong calls&rdquo; as an example task. I can&apos;t see your calls, so I did the same thing on public
          data: what engineers say about AI incident tools, and how each vendor&apos;s public pages answer them.
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
      <dl className="mt-4 space-y-3 text-[15px] leading-relaxed">
        <div className="flex gap-3">
          <dt className="flex w-44 shrink-0 items-center gap-2 font-medium">
            <Icon rating="SHOWN" /> Shown with proof
          </dt>
          <dd className="text-ink-2">The page backs the claim with a measured result, a named customer reporting a result on that worry, or a real incident.</dd>
        </div>
        <div className="flex gap-3">
          <dt className="flex w-44 shrink-0 items-center gap-2 font-medium">
            <Icon rating="SAID" /> Said, not shown
          </dt>
          <dd className="text-ink-2">The page makes the claim but doesn&apos;t back it up. Sample screens don&apos;t count as proof.</dd>
        </div>
        <div className="flex gap-3">
          <dt className="flex w-44 shrink-0 items-center gap-2 font-medium">
            <Icon rating="NOT_YET" /> Not yet addressed
          </dt>
          <dd className="text-ink-2">The pages checked don&apos;t answer the worry at all.</dd>
        </div>
      </dl>
      <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
        Every quote on this page is word for word from its source and links to it, every number is computed by code, and the limits of the data are set out under
        &ldquo;Methods and limits&rdquo; below the map.
      </p>
    </Section>
  );
}
