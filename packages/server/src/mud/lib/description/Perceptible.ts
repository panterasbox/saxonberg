/**
 * PerceptibleMixin - Objects that can be perceived/identified
 *
 * Provides:
 * - getKeywords(): Get keywords for MQL identification
 * - addKeyword(keyword): Add a keyword
 * - removeKeyword(keyword): Remove a keyword
 * - hasKeyword(keyword): Check if keyword exists
 *
 * Objects with this mixin can be found via MQL queries using keywords.
 * For example, a "pink rose" might have keywords: ["flower", "plant", "rose"]
 * allowing users to type "get flower" or "look at plant".
 *
 * Note: The term "identify" is reserved for Nethack-like identification
 * of unknown objects (scrolls of identification, etc.)
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
 * - keywords: Array (auto-persisted)
 */

import type { MixinConstructor } from '../mixin-types';

/**
 * Mixin that adds perceptibility (keywords for identification)
 */
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

export function PerceptibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PerceptibleMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'PerceptibleMixin';

    /**
     * Persistent field: keywords for MQL identification
     */
    static persistentFields = ['keywords'];

    /**
     * Keywords for MQL matching (internal storage)
     *
     * Access via getKeywords(), addKeyword(), removeKeyword()
     */
    private keywords: string[] = [];

    /**
     * Get all keywords for MQL matching
     *
     * @returns Copy of keywords array
     */
    getKeywords(): string[] {
      return [...this.keywords];
    }

    /**
     * Add a keyword for MQL matching
     *
     * Normalizes to lowercase and prevents duplicates.
     *
     * @param keyword - Keyword to add
     */
    addKeyword(keyword: string): void {
      const normalized = keyword.toLowerCase().trim();
      if (normalized && !this.keywords.includes(normalized)) {
        this.keywords.push(normalized);
      }
    }

    /**
     * Remove a keyword
     *
     * @param keyword - Keyword to remove
     * @returns True if keyword was removed, false if not found
     */
    removeKeyword(keyword: string): boolean {
      const normalized = keyword.toLowerCase().trim();
      const index = this.keywords.indexOf(normalized);
      if (index !== -1) {
        this.keywords.splice(index, 1);
        return true;
      }
      return false;
    }

    /**
     * Check if a keyword exists
     *
     * @param keyword - Keyword to check
     * @returns True if keyword exists
     */
    hasKeyword(keyword: string): boolean {
      const normalized = keyword.toLowerCase().trim();
      return this.keywords.includes(normalized);
    }

    /**
     * Set all keywords at once (mainly for deserialization)
     *
     * @param keywords - Array of keywords
     */
    setKeywords(keywords: string[]): void {
      this.keywords = keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length > 0);
    }
  };
}
