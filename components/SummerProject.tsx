import { Section } from "@/components/Section";
import { CONFIG } from "@/lib/config";

// Twelve weeks: the summer runs from the end of June to the start of October.
const PLAN = [
  {
    weeks: "Weeks 1–3",
    title: "Point it at real calls",
    what: "Sit in on calls, agree the objection list, then run the tool on Gong calls, win/loss notes and deal channels once security clears the data, checking what it finds with solutions engineers. If that data isn't cleared in time, I'd widen the public version instead.",
  },
  {
    weeks: "Weeks 4–8",
    title: "Feed what the team already ships",
    what: "A weekly objections brief for sales; battle cards for the AI competitors and the do-it-yourself route; an AI version of the “objections we hear most” post; and a register checking every AI claim on the website against what the product does now.",
  },
  {
    weeks: "Weeks 9–12",
    title: "Close the biggest proof gap",
    what: "With the AI team, pick the gap the calls confirm, such as a published accuracy score, and build the proof: a method note, a kit for solutions engineers to test it on a prospect's own incidents, and customer stories with real numbers. Then hand over the tool and write it up.",
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
      intro="This page is the prototype. Over the summer I'd run the same tool on incident.io's own sales calls and feed what it finds into work the team already ships: battle cards, objection posts and comparison pages. Same shape as your Product Engineer Summer Internship: three months, one project owned end to end."
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
