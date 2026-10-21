/**
 * Impressible — ⭐ the protocol behind the platform's `impress` (alias
 * `mold`; ceramics D21): pressing a hard shape into something soft. The
 * MEDIUM decides what that makes of it — a leather-hard pot takes its
 * maker's mark; a sand flask or a wax block takes an impression of the
 * whole pattern (moulding, W7); a hot blank on a die takes the die.
 *
 * The verb is dumb; the medium answers.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';

/** What an impression came to, said in the medium's own words. */
export type ImpressOutcome =
  | { ok: true; line: Mml }
  | { ok: false; reason: string; line: Mml };

/** A medium a pattern can be pressed into. */
export interface Impressible {
  takeImpression(pattern: Stuff, actor: Stuff): Promise<ImpressOutcome>;
}
