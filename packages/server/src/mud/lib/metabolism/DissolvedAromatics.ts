/**
 * DissolvedAromatics — an aroma compound's concentration in a liquid, by word.
 *
 * The sibling of {@link DissolvedToxins}, sharing {@link Concentration}'s
 * arithmetic: a dissolved toxin routes to a body's burden at the ingest, and a
 * dissolved aromatic routes to a nose. Nothing is ever harmed by one.
 *
 * Peat is what this is for: a kiln fired with turf puts phenols into the green
 * malt, they survive the mash and come over the still late, and they blend by
 * volume when whiskies are vatted. So a choice at the malting changes where the
 * right answer lies at the cut. A cask does the same from the other direction
 * through `MaturingMixin`'s `imparts`.
 *
 * The words are rows ({@link Aroma}): a threshold is a fact about the word,
 * authored on it, and a pack adds a word with no kernel edit. The detection
 * threshold turns mg/L into odor units; everything past that is one nose.
 *
 * ⚠ **No `blend` / `isClean` forwarders here, unlike {@link DissolvedToxins}.**
 * Callers use {@link Concentration} directly; `lint:lib-statics` is a ratchet,
 * and a static that exists only to forward is what it counts down.
 */

import { Concentration, type Concentrate } from "../bulk/Concentration";
import type { BulkPayload, BulkSlot } from "../bulk/Bulkable";
import { Aroma } from "../perception/Aroma";

/**
 * An aroma compound's concentration in this matter, mg per litre. `type`
 * names an {@link Aroma} row: the setters and `lint:aromas` refuse a word with
 * no row, because a typo would otherwise fail closed and silent — the matter
 * would simply never smell of anything.
 */
export interface AromaTag extends Concentrate {
  /** The compound: an aroma word. */
  type: string;
  /** mg per litre of this matter. */
  amount: number;
}

/**
 * @internal
 *
 * ⚠ Not author surface — see {@link Concentration} for the full reasoning
 * and why a raised ceiling was the wrong answer. Callers are `Recipe`'s
 * row validation and the two modalities; an author
 * reaches every one of these readings through `smell` / `taste` on a
 * mixin, which is queryable, and authors the figures as `imparts:` on a
 * row.
 */
export class DissolvedAromatics {
  /** A gauge bound to the slot whose matter it measures. */
  constructor(private readonly slot: BulkSlot) {}

  /** Whether a string has the shape of an aroma word; no row is consulted. */
  public static isAromaWord(type: unknown): type is string {
    return Aroma.isWord(type);
  }

  /** The detection threshold for a word, or `null` if its row is not resident. */
  public static thresholdFor(type: string): number | null {
    return Aroma.resolve(type)?.getThreshold() ?? null;
  }

  /** This slot's aroma concentrations. `[]` when there are none. */
  tags(): AromaTag[] {
    const payload = this.slot.getPayload();
    if (!payload) return [];
    return (payload.dissolvedAromatics ?? []).map((t) => ({ ...t }));
  }

  /** This slot's raw concentrations — the blend's own read. */
  raw(): readonly AromaTag[] {
    return this.slot.getPayload()?.dissolvedAromatics ?? [];
  }

  /**
   * Stamp the set outright. An empty set removes the field rather than
   * storing `[]`, so matter nothing flavoured stays byte-identical to a
   * payload from before this existed.
   */
  stamp(tags: readonly AromaTag[]): void {
    if (this.slot.getMaterial() === null) return;
    const payload: BulkPayload = this.slot.getPayload() ?? {};
    if (Concentration.isClean(tags)) {
      if (payload.dissolvedAromatics === undefined) return;
      const { dissolvedAromatics: _a, ...rest } = payload;
      this.slot.setPayload(rest);
      return;
    }
    this.slot.setPayload({
      ...payload,
      dissolvedAromatics: tags.map((t) => ({ ...t })),
    });
  }
}

/**
 * ⭐ Metabolism's third field on the blend payload, declared from the
 * subsystem that owns the word — the `formedToxins` / `dissolvedToxins`
 * move, for the same reason: a `BulkPayload` cannot compose a mixin, and
 * `lib/bulk` must not learn what an aroma is.
 */
declare module "../bulk/Bulkable" {
  interface BulkPayload {
    /**
     * Aroma compounds **per litre** of this matter, mg/L. Blend by volume
     * on every pour, every recipe output and every grind. Absent on
     * matter nothing flavoured — which is almost everything.
     */
    dissolvedAromatics?: AromaTag[];
  }
}
