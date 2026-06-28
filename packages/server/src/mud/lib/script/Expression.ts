/**
 * Expression — the `( )` expression / query island evaluator.
 *
 * `( )` is where two sublanguages live: **MQL** (`(glass on bar)`,
 * `(gus angry)`) and **infix** comparison/logic (`($hp < 0.2)`,
 * `($a and $b)`). The island decides between them by token shape and
 * returns a {@link ScriptValue} that binds into args / drives `if` /
 * `while` truthiness:
 *
 *  - If the source tokenizes cleanly as **infix** (every token a number,
 *    quoted string, `$var`, `true`/`false`, operator, or paren) it is
 *    evaluated as infix. The operator set is deliberately minimal —
 *    `< > <= >= == !=`, `and` / `or` / `not` — real seam, not a full
 *    precedence engine.
 *  - Otherwise the whole source is an **MQL query**, handed to
 *    `MqlApi.resolveMany` (sync). The result is the `StuffList`; its
 *    **emptiness reads as falsiness** via `ScriptValues.isTruthy`.
 *
 * v1 keeps the two modes clean — pure-infix-over-scalars OR a single MQL
 * query. Mixing logic over MQL sub-queries (`(shaker warm and gus
 * angry)`) is the deferred tail of the minimal-operator set; the seam
 * (MQL delegation + infix) is complete.
 *
 * `$var` operands resolve **frame-first** against the current scope
 * (the shell-fallback path is the command-arg substitution layer, not
 * the infix island). A static-only value-object — the island's one
 * concept, the home that keeps the evaluator out of a free function.
 */

import { MqlApi } from "../../api/mql";
import { ScriptValues } from "./Value";
import type { ScriptValue } from "./Value";
import type { Scope } from "./Scope";
import type { Stuff } from "../stuff/Stuff";
import type { CommandGiver } from "../command/CommandGiver";

/** Default MQL scope for a script `( )` capture — the command default. */
const DEFAULT_MQL_SCOPE = "reachable";

/* ─────────────────────── infix token model ───────────────────── */

type InfixToken =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "var"; name: string }
  | { kind: "bool"; value: boolean }
  | { kind: "op"; op: CmpOp }
  | { kind: "and" }
  | { kind: "or" }
  | { kind: "not" }
  | { kind: "lparen" }
  | { kind: "rparen" };

type CmpOp = "<" | ">" | "<=" | ">=" | "==" | "!=";

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

/**
 * Tokenize `source` as infix. Returns null the moment an unrecognized
 * bareword or character appears — that is the signal the source is an
 * MQL query, not an infix expression.
 */
function tokenizeInfix(source: string): InfixToken[] | null {
  const tokens: InfixToken[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let value = "";
      while (j < source.length && source[j] !== '"') {
        value += source[j];
        j++;
      }
      if (j >= source.length) return null; // unterminated string
      tokens.push({ kind: "str", value });
      i = j + 1;
      continue;
    }
    if (c === "$") {
      let j = i + 1;
      let name = "";
      while (j < source.length && /[A-Za-z0-9_.]/.test(source[j]!)) {
        name += source[j];
        j++;
      }
      if (name === "") return null;
      tokens.push({ kind: "var", name });
      i = j;
      continue;
    }
    if (c === "<" || c === ">" || c === "=" || c === "!") {
      const two = source.slice(i, i + 2);
      if (two === "<=" || two === ">=" || two === "==" || two === "!=") {
        tokens.push({ kind: "op", op: two });
        i += 2;
        continue;
      }
      if (c === "<" || c === ">") {
        tokens.push({ kind: "op", op: c });
        i++;
        continue;
      }
      return null; // bare `=` or `!` — not part of the minimal set
    }
    if (c === "-" || /[0-9]/.test(c)) {
      let j = i;
      let text = "";
      while (j < source.length && /[-0-9.]/.test(source[j]!)) {
        text += source[j];
        j++;
      }
      if (!NUMBER_RE.test(text)) return null;
      tokens.push({ kind: "num", value: Number(text) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      let word = "";
      while (j < source.length && /[A-Za-z0-9_]/.test(source[j]!)) {
        word += source[j];
        j++;
      }
      switch (word) {
        case "and":
          tokens.push({ kind: "and" });
          break;
        case "or":
          tokens.push({ kind: "or" });
          break;
        case "not":
          tokens.push({ kind: "not" });
          break;
        case "true":
          tokens.push({ kind: "bool", value: true });
          break;
        case "false":
          tokens.push({ kind: "bool", value: false });
          break;
        default:
          return null; // a bareword — this is an MQL query, not infix
      }
      i = j;
      continue;
    }
    return null; // any other character — not infix
  }
  return tokens;
}

/* ───────────────────── infix recursive-descent ───────────────── */
//
// Precedence (loosest first): or → and → not → comparison → primary.
// A small hand-rolled cursor; the token list is already validated.

class InfixCursor {
  private pos = 0;
  constructor(
    private readonly tokens: InfixToken[],
    private readonly scope: Scope,
  ) {}

  peek(): InfixToken | undefined {
    return this.tokens[this.pos];
  }

  next(): InfixToken | undefined {
    return this.tokens[this.pos++];
  }

  parse(): ScriptValue {
    const value = this.parseOr();
    return value;
  }

  private parseOr(): ScriptValue {
    let left = this.parseAnd();
    while (this.peek()?.kind === "or") {
      this.next();
      const right = this.parseAnd();
      left = ScriptValues.isTruthy(left) || ScriptValues.isTruthy(right);
    }
    return left;
  }

  private parseAnd(): ScriptValue {
    let left = this.parseNot();
    while (this.peek()?.kind === "and") {
      this.next();
      const right = this.parseNot();
      left = ScriptValues.isTruthy(left) && ScriptValues.isTruthy(right);
    }
    return left;
  }

  private parseNot(): ScriptValue {
    if (this.peek()?.kind === "not") {
      this.next();
      return !ScriptValues.isTruthy(this.parseNot());
    }
    return this.parseCmp();
  }

  private parseCmp(): ScriptValue {
    const left = this.parsePrimary();
    const op = this.peek();
    if (op?.kind === "op") {
      this.next();
      const right = this.parsePrimary();
      return compare(left, op.op, right);
    }
    return left;
  }

  private parsePrimary(): ScriptValue {
    const token = this.next();
    if (token === undefined) return undefined;
    switch (token.kind) {
      case "num":
        return token.value;
      case "str":
        return token.value;
      case "bool":
        return token.value;
      case "var":
        return this.scope.get(token.name);
      case "lparen": {
        const inner = this.parseOr();
        if (this.peek()?.kind === "rparen") this.next();
        return inner;
      }
      default:
        return undefined;
    }
  }
}

/** Apply a comparison operator, coercing numerically where sensible. */
function compare(left: ScriptValue, op: CmpOp, right: ScriptValue): boolean {
  if (op === "==" || op === "!=") {
    const ln = toNumber(left);
    const rn = toNumber(right);
    const equal =
      ln !== null && rn !== null
        ? ln === rn
        : String(scalarOf(left)) === String(scalarOf(right));
    return op === "==" ? equal : !equal;
  }
  const ln = toNumber(left);
  const rn = toNumber(right);
  if (ln === null || rn === null) return false;
  switch (op) {
    case "<":
      return ln < rn;
    case ">":
      return ln > rn;
    case "<=":
      return ln <= rn;
    case ">=":
      return ln >= rn;
  }
}

function toNumber(v: ScriptValue): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v);
    return v.trim() !== "" && !Number.isNaN(n) ? n : null;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return null;
}

function scalarOf(v: ScriptValue): string | number | boolean {
  if (v === undefined) return "";
  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return v;
  }
  return "";
}

export class Expression {
  /**
   * Evaluate a `( )` island's raw inner `source` in `scope` as `actor`.
   * Returns the infix result (boolean / number / string / `$var`
   * value) for an infix expression, or the `StuffList` for an MQL query
   * (empty list when nothing matched — falsy).
   */
  static evaluate(
    source: string,
    scope: Scope,
    actor: Stuff & CommandGiver,
  ): ScriptValue {
    const trimmed = source.trim();
    if (trimmed === "") return undefined;

    const infix = tokenizeInfix(trimmed);
    if (infix !== null && infix.length > 0) {
      return new InfixCursor(infix, scope).parse();
    }

    // MQL query: emptiness is falsiness (ScriptValues.isTruthy([]) ===
    // false). Resolution is synchronous.
    const result = MqlApi.resolveMany(trimmed, {
      commandGiver: actor,
      scope: DEFAULT_MQL_SCOPE,
    });
    return result.stuff;
  }
}
