/**
 * WardrobeMixin — named outfits, so getting dressed is one command.
 *
 * ## Why a mixin field and not a `Property`, a setting, or a collection
 *
 * A wardrobe is **user-named** state that has to survive a relog, and
 * the three obvious homes are each wrong for a stated reason:
 *
 * - **not a Mongo collection** — parcel-local persistence is the
 *   document tree, and this is not even parcel-local; it rides the
 *   Avatar's existing `holder_snapshots` capture for free.
 * - **not a `Property`** — a prop is for a slot whose KEY is computed at
 *   runtime. Wardrobe names are computed at runtime, but the *field* is
 *   authored-shaped and narrowed on, and the Hydrator reflects into
 *   fields.
 * - **not an `EnvironmentMixin` setting** — settings are a fixed
 *   keyspace; wardrobes are whatever the player calls them.
 *
 * So: a mixin field, **byte-identical in shape to
 * `Wearable.slotClaims`** — a `Record<string, string[]>` that round-trips
 * through the default Hydrator with no marshaller. ⭐ It is the
 * doctrine's named **variable-key** escape hatch, the exact contrast to
 * the fit stamp's three fixed scalars.
 *
 * ## ⭐ KEYWORDS, not instance refs
 *
 * A set stores `primaryKeyword`s, in **wear order**. Three things fall
 * out:
 *
 * - a saved set **survives buying a replacement shirt** — the old one is
 *   gone and the new one answers to the same word;
 * - a keyword resolving to nothing is **skipped with a readable line**
 *   rather than dangling as a broken reference;
 * - there is no lifetime relationship to maintain, so no cleanup rule.
 *
 * ⚠ Wear order is innermost-first (later-worn = outer), which is exactly
 * the order a replay must dress in, so a saved set never trips the
 * covering ladder's refusal.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Wardrobe {
  /** The keywords of one named set, innermost-first. Empty if unknown. */
  getWardrobe(name: string): readonly string[];
  /** Save (or replace) a named set. An empty list removes it. */
  setWardrobe(name: string, keywords: readonly string[]): void;
  /** Forget a named set; `true` if there was one. */
  removeWardrobe(name: string): boolean;
  /** Every saved set's name, in save order. */
  getWardrobeNames(): readonly string[];

  // Persistence-shape accessor pair (default Hydrator).
  getWardrobes(): Readonly<Record<string, readonly string[]>>;
  setWardrobes(value: Record<string, string[]>): void;
}

export function WardrobeMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class WardrobeMixin extends Base implements Wardrobe {
    static _mixinName = 'WardrobeMixin';
    static fieldMeta: FieldMeta = {
      wardrobes: { persistent: true },
    };

    /** Set name → ordered keyword list, innermost-first. */
    public wardrobes: Record<string, string[]> = {};

    public getWardrobes(): Readonly<Record<string, readonly string[]>> {
      return this.wardrobes;
    }

    public setWardrobes(value: Record<string, string[]>): void {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('Wardrobe.setWardrobes: must be a record');
      }
      this.wardrobes = value;
    }

    public getWardrobe(name: string): readonly string[] {
      return this.wardrobes[normalize(name)] ?? [];
    }

    public setWardrobe(name: string, keywords: readonly string[]): void {
      const key = normalize(name);
      if (key.length === 0) {
        throw new RangeError('Wardrobe.setWardrobe: name must be non-empty');
      }
      if (keywords.length === 0) {
        delete this.wardrobes[key];
        return;
      }
      this.wardrobes[key] = [...keywords];
    }

    public removeWardrobe(name: string): boolean {
      const key = normalize(name);
      if (!(key in this.wardrobes)) return false;
      delete this.wardrobes[key];
      return true;
    }

    public getWardrobeNames(): readonly string[] {
      return Object.keys(this.wardrobes);
    }
  };
}

/** Set names are matched the way a player types them. */
function normalize(name: string): string {
  return String(name ?? '').trim().toLowerCase();
}
