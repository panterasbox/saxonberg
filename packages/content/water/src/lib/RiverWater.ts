/**
 * RiverWaterMixin — ⭐ **water that is part of a river's line** (river D8).
 *
 * One owner per length of river: between authored places the LINE owns
 * the water; inside an authored place the AUTHOR does. A river water place
 * says where it is on the line and how its water moves:
 *
 * - `river: { course, at, span?, ends? }` — `at` its upstream end
 *   (`node±km`, a positive offset downstream), the span running downstream
 *   from it; `ends` says whether the line hands you in and out at each end
 *   (`handoff`) or the place is the river's end (`end`).
 * - `current: inherit | still | eddy | { mps }` — `inherit` reads the line
 *   at its position (the default); the others are the author's word, and
 *   the river never contradicts an authored room.
 *
 * Composed only on river water: an authored `RiverPlace`, and the line's
 * own minted places (the reach patch and the stop). A sea room or a mere
 * does not inherit the line.
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { WaterPlace } from '@saxonberg/server/mud/lib/location/WaterPlace';
import type { Shore } from '@saxonberg/server/mud/lib/location/Shore';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { LinePosition } from './RiverLine';
import type WatercourseCatalogue from '../idea/WatercourseCatalogue';

/** Where a river water place stands on its line. */
export interface RiverSpec {
  course: string;
  /** `node±km`: the place's upstream end. */
  at: string;
  /** How much of the line it covers, downstream of `at`, km. */
  span?: number;
  /** The word a way to it is called from the water within hail. */
  name?: string;
  ends?: { upstream?: 'handoff' | 'end'; downstream?: 'handoff' | 'end' };
}

/** How the water in a river place moves. */
export type RiverCurrent = 'inherit' | 'still' | 'eddy' | { mps: number };

/** The current in an eddy: slack water you can rest in. */
const EDDY_MPS = 0.05;

const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';

export interface RiverWater {
  getRiver(): RiverSpec | null;
  setRiver(value: RiverSpec | null): void;
  getCurrent(): RiverCurrent;
  setCurrent(value: RiverCurrent | null): void;
  riverPosition(): LinePosition | null;
  riverCurrentMps(): number;
}

export function RiverWaterMixin<TBase extends MixinConstructor<Stuff & WaterPlace & Shore>>(Base: TBase) {
  return class RiverWaterMixin extends Base implements RiverWater {
    static _mixinName: string = 'RiverWaterMixin';

    static fieldMeta: FieldMeta = {
      river: { persistent: true, authorable: true },
      current: { persistent: true, authorable: true },
    };

    /** Where on the line this water is; `null` for a minted place (its position is its own). */
    public river: RiverSpec | null = null;

    /** The author's word on the current. */
    public current: RiverCurrent = 'inherit';

    public getRiver(): RiverSpec | null {
      return this.river === null ? null : { ...this.river };
    }

    public setRiver(value: RiverSpec | null): void {
      this.river =
        value && typeof value === 'object' && typeof value.course === 'string' && typeof value.at === 'string'
          ? { ...value }
          : null;
    }

    public getCurrent(): RiverCurrent {
      return typeof this.current === 'object' ? { ...this.current } : this.current;
    }

    public setCurrent(value: RiverCurrent | null): void {
      if (value === 'still' || value === 'eddy' || value === 'inherit') this.current = value;
      else if (value && typeof value === 'object' && Number.isFinite(Number(value.mps))) this.current = { mps: Number(value.mps) };
      else this.current = 'inherit';
    }

    /**
     * Where this water is on its line now: a minted place's own position,
     * else the authored `river.at` — `null` before the drainage compiles.
     */
    public riverPosition(): LinePosition | null {
      const own = (this as unknown as { getLinePosition?(): LinePosition | null }).getLinePosition?.() ?? null;
      if (own !== null) return own;
      if (this.river === null) return null;
      const cat = StuffApi.findByTemplatePath<WatercourseCatalogue>(CATALOGUE_PATH);
      const at = this.river.at.includes(':') ? this.river.at : `${this.river.course}:${this.river.at}`;
      return cat?.positionOfSync(at) ?? null;
    }

    /** The current as the author said, or the line's at this water's read. */
    public riverCurrentMps(): number {
      const c = this.current;
      if (c === 'still') return 0;
      if (c === 'eddy') return EDDY_MPS;
      if (typeof c === 'object') return c.mps;
      const self = this as unknown as WaterPlace & Shore;
      const read = self.peekWaterRead(self.getWaterKey());
      return typeof read?.currentMps === 'number' ? read.currentMps : 0;
    }

    /** ⭐ One owner per length: the author's word, else the line's (river D10). */
    public currentFor(occupant: Stuff): number {
      void occupant;
      return this.riverCurrentMps();
    }

    public roughnessFor(occupant: Stuff): number {
      void occupant;
      if (this.current !== 'inherit') return 0;
      const self = this as unknown as WaterPlace & Shore;
      const read = self.peekWaterRead(self.getWaterKey());
      return typeof read?.roughness === 'number' ? read.roughness : 0;
    }
  };
}
