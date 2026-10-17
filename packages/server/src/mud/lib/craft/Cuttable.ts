/**
 * Cuttable — ⭐ **a thing that plans its own cut** (storage-and-ice D16).
 *
 * `cut` is ONE kernel verb over this protocol (the collision ladder's
 * first rung: unify behind an interface). The verb binds a target and the
 * tools in reach; the TARGET says what cutting it with them means — how
 * long, how hard, what to say at the start and what is made at the end —
 * or refuses in its own words. Cloth plans a cut of pattern pieces; an ice
 * sheet plans a block off a marked grid; a second cuttable thing needs no
 * kernel edit.
 *
 * By shape, like `Workable`: an implementer answers `cutPlan(req)`; the
 * kernel controller never names a pack class.
 *
 * ⭐ Two sides may plan, and the kernel asks them in order: the TARGET
 * (`Cuttable` — an ice sheet plans a block off its own grid), then a bound
 * TOOL (`CutPlanner` — a tailor's shears plan a pattern on any cloth). The
 * second exists because the trade that knows how to cut a thing is not
 * always the trade that made it: the bolt is the weaver's, the pattern the
 * tailor's, and the instrument affords the verb.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';
import type { AbortReason } from '@saxonberg/types';

/** What the cut verb hands the target. */
export interface CutRequest {
  /** Who is cutting. */
  actor: Stuff;
  /** The tools the binder bound (the target narrows them by capability). */
  tools: readonly Stuff[];
  /** The raw word when the target was a word rather than a thing (`hole`, `marked`). */
  raw: string | null;
  /** The verb's options, carried through for the target that reads them. */
  options: { for?: Stuff | null; tight?: boolean; generous?: boolean };
}

/** A planned cut: an engaged step (the `ManualBuildController.engageStep` shape). */
export interface CutPlan {
  ok: true;
  /** Game-time the step occupies the hands, ms. */
  durationMs: number;
  /** Metabolic watts the step costs. */
  effortW: number;
  beginSelf: Mml;
  beginPeers?: Mml;
  /** The effect, at completion. */
  onComplete: () => void;
  onAbort?: (reason: AbortReason) => void;
}

/** A refused cut, in the target's words. */
export interface CutRefusal {
  ok: false;
  reason: string;
  line: Mml;
}

/** A thing that can plan a cut for an actor with a tool. */
export interface Cuttable {
  cutPlan(req: CutRequest): Promise<CutPlan | CutRefusal>;
}

/** A tool that plans the cut of a target it knows how to cut. */
export interface CutPlanner {
  /** The plan, a refusal, or `null` when this tool has nothing to say about `target`. */
  cutPlanFor(target: Stuff, req: CutRequest): Promise<CutPlan | CutRefusal | null>;
}
