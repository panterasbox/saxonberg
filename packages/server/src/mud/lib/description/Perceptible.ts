/**
 * PerceptibleMixin - Objects that can be perceived/identified
 *
 * Provides:
 * - keywords (getter/setter — see "Setter-normalized" below)
 * - getKeywords(): Get keywords for MQL identification (returns a copy)
 * - addKeyword(keyword): Add a keyword (normalized)
 * - removeKeyword(keyword): Remove a keyword
 * - hasKeyword(keyword): Check if keyword exists
 * - setKeywords(keywords): Replace the keyword list (normalized)
 *
 * Objects with this mixin can be found via MQL queries using keywords.
 * For example, a "pink rose" might have keywords: ["flower", "plant", "rose"]
 * allowing users to type "get flower" or "look at plant".
 *
 * Note: The term "identify" is reserved for Nethack-like identification
 * of unknown objects (scrolls of identification, etc.)
 *
 * Setter-normalized: `keywords` is the persistent field exposed as a
 * property. The setter routes every entry through `addKeyword()`, so the
 * incremental API and bulk-assign (`obj.keywords = [...]`) share a single
 * normalization path (lowercase / trim / dedupe). `Hydrator`'s
 * `target[field] = data[field]` is bracket-assign — it goes through this
 * setter, so a template that lists keywords lands normalized without any
 * post-hydrate fixup.
 *
 * Usage:
 * ```typescript
 * class Rose extends PerceptibleMixin(Thing) {
 *   constructor() {
 *     super();
 *     this.addKeyword("flower");
 *     this.addKeyword("plant");
 *     this.addKeyword("rose");
 *   }
 * }
 * ```
 *
 * Persistence:
 * - keywords: string[] (auto-persisted via setter)
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { GrammarApi } from '../../api/grammar';
import {
  MqlSubscriptionApi,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';

/**
 * Public shape provided by PerceptibleMixin.
 */
export interface Perceptible {
  getKeywords(): string[];
  addKeyword(keyword: string): void;
  removeKeyword(keyword: string): boolean;
  hasKeyword(keyword: string): boolean;
  setKeywords(keywords: string[]): void;
  /**
   * The "first" keyword — what a client renderer sends for a
   * click-to-look affordance, and what the handle chain reads.
   *
   * ⭐ **`keywords[0]` unless an author pinned something else.** One
   * value, one meaning: it is only ever a word somebody wrote down.
   */
  getPrimaryKeyword(): string | undefined;
  setPrimaryKeyword(value: string | undefined): void;
}

export function PerceptibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PerceptibleMixin extends Base {
    static _mixinName = 'PerceptibleMixin';

    /**
     * Persistent fields: explicit keywords + the auto-derive opt-out
     * flag + the optional authored primary keyword. Hydrated through
     * the accessor pairs below (Phase 1: setter; Phase 2: bracket-
     * assign via the public-shape setter).
     */
    static fieldMeta: FieldMeta = {
      keywords: { persistent: true, authorable: true },
      primaryKeyword: { persistent: true, authorable: true },
    };

    /**
     * Live-query projection for `primaryKeyword`. Lives on the mixin
     * (not on Stuff) because the field is mixin-gated: only
     * Perceptible-composed hosts have a keyword pool. The substrate's
     * prototype-chain walk unions this with `Stuff.subscribableFields`
     * at projection time. Non-Perceptible hosts contribute no
     * `primaryKeyword` descriptor; the substrate omits the field
     * from their wire records, same shape `quantity` uses on
     * Stackable.
     *
     * `dependsOnFields` lists the leaf sources: the authored override
     * (`primaryKeyword`) AND the two fields the derived-pool head
     * folds in (`name` via NamedMixin, `shortDescription` via
     * VisibleMixin). Renaming or re-describing a Perceptible host
     * re-projects the keyword surface without an explicit setter
     * call. Shadow-lifecycle support rides on `ShadowChangedEvent`
     * for parity with `displayName`.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'primaryKeyword',
        read: (stuff) => (stuff as unknown as Perceptible).getPrimaryKeyword(),
        dependsOnFields: ['primaryKeyword', 'name', 'shortDescription'],
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
    ];

    /**
     * Backing storage; access via the `keywords` accessor pair.
     */
    private _keywords: string[] = [];


    /**
     * ⭐⭐ **The keywords an author wrote. Nothing else.**
     *
     * This used to fold in `tokenizeName(getName())` and
     * `tokenizeName(getShortDescription())` behind an
     * `autoDeriveKeywords` dial. It was removed 2026-09-11, and the
     * census is why: **568 of the 646 described rows already authored
     * their keywords by hand**, so derivation was saving nobody any
     * typing — while what it produced was junk. A tailor described as
     * *"tailor with pins down one cuff and a tape round her neck"*
     * answered to `look with`, `look and`, `look her` and `look neck`.
     *
     * ⚠ And it split on whitespace ALONE, so a description reading
     * *"live-in super, keys jangling at her belt"* put **`super,`** in
     * the pool — comma included. `look super` failed; `look super,` was
     * untypable. The sweep that made these authored strips the
     * punctuation, so those rows gained the word they should have had.
     *
     * ⭐ `autoDeriveKeywords` went with it: **zero** shipped rows ever
     * set it, because a dial nobody turns is a dial nobody wanted.
     */
    protected get keywords(): string[] {
      return [...this._keywords];
    }

    protected set keywords(value: string[]) {
      if (!Array.isArray(value)) {
        throw new TypeError('Perceptible.keywords must be a string[]');
      }
      this._keywords = [];
      for (const k of value) this.addKeyword(k);
    }

    getKeywords(): string[] {
      return this.keywords;
    }

    addKeyword(keyword: string): void {
      const normalized = keyword.toLowerCase().trim();
      if (normalized && !this._keywords.includes(normalized)) {
        this._keywords.push(normalized);
      }
    }

    removeKeyword(keyword: string): boolean {
      const normalized = keyword.toLowerCase().trim();
      const index = this._keywords.indexOf(normalized);
      if (index !== -1) {
        this._keywords.splice(index, 1);
        return true;
      }
      return false;
    }

    hasKeyword(keyword: string): boolean {
      const normalized = keyword.toLowerCase().trim();
      return this._keywords.includes(normalized);
    }

    /**
     * Replace the keyword list. Equivalent to `this.keywords = keywords`,
     * kept for symmetry with the addKeyword/removeKeyword API.
     */
    setKeywords(keywords: string[]): void {
      this.keywords = keywords;
    }

    /**
     * Authored primary keyword. When set, `getPrimaryKeyword()` returns
     * this value (after fail-soft validation against the live keyword
     * pool). Persistent — author-set via template `data:`.
     *
     * Hydrator routes through `setPrimaryKeyword` (the Phase 1 dispatch
     * prefers a `set<Field>` method), so an authored-but-invalid value
     * in a template is logged + dropped at clone time rather than
     * silently sitting in the slot waiting to confuse a renderer.
     */
    protected primaryKeyword?: string;

    /**
     * Read the primary keyword for this Stuff. Returns the authored
     * value when it appears in the current derived keyword pool;
     * otherwise the **last** derived-pool entry; otherwise
     * `undefined`.
     *
     * Last-pool-entry (rather than first) is the better default for
     * English modifier-noun phrases. Derived-pool ordering is
     * authored keywords first, then tokenized `name` (NamedMixin),
     * then tokenized `shortDescription` (VisibleMixin). For a Named
     * "Oak Door" the tokens land in order `['oak', 'door']`; for
     * `'a brass thermometer'` the tokens land `['brass',
     * 'thermometer']`. In both cases the head noun is the trailing
     * token — what a player would naturally type to refer to the
     * thing — and what `look <X>` click-affordances should send.
     *
     * Authors who need a non-trailing keyword pin it explicitly via
     * `setPrimaryKeyword(...)`. The substrate default is just a
     * sensible last-resort.
     *
     * Intentionally does NOT call `setPrimaryKeyword` from the getter
     * — the setter is a separate event surface from rendering.
     */
    getPrimaryKeyword(): string | undefined {
      return this.primaryKeyword ?? this._keywords[0];
    }

    /**
     * Author-set the primary keyword. Stores the normalized value
     * unconditionally; pool-membership is a cross-field invariant
     * (the pool depends on `shortDescription` via VisibleMixin and
     * `name` via NamedMixin) and the Hydrator's Phase 1 dispatch
     * makes no ordering guarantee across mixins. Validating in the
     * setter would (and did) silently drop authored values when this
     * mixin's setter ran before the others contributing to the pool.
     *
     * The getter (`getPrimaryKeyword`) does the lookup: if the
     * stored value is in the current pool, return it; otherwise fall
     * back to `pool[0]`. That keeps authored intent honored
     * regardless of hydration order, and a runtime caller passing a
     * bogus value gets the same silent override behavior the getter
     * already implements for any out-of-pool entry.
     *
     * Passing `undefined` clears the explicit override; subsequent
     * `getPrimaryKeyword()` calls fall back to the derived-pool head.
     * `null` is normalized to the same clear: a captured `undefined`
     * round-trips through Mongo as `null` (the persistence-spine
     * snapshot of an avatar that never authored a primary keyword), so
     * the restore path hands the setter `null` — treating it as a value
     * would crash every returning avatar at connect.
     */
    setPrimaryKeyword(value: string | undefined): void {
      if (value !== undefined && value !== null) {
        const normalized = value.toLowerCase().trim();
        if (normalized.length === 0) {
          console.warn(
            `PerceptibleMixin.setPrimaryKeyword: empty value ignored`,
          );
          return;
        }
        // ⚠ The membership check is informational and the value is
        // stored regardless — *"keywords[0] unless otherwise
        // specified"* means a pinned word is the author's call.
        //
        // But a client renderer sends `look <primaryKeyword>` for a
        // click, so a word nothing answers to is a **dead click**, and
        // that is worth saying out loud. ⭐ Its real home is build time:
        // `lint:presentation` clause (d) refuses an authored
        // `primaryKeyword` that is not in the row's own `keywords`.
        // This runtime warn is for the code paths that mint a thing and
        // name it — a coat-check ticket, a salvaged lump, a key.
        //
        // An empty pool means the Hydrator has not reached the keyword
        // field yet; nothing to check against, so no warn.
        const pool = this.keywords;
        if (pool.length > 0 && !pool.includes(normalized)) {
          console.warn(
            `PerceptibleMixin.setPrimaryKeyword: '${normalized}' not in ` +
              `keyword pool [${pool.join(', ')}]; storing anyway`,
          );
        }
        this.primaryKeyword = MqlSubscriptionApi.fireFieldChange(
          this,
          'primaryKeyword',
          this.primaryKeyword,
          normalized,
        );
        return;
      }
      this.primaryKeyword = MqlSubscriptionApi.fireFieldChange(
        this,
        'primaryKeyword',
        this.primaryKeyword,
        undefined,
      );
    }
  };
}
