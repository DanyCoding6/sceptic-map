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
      text: `I gathered ${formatNumber(stats.nCollected)} Hacker News stories and comments from ${formatMonth(window.from)} to ${formatMonth(window.to)}, found by searching for AI tools for incidents, on-call and root-cause analysis, plus full threads whose titles named both AI and incident work.`,
    },
    {
      title: "Sort",
      text: `Claude Haiku labelled every post, and Claude Sonnet re-checked the ones judged on topic and could only remove them. That left ${stats.nRelevant}; the ${stats.nVendorAuthored} written by vendors or founders about their own products were set aside. For each of the remaining ${stats.nBase}, the labels give the author's stance and the worries the post raises, such as “it gets the cause wrong”.`,
    },
    {
      title: "Compare",
      text: `Next, the pipeline took ${stats.claims} claims, word for word, from ${stats.vendorPages} public pages: ${stats.pagesByVendor["incident.io"]} of incident.io's, one AI SRE product page for each competitor, and ${stats.pagesByVendor.DIY} on building your own with a general AI tool. Claude Sonnet rated how each option's pages answer each worry. Claude Code then checked every rating against its claims; after that and later reviews, ${stats.ratingsDifferFromDraft} of the ${stats.ratings} ratings differ from Sonnet's draft, each change logged with a reason.`,
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
          <dd className="text-ink-2">
            The page backs the claim with a measured result, a named customer reporting a result on that worry, or a real incident. It is evidence the vendor chose to show, not an
            independent test.
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="flex w-44 shrink-0 items-center gap-2 font-medium">
            <Icon rating="SAID" /> Said, not shown
          </dt>
          <dd className="text-ink-2">
            The page makes the claim but doesn&apos;t back it with proof on this worry. Sample screens don&apos;t count, and nor does a security audit such as SOC 2,
            which doesn&apos;t show what an agent can read or change.
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="flex w-44 shrink-0 items-center gap-2 font-medium">
            <Icon rating="NOT_YET" /> Not yet addressed
          </dt>
          <dd className="text-ink-2">The pages checked don&apos;t answer the worry at all.</dd>
        </div>
        <div className="flex gap-3">
          <dt className="flex w-44 shrink-0 items-center gap-2 font-medium">
            <Icon rating="NA" /> Doesn&apos;t apply
          </dt>
          <dd className="text-ink-2">Only in the DIY column, on &ldquo;I could do this with a general AI tool myself&rdquo;, which is about that option itself.</dd>
        </div>
      </dl>
      <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
        Every quote is word for word from its source and links to it. Code fills in every count and checks every vendor figure against the
        claim it cites.
      </p>
    </Section>
  );
}
