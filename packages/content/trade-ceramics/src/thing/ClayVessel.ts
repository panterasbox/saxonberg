/**
 * ClayVessel — ⭐ a vessel of clay, green or fired (ceramics D17): a mug, a
 * jug, a crock, a jar, a bowl, a dish, a flask, a crucible, a water filter.
 * Named for its composition, as its siblings are (`GlassBottle` a `Bottle`
 * of glass, `FlowerPot` a `PlantPot` of clay): a `CraftVessel` — it holds
 * bulk, it has a temperature, a maker and a grade — whose body is clay. It
 * was `Ware` until the review (2026-10-29): to everyone but a potter "wares"
 * is merchandise, which read as a second `Good`. It is also:
 *
 *  - GREEN until fired (`Greenware` over its own `Moisture`);
 *  - made of parts (`Assembled`), so `fit handle to jug` binds;
 *  - nameable by its maker (`Named` — the shelf of a player's own pots);
 *  - a composition (`Composition` — the clay's own make-up carried into the
 *    piece, which its crack risk, fired colour and grog read);
 *  - worn and broken (`Durable`).
 *
 * The same jug comes out of the kiln it went in: firing changes its
 * material, never its class (ceramics M1). ⚠ A pulled handle is not a
 * vessel: it is a `ClayPart`.
 */

import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { MoistureMixin } from '@saxonberg/server/mud/lib/material/Moisture';
import { AssembledMixin } from '@saxonberg/server/mud/lib/craft/Assembled';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';

const ClayVesselBase = GreenwareMixin(
  MarkedMixin(MoistureMixin(AssembledMixin(NamedMixin(DurableMixin(CompositionMixin(CraftVessel)))))),
);

export default class ClayVessel extends ClayVesselBase {}
