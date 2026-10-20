// House style for every sentence a model writes that the incident.io team will read.

export const STYLE_RULES = `Writing rules:
- Plain British English ("analyse", "organisation", "behaviour", "prioritise"). Short, specific sentences.
- Never use these words or phrases: AI-powered, revolutionary, game-changing, leverage, unlock, seamless, cutting-edge, "in today's fast-paced world".
- The author has not used any of these products. Never imply hands-on use or inside knowledge.
- Describe a vendor's product only through what its public pages say.
- Where a vendor's messaging leaves a gap, frame it constructively: what sceptical engineers need to hear and how it could be shown. Never "they got this wrong".`;

const BANNED = /\b(ai-powered|revolutionary|game-changing|game changing|leverag(e|es|ed|ing)|unlock(s|ed|ing)?|seamless(ly)?|cutting-edge|cutting edge)\b|in today's fast-paced world/i;
const AMERICAN =
  /\b(analyz\w*|organiz\w*|behavior\w*|colors?|favor\w*|center(s|ed)?|prioritiz\w*|optimiz\w*|realiz\w*|recogniz\w*|summariz\w*|utiliz\w*|emphasiz\w*|minimiz\w*|maximiz\w*|standardiz\w*|customiz\w*|categoriz\w*|defense|license[ds]?|catalog)\b/i;

// Returns an error for banned words (the caller retries); American spellings are only reported.
export function checkStyle(texts: string[], label: string): string | null {
  for (const t of texts) {
    const banned = t.match(BANNED);
    if (banned) return `banned word "${banned[0]}" in: ${t.slice(0, 80)}`;
    const us = t.match(AMERICAN);
    if (us) console.warn(`  style: American spelling "${us[0]}" in ${label}`);
  }
  return null;
}
