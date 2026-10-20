"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { Quote } from "@/components/Quote";
import { Sources } from "@/components/Sources";
import { TrendColumns } from "@/components/TrendColumns";
import { formatHalf } from "@/lib/format";
import type { Objection, QuoteRef, Rating, Vendor } from "@/lib/schema";

export interface MapCell {
  vendor: Vendor;
  rating: Rating;
  reason: string;
  sources: { url: string; pageTitle: string }[];
  quote?: string; // the first cited claim, sent for incident.io only (the only one displayed)
}
export interface MapRow {
  objection: Objection;
  label: string;
  topQuotes: QuoteRef[];
  coverage: MapCell[]; // empty for "other"
}
// Kept small on purpose: everything here is serialised into the page.
export interface MapItem {
  half: number; // index into halves
  objections: Objection[];
  vendors: string[];
  buyer: boolean;
  quote?: QuoteRef; // only for items that raise an objection
}
export interface MapProps {
  rows: MapRow[];
  items: MapItem[];
  halves: string[];
  vendorOptions: string[];
  partialNote: string;
}

const VENDOR_NAME: Record<Vendor, string> = {
  "incident.io": "incident.io",
  PagerDuty: "PagerDuty",
  Rootly: "Rootly",
  Datadog: "Datadog Bits",
  "Resolve.ai": "Resolve.ai",
  DIY: "DIY: general agent + MCP",
};

export function ScepticMap({ rows, items, halves, vendorOptions, partialNote }: MapProps) {
  const [vendor, setVendor] = useState("all");
  const [buyerOnly, setBuyerOnly] = useState(false);
  const [open, setOpen] = useState<Objection | null>(null);

  const filtered = useMemo(
    () => items.filter((i) => (vendor === "all" || i.vendors.includes(vendor)) && (!buyerOnly || i.buyer)),
    [items, vendor, buyerOnly],
  );
  const n = filtered.length;
  const baseByHalf = halves.map((_, k) => filtered.filter((i) => i.half === k).length);

  const view = rows
    .map((row, order) => {
      const hits = filtered.filter((i) => i.objections.includes(row.objection));
      const bins = halves.map((h, k) => ({ half: h, count: hits.filter((i) => i.half === k).length, base: baseByHalf[k] }));
      // Unfiltered: only the reviewed picks, even if fewer than three. Filtered: the picks still in
      // view, topped up with the most recent other quotes.
      const inView = new Set(hits.map((i) => i.quote?.id));
      const quotes = row.topQuotes.filter((q) => inView.has(q.id));
      const filteredView = vendor !== "all" || buyerOnly;
      for (const q of filteredView ? hits.flatMap((i) => (i.quote ? [i.quote] : [])).sort((a, b) => b.date.localeCompare(a.date)) : []) {
        if (quotes.length >= 3) break;
        if (!quotes.some((x) => x.id === q.id)) quotes.push(q);
      }
      return { row, order, count: hits.length, bins, quotes };
    })
    .sort((a, b) => (a.row.objection === "other" ? 1 : b.row.objection === "other" ? -1 : b.count - a.count || a.order - b.order));
  const maxCount = Math.max(1, ...view.map((v) => v.count));
  const maxBin = Math.max(1, ...view.flatMap((v) => v.bins.map((b) => b.count)));
  const buyerTotal = items.filter((i) => i.buyer).length;

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-lg bg-wash p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-2">Posts that mention</span>
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="rounded-md border border-line bg-white px-2 py-1.5 text-sm text-foreground"
          >
            <option value="all">anything ({items.length})</option>
            {vendorOptions.map((v) => (
              <option key={v} value={v}>
                {v === "General AI tools" ? "a general AI tool by name" : v} ({items.filter((i) => i.vendors.includes(v)).length})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={buyerOnly} onChange={(e) => setBuyerOnly(e.target.checked)} className="h-4 w-4 accent-[var(--accent-ink)]" />
          Buyer-signal posts only ({buyerTotal})
        </label>
      </div>

      <p className="mt-4 text-sm text-ink-2" aria-live="polite">
        {n} post{n === 1 ? "" : "s"} in this view.{" "}
        {buyerOnly
          ? `Only ${buyerTotal} of ${items.length} posts show the author runs a team or buys tools for one. That gap is why the summer project starts with sales calls.`
          : n < 60
            ? "Small numbers: read these rows as examples, not a measure."
            : "A post can raise more than one objection. Open a row for quotes and every rating."}
      </p>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {view.map(({ row, count, bins, quotes }) => {
          const isOpen = open === row.objection;
          const iio = row.coverage.find((c) => c.vendor === "incident.io");
          return (
            <li key={row.objection}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`row-${row.objection}`}
                onClick={() => setOpen(isOpen ? null : row.objection)}
                className="grid w-full grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-x-4 gap-y-2 py-4 text-left hover:bg-wash/60 sm:grid-cols-[minmax(0,1fr)_10rem_5.5rem_3rem_1rem]"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium leading-snug">{row.label}</span>
                  {iio && (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-2">
                      <span className="sr-only">incident.io:</span>
                      <span aria-hidden="true">incident.io</span>
                      <Badge rating={iio.rating} compact />
                    </span>
                  )}
                </span>
                <span className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto" aria-hidden="true">
                  <span className="block h-2 rounded-r bg-accent-wash">
                    <span className="block h-2 rounded-r bg-accent transition-[width] duration-300" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </span>
                </span>
                <span className="col-start-2 row-start-1 text-right text-sm tabular-nums text-ink-2 sm:col-start-auto sm:row-start-auto">
                  {count} of {n}
                </span>
                <span className="col-start-2 row-start-2 justify-self-end sm:col-start-auto sm:row-start-auto">
                  <TrendColumns bins={bins} max={maxBin} partialNote={partialNote} />
                </span>
                <span aria-hidden="true" className={`hidden text-muted transition-transform sm:block ${isOpen ? "rotate-90" : ""}`}>
                  ›
                </span>
              </button>

              {isOpen && (
                <div id={`row-${row.objection}`} className="grid gap-8 pb-8 pt-2 lg:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">What engineers say</h3>
                    <div className="mt-3 space-y-4">
                      {quotes.length ? quotes.map((q) => <Quote key={q.id} {...q} />) : <p className="text-sm text-ink-2">No quotes in this view.</p>}
                    </div>
                    <p className="mt-4 text-xs text-muted">
                      By half-year: {bins.map((b) => `${formatHalf(b.half)} ${b.count}`).join(" · ")} (last half {partialNote})
                    </p>
                  </div>

                  {iio ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">How incident.io&apos;s public pages answer it</h3>
                      <div className="mt-3">
                        <Badge rating={iio.rating} />
                        <p className="mt-2 text-[15px] leading-relaxed">{iio.reason}</p>
                        {iio.quote && <p className="mt-2 text-sm italic leading-relaxed text-ink-2">&ldquo;{iio.quote.replace(/^[“"]+|[”"]+$/g, "")}&rdquo;</p>}
                        <Sources claims={iio.sources} />
                      </div>
                      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">How the others&apos; pages compare</h3>
                      <ul className="mt-3 space-y-3">
                        {row.coverage
                          .filter((c) => c.vendor !== "incident.io")
                          .map((c) => (
                            <li key={c.vendor} className="text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{VENDOR_NAME[c.vendor]}</span>
                                <Badge rating={c.rating} compact />
                              </div>
                              <p className="mt-1 leading-relaxed text-ink-2">{c.reason}</p>
                              <Sources claims={c.sources} />
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-2">These objections don&apos;t share a theme, so they aren&apos;t mapped against vendor messaging.</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
