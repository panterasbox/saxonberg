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
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ContainerMixin } from '../../lib/spatial/Container';
import { PopulatesMixin } from '../../lib/stuff/Populates';

const GlassRackBase = PopulatesMixin(ContainerMixin(DetailedMixin(Thing)));

export default class GlassRack extends GlassRackBase {}
