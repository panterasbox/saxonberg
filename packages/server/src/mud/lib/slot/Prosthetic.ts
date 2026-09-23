/**
 * ProstheticMixin — ⭐⭐ **a worn thing that stands in for what is gone**
 * (recovery D16): a peg leg, a hook hand.
 *
 * The load-bearing decision is that its function is DERIVED, never stored.
 * There is no `BodyPartDelta.prosthetic` field to keep in sync — a worn
 * prosthetic is just a `Wearable` whose presence `Vitals.ownFunction`
 * consults when the part it covers is missing. Take it off and the derived
 * read drops with no residue; the sever's `severPart` writes anatomy state
 * and this never does. That is why amputation (already live) needed nothing
 * new to be reversible-ish: the loss is real, the stand-in is derived.
 *
 * `fitsSlot` is candidate-side: it refuses a body that still HAS the part.
 * You cannot strap a peg leg over a whole leg — the slot is not free, and
 * more to the point the prosthetic is FOR a loss that has not happened.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slotted } from './Slotted';
import type { Wearable } from './Wearable';
import { MixinApi } from '../../api/mixin';

export interface Prosthetic extends Wearable {
  /** The body-part keys this stands in for (`body.leg.left`, …). */
  getForParts(): readonly string[];
  /** How much function it restores to a missing part, `[0, 1]`. */
  getRestores(): number;
}

export function ProstheticMixin<
  TBase extends MixinConstructor<Stuff & Wearable>,
>(Base: TBase) {
  return class ProstheticMixin extends Base {
    static _mixinName = 'ProstheticMixin';

    static fieldMeta: FieldMeta = {
      forParts: { persistent: true, authorable: true },
      restores: { persistent: true, authorable: true },
    };

    /** Parts it can stand in for. */
    public forParts: string[] = [];
    /** Function restored to a missing part, `[0, 1]`. */
    public restores = 0;

    public getForParts(): readonly string[] {
      return this.forParts;
    }
    public setForParts(value: string[]): void {
      this.forParts = [...value];
    }
    public getRestores(): number {
      return this.restores;
    }
    public setRestores(value: number): void {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
      ) {
        throw new RangeError(
          `ProstheticMixin.setRestores: expected a number in [0,1], got ` +
            `${String(value)}`,
        );
      }
      this.restores = value;
    }

    /**
     * ⭐ Fits only a body that is MISSING one of the parts it stands in for.
     * Super's per-body-plan claim check first (it goes in a wear slot like
     * any garment), then the candidate-side refusal: a whole body has no
     * loss for it to fill.
     */
    public fitsSlot(host: Stuff & Slotted, slot: string): boolean {
      if (!super.fitsSlot(host, slot)) return false;
      if (!MixinApi.isVitals(host)) return false;
      const missing = host.getMissingParts().map((p) => p.key);
      return this.forParts.some((p) => missing.includes(p));
    }
  };
}
