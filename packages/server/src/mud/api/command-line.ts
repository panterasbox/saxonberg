/**
 * CommandLineApi — pure tokenizer for the command pipeline.
 *
 * Yields a `ParsedPipeline` (one or more `ParsedCommand`s split on
 * unquoted `|`). Pipelines with more than one command throw NYI at
 * parse time — pipe execution is deferred. Single-quote `'` is a
 * literal character, not a quoting form: chat-driven worlds use
 * apostrophes constantly. Double-quote `"..."` is the only quoting
 * form; escapes inside `"..."` cover `\"`, `\\`, `\n`, `\t`, `\r`.
 * Outside any quoting, `\` escapes whitespace, `\`, `"`, and `|`
 * literally; any other `\X` is kept verbatim.
 *
 * Adjacent-quoted concatenation is supported (`--name="hello "world`
 * → one token `--name=hello world`) so quoted segments can adjoin
 * literal characters bash-style.
 *
 * The tokenizer is YAML-unaware: it produces a stream of low-level
 * `RawToken`s (word / short-flags / long-flag / long-with-value /
 * stop-options) plus the original source slice. The matching layer
 * (`CommandApi.assemble`) binds these to a `CommandDefinition`.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { CommandLineLogic } from '../obj/api/CommandLineLogic';
import { fileURLToPath } from 'url';

/**
 * Classified raw token. The matcher binds these to a YAML definition.
 *
 * `raw` is the verbatim slice of the original input the token came
 * from; `pos` is its byte offset. Both are used by the matcher to
 * reconstruct greedy-field text by slicing the original input from
 * the position immediately after the last consumed token.
 */
export type RawToken =
  | { kind: 'word'; value: string; raw: string; pos: number }
  | { kind: 'short-flags'; flags: string; raw: string; pos: number }
  | { kind: 'long-flag'; name: string; raw: string; pos: number }
  | {
      kind: 'long-with-value';
      name: string;
      value: string;
      raw: string;
      pos: number;
    }
  | { kind: 'stop-options'; raw: string; pos: number };

/** One command — verb at index 0 plus the rest of its tokens. */
export interface ParsedCommand {
  verb: string;
  rawTokens: RawToken[];
  /** Slice of original input this command came from (pre-pipe split). */
  source: string;
  /** Byte offset of `source` in the full pipeline input. */
  start: number;
  /**
   * True when the input began with a `:` or `;` sigil followed by a
   * non-whitespace verb word. The sigil has been stripped by the
   * parser; the verb itself is the rest of the first word. The router
   * uses this flag to enable the catalog-emote fallback: a verb miss
   * with the flag set falls through to `SoulMixin.emoteFree(rest)`
   * instead of the standard unknown-verb error.
   */
  emotePrefixed?: boolean;
}

/**
 * One or more `ParsedCommand`s split by unquoted `|`. The tokenizer
 * throws if a non-trivial pipeline arrives — pipe execution is NYI.
 */
export interface ParsedPipeline {
  commands: ParsedCommand[];
  raw: string;
}

/* ──────────────────────── Public surface ──────────────────────── */

const LOGIC_PATH = '/obj/api/command-line';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/CommandLineLogic', import.meta.url)
);

/** Resolve the HMR-able CommandLineLogic singleton (sync). */
function logic(): CommandLineLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'CommandLineLogic'
      ) as typeof CommandLineLogic | null) ?? CommandLineLogic)()
  );
}

export class CommandLineApi {
  /**
   * Parse text into a `ParsedPipeline`. Throws when the input would
   * yield more than one command — pipeline execution is deferred.
   */
  static parsePipeline(input: string): ParsedPipeline {
    return logic().parsePipeline(input);
  }

  /**
   * Render a parsed pipeline / command back to canonical text. The
   * round-trip property is `parse(format(parse(t))) === parse(t)` for
   * valid `t`. Words containing whitespace, `"`, `\`, or unquoted `|`
   * are wrapped in `"..."` with `"` and `\` escaped; apostrophes stay
   * bare.
   */
  static format(parsed: ParsedPipeline | ParsedCommand): string {
    return logic().format(parsed);
  }

  /**
   * Apply tokenizer escape processing to a verbatim source slice. Used
   * by the matcher to materialise a greedy field's value: the matcher
   * slices the original input from the end of the last consumed token
   * through end-of-input, then runs this to honour outside-quote escapes
   * (`\<ws>`, `\\`, `\"`, `\|`). Quotes inside the slice are LITERAL — no
   * quote stripping, no inside-quote escapes (per spec §2.4).
   */
  static processOutsideEscapes(s: string): string {
    return logic().processOutsideEscapes(s);
  }
}

SecurityApi.decorateApiClass(CommandLineApi);
