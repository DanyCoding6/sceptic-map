import { Section } from "@/components/Section";
import { Sources } from "@/components/Sources";
import { battleCard, claimById, itemById, site } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { BattleCard as Card } from "@/lib/schema";

function Row({ row }: { row: Card["rows"][number] }) {
  const send = claimById.get(row.sendClaimId)!;
  return (
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
  );
}

function Said({ id }: { id: string }) {
  const item = itemById.get(id)!;
  return (
    <>
      <span className="block text-lg leading-snug">&ldquo;{item.quote}&rdquo;</span>
      <span className="mt-1 block text-xs text-muted">
        Hacker News, {formatDate(item.date)} ·{" "}
        <a href={item.url} className="underline hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
          source
        </a>
      </span>
    </>
  );
}

export function BattleCard() {
  const n = site.numbers;
  const [first, ...rest] = battleCard.rows;
  return (
    <Section
      id="card"
      title="If a rep hears this tomorrow"
      intro={
        <>
          Finding 2 says the alternative engineers reach for first is the general AI tool they already use ({n["diy:uses"]} of {n.n_base} posts use or recommend one).
          This is how a rep could answer that on a call, using only incident.io&apos;s public pages: three ways engineers put it, what to say, what to ask next, and what
          to send afterwards.
        </>
      }
    >
      <p className="inline-block rounded-md bg-wash px-3 py-1.5 text-sm text-ink-2">A draft from public posts. I&apos;d rewrite it after listening to real calls.</p>
      <ol className="mt-6 space-y-4">
        <li className="rounded-lg border border-line p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">If they say</p>
          <p className="mt-1">
            <Said id={first.quoteId} />
          </p>
          <Row row={first} />
        </li>
        <li>
          <details className="group rounded-lg border border-line p-5">
            <summary className="cursor-pointer list-none">
              <span className="flex items-baseline justify-between gap-4">
                <span className="font-medium">Two more ways they put it, and what not to say</span>
                <span aria-hidden="true" className="text-sm text-accent-ink group-open:hidden">
                  Show
                </span>
              </span>
            </summary>
            <div className="mt-4 space-y-8">
              {rest.map((row) => (
                <div key={row.quoteId}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">If they say</p>
                  <p className="mt-1">
                    <Said id={row.quoteId} />
                  </p>
                  <Row row={row} />
                </div>
              ))}
              {battleCard.avoid.length > 0 && (
                <div className="rounded-lg bg-wash p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">What not to say</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
                    {battleCard.avoid.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </li>
      </ol>
    </Section>
  );
}
