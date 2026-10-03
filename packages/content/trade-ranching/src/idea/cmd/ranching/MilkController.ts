/**
 * MilkController — `milk <animal> [into <vessel>]`, and ⭐ **the tyrant
 * of the roster.**
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
 *
 * ⭐⭐⭐ And that cost is milk's WHOLE mechanism. The taps build looked
 * for a finer judgment at the act and found there isn't one: lactation
 * is demand-driven, so a take always empties her and holding some back
 * would suppress her rather than save it. What the player trades is
 * **attendance against her rate** — labour — which is why the standing
 * instruction is milk's answer and not a second dial.
 *
 * The body of the act is the kernel's {@link TapActController}; the
 * words and the credit are hers (`Livestock.tapTookPhrase`,
 * `tapCredit`). This file is the verb and nothing else.
 */

import { TapActController } from '@saxonberg/server/mud/platform/idea/cmd/inventory/TapActController';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class MilkController extends TapActController {
  protected tapKey(): string {
    return 'milk';
  }

  protected nothingHere(): ReturnType<typeof Mml.compose> {
    return Mml.compose`There is nothing here to milk.`;
  }
}
