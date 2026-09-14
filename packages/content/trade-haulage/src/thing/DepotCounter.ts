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
 */

import { Vessel } from '@saxonberg/server/mud/lib/stuff/Vessel';
import { AttendantMixin } from '@saxonberg/server/mud/lib/attendant/Attendant';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MqlApi } from '@saxonberg/server/mud/api/mql';
import type { CommandContext, CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { ShipmentDeskMixin, type ShipmentDesk } from '../lib/haulage/ShipmentDesk';

const DepotCounterBase = ShipmentDeskMixin(AttendantMixin(Vessel));

export default class DepotCounter extends DepotCounterBase {
  static commandContributions: CommandContributions = {
    peers: ['trade/haulage/cmd/haulage/ship.yaml'],
    environment: ['trade/haulage/cmd/haulage/ship.yaml'],
  };

}
