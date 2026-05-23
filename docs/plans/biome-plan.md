# Biome — implementation plan

Self-contained spec for a fresh-context build agent. Read this plan plus the cross-referenced subsystem docs and execute without seeing the requirements-phase conversation.

**Source-of-truth requirements:** `/home/bobalu/play/saxonberg/docs/requirements/biome-requirements.md`. Read it first — 15 surface decisions are locked there and not relitigated below.

**Lifetime:** This plan retires at sweep. The 39-leaf biome roster (Wave 7) is the bulk of content authoring; everything else is substrate.

---

## Cross-references the build composes against

| Doc | What this build consumes from it |
|---|---|
| `/home/bobalu/play/saxonberg/docs/subsystems/quantities.md` | `Quantity<U>` + `QuantityMarshaller` integration. Build adds K/Pa/%/m/s² to Unit union + tag tables. m³ and m already in union; stay tagless. kg/m³ already tagged. |
| `/home/bobalu/play/saxonberg/docs/subsystems/spatial.md` | `Location` ← `CartesianLocation` / `SphericalLocation` hierarchy. `CartesianZone.cellSize` semantic shift (Wave 3, see Risk R1). |
| `/home/bobalu/play/saxonberg/docs/subsystems/zone.md` | `Zone.lookupField` for chain step 5. No changes to Zone needed. `Biome extends Zone` parallels `Clade` (per P11). |
| `/home/bobalu/play/saxonberg/docs/subsystems/race.md` (race.md:128-145) | Material's prefix-walk pattern — exact shape `AtmosphericMixin`'s per-detail Maps mirror. |
| `/home/bobalu/play/saxonberg/docs/subsystems/light.md` | `LightApi` prior art for chain-walk Api shape. No changes to light. |
| `/home/bobalu/play/saxonberg/docs/subsystems/shell-environment.md` | Referenced *only* to confirm scope: settings keyspace is for player preferences. The five universe-default atmospheric values are NOT settings — they live on the root biome at `/lib/biome/` (per P16). No `EnvironmentMixin` / `resolveSetting` involvement. |
| `/home/bobalu/play/saxonberg/docs/ref-shapes.md` | Pattern A for `_biomePath` on AtmosphericMixin. |
| `/home/bobalu/play/saxonberg/docs/architecture.md` | `lib/<subsystem>/` placement; `api/<feature>.ts` placement; orchestration-vs-step split. |
| `/home/bobalu/play/saxonberg/docs/antipatterns.md` | Reference for "go through the Api" rules; gains a new entry in Wave 8. |

**Prior-art files worth re-reading at build time:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/material/Material.ts` — declared-fields + Quantity marshaller wiring + accessor-with-runtime-check pattern.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/material/Tangible.ts` — prefix-walk on a Map (Tangible uses `Record`, Atmospheric will use `Map` per requirements).
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/material/Radioactive.ts` + `RadioactiveMaterial.ts` — capability mixin + concrete subclass shape that `SkyExposed` + `SkyExposedBiome` mirrors.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/species/Clade.ts` — non-spatial Zone subclass carrying data AND hosting children. `Biome extends Zone` follows this exact pattern (per P11). No separate `Biorealm` class — root is just another Biome (per P16).
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/stuff/Location.ts` / `Vessel.ts` — base composition lines where `AtmosphericMixin` slots in.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/light.ts` — `lightAt` chain-walk shape for `BiomeApi.resolve*For`.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/material.ts` — slim Api class with `materialOf` cross-Stuff dispatch helper.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/mixin.ts` — predicate registration pattern.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/mixin.ts` — `Mixins` registry constants (Wave 2 adds two entries).
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/instrument/Photometer.ts` / `Balance.ts` + their `cmd/measure.yaml` / `cmd/weigh.yaml` and `obj/command/MeasureLightController.ts` / `AnalyzeLightController.ts` — exact instrument + verb pattern.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/quantity.ts` — Unit union expansion site (add `%`, `m/s²`).
- `/home/bobalu/play/saxonberg/packages/server/src/mud/config/quantity-tags.yaml` — tag-table YAML extension site.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/persistence/QuantityMarshaller.ts` — `encodeUnit` already handles `²` → `2` and `³` → `3` (good — `m/s²` → `m-per-s2`).
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/Avatar.ts:67` — Avatar's `analyze.yaml` is already on the self bucket; this build adds a subcommand to it (not a new top-level verb).

---

## Plan-time architectural decisions (not in requirements)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| **P1** | Tag-table breakpoints for **K (thermal)** | freezing 0, cold 263, cool 283, warm 293, hot 305, scorching 320 | 0 K floor; 263 ≈ -10°C; 283 ≈ 10°C (cold but liquid); 293 ≈ 20°C (room); 305 ≈ 32°C; 320 ≈ 47°C (very hot). Scale name `thermal` (parallel to existing `color` scale on K — same unit, second vocabulary, registered via second YAML key under `K:`). |
| **P2** | Tag-table breakpoints for **Pa** | vacuum 0, low 50000, normal 95000, high 110000, crushing 500000 | Vacuum ≤ 50 kPa (high-altitude / partial vacuum), normal ~atm 95-110 kPa, crushing ≥ 5 atm. Scale `default`. |
| **P3** | Tag-table breakpoints for **%** | dry 0, comfortable 30, humid 70, saturated 95 | Dry < 30%, comfortable 30-70%, humid 70-95%, saturated ≥ 95%. Scale `default`. |
| **P4** | Tag-table breakpoints for **m/s²** | microgravity 0, low 1.0, normal 7, heavy 12, crushing 25 | Microgravity ≤ 1, low (lunar-ish) 1-7, normal Earth ~9.81, heavy 12-25, crushing > 25. Scale `default`. |
| **P5** | Where does biome's **template-ancestry walk** live? | New private helper `#resolveBiomeDefault<U>(biome, getter)` inside `BiomeApi` walks the biome's `getTemplatePath()` ancestry via `StuffApi.singleton(ancestorPath)` and the same `getter` on each. NOT a method on `Biome.lookupDefault`. | Chain orchestration belongs on the Api per architecture.md "Orchestration lives one layer up from raw steps." Biome itself stays a pure data class. Mirrors `BiomeApi.resolveXFor`'s outer orchestration. |
| **P6** | `analyze atmosphere` **provenance trace shape** | Typed object (not Note kind) constructed in `BiomeApi.traceResolveXFor`, declared as `AtmosphericTrace` interface in `api/biome.ts`. Per-field entry: `{ value, source: 'detail'\|'detail-prefix'\|'room'\|'biome'\|'biome-ancestor'\|'zone'\|'universe', sourcePath: string\|null, ancestorChain: string[] }`. Controller renders one Mml line per field consuming the typed object; no Note emission for the trace itself. | Note kinds are for envelope outcomes (success/refusal); the trace is the verb's primary output, rendered as scene prose. Typed interface keeps the controller's render loop clean and tests of the resolver can assert provenance fields directly. |
| **P7** | `Altimeter` handling of non-standard universe pressure | Reads `BiomeApi.getRootBiome().getDefaultPressure()` once at execute time as sea-level reference (root biome cached at boot via `#rootBiome` private cache; invalidated on biome HMR). Computes `(localPressure − seaLevelP) / (ρ·g)` where ρ comes from `BiomeApi.densityOf(actor.atmosphereTag)` and g from `BiomeApi.resolveGravityFor(actor.getContainer())`. If ρ is 0 (vacuum), refuse with controller-rejected note `'no-medium-for-altitude'`. | Mathematically honest in vacuum (no medium → no barometric altitude). Non-standard universe pressures naturally yield 0 altitude when local matches universe — correct behavior. Reads the root biome's authored value; not a separate const. |
| **P8** | `MixinApi.isAtmospheric` placement | Added to `api/mixin.ts` alongside the other ~50 predicates; needs new type import `import type { Atmospheric } from '../lib/biome/Atmospheric'`. Also `isSkyExposed`. | Mirrors the existing pattern at `api/mixin.ts:341-540`. Registry plumbing: add `Atmospheric: 'AtmosphericMixin'` and `SkyExposed: 'SkyExposedMixin'` constants to `Mixins` in `lib/mixin.ts:21-76`. |
| **P9** | Chain walk shape — recursion vs loop | Iterative `while (current !== null)` loop over containment ancestors. The biome-ancestry sub-walk inside step `d` is also iterative (no recursion). | Recursion bound depth (containment chains) is small but unbounded by content; iterative form is easier to reason about, easier to add a depth guard to (cap at 32 per scope safety), and matches the LightApi propagation walk's shape. |
| **P10** | Biome seed file layout | One root seed at `seeds/lib/biome.yaml` (the universe Biome carrying all five defaults). Per-tier Biome seeds at `seeds/lib/biome/outdoor.yaml`, `outdoor/temperate.yaml`, `indoor.yaml`, `indoor/academic.yaml`, etc. Leaves under `seeds/lib/biome/outdoor/temperate/quad.yaml`. Every path is `class: /lib/biome/Biome` (or `SkyExposedBiome`). No Biorealm anywhere. | Matches `seeds/lib/species/animalia.yaml` precedent (single Clade class carrying data at every path, no separate folder class). Per P11 + P16. |
| **P11** | Biome hierarchy shape — folder/leaf invariant for biomes? | **No.** `Biome extends Zone` (not `Idea`). The folder/leaf invariant applies to `SpatialZone` (prevents nested coordinate systems) but does NOT apply to taxonomic Zone subclasses. Each tier IS itself a `Biome` template carrying that tier's defaults; leaves are also `Biome` templates with sparse overrides. Chain step 4 walks pure templatePath ancestors — each is a Biome whose defaults the walker queries. No `_defaults` siblings; no YAML `extends:` ceremony. **No `Biorealm` class** — root is also a Biome (the universe biome, per P16). | **Precedent:** `Clade extends Zone` carries data (`name`, `rank`) AND has children (sub-clades + species leaves). Biomes follow the same pattern, except Biome plays both folder-and-leaf roles (no separate leaf class). Inheritance lives entirely in the chain-walk step 4 — one mechanism, not the two (chain + YAML compile-time merge) the `_defaults`-sibling approach required. Runtime safety: Biome being a Zone doesn't affect runtime containment (`someStuff.getZone()` returns the runtime SpatialZone, never a biome). The Zone-subclass-ness only affects template-tree resolution. |
| **P16** | Universe defaults — where do they live? | On the **root biome** at `/lib/biome/`. The seed YAML sets all five `_defaultX` fields. Chain step 6 walks up to the root biome and returns its defaults; throws if root biome is missing or a field is null. No `BiomeApi.UNIVERSE_DEFAULTS` const map; no separate "engine constants" surface. `BiomeApi.getRootBiome()` returns the cached root for hot-path uses (Altimeter, debug tooling). | One inheritance mechanism (the chain walk) instead of two (chain + const). Root biome IS the universe biome — it carries the universal defaults the way a Clade root carries kingdom-level taxonomy. Non-Earth-universe authoring: edit the root biome seed directly. Defensive throw makes the boot-time invariant explicit; a separate `roster.test.ts` check asserts the root biome has all five fields set. |
| **P12** | Hot-reload behavior for the const density map | Density map is a `const` in `api/biome.ts`. No HMR seam — editing the map requires server restart. Documented in `docs/subsystems/biome.md`. Promotion to an `Atmosphere extends Idea` templated singleton (per requirements decision 4 escape hatch) would gain HMR for free. | v1 has 3 entries; HMR cost not worth it. The dev-time edit is rare. |
| **P13** | What to do on a `setAtmosphere('foo')` for an unregistered tag | Setter accepts any string silently (per requirements decision 10 "silent no-effect" symmetry). `BiomeApi.densityOf('foo')` is the validation seam — throws on unknown tag. Reads of the atmosphere field return the string unchanged; density-dependent consumers (`Altimeter`) surface the error. | Mirrors Tangible's intentional decoupling of detail-key validation. |
| **P14** | Vessel-scope atmospherics on `Avatar` | `Avatar.getContainer()` returns the immediate container (room or vessel). The chain walks outward from there. Vessels inside Locations inside Zones is the standard nesting. No special-cases on Avatar; the existing `getContainer()` is all the verb needs. | Per requirements constraint "Instrument scope handling." |
| **P15** | Should `BiomeApi` add `findByPathOrThrow` / `allBiomes`? | NO. Per requirements decision (in the BiomeApi acceptance criterion). Add when a consumer needs them. | Strict scope discipline. |

---

## Plan-time risks to flag before build

**R1 — CRITICAL: `CartesianZone.cellSize` semantic shift is a breaking change for the light substrate.**
- Current code: `cellSize: number = 1.0` interpreted as **m²** (area). `CartesianLocation.getSizeScale()` returns it directly, used by `LightApi.lightAt` as the receiving-surface area divisor.
- Requirements: change to **meters** (linear), default `3.0`, with `getVolume()` returning `cellSize³` (27 m³ for a 3m cube room) and `getCeilingHeight()` returning `cellSize` (3 m).
- For light to remain calibrated, `CartesianLocation.getSizeScale()` must change from `return this.getZone()?.getCellSize() ?? 1.0` to `return (this.getZone()?.getCellSize() ?? 1.0) ** 2`.
- Impact on existing light tag-table thresholds: a 3m cube room has 9 m² floor area vs prior default 1 m². For a single 100 lumen lamp the room reads 100/9 ≈ 11 lux instead of 100 lux. This will shift LightBand renderings in tests that pin the band directly.
- **Required mitigations during build:**
  - Update `CartesianLocation.getSizeScale()` (`lib/spatial/CartesianLocation.ts:130-131`) to square the cellSize.
  - Update doc comments on `CartesianZone.cellSize` (the JSDoc currently says "in m², NOT squared") and on `CartesianLocation.getSizeScale()` (currently says "scale is the owning zone's cellSize (already in m²)").
  - Sweep `LightApi.lightAt` / `AmbientLit` / `Light` value-object JSDoc that says "m² already" to say "derived from cellSize linear meters via square."
  - Audit light tests; expect to re-pin a few LightBand expectations against the new 27 m³ room scale (or seed the test rooms with `cellSize: 1.0` for calibration parity by passing 1m linear).
  - Update `docs/subsystems/spatial.md` cellSize section AND `docs/subsystems/light.md` for the new convention.
- **Surfacing-the-decision to the user is recommended before the build runs Wave 3.** This is the riskiest piece of the build because it touches an already-shipping subsystem.

**R2 — Atmospheric chain walk recursion depth.**
- Containment ancestry can in principle nest arbitrarily (vessel-in-vessel-in-vessel). Cap the iteration at 32 hops per resolve call; if exceeded, log a warning via `MudlogApi` and fall through to zone/universe. Matches the conveyance-ripple depth-16 cap pattern (`docs/subsystems/conveyance.md`). 32 is generous; real content shouldn't approach it.

**R3 — Hot-reload behavior of biome templates.**
- Per requirements decision 7 (no chain-walk caching) and decision 3 (Biome does NOT compose Singleton), hot-reloading a biome template means: live Locations holding `_biomePath` strings resolve to the freshly-cloned Biome on next read via `StuffApi.findByTemplatePath`. No stale instance is held. **Caveat:** since `Biome` does NOT compose Singleton, `findByTemplatePath` may return *any* of multiple clones if a content author hand-clones (unusual but legal). For v1 author discipline that's fine; flag for revisit if proceduralism actually materializes.

**R4 — `Location` base composition rebase impact on downstream content.**
- Adding `AtmosphericMixin` to `Location`'s base composition (`lib/stuff/Location.ts:28`) means every concrete subclass picks up 11 new persistent fields (`_biomePath` + 5 room-scope + 5 per-detail Maps). Existing seeded Locations without these fields hydrate cleanly because Hydrator skips absent fields and defaults take over (per established pattern; `Material._molarMass` is the precedent).
- Same for `Vessel` base composition (`lib/stuff/Vessel.ts:37-39`).
- **Audit at build time:** grep all `Stuff.persistentFields` lists in seeds for collisions with the new field names (`_biomePath`, `_temperature`, etc.) — should be none, but worth a one-line check.

**R5 — `setTemperature(value, detailKey)` strict-type guard parity.**
- Material.ts:125-131 throws TypeError on wrong-unit Quantity. Mirror this in AtmosphericMixin for each Quantity-typed setter — per requirements constraint "Per-field invariants belong on setters, not on save." Six setters, each with a guard. Write a small helper inside the mixin (`#assertQuantity<U>(value, expectedUnit, fieldName): void`) to keep the guard DRY across the five Quantity fields.

**R6 — Pre-existing Stuff branches and the Detail-Map field type.**
- Tangible uses `Record<string, string>` for `_detailMaterialPaths` (per Tangible.ts:141 — "Stored as a plain `Record`... so default JSON serialization handles it without a marshaller"). Per requirements, AtmosphericMixin uses `Map<string, Quantity<U>>` for the four Quantity-typed detail maps. This requires marshallers per detail map (5 entries — one per atmospheric field), because Map<string, Quantity> doesn't round-trip natively.
- **Plan choice:** Use a custom per-field marshaller pattern by binding `static fieldMarshallers = { _detailTemperatures: '<path-for-detail-temperature-map-marshaller>', ... }` OR collapse Maps to plain `Record<string, {value, unit}>` and forgo a marshaller (Quantity static factories `fromJSON` make the hydration cheap).
- **Recommended build approach:** drop the Map for `Record<string, Quantity<U>>` on the runtime API and let standard JSON handle the round-trip. The setter wraps numbers/Quantity to validated Quantity on write, but the storage is plain object. This **deviates from requirements wording** ("Map per field") in the interest of avoiding 5 new marshaller classes; verify with the user during plan review. If Map is mandatory: build new marshaller class `QuantityMapMarshaller<U>` parameterized by unit, seeded at `/lib/persistence/QuantityMapMarshaller/<encoded-unit>`. (Atmosphere detail map can stay as plain `Record<string, string>` either way; it's just a string→string map.)
- **Default for the plan:** Record<string, Quantity<U>> + no map-marshaller. Document the choice in `docs/subsystems/biome.md`. Slightly weakens the "matches Material's shape" claim from requirements; the prefix-walk semantics are identical so the substantive parallel holds.

**R7 — `analyze.yaml` verb subcommand conflict.**
- Avatar already grants `analyze.yaml` (with `light` + `chemistry` subcommands). This build adds `atmosphere` as a third subcommand. No new verb registration; just extends the YAML and adds `AnalyzeAtmosphereController.ts`. Confirm no naming collision: subcommand "atmosphere" is unique.

---

## Wave breakdown

Eight waves. Each wave produces one or more atomic commits with a single concern. Each wave starts with a quick reread of the requirements doc to keep scope honest.

---

### Wave 1 — Quantity catalog + tag tables

**Goal:** Get the units used by Wave 2 + downstream waves into the substrate.

**Files modified:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/quantity.ts` — extend `Unit` union with `'%'` and `'m/s²'`. (`'m'`, `'m³'`, `'Pa'`, `'K'`, `'kg/m³'` already present.) Add `'%': ARITHMETIC_OPS, 'm/s²': ARITHMETIC_OPS` to `unitOps`. (`'m³'` is in the union; verify if `'m³'` math is needed — `getVolume()` returns Quantity but no add/scale on volumes in v1, so leaving math unregistered is fine.)
- `/home/bobalu/play/saxonberg/packages/server/src/mud/config/quantity-tags.yaml` — add per-decision sections:
  - `K: thermal:` — new scale on K (alongside existing `color`), with P1 breakpoints. Note that `color` is currently declared first and is therefore K's default; **leave the order such that `color` remains default** (color-temperature consumers are the existing customers; thermal is opt-in via `q.tag('thermal')`).
  - `Pa: default:` — P2 breakpoints.
  - `'%': default:` — P3 breakpoints. (YAML key quoted for the bare `%`.)
  - `'m/s²': default:` — P4 breakpoints.

**Files created:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/seeds/lib/persistence/QuantityMarshaller/Pa.yaml`
- `/home/bobalu/play/saxonberg/packages/server/src/mud/seeds/lib/persistence/QuantityMarshaller/percent.yaml` (file naming: bare `%` is filesystem-hostile; use `percent` — but the encoded form per `encodeUnit` is `%` unchanged. Audit `QuantityMarshaller.encodeUnit` to ensure `%` survives filesystem; if not, extend the encoder to map `%` → `pct` and update the encoded-unit table in `docs/subsystems/quantities.md`. **Recommended:** extend encoder.)
- `/home/bobalu/play/saxonberg/packages/server/src/mud/seeds/lib/persistence/QuantityMarshaller/m-per-s2.yaml` (encoder handles `²` → `2` and `/` → `-per-`).
- `/home/bobalu/play/saxonberg/packages/server/src/mud/seeds/lib/persistence/QuantityMarshaller/m.yaml`
- `/home/bobalu/play/saxonberg/packages/server/src/mud/seeds/lib/persistence/QuantityMarshaller/m3.yaml` (encoded form of `m³`).

**Tests created:**
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/__tests__/quantity.biome-units.test.ts` — round-trip tag/threshold for each new (unit, scale) pair; parse and format for each unit; marshaller hydration for `Pa` / `%` / `m/s²` / `m` / `m³`.

**Done when:** `Quantity.of(295, 'K').tag('thermal')` returns `'warm'`. `Quantity.parse('vacuum', 'Pa').rawValue()` returns `0`. New marshaller singletons load via `installV1QuantityMarshallers()`-style test helper.

**Commit:** `feat(quantity): add K-thermal, Pa, %, m/s², m, m³ marshallers and tag tables for biome substrate`

---

### Wave 2 — Biome class + root universe biome + density map + boot seed

**Goal:** Substrate's data layer + lookup Api shell. No AtmosphericMixin yet.

**Files created:**

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/Biome.ts`:
```ts
// Biome extends Zone (parallel to Clade): biomes ARE both folder + data
// at every path level. The folder/leaf invariant applies to SpatialZone
// only; biomes carry pure inheritance taxonomy, no coordinate system.
export class Biome extends Zone {
  // Five Quantity-typed atmospheric defaults; nullable.
  protected _defaultTemperature: Quantity<'K'> | null = null;
  protected _defaultPressure: Quantity<'Pa'> | null = null;
  protected _defaultHumidity: Quantity<'%'> | null = null;
  protected _defaultGravity: Quantity<'m/s²'> | null = null;
  // Atmosphere tag (string per decision 4).
  protected _defaultAtmosphere: string | null = null;
  // Two ambient-sensory MML strings; biome-shaped, no Quantity.
  protected _ambientSoundMml: string | null = null;
  protected _ambientSmellMml: string | null = null;

  static persistentFields = [
    '_defaultTemperature', '_defaultPressure', '_defaultHumidity',
    '_defaultGravity', '_defaultAtmosphere',
    '_ambientSoundMml', '_ambientSmellMml',
  ];

  static fieldMarshallers = {
    _defaultTemperature: QuantityMarshaller.pathFor('K'),
    _defaultPressure:    QuantityMarshaller.pathFor('Pa'),
    _defaultHumidity:    QuantityMarshaller.pathFor('%'),
    _defaultGravity:     QuantityMarshaller.pathFor('m/s²'),
  };

  // Five getDefaultX / setDefaultX pairs (Quantity-typed; strict on
  // unit per R5). One getDefaultAtmosphere / setDefaultAtmosphere
  // pair (string). Two getAmbientSoundMml / setAmbientSoundMml and
  // smell equivalents (string). Total = 14 methods.
}
```
Notes: Biome does NOT compose Singleton (requirements decision 3). It extends `Zone` directly (per P11 — parallel to `Clade extends Zone`). The setters do the `instanceof Quantity` + unit check; throw TypeError on mismatch per R5.

`ZoneApi` predicates for Biome: `isFolderClass(Biome)` returns true (Biomes can have children); `isSpatialZoneClass(Biome)` returns false (no coordinate system). This matches Clade exactly.

(No `Biorealm.ts` per P16. The root at `/lib/biome/` is itself a `Biome` template — see the seed file below.)

`/home/bobalu/play/saxonberg/packages/server/src/mud/api/biome.ts` — Wave-2 surface:
```ts
const ATMOSPHERE_DENSITIES: Record<string, Quantity<'kg/m³'>> = {
  air:    Quantity.of(1.225, 'kg/m³'),
  water:  Quantity.of(1000,  'kg/m³'),
  vacuum: Quantity.of(0,     'kg/m³'),
};

export class BiomeApi {
  // Singleton path lookup.
  public static findByPath(path: string): Biome | null {
    return StuffApi.findByTemplatePath<Biome>(path) ?? null;
  }
  // Density-by-tag.
  public static densityOf(tag: string): Quantity<'kg/m³'> {
    const d = ATMOSPHERE_DENSITIES[tag];
    if (!d) throw new Error(`unknown atmosphere tag: '${tag}'`);
    return d;
  }
  // Wave 3 fills in resolveXFor; Wave 5 fills in isSkyExposed.
  // Also lands here: getRootBiome() with private #rootBiome cache for
  // hot-path access (chain step 6 + Altimeter sea-level reference).
}
SecurityApi.decorateApiClass(BiomeApi);
```

**Files modified:**

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/mixin.ts` — add to `Mixins` registry:
```ts
Atmospheric: 'AtmosphericMixin',
SkyExposed:  'SkyExposedMixin',
```
(Wave 2 adds the constants; the mixin classes themselves and the `MixinApi` predicates land Wave 3 and Wave 5 respectively.)

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/persistence/QuantityMarshaller.ts` — if `%` encoder change is needed (see Wave 1 file-naming note), extend `encodeUnit` to map `%` → `pct` (or similar). Update the table in `docs/subsystems/quantities.md`.

**Files created (seeds — universe biome only; full leaf roster lands Wave 7):**

- `/home/bobalu/play/saxonberg/packages/server/src/mud/seeds/lib/biome.yaml` — the root **universe biome** carrying all five defaults:
  ```yaml
  # /lib/biome — root of the biome template tree. This IS the universe
  # biome; every other biome inherits defaults from here via the chain
  # step 4 templatePath walk. No Biorealm class (per P16).
  class: /lib/biome/Biome
  hydratorClass: /lib/persistence/PersistentHydrator
  data:
    _defaultTemperature: { value: 295,    unit: K }
    _defaultPressure:    { value: 101325, unit: Pa }
    _defaultHumidity:    { value: 50,     unit: '%' }
    _defaultGravity:     { value: 9.81,   unit: 'm/s²' }
    _defaultAtmosphere:  air
  ```

**Tests created:**

- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/__tests__/Biome.test.ts` — round-trip every persistent field through save/load using QuantityMarshaller; setter strict-type assertions; ambient MML field round-trip; clone via `StuffApi.clone('/lib/biome/...')`.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/biome.densityOf.test.ts` — three known tags + unknown-throws.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/biome.rootBiome.test.ts` — boot-time invariant: `/lib/biome/` exists, is a `Biome` (not `Biorealm`), and has all five `_defaultX` fields non-null with the expected values (295 K, 101325 Pa, 50 %, 9.81 m/s², 'air').

**Done when:** `await StuffApi.singleton('/lib/biome')` returns a `Biome` with all five defaults set. `BiomeApi.densityOf('air').rawValue()` === 1.225. A test-fixture biome template under `/lib/biome/_fixtures/test1` round-trips its defaults.

**Commit:** `feat(biome): Biome class (extends Zone), root universe biome, atmosphere density map, BiomeApi shell`

---

### Wave 3 — AtmosphericMixin + composition + chain walk

**Goal:** The mixin + chain resolver. End-state: any Location/Vessel can override; readers walk through containment to universe.

**Files created:**

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/Atmospheric.ts`:
```ts
export interface Atmospheric {
  // Biome ref.
  getBiome(): Biome | null;
  setBiome(value: Biome | null): void;
  // Five Quantity-field accessor pairs with detailKey.
  getTemperature(detailKey?: string): Quantity<'K'>;
  setTemperature(value: Quantity<'K'> | null, detailKey?: string): void;
  // ... pressure, humidity, gravity, atmosphere ...
  getAtmosphere(detailKey?: string): string;
  setAtmosphere(value: string | null, detailKey?: string): void;
}

export function AtmosphericMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AtmosphericMixin extends Base implements Atmospheric {
    static _mixinName = 'AtmosphericMixin';

    // Pattern A biome ref.
    public _biomePath: string | null = null;

    // Five room-scope fields, null = "fall through."
    public _temperature: Quantity<'K'>     | null = null;
    public _pressure:    Quantity<'Pa'>    | null = null;
    public _humidity:    Quantity<'%'>     | null = null;
    public _gravity:     Quantity<'m/s²'>  | null = null;
    public _atmosphere:  string            | null = null;

    // Per-detail maps. See R6 — Record<string, Quantity<U>>
    // (plain JSON; no map marshaller).
    public _detailTemperatures: Record<string, Quantity<'K'>>    = {};
    public _detailPressures:    Record<string, Quantity<'Pa'>>   = {};
    public _detailHumidities:   Record<string, Quantity<'%'>>    = {};
    public _detailGravities:    Record<string, Quantity<'m/s²'>> = {};
    public _detailAtmospheres:  Record<string, string>           = {};

    static persistentFields = [
      '_biomePath',
      '_temperature', '_pressure', '_humidity', '_gravity', '_atmosphere',
      '_detailTemperatures', '_detailPressures', '_detailHumidities',
      '_detailGravities', '_detailAtmospheres',
    ];

    // Each of the four Quantity room-scope fields gets a marshaller.
    // Detail maps round-trip via standard JSON (Quantity.toJSON /
    // fromJSON) — no map marshaller, see R6.
    static fieldMarshallers = {
      _temperature: QuantityMarshaller.pathFor('K'),
      _pressure:    QuantityMarshaller.pathFor('Pa'),
      _humidity:    QuantityMarshaller.pathFor('%'),
      _gravity:     QuantityMarshaller.pathFor('m/s²'),
    };

    // ──── Methods (sketch — see Detailed-method-shape below) ────

    public getBiome(): Biome | null {
      return this._biomePath === null
        ? null
        : BiomeApi.findByPath(this._biomePath);
    }
    public setBiome(value: Biome | null): void {
      this._biomePath = value === null ? null : value.getTemplatePath();
    }

    public getTemperature(detailKey?: string): Quantity<'K'> {
      return BiomeApi.resolveTemperatureFor(this as Stuff & Container, detailKey);
    }
    public setTemperature(value: Quantity<'K'> | null, detailKey?: string): void {
      if (detailKey !== undefined) {
        if (value === null) { delete this._detailTemperatures[detailKey]; return; }
        this.#assertQuantity(value, 'K', 'temperature');
        this._detailTemperatures[detailKey] = value;
        return;
      }
      if (value === null) { this._temperature = null; return; }
      this.#assertQuantity(value, 'K', 'temperature');
      this._temperature = value;
    }
    // pressure / humidity / gravity follow the identical shape.

    public getAtmosphere(detailKey?: string): string {
      return BiomeApi.resolveAtmosphereFor(this as Stuff & Container, detailKey);
    }
    public setAtmosphere(value: string | null, detailKey?: string): void {
      if (detailKey !== undefined) {
        if (value === null) delete this._detailAtmospheres[detailKey];
        else                this._detailAtmospheres[detailKey] = value;
        return;
      }
      this._atmosphere = value;
    }

    #assertQuantity<U extends Unit>(value: Quantity<U>, unit: U, name: string): void {
      if (!(value instanceof Quantity) || value.unit !== unit) {
        throw new TypeError(
          `AtmosphericMixin.set${pascalCase(name)} expects Quantity<'${unit}'>`
        );
      }
    }
  };
}
```

Notes:
- 11 persistent fields exactly per requirements constraint.
- All Quantity setters strict-on-unit per R5.
- `getX(detailKey?)` is a thin delegator to `BiomeApi.resolveXFor` — keeps chain code in one place.
- Hard private `#assertQuantity` is fine — it's a *helper*, not instance state, and is read-only (no proxy issue).

**Files modified:**

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/stuff/Location.ts`:
```ts
import { AtmosphericMixin } from '../biome/Atmospheric';

const LocationBase = AtmosphericMixin(
  TangibleMixin(AdornableMixin(ContainerMixin(Stuff)))
);
```
(AtmosphericMixin layered outermost so its methods are not shadowed by intermediate mixins.)

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/stuff/Vessel.ts` — same edit at `VesselBase` line 37.

`/home/bobalu/play/saxonberg/packages/server/src/mud/api/mixin.ts` — add `import type { Atmospheric }` plus `isAtmospheric` predicate at the same location as `isMaterial`/etc. (Per P8.)

`/home/bobalu/play/saxonberg/packages/server/src/mud/api/biome.ts` — extend with chain-walk methods:
```ts
public static resolveTemperatureFor(
  scope: Stuff & Container,
  detailKey?: string
): Quantity<'K'> {
  return BiomeApi.#resolveFor<'K'>(
    scope, detailKey,
    'temperature',  // field bare name (used by Zone.lookupField)
    'K',
    // Per-field getters off Biome and AtmosphericMixin:
    (b)        => b.getDefaultTemperature(),
    (a, key?)  => key ? a._detailTemperatures[key] ?? null : a._temperature,
  );
}
// ... resolvePressureFor, resolveHumidityFor, resolveGravityFor analogues.
// resolveAtmosphereFor returns string instead of Quantity; same chain
// shape; root biome's _defaultAtmosphere ('air') is the terminal value.

// The shared chain walker (iterative; depth-capped per R2):
static #resolveFor<U extends Unit>(
  scope: Stuff & Container,
  detailKey: string | undefined,
  fieldBare: string,
  unit: U,
  biomeGetter: (b: Biome) => Quantity<U> | null,
  ownGetter: (a: Atmospheric, key?: string) => Quantity<U> | null,
): Quantity<U> {
  let cursor: Stuff & Container = scope;
  let outermostLocation: Stuff & Container = scope;
  let depthGuard = 32;
  let isInnermost = true;
  while (cursor !== null && depthGuard-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      const a = cursor as Stuff & Container & Atmospheric;
      // Step a + b: detail + prefix walk — only on innermost.
      if (isInnermost && detailKey !== undefined) {
        let key: string | undefined = detailKey;
        while (key !== undefined) {
          const hit = ownGetter(a, key);
          if (hit !== null && hit !== undefined) return hit;
          const dot = key.lastIndexOf('.');
          key = dot < 0 ? undefined : key.substring(0, dot);
        }
      }
      // Step c: room-scope (bulk) on this ancestor.
      const bulk = ownGetter(a);
      if (bulk !== null && bulk !== undefined) return bulk;
      // Step d: biome default with template-ancestry walk.
      const biome = a.getBiome();
      if (biome !== null) {
        const fromBiome = BiomeApi.#walkBiomeAncestry<U>(biome, biomeGetter);
        if (fromBiome !== null) return fromBiome;
      }
    }
    // Outer ancestors don't carry detail-key; keep tracking outermost.
    if (MixinApi.isContainable(cursor)) {
      const next = (cursor as Stuff & Containable).getContainer();
      if (next === null) break;
      if (MixinApi.isContainer(next)) {
        outermostLocation = next as Stuff & Container;
        cursor = outermostLocation;
        isInnermost = false;
        continue;
      }
    }
    break;  // outermost Location reached
  }
  // Step 5: spatial zone default via Zone.lookupField.
  // (Uses the method surface per "Inter-Stuff Contract: methods only";
  // no direct field access on .zone.)
  const zone = (outermostLocation as Stuff).getZone?.() ?? null;
  if (zone) {
    const fromZone = await zone.lookupField<Quantity<U>>(`atmosphere.${fieldBare}`);
    if (fromZone !== null) return fromZone;
  }
  // Step 6: terminal — consult the root universe biome at /lib/biome/.
  // No const map. The biome tree's root carries authoritative defaults.
  const root = BiomeApi.getRootBiome();
  const v = biomeGetter(root);
  if (v === null || v === undefined) {
    throw new Error(
      `BiomeApi.resolve: root biome /lib/biome/ has no '${fieldBare}' default. ` +
      `This is a boot-time invariant violation; check seeds/lib/biome.yaml.`
    );
  }
  return v;
}

// Cached root biome accessor — used by step 6 of every chain walk
// AND by Altimeter's sea-level reference. Invalidated on biome HMR.
static #rootBiome: Biome | null = null;
static getRootBiome(): Biome {
  if (this.#rootBiome === null) {
    const b = BiomeApi.findByPath('/lib/biome');
    if (b === null) {
      throw new Error('BiomeApi.getRootBiome: /lib/biome not loaded');
    }
    this.#rootBiome = b;
  }
  return this.#rootBiome;
}
static invalidateRootBiomeCache(): void {  // HMR hook
  this.#rootBiome = null;
}

static #walkBiomeAncestry<U extends Unit>(
  biome: Biome, getter: (b: Biome) => Quantity<U> | null
): Quantity<U> | null {
  let path = biome.getTemplatePath();
  while (path) {
    const b = BiomeApi.findByPath(path);
    if (b) {
      const v = getter(b);
      if (v !== null && v !== undefined) return v;
    }
    const slash = path.lastIndexOf('/');
    if (slash <= '/lib/biome'.length) break;
    path = path.substring(0, slash);
  }
  return null;
}
```

**IMPORTANT:** The above sketch uses `await` inside a synchronous helper because `Zone.lookupField` is async. The chain method must be `async` AND the convenience getters on AtmosphericMixin (`getTemperature(detailKey?)`) must therefore also be async — OR the zone step is handled differently. **Design choice surfaced for review:** either (a) make `getX(detailKey?)` async — matches `Zone.lookupField` shape; instruments and verbs already async-friendly; OR (b) cache zone-defaults synchronously at boot. **Recommendation: (a) async getters.** Cost: every read at the chain layer is async; cheap for instrument/analyze use; cost concentrated in Wave 5 controllers (already async-shape). Pin this answer with the user before Wave 3 build.

**Tests created:**

- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/__tests__/Atmospheric.persistence.test.ts` — 11 fields round-trip; setter unit-strict; null deletes detail entry.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/__tests__/Atmospheric.prefixWalk.test.ts` — set `hearth.embers` → `hearth.embers` resolves to override, `hearth.something-else` walks to `hearth`, `elsewhere` walks past.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/biome.chainWalk.test.ts` — six-step chain coverage:
  - Empty Location, no biome → universe default.
  - Biome leaf with default → biome reads.
  - Biome leaf without default → ancestor parent's default reads.
  - Zone with `atmosphere.temperature` set → reads zone.
  - Room override on top of biome → reads room.
  - Detail override on top of room → reads detail.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/biome.vesselWalk.test.ts` — five vessel cases per requirements acceptance: porous, sealed, partial sealing, nested vessels, atmospherically-transparent (Box) container.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/biome.detailLocality.test.ts` — `scope:vessel, detailKey:'hearth'` walks to outer Location and queries Location with the detail key.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/biome.universeDefaults.test.ts` — resolve chain with empty everything → returns the root biome's default (e.g. 295 K for temperature, sourced from the universe biome at `/lib/biome/`). Negative test: temporarily clear root biome's `_defaultTemperature` → resolver throws with the boot-invariant message.

**Done when:** All five Atmospheric.* tests + all chain-walk tests pass. A room with biome `/lib/biome/_fixtures/test1` reads its defaults. Vessel inside the room with no overrides reads the room's defaults. Vessel with `setTemperature(Q(295,'K'))` reads 295K; reads of pressure fall through to room.

**Commit:** `feat(biome): AtmosphericMixin composition on Location and Vessel; chain-walking resolveXFor`

---

### Wave 4 — Derived geometry + cellSize graduation

**Goal:** `Location.getVolume()` / `getCeilingHeight()` shipped; `CartesianZone.cellSize` semantic shift + light recalibration.

**Files modified:**

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/stuff/Location.ts`:
```ts
public abstract getVolume(): Quantity<'m³'> | null;
public abstract getCeilingHeight(): Quantity<'m'> | null;
```
(Or returning `null` from the base if "abstract" is too strict for type-checking the existing pure-Location use cases; verify at build time which fits the compiler.)

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/spatial/CartesianLocation.ts` — add overrides:
```ts
public override getVolume(): Quantity<'m³'> | null {
  const c = this.getZone()?.getCellSize();
  return c == null ? null : Quantity.of(c ** 3, 'm³');
}
public override getCeilingHeight(): Quantity<'m'> | null {
  const c = this.getZone()?.getCellSize();
  return c == null ? null : Quantity.of(c, 'm');
}
// Per R1 — keep light substrate calibrated by squaring linear cellSize:
public getSizeScale(): number {
  const c = this.getZone()?.getCellSize() ?? 1.0;
  return c * c;
}
```

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/spatial/SphericalLocation.ts`:
```ts
public override getVolume(): Quantity<'m³'> | null {
  // Full sphere — gas fills it; what PV=nRT operates against.
  const r = this.getRadius();
  return r == null ? null : Quantity.of((4/3) * Math.PI * r ** 3, 'm³');
}
public override getCeilingHeight(): Quantity<'m'> | null {
  // Inscribed cube's side (cube's space diagonal = 2r, so side = 2r/√3).
  // The cube is the usable interior; the sphere is the reservation.
  const r = this.getRadius();
  return r == null ? null : Quantity.of((2 * r) / Math.sqrt(3), 'm');
}
```

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/spatial/CartesianZone.ts`:
- `protected cellSize: number = 3.0;` (change from `1.0`).
- Update JSDoc on the cellSize field to remove "(NOT squared)" / "(already in m²)" language and replace with the new linear-meters convention. Update the calibration guidance (`5m × 5m room is cellSize: 5`, not `25`).

`/home/bobalu/play/saxonberg/packages/server/src/mud/api/location.ts` — **new file** (Api class for thin geometry-agnostic wrappers):
```ts
export class LocationApi {
  public static getVolume(room: Stuff & Container): Quantity<'m³'> | null {
    return (room as unknown as { getVolume?: () => Quantity<'m³'> | null }).getVolume?.() ?? null;
  }
  public static getCeilingHeight(room: Stuff & Container): Quantity<'m'> | null {
    return (room as unknown as { getCeilingHeight?: () => Quantity<'m'> | null }).getCeilingHeight?.() ?? null;
  }
}
SecurityApi.decorateApiClass(LocationApi);
```

`/home/bobalu/play/saxonberg/packages/server/src/mud/api/light.ts` — update doc comments mentioning "m² already" to reflect the linear-meters convention + the squared derivation. No code changes needed (it consumes `getSizeScale()` which now does the squaring).

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/perception/AmbientLit.ts`, `lib/perception/Light.ts` — JSDoc updates only.

**Tests created:**

- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/spatial/__tests__/CartesianLocation.geometry.test.ts` — default cellSize → 27 m³ volume + 3 m ceiling.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/spatial/__tests__/SphericalLocation.geometry.test.ts` — radius=2 → 33.51 m³ volume (full sphere) + 2.309 m ceiling (inscribed cube side, `4/√3`). Test should also cover the geometric invariant: ceiling × √3 ≈ 2·radius.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/location.geometry.test.ts` — `LocationApi.getVolume` / `getCeilingHeight` returns expected for both Cartesian + Spherical.
- **Light test recalibration sweep:** audit `packages/server/src/mud/api/__tests__/light.*.test.ts` and `lib/perception/__tests__/*.test.ts` for tests that pin specific LightBand values; adjust expectations or pass `cellSize: 1.0` (= 1 m² scale) in test-zone setup to preserve original light values.

**Done when:** All geometry tests pass. All existing light tests pass (either with re-pinned expectations or test-zone cellSize calibration).

**Commit:** `feat(biome): derived geometry on Locations; CartesianZone.cellSize graduates to linear meters (default 3.0)`

---

### Wave 5 — SkyExposed seam + BiomeApi.isSkyExposed

**Goal:** The capability-mixin and the predicate. (Universe-default constants live in BiomeApi; landed in Wave 2 alongside `densityOf` per the const-map pattern.)

**Files created:**

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/SkyExposed.ts`:
```ts
export interface SkyExposed {
  isSkyExposed(): boolean;
}
export function SkyExposedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SkyExposedMixin extends Base implements SkyExposed {
    static _mixinName = 'SkyExposedMixin';
    isSkyExposed(): boolean { return true; }
  };
}
```

`/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/SkyExposedBiome.ts`:
```ts
import { SkyExposedMixin } from './SkyExposed';
import { Biome } from './Biome';
export class SkyExposedBiome extends SkyExposedMixin(Biome) {}
```

**Files modified:**

`/home/bobalu/play/saxonberg/packages/server/src/mud/api/mixin.ts` — add `isSkyExposed` predicate.

`/home/bobalu/play/saxonberg/packages/server/src/mud/api/biome.ts` — add `isSkyExposed(scope)`:
```ts
public static isSkyExposed(scope: Stuff & Container): boolean {
  // Walk outward through containment ancestors looking for an
  // atmospheric ancestor with a biome; first one wins.
  let cursor: Stuff & Container = scope;
  let depthGuard = 32;
  while (cursor !== null && depthGuard-- > 0) {
    if (MixinApi.isAtmospheric(cursor)) {
      const biome = (cursor as Atmospheric).getBiome();
      if (biome !== null) return MixinApi.isSkyExposed(biome);
    }
    if (!MixinApi.isContainable(cursor)) return false;
    const next = (cursor as Containable).getContainer();
    if (next === null || !MixinApi.isContainer(next)) return false;
    cursor = next as Stuff & Container;
  }
  return false;
}
```

**Universe defaults landed in Wave 2** on the **root biome** at `/lib/biome/` (per P16) — five `_defaultX` fields in the seed YAML, consumed by chain step 6 via `BiomeApi.getRootBiome()`. NOT a setting; NOT registered with `EnvironmentMixin`; NOT exposed to the `settings` / `var` command surface. NOT a const map either — the values live in the biome tree itself. Authors who want non-Earth defaults either (a) edit the root biome seed, or (b) set values on a top-level Zone via `Zone.lookupField`'s walk (chain step 5 beats step 6).

Rationale recorded because it overrides the slate framing: settings are for player preferences (`shell.parser`, `movement.defaultMode`). Atmospheric universe defaults aren't preferences — players don't get to vote on what air pressure is. And they aren't engine constants either — the biome tree's root naturally carries them as authored content.

**Tests created:**

- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/__tests__/SkyExposed.test.ts` — `SkyExposedBiome` returns true from `isSkyExposed`.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/api/__tests__/biome.isSkyExposed.test.ts` — room with `/lib/biome/outdoor/temperate/quad` → true (after Wave 7 ships the leaves; use a fixture in Wave 5).
- (`biome.universeDefaults.test.ts` moved up to Wave 3 alongside the chain-walk tests; verifies the resolver consults the root biome at `/lib/biome/` as terminal step.)

**Done when:** `BiomeApi.isSkyExposed(room)` resolves true for a sky-exposed-biome-bearing room, false otherwise. The chain walks correctly when only universe defaults are set.

**Commit:** `feat(biome): SkyExposedMixin + SkyExposedBiome + isSkyExposed predicate`

---

### Wave 6 — Instruments + verbs + analyze atmosphere

**Goal:** Pedagogical surface. Six instrument templates + `measure <field>` dispatcher + `analyze atmosphere` verb.

**Files created — instrument classes:**

- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/instrument/Thermometer.ts`
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/instrument/Barometer.ts`
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/instrument/Hygrometer.ts`
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/instrument/GravityMeter.ts`
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/instrument/GasAnalyzer.ts`
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/instrument/Altimeter.ts`

Each one:
```ts
export class Thermometer extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['measure.yaml'],  // existing measure verb; subcommand routed by which instrument
    environment: [],
    peers: [],
  };
}
```

**Files created — seeds:**

- `/home/bobalu/play/saxonberg/packages/server/src/mud/seeds/obj/instrument/thermometer.yaml` (parallel to existing `balance.yaml` / `photometer.yaml`).
- … one per instrument; flat directory.

**Files created — controllers:**

Six controllers under `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/command/`:
- `MeasureTemperatureController.ts`, `MeasurePressureController.ts`, `MeasureHumidityController.ts`, `MeasureGravityController.ts`, `MeasureAtmosphereController.ts`, `MeasureAltitudeController.ts`, plus `AnalyzeAtmosphereController.ts`.

Pattern per `MeasureLightController.ts`:
```ts
export class MeasureTemperatureController extends CommandController<MeasureTemperatureModel> {
  async execute(model, ctx): Promise<void> {
    const giver = ctx.commandGiver;
    const scope = giver.getContainer();
    if (!scope) {
      ctx.note({ kind: 'controller-rejected', reason: 'no-scope',
                 detail: 'no container' });
      MessageApi.scene(giver)...send();
      return;
    }
    if (!MixinApi.isContainer(scope)) { /* same refusal */ }
    const detailKey = model.detail;  // optional
    const t = await BiomeApi.resolveTemperatureFor(scope, detailKey);
    const body = Mml.compose`Temperature: ${t.formatMml()} (${t.tag('thermal')})`;
    MessageApi.scene(giver).topic(MessageApi.Topics.world.perception.look)
      .toSelf(body).send();
  }
}
```

**Files modified — command YAMLs:**

`/home/bobalu/play/saxonberg/packages/server/src/mud/cmd/measure.yaml` — extend with subcommands:
```yaml
verbs: [measure]
subcommands:
  light: { controller: MeasureLightController, args: [...] }
  temperature:
    controller: MeasureTemperatureController
    args:
      - { name: location, type: object, required: false, default: here,
          scope: [reachable] }
      - { name: detail, type: string, required: false }
  pressure: { ... }
  humidity: { ... }
  gravity: { ... }
  atmosphere: { ... }
  altitude: { ... }
```

`/home/bobalu/play/saxonberg/packages/server/src/mud/cmd/analyze.yaml` — extend with `atmosphere` subcommand:
```yaml
subcommands:
  light: { controller: AnalyzeLightController, args: [...] }
  chemistry: { controller: AnalyzeChemistryController, args: [...] }
  atmosphere:
    description: "Dump the resolved atmospheric state at a Location (full provenance)."
    controller: AnalyzeAtmosphereController
    args:
      - { name: location, type: object, required: false, default: here, scope: [reachable] }
      - { name: detail, type: string, required: false }
```

**The verb-dispatch question.** Requirements say: "`measure <field> here [detail]` verb dispatches to the appropriate instrument the actor is wielding (or refuses if no matching instrument is in hand)." Each instrument contributes the `measure.yaml` view to inventory. So all measure subcommands are technically *accessible* when any one instrument is wielded. **Resolution at the controller layer:** each `MeasureXController` does a wielded-instrument check at execute time:

```ts
// Top of MeasureTemperatureController.execute:
const wielded = SlotApi.getWieldedItems(giver);  // or analog
const hasInstrument = wielded.some(w => w instanceof Thermometer);
if (!hasInstrument) {
  ctx.note({ kind: 'controller-rejected',
             reason: 'no-instrument',
             detail: 'no thermometer in hand' });
  MessageApi.scene(giver).toSelf(Mml.compose`You need a thermometer.`).send();
  return;
}
```
Verify the embodiment Api for the wielded-items helper at build time; if missing, use `giver.getContents().filter(c => MixinApi.isWieldable(c))` for v1.

**AnalyzeAtmosphereController** — produces the typed `AtmosphericTrace` (per P6) by calling new `BiomeApi.traceResolveXFor` variants that return the same value plus provenance:

```ts
// New on BiomeApi (Wave 6):
export interface AtmosphericTrace<U> {
  value: Quantity<U> | string;
  source: 'detail' | 'detail-prefix' | 'room' | 'biome' | 'biome-ancestor' | 'zone' | 'universe';
  sourcePath: string | null;  // ancestor path or biome path or zone path
  ancestorChain: string[];    // list of templatePaths walked
}
public static traceResolveTemperatureFor(
  scope, detailKey?
): Promise<AtmosphericTrace<'K'>> { ... }
// One per field; plus a convenience aggregate:
public static traceResolveAll(scope, detailKey?): Promise<{
  temperature: AtmosphericTrace<'K'>,
  pressure:    AtmosphericTrace<'Pa'>,
  // ...
  atmosphere:  AtmosphericTrace<string>,
  biome: Biome | null,
  zone:  SpatialZone | null,
}>;
```
The trace variants share the chain walker with `resolveXFor` — refactor the helper to optionally accumulate provenance and return both.

Controller renders per the slate's Layer 7 example shape:
```
> analyze atmosphere
Biome: temperate-quad (/lib/biome/outdoor/temperate/quad)
Spatial zone: <zone path or none>
                                                                       
Field         Value                Source              Path traversed
─────────     ────                 ──────              ────
temperature   295 K (warm)         biome default       → biome
pressure      101325 Pa            universe default    → biome → zone → universe
humidity      62 %                 biome default       → biome
gravity       9.81 m/s²            universe default    → biome → zone → universe
atmosphere    air                  biome default       → biome
                                                                       
Derived:
  volume       27 m³  (3×3×3 m cell)
  ceiling      3 m
  density      1.225 kg/m³  (air @ standard conditions)
                                                                       
Detail overrides on this Location:
  hearth        temperature = 800 K (hot)
  hearth.embers temperature = 1200 K (scorching)
```
Use `Mml.compose` with `.formatMml()` for canonical units; tags shown in parentheses via `q.tag('thermal' or scale)`.

**Altimeter controller** per P7.

**Tests created:**

- One test per controller under `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/command/__tests__/Measure*Controller.test.ts` — happy path + no-instrument refusal + bad-scope refusal.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/obj/command/__tests__/AnalyzeAtmosphereController.test.ts` — full provenance trace via fixture biome + Location with detail override.
- Scenario E test (`api/__tests__/biome.scenarioE.test.ts`): cafeteria 3×3×3 m cell, air, T 295K, P 101325 Pa → assert n = PV/RT computes to ≈ 1117 mol within tolerance.

**Done when:** A player can wield a thermometer + `measure temperature` and see canonical Kelvin output. `analyze atmosphere here` produces the full trace with provenance.

**Commit (split if needed):**
- `feat(biome): six instrument templates + measure subcommand dispatch`
- `feat(biome): analyze atmosphere verb + AtmosphericTrace provenance`

---

### Wave 7 — 39-leaf biome roster

**Goal:** Seed the campus + city + wilderness content per the slate roster.

**Files created — per-tier Biome seeds + leaf Biome seeds.**

Per P11 + P16: every path under `/lib/biome/` AND the root path itself is a `Biome` template (or `SkyExposedBiome`). No Biorealm class anywhere; no `_defaults` siblings. The root `/lib/biome/` (seeded in Wave 2) is the universe biome carrying all five defaults. Each tier's path holds the Biome carrying that tier's overrides. Leaves at deeper paths carry only what differs — the chain-walk step 4 finds inherited defaults by walking templatePath parents to the root.

**Tier biome seeds (data-bearing, has children).** Each inherits from the root universe biome via the chain step 4 walk:

- `seeds/lib/biome/outdoor.yaml` — Biome with broad outdoor defaults (sky-exposed ambient texture, breeze + birdsong).
  ```yaml
  class: /lib/biome/SkyExposedBiome
  hydratorClass: /lib/persistence/PersistentHydrator
  data:
    _ambientSoundMml: <markup>a soft breeze, distant birdsong</markup>
    _defaultHumidity: { value: 50, unit: '%' }
  ```
- `seeds/lib/biome/outdoor/temperate.yaml` — Biome: 42°N seasonal mean: `_defaultTemperature` 285 K (≈12°C annual mean), `_defaultGravity` 9.81 m/s², `_defaultAtmosphere` 'air'. (Inherits humidity from `outdoor`.)
  ```yaml
  class: /lib/biome/SkyExposedBiome
  ...
  data:
    _defaultTemperature: { value: 285, unit: K }
    _defaultGravity:     { value: 9.81, unit: 'm/s²' }
    _defaultAtmosphere:  air
  ```
- `seeds/lib/biome/underground.yaml` — Biome (NOT SkyExposed): T 285 K (~12°C cave-stable), 70% RH, "mineral / damp" ambient.
- `seeds/lib/biome/indoor.yaml` — Biome (NOT SkyExposed): T 294 K (~21°C climate-controlled), 45% RH, low HVAC ambient.
- `seeds/lib/biome/indoor/academic.yaml` — Biome: paper/wood/chalk smell, quiet murmur.
- `seeds/lib/biome/indoor/residential.yaml`, `seeds/lib/biome/indoor/social.yaml`, `seeds/lib/biome/indoor/civic.yaml`, `seeds/lib/biome/indoor/special.yaml` — Biomes with their tier defaults.

**Leaf biome seeds (typically sparse — declare only what differs):**

- `seeds/lib/biome/outdoor/temperate/<leaf>.yaml` × 15 — quad, path, garden, athletic-field, courtyard, street, alley, plaza, riverbank, forest-deciduous, forest-coniferous, meadow, wetland, lakeshore, highland.
- `seeds/lib/biome/underground/<leaf>.yaml` × 3 — tunnel, sewer, cave.
- `seeds/lib/biome/indoor/academic/<leaf>.yaml` × 7 — lecture-hall, classroom, wet-lab, dry-lab, library-stacks, library-reading-room, faculty-office.
- `seeds/lib/biome/indoor/residential/<leaf>.yaml` × 3 — dorm-room, common-room, townhouse.
- `seeds/lib/biome/indoor/social/<leaf>.yaml` × 1 — cafeteria.
- `seeds/lib/biome/indoor/civic/<leaf>.yaml` × 4 — shop, tavern, inn, workshop.
- `seeds/lib/biome/indoor/special/<leaf>.yaml` × 6 — observatory-dome (likely SkyExposedBiome via aperture), gymnasium, theater, art-studio, chapel, archive.

Per-leaf seed shape (sparse defaults; inherits from tier biome via chain walk):
```yaml
# /lib/biome/outdoor/temperate/quad
class: /lib/biome/SkyExposedBiome
hydratorClass: /lib/persistence/PersistentHydrator
data:
  _ambientSoundMml: <markup>a soft breeze, distant voices, occasional laughter</markup>
  _ambientSmellMml: <markup>fresh-cut grass and warm stone</markup>
  # Temperature, pressure, humidity, gravity, atmosphere unset →
  # chain step 4 walks templatePath ancestors:
  #   /lib/biome/outdoor/temperate (→ 285 K, 9.81 m/s², 'air')
  #   /lib/biome/outdoor           (→ 50 % humidity)
  #   /lib/biome/                  (→ universe biome; 295 K / 101325 Pa /
  #                                   50 % / 9.81 m/s² / air — terminal)
```

**Total seed count for Wave 7:** ~8 tier biomes + 39 leaf biomes + (atrium showcase per scenario C) = ~48 Biome seeds. The root universe biome at `/lib/biome/` was already seeded in Wave 2; Wave 7 adds everything below it.

**Tests created:**

- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/__tests__/roster.test.ts` — confirm:
  - 39 leaves exist at the expected paths.
  - Each leaf's `BiomeApi.findByPath(p)` returns a Biome.
  - 15 outdoor/temperate + observatory-dome resolve `isSkyExposed` true; 22 others resolve false.
  - Spot-checks of inheritance via templatePath walk: `outdoor/temperate/quad`'s humidity inherits from `/lib/biome/outdoor` (one tier up); its temperature inherits from `/lib/biome/outdoor/temperate` (immediate parent).
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/__tests__/scenarioA.test.ts` — cafeteria with hot hearth Detail per slate Scenario A.
- `/home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/__tests__/scenarioC.test.ts` — atrium child biome `/lib/biome/indoor/cafeteria/atrium` extends SkyExposedBiome; sibling cafeteria room does not. Wire this scenario as part of Wave 7's roster authoring (and add the atrium leaf to the seeds, even if not in the 39-count baseline; it's the worked-scenario showcase).

**Done when:** Boot log shows 39 biome leaves loaded. All roster tests pass. Scenario A + C tests pass.

**Commit:** `feat(biome): seed 39-leaf v1 biome roster (campus + city + wilderness + underground)`

---

### Wave 8 — Documentation sweep

**Goal:** Permanent docs reflect the substrate. Slate stays (not graduated yet per workflow.md retirement rules unless the user signals); plan + requirements retire at /finalize.

**Files created:**

`/home/bobalu/play/saxonberg/docs/subsystems/biome.md` — full substrate reference per requirements doc acceptance:
- Biome class shape + 7-field roster + accessor surface.
- Root universe biome at `/lib/biome/` (a Biome carrying the five universe defaults — no Biorealm class).
- AtmosphericMixin field layout (11 persistent fields) + method surface + composition onto Location AND Vessel.
- The override chain with worked traces including all four vessel cases (porous, sealed, partial, nested).
- Atmosphere tag shape + 3-entry density map + "promote to Atmosphere singleton if extensibility needed" note.
- SkyExposedMixin + SkyExposedBiome + `BiomeApi.isSkyExposed`.
- Derived geometry + cellSize graduation (with R1's mitigation rationale documented) + inscribed-cube spherical convention (sphere = reserved space + atmospheric fill; cube = usable ceiling/floor extent).
- Universe defaults on the root biome (NOT a const, NOT a setting) — chain step 6 terminates there.
- Instruments + analyze verb (with actor-scope reading rule).
- 39-leaf roster shape (tree + per-tier defaults).
- Cross-references to quantities / spatial / race / light / zone / ref-shapes.

**Files modified:**

- `/home/bobalu/play/saxonberg/docs/subsystems/spatial.md` — cellSize graduation note (R1); Location section mentions abstract `getVolume()` / `getCeilingHeight()` + `AtmosphericMixin` composition; Vessel section mentions AtmosphericMixin composition + outward-walking chain semantics; cross-link to `biome.md`.
- `/home/bobalu/play/saxonberg/docs/subsystems/race.md` — cross-reference note: per-species breathing gate will need an atmosphere-tag → breath rule; v1 doesn't pre-build that data but flags the seam.
- `/home/bobalu/play/saxonberg/docs/subsystems/quantities.md` — extend the unit catalog table with `Pa` / `%` / `m/s²` / `m³` / `m` tag-table or no-tag-table entries; mention the new K-thermal scale alongside K-color.
- `/home/bobalu/play/saxonberg/docs/subsystems/light.md` — note that `getSizeScale()` is now derived from linear cellSize squared (R1 mitigation).
- `/home/bobalu/play/saxonberg/docs/ref-shapes.md` — Pattern A exemplar list adds `Atmospheric._biomePath`.
- `/home/bobalu/play/saxonberg/docs/architecture.md` — `lib/biome/` mentioned; `BiomeApi` mentioned.
- `/home/bobalu/play/saxonberg/docs/antipatterns.md` — gain entry: "inline atmospheric chain walk" → "go through `BiomeApi.resolveXFor`."
- `/home/bobalu/play/saxonberg/CLAUDE.md` — Documentation Map subsystems list adds a biome entry: `biome.md` — `Biome extends Zone` (root universe biome carries defaults) + `AtmosphericMixin` composition onto Location/Vessel; outward-walking chain resolver in `BiomeApi`; `SkyExposedMixin` + instruments + analyze atmosphere verb.

**Tests:** N/A (doc-only).

**Done when:** Subsystem docs accurate. `CLAUDE.md` documentation map covers the new subsystem.

**Commit:** `docs(biome): graduate slate content into subsystems/biome.md; update spatial/quantities/light/ref-shapes for biome substrate`

---

## Total expected file count (rough)

| Type | Count |
|---|---|
| New `lib/biome/` classes | 4 (Biome, Atmospheric, SkyExposed, SkyExposedBiome) — no Biorealm per P16 |
| New `api/` files | 2 (biome.ts, location.ts) |
| Modified `lib/` files | ~6 (quantity.ts, mixin.ts, Location.ts, Vessel.ts, CartesianLocation.ts, SphericalLocation.ts, CartesianZone.ts) |
| Modified `api/` files | 2 (mixin.ts, light.ts JSDoc) |
| New instrument classes | 6 |
| New instrument seeds | 6 |
| New command controllers | 7 |
| Modified command YAMLs | 2 (measure.yaml, analyze.yaml) |
| New marshaller seeds | 5 (Pa, %, m/s², m, m³) |
| New tag-table sections in YAML | 4 (K-thermal, Pa, %, m/s²) |
| New biome seeds | ~48 (1 root universe Biome + ~8 tier Biomes + 39 leaf Biomes; per P11 + P16 — no Biorealm class, no `_defaults` siblings) |
| New tests | ~25 |
| Modified docs | 7 |
| New docs | 1 (biome.md) |

**Approx scope: 100+ files touched, 50+ new.** Multi-commit cycle of 8 wave-shaped commits is the right granularity.

---

## Recommended user-review surfaces before build starts

1. ~~**R1 (cellSize semantic shift)**~~ — **resolved** in requirements review: accept linear shift; re-pin light tests.
2. ~~**R6 (Map vs Record for detail-override storage)**~~ — **resolved**: accept Record relaxation.
3. **Async getter convention in Wave 3** — `getTemperature` etc. must be `async` because Zone.lookupField is async. **Lean async** — propagates cleanly to controllers (already async); alternative is sync getters + cached zone defaults at boot, but that adds invalidation complexity that fights requirements decision 7 ("no caching v1"). Confirm before Wave 3.
4. ~~**P11 (parent biomes vs Biorealm folders)**~~ — **resolved**: Biome extends Zone (parallel to Clade). Folder/leaf invariant applies to SpatialZone only, not taxonomic Zones. Every tier is itself a Biome; no per-tier Biorealms, no `_defaults` siblings.
5. **Wave 6 instrument-in-hand check** — small implementation choice. Plan tries `SlotApi.getWieldedItems` first; falls back to `giver.getContents().filter(MixinApi.isWieldable)` if the SlotApi helper doesn't exist. Build agent picks at write-time; no user input needed.