/**
 * KneadVesselMixin — ⭐ the protocol behind the platform's `knead` (ceramics
 * D14, the collision ladder's rung 2: unify behind an interface), and the
 * VESSEL that plans it, declared as what the thing IS.
 *
 * `knead` is one act — working a plastic mass by hand to a window: a dough
 * until its gluten develops, a clay until its temper is even, raw rubber
 * until the sulfur is milled through. The verb is dumb; the VESSEL plans.
 * A baker's trough plans a dough (its build buffer becomes matter); a
 * mixing vessel plans a blend by mass (`CompoundingMixin`, the kernel's
 * default, ceramics R1) — and `stir` asks that same plan of it, the act
 * named by the state of the matter; a temper pit plans water to the window
 * and the tread.
 *
 * The composer implements `kneadPlanFor` — an {@link ActPlan}, an
 * {@link ActRefusal}, or `null` when this vessel has nothing to say (the
 * default). ⭐ Facts and a reason, never words (controllers-are-io D4): the
 * `knead` controller words every member of {@link KneadRefusal} and
 * {@link KneadFacts}. And the vessel affords `knead`: you stand at a trough or a pit,
 * or work a tub on the bench.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActPlan, ActRefusal } from './ActPlan';

const KNEADING = ['platform/cmd/crafting/knead.yaml'];

export interface KneadRequest {
  /** Who is kneading. */
  actor: Stuff;
  /**
   * The word the act was asked by — `knead`, or `stir` for a slurry, a
   * powder or a liquid — for the vessel's narration. Absent = `knead`.
   */
  verb?: string;
}

/** What the matter in a vessel wants doing to it — `knead` or `stir`. */
export type KneadWork = 'knead' | 'stir';

/** ⭐ Every reason a knead (or a compounding `stir`) is refused. */
export type KneadRefusal =
  /** Nothing in the vessel; `wants` names what should go in. */
  | ActRefusal<'empty', { wants: 'anything' | 'clay' }>
  /** The trough's build is empty — flour and water first. */
  | ActRefusal<'empty-build'>
  /** The matter wants the other work (B101). */
  | ActRefusal<'wrong-work', { work: KneadWork }>
  /** Ice is set in the pit. */
  | ActRefusal<'frozen', { ice: Stuff }>
  /** Something in the pit will not tread into clay. */
  | ActRefusal<'not-treadable', { hard: Stuff }>
  /** The pit holds no water to temper with. */
  | ActRefusal<'no-water'>
  /** At completion: there was nothing in it after all. */
  | ActRefusal<'came-empty', { verb: string }>
  /** At completion: it is one even mass already. */
  | ActRefusal<'already-compounded'>
  /** At completion: the mint failed — a fault in the books. */
  | ActRefusal<'mint-failed'>
  /** At completion: the trough's buffer is not a dough. */
  | ActRefusal<'not-a-dough'>;

/** What the begin words need. */
export type KneadBegin =
  /** A compounding vessel worked by `verb` (`knead`, `stir`, …). */
  | { kind: 'compound'; verb: string }
  /** Clay trodden in a temper pit. */
  | { kind: 'tread' }
  /** A dough worked in a trough. */
  | { kind: 'dough' };

/** What a knead came to. */
export type KneadFacts =
  /** Compounded into one product (`null` = the vessel's own belly). */
  | { kind: 'compounded'; product: Stuff | null }
  /** The dough came together in the trough. */
  | { kind: 'dough' };

/** A knead plan. */
export type KneadPlan = ActPlan<KneadBegin, KneadFacts, KneadRefusal>;

/** A vessel that plans a knead of what it holds. */
export interface KneadVessel {
  /** The plan, a refusal, or `null` when this vessel has nothing to say. */
  kneadPlanFor(req: KneadRequest): Promise<KneadPlan | KneadRefusal | null>;
}

export function KneadVesselMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class KneadVesselMixin extends Base implements KneadVessel {
    static _mixinName = 'KneadVesselMixin';
    static _mixinKind = 'protocol' as const;

    static commandContributions: CommandContributions = {
      environment: KNEADING,
      peers: KNEADING,
    };

    /** @hook The knead this vessel plans — `null` when it has nothing to say. */
    public async kneadPlanFor(_req: KneadRequest): Promise<KneadPlan | KneadRefusal | null> {
      return null;
    }
  };
}
