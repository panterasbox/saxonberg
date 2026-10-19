/**
 * Midden — **where a house's sweepings and a byre's muck go** (cleanliness
 * D15, D20): refuse thrown on it — and rotten food — rots down to compost
 * for the field.
 *
 * ⭐ The act is the midden's (`takeRefuse`) — what it will take (refuse or
 * compost by its MATERIAL, so a bark strip goes on as readily as a heap of
 * sweepings), how much more it holds, and that what is thrown on is gone
 * into its heap. `dispose` is offered to anyone standing at one (`peers`);
 * a carried `Heap` offers it anywhere, so the refusal can say there is no
 * midden here.
 */

import Receptacle from './Receptacle';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Material from '../../lib/material/Material';
import type { CommandContributions } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../../lib/quantity';

/** A heap's kilograms as litres of compost on the midden. */
const LITRES_PER_KG = 1.5;
const COMPOST = '/stuff/idea/material/bulk/compost';

/** What throwing something on the midden did — or why not. */
export type RefuseOutcome =
  | { ok: false; reason: 'not-refuse' | 'midden-full' }
  | { ok: true; name: string };

export default class Midden extends Receptacle {
  static commandContributions: CommandContributions = {
    // `peers` — to everyone in the room the midden stands in.
    peers: ['platform/cmd/inventory/dispose.yaml'],
  };

  /** Throw `item` on: refuse only, while there is room; the item is gone. */
  public async takeRefuse(item: Stuff): Promise<RefuseOutcome> {
    const m = MixinApi.isTangible(item) ? item.getMaterial() : null;
    // ⭐ Rotten food is refuse whatever it was (review): the most obvious
    // compost there is.
    const rotten = MixinApi.isFresh(item) && item.getFreshnessBand() === 'rotten';
    if (!rotten && (!m || !(m.hasTag('refuse') || m.hasTag('compost')))) {
      return { ok: false, reason: 'not-refuse' };
    }
    const kg = MixinApi.isTangible(item) ? item.getMass().rawValue() : 1;
    const held = this.getBulkAmount('interior').rawValue();
    const cap = this.getBulkCapacity('interior')?.rawValue() ?? Infinity;
    const litres = Math.min(kg * LITRES_PER_KG, Math.max(0, cap - held));
    if (!(litres > 0)) return { ok: false, reason: 'midden-full' };
    const compost = StuffApi.findByTemplatePath<Material>(COMPOST);
    if (compost) this.setBulkMaterial('interior', compost);
    this.setBulkAmount('interior', Quantity.of(held + litres, 'L'));
    const name = item.getPresentation();
    await StuffApi.destruct(item);
    return { ok: true, name };
  }
}
