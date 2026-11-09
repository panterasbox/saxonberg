/**
 * AcidityMixin — *it has a pH.*
 *
 * One axis read both ways — acid below 7, alkali above. Carries what a face
 * of it leaches into contents, what it corrodes, and the acid attack and
 * contact corrosion it derives.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasAcidity(m)` and never on a material's kind.
 */

import type { Stuff } from '../stuff/Stuff';
import type { FieldMeta, MixinConstructor } from '../mixin';
import { ConditionApi } from '../../api/condition';
import { MixinApi } from '../../api/mixin';

export interface Acidity {
  getPh(): number;
  setPh(value: number): void;
  acidAttack(pH?: number): number;
  getCorrosiveTo(): readonly string[];
  setCorrosiveTo(value: readonly string[] | null): void;
  corrodeOnContact( victim: Stuff, opts?: { readonly energy?: number; readonly site?: string; readonly shieldFacing?: boolean; readonly bare?: boolean; }, ): boolean;
}

export function AcidityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class AcidityMixin extends Base implements Acidity {
    static _mixinName = 'AcidityMixin';

    static fieldMeta: FieldMeta = {
      // ⭐⭐ **Spoiler 1, with the NAME visible** — the enumerating wiki
      // audit (`wiki-spoiler-fields.snapshot`) asked the question it exists
      // to ask, and the answer is yes.
      //
      // It looked like `tags` (level 0, a classification), and it is not:
      // it is a RESPONSE property, the same kind of fact as `hardness` and
      // `autoignitionTemperature` beside it — something you find out by
      // testing. More sharply, it is the list of *what this defeats*, which
      // is the audit's own example of a spoiler ("a creature's weakness
      // is"). The corrosion channel's whole teaching is that you must learn
      // which agent eats which material; handing that out free on the wiki
      // would delete the discovery.
      //
      // `spoilerName: 0` so the FIELD still shows: you can see that
      // quicklime has a corrosive list without being told what is on it.
      corrosiveTo: { persistent: true, spoiler: 1, spoilerName: 0 },
      // ⭐ Its pH — 7 neutral, below acidic, above alkaline (vinegar 2.4,
      // seawater 8.1); unauthored reads 7. What draws lead out of a glaze,
      // and the number litmus and a soil kit read. A measured fact.
      ph: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };

    /**
     * The body site a substance-contact corrosion lands at when the caller
     * names none — a splash or a spill reaches the exposed front. A caller
     * that knows better (a hazard's siteSelector) passes its own.
     */
    private static readonly CONTACT_SITE = 'body.torso';

    /**
     * The material tags this material corrodes — see {@link getCorrosiveTo}.
     * Empty on every shipped row: a material that names nothing is inert.
     */
    protected corrosiveTo: string[] = [];

    /**
     * ⭐ pH — the negative log of the hydrogen-ion concentration, so each unit
     * is tenfold: 7 neutral, below acidic (lemon 2.2, wine 3.3, milk 6.7),
     * above alkaline (seawater 8.1, lye 13). Unauthored reads 7: water, and
     * every solid, are neutral. Clamped to −1..15 (a concentrated acid goes a
     * little negative, a strong lye a little past 14). It was `acidity`, a
     * 0..1 dial nothing could be checked against (B109): seawater read acid.
     */
    protected ph = 7;
    public getPh(): number {
      return this.ph;
    }
    public setPh(value: number): void {
      this.ph = Number.isFinite(value) ? Math.max(-1, Math.min(15, value)) : 7;
    }

    /**
     * ⭐ How hard this attacks an acid-soluble face (a lead glaze, pewter),
     * relative to vinegar (pH 2.4) = 1: tenfold per two pH units more acid,
     * and nothing at all at or above neutral — lead is an ACID's to take (lye
     * eats glass, not lead). Vitriol ≈ 16, lemon ≈ 1.3, wine ≈ 0.35, milk
     * ≈ 0.007, seawater 0.
     */
    public acidAttack(pH?: number): number {
      // ⭐ A WATER's own pH, when the contents carry one (water-supply D8): a
      // soft upland water at 6.3 is this material's row and a different
      // acidity — the row's pH is the material's, the payload's the water's.
      const ph = typeof pH === 'number' && Number.isFinite(pH) ? pH : this.ph;
      if (!(ph < 7)) return 0;
      return Math.pow(10, (VINEGAR_PH - ph) / PH_UNITS_PER_TENFOLD);
    }

    /**
     * ⭐⭐ **What this material ATTACKS** — the material tags it eats
     * through, as the corrosion channel's agent side.
     *
     * Absent (every shipped row) means inert, which is the right default:
     * a material that says nothing about what it corrodes corrodes nothing.
     * A caustic row is content — quicklime says
     * `corrosiveTo: [organic, tissue, leather, textile]`, an acid says
     * `[metal]` — and the whole of the corrosion fold is *does this layer's
     * tag set intersect the agent's list*.
     *
     * ⚠ It reads the **closed tag vocabulary already authored on every
     * row** (`metal`, `organic`, `leather`, `textile`, `tissue`…) rather
     * than a second classification of its own. The alternative — a
     * per-material hardness-against-acid number — would be a new axis
     * nobody could author honestly, and it would make thickness matter,
     * which for corrosion it does not.
     */
    public getCorrosiveTo(): readonly string[] { return this.corrosiveTo; }
    public setCorrosiveTo(value: readonly string[] | null): void {
      this.corrosiveTo = (Array.isArray(value) ? value : []).filter((t) => typeof t === 'string' && t !== '');
    }

    /**
     * ⭐⭐ **A caustic substance in contact with a body burns it** — the
     * general substance-contact corrosion seam.
     *
     * The corrosion channel was reachable by exactly one thing before this:
     * the lime-seep hazard on traversal. A spilled vial, a thrown flask, a
     * conjured acid — none delivered, because contact with a caustic
     * material had no path to `ConditionApi.inflict`. This is that path, and
     * it lives on the material because `corrosiveTo` does: a caustic is the
     * one that knows what it eats.
     *
     * The whole gate is `corrosiveTo` non-empty — a material nobody
     * authored as caustic answers `false` and nothing happens, which is
     * every shipped material but the two caustics. It mirrors
     * `Potable.dischargeInto(victim, …)` (a material delivering to a
     * victim), routes through the ONE injury door, and the wound it leaves
     * is an ordinary `caustic` trauma that grows on its own clock and
     * `rinse` resolves — no second code path.
     *
     * @returns true iff this material is caustic (a corrosion attempt was
     *   made); false for any inert material, so the call is safe to make
     *   unconditionally at a contact site.
     */
    public corrodeOnContact(
      victim: Stuff,
      opts?: {
        readonly energy?: number;
        readonly site?: string;
        readonly shieldFacing?: boolean;
        /** It is already inside: no covering stands in the way. */
        readonly bare?: boolean;
      },
    ): boolean {
      if (this.corrosiveTo.length === 0) return false;
      if (!MixinApi.isOrganism(victim)) return false;
      ConditionApi.inflict(victim, {
        mechanism: 'corrosion',
        site: opts?.site ?? AcidityMixin.CONTACT_SITE,
        energy: opts?.energy ?? 1,
        corrosiveTo: this.getCorrosiveTo(),
        shieldFacing: opts?.shieldFacing,
        bare: opts?.bare,
      });
      return true;
    }
  };
}

/** Vinegar's pH — the acid a lead-release test uses; its acid attack is 1. */
const VINEGAR_PH = 2.4;

/** pH units per tenfold change in acid attack (lead release, roughly). */
const PH_UNITS_PER_TENFOLD = 2;
