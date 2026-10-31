/**
 * ActPlan — ⭐ the ONE vocabulary every crafting act protocol answers in
 * (ceramics review, 2026-10-28): `knead`, `shape`, `carve`, `cut` and `dip`
 * are asked of an object that PLANS the act, and `impress`, `turn` and the
 * hand-worked `stir` of one that DOES it at once. The controller only words
 * what comes back (`docs/slates/builds/controllers-are-io-slate.md`).
 *
 *  - {@link ActPlan} — an engaged step: how long, how hard, what is said as
 *    it begins, and the effect at completion (which may still refuse, in
 *    words, when the world changed under the step).
 *  - {@link ActRefusal} — the act refused, in the object's own words.
 *  - {@link ActOutcome} — an instant act done: its line, and what onlookers
 *    see when the object says so itself.
 *
 * Every planner may also answer `null` — it has nothing to say about this
 * act — and the controller asks the next candidate, or words a refusal from
 * what is there.
 */

import type { Mml } from '../../api/mml';
import type { AbortReason } from '@saxonberg/types';

/** A refused act, in the object's own words. */
export interface ActRefusal {
  ok: false;
  reason: string;
  line: Mml;
}

/** A planned act: an engaged step (`ManualBuildController.engagePlan`). */
export interface ActPlan {
  ok: true;
  /**
   * Game-time the step occupies the hands, ms. ⚠ `0` = the effect runs
   * NOW, inside the command frame — for an act that is a craft resolved
   * from the actor's reach (the chandler's candle).
   */
  durationMs: number;
  /** Metabolic watts the step costs. */
  effortW: number;
  beginSelf: Mml;
  beginPeers?: Mml;
  /** The effect, at completion; a refusal it returns is narrated. */
  onComplete: () => void | ActRefusal | Promise<void | ActRefusal>;
  onAbort?: (reason: AbortReason) => void;
}

/** An instant act, done: what the actor is told, and onlookers if it says. */
export interface ActOutcome {
  ok: true;
  line: Mml;
  peers?: Mml;
}
