# Quantities — Requirements

Formal-requirements pass for the `Quantity<U>` substrate, distilled
from [docs/quantities-slate.md](./quantities-slate.md). Scope covers
**Wave 1** (substrate), **Wave 2** (light migration), and **Wave 4**
(material / chemistry adoption). Wave 3 (sound rollout) and the
pedagogical-seam setting are explicitly deferred.

This doc is the contract handed to the planning agent. Implementation
follows after the plan is reviewed.

---

## 1. Goals

1. Introduce a typed `Quantity<U>` value object so engine state carries
   real units (kg, lux, lumen, g/mol, kg/m³, …) instead of opaque
   scalars.
2. Migrate light's `intensity` / `emittedIntensity` and material's
   `molarMass` / `density` plus a new `Stuff.mass` to `Quantity<U>`.
3. Ship two instruments (`Photometer`, `Balance`) and the `analyze`
   verb dispatcher with `analyze light` and `analyze chemistry`
   sub-commands.
4. Land the `toMml(viewer)` rendering protocol so future per-viewer
   pedagogical concerns plug in without API churn — but ship with
   `viewer` ignored and a fixed default-rendering rule.

## 2. Non-goals

- **Pedagogical seam setting + four levels.** Deferred until content
  motivates it. `Quantity.toMml(viewer)` carries the viewer parameter
  for forward compatibility but does not consult any setting in v1.
- **Client-side `<quantity>` rendering.** The server emits the markup
  per §6.5; the client renderer (highlighting, tooltips, conversion
  ratios, aggregate panels) is the v1 punch list "Markup language
  semantic tags + client renderer" item, NOT this scope. Existing
  markup-unaware client code displays inner text correctly without
  changes.
- **Sound rollout** (Wave 3). Sound consumes this substrate; landing
  is a separate slate execution.
- **Mixed-unit derivation.** `Quantity<m> / Quantity<s> → Quantity<m/s>`
  is out. v1 supports same-unit math only; mismatched units throw.
- **Composite units beyond what Wave 4 forces.** `kg/m³` (density) and
  `g/mol` (molarMass) are in scope; `W/(m·K)`, `S/m`, `J/(kg·K)` are
  out — those wait for the heat / electrical channels.
- **Locale-aware formatting.** SI display only. No imperial fallback.
- **Instrument calibration / accuracy.** A `Balance` always reports
  exact mass. Per-instrument tolerance is a future axis.
- **Tag tables in YAML.** v1 ships TS tables co-located with each
  channel's Api. YAML migration is a future content-team ask.
- **Pedagogical content.** Curriculum mapping, study modes, etc. are
  out — this is substrate only.

## 3. Decisions reference

The slate listed ten open questions; resolutions:

| Q | Question | Decision |
|---|---|---|
| Q1 | Class with methods vs. plain object + helpers | **Class with methods.** `Quantity` is a class; `a.add(b)`, `a.tag()`, etc. |
| Q2 | Tag-table ownership | **Per-channel Api owns its tag table.** `LightApi` owns the lux table; `MaterialApi` owns the kg / kg/m³ / g/mol tables. |
| Q3 | Locale-aware formatting | **Defer.** SI display only in v1. |
| Q4 | Mixed-unit math | **Same-unit only in v1.** Cross-unit derivation deferred. |
| Q5 | Equality semantics | **Structural.** `a.equals(b)` checks value AND unit. |
| Q6 | `PedagogicalSeamLevel` granularity | **Deferred entirely.** No setting, no levels in v1. |
| Q7 | Instrument calibration | **Deferred.** Instruments are exact in v1. |
| Q8 | Persistence shape | **`{ value, unit }` JSON.** Self-describing; robust to future refactors. |
| Q9 | Tag-table format | **TS in v1.** YAML deferred. |
| Q10 | Numeric → Quantity universally? | **Only when there's a unit.** Dimensionless ratios (`opacity`, `flammability`, `magneticSusceptibility`, `hardness`, `pH`, `nutrient.calories-per-gram` if-any-future) stay plain `number`. |

Plus four decisions emerged from the code survey:

| # | Question | Decision |
|---|---|---|
| C1 | Viewer threading for tag-vs-canonical rendering | **`Quantity.toMml(viewer)` at the Mml serialization boundary.** Call sites stay `${quantity}`. The `renderValue` helper in `api/mml.ts` (and the prose equivalent) call `toMml(viewer)` instead of `toMml()`. v1 ignores `viewer`. |
| C2 | Pedagogical-seam home | **N/A.** Setting deferred; no host needed. When it returns, default home is `PerceiverMixin`. |
| C3 | LightBand tag reconciliation | **Keep existing 6-band `LightBand` vocabulary.** The lux tag table mirrors `pitch-black` / `very-dim` / `dim` / `lit` / `bright` / `blinding`; thresholds documented and tested. The slate's 5-tag list was illustrative. |
| C4 | Wave 4 Material composites | **`molarMass` (g/mol), `density` (kg/m³), new `Stuff.mass` (kg) only.** `thermalConductivity`, `electricalConductivity`, `magneticSusceptibility` stay scalar pending future channel work. |

---

## 4. The `Quantity<U>` API

### 4.1 Shape

```ts
// packages/server/src/mud/lib/quantity.ts

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
  // Sound (declared now, populated in Wave 3)
  | 'dB' | 'Hz'
  // Chemistry / material
  | 'mol' | 'g/mol' | 'mol/L' | 'kg/m³'
  // Pressure / force / energy / power (declared, used as channels arrive)
  | 'Pa' | 'N' | 'J' | 'W'
  ;

export class Quantity<U extends Unit> {
  readonly value: number;        // canonical SI / standard-unit numeric
  readonly unit: U;

  // Construction
  static of<U extends Unit>(value: number, unit: U): Quantity<U>;
  static fromTag<U extends Unit>(tag: string, unit: U): Quantity<U>;
  static parse<U extends Unit>(input: string, unit: U): Quantity<U>;
  //   parse() accepts a tag ("heavy"), a canonical literal ("12 kg"),
  //   or any-unit literal ("12000 g") and converts to the target unit.

  // Inspection
  rawValue(): number;
  format(): string;              // "5 kg", "320 lux", "55.845 g/mol"
  tag(): string;                 // "medium", "lit", or "55.845 g/mol" if no tag table
  to(targetUnit: Unit): Quantity<Unit>;   // unit conversion (where defined)

  // Comparison
  equals(other: Quantity<U>): boolean;
  lessThan(other: Quantity<U>): boolean;
  greaterThan(other: Quantity<U>): boolean;

  // Math (same-unit only; throws on mismatch)
  add(other: Quantity<U>): Quantity<U>;
  subtract(other: Quantity<U>): Quantity<U>;
  scale(factor: number): Quantity<U>;

  // Mml protocol — emits <quantity unit value tag>tag-text</quantity>.
  // Viewer ignored in v1; present for forward compat (per-viewer
  // inner text once the seam returns).
  toMml(viewer?: Stuff & Sensor): Mml;

  // Mml emission with canonical inner text — used by instruments and
  // analyze. Same wrapper, canonical text inside.
  formatMml(viewer?: Stuff & Sensor): Mml;

  // Persistence
  toJSON(): { value: number; unit: U };
  static fromJSON<U extends Unit>(json: { value: number; unit: U }): Quantity<U>;
}
```

### 4.2 Per-unit math — also no new module

v1 ships only arithmetic add/scale. Per-unit semantics live as
private helpers inside `Quantity.ts` (a small `unitOps` map keyed by
`Unit`). Logarithmic addition for `dB` is NOT in v1 — when sound
lands and the second op-shape arrives, we revisit whether the
internal map deserves promotion to a peer module. v1: zero new
modules for math.

```ts
// internal to Quantity.ts
interface UnitOps {
  add(a: number, b: number): number;
  scale(value: number, factor: number): number;
}
const unitOps: Partial<Record<Unit, UnitOps>> = {
  kg: { add: arithAdd, scale: arithScale },
  g:  { add: arithAdd, scale: arithScale },
  // … one entry per unit Quantity supports for math
};
```

### 4.3 Same-unit math contract

`a.add(b)` requires `a.unit === b.unit`. Throwing `QuantityUnitMismatchError`
on mismatch is the contract. No silent coercion.

`scale(factor)` is unitless multiplication; result preserves the unit.

### 4.4 Composite units

Composite units are first-class members of the `Unit` union, written as
the literal string used in display (`'kg/m³'`, `'g/mol'`, `'mol/L'`).
v1 does NOT mechanically derive `kg/m³` from `Quantity<kg>` and
`Quantity<m>` — composite units are declared statically. Authors and
engine code refer to them by name.

Conversion within a composite-unit family is documented if defined
(none required by Wave 4); cross-family is a runtime error.

### 4.5 Equality

`a.equals(b)` is `true` iff `a.unit === b.unit && a.value === b.value`
(strict). Floating-point comparison: yes, strict equality. An
`equalsApprox(other, epsilon)` helper is **out** of v1 — wait for a
real consumer that needs it before adding.

---

## 5. Tag tables

Per-channel tag tables live in TypeScript next to each channel's Api.
Each table is a sorted list of `{ tag, threshold }` entries; mapping
a numeric value to a tag returns the highest threshold the value
meets-or-exceeds. Mapping a tag to a value returns the threshold.

### 5.1 Round-trip stability

`fromTag(tag, unit).tag() === tag` for every entry in the table.
This is enforced by tests.

### 5.2 Initial tag tables (v1)

**Lux (light)** — owned by `LightApi`; mirrors existing `LightBand`:

```ts
// packages/server/src/mud/api/light.ts (table; LightBand stays)
const LUX_TAGS = [
  { tag: 'pitch-black', threshold: 0 },
  { tag: 'very-dim',    threshold: 0.1 },
  { tag: 'dim',         threshold: 1 },
  { tag: 'lit',         threshold: 50 },
  { tag: 'bright',      threshold: 1000 },
  { tag: 'blinding',    threshold: 10000 },
];
```

The exact thresholds align with the existing `BAND_THRESHOLDS` in
`Light.ts`; if the existing thresholds use a different scale (the
codebase uses "abstract lumens" today), the lux migration sets the
canonical lux values and the tests document the chosen mapping.

**Lumen (light emission)** — owned by `LightApi`:

```ts
const LUMEN_TAGS = [
  { tag: 'unlit',     threshold: 0 },
  { tag: 'glow',      threshold: 1 },      // candle-equivalent
  { tag: 'lamp',      threshold: 100 },    // small lamp
  { tag: 'bright',    threshold: 800 },    // standard bulb
  { tag: 'searchlight', threshold: 10000 },
];
```

(Author may tune; tests pin the chosen values.)

**Kilogram (mass)** — owned by `MaterialApi` (or a small `MassApi` if
`MaterialApi` resists; planning may pick):

```ts
const KG_TAGS = [
  { tag: 'feather',  threshold: 0.001 },
  { tag: 'light',    threshold: 0.5 },
  { tag: 'medium',   threshold: 5 },
  { tag: 'heavy',    threshold: 50 },
  { tag: 'enormous', threshold: 500 },
];
```

**Density (kg/m³)** — owned by `MaterialApi`. Tags are coarse since
density is rarely surfaced to players directly:

```ts
const DENSITY_TAGS = [
  { tag: 'gas-like',   threshold: 0 },
  { tag: 'water-like', threshold: 500 },
  { tag: 'rock-like',  threshold: 2000 },
  { tag: 'metal-like', threshold: 6000 },
];
```

**Molar mass (g/mol)** — no tag table. `Quantity<g/mol>.tag()`
returns the canonical format string (`"55.845 g/mol"`). Molar mass is
a chemistry concept that doesn't have a casual-prose vocabulary.

### 5.3 Tag table lookup — no new module

Tag-table machinery does NOT get its own file. The two pieces:

- **Tag-table data** — each channel's existing Api owns its tables as
  private constants:
    - `LightApi` adds `LUX_TAGS` and `LUMEN_TAGS`.
    - `MaterialApi` adds `KG_TAGS` and `DENSITY_TAGS`.
- **Tag-table operations** — `Quantity.ts` carries a private
  `tagTableRegistry: Map<Unit, ReadonlyArray<{tag, threshold}>>` and
  exports a single `Quantity.registerTagTable(unit, entries)` hook.
  Each channel's Api calls it at module-load time.

`Quantity.tag()` consults the registry by `this.unit`; units without
a registered table return the canonical format string. `Quantity.fromTag(tag, unit)`
does the same lookup in reverse.

The lookup itself (binary search for `tagFor`, linear scan for
`thresholdFor`) is private to `Quantity.ts`. No exported helper
module, no new pattern.

---

## 6. Mml integration

### 6.1 Protocol change

`renderValue()` in `api/mml.ts` and the `outputEscapeMmlAware` helper
in `api/prose.ts` are updated to pass `viewer?` when calling
`toMml()` on values that implement it:

```ts
function renderValue(value: unknown, viewer?: Stuff & Sensor): string {
  // …
  if (hasToMml(value)) {
    const fragment = (value as { toMml: (v?: unknown) => unknown }).toMml(viewer);
    // …
  }
}
```

The signature change is **additive**: existing `toMml()` implementations
that ignore the parameter continue to work. (TypeScript's structural
typing accepts a zero-arg function in a callable-with-arg shape.)

### 6.2 Threading viewer through scene composition

`Mml.compose` itself stays viewer-agnostic at construction time. The
viewer arrives at **serialization** — the point where an `Mml` tree
becomes wire bytes for one specific player.

Concretely: `Mml.toString(viewer?)` is added; the scene composer (and
any path that turns Mml into a wire string for a specific recipient)
calls `mml.toString(viewer)` and the per-value rendering happens
lazily at that moment.

Today's `Mml.toString()` returns a pre-rendered string built at
`compose` time. To support viewer-aware late binding, **`Mml.compose`
moves to lazy evaluation**: stores the template parts and value
list at compose time, renders on `toString(viewer?)`. Per-value
`toMml(viewer)` runs at serialization, not composition. Tests in v1
exercise the threading path even though `Quantity.toMml` ignores
`viewer`. Existing call sites that use `Mml.compose` continue to
work; the difference is invisible until something embeds a
viewer-sensitive value.

### 6.3 Default rendering rule (v1)

`Quantity.toMml(viewer)` ignores `viewer` and renders by **call-site
intent**. Three callsite shapes for three needs:

- **Prose, rich (default)**: `${quantity}` in `Mml.compose` →
  `quantity.toMml()` → emits `<quantity ...>tag-text</quantity>`.
  Tag inside a structured wrapper. The default; what almost every
  prose template uses.
- **Instrument / analyze, rich**: `${quantity.formatMml()}` →
  emits `<quantity ...>canonical-text</quantity>`. Same wrapper,
  canonical inside. Used by instrument controllers and `analyze`
  output where the canonical number is the point.
- **Plain string** (logs, debug, error messages): `quantity.tag()`
  or `quantity.format()` return raw strings with no markup. Used
  outside Mml composition.

In other words, prose embeds tag-flavored markup by default;
canonical-flavored markup is opt-in via `formatMml()`; plain
strings are the escape hatch. When the seam setting returns,
swapping default inner text based on viewer is a one-line change
inside `Quantity.toMml`. The client renderer doesn't care which
flavor the inner text came from — the attributes are the same.

### 6.4 Prose filters (Liquid)

`ProseApi` adds two filters:

- `{{ q | quantity }}` — same as bare `${q}` in Mml; emits
  tag-flavored `<quantity>` markup.
- `{{ q | quantity_canonical }}` — same as `${q.formatMml()}`;
  emits canonical-flavored `<quantity>` markup.

Author templates use the canonical filter inside instrument readouts
and analyze output authored as Liquid; the tag filter (or the bare
implicit dispatch) is fine in any prose context.

### 6.5 The `<quantity>` MML markup tag — contract

Server emits structured markup; client renders. This is the contract.

**Tag shape:**

```
<quantity unit="<unit-string>" value="<numeric>" [tag="<tag-string>"] [channel="<channel>"]>inner-text</quantity>
```

**Attributes:**

| Attr | Required | Description |
|---|---|---|
| `unit` | yes | The canonical unit string from the `Unit` type — `"kg"`, `"lux"`, `"g/mol"`, etc. The client routes per-channel rendering off this. |
| `value` | yes | The canonical numeric value as a decimal string. The client uses this for any conversion / comparison work, NEVER parsing inner text. |
| `tag` | optional | The friendly tag if a tag table is registered for the unit; absent for tagless units like `g/mol`. The client may surface this in tooltips even when inner text is canonical. |
| `channel` | optional | A coarse channel label (`"mass"`, `"light"`, `"sound"`, `"chemistry"`) for client-side per-channel styling. v1 may omit and let the client derive from `unit`; spec'd here for future direct control. Lean: omit in v1, add when the client wants explicit override. |

**Inner text:**

The inner text is what a markup-unaware client displays verbatim. A
tag-flavored emission puts the tag string ("medium", "lit", etc.) inside;
a canonical-flavored emission puts the canonical format ("5 kg",
"320 lux") inside. The client uses inner text as the fallback display
when no rich rendering is wanted.

**Escaping:**

`Quantity.toMml` and `formatMml` build the markup via
`Mml.fromMarkup` (the trusted-input path). Attribute values are
known-safe (numerics from internal state; tag strings from the
registered tag table). Inner text gets HTML-escaped for safety
even though tag and canonical strings are also derived from
trusted internal state — defense in depth.

**Examples:**

```
${Quantity.of(5, 'kg')}
  → <quantity unit="kg" value="5" tag="medium">medium</quantity>

${Quantity.of(5, 'kg').formatMml()}
  → <quantity unit="kg" value="5" tag="medium">5 kg</quantity>

${Quantity.of(55.845, 'g/mol').formatMml()}
  → <quantity unit="g/mol" value="55.845">55.845 g/mol</quantity>
  (no tag attr; tagless unit)

${Quantity.of(0, 'lux')}
  → <quantity unit="lux" value="0" tag="pitch-black">pitch-black</quantity>
```

**What the client may do (informative, non-binding):**

The client renderer is OUT OF SCOPE for this requirements doc — it's
the v1 punch list "Markup language semantic tags + client renderer"
item. But the markup contract is designed so the client team can
build, in any order:

- Channel-coded styling (mass / light / sound / chemistry tints).
- Hover tooltips with conversion ratios, "about as much as a …"
  comparisons, and the alternate flavor (tag ↔ canonical).
- Click-to-cycle inner-text mode.
- An aggregate side panel collecting all `<quantity>` instances
  in the current scene.
- A "show the math" affordance for derived quantities.
- Locale conversions (kg ↔ lb) without a server round-trip.

None of these client features are blocked by the substrate; the server
contract gives the client every datum it needs forever.

**Backward compatibility:**

Existing client code that doesn't know about `<quantity>` simply
strips unknown tags and renders the inner text — the same display
you'd get without the work. No client churn required to ship the
server side.

---

## 7. Persistence

### 7.1 Two storage shapes

**Decomposed (preferred for fixed-unit fields):** the host stores the
numeric value as a scalar field; the unit is implicit per-field.
Setter accepts `Quantity<U>`, stores `q.value`. Getter rebuilds
`Quantity.of(value, '<unit>')`. This is the existing pattern (e.g.
`AmbientLitMixin.ambientIntensity`) and keeps the persistence layer
boring.

**JSON-marshalled (for variable-unit or PropertiedMixin storage):**
`{ value, unit }` JSON shape via `Quantity.toJSON()` /
`Quantity.fromJSON()`. PropertiedMixin's `savedProps` map already
accepts JSON-shaped objects; a property declared as
`Property.of<Quantity<U>>('foo')` round-trips through JSON
transparently.

A `QuantityMarshaller extends Marshaller<Quantity<Unit>, { value, unit }>`
is provided for the few cases that need explicit field-level mapping
(none required in Wave 2 / Wave 4 if hosts adopt decomposition; the
marshaller exists for v2 consumers).

### 7.2 Hydration

PropertiedMixin's hydration path needs to recognize stored
`{ value, unit }` shapes for properties typed as `Quantity<U>` and
reconstruct via `Quantity.fromJSON`. Implementation: the property
key's type tag — TBD by planning, but the requirement is that
`avatar.getProp(massProp)` returns a `Quantity<kg>` instance after
hydration, not a plain object.

---

## 8. Authoring shape (YAML)

YAML literals accept three forms for any `Quantity<U>`:

```yaml
mass: heavy           # tag — looked up in kg tag table → 50 kg
mass: "12 kg"         # canonical — exactly 12 kg
mass: "12000 g"       # alternative unit — converted internally to 12 kg
mass: { value: 12, unit: kg }   # explicit JSON — for tooling-generated YAML
```

`Quantity.parse(input, targetUnit)` handles all three. Implemented
once; callable from any hydrator that wants to read a Quantity field.

Existing scalar fields (e.g. `density: 7874` in `iron.yaml`) continue
to parse: a bare number is treated as canonical-unit. So no YAML
breakage during migration.

---

## 9. Wave 2 — Light migration

### 9.1 Scope

- `Light.intensity: number` → `Quantity<lux>`.
- `LightSource.emittedIntensity: number` → `Quantity<lumen>`.
- Existing `LightBand` vocabulary preserved; lux tag table mirrors
  the band names.
- `Photometer` instrument Stuff template + controller.
- `analyze light here` verb (sub-command of `analyze`).

### 9.2 What stays the same

- `LightBand` enum (the six names) — unchanged in source and wire.
- `LightApi.bandAt`, `perceivedBand`, `canSee`, `lightAt` signatures —
  inputs unchanged; `lightAt` return type's `intensity` field is now
  `Quantity<lux>`.
- Per-viewer perception mechanics (vision profiles, modifiers) —
  unchanged.
- Existing prose ("the room is dim") — unchanged at the wire level
  (the band → tag mapping IS the existing band).

### 9.3 What changes

- `Light` value object's `intensity` field types as `Quantity<lux>`.
- `LightSource` decomposition stores `emittedIntensity: number`
  internally (existing field name + storage), exposed at the API
  surface as `getEmittedLight()` returning a `Light` whose intensity
  is `Quantity<lux>`. (Lumen→lux at the boundary is the existing
  walk; no propagation algorithm change.)
- `LightSource.setEmittedLight(light: Light)` accepts a `Light` whose
  intensity is `Quantity<lux>`; internal field stays scalar.
- Hydrator for `Light` and `LightSource` updated for the new typed
  shape (decomposed; no marshaller).
- Existing seed YAMLs continue to parse: `emittedIntensity: 100`
  becomes `Quantity<lumen>(100)` via canonical-unit interpretation.

### 9.4 Photometer

- New Stuff template at `/obj/instrument/Photometer` (or wherever the
  authoring tree lands; planner picks).
- Composes `Wieldable` (when embodiment slate ships) — for v1, just
  `Thing` is fine; the player carries it via existing inventory
  mechanics.
- Verb invocation: `measure light here`.
  - `measure` is the verb (single word, per the player-facing
    contract).
  - `light` is a subcommand with its own controller (Option E
    pattern, per §16.1). YAML at `mud/cmd/measure.yaml` declares
    `subcommands: { light: { controller: MeasureLightController, args: [...] } }`.
  - Controller `MeasureLightController` reads
    `LightApi.lightAt(actor.getLocation())` and renders canonical
    via `${quantity.formatMml()}` to emit
    `<quantity unit="lux" value="320">320 lux</quantity>`.
- The `measure` verb is positioned to grow `sound`, `temperature`,
  etc. subcommands later, each with its own controller — the
  Option E shape pays off here.

### 9.5 `analyze light here`

- Top-level `analyze` controller routes by second word; `light`
  sub-controller lives in `obj/command/AnalyzeLightController.ts`.
- Output renders: aggregate lux, source breakdown (existing
  `Light.sources` array), per-source contribution, viewer's vision
  profile thresholds.
- Output uses canonical units (calls `.format()` everywhere).

---

## 10. Wave 4 — Material / chemistry migration

### 10.1 Scope

- `chemistry.atomicMass: number` (existing scalar) renamed to
  `chemistry.molarMass` and retyped to `Quantity<g/mol>`. The
  rename matches scientific convention (atomic mass is technically
  dimensionless when measured in unified atomic mass units).
  Existing `iron.yaml`-style seeds need their key renamed:
  `atomicMass: 55.845` → `molarMass: 55.845` (bare number still
  hydrates as canonical g/mol).
- `Material.density: number` → `Quantity<kg/m³>`.
- **New mass on `TangibleMixin`** — `getMass(): Quantity<kg>` /
  `setMass(q: Quantity<kg>): void` method pair on the existing
  `TangibleMixin` (in `lib/race/`). Storage is decomposed: a
  scalar persistent field `_mass: number` (kg implicit), getter
  returns `Quantity.of(this._mass, 'kg')`. Same pattern as
  `LightSourceMixin.emittedIntensity`. **Not a `Property<T>`** —
  mass is structural to tangible things, belongs in the mixin's
  method-surface contract.
- `Balance` instrument Stuff template + controller.
- `analyze chemistry of <target>` verb (sub-command of `analyze`).

### 10.2 What stays scalar

- `Material.thermalConductivity` (W/(m·K)) — composite, future heat
  channel.
- `Material.electricalConductivity` (S/m) — composite, future
  electrical channel.
- `Material.magneticSusceptibility` — dimensionless ratio.
- `Material.hardness` — semi-dimensional (Mohs scale).
- `Material.flammability`, `Material.opacity` — dimensionless ratios.
- `chemistry.atomicNumber` — count, dimensionless.

### 10.3 What changes

- `Material.density` field type: `Quantity<kg/m³>`. YAML hydration:
  `density: 7874` continues to parse (bare number → canonical
  kg/m³).
- `chemistry.atomicMass` is renamed to `chemistry.molarMass` AND
  retyped from scalar to `Quantity<g/mol>`. Existing seed YAMLs
  edit the key name; bare-number values continue to parse as
  canonical g/mol.
- **`TangibleMixin` grows mass** — add `_mass: number` persistent
  scalar field, `getMass(): Quantity<kg>` / `setMass(q): void`
  methods. YAML authoring on a tangible Stuff seed accepts the
  three quantity literal forms (tag / canonical / alt-unit) at the
  `mass:` field; the hydrator converts to canonical kg before
  bracket-assigning `_mass`. Pattern matches existing decomposed
  Quantity fields (`emittedIntensity`); no `Property<T>` involved.

### 10.4 Balance (scale)

- New Stuff template at `/obj/instrument/Balance`.
- Composes `Wieldable` (or just `Thing` v1).
- Verb: `weigh <target>` — narrows `target` via `MixinApi.isTangible`,
  reads `target.getMass()`, renders canonical: `"5 kg"`.
- If `target` is not Tangible: validator on the verb rejects with
  copy like "you can only weigh tangible things" (handled at the
  YAML view's validator layer).

### 10.5 `analyze chemistry of <target>`

- Sub-controller for `analyze chemistry of <target>`.
- Validates target has a `Material` (via the existing tangible
  substrate). If not, fails the verb cleanly ("there is nothing to
  analyze on the cushion").
- Output: material name, molarMass (canonical), density (canonical),
  composition list, biological-source if any, tags.
- All numerics use `.format()`.

---

## 11. Instruments (general pattern)

Each instrument is one Stuff template + one controller. The controller
reads engine state via the relevant Api and renders canonical units.
No instrument-specific data structures or shadow channels — same
state the engine sees.

The two v1 instruments (`Photometer`, `Balance`) document the pattern
for future instruments (`Thermometer`, `Stethoscope`, `pH-meter`,
…), each landing with their respective channels.

Instruments compose `Wieldable` ONCE the embodiment slate ships
(`Wieldable` doesn't exist today). For v1, instruments are plain
`Thing` and held via existing carry mechanics. The authoring docs
note the future composition.

---

## 12. `analyze` verb dispatcher

**The behavior:** `analyze light here` produces the light analysis;
`analyze chemistry of <target>` produces the chemistry analysis.

**Implementation pattern (Option E from §16.1):**

- `mud/cmd/analyze.yaml` — one YAML view with `subcommands:` block
  (no top-level `controller:`).
- Subcommand `light`: declares `controller: AnalyzeLightController`
  and `args: [{ name: location, type: object, default: "$here" }]`.
- Subcommand `chemistry`: declares
  `controller: AnalyzeChemistryController` and
  `args: [{ name: target, type: object, required: true }]`.
- `obj/command/AnalyzeLightController.ts`,
  `obj/command/AnalyzeChemistryController.ts` — each a regular
  `CommandController` Stuff template, fully self-contained
  (validation, prose, tests).

The framework's matcher selects the per-subcommand controller via
the new `controller:` field on the subcommand block. Each
subcommand file is its own complete MVC unit; light propagation
logic and chemistry rendering never share a controller file.
- Permission: **none in v1**. `analyze` is pedagogical and openly
  available to any player. When per-zone authoring tier or
  pedagogy-mode gates land, the verb can adopt them; for now,
  unrestricted access matches the substrate's "students introspect
  the world to see the physics" stance.

---

## 13. Test gating / acceptance

Each acceptance criterion below has at least one Vitest test in the
corresponding `__tests__/` folder.

### 13.1 `Quantity` core

- `Quantity.of(5, 'kg').rawValue() === 5` and `.unit === 'kg'`.
- `Quantity.of(5, 'kg').format() === '5 kg'`.
- `Quantity.of(5, 'kg').tag() === 'medium'` (per kg tag table).
- `Quantity.fromTag('heavy', 'kg').rawValue() === 50`.
- Round-trip: every entry in every tag table satisfies
  `fromTag(tag, unit).tag() === tag`.
- `Quantity.of(5, 'kg').equals(Quantity.of(5, 'kg')) === true`.
- `Quantity.of(5, 'kg').equals(Quantity.of(5, 'g'))` — type error
  at compile time AND runtime guard if reached via `unknown` cast.
- `Quantity.of(5, 'kg').add(Quantity.of(3, 'kg'))` returns
  `Quantity<kg>(8)`.
- `Quantity.of(5, 'kg').add(Quantity.of(3, 'g' as 'kg'))` (cast-bypass)
  throws `QuantityUnitMismatchError`.
- `Quantity.of(5, 'kg').toJSON()` is `{ value: 5, unit: 'kg' }`;
  `Quantity.fromJSON({ value: 5, unit: 'kg' })` is structurally equal.
- `Quantity.parse('heavy', 'kg').rawValue() === 50`,
  `Quantity.parse('12 kg', 'kg').rawValue() === 12`,
  `Quantity.parse('12000 g', 'kg').rawValue() === 12`.

### 13.2 Mml protocol & `<quantity>` markup

- `Mml.compose\`mass is ${Quantity.of(5, 'kg')}\`.toString()` produces
  output containing `<quantity unit="kg" value="5" tag="medium">medium</quantity>`
  — with NO viewer threaded.
- Same composition with viewer threaded through `mml.toString(viewer)`
  produces the same output in v1 (viewer ignored), validating the
  threading path.
- `Mml.compose\`weight: ${q.formatMml()}\`.toString()` produces output
  containing `<quantity unit="kg" value="5" tag="medium">5 kg</quantity>`.
- `Mml.compose\`weight: ${q.format()}\`.toString()` produces output
  containing `5 kg` with NO `<quantity>` markup (plain-string path).
- `Quantity.of(55.845, 'g/mol').formatMml().toString()` omits the
  `tag` attribute (tagless unit).
- A tag string with HTML-special characters in some hypothetical
  future tag table would be escaped in inner text and attribute value.
- `ProseApi` filter `{{ q | quantity }}` renders tag-flavored markup.
- `ProseApi` filter `{{ q | quantity_canonical }}` renders
  canonical-flavored markup.
- A markup-stripping pass on the rendered string (simulating a
  markup-unaware client) yields the inner text as the displayed
  content — no garbled output, no leaked attributes.

### 13.3 Light migration

- `Light.intensity` is typed `Quantity<lux>` after migration.
- `LightSource.emittedIntensity` storage stays scalar; the public
  getter returns `Quantity<lumen>`.
- Existing seed YAMLs (any with `emittedIntensity: <number>`) hydrate
  cleanly without YAML edits.
- `LightBand` enum unchanged; existing band-derivation tests pass.
- `lightAt(loc).intensity.tag()` matches the band name from
  `bandAt(loc)` for at least one sample location at every band.
- `Photometer.measureCmd` returns prose containing canonical lux.
- `analyze light here` returns prose containing canonical lux for
  aggregate and each contributing source.

### 13.4 Material migration

- `Material.molarMass` (or renamed equivalent) typed
  `Quantity<g/mol>`; `iron.yaml` hydrates without edit (atomicMass
  number → Quantity).
- `Material.density` typed `Quantity<kg/m³>`; existing seeds hydrate.
- `TangibleMixin.getMass()` / `setMass()` round-trip through the
  mixin's persistent scalar field across save / hydrate.
- A YAML seed for a tangible Stuff with `mass: heavy` hydrates to
  `getMass()` returning `Quantity<kg>(50)`.
- A YAML seed with `mass: "5 kg"` hydrates to
  `getMass()` returning `Quantity<kg>(5)`.
- A YAML seed with `mass: 5000` (bare number; canonical interpretation
  is grams? or kg?) — planner picks the canonical interpretation
  rule for bare numbers and tests pin it. Recommended: bare number
  is the unit specified by the field's declared `Quantity<U>` type
  (so `mass: 5000` on a `Quantity<kg>` field is 5000 kg, not 5
  kg). Documents loud-and-clear in `tangible.md`.
- `Balance.weighCmd` on a Tangible Stuff returns canonical kg prose.
- `Balance.weighCmd` on a non-Tangible target is rejected by the
  verb's validator before the controller runs.
- `analyze chemistry of <Stuff>` with a `Material` returns prose
  containing molarMass and density in canonical units.

### 13.5 Persistence

- `JSON.stringify(Quantity.of(5, 'kg')) === '{"value":5,"unit":"kg"}'`.
- A Stuff with a `Quantity<kg>` property survives a save / load cycle
  via PropertiedMixin's hydrator, with `.equals()` true on the
  reconstructed quantity.

---

## 14. Build order (within this scope)

1. **`Quantity<U>` core + Unit catalog + per-unit math + tag-table
   API.** Pure module under `lib/quantity/`. No subsystem touched
   yet.
2. **Mml protocol extension** — `renderValue` accepts viewer;
   `Mml.toString(viewer?)`; prose filters. Mechanical change with
   tests.
3. **PropertiedMixin Quantity support** — JSON round-trip in the
   hydrator; `MassProperty` declaration ready.
4. **Wave 2: Light migration.** Light + LightSource + LightApi +
   hydrator updates. `Photometer` + `analyze light`.
5. **Wave 4: Material migration.** Material field types + hydrator.
   `Balance` + `analyze chemistry`. Stuff seeds for any standard
   item that should declare its mass.

Each step ships green before the next starts. Migration steps land
together with their consumers (no half-typed Light shipped without
its Photometer-and-analyze validation).

---

## 15. Out of scope (explicit reminders)

- Pedagogical seam setting + four levels.
- Sound rollout (Wave 3).
- Mixed-unit derivation (`m / s → m/s`).
- Composite units beyond `kg/m³`, `g/mol`, `mol/L` (Wave 4 doesn't
  use `mol/L` — declared in the Unit type, no consumer in v1).
- Tag tables in YAML.
- Locale-aware formatting.
- Instrument calibration / accuracy.
- `Wieldable` composition for instruments (depends on embodiment
  slate).
- Curriculum / pedagogy authoring tooling.

---

## 16. Resolved decisions log

Locked answers from the requirements review, recorded for the
planner / posterity:

1. **`atomicMass` → `molarMass`.** Renamed. Scientifically correct;
   existing seeds re-key.
2. **Kg tag table on `MaterialApi`.** No `MassApi`. Mass is a
   Material concern.
3. **`Mml.compose` is lazy.** Stores parts + values at compose
   time; renders at `toString(viewer?)`. Per-value `toMml(viewer)`
   runs at serialization.
4. **No `equalsApprox` in v1.** Wait for a real consumer.
5. **`analyze` has no permission gate in v1.** Open to all players;
   matches the pedagogical premise.
6. **Sub-controller dispatch — Option E: per-subcommand controller
   templates.** The existing YAML `subcommands:` block grows an
   optional `controller:` field per subcommand. When present, the
   framework clones that controller template instead of the
   verb's main controller. Verb stays single-word (first word is
   always the verb). Existing subcommanded verbs (`settings`,
   `alias`, `var`, `help`, `player`) unchanged. See §16.1 for the
   full reasoning and rejected alternatives.
7. **Seed traceability stays.** Existing seeds (`iron.yaml`, etc.)
   stay as canonical numerics; tag literals are an authoring
   affordance, not a mandate.

### 16.1 Sub-controller dispatch — open pattern question

The `analyze` verb dispatches by second word (`analyze light`,
`analyze chemistry`, future `analyze sound`, `analyze temperature`).
Future verbs follow the same shape (`measure light`, `measure sound`,
`measure spectrum`, …). This is a recurring shape, and Saxonberg
doesn't have a canonical pattern for it yet.

**The choice:** invent a new module pattern, or reduce to existing
patterns by treating each variant as its own first-class verb (the
locomotion-slate precedent: `walk`, `run`, `sneak` are separate
verbs that share an underlying activity, not `move walk` /
`move run`).

**Option A — Verb-as-domain (no new pattern).** Each variant becomes
its own top-level verb following the existing controller MVC pair
pattern. `analyze-light` and `analyze-chemistry` are two separate
verbs (or, more naturally, `inspect-light` / `inspect-chemistry` if
the hyphen feels wrong). Same for `measure`. Pros: zero new
machinery; full encapsulation; auto-discovery via existing pattern.
Cons: hyphenated verb names feel unnatural in the player UI; loses
the "analyze X" composability.

**Option B — Sub-MVC pattern (new module category).** A new pattern
where multi-word verbs have sub-controllers / sub-views in nested
directories:

```
mud/cmd/analyze.yaml           — parent verb declaration
mud/cmd/analyze/light.yaml     — sub-view for "analyze light"
mud/cmd/analyze/chemistry.yaml — sub-view for "analyze chemistry"
obj/command/AnalyzeController.ts            — parent controller
obj/command/analyze/AnalyzeLightController.ts
obj/command/analyze/AnalyzeChemistryController.ts
```

The framework discovers sub-views by directory walk at boot; parent
controller dispatches by matched sub-view. Each sub-command remains
fully encapsulated (own MVC pair, own validators, own tests). Pros:
natural language; encapsulated sub-modules; one pattern serves many
multi-word verbs. Cons: introduces a new module category and new
discovery mechanism in the command framework.

**Option C — Registry on a parent Api (the strawman).** What this
doc originally proposed: `AnalyzeApi.register('light', controller)`
called from each channel's bootstrap. Pros: minimal new machinery
(it's just an Api). Cons: centralizes the dispatch in the parent;
sub-controllers aren't visually self-contained; introduces an
asymmetric shape (parent controller routes; child controllers
execute) inconsistent with the cloned-Stuff-per-execution model.

**Option D — Multi-word verb names (REJECTED).** Considered and
rejected: violates the player-facing contract that the first
input word is always the verb. Even with quoted-verb syntax
(`"analyze light" args`) the imposition isn't worth it.

**Option E — Per-subcommand controller templates (selected).**

Saxonberg's framework already has subcommands as a first-class
concept: `cmd/settings.yaml`, `cmd/alias.yaml`, `cmd/var.yaml`, and
`cmd/player.yaml` all use a `subcommands:` block, the matcher
stamps `model.subcommand`, and a single controller switches on
that field. The existing pattern works fine for tightly-coupled
subcommands (settings list/get/set/unset are variations of one
concept); the gap is encapsulation when subcommand domains
diverge significantly (light propagation vs. chemistry are not
the same domain and shouldn't share a controller file).

**The extension:** the YAML `subcommands:` block grows an optional
`controller:` field per subcommand. When present, the framework
clones THAT controller template instead of the verb's main
controller. When absent, current behavior: clone the verb's main
controller, stamp `model.subcommand`.

```yaml
verbs: [analyze]
description: "Investigate something in detail"
subcommands:
  light:
    description: "Analyze light at your location"
    controller: AnalyzeLightController   # NEW per-subcommand
    args:
      - name: location
        type: object
        required: false
        default: "$here"
  chemistry:
    description: "Analyze chemistry of a target"
    controller: AnalyzeChemistryController
    args:
      - name: target
        type: object
        required: true
```

**Why this fits the constraints:**

- First word is always the verb (`analyze`). ✓
- ONE `CommandController` template cloned per execution; the
  framework picks per-subcommand vs. per-verb based on the YAML.
  ✓ (Consistent shape preserved.)
- Each subcommand can live in its own module
  (`AnalyzeLightController.ts`, `AnalyzeChemistryController.ts`).
  ✓
- Existing subcommanded verbs unchanged. `settings`, `alias`,
  `var`, `help`, `player` don't declare per-subcommand
  `controller:` and keep dispatching to one main controller. ✓

**Framework change required:**

- The YAML schema for subcommand blocks grows an optional
  `controller:` field. Defaults to inheriting the verb-level
  controller.
- The matcher's "select controller to clone" step grows one
  conditional: if `model.subcommand` resolves to a subcommand
  block with a `controller:` field, clone that template; else
  use the verb-level controller (existing behavior).
- A verb whose subcommands ALL declare their own `controller:`
  could omit the verb-level `controller:` entirely (no main
  controller). For `analyze`, that's the case — no meaningful
  bare-`analyze` behavior. For `settings` etc., the verb-level
  controller stays.
- Per
  [docs/subsystems/command-spec.md](./subsystems/command-spec.md):
  the existing rule "verbs declare either `args:` or
  `subcommands:`, never both" stays. The new rule:
  "subcommands optionally declare their own `controller:`, which
  overrides the verb-level controller for that subcommand."

**File layout for `analyze`:**

- `mud/cmd/analyze.yaml` — single YAML view with `subcommands:`
  block, no top-level `controller:`.
- `obj/command/AnalyzeLightController.ts` — templatePath
  `/cmd/analyze/light` (or whichever path convention the planner
  picks; a sub-directory under `obj/command/analyze/` is fine).
- `obj/command/AnalyzeChemistryController.ts` — same shape.

For `measure` (Photometer's verb): single-subcommand verb today
(`measure light` only); same pattern. When sound lands, a
`measure sound` subcommand drops in alongside.

**Edge cases:**

- Bare `analyze` (no subcommand): the matcher behavior per
  command-spec.md — `model.subcommand === undefined`, controller
  decides. With no verb-level controller declared, the matcher
  needs an "unknown subcommand" fallback. Planner picks the
  exact failure path; recommend a generic
  "subcommand required: try `analyze light` or `analyze
  chemistry`" message.
- Both verb-level and per-subcommand controller declared:
  per-subcommand wins for that subcommand; verb-level is the
  fallback for unmatched / undeclared subcommand names. (Useful
  when a verb has a default behavior plus per-subcommand
  overrides.)
- Discovery / help: existing subcommand machinery already
  surfaces subcommand names through schema delivery; nothing new.

**No new module category.** Option E is a small declarative
extension to the existing YAML view + controller MVC pattern.
Each subcommand file is a regular `CommandController` template.
Directories under `obj/command/` group related sub-controllers
visually; they're not structural to the framework.

**Effect on the requirements:**

§9 (`Photometer`) verb is `measure light` — `measure` verb with a
`light` subcommand declaring its own `MeasureLightController`. §10
(`Balance`) verb stays `weigh <target>` (single-word, no
subcommands). §12's `analyze` is one verb (`analyze`) with two
declared subcommands, each with its own controller template.
Updating §12 to reflect Option E.

---

## 17. Files touched (estimate)

For planning sizing. New files:

- `lib/quantity.ts` — class + `Unit` type + private op map +
  private tag-table registry. **Single file for the substrate; no
  peer modules.** Lives at the root of `lib/` mirroring `lib/mixin.ts`
  (per CLAUDE.md: "Shared mixin infrastructure … lives in
  `lib/mixin.ts`").
- `lib/__tests__/quantity.test.ts`
- `obj/instrument/Photometer.ts`
- `obj/instrument/Balance.ts`
- `obj/command/AnalyzeLightController.ts` (or under
  `obj/command/analyze/`; per-subcommand controllers can live in a
  sub-directory by convention without that being a new module
  category)
- `obj/command/AnalyzeChemistryController.ts`
- `obj/command/MeasureLightController.ts`
- `mud/cmd/analyze.yaml` (subcommands block: `light`, `chemistry`,
  each with its own `controller:` field — Option E)
- `mud/cmd/measure.yaml` (subcommands block: `light` with
  `MeasureLightController`)
- `mud/cmd/weigh.yaml` (Balance's verb; single-word, no
  subcommands)
- Seeds: `seeds/obj/instrument/photometer.yaml`,
  `seeds/obj/instrument/balance.yaml`

**Explicitly NOT created** (collapsed onto existing patterns):

- ~~`lib/quantity/Unit.ts`~~ — type alias inside `lib/quantity.ts`.
- ~~`lib/quantity/UnitMath.ts`~~ — internal map inside `lib/quantity.ts`.
- ~~`lib/quantity/TagTable.ts`~~ — registry inside `lib/quantity.ts`;
  table data lives in the channel Apis as private constants.
- ~~`api/analyze.ts`~~ — no `AnalyzeApi` needed. Per Option E
  (§16.1) the `analyze` verb's YAML directly references each
  subcommand's controller; no central registry layer.
- ~~`obj/command/AnalyzeController.ts`~~ — no parent `analyze`
  controller. Each subcommand's controller is independently
  registered in the YAML.
- ~~`lib/persistence/QuantityMarshaller.ts`~~ — Marshaller is the
  escape hatch for variable-shape persistence; Wave 2 / Wave 4 use
  the existing scalar-decomposition pattern OR the JSON
  `{value, unit}` shape that PropertiedMixin's existing object
  support already accepts. If a marshaller is genuinely needed, it
  ships under the existing `lib/persistence/` pattern (which is the
  established home, per `Marshaller.ts`).

Modified files (representative — planner expands):

- `api/light.ts` — lux/lumen tag tables, types
- `api/mml.ts` — `renderValue` viewer parameter, `Mml.toString`
- `api/prose.ts` — quantity filters, `outputEscapeMmlAware` viewer
- `lib/perception/Light.ts` — intensity field type
- `lib/perception/LightSource.ts` — getter/setter types
- `lib/perception/AmbientLitMixin.ts` — propagation point
- `lib/material/Material.ts` — molarMass / density types
- `lib/material/MaterialApi.ts` — kg tag table, density tag table,
  molarMass formatter
- `lib/race/Tangible.ts` — adds `_mass` field, `getMass`/`setMass`
  methods, mass hydration; the YAML hydrator parses tag/canonical/
  alt-unit forms before bracket-assigning.
- Seeds with `emittedIntensity` or `density` or `atomicMass` — verify
  hydration; no edits required if scalar-as-canonical works.
- Seeds for any standard tangible Stuff that should declare a mass
  (handful of items; planner enumerates as part of fixture work).

End of requirements.
