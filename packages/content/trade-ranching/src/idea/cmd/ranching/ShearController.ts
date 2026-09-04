/**
 * ShearController — `shear <animal>`, and ⚠ **the failure is a worse
 * fleece and a hot sheep** (D25).
 *
 * Wool grows continuously and is harvested once, so there is no window
 * to miss and nothing to spoil. What neglect costs is **quality**: a
 * fleece left two years is matted, second-cut and worth less per kilo
 * than one taken at the right time — which is a real fact about wool and
 * is why shearing is an annual event rather than a chore.
 *
 * ⭐ **It closes textiles' sourceless `wool.yaml`.** That row shipped
 * with `biologicalSource: null` and a `ScutchController` written so that
 * *"naming the flax row here would be the one line that stops wool"*.
 * This is the animal it was waiting for.
 */

import { TapController, round2 } from './TapController';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Livestock from '../../../agent/Livestock';

/** Game-days of growth past which a fleece starts losing its quality. */
const PRIME_DAYS = 360;

export default class ShearController extends TapController {
  protected tapKey(): string {
    return 'wool';
  }

  protected emptyPhrase(): ReturnType<typeof Mml.compose> {
    return Mml.compose`There is nothing on it worth the shears yet.`;
  }

  protected takePhrase(
    animal: Livestock,
    units: number,
    got: Stuff | null,
  ): ReturnType<typeof Mml.compose> {
    void got;
    // ⚠ How long it has been growing is READ OFF the take, because a
    // continuous tap's standing amount IS its age in growth. No second
    // clock, and no way for the two to disagree.
    const overgrown = units > (PRIME_DAYS * 0.008) * 1.4;
    void animal;
    return overgrown
      ? Mml.compose`It comes off in one heavy matted piece — ${round2(units)} kilos of it, and half of that is second cuts and dung. It should have come off a year ago.`
      : Mml.compose`The fleece comes off clean in a single piece, ${round2(units)} kilos, and the animal walks away looking half the size.`;
  }
}
