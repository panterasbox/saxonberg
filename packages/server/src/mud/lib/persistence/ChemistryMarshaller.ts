/**
 * ChemistryMarshaller — round-trips `Material.chemistry` between the
 * stored shape (where `molarMass` is the JSON `{value,unit}` form or
 * a bare number for legacy authoring) and the runtime shape (where
 * `molarMass` is a `Quantity<'g/mol'>`).
 *
 * Specific to the `ElementChemistry` shape rather than generic — the
 * other chemistry fields (`symbol`, `atomicNumber`, `formula`) are
 * already plain scalars and pass through.
 */

import { Marshaller } from './Marshaller';
import { Quantity } from '../quantity';
import type { ElementChemistry } from '../material/Material';

/** Persistence shape — molarMass is one of three loose forms. */
export interface ChemistryStored {
  symbol?: string;
  atomicNumber?: number;
  formula?: string;
  molarMass?:
    | { value: number; unit: 'g/mol' }
    | number
    | string;
}

export class ChemistryMarshaller extends Marshaller<
  ElementChemistry | null,
  ChemistryStored | null
> {
  public static readonly templatePath =
    '/lib/persistence/ChemistryMarshaller';

  public fromStored(raw: ChemistryStored | null): ElementChemistry | null {
    if (raw === null || raw === undefined) return null;
    const out: ElementChemistry = {};
    if (raw.symbol !== undefined) out.symbol = raw.symbol;
    if (raw.atomicNumber !== undefined) out.atomicNumber = raw.atomicNumber;
    if (raw.formula !== undefined) out.formula = raw.formula;
    const m = raw.molarMass;
    if (m !== undefined && m !== null) {
      if (typeof m === 'number') {
        out.molarMass = Quantity.of(m, 'g/mol');
      } else if (typeof m === 'string') {
        out.molarMass = Quantity.parse(m, 'g/mol');
      } else if (
        typeof m === 'object' &&
        typeof (m as { value?: unknown }).value === 'number' &&
        (m as { unit?: unknown }).unit === 'g/mol'
      ) {
        out.molarMass = Quantity.of(
          (m as { value: number }).value,
          'g/mol'
        );
      } else {
        throw new TypeError(
          `ChemistryMarshaller: cannot rehydrate molarMass of shape ${typeof m}`
        );
      }
    }
    return out;
  }

  public toStored(runtime: ElementChemistry | null): ChemistryStored | null {
    if (runtime === null || runtime === undefined) return null;
    const out: ChemistryStored = {};
    if (runtime.symbol !== undefined) out.symbol = runtime.symbol;
    if (runtime.atomicNumber !== undefined) out.atomicNumber = runtime.atomicNumber;
    if (runtime.formula !== undefined) out.formula = runtime.formula;
    if (runtime.molarMass !== undefined) {
      if (!(runtime.molarMass instanceof Quantity)) {
        throw new TypeError(
          `ChemistryMarshaller.toStored: molarMass must be a Quantity instance`
        );
      }
      out.molarMass = runtime.molarMass.toJSON();
    }
    return out;
  }
}
