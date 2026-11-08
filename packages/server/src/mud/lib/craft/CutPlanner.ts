/**
 * CutPlanner — the tool's side of the cut protocol (`Cuttable` is the
 * target's): a tailor's shears plan the pattern pieces on any cloth, because
 * the bolt is the weaver's and the pattern the tailor's.
 *
 * ⚠ One composer, and still a kernel protocol: `cut` is a kernel verb and it
 * reaches a pack's tool, which needs a kernel-declared shape.
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';
import type { CutAnswerFor, CutRequest } from './Cuttable';

/** A tool that plans the cut of a target it knows how to cut. */
export interface CutPlanner {
  /** The plan, a refusal, or `null` when this tool has nothing to say about `target`. */
  cutPlanFor(target: Stuff, req: CutRequest<'cut'>): Promise<CutAnswerFor<'cut'> | null>;
}

/**
 * ⭐ **`CutPlannerMixin` — the tool's side of the cut, as a mixin**
 * (controllers-are-io W4).
 *
 * IS: a tool that plans the cut of a thing it knows how to cut that is not
 * {@link Cuttable} itself — a tailor's shears on a bolt of cloth (the bolt
 * is the weaver's; the pattern is the tailor's). IS NOT: the thing being
 * cut, nor a mere edge (an edge is the `cutting` capability on a `Tool`).
 *
 * ⚠ Kept a kernel protocol though it has one composer (trade-tailoring's
 * `CuttingTool`): the kernel `cut` must ask a PACK tool, and a kernel
 * controller cannot name a pack class — so the shape it asks is declared
 * here, and asked through `MixinApi.isCutPlanner`, never by probing for a
 * method. The default has nothing to say (`null`).
 */
export function CutPlannerMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CutPlannerMixin extends Base implements CutPlanner {
    static _mixinName: string = 'CutPlannerMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook Plan the cut of `target`, or `null` when this tool has nothing to say. */
    public async cutPlanFor(_target: Stuff, _req: CutRequest<'cut'>): Promise<CutAnswerFor<'cut'> | null> {
      return null;
    }
  };
}
