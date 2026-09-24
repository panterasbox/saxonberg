# Ground — implementation plan

Executes [ground-requirements](../requirements/ground-requirements.md).
**Kind: feature — substrate, and a live defect fix. Leads from: kernel**, and
its first consumers already shipped and are broken: `sit`, `lie` and `kneel`
decline in the room a new player opens their eyes in. This plan gives every
Location a floor by construction, makes the floor answer *what am I standing
on* through a closed kind vocabulary that is **derived, never chosen**,
closes the residency gap the docs already promise is closed, and moves the
strata and the surface character out of two trades into one system pack,
`/system/ground`, so `dig` (the extraction build) has something to dig.

Grounding brief: `~/.claude/jobs/608a7a77/tmp/ground-grounding.md` (measured
2026-09-23; condensed below — every fact carries a path).

---

## Grounding

Verified this cycle by opening files and by driving the game.

### The defect, driven

Fresh world, brand-new character, the Lounge (`defaultStartLocation` →
`/world/lounge/idea/warren`): `sit`/`lie`/`kneel` → `empty-result[target]`;
`look ground`/`look floor` → `empty-result[target]`; `sit on ground` →
`command-rejected: shape-fall-through`; `stand` → ok. Three of twelve
reachable things in that room render as *"something"* — not this build's.

### A. `adornments:` is already on every Location, and it is the lounge's only lever

- `lib/stuff/Location.ts:45-46` — `AddressableMixin(AmbientLitMixin(AtmosphericMixin(AdornableMixin(ContainerMixin(Stuff)))))`.
  Location is **deliberately not Tangible** (`:32-35`, *"space, not matter"*).
  It does **not** compose `PostRegistrationMixin`; `world/lounge/location/Lounge.ts:36-37`
  says so in words — *"per class because `Location` does NOT carry it"*.
- `lib/boundary/Adornable.ts:113` — `adornments: { instruction: true, authorable: true }`;
  `AdornmentSpec = string | { template, slot }` (`:69`). `applyAdornments`
  (`:155-171`) **clones every time with no once-guard and no clear**; the
  docstring claims *"re-runs and rebuilds"* but the code only adds.
  `captureSlice` (`:138-146`) **captures nothing** — fixtures cost nothing
  on disk. `addFixture(f, slotName?)` keys `fixture:N` unless named.
- ⚠ `props:` is `PopulatesMixin` (`lib/stuff/Populates.ts`), **per class**,
  guarded by persistent `_propsPopulated` (`:168-184`). `Lounge` does not
  compose it, so `props:` on `lounge.yaml` would throw at
  `PersistentHydrator.ts:130`. The Lounge's rooms are **warren-minted**
  (`world/lounge/idea/LoungeWarren.ts createMember` → `StuffApi.clone` of the
  one `Lounge` row; `api/stuff.ts:599` hydrates `template.data` on every clone).
- Six YAML files use `adornments:` today; five attach the five non-default floors.

### B. The floor rows

All six `class: /platform/thing/Floor`, hydrator `PersistentHydrator`. **None
authors `_materialPath`** (the live key — 211 rows use it; `material:` is
dead, 3 stray rows). `Floor` (`platform/thing/Floor.ts`) =
`BulkableMixin(PosturedMixin(SlottedMixin(AdornmentMixin(DetailedMixin(VisibleMixin(Thing))))))`
with **zero defaults**: no slots, no material.

| row | file | keywords | slot | material |
|---|---|---|---|---|
| `default-floor` | `generic-objects/content/stuff/thing/surface/default-floor.yaml` | `[floor, featureless, plain]` ⚠ no `ground` | `ground:1` ×4 | — |
| `forge-floor` | `hearthworks/…/thing/forge-floor.yaml` | `[stone, floor, ground]` | ⚠ **none** | — |
| `weeping-floor` | `world-seed/content/world/moor/weeping-floor.yaml` | `[flagstones, wet]` ⚠ neither | `ground:1` ×4 | — |
| `heath-floor` | `world-seed/…/moor/heath-floor.yaml` | `[ground, sodden, peat]` | `ground:1` ×4 | — |
| `brine-floor` | `world-seed/…/practicum/brine-floor.yaml` | `[floor, brine-flooded, stone]` | `ground:1` ×4 | — |
| `flooded-floor` | `world-seed/…/substation/flooded-floor.yaml` | `[floor, flooded, concrete]` | `ground:1` ×4 | — |

`default-floor.yaml:4` documents a `noDefaultFloor: true` opt-out **read by
no code** (0 hits in `packages/`; `posture.md:104`, `spatial.md:682` repeat
it). Nothing attaches `default-floor`. Slot shape pinned by
`lib/slot/__tests__/Floor.test.ts`: `{ name:'ground:1', accepts:'SlottableMixin',
capacity: UNBOUNDED_CAPACITY, postures:[sit,lie,kneel,stand], userFacingDetail }`.

### C. The binder and the resolve, traced

- ⚠⚠ **A detail's authored `keywords:` never enter the resolve pool — settled
  fact, not a decision.** `api/mql/scope-walk.ts:302` pools a thing's own
  candidate from `stuff.perceivedKeywordsFor(viewer)`, which
  `RecognitionLogic.ts:479-484` answers with `target.getKeywords()` for any
  non-persona Perceptible; `scope-walk.ts:344-372 pushDetails` emits one
  candidate per detail **id** with `keywords: [id.toLowerCase()]` — *"keyword
  pool for a detail is just its id list"* (`:360-363`); `resolver.ts:1658
  keywordsOf` is `getKeywords()` again. So `default-floor` offers exactly
  `floor`, `featureless`, `plain` (and the detail id `floor`); its detail's
  `ground` is dead. ⇒ **Attaching the row everywhere fixes `look floor` and
  leaves bare `sit`/`lie`/`kneel` broken** — the defect that opened the cycle
  would survive a green census. `heath-floor.yaml` (`[ground, sodden, peat]`)
  is the one row that already does it right; `weeping-floor` has neither
  `floor` nor `ground`. Because the pool is read through `getKeywords()`, a
  class-level override is what the walk sees (D3).
- `CommandLogic.ts:2574-2576` — an arg `default:` is shell-expanded and lands
  in `model.target` as typed text; MQL runs later with `requires:` filtering.
- `CommandLogic.ts:2392-2402` — a preposition is consumed only when
  `def.prepositions` is non-empty; else `on` binds as the target and the
  leftover trips `:2547-2550` *"too many arguments"* → chain fall-through.
- `api/mql/desugar.ts:126` — `GrammarApi.ARTICLES` are dropped, so a greedy
  `"the ground"` reaches the keyword match as `ground`.
- Views: `platform/content/platform/cmd/posture/{sit,lie,kneel}.yaml` —
  `target: { required: true, default: "ground", scope: ["$focus","reachable"],
  requires: [VisibleMixin, PosturedMixin] }`, no `prepositions`, no `greedy`.
  `stand.yaml` — `required: false`, no default. Precedents:
  `inventory/put.yaml:33 prepositions: [in, on]`; `charactergen/enroll.yaml:25 greedy: true`;
  `perception/search.yaml` — `prepositions: [in, inside, through]`, `requires: any`.
- `Posed.transferPosture` (`lib/character/Posed.ts:246-289`) returns
  `no-posture-slot` / `occupied` / `transfer-failed`; `SitController` has no
  implicit-ground fallback.
- Fixtures are in reach: `PerceptionLogic.ts:329-333`, `:392-393`,
  `validators/mustBeInLocation.ts:43-47`.

### D. Material: what exists, what is missing

- `lib/material/Material.ts` — `tags: string[]` (`:613`), `getTags/hasTag/setTags`
  (`:1078, :1139`, validates nothing). The vocabulary is documented **open**
  at `:20-25` and **closed** at `:1113-1117` (the corrosion fold reads it).
- Numeric fields: `hardness` MPa, `electricalConductivity` S/m,
  `waterAbsorptionCapacity` %, `density`. `granite.yaml` tags
  `[rock, igneous, mixture, crystalline, felsic]`, hardness 200; `slate.yaml`
  (`rock/slate`) is the row shape to copy. `iron` `[element, metal, …]`;
  `ceramic` `[ceramic, mineral, solid, brittle, fired]`; `glass`
  `[glass, amorphous, solid, brittle]`; `rubber` `[organic, elastomer, …]`;
  `potting-soil` `[granular, solid, soil, growing-medium]`.
- ⚠ **No soil material exists**: the tree has `bulk/{potting-soil,compost}`
  and no loam, sand, clay, peat, gravel or concrete. `wool.yaml:9-11` states
  the doctrine — *"a material must not assert a CONSTRUCTION"* — so *set vs
  living* cannot live in the material.
- `lib/material/Tangible.ts:149-150` — `_materialPath: { persistent, authorable,
  authorPicker: 'Material' }`; `getMaterial(detailKey?)`, `setMaterial(value, detailKey?)`.
- `MaterialCatalogue.warm` selects by the `/idea/material/` infix + class, so
  a new `earth/` subdirectory is warmed with no list edit (CLAUDE.md).

### E. Residency: the promised veto does not exist

- `docs/subsystems/residency.md:218` — *"`Exit` / `Adornment` | its source room
  / wall is alive"*. `lib/boundary/Exit.ts:238-246` exists;
  **`lib/boundary/Adornment.ts` has no `canEvict`** (0 hits). `Stuff.canEvict`
  (`Stuff.ts:1239`) defaults `{ ok: true }`. `WarrenMember.ts:78-83` is the
  mixin-shaped precedent.
- `ResidencyLogic.ts:126-158 presenceWalkImpl` touches the room and
  `getDeepContents()`; fixtures are not contents (`Adornable.ts:84-90`), so
  **presence cannot keep a floor warm**. Mode ships `observe`
  (`readEvictionMode`, `AppSettingKeys.residencyEvictionMode`), so latent.

### F. `GroundCharacter` and `Deposit`

- `trade-farming/src/idea/GroundCharacter.ts` — imports 4 kernel symbols
  (`Idea`, `StuffApi`, `FieldMeta`, `Seeded`), nothing from farming.
  Statics: `seedFor`, `forZone` (the one place the `groundCharacter` citation is
  followed), `resolve(model|null, spot, seed)` (⭐ total — `null` model is
  procedural), `procedural`, `improvementCost`, `waterHoldingFactor`,
  `leachFactor`, `poachingFactor`, `lookPhrase`, `ribbonPhrase`. Exports
  `TEXTURE_CLASSES` (6, closed), `GroundSample`, `ImprovementCost`.
- Importers: `trade-farming/src/{location/Field.ts, lib/Improvable.ts (type
  ImprovementCost), idea/cmd/farming/{PlotController,FieldWorkController}.ts,
  idea/cmd/perception/{MeasureTexture,SoilChannel,AnalyzeSoil}Controller.ts}`.
  Rows naming the class: `eternal-university/…/campus-field/idea/ground.yaml:34`,
  `hearts-delight/…/bench-field/idea/ground.yaml:19`. Pinned string:
  `eternal-university/src/__tests__/campus-farm.test.ts:129`. Comment-only
  mentions: `trade-ranching/src/lib/HeadSeed.ts`, `water/src/idea/Watercourse.ts`,
  `trade-forestry/src/location/Wood.ts`, `lib/zone/SpatialZone.ts`, `lib/Seeded.ts`.
- `trade-mining/src/idea/Deposit.ts` (699 lines) — `StratumBand { toZ, host }`,
  `hostAt(z)` (`:484`), `sampleAt` bounded at the collar (`:346`). Position
  reads on `trade-mining/src/lib/Working.ts:378-425` (`getCell`, `metresOf`,
  `getDeposit` via `zone.lookupField('deposit')`, `getGroundSeed`, `sampleHere`).
  Row: `rejection/…/idea/deposit/ferrow.yaml:28 class: /trade/mining/idea/Deposit`,
  hosts `rock/slate` to −60, `rock/granite` to −400.
- `lib/zone/SpatialZone.ts:49-50` — `deposit` and `groundCharacter` are
  `{ persistent, authorable }` strings the kernel interprets nowhere.
  `Zone.lookupField<T>(name)` is the ancestor walk; ⚠ read citations through
  it, never a getter.
- `lib/Seeded.ts` — the shared hash/mix primitive both models already use.

### G. Three "what am I standing on" resolvers, all keyed on `hasSurfaceBulk()`

`ElectricityLogic.ts:188-200 findFloor`, `BulkableLogic.ts:435-453 floorSurfaceNear`
(+ `:420-428 floorPuddleSummary`), `WeatherLogic.ts:805-822 findRoomFloor`.
Each scans fixtures **then contents** for a Bulkable with a surface slot. ⚠
**No non-Floor row in `packages/content` has `surfaceBulk: true`** (verified),
so the contents scan is dead. `floorConducts` (`ElectricityLogic.ts:174`) reads
`floor.getMaterial()`, which no row authors — dead today.

### H. Pipeline and lifecycle facts the mechanism rests on

- `api/stuff.ts:360-376` — clone pipeline: construct → stamp zone → **register
  → hydrate → `postRegister`** (if the class composes `PostRegistrationMixin`).
  `StuffApi.create` runs the same tail without hydration.
- `lib/stuff/PostRegistration.ts:44-52` — the default `postRegister` is a
  **non-chaining no-op**; a second composition above the base swallows the
  base's. ⚠ `CartesianLocation.ts:130-132`, `SphericalLocation.ts:39`,
  `Lounge.ts:59` override **without `super.postRegister()`**.
  `Persistable.ts:340-345` and `Working.ts` optional-chain `super`.
  Composers today: `CartesianLocation`, `FurnishableRoom`, `SphericalLocation`,
  `Offstage`, `CircleFloor`, `Lounge`. Not: `VoidLocation`
  (`SingletonMixin(Location)`), `SingletonCartesianLocation` (inherits CL).
- `TemplateLogic.ts:342 restoreFromTemplate` re-runs `hydrator.hydrate` on a
  live clone → `applyAdornments` re-adds every authored fixture (pre-existing).
- `BiomeLogic.ts:499-525 isSkyExposed(scope)` — outward walk to the nearest
  Atmospheric with a biome; **`false` when no biome resolves** (the Lounge).
- `lib/location/CartesianCoordinates.ts:35 getCoordinates(): [x,y,z]`;
  `Working.metresOf` multiplies by `zone.getCellSize()`.
- `WeatherLogic.ts:826-831` — a material path read from a **dial**
  (`AppSettingKeys.stormPuddleFreshWaterMaterialPath`, seeded literal
  `/stuff/idea/material/bulk/water`) — the precedent for a kernel default naming a row.
- `lib/description/Visible.ts:85-130` — `getMarkupLong` runs every mixin's
  `static markupAugmenters`; `trade-forestry/src/lib/Stand.ts:200-230` is the
  *"read by look in words"* exemplar (`standAugmenter`, `MixinApi.isActive`).
- `lib/slot/Slotted.ts:257-281` — `staticSlots` field; `getSlotNames/getSlotSpec`
  read it and are **overridable** (`:114`).
- `lib/mixin.ts:236-237, :305` (`Mixins.Adornable/Adornment/Postured`),
  `:604 MixinRefusals`; `api/mixin.ts:1470 isPostured` shape.
- `packages/server/scripts/check-lib-statics.ts:55` — ceiling **337**; ⭐
  statics inside a mixin factory's returned class are **out of scope**.
- `scripts/check-presentation.ts` — the gate shape to copy (`*_CEILING` const
  with history docblock, `packSources()`, `--report`/`--lint`, no mudlib import).
  `scripts/check-descriptor-banks.ts:295-307` — the written refusal of a
  prose-matching gate. `scripts/check-template-census.ts` clause (b) lists the
  template-path fields it resolves (`adornments` included; a nested
  `floor.material` is not).
- `scripts/check-mud-imports.ts:210-214` — a pack imports another pack's `src/`
  iff `package.json` declares it. `packages/server/package.json:7`
  `"./mud/lib/*"` is exported, so `@saxonberg/server/mud/lib/ground/GroundSource` resolves.
- `PackLogic.discover.test.ts:63` — `toHaveLength(48)`; ordering claims below.
- Water pack skeleton: `packages/content/water/{pack.yaml,package.json,tsconfig.json,vitest.config.ts}`;
  `content/settings/water.yaml` (the `settings` kind, merge-missing).
- Wire harness: `packages/wire/tests/pets.wire.test.ts` — `declareFile({file, packs})`,
  `Session.open(uniqueHandle(..), { startLocation })`, `plain`, `expectRefused`,
  `expectNote`. build-2 runs `WIRE_PORT=2013` (`docs/testing.md:685-690`).
- Void row: `platform/content/platform/location/void.yaml` (`VoidLocation`).
- Road rooms: `terminus/…/university-avenue/location/crossing.yaml`
  (`class: /platform/location/Crossing`; room detail `street` has keyword
  `stone`), `terminus/…/market/square.yaml`, `terminus/…/goods-yards/yard.yaml`
  (room detail `gutter`), `hinkley-hills/…/location/lane.yaml` + `lots/road-segment.yaml`.
  `platform/location/Crossing.ts extends SingletonCartesianLocation`.

### The census, measured (list 2's opening ceiling)

184 Location rows · 69 make a ground claim in prose · 8 reference a floor ·
**64 claim with nothing backing** · claim words: floor 27, boards 10, dust 10,
earth 8, grass 8, mud 4, underfoot 4, rug 3, carpet 3, concrete 3, tile 3,
flagstone 3, cobble 2, gravel 2, sand 2, turf 2, tiled 2, paving 1, dirt 1.
`seznick-house/main` claims boards **and** earth. Rugs/carpets are coverings,
`dust` is a state.

---

## Plan-level decisions

**D1 — Every Location gets a floor at `postRegister`, by the base class.**
`PostRegistrationMixin` moves **down into `Location`'s base stack** (the
`AmbientLit` precedent — inert by default) and is **removed** from the six
classes that compose it above (`CartesianLocation`, `FurnishableRoom`,
`SphericalLocation`, `Offstage`, `CircleFloor`, `Lounge`) because the mixin's
default no-op does not chain (Grounding H). `Location.postRegister()` calls
`ensureFloor()`; every override that exists today gains
`await super.postRegister(context)`. This is the one lifecycle every clone
**and** every `create` passes through, so a warren-minted Lounge room gets its
floor from the same line an authored room does. Rejected: `props:` (per-class,
throws on the Lounge); a Hydrator hook (fires only on a present key); lazy mint
on read (the binder's scope walk is synchronous and never asks).

⚠⚠ **D1a — and it must answer to
[hydration-framework-slate](../slates/builds/hydration-framework-slate.md),
which is ratcheting `postRegister` DOWN.** (Raised by the user at plan review.)
That slate exists because of this instruction, quoted in it verbatim:

> *"the point was to use a common framework for all that 'hydration step' logic
> and keep `postRegister` for actual post-hydration stuff not just 'finish
> hydrating'."*

Its **Left** opens with *"the census + ratchet on the `postRegister`
implementations that load state (63 → 67, ungated)"*. So D1 owes an answer, and
the answer is that **`ensureFloor` is not one of them**, on both the letter and
the spirit:

- **The letter.** The census script greps a `postRegister` body for
  `\.find\(|findByScope|hydrate|rebuildIndex|warm\(|restore|load`.
  ⚠ **`ensureFloor` must be written so it matches none of them** — clone the
  template and attach the fixture; resolve the material ladder **lazily inside
  `FloorMixin.getMaterial()`** (D8/D9 already put it there), never eagerly in the
  hook. If a later edit pulls a `findByTemplatePath` into the hook's body, the
  ratchet's number moves and this decision is void.
- **The spirit.** The slate's ruling splits two cases — *finishing hydration*
  (a host filling in **its own state**, keyed on its own identity) and *warming a
  roster* (a singleton reading a collection that is nobody's per-instance state).
  ⭐ **`ensureFloor` is neither: it constructs a companion object the world
  requires, and loads nothing.** It is the same act as `Lounge.postRegister`'s
  `verifyOutboundExits()` — structural completion, which is exactly what the
  slate wants `postRegister` **kept for**.

⭐ **A contribution back to that slate, recorded there too:** its taxonomy has
two limbs and needs a third — **structural completion** — or every honest use of
the hook reads as a census entry. ⚠ **And one coordination note for it:** after
this build the **entire Location tree depends on base-level `postRegister`**, so
a hydration build that changes how the hook is composed or invoked has one more
consumer, at the root of the biggest class family in the game.

**D2 — `ensureFloor()` is idempotent and authored-wins.** If `getFloor()`
already answers (an `adornments:` row hydrated before `postRegister`), do
nothing but resolve its ladder; if `noDefaultFloor: true`, do nothing; else
clone `TemplatePaths.DefaultFloor` (`/stuff/thing/surface/default-floor`),
apply the Location's `floor:` spec (D6), attach with slot name `floor`, resolve
the ladder. No room ever holds two.

**D3 — `ground` and `floor` are keywords by construction, and a gate holds
it.** Grounding C is the whole reason: the resolve pools `getKeywords()` and a
detail's keyword list is never consulted, so the fix is on the floor's **own**
keyword set — one word, and it must never be forgettable. Three layers, each
independently sufficient:
1. `FloorMixin.getKeywords()` unions `['floor','ground']` over the authored
   list (the walk reads it through `perceivedKeywordsFor` →
   `RecognitionLogic.ts:484` → `getKeywords()`, verified) — a new floor row
   that forgets the word still sits;
2. `default-floor.yaml` and `weeping-floor.yaml` author the words anyway (a
   row should read honestly on its own, and the census re-fold is static);
3. **`lint:ground` clause (d)**: every row whose `class:` resolves to a class
   composing `FloorMixin` carries `ground` **and** `floor` in its own
   `keywords:` — the `heath-floor` precedent made mechanical. In scope: it is
   one YAML read inside a gate this build already writes.
The requirements' *"`sit` still means sit on the ground here"* rests on this
line and on nothing else in the build.

**D4 — The binder fix is both flags, on all four posture verbs.**
`prepositions: [on, at, in, upon]` + `greedy: true` on `target` for `sit`,
`lie`, `kneel` **and `stand`** (`stand on the table` is the same shape).
Articles are already dropped by the desugar, so `sit on the ground` binds
`ground`. The `lint:binder-models` / `lint:arg-kinds` gates cover the views.

**D5 — The kind is `f(materialClass, onGrade, worked, standingWater)`, closed
at ten, and never authored.** Grounding D shows `f(material, onGrade)` cannot
separate living rock from set paving without a construction claim on the
material. The third input is the **floor's own** `worked: boolean` (dressed,
laid, rammed — default `false`). The fourth is state the floor already holds
(its surface puddle), read for one kind only. The fold, on `FloorMixin.getGroundKind()`:

| material class | onGrade | worked | water | kind |
|---|---|---|---|---|
| mineral (rock · mineral · ceramic · glass) | yes | no | — | `rock` |
| mineral | yes | yes | — | `set-paving` |
| mineral | no | — | — | `slab` |
| earth (`earth` tag; not granular) | — | no | none | `earth` |
| earth | — | no | standing | `mire` |
| earth | — | yes | — | `beaten-floor` |
| granular (`granular` tag) | — | no | — | `loose` |
| granular | — | yes | — | `set-paving` |
| timber (`wood`) | — | — | — | `boards` |
| metal (`metal` · `alloy`) | — | — | — | `plate` |
| anything else | — | — | — | `contrived` |

`GROUND_KINDS` is the requirements' list with `paving → set-paving`,
`beaten → beaten-floor`, `board → boards` as the wire spellings. Limbo Lane's
rubbery pink → `contrived` with no list edit (AC 18).

**D6 — Tags stay open; the fold's *recognised set* is the closed thing.**
Resolving Grounding D's contradiction without closing `Material.tags`: the
material class is read through a closed `GROUND_TAG_CLASSES` map
(`rock|mineral|ceramic|glass → mineral`, `earth → earth`, `granular → granular`,
`wood → timber`, `metal|alloy → metal`), and any tag set outside it is
`contrived` — which is the honest answer for a fantasy material, not an error.
No gate closes the vocabulary; the sweep should fix the doc comment at
`Material.ts:1113-1117` to say *the corrosion channel reads the tags it names*.

**D7 — Rung 2 is a `floor:` spec on the Location**, `{ template?, material?,
onGrade?, worked? }`, `{ persistent: true, authorable: true }`, applied to the
default floor at mint (or to the named `template` clone). A room that wants
details on its floor authors a floor row (rung 1). `lint:census` learns
`floor.material` and `floor.template`.

**D8 — `onGrade` is the floor's, tri-state, defaulting from the room.**
`onGrade: boolean | null`; `null` means *derive*: **on grade iff the room is
sky-exposed OR sits below datum** (`getCoordinates()[2] < 0` when the room has
coordinates). A street and a field are on grade; a mine gallery and a cellar
are on grade; an indoor ground-floor room, an upper storey, the holodeck and
the Lounge are not. An author who knows better says so (`onGrade: true` on a
cottage's earth floor) and is obeyed. This is what makes AC 7/8/12 fall out
without a special case per class.

⚠⚠ **D8a — `onGrade` answers the WRONG QUESTION for mid-air and mid-water, and
D8's heuristic gets both backwards.** (Raised by the user at plan review.) There
are two separate questions and D8 conflates them:

1. **Is there a floor here at all?** — is this place *standable*;
2. **Does the ground continue beneath it?** — `onGrade`.

D8's derivation answers (2) and then leaks into (1). Two cases break it:

- **mid-air.** A flying-only location **is sky-exposed**, so D8 would derive
  `onGrade: true` and hand it an *earth* floor. You would be able to sit down on
  the sky.
- **underwater.** A mid-column water band **sits below datum**, so D8 derives
  `onGrade: true` and floors the open water. Only the **bed** has ground under it;
  the column does not.

**The rule: a floor exists where the place is standable, and existence defaults
to yes.** Mid-air and mid-water locations declare `noDefaultFloor: true` — the
mechanism W2 already builds for the void row, used for two more cases. `onGrade`
is then only ever asked of a floor that exists, which is what makes it honest.

⚠ **Neither case is in the game yet** — there is no flying-only room, and the
water column is [underwater-slate](../slates/builds/underwater-slate.md)'s
unbuilt design (*"the column — bands as zones, `depth` as a zone field"*). So this
build ships **no** mid-air or underwater rows. What it owes them is the
**declaration and a test**: W2's roster test gains a literal sky-exposed row with
`noDefaultFloor: true` and asserts **no floor and a refused `sit`**, so the seam is
proven before either builder arrives. ⭐ And the underwater build inherits one
sentence: *a band is not standable; its bed is* — recorded on that slate.

**D9 — The ladder resolves once at attach and stamps runtime-only state.**
Rung 3 needs `await zone.lookupField(...)` + `StuffApi.singleton(...)`, and every
consumer of the floor's material is synchronous (`getMaterial()`, the three
resolvers, the augmenter, the binder). So `FloorMixin.resolveUnderfoot()` runs
the ladder once, in `ensureFloor()`, and stamps `underfootMaterialPath` +
`underfootRung` (not in `fieldMeta`; fixtures capture nothing). `getMaterial()`
is overridden to answer *authored → stamped*, so every shipped reader of a
floor's material sees the honest answer with no new call. Extraction's quarry,
whose floor changes as it is dug, calls `resolveUnderfoot()` again — the seam
is the method, not a stamp. The rungs, in order:

1. the floor row's authored `_materialPath` (Tangible) — always wins;
2. the Location's `floor.material` (D7);
3. **if on grade** — the ground beneath (D10): the zone's `groundCharacter`
   citation, then its `deposit` citation, then the pack's default source;
4. `Location.floorDefaults()` — the room-kind default (D11);
5. the plain default — the `default-floor` row's own answer, which is rung 4's
   indoor material (a plain floor is a board floor).

**D10 — Rung 3 is a kernel capability mixin the pack implements.** The kernel
cannot import `Deposit` or `GroundCharacter`, and the failure of the reverse
(a pack adding a field to a kernel class) is already recorded in
`SpatialZone.ts`. So the kernel defines **`GroundSourceMixin`**
(`lib/ground/GroundSource.ts`, the `SkyExposedMixin`/`RadioactiveMixin`
shape): `groundMaterialAt(spot: [x,y], zM: number, address: string): string | null`
— a Material template path or `null`. The floor resolves each citation through
`StuffApi.singleton(path)`, narrows with `MixinApi.isGroundSource`, and asks.
`GroundCharacter` answers within its topsoil depth (`zM ≥ −topsoilM`) with the
texture's material; `Deposit` answers with `hostAt(zM)` (pins first). The
**address**, not a seed, crosses the seam: each model derives its own seed.
With the ground pack absent, every citation is unreadable and rung 3 yields
`null` — the ladder degrades honestly (the requirements' non-goal).

**D11 — Rung 4 is `Location.floorDefaults()` plus two dials.** Returns
`{ onGrade (D8), worked: !onGrade, materialPath }` where `materialPath` is
`ground.floor.indoorMaterialPath` (seeded `/stuff/idea/material/wood/oak` —
*boards* is the census's top material claim) or `ground.floor.outdoorMaterialPath`
(seeded `/stuff/idea/material/earth/loam`). The weather build's material-dial
precedent (Grounding H). A subclass that knows its kind overrides the method;
none needs to in this build — the mine, the field, the wood and the cellar
reach rung 3 through D8, and the holodeck/dorm/Lounge take the indoor default.

**D12 — The pack seeds a procedural default source.** `GroundCharacter.resolve`
is total: with a `null` model it still answers from the address. Lens 1 says
the world should be derivable underfoot even where nobody authored a row, so
the pack ships `/system/ground/idea/default-character` (a `GroundCharacter`
with no pins or bands) and a settings row `ground.defaultSourcePath` naming it
(the `water.fishery.readDiscipline` precedent). Rung 3's third try. An
unauthored outdoor room over uncited ground therefore reads a seeded loam,
clay or sand — never the plain default — and the census reports it as
`derived:procedural`. Lens 2 is untouched: one authored line still beats it.
*Recorded for the user's eye under Risks.*

**D13 — `mire` reads the puddle.** An earth-class floor with standing water in
its surface slot is `mire`; dry it is `earth`. The heath floor is peat that
the storm fills — earth in a dry spell, mire in the rain — which is the truth
the row's own comment describes. Derive-on-read, sync, no new state.

**D14 — `AdornmentMixin.canEvict` vetoes while `adornedTo` lives**, mirroring
`Exit.ts:238-246` in the `WarrenMember.ts:78-83` mixin shape: `adornedTo`
null → cullable clutter; host alive → `{ ok: false, reason: 'fixture of a live host' }`;
host destroyed → super. Claims about every fixture are honest (see Host placement).
Makes `residency.md:218` true.

**D15 — One read for the room's floor: `Adornable.getFloor()`.** Returns the
first fixture composing `FloorMixin`, else `null`. `ElectricityLogic.findFloor`,
`WeatherLogic.findRoomFloor`, `BulkableLogic.floorSurfaceNear` and
`floorPuddleSummary` call it and keep their own `hasSurfaceBulk()` check
(a dry posture floor is a floor; a puddle needs the slot). The contents scan is
deleted — no content row has a surface slot (Grounding G). **`floorConducts`
switches on** because `getMaterial()` now answers: priced in D17.

**D16 — Every Floor has a ground slot by construction.** `FloorMixin`
overrides `getSlotNames/getSlotSpec` to fall back to the one canonical
`ground:1` spec (the pinned shape) when `staticSlots` is empty. The five rows
that repeat the block keep working; `forge-floor` becomes sittable — additive,
recorded. An author who wants *stand only* still authors `staticSlots`.

**D17 — The five new material rows are authored dry.** `earth/loam`,
`earth/sand` (`granular`), `earth/clay`, `organic/peat`, `ceramic/concrete`
in `base-library`, `slate.yaml`'s field set, tags carrying `earth`/`granular`/
`mineral`. Electrical conductivity is authored at the **dry** figure
(≤ 1e-3 S/m, under the 0.005 pool threshold), so with `floorConducts` live no
shipped floor newly conducts — wet-ground conduction keeps riding the puddle
exactly as today. Only a metal floor would conduct, and none ships.

**D18 — `look floor` says what it is made of through a markup augmenter.**
`FloorMixin` registers `floorAugmenter` (the `Stand.ts` shape) appending one
sentence — *"It is granite, set as paving."* / *"It is loam, bare earth."* /
*"It is peat, waterlogged to mire."* — from the material's `appearance`/`name`
and a per-kind phrase table in `lib/ground/GroundKind.ts`. The floor's
authored prose stays the base text; the derived line is added.

**D19 — `applyAdornments` clears what it previously applied before
re-adding.** A runtime `_appliedFixtures: Set` on `AdornableMixin`; on re-run
(`restoreFromTemplate`) those fixtures are destructed first. Makes the
docstring's *"rebuilds"* true and keeps AC 6/15 under CMS go-live. Pre-existing
double-fixture behaviour is fixed as a side effect; recorded.

**D20 — `/system/ground` takes `Deposit`, `GroundCharacter` and the `Strata`
extraction, verbatim from extraction's superseded W0.** Root `/system/ground`;
`Deposit` and `GroundCharacter` compose `GroundSourceMixin(Idea)`;
`ground/src/lib/Strata.ts` holds `StrataMixin` (`getCell`, `metresOf`,
`getDeposit`, `getGroundSeed`, `sampleHere`, `resolveDeposit`) lifted from
`Working.ts:378-425`; `WorkingMixin` composes over it and keeps the mine reads.
Farming and mining import by package specifier; rows repoint; the count is 49.
Taking `Strata` here rather than leaving it to extraction keeps `WorkingMixin`
mine-only and lets the quarry start at W1 as its banner says.

**D21 — The survey verbs stay farming's; AC 14 is answered by the floor.**
`look floor` / `look ground` in a `Wood` (on grade, rung 3 via the default
character or a citation) reads the ground in words. Moving `measure texture`
/ `analyze soil` into the ground pack is a real extension and is left as a
seam on the field-substrate slate.

**D22 — The road walk is authored in this build**, because the drive names it:
the crossing gets a floor **row** (granite, worked, on grade, with the
`paving` detail carrying the worn diagonal track); the square and the yard get
`floor: { material: rock/granite, worked: true }` one-liners (same inputs →
same kind, AC 17 by construction); the yard's `gutter` detail **moves from the
room to a floor row** so AC 20 reads true (`look gutter` keeps binding — the
floor is in reach); Hinkley's lane gets `floor: { material: earth/loam,
worked: true }` → `beaten-floor` (*"a made road"* of graded dirt). The six
existing floor rows author `_materialPath` to match their prose (forge/brine
→ granite worked; weeping → slate worked; heath → peat; flooded → concrete
worked). Everything else stays for the content pass.

**D23 — The census is two lists; list 2 is hand-curated with a pinned count.**
`scripts/check-ground.ts` (`lint:ground`; `lint:family` picks it up). List 1
(`--report`): every Location row → `authored-row | authored-spec | derived:… |
default`, plus the material when it is static. List 2: an exported
`UNBACKED_GROUND_CLAIMS: readonly string[]` of row paths with a docblock, and
`UNBACKED_GROUND_CLAIMS_CEILING` = its length after W4 (≤ 64). Clauses: (a)
`length ≤ CEILING`; (b) every listed path resolves to a Location row; (c) a
listed row that now authors a floor is **stale** → fail (remove it; the
ceiling falls); **(d) every row whose `class:` resolves to a `FloorMixin`
composer carries `ground` and `floor` in its own `keywords:`** (D3 — the
resolve pool reads the row's keywords and nothing else). A `--seed` mode
prints the claim-word heuristic once, for curation — it never gates
(honouring `check-descriptor-banks.ts:295-307`).

**D24 — The drive is a wire file; the invented material is a literal-row
test.** `packages/wire/tests/ground.dirty.wire.test.ts` covers steps 1–21 and
24 (dirty: the spill consumes a vessel's liquid). Steps 22–23 cannot author
content over a socket; they are `lib/ground/__tests__/InventedMaterial.test.ts`
hydrating a fantasy material and two rooms from literal rows and asserting
`contrived`, an identical answer, and a binder-driven `sit`.

**D25 — Names.** The mixin is `FloorMixin` in `lib/ground/Floor.ts` beside a
concrete `platform/thing/Floor.ts` (the shared-stem twin pattern; importers of
both alias `type { Floor as FloorShape }`). `Floor` stays the class name (the
slate's lean). Fields: `onGrade`, `worked`. The read is `getFloor()`, the
kind `getGroundKind()`, the pack `/system/ground`.

---

## ⭐⭐ Host placement

| what | host | what composing it claims — and about whom |
|---|---|---|
| `FloorMixin` (`onGrade`, `worked`, the ladder, the kind, keyword union, default slot, augmenter, `getMaterial()` override) | `platform/thing/Floor` only, outermost over its stack | *This Thing is the ground you stand on.* Nothing else composes it; a future vehicle deck composes it deliberately. Host constraint `Stuff & Tangible & Perceptible & Postured & Bulkable & Visible`. No guard re-narrows anything: the resolvers **select** a floor among fixtures, they do not narrow a wider host set. |
| `PostRegistrationMixin` | `Location` base (moved down from six classes) | *Every Location may have async post-register setup.* Already true for six of nine concrete classes; the three that lacked it (`VoidLocation`, `SingletonCartesianLocation`'s chain, `PersistentCartesianLocation`) gain an inert no-op. |
| `floor` spec · `noDefaultFloor` · `ensureFloor()` · `floorDefaults()` | `Location` (`lib/stuff/Location.ts`) | *Every Location has a floor unless it says otherwise.* The one named opt-out is the void row. `ExitableVessel` is Adornable but not a Location and gets **no** default floor — a wardrobe you can enter is not given a deck; a conveyance authors one. |
| `getFloor()` | `AdornableMixin` | *Any adornable host may carry a floor.* Location and ExitableVessel — both honest. |
| `canEvict` | `AdornmentMixin` | *An attached fixture stays resident while its host lives.* BoundaryAnchor, NeonSign, floors, hung chattel: for each, culling under a live host is the bug `Exit.canEvict` prevents. Hung chattel is owner-persisted anyway. |
| `GroundSourceMixin` | `Deposit`, `GroundCharacter` (pack Ideas over `Idea`) | *This Idea can say what the ground is made of at a spot and depth.* Not on `SoilMixin` hosts (reserves are derived state), not on zones (a citation is not a source). |
| `StrataMixin` (pack `lib/`) | composed by `WorkingMixin` | Position-in-the-column reads for any location that sits in a deposit; the quarry is the second composer. |
| `GROUND_KINDS` / `GROUND_TAG_CLASSES` / phrase table | `lib/ground/GroundKind.ts` (vocabulary value-object, no statics) | Data only; the fold is an instance method on `FloorMixin`; the census re-implements it statically. |
| dials `ground.floor.indoorMaterialPath`, `ground.floor.outdoorMaterialPath`, `ground.defaultSourcePath` | `lib/config/AppSettings.ts` (+ the ground pack's `content/settings/ground.yaml` for the third) | Seeded literals at the call site for the first two (the kernel works with the pack absent); the third is `null` until the pack seeds it. |
| `TemplatePaths.DefaultFloor` | `lib/paths.ts` | Names the generic-objects row; `lint:census` clause (c) checks only Registry/Catalogue constants, so add a resolve assertion to the Location floor test. |
| materials `earth/{loam,sand,clay}`, `organic/peat`, `ceramic/concrete` | `base-library` rows | Warmed by infix; tagged for the fold. |

⭐ **The test.** The only place a guard could creep in is a resolver writing
`isFloor(fx) && hasSurfaceBulk(fx)` — that is *selection within the fixture
set*, not a re-narrowing of who composes `FloorMixin`. If the build finds
itself writing `if (!(room instanceof CartesianLocation)) return` inside
`ensureFloor`, the mechanism is on the wrong class: stop and record it.

---

## Convention conformance

Checked at plan time against the tree, not recalled.

- **`props:` / `cast:`** — untouched; the floor is a **fixture** via the
  `adornments:` instruction field, and the default is code, not a row edit.
- **Locations, not rooms** — `Location`, `CartesianLocation`,
  `SingletonCartesianLocation`; `FurnishableRoom` is not touched except to drop
  its redundant `PostRegistrationMixin`. `lint:locations` roster unchanged.
- **Five namespace axes / `<root>/<branch>/`** — the pack is `/system/ground`
  (*true whether or not anyone digs*): classes `/system/ground/idea/Deposit`,
  `/system/ground/idea/GroundCharacter`, `/system/ground/lib/Strata`; its one
  row `/system/ground/idea/default-character`; the realm's deposit stays at
  `/world/terminus/rejection/idea/deposit/ferrow` (a pack's classes, the realm's
  instances). Kernel substrate at `lib/ground/{Floor,GroundSource,GroundKind}.ts`
  — a new **subsystem folder**, not a `lib/mixins/`; nothing instances `/lib/`.
- **Module scope declares; lifecycles initialize** — the floor attaches in
  `postRegister`; the vocabulary file is `const` declarations; the dials read at use.
- **Import boundary (`lint:imports`)** — the pack imports
  `@saxonberg/server/mud/lib/ground/GroundSource`, `…/lib/stuff/Idea`,
  `…/lib/Seeded` by specifier (`./mud/lib/*` is exported); farming/mining/the
  localities import `@saxonberg/content-ground` after declaring it. No Node
  built-ins in the mudlib.
- **Module categories** — one new mixin subsystem folder (`lib/ground/`), one
  vocabulary file, one pack `lib/` mixin, one lint script. **No Api, no logic
  singleton, no free helper**; the fold is a method, the phrases are data.
- **Verbs on objects** — `room.getFloor()`, `room.ensureFloor()`,
  `floor.getGroundKind()`, `floor.isOnGrade()`, `floor.resolveUnderfoot()`,
  `source.groundMaterialAt(...)`. No `XApi.verb(host, …)`; `lint:object-verbs`
  stays at zero.
- **Inter-Stuff contract** — every new field has a getter/setter pair;
  consumers call methods.
- **Member privacy** — TypeScript modifiers only (mixin state on proxied hosts).
- **Persistence** — nothing new is captured; `holder_snapshots` untouched; no
  new collection; no migration (the pack rename means **drop the dev DB**).
- **Gates this build must pass** (`pnpm -C packages/server lint:family`):
  `lint:mixin-names` (`Mixins.Floor`, `Mixins.GroundSource`), `lint:field-meta`,
  `lint:unconsumed-seams` (every new field is read), `lint:census` (extended
  for `floor.material` / `floor.template`), `lint:instanceable`, `lint:imports`,
  `lint:module-scope`, `lint:lib-statics` (mixin statics out of scope; moved
  statics ceiling-neutral), `lint:untitled` (the pack's title claim),
  `lint:locations`, `lint:arg-kinds`, `lint:binder-models`, `lint:verb-collisions`,
  `lint:test-content`, `lint:test-bootstrap`, `lint:presentation` (new rows'
  `shortDescription` with no leading article), `lint:perishable` (check the
  new organic row — peat — against the gate's rule before authoring it),
  `lint:object-verbs`, and the new **`lint:ground`**.

---

## Waves

Six waves, each independently landable at `build(ground W<n>): …`. Mid-build
gating is `pnpm test:near` + each touched pack's `pnpm -C packages/content/<pkg> test`
+ `pnpm -C packages/server lint:family`. The full suite runs **once**, before
the MR. Push every turn.

### W0 — the veto and the binder (D4, D14) — ✅ DONE

*Goal:* a fixture cannot be culled from under a live host; the prepositional
posture form parses. Two latent defects closed on their own.

Files: `lib/boundary/Adornment.ts` (`canEvict` override, `EvictionContext`/
`VetoResult` imports — the `WarrenMember.ts` shape);
`lib/boundary/__tests__/Adornment.canEvict.test.ts` (unattached → ok; attached
to a live host → veto with reason; host destroyed → ok);
`platform/content/platform/cmd/posture/{sit,lie,kneel,stand}.yaml`
(`prepositions: [on, at, in, upon]`, `greedy: true` on `target`); a binder
test in `platform/idea/cmd/posture/__tests__/` that resolves `sit on the X`
against a literal Postured fixture through `CommandApi` (the shape
`check-binder-models` demands — no hand-built model); `docs/subsystems/residency.md`
line 218 now true (one word: none needed) — leave the rest to the sweep.

*Acceptance:* the three veto cases; `sit on the <thing>` and `sit <thing>`
both bind; `lint:family` green (`lint:arg-kinds`, `lint:binder-models`).
Commit: `build(ground W0): a fixture stays resident while its host lives; the posture verbs take a preposition`.

**✅ Done.** `AdornmentMixin.canEvict` in the mixin shape (no `override` —
every mixin-level `canEvict` in the tree omits it, since the generic base
makes the modifier unresolvable); 3 veto cases green. All four views took
`prepositions: [on, at, in, upon]` + `greedy: true`.

⭐ **What surprised me, and it is load-bearing for W1's D3 check:** the view
`default:` is applied **at assembly**, not after it — `bind('sit')` returns
`{ target: 'ground' }` straight out of `CommandApi.assemble`. So `greedy`
did not cost the bare form its default (the regression I was braced for),
and the *whole* of the original defect is downstream of the binder: the word
`ground` was reaching MQL all along and matching nothing. That is exactly
D3's claim, now measured rather than reasoned — and it means W1's keyword
union is the only thing standing between a new player and sitting down.

Also measured: the prepositional target binds **with its article**
(`'the ground'`), and the desugar's article drop is what makes it resolve —
so the binder test asserts `'the ground'`, not `'ground'`. 18 binder
assertions across the four verbs; `residency.md`'s `Adornment` row is now
true and says why presence could never have done the job. `lint:family`:
all 48 gates pass.

### W1 — the floor is a capability (D3, D5, D6, D9, D13, D15–D19) — ✅ DONE

*Goal:* `FloorMixin` exists and `platform/thing/Floor` composes it; a floor
knows its keywords, its slot, its material and its kind; the three resolvers
ask one question. No universal attach yet — authored floors gain the
behaviour, `forge-floor` becomes sittable.

Files — kernel: `lib/ground/GroundKind.ts` (`GROUND_KINDS`, `GroundKind`,
`GROUND_TAG_CLASSES`, `GROUND_KIND_PHRASES`); `lib/ground/GroundSource.ts`
(`GroundSourceMixin`, interface `GroundSource`); `lib/ground/Floor.ts`
(`FloorMixin`: `fieldMeta { onGrade, worked }` both `{ persistent, authorable }`;
`isOnGrade()/setOnGrade`, `isWorked()/setWorked`, `getKeywords()` union,
`getSlotNames()/getSlotSpec()` fallback, `getMaterial()` override,
`getGroundKind()`, `resolveUnderfoot(): Promise<void>` running rungs 1–5 with
the room reached through `getAdornedTo()`, `getUnderfootRung()`, `static
markupAugmenters = [floorAugmenter]`); `lib/mixin.ts` (`Mixins.Floor`,
`Mixins.GroundSource`, `MixinRefusals.FloorMixin`); `api/mixin.ts` (`isFloor`,
`isGroundSource`); `lib/boundary/Adornable.ts` (`getFloor()`; `_appliedFixtures`
+ clear-then-rebuild in `applyAdornments`); `platform/thing/Floor.ts`
(`FloorMixin(BulkableMixin(...))`, docstring rewritten — v1's *"no class-level
default"* is retired next wave); `lib/config/AppSettings.ts` (the three keys +
`AppSettingKeys`); `lib/paths.ts` (`TemplatePaths.DefaultFloor`);
`platform/idea/api/ElectricityLogic.ts` (`findFloor` → `room.getFloor()`,
contents scan deleted), `WeatherLogic.ts` (`findRoomFloor` likewise),
`BulkableLogic.ts` (`floorSurfaceNear`, `floorPuddleSummary`).
Files — content: `base-library/content/stuff/idea/material/earth/{loam,sand,clay}.yaml`,
`organic/peat.yaml`, `ceramic/concrete.yaml` (D17 numbers; `slate.yaml` shape;
`lint:presentation`-clean short forms); `generic-objects/…/surface/default-floor.yaml`
(keywords `[floor, ground, underfoot]`, `shortDescription: floor`, the
`noDefaultFloor` comment made true, slot block kept).
Tests: `lib/ground/__tests__/GroundKind.test.ts` (the D5 table, one case per
row, via a Floor hydrated from literal fixtures); `lib/ground/__tests__/Floor.test.ts`
(keyword union incl. the `[flagstones, wet]` case; default slot when
`staticSlots` empty and its absence when authored; `getMaterial()` authored →
stamped → null); `lib/boundary/__tests__/Adornable.getFloor.test.ts` (+ the
rebuild case: hydrate twice, one fixture); resolver tests whose fixtures used a
bare Bulkable with a surface slot now compose `FloorMixin` — grep
`hasSurfaceBulk` under `lib/electricity/__tests__`, `lib/bulk/__tests__`,
`platform/idea/api/__tests__/Weather*` and fix each (they fail structurally,
which is the point); `lib/slot/__tests__/Floor.test.ts` gains the default-slot case.

*Acceptance:* every test above; `test:near`; `lint:family` (`lint:mixin-names`,
`lint:field-meta`, `lint:unconsumed-seams`, `lint:census` on the new material
rows, `lint:lib-statics` unchanged at 337). The forge floor accepts `sit` in a
controller test on a literal fixture. ⭐ **The D3 check, explicit:** a Floor
hydrated from a literal row whose `keywords:` are `[flagstones, wet]` is
resolved by MQL for the bare word `ground` (drive the real `sit.yaml` through
`CommandApi` — the binder, not a hand-built model) **and** `look floor` still
binds it — proving the class-level union is what the scope walk pools.
Commit: `build(ground W1): the floor is a capability — FloorMixin, the derived kind, one getFloor for three resolvers`.

**✅ Done.** `lib/ground/{GroundKind,GroundSource,Floor}.ts`; `Mixins.Floor` +
`Mixins.GroundSource` + both refusal phrases; `MixinApi.isFloor`/`isGroundSource`;
`Adornable.getFloor()` + the D19 rebuild; the three resolvers each ask one
question; five material rows; the three dials; `TemplatePaths.defaultFloor`.
64 new assertions across five files. `lint:family`: all 48 gates pass.

**Four decisions the plan left open, and what decided them:**

1. ⭐⭐ **The fold is a TABLE, not a function** (`GROUND_KIND_FOLD`). The plan
   said *"the fold is an instance method; the census re-implements it
   statically"* — but `lib/`'s export discipline bans a free exported helper
   (`no-restricted-syntax`, `*Mixin` the only exempt name), so the honest
   choices were a duplicated switch or data. A fold written twice is a fold
   that drifts, so the D5 table is transcribed **once** as
   `readonly GroundFoldRule[]`, first-match-wins, and each side keeps only a
   five-line matcher. Lens 2 chose it: an author reads the table and sees the
   whole rule.
2. **`GROUND_CLASS_PRECEDENCE`** is the plan's *"earth tag; not granular"*
   made explicit — `metal · timber · granular · earth · mineral`. Sand is the
   case it exists for (`earth/sand` carries both tags, and the word a person
   wants for sand is *loose*).
3. **`TemplatePaths.defaultFloor`**, not `DefaultFloor` — every one of the
   ~40 existing keys is lower-camel, and CLAUDE.md's *follow the nearest
   pattern* beat the plan's capitalisation.
4. **Sibling capabilities are reached by local `MixinApi.isX` narrowing**
   (`hostOf()`, `hasStandingWater()`), not by the base-type constraint. The
   `MaturingMixin` precedent — `const self = this as unknown as Stuff` +
   `MixinApi.isBulkable(self)` — and it is what CLAUDE.md § *Go Through the
   API Layer* asks for. ⚠ And hard-private `#` is unusable here at all: a
   mixin method on a proxied Stuff host has `this === proxy`, so `this.#m()`
   throws.

**Three things that surprised me:**

- ⭐ **No resolver fixture failed.** The plan expected the `hasSurfaceBulk`
  fixtures to break structurally and said *"that is the intended signal"*.
  All 20 suites over the three resolvers passed untouched, because every
  fixture already used a real `Floor`. Which also confirms the grounding's
  sharper claim: the **contents scan those resolvers carried was dead** — no
  non-Floor row declares `surfaceBulk`, and no test relied on it either.
- ⚠ **`ceramic/ceramic.yaml` already claims the keyword `clay`.** The new
  `earth/clay` row claims it too, and both honestly answer to it — one is
  fired, one is the ground. Recorded rather than resolved; the *ceramic* row
  arguably has the wrong keyword, and that is not this build's call.
- The `default-floor` row **keeps** its `staticSlots` block even though the
  class now supplies exactly that spec. Lens 2: reading the row is how an
  author learns what a floor's slot *is*, and the shape is pinned by
  `lib/slot/__tests__/Floor.test.ts` either way.

⭐ **The D3 check landed as its own file** (`lib/ground/__tests__/Floor.mql.test.ts`)
and it is the one to read first at review: a `Floor` keyworded
`[flagstones, wet]` — `weeping-floor` verbatim, which authors *neither*
word — resolved through the real `MqlApi` scope walk for the bare word
`ground`, for `floor`, and still for its own two words. Taken with W0's
finding (the `default:` is applied at assembly, so `ground` was always
reaching MQL), this is the whole defect, proven end to end: **attaching the
row to all 184 Locations would have fixed `look floor` and left `sit`
broken.**

⚠ **One pre-existing warning cleaned up in passing:** `Adornable.ts` imported
`ChattelApi` and never used it (`captureSlice` uses `MixinApi.isChattel`).
Deleted — one dead line in a file this wave rewrote.

### W2 — every Location has a floor (D1, D2, D7, D8, D11) — ✅ DONE

*Goal:* a brand-new player can sit down in the Lounge; no room has two floors;
the void has none.

⚠ **Rung 3 of the ladder is inert until W3.** This wave ships the ladder and the
first, third and fourth rungs; *the ground's top band* has no owner to ask until
`/system/ground` exists, so an on-grade floor over uncited ground falls through to
the archetype/zone default here and starts answering from the column in W3. That
is expected at this wave's acceptance — **do not "fix" it**, and do not hold W2
for W3.

Files: `lib/stuff/Location.ts` (`PostRegistrationMixin` composed into
`LocationBase`; `fieldMeta { floor, noDefaultFloor }`; `getFloorSpec/setFloorSpec`,
`isNoDefaultFloor/setNoDefaultFloor`; `postRegister()` → `ensureFloor()`;
`ensureFloor()`; `floorDefaults()`); remove `PostRegistrationMixin` from
`lib/location/CartesianLocation.ts`, `platform/location/{FurnishableRoom,SphericalLocation,Offstage,sandbox/CircleFloor}.ts`,
`world/lounge/location/Lounge.ts`; add `await super.postRegister(context)` to
`CartesianLocation.ts:130`, `SphericalLocation.ts:39`, `Lounge.ts:59` and any
other override the roster test finds (`Field.ts`, `Wood.ts`, `MineRoom`/
`Working.ts`, `DormRoom`, `Bar.ts`, `GlassAlley.ts` — verify each chains);
`platform/content/platform/location/void.yaml` (`noDefaultFloor: true`);
`docs/subsystems/posture.md § Floor adornments` + `spatial.md:682` (the
opt-out is now real; the migration-script sentence goes).
Tests: `lib/stuff/__tests__/Location.floor.test.ts` — a Location cloned from a
literal row has exactly one floor named `floor`; an `adornments:` floor →
exactly one and it is the authored one; `noDefaultFloor` → none; `floor:` spec
applied (material, worked, onGrade); D8 defaults (sky-exposed → on grade;
z<0 → on grade; indoor z=0 → not); `TemplatePaths.DefaultFloor` resolves;
⭐ **the roster test**: for every concrete Location class in the kernel and
every pack `src/location/`, clone a minimal literal row and assert a floor
(catches a `postRegister` that forgot `super`); `world/lounge/__tests__/landing.integration.test.ts`
gains *the landing room has a floor a new avatar can sit on*.

*Acceptance:* the tests above; `pnpm bench` boot number recorded in this plan
(one extra Thing clone per room clone — if the delta exceeds the ±6% floor,
say so under Risks before continuing); `test:near`; `lint:family`.
Commit: `build(ground W2): every Location has a floor — PostRegistration at the base, ensureFloor, the floor: spec`.

**✅ Done.** `PostRegistrationMixin` into `LocationBase`; `floor` + `noDefaultFloor`
fields with accessors; `postRegister` → `ensureFloor()`; `floorDefaults(onGrade)`;
`noDefaultFloor: true` on the void row; `posture.md` + `spatial.md` rewritten.
24 assertions in `Location.floor.test.ts` + 3 in the new lounge roster + the
landing-room assertion. `lint:family`: all 48 gates pass.

**⚠ TEN composers, not six.** The plan's file list named six; counting
`PostRegistrationMixin(` across the Location family found **ten** —
`CartesianLocation`, `SphericalLocation`, `FurnishableRoom`, `Offstage`,
`CircleFloor`, `Lounge`, plus **`Bar`, `GlassAlley`** and the university's
**`Corridor` + `DormRoom`**. Every one is stripped. This matters more than a
count: those four were not oversights in the plan's list, they were classes that
compose the mixin *above* `Location`, and after the move each would have
**shadowed the base hook with the no-op** and silently had no floor.

⭐ **`Warren.ts` is answered, and the answer is no.** The plan flagged it as the
one file W2's list omitted and asked whether a Warren is on the Location path at
all. `lib/location/Warren.ts:58` — `export abstract class Warren extends Idea`.
It is not a Location, it composes nothing here, and its `postRegister` needs no
`super` for this. It lives in `lib/location/` because it is *about* locations,
not because it is one.

**Five overrides gained `await super.postRegister(context)`** — `CartesianLocation`,
`SphericalLocation`, `Lounge`, `Bar`, `GlassAlley`. `Field.ts` and `Wood.ts`
already chained; `Working.ts` chains through the prototype (a mixin's `super` is
not a class).

**⚠⚠ Two defects I introduced and the gates caught, both worth reading:**

1. **`MudlogApi.warn` THROWS when there is no recipient.** `ensureFloor`'s
   failure path warned through Mudlog, which resolves an audience from the
   ambient command frame — and `postRegister` runs inside the clone pipeline
   where there is no giver. So the *"warn, don't throw"* mitigation would itself
   have thrown, unregistered the room, and turned *a room with no floor* into
   *a room that failed to clone* — the precise failure the catch exists to
   prevent. Now `console.warn`, the `Avatar.reconcileMortalState` /
   `MaturationProfile` precedent: an engine condition with no audience goes to
   stderr. **Found by the roster test, not by review.**
2. **`void.yaml` had `data:` with no `hydratorClass:`**, so `noDefaultFloor: true`
   was silently discarded — the opt-out would have been exactly the dead text it
   replaces. `lint:instanceable` invariant 6 caught it in the same commit.

⚠ And `lint:test-content` refused the roster test for naming `/world/lounge` —
correctly. The three lounge classes moved to
`world/lounge/__tests__/lounge-floors.test.ts`, where a content test belongs.

**⭐⭐ The boot cost, measured — and it is over the noise floor.** A throwaway
probe cloned 400 rooms each way from an in-memory store (`noDefaultFloor: true`
vs not):

```
n=400   bare 0.519 ms/room   floored 1.282 ms/room   +147%   (+0.76 ms/room)
```

**Cloning a room costs one more object, and that roughly doubles it.** Far over
the ±6 % floor, so the plan says record it before continuing. Recorded — and
⭐ **I did not take the fallback**, for three reasons:

- **Absolute scale.** 0.76 ms × 184 authored Locations ≈ **0.14 s** if every
  room in the game were cloned at once, which nothing does — rooms are cloned
  lazily and culled by residency. Entering a room costs 0.76 ms more.
- **The fallback re-opens D1 rather than tuning it.** Lazy-mint-on-`getFloor()`
  needs `await StuffApi.clone` inside a read that is synchronous for all four
  of its callers, including the binder's scope walk — which is the exact reason
  D1 rejected lazy minting. Paying 0.76 ms is cheaper than making the floor's
  existence asynchronous.
- **Lens 3.** The floor exists because the room exists. A floor that appears
  when somebody looks at it is the gauge-shaped answer to a sim question.

⚠ What this number is NOT is a boot measurement. `pnpm bench` measures the test
SUITE (~15 min, and it needs a master baseline to mean anything); the world-boot
number lands with the wire drive in W5, which boots for real. The arithmetic
bound above is what stands until then.

⚠ One snapshot updated: `wiki-spoiler-fields.snapshot.test.ts` gained four rows
(`FloorMixin.onGrade/worked`, `Location.floor/noDefaultFloor`), all at reveal
level 0 — the expected consequence of four new authorable fields.

### W3 — `/system/ground` (D10, D12, D20) — ✅ DONE

*Goal:* the column and the character have one owner; the floor's rung 3
answers; mining and farming behave identically.

Files — the pack: `packages/content/ground/{pack.yaml,package.json,tsconfig.json,vitest.config.ts}`
(copy `water`'s; `id: ground`, `root: /system/ground`, `requires.groups:
[{ name: ground, purpose: the ground's own body — the column and the character,
owner: { office: prime-minister } }]`, `requires.title: [{ extent: /system/ground,
holder: { group: ground } }]`; description states the doctrine — *the ground's
model, as distinct from what anybody does to it; a deposit row is a locality's*);
`ground/src/idea/Deposit.ts` (moved; `extends GroundSourceMixin(Idea)`;
`groundMaterialAt` = pin host ?? `hostAt(zM)`); `ground/src/idea/GroundCharacter.ts`
(moved; `extends GroundSourceMixin(Idea)`; `TEXTURE_MATERIALS` map to the
`earth/*` rows; `groundMaterialAt` answers iff `zM ≥ −topsoilM`);
`ground/src/lib/Strata.ts` (`StrataMixin` from `Working.ts:378-425` +
`resolveDeposit`); `ground/content/system/ground/idea/default-character.yaml`;
`ground/content/settings/ground.yaml` (`ground.defaultSourcePath`);
`ground/src/__tests__/{Deposit,GroundCharacter,Strata,GroundSource}.test.ts`
(the field tests moved out of mining's `authored.test.ts` and farming's
GroundCharacter tests; plus: a Deposit answers slate at −10 and granite at
−100; a character answers loam at 0 and `null` at −5; the default row answers
for any address).
Files — mining: `package.json` gains `@saxonberg/content-ground`;
`src/lib/Working.ts` composes over `StrataMixin`, deletes the moved members,
imports `Deposit` types from the pack; `src/__tests__/{exemplar,fringe,reads-air,authored}.test.ts`
switch imports. Farming: `package.json`; `src/location/Field.ts`,
`src/lib/Improvable.ts`, the two farming controllers and three perception
controllers import from `@saxonberg/content-ground`; `src/idea/GroundCharacter.ts`
deleted. Rows: `rejection/…/deposit/ferrow.yaml` `class: /system/ground/idea/Deposit`;
`eternal-university/…/campus-field/idea/ground.yaml`, `hearts-delight/…/bench-field/idea/ground.yaml`
`class: /system/ground/idea/GroundCharacter`; `campus-farm.test.ts:129` string;
`rejection`, `eternal-university`, `hearts-delight` `package.json` gain the dep.
Root `package.json` workspace; `PackLogic.discover.test.ts` → `toHaveLength(49)`
+ `ground` before `trade-farming`, `trade-mining`, `rejection`,
`eternal-university`, `hearts-delight`. `pnpm install`. **Drop the dev DB.**
Kernel: `FloorMixin.resolveUnderfoot()` (W1) already dispatches rung 3 on
`MixinApi.isGroundSource` and reads `ground.defaultSourcePath` — nothing to
change; the comment-only mentions
in `HeadSeed.ts`, `Watercourse.ts`, `Wood.ts`, `SpatialZone.ts`, `Seeded.ts`
get their paths corrected. `docs/subsystems/{soil,mining}.md` each get one
pointer line to the new home (the rest is the sweep's).

*Acceptance:* `pnpm -C packages/content/{ground,trade-mining,trade-farming,rejection,eternal-university,hearts-delight} test`
green; `metal-chain.dirty.wire.test.ts`, `farming.dirty.wire.test.ts`,
`farmstead.dirty.wire.test.ts` unchanged; `lint:family` (`lint:untitled`,
`lint:census`, `lint:instanceable` on `/system/ground/lib/Strata`,
`lint:imports`); a kernel test that a Location over a zone citing a literal
`GroundSource` fixture resolves rung 3.
Commit: `build(ground W3): /system/ground — the column and the character leave the trades; GroundSource answers the floor`.

**✅ Done.** The 49th pack. `Deposit` and `GroundCharacter` moved by `git mv`
(history preserved) and both compose `GroundSourceMixin`; `StrataMixin` lifted
out of `WorkingMixin`, which composes over it; `default-character.yaml` +
`content/settings/ground.yaml`; 5 package.json deps + the root deployment
manifest; 3 rows and 2 pinned strings repointed; dev DB dropped
(`reset:db` — 46 collections). `lint:family`: all 48 gates pass. Pack suites:
ground 57, mining 128, farming 87, forestry 75, university 47, ranching 62,
water 150 — all green.

**⚠⚠ A TypeScript hole that cost the most time here, worth reading before the
next pack-to-pack mixin.** TS does **not** surface a mixin's members on `this`
inside a class whose base is `SomeMixin(TypeParameter)`. `super.x()` resolves;
`this.x()` reads *"Property 'getCell' does not exist"*. Worse, it propagates:
`MineRoom` = `PersistableMixin(WarrenMemberMixin(WorkingMixin(CartesianLocation)))`
lost all five position reads, so **every consumer typed as `Working` broke** —
which is how a purely structural move produced 15 type errors in files it never
touched. Two fixes, both recorded in the code:

1. `StrataMixin` and `WorkingMixin` carry **explicit return types**
   (`TBase & (new (…args: any[]) => Strata | Working)`), the standard TS mixin
   idiom. That is what restores the surface on derived classes.
2. Inside `WorkingMixin`'s body, a `private get ground(): Strata` — one
   accessor instead of eight casts at the call sites.

⭐ A side effect worth keeping: annotating `WorkingMixin`'s return forced the
`Working` interface to be **complete**. It was missing every authoring setter
(`setOreRow`, `setBackPhrases`, …), which four tests were reaching for through
the inferred class type. The interface now describes the surface it claims to.

**Two content claims got STRONGER, and both had to be edited to say so:**

- `exemplar.test.ts` — *"every class the venue names belongs to a trade or the
  platform"* now reads *"a trade, a **system**, or the platform"*. ⭐ Rejection's
  Ferrow deposit is an instance of `/system/ground/idea/Deposit`, and before this
  a venue could not name a deposit at all without depending on the mining trade.
  *A system's classes are the pack's; its instances are the realm's.*
- `campus-farm.test.ts` — same shape, and it now asserts the campus field's
  ground IS `/system/ground/idea/GroundCharacter` rather than merely allowing it.

**⭐⭐ The rung-3 test found a real defect in W1's code.** `resolveUnderfoot`
called `host.floorDefaults?.()` **with no argument** while `floorDefaults(onGrade)`
keys the indoor-vs-outdoor material on exactly that parameter. So every on-grade
room whose rung 3 found nothing read as **boards** instead of loam — a whole
class of outdoor rooms silently floored wrong, and nothing else would have
noticed. This is the signature-changed-but-the-caller-didn't class, and it is
precisely why D11's *"takes `onGrade` rather than deriving it"* needed a test
rather than a comment.

**Also settled:**

- `TEXTURE_MATERIALS` collapses six texture classes to **three** materials, and
  the collapse is the honest part: a texture class is a position on a triangle,
  and a boot cannot tell `sandy-loam` from `silt-loam`. What the six exist for —
  drainage, the cost of improvement — is `GroundSample`'s and is untouched.
- The two sources do **not** overlap. A character answers within `topsoilM`; a
  column answers from the collar down. That boundary is what lets a field read
  loam while the gallery beneath it reads its host rock, on **one** ladder with
  nothing arbitrating.
- `Deposit.groundMaterialAt` answers the **host rock, never the ore**. A face in
  a rich band is still granite you are standing on.
- ⚠ `StuffApi.createSync` now refuses **every Location** (W2 put
  `PostRegistrationMixin` at the base). Audited: no production caller creates a
  Location that way — the sites are registries, Exits, BoundaryAnchors and a
  Receptacle. Two pack tests needed `makeStuff` instead.

### W4 — the content: the six floors, the road walk (D22)

*Goal:* every shipped floor says what it is made of; the four stress-test
rooms read as their prose; the two cobbled ones read the same.

Files: the six floor rows gain `_materialPath` (+ `worked`, `onGrade` where
the default is wrong): `forge-floor` granite/worked/onGrade; `weeping-floor`
slate/worked/onGrade + keywords `[flagstones, wet, floor, ground]`;
`heath-floor` peat; `brine-floor` granite/worked; `flooded-floor`
concrete/worked; `default-floor` stays material-less (rung 4 answers).
`terminus/…/university-avenue/thing/crossing-paving.yaml` (Floor row: granite,
worked, onGrade; `details.paving { keywords: [paving, flagstones, track],
description: the worn diagonal track }`) + `adornments:` on `crossing.yaml`;
`terminus/…/goods-yards/thing/yard-paving.yaml` (granite, worked; the `gutter`
detail **moved** here from `yard.yaml`) + `adornments:`; `market/square.yaml`
`floor: { material: /stuff/idea/material/rock/granite, worked: true }`;
`hinkley-hills/…/location/lane.yaml` `floor: { material: /stuff/idea/material/earth/loam, worked: true }`.
Tests: `terminus/src/__tests__/road-walk.test.ts` (or the pack's existing
content-test home): hydrate the two cobbled rooms, assert equal kind and
material; the crossing's `paving` detail resolves on its floor.

*Acceptance:* the pack suites; `lint:census` (every `_materialPath` /
`floor.material` resolves); `lint:presentation`; `test:near`.
Commit: `build(ground W4): the shipped floors say what they are; the road walk reads as written`.

### W5 — the census, the drive (D23, D24)

*Goal:* the whole picture is readable at build time and the second list can
only fall; the requirements' drive runs over the wire.

Files: `packages/server/scripts/check-ground.ts` (the `check-presentation.ts`
shape: `packSources()` over `content/` **and** pack `src/`, rows filtered by
`class:` resolving to a Location class — reuse `classFileOf`/the
`check-location-classes.ts` class walk, never a filename; static re-fold of
D5 from YAML for list 1; `UNBACKED_GROUND_CLAIMS` + `_CEILING`; clauses a–d
(d = the floor-row keyword assertion, D3 — walk `class:` through
`classFileOf` to the composing class, never a filename);
`--report`, `--lint`, `--seed`); `packages/server/package.json` `"lint:ground"`;
`docs/lint-family.md` one entry; `lib/ground/__tests__/InventedMaterial.test.ts`
(D24); `packages/wire/tests/ground.dirty.wire.test.ts` (`declareFile` packs:
`saxonberg-lounge`, `terminus`, `hinkley-hills`, `eternal-university`,
`world-seed`, `hearthworks`, `rejection`, `trade-farming`, `trade-forestry`,
`generic-objects`, `ground`; steps 1–21 + 24 with the row paths above; the
dorm reached through `startLocation` at the dorm warren or the lobby the
presentation test uses; step 8 as `Session.close` + reopen).
Then run it (`WIRE_PORT=2013`), append **Drive record** below with the output,
the count and each failure, fix what it finds, and commit
`drive(ground): <what driving found>`.

*Acceptance:* `lint:ground` green with the curated list ≤ 64, no stale
entry, and every floor row carrying `ground` + `floor` (flip one row's
keywords locally and watch clause (d) fail before trusting it); `--report` names all 184+ rows; the wire file passes; the full suite
once (`pnpm test`), then push and open the MR.
Commit: `build(ground W5): lint:ground — the census; the drive as a wire file`.

---

## Reachability wiring

Five links per capability — verb · affordance · data · boot · arg gate — each
fails closed and silent.

**Sitting on the ground (the defect).** Verb: `sit`/`lie`/`kneel`/`stand`
exist. Affordance: none needed — the platform posture views are global; the
floor is a *target*, not an afforder. Data: `default-floor` row (exists;
keywords fixed W1) + `noDefaultFloor` on the void row (W2). Boot: nothing to
warm — the floor attaches at `postRegister` of every room clone (W2), and
`StuffApi.clone` runs it for the Lounge's minted rooms too. ⭐ **Arg gate**:
`requires: [VisibleMixin, PosturedMixin]` — `Floor` composes both; the keyword
`ground` is on the floor's **own** `getKeywords()` (D3), which is the only
pool the scope walk reads (Grounding C) — this is the link that was broken,
and attaching the row alone would not have mended it. `sit on the ground`: `prepositions` + `greedy` (W0) + the desugar's
article drop.

**`look floor` / `look ground` / `search floor`.** Verb: exist. Data: the
floor's prose + the augmenter (W1). Arg gate: `look`'s target `requires`
Visible — Floor composes it; `search`'s `requires: any`. Fixtures are in the
`reachable` scope (Grounding B).

**The derived material and kind.** Data: five material rows (W1); two dials
seeded at the call site (W1); the pack's default source row + its settings row
(W3). Boot: `MaterialCatalogue.warm` picks `earth/*` by infix; `AppSettings`
merges the pack's key; `StuffApi.singleton(path)` clones a cited source on
first ask (get-or-create — the *reference Ideas inert at boot* failure cannot
recur because nothing needs a warmed roster). Arg gate: n/a. Mixin reach:
`Mixins.GroundSource` registered (W1) before any pack composes it (W3).

**The residency veto.** No verb. Reach: `ResidencyLogic` asks `canEvict` on
every candidate; the override composes on every fixture. Pinned by the W0 test.

**The census.** `"lint:ground"` in `package.json` — `lint:family` derives its
roster, so membership is automatic; CI's validate stage still needs the ▶.

**The drive.** `packages/wire/tests/ground.dirty.wire.test.ts` — keeps running
on every MR; `/finalize` confirms it landed.

---

## Acceptance-criteria coverage

| AC | what proves it | wave |
|---|---|---|
| 1 sit/lie/kneel in the first room | D3 keyword union (W1 binder check) + W2 landing test; `lint:ground` (d); drive 1–3 | W1, W2, W5 |
| 2 `sit on the ground` | W0 binder test; drive 5 | W0 |
| 3 `look floor`/`look ground` answer in words | D3 keywords, D18 augmenter; drive 4 | W1, W2 |
| 4 the floor is its own target | fixtures in reach + keywords; drive 15 | W1 |
| 5 the six authored floors keep working, forge catches pours | D2 authored-wins; W4 rows; drive 11 | W2, W4 |
| 6 no room with two floors | `ensureFloor` idempotence + D19 rebuild; W2 tests | W1, W2 |
| 7 built interior reads built; upstairs never earth; holodeck never earth | D8 default rule; W2 D8 tests; drive 7, 12, 13 | W2 |
| 8 outdoor over described ground reads as it | rung 3 + citation; drive 9 | W3 |
| 9 authored beats derived | ladder order; W1 `getMaterial` test; drive 10 | W1 |
| 10 no described ground → sensible | rung 3 default source / rung 4; drive 19 | W2, W3 |
| 11 spill pools in a formerly floorless room | `floorSurfaceNear` → `getFloor`; drive 14 | W1, W2 |
| 12 mine identical | W3 mining suite + `metal-chain` wire; drive 16 | W3 |
| 13 field identical | W3 farming suite + `farming`/`farmstead` wire; drive 17 | W3 |
| 14 a wood answers | D21 — `look floor` in a Wood via rung 3; drive 18 | W3 |
| 15 own floor survives logout without duplicating | fixtures uncaptured + D2; drive 8 | W2 |
| 16 nothing slower; unvisited rooms cost nothing | `pnpm bench` at W2; residency evicts the floor with the room (W0 veto lifts when the host dies) | W0, W2 |
| 17 same ground reads the same, unchosen | D5 by construction; W4 road-walk test; drive 20 | W1, W4 |
| 18 invented material works, list unchanged | D24 literal-row test | W5 |
| 19 the prose's ground is the reported ground | W4 rows; drive 20 | W4 |
| 20 wear/gutter are details of the floor | W4 `paving` + moved `gutter`; drive 21 | W4 |
| 21 the census exists; list 2 may only fall | `lint:ground` + `--report`; drive 24 | W5 |

Nothing unmapped. ⚠ AC 14 is read narrowly (D21); if the user meant the survey
verbs, that is a scope note under Risks, not a gap in the plan.

---

## Test & gate strategy

- **Unit** (kernel, `lib/ground/__tests__`, `lib/boundary/__tests__`,
  `lib/stuff/__tests__`): the D5 fold table; keyword union; default slot;
  `getMaterial` ladder order; `getFloor`; the rebuild; the veto; `ensureFloor`
  idempotence and the opt-out; D8 defaults; the class-roster chain test; the
  invented-material rows. All on **literal rows / synthetic fixtures**
  (`lint:test-content` forbids shipped paths in kernel tests; `lint:test-bootstrap`
  requires the bootstrap import).
- **Pack** (`ground/src/__tests__`, mining, farming, terminus): the moved field
  tests; GroundSource answers by depth; the road walk.
- **Wire** (`ground.dirty.wire.test.ts`): the drive — the only tier that proves
  the binder, the scope walk, the warren-minted Lounge and the persistence
  round-trip together.
- **Only the drive can prove:** a new character sits in the Lounge (1–3);
  the dorm round-trip (8); the forge pour (11); the spill (14); the road walk (20).
- **Gates:** listed under Convention conformance; the new `lint:ground` joins
  `lint:family` by being named `lint:*`.
- ⚠ `pnpm test` runs **twice in the cycle**: before the MR (end of W5) and at
  `/finalize`. Between, `test:near` + touched packs' vitest + `lint:family`.
  Never in the background. A green run stays valid until a source file changes.

---

## Risks & opens

**For the user's eye — decisions made here the requirements did not:**

1. **D12, the procedural default source.** Unauthored outdoor rooms over
   uncited ground will read a *seeded* loam/clay/sand rather than the plain
   default. Lens 1 chose it (derivable underfoot everywhere); lens 2 is
   untouched. If you would rather every uncited street read the plain default
   until the content pass, drop the settings row and keep the seam — one line.
2. **D22 authors four road rooms and moves the yard's `gutter` detail onto
   its floor.** The requirements' non-goal says composition per room is the
   content pass's, and the drive's step 20 requires these four to read
   correctly now. I took the drive as binding for exactly these; nothing else.
3. **D16 makes `forge-floor` sittable.** Additive; AC 5's *"unchanged"* is
   read as *its bulk behaviour unchanged*.
4. **D19 changes CMS go-live behaviour** for every authored fixture (rebuild
   instead of double). A fix, but a fix outside the stated scope.
5. **`stand` takes the preposition too** (D4) — `stand on the table`.
6. **`ceramic/concrete`** as the concrete row's home (a cast mineral binder;
   the tree has no `stone/` and `rock/` reads as natural). Rename freely.
7. **D8's underground rule** (`z < 0` ⇒ on grade) makes a cellar's default
   floor earth/rock. Honest, and new.

**Could break:**

- ⚠⚠ **`postRegister` overrides that do not chain — MEASURED at review, and it
  is SIX, not three.** Counting `super.postRegister` per file across the Location
  family: **zero** in `CartesianLocation.ts`, **`Warren.ts`**,
  `SphericalLocation.ts`, `Bar.ts`, `GlassAlley.ts`, `Lounge.ts`; **one** in
  `Wood.ts` and `Field.ts` (these two already chain). ⭐ **`Warren.ts` is the one
  W2's file list omits** — decide whether a Warren is on the Location path at all;
  if it is, it needs the `super` call, and if it is not, say so in the wave so the
  next reader does not re-derive it. The W2 roster test remains the guard for
  anything else; a class it cannot instantiate from a literal row is a finding to
  record, not to skip.
- **Boot cost.** One extra Thing clone per room clone. Measure at W2 with
  `pnpm bench`; if over the ±6% noise floor, the fallback is minting the
  default floor lazily on the first `getFloor()` **and** in the binder's
  fixture scope walk — record before choosing.
- **`floorConducts` goes live** (D15/D17). Only a metal floor conducts;
  verify the earth rows' authored conductivity stays under
  `electricity.pool.minConductivity` (0.005) and add the assertion to the
  material rows' test.
- **Resolver test fixtures** that used a bare Bulkable now fail structurally
  (W1). That is the intended signal; fix the fixture, never widen `getFloor`.
- **`restoreFromTemplate` + D19**: a fixture a player hung (chattel) is not in
  `_appliedFixtures` and must survive the rebuild — assert it.
- **The heath floor's kind flips with the weather** (D13). Deliberate; the
  drive's step 10 should be run in a dry spell or assert `earth|mire`.
- **`lint:perishable`** on `organic/peat` — check the gate's rule before
  authoring; if peat trips it, author the spoilage fields honestly (peat does
  not rot at any rate that matters) rather than exempting.
- **Two-floor rooms** (`seznick-house/main`: boards and earth). One floor per
  Location; the second surface is a detail. The census carries the row until
  the content pass decides.
- **Rugs and carpets** (6 rooms) are coverings, never the floor — a covering
  over a board floor is a detail today and a `Covering` seam later
  (field-substrate slate). The census lists them.
- **The pack rename means dropping the dev DB** (no migrations, ever).

**Opens the build should decide, not ask:** the exact `GROUND_KIND_PHRASES`
wording; whether `default-floor` keeps its slot block (harmless either way);
the wire file's route to the dorm.

---

## Deferred seams

### ⭐⭐ Combat — the fourth consumer, and it was missing from the roster

No combat pass had been run on this design (raised by the user at plan review).
Three findings, none of them this build's work, all of them its consequences:

1. ⚠ **Combat's `prone` is a session flag, not a posture.**
   `lib/combat/CombatFlags.ts` carries `disarmed` / `prone` / `grappled` /
   `inspired`, *"set by control gambits, gone at session end"* — a parallel model
   of the same fact the posture system owns.
2. ⚠⚠ **The one place combat touches a real posture writes the FIELD, not the
   slot.** `CombatLogic`'s bum's rush ends
   `if (MixinApi.isPosed(target)) target.setPosture(Postures.Lie);` — `setPosture`,
   never `transferPosture`. So a rushed body's `posture` reads *lie* while it
   occupies **no posture-bearing slot**: it is lying on nothing, with no
   `restingOnPath` and no `restingSlot`. That "works" today **only because there is
   no floor to be on**. ⭐ After this build there is one, so the rush can become
   honest by calling `transferPosture` — a one-line change owned by combat, and the
   first thing that makes a floor's material matter in a fight (landing on
   flagstone is not landing on mire).
3. ⚠ **`combat.md:539` claims the rush *"lands `Postures.Lie`"*** without saying it
   bypasses the slot — a doc promising more coupling than the code has, the same
   shape as `residency.md:218` promising `Adornment.canEvict`. Corrected in that
   doc by this build; the mechanism is combat's to change.

⭐ **And the Larian surface question, answered honestly: two of those interactions
already ship.** A spill pools in the floor's surface-bulk slot (the water surface),
and **electricity conducts through a floor puddle** (`ElectricityLogic.findFloor` +
`conductivePoolOf`, with `FloodedCell`) — the flagship water-plus-lightning
interaction, in the game now. What this build adds is the floor's **material**,
which is the input the rest of them need: fire spreading across boards
([fire.md](../subsystems/fire.md)), a body landing on stone versus mud
([materials-response.md](../subsystems/materials-response.md) —
`response = f(mechanism, material, construction)`, and a floor is exactly a
material plus a construction), and slip
([locomotion.md](../subsystems/locomotion.md)). **Grease, ice, blood and clouds are
each a surface this build makes expressible and none that it ships** →
[combat-slate](../slates/builds/combat-slate.md) and
[blood-slate](../slates/builds/blood-slate.md).

### The rest

Clean attach points, each with the slate it leaves as.

- **`dig` reads the floor** — `floor.getGroundKind()`, `floor.isOnGrade()`,
  `floor.resolveUnderfoot()` after a strip; `StrataMixin` for the pit.
  → [extraction-slate](../slates/builds/extraction-slate.md) (its W0 is now
  done; start at W1). Extraction's `mineral/clay` should reuse `earth/clay`.
- **Coverings** (rug, snow, mud over paving) as a layer above the floor;
  `Strata × Soil` composition; the survey verbs (`measure texture`,
  `analyze soil`) narrowing on `SoilMixin` hosts so a Wood answers them
  without farming → [field-substrate-slate](../slates/tails/field-substrate-slate.md).
- **Consequences of the read** — traction, footstep sound, fire across boards,
  tracks in mire, bare feet on glass → the subsystems the requirements name.
- **A `Deck` on a conveyance** composing `FloorMixin` with `onGrade: false` →
  the logistics/conveyance work.
- **The 64 rooms** → the 1.0 content pass on
  [rejection-slate](../slates/builds/rejection-slate.md).
- **Three "something"s in the Lounge** → whoever owns presentation; recorded.
- **`Material.ts:1113-1117`** doc contradiction → the sweep.

---

## Critical files

Read first, in this order:

1. `docs/requirements/ground-requirements.md` · `docs/slates/builds/ground-slate.md`
2. `packages/server/src/mud/lib/stuff/Location.ts` · `lib/boundary/Adornable.ts` · `lib/boundary/Adornment.ts` · `lib/boundary/Exit.ts:233-246`
3. `packages/server/src/mud/platform/thing/Floor.ts` · `lib/slot/Postured.ts` · `lib/slot/Slotted.ts:240-285` · `lib/material/Tangible.ts`
4. `packages/content/generic-objects/content/stuff/thing/surface/default-floor.yaml` and the five sibling rows (Grounding B)
5. `packages/server/src/mud/lib/stuff/PostRegistration.ts` · `api/stuff.ts:360-376` · `lib/location/CartesianLocation.ts:120-135` · `world/lounge/location/Lounge.ts`
6. `packages/server/src/mud/api/mql/resolver.ts:1658` · `platform/idea/api/CommandLogic.ts:2385-2410, 2540-2580` · `platform/content/platform/cmd/posture/*.yaml`
7. `platform/idea/api/{ElectricityLogic.ts:150-200, WeatherLogic.ts:800-860, BulkableLogic.ts:415-455}`
8. `packages/content/trade-mining/src/idea/Deposit.ts` · `trade-mining/src/lib/Working.ts:370-430` · `trade-farming/src/idea/GroundCharacter.ts` · `lib/zone/SpatialZone.ts:30-75` · `lib/Seeded.ts`
9. `packages/content/water/{pack.yaml,package.json,vitest.config.ts,content/settings/water.yaml}` · `water/src/idea/FisheryRegistry.ts` (header)
10. `packages/server/scripts/{check-presentation.ts,check-descriptor-banks.ts:285-312,check-template-census.ts,pack-roots.ts,check-location-classes.ts}`
11. `packages/content/trade-forestry/src/lib/Stand.ts:195-245` (the augmenter shape) · `lib/description/Visible.ts:85-130`
12. `packages/wire/tests/pets.wire.test.ts` · `docs/testing.md § Two tiers`
13. `docs/subsystems/{posture,slot,residency,boundary,location,zone,soil,bulk}.md` · `docs/lint-family.md`

---

## Drive record

*(appended at build time — the output of `ground.dirty.wire.test.ts` on
`WIRE_PORT=2013`, the count, and what each failure was; then the live-browser
pass for the steps the wire cannot settle.)*
