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
import type { Stuff } from '../../lib/stuff/Stuff';
import { BulkableApi } from '../../api/bulk';

const TubBase = BulkableMixin(ThermalMixin(Chair));

export default class Tub extends TubBase {
  /** Sideways: anyone in the room with the tub can get into it. */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/crafting/bathe.yaml'],
  };

  /**
   * ⭐ Draw a bath (cleanliness D28, B48): `litres` from `source` (a
   * copper) into this tub, at the source's heat — refused while the water
   * is not hot enough to bathe in (`minK`) or there is none.
   */
  public drawFrom(
    source: Stuff,
    litres: number,
    minK = 310,
  ): { ok: true; waterK: number } | { ok: false; reason: 'no-water' | 'not-hot' | 'no-room' } {
    const from = BulkableApi.slotFor(source, undefined);
    if (!from || from.isEmpty()) return { ok: false, reason: 'no-water' };
    const waterK = from.getTemperatureK() ?? 0;
    if (waterK < minK) return { ok: false, reason: 'not-hot' };
    const into = BulkableApi.slotFor(this as unknown as Stuff, undefined);
    if (!into) return { ok: false, reason: 'no-room' };
    BulkableApi.transfer(from, into, { kind: 'measure', litres, mode: 'lenient' });
    return { ok: true, waterK };
  }
}
