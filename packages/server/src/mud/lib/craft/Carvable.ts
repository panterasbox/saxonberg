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
 * {@link ActRefusal} (facts and a reason; the controller words them,
 * controllers-are-io D4), or `null` when this thing has nothing to say (the
 * default). And the thing affords `carve`: in your hands or at your feet.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActPlan, ActRefusal } from './ActPlan';
import type { CraftingFailure } from './CraftingDecline';

const CARVING = ['platform/cmd/crafting/carve.yaml'];

export interface CarveRequest {
  /** Who is carving. */
  actor: Stuff;
  /** The word for what to carve (`foot`, `trim`, `haft`). */
  word: string;
  /** The edge the binder bound, or `null`. */
  knife: Stuff | null;
  /**
   * ⭐ What the carving is OF (ceramics D23): `carve pattern --of sword` — the
   * thing a pattern copies the shape of. Absent for every other carving.
   */
  of?: Stuff | null;
  /**
   * The word the carving is FOR (`… for bronze`): the metal a pattern is
   * cut oversize for, by its shrinkage. `''` when unsaid.
   */
  forWord?: string;
  /**
   * The wood named to carve a part FROM (`carve peg from the blank`) when
   * it plans nothing itself — preferred, not required, by the generic
   * carving (`RecipeCatalogue.carvingPlanFor`).
   */
  stock?: Stuff | null;
}

/** What a carving is for, when a refusal says what it needs. */
export type CarvingKind = 'trim' | 'riser' | 'pattern' | 'carving';

/**
 * ⭐ Every reason a thing refuses its carving — `CarveController` words
 * each (controllers-are-io D4); the carved thing itself is the controller's
 * own target, so the facts carry only what it is not.
 */
export type CarveRefusal =
  /** The word is not one this thing carves; `carves` says what it does. */
  | ActRefusal<'not-carvable', { carves: CarvingKind }>
  | ActRefusal<'no-edge', { carves: CarvingKind }>
  // green ware at the wrong moment (shared with `impress`)
  | ActRefusal<'ruined'>
  | ActRefusal<'fired', { act: 'trim' | 'stamp' }>
  | ActRefusal<'too-soft', { act: 'trim' | 'stamp' }>
  | ActRefusal<'too-dry', { act: 'trim' | 'stamp' }>
  // a mould's riser
  | ActRefusal<'no-cavity'>
  | ActRefusal<'has-riser'>
  // a founder's pattern
  | ActRefusal<'self-target'>
  | ActRefusal<'green-stock'>
  | ActRefusal<'no-shape', { of: Stuff }>
  | ActRefusal<'no-metal', { of: Stuff }>
  | ActRefusal<'too-small', { of: Stuff }>
  // ⭐ the generic carving — a recipe row (controller-liquidity W7c)
  /** No word: the carvings installed, by name. */
  | ActRefusal<'no-part', { names: readonly string[] }>
  /** The word names no carving: the carvings installed, by name. */
  | ActRefusal<'not-a-carving', { word: string; names: readonly string[] }>
  | ActRefusal<'wrong-tool', { knife: Stuff }>
  | ActRefusal<'craft-refused', { failure: CraftingFailure }>;

/** What a carving's begin words need. */
export type CarveBegin =
  | { kind: 'trim'; knife: Stuff }
  | { kind: 'riser' }
  | { kind: 'pattern'; of: Stuff; metalName: string }
  | { kind: 'carving'; knife: Stuff };

/** What a carving came to. */
export type CarveDone =
  /** A feature worked into a green piece (`a turned foot`). */
  | { kind: 'trimmed'; feature: string }
  | { kind: 'riser' }
  | { kind: 'pattern'; pattern: Stuff; formDescription: string; metalName: string }
  /** A part carved out of a piece of wood by a carving row. */
  | { kind: 'carved'; knife: Stuff; output: Stuff }
  /** The thing or the carver was gone when the step landed (nothing said). */
  | { kind: 'gone' };

export type CarvePlan = ActPlan<CarveBegin, CarveDone, CarveRefusal>;

/** A thing that plans being carved. */
export interface Carvable {
  /** The plan, a refusal, or `null` when this thing has nothing to say. */
  carvePlanFor(req: CarveRequest): Promise<CarvePlan | CarveRefusal | null>;
}

export function CarvableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CarvableMixin extends Base implements Carvable {
    static _mixinName = 'CarvableMixin';
    static _mixinKind = 'protocol' as const;

    static commandContributions: CommandContributions = {
      environment: CARVING,
      peers: CARVING,
    };

    /** @hook The carving this thing plans — `null` when it has nothing to say. */
    public async carvePlanFor(_req: CarveRequest): Promise<CarvePlan | CarveRefusal | null> {
      return null;
    }
  };
}
