/**
 * Shapeable — ⭐ the protocol behind the platform's `shape` (ceramics D14,
 * the collision ladder's rung 2: one act, unified behind an interface).
 *
 * `shape` is one act — forming a plastic material into a form, by hand or
 * with an instrument: clay on a wheel, clay in a brick mould, a gather of
 * glass on a pipe. The verb is dumb. The INSTRUMENT plans first
 * (`ShapePlanner.shapePlanFor` — the wheel, the brick table, the blowpipe);
 * when no instrument has anything to say, the MATERIAL plans
 * (`Shapeable.shapePlan` — hands coil anything). The `Cuttable` shape: a
 * plan with a duration, an effort, a beginning and an effect, or a refusal
 * in words.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';
import type { AbortReason } from '@saxonberg/types';

export interface ShapeRequest {
  /** Who is shaping. */
  actor: Stuff;
  /** The material named, if one was (`shape clay …`); else the planner finds its own. */
  material: Stuff | null;
  /** The form phrase as typed (`tall jug holding 3 pints`, `bottle`). */
  formText: string;
  /** The command text, for a planner that records it. */
  commandText: string;
}

export interface ShapePlan {
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

export interface ShapeRefusal {
  ok: false;
  reason: string;
  line: Mml;
}

/** A material that can be shaped by hand. */
export interface Shapeable {
  shapePlan(req: ShapeRequest): Promise<ShapePlan | ShapeRefusal>;
}

/** An instrument that shapes (a wheel, a brick table, a blowpipe). */
export interface ShapePlanner {
  /** The plan, a refusal, or `null` when this instrument has nothing to say. */
  shapePlanFor(req: ShapeRequest): Promise<ShapePlan | ShapeRefusal | null>;
}
