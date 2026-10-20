import cardJson from "@/data/battlecard.json";
import siteJson from "@/data/site.json";
import statsJson from "@/data/stats.json";
import { BattleCard, Stats, Synthesis } from "@/lib/schema";

// Parsed at build time: if the data drifts from the schema, the build fails.
export const site = Synthesis.parse(siteJson);
export const stats = Stats.parse(statsJson);
export const battleCard = BattleCard.parse(cardJson);

export const claimById = new Map(site.claims.map((c) => [c.id, c]));
export const itemById = new Map(site.items.map((i) => [i.id, i]));
