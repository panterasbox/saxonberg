/**
 * DepotCounter — **the interface**, where a lane touches the local
 * economy.
 *
 * Every piece of it is a shipped shape and that is the claim: an
 * **attendant queue** (the counter — one clerk, one customer at a time,
 * everybody else free to mill), a **shipment desk** (the trade's own
 * capability), and a `Business` behind it with positions and an account.
 * A depot is not a new kind of thing; it is three known things standing
 * in one place.
 *
 * ⭐ It affords `ship` to whoever is standing at it — **content affords
 * content**, so a second depot in a second town needs zero pack code.
 *
 * ⚠ **A `Holder`, not a `Vessel`** (the base-class narrowing,
 * D14). `Vessel` sits on `Good`, which composes `Chattel` and
 * `Concealable`; this is part of the premises — nobody's chattel, and you
 * cannot hide it. The container behaviour it wants is one mixin, so it
 * composes that mixin. The GOODS it holds are the chattel.
 */

import Holder from '@saxonberg/server/mud/lib/stuff/Holder';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { AttendantMixin } from '@saxonberg/server/mud/lib/attendant/Attendant';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MqlApi } from '@saxonberg/server/mud/api/mql';
import type { CommandContext, CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { ShipmentDeskMixin, type ShipmentDesk } from '../lib/haulage/ShipmentDesk';

const DepotCounterBase = ShipmentDeskMixin(
  AttendantMixin(Holder),
);

export default class DepotCounter extends DepotCounterBase {
  static commandContributions: CommandContributions = {
    peers: ['trade/haulage/cmd/haulage/ship.yaml'],
    environment: ['trade/haulage/cmd/haulage/ship.yaml'],
  };

}
