/**
 * TemperedMixin — **what a heat treatment left in this piece of metal.**
 *
 * Split from {@link CompositionMixin} (2026-10-17): composition is true of
 * any re-meltable lump — glass keeps its iron, wax its colour — but a
 * temper is a fact about steel, so only metal stock claims it.
 * {@link AlloyedMixin} composes both.
 *
 * ⚠ Recorded and reported, with no mechanical consumer yet — `analyze
 * chemistry` prints it and the next `heat` anneals it back to `none`,
 * because heating past the critical temperature is what annealing IS.
 * The honest larger version (temper into `materialScale`, and onto the
 * made thing rather than the stock) is the crafting-stamp seam.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';

/** What a heat treatment left in the metal. */
export type Temper = 'none' | 'hardened';

export interface Tempered {
  /** What a heat treatment left in it. */
  getTemper(): Temper;
  setTemper(temper: Temper): void;

  // Public so the applier can reflect into it.
  temper: Temper;
}

export function TemperedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TemperedMixin extends Base implements Tempered {
    static _mixinName: string = 'TemperedMixin';

    static fieldMeta: FieldMeta = {
      temper: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };

    public temper: Temper = 'none';

    public getTemper(): Temper {
      return this.temper;
    }

    public setTemper(temper: Temper): void {
      this.temper = temper === 'hardened' ? 'hardened' : 'none';
    }
  };
}
