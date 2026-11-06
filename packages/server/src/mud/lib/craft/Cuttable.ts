/**
 * Cuttable — ⭐ **a thing that plans its own cut** (storage-and-ice D16).
 *
 * `cut` is ONE kernel verb over this protocol (the collision ladder's
 * first rung: unify behind an interface). The verb binds a target and the
 * tools in reach; the TARGET says what cutting it with them means — how
 * long, how hard, what to say at the start and what is made at the end —
 * or refuses in its own words (an {@link ActPlan} or an {@link ActRefusal},
 * the one vocabulary of the crafting acts). An ice sheet plans a block off
 * a marked grid, a sugar loaf a piece off the cone; a second cuttable thing
 * needs no kernel edit.
 *
 * ⭐ A **protocol mixin** since controllers-are-io D8a
 * ({@link CuttableMixin}, `_mixinKind = 'protocol'`): an implementer
 * composes it and overrides `cutPlan(req)`; the verb asks
 * `MixinApi.isCuttable`, and the kernel controller never names a pack
 * class.
 *
 * ⭐ Two sides may plan, and the kernel asks them in order: the TARGET
 * (`Cuttable` — an ice sheet plans a block off its own grid), then a bound
 * TOOL (`CutPlanner` — a tailor's shears plan the pattern pieces on any
 * cloth). The second exists because the trade that knows how to cut a thing
 * is not always the trade that made it: the bolt is the weaver's, the
 * pattern the tailor's, and the instrument affords the verb.
 */

import type { Stuff } from '../stuff/Stuff';
import type { ActPlan, ActRefusal } from './ActPlan';
import type { MixinConstructor } from '../mixin';
import { Mml } from '../../api/mml';

/** What the cut verb hands the target. */
export interface CutRequest {
  /** Who is cutting. */
  actor: Stuff;
  /** The tools the binder bound (the target narrows them by capability). */
  tools: readonly Stuff[];
  /** The raw word when the target was a word rather than a thing (`hole`, `marked`). */
  raw: string | null;
  /**
   * ⭐ How much to cut off, as the player wrote it (`cut rope at 10 m`), or
   * `null` (cordage D4). The target parses it; most targets ignore it.
   */
  length: string | null;
  /** The verb's options, carried through for the target that reads them. */
  options: { for?: Stuff | null; tight?: boolean; generous?: boolean };
}

/** A thing that can plan a cut for an actor with a tool. */
export interface Cuttable {
  cutPlan(req: CutRequest): Promise<ActPlan | ActRefusal>;
}

/** A tool that plans the cut of a target it knows how to cut. */
export interface CutPlanner {
  /** The plan, a refusal, or `null` when this tool has nothing to say about `target`. */
  cutPlanFor(target: Stuff, req: CutRequest): Promise<ActPlan | ActRefusal | null>;
}

/**
 * ⭐ **`CuttableMixin` — the cut protocol, as a mixin.**
 *
 * IS: a thing that plans its own cut — a rope cut at a length, a sugar
 * loaf a piece off the cone, an ice sheet a block off its grid. IS NOT: a
 * tool that plans the cut of somebody else's thing (a tailor's shears on
 * any cloth answer {@link CutPlanner}, the tool's side), nor a stack you
 * count off.
 *
 * ⚠ The default REFUSES in the thing's words; a host overrides `cutPlan`.
 */
export function CuttableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CuttableMixin extends Base implements Cuttable {
    static _mixinName: string = 'CuttableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook Plan the cut, or refuse; the default refuses. */
    public async cutPlan(_req: CutRequest): Promise<ActPlan | ActRefusal> {
      return {
        ok: false,
        reason: 'not-cuttable',
        line: Mml.compose`You can't cut ${Mml.thing(this as unknown as Stuff)} like that.`,
      };
    }
  };
}
