/**
 * MilkController — `milk <animal>`, and ⭐ **the tyrant of the roster.**
 *
 * A dairy cow wants taking twice a game day, no exceptions, and the
 * failure is the sharpest in the build without being a cliff: **she
 * dries off for that lactation.** A season's income, gone; the animal
 * fine; the next lactation unaffected.
 *
 * ⭐⭐ That is D93's *expiry for the committed* and D92's commitment
 * ladder in one object. Nobody is told they cannot keep a dairy cow —
 * they are told, honestly and in advance, what one costs in attention,
 * and **a player's real-life cadence decides what they can keep.**
 */

import { TapController } from './TapController';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Livestock from '../../../agent/Livestock';

export default class MilkController extends TapController {
  protected tapKey(): string {
    return 'milk';
  }

  protected emptyPhrase(): ReturnType<typeof Mml.compose> {
    return Mml.compose`There is nothing in her yet. Come back later.`;
  }

  protected takePhrase(
    animal: Livestock,
    units: number,
    got: Stuff | null,
  ): ReturnType<typeof Mml.compose> {
    void got;
    return Mml.compose`You settle in against her flank and milk her out — ${units.toFixed(1)} litres, and she stands for it. ${animal.handlingPhrase()}.`;
  }
}
