/**
 * MQL desugar — translates common English phrasing into formal MQL
 * before the lexer runs.
 *
 * Two transformations (req §9.1, §9.2):
 *
 *   1. Article stripping: leading `the` / `a` / `an` are dropped.
 *   2. Ordinal prefix: a leading ordinal marker rewrites the rest as
 *      a chain index — `second rose` → `rose:[2]`, `2nd rose` →
 *      `rose:[2]`, `last rose` → `rose:[-1]`.
 *
 * The pass is **bypassed entirely** when the input contains any
 * formal-MQL signal character (`:`, `[`, `,`, `'`). This `looksFormal`
 * guard keeps dev-typed queries from getting their intent silently
 * rewritten — a query that already uses MQL syntax is taken at face
 * value.
 *
 * The lexicon (articles, ordinal words, numeric ordinal pattern) is
 * sourced from {@link GrammarApi}, the natural home for English-
 * language artifacts.
 *
 * Conflict-fallback (req §9.3) — retrying as a literal-keyword form
 * when ordinal interpretation hits zero matches — does NOT live here.
 * It lives in the resolver, where the match-count is observable. This
 * pass is a pure function of the input string.
 */

import { GrammarApi } from '../grammar';

/**
 * Heuristic: does this string contain any formal-MQL signal?
 *
 * Used to short-circuit desugar when the player or author has
 * deliberately reached for MQL syntax. The set of signal characters
 * is `:`, `[`, `,`, `'` — chain operator, bracket open, set-union
 * comma, and string-literal quote. Any of these indicates intent that
 * the desugar pass should not second-guess.
 */
export function looksFormal(input: string): boolean {
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === ':' || ch === '[' || ch === ',' || ch === "'") return true;
  }
  return false;
}

/**
 * Run the desugar pass on `input` and return the rewritten query.
 *
 * Returns `input` unchanged when {@link looksFormal} is true, when
 * the result of article-stripping is empty, or when no recognized
 * ordinal marker leads the query.
 */
export function desugar(input: string): string {
  if (looksFormal(input)) return input;

  const trimmed = input.trim();
  if (trimmed.length === 0) return input;

  // Walk tokens (whitespace-split is good enough for the desugar
  // surface — formal syntax was rejected upstream).
  const tokens = trimmed.split(/\s+/);
  let i = 0;

  // Strip leading articles.
  while (i < tokens.length && GrammarApi.ARTICLES.has(tokens[i]!.toLowerCase())) {
    i += 1;
  }

  // Try ordinal-prefix rewrite. Requires (a) at least one more
  // non-ordinal token following, and (b) the ordinal marker matches
  // either the word-form lexicon or the numeric pattern.
  if (i >= tokens.length) return input;

  const headLower = tokens[i]!.toLowerCase();
  let ordinalValue: number | undefined;
  if (GrammarApi.ORDINAL_WORDS.has(headLower)) {
    ordinalValue = GrammarApi.ORDINAL_WORDS.get(headLower);
  } else {
    const m = GrammarApi.ORDINAL_NUMERIC.exec(headLower);
    if (m) ordinalValue = Number.parseInt(m[1]!, 10);
  }

  if (ordinalValue === undefined) {
    // No ordinal prefix recognized — return the article-stripped
    // form so leading articles still get dropped.
    return tokens.slice(i).join(' ');
  }

  // Standalone ordinal token (`drop second`) — req §9.2 says treat
  // it as a literal keyword. Return the article-stripped form.
  if (i + 1 >= tokens.length) {
    return tokens.slice(i).join(' ');
  }

  const tail = tokens.slice(i + 1).join(' ');
  return `${tail}:[${ordinalValue}]`;
}
