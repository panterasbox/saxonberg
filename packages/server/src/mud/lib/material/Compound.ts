/**
 * CompoundMixin — *it is ONE compound.*
 *
 * Chemical identity, exclusive with `ElementMixin` and `MixtureMixin` (no
 * kind composes two): a compound's formula and molar mass — water, a salt,
 * cellulose. Absent on a mixture, which carries its constituents instead.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasCompound(m)` and never on a material's kind.
 */

import { Quantity } from "../quantity";
import { QuantityMarshaller } from "../../platform/idea/persistence/QuantityMarshaller";
import type { FieldMeta, MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";

/**
 * Atomic / molecular science data at a glance — what `getChemistry()` returns
 * on an element (`symbol`, `atomicNumber`, `molarMass`) or a compound
 * (`formula`, `molarMass`). A mixture has none: it has constituents.
 */
export interface ElementChemistry {
  /** Element symbol (e.g. `'Fe'`, `'C'`, `'U'`). Element-only. */
  symbol?: string;
  /** Atomic number (Z) — element-only. */
  atomicNumber?: number;
  /** Chemical formula (e.g. `'H2O'`, `'SiO2'`, `'(C6H10O5)n'`). Compound-only. */
  formula?: string;
  /** Molar mass in g/mol. Element-or-compound. */
  molarMass?: Quantity<"g/mol">;
}

export interface CompoundIdentity {
  getFormula(): string | null;
  setFormula(value: string | null): void;
  getMolarMass(): Quantity<"g/mol"> | null;
  setMolarMass(value: Quantity<"g/mol"> | null): void;
  getChemistry(): ElementChemistry | null;
}

export function CompoundMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class CompoundMixin extends Base implements CompoundIdentity {
    static _mixinName = "CompoundMixin";

    static fieldMeta: FieldMeta = {
      formula: { persistent: true },
      molarMass: {
        persistent: true,
        marshaller: QuantityMarshaller.pathFor("g/mol"),
      },
    };

    /** Chemical formula (e.g. `'H2O'`). */
    protected formula: string | null = null;

    private _molarMass: Quantity<"g/mol"> | null = null;

    protected get molarMass(): Quantity<"g/mol"> | null {
      return this._molarMass;
    }
    protected set molarMass(value: Quantity<"g/mol"> | null) {
      if (
        value !== null &&
        value !== undefined &&
        (!(value instanceof Quantity) || value.unit !== "g/mol")
      ) {
        throw new TypeError(
          `Material.molarMass must be Quantity<'g/mol'> | null; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`,
        );
      }
      this._molarMass = value ?? null;
    }

    public getFormula(): string | null {
      return this.formula;
    }
    public setFormula(value: string | null): void {
      this.formula = value;
    }

    public getMolarMass(): Quantity<"g/mol"> | null {
      return this._molarMass;
    }
    public setMolarMass(value: Quantity<"g/mol"> | null): void {
      this.molarMass = value;
    }

    /** The compound's chemistry at a glance, or `null` when none is authored. */
    public getChemistry(): ElementChemistry | null {
      if (this.formula === null && this._molarMass === null) return null;
      const out: ElementChemistry = {};
      if (this.formula !== null) out.formula = this.formula;
      if (this._molarMass !== null) out.molarMass = this._molarMass;
      return out;
    }
  };
}
