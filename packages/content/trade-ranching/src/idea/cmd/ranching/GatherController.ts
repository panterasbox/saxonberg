/**
 * GatherController — `gather <animal>`, the on-ramp's income.
 *
 * ⭐ **Eggs accrue**, which is D93's *accrual for the on-ramp*: collect
 * whenever, and a hen forgives an absence in a way a dairy cow does not.
 * That forgiveness is the same reason hens are the on-ramp, and D92 says
 * to make the coincidence deliberate rather than accidental.
 *
 * ⭐⭐ But the taps build found the old failure was the wrong biology.
 * Eggs do not *spoil in the nest* — a clean unwashed egg keeps for weeks
 * — and a hen is an **indeterminate layer**: she lays to a clutch and
 * then sits on it. So the choice is the real one, and it is at the act:
 * **take the clutch and she starts again, or leave it and she stops.**
 * One state flag, no invented punishment, and the broody hen is the
 * attach point for chicks when breeding comes.
 *
 * ⭐ Eggs are also COUNTED now (`yieldShape: 'count'`), so a take mints
 * eggs rather than a kilo of egg — which is what lets a recipe ask for
 * two.
 */

import { TapActController } from '@saxonberg/server/mud/platform/idea/cmd/inventory/TapActController';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class GatherController extends TapActController {
  protected tapKey(): string {
    return 'eggs';
  }

  protected nothingHere(): ReturnType<typeof Mml.compose> {
    return Mml.compose`There is nothing here that lays.`;
  }
}
