import { site, stats } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";

export function MethodsBox() {
  const { window } = site.meta;
  const a = stats.agreement;
  const au = stats.audits;
  return (
    <aside id="methods" className="mt-12 rounded-lg border border-line p-5 sm:p-6" aria-labelledby="methods-title">
      <h3 id="methods-title" className="text-lg font-semibold">Methods and limits</h3>
      <dl className="mt-4 space-y-4 text-[15px] leading-relaxed">
        <div>
          <dt className="font-medium">Source and size</dt>
          <dd className="text-ink-2">
            Hacker News stories and comments from {formatDate(window.from)} to {formatDate(window.to)}, found by keyword search, plus full threads whose
            titles named both AI and incident work: {formatNumber(stats.nCollected)} items. Reddit blocked automated access, so it isn&apos;t included.
          </dd>
        </div>
        <div>
          <dt className="font-medium">How items were kept</dt>
          <dd className="text-ink-2">
            Claude Haiku labelled every item for relevance, stance and objections. Claude Sonnet then re-checked the relevant ones and removed {stats.nRemovedBySecondPass}.
            That left {stats.nRelevant}, of which {stats.nVendorAuthored} were written by vendors or founders about their own products and are set aside. Every count on
            this page is out of the remaining {stats.nBase}.
          </dd>
        </div>
        <div>
          <dt className="font-medium">How far to trust the labels</dt>
          <dd className="text-ink-2">
            There are no hand labels. Sonnet re-labelled {a.n} random items on its own: the same stance on {a.stanceAgree} of {a.n} (Cohen&apos;s kappa {a.kappa}) and an
            objection overlap of {a.objectionJaccard} (Jaccard). That is agreement between two models, not accuracy. Claude also read samples in full while building:{" "}
            {au.keptOnTopic} of {au.keptN} kept items were on topic, {au.removedRight} of {au.removedN} removed items were rightly removed, and {au.diyRight} of {au.diyN}{" "}
            &ldquo;uses a general AI tool&rdquo; tags were right. That tag means the author describes using or recommending ChatGPT, Claude, Claude Code, Cursor, Codex,
            Copilot, Gemini, MCP servers, or an agent or scripts they built, for incident work.
          </dd>
        </div>
        <div>
          <dt className="font-medium">A hostile review before publishing</dt>
          <dd className="text-ink-2">
            Every quote shown by default ({au.quotesReviewed}) was re-read with its full comment and the comment it replied to. {au.quotesFailed} were misleading out of
            context or sat under the wrong objection, so they are no longer shown; the counts still use the model&apos;s labels, so a row can be off by one or two. Quotes in
            filtered views haven&apos;t all been reviewed. All {au.ratingsReviewed} rating reasons were checked against their claims, and {au.ratingsCorrected} were corrected.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Quotes and claims</dt>
          <dd className="text-ink-2">
            Code checks that every quote is word for word in its source ({stats.quotesDropped} failed and were dropped). Vendor claims are {stats.claims} sentences taken word
            for word from {stats.vendorPages} public pages. Each rating is a model&apos;s judgement under fixed rules: proof means a measured result, a named customer or a real
            incident, and sample screens don&apos;t count. The do-it-yourself column draws on two engineers&apos; write-ups and Datadog&apos;s own blog about its MCP server.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Known biases</dt>
          <dd className="text-ink-2">
            Hacker News skews sceptical, senior and towards people who don&apos;t buy these tools: only {stats.buyerSignal} of {stats.nBase} comments show a buyer signal.
            A few big launch threads dominate some half-years, so counts over time are small and lumpy.
          </dd>
        </div>
        <div>
          <dt className="font-medium">What this can&apos;t tell you</dt>
          <dd className="text-ink-2">
            Nothing from customer calls, no win/loss data and no hands-on testing: I haven&apos;t used Investigations or any of these products. Public pages show what a buyer
            can read, not what sales says.
          </dd>
        </div>
      </dl>
    </aside>
  );
}
