/**
 * ConsumableMixin — a discrete item that packages **one act** and
 * spends itself performing it.
 *
 * The third of D5's three classes. A charged item supplies energy *and*
 * specification and is bounded by energy density; a focus supplies
 * specification only and is bounded by the user's reserve; a consumable
 * supplies **one packaged act** and is bounded by having been used.
 *
 * **Deliberately not composed with `Bulkable`.** The slate had
 * `Consumable` as orthogonal to bulk; requirements D4 split them
 * instead. Potions have volume, so they ride `Bulkable` and get dose,
 * dilution, splitting and spilling free (see `PotableMixin`). Scrolls
 * and wands have no volume, so they stay here — which keeps this
 * concept small and well-defined instead of making it the universal
 * wrapper for "things that get used up".
 *
 * **What is left behind is authored, not assumed.** A scroll burns to
 * nothing; a potion leaves its flask. `residueTemplatePath` says which,
 * and the empty default means *nothing remains*.
 *
 * ⚠ **The verb does not come from here, and it does not vary with
 * state.** A capability mixin declares a use-verb once (D23); the item
 * never does. And a **spent** consumable still affords its verb and
 * fails audibly (D34) — if a used-up scroll stopped affording `read`,
 * the affordance list would become a free inventory-state readout.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';

export interface Consumable {
  /** Uses left. 1 = the ordinary single-use case; 0 = spent. */
  getUsesRemaining(): number;
  setUsesRemaining(uses: number): void;
  /** Has this been used up? A spent item still affords its verb (D34). */
  isSpent(): boolean;
  /** What remains when the last use is spent. `''` = nothing. */
  getResidueTemplatePath(): string;
  setResidueTemplatePath(path: string): void;
  /**
   * Spend one use. Returns `false` when there was nothing left to
   * spend — the caller reports that audibly rather than silently
   * refusing.
   */
  spendUse(): boolean;
  /**
   * Spend one use and, if that was the last, remove the item — cloning
   * its residue into wherever the item was first, so the flask is left
   * behind exactly where the potion was. Returns the residue, or `null`
   * when the item survives or leaves nothing.
   */
  consume(): Promise<Stuff | null>;

  // ---------- storage (public for the Hydrator) ----------
  usesRemaining: number;
  residueTemplatePath: string;
}

export function ConsumableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ConsumableMixin extends Base implements Consumable {
    static _mixinName = 'ConsumableMixin';

    static fieldMeta: FieldMeta = {
      usesRemaining: { persistent: true, authorable: true },
      residueTemplatePath: { persistent: true, authorable: true },
    };

    /** Single-use is the ordinary case, so it is the default. */
    public usesRemaining: number = 1;

    /** Nothing remains, unless a template says otherwise. */
    public residueTemplatePath: string = '';

    public getUsesRemaining(): number {
      return this.usesRemaining;
    }

    public setUsesRemaining(uses: number): void {
      const n = Number(uses);
      if (!Number.isFinite(n) || n < 0) {
        throw new RangeError(
          `usesRemaining: must be a non-negative number, got '${String(uses)}'`,
        );
      }
      this.usesRemaining = Math.floor(n);
    }

    public isSpent(): boolean {
      return this.usesRemaining <= 0;
    }

    public getResidueTemplatePath(): string {
      return this.residueTemplatePath;
    }

    public setResidueTemplatePath(path: string): void {
      this.residueTemplatePath = typeof path === 'string' ? path : '';
    }

    public spendUse(): boolean {
      if (this.isSpent()) return false;
      this.usesRemaining -= 1;
      return true;
    }

    public async consume(): Promise<Stuff | null> {
      if (!this.spendUse()) return null;
      if (!this.isSpent()) return null;

      const self = this as unknown as Stuff;
      // Capture the destination BEFORE destructing — the residue takes
      // the item's place, so a flask is left where the potion was.
      const where = MixinApi.isContainable(self) ? self.getContainer() : null;
      let residue: Stuff | null = null;
      if (this.residueTemplatePath.length > 0) {
        residue = await StuffApi.clone(this.residueTemplatePath);
        if (
          where &&
          MixinApi.isContainer(where) &&
          MixinApi.isContainable(residue)
        ) {
          ContainmentApi.move(residue, where);
        }
      }
      StuffApi.destruct(self);
      return residue;
    }
  };
}
