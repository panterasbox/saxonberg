/**
 * ClimateControlMixin — ⭐⭐ **the active twin of the furnace, and the proof
 * that a Thing and a Location compose one mixin and get one behaviour.**
 *
 * A furnace pins a *body* at a fuelled temperature; a climate control drives
 * an *air* toward a setpoint while its supply is live, and lets it drift
 * when cut. Because it drives the {@link Atmospheric} envelope (not a lumped
 * body), the SAME mixin works on a Thing (a fridge, a freezer, an iced
 * cabinet) and on a Location (a walk-in cold room, an air-conditioned hall):
 * both run the same `reconcileEnvelope`, the same `envelopeDriveW` hook, the
 * same supply segments, and a thing inside either reads its air by the same
 * `airScopeOf`. That is the Thing≡Location promise, delivered rather than
 * asserted.
 *
 * Composes over `Stuff & Container & Atmospheric & Powered`:
 * - **Atmospheric** gives the envelope it drives;
 * - **Powered** gives the supply it gates on (the energy pack's
 *   `GridPoweredMixin` implements it; the kernel reads it structurally);
 * - **Container** gives the contents whose phase it drives (the freezer's
 *   water → ice).
 *
 * Two authored CAUSES, never effects:
 * - `setpointK` — the dial (277 K ≈ 4 °C fridge; a freezer row sets ~255 K;
 *   an AC sets comfort). A cooler holds AT the setpoint and does not
 *   undershoot it.
 * - `coolingCapacityW` — the nameplate. **Positive cools; negative heats**
 *   (same two fields, the sign of `capW − leak` decides — no direction
 *   flag). The pull-down time is the envelope's own `C/U`, not a second
 *   constant.
 *
 * ⭐ The narrowing test holds: nothing reads `isClimateControl` in `Thermal`,
 * `Atmospheric` or the archetype — the body reads the scope through
 * `airScopeOf`, the envelope reads the drive through the `envelopeDriveW`
 * hook, the satisfier reads a temperature. The one predicate the mixin
 * gains is for the `requires:` binder.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Atmospheric } from '../biome/Atmospheric';
import type { Powered } from '../supply/Powered';
import { MixinApi } from '../../api/mixin';

/** Default cooling nameplate (W) — a domestic fridge-ish pull. Rows override. */
const COOLING_CAPACITY_DEFAULT_W = 300;
/** Default setpoint (K) — a fridge compartment (~4 °C). Rows override. */
const SETPOINT_DEFAULT_K = 277;

export interface ClimateControl {
  getSetpointK(): number;
  setSetpointK(k: number): void;
  getCoolingCapacityW(): number;
  setCoolingCapacityW(w: number): void;

  // Public so the Hydrator can reflect into them; not the contract.
  setpointK: number;
  coolingCapacityW: number;
}

type ClimateBase = Stuff & Container & Atmospheric & Powered;

export function ClimateControlMixin<
  TBase extends MixinConstructor<ClimateBase>,
>(Base: TBase) {
  return class ClimateControlMixin extends Base implements ClimateControl {
    static _mixinName = 'ClimateControlMixin';
    /** The `requires:` binder refusal — read when a verb targets a non-store. */
    static _mixinRefusal = "{} doesn't hold a climate";

    static fieldMeta: FieldMeta = {
      setpointK: { persistent: true, authorable: true },
      coolingCapacityW: { persistent: true, authorable: true },
    };

    public setpointK: number = SETPOINT_DEFAULT_K;
    public coolingCapacityW: number = COOLING_CAPACITY_DEFAULT_W;

    /** Reentry guard for the content phase pass (CLAUDE.md case 1). */
    private _climateDriving = false;

    getSetpointK(): number {
      return this.setpointK;
    }
    setSetpointK(k: number): void {
      if (Number.isFinite(k)) this.setpointK = k;
    }
    getCoolingCapacityW(): number {
      return this.coolingCapacityW;
    }
    setCoolingCapacityW(w: number): void {
      if (Number.isFinite(w)) this.coolingCapacityW = w;
    }

    /** The setpoint the envelope clamps toward (stops a cooler undershooting). */
    public climateSetpointK(): number | null {
      return this.setpointK;
    }

    /**
     * ⭐ The driven heat term: a cooler (`capW > 0`) removes `capW` while
     * supplied and ABOVE setpoint; a heater (`capW < 0`) adds while BELOW.
     * `0` when cut, when drawing no power, or when already past the dial —
     * the envelope's steady-state clamp then holds the setpoint.
     */
    public envelopeDriveW(interiorK: number, powered: boolean): number {
      // ⭐ `powered` is the supply state for the segment being integrated —
      // the real "is the meter live" signal, off the supply trajectory. It
      // is the whole gate: the band's wattage ceiling (`availablePowerW`) is
      // the analyze/billing figure, not a boolean on whether the compressor
      // runs, and gating on it would couple cooling to a seeded dial.
      if (!powered) return 0;
      const cap = this.coolingCapacityW;
      if (cap > 0) return interiorK > this.setpointK ? -cap : 0;
      if (cap < 0) return interiorK < this.setpointK ? -cap : 0;
      return 0;
    }

    /**
     * After the air integrates, drive the PHASE of what the store holds —
     * the cold source freezes the water in its ice pan. Guarded against the
     * reentry a content's own `reconcileThermal → temperatureTrajectory`
     * would otherwise cause.
     */
    public reconcileEnvelope(): void {
      super.reconcileEnvelope();
      if (this._climateDriving) return;
      this._climateDriving = true;
      try {
        const self = this as unknown as Stuff & Container;
        for (const content of self.getContents()) {
          if (MixinApi.isThermal(content) && MixinApi.isBulkable(content)) {
            content.reconcilePhase();
          }
        }
      } finally {
        this._climateDriving = false;
      }
    }
  };
}
