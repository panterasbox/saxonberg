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

/**
 * Public shape provided by PerceptibleMixin.
 */
export interface Perceptible {
  getKeywords(): string[];
  addKeyword(keyword: string): void;
  removeKeyword(keyword: string): boolean;
  hasKeyword(keyword: string): boolean;
  setKeywords(keywords: string[]): void;
}

/**
 * Lowercase + split-on-whitespace tokenization. Used by
 * {@link PerceptibleMixin.getKeywords} to fold a host's display name
 * into the keyword pool — `'oak door'` produces `['oak', 'door']`,
 * letting players type either token.
 */
function tokenizeName(name: string): string[] {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function PerceptibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PerceptibleMixin extends Base {
    static _mixinName = 'PerceptibleMixin';

    /**
     * Persistent field: keywords for MQL identification.
     * Hydrated through the `keywords` setter below.
     */
    static persistentFields = ['keywords'];

    /** Backing storage; access via the `keywords` accessor pair. */
    private _keywords: string[] = [];

    /**
     * Host-internal accessor pair (Pattern D). External callers go
     * through `getKeywords()` / `setKeywords()`. The private setter
     * still fires when the Hydrator bracket-assigns
     * `target['keywords'] = data['keywords']` — bracket access bypasses
     * TS visibility, so the normalization invariant runs during
     * hydration.
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

    /**
     * Return the host's keyword pool. Folds tokenized name words in
     * for hosts that compose `NamedMixin`, so a player can type
     * `oak door` against an Idea named "Oak Door" without an
     * explicit `addKeyword('oak')`. Authored keywords still take
     * precedence on score (exact-keyword match outranks tokenized
     * name fragment) — see `scope-walk.scoreCandidate`.
     */
    getKeywords(): string[] {
      const out: string[] = [...this._keywords];
      if (MixinApi.hasMixin(this.constructor as never, Mixins.Named)) {
        const named = this as unknown as { getName(): string };
        for (const tok of tokenizeName(named.getName())) {
          if (!out.includes(tok)) out.push(tok);
        }
      }
      return out;
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
  };
}
