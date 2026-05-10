/**
 * Quantity<U> — typed value object carrying a numeric value plus a
 * unit tag. Substrate for the engine's pedagogical surface: light
 * intensity (lux), emission flux (lumen), mass (kg), molar mass
 * (g/mol), density (kg/m³), color temperature (K), and the rest of
 * the v1 catalog declared in the `Unit` union below.
 *
 * Single-file substrate per the persistence/mixin precedent — the
 * Unit type alias, per-unit math map, tag-table registry, and
 * cross-unit converter table all live here as private data with one
 * public registration hook (`Quantity.registerTagTable`). New
 * channels (light, material, future sound) call the hook at
 * module-load.
 *
 * Persistence shape: `{ value, unit }` JSON via `toJSON` /
 * `fromJSON`. Round-trip through a registered `QuantityMarshaller`
 * for the unit — see `lib/persistence/QuantityMarshaller.ts`. The
 * marshaller is wired via `static fieldMarshallers` for first-class
 * fields and via `initProp(prop, { marshaller: ... })` for
 * PropertiedMixin props.
 *
 * Mml: `toMml(viewer?)` and `formatMml(viewer?)` emit
 * `<quantity unit="..." value="..." [tag="..."]>inner</quantity>`
 * markup. Inner text is the tag (default) or the canonical format
 * (the `formatMml` path). Viewer is threaded for forward
 * compatibility with the deferred pedagogical-seam setting; v1
 * ignores it.
 */

import { Mml } from '../api/mml';

/**
 * The full v1 unit catalog. Mass, length, time, temperature, light,
 * sound, chemistry, pressure/force/energy/power. Sound-side units
 * (`dB`, `Hz`) are declared here so the type union doesn't churn
 * when sound lands; their math / tag-tables register at that point.
 */
export type Unit =
  // Mass / weight
  | 'kg' | 'g'
  // Length / distance
  | 'm' | 'km' | 'cm' | 'mm'
  // Time
  | 's' | 'ms'
  // Temperature
  | 'K'
  // Light
  | 'lux' | 'lumen'
  // Sound (declared now, channel ships later)
  | 'dB' | 'Hz'
  // Chemistry / material
  | 'mol' | 'g/mol' | 'mol/L' | 'kg/m³'
  // Pressure / force / energy / power
  | 'Pa' | 'N' | 'J' | 'W';

/**
 * Per-unit arithmetic. v1 ships only `add` and `scale`. dB's
 * logarithmic addition is deferred (sound).
 */
interface UnitOps {
  add(a: number, b: number): number;
  scale(value: number, factor: number): number;
}

const arithAdd = (a: number, b: number): number => a + b;
const arithScale = (value: number, factor: number): number => value * factor;

const ARITHMETIC_OPS: UnitOps = { add: arithAdd, scale: arithScale };

/**
 * Math is registered per-unit to leave room for non-arithmetic ops
 * (decibel addition) without retrofitting the world. v1 entries are
 * the units that hosts/tests actually exercise add/scale on.
 */
const unitOps: Partial<Record<Unit, UnitOps>> = {
  kg: ARITHMETIC_OPS,
  g: ARITHMETIC_OPS,
  m: ARITHMETIC_OPS,
  km: ARITHMETIC_OPS,
  cm: ARITHMETIC_OPS,
  mm: ARITHMETIC_OPS,
  s: ARITHMETIC_OPS,
  ms: ARITHMETIC_OPS,
  K: ARITHMETIC_OPS,
  lux: ARITHMETIC_OPS,
  lumen: ARITHMETIC_OPS,
  Hz: ARITHMETIC_OPS,
  mol: ARITHMETIC_OPS,
  'g/mol': ARITHMETIC_OPS,
  'mol/L': ARITHMETIC_OPS,
  'kg/m³': ARITHMETIC_OPS,
  Pa: ARITHMETIC_OPS,
  N: ARITHMETIC_OPS,
  J: ARITHMETIC_OPS,
  W: ARITHMETIC_OPS,
};

/**
 * Registry of `{ tag, threshold }` tables, keyed by unit. Populated
 * via `Quantity.registerTagTable` from each channel's Api at
 * module-load. Reading: `tagFor` walks descending — the highest
 * threshold met-or-exceeded wins.
 */
export interface TagTableEntry {
  readonly tag: string;
  readonly threshold: number;
}

const tagTableRegistry: Map<Unit, ReadonlyArray<TagTableEntry>> = new Map();

/**
 * Cross-unit converters keyed by source unit. Sparse — populated
 * for the unit pairs the engine actually needs today (mass-side
 * `g ↔ kg`). `parse` consults this when the input literal's unit
 * differs from the target.
 */
const unitConverters: Map<Unit, Map<Unit, (n: number) => number>> = new Map();

function registerConverter(
  from: Unit,
  to: Unit,
  fn: (n: number) => number
): void {
  let row = unitConverters.get(from);
  if (!row) {
    row = new Map();
    unitConverters.set(from, row);
  }
  row.set(to, fn);
}

// `g ↔ kg` for mass authoring (`mass: "12000 g"` → 12 kg).
registerConverter('g', 'kg', (n) => n / 1000);
registerConverter('kg', 'g', (n) => n * 1000);

/**
 * Thrown by same-unit math when a cast bypasses the compile-time
 * type check at runtime (e.g. `q1.add(q2 as Quantity<U>)` with
 * mismatched units).
 */
export class QuantityUnitMismatchError extends Error {
  public readonly expected: Unit;
  public readonly actual: Unit;

  constructor(expected: Unit, actual: Unit) {
    super(
      `Quantity unit mismatch: expected ${expected}, got ${actual}`
    );
    this.name = 'QuantityUnitMismatchError';
    this.expected = expected;
    this.actual = actual;
  }
}

/**
 * Sorted-table tag lookup by descending threshold; first row whose
 * threshold the value meets-or-exceeds wins. Returns `null` when no
 * table is registered (caller falls back to canonical format).
 */
function tagFor(unit: Unit, value: number): string | null {
  const table = tagTableRegistry.get(unit);
  if (!table) return null;
  // Descending walk — picks the highest band whose threshold is met.
  for (let i = table.length - 1; i >= 0; i--) {
    const entry = table[i]!;
    if (value >= entry.threshold) return entry.tag;
  }
  return null;
}

/**
 * Reverse lookup — tag string → canonical numeric value (the
 * registered threshold). Linear scan; tag tables are short (≤ 6).
 * Returns `null` for tags absent from the table.
 */
function thresholdFor(unit: Unit, tag: string): number | null {
  const table = tagTableRegistry.get(unit);
  if (!table) return null;
  for (const entry of table) {
    if (entry.tag === tag) return entry.threshold;
  }
  return null;
}

/** Match `<number> <unit>` literals: `"12 kg"`, `"55.845 g/mol"`. */
const LITERAL_PATTERN = /^([+-]?\d+(?:\.\d+)?)\s+(\S+)$/;

/**
 * Defense-in-depth escape for the inner text and attribute values
 * the `<quantity>` markup carries. Mirrors `Mml.escape`.
 */
function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class Quantity<U extends Unit> {
  /**
   * Canonical-unit numeric value. Public-readonly so `JSON.stringify`
   * produces the persistence shape directly (matches `Light`'s
   * pattern). Use `rawValue()` from inter-Stuff call sites; the
   * field is structural for serialization.
   */
  public readonly value: number;
  public readonly unit: U;

  /**
   * Private constructor — public construction is `Quantity.of` /
   * `fromTag` / `parse` / `fromJSON`. Forces all entry shapes
   * through validated factories.
   */
  private constructor(value: number, unit: U) {
    this.value = value;
    this.unit = unit;
  }

  /**
   * Primary factory. Validates a finite numeric and produces a
   * `Quantity<U>` with the canonical-unit value.
   */
  public static of<U extends Unit>(value: number, unit: U): Quantity<U> {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(
        `Quantity.of: value must be a finite number, got ${String(value)}`
      );
    }
    return new Quantity<U>(value, unit);
  }

  /**
   * Tag-table reverse lookup. `Quantity.fromTag('heavy', 'kg')`
   * resolves through `KG_TAGS` to a canonical kg value. Throws
   * for tags absent from the unit's table (or units without a
   * registered table).
   */
  public static fromTag<U extends Unit>(tag: string, unit: U): Quantity<U> {
    const value = thresholdFor(unit, tag);
    if (value === null) {
      throw new Error(
        `Quantity.fromTag: unknown tag '${tag}' for unit '${unit}'`
      );
    }
    return new Quantity<U>(value, unit);
  }

  /**
   * Authoring-friendly parse. Four input shapes:
   *   - tag: `"heavy"` → registered threshold for the target unit.
   *   - canonical literal: `"12 kg"` → `Quantity<kg>(12)`.
   *   - alt-unit literal: `"12000 g"` (target `kg`) → `Quantity<kg>(12)`.
   *   - bare number / bare-number string: `5` or `"5"` →
   *     canonical-unit interpretation. `mass: 5` on a `Quantity<kg>`
   *     field is 5 kg, not 5 g.
   *
   * Throws on unrecognized tag, unparseable literal, or alt-unit
   * with no registered converter to the target.
   */
  public static parse<U extends Unit>(
    input: string | number,
    targetUnit: U
  ): Quantity<U> {
    if (typeof input === 'number') {
      return Quantity.of(input, targetUnit);
    }
    if (typeof input !== 'string') {
      throw new TypeError(
        `Quantity.parse: expected string or number, got ${typeof input}`
      );
    }
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      throw new Error(`Quantity.parse: empty input for unit '${targetUnit}'`);
    }
    // Bare-number literal — canonical-unit interpretation.
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && /^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
      return Quantity.of(asNumber, targetUnit);
    }
    // `<n> <unit>` literal.
    const match = LITERAL_PATTERN.exec(trimmed);
    if (match) {
      const n = Number(match[1]);
      const literalUnit = match[2] as Unit;
      if (!Number.isFinite(n)) {
        throw new Error(
          `Quantity.parse: non-finite numeric in '${input}'`
        );
      }
      if (literalUnit === targetUnit) {
        return Quantity.of(n, targetUnit);
      }
      const converter = unitConverters.get(literalUnit)?.get(targetUnit);
      if (!converter) {
        throw new Error(
          `Quantity.parse: no converter from '${literalUnit}' to '${targetUnit}'`
        );
      }
      return Quantity.of(converter(n), targetUnit);
    }
    // Tag literal — registered table lookup.
    const tagValue = thresholdFor(targetUnit, trimmed);
    if (tagValue !== null) {
      return Quantity.of(tagValue, targetUnit);
    }
    throw new Error(
      `Quantity.parse: cannot parse '${input}' as Quantity<${targetUnit}>`
    );
  }

  /**
   * Reconstruct from the persistence shape produced by `toJSON`.
   * Used by PropertiedMixin's hydrator and by callers passing
   * `{ value, unit }` plain objects through external boundaries.
   */
  public static fromJSON<U extends Unit>(json: {
    value: number;
    unit: U;
  }): Quantity<U> {
    if (
      !json ||
      typeof json !== 'object' ||
      typeof (json as { value?: unknown }).value !== 'number' ||
      typeof (json as { unit?: unknown }).unit !== 'string'
    ) {
      throw new TypeError(
        `Quantity.fromJSON: expected { value: number, unit: string } shape`
      );
    }
    return Quantity.of(json.value, json.unit);
  }

  /**
   * Channel-Api hook: register a tag table for the given unit. Each
   * channel calls this at module-load; later registrations replace
   * earlier ones for the same unit (by design — content-team
   * iteration without restart-required code edits, once YAML
   * tables ship).
   */
  public static registerTagTable(
    unit: Unit,
    entries: ReadonlyArray<TagTableEntry>
  ): void {
    // Sort ascending by threshold so `tagFor` can walk descending
    // deterministically and `thresholdFor` reads the registered
    // values back unchanged.
    const sorted = [...entries].sort((a, b) => a.threshold - b.threshold);
    tagTableRegistry.set(unit, sorted);
  }

  /**
   * Drop a registered table for `unit`. Used by `QuantityApi`'s
   * reload path to delete entries that disappeared from the YAML
   * since the last load, and by tests to reset registry state
   * between cases.
   */
  public static _clearTagTable(unit: Unit): void {
    tagTableRegistry.delete(unit);
  }

  /**
   * Snapshot of the units currently carrying a registered tag
   * table. Used by `QuantityApi.reloadTagTables` to compute which
   * units to delete after a re-read.
   */
  public static _registeredTagTableUnits(): Unit[] {
    return Array.from(tagTableRegistry.keys());
  }

  // ---------- inspection ----------

  public rawValue(): number {
    return this.value;
  }

  /** Canonical format: `"5 kg"`, `"320 lux"`, `"55.845 g/mol"`. */
  public format(): string {
    return `${this.value} ${this.unit}`;
  }

  /**
   * Tag-table lookup. Returns the registered tag string when one is
   * defined for the unit; otherwise falls back to the canonical
   * format (so `Quantity<g/mol>.tag()` reads "55.845 g/mol", not
   * "" or null).
   */
  public tag(): string {
    const tag = tagFor(this.unit, this.value);
    if (tag !== null) return tag;
    return this.format();
  }

  /**
   * Cross-unit conversion. Returns a `Quantity<Unit>` rather than a
   * narrowly-typed `Quantity<TargetUnit>` because the target is a
   * runtime parameter — callers that need narrow typing should call
   * the unit-specific accessor on their host (e.g.
   * `light.intensity` is statically `Quantity<'lux'>`).
   */
  public to(targetUnit: Unit): Quantity<Unit> {
    if (targetUnit === this.unit) {
      return this as Quantity<Unit>;
    }
    const converter = unitConverters.get(this.unit)?.get(targetUnit);
    if (!converter) {
      throw new Error(
        `Quantity.to: no converter from '${this.unit}' to '${targetUnit}'`
      );
    }
    return Quantity.of(converter(this.value), targetUnit);
  }

  // ---------- comparison ----------

  public equals(other: Quantity<U>): boolean {
    return other.unit === this.unit && other.value === this.value;
  }

  public lessThan(other: Quantity<U>): boolean {
    this.assertSameUnit(other);
    return this.value < other.value;
  }

  public greaterThan(other: Quantity<U>): boolean {
    this.assertSameUnit(other);
    return this.value > other.value;
  }

  // ---------- math ----------

  public add(other: Quantity<U>): Quantity<U> {
    this.assertSameUnit(other);
    const ops = unitOps[this.unit];
    if (!ops) {
      throw new Error(
        `Quantity.add: no math ops registered for unit '${this.unit}'`
      );
    }
    return new Quantity<U>(ops.add(this.value, other.value), this.unit);
  }

  public subtract(other: Quantity<U>): Quantity<U> {
    this.assertSameUnit(other);
    const ops = unitOps[this.unit];
    if (!ops) {
      throw new Error(
        `Quantity.subtract: no math ops registered for unit '${this.unit}'`
      );
    }
    // Subtract is add(a, -b) for the arithmetic ops; per-unit math
    // that grows non-arithmetic semantics (dB) overrides separately.
    return new Quantity<U>(ops.add(this.value, -other.value), this.unit);
  }

  public scale(factor: number): Quantity<U> {
    if (typeof factor !== 'number' || !Number.isFinite(factor)) {
      throw new TypeError(
        `Quantity.scale: factor must be a finite number, got ${String(factor)}`
      );
    }
    const ops = unitOps[this.unit];
    if (!ops) {
      throw new Error(
        `Quantity.scale: no math ops registered for unit '${this.unit}'`
      );
    }
    return new Quantity<U>(ops.scale(this.value, factor), this.unit);
  }

  // ---------- Mml emission ----------

  /**
   * Default-prose emission. Inner text is the tag (or canonical
   * format for tagless units). Viewer parameter is forward-compat
   * for the deferred pedagogical-seam setting.
   */
  public toMml(_viewer?: unknown): Mml {
    return Mml.fromMarkup(this.buildMarkup(this.tag()));
  }

  /**
   * Instrument / analyze emission. Same wrapper, canonical text
   * inside.
   */
  public formatMml(_viewer?: unknown): Mml {
    return Mml.fromMarkup(this.buildMarkup(this.format()));
  }

  /**
   * Compose the `<quantity>` markup. Inner text and attribute
   * values are HTML-escaped — the values come from internal state
   * and are unlikely to contain `<` or `&`, but escape is
   * defense-in-depth.
   */
  private buildMarkup(innerText: string): string {
    const unitAttr = escapeText(this.unit);
    const valueAttr = escapeText(String(this.value));
    const inner = escapeText(innerText);
    const tag = tagFor(this.unit, this.value);
    if (tag !== null) {
      const tagAttr = escapeText(tag);
      return `<quantity unit="${unitAttr}" value="${valueAttr}" tag="${tagAttr}">${inner}</quantity>`;
    }
    return `<quantity unit="${unitAttr}" value="${valueAttr}">${inner}</quantity>`;
  }

  // ---------- persistence ----------

  public toJSON(): { value: number; unit: U } {
    return { value: this.value, unit: this.unit };
  }

  // ---------- internals ----------

  private assertSameUnit(other: Quantity<U>): void {
    if (other.unit !== this.unit) {
      throw new QuantityUnitMismatchError(
        this.unit,
        other.unit as Unit
      );
    }
  }
}
