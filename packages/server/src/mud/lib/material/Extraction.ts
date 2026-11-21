/**
 * ExtractionMixin — *what a wall of this gives what it holds.*
 *
 * A capability of a material (material-decomposition D1), named for the
 * physics: contents held against a wall draw something out of it. Two
 * things come out, by the same act of holding:
 *
 *  - **`leaches`** — a toxin, drawn by the contents' acid (ceramics M7): a
 *    lead glaze leaches lead into vinegar, pewter into wine. Moved here from
 *    `ToxicityMixin` (matter-model-overlaps D11) — `Toxicity` says *it
 *    POISONS*, and what a wall gives is not the same claim.
 *  - **`imparts`** — the aromas the wall's own material gives a liquid it
 *    holds, mg/L at full give: oak gives oak and a little vanilla, a char
 *    coat vanilla and char. It moved here off the cask rows: every oak thing
 *    that holds a liquid gives oak, and a charred cask's character is its
 *    char COAT's material, not a second profile on the vessel.
 *
 * The exchange that reads both is the wall's (`FacedMixin.exchangeWith`):
 * the outermost layer of the inside face decides what meets the contents.
 * A consumer narrows with `MixinApi.hasExtraction(m)` and never on a kind.
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { AromaTag } from '../metabolism/DissolvedAromatics';
import { PerceptionApi } from '../../api/perception';

/** What a face gives its contents (ceramics M7). */
export interface LeachSpec {
  /** The toxin type, as metabolism names it (`lead` — the Condition row's `toxinType`, not its name). */
  toxin: string;
  /**
   * mg per litre per game-day against VINEGAR (pH 2.4, the acid a lead-
   * release test uses); other contents scale by their acid attack
   * (`Material.acidAttack`, from their pH).
   */
  mgPerLPerDay: number;
}

export interface Extraction {
  getLeaches(): readonly LeachSpec[];
  setLeaches(value: LeachSpec[] | null): void;
  /** The aromas this material gives a liquid held against it, mg/L at full give. */
  getImparts(): readonly AromaTag[];
  /** Author them — each aroma's row loads with the material; a malformed entry throws. */
  setImparts(value: readonly AromaTag[] | null): Promise<void> | undefined;
}

export function ExtractionMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ExtractionMixin extends Base implements Extraction {
    static _mixinName = 'ExtractionMixin';

    static fieldMeta: FieldMeta = {
      // ⭐⭐ What a face of this gives the contents it holds, per litre per
      // day against vinegar, scaled by their acid attack. `spoiler: 1` — the
      // lead in a glaze is the thing nobody tells you.
      leaches: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
      // ⭐ What the wall gives a liquid by aroma. `spoiler: 1, spoilerName: 0`
      // as the cask field it replaced: *that oak gives a spirit something* is
      // open knowledge, the FIGURES are the cooper's and the distiller's.
      imparts: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };

    /**
     * ⭐⭐ What a face of this material gives the contents it holds: a toxin,
     * at `mgPerLPerDay` × the contents' `acidAttack()` × days (ceramics M7).
     * Lead glaze leaches lead; ash glaze nothing.
     */
    protected leaches: LeachSpec[] = [];
    public getLeaches(): readonly LeachSpec[] {
      return this.leaches;
    }
    public setLeaches(value: LeachSpec[] | null): void {
      this.leaches = (Array.isArray(value) ? value : []).filter(
        (l) => l && typeof l.toxin === 'string' && l.toxin !== '' && l.mgPerLPerDay > 0,
      );
    }

    /**
     * What a wall of this gives a liquid it holds, mg/L at full give —
     * reached over `faces.wallGiveDays` of contact, and less as the wall is
     * spent by fills (`FacedMixin.noteFill`).
     */
    protected imparts: AromaTag[] = [];
    public getImparts(): readonly AromaTag[] {
      return this.imparts;
    }
    public setImparts(value: readonly AromaTag[] | null): Promise<void> | undefined {
      const list = value ?? [];
      if (!Array.isArray(list)) throw new TypeError('Material.setImparts: expected a list of { type, amount }');
      const catalogue = PerceptionApi.aromas();
      const out: AromaTag[] = [];
      for (const [i, raw] of list.entries()) {
        const tag = raw as { type?: unknown; amount?: unknown };
        if (!catalogue.isAromaPath(tag?.type)) {
          throw new TypeError(`Material.imparts[${i}]: '${String(tag?.type)}' is not an aroma path`);
        }
        if (typeof tag.amount !== 'number' || !Number.isFinite(tag.amount) || !(tag.amount > 0)) {
          throw new TypeError(`Material.imparts[${i}] ('${tag.type}') needs a positive amount (mg/L)`);
        }
        out.push({ type: tag.type, amount: tag.amount });
      }
      this.imparts = out;
      // Load on use: the aromas a material names load with it, so the wall's
      // give reads synchronously once the material is live.
      const unread = out.filter((t) => catalogue.resolveKnown(t.type) === null);
      return unread.length > 0
        ? Promise.all(unread.map((t) => catalogue.ensure(t.type))).then(() => undefined)
        : undefined;
    }
  };
}
