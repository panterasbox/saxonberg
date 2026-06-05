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

import type { MixinConstructor } from '../mixin';
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
   * The authored / derived "first" keyword used by client renderers
   * for canonical click-to-look affordances. Defaults to the first
   * derived-pool entry; an author can pin a specific keyword via
   * `setPrimaryKeyword`, but the setter fail-soft-validates against
   * the live pool (an unrecognized value is ignored with a warning).
   */
  getPrimaryKeyword(): string | undefined;
  setPrimaryKeyword(value: string | undefined): void;
}

/**
 * Lowercase + split-on-whitespace tokenization with article
 * filtering. Used by {@link PerceptibleMixin.keywords} to fold a
 * host's display name AND short description into the keyword pool —
 * `'a brass thermometer'` produces `['brass', 'thermometer']`,
 * letting players type either content token.
 *
 * Filters `GrammarApi.ARTICLES` (`a` / `an` / `the`) — the same set
 * MQL desugar strips from query heads, so the two pipelines stay in
 * sync. Authors who legitimately want `'a'` as a keyword can add it
 * via `addKeyword()` / explicit `keywords: ['a']` in seed data —
 * explicit additions bypass this filter (the `_keywords` field is
 * preserved verbatim in the getter).
 */
function tokenizeName(name: string): string[] {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !GrammarApi.ARTICLES.has(s));
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
    static persistentFields = [
      'keywords',
      'autoDeriveKeywords',
      'primaryKeyword',
    ];

    /**
     * Live-query projection for `primaryKeyword`. Lives on the mixin
     * (not on Stuff) because the field is mixin-gated: only
     * Perceptible-composed hosts have a keyword pool. The substrate's
     * prototype-chain walk unions this with `Stuff.subscribableFields`
     * at projection time. Non-Perceptible hosts contribute no
     * `primaryKeyword` descriptor; the substrate omits the field
     * from their wire records, same shape `quantity` uses on
     * Globbable.
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

    /** Backing storage; access via the `keywords` accessor pair. */
    private _keywords: string[] = [];

    /**
     * Opt-out for auto-deriving keywords from the host's display name
     * (via NamedMixin) and short description (via VisibleMixin).
     * Default true — most hosts want `"a brass thermometer"` to fold
     * into `['brass', 'thermometer']` automatically. Set to `false`
     * in template data when you want hand-curated keywords only
     * (e.g., a "scroll of resurrection" where you want just `'scroll'`,
     * not `['scroll', 'of', 'resurrection']` — though "of" would be
     * dropped as a stop word anyway, "resurrection" wouldn't).
     */
    protected autoDeriveKeywords: boolean = true;

    /**
     * Host-internal accessor pair (Pattern D). External callers go
     * through `getKeywords()` / `setKeywords()`. The private setter
     * still fires when the Hydrator bracket-assigns
     * `target['keywords'] = data['keywords']` — bracket access bypasses
     * TS visibility, so the normalization invariant runs during
     * hydration.
     *
     * The getter returns the **derived** keyword pool: authored
     * keywords plus, when `autoDeriveKeywords` is true, tokenized
     * words from the host's display name (NamedMixin) and short
     * description (VisibleMixin). Authored entries always lead so an
     * exact-keyword match outranks a tokenized match (see
     * `scope-walk.scoreCandidate`). Internal callers that need the
     * raw authored set go through `_keywords` directly.
     */
    protected get keywords(): string[] {
      const out: string[] = [...this._keywords];
      if (this.autoDeriveKeywords) {
        if (MixinApi.hasMixin(this.constructor as never, Mixins.Named)) {
          const named = this as unknown as { getName(): string };
          for (const tok of tokenizeName(named.getName())) {
            if (!out.includes(tok)) out.push(tok);
          }
        }
        if (MixinApi.hasMixin(this.constructor as never, Mixins.Visible)) {
          // Read the raw `shortDescription` field, NOT `getShort()`
          // — the latter falls back to "You see nothing special."
          // when no description is authored, which would pollute
          // the keyword pool with fallback prose.
          const visible = this as unknown as { getShortDescription(): string };
          for (const tok of tokenizeName(visible.getShortDescription())) {
            if (!out.includes(tok)) out.push(tok);
          }
        }
      }
      return out;
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
     * otherwise the first derived-pool entry; otherwise `undefined`.
     *
     * Intentionally does NOT call `setPrimaryKeyword` from the getter
     * — the setter validates against the pool and would feedback-
     * loop with a derived-pool change. Authoring is a separate event
     * from rendering.
     */
    getPrimaryKeyword(): string | undefined {
      const pool = this.keywords;
      if (this.primaryKeyword !== undefined && pool.includes(this.primaryKeyword)) {
        return this.primaryKeyword;
      }
      return pool[0];
    }

    /**
     * Author-set the primary keyword. Fail-soft validation: a value
     * not in the current derived keyword pool is ignored with a
     * `console.warn` (same shape other fact-mixin setters use). On
     * acceptance, fires `FieldChangedEvent { field: 'primaryKeyword' }`
     * so subscriptions re-project.
     *
     * Passing `undefined` clears the explicit override; subsequent
     * `getPrimaryKeyword()` calls fall back to the derived-pool head.
     */
    setPrimaryKeyword(value: string | undefined): void {
      if (value !== undefined) {
        const normalized = value.toLowerCase().trim();
        if (normalized.length === 0) {
          console.warn(
            `PerceptibleMixin.setPrimaryKeyword: empty value ignored`,
          );
          return;
        }
        const pool = this.keywords;
        if (!pool.includes(normalized)) {
          console.warn(
            `PerceptibleMixin.setPrimaryKeyword: '${normalized}' not in ` +
              `keyword pool [${pool.join(', ')}]; ignoring`,
          );
          return;
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
