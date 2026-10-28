/**
 * DipBathMixin — ⭐ a BATH that plans a dip (`DipPlanner`), declared as what
 * the thing IS: the chandler's dip pot (a candle), a tub of glaze or slip
 * (a coat, `CompoundingMixin`), a pot of molten glass (a gather). `dip`
 * binds its bath by this mixin and asks each one; a thing that bears none
 * is no bath, and the binder says so (ceramics review, 2026-10-28).
 *
 * The composer implements `dipPlanFor` — the default has nothing to say
 * (`null`). And the bath affords `dip`: you dip things INTO it, standing
 * at it or carrying it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { DipPlan, DipPlanner, DipRefusal, DipRequest } from './DipPlanner';

const DIPPING = ['platform/cmd/crafting/dip.yaml'];

/** A bath that plans a dip. */
export type DipBath = DipPlanner;

export function DipBathMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class DipBathMixin extends Base implements DipBath {
    static _mixinName = 'DipBathMixin';

    static commandContributions: CommandContributions = {
      environment: DIPPING,
      peers: DIPPING,
    };

    /** @hook The dip this bath plans — `null` when it has nothing to say. */
    public async dipPlanFor(_target: Stuff | null, _req: DipRequest): Promise<DipPlan | DipRefusal | null> {
      return null;
    }
  };
}
