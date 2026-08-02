/**
 * MeltableMixin — the **phase-change capability** on a solid object: heat
 * driven past its material's `meltingPoint` flows its mass to a `Bulkable`
 * liquid, with a **latent-heat plateau** at the transition (temperature holds
 * at the melting point while `latentHeatOfFusion` is absorbed — the
 * reserve-clamp). Homed in `lib/thermal/` because *heat* drives it — a hearth,
 * the sun, or a fire; not fire-specific.
 *
 * **Reads its material, not authored coefficients** (the `Combustible`
 * precedent): a Meltable iron ingot melts at iron's `1811 K`, wax at `~330 K`.
 * The reverse (a molten bulk solidifying below its melting point → a cast) and
 * the onward boil (a liquid past its boiling point → gas) are driven on the
 * `Bulkable` holder by the same `ThermalApi.reconcilePhase` pass, so
 * ice → water → steam falls out of the shipped water material for free.
 *
 * **Composed OUTSIDE `ThermalMixin`.** The latent plateau is enforced by
 * `ThermalApi.reconcilePhase` clamping the temperature back to the melting
 * point while it absorbs the overshoot heat into `latentAbsorbedJ`; when that
 * reaches `mass × latentHeatOfFusion` the solid melts. The gated `ThermalLogic`
 * is the single writer of the phase state + the latent accumulator (the
 * `Combustible`/`Burning` precedent — `ApiOnly` mutators).
 *
 * See docs/subsystems/thermal.md.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/** The phase a Meltable object is in. `gas` is transient (it boils away). */
export type MeltPhase = 'solid' | 'liquid' | 'gas';

/**
 * The phase-change capability surface. The reads are the contract; the phase
 * + latent accumulator are written only by the gated `ThermalLogic`.
 */
export interface Meltable {
  /** The object's current phase (`solid` until it melts). */
  getMeltPhase(): MeltPhase;
  /** Latent heat (J) absorbed toward the current transition (the plateau). */
  getLatentAbsorbedJ(): number;
  /** The melting point (K) from the object's material; 0 = does not melt. */
  getMeltingPointK(): number;
  /** Total latent heat (J) to complete the melt: `mass × latentHeatOfFusion`. */
  getLatentHeatToMeltJ(): number;

  // Gated (`ThermalLogic`-only) phase-state writers.
  _setMeltPhase(phase: MeltPhase): void;
  _absorbLatent(deltaJ: number): void;
  _resetLatent(): void;
}

export function MeltableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class MeltableMixin extends Base implements Meltable {
    static _mixinName = 'MeltableMixin';

    static fieldMeta: FieldMeta = {
      meltPhase: { persistent: true, runtimeState: true },
      latentAbsorbedJ: { persistent: true, runtimeState: true },
    };

    /**
     * The object's phase.
     *
     * Written by the gated `ThermalLogic`.
     */
    public meltPhase: MeltPhase = 'solid';

    /**
     * Latent heat (J) absorbed toward the pending transition — the plateau
     * accumulator (`0 …  mass × latentHeatOfFusion`).
     */
    public latentAbsorbedJ = 0;

    public getMeltPhase(): MeltPhase {
      return this.meltPhase;
    }

    public getLatentAbsorbedJ(): number {
      return this.latentAbsorbedJ;
    }

    public getMeltingPointK(): number {
      const self = this as unknown as Stuff;
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
      return mat ? mat.getMeltingPoint().rawValue() : 0;
    }

    public getLatentHeatToMeltJ(): number {
      const self = this as unknown as Stuff & { getMass(): { rawValue(): number } };
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
      if (!mat) return 0;
      const lhf = mat.getLatentHeatOfFusion().rawValue();
      const massKg = self.getMass().rawValue();
      return lhf * massKg;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setMeltPhase(phase: MeltPhase): void {
      this.meltPhase = phase;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _absorbLatent(deltaJ: number): void {
      if (!Number.isFinite(deltaJ) || deltaJ <= 0) return;
      this.latentAbsorbedJ += deltaJ;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _resetLatent(): void {
      this.latentAbsorbedJ = 0;
    }
  }

  return MeltableMixin;
}
