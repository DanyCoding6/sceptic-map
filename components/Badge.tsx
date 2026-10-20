import type { Rating } from "@/lib/schema";

export const RATING_TEXT: Record<Rating, string> = {
  SHOWN: "Shown with proof",
  SAID: "Said, not shown",
  NOT_YET: "Not yet addressed",
};

// Icon shape and label carry the meaning; colour only reinforces it.
export function Icon({ rating }: { rating: Rating }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
      {rating === "SHOWN" && <circle cx="6" cy="6" r="5" fill="var(--accent)" />}
      {rating === "SAID" && (
        <>
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--ink-2)" strokeWidth="1.5" />
          <path d="M6 1.5 A4.5 4.5 0 0 1 6 10.5 Z" fill="var(--ink-2)" />
        </>
      )}
      {rating === "NOT_YET" && <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--muted)" strokeWidth="1.5" />}
    </svg>
  );
}

export function Badge({ rating, compact = false }: { rating: Rating; compact?: boolean }) {
  const tone =
    rating === "SHOWN" ? "bg-accent-wash text-foreground" : rating === "SAID" ? "bg-wash text-foreground" : "bg-white text-ink-2 ring-1 ring-line";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}>
      <Icon rating={rating} />
      {compact ? { SHOWN: "Shown", SAID: "Said", NOT_YET: "Not yet" }[rating] : RATING_TEXT[rating]}
    </span>
  );
}
