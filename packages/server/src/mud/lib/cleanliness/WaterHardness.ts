/**
 * WaterHardness — **how hard a water is**, in German degrees (°dH), and the
 * one word a person uses for it (cleanliness D12).
 *
 * ⭐ It rides the WATER, not the place: a pail drawn from the Kestrel
 * is hard because the Kestrel is, a tap off the Cold Fell aqueduct is soft
 * because the fell is, and the pail keeps its hardness when it is carried
 * home and poured into the copper. So soap scums in some towns and lathers
 * in others, and *where your water comes from* is a thing a laundress
 * knows.
 *
 * ⚠ Named for the WATER: a bare `Hardness` reads as the material sense
 * (`Material`'s indentation hardness in MPa — what mining, drilling and
 * combat mean by the word), which this is not.
 *
 * The declaration-merge below is the `blood` precedent: a bulk slot's
 * payload may carry the hardness of the water in it, and the pour blends
 * it by volume.
 */

/** Below this a water is SOFT; at or above, HARD. */
export const SOFT_BELOW_DGH = 6;

declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /** The water's hardness, °dH — carried from its source, blended by volume. */
    hardnessDgh?: number;
  }
}

export class WaterHardness {
  constructor(public readonly dgh: number) {}

  /** *soft* or *hard* — the one distinction the hand feels at the wash. */
  public word(): 'soft' | 'hard' {
    return this.dgh < SOFT_BELOW_DGH ? 'soft' : 'hard';
  }

  public isHard(): boolean {
    return this.word() === 'hard';
  }
}
