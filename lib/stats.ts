import { type ClassifiedFile, Stats, type Synthesis, VENDORS } from "./schema";

// Every pipeline fact the site quotes, computed from the data files so none is typed by hand.
// merge.ts writes it to data/stats.json; verify.ts rebuilds it and compares.
export function buildStats(
  site: Synthesis,
  classified: ClassifiedFile,
  cost: { runs: { costUsd: number }[] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agreement: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audits: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blind: any,
  blindLabels: { id: string }[],
  draft: Synthesis,
): Stats {
  const draftCell = (v: string, o: string) => draft.coverage.find((c) => c.vendor === v && c.objection === o);
  const relevant = classified.items.filter((i) => i.relevant);
  const stats: Stats = {
    nCollected: classified.meta.nItems,
    nRelevant: relevant.length,
    nVendorAuthored: relevant.filter((i) => i.author_is_vendor).length,
    nBase: site.meta.nBase,
    nRemovedBySecondPass: classified.items.filter((i) => i.second_pass === "removed").length,
    quotesKept: relevant.filter((i) => i.quote_check === "ok").length,
    quotesDropped: relevant.filter((i) => i.quote_check === "not_verbatim" || i.quote_check === "too_long").length,
    vendorPages: new Set(site.claims.map((c) => c.url)).size,
    claims: site.claims.length,
    claimsAddedByHand: site.claims.filter((c) => !draft.claims.some((d) => d.id === c.id)).length,
    ratingsDifferFromDraft: site.coverage.filter((c) => draftCell(c.vendor, c.objection)?.rating !== c.rating).length,
    reasonsDifferFromDraft: site.coverage.filter((c) => draftCell(c.vendor, c.objection)?.reason !== c.reason).length,
    ratings: site.coverage.length,
    buyerSignal: site.items.filter((i) => i.buyer_signal === true).length,
    nComments: site.numbers.n_comments,
    nStories: site.numbers.n_stories,
    pagesByVendor: Object.fromEntries(VENDORS.map((v) => [v, new Set(site.claims.filter((c) => c.vendor === v).map((c) => c.url)).size])),
    costUsd: Number(cost.runs.reduce((sum, r) => sum + r.costUsd, 0).toFixed(2)),
    blindRead: {
      n: blind.n,
      onTopic: blind.relevance.onTopic,
      offTopic: blind.relevance.offTopic,
      unsure: blind.relevance.unsure,
      ownProduct: blind.ownProduct.yes,
      ownProductUnsure: blind.ownProduct.unsure,
      stanceAgree: blind.stance.agree,
      kappa: blind.stance.cohensKappa,
      objectionLabelled: blind.objections.labelled,
      objectionJaccard: blind.objections.meanJaccard,
      objectionExact: blind.objections.exactMatch,
      alreadyRead: blindLabels.filter((l) => rowReadIds(audits.rowReads).has(l.id)).length,
    },
    agreement: {
      method: agreement.method,
      n: agreement.n,
      stanceAgree: agreement.stance.agree,
      kappa: agreement.stance.cohensKappa,
      objectionJaccard: agreement.objections.meanJaccard,
      objectionLabelled: agreement.objections.labelled,
      objectionExact: agreement.objections.exactMatch,
      vendorAuthored: agreement.vendorAuthored,
    },
    audits: {
      by: audits.by,
      keptN: audits.relevanceKept.n,
      keptOnTopic: audits.relevanceKept.onTopic,
      removedN: audits.relevanceRemoved.n,
      removedRight: audits.relevanceRemoved.rightlyRemoved,
      diyN: audits.diyTags.n,
      diyRight: audits.diyTags.right,
      quotesReviewed: audits.quoteReview.n,
      quotesFailed: audits.quoteReview.problems,
      quotesHidden: audits.quoteReview.hidden.length,
      quotesMoved: audits.quoteReview.removedFromRowOnly.length,
      ratingsReviewed: audits.ratingReview.n,
      ratingsCorrected: audits.ratingReview.corrected,
      postLaunchRatingsChanged: audits.postLaunch.ratingsChanged,
      postLaunchReasonsReworded: audits.postLaunch.reasonsReworded,
      postLaunchQuotesChecked: audits.postLaunch.newQuotesChecked,
    },
  };
  return Stats.parse(stats);
}

// Every Hacker News id named anywhere in the row reads (audits.json), however they're grouped.
function rowReadIds(node: unknown, ids = new Set<string>()): Set<string> {
  if (typeof node === "string") {
    if (/^hn:\d+$/.test(node)) ids.add(node);
  } else if (Array.isArray(node)) node.forEach((x) => rowReadIds(x, ids));
  else if (node && typeof node === "object") Object.values(node).forEach((x) => rowReadIds(x, ids));
  return ids;
}
