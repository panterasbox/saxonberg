# Houseplant — implementation plan

Executes
[houseplant-requirements.md](../requirements/houseplant-requirements.md) —
phase 1 of [living-world-roadmap.md](../living-world-roadmap.md). Read the
requirements first; this plan does not restate the scope or re-argue the
decisions, it says where the code goes.

**Shape of the build:** one new mixin, four new concrete classes, three new
verbs, one capability-table row, **one small extension to the persistence
core**, and content (including store goods).

> **Revised twice on 2026-07-31.**
>
> 1. The first draft made the plant a *passenger* on the dorm room's capture.
>    Wrong: **a cultivated plant owns its own state and stays durable wherever
>    it is carried.** It is now its own persistence host, which surfaced a
>    stated limitation in the spine (nested hosts assumed singleton) that this
>    build lifts. See Wave 2.
> 2. The second draft fused pot, soil and plant into one `PottedPlant`. Also
>    wrong, and worse: **phase 2 would have thrown it away.** The farming
>    slate already specifies the boutique density as *"a garden bed is a
>    `Slotted` fixture with N slots; each plant is a `Slottable`"* — **a pot is
>    that at N = 1.** The object model is now compositional, and phase 2's bed
>    is this code with a bigger N.

---

## Grounding — facts established by reading the code

Do not re-derive these. Each was checked in the tree at plan time.

### The skeleton

- `lib/wetness/Wet.ts` is the closest shipped analogue and the file to copy
  structurally: decomposed scalar persistence (value + `*ClockStamp`), a
  `_reconciling` reentry guard, a rate derived from real physics via a
  `dial(AppSettingKey, fallback)` helper, a `markupAugmenter` for the banded
  line, sparse defaults.
- `Wet.ts` has a **4-real-hour far-past guard** and an
  `isHasInteractive() && isLinkdead()` freeze branch. **Copy neither.** They
  are the two lines this build exists to not inherit.

### Composition

- `Thing` is already
  `ChattelMixin(ConcealableMixin(WetMixin(VisibleMixin(PerceptibleMixin(
  TangibleMixin(ContainableMixin(Stuff)))))))`. A `Plant extends Thing`
  gets Wet and Chattel for free — leave chattel unstamped.
- `OrganismMixin` (`lib/species/Organism.ts`) is already written for this
  case. Its docstring: *"Plant-Things … compose it on their own concrete
  class"*, and `getSex()` returns `null` *"for v1 plants"*. Persistent fields
  `_speciesPath` / `age` / `lifecycleState`, `isAlive()` / `isDead()`
  predicates, species resolved on each call (no cache, HMR-safe).
- `ReservedMixin` (`lib/reserve.ts`) is **neutral, not Creature-coupled** —
  its own docstring says so and its landscape table lists `fuel`
  (`CombustibleMixin`) and `air` (a `Location`) as non-creature consumers.
  `Wet.ts`'s docstring claims the opposite; that comment is wrong and gets
  fixed in Wave 8.
  - Surface: `getReserve(key)` / `setReserve(Reserve)` / `adjustReserve(key,
    Quantity)` / `hasReserve(key)`. Storage is `public reserves:
    Record<string, ReserveStored>`, a single `persistentFields` entry — so a
    reserve can be **authored directly in a template's `data`**.
  - `Reserve` ctor: `(key, capacity: Quantity, current: Quantity, theme,
    floorEffect)`. Use `theme: 'cultivation'`.
- `Receptacle` (`obj/Receptacle.ts`) is `ThermalMixin(BulkableMixin(Thing))`.
  The watering can is `ToolMixin(Receptacle)` — one line.
- `sessile` body plan ships (`seeds/lib/body-plans/sessile.yaml`): zero slots,
  zero locomotion, zero sensory ports. Nothing to add.

### Persistence — read this section twice

**Persistence is opt-in per host, and only three classes opt in:** `Avatar`,
`DormRoom`, `ConsignmentShelf`. Everything else in the tree is a transient
runtime clone re-seeded from its template.

**A host carries its own record and its own location.**
`PersistedRecord.place` is *"a Containable top-level host's own durable
location (`{startLocation}` or `{container}`), captured … and restored via
`ContainmentApi.resolveLanding` / `move`, overriding the clone-time template
spawn."* It is `null` for a room (not Containable) **or for a host placed by
its referrer**. Avatar rides this exact path. **This is what makes a
persistable plant travel** — its record is its own, not the room's.

**`captureState` needs no custom slice.** It walks
`MixinApi.getPersistenceContributors` and, for any layer without a
`captureSlice` static, captures its declared `persistentFields`. Custom slices
exist only for `Container` / `Slotted`, which encode cross-references by index.
`GrowingMixin` therefore needs **only** `static persistentFields`.

**⚠ The blocker this build lifts.** When a persistable host is nested inside
another, `captureItem` emits `{ ref: templatePath, placement }` — **no key** —
and `restoreItem` → `cloneHost(scope)` resolves it via
`StuffApi.findByTemplatePath`, returning the single live instance if one
exists. `PersistableLogic.cloneHost`'s own comment states the invariant:

> *"A nested host reached by the `{ref}` walk is a **singleton** (unique
> templatePath), so it self-restores its own records here with a keyless
> materialize… **Multi-instance hosts are never nested by ref; their
> establishing context drives their keyed restore.**"*

So two peace lilies cloned from one template would collapse into one on
restore. **Wave 2 extends the ref entry to `{ ref, key }`.** The change is
**four sites** — the type, `captureItem`, `restoreItem`, `cloneHost` — and it
is the same unlock phase 5 needs for pets and livestock.

**Capture is event-driven, not periodic, and not at shutdown.**

- `ResidencyLogic.runEvictionSweep` awaits a capture before destructing a cold
  persistable host; `cleanupOnDestruct` is the sync backstop.
- **Autosave is Avatar-only** — `Avatar.ts`'s own docstring says so ("a future
  persistence/autosave mixin would [be the general home]").
- **`AppBootstrap.shutdown()` persists the world clock and nothing else.**
  There is no world-wide capture pass on graceful shutdown.
- persistence.md: *"rooms/chests have no autosave backstop… Only a hard crash
  mid-session (before any capture) loses since-last-capture changes."*

> **Why this is survivable, and why it still needs a fix.** Reconcile-on-read
> is unusually robust to a stale checkpoint: state is *derived from a clock
> stamp*, not accumulated per tick, so a rolled-back checkpoint re-derives the
> elapsed time on the next read. A tick-based model would lose it outright.
> What a rollback **does** lose is the player's **interventions** — a watering.
> Wave 5 fixes that by capturing after the act (`DormThemes.ts:111` is the
> precedent).

**Chattel is not the answer, and was checked.** `ChattelMixin` gives a durable
per-instance id and an independently durable Mongo row, but it does **not**
resurrect an instance — chattel.md is explicit that a stamped good *"culled
loose in a transient room"* releases its registry row. Chattel is identity and
ownership; it is not a persistence spine.

### Slots — the pot/plant seam

- `SlotSpec` (`lib/slot/Slotted.ts`) is `{ name, accepts, capacity?, covers? }`.
  `accepts` is a **`Mixins` registry constant**, validated at
  `setStaticSlots` time. `capacity` defaults to 1. There is **no size axis** —
  and none is needed:
- **`Slottable.fitsSlot(host, slot)` is the candidate-side acceptance test.**
  The *plant* decides whether it fits, so it reads the pot's soil volume and
  refuses. `Wearable` / `Wieldable` both override it; that is the pattern.
- `Slotted` gives `occupy` / `vacate` / the sole-occupant convenience for
  capacity-1 slots, plus `getSlotSpec(name)`.
- **No generic "put a Slottable in a Slotted" verb ships.** `wear`, `wield` and
  `mount` are each bespoke controllers with their own occupy call. `plant` and
  `repot` are therefore both new controllers — there is nothing to reuse.
- `staticSlots` is authorable in a template's `data` (`seeds/obj/Campfire.yaml`
  is the shipped example), so the pot's slot is content, not code.
- ⚠ **The Slotted capture slice references occupants by index into the
  *container* slice**, and non-content occupants resolve to −1 and are skipped.
  So a slotted plant must live in the pot's **contents** *and* its slot — the
  wear/equip pattern. Get this wrong and the plant vanishes on restore.

### Retail — the store is pure data

`seeds/domain/terminus/general-store/counter.yaml` is a `/lib/retail/Stock`
with `stockLines: [{ itemTemplatePath, par }]` and a `prices:` map, over
templates in `goods/`. It restocks to par on the game-time reset sweep. Adding
goods is **four YAML files and two list entries — no code.**

Its header states the convention that decides the seed's shape: *"The goods are
all discrete Things (never Globbable) so each carries a chattel stamp on buy."*
**A seed is therefore a discrete `Thing`, not a stack.**

Price ladder to calibrate against, from the same header: stipend 20, wages 4–6
per game-hour, coinage 1/5/25; torch 2, rations 3, waterskin 4, clasp-knife 6,
lantern 10.

### Verb names

`plant`, `repot`, `pot`, `sow`, `seed` and `transplant` are **all free** —
checked across every `cmd/` tree including the domain-local bundles.

### Light

- `AmbientLitMixin` ships, but **no seed anywhere sets `ambientIntensity`** —
  zero occurrences across `seeds/` and `packages/content/`. Every room reads
  0 lumens today. Authoring it is this build's work.
- The read is **synchronous**. Canonical call site, copied from
  `MeasureLightController` / `AnalyzeLightController`:
  ```ts
  const vision = PerceptionApi.modalityByName('vision');
  const light = (vision.signalAt(loc) as Light | null) ?? Light.ZERO;
  const lux = light.intensity.rawValue();
  ```
- `VisionModality.signalAt(loc: Stuff & Container)` takes **any Container**,
  not just a Location, and does **not** climb to the parent — `light.md`
  confirms a wardrobe with a closed door "reads ZERO inside".
  > **This is the in-dorm light lever, for free: a plant inside the footlocker
  > reads pitch-black.** Verify it in a test rather than trusting this note.
- `LIGHT_BANDS` = `pitch-black · very-dim · dim · lit · bright · blinding`.
- `measure light` and `analyze light` already ship as player verbs.

### Bulk

- `api/bulk.ts` exports **`BulkableApi`**. Relevant statics:
  `slotFor(stuff, affordance?)`, `transfer(from: BulkSlot, to: BulkSlot | null,
  amount)`, `amountFromQuantity(quantity, fallback)`, `ingest(...)`.
- **`to === null` is a discard sink.** `DrinkController` uses exactly this.
  **`WaterController` is `DrinkController` with the plant's moisture reserve in
  place of `ingest`** — copy it line for line, including the "capture the
  material BEFORE the transfer empties the slot" comment.
- `UnboundedReceptacle` + `seeds/obj/vessel/urn.yaml` is the verbatim template
  for the water source. `/lib/material/bulk/water.yaml` ships.

### The capability table

`lib/craft/ToolCapability.ts` holds `TOOL_CAPABILITIES` (closed, validated) and
`CAPABILITY_TABLE`. `ToolMixin.getInstanceContributions` (`lib/craft/Tooled.ts`)
walks an instance's authored `capabilities`, pushes each kind's verbs into
`inventory`, and *additionally* into `environment` when placement is
`reachable`. The precedent for a carried tool:

```ts
whetstone: { verbs: ['crafting/sharpen.yaml'], placement: 'carried' },
```

### Content plumbing

- `PopulatesMixin` accepts `PopulateSpec = string | { template: string; onto:
  string }`. The `onto` form places onto a **`Surfaced`** host that must appear
  **earlier in the list**. `Desk` is `Surfaced`.
- `DormRoom` lays born-with fixtures down **exactly once** and restores
  captured state on every later wake. **A dead plant stays dead** for free.
- Seeds are **directory-scanned**, no manifest: `seeds/obj/X.yaml` → `/obj/X`.
- App settings: `mud/config/app-settings.yaml`, a `settings:` list of
  `{ key, value }` (values are **strings**), insert/merge-missing. Key
  constants in `lib/config/AppSettings.ts`; the `wetness.*` block is the
  formatting precedent.
- `Mixins` registry: `lib/mixin.ts`. Predicate: `MixinApi.isGrowing` in
  `api/mixin.ts`, copying `isWet`.

### Content that already exists (do not re-author)

- The peace lily species row **ships**:
  `packages/content/species-and-names/content/lib/species/plantae/
  tracheophyta/liliopsida/alismatales/araceae/spathiphyllum/wallisii.yaml`.
  The farming slate's "documentation-only" claim is wrong.
- `/lib/material/tissue/plant-tissue` ships.
- Duncan Hall rooms: `lobby`, `corridor`, `steps`, `cistern`, `dormroom`, plus
  `dorm-fixtures/{bed,desk,footlocker}`.

---

## Decisions the requirements left to implementation

**A. Fields on `GrowingMixin`.** All plain scalars (`persistentFields`):

| field | meaning |
|---|---|
| `growthClockStamp: number` | game-seconds reconcile cursor; `0` = untouched |
| `_vigor: number` | `[0,1]` smoothed condition — **the condition score** |
| `_maturity: number` | accumulated good-time toward the next stage |
| `growthStage: string` | `seedling \| young \| established \| mature` |
| `_flowering: boolean` | latched at maturity in good condition |
| `_lastLux: number` | the light reading the window is integrated with |
| `profile: GrowthProfileData` | the authored reaction-norm block |

Soil moisture is **not** here — it is `reserves['moisture']` on
`ReservedMixin`, so it persists and authors independently.

**B. The reconcile.** Sync, read-triggered, no scheduler:

1. Resolve game-seconds; bail if no world clock (the `Wet.ts` null-guard).
2. First touch (`stamp === 0`) → seed the stamp, integrate nothing.
3. `elapsed <= 0` → restamp, return. Dead → return (terminal).
4. **No far-past guard. No linkdead branch.**
5. `steps = min(ceil(elapsed / STEP_SEC), MAX_STEPS)`; `dt = elapsed / steps`.
   The bound is a **step cap, never a time cap**.
6. Per step: drain moisture by `ET(dt) × warmthMultiplier()`; compute
   `satWater` and `satLight` from `profile` (`_lastLux` supplies the light);
   `limiting = min(satWater, satLight)`; relax
   `_vigor += (limiting - _vigor) × dt / TAU`; accrue `_maturity` when
   `limiting ≥ GOOD_AT`; check the death floor.
7. Advance `growthStage` on `_maturity` thresholds; latch `_flowering` at
   `mature` **and** `_vigor ≥ THRIVING_AT`; clear it if vigor falls back.
8. Checkpoint: write back, `growthClockStamp = now`.

**C. Light is segmented at moves, not integrated from history.** There is no
light history, so the window uses `_lastLux` and re-samples at the end. To keep
that honest, **`onMoved(from, to)` forces a reconcile and then re-samples
`_lastLux`**. Moving the plant into the footlocker closes the lit window at the
moment of the move, exactly like watering closes the dry window.

**D. Death.** `_vigor` crossing below `DEATH_AT` sets `lifecycleState =
'dead'`, clears `_flowering`, and makes `reconcileGrowth` a no-op. Exponential
relaxation never reaches zero, so the *crossing* is what latches — check it
every sub-step. No auto-destruct.

**E. Calibration (all dials).** Under the 12× clock 1 real day = 12 game days =
1,036,800 game-seconds. Targets:

| behaviour | target |
|---|---|
| full pot → `stressed` | ~1 real day |
| → `failing` | ~3 real days |
| → `dead` | ~7 real days |
| `seedling` → `mature`, well kept | ~2 real weeks |

Propose literals that hit these, seed them, and say in the doc that they are
placeholders for a running game.

**F. Composition — four objects; the plant is the persistence host.**

```ts
// obj/Plant.ts — PersistableMixin OUTERMOST (the host rule)
PersistableMixin(
  PostRegistrationMixin(
    SlottableMixin(
      GrowingMixin(
        ReservedMixin(
          OrganismMixin(ThermalMixin(DetailedMixin(Thing))))))))

// obj/PlantPot.ts — the Slotted host + the soil holder. NOT a persistence host.
SlottedMixin(BulkableMixin(DetailedMixin(Thing)))

// obj/Seed.ts — a discrete Thing naming what it grows into
DetailedMixin(Thing)

// obj/WateringCan.ts
// Receptacle is already ThermalMixin(BulkableMixin(Thing))
ToolMixin(Receptacle)
```

`PersistableMixin` **must be outermost** on `Plant` so its
`cleanupOnDestruct` fires before `Container` evacuates and its
`applyPopulates` override wraps `Populates` — the documented host rule.

The pot authors its slot in template `data`:

```yaml
staticSlots:
  - { name: plant, accepts: SlottableMixin, capacity: 1 }
interiorBulk: true
interiorCapacity: 0.5          # litres of soil — THE ROOT CEILING
```

**Only `Plant` is a persistence host.** The pot's Slotted/Bulkable state nests
inside whatever holds it; the plant inside it is a `{ref, key}` entry (Wave 2).
So a pot in a dorm room restores as: room → pot (nested state) → plant (own
record). A pot in a transient room is culled with it and the plant is
abandoned — the documented rule, uniformly applied.

**G. Moisture lives on the plant, not the pot.** The physically prettier model
puts water in the soil; it is rejected because it splits one checkpoint across
two objects, and the reconcile, the clock stamp and the record are all the
plant's. The pot supplies **volume**; the plant owns its root-zone moisture
`Reserve`. Watering a pot with nothing planted in it says so and changes
nothing.

**H. Root room is the third limiting factor, and one curve gives two
behaviours.** `min(satWater, satLight, satRoot)` where

```
satRoot = clamp(potSoilVolume / profile.rootDemand[stage], ROOT_FLOOR, 1)
```

- `ROOT_FLOOR` (a dial, ~0.4) means a pot-bound plant **holds at a visible band
  and never dies** — honest, and it makes the third factor behave differently
  from water and light **with no special-casing**.
- Maturity accrues only when `limiting ≥ GOOD_AT`, and `ROOT_FLOOR < GOOD_AT`,
  so a pot-bound plant also **stalls**. Both fall out of the one expression.
- `getLimitingFactor()` returns `'root'` → *"it has outgrown its pot."*
  **That line is the entire tutorial for transplanting.**

`Plant.fitsSlot(pot, 'plant')` returns `potSoilVolume ≥ rootDemand[stage]`, so
a mature plant refuses a thimble at `repot` time. **No new `SlotSpec` field.**

**I. Flowering sets a seed.** On the flowering latch, clone one `Seed` into
the pot's contents, **once per flowering episode** (a `_seedSet` boolean
cleared when flowering clears). The player takes it with the shipped `get`. No
new verb, no economy, and the propagation loop closes.

`PersistableMixin` **must be outermost** so its `cleanupOnDestruct` fires
before `Container` evacuates and its `applyPopulates` override wraps
`Populates` — the documented host rule.

`GrowingMixin` requires `Reserved` on its host; assert it at first use with a
clear error rather than silently reading zero. `ThermalMixin` supplies
`getTemperature()`; if it needs weather fan-out registration to read sanely
indoors, fall back to `Wet.ts`'s behaviour (neutral multiplier when the read
throws) and note it.

**J. The persistence key is per-instance, minted lazily, never at register.**

- `_persistenceKey` is a **protected, transient** field (not persistent),
  written by `PersistableLogic` when a keyed op resolves a key.
- **Mint on first capture if absent** (a UUID), **never in `postRegister`** —
  a keyed restore sets the key *after* register, so minting at register would
  race the real key. Expose it as a small private `ensureCultivationKey()` on
  `Plant`, called from the capture path.
- Record identity is therefore `(scope = /obj/plant/<leaf>, key = <uuid>)`.

**K. Growing ⇒ cultivated ⇒ durable. There is no "ambient plant" class.**
Decorative greenery in a lobby is **scenery** — an ordinary `Thing` with a
description, which already ships and needs no code here. A `Plant` is by
definition a thing a player grows. `shouldPersist()` is the existing
per-instance hatch for a wizard's throwaway test clone.

**L. A cultivated plant left loose in a transient room is abandoned.**
Durable in any persistable host — inventory (Avatar), the dorm, later an
apartment or a field. Left on the floor of a public room it is culled with the
room, exactly as chattel.md already specifies for owned goods. **One rule
across all owned things; no rescue registry, no boot walk.** Say so in the
subsystem doc; do not add a bespoke save path.

**M. `PersistableApi.captureHostOf(stuff)`** — if `stuff` is itself
persistable, capture it; otherwise walk `getContainer()` outward to the first
persistable ancestor and capture that, with its `getPersistenceKey() ??
undefined`. No-op when none is found; hop-capped against a containment cycle.
A new static on an **existing facade, not a new Api**; every later phase in the
family needs the identical walk.

**N. Two templates over one class**, `seeds/obj/plant/{peace-lily,
snake-plant}.yaml` → `/obj/plant/peace-lily`, `/obj/plant/snake-plant`.

---

## Wave 1 — the growth substrate

No content, no verb, no plant, no persistence. A mixin and its tests.

### Files

- **`lib/husbandry/Growing.ts`** (new folder — signed off in the
  requirements). Exports `GrowingMixin`, `interface Growing`, `type
  GrowthProfileData`, `type ConditionBand`, `type GrowthStage`.
  - `static _mixinName = 'GrowingMixin'`
  - `static persistentFields = [...]` (Decision A)
  - `static markupAugmenters = [conditionAugmenter]`
  - Public surface (methods only): `getVigor()` · `getConditionBand()` ·
    `getGrowthStage()` · `isFlowering()` · `getSoilMoisture()` ·
    `waterPlant(litres)` · `getLimitingFactor(): 'water' | 'light' | null` ·
    `reconcileGrowth()` · `getProfile()` / `setProfile()`
  - Private: `dial()` (copy `Wet.ts`'s), the satisfaction curves, `ET`,
    `warmthMultiplier()`, `growthNowSeconds()`, `_reconcilingGrowth` guard.
- **`lib/mixin.ts`** — `Growing: 'GrowingMixin'`.
- **`api/mixin.ts`** — `isGrowing`, copying `isWet` verbatim in shape.
- **`lib/config/AppSettings.ts`** — a `husbandry.*` key block.
- **`config/app-settings.yaml`** — seed every key with its literal.

### Tests — `lib/husbandry/__tests__/Growing.test.ts`

Against a bare `GrowingMixin(ReservedMixin(Thing))` fixture:

- first touch seeds the stamp and integrates nothing
- moisture drains over elapsed game-time; a watered plant holds
- `min(satWater, satLight)` governs — starving *either* input alone caps vigor,
  and `getLimitingFactor()` names the right one
- the band ladder walks `thriving → healthy → stressed → failing → dead` in
  order and never skips
- **⭐ a multi-real-day gap reconciles fully** (the far-past-guard proof — the
  single most important test in the build)
- **⭐ an absurd gap (a simulated year) completes in bounded work** and lands
  in a sane state (the step-cap proof)
- a linkdead-flagged host still reconciles (the freeze branch is absent)
- death latches: once `dead`, further reconciles are no-ops and watering does
  not revive
- reentry: the augmenter reads through the getter without recursing
- `warmthMultiplier` degrades gracefully when Thermal is absent or throws

---

## Wave 2 — keyed nested hosts (the persistence-core extension)

Independent of plants, and testable without one. Do it before Wave 3 so the
plant lands on a spine that can hold it.

### Files

- **`lib/persistence/PersistenceSlice.ts`** — widen the ref member of
  `ContentEntry` and `RefEntry` to `{ ref: string; key?: string; placement:
  Placement }`. `key` is **optional**, so every existing record stays valid and
  singleton behaviour is unchanged.
- **`obj/api/PersistableLogic.ts`**
  - `captureItem` — emit `key: item.getPersistenceKey() ?? undefined` alongside
    `ref`.
  - `restoreItem` — pass `entry.key` through to `cloneHost`.
  - `cloneHost(scope, key?)` — **when a key is present**, skip the
    `findByTemplatePath` dedup entirely, `StuffApi.clone` a fresh shell,
    `setPersistenceKey(key)`, and `materializeImpl(nested, key)`. **When absent,
    behave exactly as today** (the singleton path).
  - Update the comment that states the singleton invariant — it is now the
    *keyless* invariant.
- **`api/persistable.ts` + `obj/api/PersistableLogic.ts`** — add
  `captureHostOf(stuff)` (Decision J). The Api↔logic split is mandatory: the
  static forwards, the walk lives in the logic singleton.

### Tests — `obj/api/__tests__/PersistableKeyedNesting.test.ts`

- **⭐ two keyed instances of one template, nested in one host, restore as two
  distinct instances with their own state** — the collapse this wave exists to
  prevent
- a keyless ref entry still resolves to the single live instance (no regression
  to `DormRoom` / `ConsignmentShelf`)
- a record written before this change (no `key` field) restores unchanged —
  **backward compatibility is a hard requirement**, there is live data
- a keyed nested host's `place` is null (it is placed by its referrer) while a
  top-level one captures its container
- `captureHostOf`: a persistable target captures itself; a non-persistable one
  walks to its ancestor with the right key; no ancestor is a clean no-op, not a
  throw; a containment cycle terminates at the hop cap

---

## Wave 3 — the objects: pot, soil, seed, plant

### Files

- **`obj/Plant.ts`** — the composition in Decision F, plus:
  - `fitsSlot(host, slot)` → `potSoilVolume ≥ profile.rootDemand[stage]`
    (Decision H)
  - `onMoved(from, to)` → `reconcileGrowth()` then re-sample `_lastLux`
    (Decision C)
  - lazy key minting (Decision J)
  - the seed-set-on-flower hook (Decision I)
  - nothing else; the growth behaviour is all in the mixin
- **`obj/PlantPot.ts`** — `SlottedMixin(BulkableMixin(DetailedMixin(Thing)))`.
  Thin: a `getSoilVolume()` reading its bulk slot's amount of soil-tagged
  material, and a `hasSoil()` predicate the verbs gate on. The slot and
  capacity are authored data, not code.
- **`obj/Seed.ts`** — `DetailedMixin(Thing)` with one persistent field,
  `growsIntoPath` (the plant template it mints), plus a `_speciesPath` for its
  own description. Discrete, never `Globbable` (the store's convention).
- **`seeds/obj/plant/peace-lily.yaml`** — `class: /obj/Plant`, `_speciesPath:
  /lib/species/plantae/tracheophyta/liliopsida/alismatales/araceae/
  spathiphyllum/wallisii`, `lifecycleState: alive`, `material:
  /lib/material/tissue/plant-tissue`, an authored `reserves.moisture`
  (`theme: cultivation`, `floorEffect: wilting`), and a `profile` block:
  thirsty, wants bright indirect light, generous per-stage root demand.
- **`seeds/obj/plant/snake-plant.yaml`** — same class, inverted profile:
  drought-tolerant, low-light-tolerant, slower to mature, modest root demand.
- **`seeds/obj/pot/{small,large}.yaml`** — `class: /obj/PlantPot`, the
  `staticSlots` + `interiorBulk` block from Decision F. The small pot carries
  a `seedling`/`young` root ceiling; the large one carries `mature`.
- **`seeds/obj/plant/seed/{peace-lily,snake-plant}.yaml`** — `class:
  /obj/Seed`, `growsIntoPath` pointing at the matching plant template.
- **Potting soil `Material`** in `packages/content/base-library/content/lib/
  material/bulk/potting-soil.yaml`, following `water.yaml`'s shape with a
  granular/solid tag set (`BulkableApi.ingestSolid` exists — bulk is not
  liquid-only).
- **New species row** for the snake plant (*Dracaena trifasciata*) in
  `packages/content/species-and-names/content/lib/species/plantae/…`, copying
  the peace lily row's shape and binomial directory nesting.

### The condition augmenter

Two lines appended to the long description, band first, cause second, both
prose and never a number:

```
It looks healthy.
The soil is dry.
```

The cause line comes from `getLimitingFactor()` and is **omitted** when nothing
is limiting. The band vocabulary describes *state*, never cause — that split is
deliberate and phase 7 generalizes it.

### Tests — `obj/__tests__/Plant.test.ts`

- a plant in a pot reads its species, stage and band on `look`
- **the two species diverge under identical treatment** — the same watering gap
  that kills the peace lily leaves the snake plant alive; the same light level
  that stresses the lily does not stress the snake plant
- good care advances all four stages and latches flowering at `mature`
- flowering clears when vigor falls back below the threshold
- **flowering sets exactly one seed**, and does not set a second until
  flowering has cleared and re-latched
- **⭐ root-bound behaves on both axes**: a plant whose stage demand exceeds its
  pot's soil volume names `'root'` as the limiting factor, **stalls** (maturity
  stops accruing) and **does not die** (holds at the `ROOT_FLOOR` band across a
  long simulated span). Repotting into a larger pot resumes maturation.
- `fitsSlot` refuses a mature plant into a small pot and accepts it into a
  large one
- a plant with no pot at all declines (no water source) without crashing
- `onMoved` closes the light window: moving from a lit room to a dark container
  mid-window does not credit the dark hours as lit
- **a plant inside the footlocker reads pitch-black** (verify the
  `signalAt`-on-a-non-Location behaviour rather than trusting the grounding
  note; if it climbs to the parent instead, the lever becomes room-to-room
  placement and Wave 6's ambient authoring carries it — adjust the content, not
  the model)
- **two plants cloned from the same template hold independent state** (the
  Wave 2 property, now on the real class)
- ⚠ **the slotted plant is in the pot's contents *and* its slot** — assert the
  capture-slice index alignment directly, since a −1 index silently drops the
  occupant on restore

---

## Wave 4 — the assembly verbs

### Files

- **`cmd/inventory/plant.yaml` + `obj/command/inventory/PlantController.ts`** —
  `plant <seed> in <pot>`. Args: `seed` (object, required, `scope: reachable`),
  `pot` (object, required, prepositions `[in, into]`). Rejections, each with
  its own note kind and a plain-language line: target is not a seed; target is
  not a pot; **the pot has no soil**; the slot is occupied. On success:
  `StuffApi.clone(seed.getGrowsIntoPath())` → move into the pot's contents →
  occupy the `plant` slot → `StuffApi.destruct(seed)` →
  `PersistableApi.captureHostOf(plant)`.
- **`cmd/inventory/repot.yaml` + `obj/command/inventory/RepotController.ts`** —
  `repot <plant> into <pot>`. Same rejections plus **`fitsSlot` refusal**, whose
  message must name the reason ("the pot is too small for it"). On success:
  vacate the old slot, move, occupy the new one, capture.
- Category is `inventory` — both verbs are "put this thing in that thing",
  which is where `put` / `wear` / `wield` already live. No new category.

### Tests — `obj/command/inventory/__tests__/PlantVerbs.test.ts`

- `plant` into a soil-filled pot mints the right species, consumes the seed,
  and occupies the slot
- `plant` into an empty (soil-less) pot rejects and consumes nothing
- `plant` into an occupied pot rejects
- `repot` moves a plant and preserves every scrap of its state (moisture,
  vigor, stage, clock stamp) — **the transplant must not reset the plant**
- `repot` into a too-small pot rejects with the sizing message
- both verbs capture the plant's record on success

---

## Wave 5 — watering

### Files

- **`lib/craft/ToolCapability.ts`** — add `'watering'` to `TOOL_CAPABILITIES`
  and `watering: { verbs: ['bulk/water.yaml'], placement: 'carried' }` to
  `CAPABILITY_TABLE`. Nothing else in the crafting surface changes.
- **`obj/WateringCan.ts`** — `ToolMixin(Receptacle)`.
- **`seeds/obj/vessel/watering-can.yaml`** — `interiorBulk: true`, capacity
  around 2 L, `capabilities: [watering]`. Starts empty.
- **`cmd/bulk/water.yaml`** — verb `water`; `validators: requiresAnimate`; args
  `target` (object, required, `scope: reachable`, `mustBeVisible`) and `source`
  (object, optional, prepositions `[with, from]`). Help text and two examples,
  matching `pour.yaml`'s register.
- **`obj/command/bulk/WaterController.ts`** — copy `DrinkController`:
  1. resolve `target`; reject `empty-result` if absent
  2. `MixinApi.isGrowing(target)` — else reject `controller-rejected {
     not-a-plant }`
  3. resolve the source: the named `source`, else the first carried `Bulkable`
     holding water; else reject `controller-rejected { no-water-source }`
  4. `BulkableApi.slotFor(source, …)`; reject if empty
  5. capture the material **before** the transfer, then
     `BulkableApi.transfer(fromSlot, null, amount)` — pass an **explicit
     amount** computed from the moisture reserve's headroom, not
     `{ kind: 'all' }`, so a 2 L can does not vanish into a small pot
  6. `target.waterPlant(result.applied)`
  7. `await PersistableApi.captureHostOf(target)` — with the plant now a host
     this captures the **plant itself**. A failed capture must not fail the
     verb; log and continue.
  8. forward `result.notes` to `context.note`, then `MessageApi.scene(...)`
     with a self line and a peers line
  9. return `void` — the outcome rides the envelope

### Tests — `obj/command/bulk/__tests__/WaterVerb.test.ts`

- `water` is **absent** with no can and **present** while carrying one
  (`placement: 'carried'` — inventory bucket only, so a can on the floor must
  not confer it)
- `water <plant>` raises soil moisture and debits the can
- **`water <pot>` resolves to the pot's occupant** and behaves identically —
  naming either half of the assembly works, because a player will type both
- **`water <empty pot>` says there's nothing planted in it** and changes nothing
- watering a full plant transfers only the headroom; the can keeps the rest
- `water <not a plant>` and `water` with no source reject with the right note
  kinds and change no state
- `pour <can> into <plant>` still works through the shipped bulk path
- watering captures the plant's own record (assert the write, not just the call)

---

## Wave 6 — content, commerce and placement

### Files

**The starter — the dorm.**

- **`seeds/domain/eternal/duncan-hall/dormroom.yaml`** — extend `populates:`:
  bed/desk/footlocker stay, then the watering can, the tap, and a **small pot
  already filled with soil and already holding a peace lily**, placed as
  `{ template: /obj/pot/small, onto: <the desk entry's path> }`. Order matters
  — the surface must be populated first.
  > **The pot's soil and occupant are authored on the pot template**, not
  > assembled by the room: the pot seeds with its bulk slot pre-filled and its
  > own `populates:` bringing the plant into its slot. That keeps the dorm seed
  > a list of items rather than an assembly script, and it means a bought pot
  > can ship empty from the identical class.
- **`seeds/domain/eternal/duncan-hall/dorm-fixtures/tap.yaml`** — an
  `/obj/UnboundedReceptacle` holding `/lib/material/bulk/water`, copying
  `seeds/obj/vessel/urn.yaml`. Prose should sit with the room's register.

**The commerce — the general store. Content only, no code.**

- **`seeds/domain/terminus/general-store/goods/`** — four new templates:
  `flower-pot-small`, `flower-pot-large`, `potting-soil` (a sack: an ordinary
  bulk holder pre-filled with the soil material), `snake-plant-seed`. They are
  discrete Things, per the counter's stated convention.
- **`counter.yaml`** — four `stockLines` entries with a `par`, and four
  `prices` entries. Calibrate against the shipped ladder in the file's own
  header (stipend 20; torch 2, rations 3, waterskin 4, clasp-knife 6, lantern
  10). Suggested shape, not gospel: small pot ~3, large pot ~8, sack of soil
  ~2, seed ~5. **The large pot must be a real but reachable purchase** — it is
  the first thing a player has a reason to buy, and the reason is legible
  before the purchase.

**The light.**

- Set `ambientIntensity` on `dormroom.yaml` (`lit`) and on `corridor.yaml` /
  `lobby.yaml` at plausible values. Leave `cistern.yaml` unauthored (dark). The
  value is **flux in lumens**, divided by the room's size scale to reach lux —
  pick numbers against `Light.bandFor`'s thresholds, not by feel.
  > This is the first content in the tree to use `AmbientLitMixin` at all.
  > Sanity-check that it changes no existing perception or concealment test.

### Tests — `domain/eternal/duncan-hall/__tests__/DormHouseplant.test.ts`

- a freshly admitted dorm room contains a soil-filled pot with a plant in it
  resting on the desk, a watering can, and a working water source
- fill the can at the tap → water the plant → moisture rises: the full loop
  through real verbs
- moving the pot into the footlocker degrades the plant's light satisfaction
  and the cause line says so
- **⭐ the whole lifecycle end to end, through real verbs only**: buy a pot and
  a sack of soil and a seed → `pour` the soil in → `plant` the seed → water it
  to maturity → it flowers and sets a seed → it outgrows the small pot and says
  so → buy the large pot → `repot` → maturation resumes. This is the build's
  acceptance walk; if it reads awkwardly, the verb surface is wrong.
- the store restocks all four goods to par on the reset sweep

---

## Wave 7 — durability, proven where it matters

No new production files. This wave exists so the properties that motivated the
whole design cannot be skipped.

### Tests — same file as Wave 6

- a potted plant on the desk survives a reap/restore cycle with moisture,
  vigor, stage, flowering, **its pot and soil**, **its slot occupancy** and its
  `restingOn` surface intact
- **⭐ carry it out of the dorm and it stays yours.** Move the **pot** into the
  avatar's inventory, restore the avatar, and assert the plant comes back with
  its own state — the *plant's* record, reached by `{ref, key}` through the
  pot's nested slice, with no dorm involvement anywhere in the path. Assert the
  growth **continued** across the gap rather than merely surviving it.
- **⭐ two dorm rooms, two plants, no bleed.** Independent state across two
  live instances of the same template in different rooms.
- a **dead** plant is still dead after restore, and `seedBornWith` does not
  re-seed a replacement
- **the abandonment rule holds and is observable**: a plant left in a transient
  room is culled with it and does not come back (Decision I — assert the
  documented behaviour, don't leave it untested)
- **⭐ the restart-rollback property.** Water, capture, water again *without*
  capturing, restore from the earlier record. Assert (a) the second watering is
  lost and (b) **the elapsed time is not** — the plant re-derives forward from
  the restored stamp. This is what makes reconcile-on-read survivable under an
  event-driven capture spine, and the whole family inherits it. Then re-run
  with `captureHostOf` wired and assert the watering survives.
- growth advances across a simulated multi-day absence with no player present
  and no scheduler running

---

## Wave 8 — documentation and corrections

### New

- **`docs/subsystems/husbandry.md`** — the permanent record. Must cover: the
  reconcile contract and its trigger points · the `GrowthProfileData` schema ·
  both band vocabularies · **the clock rule and why the far-past guard is
  excluded** · the light-sampling approximation and why `onMoved` segments it ·
  the calibration table · **the expected migration of the profile onto
  `Species` in phase 5** · and, for phase 6, that `_vigor` is the intended
  resistance term — *good husbandry is immunity*.
  - **The durability model, stated plainly**, because it is what a later phase
    will get wrong:
    > **Growing ⇒ cultivated ⇒ durable.** A `Plant` owns its own
    > persistence record, keyed per instance, and carries its own location — so
    > it keeps growing wherever you take it. Decorative greenery is scenery,
    > not a `Plant`, and needs none of this. A cultivated plant left
    > loose in a transient room is **abandoned**, the same rule chattel already
    > applies to owned goods.
  - And the note phase 5 needs: **pets and livestock are this same shape** —
    many instances of one template, each its own keyed host — which is what
    Wave 2 unlocked.

### Corrections (each is an acceptance criterion)

- **`obj/api/PersistableLogic.ts`** — `cloneHost`'s comment asserting that
  nested hosts are singletons is now the *keyless* case. Rewrite it.
- **`docs/subsystems/persistence.md`** — document the `{ref, key}` entry and
  the keyed nested-host restore. This is a real spine capability, not a
  houseplant detail.
- **`lib/wetness/Wet.ts`** — the docstring's claim that `Reserve` is
  "biological (Creature-coupled)" is wrong; `reserve.ts` says the opposite and
  lists two non-creature consumers. Fix the comment; no behaviour change.
- **`docs/slates/builds/farming-slate.md`** — the peace-lily row is not
  documentation-only; it ships. Correct both occurrences (the substrate-mapping
  table row and open question 4's caveat).
- **`docs/living-world-roadmap.md`** — phase 1's "indoor ambient light is
  authored and ships" is half wrong: the mixin ships, no content uses it.
  Record that this build authored the first ambient values **and** lifted the
  keyed-nested-host limit.
- **`CLAUDE.md`** — one-line pointer to `husbandry.md` in the documentation
  map, in the established terse style.

---

## Deferred seams — attach points, not stubs

- **`_vigor` is the condition score.** Phase 5 gives it a general home across
  livestock and pets; phase 6 reads it as the disease resistance factor. Do not
  generalize it here.
- **`Organism.age`** is stamped as time passes but nothing drives lifecycle
  from it. The general maturation driver is phase 5's.
- **The growth profile → `Species`.** Phase 5 owns the `Species` schema.
- **No `PathogenBehavior`, no growth term.** Phase 3.
- **A general autosave / periodic-capture mixin.** `Avatar.startAutoSave` is
  the only periodic capture in the tree and its own docstring names the
  generalization as future work. `captureHostOf` after a mutating act covers
  this build; the general version should be designed against several hosts.
- **Persistence for owned *ground*.** A plant is a movable host and solves its
  own case. A garden bed or a Warren-budded field-room is a **room**, which is
  the `DormWarren` keyed-holder pattern — phase 2 and phase 4 pay for that.
- **The finite-but-regenerating bulk source.** Named as deferred in
  `lib/bulk/UnboundedSource.ts`'s own docstring. The tap is infinite.
- **The switchable desk lamp.** `obj/Lamp.ts` and `device/switch.yaml` ship, so
  an in-room light lever is cheap — but it means dimming a room every player
  lives in, a blast radius this build should not take.
- **No Discipline.** No agricultural Discipline row ships and this build does
  not author one. Content authoring is parallel work.

---

## Standing rules that bite in this build

- **No new Api.** No `PlantApi` / `HusbandryApi` / `GrowingApi`.
  `captureHostOf` is a new static on the **existing** `PersistableApi`, and the
  `XApi`↔`XLogic` split is mandatory for it.
- **No new exported helper functions.** Curves, `ET`, and `dial` are private
  members of the mixin, exactly as in `Wet.ts`.
- **Backward compatibility on the persistence core.** `key` is optional and
  live records exist. A pre-change record must restore unchanged.
- **`PersistableMixin` composes outermost.** Non-negotiable host rule.
- **Module scope declares; lifecycles initialize.** `pnpm lint:module-scope` is
  CI-gating.
- **No `.js` import extensions.** 80 columns, 2-space indent, trailing commas.
  **Never run `prettier --write`** — quote style is mixed by area; match the
  file you are in.
- **`NamedMixin` is proper names only.** The plant is a
  `Visible.shortDescription` ("a peace lily").
- **Banding is presentation, never security.** Nothing gates on a band.
- **Controllers return `void`.** Outcome rides `ctx.note` + the envelope.
- **`TOOL_CAPABILITIES` is a closed, validated vocabulary.** Adding `watering`
  is the sanctioned extension; a parallel table is not.
- Green before the MR: `pnpm build`, `pnpm test`, `pnpm lint`,
  `pnpm lint:gates`, `pnpm lint:module-scope`.

---

## Critical files

**Read before starting**

| File | Why |
|---|---|
| `lib/wetness/Wet.ts` | the structural template, and the two lines not to copy |
| `lib/reserve.ts` | `Reserve` / `ReservedMixin`, and the neutrality claim |
| `lib/species/Organism.ts` | already written for plants |
| `lib/persistence/Persistable.ts` | the host contract; key, `shouldPersist`, the outermost rule |
| `lib/persistence/PersistenceSlice.ts` | `ContentEntry` / `RefEntry` — the Wave 2 type change |
| `obj/api/PersistableLogic.ts` | `captureState`, `captureItem`, `restoreItem`, `cloneHost`, `restorePlacement` |
| `obj/Avatar.ts` | the only shipped mobile host — `place`, autosave, capture triggers |
| `domain/eternal/duncan-hall/DormWarren.ts` | the keyed-holder pattern, for contrast |
| `obj/command/bulk/DrinkController.ts` | `WaterController`'s direct ancestor |
| `lib/craft/ToolCapability.ts` + `lib/craft/Tooled.ts` | the affordance seam |
| `lib/stuff/Populates.ts` | the `onto` spec that puts the pot on the desk |
| `lib/slot/Slotted.ts` + `lib/slot/Slottable.ts` | `SlotSpec`, `fitsSlot` as the candidate-side test |
| `lib/slot/Wearable.ts` | the shipped `fitsSlot` override to copy |
| `obj/command/inventory/WearController.ts` | the only occupy-a-slot verb to model `plant`/`repot` on |
| `seeds/domain/terminus/general-store/counter.yaml` | `stockLines` / `prices` / the discrete-goods convention |
| `seeds/obj/Campfire.yaml` | `staticSlots` authored as template data |
| `obj/command/perception/MeasureLightController.ts` | the canonical light read |
| `seeds/obj/vessel/urn.yaml` | the water source, verbatim |
| `seeds/domain/eternal/duncan-hall/dormroom.yaml` | where the content lands |

**Created**

`lib/husbandry/Growing.ts` · `obj/Plant.ts` · `obj/PlantPot.ts` ·
`obj/Seed.ts` · `obj/WateringCan.ts` · `obj/command/bulk/WaterController.ts` ·
`obj/command/inventory/{Plant,Repot}Controller.ts` · `cmd/bulk/water.yaml` ·
`cmd/inventory/{plant,repot}.yaml` ·
`seeds/obj/plant/{peace-lily,snake-plant}.yaml` ·
`seeds/obj/plant/seed/{peace-lily,snake-plant}.yaml` ·
`seeds/obj/pot/{small,large}.yaml` · `seeds/obj/vessel/watering-can.yaml` ·
`seeds/domain/eternal/duncan-hall/dorm-fixtures/tap.yaml` · four general-store
goods templates · the potting-soil material · the snake-plant species row ·
`docs/subsystems/husbandry.md` · five test files

**Modified**

`lib/persistence/PersistenceSlice.ts` · `obj/api/PersistableLogic.ts` ·
`api/persistable.ts` · `lib/mixin.ts` · `api/mixin.ts` ·
`lib/config/AppSettings.ts` · `config/app-settings.yaml` ·
`lib/craft/ToolCapability.ts` ·
`seeds/domain/eternal/duncan-hall/dormroom.yaml` ·
`seeds/domain/terminus/general-store/counter.yaml` · the Duncan Hall room seeds
(ambient light) · `lib/wetness/Wet.ts` (comment only) ·
`docs/subsystems/persistence.md` · `CLAUDE.md` ·
`docs/slates/builds/farming-slate.md` · `docs/living-world-roadmap.md`
