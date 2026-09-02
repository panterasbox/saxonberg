/**
 * Ring — a **worn** charged host: `Wand`'s composition with `Wieldable`
 * replaced by `Wearable`, so it claims a body slot (a finger) rather
 * than a hand.
 *
 * What makes a ring a ring is not this class but `alwaysOn` on
 * `Charged` (D8): worn, an always-on ring discharges its bound working
 * as a `sustained` Condition on the wearer and keeps paying for it out
 * of its own shell (the standby draw), releasing it when taken off or
 * run flat. That wiring lives on the charged-host side (kernel
 * `Charged`, keyed on `alwaysOn`), never here — a circlet or an orb
 * gets it by the same composition. An `alwaysOn: false` ring is legal:
 * a wand you wear, fired with `zap`.
 *
 * Two classes (Ring, Amulet) rather than one "Worn" class because the
 * descriptor banks, the census keys and the slot claims are per kind,
 * and a player learns *ring* and *amulet* as distinct classes of thing
 * — the identification model keys on class.
 *
 * Ships in the arcana pack (`/system/arcana/thing/Ring`); the exemplar row is
 * the arcane library's `ring-of-veil`.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { ArcaneMixin } from '@saxonberg/server/mud/lib/magic/Arcane';
import { ChargedMixin } from '@saxonberg/server/mud/lib/magic/Charged';
import { CirculatingMixin } from '@saxonberg/server/mud/lib/residency/Circulating';
import { IdentifiableMixin } from '@saxonberg/server/mud/lib/identification/Identifiable';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { LabelledMixin } from '@saxonberg/server/mud/lib/description/Labelled';
import { BlessableMixin } from '@saxonberg/server/mud/lib/magic/Blessable';
import { WearableMixin } from '@saxonberg/server/mud/lib/slot/Wearable';
import { SlottableMixin } from '@saxonberg/server/mud/lib/slot/Slottable';

// The Wand composition, one mixin swapped: Wearable for Wieldable. See
// Wand.ts for why each of the others is here.
const RingBase = CirculatingMixin(
  WearableMixin(
    SlottableMixin(
      BlessableMixin(
        IdentifiableMixin(
          LabelledMixin(
            ChargedMixin(ReservedMixin(ArcaneMixin(DetailedMixin(Thing)))),
          ),
        ),
      ),
    ),
  ),
);

export default class Ring extends RingBase {}
