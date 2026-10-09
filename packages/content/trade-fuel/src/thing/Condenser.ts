/**
 * Condenser — ⭐ a coil of pipe that turns vapour back into a liquid, and
 * the object that decides whether a retort's by-product is money or a
 * poisoned room.
 *
 * It takes what the retort drives off and keeps what it can: anything
 * that is a LIQUID where it stands condenses into its own interior;
 * anything that is still a GAS at that temperature passes straight
 * through to whatever is standing on the condenser in turn — a bladder,
 * a gasometer — and if nothing is, into the air.
 *
 * ⭐⭐ **The split is derived, not authored.** `requiredClosureFor` reads
 * the material's boiling point against the standard ambient, so coal tar
 * (520 K) condenses and coal gas (110 K) does not, and a pack ships a
 * new fraction by authoring one number on a material row. Nothing here
 * knows what tar is.
 *
 * **Composition.** `Placing(Bulkable(Thermal(Good)))`: it holds a liquid
 * (Bulkable), it has a temperature (Thermal — a cold condenser is the
 * whole point of a condenser), and things stand on it (Placing), which
 * is how the gas leg continues.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Atmospheric } from '@saxonberg/server/mud/lib/biome/Atmospheric';

const CondenserBase = PlacingMixin(BulkableMixin(ThermalMixin(Good)));

/** What a receiver standing on this one answers to. */
interface VolatileReceiver {
  receive(materialPath: string, litres: number): number;
}

export default class Condenser extends CondenserBase {
  /**
   * Take what you can of `litres`; return how much you took.
   *
   * ⚠ The return value is load-bearing — the retort subtracts it and
   * passes the remainder on. A condenser that silently swallowed a gas
   * would make a gasworks impossible, and one that silently dropped an
   * overflow would make a lost run invisible.
   */
  public receive(materialPath: string, litres: number): number {
    if (!(litres > 0)) return 0;
    const material =
      StuffApi.findByTemplatePath<Material>(materialPath) ?? null;
    if (material === null) return 0;

    // A gas at this temperature is not something a coil can hold. Pass
    // it on — to a vessel standing on this one, else into the air.
    if (BulkableApi.requiredClosureFor(material) === 'sealed') {
      let left = litres;
      for (const placed of this.getPlaced()) {
        const receiver = placed as unknown as Partial<VolatileReceiver>;
        if (typeof receiver.receive !== 'function') continue;
        const taken = receiver.receive(materialPath, left);
        left -= taken > 0 ? taken : 0;
        if (!(left > 0)) return litres;
      }
      // Nothing to take it: a sealed Bulkable standing on the coil is the
      // other legitimate receiver, and `transfer`'s own escape branch
      // handles one that is not sealed.
      for (const placed of this.getPlaced()) {
        if (!MixinApi.isBulkable(placed)) continue;
        const slot = placed.getBulk('interior');
        if (slot.getCapacity() === null) continue;
        const existing = slot.getMaterialPath();
        if (existing !== null && existing !== materialPath) continue;
        const room = slot.remaining();
        const put = Math.min(room, left);
        if (!(put > 0)) continue;
        if (existing === null) placed.setBulkMaterial('interior', material);
        placed.setBulkAmount(
          'interior',
          Quantity.of(slot.getAmount().rawValue() + put, 'L'),
        );
        left -= put;
        if (!(left > 0)) return litres;
      }
      emitIntoScope(this as unknown as Stuff, materialPath, left);
      return litres;
    }

    // A liquid: it condenses in here, up to what the coil's receiver
    // will hold. ⭐ The overflow goes to the air as vapour, which is what
    // a run you did not watch actually does.
    const slot = (this as unknown as {
      getBulk(a: 'interior'): ReturnType<Condenser['getBulk']>;
    }).getBulk('interior');
    const existing = slot.getMaterialPath();
    if (existing !== null && existing !== materialPath) {
      emitIntoScope(this as unknown as Stuff, materialPath, litres);
      return litres;
    }
    const room = slot.remaining();
    const put = Math.min(room, litres);
    if (put > 0) {
      if (existing === null) this.setBulkMaterial('interior', material);
      this.setBulkAmount(
        'interior',
        Quantity.of(slot.getAmount().rawValue() + put, 'L'),
      );
    }
    const over = litres - put;
    if (over > 0) emitIntoScope(this as unknown as Stuff, materialPath, over);
    return litres;
  }
}

/** The air of the place this stands in — the exhaust walk. */
function emitIntoScope(from: Stuff, materialPath: string, litres: number): void {
  if (!(litres > 0)) return;
  let at: Stuff | null = from;
  let depth = 32;
  while (at !== null && depth-- > 0) {
    if (
      MixinApi.isAtmospheric(at) &&
      MixinApi.isContainer(at) &&
      (at as unknown as Atmospheric).getVolume() !== null
    ) {
      (at as unknown as Atmospheric).addAtmosphereContent(materialPath, litres);
      return;
    }
    at = MixinApi.isContainable(at) ? at.getContainer() : null;
  }
}
