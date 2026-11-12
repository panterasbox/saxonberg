/**
 * Maintainable — ⭐ **the fabric `maintain` keeps up** (controller-liquidity
 * W13, Appendix B): a building's sills and putty, a ship's seams and pitch.
 * One act — put a morning's work into the fabric with an upkeep kit — that
 * each host answers in its own terms. The verb used to switch on
 * `instanceof Ship` for its words, its Discipline and whether a thin coat
 * mattered; each of those is the host's fact now.
 *
 * ⭐ It mends the FABRIC (`Durable` condition) and nothing else: laying a
 * coat is `paint`'s, and a building with a sound fabric under a failing coat
 * says so rather than taking the kit's wear.
 *
 * The answer carries facts; the words are the verb's.
 */

import type { Stuff } from '../stuff/Stuff';
import type { ConditionWord } from '../material/Durable';

/** What kind of fabric this is, for the verb's words: a house or a hull. */
export type FabricKind = 'house' | 'hull';

/** Why the upkeep did nothing: the fabric is sound, or only its coat wants work. */
export type MaintainRefusal = 'already-sound' | 'coat-not-fabric';

/** What `maintainWith` answers: what the fabric was before it was made good, or why not. */
export type MaintainAnswer =
  | { ok: true; before: ConditionWord }
  | { ok: false; reason: MaintainRefusal };

/** Wear one beat of upkeep puts on the kit — a season of upkeep costs a kit. */
export const UPKEEP_KIT_WEAR = 0.08;

export interface Maintainable {
  /** A house or a hull — the verb words the work in the fabric's own terms. */
  fabricKind(): FabricKind;

  /** The Discipline the work exercises (`seamanship` for a hull), or null. */
  upkeepDiscipline(): string | null;

  /**
   * Put a beat of upkeep into the fabric with `kit` (already checked to
   * offer `upkeep`): refuse a sound fabric, else make it sound and wear
   * the kit.
   */
  maintainWith(kit: Stuff): MaintainAnswer;
}
