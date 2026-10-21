import { CONFIG, HEADLINE } from "@/lib/config";
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

const SECTIONS: [string, string][] = [
  ["how", "What I did"],
  ["map", "The map"],
  ["findings", "What it means"],
  ["card", "A rep's answer"],
  ["summer", "The summer project"],
  ["build", "How I built it"],
  ["me", "About me"],
];


export function Hero() {
  const { window, nBase } = site.meta;
  const n = site.numbers;
  const proven = provenOnWorks();
  const pr = claimById.get("iio-investigations#17")!;
  const product = claimById.get("iio-ai-sre#1")!; // "starts debugging the moment you declare an incident … surface the root cause in minutes"
  return (
    <header className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-16">
      <p className="text-sm text-muted">Sceptic Map · an independent pitch by Daniyaal Anawar · Made for the incident.io marketing team</p>
      <h1 className="mt-6 text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-[2.6rem] sm:leading-[1.12]">{HEADLINE}</h1>

      <dl className="mt-8 space-y-4 text-[17px] leading-relaxed">
        <div>
          <dt className="inline font-semibold">The product. </dt>
          <dd className="inline">
            incident.io sells{" "}
            <a href={product.url} className="underline decoration-line underline-offset-2 hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
              Investigations
            </a>
            , an AI agent that starts working out what broke the moment a team declares an incident, such as an outage.
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">The problem. </dt>
          <dd className="inline">
            The people who buy it are engineers, and many are sceptical of AI doing this job. incident.io&apos;s own job ad says its product marketers decide what to
            claim and how to prove it.
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">What I built. </dt>
          <dd className="inline">
            A tool that collects {nBase} posts from Hacker News, a forum many engineers read, written between {formatMonth(window.from)} and{" "}
            {formatMonth(window.to)}. It sorts the doubts they raise and checks each one against what incident.io and four competitors show on their public pages.
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">Why. </dt>
          <dd className="inline">
            I&apos;m Daniyaal Anawar, an Economics student at Cambridge, and I&apos;d like to do this for real as a summer product marketing intern. This is the
            prototype.
          </dd>
        </div>
      </dl>

      <div className="mt-8 rounded-lg border border-line p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">What it found</p>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-[17px] leading-relaxed marker:text-accent-ink">
          <li>
            <strong className="font-semibold">Does it work?</strong> The most common doubt ({n["either:not_capable_yet+wrong_or_hallucinated_cause"]} posts).
            {proven.iio ? <> Investigations already shows proof here{proven.others.length ? ", as do some competitors" : ""}.</> : null}
          </li>
          <li>
            <strong className="font-semibold">The gap:</strong> deskilling or replacing engineers, and access to production ({n["count:deskills_or_replaces_engineers"]} and{" "}
            {n["count:data_access_and_security"]} posts). On the pages checked, everyone makes promises and no one shows proof.
          </li>
          <li>
            <strong className="font-semibold">The opening:</strong> Investigations&apos;{" "}
            <a href={pr.url} className="underline decoration-line underline-offset-2 hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
              &ldquo;only change is a pull request you review&rdquo;
            </a>{" "}
            is one of the two strictest promises on the map. Proving it would be a first on this map.
          </li>
        </ul>
      </div>

      <p className="mt-8 max-w-2xl text-lg leading-relaxed">
        Over the summer I&apos;d run the same analysis on your sales calls. Could we talk for 15 minutes?
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`mailto:${CONFIG.email}?subject=${encodeURIComponent("Sceptic Map: 15 minutes")}`}
          className="rounded-md bg-accent-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0b5f58]"
        >
          Email me
        </a>
        <a href="#map" className="rounded-md px-4 py-2.5 text-sm font-medium text-accent-ink ring-1 ring-line hover:bg-wash">
          See the map
        </a>
      </div>

      <nav aria-label="On this page" className="mt-10 border-t border-line pt-5 text-sm">
        <p className="font-medium text-muted">On this page</p>
        <ol className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {SECTIONS.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`} className="text-accent-ink underline decoration-line underline-offset-2 hover:decoration-accent-ink">
                {i + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {CONFIG.videoUrl && (
        <div className="mt-10">
          <Video url={CONFIG.videoUrl} />
        </div>
      )}
    </header>
  );
}
