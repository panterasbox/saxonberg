/**
 * MQL desugar — translates common English phrasing into formal MQL
 * before the lexer runs.
 *
 * Three transformations:
 *
 *   1. Article stripping: leading `the` / `a` / `an` are dropped.
 *   2. Ordinal prefix: a leading ordinal marker rewrites the rest as
 *      a chain index — `second rose` → `rose:[2]`, `2nd rose` →
 *      `rose:[2]`, `last rose` → `rose:[-1]`.
 *   3. Quantity prefix: a leading positive integer or the literal
 *      `all` followed by at least one keyword token rides on the
 *      side-channel `quantityHint` — `5 coins` → `{ rewritten: 'coins',
 *      quantityHint: { value: { kind: 'count', n: 5 }, mode: 'lenient' } }`.
 *      `all coins` → `{ rewritten: 'coins', quantityHint: { value: { kind: 'all' },
 *      mode: 'lenient' } }`.
 *
 * The pass is **bypassed entirely** when the input contains any
 * formal-MQL signal character (`:`, `[`, `,`, `'`, `{`). This
 * `looksFormal` guard keeps dev-typed queries from getting their
 * intent silently rewritten — a query that already uses MQL syntax
 * is taken at face value. `{` was added when the formal quantity
 * syntax `coin:{5}` landed: anything containing `{` runs through
 * the lexer/parser, where the parser produces the strict-mode
 * quantity hint directly.
 *
 * The lexicon (articles, ordinal words, numeric ordinal pattern) is
 * sourced from {@link GrammarApi}, the natural home for English-
 * language artifacts.
 *
 * Conflict-fallback (req §9.3) — retrying as a literal-keyword form
 * when ordinal interpretation hits zero matches — does NOT live here.
 * It lives in the resolver, where the match-count is observable. This
 * pass is a pure function of the input string.
 *
 * Quantity + ordinal collision (`2nd 3 roses`, `3 2nd roses`,
 * `all 2nd roses`) is detected here and surfaced via the `error`
 * field; the resolver throws `MqlDesugarError` carrying that
 * message so the dispatcher can render it as the command's failure
 * prose. When `error` is set, `rewritten` is the original input and
 * `quantityHint` is undefined.
 */

import { GrammarApi } from '../grammar';
import type { MqlQuantityHint } from './types';

/**
 * Output of the desugar pass.
 *
 *   - `rewritten` — the post-desugar string fed to the lexer.
 *   - `quantityHint` — present when the natural-language quantity
 *     prefix matched. Always `mode: 'lenient'` here; strict-mode hints
 *     come from the parser's `QuantityNode`.
 *   - `error` — set when desugar detected an unrecoverable ambiguity
 *     (quantity + ordinal collision). When set, `rewritten` is the
 *     original input and `quantityHint` is undefined; the resolver
 *     surfaces the message.
 */
export interface DesugarResult {
  rewritten: string;
  quantityHint?: MqlQuantityHint;
  error?: string;
}

/**
 * Heuristic: does this string contain any formal-MQL signal?
 *
 * Used to short-circuit desugar when the player or author has
 * deliberately reached for MQL syntax. The set of signal characters
 * is `:`, `[`, `,`, `'`, `{` — chain operator, bracket open, set-union
 * comma, string-literal quote, and quantity-brace open. Any of these
 * indicates intent that the desugar pass should not second-guess.
 */
export function looksFormal(input: string): boolean {
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (
      ch === ':' ||
      ch === '[' ||
      ch === ',' ||
      ch === "'" ||
      ch === '{'
    ) {
      return true;
    }
  }
  return false;
}

const COLLISION_ERROR =
  (input: string): string =>
    `'${input}' is ambiguous: combines a count with an ordinal. ` +
    `Use a range (e.g. 'roses:[4..6]' for the 2nd group of three), ` +
    `a single ordinal (e.g. '2nd rose'), or a plain count ` +
    `(e.g. '3 roses').`;

function isPositiveIntegerToken(tok: string): boolean {
  return /^\d+$/.test(tok);
}

function isOrdinalToken(tok: string): boolean {
  const lower = tok.toLowerCase();
  if (GrammarApi.ORDINAL_WORDS.has(lower)) return true;
  return GrammarApi.ORDINAL_NUMERIC.test(lower);
}

/**
 * Run the desugar pass on `input` and return the rewritten query plus
 * any side-channel quantity hint.
 *
 * Returns `input` unchanged when {@link looksFormal} is true, when
 * the result of article-stripping is empty, or when no recognized
 * ordinal / quantity marker leads the query.
 */
export function desugar(input: string): DesugarResult {
  if (looksFormal(input)) return { rewritten: input };

  const trimmed = input.trim();
  if (trimmed.length === 0) return { rewritten: input };

  const tokens = trimmed.split(/\s+/);
  let i = 0;

  // Strip leading articles.
  while (i < tokens.length && GrammarApi.ARTICLES.has(tokens[i]!.toLowerCase())) {
    i += 1;
  }
  if (i >= tokens.length) return { rewritten: input };

  // Try quantity-prefix first. The regex on the slate spec is
  // `^(?:(\d+)|(all))\s+(\S.*)$` — a leading positive integer or the
  // literal `all` followed by at least one more token. The "at least
  // one more token" guard prevents `all` (standalone) from being
  // misread as a quantity-of-nothing; standalone `all` falls through
  // to the article-stripped form (which lets `all` keep working as a
  // future predicate slot).
  const headLower = tokens[i]!.toLowerCase();
  let quantityHint: MqlQuantityHint | undefined;
  let quantityClaimed = false;
  if (isPositiveIntegerToken(tokens[i]!) && i + 1 < tokens.length) {
    const n = Number.parseInt(tokens[i]!, 10);
    if (n > 0) {
      quantityHint = {
        value: { kind: 'count', n },
        mode: 'lenient',
      };
      quantityClaimed = true;
      i += 1;
    }
  } else if (headLower === 'all' && i + 1 < tokens.length) {
    quantityHint = {
      value: { kind: 'all' },
      mode: 'lenient',
    };
    quantityClaimed = true;
    i += 1;
  }

  // Quantity + ordinal collision: after consuming the quantity, the
  // residual's leading token is an ordinal. `2nd 3 roses`, `3 2nd
  // roses`, `all 2nd roses` all land here.
  if (quantityClaimed && i < tokens.length && isOrdinalToken(tokens[i]!)) {
    return { rewritten: input, error: COLLISION_ERROR(input) };
  }

  // Try ordinal-prefix rewrite on the (post-quantity) head. Requires
  // (a) at least one more non-ordinal token following, and (b) the
  // head matches either ORDINAL_WORDS or ORDINAL_NUMERIC.
  if (i >= tokens.length) {
    // Quantity consumed everything (shouldn't happen because of the
    // "at least one more token" check, but defensive).
    return { rewritten: input };
  }

  const ordHeadLower = tokens[i]!.toLowerCase();
  let ordinalValue: number | undefined;
  if (GrammarApi.ORDINAL_WORDS.has(ordHeadLower)) {
    ordinalValue = GrammarApi.ORDINAL_WORDS.get(ordHeadLower);
  } else {
    const m = GrammarApi.ORDINAL_NUMERIC.exec(ordHeadLower);
    if (m) ordinalValue = Number.parseInt(m[1]!, 10);
  }

  // Ordinal + quantity collision (other direction): after consuming
  // an ordinal, the residual leads with a count or `all`. Caught
  // before producing a rewrite.
  if (ordinalValue !== undefined && i + 1 < tokens.length) {
    const next = tokens[i + 1]!;
    if (
      isPositiveIntegerToken(next) ||
      next.toLowerCase() === 'all'
    ) {
      return { rewritten: input, error: COLLISION_ERROR(input) };
    }
  }

  if (ordinalValue === undefined) {
    // No ordinal prefix — return the (post-quantity, post-article)
    // residual.
    const out: DesugarResult = { rewritten: tokens.slice(i).join(' ') };
    if (quantityHint) out.quantityHint = quantityHint;
    return out;
  }

  // Standalone ordinal token (`drop second`) — req §9.2 says treat
  // it as a literal keyword. Return the article-stripped form.
  if (i + 1 >= tokens.length) {
    const out: DesugarResult = { rewritten: tokens.slice(i).join(' ') };
    if (quantityHint) out.quantityHint = quantityHint;
    return out;
  }

  const tail = tokens.slice(i + 1).join(' ');
  const out: DesugarResult = { rewritten: `${tail}:[${ordinalValue}]` };
  if (quantityHint) out.quantityHint = quantityHint;
  return out;
}
