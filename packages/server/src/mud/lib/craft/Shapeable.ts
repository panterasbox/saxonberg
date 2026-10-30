/**
 * ShapeableMixin — ⭐ the protocol behind the platform's `shape` (ceramics
 * D14, the collision ladder's rung 2: one act, unified behind an
 * interface), and the MATERIAL a hand shapes, declared as what the thing IS.
 *
 * `shape` is one act — forming a plastic material into a form, by hand or
 * with an instrument: clay on a wheel, clay in a brick mould, a gather of
 * glass on a pipe. The verb is dumb. The INSTRUMENT plans first
 * (`FormingMixin.shapePlanFor` — the wheel, the brick table, the blowpipe);
 * when no instrument has anything to say, the MATERIAL plans
 * (`ShapeableMixin.shapePlanFor` — hands coil anything). Both answer an
 * {@link ActPlan}, an {@link ActRefusal}, or `null` when they have nothing
 * to say (the default).
 *
 * The material affords `shape`: a lump of clay in your hands is an
 * invitation to coil it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActPlan, ActRefusal } from './ActPlan';

const SHAPING = ['platform/cmd/crafting/shape.yaml'];

export interface ShapeRequest {
  /** Who is shaping. */
  actor: Stuff;
  /** The material named, if one was (`shape clay …`); else the planner finds its own. */
  material: Stuff | null;
  /** The form phrase as typed (`tall jug holding 3 pints`, `bottle`). */
  formText: string;
  /** The command text, for a planner that records it. */
  commandText: string;
}

/** A material that can be shaped by hand. */
export interface Shapeable {
  /** The plan, a refusal, or `null` when this material has nothing to say. */
  shapePlanFor(req: ShapeRequest): Promise<ActPlan | ActRefusal | null>;
}

export function ShapeableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ShapeableMixin extends Base implements Shapeable {
    static _mixinName = 'ShapeableMixin';

    static commandContributions: CommandContributions = {
      environment: SHAPING,
      peers: SHAPING,
    };

    /** @hook The shape this material plans by hand — `null` when it has nothing to say. */
    public async shapePlanFor(_req: ShapeRequest): Promise<ActPlan | ActRefusal | null> {
      return null;
    }
  };
}
