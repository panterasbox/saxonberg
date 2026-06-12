/**
 * QuantityMarshaller — Marshaller subclass that round-trips
 * `Quantity<U>` value objects through the persistence boundary.
 *
 * One class, parameterized by target unit at the instance level
 * (the `unit` field is set from the seed's `data:` block). Each
 * unit gets its own templatePath under
 * `/lib/persistence/QuantityMarshaller/<encoded-unit>` — callers
 * resolve via `QuantityMarshaller.pathFor(unit)` to avoid hardcoding
 * the path-encoding rule.
 *
 * `fromStored` is **liberal** — accepts the canonical JSON shape
 * (`{ value, unit }`) plus numeric and string forms for authoring
 * ergonomics. This is the one place duck-typing-ish coercion lives;
 * setters that route through the marshaller stay strict on
 * `Quantity<U>`. `toStored` is strict, always emits the canonical
 * JSON shape.
 *
 * Path encoding: composite units like `'g/mol'` and `'kg/m³'` carry
 * characters that don't make great filesystem segments. The
 * encoding maps `'/'` → `'-per-'` and the unicode `³` → `'3'`,
 * giving `g-per-mol` and `kg-per-m3`. Authors should never write
 * the encoded form directly — call `QuantityMarshaller.pathFor`.
 */

import { Marshaller } from './Marshaller';
import { Quantity } from '../quantity';
import type { Unit } from '../quantity';
import { TemplatePaths } from '../paths';

/**
 * Storage shape. The canonical form is `{ value, unit }` — what
 * `Quantity.toJSON()` produces. The marshaller's `fromStored`
 * additionally tolerates `number` and `string` shapes so YAML
 * authoring doesn't have to wrap in the JSON shape (a seed can
 * write `mass: 5` or `mass: heavy` directly).
 */
export type QuantityStored<U extends Unit = Unit> =
  | { value: number; unit: U }
  | number
  | string;

/**
 * Encode a `Unit` into a templatePath-safe segment. Composite units
 * (`'g/mol'`, `'kg/m³'`, `'mol/L'`) become `'g-per-mol'`,
 * `'kg-per-m3'`, `'mol-per-L'`; `'W/(m·K)'` becomes `'W-per-m-K'`. The
 * bare ratio unit `'%'` encodes to `'pct'` so filesystem segments stay
 * portable. Plain units pass through unchanged.
 */
function encodeUnit(unit: Unit): string {
  return unit
    .replace(/\//g, '-per-')
    .replace(/[()]/g, '')
    .replace(/·/g, '-')
    .replace(/³/g, '3')
    .replace(/²/g, '2')
    .replace(/%/g, 'pct');
}

export class QuantityMarshaller<U extends Unit = Unit> extends Marshaller<
  Quantity<U>,
  QuantityStored<U>
> {
  public static readonly templatePath = TemplatePaths.quantityMarshaller;

  /**
   * Compute the per-unit templatePath. Use at field-marshaller
   * declaration sites:
   *
   * ```ts
   * static fieldMarshallers = {
   *   density: QuantityMarshaller.pathFor('kg/m³'),
   * };
   * ```
   */
  public static pathFor(unit: Unit): string {
    return `${QuantityMarshaller.templatePath}/${encodeUnit(unit)}`;
  }

  /**
   * Persistent field carrying this marshaller instance's target
   * unit. Set by the seed's `data:` block; one marshaller singleton
   * per unit lives at `pathFor(unit)`.
   */
  protected unit: U = 'kg' as U;

  static persistentFields = ['unit'];

  public getUnit(): U {
    return this.unit;
  }

  public fromStored(raw: QuantityStored<U>): Quantity<U> {
    if (raw === null || raw === undefined) {
      throw new TypeError(
        `QuantityMarshaller<${this.unit}>: cannot rehydrate null/undefined`
      );
    }
    if (typeof raw === 'number') {
      return Quantity.of(raw, this.unit);
    }
    if (typeof raw === 'string') {
      return Quantity.parse(raw, this.unit);
    }
    if (
      typeof raw === 'object' &&
      typeof (raw as { value?: unknown }).value === 'number' &&
      typeof (raw as { unit?: unknown }).unit === 'string'
    ) {
      const json = raw as { value: number; unit: U };
      // Allow the stored `unit` to differ from the marshaller's
      // target only via Quantity.parse's converter table — a stored
      // `{value: 12000, unit: 'g'}` against a kg marshaller
      // converts to 12 kg.
      if (json.unit === this.unit) {
        return Quantity.of(json.value, this.unit);
      }
      return Quantity.parse(`${json.value} ${json.unit}`, this.unit);
    }
    throw new TypeError(
      `QuantityMarshaller<${this.unit}>: cannot rehydrate ${typeof raw}`
    );
  }

  public toStored(q: Quantity<U>): QuantityStored<U> {
    if (!(q instanceof Quantity)) {
      throw new TypeError(
        `QuantityMarshaller<${this.unit}>: toStored expects a Quantity instance`
      );
    }
    if ((q as Quantity<Unit>).unit !== this.unit) {
      throw new TypeError(
        `QuantityMarshaller<${this.unit}>: cannot store Quantity<${(q as Quantity<Unit>).unit}>`
      );
    }
    return { value: q.rawValue(), unit: this.unit };
  }
}
