/**
 * Flask — a *sealable* thermal fluid holder: the thermos.
 *
 * `ThermalMixin(SealableMixin(BulkableMixin(Thing)))`. Identical to a
 * {@link Receptacle} (a thermal fluid holder whose heat capacity is its
 * contents) plus the binary open/closed barrier that makes a vacuum
 * flask real thermodynamics:
 *
 *   - **Sealed** (`!isOpen()`) — `ThermalMixin.mediumConductivity`
 *     resolves the barrier to `vacuum`, so τ = R·C runs to *hours*:
 *     coffee stays hot.
 *   - **Open** — the barrier collapses to the air term, τ to *minutes*:
 *     it cools like an open mug.
 *
 * The seal verbs (`open`/`close`/`setOpen`) re-stamp on toggle so the
 * fluid freezes-and-continues at the moment the regime changes — opening
 * begins fast cooling from the now-current temperature; closing resumes
 * the slow drift at the now-cooler temperature (no heat recovered).
 *
 * A Flask defaults *closed* (SealableMixin's default) — a thermos you
 * pour into is sealed until you open it. Per-flask construction
 * (capacity, closure) is authored in the seed's `data:` block.
 */

import Thing from '../lib/stuff/Thing';
import { BulkableMixin } from '../lib/bulk/Bulkable';
import { SealableMixin } from '../lib/spatial/Sealable';
import { ThermalMixin } from '../lib/thermal/Thermal';

const FlaskBase = ThermalMixin(SealableMixin(BulkableMixin(Thing)));

export default class Flask extends FlaskBase {
  /**
   * Re-stamp on every seal toggle so the regime change (vacuum ↔ air
   * barrier) takes effect from the current temperature. Fire-and-forget
   * — the seal verbs are sync; `restamp` is async.
   */
  override setOpen(value: boolean): void {
    super.setOpen(value);
    void this.restamp();
  }
  override open(): void {
    super.open();
    void this.restamp();
  }
  override close(): void {
    super.close();
    void this.restamp();
  }
}
