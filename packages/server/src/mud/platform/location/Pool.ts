/**
 * Pool — ⭐ **a water you can be in**: the kernel's instanceable water
 * place (underwater-plan D1).
 *
 * Everything that makes it water is `WaterPlaceMixin`'s — the cited water
 * and the depth of the floor in it (`water: { of, depthM }`), who is in
 * the water and who the floor holds up, what sinks, how cold it is. This
 * class only composes it on a place that is beside that water (`Shore`,
 * the source to draw from) and lets a body swim (`Swimmable`).
 *
 * ⭐⭐ **The water's surface is its floor** (storage-and-ice D12): the
 * kernel `WaterSurface` by default, or a row's `floor:` (the water pack's
 * ice sheet for a harvest pool). A phase change never creates or removes
 * space; what changed is what is underfoot.
 *
 * A row is an authored water place: Hollow Mere, the estuary cove, the
 * Duncan Hall cistern, the basin below the Wharfside quay.
 */

import Locale from './Locale';
import { ShoreMixin } from '../../lib/location/Shore';
import { SwimmableMixin } from '../../lib/locomotion/Swimmable';
import { WaterPlaceMixin } from '../../lib/location/WaterPlace';
import { TemplatePaths } from '../../lib/paths';

export default class Pool extends WaterPlaceMixin(
  SwimmableMixin(ShoreMixin(Locale)),
) {
  constructor() {
    super();
    // ⭐ A pool's floor is the water's surface unless its row names one
    // (an ice sheet). A class default any row's `floor:` overrides.
    this.floor = { template: TemplatePaths.waterSurface };
  }
}
