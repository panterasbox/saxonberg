/**
 * ShellApi — substrate helpers for the msh shell pipeline.
 *
 * The shell isn't a single mixin; it's a suite (`EnvironmentMixin`,
 * `FocusedMixin`, future `AliasMixin` / `HistoryMixin` / `PromptMixin`)
 * composed onto `ShelledCharacter`. ShellApi is the cross-cutting
 * static surface those mixins and the matcher reach into.
 *
 * v1 surface:
 *
 *   - {@link expandVariables} — expand `$name` / `${name}` references
 *     in command-line text. The matcher runs this per `WordToken`
 *     value before binding to a positional. `$$` is left intact for
 *     MQL.
 *   - {@link lookupSyntheticVar} — walk the giver's mixin chain and
 *     return the entry that owns a synthetic var name, or `null`.
 *
 * Synthetic vs stored vars (v1):
 *
 *   - Synthetic — read-only, sourced from a mixin's `static
 *     syntheticVars: SyntheticVarEntry[]`. v1 ships exactly one:
 *     `$focus` on `FocusedMixin`. Pronoun words (`me`, `here`,
 *     `it`/`him`/`her`/`them`) are NOT shell vars — they're
 *     first-class MQL keywords, recognized by the resolver.
 *   - Stored — `var set NAME VALUE` lands in `EnvironmentMixin`'s
 *     session store; `$<name>` reads it back.
 *
 * Synthetic precedence on collision: `var set focus foo` does not
 * shadow the synthetic `$focus`. The synthetic name is documented
 * and stable; surprise overrides are worse than a documented win.
 *
 * Unknown stored-var names soft-warn via `MudlogApi` (when the
 * giver is a Sensor) and substitute empty. Failing the command
 * mid-bind would break scripts on a typo; empty-substitute keeps
 * things moving and surfaces the warning.
 *
 * Quoting is irrelevant — shell-quoting is a token-grouping
 * concern only; `$X` always expands. One uniform rule.
 *
 * This Api is a thin, security-gated forwarding shell: the logic lives
 * in the hot-reloadable {@link ShellLogic} singleton at
 * `/obj/api/shell`, reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/shell` reloads it.
 */

import type { FormFactor } from '@saxonberg/types';
import type { Stuff } from "../lib/stuff/Stuff";
import type { Alias } from "../lib/shell/Alias";
import type { AliasExpansionInfo } from "./command";
import type { ParsedCommand } from "./command-line";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { ShellLogic } from "../obj/api/ShellLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

const LOGIC_PATH = "/obj/api/shell";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/ShellLogic", import.meta.url)
);

/** Resolve the HMR-able ShellLogic singleton (sync). */
function logic(): ShellLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "ShellLogic"
      ) as typeof ShellLogic | null) ?? ShellLogic)()
  );
}

/**
 * One synthetic var declared by a mixin's static `syntheticVars`
 * field. Read on every expansion; the value is whatever the host
 * currently exposes via the underlying mixin state.
 */
export interface SyntheticVarEntry {
  /** The name without the `$` sigil. */
  name: string;
  description: string;
  /** Read the live value from this host instance. */
  read(giver: Stuff): string;
}

export class ShellApi {
  private constructor() {}

  /**
   * Expand `$X` / `${X}` references inside `text` using `giver` as
   * the resolution context. `$$` is left intact for MQL.
   *
   * Caller's responsibility to gate (skip when the giver doesn't
   * compose `EnvironmentMixin`, or when `shell.interpolate-vars` is
   * off). This keeps the function pure on its inputs — the YAML
   * scope expander, for example, runs unconditionally.
   */
  static expandVariables(text: string, giver: Stuff): string {
    return logic().expandVariables(text, giver);
  }

  /**
   * Walk the giver's mixin chain and return the first matching
   * synthetic var entry, or `null` if no mixin declares it.
   */
  static lookupSyntheticVar(
    giver: Stuff,
    name: string
  ): SyntheticVarEntry | null {
    return logic().lookupSyntheticVar(giver, name);
  }

  /**
   * Resolve verb-position aliases on a `ParsedCommand`, returning the
   * (possibly rewritten) command plus an expansion record when one or
   * more aliases fired.
   *
   * Operates on classified `RawToken`s — leverages the tokenizer's
   * existing quoting/escape work rather than manipulating raw text.
   * Pure on its inputs except for reading `giver.getAlias`.
   *
   * Behaviors:
   *
   *   - **Bypass prefix.** A verb starting with `\` is stripped of the
   *     leading backslash and not subject to alias lookup. `\\look`
   *     produces the literal verb `\look` (the second `\` is taken as
   *     part of the verb).
   *   - **Positional substitution.** `$1`..`$9` and `$@` (bare or
   *     braced) inside `word` and `long-with-value.value` text expand
   *     against the user's args. A naked `$@` token expands to the
   *     full user-arg list as separate tokens; embedded `$@` is a
   *     space-joined string.
   *   - **Consume-vs-append.** If any positional ref appeared in the
   *     body, user-args were consumed and are NOT appended; otherwise
   *     they're appended bash-style.
   *   - **Recursion.** The expansion's resulting verb is itself
   *     subject to alias lookup, with a per-call in-flight Set as
   *     cycle guard and a hard depth ceiling (16). Cycles terminate
   *     silently; depth-cap fires a soft `MudlogApi.warn` when the
   *     giver is a Sensor.
   *   - **Source reconstruction.** The returned `ParsedCommand`
   *     carries a synthesized `source` faithful enough for greedy
   *     positionals: append case preserves the user's literal
   *     post-verb slice; consume case uses `CommandLineApi.format` so
   *     quoted user-args round-trip with their interior whitespace.
   *
   * Caller is responsible for gating on `MixinApi.isAlias(giver)` —
   * this function takes `Stuff & Alias` directly so the type
   * discipline is at the call site.
   */
  static expandAliases(
    parsed: ParsedCommand,
    giver: Stuff & Alias
  ): { parsed: ParsedCommand; expansion?: AliasExpansionInfo } {
    return logic().expandAliases(parsed, giver);
  }

  /**
   * Cross-host setting resolution, with the optional per-form-factor
   * rung.
   *
   * Settings declared on a mixin that may be composed by hosts without
   * `EnvironmentMixin` (notably `MobileMixin` settings on NPCs) need a
   * single resolution entry point so consumers don't branch on the
   * host type. This walks the schema and falls back to the declared
   * default when the host can't carry overrides.
   */
  public static resolveSetting<T>(
    host: Stuff,
    key: string,
    factor?: FormFactor,
  ): T | undefined {
    return logic().resolveSetting<T>(host, key, factor);
  }

}

SecurityApi.decorateApiClass(ShellApi);
