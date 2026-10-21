/**
 * Carvable — ⭐ the protocol behind the platform's `carve` (ceramics D14,
 * the collision ladder's rung 2: unify behind an interface).
 *
 * `carve` is one act — cutting away to a form with an edge: a haft out of
 * a billet, a foot turned on a leather-hard pot, a pattern out of a blank.
 * The verb is dumb; the TARGET plans. A green pot plans its own trim
 * (`GreenwareMixin.carvePlan`); a piece of wood carved by a recipe word is
 * the platform's generic recipe path (a carving recipe: one item, an edge).
 *
 * The `Cuttable` shape: a plan with a duration, an effort, a beginning and
 * an effect, or a refusal in words.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';
import type { AbortReason } from '@saxonberg/types';

export interface CarveRequest {
  /** Who is carving. */
  actor: Stuff;
  /** The word for what to carve (`foot`, `trim`, `haft`). */
  word: string;
  /** The edge the binder bound, or `null`. */
  knife: Stuff | null;
  /**
   * ⭐ What the carving is OF (ceramics D23): `carve pattern of sword` — the
   * thing a pattern copies the shape of. Absent for every other carving.
   */
  of?: Stuff | null;
  /**
   * The word the carving is FOR (`… for bronze`): the metal a pattern is
   * cut oversize for, by its shrinkage. `''` when unsaid.
   */
  forWord?: string;
}

export interface CarvePlan {
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

export interface CarveRefusal {
  ok: false;
  reason: string;
  line: Mml;
}

/** A thing that plans being carved. */
export interface Carvable {
  carvePlan(req: CarveRequest): Promise<CarvePlan | CarveRefusal>;
}
