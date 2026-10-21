import { CONFIG } from "@/lib/config";
import { claimById, site } from "@/lib/data";
import { formatMonth } from "@/lib/format";

// Shown only once the walkthrough exists: a "coming soon" box reads as unfinished.
function Video({ url }: { url: string }) {
  if (url.endsWith(".mp4")) {
    return <video src={url} controls preload="none" className="aspect-video w-full rounded-lg bg-wash" />;
  }
  return (
    <a href={url} className="inline-flex items-center gap-3 text-sm font-medium text-accent-ink underline" target="_blank" rel="noopener noreferrer">
      <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
        <circle cx="20" cy="20" r="19" fill="none" stroke="var(--line)" strokeWidth="2" />
        <path d="M16 13 L28 20 L16 27 Z" fill="var(--accent-ink)" />
      </svg>
      Watch the 2-minute walkthrough
    </a>
  );
}

// Vendors whose pages show proof on both "does it work?" rows, named by the data rather than typed.
function provenOnWorks() {
  const rows = ["not_capable_yet", "wrong_or_hallucinated_cause"];
  const names = ["incident.io", "PagerDuty", "Rootly", "Datadog", "Resolve.ai"].filter((v) =>
    rows.every((o) => site.coverage.find((c) => c.vendor === v && c.objection === o)?.rating === "SHOWN"),
  );
  const others = names.filter((v) => v !== "incident.io");
  const diy = rows.every((o) => site.coverage.find((c) => c.vendor === "DIY" && c.objection === o)?.rating === "SHOWN");
  return { iio: names.includes("incident.io"), others: diy ? [...others, "one engineer's do-it-yourself write-up"] : others };
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export function Hero() {
  const { window, nBase } = site.meta;
  const n = site.numbers;
  const proven = provenOnWorks();
  const pr = claimById.get("iio-investigations#17")!;
  return (
    <header className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-16">
      <p className="text-sm text-muted">Sceptic Map · an independent pitch · Made for the incident.io marketing team</p>
      <h1 className="mt-6 text-[1.9rem] font-semibold leading-tight tracking-tight sm:text-[2.6rem] sm:leading-[1.12]">
        What sceptical engineers say about AI incident tools, and which of their worries nobody has yet answered with proof
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        This page takes {nBase} Hacker News posts about AI tools for incident response, from {formatMonth(window.from)} to{" "}
        {formatMonth(window.to)}, and checks each worry they raise against the public pages of incident.io, four competitors and the do-it-yourself route.
      </p>

      <div className="mt-8 rounded-lg border border-line p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">The short version</p>
        <ul className="mt-3 space-y-3 text-[17px] leading-relaxed">
          <li>
            The doubts raised most are about whether it works at all: {n["either:not_capable_yet+wrong_or_hallucinated_cause"]} posts say AI can&apos;t do incident work
            yet, or gets the cause wrong. {proven.iio ? <>On the pages checked, Investigations answers both with proof, such as measured results and named customers, and so do {list(proven.others)}.</> : null}
          </li>
          <li>
            Two other worries come up often: that these tools will deskill or replace engineers ({n["count:deskills_or_replaces_engineers"]} posts,{" "}
            {n["read:deskills_or_replaces_engineers:core"]} of them squarely about it), and what they can reach in production, data included ({n["count:data_access_and_security"]}). Every
            option makes claims on both; none shows proof.
          </li>
          <li>
            On production access, Investigations is well placed. Its{" "}
            <a href={pr.url} className="underline decoration-line underline-offset-2 hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
              product page
            </a>{" "}
            says its only change to your systems is a pull request you review; only Rootly, which requires sign-off on every change, promises as much. Showing how
            that&apos;s enforced, and what it can read, would make Investigations the first option on this map to prove a promise on access.
          </li>
        </ul>
      </div>

      <p className="mt-8 max-w-2xl text-lg leading-relaxed">
        I&apos;m Daniyaal Anawar, an Economics student at Cambridge. Since 2021 I&apos;ve built an audience of ~100K by making hard topics simple without making them
        wrong. Explaining an AI agent to engineers who don&apos;t trust AI is the hardest version of that job I know of, and your team is doing it.
      </p>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed">
        I built this as a working version of the summer project I&apos;d like to do with your team: the same analysis, run on your sales calls. Could we talk for 15
        minutes?
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#map" className="rounded-md bg-accent-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0b5f58]">
          See the map
        </a>
        <a href="#summer" className="rounded-md px-4 py-2.5 text-sm font-medium text-accent-ink ring-1 ring-line hover:bg-wash">
          The summer project
        </a>
        <a
          href={`mailto:${CONFIG.email}?subject=${encodeURIComponent("Sceptic Map: 15 minutes")}`}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-accent-ink ring-1 ring-line hover:bg-wash"
        >
          Email me
        </a>
      </div>
      {CONFIG.videoUrl && (
        <div className="mt-10">
          <Video url={CONFIG.videoUrl} />
        </div>
      )}
    </header>
  );
}
