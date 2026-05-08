/**
 * MQL lexer — tokenizes raw query text (after the desugar pass) into
 * a stream of typed Tokens consumed by the parser.
 *
 * Reserved character set (per req §1):
 *   `,` `:` `(` `)` `[` `]` `.` `-` `#` `$` `*` `/` `'`
 *   `=` `!=` `>` `<` `>=` `<=`
 *
 * Tricky cases:
 *
 * - **Hyphen** (`-`) is set difference between expressions, but a
 *   literal character inside a bareword. The lexer absorbs `-` into a
 *   bareword only when both the previous and next chars are bareword
 *   chars; standalone `-` is the {@link TokenKind.Dash} operator.
 *
 * - **Hash** (`#`) is shape-dispatched: `#5` lexes as
 *   {@link TokenKind.HashInt} (chain-position ordinal); `#abc123`
 *   lexes as {@link TokenKind.HashId} (stuff id seed). A bare `#`
 *   not glued to digits or an identifier is a lex error.
 *
 * - **Single-quoted literals** (`'…'`) preserve whitespace and have
 *   no escape syntax — the closing quote is the only terminator. An
 *   unterminated literal is a lex error.
 *
 * - **Paths** start with `/` and absorb identifier-shaped characters
 *   plus `*`, `?`, and `-`. The path stops at whitespace, `.`, or any
 *   reserved character that isn't legal inside a path segment.
 *
 * - **Numbers vs. identifiers**: the lexer scans a "word" greedily
 *   (digits, letters, underscores, with `-` mid-word) and then
 *   classifies as {@link TokenKind.Int} when every character is a
 *   digit, {@link TokenKind.Bareword} otherwise. So `5th` lexes as
 *   one bareword, `5` as an int, `oak-door` as one bareword.
 */

export type TokenKind =
  | 'comma'
  | 'colon'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'dot'
  | 'dotdot'
  | 'dash'
  | 'hashInt'
  | 'hashId'
  | 'dollardollar'
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'literal'
  | 'path'
  | 'int'
  | 'bareword'
  | 'transformLetter'
  | 'eof';

/**
 * Single-letter transform candidates. The lexer emits these as the
 * dedicated {@link TokenKind.TransformLetter} kind with the original
 * case preserved in `value` so the parser can dispatch `:i` (shallow)
 * vs `:I` (deep) and `:e` (one level up) vs `:E` (root). At seed
 * position they're treated as a single-letter keyword search by the
 * parser — the case doesn't matter there.
 */
const TRANSFORM_LETTERS: ReadonlySet<string> = new Set(['i', 'I', 'e', 'E']);

export interface Token {
  kind: TokenKind;
  /** Source-text value as it appeared, preserving case for literals
   *  and paths. Barewords are lowercased to match the keyword
   *  invariant (req §13). Operator tokens carry their literal
   *  spelling for diagnostic messages. */
  value: string;
  /** Inclusive start offset into the raw input (UTF-16 code units). */
  start: number;
  /** Exclusive end offset. */
  end: number;
}

export class MqlLexError extends Error {
  constructor(
    message: string,
    public readonly position: number
  ) {
    super(message);
    this.name = 'MqlLexError';
  }
}

const SINGLE_CHAR_TOKENS: Readonly<Record<string, TokenKind>> = {
  ',': 'comma',
  ':': 'colon',
  '(': 'lparen',
  ')': 'rparen',
  '[': 'lbracket',
  ']': 'rbracket',
  '=': 'eq',
};

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isLetter(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function isWordChar(ch: string): boolean {
  return isLetter(ch) || isDigit(ch) || ch === '_';
}

function isPathChar(ch: string): boolean {
  // Path segments accept identifier chars plus `*`, `?`, `-`.
  // `/` is the segment separator, handled at the path-scan boundary.
  return isWordChar(ch) || ch === '*' || ch === '?' || ch === '-' || ch === '/';
}

/**
 * Tokenize `input`. Whitespace is consumed but not emitted. The
 * stream is always terminated with an `eof` token whose start/end
 * point at `input.length`.
 *
 * Throws {@link MqlLexError} on unterminated literals, dangling `#`
 * or `$`, or any unrecognized character.
 */
export function lex(input: string): Token[] {
  const tokens: Token[] = [];
  const n = input.length;
  let i = 0;

  while (i < n) {
    const ch = input[i]!;

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }

    const single = SINGLE_CHAR_TOKENS[ch];
    if (single) {
      tokens.push({ kind: single, value: ch, start: i, end: i + 1 });
      i += 1;
      continue;
    }

    if (ch === '.') {
      if (input[i + 1] === '.') {
        tokens.push({ kind: 'dotdot', value: '..', start: i, end: i + 2 });
        i += 2;
      } else {
        tokens.push({ kind: 'dot', value: '.', start: i, end: i + 1 });
        i += 1;
      }
      continue;
    }

    if (ch === '!') {
      if (input[i + 1] === '=') {
        tokens.push({ kind: 'neq', value: '!=', start: i, end: i + 2 });
        i += 2;
        continue;
      }
      throw new MqlLexError(
        `unexpected '!' at position ${i} — did you mean '!='?`,
        i
      );
    }

    if (ch === '>') {
      if (input[i + 1] === '=') {
        tokens.push({ kind: 'gte', value: '>=', start: i, end: i + 2 });
        i += 2;
      } else {
        tokens.push({ kind: 'gt', value: '>', start: i, end: i + 1 });
        i += 1;
      }
      continue;
    }

    if (ch === '<') {
      if (input[i + 1] === '=') {
        tokens.push({ kind: 'lte', value: '<=', start: i, end: i + 2 });
        i += 2;
      } else {
        tokens.push({ kind: 'lt', value: '<', start: i, end: i + 1 });
        i += 1;
      }
      continue;
    }

    if (ch === '$') {
      if (input[i + 1] === '$') {
        tokens.push({ kind: 'dollardollar', value: '$$', start: i, end: i + 2 });
        i += 2;
        continue;
      }
      throw new MqlLexError(
        `bare '$' at position ${i} — only '$$' (last result) is defined`,
        i
      );
    }

    if (ch === '#') {
      const next = input[i + 1];
      if (next === undefined || (!isDigit(next) && !isLetter(next) && next !== '_')) {
        throw new MqlLexError(
          `bare '#' at position ${i} — expected '#<int>' or '#<id>'`,
          i
        );
      }
      // Scan the identifier body; classify by shape.
      let j = i + 1;
      while (j < n && isWordChar(input[j]!)) j += 1;
      const body = input.slice(i + 1, j);
      const allDigits = /^\d+$/.test(body);
      tokens.push({
        kind: allDigits ? 'hashInt' : 'hashId',
        value: body,
        start: i,
        end: j,
      });
      i = j;
      continue;
    }

    if (ch === "'") {
      const start = i;
      let j = i + 1;
      while (j < n && input[j] !== "'") j += 1;
      if (j >= n) {
        throw new MqlLexError(
          `unterminated string literal starting at position ${start}`,
          start
        );
      }
      tokens.push({
        kind: 'literal',
        value: input.slice(start + 1, j),
        start,
        end: j + 1,
      });
      i = j + 1;
      continue;
    }

    if (ch === '/') {
      const start = i;
      let j = i + 1;
      while (j < n && isPathChar(input[j]!)) j += 1;
      tokens.push({
        kind: 'path',
        value: input.slice(start, j),
        start,
        end: j,
      });
      i = j;
      continue;
    }

    if (ch === '-') {
      // At token start, `-` is always the operator. Mid-bareword `-`
      // is consumed inside scanWord (below) and never reaches here.
      tokens.push({ kind: 'dash', value: '-', start: i, end: i + 1 });
      i += 1;
      continue;
    }

    if (isDigit(ch) || isLetter(ch) || ch === '_') {
      const { token, end } = scanWord(input, i);
      tokens.push(token);
      i = end;
      continue;
    }

    throw new MqlLexError(
      `unexpected character '${ch}' at position ${i}`,
      i
    );
  }

  tokens.push({ kind: 'eof', value: '', start: n, end: n });
  return tokens;
}

/**
 * Scan a word starting at `start`. A word absorbs identifier chars
 * (`[a-zA-Z0-9_]`) and absorbs `-` only when it sits between two
 * identifier chars — preserving `oak-door` as a single bareword while
 * leaving `swords - broken` to lex as `swords`, `dash`, `broken`.
 *
 * Classifies the result: all-digit body → {@link TokenKind.Int},
 * anything else → {@link TokenKind.Bareword} (lowercased).
 */
function scanWord(
  input: string,
  start: number
): { token: Token; end: number } {
  let j = start;
  const n = input.length;
  while (j < n) {
    const ch = input[j]!;
    if (isWordChar(ch)) {
      j += 1;
      continue;
    }
    if (
      ch === '-' &&
      j + 1 < n &&
      isWordChar(input[j + 1]!) &&
      j > start &&
      isWordChar(input[j - 1]!)
    ) {
      j += 1;
      continue;
    }
    break;
  }
  const raw = input.slice(start, j);
  const allDigits = /^\d+$/.test(raw);
  if (allDigits) {
    return {
      token: { kind: 'int', value: raw, start, end: j },
      end: j,
    };
  }
  // Single-letter transform candidates (`i` / `I` / `e` / `E`)
  // get their own token kind with case preserved, so the parser
  // can distinguish `:i` (shallow) from `:I` (deep). Multi-letter
  // words always lowercase — keyword matching is case-insensitive.
  if (TRANSFORM_LETTERS.has(raw)) {
    return {
      token: { kind: 'transformLetter', value: raw, start, end: j },
      end: j,
    };
  }
  return {
    token: { kind: 'bareword', value: raw.toLowerCase(), start, end: j },
    end: j,
  };
}
