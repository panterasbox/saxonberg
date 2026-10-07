/**
 * Gather — a blob of hot glass on the end of a blowpipe (glass build
 * D10). `AlloyedMixin(ThermalMixin(Good))`: it carries the melt's iron
 * (so the bottle it becomes is the right colour) and it COOLS by the
 * kernel's own Newton drift the moment it leaves the pot — which is the
 * whole of the hot-work window. No new timing machinery: the gather's
 * clock is the thermal substrate every object already runs.
 *
 * `effectiveR()` is overridden by a dial so a compact blob's τ lands near
 * the "you have seconds" feel — the lumped geometry is tuned for an open
 * mug, and a blob on a pipe loses heat slower per kilogram. That factor
 * is the one playtest knob dressed as thermal physics, and it is a dial.
 */

import Good from "@saxonberg/server/mud/lib/stuff/Good";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";
import { ThermalMixin } from "@saxonberg/server/mud/lib/thermal/Thermal";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";
import { AppApi } from "@saxonberg/server/mud/api/app";

/** The worked form a gather is in. */
export type GatherForm = "gather" | "bubble" | "bottle" | "cylinder";

/** Numeric pack-setting read with a seeded-literal fallback. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

const GatherBase = AlloyedMixin(ThermalMixin(Good));

export default class Gather extends GatherBase {
  // ⚠ Own-property only — the framework merges the mixin chain's own
  // fieldMeta up the prototype chain (MixinApi.getAllFieldMeta), so this
  // declares only Gather's new field. `authorable` because the row seeds
  // `form: gather` and `dip` resets it.
  static fieldMeta: FieldMeta = {
    form: { persistent: true, authorable: true },
  };

  /** What the gather has been worked into so far. */
  public form: GatherForm = "gather";

  public getForm(): GatherForm {
    return this.form;
  }

  public setForm(value: GatherForm): void {
    this.form = value;
  }

  /**
   * The temperature at or above which the glass can still be worked —
   * a fraction of the material's own melting point. Below it the glass
   * has stiffened and the window has closed.
   */
  public workingFloorK(): number {
    const mp = this.getMaterial()?.getMeltingPoint().rawValue() ?? 0;
    return dial("glass.hotwork.workingFraction", 0.75) * mp;
  }

  /** Still hot enough to work. */
  public isWorkable(): boolean {
    const mp = this.getMaterial()?.getMeltingPoint().rawValue() ?? 0;
    if (mp <= 0) return false;
    return this.getTemperature().rawValue() >= this.workingFloorK();
  }

  /**
   * ⭐ A compact blob on a pipe loses heat slower per kilogram than the
   * open-mug geometry the lumped `R_GEOMETRY` is tuned for, so its τ is
   * lengthened by a playtest factor — the knob for "you have seconds".
   */
  protected override effectiveR(): number {
    return super.effectiveR() * dial("glass.hotwork.gatherRFactor", 10);
  }
}
