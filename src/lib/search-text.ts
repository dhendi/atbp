// Lightweight, dependency-free text matching for search — no Postgres
// extensions (unaccent/pg_trgm) or external search service needed at ATBP's
// current catalog size (a few hundred products). If the catalog grows well
// past the "500+ listings" launch target, replace this with a real search
// index (Postgres tsvector, or a hosted engine) rather than scaling this up.

/** Strips accents/diacritics and lowercases, so "Pokémon" and "pokemon" compare equal. */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function tokenize(s: string): string[] {
  return normalizeText(s).split(/[^a-z0-9]+/).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// A query word "matches" a haystack word if one contains the other (handles
// plurals and partial words: "gift" vs "gifts"), or — for words 4+ letters —
// they're within one edit of each other (catches common one-letter typos like
// "pokemn" or "vintge" without false-positiving on short words like "top"/"tap").
// Both words need at least 3 letters for the substring check, or a size
// marker like the "M" in "(M)" would trivially substring-match almost any
// query word.
function wordMatches(queryWord: string, haystackWord: string): boolean {
  if (queryWord.length >= 3 && haystackWord.length >= 3 && (haystackWord.includes(queryWord) || queryWord.includes(haystackWord))) {
    return true;
  }
  if (queryWord.length >= 4 && haystackWord.length >= 4 && Math.abs(queryWord.length - haystackWord.length) <= 1) {
    return levenshtein(queryWord, haystackWord) <= 1;
  }
  return queryWord === haystackWord;
}

/** True if every word in `query` matches some word in `haystack` — accent-folded,
 * substring-tolerant, and typo-tolerant. Order-independent, so "vintage clothes"
 * matches a haystack containing both words in any position. */
export function fuzzyTextMatches(haystack: string, query: string): boolean {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return true;
  const haystackWords = tokenize(haystack);
  return queryWords.every((qw) => haystackWords.some((hw) => wordMatches(qw, hw)));
}

/** Lower is more relevant. Used to rank fuzzy matches after filtering. */
export function relevanceRank(title: string, query: string): number {
  const t = normalizeText(title);
  const q = normalizeText(query);
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  return 3;
}
