/**
 * FocusedMixin — interactive-command-giver state for drill,
 * pronoun memory, and the `focus` verb.
 *
 * Decoration on top of `CommandGiverMixin`. Avatars compose it
 * (alongside `EnvironmentMixin`); NPCs that script commands but
 * don't need drill state or pronoun stash leave it off.
 *
 * Owns:
 *
 *   - Active MQL scope fragment, defaults to `"here"`. The
 *     dispatcher reads it as the search anchor for non-anchored
 *     fragments; inspection-shaped commands (`look`, `examine`,
 *     `open`, `close`) update it post-resolve via the drill-trail
 *     rule. Movement (`Mobile.traverse` / `teleport`) clears it
 *     before the auto-look-on-arrival.
 *
 *   - Pronoun memory stash (`it`/`him`/`her`/`them`/`last`). The
 *     dispatcher updates it post-resolve; the resolver reads it
 *     when a query's seed is a dynamic pronoun.
 *
 *   - The `focus` self-bucket command contribution. Givers
 *     without `FocusedMixin` don't see `focus` on their recency
 *     stack.
 *
 * Synthetic vars declared here:
 *
 *   - `$scope` → current scope fragment.
 *
 * Pronoun words (`me`, `here`, `it`/`him`/`her`/`them`) are NOT
 * shell vars. They are first-class MQL keywords recognized by the
 * resolver — typing `look him` or `look here` works because MQL's
 * pronoun seed handles them, not because of variable expansion.
 *
 * Naming note: `getPronounMemory()` rather than `getPronouns()`
 * because `GenderedMixin` already owns the latter (returning a
 * single Pronouns enum value describing the host itself). The
 * stash is a separate concept.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { PronounMemory } from '../../api/mql/pronoun-memory';
import type { CommandContributions } from '../../api/command';
import type { SyntheticVarEntry } from '../../api/shell';

/**
 * Public shape provided by FocusedMixin.
 */
export interface Focused {
  /**
   * Read the giver's active MQL scope fragment — the search anchor
   * the dispatcher passes to MQL when a field doesn't override
   * `scope:`. Defaults to `"here"`. Inspection-shaped commands
   * (`look`, `examine`, …) update scope post-resolve via the
   * dispatcher's drill-trail rule; the `focus` command sets it
   * explicitly.
   */
  getScope(): string;
  setScope(fragment: string): void;
  clearScope(): void;
  /**
   * Per-giver MQL pronoun stash (`it`/`him`/`her`/`them`/`$$`).
   * Updated post-resolve by the dispatcher; read by the resolver
   * when those seeds appear in a chain.
   */
  getPronounMemory(): PronounMemory;
}

export function FocusedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class FocusedMixin extends Base {
    static _mixinName = 'FocusedMixin';

    /**
     * Self-bucket commands every Focused giver picks up. The
     * `focus` meta-command lives here because the state it
     * inspects/mutates (scope) is on this mixin.
     */
    static commandContributions: CommandContributions = {
      self: ['focus.yaml'],
    };

    /**
     * Synthetic vars sourced from this mixin's state. v1 ships
     * exactly one — `$scope` reads the live drilled fragment.
     */
    static syntheticVars: SyntheticVarEntry[] = [
      {
        name: 'scope',
        description: "The giver's current MQL scope fragment.",
        read: (giver) => (giver as Stuff & { getScope(): string }).getScope(),
      },
    ];

    /**
     * Active MQL scope fragment. Transient — every Focused giver
     * starts at `"here"` and resets to `"here"` on movement
     * (the auto-look-on-arrival path post-`clearScope()`).
     * Inspection-shaped commands update this via the dispatcher's
     * `updates_scope` path; the `focus` command sets it explicitly.
     */
    private _scope: string = 'here';

    /**
     * Per-giver pronoun stash. Transient — populated post-resolve
     * by the dispatcher (`CommandApi.resolveAndValidate`) and read
     * by the resolver when a query's seed is `it`/`him`/`her`/
     * `them`/`$$`.
     */
    private _pronounMemory: PronounMemory = new PronounMemory();

    getScope(): string {
      return this._scope;
    }

    setScope(fragment: string): void {
      const trimmed = fragment.trim();
      this._scope = trimmed.length > 0 ? trimmed : 'here';
    }

    clearScope(): void {
      this._scope = 'here';
    }

    getPronounMemory(): PronounMemory {
      return this._pronounMemory;
    }
  }
  return FocusedMixin;
}
