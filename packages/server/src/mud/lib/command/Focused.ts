/**
 * FocusedMixin — interactive-command-giver state for drill,
 * pronoun memory, and the `focus` verb.
 *
 * Decoration on top of `CommandGiverMixin`. Avatars compose it via
 * `ShelledCharacter`; NPCs that script commands but don't need
 * drill state or pronoun stash leave it off.
 *
 * Owns:
 *
 *   - **Active focus fragment**, defaults to `"here"`. The dispatcher
 *     reads it via `$focus` expansion as the search anchor for verbs
 *     whose YAML opts in (`scope: ['$focus', ...]`); inspection-
 *     shaped commands (`look`, `examine`, `open`, `close`) update it
 *     post-resolve via the drill-trail rule. Movement
 *     (`Mobile.traverse` / `teleport`) clears it before the
 *     auto-look-on-arrival.
 *
 *     Naming note: the giver-side state is **focus**, not **scope**.
 *     `scope` is the general term for the MQL search anchor an
 *     expression resolves against; `focus` is the specific persisted
 *     state on the command giver. They're related but distinct
 *     concepts — keeping them named differently avoids the constant
 *     "which scope?" question.
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
 *   - `$focus` → current focus fragment.
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
import { PronounMemory } from '../../api/mql';
import type { CommandContributions } from '../../api/command';
import type { SyntheticVarEntry } from '../../api/shell';
import {
  MqlSubscriptionApi,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';

/**
 * Public shape provided by FocusedMixin.
 */
export interface Focused {
  /**
   * Read the giver's active focus fragment — the persisted MQL
   * scope state. Surfaced to verbs via the `$focus` synthetic var
   * inside YAML `scope:` and `default:` declarations. Defaults to
   * `"here"`. Inspection-shaped commands (`look`, `examine`, …)
   * update focus post-resolve via the dispatcher's drill-trail
   * rule; the `focus` command sets it explicitly.
   */
  getFocus(): string;
  setFocus(fragment: string): void;
  clearFocus(): void;
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
     * inspects/mutates (the focus fragment) is on this mixin.
     */
    static commandContributions: CommandContributions = {
      self: ['perception/focus.yaml'],
    };

    /**
     * Synthetic vars sourced from this mixin's state. v1 ships
     * exactly one — `$focus` reads the live drilled fragment.
     */
    static syntheticVars: SyntheticVarEntry[] = [
      {
        name: 'focus',
        description: "The giver's current focus fragment.",
        read: (giver) => (giver as Stuff & { getFocus(): string }).getFocus(),
      },
    ];

    /**
     * Live-query subscribable fields. The `focus` descriptor's primary
     * job is to install the meta-bus dependency-index entry at
     * `(FieldChangedEvent.KIND, 'field', 'focus')` so the `setFocus`
     * / `clearFocus` field-change fires don't sail into the void.
     *
     * No v1 client field-set asks for `focus` directly — the canonical
     * `me.focus` subscription resolves an MQL query against the
     * giver's focus fragment and projects the *targets*, not the
     * fragment string itself. The descriptor still exists because
     * subscriptions flagged `focusDependent` (Wave 3's canonical-kind
     * machinery) install a holder-level dependency entry on this
     * same key, and a descriptor whose `read` returns a string is
     * the cleanest way to keep the substrate's prototype-chain walk
     * uniform.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'focus',
        read: (stuff) =>
          (stuff as Stuff & { getFocus(): string }).getFocus(),
      },
    ];

    /**
     * Active focus fragment. Transient — every Focused giver
     * starts at `"here"` and resets to `"here"` on movement
     * (the auto-look-on-arrival path post-`clearFocus()`).
     * Inspection-shaped commands update this via the dispatcher's
     * `updates_focus` path; the `focus` command sets it explicitly.
     */
    private _focus: string = 'here';

    /**
     * Per-giver pronoun stash. Transient — populated post-resolve
     * by the dispatcher (`CommandApi.resolveAndValidate`) and read
     * by the resolver when a query's seed is `it`/`him`/`her`/
     * `them`/`$$`.
     */
    private _pronounMemory: PronounMemory = new PronounMemory();

    getFocus(): string {
      return this._focus;
    }

    setFocus(fragment: string): void {
      const trimmed = fragment.trim();
      const next = trimmed.length > 0 ? trimmed : 'here';
      this._focus = MqlSubscriptionApi.fireFieldChange(
        this,
        'focus',
        this._focus,
        next,
      );
    }

    clearFocus(): void {
      this._focus = MqlSubscriptionApi.fireFieldChange(
        this,
        'focus',
        this._focus,
        'here',
      );
    }

    getPronounMemory(): PronounMemory {
      return this._pronounMemory;
    }
  }
  return FocusedMixin;
}
