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
 * to say (the default) — facts and a reason, never words: the `shape`
 * controller words every {@link ShapeRefusal} and {@link ShapeFacts}.
 *
 * The material affords `shape`: a lump of clay in your hands is an
 * invitation to coil it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActPlan, ActRefusal } from './ActPlan';
import type { FormRefusal } from './FormSpec';
import type { CompetenceBandName } from '../advancement/CompetenceBand';

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

/** A form beyond this maker's hand — the progression, said by the controller. */
export type BeyondHandRefusal = ActRefusal<
  'beyond-your-hand',
  { band: CompetenceBandName; maxL: number; maker: 'potter' | 'glassblower' }
>;

/**
 * ⭐ Every reason a shape is refused — at the plan or at completion — and
 * the `shape` controller words each (controllers-are-io D4).
 */
export type ShapeRefusal =
  | FormRefusal
  | BeyondHandRefusal
  /** The instrument does not make that class of form. */
  | ActRefusal<'wrong-instrument', { instrument: Stuff }>
  /** Nothing anybody has a name for; `coiling` is the mass worked by hand, if it was. */
  | ActRefusal<'no-product', { coiling: Stuff | null }>
  /** A gather that set hard before (or while) it was worked. */
  | ActRefusal<'set-hard'>
  /** At completion: the mass had nothing in it to shape. */
  | ActRefusal<'no-material'>
  /** At completion: the product row would not mint. */
  | ActRefusal<'unknown-product'>
  /** At completion: not enough clay for the piece. */
  | ActRefusal<'not-enough-clay'>;

/** What a shape's begin words need. */
export type ShapeBegin =
  /** A pot thrown on a wheel, `form` its description. */
  | { kind: 'throw'; instrument: Stuff; form: string }
  /** A day's moulding at a table. */
  | { kind: 'mould'; instrument: Stuff }
  /** A gather blown on a pipe, `form` its description (markup). */
  | { kind: 'blow'; form: string }
  /** A pot coiled by hand. */
  | { kind: 'coil' };

/** What a shape came to. */
export type ShapeFacts =
  | { kind: 'thrown'; made: Stuff }
  | { kind: 'moulded'; made: Stuff }
  | { kind: 'coiled'; made: Stuff }
  /** The gather took the form `form` (markup). */
  | { kind: 'blown'; form: string }
  /** The gather set and was lost to cullet (its own narration said so). */
  | { kind: 'lost' };

/** A shape plan. */
export type ShapePlan = ActPlan<ShapeBegin, ShapeFacts, ShapeRefusal>;

/** A material that can be shaped by hand. */
export interface Shapeable {
  /** The plan, a refusal, or `null` when this material has nothing to say. */
  shapePlanFor(req: ShapeRequest): Promise<ShapePlan | ShapeRefusal | null>;
}

export function ShapeableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ShapeableMixin extends Base implements Shapeable {
    static _mixinName = 'ShapeableMixin';
    static _mixinKind = 'protocol' as const;

    static commandContributions: CommandContributions = {
      environment: SHAPING,
      peers: SHAPING,
    };

    /** @hook The shape this material plans by hand — `null` when it has nothing to say. */
    public async shapePlanFor(_req: ShapeRequest): Promise<ShapePlan | ShapeRefusal | null> {
      return null;
    }
  };
}
