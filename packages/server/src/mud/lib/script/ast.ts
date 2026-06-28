/**
 * Script AST — the parsed shape of a script in the command-native
 * language. Pure data; no behavior. Produced by the script parser
 * (`lib/command/parsers/script.ts`, P1) and walked by the interpreter
 * (`Interpreter.ts`, P2).
 *
 * The grammar (verbatim from the scripting slate):
 *
 * ```
 * script   := pipeline ( sep pipeline )*
 * pipeline := command ( "|" command )*      # v1 executes single-command only
 * command  := word arg*
 * arg      := literal | "$" name | "(" expr ")" | "{" block "}" | objectref
 * ```
 *
 * Two forward-compat commitments are baked into these types:
 *
 *  1. **The `Pipeline` node is mandatory even in v1.** A statement is a
 *     one-or-more `Command` pipeline; v1 only ever *executes* a
 *     single-command pipeline (multi-stage piping is deferred whole),
 *     but the AST is already pipe-shaped so piping lights up execution,
 *     not a re-parse.
 *  2. **`objectref` folds into `Literal`.** A bareword that names an
 *     object (`shaker`, `gin`) is a `Literal` whose text the command
 *     field resolves via MQL at the field's declared scope — there is
 *     no distinct runtime node for it. Keeping the arg union to four
 *     shapes (literal / var / expr / block) is deliberate; the field's
 *     `type: object` is what makes a literal an object reference.
 *
 * This is a vocabulary/type module (lowercase filename per the
 * Module-Categories rule — the `ast.ts` shape mirrors MQL's own
 * lowercase pipeline-internal type files).
 */

/** Top-level parsed script: an ordered list of statements (pipelines). */
export interface Script {
  kind: "script";
  statements: Pipeline[];
}

/**
 * One statement: a pipeline of one-or-more commands. In v1 `commands`
 * always has length 1 (multi-stage execution is NYI, matching the
 * tokenizer's existing single-command-only pipeline). `|` is reserved
 * and parsed into this node; it just isn't *run* across stages yet.
 */
export interface Pipeline {
  kind: "pipeline";
  commands: Command[];
}

/** A single command invocation: a verb word plus its evaluated args. */
export interface Command {
  kind: "command";
  /** The verb (first word). Drives affordance match + builtin dispatch. */
  word: string;
  /** Ordered argument list. */
  args: Arg[];
  /**
   * True when the source statement led with a `;` / `:` emote sigil
   * (line-start of the first statement only). Carried so the
   * interpreter can route a catalog miss to free-form emote exactly as
   * `msh` does. Absent for ordinary commands.
   */
  emotePrefixed?: boolean;
}

/** Argument node union. */
export type Arg = Literal | VarRef | Expr | Block;

/**
 * A literal word. `value` holds the verbatim source slice (quotes and
 * escapes intact) so the interpreter can re-feed it to `msh` for
 * byte-identical tokenization when rendering the command for dispatch.
 * Also the home of `objectref` — a bareword naming an object is a
 * `Literal` the field resolves via MQL.
 */
export interface Literal {
  kind: "literal";
  value: string;
}

/** `$name` — a variable reference resolved frame-first, shell-fallback. */
export interface VarRef {
  kind: "var";
  name: string;
}

/**
 * `( … )` — the expression / query island. Holds the **raw inner text**
 * (not re-tokenized at the script level); the interpreter's expression
 * evaluator (P2) hands it to MQL for set queries or evaluates infix
 * comparison/logic itself.
 */
export interface Expr {
  kind: "expr";
  source: string;
}

/**
 * `{ … }` — a standalone block. The keystone value. Its body is the
 * inner text **parsed once** into a `Script` fragment at parse time
 * (never a re-scanned string — the explicit anti-Tcl decision). At eval
 * the interpreter wraps this body + the current scope into a runtime
 * `Block` value (see `Block.ts`).
 */
export interface Block {
  kind: "block";
  body: Script;
}
