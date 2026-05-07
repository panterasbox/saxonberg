/**
 * MQL parser — recursive descent over the lexer's token stream into
 * the AST defined in `./types`.
 *
 * Grammar (informal, per req §2):
 *
 *   query        = sublist ("," sublist)*
 *   sublist      = chain ("-" chain)*
 *   chain        = seed (":" chainElement)*
 *   seed         = pronoun | keywords | literal | path
 *                | stuffId | "$$" | "(" query ")"
 *   chainElement = transform | keywords | predicate | ordinal
 *                | bracket | group | seed-shaped
 *   transform    = "i" | "e"
 *   ordinal      = "#" int
 *   bracket      = "[" bracketBody "]"
 *   bracketBody  = ( "-"? int ) ranges? | filterExpr
 *
 * The `.` token is reserved for namespaced atoms inside bracket
 * bodies (`prop.X`, `mixin.X`); it is NOT a chain operator. The old
 * `.X` detail-drill form is gone — `:keyword` mid-chain narrows the
 * prior set with the keyword space auto-extended by detail names at
 * the current `via.detailPath` depth, so `here:bookcase:book` covers
 * the cases the old `.book` form did.
 *
 *   filterExpr   = orExpr
 *   orExpr       = andExpr ("or" andExpr)*
 *   andExpr      = notExpr ("and" notExpr)*
 *   notExpr      = "not" notExpr | atomExpr
 *   atomExpr     = "(" filterExpr ")"
 *                | "has" atom
 *                | atom (cmp value)?
 *   atom         = ident "." ident   ; namespaced
 *                | "name" | "id"     ; bare
 *   value        = int | quoted | ident
 *
 * Positional rules enforced by the parser (not the grammar):
 *
 * - `#5` (ordinal) is rejected at chain head — there's no current
 *   set to index. Allowed at chain non-head as a synonym for `[5]`.
 * - `[…]` is rejected at chain head.
 * - `'literal'` is allowed everywhere a seed is allowed.
 * - Multi-bareword sequences (`red rose`) collapse into one
 *   {@link KeywordsNode}. Consecutive barewords with no operator
 *   between them are AND-narrow keyword filters.
 *
 * `oak-door` parses as one bareword (the lexer absorbed the hyphen).
 * `swords - broken` parses as `Sublist { base: 'swords', subtract:
 * ['broken'] }` — two chains connected by set difference.
 */

import type { Token, TokenKind } from './lexer';
import { lex } from './lexer';
import type {
  AtomNode,
  BracketNode,
  ChainElement,
  ChainNode,
  ChainOp,
  CmpOp,
  ExprNode,
  GroupNode,
  KeywordsNode,
  PronounName,
  PronounNode,
  QueryNode,
  SublistNode,
  TransformNode,
  ValueNode,
} from './types';

export class MqlParseError extends Error {
  constructor(
    message: string,
    public readonly position: number
  ) {
    super(message);
    this.name = 'MqlParseError';
  }
}

const PRONOUN_NAMES: ReadonlySet<PronounName> = new Set<PronounName>([
  'me',
  'here',
  'it',
  'them',
  'him',
  'her',
]);

/**
 * Parse `input` (raw text, post-desugar) into an AST. Convenience
 * wrapper that lexes and parses in one call.
 */
export function parse(input: string): QueryNode {
  const tokens = lex(input);
  return parseTokens(tokens);
}

/**
 * Parse an already-tokenized stream. Useful when callers want to
 * preprocess tokens or share a cached lexer pass.
 */
export function parseTokens(tokens: Token[]): QueryNode {
  const p = new Parser(tokens);
  return p.parseQuery();
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  // ----- token helpers -------------------------------------------------

  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset]!;
  }

  private peekKind(kind: TokenKind, offset = 0): boolean {
    return this.peek(offset).kind === kind;
  }

  private advance(): Token {
    return this.tokens[this.pos++]!;
  }

  private expect(kind: TokenKind, hint?: string): Token {
    const t = this.peek();
    if (t.kind !== kind) {
      throw new MqlParseError(
        `expected ${hint ?? kind} but got ${describe(t)}`,
        t.start
      );
    }
    return this.advance();
  }

  private match(kind: TokenKind): boolean {
    if (this.peek().kind === kind) {
      this.advance();
      return true;
    }
    return false;
  }

  // ----- top-level -----------------------------------------------------

  public parseQuery(): QueryNode {
    if (this.peekKind('eof')) {
      throw new MqlParseError('empty query', 0);
    }
    const sublists: SublistNode[] = [this.parseSublist()];
    while (this.match('comma')) {
      sublists.push(this.parseSublist());
    }
    if (!this.peekKind('eof')) {
      const t = this.peek();
      throw new MqlParseError(
        `unexpected ${describe(t)} after query`,
        t.start
      );
    }
    return { kind: 'query', sublists };
  }

  private parseSublist(): SublistNode {
    const base = this.parseChain();
    const subtract: ChainNode[] = [];
    while (this.peekKind('dash')) {
      this.advance();
      subtract.push(this.parseChain());
    }
    return { kind: 'sublist', base, subtract };
  }

  // ----- chain ---------------------------------------------------------

  private parseChain(): ChainNode {
    const head = this.parseSeed();
    const rest: ChainOp[] = [];
    while (this.peekKind('colon')) {
      this.advance();
      rest.push({ op: ':', element: this.parseChainElement() });
    }
    // The `.X` detail-drill operator was removed — detail navigation
    // is uniform with keyword filtering now (`here:bookcase:book`).
    // Catch the old form and give a useful diagnostic.
    if (this.peekKind('dot')) {
      const t = this.peek();
      throw new MqlParseError(
        "the '.X' detail-drill operator is gone — use ':X' instead (e.g., 'here:bookcase:book')",
        t.start
      );
    }
    return { kind: 'chain', head, rest };
  }

  /**
   * Seed parser. Rejects positions where a seed makes no sense: bare
   * `#int` ordinal, leading `[…]`. Multi-bareword runs collapse into
   * a {@link KeywordsNode}; if the run is exactly one of the pronoun
   * names, it's tagged as a {@link PronounNode} instead.
   */
  private parseSeed(): ChainElement {
    const t = this.peek();
    switch (t.kind) {
      case 'bareword':
        return this.parseKeywordsOrPronoun();
      case 'literal':
        this.advance();
        return { kind: 'literal', value: t.value };
      case 'path':
        this.advance();
        return { kind: 'path', pattern: t.value };
      case 'hashId':
        this.advance();
        return { kind: 'stuffId', id: t.value };
      case 'hashInt':
        throw new MqlParseError(
          `'#${t.value}' is not valid at the head of a chain — ordinals require a current set; use '[${t.value}]' or place this after a chain element`,
          t.start
        );
      case 'dollardollar':
        this.advance();
        return { kind: 'lastResult' };
      case 'lparen':
        return this.parseGroup();
      case 'lbracket':
        throw new MqlParseError(
          '[…] cannot start a chain — brackets index or filter an existing set',
          t.start
        );
      case 'int':
        // Naked int at seed position is meaningless. Consume to give
        // a useful error message.
        throw new MqlParseError(
          `bare integer '${t.value}' is not valid at the head of a chain`,
          t.start
        );
      default:
        throw new MqlParseError(
          `unexpected ${describe(t)} at the start of a query`,
          t.start
        );
    }
  }

  /**
   * Greedy parse of a sequence of consecutive barewords into one
   * keyword node. Pronoun names appearing alone are tagged as
   * {@link PronounNode}; everything else stays as
   * {@link KeywordsNode}.
   */
  private parseKeywordsOrPronoun(): PronounNode | KeywordsNode {
    const words: string[] = [];
    while (this.peekKind('bareword')) {
      words.push(this.advance().value);
    }
    if (words.length === 1 && PRONOUN_NAMES.has(words[0] as PronounName)) {
      return { kind: 'pronoun', name: words[0] as PronounName };
    }
    return { kind: 'keywords', words };
  }

  private parseGroup(): GroupNode {
    this.expect('lparen');
    const inner = this.parseInnerQuery();
    this.expect('rparen', "')'");
    return { kind: 'group', query: inner };
  }

  /**
   * Parse a query that's expected to end at `)`. Same shape as
   * {@link parseQuery} but doesn't require EOF and doesn't reject
   * trailing commas as "after query."
   */
  private parseInnerQuery(): QueryNode {
    const sublists: SublistNode[] = [this.parseSublist()];
    while (this.match('comma')) {
      sublists.push(this.parseSublist());
    }
    return { kind: 'query', sublists };
  }

  /**
   * Parse a chain element introduced by `:`. May be a transform
   * (single-letter `i`/`e`), a keyword filter (everything else
   * bareword-shaped), an ordinal (`#5`), a bracket, a group, or a
   * non-keyword seed.
   */
  private parseChainElement(): ChainElement {
    const t = this.peek();
    switch (t.kind) {
      case 'bareword':
        return this.parseChainBarewords();
      case 'literal':
        this.advance();
        return { kind: 'literal', value: t.value };
      case 'path':
        this.advance();
        return { kind: 'path', pattern: t.value };
      case 'hashId':
        this.advance();
        return { kind: 'stuffId', id: t.value };
      case 'hashInt': {
        this.advance();
        const n = Number.parseInt(t.value, 10);
        return { kind: 'ordinal', index: n };
      }
      case 'dollardollar':
        this.advance();
        return { kind: 'lastResult' };
      case 'lparen':
        return this.parseGroup();
      case 'lbracket':
        return this.parseBracket();
      default:
        throw new MqlParseError(
          `expected a chain element after ':' but got ${describe(t)}`,
          t.start
        );
    }
  }

  /**
   * Parse barewords at chain non-head position. A single bareword
   * matching a transform letter (`i`/`e`) is the corresponding
   * transform; otherwise the run is a keyword filter.
   */
  private parseChainBarewords(): TransformNode | KeywordsNode {
    const words: string[] = [];
    while (this.peekKind('bareword')) {
      words.push(this.advance().value);
    }
    if (words.length === 1 && (words[0] === 'i' || words[0] === 'e')) {
      return { kind: 'transform', transform: words[0] };
    }
    return { kind: 'keywords', words };
  }

  // ----- brackets ------------------------------------------------------

  /**
   * Bracket body dispatch (req §4.2): the first token decides whether
   * this is an ordinal/range index (`[5]`, `[1..3]`, `[-1]`) or a
   * filter expression (`[prop.gold > 5]`).
   */
  private parseBracket(): BracketNode {
    this.expect('lbracket');
    const t = this.peek();
    let bracket: BracketNode;
    if (t.kind === 'int' || (t.kind === 'dash' && this.peek(1).kind === 'int')) {
      bracket = this.parseBracketIndex();
    } else {
      bracket = { kind: 'bracket-filter', expr: this.parseFilterExpr() };
    }
    this.expect('rbracket', "']'");
    return bracket;
  }

  private parseBracketIndex(): BracketNode {
    const start = this.parseSignedInt();
    if (this.peekKind('rbracket')) {
      return { kind: 'bracket-ordinal', index: start };
    }
    if (this.peekKind('dotdot')) {
      this.advance();
      // `[N..]` — to-end range.
      if (this.peekKind('rbracket')) {
        return {
          kind: 'bracket-range',
          start,
          end: null,
          mode: 'to-end',
        };
      }
      // `[N..<M]` — count-from-end range.
      if (this.peekKind('lt')) {
        this.advance();
        const end = this.parseSignedInt();
        return { kind: 'bracket-range', start, end, mode: 'from-end' };
      }
      // `[N..M]` — inclusive range.
      const end = this.parseSignedInt();
      return { kind: 'bracket-range', start, end, mode: 'inclusive' };
    }
    const t = this.peek();
    throw new MqlParseError(
      `expected ']' or '..' after integer in bracket but got ${describe(t)}`,
      t.start
    );
  }

  private parseSignedInt(): number {
    let sign = 1;
    if (this.peekKind('dash')) {
      this.advance();
      sign = -1;
    }
    const t = this.expect('int', 'integer');
    return sign * Number.parseInt(t.value, 10);
  }

  // ----- filter expressions -------------------------------------------

  private parseFilterExpr(): ExprNode {
    return this.parseOrExpr();
  }

  private parseOrExpr(): ExprNode {
    let left = this.parseAndExpr();
    while (this.peekKind('bareword') && this.peek().value === 'or') {
      this.advance();
      const right = this.parseAndExpr();
      left = { kind: 'or', left, right };
    }
    return left;
  }

  private parseAndExpr(): ExprNode {
    let left = this.parseNotExpr();
    while (this.peekKind('bareword') && this.peek().value === 'and') {
      this.advance();
      const right = this.parseNotExpr();
      left = { kind: 'and', left, right };
    }
    return left;
  }

  private parseNotExpr(): ExprNode {
    if (this.peekKind('bareword') && this.peek().value === 'not') {
      this.advance();
      return { kind: 'not', child: this.parseNotExpr() };
    }
    return this.parseAtomExpr();
  }

  private parseAtomExpr(): ExprNode {
    if (this.peekKind('lparen')) {
      this.advance();
      const inner = this.parseFilterExpr();
      this.expect('rparen', "')'");
      return inner;
    }
    if (this.peekKind('bareword') && this.peek().value === 'has') {
      this.advance();
      return { kind: 'has', atom: this.parseAtom() };
    }
    const left = this.parseAtom();
    const cmp = this.peekCmp();
    if (cmp) {
      this.advance();
      const right = this.parseValue();
      return { kind: 'comparison', left, op: cmp, right };
    }
    return { kind: 'truthy', atom: left };
  }

  private peekCmp(): CmpOp | null {
    const k = this.peek().kind;
    switch (k) {
      case 'eq':
        return '=';
      case 'neq':
        return '!=';
      case 'gt':
        return '>';
      case 'lt':
        return '<';
      case 'gte':
        return '>=';
      case 'lte':
        return '<=';
      default:
        return null;
    }
  }

  private parseAtom(): AtomNode {
    const t = this.peek();
    if (t.kind !== 'bareword') {
      throw new MqlParseError(
        `expected an atom (name, id, or namespaced filter) but got ${describe(t)}`,
        t.start
      );
    }
    this.advance();
    if (this.peekKind('dot')) {
      this.advance();
      const key = this.expect('bareword', 'namespace key');
      return { kind: 'namespaced', namespace: t.value, key: key.value };
    }
    if (t.value === 'name') return { kind: 'name' };
    if (t.value === 'id') return { kind: 'id' };
    throw new MqlParseError(
      `'${t.value}' is not a known atom — expected 'name', 'id', or namespaced 'X.Y'`,
      t.start
    );
  }

  private parseValue(): ValueNode {
    const t = this.peek();
    if (t.kind === 'int') {
      this.advance();
      return { kind: 'value-int', value: Number.parseInt(t.value, 10) };
    }
    if (t.kind === 'dash' && this.peek(1).kind === 'int') {
      this.advance();
      const intT = this.advance();
      return {
        kind: 'value-int',
        value: -Number.parseInt(intT.value, 10),
      };
    }
    if (t.kind === 'literal') {
      this.advance();
      return { kind: 'value-quoted', value: t.value };
    }
    if (t.kind === 'bareword') {
      this.advance();
      return { kind: 'value-ident', value: t.value };
    }
    throw new MqlParseError(
      `expected a value (int, quoted, or ident) but got ${describe(t)}`,
      t.start
    );
  }
}

function describe(t: Token): string {
  if (t.kind === 'eof') return 'end of input';
  if (t.kind === 'bareword') return `bareword '${t.value}'`;
  if (t.kind === 'literal') return `literal '${t.value}'`;
  if (t.kind === 'path') return `path '${t.value}'`;
  if (t.kind === 'int') return `integer '${t.value}'`;
  if (t.kind === 'hashId') return `'#${t.value}'`;
  if (t.kind === 'hashInt') return `'#${t.value}'`;
  return `'${t.value}'`;
}
