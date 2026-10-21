import { About } from "@/components/About";
import { AtAGlance, MIN_ROW_COUNT } from "@/components/AtAGlance";
import { BattleCard } from "@/components/BattleCard";
import { Findings } from "@/components/Findings";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowIBuilt } from "@/components/HowIBuilt";
import { HowItWorks } from "@/components/HowItWorks";
import { MethodsBox } from "@/components/MethodsBox";
import { type MapProps, ScepticMap } from "@/components/ScepticMap";
import { Section } from "@/components/Section";
import { SummerProject } from "@/components/SummerProject";
import { claimById, site } from "@/lib/data";
import { half } from "@/lib/numbers";
import { formatDate, formatMonth } from "@/lib/format";

// The whole page is built from committed data at build time; nothing renders per request.
export const ensureStatic = "navigation";

const titleOf = (url: string) => site.claims.find((c) => c.url === url)?.pageTitle ?? url;

// Only what the map needs crosses to the browser.
function mapProps(): MapProps {
  const halves = site.meta.halves.map((h) => h.half);
  const halfIndex = (date: string) => halves.indexOf(half(date));
  const rows = site.objections.filter((s) => s.objection === "other" || s.count >= MIN_ROW_COUNT).map((s) => ({
    objection: s.objection,
    label: s.label,
    topQuotes: s.quotes,
    coverage: site.coverage
      .filter((c) => c.objection === s.objection)
      .map((c) => {
        const claims = c.claimIds.map((id) => claimById.get(id)!);
        // A "not yet" rating cites no claim, so link the pages that were checked instead.
        const pages = claims.length ? claims.map((x) => ({ url: x.url, pageTitle: x.pageTitle })) : c.urls.map((url) => ({ url, pageTitle: titleOf(url) }));
        return {
          vendor: c.vendor,
          rating: c.rating,
          reason: c.reason,
          sources: [...new Map(pages.map((x) => [x.url, x])).values()],
          ...(c.vendor === "incident.io" && claims[0] ? { quote: claims[0].quote } : {}),
        };
      }),
  }));
  const items = site.items.map((i) => ({
    half: halfIndex(i.date),
    objections: i.objections,
    vendors: i.vendors,
    buyer: i.buyer_signal === true,
    ...(i.quote && i.objections.length ? { quote: { id: i.id, quote: i.quote, url: i.url, date: i.date } } : {}),
  }));
  const vendorOptions = ["General AI tools", "PagerDuty", "Datadog", "incident.io", "Rootly", "Resolve.ai"].filter((v) =>
    site.items.some((i) => i.vendors.includes(v)),
  );
  return {
    rows,
    items,
    halves,
    vendorOptions,
    partialNote: `to ${formatDate(site.meta.window.to)}`,
  };
}

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <HowItWorks />
        <Section
          id="map"
          title="The map"
          intro={
            <>
              Rows are worries, most common first, with the number of posts in brackets (out of {site.meta.nBase}, {formatMonth(site.meta.window.from)} to{" "}
              {formatMonth(site.meta.window.to)}). Columns are the options a team could pick; DIY means wiring a general AI tool such as Claude Code into your own
              systems. Read across a row to see if anyone has proof.
            </>
          }
        >
          <AtAGlance />
          <details className="group mt-10 rounded-lg border border-line p-4 sm:p-5">
            <summary className="cursor-pointer list-none">
              <span className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">Open the full map: what engineers say, and the reason behind every rating</span>
                <span aria-hidden="true" className="text-sm text-accent-ink group-open:hidden">
                  Show
                </span>
                <span aria-hidden="true" className="hidden text-sm text-accent-ink group-open:inline">
                  Hide
                </span>
              </span>
            </summary>
            <div className="mt-4">
              <ScepticMap {...mapProps()} />
            </div>
          </details>
          <MethodsBox />
        </Section>
        <Findings />
        <BattleCard />
        <SummerProject />
        <HowIBuilt />
        <About />
      </main>
      <Footer />
    </>
  );
}
