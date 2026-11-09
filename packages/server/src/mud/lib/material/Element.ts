/**
 * ElementMixin — *it is ONE element.*
 *
 * Chemical identity, exclusive with `CompoundMixin` and `MixtureMixin` (no
 * kind composes two): an element's symbol, atomic number and molar mass.
 * Iron is an element and bronze a mixture — both are metals; what a process
 * cares about is the kind, and identity is a fact chemistry reads.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasElement(m)` and never on a material's kind.
 */

import { Quantity } from "../quantity";
import { QuantityMarshaller } from "../../platform/idea/persistence/QuantityMarshaller";
import type { FieldMeta, MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { ElementChemistry } from "./Compound";

export interface ElementIdentity {
  getSymbol(): string | null;
  setSymbol(value: string | null): void;
  getAtomicNumber(): number | null;
  setAtomicNumber(value: number | null): void;
  getMolarMass(): Quantity<"g/mol"> | null;
  setMolarMass(value: Quantity<"g/mol"> | null): void;
  getChemistry(): ElementChemistry | null;
}

export function ElementMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ElementMixin extends Base implements ElementIdentity {
    static _mixinName = "ElementMixin";

    static fieldMeta: FieldMeta = {
      symbol: { persistent: true },
      atomicNumber: { persistent: true },
      molarMass: {
        persistent: true,
        marshaller: QuantityMarshaller.pathFor("g/mol"),
      },
    };

    /** Element symbol (e.g. `'Fe'`, `'C'`, `'U'`). */
    protected symbol: string | null = null;

    /** Atomic number (Z). */
    protected atomicNumber: number | null = null;

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

    public getSymbol(): string | null {
      return this.symbol;
    }
    public setSymbol(value: string | null): void {
      this.symbol = value;
    }

    public getAtomicNumber(): number | null {
      return this.atomicNumber;
    }
    public setAtomicNumber(value: number | null): void {
      this.atomicNumber = value;
    }

    public getMolarMass(): Quantity<"g/mol"> | null {
      return this._molarMass;
    }
    public setMolarMass(value: Quantity<"g/mol"> | null): void {
      this.molarMass = value;
    }

    /** The element's chemistry at a glance, or `null` when none is authored. */
    public getChemistry(): ElementChemistry | null {
      if (
        this.symbol === null &&
        this.atomicNumber === null &&
        this._molarMass === null
      )
        return null;
      const out: ElementChemistry = {};
      if (this.symbol !== null) out.symbol = this.symbol;
      if (this.atomicNumber !== null) out.atomicNumber = this.atomicNumber;
      if (this._molarMass !== null) out.molarMass = this._molarMass;
      return out;
    }
  };
}
