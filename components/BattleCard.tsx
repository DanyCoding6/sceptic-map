import { Section } from "@/components/Section";
import { Sources } from "@/components/Sources";
import { battleCard, claimById, itemById, site } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { OBJECTION_LABELS } from "@/lib/schema";

export function BattleCard() {
  const stat = site.objections.find((s) => s.objection === battleCard.objection)!;
  return (
    <Section
      id="card"
      title="If a rep hears this tomorrow"
      intro={
        <>
          A mini battle card on the most common objection, &ldquo;{OBJECTION_LABELS[battleCard.objection]}&rdquo; ({stat.count} of {site.meta.nBase} comments). Every answer
          rests on incident.io&apos;s public pages.
        </>
      }
    >
      <p className="inline-block rounded-md bg-wash px-3 py-1.5 text-sm text-ink-2">
        Draft, built only from public objections. I&apos;d rewrite it after listening to real calls.
      </p>
      <ol className="mt-6 space-y-6">
        {battleCard.rows.map((row) => {
          const item = itemById.get(row.quoteId)!;
          const send = claimById.get(row.sendClaimId)!;
          return (
            <li key={row.quoteId} className="rounded-lg border border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">If they say</p>
              <p className="mt-1 text-lg leading-snug">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-1 text-xs text-muted">
                Hacker News, {formatDate(item.date)} ·{" "}
                <a href={item.url} className="underline hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
                  source
                </a>
              </p>
              <dl className="mt-4 grid gap-4 border-t border-line pt-4 text-[15px] leading-relaxed sm:grid-cols-3">
                <div>
                  <dt className="font-medium text-accent-ink">How to respond</dt>
                  <dd className="mt-1">{row.respond}</dd>
                  <dd>
                    <Sources claims={row.respondClaimIds.map((id) => claimById.get(id)!)} />
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-accent-ink">What to ask next</dt>
                  <dd className="mt-1">{row.ask}</dd>
                </div>
                <div>
                  <dt className="font-medium text-accent-ink">What to send afterwards</dt>
                  <dd className="mt-1">
                    <a href={send.url} className="underline hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
                      {row.sendLabel}
                    </a>
                    <span className="block text-xs text-muted">{send.pageTitle.replace(/\s*\|.*$/, "")}</span>
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
