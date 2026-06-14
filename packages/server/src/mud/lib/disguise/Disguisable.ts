/**
 * DisguisableMixin — the wearer-side resolver: a Creature whose
 * presented identity can be masked by a covering.
 *
 * `getDisguise()` is a **viewer-blind** resolver over two sources:
 *   (a) worn `DisguiseBearing` garments (scanned live from the slot
 *       substrate — no stored copy, so removing the hood un-masks for
 *       free on the next render), and
 *   (b) one transient *imposed* disguise (`setDisguise`/`clearDisguise`)
 *       for non-worn effects (a spell, a polymorph) — active-effect
 *       state, deliberately NOT persisted.
 *
 * The merged result feeds two consumers:
 *   - `Stuff.getPresentation()` defers to it, so the masked `appearsAs`
 *     ("a hooded figure") becomes the identity base at the viewer-blind
 *     layer — masking is one place, not a shadow on every synthesizer.
 *   - `RecognitionApi.describe` reads `masksIdentity` to withhold a
 *     *known* name from viewers who would otherwise recognize the
 *     wearer. That viewer-relativity stays in `describe`; this resolver
 *     is objective.
 *
 * Composed on `Creature` (a body concern). NOT on items — item-identity
 * illusion is the type axis (Wave 7), not creature disguise.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { type Disguise, mergeDisguises } from './Disguise';

/** Wearer-side surface. */
export interface Disguisable {
  /** Effective merged disguise (worn + imposed), or `null` if unmasked. */
  getDisguise(): Disguise | null;
  /** Impose a transient disguise (active-effect; not persisted). */
  setDisguise(disguise: Disguise | null): void;
  /** Drop the imposed disguise. Worn coverings are unaffected. */
  clearDisguise(): void;
}

export function DisguisableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class DisguisableMixin extends Base implements Disguisable {
    static _mixinName = 'DisguisableMixin';

    // Transient imposed disguise — active-effect state, NOT a
    // persistentField (a worn hood persists as the garment; an imposed
    // spell-disguise is re-applied by its effect on reload).
    private _imposedDisguise: Disguise | null = null;

    getDisguise(): Disguise | null {
      const sources: Disguise[] = [];
      if (this._imposedDisguise) sources.push(this._imposedDisguise);
      // Live worn-scan: any DisguiseBearing garment occupying a slot.
      const self = this as unknown as Stuff;
      if (MixinApi.isSlotted(self)) {
        for (const occupants of self.getAllOccupants().values()) {
          for (const occupant of occupants) {
            if (MixinApi.isDisguiseBearing(occupant)) {
              const d = occupant.getDisguise();
              if (d) sources.push(d);
            }
          }
        }
      }
      return mergeDisguises(sources);
    }

    setDisguise(disguise: Disguise | null): void {
      this._imposedDisguise = disguise;
    }

    clearDisguise(): void {
      this._imposedDisguise = null;
    }
  };
}
