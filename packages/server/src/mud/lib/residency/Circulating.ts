/**
 * CirculatingMixin — "this thing is part of the world's stock, and here
 * is how to count it."
 *
 * The distribution marker. Worn by every item class, so books, potions
 * and wands all count against the same regional stock — because they
 * all compete for the same shelf, and a census that only saw wands would
 * be measuring the wrong thing.
 *
 * ## Two tag sets, and only ONE of them lives here (D21/D35)
 *
 * - **Material tags** — what it is made of. These weigh **place
 *   affinity**, and they live here because "what is this made of" is a
 *   distribution question.
 * - **Effect tags** — its grid cell. These weigh **rarity**, and they
 *   are **READ from `Arcane`, never re-declared**.
 *
 * That second point is load-bearing. `Circulating` is the *distribution*
 * mixin; if the grid footprint lived here, then **a ward would have to
 * consult the distribution subsystem to know whether to suppress a
 * wand.** That is backwards. The footprint sits below distribution, and
 * this reads it.
 *
 * Both vocabularies are closed and already declared for other reasons,
 * so the authoring cost is **annotation rather than authoring**.
 *
 * ## Lives in `lib/residency/`, not `lib/magic/`
 *
 * The spawn sweep is the **third self-maintenance sweep**, next to
 * eviction and reset — same shape, same file, same clock. And
 * distribution is not magic: it will outgrow `lib/magic/` the moment
 * anything non-arcane needs stocking.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { PriceList } from '../magic/PriceList';
import type { ArcaneAddress } from '../magic/Arcane';

/** An item's baseline stock target when it authors none. */
const DEFAULT_REGION_TARGET = 3;

export interface Circulating {
  /**
   * What this is made of — weighs **place affinity** (a mine stocks
   * metal, a grove stocks wood). Free-form, drawn from the material
   * vocabulary that already exists for other reasons.
   */
  getMaterialTags(): readonly string[];
  setMaterialTags(tags: readonly string[]): void;

  /**
   * **The census bucket** this item counts in. Items sharing a key
   * compete for the same regional stock, so it is the *kind* of thing
   * rather than the exact template — twenty different wands are still
   * twenty wands on the shelf.
   */
  getCensusKey(): string;
  setCensusKey(key: string): void;

  /**
   * The grid cells this item's effects occupy — **read from `Arcane`**,
   * never stored here. Empty for a mundane circulating good.
   */
  getEffectTags(): readonly ArcaneAddress[];

  /**
   * **Spawn weight — the inverse of stored labour** (AC 32). Derived
   * through the arcane price list from the effect tags; there is no
   * authored rarity anywhere.
   */
  getSpawnWeight(): number;

  /**
   * **How many of this thing's census key a region should hold** — the
   * item's own baseline, which a region may override.
   *
   * ⚠ This is NOT rarity, and the distinction is what keeps AC 32
   * intact. Rarity answers *which* item a draw yields and is DERIVED
   * from the grid cell — an item cannot declare itself common, because
   * then the economy and the physics could disagree. This answers *how
   * many should exist*, which is a different quantity and one the
   * price list says nothing about.
   *
   * It is a **default, not the answer**: a Zone that declares a stock
   * list wins, because "how many wands this forest holds" is properly a
   * fact about the forest. The item's number is what lets a thing be
   * placed at all in a region nobody has authored yet.
   *
   * *Calibrate at launch* (D21).
   */
  getRegionTarget(): number;
  setRegionTarget(n: number): void;

  // ---------- storage (public for the Hydrator) ----------
  materialTags: string[];
  censusKey: string;
  regionTarget: number;
}

export function CirculatingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CirculatingMixin extends Base implements Circulating {
    static _mixinName = 'CirculatingMixin';

    static fieldMeta: FieldMeta = {
      materialTags: { persistent: true, authorable: true },
      censusKey: { persistent: true, authorable: true },
      regionTarget: { persistent: true, authorable: true, spoiler: 1 },
      // ⚠ There is deliberately NO `effectTags` field. It would be a
      // copy of the `Arcane` footprint, and a copy drifts — which is
      // exactly the failure D35 exists to prevent.
    };

    /** What it is made of. Weighs place affinity. */
    public materialTags: string[] = [];

    /** Which stock bucket it counts in. */
    public censusKey: string = '';

    /** The item's own baseline stock target. A Zone's declaration wins. */
    public regionTarget: number = DEFAULT_REGION_TARGET;

    public getMaterialTags(): readonly string[] {
      return this.materialTags;
    }

    public setMaterialTags(tags: readonly string[]): void {
      this.materialTags = Array.isArray(tags)
        ? tags.filter((t): t is string => typeof t === 'string')
        : [];
    }

    public getCensusKey(): string {
      return this.censusKey;
    }

    public setCensusKey(key: string): void {
      this.censusKey = typeof key === 'string' ? key : '';
    }

    public getEffectTags(): readonly ArcaneAddress[] {
      const self = this as unknown as Stuff;
      // READ, never declare. A ward asks `Arcane`; so does rarity; so
      // does this. One declaration, four consumers.
      return MixinApi.isArcane(self) ? self.getArcaneFootprint() : [];
    }

    public getSpawnWeight(): number {
      return PriceList.spawnWeightFor(this.getEffectTags());
    }

    public getRegionTarget(): number {
      return this.regionTarget;
    }

    public setRegionTarget(n: number): void {
      const v = Number(n);
      if (!Number.isFinite(v) || v < 0) {
        throw new RangeError(
          `regionTarget: must be a non-negative number, got '${String(n)}'`,
        );
      }
      this.regionTarget = v;
    }
  };
}
