/**
 * Ware — ⭐ a potter's piece (ceramics D17): a mug, a jug, a crock, a jar, a
 * bowl, a flask, a crucible, a handle. A vessel (`CraftVessel` — it holds
 * bulk, it has a temperature, a maker and a grade) that is also:
 *
 *  - GREEN until fired (`Greenware` over its own `WaterActivity`);
 *  - made of parts (`Assembled`), so `fit handle to jug` binds;
 *  - nameable by its maker (`Named` — the shelf of a player's own pots);
 *  - a composition (`Composition` — the clay's own make-up carried into the
 *    piece, which its crack risk, fired colour and grog read);
 *  - worn and broken (`Durable`).
 *
 * The same jug comes out of the kiln it went in: firing changes its
 * material, never its class (ceramics M1).
 */

import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { WaterActivityMixin } from '@saxonberg/server/mud/lib/material/WaterActivity';
import { AssembledMixin } from '@saxonberg/server/mud/lib/craft/Assembled';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';

const WareBase = GreenwareMixin(
  WaterActivityMixin(AssembledMixin(NamedMixin(DurableMixin(CompositionMixin(CraftVessel))))),
);

export default class Ware extends WareBase {}
