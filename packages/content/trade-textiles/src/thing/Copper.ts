/**
 * Copper — ⭐ a vessel you boil CLOTH in.
 *
 * A wide copper pan on a fire, the dyer's and the laundress's oldest
 * tool: fill it with water, set it on the fire (`heat copper`), put the
 * piece in, and keep it at the simmer until the cloth is done. Raw silk
 * degums in one (the profile is the sericulture pack's), and the recorded
 * next consumers are scouring wool and piece-bleaching linen.
 *
 * It is a `Container` (the cloth goes IN it) and `Bulkable` (it holds the
 * water), and `Thermal` — so the kernel's immersion rung makes a bolt in
 * it read the water's temperature, not the room's.
 *
 * ⭐⭐ **It holds at the boil** — the kernel's latent-heat plateau (silk
 * W4): the heat above the boil goes into steam and the water stays at
 * 100 °C while it lasts, so a copper boils DOWN on the fire rather than
 * flashing dry. Between reads the vessel's own temperature runs ahead of
 * the plateau, so the CONTENTS read is capped at the boil here — what a
 * bolt immersed in it feels.
 *
 * ⚠ A copper is for cloth: `canAddContainable` refuses anything that is
 * not a finishable piece.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import { FINISHING_MIXIN } from '../lib/Finishing';

export default class Copper extends ThermalMixin(ContainerMixin(BulkableMixin(Good))) {
  static fieldMeta: FieldMeta = {};

  /** The water's boiling point, or `null` when there is no liquid in it. */
  private boilingPointK(): number | null {
    if (!this.hasInteriorBulk()) return null;
    if (!(this.getBulkAmount('interior').rawValue() > 0)) return null;
    const bp = this.getBulkMaterial('interior')?.getBoilingPoint().rawValue() ?? 0;
    return bp > 0 ? bp : null;
  }

  /** ⭐ The water never reads hotter than its boil. */
  public override getContentsTemperature(): Quantity<'K'> {
    const t = this.getTemperature();
    const bp = this.boilingPointK();
    return bp !== null && t.rawValue() > bp ? Quantity.of(bp, 'K') : t;
  }

  /** A copper is for cloth. */
  public canAddContainable(thing: Stuff & Containable): VetoResult {
    if (MixinApi.hasMixin(thing.constructor as never, FINISHING_MIXIN as never)) return { ok: true };
    return { ok: false, reason: 'A copper is for boiling cloth in.' };
  }
}
