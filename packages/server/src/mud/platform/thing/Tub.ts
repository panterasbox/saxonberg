/**
 * Tub — ⭐ **a seat you lie in that holds water** (cleanliness D28):
 * `BulkableMixin(ThermalMixin(Chair))`. The bathroom's tub was a Chair
 * whose warmth was an authored constant — *"if hot water is ever
 * modelled, this is one field."* It is now: the tub's interior is real
 * water at a real temperature (filled from the bathhouse copper, or by a
 * pail), and `bathe` reads both. Soilable arrives through `Chair` and is
 * not composed twice — a tub has a ring, and wants scrubbing.
 */

import Chair from './Chair';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import type { CommandContributions } from '../../api/command';

const TubBase = BulkableMixin(ThermalMixin(Chair));

export default class Tub extends TubBase {
  /** Sideways: anyone in the room with the tub can get into it. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/crafting/bathe.yaml'],
  };
}
