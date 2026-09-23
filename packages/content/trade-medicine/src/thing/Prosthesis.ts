/**
 * Prosthesis — ⭐ a worn stand-in for a missing body part (recovery D16):
 * a peg leg, a hook hand. A `Wearable` that composes `ProstheticMixin`, so
 * its function is DERIVED by `Vitals.ownFunction` off `restores` and never
 * stored. `fitsSlot` refuses a whole body; the sold rows author `forParts`
 * + `restores` + the per-body-plan `slotClaims`.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { SlottableMixin } from '@saxonberg/server/mud/lib/slot/Slottable';
import { WearableMixin } from '@saxonberg/server/mud/lib/slot/Wearable';
import { ProstheticMixin } from '@saxonberg/server/mud/lib/slot/Prosthetic';

const ProsthesisBase = ProstheticMixin(
  WearableMixin(SlottableMixin(DetailedMixin(Thing))),
);

export default class Prosthesis extends ProsthesisBase {}
