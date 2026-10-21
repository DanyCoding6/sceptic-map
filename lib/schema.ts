import { z } from "zod";

// One collected item. Usernames are never stored, not even in /data/raw.
export const RawItem = z.object({
  id: z.string(), // "hn:<objectID>", "reddit:<id>", "vendor:<slug>"
  platform: z.enum(["hn", "reddit", "vendor"]),
  url: z.string().url(),
  date: z.string(), // ISO 8601; for vendor pages, the fetch date
  text: z.string(),
  query: z.string(), // the first query that found it
  queries: z.array(z.string()), // every query that found it
  kind: z.enum(["comment", "story", "post", "vendor_page"]),
  via: z.enum(["search", "thread", "vendor_list"]),
  title: z.string().optional(), // story or thread title; page title for vendor pages
  vendor: z.string().optional(),
});
export type RawItem = z.infer<typeof RawItem>;

// ---------- Phase 2: classification ----------

export const OBJECTIONS = [
  "wrong_or_hallucinated_cause",
  "cant_verify_reasoning",
  "data_access_and_security",
  "cost_or_pricing",
  "setup_and_integration_effort",
  "just_an_llm_wrapper",
  "diy_with_general_agent",
  "lacks_context_of_our_systems",
  "alert_noise_unsolved",
  "deskills_or_replaces_engineers",
  "vendor_lock_in",
  "not_capable_yet", // added after reading the "other" bucket (see build log)
  "other",
] as const;
export const Objection = z.enum(OBJECTIONS);
export type Objection = z.infer<typeof Objection>;

export const Stance = z.enum(["sceptical", "positive", "mixed", "neutral"]);
export type Stance = z.infer<typeof Stance>;

export const ClassifiedItem = z.object({
  id: z.string(),
  url: z.string().url(),
  date: z.string(),
  kind: z.enum(["comment", "story", "post"]),
  via: z.enum(["search", "thread"]),
  queries: z.array(z.string()),
  title: z.string().optional(),
  relevant: z.boolean(),
  stance: Stance,
  objections: z.array(Objection),
  // Verbatim 1–2 sentences from `text`, or null if the model gave none or it failed the check.
  best_quote: z.string().nullable(),
  quote_check: z.enum(["ok", "not_verbatim", "too_long", "none"]),
  vendors_mentioned: z.array(z.string()),
  buyer_signal: z.union([z.boolean(), z.literal("unknown")]),
  author_is_vendor: z.boolean(),
  // Sonnet's second relevance check on items Haiku marked relevant ("removed" items are not relevant).
  second_pass: z.enum(["confirmed", "removed", "failed"]).optional(),
  // Kept for relevant items only, so the quote check can be rerun at build time from the repo.
  text: z.string().optional(),
});
export type ClassifiedItem = z.infer<typeof ClassifiedItem>;

export const ClassifiedFile = z.object({
  meta: z.object({
    model: z.string(),
    confirmModel: z.string(),
    classifiedAt: z.string(),
    source: z.string(),
    window: z.object({ from: z.string(), to: z.string() }),
    nItems: z.number(),
    nSkipped: z.number(),
  }),
  items: z.array(ClassifiedItem),
});
export type ClassifiedFile = z.infer<typeof ClassifiedFile>;

// ---------- Phase 3: synthesis (read by the site via data/site.json) ----------

export const OBJECTION_LABELS: Record<Objection, string> = {
  not_capable_yet: "AI can't do this job yet",
  wrong_or_hallucinated_cause: "It gets the cause wrong, or makes it up",
  deskills_or_replaces_engineers: "It deskills engineers, or is meant to replace them",
  data_access_and_security: "I won't give it access to production",
  cant_verify_reasoning: "I can't check how it got there",
  diy_with_general_agent: "I could do this with a general AI tool myself",
  lacks_context_of_our_systems: "It doesn't know our systems",
  alert_noise_unsolved: "The real problem is bad alerts and telemetry",
  cost_or_pricing: "It costs too much",
  vendor_lock_in: "It locks us in",
  setup_and_integration_effort: "It's too much work to set up",
  just_an_llm_wrapper: "It's just a wrapper round an LLM",
  other: "Other objections",
};

// Labels the page shows where they differ from the pipeline's (which feed its prompts, so stay fixed).
export const DISPLAY_LABELS: Partial<Record<Objection, string>> = {
  data_access_and_security: "I won't give it access to production or our data",
};

export const VENDORS = ["incident.io", "PagerDuty", "Rootly", "Datadog", "Resolve.ai", "DIY"] as const;
export const Vendor = z.enum(VENDORS);
export type Vendor = z.infer<typeof Vendor>;

// NA: the objection doesn't apply to that option (only set by hand, e.g. "I could do this myself" for the DIY route).
export const Rating = z.enum(["SHOWN", "SAID", "NOT_YET", "NA"]);
export const ModelRating = z.enum(["SHOWN", "SAID", "NOT_YET"]); // what the rating model may answer
export type Rating = z.infer<typeof Rating>;

export const QuoteRef = z.object({
  id: z.string(),
  quote: z.string(),
  url: z.string().url(),
  date: z.string(),
  thread: z.string().optional(),
});
export type QuoteRef = z.infer<typeof QuoteRef>;

export const ObjectionStat = z.object({
  objection: Objection,
  label: z.string(),
  count: z.number(),
  sceptical: z.number(),
  mixed: z.number(),
  byHalf: z.array(z.object({ half: z.string(), count: z.number() })),
  quotes: z.array(QuoteRef).max(3),
});
export type ObjectionStat = z.infer<typeof ObjectionStat>;

export const Claim = z.object({
  id: z.string(),
  vendor: Vendor,
  url: z.string().url(),
  pageTitle: z.string(),
  quote: z.string(), // verbatim from the page text
  // demo = a real incident walked through; illustration = a sample output or hypothetical, not proof.
  proof: z.enum(["number", "named_customer", "demo", "illustration", "none"]),
  proofNote: z.string(),
  addresses: z.array(Objection),
});
export type Claim = z.infer<typeof Claim>;

export const CoverageCell = z.object({
  vendor: Vendor,
  objection: Objection,
  rating: Rating,
  claimIds: z.array(z.string()),
  reason: z.string(),
  urls: z.array(z.string().url()).min(1), // cited claim pages, or the pages checked for NOT_YET
  overridden: z.boolean().optional(),
});
export type CoverageCell = z.infer<typeof CoverageCell>;

export const Finding = z.object({
  id: z.string(),
  rank: z.number(),
  headline: z.string(),
  short: z.string().optional(), // a shorter one-sentence version for the hero, set in overrides.json
  title: z.string().optional(), // a plain-English heading (overrides.json)
  explain: z.string().optional(), // what engineers are worried about and why it matters (overrides.json)
  note: z.string().optional(), // a line shown under the n (set in overrides.json)
  implication: z.string(),
  whyRanked: z.string(),
  n: z.number(),
  // The items a finding counts: all of them, or only those since 1 Jan 2025.
  scope: z.enum(["all", "since_2025"]).default("all"),
  quotes: z.array(QuoteRef).length(2),
  claimIds: z.array(z.string()),
  overridden: z.boolean().optional(),
});
export type Finding = z.infer<typeof Finding>;

// One engineer item, as the map's filters need it (no usernames, no full text).
export const SiteItem = z.object({
  id: z.string(),
  url: z.string().url(),
  date: z.string(),
  stance: Stance,
  objections: z.array(Objection),
  vendors: z.array(z.string()), // normalised names
  buyer_signal: z.union([z.boolean(), z.literal("unknown")]),
  usesGeneralAI: z.boolean(), // describes using or recommending a general AI tool for incident work
  productUnneeded: z.boolean(), // argues a dedicated product is unnecessary (same tagger as usesGeneralAI)
  kind: z.enum(["story", "comment"]),
  thread: z.string(), // the Hacker News story title the item sits under
  quote: z.string().nullable(),
});
export type SiteItem = z.infer<typeof SiteItem>;

export const Synthesis = z.object({
  meta: z.object({
    generatedAt: z.string(),
    models: z.object({ classify: z.string(), synthesise: z.string() }),
    source: z.string(),
    window: z.object({ from: z.string(), to: z.string() }),
    nCollected: z.number(),
    nRelevant: z.number(),
    nVendorAuthored: z.number(),
    nBase: z.number(), // relevant items not written by a vendor or founder: the base for every count
    halves: z.array(z.object({ half: z.string(), base: z.number() })),
  }),
  numbers: z.record(z.string(), z.number()), // every number a finding may cite, by placeholder key
  objections: z.array(ObjectionStat),
  diy: z.object({
    objectionCount: z.number(),
    usesGeneralAgent: z.number(),
    saysProductUnneeded: z.number(),
    mentionsGeneralAI: z.number(),
    byHalf: z.array(z.object({ half: z.string(), uses: z.number(), base: z.number() })),
    quotes: z.array(QuoteRef).max(3),
  }),
  claims: z.array(Claim),
  coverage: z.array(CoverageCell),
  findings: z.array(Finding).length(3),
  items: z.array(SiteItem),
});
export type Synthesis = z.infer<typeof Synthesis>;

// ---------- Phase 4: hand-written site data, checked by pipeline/verify.ts ----------

export const BattleCard = z.object({
  objection: Objection,
  rows: z
    .array(
      z.object({
        quoteId: z.string(), // an engineer item with a checked quote
        respond: z.string(),
        respondClaimIds: z.array(z.string()).min(1), // incident.io claims the response rests on
        ask: z.string(),
        sendClaimId: z.string(), // the incident.io page to send, by one of its claims
        sendLabel: z.string(),
      }),
    )
    .min(1)
    .max(3),
  avoid: z.array(z.string()).max(6).default([]), // things a rep shouldn't say, each grounded in the cited pages
});
export type BattleCard = z.infer<typeof BattleCard>;

// Pipeline facts the site quotes, computed by pipeline/merge.ts from /data.
export const Stats = z.object({
  nCollected: z.number(),
  nRelevant: z.number(),
  nVendorAuthored: z.number(),
  nBase: z.number(),
  nRemovedBySecondPass: z.number(),
  quotesKept: z.number(),
  quotesDropped: z.number(),
  vendorPages: z.number(),
  claims: z.number(),
  claimsAddedByHand: z.number(), // claims in overrides.json, not extracted by the pipeline
  ratingsDifferFromDraft: z.number(), // ratings that differ from synthesis.json after every review
  reasonsDifferFromDraft: z.number(),
  ratings: z.number(),
  buyerSignal: z.number(),
  costUsd: z.number(),
  nComments: z.number(),
  nStories: z.number(),
  pagesByVendor: z.record(z.string(), z.number()),
  // A blind read of a random sample by a larger Claude model (not human labels).
  blindRead: z.object({
    n: z.number(),
    onTopic: z.number(),
    offTopic: z.number(),
    unsure: z.number(),
    ownProduct: z.number(),
    ownProductUnsure: z.number(),
    stanceAgree: z.number(),
    kappa: z.number(),
    objectionLabelled: z.number(),
    objectionJaccard: z.number(),
    objectionExact: z.number(),
    alreadyRead: z.number(), // blind-read posts Claude had already read, with labels, in the row reads
  }),
  agreement: z.object({
    method: z.string(),
    n: z.number(),
    stanceAgree: z.number(),
    kappa: z.number(),
    objectionJaccard: z.number(), // only over items where either side named an objection
    objectionLabelled: z.number(),
    objectionExact: z.number(),
    vendorAuthored: z.number(),
  }),
  audits: z.object({
    by: z.string(),
    keptN: z.number(),
    keptOnTopic: z.number(),
    removedN: z.number(),
    removedRight: z.number(),
    diyN: z.number(),
    diyRight: z.number(),
    quotesReviewed: z.number(),
    quotesFailed: z.number(),
    quotesHidden: z.number(),
    quotesMoved: z.number(),
    ratingsReviewed: z.number(),
    ratingsCorrected: z.number(),
    postLaunchRatingsChanged: z.number(),
    postLaunchReasonsReworded: z.number(),
    postLaunchQuotesChecked: z.number(),
  }),
});
export type Stats = z.infer<typeof Stats>;
