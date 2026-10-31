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
 * default). And the vessel affords `knead`: you stand at a trough or a pit,
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
  /** The command text, for a vessel that records it. */
  commandText: string;
  /**
   * The word the act was asked by — `knead`, or `stir` for a slurry, a
   * powder or a liquid — for the vessel's narration. Absent = `knead`.
   */
  verb?: string;
}

/** A vessel that plans a knead of what it holds. */
export interface KneadVessel {
  /** The plan, a refusal, or `null` when this vessel has nothing to say. */
  kneadPlanFor(req: KneadRequest): Promise<ActPlan | ActRefusal | null>;
}

export function KneadVesselMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class KneadVesselMixin extends Base implements KneadVessel {
    static _mixinName = 'KneadVesselMixin';

    static commandContributions: CommandContributions = {
      environment: KNEADING,
      peers: KNEADING,
    };

    /** @hook The knead this vessel plans — `null` when it has nothing to say. */
    public async kneadPlanFor(_req: KneadRequest): Promise<ActPlan | ActRefusal | null> {
      return null;
    }
  };
}
