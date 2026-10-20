import { CONFIG } from "@/lib/config";
import { site } from "@/lib/data";
import { formatMonth } from "@/lib/format";

function Video() {
  const url = CONFIG.videoUrl;
  if (url?.endsWith(".mp4")) {
    return <video src={url} controls preload="none" className="aspect-video w-full rounded-lg bg-wash" />;
  }
  // Until the video exists, a slim line rather than an empty 16:9 box (which reads as unfinished on a phone).
  return (
    <div className="flex w-full items-center gap-3 rounded-lg border border-line bg-wash px-4 py-3">
      <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
        <circle cx="20" cy="20" r="19" fill="none" stroke="var(--line)" strokeWidth="2" />
        <path d="M16 13 L28 20 L16 27 Z" fill="var(--muted)" />
      </svg>
      {url ? (
        <a href={url} className="text-sm font-medium text-accent-ink underline" target="_blank" rel="noopener noreferrer">
          Watch the 2-minute walkthrough
        </a>
      ) : (
        <p className="text-sm text-muted">2-minute walkthrough: coming soon</p>
      )}
    </div>
  );
}

export function Hero() {
  const top = site.findings[0];
  const { window, nBase } = site.meta;
  return (
    <header className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-16">
      <p className="text-sm text-muted">Sceptic Map · an independent pitch · Made for the incident.io marketing team</p>
      <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem] sm:leading-[1.15]">{top.short ?? top.headline}</h1>
      <p className="mt-4 text-lg font-medium leading-snug text-accent-ink">
        What it means for Investigations: show what it adds over the general AI tool engineers already use.
      </p>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        I built a tool that reads what engineers say about AI incident tools, and maps it against how Investigations is told. Here&apos;s what it found.
      </p>
      <p className="mt-3 text-sm text-muted">
        Based on {nBase} Hacker News comments, {formatMonth(window.from)} to {formatMonth(window.to)}, with vendors&apos; own posts set aside.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#map" className="rounded-md bg-accent-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0b5f58]">
          See the map
        </a>
        <a href="#summer" className="rounded-md px-4 py-2.5 text-sm font-medium text-accent-ink ring-1 ring-line hover:bg-wash">
          The summer project
        </a>
      </div>
      <div className="mt-10">
        <Video />
      </div>
    </header>
  );
}
