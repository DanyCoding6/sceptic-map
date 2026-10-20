import { formatDate } from "@/lib/format";

// An engineer's words, verbatim, with platform, date and link. Never a username.
export function Quote({ quote, url, date }: { quote: string; url: string; date: string }) {
  return (
    <figure className="border-l-2 border-accent pl-4">
      <blockquote className="text-[15px] leading-relaxed text-foreground">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="mt-1 text-xs text-muted">
        Hacker News, {formatDate(date)} ·{" "}
        <a href={url} className="underline hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
          source
        </a>
      </figcaption>
    </figure>
  );
}
