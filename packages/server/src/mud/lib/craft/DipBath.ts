/**
 * DipBathMixin — ⭐ the protocol behind the platform's `dip` (ceramics D14,
 * the collision ladder's rung 2: one act, unified behind an interface), and
 * the BATH that plans it, declared as what the thing IS: the chandler's dip
 * pot (a candle), a tub of glaze or slip (a coat, `CompoundingMixin`), a pot
 * of molten glass (a gather). `dip` binds its bath by this mixin and asks
 * each one; a thing that bears none is no bath, and the binder says so
 * (ceramics review, 2026-10-28).
 *
 * `dip` is one act — putting a thing into a bath and drawing it out with a
 * LAYER of the bath on it: a wick into hot fat until a candle builds up, a
 * bisque crock into a glaze slip until it carries a coat. ⚠ A layer, and
 * that is the line: a dye goes INTO the fiber (`dye`), a quench only cools
 * (`quench`) — both are a thing in a bath and drawn out, and neither leaves
 * anything ON it, so neither is a dip (the paint slate's "dip stays
 * dip-coating"). The verb is dumb; the BATH plans. A chandler's pot plans
 * a candle (and melts a cold cake first); a tub whose material lays a coat
 * (`Material.laysCoat`, `CompoundingMixin`) lays a WET coat on the dipped
 * good's face.
 * The paint slate's reservation is honored: `dip` is the coat-from-bath
 * primitive, and `paint` will be the brush.
 *
 * The composer implements `dipPlanFor` — an {@link ActPlan}, an
 * {@link ActRefusal}, or `null` when this bath has nothing to say (the
 * default). And the bath affords `dip`: you dip things INTO it, standing at
 * it or carrying it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { FaceName } from '../material/Faced';
import type { ActPlan, ActRefusal } from './ActPlan';

const DIPPING = ['platform/cmd/crafting/dip.yaml'];

export interface DipRequest {
  /** Who is dipping. */
  actor: Stuff;
  /** What is being dipped, when the player named something. */
  target: Stuff | null;
  /** The faces named (`inside` / `outside`); `null` = every face it has. */
  faces: FaceName[] | null;
  /** The raw word the player gave for the target, if any. */
  raw: string | null;
}

/** A bath that plans a dip. */
export interface DipBath {
  /** The plan, a refusal, or `null` when this bath has nothing to say. */
  dipPlanFor(req: DipRequest): Promise<ActPlan | ActRefusal | null>;
}

export function DipBathMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class DipBathMixin extends Base implements DipBath {
    static _mixinName = 'DipBathMixin';

    static commandContributions: CommandContributions = {
      environment: DIPPING,
      peers: DIPPING,
    };

    /** @hook The dip this bath plans — `null` when it has nothing to say. */
    public async dipPlanFor(_req: DipRequest): Promise<ActPlan | ActRefusal | null> {
      return null;
    }
  };
}
