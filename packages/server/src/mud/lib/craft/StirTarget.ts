/**
 * StirTargetMixin — ⭐ the protocol behind `stir` (matter-model-overlaps D15):
 * the TARGET says what being stirred means here. `PourTargetMixin`'s shape —
 * one method, {@link StirTarget.stirPlanFor}, answered by what is stirred:
 *
 *  - a COMPOUNDING vessel (`CompoundingMixin`) folds what is in it into one
 *    blend — or refuses `wrong-work` when the matter is stiff;
 *  - a KNEAD vessel that compounds nothing (a baker's trough,
 *    `KneadVesselMixin`) holds a dough, and a dough is stiff: `wrong-work`;
 *  - a BUILD vessel (`ManualBuildMixin`) works the build by the method the
 *    vessel names — and with no build staged hands the question down to the
 *    liquid beneath it;
 *  - a HOLDER of bulk (`BulkableMixin`) stirs the liquid in its interior; a
 *    Thermal holder is asked whether the stir started a crystallization
 *    (`Thermal.noteAgitated`). Empty, or not liquid: `nothing-to-stir`.
 *
 * The controller calls the one method and words the answer; it never
 * narrows by host. ⚠ A thing can compose this twice (a build over a holder,
 * a trough over a build), so the default hands the question down rather
 * than shadowing what is beneath it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActPlan, ActRefusal } from './ActPlan';
import type { KneadRefusal, KneadWork } from './KneadVessel';
import type { Technique } from './Technique';

/** `stir`, asked of what is stirred. */
export interface StirRequest {
  /** Who is stirring. */
  actor: Stuff;
}

/** What the begin words need — which of the four answers began. */
export type StirBegin =
  /** A compound worked as its matter wants. */
  | { kind: 'compound'; verb: KneadWork }
  /** A build worked by the vessel's method. */
  | { kind: 'build'; method: Technique }
  /** A liquid in a holder, stirred. */
  | { kind: 'liquid' };

/** What a stir came to. */
export type StirFacts =
  /** Compounded into one product (`null` = the vessel's own belly). */
  | { kind: 'compounded'; product: Stuff | null }
  /** The build was worked, its method recorded. */
  | { kind: 'build'; method: Technique }
  /** The liquid was stirred; `started` — a crystallization began. */
  | { kind: 'liquid'; started: boolean };

/** ⭐ Every reason a stir is refused. */
export type StirRefusal =
  | Extract<
      KneadRefusal,
      { reason: 'empty' | 'wrong-work' | 'came-empty' | 'already-compounded' | 'mint-failed' }
    >
  /** Nothing liquid to stir — the reason's row words it. */
  | ActRefusal<'nothing-to-stir', { vessel: Stuff }>;

/** A stir plan. */
export type StirPlan = ActPlan<StirBegin, StirFacts, StirRefusal>;

/** What being stirred answers. */
export type StirAnswer = StirPlan | StirRefusal;

export interface StirTarget {
  /** @hook What being stirred means here. */
  stirPlanFor(req: StirRequest): Promise<StirAnswer> | StirAnswer;
}

export function StirTargetMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class StirTargetMixin extends Base implements StirTarget {
    static _mixinName: string = 'StirTargetMixin';
    static _mixinKind = 'protocol' as const;

    /**
     * See {@link StirTarget.stirPlanFor}. Default: hand the question to what
     * is beneath; with nothing beneath, there is nothing to stir.
     */
    public stirPlanFor(req: StirRequest): Promise<StirAnswer> | StirAnswer {
      const beneath = (Base.prototype as Partial<StirTarget>).stirPlanFor;
      if (beneath) return beneath.call(this, req);
      return { ok: false, reason: 'nothing-to-stir', facts: { vessel: this as unknown as Stuff } };
    }
  };
}
