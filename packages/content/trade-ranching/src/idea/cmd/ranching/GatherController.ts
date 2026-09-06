/**
 * GatherController — `gather <animal>`, the on-ramp's income.
 *
 * ⭐ **Eggs accrue**, which is D93's *accrual for the on-ramp*: collect
 * whenever, and a hen forgives an absence in a way a dairy cow does not.
 * That forgiveness is the same reason hens are the on-ramp, and D92 says
 * to make the coincidence deliberate rather than accidental.
 *
 * ⚠ Past what a clutch will hold they spoil in the nest, so the surplus
 * is simply gone — a slope with a ceiling rather than a cliff, and the
 * gentlest failure in the build.
 */

import { TapController, round2 } from './TapController';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

export default class GatherController extends TapController {
  protected tapKey(): string {
    return 'eggs';
  }

  protected emptyPhrase(): ReturnType<typeof Mml.compose> {
    return Mml.compose`Nothing in the nest. ⚠ Short days will do that, and there is nothing wrong with the bird.`;
  }

  protected takePhrase(
    _animal: unknown,
    units: number,
    got: Stuff | null,
  ): ReturnType<typeof Mml.compose> {
    void got;
    return Mml.compose`You feel under the straw and come away with ${round2(units)} kilos of eggs, still warm.`;
  }
}
