/**
 * ConduitMixin — **the coupling** an arcane reserve crosses to reach a
 * shell, and the half of `recharge` that answers "how?"
 *
 * ## The question this exists to answer
 *
 * Recharging moved energy out of a caster's reserve into an item's on
 * the strength of *intent alone*: any caster in reach of a charged thing
 * could top it up, at a flat 1:1, with no apparatus, no working and no
 * competence. Nothing in the fiction said how, and the flat rate made
 * the caster a perfect pump — the one free lunch in a model where a
 * firebolt spends 35.2 τ to deliver 29.9.
 *
 * The physics was already sitting in two places and nothing read it.
 * `electricity.md` ships an Ohm's-law core with resistance, and the
 * descriptor-bank doctrine already asserts of wands that **a wand IS
 * brass, which tells you real things — it conducts.** So:
 *
 * > **Energy does not cross from a reserve into a shell by wanting it
 * > to. It crosses through a coupling, and couplings have impedance.**
 *
 * Efficiency stops being a balance dial and becomes what it physically
 * is: how good the coupling is. It also makes a wand's material
 * load-bearing for the first time, which the doctrine always claimed
 * and no mechanism ever cashed.
 *
 * ## ⚠ Efficiency is bounded BELOW 1, by construction
 *
 * The delivered fraction is `coupling × competence`, and both factors
 * are `< 1`. That is not a tuning choice — an efficiency at or above 1
 * is a perpetual-motion machine, and this model is denominated in real
 * joules against a conservation law (1 τ ≡ 1 kJ, a full reserve is
 * about a quarter of a banana). The loss is real and goes where losses
 * go: waste heat in the coupling.
 *
 * ⚠ Note this deliberately does **not** reuse `potencyFactor`, whose
 * competence term is a bonus `≥ 1` above the required band. Multiplying
 * by that would let a good caster deliver more energy than they spent.
 *
 * ## What it is NOT
 *
 * **Not a focus.** The cut `Focus` class supplied *specification* and
 * decayed on its own clock, which is the resource inflation the
 * implements slate exists to avoid. A conduit stores nothing, holds no
 * pattern, and has nothing to top up — it is a **tool**, and tools wear
 * through the shipped `Durable.getCondition()` if an author wants that.
 *
 * **Not a gate on who may practise magic.** Anyone may carry one; only
 * a caster with the working benefits, so it self-selects with no
 * membership to check — specialisation by inventory, never by guild.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';

/** Coupling qualities worth authoring against, as a readable ladder. */
export const COUPLING_GRADES = {
  /** A scavenged or improvised path — most of it is lost as heat. */
  crude: 0.6,
  /** A made, portable conduit — the field standard. */
  field: 0.85,
  /** A fixed bench with a proper sink. Never 1: see the class doc. */
  bench: 0.98,
} as const;

export interface Conduit {
  /**
   * The fraction of committed energy this coupling actually delivers,
   * in `(0, 1]`. Multiplied by the caster's competence factor.
   */
  getCouplingEfficiency(): number;
  setCouplingEfficiency(value: number): void;

  // ---------- storage (public for the Hydrator) ----------
  couplingEfficiency: number;
}

export function ConduitMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ConduitMixin extends Base implements Conduit {
    static _mixinName = 'ConduitMixin';

    static fieldMeta: FieldMeta = {
      couplingEfficiency: { persistent: true, authorable: true },
    };

    /**
     * Defaults to the field grade rather than to 1: a conduit that
     * silently delivered everything would reintroduce the free lunch
     * this mixin exists to close.
     */
    public couplingEfficiency: number = COUPLING_GRADES.field;

    getCouplingEfficiency(): number {
      return this.couplingEfficiency;
    }

    /**
     * Clamped to `(0, 1]` on the setter — a per-field invariant, so
     * neither authored content nor a runtime write can mint energy.
     */
    setCouplingEfficiency(value: number): void {
      if (!Number.isFinite(value) || value <= 0) {
        this.couplingEfficiency = COUPLING_GRADES.crude;
        return;
      }
      this.couplingEfficiency = Math.min(1, value);
    }
  };
}
