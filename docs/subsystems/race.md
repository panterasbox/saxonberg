# Race subsystem (v1)

The race subsystem describes who/what an in-world entity *is*,
biologically. It splits cleanly into:

- **Material** — what the bulk of an entity is *made of* (iron, oak,
  flesh).
- **Clade** — the taxonomic scope an organism *belongs to*
  (Animalia, Plantae, Fungi, Constructa).
- **BodyPlan** — the *anatomical layout* (unified `slots: SlotSpec[]`, locomotion modes,
  sensory ports) shared across many species.
- **Species** — the *biological capability* attached to membership
  in a species (binomial, lifespan, vision profile, sex-determination
  system, reproductive mode).
- **OrganismMixin** — runtime composition that says "this Stuff is a
  member of a Species."
- **SexedMixin** — biological sex (orthogonal to `GenderedMixin`).
- **SpeciesApi** — kingdom resolution, lifecycle predicates, the
  `isAnimate` predicate that gates command dispatch.

Three things are *deferred* — the design context lives here for the
follow-on builds:

- Death/resurrection flow (state-machine present, transition flow
  not). **The Vitals subsystem now owns the transition driver** (a
  fatal vital crossing its floor → `alive → dead`); race ships the
  state machine + `isAnimate` gating, Vitals drives it. The driver
  itself is deferred there too, but the seams (cause-of-death stamp,
  derived consciousness) ship. See [vitals.md](./vitals.md).
- Diet (`DietApi`, `Edible`, `Portable`) — the data is authored,
  but no consumer reads it yet.
- Tissue authoring (named Details with their own descriptions and
  materials) — **partly earned by Vitals**: `BodyPlan.bodyParts`
  carries typed `BodyPart` descriptors with per-part tissue
  composition (muscle / bone / flesh masses), the model layer for
  anatomy and the deferred strength substrate. See
  [vitals.md § Anatomy](./vitals.md). Genetics, per-individual feature
  mixins, polymorph, sleep/circadian, aging, character-creation UI
  remain deferred.

`OrganismMixin` (and Vitals / Reserved / anatomy) now compose at the
**`Creature`** layer — the body class between `Agent` and `Character`
(see [docs/architecture.md](../architecture.md)).

---

## Material substrate

`Material` is a singleton-by-templatePath `Idea` carrying physical
properties (density, hardness, opacity, conductivity, …) plus three
orthogonal layers of classification:

- **Tags** (`tags: string[]`) — free-form classification strings
  (`'metal'`, `'alloy'`, `'igneous'`, `'organic'`, `'fantasy'`).
  Vocabulary is not centrally registered; content devs introduce new
  tags as they need them. Used for educational filtering and any
  orthogonal grouping.
- **Composition** (`composition: { materialPath, fraction }[]`) — for
  mixtures and alloys, weight-fraction references to constituent
  Materials (steel → 0.998 iron + 0.002 carbon). `MaterialApi`
  recursively expands these to leaf-element symbol fractions, so
  "does this contain iron?" works regardless of how nested the
  alloy/mixture chain is.
- **Chemistry** — atomic-/molecular-level science data, decomposed
  into four flat scalar persistent fields per the scalar-default
  rule:
  - `symbol: string | null` (element-only)
  - `atomicNumber: number | null` (element-only)
  - `formula: string | null` (compound-only)
  - `molarMass: Quantity<'g/mol'> | null` (element-or-compound;
    round-trips through `QuantityMarshaller.pathFor('g/mol')`)

  Elements populate `symbol/atomicNumber/molarMass`; compounds
  populate `formula/molarMass`; mixtures leave all four unset and
  rely on the composition layer.

  `getChemistry` / `setChemistry` is a convenience aggregate over
  the four fields — `getChemistry` returns null when none are
  populated, otherwise returns an `ElementChemistry` view; the
  setter REPLACES the whole chemistry block (use the per-field
  setters for partial updates). See
  [quantities.md](./quantities.md) for the `Quantity<'g/mol'>`
  substrate.

Plus `biologicalSource: { speciesPath, tissueType } | null` for
organic materials linking back to a Species template (bidirectional
with `Species._defaultMaterialPath`).

### Capability mixins

Most classification is metadata — flat strings or refs. Some
classifications carry behavior. **`RadioactiveMixin`**
(`/lib/material/Radioactive.ts`) is the v1 demonstration of the
capability-mixin pattern:

```ts
export class RadioactiveMaterial extends RadioactiveMixin(Material) {}
```

The mixin adds `getHalfLife()`, `getDecayMode()` (alpha / beta-minus
/ beta-plus / gamma / spontaneous-fission / electron-capture), and
`getDecayProduct()` — a lazy cross-reference to the daughter
Material. Templates that need it use `class:
/lib/material/RadioactiveMaterial`; everything else stays on
`class: /lib/material/Material`. `MixinApi.isRadioactive(m)` narrows
the typed surface.

Why a mixin and not a tag: radioactivity carries non-trivial
behavioral surface (half-life arithmetic, decay chains, decay-mode
taxonomy) and is sparse — most materials aren't radioactive, and the
fields are meaningless on those that aren't. Future capability
mixins (`SuperconductorMixin`, `PiezoelectricMixin`, …) layer the
same way: one subclass per composed combination.

Phase-of-matter (`solid/liquid/gas`) is not a capability mixin —
it's state, not identity. Iron is solid at room temp, liquid at
1538 °C; the material's identity is invariant to state.

### `TangibleMixin` and per-Detail materials

`TangibleMixin` is composed onto every physical Stuff base —
`Thing`, `Location`, `Vessel`, `Agent`. State:

- `_materialPath: string | null` — bulk default Material's
  templatePath.
- `_detailMaterialPaths: Record<string, string>` — per-Detail
  Material overrides.
- `mass: Quantity<'kg'>` — the Stuff's mass. Round-trips through
  `QuantityMarshaller.pathFor('kg')`; setter is strict on
  `Quantity<'kg'>`. The kg marshaller absorbs YAML authoring shapes
  (numeric, tag string, alt-unit literal, JSON `{value,unit}`) at
  the persistence boundary.

`getMaterial()` resolves on each call via
`StuffApi.findByTemplatePath` — HMR-safe.

`MaterialApi.materialOf(stuff, detailKey?)` is the single dispatch
point for "what is this made of?" — returns the singleton if
Tangible, `null` otherwise.

`getMaterial(detailKey)` walks **longest dotted prefix first** down
to the bulk default — so a sub-detail without its own override
inherits whichever ancestor path most recently set one. Mirrors the
parent-then-child path convention `DetailedMixin` uses (`'blade.edge'`
is the edge of the blade).

```ts
axe.setMaterial(oak);              // bulk = oak
axe.setMaterial(iron, 'head');     // override on 'head'
axe.setMaterial(steel, 'head.edge'); // sub-override on the edge

axe.getMaterial();                 // → oak  (bulk)
axe.getMaterial('haft');           // → oak  (no override → bulk)
axe.getMaterial('head');           // → iron (exact)
axe.getMaterial('head.spine');     // → iron (no exact, inherits 'head')
axe.getMaterial('head.edge');      // → steel (exact)
axe.getMaterial('head.edge.tip');  // → steel (no exact, inherits 'head.edge')
```

`getMass()` returns the typed `Quantity<'kg'>`. The `weigh <target>`
verb (Balance instrument) reads it directly.

### v1 roster

Materials are organized under `/lib/material/<category>/...`.
Categories track everyday "what kind of stuff is this" rather than
a single science's classification — chemistry, biology, geology
all overlay via tags. Path depth varies by branch: shallow where one
level reads naturally; deeper when content earns it.

- `/lib/material/element/iron, copper, carbon` — pure elements
- `/lib/material/element/uranium` — `RadioactiveMaterial` (the
  capability-mixin demo)
- `/lib/material/alloy/steel` — Fe + C composition
- `/lib/material/rock/granite` — igneous; mineral composition unmodeled
  in v1
- `/lib/material/wood/oak` — once-living plant tissue
- `/lib/material/tissue/flesh, plant-tissue, fruit-flesh` — biological

These are leaf templates; Material isn't a folder class.

### `PropertiedMixin` and damage resistance

`Material`, `Species`, `BodyPlan`, and `Clade` all compose
`PropertiedMixin` (`SingletonMixin(PropertiedMixin(Idea))`); `Species`
additionally composes `VisibleMixin`, so it speaks the standard
`shortDescription`/`longDescription` surface (the old
`defaultDescription` was subsumed into `longDescription`). Most
fields stay first-class — they're part of the engine's vocabulary,
all instances have them, the schema is stable. But where the keys
are *content-defined* and the engine just stores/queries by name,
the property bag is the right home. Damage resistance is the v1
example:

```ts
material.setDamageResistance('slash', 0.7);   // → setProp('resistance.slash')
material.getDamageResistance('slash');        // → getProp('resistance.slash')

// Equipment / buff / curse can mask the effective value:
shield.maskProp(
  Property.of<number>('resistance.fire'),
  (_p, v) => v + 0.2,
);
```

Stored as `Property.of<number>('resistance.<damageType>')`. Damage
type vocabulary (`'slash'`, `'blunt'`, `'pierce'`, `'fire'`,
`'cold'`, …) is content-defined; the engine doesn't enumerate it.
Free as a side effect: `maskProp` lets equipment / buffs / curses
modify the effective resistance without touching the base, with
ownership-keyed unmask for clean removal.

The hydration story: PropertiedMixin reads `savedProps` from the
template's `data` block. `getProp` lazily auto-initializes prop
options on first read for hydrated entries, so seed YAML can
populate `savedProps: { "resistance.slash": 0.7 }` directly without
an explicit `initProp` call from the host.

### `MaterialApi` query surface

- `materialOf(stuff, detailKey?)` — the bulk + per-Detail lookup.
- `compositionOf(material)` — recursive weight-fraction expansion to
  leaf elements. A pure element returns `{ Fe: 1 }`; steel returns
  `{ Fe: 0.998, C: 0.002 }`; granite (no composition refs in v1)
  returns `{}`.
- `containsElement(material, symbol)` — "does this material's
  recursive composition contain element `symbol`?" Walks
  `compositionOf` and matches against leaf-element symbols.
- `findByTag(tag)` — every registered Material carrying the tag.
- `findByElement(symbol)` — every registered Material whose
  composition contains the element. Combines the above.

Future surfaces (`weightOf`, `flammabilityOf`, `canConduct`) land
as their consumers do. `damageResistance` is on `Material` directly
(see above) — when combat lands, it'll likely promote to
`MaterialApi.damageResistance(stuff, type, detailKey?)` threading
through `materialOf` for per-Stuff dispatch.

---

## Clade — taxonomic scope

`Clade extends Zone` (the *bare* `Zone`, not `SpatialZone`).
`ZoneApi.isFolderClass(/lib/species/Clade)` returns true (it extends
Zone), so taxonomic templates can hold descendants under the
folder/leaf invariant. `ZoneApi.isSpatialZoneClass` returns false
(Clade does NOT extend SpatialZone), so a species member's
`Stuff.zone` reads `null` rather than pointing at its kingdom —
kingdoms aren't spatial.

A Clade has a `name`, a `rank` (`'kingdom'` … `'species'`), and a
runtime-only `Set<Species>` of members. Members are populated as
Species singletons load.

**Sub-clade hierarchy is encoded in the template path itself**
(`/lib/species/animalia/chordata/mammalia/.../sapiens`). Each path
segment between the kingdom and the species leaf is a candidate
sub-clade; v1 ships only the four kingdom-rank Clades because that's
all `SpeciesApi.getKingdom` actually consults today, but any of the
intermediate path segments can hold a `/lib/species/Clade` template
the moment a content reason arrives — Phylum, Class, Order, Family,
Genus all plug in without a schema change. `SpeciesApi`'s walk
already iterates every ancestor segment looking for Clade
singletons; populating intermediate Clades is purely additive.

The four v1 kingdoms:

- `/lib/species/animalia` — Animalia
- `/lib/species/plantae` — Plantae
- `/lib/species/fungi` — Fungi (no v1 species)
- `/lib/species/constructa` — Constructa

Per-Clade defaults (e.g. "all Hominidae default to body plan X") are
deferred until a sub-clade lands and earns the inheritance machinery.

---

## BodyPlan — anatomy

`BodyPlan` is a singleton `Idea` declaring the physical anatomy:

- `bodyParts: BodyPart[]` — typed anatomical part descriptors (the
  model layer), declared once on the shared flyweight. Each part:
  `{ key, parent, tissues, enablesSlots?, governsVital?, severable?,
  innervatedBy?, suppliedBy? }`, with stable dotted `body.*` keys.
  Added by the Vitals build — the anatomy *site* + tissue/strength
  substrate. Instances carry only deltas; the resolver lives on
  `VitalsMixin`. See [vitals.md § Anatomy](./vitals.md).
- `slots: SlotSpec[]` — the unified slot universe. Each spec carries
  the canonical slot name (`hand:left`, `back:1`), the mixin an
  occupant must compose (`'WearableMixin'`, `'WieldableMixin'`,
  `'SlottableMixin'`), optional capacity, optional posture
  decoration, and optional user-facing detail keyword. Replaces the
  older `wornSlots: string[]` + `heldSlots: string[]` split (deleted
  outright in the embodiment MR — no shims). See
  [slot.md](./slot.md) for the SlotSpec shape.
- `locomotionModes` — short names of `LocomotionMode` singletons this
  body plan supports: `walk`, `climb`, `swim`, `fly`, … Drives the
  body-plan gate in `LocomotionApi.canTraverseExit`. v1 ships biped
  = `[walk, climb, swim]`, quadruped = `[walk, swim]`, sessile = `[]`.
  See [locomotion.md](./locomotion.md).
- `defaultLocomotionMode` — short name of the mode an organism of
  this body plan defaults to when `movement.defaultMode` isn't set
  (NPCs without `EnvironmentMixin`, fresh avatars). Layer 2 of the
  three-tier chain `LocomotionApi.defaultModeFor(actor)` consults
  (layer 1 is the explicit setting, layer 3 is universe `'walk'`).
  `null` for sessile body plans.
- `sensoryPorts` — anatomy only: `{ modality, count, position }`.
  Indexed against the perception substrate's
  `PerceptionApi.modalityByOrganKey` — `sensoryPort.modality` is the
  organ key (`'vision'`, `'hearing'`, `'smell'`, `'touch'`,
  `'taste'`). ESP modalities (`'verbal-esp'`, `'emotive-esp'`) are
  reserved values the substrate accepts but no v1 species declares —
  ESP capability arrives via augment-conferral instead (see
  [augmentation.md](./augmentation.md)). A future telepath species
  (magical empath, alien biological aether receiver) MAY declare an
  ESP modality on its BodyPlan; the substrate handles it.

The biped and quadruped body plans also declare a `cranial` slot
(`accepts: SlottableMixin`) — the v1 implant slot the baseline comm
implant occupies via `Avatar.enter`'s bootstrap. Sessile body plans
deliberately omit the cranial slot (plants don't get implants).
See [augmentation.md](./augmentation.md) for the full implant
substrate.

The unified slot universe lets all body-side affordances flow from
one declaration. A quadruped's `back:1` slot
(`accepts: 'SlottableMixin'`) is the slot a saddle's Wearable claim
targets and the slot a rider occupies bareback — same slot, two
consumers. `BodyPlanSlotsMixin` (Pattern B in slot.md) is the
sibling mixin Avatars / NPCs compose to expose the body-plan's
slots through their `Slotted` surface.

**Anatomy only.** Capability — vision range, hearing acuity, scent
acuity — does NOT live here. Humans, dwarves, elves, and orcs all
share the canonical `biped` body plan; their vision profiles differ
on the Species template.

v1 ships three body plans: `biped`, `quadruped`, `sessile`. The
sessile plan is the stand-in for organisms with no agency anatomy
(plants, corals) so `species.getBodyPlan()` never null-checks.

---

## Species — capability

`Species` is a singleton `Idea`. Carries:

- `binomial`, `commonNames`
- `shortDescription`, `longDescription` (from `VisibleMixin`) — the
  species' generic appearance, themed per species; subsumed the former
  `defaultDescription`
- `nameBankKeys` — references to `NameBank` Documents (in the
  `name_banks` collection) that feed the char-gen name suggester
  (`suggestName`/`rerollName`). See [char-gen.md](./char-gen.md).
- `_bodyPlanPath`, `_parentCladePath`, `_defaultMaterialPath` —
  cross-references to BodyPlan, Clade, Material
- `lifecycleStates` — the species' valid set
  (e.g. `['alive', 'dead', 'undead']`)
- `sexDeterminationSystem`, `reproductiveMode`
- `lifespanMin`, `lifespanMax`
- `circadianBand`
- `diet` (DietApi-deferred)
- `visionProfile` — flat 3-scalar record consumed by `VisionModality`

The v1 acceptance roster (`/lib/species/...`). The char-gen Wave 1 build
expanded the `homo` genus to seven playable humanoid species:

| Path | Body plan | Kingdom | Notes |
|---|---|---|---|
| `animalia/.../homo/sapiens` | biped | Animalia | Human reference. |
| `animalia/.../homo/khazadicus` | biped | Animalia | Dwarf — scotopic-shifted vision, 400-yr lifespan. |
| `animalia/.../homo/draconicus` | biped | Animalia | Dragonborn (char-gen). |
| `animalia/.../homo/eldarinus` | biped | Animalia | Elf (char-gen). |
| `animalia/.../homo/infernalis` | biped | Animalia | Tiefling (char-gen). |
| `animalia/.../homo/periannath` | biped | Animalia | Halfling (char-gen). |
| `animalia/.../homo/semiorcus` | biped | Animalia | Half-orc (char-gen). |
| `animalia/.../lithobates/catesbeianus` | quadruped | Animalia | American bullfrog — non-mammal entry. |
| `plantae/.../spathiphyllum/wallisii` | sessile | Plantae | Peace lily; monoecious. |
| `constructa/metallica/tutor-bot/mk-iv` | biped | Constructa | Robot — `lifecycleStates: powered/unpowered/destroyed`, `sexDeterminationSystem: 'none'`. |

---

## OrganismMixin — runtime biology

Composing `OrganismMixin` declares: "this Stuff is a member of a
Species, with biological state." The mixin carries:

- `_speciesPath: string | null` — cross-reference to Species
- `age: number`
- `lifecycleState: string` — initial value from the leaf template's
  `data`

`OrganismMixin` is composed:

- Via `Character` — every Avatar is an Organism. Inserted between
  `NamedMixin` and `GenderedMixin` in the composition chain.
- Via concrete plant/NPC subclasses — a houseplant Thing composes
  Organism on its own class.

Detached tissue is **NOT** an Organism. The apple-on-the-ground case
is `Tangible` (made of fruit-flesh) but not Organism — its parent
tree is the organism, the apple is bulk material.

`getSex()` returns `null` by default; when the host also composes
`SexedMixin`, that mixin's override shadows the default through the
standard mixin chain.

---

## SexedMixin — biological sex

`SexedMixin` is biology, not gender. The two compose orthogonally:

- A frog NPC composes `OrganismMixin + SexedMixin` (no gender
  surface — frogs have no pronouns).
- A human Avatar composes `OrganismMixin + SexedMixin +
  GenderedMixin` (sex from biology, pronouns from social
  presentation).

The valid sex set is read from the host organism's species'
`sexDeterminationSystem`. The lookup table:

| System | Valid set |
|---|---|
| `xy`, `zw` | `male`, `female`, `intersex` |
| `environmental`, `haplodiploid`, `dioecious` | `male`, `female` |
| `hermaphroditic-simultaneous` | `hermaphrodite` |
| `hermaphroditic-sequential` | `male`, `female`, `hermaphrodite` |
| `monoecious` | `male-and-female` |
| `none` | (empty — every set call rejects) |

`setSex(value)` rejects values outside the set. `setSex(null)` always
clears the value.

---

## SpeciesApi — dispatch surface

The single entry point for "what is this Organism, biologically?":

- `getKingdom(o)` — walks the species' templatePath ancestors to
  find the rank-`'kingdom'` Clade.
- `isInKingdom(o, name)` — convenience wrapper.
- `isAlive(o)` / `isDead(o)` / `isUndead(o)` / `isPowered(o)` /
  `isDestroyed(o)` — lifecycle predicates.
- `isAnimate(o)` — the load-bearing predicate. Composes kingdom +
  lifecycle state per the slate's table:

| Kingdom | Animate when |
|---|---|
| Animalia | `lifecycleState ∈ {alive, undead}` |
| Constructa | `lifecycleState === 'powered'` |
| Plantae / Fungi | never (no Agent surface in v1) |

Non-Organism Stuff is never animate. `isAnimate` is what the
verb-level `requires-animate` validator reads.

---

## Animacy gating at the command layer

YAML commands carry an optional top-level `validators: []` array.
Verb-level validators fire **before** field validators with
`context.commandGiver` populated, and short-circuit on the first
failure. The shape:

```yaml
verbs: [say, "'"]
controller: SayController
description: "Say something to everyone in your location"
validators:
  - /lib/command/validators/requiresAnimate
args:
  - name: message
    type: string
    required: true
    greedy: true
```

A `CommandValidator` is a sync `(context: CommandContext) => string |
undefined` — distinct from the field-level
`(value, field, context) => …`.

`requiresAnimate` also declares an async `preload` hook that runs
before the sync validator phase. The preload reads the giver's
raw `_speciesPath` field (not `getSpecies()`, since that uses
`findByTemplatePath` which would return null for the very
singleton we're about to ensure) and calls `StuffApi.singleton(...)`
for the species template AND every ancestor in the kingdom walk.
Ancestor segments without a seeded template (e.g.
`/lib/species/animalia/chordata/mammalia` is a folder rather than
a Clade leaf) are tolerated — the singleton-not-found error is
swallowed, and `SpeciesApi.getKingdom`'s null-tolerant ancestor
walk takes it from there.

This is what lets Clade singletons NOT be bootstrapped: the verb
dispatch that actually needs them ensures them on-demand, and
subsequent dispatches reuse the cached clones. See
[command-routing.md § Validator preload phase](./command-routing.md#validator-preload-phase).

v1 tags `requiresAnimate` on self-action verbs:

- `say`, `tell`, `go`, `get`, `drop`, `open`, `close`, `inventory`

It does **not** tag passive/meta verbs:

- `look`, `help`, `ping`, `alias`, `var`, `settings`, `player`,
  `focus`

Future verb-level validators (`requires-mobile`, `requires-vocal`,
`requires-hands`) plug into the same machinery.

---

## Cross-references

Race-build cross-references (`OrganismMixin._speciesPath`,
`Species._bodyPlanPath`, `Species._parentCladePath`,
`Species._defaultMaterialPath`, `TangibleMixin._materialPath`) all
follow the same locked shape:

- The persistent field is the **path string**, not a serialized
  instance.
- The getter resolves on each call via `StuffApi.findByTemplatePath`
  — sync, HMR-safe, no instance cache.
- The setter accepts the resolved Stuff (or `null`) and stores
  `value?.getTemplatePath() ?? null`.
- No marshaller required — the persistent value IS a string.

This rules out the older marshaller-with-cached-instance pattern
(e.g. `Containable.environment`) — that pattern would break HMR
replacement of singletons.

---

## Future seams

- **Per-species breathing.** A future build will gate movement /
  damage-over-time on a species' compatibility with the surrounding
  atmosphere medium. The biome substrate already resolves the
  current atmosphere via `BiomeApi.resolveAtmosphereFor(scope)`
  ([biome.md](./biome.md)); the species side will add either a
  per-Species `breathableAtmospheres: Set<string>` field or a
  per-atmosphere `breathers` map, alongside the consumer that
  enforces it. Out of scope for v1 — the seam is documented here
  so authoring decisions about atmosphere tags can already account
  for it.

## See also

- [templates.md](./templates.md) — folder/leaf invariant, the
  `ZoneTemplate` / `LeafTemplate` split, `ZoneApi.isFolderClass`.
- [spatial.md](./spatial.md) — `Zone` / `SpatialZone` layering;
  `ZoneApi.resolveZoneForPath`; null-environment behavior matrix.
- [biome.md](./biome.md) — atmospheric substrate + outward-walking
  chain resolver. Material's prefix-walk shape is the direct prior
  art that `AtmosphericMixin`'s detail walk mirrors.
- [perception.md](./perception.md) — viewer-aware queries; species
  visionProfile feeds `VisionModality`.
- [mixins.md](./mixins.md) — composition mechanics for the new
  mixins.
- [quantities.md](./quantities.md) — `Quantity<U>` substrate;
  `Material.density` (`Quantity<'kg/m³'>`), `Material.molarMass`
  (`Quantity<'g/mol'>`), `TangibleMixin.mass` (`Quantity<'kg'>`).
- [roadmap.md](../roadmap.md) — v1-deferred work (death/resurrection
  flow, DietApi, tissue authoring at the Detail level, sleep,
  polymorph, genetics, character-creation UI). Each will land with
  its own fresh slate when the build starts.
