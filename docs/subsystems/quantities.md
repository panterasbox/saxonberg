# Quantities

The `Quantity<U>` value object is Saxonberg's substrate for engine
state that carries real units. Light intensity (lux), luminous flux
(lumen), color temperature (Kelvin), mass (kg), molar mass (g/mol),
and density (kg/m³) all flow through `Quantity` rather than through
opaque scalars. Future channels (sound, heat, electricity) plug
into the same shape.

The substrate ships:

- A `Quantity<U extends Unit>` value class with construction
  factories, same-unit math, comparison, cross-unit conversion
  (where defined), tag-table integration, JSON round-trip, and Mml
  emission via `<quantity>` markup.
- A `Unit` string-literal union — the v1 catalog of allowed units.
- A tag-table registry (`Quantity.registerTagTable`) consulted by
  `tag()` / `fromTag()` / `parse()`.
- A per-unit math op table (`add` / `scale`) so future non-arithmetic
  units (`dB` for sound) plug in without retrofitting callers.
- `QuantityMarshaller<U>` for round-tripping Quantity values through
  the persistence boundary.

Sibling docs:

- [light.md](./light.md) — first major consumer. Light's `intensity`
  is `Quantity<'lux'>`, `colorTemperature` is `Quantity<'K'>`,
  emitter / ambient APIs return Quantity values.
- [race.md](./race.md) — Material's `density` (`Quantity<'kg/m³'>`),
  `molarMass` (`Quantity<'g/mol'>`), and TangibleMixin's `mass`
  (`Quantity<'kg'>`).
- [persistence.md](./persistence.md) — Marshaller framework, the
  `QuantityMarshaller` story, and PropertiedMixin's
  `savedPropMarshallers` for per-prop binding.

## The cast

| Type | Kind | Role |
|---|---|---|
| `Quantity<U>` | value class | `value: number` + `unit: U`. Immutable. Same-unit math; cross-unit conversion via registered converters. |
| `Unit` | string-literal union | The full v1 unit catalog. New units extend the union. |
| `TagTableEntry` | `{ tag, threshold }` | A single row in a unit's tag table. |
| `QuantityUnitMismatchError` | error | Thrown by same-unit math when a runtime cast bypassed the compile-time guard. |
| `QuantityMarshaller<U>` | `Marshaller` subclass | Round-trips a Quantity field through the persistence boundary. One singleton per unit, registered at `pathFor(unit)`. |

## The Quantity API

```ts
class Quantity<U extends Unit> {
  // Inspection
  rawValue(): number
  format(): string                 // "5 kg", "320 lux"
  tag(): string                    // "medium" / "lit" — falls back to format() for tagless units
  toJSON(): { value, unit }
  toMml(viewer?): Mml              // <quantity>tag-text</quantity>
  formatMml(viewer?): Mml          // <quantity>5 kg</quantity>

  // Math (same-unit only; throws on mismatch)
  add(other): Quantity<U>
  subtract(other): Quantity<U>
  scale(factor: number): Quantity<U>

  // Comparison
  equals(other): boolean
  lessThan(other): boolean
  greaterThan(other): boolean

  // Cross-unit conversion — returns Quantity<Unit> (the target is runtime-parametric)
  to(targetUnit: Unit): Quantity<Unit>

  // Construction (private constructor; entry shapes below)
  static of<U>(value: number, unit: U): Quantity<U>
  static parse<U>(input: string | number, unit: U): Quantity<U>
  static fromTag<U>(tag: string, unit: U): Quantity<U>
  static fromJSON<U>(json: { value, unit }): Quantity<U>

  // Tag-table registration (channel Apis call this at module-load)
  static registerTagTable(unit: Unit, entries: ReadonlyArray<TagTableEntry>): void
}
```

### Construction shapes

`Quantity.of(value, unit)` is the canonical factory. The tolerant
shapes go through `parse`:

| `Quantity.parse(input, 'kg')` | Result |
|---|---|
| `'heavy'` | `Quantity.of(50, 'kg')` (KG_TAGS lookup) |
| `'5 kg'` | `Quantity.of(5, 'kg')` |
| `'12000 g'` | `Quantity.of(12, 'kg')` (g↔kg converter) |
| `'5'` or `5` | `Quantity.of(5, 'kg')` (bare-number → canonical-of-target) |

### Same-unit math

`add` / `subtract` / `scale` operate on the unit's registered op
table. v1 ships only arithmetic (numeric add and scalar multiply),
so mass + mass and lux + lux work as expected. `dB`'s logarithmic
addition is the one entry deferred until sound lands; a future
registration on `unitOps` will replace `add` for `'dB'` without
touching call sites.

```ts
Quantity.of(5, 'kg').add(Quantity.of(3, 'kg'));        // → 8 kg
Quantity.of(5, 'kg').add(Quantity.of(3, 'g') as any);  // → throws QuantityUnitMismatchError
Quantity.of(5, 'kg').scale(2);                         // → 10 kg
```

The mismatch error surfaces when a runtime cast bypasses TS's
compile-time guard. Code that types `Quantity<'kg'>` correctly
won't see it.

### Cross-unit conversion

`to(targetUnit)` consults the converter registry. Each pair is
declared explicitly in `lib/quantity.ts`. v1 registers `g ↔ kg` for
mass authoring; cross-family conversions throw.

The return type of `to` is `Quantity<Unit>` (not narrowed to the
target). Callers that need narrow typing should rely on host-level
typed accessors (e.g. `light.intensity` is statically
`Quantity<'lux'>`) rather than chaining through `to`.

## Tag tables

Each channel's Api owns its tag table — the data lives in TypeScript
near the channel, not centrally. The shape:

```ts
[
  { tag: 'feather', threshold: 0.001 },
  { tag: 'light',   threshold: 0.5 },
  { tag: 'medium',  threshold: 5 },
  { tag: 'heavy',   threshold: 50 },
  { tag: 'enormous',threshold: 500 },
]
```

Channel registers via `Quantity.registerTagTable(unit, table)` at
module-load. The lookup machinery is in `lib/quantity.ts`:

- `Quantity.tag()` walks the table descending; first threshold
  met-or-exceeded wins. Falls back to canonical format when no
  table is registered.
- `Quantity.fromTag(tag, unit)` linear-scans for the tag and returns
  its threshold as the canonical numeric value.
- Round-trip stability — every `{ tag, threshold }` row satisfies
  `fromTag(tag, unit).tag() === tag`. Tests pin this for every
  registered table.

### v1 registered tables

| Unit | Where registered | Tags |
|---|---|---|
| `'lux'` | `api/light.ts` | `pitch-black`/`very-dim`/`dim`/`lit`/`bright`/`blinding` (mirrors `LightBand`) |
| `'lumen'` | `api/light.ts` | `unlit`/`glow`/`lamp`/`bright`/`searchlight` |
| `'K'` | `api/light.ts` | `warm`/`neutral`/`cool`/`daylight`/`blue` |
| `'kg'` | `api/material.ts` | `feather`/`light`/`medium`/`heavy`/`enormous` |
| `'kg/m³'` | `api/material.ts` | `gas-like`/`water-like`/`rock-like`/`metal-like` |

`'g/mol'` deliberately has no tag table — molar mass doesn't have a
casual-prose vocabulary; `tag()` falls back to canonical format
(`"55.845 g/mol"`).

## Mml emission — `<quantity>` markup

`toMml()` and `formatMml()` produce `<quantity>` markup the client
will render with channel-coded styling, tooltips, alternate-flavor
toggles, etc. v1 ships only the server side; the client renderer is
the v1 punch-list "Markup language semantic tags + client renderer"
item.

**Markup shape:**

```
<quantity unit="<unit>" value="<numeric>" [tag="<tag>"]>inner-text</quantity>
```

| Attribute | Required | Description |
|---|---|---|
| `unit` | yes | Canonical unit string from the `Unit` type. The client routes per-channel rendering off this. |
| `value` | yes | Canonical numeric as a decimal string. The client uses this for any conversion / comparison work — never parse the inner text. |
| `tag` | optional | Friendly tag if a tag table is registered. Absent for tagless units. |

**Inner text:**

- `toMml()` emits the **tag** (or canonical for tagless units). The
  default for prose — `${quantity}` in `Mml.compose` calls this.
- `formatMml()` emits the **canonical format** (`"5 kg"`,
  `"320 lux"`). Used by instrument readouts and analyze output where
  the canonical number is the point.

**Examples:**

```ts
Mml.compose`mass: ${Quantity.of(5, 'kg')}`
// → mass: <quantity unit="kg" value="5" tag="medium">medium</quantity>

Mml.compose`mass: ${Quantity.of(5, 'kg').formatMml()}`
// → mass: <quantity unit="kg" value="5" tag="medium">5 kg</quantity>

Mml.compose`molar mass: ${Quantity.of(55.845, 'g/mol').formatMml()}`
// → molar mass: <quantity unit="g/mol" value="55.845">55.845 g/mol</quantity>
```

Markup-unaware clients strip `<quantity>` and render the inner text
verbatim — no garbled output, no leaked attributes.

**Viewer threading:** `toMml(viewer?)` carries an optional viewer
parameter for forward compatibility with a deferred per-recipient
pedagogical-seam setting. v1 ignores it; the seam is wired in
`Mml.compose`'s lazy evaluation and `Scene.send`'s per-recipient
body materialization (see [messaging.md](./messaging.md)).

### Liquid prose filters

`ProseApi` registers two filters for content-authored prose:

```liquid
{{ q | quantity }}            <!-- tag-flavored, default for prose -->
{{ q | quantity_canonical }}  <!-- canonical-flavored, for readouts -->
```

Same `<quantity>` output as the Mml-side helpers; choice of filter
controls inner text only.

## Persistence

Quantity values round-trip through the persistence boundary as
`{ value, unit }` JSON. Two adoption shapes:

### First-class fields — `static fieldMarshallers`

A class with a `Quantity<U>`-typed field declares the marshaller
binding next to its persistent fields:

```ts
class Material extends ... {
  private _density: Quantity<'kg/m³'> = Quantity.of(0, 'kg/m³');

  static persistentFields = [..., 'density', 'molarMass'];
  static fieldMarshallers = {
    density:   QuantityMarshaller.pathFor('kg/m³'),
    molarMass: QuantityMarshaller.pathFor('g/mol'),
  };

  // accessor pair; setter strict on Quantity
  protected get density(): Quantity<'kg/m³'> { return this._density; }
  protected set density(value: Quantity<'kg/m³'>) {
    if (!(value instanceof Quantity) || value.unit !== 'kg/m³') {
      throw new TypeError(...);
    }
    this._density = value;
  }

  public getDensity(): Quantity<'kg/m³'> { return this._density; }
  public setDensity(value: Quantity<'kg/m³'>): void { this.density = value; }
}
```

The marshaller absorbs authoring-shape coercion (numeric, tag
string, alt-unit literal, JSON `{value,unit}`) at the persistence
boundary; runtime setters stay strict on `Quantity<U>`. Authors who
hold a raw number wrap via `Quantity.of(n, unit)` at the call site.

### PropertiedMixin props — `initProp(prop, { marshaller })`

For props that hold rich value objects, declare the marshaller via
`initProp`:

```ts
const mass = Property.of<Quantity<'kg'>>("mass");
avatar.initProp(mass, {
  transient: false,
  marshaller: QuantityMarshaller.pathFor('kg'),
});
avatar.setProp(mass, Quantity.of(5, 'kg'));
avatar.getProp(mass);  // → Quantity.of(5, 'kg')
```

The binding persists in `savedPropMarshallers` alongside `savedProps`,
so reload-after-restart re-applies the same marshaller without
redeclaration. See [persistence.md § Marshalled props](./persistence.md).

### YAML authoring shapes

A field bound to a QuantityMarshaller accepts these shapes in seed
YAML, all coerced to the runtime Quantity at hydration:

```yaml
data:
  mass: heavy           # tag — KG_TAGS lookup → Quantity<kg>(50)
  mass: "5 kg"          # canonical literal
  mass: "12000 g"       # alt-unit literal — converts via g↔kg
  mass: 5               # bare numeric — canonical-of-target → 5 kg
  mass: { value: 12, unit: kg }   # explicit JSON (tooling-generated)
```

`Quantity.parse(input, targetUnit)` is the underlying handler;
authors typically use whichever shape is most readable.

### Marshaller seeds and bootstrap

Each unit has a one-line seed YAML in
`seeds/lib/persistence/QuantityMarshaller/<encoded>.yaml`. The
marshaller class itself is stateless modulo its target unit; the
seed declares the unit in `data:`.

Marshallers are **lazy-loaded** — `StuffApi.singleton(path)` clones
the marshaller from its seed on first need (no bootstrap manifest
entries required). Mirrors how `clone()` resolves `hydratorClass`.

In tests, marshallers don't have a Mongo to clone from; tests
register them in-memory via `installV1QuantityMarshallers()` from
`lib/persistence/__tests__/quantity-marshaller-test-helpers.ts` —
call it in `beforeEach` paired with `StuffApi.clearAll()` in
`afterEach` for any test that exercises marshaller-bound fields or
props.

## Path encoding for marshaller singletons

Composite units (`g/mol`, `kg/m³`, `mol/L`) carry characters that
make poor filesystem segments. The encoding maps `'/'` → `'-per-'`
and unicode `³` → `'3'`, giving the templatePaths:

| Unit | Marshaller path |
|---|---|
| `'kg'` | `/lib/persistence/QuantityMarshaller/kg` |
| `'g/mol'` | `/lib/persistence/QuantityMarshaller/g-per-mol` |
| `'kg/m³'` | `/lib/persistence/QuantityMarshaller/kg-per-m3` |
| `'lumen'` | `/lib/persistence/QuantityMarshaller/lumen` |
| `'lux'` | `/lib/persistence/QuantityMarshaller/lux` |
| `'K'` | `/lib/persistence/QuantityMarshaller/K` |

Use `QuantityMarshaller.pathFor(unit)` at every declaration site
rather than hardcoding the encoded form.

## Out of scope (v1)

- **Pedagogical-seam setting** — the per-viewer "show tag vs
  show canonical vs show raw number" toggle. `toMml(viewer?)`
  carries the parameter for forward compat; v1 ignores it.
- **Mixed-unit derivation** — `Quantity<m> / Quantity<s> →
  Quantity<m/s>`. v1 only does same-unit math; mixed-unit derivation
  arrives when consumers need it.
- **Composite units beyond what's used** — `mol/L`, `Pa`, `N`, `J`,
  `W` are declared in the `Unit` type for forward compat; only
  `kg/m³` and `g/mol` are actually consumed today.
- **Tag tables in YAML** — content-authorable tag tables are a
  future ask; v1 ships TS tables co-located with each channel's
  Api.
- **Locale-aware formatting** — `format()` always emits SI display
  (`"5 kg"`, never `"5 lb"`).
- **Instrument calibration / accuracy** — Photometers and Balances
  always report exact values. Per-instrument tolerance is a future
  axis.
- **Logarithmic dB math** — declared in the `Unit` type, no math op
  registered yet. Sound channel work registers it.

## Cross-references

- [light.md](./light.md) — first major Quantity consumer.
- [race.md § Material substrate](./race.md#material-substrate) —
  `density`, `molarMass`, `mass`.
- [persistence.md § Marshaller framework](./persistence.md#marshaller-framework)
  — Marshaller base class, `static fieldMarshallers`, lazy resolution.
- [messaging.md](./messaging.md) — `Mml.compose` lazy evaluation,
  `Scene.send` per-recipient body materialization (the substrate
  the viewer-threading rests on).
- [command-spec.md](./command-spec.md) — Option E (per-subcommand
  controllers), the `analyze` / `measure` verb pattern that
  consumes Quantity output.
