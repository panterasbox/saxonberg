/**
 * KineticMixin — *it CHANGES at a rate its temperature sets.*
 *
 * Firing, curing, staling: the kinetic arrows a kiln, a larder or a cane
 * field reads, and what a piece shaped of it becomes by form. On the clay the
 * kiln fires, the wood that seasons, the glue that sets — not on the brick.
 * (Not `Kinetics`: that noun is the value class in `Kinetics.ts`.)
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasKinetic(m)` and never on a material's kind.
 */

import { Kinetics, type KineticSpec } from './Kinetics';
import { DrainSetting, type DrainSettingSpec } from './DrainSetting';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Kinetic {
  getDrainSetting(): DrainSetting | null;
  setDrainSetting(value: DrainSettingSpec | null): void;
  getFormTemplates(): Readonly<Partial<Record<string, string>>>;
  setFormTemplates(value: Partial<Record<string, string>> | null): void;
  getKinetics(): Kinetics | null;
  setKinetics(value: KineticSpec[] | null): void;
}

export function KineticMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class KineticMixin extends Base implements Kinetic {
    static _mixinName = 'KineticMixin';

    static fieldMeta: FieldMeta = {
      // ── How it changes at a temperature — a firing is one rule ──
      // ⭐ Measured facts like the boiling point: what a kiln, a larder and
      // a cane field teach you.
      kinetics: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
      // ⭐ What a piece shaped of this becomes, by form class (ceramics D16):
      // `{open: …/vessel, closed: …/jar, flat: …/dish, block: …/block, cone: …}`.
      formTemplates: { persistent: true, authorable: true },
      // ⭐ How the matter sets by DRAINING (dairy D9b) — a timed set, so it
      // is kinetics (decomposition W0; it sat beside the freezing point).
      drainSetting: { persistent: true, authorable: true },
    };

    // ⭐⭐ How this substance changes over time at a rate set by temperature
    // (kinetics — a firing, a cure, sucrose inverting, starch staling; the
    // ceramics build's heat transitions folded in). `null` — almost every
    // material — is inert. Validated by constructing the value object, so a
    // curve that cannot be evaluated fails at the row. `ThermalMixin` on the
    // good runs it.
    private _kinetics: Kinetics | null = null;

    /**
     * ⭐ The row a piece shaped of this is minted as, by form class (ceramics
     * D16) — the `castTemplate` shape for `shape`. Empty = no default; a form
     * word's own `product` or the instrument's map answers instead.
     */
    protected formTemplates: Partial<Record<string, string>> = {};
    public getFormTemplates(): Readonly<Partial<Record<string, string>>> {
      return this.formTemplates;
    }
    public setFormTemplates(value: Partial<Record<string, string>> | null): void {
      const out: Partial<Record<string, string>> = {};
      for (const [k, v] of Object.entries(value ?? {})) {
        if (typeof v === 'string' && v !== '') out[k] = v;
      }
      this.formTemplates = out;
    }

    /** ⭐ The changes this substance undergoes over time, or `null` (inert). */
    public getKinetics(): Kinetics | null {
      return this._kinetics;
    }
    /** The authored spec as stored (the row's own shape), or `null`. */
    protected get kinetics(): KineticSpec[] | null {
      return this._kinetics?.toSpec() ?? null;
    }
    protected set kinetics(value: KineticSpec[] | null) {
      this._kinetics =
        value === null || value === undefined || value.length === 0 ? null : new Kinetics(value);
    }
    /** Set the kinetic spec; throws on a curve that cannot be evaluated. */
    public setKinetics(value: KineticSpec[] | null): void {
      this.kinetics = value;
    }

    /**
     * ⭐ **How this matter sets by losing water** (dairy D9b) — curd drains
     * its whey in a hoop and becomes cheese, faster and drier under a weight.
     * `null` for every material that does not (the default; freezing is the
     * other set process, and it is `meltingPoint`'s). Read only by a mould's
     * `reconcileSetting`: the MATERIAL says how it sets, the MOULD says what
     * shape it takes.
     */
    private _drainSetting: DrainSetting | null = null;

    /** How this matter sets by draining, or `null` when it does not. */
    public getDrainSetting(): DrainSetting | null {
      return this._drainSetting;
    }
    /** The authored spec as stored (the row's own shape), or `null`. */
    protected get drainSetting(): DrainSettingSpec | null {
      return this._drainSetting?.toSpec() ?? null;
    }
    protected set drainSetting(value: DrainSettingSpec | null) {
      this._drainSetting = value === null || value === undefined ? null : new DrainSetting(value);
    }
    /** Set the drain set; throws a `RangeError` on one that cannot be evaluated. */
    public setDrainSetting(value: DrainSettingSpec | null): void {
      this.drainSetting = value;
    }
  };
}
