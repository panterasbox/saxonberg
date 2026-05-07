/**
 * Shell-side `$X` / `${X}` variable interpolation.
 *
 * Runs in the matcher (`CommandApi.assemble`) per `WordToken` value
 * before binding to a positional. Two forms:
 *
 *   - `$<name>`   — bareword. Stops at any non-name character.
 *   - `${<name>}` — bracketed. Lets the variable abut other
 *     characters (`${room}.book`).
 *
 * Names match `[A-Za-z_][A-Za-z0-9_]*` — no dots, hyphens, or
 * other punctuation, matching the existing setting/var naming
 * convention in `EnvironmentMixin`.
 *
 * `$$` is left intact for MQL's last-result token to handle —
 * variable interpolation is a shell concern, MQL syntax is
 * upstream of it.
 *
 * Lookup precedence: synthetic vars (declared by mixins via
 * `static syntheticVars: SyntheticVarEntry[]`) win over stored
 * vars (`giver.listVars()`). A player who does `var set scope foo`
 * still sees `$scope` resolve to the actual current scope —
 * synthetic names are documented and stable, and a clash should
 * favor the documented surface over a player typo.
 *
 * Unknown stored-var names soft-warn via `MudlogApi`. Failing the
 * command would break scripts mid-flight; empty-substituting
 * keeps things moving while the warning surfaces the typo.
 *
 * Quoting is irrelevant — shell-quoting is a token-grouping
 * concern only; `$X` always expands. One uniform rule.
 */

import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { MudlogApi } from '../../api/mudlog';

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

/**
 * Walk the giver's mixin chain and return the first matching
 * synthetic var entry, or `null` if no mixin declares it. First-
 * match wins so concrete-class declarations (rare) shadow mixin
 * declarations.
 */
export function lookupSyntheticVar(
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

// `$$` (MQL last-result), `${name}`, `$name`. Matched left-to-right
// in `replace`, so `$$` is consumed before we'd ever see `$<name>`
// against the same `$`.
const VAR_PATTERN = /\$(\$|\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g;

/**
 * Expand `$X` / `${X}` references inside `text` using `giver` as
 * the resolution context. `$$` is left intact for MQL.
 *
 * Synthetic precedence: a name declared via `static syntheticVars`
 * wins over `giver.listVars()`. Unknown names soft-warn and
 * substitute empty.
 *
 * Caller's responsibility to gate (skip when the giver doesn't
 * compose `EnvironmentMixin`, or when `shell.interpolate-vars`
 * is off). This keeps the function pure on its inputs.
 */
export function expandVariables(text: string, giver: Stuff): string {
  return text.replace(
    VAR_PATTERN,
    (_full, p1: string, brace: string | undefined, bare: string | undefined) => {
      if (p1 === '$') return '$$'; // MQL last-result — leave for MQL.
      const name = brace ?? bare ?? '';
      return resolveVar(name, giver);
    },
  );
}

/**
 * Resolve a single name to its expanded value.
 *
 * - Synthetic var → read from the owning mixin (always wins).
 * - Stored var → `giver.listVars()` lookup, only when the giver
 *   composes `EnvironmentMixin`.
 * - Unknown → empty string + soft-warn.
 */
function resolveVar(name: string, giver: Stuff): string {
  const synth = lookupSyntheticVar(giver, name);
  if (synth) return synth.read(giver);

  if (MixinApi.isEnvironment(giver)) {
    const stored = giver.listVars();
    if (Object.prototype.hasOwnProperty.call(stored, name)) {
      return stored[name]!;
    }
  }

  // Unknown — soft-warn and substitute empty. Recipient defaults to
  // the giver (Sensor required by MudlogApi) when the giver itself
  // is a Sensor; otherwise drop the warn (a non-Sensor giver has no
  // in-game surface to log to and we don't want to throw mid-bind).
  if (MixinApi.isSensor(giver)) {
    MudlogApi.warn('shell', Mml.compose`unknown variable: $${name}`, {
      to: giver,
    });
  }
  return '';
}
