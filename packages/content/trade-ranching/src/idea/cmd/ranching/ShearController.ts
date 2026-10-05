/**
 * ShearController — `shear <animal>`, and ⚠ **the failure is a worse
 * fleece and a hot sheep** (D25).
 *
 * Wool grows continuously and is harvested once, so there is no window
 * to miss and nothing to spoil. What neglect costs is **quality** — and
 * since the taps build that is RECORDED rather than inferred:
 * `TapState.worst` holds the worst condition the fleece lived through,
 * leaves with the take, and lands on the yield's grade band. A ewe who
 * went hungry in February carries the break in the wool in June, and
 * feeding her up afterwards does not heal it.
 *
 * ⭐ **It closes textiles' sourceless `wool.yaml`.** That row shipped
 * with `biologicalSource: null` and a `ScutchController` written so that
 * *"naming the flax row here would be the one line that stops wool"*.
 * This is the animal it was waiting for.
 */

import { TapActController } from '@saxonberg/server/mud/platform/idea/cmd/inventory/TapActController';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class ShearController extends TapActController {
  protected tapKey(): string {
    return 'wool';
  }

  protected nothingHere(): ReturnType<typeof Mml.compose> {
    return Mml.compose`There is nothing here to shear.`;
  }
}
