# Race subsystem (v1)

The race subsystem describes who/what an in-world entity *is*,
biologically. It splits cleanly into:

- **Material** — what the bulk of an entity is *made of* (iron, oak,
  flesh).
- **Clade** — the taxonomic scope an organism *belongs to*
  (Animalia, Plantae, Fungi, Constructa).
- **BodyPlan** — the *anatomical layout* (slots, locomotion modes,
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
  not).
- Diet (`DietApi`, `Edible`, `Portable`) — the data is authored,
  but no consumer reads it yet.
- Per-Detail materials, tissue authoring, genetics, per-individual
  feature mixins, polymorph, sleep/circadian, aging,
  character-creation UI.

---

## Material substrate

`Material` is a singleton-by-templatePath `Idea` carrying physical
properties (density, hardness, opacity, conductivity, …) plus
edibility/nutrient/toxicity tags reserved for the future DietApi.

`TangibleMixin` is composed onto every physical Stuff base —
`Thing`, `Location`, `Vessel`, `Agent`. The mixin's only state is
`_materialPath: string | null` (the canonical
[cross-reference shape](#cross-references)). `getMaterial()` resolves
on each call via `StuffApi.findByTemplatePath` — HMR-safe.

`MaterialApi.materialOf(stuff)` is the single dispatch point for
"what is this made of?" — returns the singleton if Tangible, `null`
otherwise. v1 ships *bulk-only* (one Material per Stuff); per-Detail
materials (the wood haft vs iron head of an axe) are deferred.

The v1 roster (`/domain/material/<x>`):

- `iron`, `steel`, `copper` — metals
- `granite` — stone
- `oak` — dead wood
- `flesh` — animal tissue
- `plant-tissue` — living plant
- `fruit-flesh` — sugary plant tissue (an apple)

These are leaf templates; Material isn't a folder class.

---

## Clade — taxonomic scope

`Clade extends Zone` (the *bare* `Zone`, not `SpatialZone`). Joins
`FOLDER_CLASS_PATHS` so taxonomic templates can hold descendants;
deliberately stays out of `SPATIAL_ZONE_CLASS_PATHS` so a species
member's `Stuff.zone` reads `null` rather than pointing at its
kingdom (kingdoms aren't spatial).

A Clade has a `name`, a `rank` (`'kingdom'` … `'species'`), and a
runtime-only `Set<Species>` of members. Members are populated as
Species singletons load.

v1 ships kingdom-rank Clades only:

- `/obj/species/animalia` — Animalia
- `/obj/species/plantae` — Plantae
- `/obj/species/fungi` — Fungi (no v1 species)
- `/obj/species/constructa` — Constructa

Sub-clades, family ranks, and per-Clade defaults (e.g. "all Hominidae
default to body plan X") are deferred until a content reason for them
arrives.

---

## BodyPlan — anatomy

`BodyPlan` is a singleton `Idea` declaring the physical anatomy:

- `wornSlots` — the universe of equipment positions a member can fill
- `heldSlots` — prehensile slot names; drives `Wieldable` capacity
- `locomotionModes` — `walk`, `fly`, `swim`, `burrow`, `crawl`,
  `climb`, …
- `sensoryPorts` — anatomy only: `{ modality, count, position }`

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
- `_bodyPlanPath`, `_parentCladePath`, `_defaultMaterialPath` —
  cross-references to BodyPlan, Clade, Material
- `lifecycleStates` — the species' valid set
  (e.g. `['alive', 'dead', 'undead']`)
- `sexDeterminationSystem`, `reproductiveMode`
- `lifespanMin`, `lifespanMax`
- `circadianBand`
- `diet` (DietApi-deferred)
- `visionProfile` — flat 3-scalar record consumed by `LightApi`

The v1 acceptance roster (`/obj/species/...`):

| Path | Body plan | Kingdom | Notes |
|---|---|---|---|
| `animalia/.../homo/sapiens` | biped | Animalia | Human reference. |
| `animalia/.../homo/khazadicus` | biped | Animalia | Dwarf — scotopic-shifted vision, 400-yr lifespan. |
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
  `NamedMixin` and `GenderedMixin` (slate-locked composition order).
- Via concrete plant/NPC subclasses — a houseplant Thing composes
  Organism on its own class.

Detached tissue is **NOT** an Organism. The apple-on-the-ground case
is `Tangible` (made of fruit-flesh) but not Organism — its parent
tree is the organism, the apple is bulk material. This is the
slate-locked "tissue is not an organism" rule.

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

## See also

- [zones-slate.md](../zones-slate.md) — zone/template refactor that
  this subsystem builds on.
- [race-slate.md](../race-slate.md) — the locked design slate.
- [templates.md](./templates.md) — folder/leaf invariant, the
  `ZoneTemplate` / `LeafTemplate` split.
- [spatial.md](./spatial.md) — `Zone` / `SpatialZone` layering.
- [perception.md](./perception.md) — viewer-aware queries; species
  visionProfile feeds `LightApi`.
- [mixins.md](./mixins.md) — composition mechanics for the new
  mixins.
