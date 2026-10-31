# Field population — implementation plan

Executes [field-population-requirements.md](../requirements/field-population-requirements.md)
(agreed 2026-10-29, closed scope). **Kind:** feature. **Lead end:** kernel —
the plant, the stand, `look`, `water`, `feed`, `sample`, `label` and
`harvest` are the platform's; the first consumers are the Hearts Delight
bench and the campus home field, on the cover build's MR (!480, branch
`reqs/cover`). The build extends that MR: every wave lands on top of the
cover build's W0–W7 and keeps its drive green.

The shape in one sentence: **a patched field holds one crop plant per
patch**, each standing in the field and rooted in its patch's own soil,
so every pot verb reaches a patch's crop with no new read code; the field
is the whole stand, and a field with no patches authored is today's code
path byte for byte.

---

## Grounding

Facts verified 2026-10-29 by opening the files. Paths repo-relative; line
numbers current at plan time.

### The plant and its ground (kernel)

- `packages/server/src/mud/lib/husbandry/Growing.ts` (1,648 lines).
  `fieldMeta` l.568–599: the growth state (`growthClockStamp`, `_vigor`,
  `_maturity`, `growthStage`, `_flowering`, `_seedSet`, `_lastLux`,
  `_lastAmbientK` (runtimeState), `_worstLimiting`, `_fruitFill`,
  `_fruitSetCount`, `_pollination`, `profile`), the area crop
  (`sownAreaM2`, `_cycleCount` authorable; `_harvestedAreaM2`,
  `_harvestCarryKg`) and the four authorable surface fields
  (`harvestTemplatePath`, `nutrientDraw`, `harvestTool`, `discipline` —
  default `'horticulture'`, l.935). `static markupAugmenters =
  [conditionAugmenter]` (l.602): a **sync, viewer-aware** augmenter
  (`(text, host, _viewer)`) that prints size, condition band and the cause
  line; `CAUSE_PHRASE` (l.511–517) has `root: 'It has outgrown its pot.'`.
  `getLimitingFactor()` (l.1032) samples every term **live**.
  `reconcileGrowth()` (l.1084–1202): `satRoot`, `satLight(_lastLux)`,
  `satWater(meanSoilMoisture())` and `satNutrient()` are read ONCE before
  the step loop, `satWarmth` per step; `_worstLimiting` is a monotone
  minimum; an area crop breaks out of the loop at `mature` (B36).
  `getBed()` (l.989–1009): the slot host when `isCultivable`, else the
  **container** when it is `Soil & Container & !Cultivable`; return type
  `(Stuff & Soil & Container) | null`. `takeSwath` (l.836), `settleRatoon`,
  `cropStagePhrase`/`cropAreaPhrase` (l.876/880), `ripeSibling()` (l.960)
  walks the container's contents for a harvestable plant of the same
  template path. Host seams are `protected`: `rootRoom`, `soilMoisture`,
  `meanSoilMoisture`, `nutrientLevel`, `waterTheSoil`, `onFloweringLatched`,
  `sampleLux` (climbs containment to the first `Place`, B21).
  `GrowthProfileData.rootDemand` is "litres of soil each stage's roots
  demand" (wheat: `{0.2, 1.0, 2.0, 3.0}`).
- `packages/server/src/mud/platform/thing/Plant.ts` (301 lines).
  `Plant = PersistableMixin(SlottableMixin(GrowingMixin(ReservedMixin(
  OrganismMixin(ThermalMixin(Good))))))` (l.52–54) — **it composes
  `ReservedMixin` already** (phase 1 kept the moisture reserve on the plant;
  phase 2 moved it to the soil and the mixin stayed), and it composes
  neither `LabelledMixin` nor `SampledMixin`. `rootRoom()` narrows
  `isCultivable(bed)` (l.148–154); `soilMoisture`/`meanSoilMoisture`/
  `nutrientLevel`/`waterTheSoil` forward to `getBed()` (l.166–187);
  `commandContributions.peers = [harvest.yaml]` (l.66–70);
  `getPersistenceKey()` mints a per-instance key lazily (l.252–262).
- `packages/server/src/mud/lib/husbandry/Soil.ts` (967 lines). The
  reserves are keyed by name on `ReservedMixin` — **one pool per host**
  (`moisture` L, `nitrogen` %, `organicMatter` %, `structure` %, theme
  `cultivation`). `Soil` interface l.155–250 (reads, writes, the sky edge,
  the hooks `soilWaterDemandPerGameDay`, `soilCatchmentAreaM2`,
  `soilLeachRate`, `sowingRefusal`, `soilDrawFactor`, `ensureCropTitle`).
  `fieldMeta` l.277–289: `soilClockStamp`, `_soilMeanMoisture`,
  `rainClockStamp`, `_rainAbsorbedLitres` are `persistent` only;
  `_rainLocalityPath`/`_rainSkyExposed`/`_rainResolved` are
  `persistent + runtimeState`. `reconcileSoil()` (l.401–470) walks a long
  window a day at a time (B31) and no-ops (stamps only) when the host has
  no `moisture` reserve. `watershedScope()` is protected and defaults to
  the host's **container** (`null` when unplaced — "unplaced ground has no
  sky"). `waterSoil(litres)` (l.768), `feedSoil(fraction)` (l.877),
  `addOrganicMatter` (l.787), `drawNutrient` (l.883), `creditReserve` is
  protected (l.900). Host constraint `Stuff & Reserved`.
- `packages/server/src/mud/lib/reserve.ts`: `Reserved` surface
  `getReserve/setReserve/adjustReserve/hasReserve/removeReserve`;
  `fieldMeta = { reserves: { persistent: true, runtimeState: true } }`
  (l.233–235) — a fixture's reserves ARE captured by the host's fixtures
  slice (below).

### The field (trade-farming) and the ground character (the ground system)

- `packages/content/trade-farming/src/location/Field.ts` (1,428 lines).
  `FieldGround = SoilMixin(ReservedMixin(Location))`; `FieldBase =
  PersistableMixin(WarrenMemberMixin(ImprovableMixin(SwardMixin(FieldGround))))`
  (l.264–273). `commandContributions.inventory = [plough.yaml, plant.yaml]`
  (l.293–305) — ⚠ `feed.yaml` is NOT afforded in a field today (it rides
  `CultivableMixin.peers`), and `water` is tool-afforded by the can.
  `static markupAugmenters = [fieldAugmenter]` (l.253–262) calling
  `fieldLines()` (l.587–629), viewer-blind. `fieldMeta` l.310–320:
  `fieldName`, `groundSpotX/Y`, `areaM2`, `legumeFraction` authorable;
  `seedbedStamp`, `stubbleStamp`, `grazers` persistent. `getCrop()` (l.443)
  returns the FIRST area crop in `getContents()`; callers: `cropAreaM2`
  (l.449), `sowingRefusal` (l.469), `settleCropTitle` (l.503), `progressOn`
  (l.546), `improvementReversion` (l.559), `bankWork` (l.571, grub destructs
  it), `fieldLines` (l.587), `soilWaterDemandPerGameDay` (l.784: sward
  transpiration + `standingAreaM2 × 1.2 L/m²/day`). `soilDrawFactor`
  (l.801) reads the private `_swardSite`/`ambientAt`. `installSoilReserves(
  sample)` (l.1137–1210): moisture capacity `areaM2 × 45 × waterHoldingFactor(
  texture)` — ⚠ **topsoil depth is not in it**; OM/structure/N initial
  values from the sample. `groundSample(model, seed)` (l.1212) resolves at
  the field's ONE ground spot and caches `lastSample`. `onCreate` (l.1361)
  resolves locality → seed, `GroundCharacter.forZone(zone)` → model,
  `installFieldReserves(sample, 0.8)`, starts clearing done.
  `watershedScope()` override returns the field itself (l.767). ⚠
  `soilLeachRate` reads `lastSample` (l.746).
- `packages/content/trade-farming/src/lib/Sward.ts`:
  `swardTranspirationPerGameDay()` (l.439) public; `installSward`,
  `swardBand/swardPhrase`, `reconcileSward`. The sward is field-wide and
  stays so (non-goal).
- `packages/content/ground/src/idea/GroundCharacter.ts` (616 lines).
  `GroundSample { texture, stoniness, drainage, slopeDeg, aspectDeg,
  topsoilM, nativePh, nativeNitrogenPct?, nativeOrganicPct? }` (l.98–125);
  `GroundBand { from, to, drainageScale?, stoninessScale?, phOffset?,
  depthScale?, nitrogenPct?, organicPct?, note? }` (l.147–166) — ⭐ an
  authored LEAN already exists, applied by the module-private `lean(base,
  bands, at)` (l.365–394: multiply/offset, never replace). `resolve(model,
  at, seed)` (l.288–298) = procedural → lean → pin. `procedural` (l.312)
  gives `topsoilM` in `[0.08, 0.5]`. Statics: `seedFor`, `forZone`,
  `resolve`, `procedural`, `improvementCost`, `waterHoldingFactor`,
  `leachFactor`, `poachingFactor`, `lookPhrase`, `ribbonPhrase`;
  `TEXTURE_MATERIALS` maps texture → material path. The campus ground row
  `packages/content/eternal-university/content/world/terminus/eternal/campus-field/idea/ground.yaml`
  pins the home field's spot `4,7` (loam, `topsoilM: 0.34`) and leans the
  outfield `[7,0]–[14,5]` thin; Hearts Delight authors **no**
  `groundCharacter` (procedural ground).

### Fixtures, placement and the look pipeline

- `packages/server/src/mud/lib/boundary/Adornable.ts`: `addFixture(f,
  slotName?)` (l.272) sets `fixtureSlots` + `f.setAdornedTo(host)` — ⚠ a
  fixture is **NOT in the host's contents** (`ContainmentApi.move` vetoes
  it; `Container.ts` l.8 "surfaced separately via `getFixtures()`"). The
  fixtures capture pass (l.151–190) keeps, per slot, the fixture's
  `persistent && runtimeState` fields (`runtimeFields`, l.508–527) in the
  host's record; `hydrateSlice` (l.193–206) overlays them onto the fixture
  re-minted at the host's `onCreate`. `Place.ensureFloor()`
  (`lib/stuff/Place.ts` l.407–450) is the mint-at-onCreate, get-or-create,
  `addFixture(minted, 'floor')` precedent; `FloorMixin` resolves its place
  through `getAdornedTo()` (`lib/ground/Floor.ts` l.570).
- `packages/server/src/mud/api/mql/scope-walk.ts`: `candidatesForPeers`
  (l.133–160) walks `env.getContents()` AND `env.getFixtures()` (l.156–158)
  — a fixture is reachable by keyword (`look floor` is driven by
  `ground.wire.test.ts`). `candidatesForHere` offers the location, its
  details, doors and exits only.
- `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts`:
  `lookAtLocation` awaits `PerceptionApi.preloadForSenseGate(actor)`
  (l.201) before rendering; the loose list filters out adornments and
  non-Visible items (l.210–220) and lists `location.getLooseContents(
  visibleContents)` (l.343) — ⚠ today the bench's ONE crop plant is listed
  as an item AND read by the field augmenter (the cover drive step 1 allows
  `≤ 2` occurrences of "a stand of wheat").
- `packages/server/src/mud/api/mml.ts` l.95–135: `MarkupAugmenter =
  (text, host, viewer, opts?) => string`, **sync by contract**.
- `packages/server/src/mud/lib/spatial/Placing.ts` + `Containable.getPlacement()`
  — the auxiliary on/in/from pair. **Not used by this plan** (the binding
  is a string key, below); recorded so nobody reaches for it: a placement
  host must be a sibling in the same contents list, and a fixture is not.

### Competence, the bracket and the sync read

- `packages/server/src/mud/lib/advancement/Advancement.ts`:
  `competenceBandFor(discipline): Promise<CompetenceBandName>` (l.536) is
  async (a transcript query; a non-Advancing actor reads
  `CompetenceBand.FLOOR = 'untrained'`). ⭐ A **sync** face exists:
  `competenceDigestCached(): DisciplineBand[] | undefined` (l.693–703) over
  a module-scope `digestCache: DerivedStandingCache<DisciplineBand[]>`
  (l.267–274) — `undefined` on a miss (which schedules a background fold),
  the array once folded. `DerivedStandingCache.refresh(subject)` (l.84–92
  of `lib/standing/DerivedStandingCache.ts`) is public and awaitable;
  `get()` schedules on miss. On a transcript append only
  `practisingCache.refresh(entry.owner)` runs (l.101) — the digest is not
  refreshed by the ledger today.
- `packages/server/src/mud/platform/idea/api/PerceptionLogic.ts`
  l.118–135: the shipped **per-command band snapshot** pattern —
  `awarenessBandCache`, warmed by `preloadForSenseGate(actor)` (l.252–268,
  awaits `bandFor` in a `Promise.all`), read by the sync gate. `look`
  calls the preload (`lookAtLocation` l.201 and `lookAtTarget`).
- `packages/server/src/mud/lib/instrument/Reading.ts`: `HALF_WIDTH`
  (l.184, module-private: untrained .08 · novice .05 · competent .025 ·
  proficient .012 · expert .005), `observe(truth, band, seed)` (l.686–697:
  centre = truth + `((sin(seed)+1)/2·2−1) × hw`), `halfWidthOf` (l.776),
  `bandOf(actor)` (l.641). `CompetenceBand` (`lib/advancement/CompetenceBand.ts`)
  is a static value class (`FLOOR`, `rank`, `atOrAbove`, …) with the
  band type `CompetenceBandName`.
- `packages/content/trade-ranching/src/lib/HeadSeed.ts`: FNV-1a
  `hashString` (module-private, l.202–210) + `Seeded.unit(h, salt)`
  (`lib/Seeded.ts` l.65) — the seeded-tail shape; `tailFactor(frame) =
  0.8 + 0.2·(1+f)/2`. The ruling stands: the hash is re-implemented per
  module, never shared.

### The verbs and their views

Views under `packages/content/platform/content/platform/cmd/`; controllers
under `packages/server/src/mud/platform/idea/cmd/`.

- `bulk/water.yaml`: `target` `requires: [VisibleMixin, CultivableMixin]`
  — ⚠ `requires` entries are AND-ed (`CommandLogic.parseRequirement`
  l.3027–3085; `|` inside one entry is OR), so a bare `Plant` fails the
  gate and the requires-aware scope walk skips it: **`water the lily` does
  not bind a plant today** (the controller's plant branch is reachable
  only through a `PlantPot` target). `WaterController` (267 lines):
  `moistureHeadroom(plant)` reads the ground through `groundUnder()` which
  narrows `isCultivable` (l.236–244) — 0 on a field. Captures
  `groundUnder(plant) ?? plant`.
- `bulk/feed.yaml`: `target` `requires: [VisibleMixin, CultivableMixin]`;
  `FeedController.resolveGround` (l.290–300) accepts Cultivable ground or a
  slotted plant's host — refuses a field and a field plant. Compost: 20 L
  sack (`generic-objects/.../vessel/compost-sack.yaml`, tag `compost`),
  `POINTS_PER_LITRE = 10`.
- `inventory/sample.yaml`: `subject` optional, greedy, `requires: any`;
  `SampleController`: a named non-room thing → `fromThing` (refuses unless
  `MixinApi.isActive(subject, Mixins.Sampled)`; stackable → `split(1)`,
  else stamp in place); the room → duck-typed `room.sampleFace(actor,
  raw)` (`ground`'s `StrataMixin` l.199, mining's `Working`). ⛔ Not
  extended; the crop path goes through the bound plant (D7).
- `inventory/label.yaml`: `target` `requires: LabelledMixin`, `text`
  greedy string optional; `LabelController` only `setLabel` (empty text
  clears). `LabelledMixin` (`lib/description/Labelled.ts`) is three
  methods + the `label` field; it affords `label.yaml` on `peers` +
  `environment`; **nothing reads a label** outside the controller (no
  keyword, no presentation effect). Only `Garment` composes it.
- `inventory/harvest.yaml`: `target` `[VisibleMixin,
  GrowingMixin|CultivableMixin]`, `tool` `[with, using]` with a default;
  `HarvestController` (561 lines): target resolution l.100–140 (a named
  Growing → `ripeSibling()` substitution), area branch `engageSwath`
  (l.338–365) → module function `landSwath` (l.402–470): ⚠ the place check
  is `plant.getBed() !== where` (l.411–413) — with a patch as the bed this
  would always fail; `bandFor(getWorstLimiting())` (l.373); nutrient to
  `bed.drawNutrient`.
- `inventory/plant.yaml`: `seed` required `[VisibleMixin,
  PlantableMixin]`; `pot` optional `[in, into, on, over]`
  `[VisibleMixin, CultivableMixin|SoilMixin]`. `PlantController.sowGround`
  (l.294–420): title gate → `standing` crop (first area crop in contents)
  → `sowingRefusal` → area = `min(sowHandM2, seed/rate, free)`;
  `landSowing` (l.470+) places the fresh crop by `ContainmentApi.move(crop,
  ground)`.
- `perception/look.yaml`: ONE object arg with `prepositions: [at, in,
  inside]`, greedy. ⚠ `look wheat at the top end` is not a shape this view
  can bind (two positionals); see D13.
- The binder (`lib/command/CommandDefinition.ts` l.660–725): a greedy arg
  may be followed only by **prepositional** args, which bound it; a
  prepositional string arg that should take several words (`the top end`)
  needs `greedy: true` itself. `onExcess` for `type: object` defaults to
  `top` (`CommandLogic` l.1248).

### The brain, the hand and the campus

- `packages/content/trade-farming/src/behavior/farms.ts` (281 lines):
  config `{ home, shelf, ask, defaultAsk?, batch?, waterAt?, feedAt?,
  drawEvery?, drawAmount? }`; teleports home; grounds = `home.getContents()`
  filtered `isCultivable` (a Field is never found); reads TRUE
  `soilMoistureFraction()` / `nutrientFraction()`; literal verbs
  `'fill can from standpipe'`, `` `water ${kw}` ``, `` `feed ${kw} with sack` ``,
  `` `pick ${kw}` ``. `farms.bounded.test.ts` asserts those literals in the
  SOURCE. No row names the brain. Brains receive `BrainContext { host,
  config, state, trigger }` and may `await host.competenceBandFor(…)`.
- `packages/content/trade-sugar/src/behavior/cuts.ts` l.60–130: the
  read-then-`next()`-then-act shape, on shift only (`shiftState() !==
  'on-shift'` → idle), acts through `executeCommand` (attributed).
- The dairy lad `hearts-delight/.../dairy/agent/dairy-lad.yaml`: `class:
  /platform/agent/Cast`, `competence: [{ discipline, asserting }]`,
  `props:` (a scythe), `behaviors: [{ brain, trigger: candidate, config }]`;
  placed by the byre's `cast:`. `Cast.ts` seeds the asserted band as a
  `claim` transcript row (l.153–241), so `competenceBandFor` answers it.
- The campus farm `eternal-university/.../campus-farm/`: `idea/farm-unit.yaml`
  (Business, `labourer` headcount 2, no roster, operates yard + home-field +
  back-paddock); `location/yard.yaml` props byre, herdbook, wall, **trough**
  (`thing/trough.yaml` is a plain `/platform/thing/Thing` — "fed by a lead
  pipe from somewhere uphill", not fillable), hay-barn, midden, handcart,
  tool rack + spade/soil-kit/scythe; no `agent/` directory.
  `campus-farm.test.ts` asserts every file under `campus-farm/` and
  `campus-field/` is YAML and every `class:` starts `/platform/`, `/trade/`
  or `/system/`. The roster shape to copy is `dairy-business.yaml`'s
  `rosterSlots: [{ positionKey, assignee, schedule: [{days, hours}] }]`.
  `duncan-hall/thing/tap.yaml` is `/platform/thing/WaterFixture`
  (`UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)))`,
  `interiorMaterial: …/bulk/water`) — the fillable shape.
- Content: `hearts-delight/.../bench-field/location/upper-bench.yaml`
  (`SingletonField`, 4,000 m², ground spot `9,3`, `props: [standing-wheat]`;
  `bench-field/thing/standing-wheat.yaml` `extends: /trade/farming/thing/plant/wheat`,
  `sownAreaM2: 3000`, `growthStage: established`, `_maturity`, `_vigor`).
  `eternal-university/.../campus-field/location/home-field.yaml`
  (10,000 m², spot `4,7`, props field-trough + plough, exits yard/east).
  Wheat row `trade-farming/.../thing/plant/wheat.yaml` (keywords `[wheat,
  corn, crop, stand]`, `shortDescription: stand of wheat`). Seed sack 25 kg
  at `seedRateKgPerM2: 0.015` → 1,667 m² per sack.
- Drive: `packages/wire/tests/cover.dirty.wire.test.ts`. Steps that touch
  the two patched fields: 1 (l.308, bench `look` ≤ 2 "stand of wheat"), 4
  (l.358, `sow wheat` ×N on the home field → "about a third"), 6 (l.383,
  the season's stages + `look wheat`; mows the sward), 9 (l.409, bench
  `harvest wheat` as a stranger), 7 (l.433, home-field `harvest wheat` to
  stubble). Helpers: `act/doing/work/working/refused/read`, `advance`
  (parks the hand indoors ≥ 6 h and drinks), `toDay`, `daylight`,
  `founderEval(where, parcel, code)` (`Session.open('founder', {wizard})`
  + `eval --parcel`), `collegeHead`. Session: `cmd`, `query(mql)`,
  `awaitActivity`, `listen`, `drainProse`.
- Lint roster (`pnpm -C packages/server lint:family --list`): the gates
  named in § Convention conformance exist under those names.

---

## Plan-level decisions

Each names the requirement, the lens or the convention that decided it.
Requirements decisions are not reopened.

**D1 — One crop plant per patch; the stand is the set.** A field with
authored patches holds one area-crop `Plant` per sown patch, each standing
in the field's contents with `sownAreaM2 = its share`, each rooted in its
patch's soil (D4). `look wheat at …`, `water`, `feed`, `harvest`, `sample`
and `label` then all resolve to a plant — the pot's object — and the
pot's code answers: `conditionAugmenter` prints the patch's read,
`takeSwath` + `bandFor(getWorstLimiting())` grade the patch, `waterPlant`
waters the patch's soil. The field's `look` prints the stand (total area,
the stage covering the most ground) and one line per patch. A field with
no patches authored has no patch objects and one crop plant — today's
path, untouched. *Lens 5* (the new object answers the same commands) and
the cost: the alternative — per-patch state inside one plant — rewrites
the reconcile loop and every read for no new behaviour.

**D2 — A patch is a `Patch` fixture: soil in its own right, trade-farming's.**
`packages/content/trade-farming/src/thing/Patch.ts`,
`CharacteredSoilMixin(SoilMixin(ReservedMixin(AdornmentMixin(VisibleMixin(Thing)))))`
over `lib/stuff/Thing`, row `/trade/farming/thing/patch`. It composes the
kernel `SoilMixin` whole — reserves sized from its area and its leaned
sample, its own reconcile, its own rain edge (catchment = its area), its
own draw — so nothing in the soil model is re-implemented. It is a
**fixture of the field** (the `Floor` shape): minted by `Field.onCreate`
get-or-create at slot `patch:<key>`, never listed as loose contents,
targetable by keyword (`look at the top end`, `feed the top end`), cannot
be picked up, its runtime state (reserves, clock stamps) captured by the
field's fixtures slice. `watershedScope()` overrides to `getAdornedTo()`
(a fixture is not in anybody's contents — grounding). Patches tile the
field: Σ `areaM2` = the field's; the LAST authored patch absorbs any
difference. *Convention:* mixin-on-the-right-host — the field stays the
place; a patch is the ground the place is divided into.

**D3 — The kernel protocol is "a soil made of parts", on `Soil`.** Three
hooks + two methods on `SoilMixin`:
`soilParts(): readonly (Stuff & Soil)[]` (@hook, default `[]`),
`soilPartKey(): string` (@hook, default `''` — a part answers its key),
`soilDepthM(): number | null` (@hook, default `null` — a pot has no
depth; a patch answers its topsoil), `soilPart(key): (Stuff & Soil) |
null` (default: the part among `soilParts()` whose key matches) and
`soilPartRefusal(): string | null` (default: `null` with ≤ 1 part, else
*"Which part? Name one: the top end, the middle or the lane end."*).
⭐ **When `soilParts()` is non-empty the host's own reads and writes
aggregate over the parts** inside `SoilMixin` — area-weighted means for
`soilMoistureFraction`, `meanSoilMoistureFraction`, `nutrientFraction`,
`organicMatterFraction`, `structureFraction`; spread by area share for
`waterSoil`, `feedSoil`, `addOrganicMatter`, `drawNutrient`,
`fixNitrogen`, `poach` (each returns the sum applied); `reconcileSoil`
reconciles each part. A patched field installs NO reserves of its own, so
its own window is the shipped no-op (no `moisture` reserve → stamp and
return), and the sward, `analyze soil`, `turnUnder`, `cycleGrazedNitrogen`
keep reading the field and get the aggregate. ⭐ The aggregation lives in
the kernel, once, because the CALLERS are the kernel's verbs and a pack
cannot make `water` reach a thing it has never heard of without duck
typing (`no-duck-typing`: a kernel protocol or an imported dep — this is
the protocol). A field with no parts takes the direct path on every line.
Also `soilMoistureHeadroomL()` and `soilNutrientHeadroom()` (sum over
parts) so `water`/`feed` size their measure off the ground, not off a
Cultivable narrowing.

**D4 — The plant binds to its patch by key: `Growing.groundPart`.** A
persistent, authorable string (`''` = the whole ground). `getBed()` gains
one line after the containment branch: `ground.soilPart(this.groundPart)
?? ground`. Return type widens to `(Stuff & Soil) | null` (a patch is not
a Container); the four callers are repaired in W0 (`landSwath` compares
the plant's **container** to where the harvester stands; `RepotController`
and the pot branch narrow as before). ⛔ Not a `Placing` placement: a
placement host must be a sibling in the same contents list and a fixture
is not; the key is also what an authored crop row writes
(`groundPart: top-end`), which a placement cannot express. An authored
key naming no part falls back to the whole ground (a patch deleted from a
row never orphans a crop).

**D5 — "at <patch>" is an OBJECT arg the binder resolves.** On
`water`, `feed`, `harvest`, `plant`, `sample`, `label`:
`{ name: patch, type: object, required: false, prepositions: [at],
greedy: true, scope: ["reachable"], requires: SoilMixin }`. The binder
matches the typed words against the patch fixture's keywords (fixtures are
peers — grounding) and refuses a non-soil thing with `Mixins`' own
phrase (*"{} has no soil in it"*). The controller is dumb: it asks the
ground `resolvePartFor(named)` and the plant `standIn(part)`:
- `Soil.resolvePartFor(named: (Stuff & Soil) | null): PartResolution`
  — `{ ok: true, part }` (`part` is `null` on one-piece ground), or
  `{ ok: false, reason: 'patch-unnamed' | 'not-a-part-here', line }`.
  `patch-unnamed` when `named` is null and `soilPartRefusal()` is
  non-null; `not-a-part-here` when `named` is not among this ground's
  parts (or is the ground itself).
- `Growing.standIn(part: Stuff & Soil): (Stuff & Growing) | null` — the
  area crop of this plant's kind (same template path) in the same
  container whose `getBed() === part`, this plant included.
`sow` on a multi-patch field also takes `at` (AC 7 says *every* act; the
cover drive's step 4 is updated — D16), filling the named patch up to its
area; a cast into a full patch is refused `patch-sown`. *Lens 1:* choosing
where is the player's job; the game never picks the neediest patch.

**D6 — A labeled plant is an individual `Plant` minted from the patch,
left standing, with a private root zone.** `Plant` composes
`LabelledMixin` (every plant may carry a player's name — a pot plant too;
plants never stack, so the no-merge consequence is moot). `label <crop>
[text] at <patch>` on an AREA crop mints an individual
(`takeSpecimen(0, { cut: false })`, D7 — `cut: false` leaves `_specimen`
null so it keeps growing; `groundPart` set, moved into the field), sets
its label (text, else the giver's `getPresentation()`
— the verb's own meaning, *your name on it*), gives it the label's words
and `labeled` as keywords, and a `shortDescription` of
`<specimenNoun> labeled "<text>"` so `look` lists it and `water trial`
binds it. On any other target the controller is the shipped one (empty
text clears). ⭐ **The root zone** (kernel, `Plant`): the plant's OWN
`Reserved` gets `moisture` (capacity = `profile.rootDemand[stage] ×
ROOT_ZONE_WATER_L_PER_L_SOIL (0.35)`, so a mature wheat's zone is ~1 L)
and `nitrogen` (100 %) reserves, seeded at the patch's fractions, with its
own stamp `_rootZoneStamp`; `reconcileRootZone()` walks the window a day
at a time: drain by `litresPerGameDay × warmth`, and **relax toward the
patch's fraction** with `ROOT_ZONE_EQUILIBRATION_DAYS = 2` (moisture) /
`10` (nitrogen) — water in a wet pocket runs into the dry ground around
it. `soilMoisture`/`meanSoilMoisture`/`nutrientLevel` read the zone when
it exists; `waterTheSoil`/`feedPlant` credit it. So a can a day holds a
labeled plant above its patch through a dry stretch, and a skipped day
lets it fall back — the lesson. A plant with no zone (every plant today)
is byte-identical.

**D7 — The specimen: `sample <crop> at <patch>` pulls a real plant.**
`Plant` composes `SampledMixin` (three inert provenance fields; the
`sample` verb's own stamp). `Growing.takeSpecimen(variation: number, opts?:
{ cut?: boolean }): Promise<Stuff & Growing>` (`cut` defaults `true`)
clones **its own template path**, copies the growth state (`growthStage`,
`_maturity`, `_worstLimiting`, `_flowering`, `_seedSet`, `_fruitFill`,
`profile`), sets `sownAreaM2 = 0`, `_vigor = clamp01(this._vigor +
variation)`, `shortDescription = specimenNoun` and — when cut —
`_specimen = { from, part, partName, limiting, roots }` — the read it had
where it stood: `limiting = getLimitingFactor()`, `roots = rootsBand()`.
With `cut: false` (the label path, D6) `_specimen` stays null and the
individual goes on growing where it is put.
A specimen **does not grow** (`reconcileGrowth` returns at once when
`_specimen` is set — a pulled stem is a record, and sacrificial), its
`getLimitingFactor()` is the stamped one, and its augmenter adds the roots
line and *"Taken from the top end of the upper bench."*. The variation is
seeded, never drawn: `hash(`${groundIdentity}#${partKey}#${cycleCount}`)`
→ `(Seeded.unit(h, 1) − 0.5) × 0.1` on vigor — the same spot gives the
same stem (AC 3). `SampleController.fromThing` checks the area-crop case
**before** the `Sampled` check (otherwise the stand itself would be
stamped in place), mints through `takeSpecimen`, moves it to the giver,
stamps it (`sampledAt` = the field's identity path, as every sample), and
narrates. The specimen's `specimenNoun` is an authorable kernel field on
`GrowingMixin` (`''` → the row's own short description); wheat/barley
author `stem of wheat` / `stem of barley`, cane `stalk of cane`.
⛔ `sampleFace` is untouched.

**D8 — Harvest grades by patch with no new grading code.** The per-patch
plant's own `_worstLimiting` is the patch's worst stretch; `landSwath`
mints from it; nitrogen is drawn from `plant.getBed()` (the patch).
`harvest <crop>` on a multi-patch field without `at` is refused
`patch-unnamed` (D5); with `at` the sibling in that patch is cut.

**D9 — The banded read is `Growing.readFor(band)`, words by band, and
only the FIELD reads are banded.** Kernel, on `GrowingMixin`:
`readFor(band: CompetenceBandName, seed?: number): CropRead` and
`readLines(band): string[]`. The ladder (an exhaustive `Record` per
band, the soil.md rule — adjacent bands must read differently):

| band | what the words carry |
|---|---|
| untrained | the stage and the condition band (*"At the top end it is in ear and looks poor."*) |
| novice | + whether it is short of something, not what (*"It is short of something."*) |
| competent | + the cause (*"The soil is dry there."*) |
| proficient | + how badly (*"— down near the wilting point"* / *"a little"*) |
| expert | + the next-worst factor (*"and the nitrogen is low behind it."*) |

Never a digit, never a different truth: every band's sentence is implied
by the next's. Banding applies to **an area crop's read and a specimen's
read** (`host.isAreaCrop() || host.isSpecimen()`) — the stand, the patch
lines, the sampled stem; a pot plant, a bed plant and a **labeled**
individual read in full as today (AC 10, AC 13; the labeled plant "reads
like a pot plant", AC 4). The viewer's band is
`viewer.competenceBandCached(host.getDiscipline())` (D10); a non-Advancing
viewer reads the floor. *Requirements § Reading is horticulture.*

**D10 — The sync band is the competence digest, warmed by the look
preload.** `Advancing` gains `competenceBandCached(discipline):
CompetenceBandName` (the digest's entry, else `FLOOR`) and
`warmCompetenceDigest(): Promise<void>` (awaits `digestCache.refresh(key)`
only when the digest has no entry for the subject —
`DerivedStandingCache.has(subject)` is added for the peek).
`PerceptionLogic.preloadForSenseGate` adds the warm to its `Promise.all`
(every `look` already awaits the preload — grounding), so the first look
after login reads at the right band; the transcript append refreshes the
digest beside the practising cache (one fold per deed; bands move
slowly). ⛔ No async augmenter: the `MarkupAugmenter` contract is sync and
the shipped awareness snapshot is the precedent.

**D11 — The hand reads with a seeded bracket, and the bracket's table
moves to the band.** `HALF_WIDTH` leaves `Reading.ts` for
`lib/advancement/CompetenceBand.ts` as `export const
COMPETENCE_HALF_WIDTH` (the band vocabulary owns its own precision;
`Reading.halfWidthOf` imports it — one copy). `readFor(band, seed)` with a
seed also returns `moisture` and `nutrient` as **observed** fractions:
`truth + unit(seed) × COMPETENCE_HALF_WIDTH[band]` (the `observe`
arithmetic, re-stated in Growing on a fraction; the truth is always inside
the bracket). The farm hand ranks patches by its OBSERVED moisture, so a
novice hand with two patches 0.02 apart can water the wrong one and an
expert cannot; the seed is `hash(`${handIdentity}#${partKey}#${gameDay}`)`
— per reader, per day, deterministic. A player's `look` never shows the
figure (D9); the bracket exists so a hand's act can be wrong the way a
hand's is.

**D12 — The farms brain learns fields and patches; the campus gets a hand.**
`farms.ts`: grounds = Cultivables in `home` (shipped) **plus**, when
`home` is `Soil`, its `soilParts()` (or `home` itself when it has none);
for each soil part the crops rooted in it (`isGrowing && isAreaCrop &&
getBed() === part`); the read is `crop.readFor(await
host.competenceBandFor(crop.getDiscipline()), seed)`; water the part
whose observed moisture is lowest and below `waterAt` (`water <cropKw> at
<partKw>`; one part per beat — a can is one can), feed likewise
(`feed <cropKw> at <partKw> with sack`). Water comes from a configured
room and vessel (`config.water: { room, from }`): teleport there, `fill
can from <from>`, teleport home — the `shifts`/`consigns` movement shape.
On shift only (the `cuts` rule). The literal-verb assertions in
`farms.bounded.test.ts` move with the strings. Content: the campus hand
`campus-farm/agent/farm-hand.yaml` (Cast, `competence: [{ discipline:
horticulture, asserting: novice }]`, props a watering can and a compost
sack, `behaviors: [{ brain: /trade/farming/behavior/farms, trigger:
candidate, config: { home: …/home-field, water: { room: …/campus-farm/
location/yard, from: trough }, shelf: '' } }]` — `shelf` empty disables
the market leg), placed by the home field's `cast:`; `farm-unit.yaml`
gains a `hand` position (headcount 1) with a `rosterSlots` entry for the
Cast, days 0–6 hours 6–18; the yard trough row becomes a
`/platform/thing/WaterFixture` with `interiorMaterial: …/bulk/water` (its
prose already says it is piped). The campus farm stays all-YAML.

**D13 — No second arg on `look` (owner, 2026-10-29). A patch is read three
ways, all on `look`'s one target:** (1) **`look at the top end`** — the
patch object's own look (its augmenter: the ground's look phrase, then each
crop rooted in it read at the viewer's band, then any labeled plant there);
(2) ⭐ **the stand answers to its patch's name** — each per-patch crop
plant carries its patch's words in its keywords (`top end`, `top-end`,
`lane end`…), so `look top end wheat` / `look "wheat at the top end"` binds
that patch's stand, and its augmenter says which patch it stands at
(*"It stands at the top end."*); (3) the field's own `look` carries one
banded line per patch. `look wheat` alone binds one stand (the binder's
first match). The drive's step 2 is `look at the top end` and
`look top end wheat`. An `analyze crop` channel is deferred (no
instrument to read through yet).

**D14 — Patch soil comes from the field's sample plus the patch's lean.**
`GroundCharacter.resolve(model, at, seed, nudge?: GroundLean)` gains an
optional fourth parameter, `GroundLean = Omit<GroundBand, 'from' | 'to'>`,
applied LAST (after the pin: a patch nudges whatever the ground is, authored
or not). No new static, no copied `lean()`. Reserves: `installSoilReserves(
sample, depthFactor)` where `depthFactor = clamp(patch.topsoilM /
field.topsoilM, 0.2, 2)` scales the moisture capacity — a thin top end
holds a third of the water per square metre and dries first (Goal 2). A
field with no patches passes `1`, so every shipped field's capacity is
unchanged (AC 10). Nitrogen and organic matter start at the lean's
`nitrogenPct`/`organicPct` when authored (shipped `lean()` semantics).

**D15 — Content.** The bench authors three patches on
`upper-bench.yaml` — `top-end` ("the top end", 1,000 m², lean
`{ depthScale: 0.35, stoninessScale: 1.5, nitrogenPct: 12, organicPct: 25,
note: "the soil runs out up here" }`), `middle` (1,500), `lane-end` ("the
lane end", 1,500, `{ depthScale: 1.1, nitrogenPct: 30 }`) — and its one
`standing-wheat` prop becomes three `extends:` rows (B10: props carry no
overrides): `standing-wheat-top-end.yaml` (1,000 m², `groundPart:
top-end`, `_vigor: 0.45`), `-middle` (1,000, 0.75), `-lane-end` (1,000,
0.8) — 3,000 m² in all, so the cover drive's *"about three-quarters"*
holds and the top end carries wheat for the drive's steps 1–4. The home
field authors `gate-end` ("the gate end", 3,000), `middle` (4,000) and
`far-side` ("the far side", 3,000, `{ depthScale: 0.8, nitrogenPct: 18 }`
— the campus ground row already leans the outfield). Every other field
authors nothing and is one piece.

**D16 — The drive is `packages/wire/tests/field-population.dirty.wire.test.ts`**
(13 steps, run ONCE at the end, staged by `founderEval` + clock jumps,
`get 1 hay`-style cardinality, the hand parked indoors and drinking across
jumps — the cover drive's helpers copied), and the cover drive's steps
change where the fields changed: step 1 asserts ≤ 1 "a stand of wheat"
(the loose list no longer carries the crop — D17) and a line per patch;
step 4 sows `at the gate end` until `patch-sown`, then `at the middle`;
step 7 cuts `at the gate end` then `at the middle`; step 9 cuts `at the
lane end`; step 6's `look wheat` stays (it binds one stand).

**D17 — An area crop is part of the ground, not loose contents.**
`LookController`'s loose-list filter skips `isGrowing(item) &&
item.isAreaCrop()` beside the adornment skip: the field's augmenter is
where the stand reads, and three listed "a stand of wheat" would be
noise. A labeled individual (`sownAreaM2 = 0`) IS listed (AC 4).

**D18 — `water` and `feed` reach a plant, a bed, a patch and a field.**
Both views' `target` becomes `requires: [VisibleMixin,
GrowingMixin|SoilMixin]`. `WaterController`: a Growing target is the
plant (its `standIn(part)` when `at` names one); a Soil target is ground
(a bed → its plant as today; a patch or a one-piece field → the crop
rooted there, else the ground itself is watered — a field with no crop
still takes water); headroom is `plant.waterHeadroomL()` (root zone, else
`getBed()?.soilMoistureHeadroomL()`). `FeedController` mirrors it with
`feedPlant(points)` / `ground.feedSoil`. ⚠ This also makes `water the
lily` bind a bare plant (grounding: it does not today); the WaterVerb
test gains that case.

---

## Host placement

| new thing | host | what composing it claims — and what it does NOT |
|---|---|---|
| `soilParts`, `soilPartKey`, `soilDepthM` (@hooks), `soilPart`, `soilPartRefusal`, `resolvePartFor`, the headroom reads, the aggregation | `SoilMixin` (kernel) | any soil-bearing ground MAY be divided into named parts; defaults mean *one piece* and every pot, bed, field and wood is byte-identical. ⛔ Not on `Field` (the kernel verbs must reach a part without importing a trade), not a new mixin (a part is a fact about soil, not a capability a class opts into). |
| `groundPart`, `specimenNoun`, `_specimen`, `takeSpecimen`, `standIn`, `readFor`/`readLines`, `rootsBand`, `feedPlant`, `waterHeadroomL`/`nutrientHeadroom` | `GrowingMixin` (kernel) | every grower may stand in a part of its ground, be pulled as a specimen, be read at a band, be fed. `''`/`null` defaults keep every shipped plant as it was. The banded augmenter branches on `isAreaCrop() || isSpecimen()` — a **presentation** choice the requirements make (the stand read is banded; the pot read is not), not a host narrowing. |
| `LabelledMixin`, `SampledMixin` on `Plant` | `platform/thing/Plant` (kernel) | every plant can carry a player's name and a provenance stamp. Both are inert fields; `label` is afforded on every plant (a pot lily can be labeled — a good thing). ⛔ Not a `FieldPlant` subclass: the labeled plant and the specimen are the same `Plant` a pot holds, which is the whole requirement. |
| the root zone (`_rootZoneStamp`, the two reserves, `reconcileRootZone`) | `Plant` (kernel) | a plant standing in open ground may keep a pocket of its own water and nitrogen. Installed only by `label` (W4); absent on every other plant (`hasRootZone()` false → the shipped seams). ⭐ It rides the `ReservedMixin` `Plant` already composes — the phase-1 shape, re-used for exactly the case phase 2 left open. |
| `GroundLean`, `resolve(…, nudge?)` | `GroundCharacter` (`/system/ground`) | a caller may nudge a resolved sample the way an authored band does. No new static. |
| `COMPETENCE_HALF_WIDTH` | `lib/advancement/CompetenceBand.ts` (kernel) | the band vocabulary states its own precision; `Reading` reads it. One copy. |
| `competenceBandCached`, `warmCompetenceDigest` | `AdvancementMixin` (kernel) | an advancing character's bands are readable synchronously after the per-command preload. |
| the loose-list rule | `LookController` (kernel) | an area crop is read through its ground. |
| `CharacteredSoilMixin` (`areaM2`, `installSoilReserves(sample, depthFactor)`, `lastSample`, `soilLeachRate`, `soilCatchmentAreaM2`) | `trade-farming/src/lib/CharacteredSoil.ts`, composed on `Field` and `Patch` | ground whose reserves are sized by its area and its seeded character. Extracted from `Field` (no behaviour change); two composers in one pack → the pack's `lib/`. |
| `Patch` | `trade-farming/src/thing/Patch.ts` + row `content/trade/farming/thing/patch.yaml` | a named part of a field with soil of its own. A fixture, never loose, never carried. ⛔ Not a `Location` (you do not walk to the top end), not a `Container` (nothing is inside it; its crops stand in the field). |
| `patches: PatchSpec[]`, `ensurePatches`, `getPatches`, `getCrops`, `cropOn`, `fieldLines(viewer)`, `soilParts()` override | `Field` | a field may author parts; with none it is one piece. |
| `feed.yaml` in `Field.commandContributions.inventory` | `Field` | a field affords feeding to whoever stands in it (the `plant.yaml` precedent). |
| `patch` arg on six views | the platform views | the kernel verbs take *at <part>*; `requires: SoilMixin` is the arg gate. |
| the hand's row, the `hand` seat, the trough as a `WaterFixture` | `eternal-university` content | rows only; the brain is `trade-farming`'s. |

The test, applied: no step above needs a guard that re-narrows a host set.
The one visible branch — `conditionAugmenter` banding an area crop and a
specimen but not a pot — is a requirement about what each read says, and
it reads the host's own state (`isAreaCrop`, `isSpecimen`), not its class.

---

## Convention conformance (checked at plan time)

- `props:` / `cast:` — the hand is placed by the home field's `cast:`;
  patches are minted by their field (its creator places it — the
  `ensureFloor` rule), never `container:`.
- Locations, not rooms — no new place; a patch is a fixture of a
  `Location`.
- Namespace axes — `/trade/farming/thing/Patch` (class) and
  `/trade/farming/thing/patch` (row); the kernel's changes stay under
  `lib/` and `platform/`; the ground change under `/system/ground`.
- Module scope declares; lifecycles initialize — patch minting in
  `Field.onCreate` (limb 1, structural completion; the method already
  exists, `lint:on-create` ceiling unchanged).
- Import boundary — `trade-farming` imports the kernel by package
  specifier and `@saxonberg/content-ground` (a declared dependency) for
  `GroundCharacter`; no Api in a pack; no free helper (the part resolution
  is `Soil.resolvePartFor`, the sibling lookup `Growing.standIn`).
- Verbs on objects — `ground.resolvePartFor(named)`, `plant.standIn(part)`,
  `plant.takeSpecimen(v)`, `plant.readFor(band)`, `viewer.competenceBandCached(d)`;
  no `XApi.verb(host, …)`.
- No new Mongo collection; no migration (new fields default on read; a
  fresh world is the only world). No `isWizard`. Mixin authoritative,
  controller dumb — every refusal line is returned by the ground or the
  plant.
- American English in every new identifier and sentence (`labeled`,
  `color`); `plough` stays.
- Name a class for its composition — `CharacteredSoilMixin`, `Patch`.
- Lint gates this shape touches (the family is derived; run it whole):
  `lint:field-meta` (new entries), `lint:mixin-names` (one new pack mixin
  name, unique), `lint:instanceable` (Patch class ↔ row mirror; no
  `container:`), `lint:reachability` (`feed.yaml` now also named by
  `Field`), `lint:verb-collisions` (no new verb), `lint:instrument-args`
  (the `patch` arg carries no `default:`), `lint:unconsumed-seams` (every
  new @hook has an override in W1), `lint:lib-statics` (no new static on a
  lib class — `resolve` gains a parameter), `lint:mass` (the patch row
  authors `_materialPath`), `lint:perishable`, `lint:completion-this`
  (the harvest completion stays a module function), `lint:on-create`
  (ceilings unchanged), `lint:idle-cadence` (the brain's statics),
  `lint:topics` (`act.deed`, `sense.survey`), `lint:authored-prose`,
  `lint:test-bootstrap`, `lint:drive-scripts`, `lint:module-scope`,
  `lint:imports`, `lint:object-verbs`, `lint:census`, `lint:untitled`.

---

## Waves

Every wave lands green on `pnpm test:near` + the touched packs' vitest
(`pnpm -C packages/content/trade-farming test`, `…/eternal-university`,
`…/hearts-delight`, `…/ground`) + `pnpm -C packages/server lint:family`,
and ends at one commit. Stage on a live world between waves
(`probe-world-fast-loop`): boot once, walk the wave's steps as the
founder with `eval` and clock jumps, grep `.wire/server.log`; the long
drives run once, in W6. The branch is `reqs/cover`; **stage by name,
never `add -A`**.

### W0 — the kernel seams

*Implements D3, D4, D7 (fields only), D9–D11 (the substrate), D17, D18
(the headroom reads).* Files:

- `packages/server/src/mud/lib/husbandry/Soil.ts` — the parts protocol
  and the aggregation (D3). Add to the `Soil` interface and the mixin:
  ```ts
  /** @hook The named parts this ground is divided into; `[]` = one piece. */
  soilParts(): readonly (Stuff & Soil)[];
  /** @hook This ground's key as a PART of a larger ground; `''` for whole ground. */
  soilPartKey(): string;
  /** @hook Topsoil depth in metres, or `null` when unmodelled (a pot). */
  soilDepthM(): number | null;
  soilPart(key: string): (Stuff & Soil) | null;
  soilPartRefusal(): string | null;
  resolvePartFor(named: (Stuff & Soil) | null): PartResolution;
  soilMoistureHeadroomL(): number;
  soilNutrientHeadroom(): number;
  ```
  with `export type PartResolution = { ok: true; part: (Stuff & Soil) |
  null } | { ok: false; reason: 'patch-unnamed' | 'not-a-part-here'; line:
  string }`. A private `parts()` + `partWeights()` (by
  `soilCatchmentAreaM2()`, equal weights when all are 0) back the
  aggregation in the eleven reads/writes named in D3; `reconcileSoil()`
  with parts calls each part's and then runs the shipped body (a no-op
  with no reserve). Unit: a `TestGround` with two part hosts — the mean
  is area-weighted, `waterSoil(10)` lands 6/4 on a 600/400 split and
  returns the sum, a one-piece host is unchanged on every line
  (`Soil.test.ts` beside the existing suite).
- `packages/server/src/mud/lib/husbandry/Growing.ts` — `groundPart`
  (`{ persistent: true, authorable: true }`, `getGroundPart/setGroundPart`),
  `specimenNoun` (authorable), `_specimen: SpecimenRecord | null`
  (persistent) with `export interface SpecimenRecord { from: string; part:
  string; partName: string; limiting: LimitingFactor; roots: RootsBand }`
  and `export type RootsBand = 'shallow' | 'cramped' | 'well-down' |
  'dry' | 'sodden'`; `isSpecimen()`; `getBed()` through `soilPart`
  (return type `(Stuff & Soil) | null`); `reconcileGrowth()` returns at
  once for a specimen; `getLimitingFactor()` returns the stamped factor
  for a specimen; `standIn(part)`; `rootsBand()` (from `satRoot()` and
  `getBed()?.soilDepthM()`/moisture — exhaustive phrases in a
  `ROOTS_PHRASE` record); `feedPlant(points)` (default
  `getBed()?.feedSoil(points) ?? 0`); `waterHeadroomL()` /
  `nutrientHeadroom()` (the bed's); `readFor(band, seed?)` + `readLines(
  band)` per D9/D11 (`CropRead` exported; the second-worst factor comes
  from the same five live terms `getLimitingFactor` samples); the
  `conditionAugmenter` branch: `isAreaCrop() || isSpecimen()` → the
  banded lines at `viewer.competenceBandCached(discipline)` (floor for a
  non-Advancing viewer), plus *"It stands at <part>."* when `groundPart`
  resolves and *"Taken from <partName> of <from>."* + the roots line for a
  specimen; else the shipped three lines. `takeSpecimen(variation)` per
  D7 (async; `StuffApi.clone(this.getTemplatePath())`; the caller places
  it). A module-private FNV-1a `hashString` (the standing ruling).
  Tests in `lib/husbandry/__tests__/Growing.test.ts`: `getBed` resolves a
  part by key and falls back on a missing key; `readLines` is strictly
  more at each band and never contradicts the next; `readFor(band, seed)`
  keeps the truth inside the bracket and is stable per seed; a specimen
  does not grow and keeps its stamped cause.
- `packages/server/src/mud/platform/thing/Plant.ts` — compose
  `SampledMixin(LabelledMixin(…))` inside `PersistableMixin` (outermost
  stays). No behaviour yet (the root zone is W4).
- `packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts`
  — `landSwath`: the place check becomes `MixinApi.isContainable(plant) ?
  plant.getContainer() : null` vs `where` (l.411–413); `const bed =
  plant.getBed()` keeps working as `Stuff & Soil`. `RepotController` l.104
  unchanged (`===` on a Soil). `PlantController` imports unchanged.
- `packages/content/ground/src/idea/GroundCharacter.ts` — `export type
  GroundLean = Omit<GroundBand, 'from' | 'to'>`; `resolve(model, at,
  seed, nudge?: GroundLean)` applies `lean(pinned, [{ from: at, to: at,
  ...nudge }], at)` last. Test: a nudge scales depth and overrides N after
  a pin.
- `packages/server/src/mud/lib/advancement/CompetenceBand.ts` — `export
  const COMPETENCE_HALF_WIDTH`; `Reading.ts` l.184 deleted, `halfWidthOf`
  imports it.
- `packages/server/src/mud/lib/advancement/Advancement.ts` —
  `competenceBandCached(discipline)`, `warmCompetenceDigest()`;
  `void digestCache.refresh(entry.owner)` beside the practising refresh
  (l.101). `lib/standing/DerivedStandingCache.ts` — `has(subject)`.
  `platform/idea/api/PerceptionLogic.ts` `preloadForSenseGate` — the warm
  joins the `Promise.all`. Test: after `warmCompetenceDigest`, the cached
  band equals `competenceBandFor`'s.
- `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts`
  — the loose-list rule (D17), one line + comment.

**Acceptance:** `Soil.test.ts`, `Growing.test.ts`, `GroundCharacter.test.ts`
(ground pack) green; `AreaCrop.test.ts`, `HarvestVerb.test.ts`,
`PlantVerbs.test.ts`, `WaterVerb.test.ts`, `FeedVerb.test.ts` unchanged
and green; `lint:family` green. **Commit:** `build(field-population W0):
a soil made of parts, a plant that stands in one, the read by band`.

### W1 — the patch and the patched field

*Implements D2, D14, D15 (rows), D3 (the overrides).* Files:

- `packages/content/trade-farming/src/lib/CharacteredSoil.ts` —
  `CharacteredSoilMixin<TBase extends MixinConstructor<Stuff & Reserved &
  Soil>>` carrying `areaM2` (fieldMeta authorable; moved out of
  `Field.fieldMeta`), `getAreaM2/setAreaM2`, `installSoilReserves(sample,
  depthFactor = 1)` (the body of `Field.installSoilReserves` with `litres
  *= depthFactor`), `lastSample`, `soilLeachRate()`, `soilCatchmentAreaM2()`
  (`areaM2`). `static _mixinName = 'CharacteredSoilMixin'`.
- `packages/content/trade-farming/src/thing/Patch.ts` — `const PatchBase
  = CharacteredSoilMixin(SoilMixin(ReservedMixin(AdornmentMixin(
  VisibleMixin(Thing)))))` (`Thing` from
  `@saxonberg/server/mud/lib/stuff/Thing`, the `Floor` precedent).
  `fieldMeta`: `patchKey` (authorable), `lean` (authorable, a
  `GroundLean | null`). Methods: `getPatchKey()`, `getLean()`,
  `soilPartKey()` → `patchKey`, `getField(): Field | null`
  (`getAdornedTo()` narrowed `instanceof Field`), `watershedScope()` →
  `getField()`, `soilWaterDemandPerGameDay()` = Σ crops rooted here
  `standingAreaM2() × CROP_TRANSPIRATION_L_PER_M2_DAY` (the constant moves
  from `Field.ts` into `CharacteredSoil.ts` as an exported const; `Field`
  imports it) + `field.
  swardTranspirationPerGameDay() × areaM2 / field.getAreaM2()`,
  `soilDrawFactor(from, to)` → `field.soilDrawFactor(from, to)`,
  `soilDepthM()` → `lastSample?.topsoilM ?? null`, `installFromField(
  sample: GroundSample, fieldSample: GroundSample)` (`depthFactor =
  clamp(sample.topsoilM / fieldSample.topsoilM, 0.2, 2)`; sets
  `_materialPath` to `TEXTURE_MATERIALS[sample.texture]`; `settleSoilPlacement()`),
  `cropsOn(): (Stuff & Growing)[]` (the field's contents rooted here).
  `static markupAugmenters = [patchAugmenter]`: `GroundCharacter.lookPhrase(
  lastSample)`, then each crop's `readLines(viewer band)`, then each
  labeled individual rooted here (*"<label> stands here, labeled."*).
  Row `content/trade/farming/thing/patch.yaml`: `class:
  /trade/farming/thing/Patch`, `shortDescription: patch of ground`,
  `keywords: [patch, ground]`, `register: definite`, `_materialPath:
  /stuff/idea/material/earth/loam`.
- `packages/content/trade-farming/src/location/Field.ts` — compose
  `CharacteredSoilMixin` (`FieldGround = CharacteredSoilMixin(SoilMixin(
  ReservedMixin(Location)))`), delete the moved members; `patches:
  PatchSpec[]` (`{ persistent: true, authorable: true }`) with `export
  interface PatchSpec { key: string; name: string; keywords?: string[];
  areaM2: number; lean?: GroundLean; description?: string }`;
  `ensurePatches(model, seed, fieldSample)` (get-or-create by slot
  `patch:<key>`; the last spec absorbs `areaM2 − Σ`; clone the row, set
  key/name (`setShortDescription(name)`, register definite,
  `setKeywords([...name words, ...keywords])`), area, lean, description;
  `addFixture(p, 'patch:'+key)`; `p.installFromField(GroundCharacter.
  resolve(model, spot, seed, lean), fieldSample)`); `getPatches()`;
  `soilParts()` → `getPatches()`; `getCrops()` (every area crop in
  contents), `cropOn(part)`, `getCrop()` kept (first); `cropAreaM2` Σ;
  `settleCropTitle` over `getCrops()`; `bankWork` grub destructs all;
  `progressOn`/`improvementReversion` test `getCrops().length > 0`;
  `installFieldReserves`: with patches, skip `installSoilReserves` on the
  field (sward only); `onCreate`: `ensurePatches` BEFORE
  `installFieldReserves`; `fieldLines(viewer)` — the stand line (the kind,
  `cropAreaPhrase(Σ standing / areaM2)`, the stage phrase of the crop
  covering the most standing area), then per patch *"At <name>: <readLines
  at the viewer's band, joined>"* (only patches with a crop), stubble and
  seedbed lines as today; `fieldAugmenter` passes `viewer`;
  `commandContributions.inventory` adds `'platform/cmd/bulk/feed.yaml'`.
  ⚠ `soilWaterDemandPerGameDay()` on a patched field is never read (no
  reserve) — leave it.
- Rows (D15): `upper-bench.yaml` `patches:` + three `standing-wheat-*`
  props (delete `standing-wheat.yaml`); `home-field.yaml` `patches:`.
  Wheat/barley/cane rows: `specimenNoun`.
- Tests: `trade-farming/src/__tests__/field-patches.test.ts` — a field
  with two patches installs reserves on the patches and none on itself;
  the field's `soilMoistureFraction()` is the area-weighted mean; a plant
  with `groundPart` roots in its patch; the thin patch (depthScale 0.35)
  holds a third of the water per m²; `fieldLines` prints a line per patch;
  grub ends every patch's crop; a field with no `patches:` has no
  fixtures and installs its own reserves (byte-identical to the existing
  `field-crop.test.ts` fixture). `Patch.test.ts` — `watershedScope` is the
  field; `soilWaterDemandPerGameDay` sums its crops and its sward share.
  Restart: a patch's reserves survive a capture → `materialize` of the
  field (the fixtures slice; `Reserved.reserves` is `runtimeState`) — ⚠
  **`Soil`'s stamps are `persistent` only and would NOT ride the fixtures
  slice**: mark `soilClockStamp`, `_soilMeanMoisture`, `rainClockStamp`,
  `_rainAbsorbedLitres` `runtimeState: true` in `Soil.fieldMeta` (they
  are engine-written; `lint:field-meta` accepts the subset), and assert
  the stamp survives too.
- **Live stage:** boot; `look` at the bench: the stand line + three patch
  lines, no "a stand of wheat" in the loose list; `look at the top end`;
  founder `eval` reads the three patches' `soilMoistureFraction()` after
  a 30-day summer jump — the top end lowest.

**Commit:** `build(field-population W1): the patch — a field divided into
soils of its own, the bench and the home field authored in three`.

### W2 — the banded read, live

*Implements D9, D10, D13 end to end.* Mostly landed in W0/W1; this wave
proves it on a live world and closes the gaps:

- `preloadForSenseGate` warm verified on a fresh login: the first `look`
  of an expert reads at expert (a wire assertion in W6; here a staged
  probe with two characters — `founder` with an authored claim via `eval`
  on a Cast, and a fresh handle).
- `Patch` augmenter and `fieldLines(viewer)` read at the viewer's band;
  the floor band for a session with no transcript.
- `look wheat` on a patched field binds the first stand and says where it
  stands.
- Tests: `Growing.test.ts` adds the augmenter's band branch with a stub
  Advancing viewer whose digest is pre-set (`DerivedStandingCache` test
  seam `_clearAllForTesting` + a direct `refresh`); `field-patches.test.ts`
  adds a novice-vs-expert `fieldLines` pair asserting the novice's text
  is a prefix-subset of the expert's.

**Commit:** `build(field-population W2): the stand reads at your band —
less detail for a novice, never a different truth`.

### W3 — water, feed, harvest and sow at a patch

*Implements D5, D8, D18.* Files:

- Views: `bulk/water.yaml`, `bulk/feed.yaml`, `inventory/harvest.yaml`,
  `inventory/plant.yaml` gain the `patch` arg (D5) **after** the target
  and before/among the existing prepositional args (all bounded);
  `water`/`feed` targets → `[VisibleMixin, GrowingMixin|SoilMixin]`; help
  text gains the field paragraph (*"On a field divided into patches, say
  which: `water wheat at the top end`"*).
- `WaterController` — resolve per D18: `ground` = a Growing target's
  container when Soil else its bed; `const r = ground.resolvePartFor(
  model.patch?.stuff ?? null)`; refuse `r.reason` with `Mml.fromMarkup(
  r.line)`; the plant = `target.standIn(r.part)` (Growing) or
  `ground.cropOn`-equivalent through the kernel (contents filter `isGrowing
  && getBed() === (r.part ?? ground)`); with no plant on a Soil target,
  water the ground itself (`ground.waterSoil`); measure =
  `min(plant.waterHeadroomL(), available)`; the reply states the litres:
  *"You tip 2 L into the soil around the wheat at the top end. On a
  thousand square metres it barely shows."* — the second sentence when the
  litres are under `0.1 L/m²` of the part's area (`soilCatchmentAreaM2`).
  Capture `PersistableApi.captureHostOf(ground)` (the field's record
  carries the patch).
- `FeedController` — the same resolution; `plant.feedPlant(points)` for a
  plant, `ground.feedSoil`/`addOrganicMatter` for ground; the reply states
  the kilograms (`litres` of compost → *"a sack's worth, 20 kg"*) and
  the patch.
- `HarvestController` — after target resolution: `ground`/`resolvePartFor`;
  `plant = plant.standIn(r.part) ?? refuse 'nothing-sown-there'`
  (*"Nothing of that stands at the lane end."*); `landSwath` narrates the
  patch (*"You cut a swath of the wheat at the gate end"*).
- `PlantController.sowGround` — `resolvePartFor`; `standing` searched by
  `getBed() === target part`; `free` from the part's `soilCatchmentAreaM2()`;
  `patch-sown` refusal when `free < 1` on a part; `landSowing` sets
  `crop.setGroundPart(part.soilPartKey())` on a fresh crop before the
  move; the narration names the patch.
- Tests: `WaterVerb.test.ts` (a bare plant binds and is watered; a field
  with two parts refuses without `at` and lists both; `at` the dry part
  moves only that part's reserve; a bucket on a 1,000 m² part reports
  "barely shows"), `FeedVerb.test.ts` (likewise; nutrient of one part
  only), `AreaCrop.test.ts` (harvest at a part cuts that part's plant and
  grades by ITS worst limiting — two parts, one starved; sow at a part
  fills it and refuses `patch-sown`; a one-part ground needs no `at`),
  `harvest-view.test.ts`/`PlantVerbs.test.ts` arg-shape checks.
- **Live stage:** campus home field after `plough`: `sow wheat` refused
  with the three names; `sow wheat at the gate end` ×2; `water wheat`
  refused; `water wheat at the middle` from a pail — the litres and
  "barely shows"; founder `eval` the middle patch's reserve moved by that
  much.

**Commit:** `build(field-population W3): water, feed, sow and cut by the
patch — the vessel's volume into that soil, the grade off that stretch`.

### W4 — the specimen and the labeled plant

*Implements D6, D7.* Files:

- `SampleController.fromThing` — before the `Sampled` check: if
  `isGrowing(subject) && subject.isAreaCrop()`: `ground.resolvePartFor(
  model.patch?.stuff ?? null)` (refuse as the others), `stand =
  subject.standIn(part)`, `variation` from the seeded hash (field identity
  + part key + cycle), `piece = await stand.takeSpecimen(variation)`,
  `ContainmentApi.move(piece, giver)`, `stamp`, narrate *"You pull a stem
  of wheat from the top end and look at the roots."*. `sample.yaml` gains
  the `patch` arg; help gains the crop paragraph.
- `LabelController` — the crop branch: `isGrowing(target) &&
  target.isAreaCrop()`: resolve the part, `stand.standIn(part)`, `individual
  = await stand.takeSpecimen(0, { cut: false })` (D7), `setGroundPart`, `ContainmentApi.move(individual, field)`, label =
  text || giver's presentation, `setLabel`, keywords (`label` words +
  `labeled`), `shortDescription`, `installRootZone()` (below), capture the
  field; reply *"You tie your label to a stem of wheat at the gate end:
  <label>."*. `label.yaml` gains the `patch` arg (bounded after the
  greedy `text`).
- `Plant.ts` — the root zone (D6): `_rootZoneStamp` (persistent),
  `hasRootZone()`, `installRootZone()` (reserves `moisture` at
  `rootDemand[stage] × 0.35` L seeded at the bed's fraction, `nitrogen`
  100 % at the bed's fraction), `reconcileRootZone()` (own guard; a day
  at a time; drain `litresPerGameDay × warmth(ambient)`; relax toward the
  bed's current fraction with the two constants; nitrogen likewise), the
  five seam overrides reading the zone when present, `feedPlant` override,
  `waterHeadroomL`/`nutrientHeadroom` overrides. Dials: none new (two
  module constants, documented).
- `Growing.ts` — the roots line and the provenance line in the augmenter
  (W0 wrote the branch; this wave fills `ROOTS_PHRASE`), `specimenNoun`
  read by `takeSpecimen`.
- Tests: `SampleVerb` cases in `inventory/__tests__/` (a stem comes off a
  stand; the stand keeps its area; same part twice → equal vigor and the
  same cause; a stem in hand does not grow; `look stem` carries the roots
  and the provenance; the shipped soil/ore cases unchanged); `LabelVerb`
  (a labeled individual stands in the field, is listed, reads in full;
  `water <label>` reaches only it — the patch's reserve unmoved; a dry
  stretch with daily watering keeps it above its patch; a skipped week
  lets it fall back); `Plant.test.ts` root-zone arithmetic (equilibration
  toward the bed; the zone never exceeds capacity).
- **Live stage:** bench: `sample wheat at the top end`, `look stem`,
  `sample wheat at the lane end` reads better; home field: `label wheat
  at the gate end trial`, `look`, `look trial`, `water trial`.

**Commit:** `build(field-population W4): a plant you can hold and a plant
you can follow — the sampled stem and the labeled individual`.

### W5 — the hand reads with their own eyes

*Implements D11 (the consumer), D12.* Files:

- `packages/content/trade-farming/src/behavior/farms.ts` — per D12:
  shift gate; the water source config; soil parts; the banded, seeded
  read; one watering and one feeding per beat at most, to the lowest
  observed part below the threshold; `pick` stays Cultivable-only;
  `shelf: ''` disables the market leg. `farms.bounded.test.ts` literals
  updated (`'fill can from '`, `` `water ${kw} at ${part}` ``, …).
  `farms.test.ts` gains: two parts, the thirsty one is watered when the
  hand is expert; with a seeded novice band and two parts 0.02 apart, the
  hand waters the one ITS read says (assert against `readFor` with the
  same seed, not against the truth).
- Content: `campus-farm/agent/farm-hand.yaml` (D12; name and dossier
  authored — a modest hand, *"asserting: novice"*), `campus-farm/idea/
  farm-unit.yaml` `hand` position + `rosterSlots`, `campus-farm/thing/
  trough.yaml` → `WaterFixture` (keep its prose and keywords),
  `campus-field/location/home-field.yaml` `cast: [farm-hand]`.
  `campus-farm.test.ts` keeps passing (YAML only; `/platform/thing/
  WaterFixture`, `/platform/agent/Cast` qualify).
- **Live stage:** campus, on the hand's hours, a staged dry fortnight
  (founder `eval` draining two patches unevenly): watch one beat in real
  time (20 s watched cadence) — the hand fills at the yard trough and
  waters a patch; `look` at the field shows which; compare with the
  founder's expert read of the same moment.

**Commit:** `build(field-population W5): a hired hand reads the field at
their own band and waters where their read points`.

### W6 — the drive, the cover drive, the docs

*Implements D16.* Files:

- `packages/wire/tests/field-population.dirty.wire.test.ts` — the
  requirements' 13 steps as checkpoints that can fail, in this order
  (season by clock jump; the bench is pre-sown and established, so the
  summer read is a jump to ~day 160; the home field is sown in spring by
  the drive):
  1. bench, summer: `look` → a line per patch; the top end's line reads a
     worse band word than the middle's and the lane end's (parse the
     condition phrases; assert rank).
  2. `look at the top end` as the handle (fresh, floor band) → no cause
     sentence; as a founder-staged expert character (a `claim` seeded by
     `eval` on a second handle's Avatar — the `competence` verb reports it)
     → the cause sentence present; the two texts differ only by addition.
  3. `sample wheat at the top end` → `me:i:stem`; `look stem` → stage,
     band, cause, roots, *"Taken from the top end"*; sample again → the
     two stems' `look` texts equal.
  4. `sample wheat at the lane end` → its band word ranks above the top
     end's.
  5. `water wheat` → refused `patch-unnamed`, the prose names all three.
  6. campus, spring: `apply for labourer` at the yard and `clock on`
     (the sow title gate — the cover drive's step 13a shape), `plough`,
     `sow wheat at the gate end` ×n, `at the middle`, `at the far side`;
     `label wheat at the gate end trial` → `look` lists it; `look trial`
     reads stage/condition/cause.
  7. a dry stretch: founder `eval` pins the field's rain locality to a dry
     lean or drains the patches; six staged days: `water trial` each day
     (the can refilled at the yard trough, `fill can from trough`); then
     `look trial` ranks above `look at the gate end`'s line and above a
     fresh `sample wheat at the gate end`.
  8. `water wheat at the middle` from a pail → the reply states litres and
     *"barely shows"*; `eval` the middle patch's moisture before/after
     differs by ≤ 10 L / capacity.
  9. `feed wheat at the far side` with a compost sack → the reply states
     the kilograms; `eval` nitrogen rose on the far side only.
  10. summer's end: `harvest wheat at the gate end` and `at the far side`
      (the far side neglected: drained by `eval` through the season) →
      `me:i:wheat` sacks; the gate end's grade word ranks above the far
      side's (`look sack` reads the grade band).
  11. the hand: a staged dry week; watch the hand's beat in real time
      (`listen`), then `look` → which patch was watered (the field's patch
      lines move); the founder's expert read names the driest; record both,
      assert the hand watered SOME patch and the log names it.
  12. a Waponi cane piece: `look` and `harvest cane` with no `at` → not
      refused `patch-unnamed`.
  13. the dorm's starter pot: `look lily` carries the cause sentence for a
      floor-band handle; `water lily` lands.
  `declareFile` packs: platform, trade-farming, trade-ranching,
  eternal-university, hearts-delight, waponi-woo, terminus, generic-objects;
  `dirtyReason` — takes a campus labourer seat, ploughs, sows and cuts
  the home field, pulls stems off the bench, labels a plant, spends the
  farm's compost and water.
- `cover.dirty.wire.test.ts` — steps 1, 4, 7, 9 per D16; step 6's
  `look wheat` unchanged.
- Docs (the sweep owns the index lines): `docs/subsystems/soil.md`
  (§ a soil made of parts; the patch), `husbandry.md` (the plant's part,
  the specimen, the labeled plant's root zone, the read by band),
  `instrumentation.md` (the half-width table's new home; a note that the
  stand read is a band on `look`), `behavior.md`/`employment.md` (the
  campus hand), `advancement.md` (the sync digest read).

**Commit:** `drive(field-population): <what driving found>` then
`docs(field-population): …`.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the patch as a target | `look`, `water`, `feed`, `sample` … | a fixture is a **peer** candidate (`candidatesForPeers` walks `getFixtures()`) — verified | the field row's `patches:` (keywords from the name) | none — minted at `Field.onCreate` | `requires: SoilMixin` on the `patch` arg; `Mixins`' refusal for a non-soil thing |
| water a patch / a field plant | `water` (tool-afforded by the can, shipped) | the can in hand | — | none | target `[VisibleMixin, GrowingMixin\|SoilMixin]` — ⚠ the shipped `CultivableMixin` gate is why a bare plant never bound; W3 widens it and the WaterVerb test pins it |
| feed a patch | `feed` | ⚠ **a field affords nothing today** — `Field.commandContributions.inventory += feed.yaml` (W1) | compost sack (shipped) | none | as above |
| harvest at a patch | `harvest`/`pick` | `Plant.peers` (every per-patch crop is a peer) | `swathM2` (shipped) | none | `patch` arg; `nothing-sown-there` when the part holds no crop of that kind |
| sow at a patch | `sow`/`plant` | `Field.inventory` (shipped) | seed rows (shipped) | none | `patch` arg; `patch-sown` |
| the specimen | `sample` | the verb is general (shipped); the case is the bound plant | `specimenNoun` on the plant rows | none | `subject` `requires: any` (shipped); `patch` arg |
| the labeled plant | `label` | `LabelledMixin.peers`/`environment` — composed on `Plant` (W0) | — | none | `target` `requires: LabelledMixin` — satisfied the moment `Plant` composes it; `text` greedy then `patch` `[at]` greedy (binder rule verified) |
| the banded read | `look` | — | the viewer's transcript (a claim row for a Cast) | ⚠ the digest warm rides `preloadForSenseGate`, which `look` already awaits; nothing boot-listed | — |
| the hand | `fill`, `water`, `feed` (by word) | the brain on the Cast row; the seat on `farm-unit.yaml` | the yard trough as a `WaterFixture`; a can and a sack in the hand's props | ⚠ the university is not boot-listed; the hand beats while the home field is loaded (a player present) — honest for the drive, which watches in real time | — |
| a one-piece field | every verb | unchanged | no `patches:` | none | `resolvePartFor(null)` → `{ ok, part: null }` |

---

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| 1 — a line per patch; the poorer patch reads poorer through a season | W1 (patches + lines), W2 (words), drive 1 |
| 2 — novice vs expert, same moment: less detail, same truth | W0 (`readLines`), W2 (the live band), drive 2 |
| 3 — `sample` gives a plant naming field + patch, stage/condition/cause/roots; same spot same reading | W4, drive 3–4 |
| 4 — `label` leaves a listed, readable plant | W4 (+ D17 keeps it listed), drive 6 |
| 5 — care aimed at a labeled plant reaches only it; it outreads its patch through a dry stretch | W4 (root zone), drive 7 |
| 6 — `water`/`feed` deliver the vessel's volume into the patch and say how much | W3, drive 8–9 |
| 7 — refused without a name, with the names; a one-patch field needs none | W0 (`resolvePartFor`), W3, drive 5 + 12 |
| 8 — the well-kept patch's sack grades better | W3 (D8), drive 10 |
| 9 — the hand waters where its own banded read points | W5, drive 11 |
| 10 — no-patch fields, beds and pots unchanged | W0/W1 one-piece paths + the existing suites; drive 12–13; the cover drive |

Nothing unmapped. The drive's step 11 asserts the hand's act and records
the comparison; it cannot assert "wrong" deterministically (R3).

---

## Test & gate strategy

- **Unit (near):** every W0–W5 file has a `__tests__` sibling named above;
  kernel tests import `test-bootstrap`. The soil aggregation and the root
  zone are stepped integrals — pin them with two-step fixtures (`lint:
  reconcile-chains` wants the draw inside the loop).
- **Only the drive can prove:** the binder's `at` shapes across six views
  (an arg-shape test cannot see the live keyword match on a fixture), the
  fixtures slice carrying a patch's reserves across a restart on a real
  record, the digest warm on a first look, the hand's beat, the clock-jumped
  season on three patches.
- **Gates:** `pnpm -C packages/server lint:family` after every wave.
- **`pnpm test` runs exactly twice:** at code-complete (the MR is already
  open — this build lands on !480; say in the message what is still
  running) and at `/finalize`. Between: `pnpm test:near` + the four packs'
  vitest.
- ⚠ `WIRE_PORT` per worktree (build-1 = 2014); hold the server only while
  staging or driving; tear it down by PID; a drive world is ~3 GB.

---

## Risks & opens

**R1 — SETTLED by the owner (2026-10-29): no second arg on `look`; D13's
three reads stand (patch look, patch-named stand, field lines).** Kept for the record:
`look wheat at the top end` is not a shape `look` binds (D13).
The requirements' drive step 2 writes it. The plan's answer is `look at
the top end` (the patch's own look) and the field's per-patch lines, and
`look wheat` naming its patch. Accepting that wording is the owner's call;
the alternative is a second arg on `look.yaml` for one subsystem, which
the plan declines. The build proceeds on the plan's reading.

**R2 — SETTLED by the owner (2026-10-29): `sow` names its patch too.** The cover drive sows the home field with no
patch named; AC 7 says every act names one. The plan makes `sow` consistent
(refused without `at` on a multi-patch field) and rewrites the cover
drive's step 4. If the owner wants `sow` to stay field-wide (a cast
falling where you walk), it is one branch in `PlantController` and the
drive step stands as it was — say so in review.

**R3 — the hand being "wrong" is probabilistic by design.** With the
bracket at ±8 % of the fraction, a novice hand misranks only patches
within that band of each other. The drive stages the two near together
and records the outcome; it asserts the act, the log and the comparison,
not the error. If the owner wants a visible wrong choice every run, the
dial is the half-width table, which is instrumentation's.

**R4 — the fixtures slice and `Soil`'s stamps.** A fixture's state rides
the host record only for `runtimeState` fields; W1 marks the soil stamps
so. If a stamp must stay authorable-visible for some reason the build does
not see, the fallback is a self-persisting patch — which nothing would
restore, so it is not a fallback. The restart test in W1 is the proof.

**R5 — `water the lily` never bound a bare plant** (grounding). Widening
the gate is a behaviour change on a shipped verb that nobody drove; the
WaterVerb test pins the new case. Record it in the MR.

**R6 — the digest refresh per deed** is one indexed transcript fold per
`creditDeed` (the practising cache already folds once). If a profile shows
it, coalesce in `DerivedStandingCache.refresh` (an in-flight guard the
scheduled warm already has) — not this build's unless measured.

**R7 — the bench's prose** (*"bare patches up at the top end where the
soil runs out"*) now meets a top end that carries thin wheat. The row's
`longDescription` is edited in W1 to say the wheat up there is short and
patchy; the ground phrase on `look at the top end` says the rest.

**R8 — authored crop rows carry `groundPart` by key** and a patch renamed
in a row orphans nothing (fallback to the whole ground) but silently
re-roots the crop in the field's aggregate soil. The W1 test covers the
fallback; the content rule (keys are stable; names may change) goes in
the soil.md sweep.

**Must the build stop for any of these?** No. R1 and R2 are wording
decisions the plan resolves one way and names in the MR description; the
owner can reverse either in review at the cost of one drive step each.

---

## Deferred seams

- **Patches on the sward** (uneven grazing, the trough corner) → the
  field-population slate § 9. The attach point is `Patch.soilWaterDemand
  PerGameDay`'s sward share and `Field.swardShortfallFed`.
- **Weeds, thinning, a hoe** → farming-slate. `Patch` is where a weed
  reserve would live.
- **Irrigation** (channels, a cart barrel) → irrigation-slate. The
  bucket's *"barely shows"* reply is the demand.
- **A grieve's report verb** → field-population slate § 8.5. `readFor` is
  what it would print.
- **The hand harvesting a field** (a tool, an engaged act, a cart) → the
  farms brain's slate entry; `pick` stays Cultivable-only.
- **Seed saving from a labeled plant** → farming-slate (genetics).
- **A second arg on `look`** (R1) → command-taxonomy slate.
- **Hiring a hand for your own ground** → the labor-market slates.

Leave as slate entries at the sweep; nothing above is a plan section.

---

## Critical files

Read first, in this order:

1. `docs/requirements/field-population-requirements.md`
2. `docs/slates/builds/field-population-slate.md`
3. `docs/plans/cover-plan.md` §§ Grounding, D1–D6, B10, B17, B21–B37 and
   the drive record (the lessons the drive must not relearn)
4. `packages/server/src/mud/lib/husbandry/Growing.ts` (`getBed`,
   `getLimitingFactor`, `reconcileGrowth`, the augmenter, the area crop)
5. `packages/server/src/mud/lib/husbandry/Soil.ts` (the interface, the
   hooks, `reconcileSoil`, `creditReserve`, `watershedScope`)
6. `packages/server/src/mud/platform/thing/Plant.ts` and
   `packages/server/src/mud/lib/reserve.ts`
7. `packages/content/trade-farming/src/location/Field.ts`,
   `src/lib/Sward.ts`; `packages/content/ground/src/idea/GroundCharacter.ts`
8. `packages/server/src/mud/lib/stuff/Place.ts` (`ensureFloor`),
   `lib/boundary/Adornable.ts` (`addFixture`, the fixtures slice),
   `platform/thing/Floor.ts` (the fixture composition precedent)
9. `packages/server/src/mud/platform/idea/cmd/{bulk/Water,bulk/Feed,
   inventory/Harvest,inventory/Plant,inventory/Sample,inventory/Label}Controller.ts`
   and their views under `packages/content/platform/content/platform/cmd/`
10. `packages/server/src/mud/lib/command/CommandDefinition.ts` l.660–725
    (greedy + prepositional), `platform/idea/api/CommandLogic.ts`
    `parseRequirement` (l.3027)
11. `packages/server/src/mud/lib/advancement/{Advancement,CompetenceBand}.ts`,
    `lib/standing/DerivedStandingCache.ts`,
    `platform/idea/api/PerceptionLogic.ts` (`preloadForSenseGate`),
    `lib/instrument/Reading.ts` (`HALF_WIDTH`, `observe`)
12. `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts`
    l.200–230, 336–360
13. `packages/content/trade-farming/src/behavior/farms.ts` + its two
    tests; `packages/content/trade-sugar/src/behavior/cuts.ts`
14. The content: `hearts-delight/.../bench-field/{location/upper-bench,
    thing/standing-wheat}.yaml`, `eternal-university/.../campus-field/
    {location/home-field,idea/ground}.yaml`, `campus-farm/{idea/farm-unit,
    location/yard,thing/trough}.yaml`, `hearts-delight/.../dairy/
    {agent/dairy-lad,idea/dairy-business}.yaml`, `duncan-hall/thing/tap.yaml`,
    `trade-farming/.../thing/plant/wheat.yaml`
15. `packages/wire/tests/cover.dirty.wire.test.ts` and
    `packages/wire/src/harness/{world,session}.ts`
16. `docs/subsystems/{husbandry,soil,instrumentation,behavior,employment}.md`,
    `docs/design-lenses.md`

---

## Build record — field population

### W0 — the kernel seams

Landed as planned: the parts protocol + aggregation on `SoilMixin`, the
headroom reads, `groundPart`/`specimenNoun`/`_specimen` and the Growing
surface (`standIn`, `rootsBand`, `feedPlant`, `waterHeadroomL`,
`nutrientHeadroom`, `readFor`/`readLines`, `takeSpecimen`), `getBed`
through `soilPart` (widened to `(Stuff & Soil) | null`), the banded
augmenter branch, `Plant` composing `LabelledMixin` + `SampledMixin`,
`landSwath` comparing the crop's container, `GroundCharacter.resolve(…,
nudge?)`, `COMPETENCE_HALF_WIDTH` on `CompetenceBand`,
`competenceBandCached`/`warmCompetenceDigest` + `DerivedStandingCache.has`
+ the digest refresh on append + the preload warm, and the D17 loose-list
rule. Tests: `Soil.test.ts` (+11), `Growing.test.ts` (+8),
`GroundCharacter.test.ts` (+1), new `competenceBandCached.test.ts` (4).

Decisions the plan did not make:

- ⚠ **Per-cent reserves are applied ALIKE to every part, not spread by
  area share** (D3 said "spread by area share" for all six writes). Only
  `waterSoil` (litres — extensive) is spread by area share and returns the
  sum. `feedSoil`, `addOrganicMatter`, `drawNutrient`, `fixNitrogen` and
  `poach` act on per-cent reserves (intensive): spreading 10 points 60/40
  would raise each part by 6 and 4 and the field's mean by only 5, so a
  divided field would gain half the legume nitrogen, lose half the
  harvest draw and take half the muck a one-piece field does. Each part
  takes the same amount; the return is the area-weighted mean taken —
  what the whole field's reserve would have moved by. Likewise
  `soilNutrientHeadroom` is the area-weighted MEAN of the parts (points),
  `soilMoistureHeadroomL` the SUM (litres). Intent of D3 ("the sward,
  turnUnder, cycleGrazedNitrogen keep reading the field and get the
  aggregate") is what decided it.
- `resolvePartFor(null)` on ground with exactly ONE part answers that part
  (not `null`): a crop bound to it is rooted there.
- `SpecimenRecord` gained `severe: boolean` and `next: LimitingFactor`
  beside the plan's five fields — a pulled stem cannot be re-sampled
  live, so the proficient and expert rungs of its banded read need the
  severity and the second factor stamped at the pull too.
- `standIn` (and the kind test it uses) matches **the same template path
  OR the same `harvestTemplatePath`**: D15's bench stands are three
  `extends:` rows with three different template paths over one wheat, so
  a template-path-only match would never find the middle's stand from the
  top end's. `ripeSibling` is unchanged (template path only) — W3 should
  check whether `harvest wheat` substitution across the bench's three rows
  needs the same widening.
- Two small public methods on `Growing` that the plan implied but did not
  name: `specimenVariation()` (D7's seeded vigor variation — the module's
  FNV-1a `hashString` lives behind it) and `readSeedFor(reader)` (D11's
  per-reader, per-part, per-game-day seed) — so `SampleController` (W4)
  and the farms brain (W5) call the object, not a hash.
- The banded read's rungs (`readFor`) are masked BY BAND in the returned
  `CropRead` (a novice's read has `cause: null`), not only in its words —
  a hand acting on the read cannot know more than its eyes do.
- "It stands at <part>." is printed first, before the banded lines; for a
  specimen the roots line and "Taken from <part> of <field>." follow.
- `SHALLOW_TOPSOIL_M = 0.2`, `SODDEN_AT = 0.95`, `SEVERE_AT = 0.3` —
  constants in `Growing.ts`; the top end (0.34 × 0.35 ≈ 0.12 m) reads
  `shallow`.

- ⚠ **`lint:unconsumed-seams` ceiling 18 → 20 for this one wave.** The
  two new terminal-default `@hook`s (`soilPartKey`, `soilDepthM`) have
  kernel callers but no override until W1's `Patch`; the gate counts
  un-overridden hooks. The rise carries a caller audit in the script's
  comment. **W1 must lower `SEAM_CEILING` back to 18** when `Patch`
  overrides both (the plan already says every new @hook has its override
  in W1).

Notes for later waves:

- `landSwath` still calls `bed.ensureCropTitle()` on `plant.getBed()` —
  on a patched field that is the PATCH, whose default is a no-op. W1's
  `Patch` must forward `ensureCropTitle` to its field (or W3 call it on
  the container) or a stranger's cut on the bench stops being the farm's.
- `Plant` is now `Sampled`, so until W4 changes `SampleController.fromThing`,
  `sample wheat` on a stand would stamp the stand in place (the shipped
  non-stackable branch). No drive step reaches it before W4.
- `LabelledMixin` affords `label.yaml` on every plant from now on.

### W1 — the patch and the patched field

Landed as planned: `CharacteredSoilMixin` (`trade-farming/src/lib/CharacteredSoil.ts`
— `areaM2`, `installSoilReserves(sample, depthFactor)`, `lastSample`,
`soilLeachRate`, `soilCatchmentAreaM2`, and `CROP_TRANSPIRATION_L_PER_M2_DAY`
moved out of `Field` with no behavior change); `Patch`
(`src/thing/Patch.ts` + row `content/trade/farming/thing/patch.yaml`) —
the parts-protocol overrides `soilPartKey`/`soilDepthM`, `watershedScope`
→ its field, `soilWaterDemandPerGameDay` (crops rooted here + its area
share of the sward), `soilDrawFactor` → the field's, `installFromField`,
`cropsOn`, the patch augmenter; `Field` composing the mixin, `patches:
PatchSpec[]`, `ensurePatches` (get-or-create at `patch:<key>`, the last
spec absorbing the area), `getPatches`/`soilParts`/`getCrops`/`cropOn`,
the title/progress/reversion/grub paths over every crop, `fieldLines(viewer)`
with one banded line per sown patch, no field-own soil when patched, and
`feed.yaml` afforded; `Soil.fieldMeta`'s four stamps are now
`runtimeState` (R4). Rows: the bench's three patches + three
`standing-wheat-*` `extends:` rows (the old `standing-wheat.yaml`
deleted, the long description edited per R7), the home field's three
patches, `specimenNoun` on wheat/barley/cane. `lint:unconsumed-seams`
ceiling back to **18** and W0's temporary comment removed — the file is
byte-identical to before W0. Tests: `trade-farming/src/__tests__/field-patches.test.ts`
(17), including the R4 restart.

The three W0 hand-offs:

- **The ceiling** — 20 → 18 (the census reads 18; it cannot go lower).
- **`ensureCropTitle`** — `Patch.ensureCropTitle()` and
  `Patch.sowingRefusal()` forward to the field, so `landSwath`'s
  `plant.getBed().ensureCropTitle()` still titles a stranger's cut on the
  bench to the farm.
- **The stand answers to its patch's name (amended D13)** — done in the
  KERNEL, on `Plant.getKeywords()`, not by writing keywords onto the
  crop: a plant whose `groundPart` resolves to a part adds that part's
  name stem (`presentationPhrase().bare()`, *top end*) and its key
  (*top-end*). Derived, so a renamed patch renames the words, a restart
  needs nothing, and it reads only the kernel's parts protocol
  (`soilPartKey`, the part's presentation) — no pack import, no new hook.
  Plants are Organisms, so the recognition face unions `getKeywords()`
  into the targeting pool (`RecognitionLogic.perceivedKeywordsImpl`).
  `look top end wheat` then scores the top end's stand 25 on every word
  and the whole-phrase filter drops the others.

Decisions the plan did not make:

- **`Field` finds its patches by SLOT, not by class.** `getPatches()`
  reads the fixtures in `patch:<key>` for each authored spec, in spec
  order; `Field` imports `Patch` as a type only. `Patch` imports `Field`
  at runtime (`getField()` narrows `instanceof Field`) — one direction
  only, so there is no runtime import cycle.
- **`PatchSpec.name` is a definite phrase; its *the* is the register.**
  `configurePatch` strips a leading *the*, sets the stem as the short
  description and the register `definite`, so `definite()` reads *the top
  end* everywhere (`soilPartRefusal`, the field's lines, the crop's *It
  stands at …*). Keywords = the row's (`patch`, `ground`) + the stem + its
  words + the key + `spec.keywords`. Re-run on every `onCreate`, so an
  edited row reaches a booted world.
- **A patch's material** is set from `TEXTURE_MATERIALS[sample.texture]`
  through `setMaterial` when the material row resolves; the row's loam is
  the fallback.
- **A failed patch mint is warned, never thrown** (the `ensureFloor`
  rule), and `installFieldReserves` gives the field its own soil whenever
  it has no patch FIXTURES — so a field whose patch row is missing reads
  as one piece rather than as a field with no soil.
- **The stand line on a divided field** is the crop covering the most
  standing ground, phrased for the WHOLE stand's share: `cropAreaPhrase`
  is handed the field area scaled by that crop's share of the standing
  total (one crop: the field's own area, byte-identical). "Part of it is
  cut" / "the stools are tired" fire if ANY crop is.
- **The patch line's form** is *"At the top end it is tillering and looks
  well. It is short of something."* — the banded read's first line with
  its *It* lowered behind *At <patch>*.
- **`look at the top end`** prints the ground's `lookPhrase` (capitalized),
  then *"A stand of wheat grows here."* + that crop's banded lines, then
  *"<Label> stands here, labeled."* per labeled individual (W4 makes those).
- **The plan's `Patch.test.ts` cases** (watershed scope, thirst = crops +
  sward share) live in `field-patches.test.ts` beside the forwarding
  test: they need the same divided-field fixture, and a second copy of it
  would be the larger diff.
- ⚠ **The R4 test is only non-vacuous because the clock moves across the
  "restart".** A re-minted patch stamps its window at `installFromField`
  (`settleSoilPlacement`); with the clock unmoved the fresh stamp EQUALS
  the captured one and the test passed with the `runtimeState` marker
  removed. The test now advances two days before re-minting, and was
  checked to fail without the marker.

Verified: tsc (server, trade-farming, trade-ranching, trade-apiculture,
trade-sugar) clean; trade-farming vitest 121/121, eternal-university
47/47, ground 116/116, trade-sugar 40/40 (hearts-delight has no suite);
`pnpm test:near` — every package green except one `PackLogic` integration
test that timed out at 120 s under the run's contention (collect 3,476 s)
and passes alone (11/11, 38 s); `lint:family` — all 82 gates pass.

Not done here: the plan's **live stage** (boot, `look` the bench, a 30-day
jump) — this wave was run without booting a server; W2's staged probe and
W6's drive cover it.

Notes for later waves:

- **W2:** `fieldLines(viewer)` and `Patch.patchLines(viewer)` already read
  `viewer.competenceBandCached(...)` (floor for a non-Advancing viewer);
  `fieldAugmenter`/`patchAugmenter` pass the viewer. W2 needs only the
  live proof and the novice/expert pair.
- **W3:** `Patch.sowingRefusal()` forwards the field's ploughed-this-season
  answer; `patch-sown` (a full patch) is W3's. `Field.cropOn(part)` is the
  per-patch lookup; `Growing.standIn(part)` matches on template path OR
  harvest path (W0), which the bench's three `extends:` rows need.
  `ripeSibling` is still template-path only — `harvest wheat` substitution
  across the bench's three rows will not cross rows (W0's note stands).
- **W3:** `feed.yaml` is now afforded by `Field`; its target gate is still
  `[VisibleMixin, CultivableMixin]`, so `feed` in a field binds nothing
  until W3 widens it to `GrowingMixin|SoilMixin`. `lint:reachability`
  passes either way.
- **The cover drive (W6):** the bench's crop is three rows now; step 1's
  "a stand of wheat" appears once in the field's stand line plus once per
  patch only as *"At the … end it is …"* (no repeat of the noun), and the
  loose list no longer carries crops (D17).

### W2 — the banded read, live

The wiring was in place from W0/W1 (`preloadForSenseGate` warms the
digest; the crop augmenter, `Field.fieldLines(viewer)` and
`Patch.patchLines(viewer)` read `competenceBandCached`, floor for a
non-Advancing or cold viewer). This wave added the tests and the live
proof, and the live proof found two targeting defects — one fixed here,
one handed on.

Tests: `Growing.test.ts` +4 (an expert reader with a real folded digest
reads the expert lines and an untrained one the floor, the untrained read
a prefix of the expert's; a COLD digest reads the floor — never a guess
upward; a non-Advancing viewer reads the floor; a pot plant is not
banded). `field-patches.test.ts` +1 (a novice/expert pair on the same
divided field at the same moment: the novice's top-end line is the start
of the expert's, *short of something* vs *The soil is dry there.*, no
digit; the patch's own look reads at the same band).
`scope-walk.score.test.ts` +3 (below).

**Live (fresh world, port 2014, `reset:db`, clock to summer in 10-day
steps, day 111, 11:00).** The untrained read of the bench, and the expert
read at the same moment (the founder granted four `hard` horticulture
successes by `eval … self.creditDeed(…)` — `"expert"` — beside a fresh
handle with no transcript):

> untrained (`look`): *A stand of wheat grows over about three-quarters
> of it, in ear, the ears filling. At the top end it is in ear and is
> failing. At the middle it is ripe and looks poor. At the lane end it is
> ripe and looks poor. The grass on the rest of it is grown long — going
> stemmy, and seed heads showing.*
>
> expert (`look here`): *… At the top end it is in ear and is failing. It
> is short of something. The soil is spent there. The nitrogen is all but
> gone. Nothing else is short. At the middle it is ripe and looks poor. It
> is short of something. The soil is spent there. The nitrogen is only a
> little low. Nothing else is short. At the lane end …* (as the middle)
>
> `look at the top end`, fresh/untrained: *the top end — The top of the
> strip, where the hill starts to steepen and the soil thins to a skin
> over the stone. Soft, silky ground that caps hard after rain, it lies
> wet a long while after rain, more stone than soil in places. A stand of
> wheat grows here. It is in ear and is failing.*
>
> the same, expert, same moment: *… A stand of wheat grows here. It is in
> ear and is failing. It is short of something. The soil is spent there.
> The nitrogen is all but gone. Nothing else is short.*
>
> `look stand top end wheat` / `look "wheat at the top end"`, expert: *a
> stand of wheat — Wheat standing stiff in the ear, … It stands at the
> top end. It is in ear and is failing. It is short of something. The
> soil is spent there. The nitrogen is all but gone. Nothing else is
> short.*

The top end reads poorer than the middle and the lane end (failing vs
poor; *all but gone* vs *only a little low*), and every band's words are
the start of the next's. The expert read on a **fresh login** (a new
session, first command `look at the top end`) was the expert read — the
preload warm works.

Decisions the plan did not make:

- ⭐ **`look at the top end` asked *"the top end, or a stand of wheat?"*
  (fixed).** W1 made the stand answer to its patch's words, and `look`'s
  `onExcess: prompt` asks whenever more than one whole match survives —
  scores only order. Fixed in the kernel scorer (`scoreCandidates`,
  `api/mql/scope-walk.ts`), the same shape as the shipped whole-phrase
  cut one tier down: **for a query of two or more words, a candidate
  whose NAME carries every word (score ≥ 40) outranks one that reaches the
  phrase only through keywords, absolutely.** A one-word query is
  untouched (`look rod` among three rods is still the prompt). Lens 3a:
  the player named the ground, and the fiction cannot answer by asking
  whether they meant the crop standing on it. The 45 test files that
  resolve MQL or carry `onExcess` all pass (392 tests).
- ⚠ **Handed on, NOT fixed: a partial match in `$focus` beats a whole
  match in `reachable`.** `look`'s scope list is `["$focus",
  "reachable"]`, and `walkScopes` / the top-one path take the FIRST scope
  with any match. After `look at the top end` the focus is the patch, so
  `look top end wheat` scores the patch partially (two of three words) in
  `$focus` and binds it — the patch's look, not the stand's — though
  `reachable` holds the stand as a whole match (`query top end wheat`
  answers the stand alone; `look stand top end wheat` and the quoted form
  bind the stand). This is the drive's step-2 ORDER exactly. The fix is a
  resolver change (the result says whether its matches were whole, and
  the scope walk keeps a partial only as a fallback behind a later
  scope's whole match) — cross-cutting, so it is recorded here for the
  owner rather than made in a farming wave.
- **`look wheat` prompts among the three stands** (*a stand of wheat (1)
  / (2) / (3)*) rather than binding the first: `look` is `onExcess:
  prompt`, so D13's *"the binder's first match"* does not hold for
  `look`. The prompt is honest (three stands answer the word); the drive
  should use the patch-named form.
- The grant used `creditDeed` (lived deeds, `kind: 'deed'`), not an
  authored claim: a player's band is its lived band, and the digest
  refreshes on the append (W0), so the next look read at expert with no
  re-login.
- `eval` reads of a patch (`getPatchKey`, `soilPartKey`) are refused by
  the sandbox boundary (*"context scope field(none) vs receiver scope
  field(none)"*) even for the founder with `--parcel` — not this build's
  seam; the moisture comparison was read off the words instead.

Verified: tsc (server, trade-farming) clean; `Growing.test.ts` 31/31,
`field-patches.test.ts` 18/18, `scope-walk.score.test.ts` 11/11, the MQL
dir 52/52; `pnpm test:near` — 8 packages, 301 files, 2,784 passed + 2
skipped, none failed; `lint:family` — all 82 gates pass.

Notes for later waves:

- **W6 (the drive):** step 2 must not run `look top end wheat` with the
  patch in focus until the `$focus` partial defect above is fixed — or
  the owner decides it is fixed first. `look "wheat at the top end"` binds
  the stand regardless.
- **W3:** nothing new; W1's notes stand.

### W3 — water, feed, harvest and sow at a patch

Landed as planned: `water.yaml`/`feed.yaml` targets are `[VisibleMixin,
GrowingMixin|SoilMixin]` (D18 — a bare plant binds now); all four views
(`water`, `feed`, `harvest`, `plant`) carry `at <patch>` (optional,
greedy, `scope: ["reachable"]`, `requires: SoilMixin`, before the
prepositional args) and a field paragraph + example in their help. The
controllers ask the GROUND (`resolvePartFor`) and send its line
(`patch-unnamed`, `not-a-part-here`); a field crop acts through
`standIn(part)`. Water/feed state the amount (*"You tip 2 L of clear
water…"*, *"You work 6.3 kg of crumbly black compost…"* — kg by the
material's density, litres when it has none) and add *"On 1,000 square
meters it barely shows."* under 0.1 L/m² of the ground watered. Harvest at
a patch cuts that patch's stand (`nothing-sown-there` when none of that
kind stands there), the swath line names the patch, and the grade is the
stand's own `_worstLimiting`. Sow at a patch fills the part up to its own
area, `setGroundPart` before the move, `patch-sown` when full; the
narration names the patch.

Tests: `AreaCrop.test.ts` +6 (harvest at a part cuts that part and grades
by ITS worst — two parts, *poor* vs *exceptional*, nitrogen drawn from the
cut part only; no part named → `patch-unnamed` listing them;
`nothing-sown-there`; sow at a part fills it, roots it by key, refuses
`patch-sown`, a second part takes its own stand; one-part ground needs no
name; another ROW of the same crop is widened, not refused) and the
`other-crop-stands` fixture now differs by harvest path too.
`WaterVerb.test.ts` +7 (the view: a bare plant binds, the `patch` arg;
a bare field crop is watered and the reply says *2 L*; two parts refuse
without `at` and list both; `at` the dry part moves only that part; a
10 L bucket on 1,000 m² *barely shows*; a part with nothing sown is
watered itself). `FeedVerb.test.ts` +3 (refused unnamed, nothing spent;
`at` one part feeds only it, *6.3 kg*; a part named as the target).
`harvest-view.test.ts` +4 (the `patch` arg shape on harvest and plant,
and both views still load).

The hand-offs:

- **`ripeSibling`** matches by KIND (template path OR harvest path, the
  W0 `standIn` rule — `isSameKindAs` is public now) **and only within
  the same bed.** ⚠ Deliberately NOT across patches: on a divided field
  the patch is what the player named, so a ripe stand at the lane end is
  no substitute for the middle's; with no `at` the act is refused before
  substitution anyway. On an undivided field every stand's bed is the
  field, so the sugar drive's cane substitution is unchanged.
- **`feed`/`water` targets** widened per D18.
- **`patch-sown`**, **`patch-unnamed`** (returned by the ground, the
  controller only sends it), the amounts, the per-patch cut — done.

Decisions the plan did not make:

- **`Soil.rootedAreaCrop(part)`** (kernel, on `SoilMixin`) — the plan's
  "`ground.cropOn`-equivalent through the kernel". Asked of a PART itself
  (`water the top end`) it asks the ground the part is fixed to
  (`Adornment.getAdornedTo`), since a patch holds nothing. `water`,
  `feed` and `sow` use it; `Field.cropOn` (pack) is untouched.
- **Part resolution applies to AREA crops only.** An individual plant
  (W4's labeled one, a pot plant) is acted on where it stands with no
  name needed; naming a patch it is not rooted in refuses
  `not-a-part-here` (*"X does not stand at Y."*).
- **Sow, another row of the same crop:** when the standing crop's
  template differs from the seed's `growsInto`, the controller clones
  the seed's plant and asks `standing.isSameKindAs(made)` before refusing
  `other-crop-stands` — so re-sowing the bench's top end widens
  `standing-wheat-top-end` rather than telling the player to grub out
  their own wheat.
- **Water on bare ground** (no plant) credits horticulture at `easy`;
  watering a crop keeps `careDifficulty()`.
- **`not-rooted`** — a named non-area plant with no ground under it is
  refused (it used to be the `groundUnder` → headroom 0 → *already wet*
  path, which was false).
- Units in prose are American (*square meters*), per CLAUDE.md.

**Live (fresh world, port 2014, `reset:db`, bench in spring then summer,
founder):** `harvest wheat` → *"Which part? Name one: the top end, the
middle or the lane end."*; `harvest wheat at the top end` (spring) →
*"a stand of wheat isn't ready — it is still established."* — the TOP
END's stand, though `wheat` binds the first; summer: `harvest wheat at
the lane end` → *"You bend to a stand of wheat and pull it by hand."* …
*"You cut a swath of a stand of wheat at the lane end and bind it — not
yet enough to make up a load. Nearly all of it is still standing."*;
`harvest wheat at the middle` → still established (the middle is behind
the lane end, as its read says). A can from the rubber-works stove house,
`fill can from standpipe` in the market square, then on the bench:
`water wheat` → the same three names; `water wheat at the top end` →
*"You tip 2 L of clear water into the soil around a stand of wheat at the
top end. It drinks it in. On 1,000 square meters it barely shows."*. The
founder's `eval` of a patch's reserve is still refused by the sandbox
boundary (W2's note), so the moved reserve is proven by the unit test,
not live. The home-field sow leg (plough + hired labourer) was not
staged — the kernel sow path is the same, and W6's drive covers it.

Verified: tsc (server, trade-farming) clean; `pnpm test:near` — server
293 files, 2,718 passed + 2 skipped, packs (eternal-university, ground,
terminus, trade-farming, trade-mining, trade-ranching, trade-sugar)
green; touched packs' vitest — trade-farming 122/122, trade-sugar 40/40,
trade-forestry 139/139, hinkley-hills 19/19, eternal-university 47/47;
`lint:family` — all 82 gates pass.

Notes for later waves:

- **W4:** `sample`/`label` gain the same `patch` arg shape (copy the
  harvest-view test's block). A labeled individual is NOT an area crop,
  so `water trial` binds it with no `at` (the individual path above).
- **W5:** the farms brain still sends `water <kw>` / `feed <kw> with
  sack`; on the campus home field (three patches) those are now refused
  `patch-unnamed` — W5's `water ${kw} at ${part}` is required, not
  optional.
- **W6:** the cover drive's step 4/7/9 forms (`sow wheat at the gate
  end` until `patch-sown`, then `at the middle`) match the reasons
  shipped here. `fill watering can from …` fails as an unknown shape
  (a two-word non-greedy target); `fill can from standpipe` works.

### W4 — the specimen and the labeled plant

Landed as planned: `sample <crop> at <patch>` (the area-crop case before
the `Sampled` check, the ground resolves the part, `takeSpecimen(
stand.specimenVariation())`, moved to the sampler, stamped with the
FIELD's identity, the host captured; narration *"You pull a stem of wheat
from the top end and look at the roots."*); `label <crop> [text] at
<patch>` (an individual minted uncut at the part, `groundPart` set, moved
into the field, label = text else the labeler's `getPresentation()`,
keywords = the label's words + the label + `labeled`, short description
`stem of wheat labeled "trial"`, `installRootZone()`, plant and field
captured; reply *"You tie your label to a stem of wheat at the top end:
trial."*); both views carry W3's `patch` arg (optional, greedy, `[at]`,
`SoilMixin`; the label's greedy `text` is bounded by it) and a field
paragraph in their help; the root zone on `Plant` (D6). `ROOTS_PHRASE`,
the provenance line, `specimenNoun` and the non-growing specimen were
already W0's. `sampleFace` untouched.

The root zone, as built: `_rootZoneStamp` (persistent, runtimeState),
`hasRootZone()`, `installRootZone()` (moisture `rootDemand[stage] × 0.35`
L, nitrogen 100 %, both seeded at the bed's fractions; no nitrogen
reserve when the bed has none), `reconcileRootZone()` (own guard; day
steps capped at 180; per step the drink `litresPerGameDay × days ×
transpirationWarmthAt(mid-step)` then `level += (ground − level)(1 −
e^(−days/2))`, nitrogen the same with 10 days; the ground's MEAN moisture
over the window is the target; **the plant never moves the ground's
reserve**), the zone re-sized at the same fraction on a stage change, and
the seams (`soilMoisture`, `meanSoilMoisture`, `nutrientLevel`,
`waterTheSoil`) plus `feedPlant`/`waterHeadroomL`/`nutrientHeadroom` reading
the zone when present. Kernel addition on `GrowingMixin`:
`protected transpirationWarmthAt(atS)` (the soil's warmth shape off the
stepped ambient), and `growthNowSeconds` is `protected` now.

Tests: new `inventory/__tests__/FieldSpecimen.test.ts` (11 — a stem comes
off the stand, stamped with the field, stand keeps its area, `shallow`
roots off the top end; same spot twice → equal vigor and equal record;
unnamed part refused; a stem in hand does not grow and reads its roots
and *"Taken from … top end of … upper bench"*; with a stem already in
hand, `at <patch>` still pulls from/labels the stand there; the labeled
individual stands in the field, not an area crop, keyworded, root zone,
reads in full; no text → your name; any other target is the shipped
label with `at …` folded back; `water trial` moves only its zone, no
*barely shows*; daily watering for a week holds it 0.2 above its patch
and a skipped week lets it fall back to within 0.02; `feed trial` feeds
the zone alone, 4 L from the sack); `Plant.test.ts` +5 (no zone =
byte-identical; zone sizing/seeding; water fills the zone alone and never
past capacity, a minute later still full; e-folding toward the ground in
2 days / nitrogen in 10; daily watering vs a three-day gap);
`harvest-view.test.ts` +4 (the `patch` arg on `sample` and `label`, both
views load).

Decisions the plan did not make:

- ⭐ **A named part beats a carried plant (found live).** `reachable`
  binds what you carry first, so after one `sample`, `sample wheat at the
  lane end` bound the stem in hand and stamped it in place, and `label
  wheat … at …` labeled it. Both controllers now take, when a part is
  named and the bound plant is not an area crop, the crop of the same
  kind (`isSameKindAs`) rooted in that part of the ground the giver
  stands on (`Soil.rootedAreaCrop(part)`). Lens 3a: the player named the
  ground.
- **Only a STAND answers to its patch's words** (`Plant.getKeywords`
  now requires `isAreaCrop()`): a labeled individual at the top end
  would otherwise have made `look top end wheat` ask which of two.
- **`label` on any other target folds `at …` back into the text** — the
  view's new `patch` arg bounds the greedy `text`, so `label vial meet at
  noon` would have lost *at noon*.
- **`feed`** reaches the zone only for compost (`feedPlant`); a slow
  amendment (organic matter) still goes into the ground — the zone has no
  organic-matter reserve, and the long game is the ground's.
- **`water`** suppresses *"barely shows"* for a zone plant (the water
  went round its roots, not over 1,000 m²) and captures the plant as
  well as the ground.
- **A full zone is full within 0.01** (`ROOT_ZONE_FULL_WITHIN`): a zone
  holds about a litre and drinks every second, so a second can moments
  after the first found a sliver and replied *"You tip 0 L … It drinks
  it in."* (found live). Now *"already wet through"*.
- **The labeled individual develops on the POT rule** (`reconcileGrowth`'s
  `areaCrop` flag is false for it): it advances a stage only while its
  limiting factor is good, where its stand advances on the season under
  stress. Not changed here — see hand-offs.

**Live (port 2014, `reset:db`, 11:00, founder):** `sample wheat` →
*"Which part? Name one: the top end, the middle or the lane end."*;
`sample wheat at the top end` → *"You pull a stem of wheat from the top
end and look at the roots."*; `look stem` → *"a stem of wheat — Wheat
standing stiff in the ear, … It is in ear and looks poor. Its roots are
short and spread flat — they met something hard not far down. Taken from
the top end of the upper bench."*; a second top-end pull and a lane-end
pull each came off the stand (after the fix above). `label wheat at the
lane end` → *"You tie your label to a stem of wheat at the lane end:
founder."*; `label wheat trial at the top end` → *"… at the top end:
trial."*; `look here` lists *"You also see: founder and trial."* (D17);
`look trial` → *"trial — Wheat standing stiff in the ear, … It is well
established. It looks stressed. It is too cold here for it to be doing
anything."* (the full read); `look at the top end` ends *"Trial stands
here, labeled."*; `water trial` → *"You tip 0.2 L of clear water into the
soil around trial. It drinks it in."* After a restart with no reset, both
labeled plants were still listed; `water trial` → 0.1 L, then *"The soil
around trial is already wet through."* The zone's reserve vs the patch's
is proven by the unit tests (founder `eval` of a patch is still refused,
W2's note).

Verified: tsc (server) clean; `pnpm test:near` (server 295 files, 2,751
passed + 2 skipped; packs green); trade-farming 122/122 (the platform
pack has no suite); `lint:family` — all 82 gates pass.

Notes for later waves:

- **W5:** nothing new for the brain; a labeled plant is not an area crop,
  so `cropsOn` (the patch's thirst and the hand's read) ignores it.
- **W6 (the drive):** `look` with no argument PROMPTS when the focus is
  one of several carried stems (*"a stem of wheat (1)/(2)/(3)"*) — use
  `look here`, or drop the stems. A no-text `label` names the plant after
  the labeler, so the room then lists *"founder"* beside the founder —
  the drive should label with text. The live presentation of a labeled
  plant is its LABEL (`RecognitionLogic`: a label wins), so its listed
  name is *trial*, not the authored short description.
- **For the owner (not this build's to decide alone):** should a labeled
  field individual develop on the FIELD rule (season-driven, spoiled by
  stress) rather than the pot rule? Today a stressed labeled stem stalls
  while its stand ripens around it. The flag is `areaCrop` in
  `reconcileGrowth`; a fix is a one-line predicate (*rooted in
  non-`Cultivable` ground*) but it changes every individual plant
  standing in a field.

### W5 — the hand reads with their own eyes

Landed as planned: `farms.ts` gates on shift (the `cuts` rule — an
employed host with an active employment acts only `on-shift`); beds keep
their shipped reads; when `home` is non-`Cultivable` `Soil` its
`soilParts()` (or the whole ground) are read through
`home.rootedAreaCrop(part)` at the hand's own band —
`crop.readFor(await hand.competenceBandFor(crop.getDiscipline()),
crop.readSeedFor(hand))`, `untrained` for a host that is not Advancing —
and the beat gives **one** watering and **one** feeding, each to the
lowest read below `waterAt`/`feedAt` (`water ${kw} at ${part}`,
`feed ${kw} at ${part} with sack`, the part named by its definite phrase
— *the gate end*, the form the ground's own refusal lists). The can is
filled at `config.water: { room, from }` (teleport there, `fill can from
${from}`, home re-taken in `finally`); with none, `fill can from
standpipe` at home as before. `pick` stays bed-only. `shelf: ''` skips
the market leg. Content, all YAML: `campus-farm/agent/farm-hand.yaml`
(Maud Hollis, Cast, `horticulture: novice` asserted, a watering can and
a compost sack, the brain with `water: { room: …/yard, from: trough }`,
`shelf: ''`, `drawEvery: 0`), `farm-unit.yaml` `hand` seat (headcount 1)
+ its `rosterSlots` entry (days 0–6, hours 6–18), the yard trough as a
`/platform/thing/WaterFixture` (prose and keywords kept;
`interiorBulk`/`interiorMaterial` added), the home field's `cast:`.

Tests: `farms.test.ts` +4 in a new field block (an expert fills at the
yard trough and waters the thirsty patch by name and is home after;
wet patches → nothing filled or watered; over 40 hands each, an expert
never misranks two patches 0.02 apart and a novice waters where ITS
seeded read points — asserted against `readFor('novice', seed)`, not the
truth — and misranks at least once; off shift a hired hand does
nothing). `farms.bounded.test.ts` literals moved (`fill can from
${from}`, the `at ${part}` forms) +2 (the banded seeded read and the
one-per-beat `lowest`; the shift gate). `Growing.test.ts` +1 (the fix
below).

⭐ **Decided (owner-delegated, lens 1 — pedagogy: a labeled stem is a
sample of its stand, so what it shows must be what the stand does):** a
plant minted UNCUT from a stand grows on the FIELD rule.
`GrowingMixin._fromStand` (persistent) is set by `takeSpecimen(…,
{ cut: false })` when the source is an area crop — the `label` path and
nothing else — and `reconcileGrowth`'s `areaCrop` flag is now
`isAreaCrop() || _fromStand`: it develops on its season, is spoiled by
stress rather than stopped by it, and holds when ripe (cover B36). ⛔ NOT
the W4 note's *"rooted in non-`Cultivable` ground"* predicate — that
would have moved every individual plant standing in a field (forestry's
planted trees among them). A cut specimen never grows, so its flag is
false. Unit test: under light at 0.4 of happy (below the 0.6 good mark,
well above death) for 400 days the stand and its labeled stem are both
`mature` and the stem is not dead; a pot plant under the same stress is
still a `seedling` (and with the flag disabled the test fails —
*"Received: seedling"*).

Decisions the plan did not make:

- **One watering a beat across beds AND parts** — a can is one can, so
  a pot farm with five dry beds now waters the driest one a beat (no row
  names the brain on beds today).
- **`drawEvery: 0` disables the draw** — `positiveInt` turned 0 into
  the default 12, so the header's *"0 disables"* was false.
- ⭐ **The hand's seat names a `station`: the home field** (found live).
  The roster tick moves an on-shift assignee to the house's FIRST
  operating location — the yard — and fetches an absent hand only to a
  station that is live; with nobody in the yard after a restart, the
  hand was never loaded and never beat. `station:
  …/campus-field/location/home-field` puts her where somebody can see
  her work.

**Live (port 2014, `reset:db`, then restarts without reset):** day 80 a
labourer clocked on, moved the herd, ploughed (*"Ploughed for the
season."*); the founder cloned a seed sack and sowed the gate end and the
far side. Day 95, 09:00: *"You also see: a human and the weathered farm
hand and a hay trough and a wooden plough."*; the hand's beats (a
temporary debug line, removed) read `gate end 0.671 · far side 0.733`
against `waterAt 0.5` — nothing watered, correctly (spring rain). Day
150 still wet (`0.945 · 0.936`), so for the stage only the hand's row
took `waterAt: 0.97` (reverted): on her next beat she was at
`/world/terminus/eternal/campus-farm/location/yard`, her can read **2 L**
after `fill can from trough`, she sent **`water wheat at the far side`**
— the lower of her two reads (`0.9378 · 0.9305`) — and the can read
**0 L**; no `[dispatch]` decline for her anywhere in the log. ⚠ After a
restart the FIRST 75 s watch saw no beat (the hand is fetched on the
roster tick's next pass); the second did. The founder's own `look at the
far side` still reads *"in ear and looks strong"* — 2 L on 3,000 m² does
not show, which is the honest answer.

Verified: tsc (server, trade-farming) clean; `pnpm test:near` — server
295 files, 2,752 passed + 2 skipped, packs (eternal-university, ground,
terminus, trade-farming, trade-mining, trade-ranching, trade-sugar)
green; trade-farming 128/128 (14 files); eternal-university 47/47 (8
files); `lint:family` — all 82 gates pass.

Notes for W6:

- **The drive's hand leg:** the soil must be below `waterAt` (0.5) for
  the hand to act, and the campus field sits wet through spring and
  early summer — stage a dry spell the drive can stand on (a longer
  advance into high summer, or a founder lever on the reserve once the
  sandbox lets `eval` reach a patch — W2's note) rather than raising
  `waterAt` in content. ⚠ The hand only beats once she is LOADED: be in
  the home field, on her hours (06–18), and allow a roster pass after
  any restart.
- `[dispatch]` lines in the server log are DECLINES only — a hand that
  waters successfully leaves no line. Read the effect (the can, the
  patch's reserve, or a watcher's prose), not the log.
- `look hand` binds her (the handle); `look maud` does not until she is
  known (recognition).

### W6 — the drive, the cover drive, the docs

Landed: the new drive `packages/wire/tests/field-population.dirty.wire.test.ts`
(the requirements' 13 steps as 15 checkpoints, ordered by the calendar —
spring sow + label (6a, 6) at day 80, the bench (1–5) at day 95, the dry
week (7), the pail (8), compost (9), the hand (11), the harvest (10),
then the cane piece (12) and the pot (13)); the cover drive's steps 1, 4,
6, 7, 9 for the divided bench and home field (D16); the docs —
`soil.md` § *A soil made of parts — the patch*, `husbandry.md` § *A
plant's part*, the half-width table's new home in `instrumentation.md`,
the slate's status line (PARTIAL, with what is left).

Fixed here (each with a unit test that fails without it):

- ⭐ **A fixture's jurisdiction is its host's** — `AdornmentMixin.
  jurisdictionHost()` returns `adornedTo` (else the default). The W2/W5
  *"receiver scope field(none)"* refusal was not a zone or circle stamp
  at all: both scopes were `null`, and the deny came from the governed
  bound — a patch is pathed by its kind row (`/trade/farming/thing/patch`)
  and held in `getFixtures()`, so the jurisdiction walk had nothing to
  walk. The exit's case exactly; every FLOOR had the same defect. Founder
  `eval --parcel /world/terminus/eternal/campus-field` now reads and sets
  a patch's reserves. `sandbox.jurisdiction.test.ts` +2.
- **A bystander sees which part was watered** — `water`'s peer line
  names the part (*"Maud Hollis waters a stand of wheat at the gate
  end."*), the way `feed`'s already did. This is how the drive (and a
  player) sees the hand's choice: 2 L on 3,000 m² moves no reading.
  `WaterVerb.test.ts` +1.
- **Never "0 kg" / "0 L"** — a pinch into a nearly full patch replied
  *"You work 0 kg of compost"* (staged); now *"less than 0.1 kg"*.
  `FeedVerb.test.ts` +1.
- **"Owned by something"** on the bench's stand — the Delight's farm
  `Business` row had no `name`. Named *"Quist's farm"*; the stand now
  reads *"── Owned by Quist's farm."* (staged). ⚠ Sixteen more `Business`
  rows have no name (the bakery, the Rejection businesses, the dairy, the
  mill, the creamery, the depot, the ice company, the TPA …) — anything
  titled to one reads *"Owned by something"*. Not this build's to sweep.

Staged (port 2014, `reset:db`, the drive's own `it`s run stage by stage
through a staging config, plus throwaway probes; never end to end):

- Stage A (6a, 6) passed against a fresh world after two drive fixes: the
  store keeps FOUR sacks of seed wheat (par 4), and they are bought after
  the spring jump; a carried sack of seed wheat answers to `wheat` first,
  so all seed is sown before the label (the far side, then the rest into
  the middle). Sowing the gate end took ten casts and three rests.
- Stage B (1–5) passed after fixes: an ambient line (*"You're
  shivering."*) can lead a read, so the same-spot comparison compares the
  plant's own words; `water` is afforded by the CAN (husbandry § water is
  tool-afforded), so step 5 fetches it first. Day 95: top end *in ear and
  is failing*, middle and lane end *looks poor*; the novice's top-end
  read is a prefix of the expert's (*"It is too cold there … Behind that,
  the nitrogen is low."*); top-end stem *failing*, lane-end stem *ripe
  and looks well*.
- Step 11 (the hand) worked live: dried below her `waterAt`, she watered
  *at the gate end* within seconds — seen by the founder's eval session,
  not the drive's `listen`, so the step now counts what ANY session
  standing there heard.
- The grade read (`getGradeBand` on the dropped sack, by id) and the cane
  piece (no patch named, `harvest cane` engages) were probed.
- ⚠ Step 7 (the dry week) and steps 8/9 were NOT staged end to end: the
  world's only drive-reachable can and the byre's three pails were spent
  by earlier staging runs. Their parts were probed (the drain, `fill pail
  from trough`, the one-word `feed … with compost`).

Decisions the plan did not make:

- **Step 2 uses `look top end wheat` from a FRESH session, not the quoted
  form.** From a room focus, `look "wheat at the top end"` binds the ROOM
  (staged) — the `$focus`-partial defect W2 recorded, in another shape.
  Every single-thing read in the drive opens a fresh session.
- **Step 2's expert is trained by `practice horticulture hard success`**
  (the shipped wizard harness; eight → *expert*), not an eval'd claim.
- **Step 10's neglect is ONE dry spell after a reset**, not a drain every
  ten days: staged, a far side dried every step was still *in ear* at day
  228 when the gate end was ripe (stress slows a field crop), and would
  have met the frost unripe. The reset reconciles each stand first — an
  un-reconciled reset let the window before it (the dry week) zero the
  gate end's `_worstLimiting` (staged: gate end 0, middle 0.71).
- **Step 9 stages a hungry far side** (nitrogen to 0.3) first: Maud feeds
  the hungriest patch every beat, and staged she had filled the far side.
- **Step 13 is a named, LIVE gap**: a drive handle cannot reach a starter
  pot (the dorm room's `props:` are not stood up by a `startLocation` —
  the avatar-family drive's finding), and making a pot plant from shop
  goods hit two defects outside this build (below). The step asserts the
  pot read and the water the moment the pot is there; today it records
  the gap and returns. AC 10's pot half is the unit suite's.
- The founder's staging parcel is `/world/terminus/eternal/campus-field`;
  the founder holds no authority over `/world/terminus/eternal`.

Findings for other owners (not fixed here):

- **`look at the middle` PROMPTS** between the patch and the middle's
  stand — a one-word name after the article, so W2's two-word name rule
  does not apply. The drive never looks at the middle alone.
- **A two-word object after a greedy arg falls through every shape**
  (`feed … at the far side with compost sack`, `pour soil into clay pot`);
  `plant` was an unknown verb with a carried pot outside the store; a
  founder in the store poured the store's own soil into the store's own
  pot, unbought (shopkeeping).
- **The labeled stem's description says *"standing stiff in the ear"*
  while its read says *"still a seedling"*** — the wheat row's prose is
  the bench's ripe stand's.
- **A crop harvested late in the season grades by its WORST step, and
  the whole season counts** — the home field's gate end reads *ripe and
  looks poor* at day 228 (*"only a little short of light"*). The grade
  comparison holds only because the drive resets the window.

What the final drive should watch for:

- Steps 7 and 8 have never run in one piece. If 7 fails, read the
  `dry week:` note — the comparison is condition rank ×2 plus one for
  *not short of water*; a trial limited by water too ties its patch.
- Step 10 cuts the far side after the gate end and may need several
  ten-day jumps for it to ripen; the `the season's worst` note shows the
  three stands' `_worstLimiting` before the cut.
- Step 11 needs Maud LOADED and on shift (hours 06–18): it jumps to 09:00
  next day and gives her up to six minutes of real time.
- The cover drive's changed steps (1, 4, 6, 7, 9) were checked against
  the staged bench and home field reads only, not run.

Verified: tsc (server, trade-farming, wire) clean; `sandbox.jurisdiction`
16/16, `WaterVerb` 20/20, `FeedVerb` 21/21; `pnpm test:near` — server
320 files, 3,002 passed + 2 skipped, and seven pack runs green;
`lint:family` — all 82 gates pass (`lint:drive-scripts` among them). The
stage server on 2014 was stopped by PID.

- **Final pass 1 (field-population drive) — 9 of 14, and two kernel
  defects it found, each reproduced and verified in isolation:**
  - **B38 — a field under open sky is lit by the day, not the instant.**
    A crop's light window is sampled at one moment; a world boots at
    midnight, so the bench's stands, first read at day 95, had integrated
    95 days of DARKNESS and every one was dead (eval: vigor 0.00 across
    all three, with the middle's and lane end's soil fine). For a sky-lit
    field crop a night reading never replaces the last daytime one, and a
    never-daylit crop reads light as unknown (not limiting). Re-staged:
    top end failing (water: 14 cm of topsoil bone dry), middle stressed,
    lane end mature. AreaCrop test fails without it.
  - **B39 — cold sets a field crop's pace, not its grade.** Winter
    dormancy was the "worst stretch" of every overwintered stand, so
    every one graded poor however well kept (the drive's step 10 saw
    worst = 0 on all three home-field patches). A field crop's grade now
    takes water, light, root and nitrogen; a pot keeps warmth in. AreaCrop
    test fails without it.
  - Steps 1, 2 and 4 failed on B38 (no line for a dead top end), step 10
    on B39 plus a drought-killed gate end, step 7 on a prompt cascading
    from step 4 (stems left in hand; step 7 now empties its hands first).
- **Final pass 2 — 11 of 14.** B38 holds (steps 1, 3, 4 pass; the top
  end reads poorest). It found two more product defects, each pinned by a
  test that fails without its fix:
  - **B40 — `harvest wheat at the gate end` cuts the STAND there**, not
    the labeled plant standing in it (the word names both, and the binder
    handed over the labeled one, so "trial" was cut instead of the crop). A
    labeled plant is cut when named by its label — the rule `sample` and
    `label` keep.
  - **B41 — care can only help.** A labeled seedling's zone holds 0.07 L
    against a 0.16 L day, so it ran dry between cans and the plant being
    tended read WORSE than its untended neighbours ("stressed, the soil is
    dry" before any drought was staged). Its water and nitrogen are the
    better of its zone and its patch now: its roots still draw on the
    ground around them.
  - Drive defects: step 2 compared the reader's body line ("You're
    shivering.") as if it were the read; step 10's reset eval had `;` in it
    (the command line splits on it — the reset never ran) and its neglected
    patch was dried to the wilting point, which in a near-rainless realm
    kills it before it ripens (dried to stressed now).
- **⚠ Merging behind ceramics (!437, build-3), probed 2026-10-30 in a
  scratch worktree: 22 shared files, 3 conflicts.**
  - `check-mass.ts`: both lowered the same ratchet; take the lower ceiling
    and let `lint:mass` confirm it.
  - `Tooled.ts`: both added a field (`swathM2` here, `discipline` there);
    keep both.
  - ⭐ `mql/scope-walk.ts` is SEMANTIC. Ceramics scores an exact KEYWORD at
    70 (above a name that merely holds the word: `look clay` is the lump,
    not the pit); this branch lets a NAME beat a keyword-only reach
    (`look at the middle` is the patch, not the stand). Merged naively,
    `look at the middle` prompts again, and `look at the top end` binds the
    STAND, since ceramics' exact-name 100 is one-word only and the stand's
    keyword "top end" scores 70. Resolve as ONE ordered cascade: exact name
    including a multi-word phrase (100) → exact keyword (70) → name word
    matches (40–60) → keyword partials (≤25), each tier cutting the ones
    below it when present. Run both branches' scorer tests after.
- **Merged** (4df10ab3d) as probed: the cascade landed in `scoreCandidates`,
  scorer tests 61/61; `lint:mass` ceiling 234 → 231 (f6e0e02bb).
  `lint:family` 84/84, `test:near` green.
- **Full suite on the merged tree — 51 of 52 packages green, 48 min.** The
  one failure: the composition-panel field snapshot lacked this build's
  five new fields (`groundPart`, `specimenNoun`, `_specimen`, `_fromStand`,
  `_rootZoneStamp`, all reveal 0). Updated (fc3a655e2). Server 14,496
  passed.
- **Step 7 staged in isolation** (the labeled plant read "stressed, still
  a seedling" beside a stand "well, in ear" in pass 3). On the probe world
  a stand reset to a fresh seedling and labeled at 2 a.m. tracks its stand
  to three decimals through six days of 6 h jumps (stage, vigor, maturity,
  cause, condition band). Pass 3 predates B41, which is the likeliest cause.
  The staging did turn up one real race: **B43 — a plant moved while its
  warmth walk is in flight re-asks** (`restampWarmth` coalesced onto the
  walk begun where the plant WAS, and a labeled stem is minted and set into
  the field in one breath). Growing test fails without it (345c96d58).

## Drive record

*(appended at build time, not at plan time)*

- **Final pass 4 (after the ceramics merge) — 7 of 14.** Two regressions,
  both fixed (fd348e1c6): `look at the top end` prompted again (a
  definite-register patch presents as "the top end", the query's article
  is stripped, so the merged exact-name tier missed and the patch tied
  its stand at the exact-keyword tier; the name is now compared without
  one leading article); and Stage A ran past dark, which left the hand too
  cold and winded to lift a can in Stage B.
- **The soak split (2026-10-31, master's soak-harness build).** No merge
  waits on the clock: the drive is now a BLOCKING twin
  (`field-population.dirty.wire.test.ts` — instant, short and staged
  steps, `advance()` refuses more than a day) and a SOAK file
  (`field-population.soak.dirty.wire.test.ts` — the season as it was,
  for the soak lane after merge). Staged twins: step 7's dry week is a
  same-day dry patch; step 10's season is two stands set ripe with worst
  stretches 0.9 / 0.3, then cut by a player.
- **Blocking run 1 — 14 of 14** (12.5 min of steps, 19 with boot). Dry
  patch: trial 5 · gate end 4 · sample 4. Harvest: gate end
  *exceptional*, far side *poor*. Step 13 still meets the known gap (a
  drive handle reaches no dorm-room starter pot).

### Review round — seed (2026-10-31, the owner: "let's do 1–3")

The owner asked how much seed a field needs, whether last season leaves
any, whether players can supply it, and whether buying at scale is the
same as for a pot. Talked through first (husbandry § the area crop, and
`seed-and-propagation-slate.md`):

- **D20 — threshed grain is seed.** Wheat and barley sacks are
  `PlantableCrop` (`PlantableMixin(Crop)`, kernel `platform/thing/`) and
  name `growsIntoPath`; `sow` takes them as it takes bought seed. Cut cane
  was already this composition as the sugar pack's `CaneBundle`, which is
  retired onto the kernel class: two packs that share no ancestor compose
  it (CLAUDE.md § module categories). Lens 1 (eat it or sow it) and lens 2.
  The Delight's farm shelf, which consigns the barn's sacks, becomes the
  at-scale seed seller with no new code.
- **D21 — yield from area and condition, not seed.** `yieldRatio` is
  replaced by `yieldKgPerM2`, the attainable yield of a perfect season;
  the cut gives that × vigor (the stand's held condition) × the ratoon
  decline. The seed-to-yield ratio is now derived per field. Lens 1: the
  agricultural revolution's levers (nitrogen, rotation, manure) move it.
  No new state.
- **D22 — the seed drill.** `ToolMixin.seedFactor` (beside `swathM2`;
  "seed per acre is the tool's number"); `sow`'s optional `drill` arg
  defaults to a `drilling` tool within reach; the row sows 600 m² a pass
  at 0.5 of the broadcast rate, stamped `industrial`, standing in the
  campus home field beside the plough. Lens 5: the same verb, a better
  tool.
- **Deferred** to `seed-and-propagation-slate.md`: volunteers and shed
  grain (the owner: weeds can wait), seed set by a crop left standing,
  fiber-or-seed timing, viability, seed dressing, varieties and hybrids, a
  seed merchant.
