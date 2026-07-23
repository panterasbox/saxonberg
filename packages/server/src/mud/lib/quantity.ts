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
  // Volume
  | 'm³'
  // Liquid volume (bulk substrate — `cup`/`mL` join the vitals `L`
  // below; tagless like `m³`, round-tripped via converters to `L`)
  | 'mL' | 'cup'
  // Time
  | 's' | 'ms'
  // Temperature
  | 'K'
  // Light
  | 'lux' | 'lumen'
  // Sound (declared now, channel ships later)
  | 'dB' | 'Hz'
  // Chemistry / material
  | 'mol' | 'g/mol' | 'mol/L' | 'kg/m³' | 'ppm'
  // Mass (sub-gram) — toxin / nutrient authored amounts + absorbed dose
  | 'mg'
  // Blood-alcohol concentration (mass/volume) — the Widmark BAC read,
  // carrying the `'bac'` drunk-ladder tag scale
  | 'g/dL'
  // Pressure / force / energy / power
  | 'Pa' | 'N' | 'J' | 'W'
  // Mechanical material properties (materials-response) — real, tabulated:
  // `MPa` = indentation hardness (pressure-shaped, resistance to a point
  // load); `MJ/m³` = toughness (energy absorbed per unit volume before
  // fracture — the height a material lends the response curve). Consumed by
  // `MaterialApi`'s response function.
  | 'MPa' | 'MJ/m³'
  // Thermal conductivity (W per metre-kelvin) — real material property,
  // tabulated; consumed by the Thermal capability (heat flow / algor mortis)
  | 'W/(m·K)'
  // Specific heat capacity (joules per kilogram-kelvin) — real material
  // property; the `C = m·c` half of the Thermal capability's τ = R·C
  | 'J/(kg·K)'
  // Energy per mass (fire / phase change) — real, tabulated. `MJ/kg` =
  // heat of combustion (energy released burning a kilogram of fuel: wood
  // ≈ 16, charcoal ≈ 30); `J/kg` = latent heat of fusion / vaporization
  // (energy per kilogram to melt / boil at the phase transition — the
  // reserve-clamp plateau). Consumed by `FireApi` / `ThermalApi`.
  | 'MJ/kg' | 'J/kg'
  // Clothing insulation (the clo unit) — its own thermal-resistance axis,
  // summed across worn garments by the body's thermoregulation layer
  | 'clo'
  // Wind speed (metres per second) — static-authored atmospheric field,
  // the wind-chill input to the body's effective-ambient resolver
  | 'm/s'
  // Ratio (humidity, etc.) — bare percent string
  | '%'
  // Electricity (electricity subsystem) — real, tabulated. `S/m` =
  // electrical conductivity (the material property the shock model reads,
  // sibling of `hardness`/`toughness`); `V`/`A`/`Ω` = the Ohm's-law triple
  // (`I = V/R`) resolved by `MaterialApi`. Coursework sub/super scales
  // (`kV`/`mV`/`mA`/`kΩ`/`MΩ`) round-trip to the base unit via converters —
  // a taser reads `50 kV`, a let-go current `10 mA`, dry skin `100 kΩ`.
  | 'V' | 'A' | 'Ω' | 'S/m'
  | 'kV' | 'mV' | 'mA' | 'kΩ' | 'MΩ'
  // Dimensionless points — the neutral unit for *authored* reserve
  // instances (the Reserve substrate's promised magic-side pools:
  // mana / charge / essence), where capacity is a real per-host
  // magnitude (avail/max) rather than the biological `%`-of-100
  // shape. Named neutrally: "mana" is a content word, never an
  // engine surface.
  | 'pt'
  // Vitals (rate / pressure / volume)
  | 'bpm' | 'mmHg' | 'L'
  // Acceleration (gravity)
  | 'm/s²'
  // Angle (celestial: axial tilt, solar altitude / azimuth)
  | 'degrees';

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
 * Decibel arithmetic: amplitude in dB combines logarithmically.
 * For incoherent sound sources the canonical sum is
 *   10 * log10(10^(a/10) + 10^(b/10))
 * which produces ~3 dB more than the louder of two equal-amplitude
 * sources (60 dB + 60 dB → 63.01 dB), not 120 dB. Multiplication on
 * linear amplitude corresponds to adding `10 * log10(factor)` to the
 * dB value, with `factor === 0` resolving to negative infinity (we
 * floor at the practical minimum of -120 dB for numeric stability).
 */
const dBAdd = (a: number, b: number): number =>
  10 * Math.log10(Math.pow(10, a / 10) + Math.pow(10, b / 10));

const dBScale = (value: number, factor: number): number => {
  if (factor <= 0) return -120;
  if (factor === 1) return value;
  return value + 10 * Math.log10(factor);
};

const DECIBEL_OPS: UnitOps = { add: dBAdd, scale: dBScale };

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
  dB: DECIBEL_OPS,
  mol: ARITHMETIC_OPS,
  'g/mol': ARITHMETIC_OPS,
  'mol/L': ARITHMETIC_OPS,
  'kg/m³': ARITHMETIC_OPS,
  ppm: ARITHMETIC_OPS,
  mg: ARITHMETIC_OPS,
  'g/dL': ARITHMETIC_OPS,
  Pa: ARITHMETIC_OPS,
  N: ARITHMETIC_OPS,
  J: ARITHMETIC_OPS,
  W: ARITHMETIC_OPS,
  MPa: ARITHMETIC_OPS,
  'MJ/m³': ARITHMETIC_OPS,
  'W/(m·K)': ARITHMETIC_OPS,
  'J/(kg·K)': ARITHMETIC_OPS,
  'MJ/kg': ARITHMETIC_OPS,
  'J/kg': ARITHMETIC_OPS,
  clo: ARITHMETIC_OPS,
  'm/s': ARITHMETIC_OPS,
  '%': ARITHMETIC_OPS,
  pt: ARITHMETIC_OPS,
  bpm: ARITHMETIC_OPS,
  mmHg: ARITHMETIC_OPS,
  L: ARITHMETIC_OPS,
  'm/s²': ARITHMETIC_OPS,
  degrees: ARITHMETIC_OPS,
  mL: ARITHMETIC_OPS,
  cup: ARITHMETIC_OPS,
  V: ARITHMETIC_OPS,
  A: ARITHMETIC_OPS,
  Ω: ARITHMETIC_OPS,
  'S/m': ARITHMETIC_OPS,
  kV: ARITHMETIC_OPS,
  mV: ARITHMETIC_OPS,
  mA: ARITHMETIC_OPS,
  kΩ: ARITHMETIC_OPS,
  MΩ: ARITHMETIC_OPS,
};

/**
 * One row in a tag table.
 */
export interface TagTableEntry {
  readonly tag: string;
  readonly threshold: number;
}

/**
 * Scale name — disambiguates multiple tag vocabularies registered
 * for the same unit. Examples: `'color'` and `'thermal'` for K
 * (color temperature vs thermal temperature, same Kelvin numerics
 * but different prose vocabulary). Single-scale units use the
 * conventional name `'default'`.
 *
 * Scale selection is a RENDERING choice, not a typing distinction.
 * `Quantity<'K'>` carries no semantic — the same instance can
 * render with EITHER scale at call time. See
 * `docs/subsystems/quantities.md § Scales` for the principle.
 */
export type ScaleName = string;

export const DEFAULT_SCALE: ScaleName = 'default';

/**
 * Registry of tag tables, double-keyed by unit and scale name. Each
 * unit's inner map can hold any number of scales — the canonical
 * example is `'K'` with both a color-temperature scale (warm /
 * neutral / cool) and a future thermal-temperature scale (frozen /
 * room / boiling). `Quantity.tag(scaleName?)` consults the right
 * scale; no-arg calls fall back to the unit's default scale.
 */
const tagTableRegistry: Map<
  Unit,
  Map<ScaleName, ReadonlyArray<TagTableEntry>>
> = new Map();

/**
 * Per-unit default-scale picker. First scale registered for a unit
 * is auto-set as the default; explicit `setDefaultScale` overrides.
 * `Quantity.tag()` / `parse()` / `fromTag()` without a scale name
 * consult this map.
 */
const defaultScaleByUnit: Map<Unit, ScaleName> = new Map();

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

/** One-shot guard for {@link ensureDefaultRegistrations}. */
let defaultsRegistered = false;

/**
 * Populate the default converters and the substrate-declared tag
 * scales on first use. Lazy-init keeps this module free of
 * module-scope statements (the no-free-standing-statements rule) at
 * the cost of one boolean check per registry read. Called by every
 * read/mutation path that touches the converter or tag-table maps,
 * so observable behavior matches the old at-import registration.
 */
function ensureDefaultRegistrations(): void {
  if (defaultsRegistered) return;
  // Set the flag first: `Quantity.registerTagTable` below re-enters
  // this guard and must see it already satisfied.
  defaultsRegistered = true;

  // `g ↔ kg` for mass authoring (`mass: "12000 g"` → 12 kg).
  registerConverter('g', 'kg', (n) => n / 1000);
  registerConverter('kg', 'g', (n) => n * 1000);

  // Vitals: `mmHg ↔ Pa` (blood pressure) and `L ↔ m³` (blood volume).
  // `bpm` is its own rate axis with no converter (pulse vs respiration
  // is a tag-scale distinction, not a unit conversion).
  registerConverter('mmHg', 'Pa', (n) => n * 133.322368);
  registerConverter('Pa', 'mmHg', (n) => n / 133.322368);
  registerConverter('L', 'm³', (n) => n / 1000);
  registerConverter('m³', 'L', (n) => n * 1000);

  // Bulk liquid volume: `mL` and `cup` round-trip against the
  // canonical bulk-slot unit `L`. One US-customary cup is 236.5882365
  // mL. The bulk substrate stores every liquid amount as
  // `Quantity<'L'>`; authored or player-typed `cup` / `mL` measures
  // convert to `L` at the boundary (`Quantity.parse` / `Quantity.to`).
  registerConverter('mL', 'L', (n) => n / 1000);
  registerConverter('L', 'mL', (n) => n * 1000);
  registerConverter('cup', 'L', (n) => n * 0.2365882365);
  registerConverter('L', 'cup', (n) => n / 0.2365882365);

  // Sub-gram mass: `mg ↔ g` for toxin / nutrient authored amounts and
  // the absorbed-dose math (metabolism).
  registerConverter('mg', 'g', (n) => n / 1000);
  registerConverter('g', 'mg', (n) => n * 1000);

  // Electricity coursework scales round-trip to the base SI unit.
  // `S/m` (conductivity, the material axis) is a base axis with no
  // converter, like `bpm`. Voltage `kV`/`mV ↔ V`, current `mA ↔ A`,
  // resistance `kΩ`/`MΩ ↔ Ω` — so `Quantity.parse('50 kV', 'V')` =
  // 50000 V and a `10 mA` authored current hydrates as `0.01 A`.
  registerConverter('kV', 'V', (n) => n * 1000);
  registerConverter('V', 'kV', (n) => n / 1000);
  registerConverter('mV', 'V', (n) => n / 1000);
  registerConverter('V', 'mV', (n) => n * 1000);
  registerConverter('mA', 'A', (n) => n / 1000);
  registerConverter('A', 'mA', (n) => n * 1000);
  registerConverter('kΩ', 'Ω', (n) => n * 1000);
  registerConverter('Ω', 'kΩ', (n) => n / 1000);
  registerConverter('MΩ', 'Ω', (n) => n * 1_000_000);
  registerConverter('Ω', 'MΩ', (n) => n / 1_000_000);

  // ---------- substrate-declared tag-scale registrations ----------
  // Registered here (rather than from a channel module) because the
  // unit + its scale are declared together in this substrate file.
  // The blood-alcohol "drunk ladder" — a `'bac'` scale on `g/dL`
  // (metabolism's alcohol exemplar reads `getBAC()` against it).
  // Ascending thresholds; `Quantity.of(bac, 'g/dL').tag('bac')` names
  // the rung and `compareTag('g/dL', a, b, 'bac')` orders them. Same
  // scale-tag mechanism as the lux light bands / future thermal-K
  // scale.
  Quantity.registerTagTable('g/dL', 'bac', [
    { tag: 'sober', threshold: 0 },
    { tag: 'tipsy', threshold: 0.03 },
    { tag: 'drunk', threshold: 0.08 },
    { tag: 'very-drunk', threshold: 0.15 },
    { tag: 'incapacitated', threshold: 0.25 },
    { tag: 'life-threatening', threshold: 0.4 },
  ]);
}

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
 * Resolve a scale name for the given unit. Explicit name wins;
 * otherwise the unit's registered default. Returns `null` when no
 * scale is registered for the unit at all.
 */
function resolveScaleName(unit: Unit, scaleName?: ScaleName): ScaleName | null {
  ensureDefaultRegistrations();
  if (scaleName !== undefined) return scaleName;
  return defaultScaleByUnit.get(unit) ?? null;
}

/**
 * Sorted-table tag lookup by descending threshold; first row whose
 * threshold the value meets-or-exceeds wins. Returns `null` when no
 * table is registered for the (unit, scale) pair (caller falls back
 * to canonical format).
 */
function tagFor(
  unit: Unit,
  value: number,
  scaleName?: ScaleName
): string | null {
  const scale = resolveScaleName(unit, scaleName);
  if (scale === null) return null;
  const table = tagTableRegistry.get(unit)?.get(scale);
  if (!table) return null;
  for (let i = table.length - 1; i >= 0; i--) {
    const entry = table[i]!;
    if (value >= entry.threshold) return entry.tag;
  }
  return null;
}

/**
 * Reverse lookup — tag string → canonical numeric value (the
 * registered threshold). Linear scan; tag tables are short (≤ 6).
 * Returns `null` for tags absent from the table or for
 * unit/scale pairs with no registered table.
 */
function thresholdFor(
  unit: Unit,
  tag: string,
  scaleName?: ScaleName
): number | null {
  const scale = resolveScaleName(unit, scaleName);
  if (scale === null) return null;
  const table = tagTableRegistry.get(unit)?.get(scale);
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
   * Tag-table reverse lookup. Resolves through the registered
   * table to a canonical numeric value. The optional `scaleName`
   * picks which vocabulary to consult when the unit has multiple
   * registered scales (e.g. `'color'` vs `'thermal'` for K).
   * Without `scaleName`, falls back to the unit's default scale.
   *
   * Throws for tags absent from the resolved table, or for unit /
   * scale pairs with no registered table.
   */
  public static fromTag<U extends Unit>(
    tag: string,
    unit: U,
    scaleName?: ScaleName
  ): Quantity<U> {
    const value = thresholdFor(unit, tag, scaleName);
    if (value === null) {
      const scaleHint = scaleName
        ? `scale '${scaleName}'`
        : `default scale (${defaultScaleByUnit.get(unit) ?? 'none'})`;
      throw new Error(
        `Quantity.fromTag: unknown tag '${tag}' for unit '${unit}' (${scaleHint})`
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
   * The optional `scaleName` selects which tag table to consult when
   * the input is a tag string and the target unit has multiple
   * scales registered.
   *
   * Throws on unrecognized tag, unparseable literal, or alt-unit
   * with no registered converter to the target.
   */
  public static parse<U extends Unit>(
    input: string | number,
    targetUnit: U,
    scaleName?: ScaleName
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
      ensureDefaultRegistrations();
      const converter = unitConverters.get(literalUnit)?.get(targetUnit);
      if (!converter) {
        throw new Error(
          `Quantity.parse: no converter from '${literalUnit}' to '${targetUnit}'`
        );
      }
      return Quantity.of(converter(n), targetUnit);
    }
    // Tag literal — registered table lookup.
    const tagValue = thresholdFor(targetUnit, trimmed, scaleName);
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
   * Register a tag table for `(unit, scaleName)`. Replaces any
   * prior table at that pair. First scale registered for a unit
   * becomes that unit's default scale (the one `tag()` /
   * `parse()` / `fromTag()` consult when no scale name is given);
   * `setDefaultScale` overrides explicitly.
   *
   * `scaleName` defaults to `DEFAULT_SCALE` (`'default'`) for
   * single-vocabulary units like `kg` or `lux`. Units with
   * multiple vocabularies (`K`'s color vs thermal) register each
   * scale by an explicit name.
   */
  public static registerTagTable(
    unit: Unit,
    scaleName: ScaleName,
    entries: ReadonlyArray<TagTableEntry>
  ): void {
    // Run the default registrations first so registration order (and
    // with it the first-scale-becomes-default rule) matches the old
    // at-import behavior.
    ensureDefaultRegistrations();
    // Sort ascending by threshold so `tagFor` can walk descending
    // deterministically and `thresholdFor` reads the registered
    // values back unchanged.
    const sorted = [...entries].sort((a, b) => a.threshold - b.threshold);
    let scales = tagTableRegistry.get(unit);
    if (!scales) {
      scales = new Map();
      tagTableRegistry.set(unit, scales);
    }
    const isFirstScaleForUnit = scales.size === 0;
    scales.set(scaleName, sorted);
    // First registered scale auto-takes the default slot. Later
    // scales added to the same unit don't shift the default — use
    // `setDefaultScale` to switch deliberately.
    if (isFirstScaleForUnit) {
      defaultScaleByUnit.set(unit, scaleName);
    }
  }

  /**
   * Pick which scale `tag()` / `parse()` / `fromTag()` consult for
   * `unit` when no `scaleName` is passed. Throws if the scale
   * isn't registered for that unit.
   */
  public static setDefaultScale(
    unit: Unit,
    scaleName: ScaleName
  ): void {
    ensureDefaultRegistrations();
    const scales = tagTableRegistry.get(unit);
    if (!scales || !scales.has(scaleName)) {
      throw new Error(
        `Quantity.setDefaultScale: scale '${scaleName}' is not registered for unit '${unit}'`
      );
    }
    defaultScaleByUnit.set(unit, scaleName);
  }

  /**
   * Drop a registered scale for `unit`. When `scaleName` is
   * omitted, removes every scale registered for the unit. Used by
   * `QuantityApi`'s reload path to handle entries that disappeared
   * from the YAML, and by tests to reset registry state.
   */
  public static _clearTagTable(unit: Unit, scaleName?: ScaleName): void {
    ensureDefaultRegistrations();
    if (scaleName === undefined) {
      tagTableRegistry.delete(unit);
      defaultScaleByUnit.delete(unit);
      return;
    }
    const scales = tagTableRegistry.get(unit);
    if (!scales) return;
    scales.delete(scaleName);
    if (defaultScaleByUnit.get(unit) === scaleName) {
      // Default fell away — pick the next remaining scale as the
      // new default, or drop the entry if none remain.
      const next = scales.keys().next();
      if (next.done) {
        defaultScaleByUnit.delete(unit);
        tagTableRegistry.delete(unit);
      } else {
        defaultScaleByUnit.set(unit, next.value);
      }
    } else if (scales.size === 0) {
      tagTableRegistry.delete(unit);
    }
  }

  /**
   * Snapshot of the (unit, scaleName) pairs currently carrying a
   * registered table. Used by `QuantityApi.reloadTagTables` to
   * compute which scales to delete after a re-read.
   */
  public static _registeredScales(): Array<{
    unit: Unit;
    scaleName: ScaleName;
  }> {
    ensureDefaultRegistrations();
    const out: Array<{ unit: Unit; scaleName: ScaleName }> = [];
    for (const [unit, scales] of tagTableRegistry) {
      for (const scaleName of scales.keys()) {
        out.push({ unit, scaleName });
      }
    }
    return out;
  }

  /** Inspect the registered default scale for a unit; null if unset. */
  public static _defaultScaleFor(unit: Unit): ScaleName | null {
    ensureDefaultRegistrations();
    return defaultScaleByUnit.get(unit) ?? null;
  }

  // ---------- tag-table introspection ----------

  /**
   * Ordered tag list for a `(unit, scaleName)` pair. Order is
   * ascending by threshold (the registry sorts entries on register
   * for `tagFor`'s descending walk; this helper exposes the same
   * ordering as a plain string array for callers that need to do
   * shift/compare arithmetic over tag bands).
   *
   * Returns an empty array when no table is registered for the
   * pair. `scaleName` defaults to the unit's registered default
   * scale.
   *
   * Cross-unit consumer pattern: `LightBand` is the lux scale's
   * tag list; a future thermal-K scale would expose its own
   * ordered tag list the same way.
   */
  public static tagsFor(
    unit: Unit,
    scaleName?: ScaleName
  ): readonly string[] {
    const scale = resolveScaleName(unit, scaleName);
    if (scale === null) return [];
    const table = tagTableRegistry.get(unit)?.get(scale);
    if (!table) return [];
    return table.map((entry) => entry.tag);
  }

  /**
   * Shift a tag by integer band offset within its registered
   * `(unit, scaleName)` ordering. Clamps to the [first, last] band
   * range; non-finite shifts are treated as zero (the input tag
   * passes through unchanged).
   *
   * Throws when:
   *   - No table is registered for the (unit, scaleName) pair.
   *   - `tag` isn't present in the resolved table.
   *
   * Worked example: `shiftTag('lux', 'lit', -2)` → `'very-dim'`
   * (assuming the lux scale order pitch-black/very-dim/dim/lit/
   * bright/blinding). `shiftTag('lux', 'pitch-black', -10)` →
   * `'pitch-black'` (clamped at the floor).
   */
  public static shiftTag(
    unit: Unit,
    tag: string,
    shift: number,
    scaleName?: ScaleName
  ): string {
    const tags = Quantity.tagsFor(unit, scaleName);
    if (tags.length === 0) {
      throw new Error(
        `Quantity.shiftTag: no tag table registered for unit '${unit}' ` +
          `(scale '${scaleName ?? defaultScaleByUnit.get(unit) ?? '(none)'}')`
      );
    }
    const idx = tags.indexOf(tag);
    if (idx < 0) {
      throw new Error(
        `Quantity.shiftTag: tag '${tag}' is not registered for unit '${unit}' ` +
          `(scale '${scaleName ?? defaultScaleByUnit.get(unit) ?? '(none)'}')`
      );
    }
    if (!Number.isFinite(shift) || shift === 0) return tag;
    const target = idx + Math.trunc(shift);
    const clamped = Math.max(0, Math.min(tags.length - 1, target));
    return tags[clamped]!;
  }

  /**
   * Compare two tags by their position in a `(unit, scaleName)`'s
   * registered ordering. Returns a sign-only integer (negative when
   * `a` precedes `b`, zero when equal, positive when `a` follows
   * `b`) — same shape as `Array.prototype.sort`'s comparator.
   *
   * Throws when no table is registered for the pair, or when either
   * tag isn't present in the resolved table.
   */
  public static compareTag(
    unit: Unit,
    a: string,
    b: string,
    scaleName?: ScaleName
  ): number {
    const tags = Quantity.tagsFor(unit, scaleName);
    if (tags.length === 0) {
      throw new Error(
        `Quantity.compareTag: no tag table registered for unit '${unit}' ` +
          `(scale '${scaleName ?? defaultScaleByUnit.get(unit) ?? '(none)'}')`
      );
    }
    const ai = tags.indexOf(a);
    const bi = tags.indexOf(b);
    if (ai < 0 || bi < 0) {
      const missing = ai < 0 ? a : b;
      throw new Error(
        `Quantity.compareTag: tag '${missing}' is not registered for unit ` +
          `'${unit}' (scale '${scaleName ?? defaultScaleByUnit.get(unit) ?? '(none)'}')`
      );
    }
    return ai - bi;
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
   * Tag-table lookup. Returns the registered tag string when one
   * is defined for the unit; otherwise falls back to the canonical
   * format (so `Quantity<g/mol>.tag()` reads "55.845 g/mol", not
   * "" or null).
   *
   * The optional `scaleName` selects which vocabulary to consult
   * when the unit has multiple registered scales (e.g. `'color'`
   * vs `'thermal'` for K). Without `scaleName`, falls back to the
   * unit's default scale.
   */
  public tag(scaleName?: ScaleName): string {
    const tag = tagFor(this.unit, this.value, scaleName);
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
    ensureDefaultRegistrations();
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
   * for the deferred pedagogical-seam setting. Optional
   * `scaleName` picks the vocabulary when multiple scales are
   * registered for the unit; default scale otherwise.
   */
  public toMml(_viewer?: unknown, scaleName?: ScaleName): Mml {
    return Mml.fromMarkup(this.buildMarkup(this.tag(scaleName), scaleName));
  }

  /**
   * Instrument / analyze emission. Same wrapper, canonical text
   * inside. The optional `scaleName` flows through to the
   * `<quantity tag="...">` attribute when a tag table is
   * registered for the unit at that scale.
   */
  public formatMml(_viewer?: unknown, scaleName?: ScaleName): Mml {
    return Mml.fromMarkup(this.buildMarkup(this.format(), scaleName));
  }

  /**
   * Compose the `<quantity>` markup. Inner text and attribute
   * values are HTML-escaped — the values come from internal state
   * and are unlikely to contain `<` or `&`, but escape is
   * defense-in-depth.
   */
  private buildMarkup(innerText: string, scaleName?: ScaleName): string {
    const unitAttr = escapeText(this.unit);
    const valueAttr = escapeText(String(this.value));
    const inner = escapeText(innerText);
    const tag = tagFor(this.unit, this.value, scaleName);
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
