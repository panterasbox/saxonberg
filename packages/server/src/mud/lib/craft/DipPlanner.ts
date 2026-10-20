/**
 * DipPlanner — ⭐ the protocol behind the platform's `dip` (ceramics D14,
 * the collision ladder's rung 2: one act, unified behind an interface).
 *
 * `dip` is one act — putting a thing into a bath and drawing it out with
 * something of the bath on it: a wick into hot fat until a candle builds
 * up, a bisque crock into a glaze slip until it carries a coat. The verb
 * is dumb; the BATH plans. A chandler's pot plans a candle (and melts a
 * cold cake first); a bath whose material lays a coat (`Material.laysCoat`)
 * is the kernel's default and lays a WET coat on the dipped good's face.
 * The paint slate's reservation is honoured: `dip` is the coat-from-bath
 * primitive, and `paint` will be the brush.
 *
 * The `Cuttable` / `Kneadable` shape: a plan with a duration, an effort, a
 * beginning and an effect, or a refusal in words — or `null` when this
 * bath has nothing to say about the act.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';
import type { AbortReason } from '@saxonberg/types';
import type { FaceName } from '../material/Faced';

export interface DipRequest {
  /** Who is dipping. */
  actor: Stuff;
  /** What is being dipped, when the player named something. */
  target: Stuff | null;
  /** The faces named (`inside` / `outside`); `null` = every face it has. */
  faces: FaceName[] | null;
  /** The raw word the player gave for the target, if any. */
  raw: string | null;
}

export interface DipPlan {
  ok: true;
  /**
   * Game-time the step occupies the hands, ms. ⚠ `0` = the effect runs
   * NOW, inside the command frame — for a bath whose act is a craft that
   * resolves from the actor's reach (the chandler's candle).
   */
  durationMs: number;
  /** Metabolic watts the step costs. */
  effortW: number;
  beginSelf: Mml;
  beginPeers?: Mml;
  /** The effect, at completion; a refusal it returns is narrated. */
  onComplete: () => void | DipRefusal | Promise<void | DipRefusal>;
  onAbort?: (reason: AbortReason) => void;
}

export interface DipRefusal {
  ok: false;
  reason: string;
  line: Mml;
}

/** A bath that plans a dip. */
export interface DipPlanner {
  /** The plan, a refusal, or `null` when this bath has nothing to say. */
  dipPlanFor(target: Stuff | null, req: DipRequest): Promise<DipPlan | DipRefusal | null>;
}
