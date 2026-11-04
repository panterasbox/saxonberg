/**
 * Rag — ⭐⭐ the oily rag that burns the shed down (paint build D15).
 *
 * A painter wipes a brush on a rag, or soaks one in the pot (`dip rag in
 * pot`), and drops it on the heap in the shed. The linseed in it OXIDIZES,
 * and oxidation makes heat: one rag spread out sheds it as fast as it
 * comes, but a HEAP of them (three and more, stacked) has little surface
 * for its mass, and the heat builds until the oil in the middle runs away
 * and the cloth catches. A rag soaked in WATER does not heat at all. There
 * is no roll anywhere in it.
 *
 * The heat is the oil coat's: the rag walks its own oil's oxidation
 * (slowly in a heap, where the air cannot get in; quickly spread out) as
 * the kernel `SelfHeatingMixin`'s heat source, and the mixin catches it
 * alight when its core passes the oily cloth's autoignition point.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { SelfHeatingMixin } from '@saxonberg/server/mud/lib/thermal/SelfHeating';
import { CombustibleMixin } from '@saxonberg/server/mud/lib/fire/Combustible';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { WetMixin } from '@saxonberg/server/mud/lib/wetness/Wet';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { CoatLayer } from '@saxonberg/server/mud/lib/material/Faced';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** Three rags and more stacked together is a heap. */
const HEAP_AT = 3;
/** A heap's oil oxidizes over about a fortnight (the air cannot get in). */
const HEAP_OXIDATION_DAYS = 14;
/** Spread out, it is set in under a day. */
const SPREAD_OXIDATION_DAYS = 0.75;
/** The heat an oil-soaked heap makes, kelvin per game day. */
const OIL_HEAT_K_PER_DAY = 12;
/** A coat this thick soaks the cloth through. */
const SOAKED_COAT_M = 0.0003;
/** A heap sheds little of its excess heat a day; a spread rag, all of it. */
const HEAP_COOLING = 0.04;
const SPREAD_COOLING = 1.5;
/** An oily cloth catches far below a dry one. */
const OILY_IGNITION_K = 420;

export default class Rag extends SelfHeatingMixin(
  CombustibleMixin(ThermalMixin(ReservedMixin(WetMixin(StackableMixin(Good))))),
) {
  /**
   * ⭐ A HEAP is the oily rags lying together — this stack and every other
   * oily rag in the same place, three and more (a rag is dipped one at a
   * time, so the heap is what is dropped together, not one stack).
   */
  private heaped(): boolean {
    const self = this as unknown as Stuff;
    let n = MixinApi.isStackable(self) ? this.getQuantity() : 1;
    const where = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (where !== null && MixinApi.isContainer(where)) {
      for (const other of where.getContents()) {
        if (other.stuffId === self.stuffId || !(other instanceof Rag) || other.oilCoats().length === 0) continue;
        n += MixinApi.isStackable(other) ? other.getQuantity() : 1;
      }
    }
    return n >= HEAP_AT;
  }

  private soakedInWater(): boolean {
    const self = this as unknown as Stuff;
    return MixinApi.isWet(self) && self.getWetness() >= 0.1;
  }

  /** The wet coats of a drying oil on it — its oil. */
  public oilCoats(): CoatLayer[] {
    return this.getCoats('outside').filter((c) => {
      if (c.state !== 'wet') return false;
      const m = StuffApi.findByTemplatePath<Material>(c.material);
      return m?.getKinetics()?.airSet()?.getSets() === 'oxidation';
    });
  }

  /**
   * ⭐ The oil's heat, and the oil's own oxidation walked as it goes: slow
   * in a heap, fast spread out; nothing while the rag is soaked with water.
   * Past the runaway point the cloth chars on its own heat.
   */
  public override heatingKPerDay(coreK: number, days: number): number {
    if (this.soakedInWater()) return 0;
    if (coreK >= this.runawayK()) return OIL_HEAT_K_PER_DAY;
    const oil = this.oilCoats();
    if (oil.length === 0) return 0;
    const thickness = oil.reduce((a, c) => a + c.thicknessM, 0);
    const per = days / (this.heaped() ? HEAP_OXIDATION_DAYS : SPREAD_OXIDATION_DAYS);
    const next = this.getCoats('outside').map((c) => {
      if (!oil.includes(c)) return c;
      const extent = Math.min(1, (c.progress?.extent ?? 0) + per);
      return extent >= 1 ? { ...c, state: 'set' as const, progress: { extent } } : { ...c, progress: { extent } };
    });
    this.setCoats({ ...this.coats, outside: next });
    return OIL_HEAT_K_PER_DAY * Math.min(1, thickness / SOAKED_COAT_M);
  }

  public override coolingPerDay(): number {
    return this.heaped() ? HEAP_COOLING : SPREAD_COOLING;
  }

  /** An oily cloth catches far below a dry one. */
  public override getEffectiveAutoignitionK(): number {
    const dry = super.getEffectiveAutoignitionK();
    return this.oilCoats().length > 0 || this.getCoats('outside').some((c) => c.progress !== undefined)
      ? Math.min(dry, OILY_IGNITION_K)
      : dry;
  }
}
