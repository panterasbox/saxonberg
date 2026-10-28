/**
 * CarvableMixin — ⭐ the protocol behind the platform's `carve` (ceramics
 * D14, the collision ladder's rung 2: unify behind an interface), and the
 * TARGET that plans being carved, declared as what the thing IS.
 *
 * `carve` is one act — cutting away to a form with an edge: a haft out of
 * a billet, a foot turned on a leather-hard pot, a pattern out of a blank.
 * The verb is dumb; the TARGET plans. A green pot plans its own trim
 * (`GreenwareMixin`), a mould its riser (`MouldMixin`), a board or a blank
 * a founder's pattern (carpentry's `PatternStockMixin`); a piece of wood
 * carved by a recipe word is the platform's generic recipe path (a carving
 * recipe: one item, an edge).
 *
 * The composer implements `carvePlanFor` — an {@link ActPlan}, an
 * {@link ActRefusal}, or `null` when this thing has nothing to say (the
 * default). And the thing affords `carve`: in your hands or at your feet.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActPlan, ActRefusal } from './ActPlan';

const CARVING = ['platform/cmd/crafting/carve.yaml'];

export interface CarveRequest {
  /** Who is carving. */
  actor: Stuff;
  /** The word for what to carve (`foot`, `trim`, `haft`). */
  word: string;
  /** The edge the binder bound, or `null`. */
  knife: Stuff | null;
  /**
   * ⭐ What the carving is OF (ceramics D23): `carve pattern of sword` — the
   * thing a pattern copies the shape of. Absent for every other carving.
   */
  of?: Stuff | null;
  /**
   * The word the carving is FOR (`… for bronze`): the metal a pattern is
   * cut oversize for, by its shrinkage. `''` when unsaid.
   */
  forWord?: string;
}

/** A thing that plans being carved. */
export interface Carvable {
  /** The plan, a refusal, or `null` when this thing has nothing to say. */
  carvePlanFor(req: CarveRequest): Promise<ActPlan | ActRefusal | null>;
}

export function CarvableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CarvableMixin extends Base implements Carvable {
    static _mixinName = 'CarvableMixin';

    static commandContributions: CommandContributions = {
      environment: CARVING,
      peers: CARVING,
    };

    /** @hook The carving this thing plans — `null` when it has nothing to say. */
    public async carvePlanFor(_req: CarveRequest): Promise<ActPlan | ActRefusal | null> {
      return null;
    }
  };
}
