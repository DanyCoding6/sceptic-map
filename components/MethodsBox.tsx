import { site, stats } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";

export function MethodsBox() {
  const { window } = site.meta;
  const a = stats.agreement;
  const b = stats.blindRead;
  const au = stats.audits;
  const competitorPages = stats.pagesByVendor.PagerDuty;
  const n = site.numbers;
  return (
    <details id="methods" className="group mt-12 rounded-lg border border-line p-5 sm:p-6">
      <summary className="cursor-pointer list-none">
        <span className="flex items-baseline justify-between gap-4">
          <span className="text-lg font-semibold">Methods and limits</span>
          <span aria-hidden="true" className="text-sm text-accent-ink group-open:hidden">
            Show
          </span>
          <span aria-hidden="true" className="hidden text-sm text-accent-ink group-open:inline">
            Hide
          </span>
        </span>
        <span className="mt-2 block text-[15px] leading-relaxed text-ink-2">
          Hacker News only. Labels come from Claude models, checked by a blind read from Claude Code, not by people. Only {stats.buyerSignal} of {stats.nBase} posts show a
          buyer signal.
        </span>
      </summary>
      <dl className="mt-5 space-y-4 text-[15px] leading-relaxed">
        <div>
          <dt className="font-medium">Source and size</dt>
          <dd className="text-ink-2">
            Hacker News stories and comments from {formatDate(window.from)} to {formatDate(window.to)}, found by keyword search, plus full threads whose titles named both
            AI and incident work: {formatNumber(stats.nCollected)} items. Reddit blocked automated access, so it isn&apos;t included.
          </dd>
        </div>
        <div>
          <dt className="font-medium">How items were kept</dt>
          <dd className="text-ink-2">
            Claude Haiku labelled every item for relevance, stance and objections. Claude Sonnet then re-checked the relevant ones and removed {stats.nRemovedBySecondPass}.
            That left {stats.nRelevant}, of which {stats.nVendorAuthored} were written by vendors or founders about their own products and are set aside. Every count on
            this page is out of the remaining {stats.nBase} posts: {stats.nComments} comments and {stats.nStories} stories, many of them just a title and a link.
          </dd>
        </div>
        <div>
          <dt className="font-medium">How far to trust the labels</dt>
          <dd className="text-ink-2">
            There are no human labels. Claude Code, running a larger Claude model, read {b.n} random posts from the {stats.nBase} in full, blind to the pipeline&apos;s
            labels. It is the same tool that wrote the labelling prompts, so this is a self-check, not an independent one:{" "}
            {b.onTopic} were clearly on topic, {b.offTopic} off topic and {b.unsure} borderline, and {b.ownProduct} of the on-topic posts were by people promoting their
            own tool, which should have been set aside. On the {b.onTopic} on topic, it gave the same stance on {b.stanceAgree} (Cohen&apos;s kappa {b.kappa}); where either named an objection (
            {b.objectionLabelled} posts), the overlap was {b.objectionJaccard} (Jaccard), with identical sets on {b.objectionExact}. Earlier, Sonnet re-labelled {a.n} random
            relevant items on its own ({a.vendorAuthored} of them vendor posts, outside the count): the same
            stance on {a.stanceAgree} of {a.n} (Cohen&apos;s kappa {a.kappa}). Where either model named an objection ({a.objectionLabelled} items), the overlap was{" "}
            {a.objectionJaccard} (Jaccard), with identical sets on {a.objectionExact}. That is agreement between two models, not accuracy, and it is loose for objections:
            treat a gap of a few posts between rows as noise. While building, Claude read samples in full: {au.keptOnTopic} of {au.keptN} kept items were on topic,{" "}
            {au.removedRight} of {au.removedN} removed items were rightly removed, and {au.diyRight} of {au.diyN} &ldquo;uses a general AI tool&rdquo; tags were right. That
            tag means the author describes using or recommending ChatGPT, Claude, Claude Code, Cursor, Codex, Copilot, Gemini, MCP servers, or an agent or scripts they
            built, for incident work ({n["diy:uses"]} posts). It differs from naming one ({n["diy:mentions"]}, the map&apos;s filter) and from the &ldquo;I could do this
            myself&rdquo; objection ({n["diy:objection"]}), which comes from the other model&apos;s labels.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Reviews before and after publishing</dt>
          <dd className="text-ink-2">
            Claude re-read every quote shown by default ({au.quotesReviewed}) with its full comment and the comment it replied to. {au.quotesFailed} were misleading out of
            context or sat under the wrong objection, so they are no longer shown; the counts still use the model&apos;s labels. All {au.ratingsReviewed} rating reasons were
            checked against their claims and {au.ratingsCorrected} corrected. After launch, three more rounds of review by Claude changed {au.postLaunchRatingsChanged} ratings and
            reworded {au.postLaunchReasonsReworded} reasons, mostly competitor cells that over-reached; the {au.postLaunchQuotesChecked} quotes added then were checked the
            same way. Each correction is in data/overrides.json with a note saying why. Claude also read every post in the two rows the lead finding rests on: {n["read:deskills_or_replaces_engineers:core"]} of{" "}
            {n["count:deskills_or_replaces_engineers"]} deskilling posts are squarely on the label and {n["read:deskills_or_replaces_engineers:related"]} more are related;{" "}
            {n["read:data_access_and_security:core"]} of {n["count:data_access_and_security"]} access posts fit. Other rows are likely as loose, so read every count as an
            upper bound.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Quotes and claims</dt>
          <dd className="text-ink-2">
            Code checks that every quote is word for word in its source ({stats.quotesDropped} failed and were dropped). Vendor claims are {stats.claims} sentences taken
            word for word from {stats.vendorPages} public pages: {stats.pagesByVendor["incident.io"]} of incident.io&apos;s, {competitorPages} AI SRE product page for each
            competitor, and {stats.pagesByVendor.DIY} for the do-it-yourself route. Competitor ratings describe that page only. Each rating is a model&apos;s judgement under
            fixed rules, corrected where a review found it wrong: proof means a measured result, a named customer reporting a result on that objection, or a real
            incident, and sample screens don&apos;t count.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Known biases</dt>
          <dd className="text-ink-2">
            Hacker News skews sceptical, senior and towards people who don&apos;t buy these tools: only {stats.buyerSignal} of {stats.nBase} posts show a buyer signal. A few
            big launch threads dominate some half-years, so counts over time are small and lumpy.
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
    </details>
  );
}
