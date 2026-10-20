import { About } from "@/components/About";
import { BattleCard } from "@/components/BattleCard";
import { Findings } from "@/components/Findings";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowIBuilt } from "@/components/HowIBuilt";
import { MethodsBox } from "@/components/MethodsBox";
import { type MapProps, ScepticMap } from "@/components/ScepticMap";
import { Section } from "@/components/Section";
import { SummerProject } from "@/components/SummerProject";
import { claimById, site } from "@/lib/data";
import { formatDate } from "@/lib/format";

// The whole page is built from committed data at build time; nothing renders per request.
export const ensureStatic = "navigation";

// Only what the map needs crosses to the browser.
function mapProps(): MapProps {
  const halves = site.meta.halves.map((h) => h.half);
  const half = (date: string) => halves.indexOf(`${date.slice(0, 4)}-H${Number(date.slice(5, 7)) <= 6 ? 1 : 2}`);
  const rows = site.objections.map((s) => ({
    objection: s.objection,
    label: s.label,
    topQuotes: s.quotes,
    coverage: site.coverage
      .filter((c) => c.objection === s.objection)
      .map((c) => {
        const claims = c.claimIds.map((id) => claimById.get(id)!);
        return {
          vendor: c.vendor,
          rating: c.rating,
          reason: c.reason,
          sources: [...new Map(claims.map((x) => [x.url, { url: x.url, pageTitle: x.pageTitle }])).values()],
          ...(c.vendor === "incident.io" && claims[0] ? { quote: claims[0].quote } : {}),
        };
      }),
  }));
  const items = site.items.map((i) => ({
    half: half(i.date),
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
        <Findings />
        <Section
          id="map"
          title="The Sceptic Map"
          wide
          intro={
            <>
              Each row is an objection engineers raise about AI incident tools, most common first. Open a row for what they say, how incident.io&apos;s public pages answer
              it, and how four competitors and the do-it-yourself route compare. <span className="font-medium text-foreground">Shown with proof</span> means a measured
              result, a named customer or a real incident; <span className="font-medium text-foreground">said, not shown</span> means asserted without proof.
            </>
          }
        >
          <ScepticMap {...mapProps()} />
          <MethodsBox />
        </Section>
        <BattleCard />
        <SummerProject />
        <HowIBuilt />
        <About />
      </main>
      <Footer />
    </>
  );
}
