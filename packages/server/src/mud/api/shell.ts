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
 *     `$scope` on `FocusedMixin`. Pronoun words (`me`, `here`,
 *     `it`/`him`/`her`/`them`) are NOT shell vars — they're
 *     first-class MQL keywords, recognized by the resolver.
 *   - Stored — `var set NAME VALUE` lands in `EnvironmentMixin`'s
 *     session store; `$<name>` reads it back.
 *
 * Synthetic precedence on collision: `var set scope foo` does not
 * shadow the synthetic `$scope`. The synthetic name is documented
 * and stable; surprise overrides are worse than a documented win.
 *
 * Unknown stored-var names soft-warn via `MudlogApi` (when the
 * giver is a Sensor) and substitute empty. Failing the command
 * mid-bind would break scripts on a typo; empty-substitute keeps
 * things moving and surfaces the warning.
 *
 * Quoting is irrelevant — shell-quoting is a token-grouping
 * concern only; `$X` always expands. One uniform rule.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { MixinApi } from './mixin';
import { Mml } from './mml';
import { MudlogApi } from './mudlog';
import { SecurityApi } from './security';

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

// `$$` (MQL last-result), `${name}`, `$name`.
const VAR_PATTERN = /\$(\$|\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g;

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
    return text.replace(
      VAR_PATTERN,
      (
        _full,
        p1: string,
        brace: string | undefined,
        bare: string | undefined,
      ) => {
        if (p1 === '$') return '$$'; // MQL last-result — leave for MQL.
        const name = brace ?? bare ?? '';
        return resolveVar(name, giver);
      },
    );
  }

  /**
   * Walk the giver's mixin chain and return the first matching
   * synthetic var entry, or `null` if no mixin declares it.
   */
  static lookupSyntheticVar(
    giver: Stuff,
    name: string,
  ): SyntheticVarEntry | null {
    const ctor = giver.constructor as { prototype: unknown } & ((
      ...args: unknown[]
    ) => unknown);
    for (const mixin of MixinApi.queryMixins(ctor)) {
      const vars = (mixin as { syntheticVars?: SyntheticVarEntry[] })
        .syntheticVars;
      if (!vars) continue;
      for (const entry of vars) {
        if (entry.name === name) return entry;
      }
    }
    return null;
  }
}

/**
 * Resolve a single var name to its expanded value.
 *
 * - Synthetic var → read from the owning mixin (always wins).
 * - Stored var → `giver.listVars()` lookup, only when the giver
 *   composes `EnvironmentMixin`.
 * - Unknown → empty string + soft-warn (when giver is a Sensor).
 */
function resolveVar(name: string, giver: Stuff): string {
  const synth = ShellApi.lookupSyntheticVar(giver, name);
  if (synth) return synth.read(giver);

  if (MixinApi.isEnvironment(giver)) {
    const stored = giver.listVars();
    if (Object.prototype.hasOwnProperty.call(stored, name)) {
      return stored[name]!;
    }
  }

  if (MixinApi.isSensor(giver)) {
    MudlogApi.warn('shell', Mml.compose`unknown variable: $${name}`, {
      to: giver,
    });
  }
  return '';
}

SecurityApi.decorateApiClass(ShellApi);
