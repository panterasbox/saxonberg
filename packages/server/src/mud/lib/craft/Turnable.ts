/**
 * Turnable — ⭐ the protocol behind the platform's `turn` (ceramics D25): a
 * thing you work by turning a screw or a handle — a screw press today, a
 * windlass or a capstan when a pack ships one. The verb is dumb; the THING
 * says what a turn did, in its own words.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';

/** What a turn came to. */
export type TurnOutcome =
  | { ok: true; line: Mml; peers?: Mml }
  | { ok: false; reason: string; line: Mml };

/** A thing worked by turning. */
export interface Turnable {
  /** Turn it one turn tighter (`back` — slacken it right off). */
  turnBy(actor: Stuff, back: boolean): Promise<TurnOutcome>;
}
