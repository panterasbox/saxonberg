/**
 * builtins — the scripting builtin verb vocabulary.
 *
 * Control flow and `def` are **not grammar** — they are ordinary
 * commands (`word arg*`) that the interpreter recognizes and evaluates
 * itself, with **raw (unevaluated) block / condition args**. That lazy,
 * unevaluated handling is exactly why they are interpreter-intrinsic and
 * not bus-dispatched YAML verbs: the standard dispatch path eagerly
 * resolves every arg, which would force a block to a value and a
 * condition to run before `if` could choose. Every *other* verb goes
 * over the bus.
 *
 * This module owns only the **vocabulary** (the name set + its
 * membership predicate — the "enum-like vocabulary + its validation
 * array" category). The handler logic lives on the `Interpreter` (the
 * concept that owns evaluation), since each builtin needs the
 * interpreter's internals (block invocation, scope, the def registry,
 * step accounting). The grammar stays the boundary: this set is fixed
 * and small; growing the language is adding affordance verbs (over the
 * bus) or, rarely, a new intrinsic builtin (authored, out-of-band).
 *
 * The temporal builtins (`wait` / `every` / `when`, P5) join this set
 * when coroutine suspension lands.
 */

/** The control-flow + binding builtins recognized by the interpreter. */
export const SCRIPT_BUILTINS = [
  "set",
  "if",
  "each",
  "while",
  "def",
] as const;

/** A builtin verb name. */
export type ScriptBuiltin = (typeof SCRIPT_BUILTINS)[number];

const BUILTIN_SET: ReadonlySet<string> = new Set(SCRIPT_BUILTINS);

/** Membership predicate + narrowing for the builtin vocabulary. */
export class ScriptBuiltins {
  /** True iff `word` is an interpreter-intrinsic builtin verb. */
  static isBuiltin(word: string): word is ScriptBuiltin {
    return BUILTIN_SET.has(word);
  }
}
