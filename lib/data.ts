import cardJson from "@/data/battlecard.json";
import fixesJson from "@/data/fixes.json";
import siteJson from "@/data/site.json";
import statsJson from "@/data/stats.json";
import { BattleCard, Fixes, Stats, Synthesis } from "@/lib/schema";

// Parsed at build time: if the data drifts from the schema, the build fails.
export const site = Synthesis.parse(siteJson);
export const stats = Stats.parse(statsJson);
export const battleCard = BattleCard.parse(cardJson);
export const fixes = Fixes.parse(fixesJson);

export const claimById = new Map(site.claims.map((c) => [c.id, c]));
export const itemById = new Map(site.items.map((i) => [i.id, i]));
