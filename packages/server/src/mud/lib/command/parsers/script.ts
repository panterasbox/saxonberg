/**
 * script — the command-native scripting parser.
 *
 * A `Parser` (the pluggable seam — `shell.parser`) that turns input
 * into either a bare command (delegated to `msh`, byte-identical) or a
 * `Script` AST for the interpreter. It **wraps** `msh`, it does not
 * replace it:
 *
 *  - Line-start `;` / `:` emote sigils and any input with **no top-level
 *    statement separator and no standalone `{ }` block** are handed
 *    straight to `msh` and returned as `{ parsed }` — the bare-command
 *    fast path, parsing identically to today (the backward-compat
 *    guarantee, mechanical because it *is* msh).
 *  - Input with a top-level separator (`;` / newline) or a standalone
 *    block is parsed to a `Script` AST and returned as `{ script }`.
 *
 * **The tokenizer is recursive / delegating, never a flat re-tokenize.**
 * The only genuinely-new lexical work is: statement separators,
 * standalone `{ }` blocks, balanced `( )` / `{ }` slicing, and `$name`.
 * Everything else is honored by *delegation*:
 *
 *  - **`|` stays reserved** — lexed as a pipe marker into the
 *    pipe-shaped `Pipeline` node; v1 executes single-command pipelines
 *    only (multi-stage piping deferred).
 *  - **`;` / newline are separators** *between* statements. A literal
 *    `;` inside a quoted field stays literal (the bash rule — `say "a;
 *    b"` is one command; `say a; b` is two statements).
 *  - **`( )` delegates to MQL + infix.** A boundary `(` slices the
 *    balanced region and stores its **raw inner text** as an `Expr`
 *    node; it is *not* re-tokenized at the script level (the
 *    interpreter hands it to MQL / the infix evaluator at eval).
 *  - **`{ }` disambiguates by attachment.** A `{` at a token boundary
 *    (whitespace-delimited) is a standalone block; a `{` *glued* after a
 *    token (e.g. MQL's `coin:{5}`, `water:{2 cups}`) is consumed
 *    verbatim into the word, brackets and inner spaces intact, for
 *    `msh` / MQL to handle downstream.
 *  - **`$` extends, does not fork, the shell variable namespace.**
 *    `$name` / `${name}` become `VarRef` nodes the interpreter resolves
 *    frame-first, then falls back to `ShellApi.expandVariables`.
 *
 * A block's inner text is **parsed once** into a `Script` fragment (the
 * anti-Tcl keystone — never a re-scanned string).
 *
 * Module-category note: this is the **Parser** convention file
 * (`lib/command/parsers/<name>.ts`, the `msh` precedent). All lexing /
 * parsing lives in module-private free functions; the sole export is
 * the default `Parser` value.
 */

import type { Parser, ParseResult, ParserContext } from "../../../api/command";
import type { Script, Pipeline, Command, Arg } from "../../script/ast";
import msh, { detectEmotePrefix } from "./msh";

/* ──────────────────────────── lexer ──────────────────────────── */

type ScriptToken =
  | { kind: "word"; value: string }
  | { kind: "var"; name: string }
  | { kind: "expr"; source: string }
  | { kind: "block"; source: string }
  | { kind: "sep" }
  | { kind: "pipe" };

/** Inline whitespace (NOT newline — newline is a statement separator). */
function isInlineSpace(ch: string | undefined): boolean {
  return ch === " " || ch === "\t" || ch === "\r";
}

function isNameStart(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z_]/.test(ch);
}

function isNameChar(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9_.]/.test(ch);
}

const OPENERS: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
const CLOSERS = new Set([")", "}", "]"]);

/**
 * From an opening bracket at `open`, return the inner text and the index
 * just past the matching close. Tracks all bracket kinds as one balanced
 * system and respects `"..."` quoting (a close inside a string does not
 * count). Returns null when the region never closes.
 */
function sliceBalanced(
  input: string,
  open: number,
): { inner: string; end: number } | null {
  let depth = 0;
  let i = open;
  while (i < input.length) {
    const c = input[i]!;
    if (c === '"') {
      i = skipQuoted(input, i);
      continue;
    }
    if (c in OPENERS) {
      depth++;
      i++;
      continue;
    }
    if (CLOSERS.has(c)) {
      depth--;
      if (depth === 0) {
        return { inner: input.substring(open + 1, i), end: i + 1 };
      }
      i++;
      continue;
    }
    i++;
  }
  return null;
}

/** Index just past a `"..."` run starting at `pos` (lenient on EOF). */
function skipQuoted(input: string, pos: number): number {
  let i = pos + 1;
  while (i < input.length) {
    if (input[i] === "\\") {
      i += 2;
      continue;
    }
    if (input[i] === '"') return i + 1;
    i++;
  }
  return input.length;
}

/**
 * Read a verbatim word starting at `start`. Stops at an unquoted
 * inline-space / separator (`;` / newline) / `|`. A `"..."` run is
 * copied verbatim (quotes intact); a **glued** bracket region
 * (`{`/`(`/`[` mid-word — MQL quantity, glued parens) is balance-sliced
 * and copied verbatim, inner spaces and brackets intact. Returns the
 * raw slice and the end index.
 */
function readWord(input: string, start: number): { value: string; end: number } {
  let i = start;
  while (i < input.length) {
    const c = input[i]!;
    if (isInlineSpace(c) || c === ";" || c === "\n" || c === "|") break;
    if (c === '"') {
      i = skipQuoted(input, i);
      continue;
    }
    if (c in OPENERS) {
      // Glued bracket (we are mid-word): consume the balanced region
      // verbatim so MQL's `:{N unit}` / glued parens survive intact.
      const sliced = sliceBalanced(input, i);
      if (sliced === null) {
        // Unbalanced glued bracket: take the rest verbatim, lenient.
        i = input.length;
        break;
      }
      i = sliced.end;
      continue;
    }
    i++;
  }
  return { value: input.substring(start, i), end: i };
}

/** Lex the full input into the script token stream, or an error. */
function lexScript(input: string): { tokens: ScriptToken[] } | { error: string } {
  const tokens: ScriptToken[] = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && isInlineSpace(input[i])) i++;
    if (i >= input.length) break;
    const c = input[i]!;

    if (c === ";" || c === "\n") {
      tokens.push({ kind: "sep" });
      i++;
      continue;
    }
    if (c === "|") {
      tokens.push({ kind: "pipe" });
      i++;
      continue;
    }
    if (c === "(") {
      const sliced = sliceBalanced(input, i);
      if (sliced === null) return { error: "Unbalanced '(' in expression" };
      tokens.push({ kind: "expr", source: sliced.inner });
      i = sliced.end;
      continue;
    }
    if (c === "{") {
      // Boundary `{` (we are at a token start): a standalone block.
      const sliced = sliceBalanced(input, i);
      if (sliced === null) return { error: "Unbalanced '{' in block" };
      tokens.push({ kind: "block", source: sliced.inner });
      i = sliced.end;
      continue;
    }
    if (c === "$") {
      const next = input[i + 1];
      if (next === "{") {
        const close = input.indexOf("}", i + 2);
        if (close === -1) return { error: "Unbalanced '${' variable" };
        tokens.push({ kind: "var", name: input.substring(i + 2, close) });
        i = close + 1;
        continue;
      }
      if (isNameStart(next)) {
        let j = i + 1;
        while (j < input.length && isNameChar(input[j])) j++;
        tokens.push({ kind: "var", name: input.substring(i + 1, j) });
        i = j;
        continue;
      }
      // A bare `$` (not a variable): fall through to word-reading.
    }
    const word = readWord(input, i);
    tokens.push({ kind: "word", value: word.value });
    i = word.end;
  }
  return { tokens };
}

/* ──────────────────────────── parser ─────────────────────────── */

/** Parse raw script text into a `Script` AST (recursive for blocks). */
function parseScriptText(text: string): { ast: Script } | { error: string } {
  const lexed = lexScript(text);
  if ("error" in lexed) return lexed;
  return buildScript(lexed.tokens);
}

/** Build a `Script` from a token stream. */
function buildScript(
  tokens: ScriptToken[],
): { ast: Script } | { error: string } {
  const statements: Pipeline[] = [];
  for (const group of splitOn(tokens, "sep")) {
    if (group.length === 0) continue; // empty statement (e.g. trailing ';')
    const pipeline = buildPipeline(group);
    if ("error" in pipeline) return pipeline;
    statements.push(pipeline.value);
  }
  return { ast: { kind: "script", statements } };
}

/** Build a `Pipeline` (one-or-more commands split on `|`). */
function buildPipeline(
  tokens: ScriptToken[],
): { value: Pipeline } | { error: string } {
  const commands: Command[] = [];
  for (const group of splitOn(tokens, "pipe")) {
    if (group.length === 0) {
      return { error: "Empty command in pipeline" };
    }
    const command = buildCommand(group);
    if ("error" in command) return command;
    commands.push(command.value);
  }
  return { value: { kind: "pipeline", commands } };
}

/** Build a `Command` (verb word + args) from a token group. */
function buildCommand(
  tokens: ScriptToken[],
): { value: Command } | { error: string } {
  const head = tokens[0]!;
  if (head.kind !== "word" || head.value === "") {
    return { error: "Statement does not begin with a command word" };
  }
  const args: Arg[] = [];
  for (let k = 1; k < tokens.length; k++) {
    const arg = tokenToArg(tokens[k]!);
    if ("error" in arg) return arg;
    args.push(arg.value);
  }
  return { value: { kind: "command", word: head.value, args } };
}

/** Convert one argument token to an `Arg` node (parsing blocks once). */
function tokenToArg(token: ScriptToken): { value: Arg } | { error: string } {
  switch (token.kind) {
    case "word":
      return { value: { kind: "literal", value: token.value } };
    case "var":
      return { value: { kind: "var", name: token.name } };
    case "expr":
      return { value: { kind: "expr", source: token.source } };
    case "block": {
      const body = parseScriptText(token.source);
      if ("error" in body) return body;
      return { value: { kind: "block", body: body.ast } };
    }
    case "sep":
    case "pipe":
      return { error: "Unexpected separator in argument position" };
  }
}

/** Split a token list on a given separator kind into sub-lists. */
function splitOn(
  tokens: ScriptToken[],
  on: "sep" | "pipe",
): ScriptToken[][] {
  const groups: ScriptToken[][] = [];
  let acc: ScriptToken[] = [];
  for (const t of tokens) {
    if (t.kind === on) {
      groups.push(acc);
      acc = [];
      continue;
    }
    acc.push(t);
  }
  groups.push(acc);
  return groups;
}

/* ──────────────────────────── Parser ─────────────────────────── */

const script: Parser = {
  name: "script",

  parse(text: string, context: ParserContext): ParseResult | Promise<ParseResult> {
    // Emote sigil (`;smile` / `:smile`) at line-start: hand the whole
    // input to msh, which strips the sigil and sets `emotePrefixed`.
    // Must short-circuit BEFORE lexing so a leading `;` isn't read as a
    // separator.
    if (detectEmotePrefix(text)) {
      return msh.parse(text, context);
    }

    const lexed = lexScript(text);
    if ("error" in lexed) return { error: lexed.error };

    const hasSep = lexed.tokens.some((t) => t.kind === "sep");
    const hasBlock = lexed.tokens.some((t) => t.kind === "block");

    // Bare-command fast path: no statement separator, no standalone
    // block → msh parses it byte-identically. `( )` / `$` in a plain
    // command ride msh / `expandVariables` exactly as today; only the
    // genuinely-script shapes enter the interpreter.
    if (!hasSep && !hasBlock) {
      return msh.parse(text, context);
    }

    const built = buildScript(lexed.tokens);
    if ("error" in built) return { error: built.error };
    return { script: { ast: built.ast } };
  },
};

export default script;
