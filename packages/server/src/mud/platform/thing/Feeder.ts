/**
 * Feeder — ⭐ a vessel an animal feeds from: a saucer, a bowl, a trough.
 *
 * The concrete class the vessel rows name. Everything it can do it
 * inherits: interior bulk for water and milk (`fill`, `pour`, `drink`),
 * contents for scraps and cuts (`put`), chattel title so a bought one
 * persists with its owner. `FeederMixin` adds the single claim on top —
 * *an animal will eat from this* — which is what the `feeds` brain looks
 * for and what `lint:kept-animals` can name.
 *
 * ⭐ AC 26 in one line: a second feeding vessel is a **row**, not code.
 * The saucer and the trough differ by capacity and description alone.
 *
 * ⚠ Not every trough is one of these. The campus farm's scenery trough
 * stays a bare `Thing` — composing this would claim an animal feeds from
 * it, and nothing does.
 */

import { FeederMixin } from '../../lib/husbandry/Feeder';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { DetailedMixin } from '../../lib/description/Detailed';
import Thing from '../../lib/stuff/Thing';

const FeederBase = FeederMixin(
  BulkableMixin(ContainerMixin(DetailedMixin(Thing))),
);

export class Feeder extends FeederBase {}

export default Feeder;
