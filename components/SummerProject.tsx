import { Section } from "@/components/Section";
import { CONFIG } from "@/lib/config";

// Twelve weeks: the summer runs from the end of June to the start of October.
const PLAN = [
  {
    weeks: "Weeks 1–3",
    title: "Point it at real calls",
    what: "Sit in on calls and agree the objection list with product marketing. Then, once security clears the data, run the pipeline on Gong calls, win/loss notes and deal channels, and check what it finds with solutions engineers, who hear objections first-hand. Output: where buyers differ from Hacker News. If call data isn't cleared in time, I'd widen the public version instead: more sources, and as many competitor pages as incident.io's.",
  },
  {
    weeks: "Weeks 4–8",
    title: "Feed what the team already ships",
    what: "A weekly brief, posted where reps work: which objections rose or fell, the best new quotes, and which ones the messaging can't answer yet. From it, battle-card drafts for the AI SRE set (Resolve.ai, Datadog's Bits AI SRE, PagerDuty's and Rootly's agents, and do-it-yourself), an AI version of the “objections we hear most” post, and a register of every AI claim on comparison, pricing and launch pages, checked against what the product does now.",
  },
  {
    weeks: "Weeks 9–12",
    title: "Close the biggest proof gap",
    what: "With the AI team, pick the gap the calls confirm. On this map that could be a published accuracy score, a side-by-side with a general AI agent, or evidence on deskilling or access. For an accuracy score, that means a method note, a kit solutions engineers can use to test it on a prospect's own past incidents, and Investigations customer stories with dashboard numbers. Then hand the tool over with a runbook and write the summer up publicly.",
  },
];

const MEASURES = [
  "Hours a product marketer spends refreshing a battle card, before and after.",
  "How often reps send the matching proof when an objection comes up.",
  "Demo requests from the pages the work feeds.",
  "“Said, not shown” gaps closed by the end of the summer.",
];

export function SummerProject() {
  const mail = `mailto:${CONFIG.email}?subject=${encodeURIComponent("Sceptic Map: 15 minutes")}`;
  return (
    <Section
      id="summer"
      title="The summer project"
      intro="This page is the prototype. Over the summer I'd point the same pipeline at incident.io's own sales calls, win/loss notes and deal channels, and feed what it finds into work the team already ships: battle cards, objection-handling posts and comparison pages. Call tracking already counts objections; this adds whether the messaging has proof for each one, and which proof a rep should send. It would take the same shape as incident.io's Product Engineer Summer Internship: three months, one project owned end to end."
    >
      <ol className="space-y-5">
        {PLAN.map((p) => (
          <li key={p.weeks} className="grid gap-x-4 sm:grid-cols-[7rem_1fr]">
            <p className="text-sm font-semibold text-accent-ink sm:pt-0.5">{p.weeks}</p>
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{p.what}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 font-semibold">What it would need from incident.io</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
        A product marketer&apos;s time to agree the objection list and check the drafts; call data once security has reviewed it, with help from whoever runs Gong and
        Salesforce; an hour a week from a solutions engineer; and one named owner for what it produces.
      </p>
      <p className="mt-8 font-semibold">How I&apos;d measure it</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2">
        {MEASURES.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <div className="mt-10 rounded-lg bg-wash p-5 sm:p-6">
        <p className="text-xl font-semibold tracking-tight">Could we talk for 15 minutes?</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">I&apos;ll walk you through how it works and what I&apos;d do first. Or give me a one-line brief and I&apos;ll ship it within two weeks.</p>
        <a href={mail} className="mt-4 inline-block rounded-md bg-accent-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0b5f58]">
          Email me
        </a>
      </div>
    </Section>
  );
}
