import { Section } from "@/components/Section";

const DELIVERABLES = [
  {
    title: "An objection tracker that runs on real calls",
    what: "This pipeline, pointed at Gong calls, win/loss interviews and deal Slack channels, with the same rule that every quote is checked against its source.",
    measure: "Calls covered each week, and how often its counts match a product marketer's spot check.",
  },
  {
    title: "A weekly “what changed” brief for sales",
    what: "Which objections rose or fell, the best new quotes, and which ones the messaging can't answer yet, posted where reps already work.",
    measure: "Rep usage: opens, replies, and the questions it answers before anyone has to ask.",
  },
  {
    title: "Battle cards that refresh themselves",
    what: "Cards like the one above, rebuilt from real calls and incident.io's own proof points as both change.",
    measure: "Objection handling in deals where the objection came up, and time saved preparing enablement material.",
  },
];

export function SummerProject() {
  return (
    <Section id="summer" title="The summer project" intro="Turn this prototype into an internal tool that keeps sales and marketing current on what buyers object to.">
      <ol className="grid gap-3 sm:grid-cols-2">
        <li className="rounded-lg bg-wash p-5">
          <p className="text-sm font-semibold text-accent-ink">v1: this page</p>
          <p className="mt-1 text-[15px] leading-relaxed">Public Hacker News comments, mapped against public vendor pages.</p>
        </li>
        <li className="rounded-lg bg-wash p-5">
          <p className="text-sm font-semibold text-accent-ink">v2: your data</p>
          <p className="mt-1 text-[15px] leading-relaxed">The same pipeline on Gong calls, win/loss interviews and deal Slack channels, where buyers say what they think.</p>
        </li>
      </ol>
      <p className="mt-6 text-[17px] leading-relaxed text-ink-2">
        The output is a weekly &ldquo;what changed&rdquo; brief for sales and battle cards that keep themselves current, delivered where reps already work. Three deliverables,
        each with how I&apos;d measure it:
      </p>
      <ol className="mt-6 space-y-5">
        {DELIVERABLES.map((d, i) => (
          <li key={d.title} className="grid grid-cols-[2rem_1fr] gap-x-2">
            <span className="text-lg font-semibold text-accent-ink">{i + 1}</span>
            <div>
              <p className="font-semibold">{d.title}</p>
              <p className="mt-1 text-[15px] leading-relaxed">{d.what}</p>
              <p className="mt-1 text-sm text-ink-2">
                <span className="font-medium">Measured by:</span> {d.measure}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-xl font-semibold tracking-tight">Or give me a one-line brief and I&apos;ll ship it within two weeks.</p>
    </Section>
  );
}
