/**
 * WaterSourceMixin — **this Idea can read a named water for a place**
 * (maritime revision 3, T3).
 *
 * A waterside place (`ShoreMixin`) cites the water it is beside as a
 * string the kernel never parses — a river reach (`kestrel:confluence`)
 * or a sea (its expanse's path). The water pack knows what those strings
 * mean; the kernel does not and must not import it. This is the seam
 * between them, the `GroundSourceMixin` shape one subsystem over: the
 * kernel declares the capability, the pack's `WatercourseCatalogue`
 * (reaches) and `WaterExpanse` (seas) implement it, and a shore finds its
 * source by the cited path (a sea) or by the realm's default source
 * (`water.sourcePath`, a reach).
 *
 * Three questions, and only one of them is per viewer:
 * - **where, now** — the concrete ref to fish or measure (a sea's ref
 *   moves with the craft; a reach's never does);
 * - **what is it like** — the read, async, memoised by the shore;
 * - **what does THIS viewer make of it** — the lines, the fishery read
 *   at the viewer's band.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** What drawing from a water yields there, now. */
export interface WaterDraw {
  /** The Material template path drawn (fresh, fouled, salt). */
  materialPath: string;
  /** The water's temperature, K. */
  temperatureK: number;
}

/**
 * ⭐ The kernel's half of a water's read. The kernel reads `ref`, `atS`,
 * `name`, `pending`, `frozen` and `draw`; `opaque` is the source's own
 * and is handed back to it untouched.
 */
export interface WaterRead {
  /** The concrete ref this read is of. */
  ref: string;
  /** Game-seconds the read was taken. */
  atS: number;
  /** The water's name — *the Kestrel*, *the Greywater*. */
  name: string;
  /** Not knowable yet (a craft not yet resolved, a cold landing). */
  pending?: true;
  /** Iced over: nothing is drawn through it. */
  frozen: boolean;
  /** What a vessel drawn from it holds, or `null` when nothing comes up. */
  draw: WaterDraw | null;
  /** The source's own state, returned to it in `waterLinesFor`. */
  opaque?: unknown;
}

/** Public shape added by WaterSourceMixin. */
export interface WaterSource {
  currentWaterRef(citation: string, place: Stuff): string | null;
  readWater(citation: string, place: Stuff, nowS: number): Promise<WaterRead | null>;
  waterLinesFor(read: WaterRead, viewer: Stuff): string[];
}

export function WaterSourceMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class WaterSourceMixin extends Base implements WaterSource {
    static _mixinName: string = 'WaterSourceMixin';

    /**
     * The concrete ref the cited water is read at from `place`, NOW —
     * synchronous, so a verb can ask it after the shore has settled.
     *
     * @hook Override on the composing Idea. `null` when it is not yet
     *   knowable (the permissive default).
     */
    public currentWaterRef(citation: string, place: Stuff): string | null {
      void citation;
      void place;
      return null;
    }

    /**
     * Read the cited water as it is at `place`.
     *
     * @hook Override on the composing Idea. `null` means *this source
     *   does not know this water* (the default), which the shore reports
     *   as a water nothing here can read — never as a wrong water.
     */
    public async readWater(
      citation: string,
      place: Stuff,
      nowS: number,
    ): Promise<WaterRead | null> {
      void citation;
      void place;
      void nowS;
      return null;
    }

    /**
     * The read in words for `viewer` — everyone's physical read, then
     * whatever the viewer's competence earns. Never a number.
     *
     * @hook Override on the composing Idea. Default: nothing to say.
     */
    public waterLinesFor(read: WaterRead, viewer: Stuff): string[] {
      void read;
      void viewer;
      return [];
    }
  };
}
