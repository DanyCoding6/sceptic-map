import { CONFIG } from "@/lib/config";
import { site } from "@/lib/data";
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

export function Hero() {
  const top = site.findings[0];
  const { window, nBase } = site.meta;
  const n = site.numbers;
  return (
    <header className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-16">
      <p className="text-sm text-muted">Sceptic Map · an independent pitch · Made for the incident.io marketing team</p>
      <h1 className="mt-6 text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2.3rem] sm:leading-[1.15]">{top.short ?? top.headline}</h1>
      <p className="mt-4 text-lg font-medium leading-snug text-accent-ink">
        What it means for Investigations: it already shows evidence that it works, and with Rootly it makes the strictest promise on access. The quickest gain is to
        show how &ldquo;pull request only&rdquo; is enforced.
      </p>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        I&apos;m Daniyaal Anawar, an Economics student at Cambridge; since 2021 I&apos;ve built an education audience of ~100K followers. I built a tool that sorts what engineers
        say about AI incident tools and checks each objection against incident.io&apos;s public pages. Next summer I&apos;d like to run it on your sales calls.
      </p>
      <p className="mt-3 text-sm text-muted">
        Based on {nBase} Hacker News posts ({n.n_comments} comments, {n.n_stories} stories), {formatMonth(window.from)} to {formatMonth(window.to)}, with vendors&apos; own
        posts set aside.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#findings" className="rounded-md bg-accent-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0b5f58]">
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
