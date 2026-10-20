/**
 * Kneadable — ⭐ the protocol behind the platform's `knead` (ceramics D14,
 * the collision ladder's rung 2: unify behind an interface).
 *
 * `knead` is one act — working a plastic mass by hand to a window: a dough
 * until its gluten develops, a clay until its temper is even, raw rubber
 * until the sulfur is milled through. The verb is dumb; the VESSEL plans.
 * A baker's trough plans a dough (its build buffer becomes matter); a
 * mixing vessel plans a blend by mass (the kernel's default, ceramics R1);
 * a temper pit plans water to the window and the tread.
 *
 * The `Cuttable` shape: a plan with a duration, an effort, a beginning and
 * an effect, or a refusal in words.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';
import type { AbortReason } from '@saxonberg/types';

export interface KneadRequest {
  /** Who is kneading. */
  actor: Stuff;
  /** The command text, for a vessel that records it. */
  commandText: string;
}

export interface KneadPlan {
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

export interface KneadRefusal {
  ok: false;
  reason: string;
  line: Mml;
}

/** A vessel that plans a knead of what it holds. */
export interface KneadPlanner {
  kneadPlanFor(req: KneadRequest): Promise<KneadPlan | KneadRefusal>;
}
