/**
 * Parser abstraction for command-line ingress.
 *
 * The dispatcher (`CommandGiverMixin.executeCommand`) is parametric
 * over a parser. Different parsers turn raw input text into one of
 * three results:
 *
 *   - `parsed`  — a tokenized `ParsedCommand`. The dispatcher then
 *                 runs the full pipeline: match-verb → assemble →
 *                 resolveAndValidate → execute. Use this when the
 *                 parser does shell-style tokenization (the default
 *                 `msh` parser is here).
 *
 *   - `bound`   — a `{command, model}` pair already chosen by the
 *                 parser. The dispatcher skips match/assemble and
 *                 runs only resolveAndValidate → execute. Use this
 *                 for parsers that decide intent themselves
 *                 (LLM-driven natural-language parsing, gesture
 *                 input, voice, …).
 *
 *   - `error`   — input couldn't be parsed; the summary is shown to
 *                 the actor via the standard auto-emit path.
 *
 * Parsers are referenced by spec (bare name → `/lib/parsers/<name>`,
 * or absolute path `/X` → `<src>/mud/X.ts`). Resolution uses the
 * JS module cache; no bespoke registry. See
 * `CommandApi.resolveParser`.
 *
 * The parser the dispatcher uses is read from the `shell.parser`
 * setting on the actor when their host composes EnvironmentMixin;
 * otherwise the framework default (`msh`) is used.
 */

import type { CommandDefinition } from '../lib/command/CommandDefinition';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type { Location } from '../lib/stuff/Location';
import type { Stuff } from '../lib/stuff/Stuff';
import type { ParsedCommand } from './command-line';
import type { ModelData } from './command';

/** Parser-side context — what a parser may look at to decide intent. */
export interface ParserContext {
  /**
   * The actor running the command. NL parsers may want this for
   * disambiguation (e.g. "look at MY sword" vs "look at her sword").
   */
  commandGiver: Stuff & CommandGiver;
  /** The actor's current location — surface for disambiguation. */
  location: Location;
  /**
   * Available command definitions on the actor's recency stack —
   * the universe of verbs the parser is allowed to choose from.
   * Pre-filtered so the parser can ignore definitions the actor
   * can't actually fire.
   */
  available: CommandDefinition[];
}

/**
 * Result a parser yields. Exactly one of `parsed`, `bound`, or
 * `error` should be set; the dispatcher dispatches on the first
 * non-undefined field.
 */
export interface ParseResult {
  /** Tokenizer-level output: full pipeline runs from here. */
  parsed?: ParsedCommand;
  /**
   * Model-level output: parser already chose the command and
   * built the model. Only `resolveAndValidate` + `execute` run.
   */
  bound?: {
    command: CommandDefinition;
    model: ModelData;
  };
  /** Parse failure surfaced to the actor as a command-outcome warn. */
  error?: string;
}

/**
 * Parser contract. A parser is a stateless transform from
 * `(text, context) → ParseResult`. Implementations live in
 * `mud/lib/parsers/<name>.ts` and default-export a `Parser` value.
 */
export interface Parser {
  /** Display name, also the spec under `/lib/parsers/<name>`. */
  name: string;
  /** Parse the raw input. May be sync or async. */
  parse(
    text: string,
    context: ParserContext
  ): ParseResult | Promise<ParseResult>;
}
