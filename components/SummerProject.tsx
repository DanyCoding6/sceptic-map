import { Section } from "@/components/Section";
import { CONFIG } from "@/lib/config";

// Twelve weeks: the summer runs from the end of June to the start of October.
const PLAN = [
  {
    weeks: "Weeks 1–3",
    title: "Point it at real calls",
    what: "Read a sample of Investigations calls myself, agree the objection list with the product marketing team, and run the pipeline on them once a security review clears the data. Output: where buyers differ from Hacker News. If call data isn't cleared in time, I'd widen the public version instead: sources beyond Hacker News, and as many competitor pages as incident.io's.",
  },
  {
    weeks: "Weeks 4–8",
    title: "A weekly brief for sales",
    what: "Which objections rose or fell, the best new quotes, and which ones the messaging can't answer yet, posted where reps already work. Battle cards drafted from real calls for a product marketer to check.",
  },
  {
    weeks: "Weeks 9–12",
    title: "Close the biggest proof gap",
    what: "Plan the proof for the biggest gap the calls confirm, such as Investigations side by side with a general AI agent, or evidence on deskilling. Then hand the tool over with a runbook.",
  },
];

const MEASURES = [
  "Hours a product marketer spends refreshing a battle card, before and after.",
  "How often reps send the matching proof when an objection comes up.",
  "“Said, not shown” gaps closed by the end of the summer.",
];

export function SummerProject() {
  const mail = `mailto:${CONFIG.email}?subject=${encodeURIComponent("Sceptic Map: 15 minutes")}`;
  return (
    <Section
      id="summer"
      title="The summer project"
      intro="This page is the prototype. Over the summer I'd point the same pipeline at incident.io's own sales calls, win/loss notes and deal channels. Each week, sales and marketing would see what buyers object to and where the proof is missing. Call tracking already counts objections; this adds whether the messaging has proof for each one, and which proof a rep should send."
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
        A product marketer&apos;s time to agree the objection list and check the briefs, a sample of calls once security has reviewed it, and one named owner for what it
        produces.
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
