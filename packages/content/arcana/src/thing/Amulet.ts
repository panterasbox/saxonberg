/**
 * Amulet — the worn charged host at the neck: `Ring`'s composition,
 * a different kind of thing. Per-kind because the descriptor bank
 * (`amulet`), the census key and the slot claim (`neck`) are per kind
 * — see Ring.ts for the wear wiring, which is `Charged`'s and not
 * either class's.
 *
 * Ships in the arcana pack (`/arcana/thing/Amulet`); the exemplar row
 * is the arcane library's `amulet-of-glowlight`.
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

const AmuletBase = CirculatingMixin(
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

export default class Amulet extends AmuletBase {}
