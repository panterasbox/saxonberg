/**
 * GlassRack — the bar's glass pool: an open `Container` the clean glasses
 * live in. `CraftingLogic` claims a clean, empty glass from reach (the
 * gather walk descends open room containers, so a rack's contents are in
 * the pool scan) instead of minting one per drink; a bussed glass goes
 * back with `put <glass> in rack`, and `wash` clears it for the next.
 *
 * Deliberately NOT `Sealable`: a rack has no lid, so it is always open to
 * the walk. `Populates` so a bar bundle authors its dozen coupes in place.
 * Content, not class, decides which glasses a given rack holds.
 *
 * Ships at `/trade/hospitality/thing/GlassRack` (the capability rung): a
 * class lives in the pack whose content is the only thing that names it,
 * and a glass rack is a bar fixture. Nothing in the kernel refers to it —
 * `CraftingLogic` finds a rack's contents because the gather walk
 * descends any open `Container`, never because it knows this class.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { PopulatesMixin } from '@saxonberg/server/mud/lib/stuff/Populates';

const GlassRackBase = PopulatesMixin(ContainerMixin(DetailedMixin(Thing)));

export default class GlassRack extends GlassRackBase {
  constructor() {
    super();
    // ⭐ Fixed in place. The rack is built in; the glasses IN it are
    // what you take.
    this.fixedInPlace = true;
  }
}
