import { Icon, RATING_TEXT } from "@/components/Badge";
import { site, stats } from "@/lib/data";
import { type Rating, VENDORS } from "@/lib/schema";

// The whole map on one screen: objection rows by vendor, one icon per rating.
export const MIN_ROW_COUNT = 3; // rows with fewer posts than this are too thin to map

const SHORT: Record<(typeof VENDORS)[number], string> = {
  "incident.io": "incident.io",
  PagerDuty: "PagerDuty",
  Rootly: "Rootly",
  Datadog: "Datadog",
  "Resolve.ai": "Resolve",
  DIY: "DIY",
};

const COMPETITORS = ["PagerDuty", "Rootly", "Datadog", "Resolve.ai"] as const;
const LEAD: string[] = ["deskills_or_replaces_engineers", "data_access_and_security"]; // the rows finding 1 is about

export function AtAGlance() {
  const competitorPages = stats.pagesByVendor[COMPETITORS[0]];
  const rows = site.objections.filter((o) => o.objection !== "other" && o.count >= MIN_ROW_COUNT);
  const rating = (v: string, o: string) => site.coverage.find((c) => c.vendor === v && c.objection === o)!.rating as Rating;
  // Counted over the rows shown, so the line under the grid matches the column above it.
  const tally = (v: string, r: Rating) => rows.filter((o) => rating(v, o.objection) === r).length;
  return (
    <div>
      <table className="w-full table-fixed border-collapse text-sm">
        <caption className="mb-3 text-left text-sm text-ink-2">
          How each option&apos;s public pages answer each objection. Posts raising it in brackets.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-[44%] pb-2 text-left align-bottom text-xs font-medium text-muted sm:w-[40%]">
              Objection
            </th>
            {VENDORS.map((v) => (
              <th key={v} scope="col" className={`pb-2 align-bottom text-xs ${v === "incident.io" ? "font-semibold text-foreground" : "font-medium text-muted"}`}>
                <span className="mx-auto block w-fit [writing-mode:vertical-rl] rotate-180 sm:rotate-0 sm:[writing-mode:horizontal-tb]">{SHORT[v]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.objection} className="border-t border-line">
              <th scope="row" className={`py-2 pr-2 text-left leading-snug ${LEAD.includes(o.objection) ? "font-semibold" : "font-normal"}`}>
                {o.label} <span className="text-muted tabular-nums">({o.count})</span>
              </th>
              {VENDORS.map((v) => {
                const r = rating(v, o.objection);
                return (
                  <td key={v} className={`py-2 text-center ${v === "incident.io" ? "bg-wash" : ""}`}>
                    <span className="inline-flex" role="img" aria-label={`${v}: ${RATING_TEXT[r]}`}>
                      <Icon rating={r} />
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        {(["SHOWN", "SAID", "NOT_YET", "NA"] as const).map((r) => (
          <li key={r} className="inline-flex items-center gap-1.5">
            <Icon rating={r} /> {RATING_TEXT[r]}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-ink-2">
        Shown with proof means a measured result, a named customer reporting a result on that objection, or a real incident; said, not shown means asserted without
        proof. The two rows in bold are finding 1.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        incident.io, on these {rows.length} rows: {tally("incident.io", "SHOWN")} shown, {tally("incident.io", "SAID")} said, {tally("incident.io", "NOT_YET")} not yet. Its column rests on{" "}
        {stats.pagesByVendor["incident.io"]} of its pages; each competitor&apos;s on {competitorPages} AI SRE product page{competitorPages === 1 ? "" : "s"}; the DIY
        column on {stats.pagesByVendor.DIY} pages (two engineers&apos; write-ups and Datadog&apos;s blog on its MCP server), so its proof is single cases, not a product&apos;s
        record.
      </p>
    </div>
  );
}
