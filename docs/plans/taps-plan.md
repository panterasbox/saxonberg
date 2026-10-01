# Taps — implementation plan

Executes [taps-requirements.md](../requirements/taps-requirements.md)
(**kind: feature · leads from: kernel**; first consumer the sugarbush at
Rejection's Hanging Wood; the three ranching taps and the hive brought
onto the same act in the same build). The build promotes `ProducingMixin`
to the kernel, gives `TapSpec` a declared **window**, turns the take into
an **engaged act** over a `Workable`-shaped sibling protocol, adds the
three per-tap judgments the biology asks for (milk's completeness, the
hen's clutch, the fleece's break), builds the **standing-instruction
relief** as a brain on the player's own body, opens a **clock seam** on
the code-trust axis, ships the tappable tree + sugarbush + boil in
`trade-forestry` and Rejection, and closes two shipped defects (`spin
fleece`, eggs with no sink). Everything else is a row, a tag or a
deletion.

Branch `design/2026-09-30-tapping`, cut off the apiculture merge.

---

## Grounding

Verified by opening files this cycle (2026-09-30). Where this corrects a
premise in the requirements or the task brief, it says so.

### The mechanism

- `packages/content/trade-ranching/src/lib/Producing.ts` — `ProducingMixin`
  (`PRODUCING_MIXIN = 'ProducingMixin'`, `_mixinRefusal "{} does not give
  anything"`), `TapState {standing, lastTaken, driedOff}`, persistent
  `tapState` + `productionStamp`, `reconcileProduction()` (sync, stamp,
  no far-past guard), `standingIn`, `isDriedOff`, `takeFrom` (takes ALL),
  `freshen`, `productionFactor()` = `clamp01((flesh − 12) / 43)` read
  through an **untyped duck cast** (`getReserve?.('flesh')`), `taps()`
  through an untyped `getSpecies?.()`. `expire`: cliff at `sinceTaken >
  windowDays`, ceiling `perGameDay × windowDays`; `accrue`: ceiling
  `perGameDay × windowDays`; `continuous`: unbounded. Its header carries
  the affordance finding addressed to this build.
- Composers: `trade-ranching/src/agent/Livestock.ts:88`
  (`ProducingMixin(HandledMixin(HandlingMixin(ChattelMixin(BrandedMixin(Creature)))))`,
  affords `milk/shear/gather` from its own `peers`) and
  `trade-apiculture/src/thing/Hive.ts:95` (`HandledMixin(HandlingMixin(ProducingMixin(ColonyMixin(OrganismMixin(…Vessel)))))`,
  affords `rob` + `platform/cmd/ground/split.yaml` from `peers`).
- ⚠ **Correction to the brief/requirements:** `trade-apiculture` does NOT
  depend on `trade-ranching` *for the mixin alone*. Three deep imports:
  `Hive.ts` imports `ProducingMixin` AND `HandledMixin`/`HandleReport`
  (`…/src/lib/Handled`), and `RobController.ts:21` imports `TapController`
  + `round2` (`…/src/idea/cmd/ranching/TapController`). `HandledMixin`
  carries the `handle` verb (ranching's) and its body (apiculture D12).
  **The package dependency stays**; what leaves is the `Producing` import
  and the `TapController` import.
- `trade-ranching/src/idea/cmd/ranching/TapController.ts` — abstract base;
  `execute` is instant (no engagement, no vessel), `discipline()` hook
  (STOCKMANSHIP from `HandleController.ts`), `mint()` clones `yieldRow`
  and `setMass(units)`, moves to the giver if Container. Difficulty =
  `animal.getHandling() < 0.35 ? 'hard' : 'standard'`.
  `MilkController` / `ShearController` (`PRIME_DAYS = 360`, overgrown read
  off `units`) / `GatherController` ("Short days will do that" — ⚠ today
  nothing actually stops laying in short days; the window predicate makes
  that sentence true). `RobController` overrides `discipline()` →
  `APICULTURE`, `mint()` → N one-kilo comb frames carrying the forage
  `composition`, and `execute()` only to remember the hive.
- Tests: `trade-ranching/src/__tests__/taps.test.ts` (8 cases over the
  three behaviours + 4 breeding-window cases); apiculture's
  `colony.test.ts` / `forage.test.ts` touch `takeFrom`/`standingIn`.
- Rows: `trade-ranching/content/trade/ranching/thing/{milk,eggs,fleece}.yaml`
  are all `/platform/thing/Provision` ("pail of milk" mass 10 — the pail
  is minted *with* the milk; "clutch of eggs" mass 0.5). Views
  `milk/shear/gather.yaml`: target `requires: HandlingMixin`, no vessel.
  `rob.yaml`: `requires: ProducingMixin` (a pack-registered name — the
  same string survives promotion, so the view needs no edit).

### The vocabulary

- `packages/server/src/mud/platform/idea/species/Species.ts:331` `TapSpec
  {key, yieldRow, perGameDay, behaviour, windowDays}`; `production:
  TapSpec[]` at `:506`, `fieldMeta {persistent, authorable}` at `:782`,
  `getProduction/setProduction` at `:1035`; `breedsAtDaylight(fraction)`
  at `:1053` — a wrapping band `[from, to]`, the shape the photoperiod
  opener reuses.
- Six `production:` blocks: `bos/taurus.yaml:43` (milk 22 expire 0.6),
  `ovis/aries.yaml:47` (wool 0.008 continuous 0),
  `gallus/domesticus.yaml` (eggs 0.05 accrue 12; `breeding daylightFrom
  0.5`), `apis/mellifera.yaml:51` (honey 0.5 accrue 400), pig/dog `[]`.
- Eight tree `Species` rows in the commons under
  `trade-forestry/content/stuff/idea/species/plantae/tracheophyta/…`
  (oak `quercus/robur.yaml` is the exemplar: `_bodyPlanPath …/sessile`,
  `_defaultMaterialPath …/tissue/plant-tissue`). **None carries
  `production:`.** No birch, no maple, no birch/maple wood material;
  `trade-forestry/src/__tests__/wood-vocabulary.test.ts` pins the wood
  words.

### The act protocol and the engagement

- `lib/ground/Workable.ts` — `WorkPlan :81` (`durationMs, cost,
  beginSelf, beginPeers?, token`), `WorkRefusal :105` (`reason, prose`),
  `WorkPrognosis :122`, `WorkResult :125` (`self, peers?, credit?:
  {discipline, difficulty}`), `Workable {planWork(by, tool, what),
  completeWork(by, tool, token)}`, `Diggable`, `Splittable`. Declared
  shapes; nothing in the kernel composes them.
- `platform/idea/cmd/ground/WorkedActController.ts` — the only consumer
  of `WorkResult.credit`; `execute` = `subjectOf → planWork → engageAct →
  land()` with the ⚠ **module-function completion** (the controller is
  destructed in a `finally` while the engagement is pending) and the
  `giver.isDestroyed()` guard. It extends
  `platform/idea/cmd/ground/GroundWorkController.ts`, whose `engageAct()`
  (`ManualBuildStep` on `['hands']`, `canExert` refusal, `completed-sync`,
  `engagement-conflict`) and `decline()` are the generic bookkeeping;
  everything else on it (`groundOf`, `paceFor`, `credit`) is ground's.
  `platform/idea/cmd/crafting/ManualBuildController.ts:68 engageStep` is
  the second copy (crafting topic); `trade-mining`'s `MiningActController`
  the third. forestry.md names the third copy as the promotion trigger.
- `Hive.ts:526` `planWork` / `:565` `completeWork` implement `Splittable`
  with `credit: {discipline: APICULTURE, difficulty: 'standard'}`.
  `trade-forestry/src/idea/cmd/forestry/FellController.ts` does NOT use
  the protocol (extends `ManualBuildController`, `engageStep`, completions
  re-check actor/room/bole at completion).
- `lib/activity/Engaged.ts:68` slots `body|hands|attention|voice`;
  `lib/craft/ManualBuildStep.ts` (`interruptibleBy` empty, `cancelable`,
  `effortW?`); `api/scheduler.ts:75 DurativeActivity`;
  `SchedulerRegistry.ts:542` — a `cancelled|replaced|preconditions-changed`
  termination emits pro-rata exertion then `onAbort`. ⚠ **Nothing cancels
  a `hands` engagement on movement**: `LocomotionLogic.engageAround`
  touches only the engaged *mode*. `WorkedActController.land` guards only
  `isDestroyed()`; `FellController` guards co-location at completion. The
  `stop` alias of `cancel` (`Engaged.defaultAliases`) is the player's
  abort.

### The kernel home

- `lib/husbandry/` holds `Bonded · Cultivable · Feeder · Growing ·
  Handling · OfferEngagement · Plantable · Soil`. `Handling.ts:116`
  `HandlingMixin` is kernel with `_mixinName 'HandlingMixin'`, listed in
  `lib/mixin.ts:462` (`Mixins.Handling`) with a refusal at `:754`, and
  `MixinApi.isHandling` at `api/mixin.ts:1421`. ⚠ `lint:mixin-names`
  refuses a kernel mixin missing from `Mixins`.
- `Growing.ts` — `_worstLimiting` (persistent, `:500`, `min`'d per step
  at `:861`, reset to 1 when a polycarp crop sets at `:1178`),
  `getLimitingFactor()` (`:735`, sampled live, names `water|light|root|
  cold|nutrient` or `null` when ≥ `husbandryGoodAt`), `_vigor` relaxed
  toward `limiting` with `k = min(dt/τ, 1)`. The exact shape the wool
  break and milk's vigour copy.
- `packages/server/package.json` `exports`: `./mud/lib/*`,
  `./mud/api/*`, `./mud/platform/{thing,idea,agent,location}/*`;
  `./mud/platform/idea/api/*` is `null`. A pack reaches
  `@saxonberg/server/mud/lib/husbandry/Producing` the way Hive already
  reaches `…/lib/husbandry/Handling`.

### The affordance walk

- `platform/idea/api/CommandLogic.ts:3234` `peerScopesOf` — own container
  + one passable exit; `:3385` the `peers` walk goes **one level into an
  OPEN container standing in the room, both ways** (the fishing drive's
  carp-in-a-bowl fix). `MixinApi.isOpenContainer` (`api/mixin.ts:957`) =
  Container ∧ ¬Agent ∧ ¬(Sealable ∧ closed). `GardenBed`
  (`platform/thing/GardenBed.ts:50`) composes `ContainerMixin` and no
  `Sealable` → a `Panel` is an open container → **a plant standing in a
  panel slot can afford its own `peers` verb to a player in the room.**
  `trade-forestry/src/lib/Stand.ts` affords `fell` from `inventory` on
  the Wood; `Panel.ts` lists `plant/repot/harvest/feed/fell` in `peers`
  (⚠ a class static SHADOWS the composed mixin's list — copy, don't
  inherit).
- `rob.yaml` reaches a hive through `Hive.commandContributions.peers`.

### The forestry host

- `trade-forestry/src/thing/Panel.ts` —
  `PersistableMixin(SingletonMixin(PostRegistrationMixin(GardenBed)))`,
  `occupy()` records a standard's planting + chronicle deed, ready-line
  `markupAugmenters`. `platform/thing/Plant.ts:52`
  `PersistableMixin(PostRegistrationMixin(SlottableMixin(GrowingMixin(ReservedMixin(OrganismMixin(ThermalMixin(Good)))))))`
  — composes `OrganismMixin` (`getSpecies()`) and `ThermalMixin`
  (`getTemperature()` sync, `Thermal.ts:495`), no `ProducingMixin`.
- `FellController.fellPlanted :209` targets a planted `Plant` by
  `getHarvestTemplatePath() === null && getDiscipline() === 'silviculture'`;
  `fell.yaml` target `requires: any`, `scope: [reachable]`; the axe is a
  declared arg `default: "reachable:[capability.felling]"`.
- `oak-standard.yaml` (`harvestTemplatePath: null`, `discipline:
  silviculture`, `standardMaterialPath`, `seedTemplatePath`, `profile.
  daysToStage`); `hazel-stool.yaml:38` and three medicine plants author
  **`growthStage: mature`** — a row can be born mature.
- Venue: `rejection/content/world/terminus/rejection/hanging-wood/
  {ride,oak-clearing,hazel-cant,treeline}.yaml` + `thing/{panel-north,
  panel-west}.yaml`. `oak-clearing.yaml` is a `/trade/forestry/location/Wood`
  (`mix:` oak 12/14, ash 4/6; `props: panel-north`; coords 0,2,0).
  `treeline.yaml` is a `/platform/location/SingletonCartesianLocation`
  (coords 0,0,0; exits south→hillside, north→ride) and affords no `fell`.
  `panel-north.yaml`: `staticSlots plant capacity 8`, six `hazel-stool`
  props, `interiorAmount 180`, reserves moisture/nitrogen.
  `rejection/pack.yaml` already `requires` the Hanging Wood title
  (`agricultural`) and `package.json` already depends on
  `content-trade-forestry`.
- `hearts-delight/…/bench-field/location/orchard-close.yaml` — three
  cherries as `{ template, as: cherry-north }`. ⚠ **`as:` is an
  identity for the `by-entry` merge (`lib/stuff/Template.ts:75-81`), not
  a keyword** — the apiculture wire test's own header (`:134`) records
  `look cherry` prompting on three matches. Three birches that must be
  addressed by name need three **rows** with distinct keywords.
  `extends:` is live (`Template.ts:66,129`; `base-library/…/biome/*.yaml`
  use it).
- `provisioning.yaml` props `store-counter` (a
  `/trade/shopkeeping/thing/Stock`: `stockLines[{itemTemplatePath, par}]`
  + a `prices:` MAP — "a list answered *isn't for sale*", found by
  driving) + `mending-slate`; cast `storekeeper`.

### The boil and the demand

- `trade-quarrying/content/trade/quarrying/idea/maturation/brine.yaml`
  (`mechanism: evaporative, inputCategory: brine, stallBelowK 273, happyK
  283, damageAboveK 400, ratePerDay 0.25, productFraction 0.1`),
  `thing/salt-pan.yaml` (`/platform/thing/Vat`, `category: pan`,
  `interiorCapacity 40`, `closure: none`, `open: true`),
  `thing/brine-hearth.yaml` (`/platform/thing/Oven`, `burnTemperatureK
  450`, `fuelBurnRatePerMin 0.5`, `reserves.fuel`). `Oven.ts:25` =
  `ContainerMixin(PlacingMixin(Firebox))`; `Vat.ts:37` composes
  `MaturingMixin`; `Maturing.ts:924-972 reconcileEvaporativeWindow`
  (damage via `damageSat`, stall at `stallBelowK`, degenerate when
  `productFraction = 1`). `MaturationProfile.ts:41-58` mechanism enum,
  `:132` evaporative phrases, `:188 productFraction` default 1. The
  extraction wire drive fills with `fill pan from tide` and lights with
  `ignite <fuel>` (`extraction.dirty.wire.test.ts:385-460`).
- `lib/craft/Recipe.ts:38-57` — a slot's `category` is a Material tag;
  `kind: 'item'` + `count`. `trade-hospitality/content/recipes/gimlet.yaml`
  (`category: syrup`, 0.02 L) and tom-collins/whiskey-sour/daiquiri;
  `saxonberg-lounge/content/world/lounge/thing/bar-menu.yaml:18-50` lists
  all four — **the demand checkpoint's venue is the Lounge in Terminus.**
- Tags: `trade-apiculture/…/material/honey.yaml` `[honey, sweetener,
  food, edible]` (header: deliberately not `sugar`);
  `trade-cooking/…/material/sugar.yaml` `[solid, food, sugar,
  sweetener]`; `simple-syrup.yaml` `[liquid, food, syrup, simple-syrup,
  sweetener]`. `Material.hasTag()` at `Material.ts:1159`.
  `trade-baking/content/recipes/{dough,flatbread,lean-loaf}.yaml`; no
  `category: egg` slot anywhere.

### The three defects

- `spin`: `trade-textiles/content/trade/textiles/cmd/textiles/spin.yaml`
  `stock requires: StackableMixin`; `fleece.yaml` is a `Provision` (no
  `Stackable`). ⚠ **A third gate behind the binder:**
  `SpinController.ts:231 isSpinnable()` is a template-path suffix test
  (`/line` or `/tow`), so a stackable fleece still dies in the
  controller. `line.yaml`/`tow.yaml` are `/trade/textiles/thing/TextileStock`
  (`StackableMixin(CraftedMixin(Good))`, `TextileStock.ts`); their
  material `linen.yaml` and `wool.yaml` both carry the tag **`fibre`**.
  `spin` compares `stock.getQuantity() ≥ CHARGE` (a dial).
- Eggs: no consumer. `egg` material at `/stuff/idea/material/food/egg`
  (ranching's content).
- The clock: `api/worldclock.ts` publics `getNow/getScale/setScale/pause/
  resume/isPaused/snapshot/restore/shutdown(SystemRoot)/after/at/every/
  cancel*`; `_advanceForTesting` is `assertTestOnly` (`:250`).
  `platform/idea/WorldClockRegistry.ts:211 restore()` sets
  `anchorGameTimeS = snap.elapsedGameTimeS; anchorRealMs = now` — ⭐ **a
  restore of an edited snapshot IS a jump already**, with no schedule
  drain. `:420 _advanceForTesting` moves `nowMs` then loops
  `onHeartbeat()` until nothing is due. `onHeartbeat()` fires every due
  one-shot once and **every missed interval of an `every` schedule in a
  do/while** (`:748 nextFireAtS += intervalS`), so a jump that drains
  catches `weather:boundary` and the storm tick up faithfully (both
  presence-gated fan-outs). `EvalScript.ts:45-49 SANDBOX_NAMES`
  (`StuffApi, MqlApi, ContainmentApi, MixinApi, console`) + `self/target`;
  `buildSandbox` strips anything not on the list.

### Photoperiod, warmth, forage — what a sync reconcile can read

- `CelestialApi.daylightFractionAt(location, t)` is async only because
  `profileFor` awaits a zone field that is **guarded to `EARTH_LIKE`**
  (`CelestialLogic.ts:106-130`, envelope D1). The sync twin
  `CelestialApi.daylightSecondsFor(EARTH_LIKE, CelestialApi.CAMPUS_LATITUDE, t)`
  (`celestial.ts:318`, `CAMPUS_LATITUDE = 42` at `CelestialLogic.ts:60`,
  `EARTH_LIKE` at `lib/time/CelestialProfile.ts:48`) is what a reconcile
  may call; `Field.ts` and `BreedController.ts` are the shipped readers.
- Warmth: a `Plant` composes `ThermalMixin`, whose `getTemperature()` is
  the sync reconcile-on-read; `WeatherApi.sampleFor` is async
  (`AddressApi.resolveLocalityFor`). The tree reads **its own**
  temperature.
- Forage: `Hive.forageCensus()` is sync and already what `rob`'s empty
  phrase means by "out of the flow".

### The relief's substrate

- `lib/behavior/brain.ts` — `BehaviorSpec {brain, trigger, config}`,
  `BrainContext`, `BrainStatics {label, claims?, requiresFree?,
  presenceGated?, ambient?, act}`; `lib/behavior/Behaved.ts` —
  `BehavedMixin` (fieldMeta `behaviors`, `dispositions` persistent +
  authorable; `canEvict` **vetoes while `behaviors` is non-empty**;
  `fireBeat(brainPath)` is the author's/drive's seam; cadence =
  `ScheduleApi` real-time timers, presence-gated by default).
  `trade-farming/src/behavior/farms.ts` is the producer-brain exemplar:
  `forceCommand` of literal verbs, bounded loops, `presenceGated = false`,
  `ambient = false`. `CommandGiver.forceCommand` at `CommandGiver.ts:315`.
- ⚠ **`Avatar` does not compose `BehavedMixin`** — and ⚠⚠ **on
  build-3's `reqs/avatar-family` this file no longer exists at all; see
  D11a.** `Avatar.ts:163-206`
  chain: `Persistable(Estate(Forkable(PostRegistration(HasInteractive(
  Aether(Calendar(NotifyPolicy(Contacts(Wardrobe(PartyMember(
  SubjectSubscriber(Named(ShelledCharacter)))))))))))))`. `BehavedMixin`
  composes on `lib/npc/NPC.ts:38` (`Behaved(PostRegistration(Character))`,
  "outermost so `postRegister` wires"), `platform/agent/Beast.ts:39`,
  `lib/creature/KeptAnimal.ts:124`. Avatar is persisted through the
  spine (per-mixin capture), so a `behaviors` field composed inside
  `PersistableMixin` rides the snapshot.
- `lib/character/Character.ts:165 static markupAugmenters = [bodyAugmenter]`
  — the look-line precedent; `Livestock` has none (its `stockmanRead()`
  is read by `draft`/`return` only).

### Lint roster (derived; `pnpm -C packages/server lint:family --list`)

The gates whose rationale this build touches: `lint:mixin-names`,
`lint:arg-kinds` (every object slot declares a mixin that resolves in the
live registry), `lint:instrument-args` (instruments/vessels are declared
args with MQL defaults, never hunted), `lint:capabilities` (a capability
exists iff consumed — `boring` is consumed by `tap.yaml`),
`lint:verb-collisions` (`tap` is unclaimed as a verb), `lint:perishable`
(a spoiling material only on a Freshness host), `lint:mass`,
`lint:census`/`lint:world-scan` (rows reachable from a world),
`lint:instanceable`, `lint:module-scope`, `lint:imports`,
`lint:object-verbs`, `lint:lib-statics`, `lint:unconsumed-seams` (every
new `TapSpec` field must have a reader), `lint:drive-scripts` (the drive
is a wire file), `lint:kept-animals`, `lint:no-authored-faucet`.

---

## Plan-level decisions

**D1 · `ProducingMixin` goes to `lib/husbandry/Producing.ts`.** Beside
`Handling`, the gate it pairs with, under the folder that already owns
the animal/plant growth substrate. `Mixins.Producing = 'ProducingMixin'`
+ the refusal `"{} does not give anything"` move into `lib/mixin.ts`;
`MixinApi.isProducing(obj): obj is Stuff & Producing` added. The two
untyped duck casts become `MixinApi.isOrganism` / `MixinApi.isReserved`
narrowings. `Livestock.ts`, `Hive.ts` import by specifier; `rob.yaml`'s
`requires: ProducingMixin` is unchanged (same string). `trade-apiculture`
**keeps** its `content-trade-ranching` dependency for `HandledMixin`
(Grounding). `taps.test.ts`'s eight tap cases move to
`lib/husbandry/__tests__/Producing.test.ts`; the four breeding cases
stay in ranching. (Trigger: CLAUDE.md "substrate goes to the kernel when
its composers have no common pack ancestor" — three packs now.)

**D2 · `Tappable` is a sibling of `Workable`, sharing its result types,
and `ProducingMixin` implements it by default.**
`lib/husbandry/Tappable.ts` declares

```ts
export interface Tappable {
  readonly tappable: true;
  planTap(by: Stuff, key: string, tool: (Stuff & Tooled) | null,
          vessel: (Stuff & Bulkable) | null, what: string | null): Promise<WorkPrognosis>;
  completeTap(by: Stuff, key: string, tool: (Stuff & Tooled) | null,
              vessel: (Stuff & Bulkable) | null, token: unknown): Promise<WorkResult>;
}
```

reusing `WorkPlan · WorkRefusal · WorkPrognosis · WorkResult` from
`lib/ground/Workable.ts` unchanged. Not `extends Workable`: `planWork`'s
`(by, tool, what)` has no vessel slot and claiming a lactating animal is
worked ground is the host-placement lie the requirements name. The
default `planTap`/`completeTap` live ON the mixin (window → vessel →
standing → plan; take → pour/mint → words → `credit`), so Livestock,
Hive and the sap tree get the whole act for free and override only what
is theirs: Hive's one-box-worth `takeFrom` (already shipped) and comb
composition, the tree's spile phase. ⭐ The **credit** moves onto the host
(`WorkResult.credit`), retiring `TapController.discipline()`: Livestock
answers `stockmanship` with difficulty from handling, Hive `apiculture`,
the tree `silviculture`.

**D3 · The take runs through the engagement framework via a kernel
abstract `TapActController`, and the shared engagement bookkeeping is
promoted once.** New `lib/command/EngagedActController.ts` (abstract,
only inherited → `lib/`) holds `engageAct(context, opts)` and
`decline(context, prose, reason)` verbatim from `GroundWorkController`,
parameterised by topic (`act.deed`). `GroundWorkController extends
EngagedActController` (its body shrinks; `WorkedActController` is
untouched). New `platform/idea/cmd/inventory/TapActController.ts`
(abstract; beside `HarvestController` — taking a renewable yield off a
living thing is the harvest family) extends it: `tapKey()` abstract,
`subjectOf(model)` default = `model.target?.stuff` narrowed by
`MixinApi.isProducing`, bound `tool` and `vessel` read off the model,
`execute = plan → engage(hands) → land()` with the module-function
completion. `land()` re-checks that giver and subject still share a
room (the `FellController` rule) and otherwise says *nothing came of it*
with no state change. Ranching's `Milk/Shear/Gather` and apiculture's
`Rob` extend the kernel base; `trade-ranching/…/TapController.ts` is
deleted; `round2` moves to the kernel base as a protected helper.
`ManualBuildController.engageStep` stays (fourth copy; Deferred seams).

**D4 · The window is declared data on `TapSpec` and evaluated by the
mixin, with one host hook for the forage kind.**

```ts
export type TapWindowSpec =
  | { kind: 'always' }
  | { kind: 'event' }                                   // opened by freshen(), closed by dry-off
  | { kind: 'photoperiod'; daylightFrom: number; daylightTo: number }
  | { kind: 'biome' }                                   // the host answers (a hive's forage)
  | { kind: 'weather'; daylightFrom: number; daylightTo: number;
      rising?: boolean; minK: number; maxK: number };
```

`TapSpec.window?: TapWindowSpec` — **absent means `always`**, a legal
opener. `ProducingMixin.tapWindow(key): {open: boolean; reason: TapClosedReason | null}`
with `TapClosedReason = 'before-season' | 'after-season' | 'cold' |
'warm' | 'dried-off' | 'brooding' | 'no-forage'`: `photoperiod` and
`weather` read `CelestialApi.daylightSecondsFor(EARTH_LIKE,
CAMPUS_LATITUDE, now)` (sync) and, for `rising`, its sign against one
game day earlier — spring and autumn cross the same daylength band, and
birch runs in spring; `weather` reads the host's own `getTemperature()`
when `MixinApi.isThermal(host)` (else the temperature term is
unmodelled = open, the tri-state rule); `biome` calls the hook
`biomeWindowOpen(spec): boolean` (default `true`; Hive overrides with
`forageCensus().totalM2 > 0`); `event` reads `driedOff`. The reconcile
multiplies accrual by `open ? 1 : 0` **sampled at the read** (the
`Stand` growth-factor form; honest-cheap, stated). Hosts may override
`tapWindow` wholesale (the bespoke case). Refusal prose comes from a
second hook `tapRefusal(key, reason): string` with kernel defaults that
never contain a digit; Livestock, Hive and the tree override in their
own voice.

**D5 · No new behaviour value: the window owns closure.** `expire` keeps
meaning milk's neglect cliff (`sinceTaken > windowDays → driedOff`).
For `accrue`/`continuous` taps a closed window simply stops the fill;
what is standing stays takeable; nothing is marked failed. The
`after-season` reason is the curtain ("the run is over for the year")
and renders as information, never `controller-rejected`'s failure voice
(the controller notes it with reason `season-closed` and the scene reads
as a statement). Lens 1 chose this: the enum already encodes *what
neglect costs* and the season is not neglect.

**D6 · Milk's completeness is `TapState.vigour` plus the residual
suppression, on the `expire` behaviour only.** Per reconcile step
(`expire` taps): `residual = standing / ceiling`; `vigour += ((1 −
residual) − vigour) × min(dt/τ, 1)` with `τ = windowDays` game-days;
fill rate `= perGameDay × factor × vigour × (1 − residual)`. A take on
an `expire` tap always empties the animal (`takeFrom` → 0; the vessel
decides how much you *keep* — the surplus is narrated as spilled);
`completeness = taken-into-vessel / standing-before` is what the scene
reports. `driedOff` also when `vigour < 0.15` (the slope reaching the
cliff); the shipped `sinceTaken` cliff stays. `freshen` resets vigour to
1. `look` reads the band (*in full milk · going off a little · drying
up*). Numbers are grain.

**D7 · Broodiness is `TapState.brooding` + `fullSince`, armed by a new
per-tap field `broodAfterDays`, on `accrue` only.** `fullSince` stamps
when standing first reaches the ceiling, clears below it; when `now −
fullSince > broodAfterDays` game-days, `brooding = true`, accrual stops,
`tapWindow` answers `brooding`. `takeFrom` (the clutch removed) clears
both. The hen's row authors `broodAfterDays: 4`; honey authors none and
is unaffected. The `accrue` ceiling's prose changes from *spoils in the
nest* to *she adds nothing to a full clutch*. `look`: *"She is sitting
tight on a clutch and has stopped laying."* The chicks stay deferred;
the flag is their attach point.

**D8 · The wool break is `TapState.worst` on `continuous`, reset at the
take; mass is capped by a new `capUnits`.** `worst = min(worst,
productionFactor())` each reconcile step; `takeFrom` returns `{units,
worst}` and resets `worst = 1`. `completeTap` stamps the fleece's grade
band from `worst` (`CraftedMixin.setGradeBand` — the plant-side rule
verbatim) and `--quick` (a `shear` option) takes half the time and one
band down, deterministically (uncertainty.md: no resolutional roll).
`capUnits` bounds `standing` (sheep: 4 kg); past it wool is lost, and
`look` says so. Readable during the year: `productionRead()` includes
*"a lean spell has left a weak point in the fleece"* when `worst < 0.6`.
Per-tap state, not per-host, because a species may carry two continuous
taps.

**D9 · Eggs are counted: `TapSpec.yieldShape: 'mass' | 'volume' |
'count'` (default `mass`).** `count` mints `floor(standing)` clones of
the yield row (the Rob frame precedent — N `Provision`s, each
perishable, each a recipe item), leaving the fraction standing;
`volume` pours litres into the bound vessel; `mass` sets mass on one
object. **Whether a vessel is required derives from the shape** — never
a second flag. `eggs.yaml` becomes `egg.yaml` ("an egg", mass 0.06,
keywords `[egg, eggs]`); the hen authors `perGameDay: 0.8` eggs.

**D10 · `spin fleece`: the fleece becomes `TextileStock` and
`isSpinnable` reads the material.** `fleece.yaml` stays ranching's
(producer owns the yield row; the comb precedent) with `class:
/trade/textiles/thing/TextileStock`, `quantity` set by the take; the
`spin` arg gate is then true by composition — ⛔ not widened to an
alternation. `isSpinnable()` becomes `MixinApi.isTangible(stock) &&
stock.getMaterial()?.hasTag('fibre')` (linen and wool both carry it; the
"distinction is the material" rule). Blast radius: the fleece loses
`Freshness/WaterActivity/Contaminable/Composed/Sampled` (wool does not
rot — correct; `lint:perishable` indifferent since wool's material has
no spoil energy) and keeps `Crafted` (D8 needs it); `trade-ranching`
gains a `content-trade-textiles` dependency (`package.json` +
`pack.yaml requires`) — a class dependency, exactly the Hive→ranching
shape. The take sets `quantity = max(1, round(kg))`; W3 reads
`SpinController.CHARGE` and confirms a 3-kg fleece spins.

**D11 · The relief is a kernel brain on the player's own body, set by
one verb, preserving and never earning.**
- `BehavedMixin` composes on **`Avatar`**, directly outside
  `PostRegistrationMixin` (the NPC ordering rule) and inside
  `PersistableMixin` so `behaviors` rides the snapshot. The claim: every
  player body may carry standing instructions; `dispositions` stays
  empty and seeds nothing; `canEvict`'s veto becomes **the residency pin
  for a body with instructions** (the pets.md shape) — a linkdead body
  with a round to keep stays resident. `BehavedMixin` gains
  `addBehavior(spec)` / `removeBehaviors(brainPath)` that rewire live
  (today wiring happens only at `postRegister`).
- `lib/behavior/keeps.ts` — *keeps the round*: `presenceGated = false`,
  `ambient = false`, `claims: ['hands']`; config `{ rounds: Array<{ line:
  string; target: string }> }`; `trigger: 'cadence:600s'`. Each beat, for
  each round: resolve `target` among the host's **peers in the room it
  is standing in** (no teleport, no path-finding — the instruction is
  *stay here and keep this round*; a round whose target is not here
  lapses silently, which is the honest cost of logging off in the wrong
  place); if `MixinApi.isProducing(target)` and the tap's standing is
  worth a take (≥ half the ceiling for `expire`, ≥ one unit for `count`,
  any for `volume`), `forceCommand(line)`. Bounded: one take per round
  per beat.
- The verb: `platform/cmd/system/instruct.yaml` + `InstructController`:
  `instruct keep <literal command line>` records a round after resolving
  the line's verb and refusing unless that view declares **`standing:
  true`** (a new view key; only `milk`, `gather`, `rob`, `tap` set it —
  the earn/preserve bound as a declaration: a take is kept, never a
  `sell`/`consign`/`smelt`); `instruct` alone lists; `instruct none`
  clears. Afforded from `Avatar.commandContributions.self`. Nothing in
  the brain touches money, a counter or a shelf; the yield lands in the
  body's hands/vessel exactly as a manual take does.
- ⚠ This is the wave with the most new surface; Risks & opens asks for
  the user's eye on the verb grammar and the Avatar placement.

**D12 · The clock seam is `WorldClockApi.advance(by)` + `WorldClockApi`
on the `eval` allowlist.** `advance(by: Quantity<'s'> | string)` →
logic → `WorldClockRegistry.advance(gameS)`: `reanchor(); anchorGameTimeS
+= gameS;` then the `_advanceForTesting` drain loop over `onHeartbeat()`
(bounded), so every schedule in the skipped interval fires in order —
one-shots once, `every`s once per missed interval (weather boundary and
storm tick are presence-gated fan-outs; a 30-game-day jump is a few
hundred cheap fires). Reconcile-on-read systems need nothing. No gate on
the method: `setScale` is ungated already and the sandbox is the
code-trust surface; `shutdown` stays `SystemRoot` so an eval cannot
freeze the world. `SANDBOX_NAMES` gains `'WorldClockApi'`. Duration
strings parse with the same parser `after()` uses. ⛔ No new verb, no new
`isWizard` check.

**D13 · The tappable tree is `trade-forestry/src/thing/SapStandard.ts`
= `ProducingMixin(Plant)`, affording `tap` itself; the bush is a plain
`Panel` row; the Wood affords `tap` to refuse it.** Fields: `spiles`
(persistent). `maxSpiles()` derives from growth stage (seedling/young 0
· established 1 · mature 2 — grain); `productionFactor()` = `spiles ×
getVigor()` (`Growing.ts:528`, the relaxed limiting satisfaction);
`perGameDay` is per spile. `planTap`: if sap is standing and a vessel is bound → `take`;
else if `spiles < maxSpiles()` and the bound tool offers `boring` and a
spile item is bound → `set` (consumes the spile, 3 game-min, `cost 3`);
else refuse in order — the window's reason (`before-season` *"the sap is
not up; nothing will run until the days lengthen"* / `after-season`
*"bud break; the run is over for the year"* / `cold`/`warm`), the girth
(*"the stem will not take another spile at this girth"*), the vessel,
the tool. `commandContributions.peers = [tap.yaml]` plus every view
`Plant`'s chain already lists (copied — the shadowing rule). `look`
appends the spile count and run state in words. `StandMixin`'s
`inventory` list gains `tap.yaml` so `tap oak` in a Wood is answered by
the **wood** (*"a stand is a number of trees, not a stem; a spile goes
into one tree you can put your hand on"*); at the treeline neither
`fell` nor `tap` is afforded and the platform's not-here answer is the
same for both, which is the parity the drive asserts. The sugarbush is a
`Panel` row (not a subclass) because the panel's own affordances are
right as they are and the trees carry theirs.

**D14 · Materials, profiles, vessels.** Sap in the commons, shipped from
`trade-forestry/content/stuff/idea/material/food/{birch-sap,maple-sap}.yaml`
(`ConsumableMaterial`; tags `[liquid, food, sap, birch-sap]` /
`[…, maple-sap]`; `waterActivity 0.99`; a moderate `spoilActivationEnergy`
— sap sours in days; `biologicalSource` → the species). Syrups in the
trade: `/trade/forestry/idea/material/{birch-syrup,maple-syrup}.yaml`
(tags `[liquid, food, syrup, sweetener]`, ⛔ not `sugar`; `nutrients
[sugar, water]` with `nutrientAmounts.sugar` high — it also drives ABV,
so the number is stated). Profiles
`/trade/forestry/idea/maturation/{birch-sap,maple-sap}.yaml` (`evaporative`,
`inputCategory` the sap's own tag, `productFraction 0.02 / 0.04` — grain,
honest order against 100:1 and 40:1, playable in a 40 L pan; `happyK
370`, `stallBelowK 273`, `damageAboveK 400`, `leesFraction 0`,
`requiresFlora` absent). Vessels `/trade/forestry/thing/sap-pan.yaml`
(the salt-pan row, `category: pan`, 40 L) and `evaporator.yaml` (the
brine-hearth row; keywords `[evaporator, arch, hearth]`;
`burnTemperatureK` grain, calibrated by the W5 test so a full pan reaches
`finished` before `damage` on a tended fire and scorches on an untended
one). The pail is the commons': `generic-objects/content/stuff/thing/vessel/pail.yaml`
(`/platform/thing/Vessel`, `category: pail`, `interiorCapacity 10`,
`closure: none`, `open: true`) — milk uses it too, so `milk.yaml` (the
pail-of-milk `Provision`) is **deleted** and milk becomes bulk in the
pail; the milk material row stays. The sweetener vocabulary is written
once into `docs/subsystems/crafting.md`: `sweetener` is the family tag
and gates nothing by design; `sugar · honey · syrup` are the recipe
tags; no recipe may match on `sweetener` (the apiculture test already
pins the tags).

**D15 · Pouring a take into a vessel uses the bulk substrate's own
primitive.** W2 grounds which call crafting's `outputApplication: bulk`
uses to put N litres of material M into a vessel and calls the same; if
it is only reachable inside `CraftLogic`, the method is added to the
existing `BulkableApi` (an Api method on an existing subsystem Api, not
a new Api). A vessel holding a different material refuses (*"there is
something else in the pail"*).

**D16 · The word `tap`.** The verb is `tap`; the noun stays bound on
nine fixtures (the beer tap's primary keyword) and as a tool capability
string. The tree's and the wood's refusals never say *tap* as a noun —
they say *spile* and *stem* — so a sugaring refusal cannot read as being
about a bar. `lint:verb-collisions` is unaffected (verb-vs-verb only).

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `ProducingMixin` (promoted) | `lib/husbandry/`; composed by `Livestock`, `Hive`, `SapStandard` only | unchanged set. ⛔ Not on `Plant` (every houseplant would "give"), not on `Creature`. A tap is read off the species, so a composer with a tapless species has empty `taps()` and a silent refusal — no guard. |
| `TapState.vigour` | per-tap on `tapState`, `expire` only | a cow's two taps are two states; the hive's `accrue` never reads it. Lives beside `driedOff` because it is the slope to that cliff. |
| `TapState.brooding` + `fullSince` | per-tap, armed only by `broodAfterDays` on the spec | honey (also `accrue`) authors no `broodAfterDays` and is untouched. State on the TAP, not a hen flag, because *the clutch* is the thing that broods her. |
| `TapState.worst` | per-tap, `continuous` only | a second continuous tap (down, hair) records its own year. Not on `Livestock`: the hive could carry a continuous tap (wax) one day. |
| `TapSpec.window / yieldShape / capUnits / broodAfterDays` | `Species.production[]` (kernel, authorable) | a tap is a species fact (already the engine's belief). Each field has a kernel reader (`lint:unconsumed-seams`). |
| `Tappable` default `planTap/completeTap/tapWindow/tapRefusal/biomeWindowOpen` | on `ProducingMixin` | every producer is tappable with no per-host code; overrides are the bespoke case. The credit the host names is what makes a platform base credit a trade. |
| `EngagedActController` | `lib/command/` (abstract) | inherited by `GroundWorkController` and `TapActController`; claims nothing about ground. |
| `TapActController` | `platform/idea/cmd/inventory/` (abstract, kernel) | the kernel owns the ACT and no verb; `milk/shear/gather/rob/tap` stay their packs'. |
| `BehavedMixin` | ⚠⚠ **`lib/character/Avatar` — build-3's, NOT `platform/agent/Avatar`** (inside `Persistable`, outside `PostRegistration`) | every player body may run brains; the eviction veto with a non-empty `behaviors` is the pin. ⛔ Not on `Character` — `NPC = Behaved(PostRegistration(Character))` would double-compose. **See D11a: the host this plan originally named is being deleted.** |
| `keeps` brain | `lib/behavior/keeps.ts` | kernel commons: the relief is `#27`'s third relief, not a trade's. |
| `instruct` verb + `standing: true` view key | `platform/cmd/system/instruct.yaml`, `Avatar.commandContributions.self`; the key on `CommandDefinition` | a view opts in to being kept on standing instruction; nothing else changes about dispatch. |
| `WorldClockApi.advance` + sandbox name | `api/worldclock.ts` → `WorldClockLogic` → `WorldClockRegistry`; `EvalScript.SANDBOX_NAMES` | the sandbox already rides the code-trust axis; no new gate. |
| `SapStandard` | `trade-forestry/src/thing/` = `ProducingMixin(Plant)` | a tree you tap is a `Plant` in every other respect (grows, fells, persists); only sap-bearing species rows name it. Oak stays `/platform/thing/Plant`. |
| `spiles` | `SapStandard` | per-instance; a felled or repotted tree carries its wounds. |
| `tap.yaml` affordance | `SapStandard.peers` (the tree) + `StandMixin.inventory` (the wood, to refuse) | the wood refusing is an answer the wood owns, not a guard: *fell* lives there for the same reason. ⛔ Not on `Panel.peers` (the hazel panel would offer it). |
| sugarbush | a `Panel` **row** in Rejection; six tree rows `extends:` the trade's two standards | a second sugarbush anywhere is rows: one panel, N trees, two vessels. |
| sap materials | commons `/stuff/idea/material/food/` | a birch gives sap whether anyone sugars (the milk argument). |
| syrup materials, profiles, pan, evaporator, auger, spile | `/trade/forestry/` | things you make or use to make. |
| pail | commons `/stuff/thing/vessel/pail` | a second consumer (milk) on day one. |
| fleece | ranching's row, textiles' class | the producer owns the yield row; the consumer owns the class a spinner reads (the Hive→ranching shape). |
| `egg.yaml` | ranching | unchanged ownership; one egg, perishable `Provision`. |

**The narrowing test, applied:** no guard in this plan re-narrows a
host set. The nearest temptation was `Panel.peers += tap.yaml` (then the
hazel panel offers `tap` and the controller un-promises it); the tree
affording its own verb is what the one-level-into-an-open-container walk
was built for.

---

## Convention conformance

- **`props:` / `cast:`** — the sugarbush room uses `props:` for the
  panel, pan and evaporator; the panel row uses `props:` for its six
  trees as distinct paths (not `as:`, which is not a keyword).
- **Locations, not rooms** — the sugarbush is a
  `/platform/location/SingletonCartesianLocation` with the woodland
  biome (the treeline's shape), not a `Wood` (an empty `mix:` would
  render *nothing stands here worth the axe* over six standards).
- **The five axes / `<root>/<branch>/`** — kernel substrate at
  `lib/husbandry/`, `lib/command/`, `lib/behavior/`; kernel controller
  at `platform/idea/cmd/inventory/`; kernel view at
  `packages/content/platform/content/platform/cmd/system/instruct.yaml`;
  trade classes at `/trade/forestry/thing/SapStandard`, controller at
  `/trade/forestry/idea/cmd/forestry/TapController`, view at
  `/trade/forestry/cmd/forestry/tap`; species + sap in `/stuff/`;
  venue rows under `/world/terminus/rejection/hanging-wood/`.
- **Module scope declares** — the brain is `export const brain = class
  {…}`; no module-scope execution anywhere new.
- **Import boundary** — packs import the kernel by specifier only
  (`@saxonberg/server/mud/lib/husbandry/Producing`,
  `…/platform/idea/cmd/inventory/TapActController` — ⚠ confirm
  `./mud/platform/idea/*` serves a nested `cmd/inventory/` path exactly
  as `…/platform/idea/cmd/crafting/ManualBuildController` already does
  for `FellController`). No `fs`/`path` in the mudlib. Apiculture's one
  remaining ranching import is `Handled`.
- **No new module category, no free helper, no `eslint-disable`** —
  `EngagedActController` is an abstract class in `lib/` (category:
  Stuff class, only inherited); `Tappable.ts` exports interfaces and a
  type; `round2` becomes a protected method on the base.
- **Verbs on objects** — `planTap/completeTap/tapWindow` are host
  methods; the controller orchestrates. No `XApi.verb(host, …)`.
- **Inter-Stuff contract** — the brain and controllers read
  `standingIn/tapWindow/taps` and never `tapState`; the Hydrator is the
  only field writer.
- **A person keys on `getIdentityPath()`** — the `instruct` round
  records a target KEYWORD, never a path; nothing keys a person.
- **Mixin name static widens to `string`** — `static _mixinName: string =
  'ProducingMixin'` in the kernel file (the pinned-literal hazard).
- **`fieldMeta`** — every new persistent field declared
  (`lint:field-meta`); `spiles`, `tapState`, `productionStamp`,
  `behaviors`.
- **Gates this build must newly satisfy:** `lint:mixin-names`
  (`Mixins.Producing`), `lint:arg-kinds` (`tap.yaml` target `requires:
  any` declared like `fell.yaml`; `vessel requires: BulkableMixin`; `spile
  requires: VisibleMixin` with an MQL keyword default), `lint:instrument-args`
  (auger default `reachable:[capability.boring]`, vessel default
  `inventory:[mixin.BulkableMixin]`), `lint:capabilities` (`boring`
  consumed), `lint:unconsumed-seams` (four new `TapSpec` fields read in
  `Producing.ts`), `lint:perishable` (`egg` on `Provision`; sap/syrup are
  payloads), `lint:mass` (every new row states `mass`), `lint:census` /
  `lint:world-scan` (auger/spile/pail reachable via the store; pan,
  evaporator, trees via the sugarbush room), `lint:verb-collisions`
  (`instruct`, `tap` unclaimed), `lint:drive-scripts` (wire file only),
  `lint:test-bootstrap`.

---

## Waves

Every wave lands independently at one commit; `pnpm test:near` + every
touched pack's vitest + `pnpm -C packages/server lint:family` gate each.
Kernel waves first (the build leads from the kernel).

### ✅ W0 · The clock seam and the promotion — DONE `build(taps W0+W1)`

> **Landed together with W1** in one commit. `Producing.ts`'s *move* is
> W0 and its *rewrite* is W1, so the two could not be split by file
> without a commit that lies about what it contains. Everything else in
> both waves is separable and was verified separately.
>
> **What changed beyond the plan:**
> - `WorldClockApi.advance` **throws while the clock is paused.** A
>   paused clock fires nothing, so a jump taken there would bank the
>   game-time and strand every schedule in the skipped interval — the
>   exact silent skip the drain exists to prevent. Decided by D12's own
>   contract (*"drains rather than skips"*). `resume()` then `advance()`
>   is the honest sequence.
> - The drain loop is shared with `_advanceForTesting`
>   (`WorldClockRegistry.drainDue`), so the two seams cannot diverge.
> - ⚠ **A cascade does not catch up through a jump.** A callback that
>   re-arms off `now` lands *after* the jumped time, because that is
>   where `now` is. An `every` catches up (once per missed period) and a
>   chained `after` does not. Pinned as a test — the intuition goes the
>   other way.
> - `working-animals.test.ts`'s "the tap views are not on the mixin"
>   case read `../lib/Producing.ts` **as file text**. It now asserts
>   through `CommandApi.collectContributions` on a bare
>   `ProducingMixin(Creature)`, which is both portable across the move
>   and a better test — it checks the mechanism rather than the source.
> - ⚠ Found while moving the suite: the *"an animal with nothing to give
>   gives nothing"* assertion was **vacuous**. The wasted beast was
>   created *after* the advance, so its own elapsed interval was zero and
>   it read `0` whatever the arithmetic did. Seeded before the advance
>   now, plus a positive assertion on the thin one.
> - ⚠ `productionStamp === 0` is the "never stamped" sentinel, so a world
>   sitting at game-second **zero** takes the seeding branch on every
>   read and never accrues. Left as-is (a fresh world's first reconcile
>   defers by one read, and the alternative is a second persistent
>   field), but the kernel suite now runs where every shipped world
>   actually is — past second zero, stated at `T0`.

### W0 · The clock seam and the promotion — `build(taps W0): the clock can move; ProducingMixin is kernel`

Implements D1, D12.

- `api/worldclock.ts`: `advance(by: Quantity<'s'> | string): void`
  (TSDoc: what happens to schedules; not for tests — `_advanceForTesting`
  stays test-only); `WorldClockLogic.advance`; `WorldClockRegistry.advance(gameS)`
  (reanchor, bump, drain loop; `@CallSecurity(WorldClockApiCallers)`).
  `EvalScript.ts` `SANDBOX_NAMES += 'WorldClockApi'` + the binding in
  `buildSandbox`.
- `git mv packages/content/trade-ranching/src/lib/Producing.ts
  packages/server/src/mud/lib/husbandry/Producing.ts`; relative kernel
  imports; `_mixinName: string`; the two duck casts → `MixinApi.isOrganism`
  / `MixinApi.isReserved`; `PRODUCING_MIXIN` export retired in favour of
  `Mixins.Producing`. `lib/mixin.ts`: `Producing: 'ProducingMixin'` +
  refusal. `api/mixin.ts`: `isProducing`. `Livestock.ts`, `Hive.ts`
  imports → specifier. `taps.test.ts` split (tap cases → kernel,
  `_advanceForTesting`-driven; breeding cases stay).
- Docs touched: `time.md` (the seam, one section), `husbandry.md`
  (one-line pointer to `Producing`).
- Acceptance: `eval WorldClockApi.advance('1 day')` moves `getNow()` by
  86 400 s and fires a due `after` exactly once (unit test); the two
  packs boot; `rob`/`milk` still bind (the `requires: ProducingMixin`
  string is unchanged).

### W1 · `TapSpec` v2 and the per-tap states — `build(taps W1): a tap declares when it is open, and remembers how it was treated`

Implements D4–D9 (the mechanism half).

- `Species.ts`: `TapWindowSpec`, `TapClosedReason`, new optional
  fields on `TapSpec` (`window`, `yieldShape`, `capUnits`,
  `broodAfterDays`, `takeMs?`), header table rewritten.
- `Producing.ts`: `TapState` gains `vigour`, `worst`, `brooding`,
  `fullSince` (seeded 1/1/false/0; missing keys on a persisted state
  default the same way — no migration, a reboot re-seeds the new keys on
  first reconcile); `tapWindow`, `tapRefusal`, `biomeWindowOpen`,
  `productionRead(): string[]` (the look lines, no digits), the window
  factor in the fill, the vigour/residual arithmetic, `fullSince` →
  `brooding`, `worst`, `capUnits`, `takeFrom(key)` → `{units, worst}`
  (callers updated: Hive's override keeps one-box semantics and returns
  the same shape).
- Tests (`lib/husbandry/__tests__/Producing.test.ts`): the eight moved
  cases still pass unchanged in meaning; plus — a photoperiod tap fills
  in long days and not in short; a `weather` window opens once in spring
  (rising) and never in autumn across one walked game year at the
  realm's own temperature field (`WeatherLogic` deviation + 295 K
  baseline — the test that calibrates the birch/maple bands, pinned
  here); complete takes sustain vigour and a half take drifts it; a full
  clutch left `broodAfterDays` stops accrual and a take restarts it; a
  lean stretch lowers `worst` and the take resets it; `capUnits` caps
  and the overflow is lost; a closed window's standing is still takeable;
  `always` is the default.
- Acceptance: all shipped rows still parse (no row edited yet — every
  new field is optional and the defaults are today's behaviour).

### ✅ W1 · `TapSpec` v2 and the per-tap states — DONE `build(taps W0+W1)`

30 kernel cases green (`lib/husbandry/__tests__/Producing.test.ts`),
`tsc` clean, the full derived lint roster green, ranching 59/59 and
apiculture 69/69.

> **⚠⚠ D6 was WRONG and `TapState.vigour` is DELETED.** The single
> biggest finding of the build so far, and it is structural rather than
> arithmetic:
>
> `ceiling = perGameDay × windowDays`, so **a cow fills to her ceiling
> exactly as her window closes** (the shipped row: 22 × 0.6). The region
> where she sits full and suppresses her own synthesis is therefore
> *empty by construction* — it begins precisely where the neglect cliff
> already fires. The curve could not bite at any dial setting without
> redefining what `windowDays` means. The W1 test caught it twice: first
> as "the bands are unreachable" (τ saturating at one window), then, with
> τ widened, as "she dries off on day 2 before the curve can act".
>
> ⭐ And it was the **plan re-inventing something the requirements had
> deliberately removed.** Milk's agreed answer is *no judgment at the
> act*: a take always empties her, so what the player trades is
> **attendance against her rate** — labour — and the W4 relief is the
> answer to that, not a second mechanism. AC 8 (*going off is visible
> before it is lost*) is met by `productionRead` **banding the window
> clock that already exists** — in full milk · heavy and wants milking ·
> overdue and will dry off · dried off — which holds no state at all.
> That is strictly better than a stored curve, and it is the design the
> requirements actually settled.
>
> **Other departures from the plan:**
> - ⭐ **`tapWindow` reconciles first.** `brooding` and `driedOff` are
>   both derived from elapsed game-time, so answering off a stale state
>   reported a broody hen as still laying for as long as nobody happened
>   to read her standing. Safe against the reconcile's own call — the
>   reentry guard makes the inner one a no-op, which is the
>   sampled-at-the-read semantics D4 asked for anyway.
> - ⚠⚠ **`fullSince` is stamped when she ACTUALLY filled**, inside the
>   interval, not at its end. Stamping it at `nowS` meant a single
>   reconcile spanning both the filling and the brooding could never
>   detect the brooding — and in a reconcile-on-read system long single
>   steps are the common case, not the edge. The first version passed
>   only because the test happened to read her twice.
> - ⚠ **`Creature` composes `ThermalMixin`**, so it is NOT the
>   no-temperature host the tri-state rule needed. The rule is now
>   pinned two ways: a thermal host IS gated (`cold`/`warm`), and a host
>   whose temperature read comes back empty is gated by daylength alone.
> - `seasonSide` turns a closed photoperiod/weather band into
>   `before-season` vs `after-season` by which side of the opener we are
>   on — which is what makes the curtain sentence land at the right
>   moment rather than reading "not yet" in November.
> - `takeFrom` returns `TapTake {units, worst}`. Callers updated:
>   `Hive.takeFrom` (one box-worth, `worst: 1` = *no quality record*),
>   ranching's `TapController` (replaced wholesale in W2).

### W2 · The take as an act — `build(taps W2): taking from a tap is an engagement with a vessel, on one kernel base`

Implements D2, D3, D15 and the `shear --quick`/milk-vessel view changes.

- `lib/command/EngagedActController.ts` (promoted from
  `GroundWorkController`, which now extends it; `test:near` on the
  ground tests). `lib/husbandry/Tappable.ts`. `Producing.ts` default
  `planTap`/`completeTap` (durations: `takeMs` on the spec else by
  shape — volume 10 game-min, count 2, mass 20 — grain; `cost` 4; the
  pour via D15; `count` mints N; `mass` sets mass + `quantity` on a
  Stackable yield; words from `tapRefusal`/`productionRead`; `credit`
  from the host hook `tapCredit(key): {discipline, difficulty} | null`,
  default `null`).
- `platform/idea/cmd/inventory/TapActController.ts` (abstract; model
  `{target?, tool?, vessel?}`; `land()` module function with the
  co-location check; `season-closed` noted as information).
- `generic-objects/…/vessel/pail.yaml`. `BulkableApi` deposit if D15
  needs it.
- Ranching: `Milk/Shear/GatherController` extend the kernel base
  (`tapKey()` only, plus `shear`'s `--quick`); `TapController.ts`
  deleted; `Livestock` overrides `tapRefusal` (her voice) and `tapCredit`
  (stockmanship × handling); `milk.yaml` gains `vessel` (`prepositions
  [into, in]`, `required: false`, `requires: BulkableMixin`, `default:
  "inventory:[mixin.BulkableMixin]"`); `shear.yaml` `options.quick`;
  `milk.yaml` row deleted (D14). Apiculture: `RobController` extends the
  kernel base, keeps its `completeTap`-side comb composition (moved from
  `mint`), `rob` gets a duration (⚠ Risks §1); `Hive` overrides
  `tapCredit` → apiculture, `biomeWindowOpen` → forage, `tapRefusal` →
  *"the refusal is the season's"*.
- Tests: kernel controller test over a fixture producer (plan → engage
  → land; walk-away → nothing came of it; `stop` → abort, state
  unchanged; no vessel on a volume tap → refusal names the vessel; a
  wrong-material pail refuses); ranching's and apiculture's controller
  tests updated; the apiculture wire test awaits the rob engagement
  (`engagementIdOf`).
- Acceptance: `milk cow` without a pail refuses naming the pail; with
  one, engages, completes, and the pail holds milk; `rob hive` yields
  comb as before after its engagement; `gather hen` and `shear ewe` run
  as engagements.

### ✅ W2 · The take as an act — DONE `build(taps W2)`

10 kernel controller cases green
(`platform/idea/cmd/inventory/__tests__/TapActController.test.ts`),
ranching 59/59, apiculture 69/69, textiles 29/29, **farming 81/81** (the
promoted base's existing consumers), `tsc` clean, lint roster green.

> **What landed**
> - `lib/command/EngagedActController.ts` — the endurance check, the
>   `hands` engagement, the three start-failure reasons, `decline`, and
>   ⭐ a NEW `inform()` seam: *say something that is not a refusal and
>   file no rejection*, which is what a closed season needs.
>   `GroundWorkController` extends it and lost 60 lines;
>   `GroundStepOptions` is now an alias and `GROUND_TOPIC` a re-export,
>   so none of ground's five controllers changed.
> - `lib/husbandry/Tappable.ts` — the sibling protocol, reusing
>   `WorkPlan`/`WorkRefusal`/`WorkPrognosis`/`WorkResult` unchanged.
> - `Producing.ts` implements both halves by default, plus the voice
>   hooks (`tapEmptyPhrase`/`tapBeginPhrase`/`tapTookPhrase`) and
>   `tapCredit`. So a cow, a hive and a tree get the whole act for free.
> - `platform/idea/cmd/inventory/TapActController.ts` — abstract; a
>   subclass names ONE string. `Milk`/`Shear`/`Gather`/`Rob` are ~12
>   lines each now; `trade-ranching/…/TapController.ts` is deleted.
> - `generic-objects/…/vessel/pail.yaml`; `milk.yaml`'s vessel arg;
>   the cow's tap is `yieldShape: volume` naming the MILK MATERIAL, and
>   **ranching's `thing/milk.yaml` ("pail of milk", mass 10) is
>   deleted** — minting the pail along with the milk was a faucet shape
>   for containers.
>
> **Decisions the plan did not make**
> - ⭐ **D15 needed nothing.** The pour primitive already exists
>   publicly: clone `/platform/thing/UnboundedReceptacle`, set its
>   material, `BulkableApi.slotFor` → `BulkableApi.transfer`, destruct in
>   a `finally`. `MagicLogic`'s bulk conjuration is the precedent. ⛔ No
>   new Api, no new method on `BulkableApi`.
> - ⛔ **`shear --quick` dropped** — see Deferred seams. The feedback law
>   says wool has nothing to decide at the act; `--quick` would have been
>   the third invented mechanism and the second one deleted.
> - ⭐⭐ **`Hive.mintTake` replaces `RobController.mint`.** The
>   controller used to stash its target on `this` in an `execute`
>   override to reach the hive's forage — *a controller holding state
>   about its subject is the tell that the behaviour belongs on the
>   subject.* The comb composition, the per-frame minting and the forage
>   blend all moved to `Hive`, and `RobController` lost its `execute`
>   override entirely.
> - ⭐ **The co-location check lives in `land()` and walks ONE level out
>   on the subject's side**, because a tappable tree stands in a panel
>   standing in the room — the same one-level reach the affordance walk
>   uses to offer the verb. Without it every sugarbush take would land as
>   *you are not there any more*.
> - `completeTap` **re-reads the tap at completion** rather than trusting
>   the plan's numbers: the interval between planning and landing is real
>   game time and a season can close inside it. ⚠ Which means the yield
>   is not a function of the plan — the W2 tests assert the SHAPE (one
>   object vs several, the fraction left standing) rather than exact
>   masses, and say so.
> - `milk.yaml`'s vessel is `requires: VisibleMixin` +
>   `mustHaveBulkSlot`, following `fill.yaml` rather than
>   `requires: BulkableMixin` — the shipped precedent, and the slot is
>   the real test.
>
> **⚠⚠ Found: `spin fleece` had a FOURTH gate, and fixing three would
> have left it dead.** `isSpinnable` now reads the material's `fibre`
> tag — but yarn's material is linen and carries `fibre` too, so the
> material test alone would have let you **spin yarn into yarn**. The old
> path test (`/line` or `/tow`) refused that by accident. The honest
> discriminant is `yarnCount > 0` — a CONSTRUCTION fact, which is why no
> material tag could ever have carried it.
>
> **Test-harness findings** (each one made an assertion vacuous or
> impossible, and each is now commented at its site):
> - A fixture giver with no `EngagedMixin` makes `engageAct` run the
>   completion SYNCHRONOUSLY, so every *"nothing yet"* assertion passes
>   for the wrong reason. Pinned as its own case.
> - `StuffApi.clearAll()` in `afterEach` wipes the world clock from the
>   template-path index while `_resetForTesting` reuses its cached
>   pointer — so the NEXT test's `nowSeconds()` returns null and every
>   tap silently fails to accrue. Unregister the event registry instead.
> - A controller is a `Stuff`: a bare `new` throws, and the tests
>   destruct it by hand before `settle()` to prove the completion really
>   is a module function.

### W3 · The ranching rows, the look line, the two sinks — `build(taps W3): the hen goes broody, the fleece reports the year, eggs are counted and spun wool spins`

Implements D6–D10 (the content half), the look line.

- Species rows: `bos/taurus` (`window: {kind: event}`, `yieldShape:
  volume`), `gallus/domesticus` (`window: {kind: photoperiod, daylightFrom
  0.5, daylightTo 1}`, `yieldShape: count`, `perGameDay 0.8`,
  `broodAfterDays 4`), `ovis/aries` (`capUnits 4`), `apis/mellifera`
  (`window: {kind: biome}`). `eggs.yaml` → `egg.yaml`; `fleece.yaml`
  class → `TextileStock`, `mass 3`, `quantity 1` (the take overwrites);
  `trade-ranching/package.json` + `pack.yaml` depend on textiles.
- `Livestock.ts`: `static markupAugmenters` appending
  `productionRead()` lines to `look` (the `Character.bodyAugmenter`
  shape; the stockman line stays where it is).
- Textiles: `SpinController.isSpinnable` → material `fibre`; confirm the
  charge against a fleece's quantity.
- Baking: `trade-baking/content/recipes/enriched-dough.yaml` (`flour`
  1 L, `water` 0.4 L, `egg` `kind: item, count: 2, category: egg`, salt
  item; output the dough trough with an *enriched* appearance). Confirm
  the egg material carries the tag `egg` (add it if not — a material
  tag on ranching's row, no recipe edit).
- Docs: `ranching.md` (taps section rewritten: the five judgments
  table, the window, the look line, the `look` bands), `textiles.md`
  (the fleece), `spoilage.md` one line (eggs keep).
- Acceptance: the W1 arithmetic observable through the verbs; `spin
  fleece` binds and runs; `make enriched dough` accepts two eggs.

### ✅ W3 · The ranching rows, the look line, the two sinks — DONE `build(taps W3)`

ranching 59/59, apiculture 69/69, textiles 29/29, baking 34/34,
generic-objects 28/28, farming 81/81, `tsc` clean, lint roster green.

> **The rows**
> - `bos/taurus` — `yieldShape: volume` naming the milk MATERIAL,
>   `window: {kind: event}` (a lactation is not a season; a cow is
>   near-aseasonal and a photoperiod band for her would be false).
> - `gallus/domesticus` — `yieldShape: count`, `perGameDay: 0.8`,
>   `broodAfterDays: 4`, `window: photoperiod 0.45–1`. ⭐ That last one
>   makes `gather`'s shipped refusal *"short days will do that"* TRUE;
>   it was a sentence about hens that was not a sentence about the code.
> - `ovis/aries` — `capUnits: 4`. A sheep does not accumulate wool
>   forever, which the uncapped row implied.
> - `apis/mellifera` — `window: {kind: biome}`, so the first RGO whose
>   reservoir is somebody else's land says so in data. ⚠ No
>   `broodAfterDays`: bees do not stop foraging because the supers are
>   full, they swarm, and `ColonyMixin` already owns that.
> - `thing/eggs.yaml` → `thing/egg.yaml` — ONE egg, mass 0.06.
> - `thing/fleece.yaml` — ranching's row, **textiles' class**
>   (`TextileStock`), plus `quantity` and `gradeBand`.
> - `thing/milk.yaml` **deleted** (W2).
> - the egg material gains the tag **`egg`** — which was the OTHER half
>   of why eggs had no sink: a recipe slot matches a material
>   classification tag and there was nothing to match.
>
> **The sinks**
> - `trade-baking/content/recipes/enriched-dough.yaml` —
>   `category: egg`, `kind: item`, `count: 2`. ⭐ A real distinction and
>   not a reskin: fat and egg are what make a festival bread.
> - `spin fleece` binds and runs. ⚠ See W2 for the **fourth** gate.
>
> **The look line**
> - `Livestock.markupAugmenters = [productionAugmenter]`, appending
>   `productionRead()` to `look`. The `Character.bodyAugmenter` shape.
>   ⭐ `stockmanRead()` stays where it is — that one answers *what is
>   this animal worth* (draft/return's question), and this one answers
>   *what is it doing*.
>
> **⚠⚠ Found by `lint:instanceable` invariant 12 — a silently broken
> row.** `pail.yaml` was authored as `/platform/thing/Vessel`, which
> declares NONE of the bulk fields: `Vessel` is the discrete-container
> rung (`Location → Holder → Vessel → ExitableVessel`, things you PUT
> in), so `interiorBulk`, `interiorCapacity`, `closure`, `open` and
> `category` would all have been discarded by the Hydrator **silently**
> and the pail would have had no interior at all. It is a `Receptacle`
> now (bulk — what it holds is poured), without `category`/`open`, which
> that rung does not declare either. ⭐ The orphan-key ratchet sits at
> exactly 393 again. This is the gate doing precisely what the
> census-then-ratchet pattern is for.

### ⚠⚠ D11a · The relief's host is being deleted by build-3 — W4 MOVES LAST

Verified 2026-09-30 by reading `reqs/avatar-family` (build-3's branch,
**1076 files, +35,884/−10,561, already at W6**) without checking it out:

- **`platform/agent/Avatar.ts` does not exist there.** The avatar family
  split on the phase axis into `platform/agent/PrimaryAvatar.ts` ·
  `ShadeAvatar.ts` · `sandbox/SandboxAvatar.ts`.
- ⭐ **`Avatar` became SUBSTRATE** at `lib/character/Avatar.ts` —
  `PrimaryAvatar extends Avatar` imported from `../../lib/character/Avatar`.
  That is CLAUDE.md's instanceable-vs-inherited split applied to the
  family, and `lib/creature/{Actor,Creature,KeptAnimal}.ts` moved the
  same way.
- On **this** branch `lib/character/Avatar.ts` does not exist yet.

**So the right host is `lib/character/Avatar`** — one place that every
player body (primary, shade, sandbox) inherits, surviving the refactor —
**and it is not reachable until build-3 lands.** Going lower is not an
escape: `Beast` already composes `BehavedMixin`, so any shared ancestor
of Avatar and Beast double-composes, which is the same hazard the
`Character` row already rules out.

**Consequences, both adopted:**

1. ⭐ **W4 moves to the END, after W6.** Nothing in W0–W3 or W5–W7
   depends on it, and it was already the build's largest unknown sitting
   in front of its headline content. The sequencing concern and the
   coordination hazard have the same fix.
2. **W4 is gated on build-3's merge.** If avatar-family has not landed
   when the build reaches it, W4 does not ship and **AC 7 goes with it**
   (see Risks §2a for the choice that then falls due). The build is
   never blocked — it is severable by construction.

⚠ **And expect a large master-merge.** 1076 files across
`platform/agent/`, `lib/` and the wire harness will land between this
plan and the MR; `base-class-narrowing.dirty.wire.test.ts` (1294 lines)
is in that diff too. Merge master into this branch early and often, and
re-read `Producing.ts`'s composers after it.

---

### W4 · The relief — `build(taps W4): a character keeps the round on standing instructions`

⚠ **Runs LAST, after W6, and only if build-3's avatar-family has merged
— see D11a.**

Implements D11.

- `Behaved.ts`: `addBehavior`, `removeBehaviors`; `Avatar.ts`:
  `BehavedMixin` composed per D11 (and `instruct.yaml` in its `self`
  contributions — ⚠ check whether `Avatar` already declares a static and
  union by copying if a mixin in its chain does).
- `lib/behavior/keeps.ts`; `CommandDefinition` reads the optional view
  key `standing: boolean` (parser + type); `milk.yaml`, `gather.yaml`,
  `rob.yaml`, `tap.yaml` set it. `platform/cmd/system/instruct.yaml` +
  `platform/idea/cmd/system/InstructController.ts`.
- Tests: the brain over a fixture avatar + producer (fires only when
  standing is worth it; only in the body's room; records nothing to any
  ledger — assert the bank ledger and shelves are untouched);
  `instruct keep sell x` refuses (no `standing`); a body with a round is
  not evicted (the `canEvict` veto through `ResidencyLogic`'s test seam).
- Docs: `behavior.md` (the `keeps` row in the brain table; Avatar as a
  Behaved host), `lenses/27-time.md` gets a one-line "built" note at the
  sweep (index-file rule: leave to the sweep if it races).
- Acceptance: `instruct keep milk cow into pail`; disconnect; `fireBeat`
  (or wait a cadence); reconnect — she is in milk, the pail holds milk,
  nothing was sold.

### W5 · The tappable tree, the sap, the boil — `build(taps W5): a birch gives sap to a spile, and a pan boils it to syrup`

Implements D13, D14, D16 in `trade-forestry` (+ two commons species).

- Commons (shipped from forestry's `content/stuff/…`): species
  `betulaceae/betula/pendula.yaml` (silver birch; `production: [{key:
  sap, yieldRow: <unused for volume — the material is the yield>,
  perGameDay: 3, behaviour: accrue, windowDays: 4, yieldShape: volume,
  window: {kind: weather, daylightFrom: 0.40, daylightTo: 0.50, rising:
  true, minK: 278, maxK: 300}}]` — ⚠ for a `volume` tap `yieldRow` names
  the **material**; W1's reader treats it so and the TSDoc says it) and
  `sapindaceae/acer/saccharum.yaml` (sugar maple; `daylightFrom 0.36,
  daylightTo 0.44`, `perGameDay 2`, with the header paragraph on why the
  band is a compromise: the 276 K floor, freeze–thaw as the row it should
  get when winter is real); wood materials `/stuff/idea/material/wood/
  {birch,maple}.yaml`; `wood-vocabulary.test.ts` → ten words;
  `forestry.md`'s closed list updated.
- Trade: `src/thing/SapStandard.ts`; `content/trade/forestry/thing/plant/
  {birch-standard,maple-standard}.yaml` (`class: /trade/forestry/thing/
  SapStandard`, the oak-standard shape, `standardMaterialPath` birch/
  maple, `harvestTemplatePath: null`, `discipline: silviculture`);
  `thing/{auger,spile,sap-pan,evaporator}.yaml` (auger a `Tool`,
  `capabilities: [boring]`, `epoch: medieval`; spile a `Thing`, mass
  0.05); `idea/material/{birch-syrup,maple-syrup}.yaml`;
  `idea/maturation/{birch-sap,maple-sap}.yaml`; `cmd/forestry/tap.yaml`
  (target `requires: any`, `scope [reachable]`; `tool` default
  `reachable:[capability.boring]`; `spile` `requires: VisibleMixin`,
  `default: "inventory:[keyword.spile]"`; `vessel` as `milk.yaml`'s;
  `standing: true`); `src/idea/cmd/forestry/TapController.ts` extends
  the kernel base with `subjectOf` narrowing the three cases (a
  `SapStandard` → it; `stuff: null` + raw in a Wood → the wood's refusal;
  elsewhere → *nothing here takes a spile*); `Stand.ts` `inventory +=
  tap.yaml`; `src/__tests__/{SapStandard,tap-verb,sugaring}.test.ts`
  (spile cap by stage; season refusals in words with no digit; the pan
  over the evaporator reaches `finished` before `damage` tended and
  scorches untended — this pins the evaporator's `burnTemperatureK`;
  `category: syrup` matched by the forestry syrup through `Recipe`'s
  slot match against the gimlet row read as a fixture).
- Docs: `forestry.md` (the fifth representation note: a standard that
  is tapped is still the slot-plant; the three-way wood contest),
  `maturation.md` (second evaporative consumer), `crafting.md` (the
  sweetener vocabulary paragraph).
- Acceptance: unit-level everything above; `tap` is afforded standing
  beside a `SapStandard` in a panel and in any Wood.

### W6 · The sugarbush at Rejection — `build(taps W6): the Hanging Wood has a sugarbush and the store sells the kit`

Content only (no `src/`).

- `rejection/content/world/terminus/rejection/hanging-wood/sugarbush.yaml`
  (`SingletonCartesianLocation`, woodland biome, coords `{x: 1, y: 1,
  z: 0}`, exits `west → ride` / ride gains `east → sugarbush`
  `edgeMinutes 3`; prose: a hollow of birch and maple, an open-sided
  arch under a roof of brash; `props: [thing/sugarbush-panel,
  thing/sap-pan, thing/evaporator]` — the latter two the trade's rows,
  propped here; `details:` the arch, the hollow). ⚠ No `tap` and no
  `fell` at the treeline: untouched.
- `hanging-wood/thing/sugarbush-panel.yaml` (`/trade/forestry/thing/Panel`,
  `staticSlots plant capacity 6`, soil as `panel-north`, `props:` the six
  tree rows). Six tree rows `hanging-wood/thing/{birch-north,
  birch-middle,birch-south,maple-north,maple-middle,maple-south}.yaml`
  — `extends: /trade/forestry/thing/plant/birch-standard`, overriding
  `shortDescription` ("the north birch"), `keywords` (`[birch, tree,
  standard, north, "north birch", birch-north]`), `register: definite`,
  `growthStage: mature`, a one-line `longDescription` with the girth in
  words (*"two spiles' worth of trunk"*). ⚠ If `extends:` does not
  replace `keywords` as a scalar list, fall back to full rows and note it
  in the plan.
- `thing/store-counter.yaml`: `stockLines += auger par 2 · spile par 12
  · pail par 4` and `prices += auger 18 · spile 1 · pail 5` (grain; on
  the store's list, never on the row).
- Tests: `rejection`'s content test (if the pack has one) or forestry's
  `hanging-wood.test.ts` extended: the room resolves, six trees seat,
  the store prices the three.
- Acceptance: a booted world shows the bush, the trees answer `look`
  by name, `buy auger` works.

### ✅ W5 · The tappable tree, the sap, the boil — DONE `build(taps W5)`
### ✅ W6 · The sugarbush at Rejection — DONE (same commit)

forestry 120/120, `tsc` clean, lint roster green. Landed together
because W6 is rows over W5's classes and neither suite separates.

> **W5 — what landed**
> - Commons: `betula/pendula` + `acer/saccharum` species (both carrying
>   a `weather` tap with `rising: true`), `wood/{birch,maple}` materials,
>   `food/{birch,maple}-sap`. The wood vocabulary is **ten** now — and
>   both joined for their SAP rather than their timber, which is the
>   first time a tree earned its way in for something other than what it
>   is made of.
> - Trade: `src/thing/SapStandard.ts` = `ProducingMixin(Plant)`; the two
>   standard rows + two seed rows; `auger`/`spile`/`sap-pan`/`evaporator`;
>   `{birch,maple}-syrup` materials; `{birch,maple}-sap` maturation
>   profiles; `cmd/forestry/tap.yaml` + `TapController` (+ its template
>   row); `Stand.ts` affords `tap` in order to refuse it.
>
> **⚠⚠ The evaporator was WRONG and the sugaring test caught it.**
> `burnTemperatureK: 480` sits ABOVE the profile's `damageAboveK: 400`,
> so a lit arch would have scorched **every batch in the game regardless
> of who was standing there** — which makes attention worthless rather
> than valuable, the exact inverse of the design. It is 390 now:
> deliberately between `happyK` (370, a rolling boil) and 400, so a lit
> arch drives the boil at full rate and *cannot scorch by temperature at
> all*. ⭐ What ruins syrup is **boiling dry**, which is the evaporative
> mechanism's own `damageSat` path — so the thing a sugarer watches for
> is the pan getting low, which is what a sugarer actually watches for.
> Risks §5 asked for this calibration; this is it, and it moved a number
> rather than the mechanism.
>
> **W6 — what landed**
> - `hanging-wood/sugarbush.yaml` (a `SingletonCartesianLocation`, ⚠ NOT
>   a `Wood` — a stand's derived reading would say *"nothing stands here
>   worth the axe"* over six stems a player can touch), east off the ride
>   both ways, its own cell.
> - `thing/sugarbush-panel.yaml` + **six named tree rows** using
>   `extends:`.
> - The store stocks AND prices auger/spile/pail — both halves, because a
>   `Stock` with lines and no prices answers *isn't for sale*, which was
>   found by driving apiculture.
>
> **⭐ `extends:` RESOLVED (Risks §7).** It works, and the keyword
> question was the wrong worry: whether a child's `keywords` replaces or
> merges does not matter, because the DISTINCT keyword (`birch-north`) is
> unique to the row either way. ⚠ What did bite is the opposite —
> `lint:instanceable` flags a child that re-states `class:` or
> `hydratorClass:`: *a child states only what differs*. The six rows are
> six lines of data each now, so the fallback-to-full-rows the plan
> budgeted for was not needed.
>
> **Other gate findings**
> - `lint:controller-rows` — `TapController` had **no template row**. A
>   `controller:` is a template path, so the verb would have answered
>   `controller-error` *every time, for everybody, forever*, with its
>   controller tests green. One two-line file.
> - `lint:mass` — the two new seed rows stated no mass. The shipped
>   acorn and ash key are grandfathered under the ratchet; a new row
>   pays the rule.
> - `lint:instanceable` — `chemistry: null` on the two wood materials is
>   an orphan key (`Material` declares no such field) even though beech
>   carries it. Dropped; the ratchet is back at 393.

### W7 · The drive, the docs, the slate — `drive(taps): <what driving found>` + `docs(taps): subsystem doc + climate slate`

- `packages/wire/tests/taps.dirty.wire.test.ts` (`DIRTY_REASON`: buys
  the store's auger/spile/pail par, sets spiles in persisted trees, takes
  sap a season does not put back in-run, milks a persisted cow). The
  requirements' 22 checkpoints verbatim, in order; checkpoint 0 through
  `eval WorldClockApi.advance('<n> days')` (the `after()` parser's own format — '3 days', '5 minutes'); the animal checkpoints on the
  farmstead route (`farmstead.dirty.wire.test.ts` is the route record);
  checkpoint 13 at the Lounge bar; checkpoint 19 sets one sheep's
  `flesh` through `eval` before the jump; checkpoint 18 through
  `fireBeat`. Every assertion must be able to fail (no *"the status is
  defined"*).
- `docs/subsystems/taps.md` (new: the thesis table, `TapSpec` v2, the
  window kinds, the act protocol, the per-tap states, the relief, the
  clock seam, the second-instance test) — the CLAUDE.md map line is left
  to the sweep (index-file rule).
- `docs/slates/builds/climate-slate.md` (new, conflict-free): the 276 K
  floor, the two rows that set a temperature, which dials move with a
  real winter (thermal, spoilage, freshness, soil moisture, the metabolic
  defaults), maple's freeze–thaw row as the first consumer.
- Run `pnpm test` once (pre-MR), push, open the MR.

---

## Reachability wiring

Five links — verb · affordance · data · boot · arg gate — each fails
closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `tap` a tree | `trade/forestry/cmd/forestry/tap.yaml` → `/trade/forestry/idea/cmd/forestry/TapController` | `SapStandard.commandContributions.peers` (the tree, one level into the open panel) + `StandMixin.inventory` (the wood, to refuse) | species `production:` with `yieldShape: volume` + `window`; the trade's two standard rows; the six venue rows | the panel's `props:` seat the trees (`Cultivable.applyProps`); the `MaturationProfile` rows warm with the roster — `MaturationProfileCatalogue.ts:57` selects by the `/idea/maturation/` path infix across every root, so a trade's rows need no registration | target `requires: any`; `tool requires: [ToolMixin]` default `[capability.boring]`; `spile requires: VisibleMixin` default `[keyword.spile]`; `vessel requires: BulkableMixin` |
| `milk`/`shear`/`gather` as acts | existing views, edited | `Livestock.peers` (unchanged) | species rows (W3) | — | `target requires: HandlingMixin` (unchanged); `vessel` as above |
| `rob` | unchanged | `Hive.peers` | `window: biome` | — | `requires: ProducingMixin` — same string post-promotion |
| the boil | platform `pour`/`fill`/`ignite` (shipped) | the pan and arch are props in the sugarbush | profiles keyed on `inputCategory: birch-sap/maple-sap`; sap tagged so | profile roster warm | — |
| syrup → cocktail | `order`/`make` (shipped) | the Lounge menu | the syrup's `syrup` tag | — | the recipe slot's `category: syrup` |
| `spin fleece` | unchanged | the wheel (unchanged) | fleece `class: TextileStock`; `wool` has `fibre` | — | `requires: StackableMixin` now true by composition; `isSpinnable` reads the material |
| eggs → dough | `make` (shipped) | — | `egg` tag on the egg material; the recipe row | the recipe installs with the baking pack | `kind: item, category: egg` |
| `instruct` | `platform/cmd/system/instruct.yaml` → `InstructController` | `Avatar.commandContributions.self` | the view key `standing: true` on four views | `BehavedMixin.postRegister` rewires persisted rounds at reconnect | `instruct keep <line>`: the line's verb must resolve and declare `standing` |
| the clock | none (⛔) | `eval` (wizard, shipped) | — | — | `SANDBOX_NAMES` includes `WorldClockApi` |

⚠ Two of these were the precedent's silent failures: a row's
`commandContributions:` is dead (the tree affords from its CLASS), and
`rob.yaml`'s mixin name must still resolve in the live registry after
the promotion (`lint:arg-kinds` reads the registry; the kernel const
carries the same string).

---

## Acceptance-criteria coverage

| AC | wave(s) | how it is observed |
|---|---|---|
| 1 set a spile, come back, carry away what ran | W5, W6, W7 §7, §10 | the pail's litres derive from `perGameDay × spiles × days × factor × window` |
| 2 out of season every tap refuses in the host's voice, no digit | W1, W2, W5 | `tapRefusal` defaults + overrides; the W5 test asserts `/\d/` is absent |
| 3 a season ends and the player is told | W1 (D5), W5 | `after-season` reason, information voice |
| 4 observable time, interruptible, world unchanged | W2 | engagement; `stop`; completion co-location check |
| 5 vessel refused/never asked by shape | W1 (D9), W2 | `yieldShape` |
| 6 judgments where biology puts them, nothing scores them | W1, W3 | vigour (milk), brooding (eggs), worst (wool), hive unchanged, sap window |
| 7 standing instructions preserve, never earn | W4 | the brain + the `standing` key; the ledger assertion |
| 8 going off is visible before it is lost | W1, W3 | vigour bands on `look` |
| 9 syrup accepted with no recipe edit | W5, W7 §13 | the `syrup` tag |
| 10 a sheared fleece can be spun | W3, W7 §20 | class + `isSpinnable` |
| 11 eggs counted and eaten | W3, W7 §21 | `count` + the recipe |
| 12 stand / treeline refusals teach the design | W5, W6, W7 §3–4 | the wood's sentence; the treeline's parity with `fell` |
| 13 over-tapping refused at the girth, nothing damaged | W5, W7 §9 | `maxSpiles()` |
| 14 scorching visible; the arch burns wood | W5, W7 §11–12 | `damageAboveK`; the Oven's fuel reserve on `category: wood` |
| 15 the hive behaves as shipped | W0, W2, W7 §22 | ⚠ identical outcome; `rob` now has a duration (Risks §1) |
| 16 a wizard moves time from inside the game | W0, W7 §0 | `eval WorldClockApi.advance` |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (kernel):** `Producing.test.ts` (the arithmetic, the windows,
  the states — all over `_advanceForTesting`), `TapActController` over a
  fixture producer, `WorldClockRegistry.advance` (drain semantics: a
  one-shot fires once, an `every` fires n times, nothing fires twice),
  `keeps` brain, `InstructController`, `EngagedActController` through the
  existing ground tests (`test:near`).
- **Unit (packs):** ranching controllers + `stockman-read` + a new
  `look`-line test; apiculture `colony`/`forage` unchanged + `rob`
  engagement; forestry `SapStandard`/`tap-verb`/`sugaring`/`hanging-wood`
  /`wood-vocabulary`; textiles `spin` over a fleece fixture; baking the
  new recipe parses and matches an egg.
- **Only the drive can prove:** the five reachability links per row
  (the store stocks AND prices the kit; the trees seat and answer by
  name; `tap` is afforded in the right rooms and nowhere else; the Lounge
  takes the syrup), the clock jump against a live scheduler, the relief
  across a real disconnect, and the prose reading right.
- **Wire file:** `packages/wire/tests/taps.dirty.wire.test.ts`, run
  with `WIRE_BOOT=1 WIRE_PORT=2013` (build-2's port) before the MR; the
  record appended below.
- **Gates:** `pnpm -C packages/server lint:family` every wave (the
  roster is derived — never enumerate it in a script); the gates named
  under Convention conformance are the ones expected to bite.
- ⚠ `pnpm test` runs **twice**: before the MR opens and at `/finalize`.
  Everything between is `test:near` + the touched packs' vitest + the
  lint family. Rebuild `packages/types` after any merge from master
  before trusting a `tsc` error.

---

## Risks & opens

1. **`rob` gains a duration (AC 4 vs AC 15).** The requirements say the
   hive is untouched and also that *taking from any tap takes observable
   time*. The plan resolves toward AC 4 with a short `takeMs` (5 game-min)
   and updates the apiculture wire test to await the engagement. ⚠ The
   user may prefer `takeMs: 0` for honey (the frames come out as fast as
   they did); it is one number on `mellifera.yaml`.
2. **D11's surface** — `instruct keep <literal line>` and the
   `standing: true` view key. ⭐ Approved by the user 2026-09-30
   *"sounds good but I'll need to see it"*, so W4 demos the grammar
   before it is final.

2a. ⚠⚠ **If build-3's avatar-family has NOT merged when the build
   reaches W4** (D11a), the relief cannot land on its correct host and
   **AC 7 is unmet.** Two honest outs, and it is the user's call:
   - **(a) ship anyway** — W0–W3 and W5–W7 land, the milking act
     becomes *more* demanding (a duration, a vessel) with no relief, and
     AC 7 moves to the dairy build with the rest of milk's story. The
     argument for it: **nothing consumes milk**, so nobody is actually
     dairying and the harshness is theoretical until dairy ships.
   - **(b) hold the ranching re-shaping too** — milk's act changes
     (W2/W3) wait with the relief, so the cow is never made harsher
     without her remedy. The sap vertical ships alone.
   ⭐ Recommend **(a)**, and say so in the MR rather than discovering it
   in review.
3. **Walk-away does not abort an engagement today** (Grounding). The
   plan's completion-time co-location check makes a walked-away take
   produce *nothing came of it* with no state change, and `stop` is the
   immediate abort. Checkpoint 8 is driven both ways. If the user wants
   movement to abort `hands` work outright, that is a scheduler change
   for every engaged act, not this build's.
4. **Spring warmth in this climate.** The realm's spring sits near
   291–299 K, so the `weather` opener's temperature band barely gates
   and the daylength band does the work; the W1 test walks a game year
   to pin the bands so the run opens once, in spring, for 15–25 game
   days. The maple paragraph says this plainly (requirements).
5. **The evaporator's scorch calibration** (`burnTemperatureK` vs
   `damageAboveK` vs the pan's thermal lag) is pinned by a W5 unit test;
   if a tended boil cannot finish before scorching under the shipped
   `Evaporation` cap, the numbers move, not the mechanism.
6. **D15's pour primitive** may not exist publicly; the fallback is one
   method on the existing `BulkableApi`. Not a new Api.
7. **`extends:` + list keys.** Whether a child row's `keywords` replaces
   the parent's is unverified for data (the by-entry merge is documented
   for designation lists). Fallback: six full rows.
8. **A planted tree's `getTemperature()`** inside a panel inside a room
   must see the sky; if the thermal cache does not resolve through the
   panel, the tree reads `WeatherApi.deviatedFieldFor` with a locality
   cached at the act. Verified in W5.
9. **`peers` reach for the tree** relies on `isOpenContainer(panel)`
   being true (it is today: `GardenBed` is not `Sealable`). If a future
   panel is sealable the affordance silently dies — note it in `taps.md`.
10. **The clock drain and `every` catch-up.** A large jump fires every
    missed `weather:boundary`/storm tick; both are presence-gated and
    cheap, but a jump of years in one call is a loop of thousands — the
    drive jumps a season at a time and the TSDoc says so.
11. **The fleece's `quantity` vs `spin`'s charge dial** — read in W3.
12. **Requirements premises corrected, none reopening scope:** the
    apiculture→ranching dependency stays (for `Handled`); checkpoint 4's
    "refused the same way `fell` is" is the platform's not-afforded
    answer at the treeline, for both verbs; the gimlet is served at the
    Lounge, not in Rejection.

---

## Deferred seams

- **Chicks / incubation** — `TapState.brooding` is the attach point; a
  breeding follow-on reads it to set a clutch. → the breeding follow-on
  named in `ranching.md`.
- **The dry-off decision** — `window: {kind: event}` + `freshen()` is
  the seam; the breeding cycle calls it. → same follow-on.
- **Resin / pitch** — a `production:` row on `pinus/sylvestris` with
  `yieldShape: mass` and a `weather` opener, on `SapStandard`; nothing
  in the kernel changes. → `tapping-slate` (light ladder).
- **Real winter** — maple's freeze–thaw opener (`weather` with a diurnal
  crossing of 273 K) is the first consumer. → the climate slate W7 files.
- **The fourth copy** — `ManualBuildController.engageStep` onto
  `EngagedActController`. → a note in `architecture.md` at the sweep.
- ⛔ **`shear --quick` is DROPPED, by the design's own thesis.** D8
  specified a speed-for-quality option at the act. But the feedback law
  this build is built on says wool has **nothing to decide at the act**
  — that is the whole third row of the table — so `--quick` is a
  judgment the biology does not put there, and adding an options channel
  to the `Tappable` protocol for one flag is surface for its own sake.
  The wool judgment that DOES exist (`worst` → the yield's grade band)
  ships. ⚠ It is also the second invented mechanism this build deleted,
  after D6's `vigour`; both came from the plan rather than the
  requirements. → `ranching.md` if a shearer's haste ever earns its own
  design.
- **Rounds beyond the room** — the `keeps` brain walking to a byre is
  the `homes` brain's path-finding pointed at a target. → `#27`'s relief
  note / behavior.md future work.
- **A `Cover` seam** for stand/sward and a per-instance opener cache for
  async weather reads. → forestry.md's existing note.

---

## Critical files

Read first, in this order:

1. `docs/requirements/taps-requirements.md`
2. `packages/content/trade-ranching/src/lib/Producing.ts` ·
   `…/src/idea/cmd/ranching/TapController.ts` · `…/src/agent/Livestock.ts`
3. `packages/content/trade-apiculture/src/thing/Hive.ts` (`:95` the
   chain, `:118` the affordance, `:526-612` the Workable pair) ·
   `…/src/idea/cmd/apiculture/RobController.ts`
4. `packages/server/src/mud/platform/idea/species/Species.ts:300-360, 1035-1060`
5. `packages/server/src/mud/lib/ground/Workable.ts` ·
   `platform/idea/cmd/ground/{GroundWorkController,WorkedActController}.ts`
6. `packages/server/src/mud/lib/husbandry/Growing.ts:735-870, 1160-1200`
   (`_worstLimiting`, `_vigor`)
7. `packages/server/src/mud/lib/behavior/{brain,Behaved}.ts` ·
   `packages/content/trade-farming/src/behavior/farms.ts` ·
   `packages/server/src/mud/platform/agent/Avatar.ts:150-210` ·
   `packages/server/src/mud/lib/npc/NPC.ts`
8. `packages/server/src/mud/platform/idea/WorldClockRegistry.ts:200-230, 410-460, 700-760`
   · `api/worldclock.ts` · `platform/idea/EvalScript.ts`
9. `packages/server/src/mud/platform/idea/api/CommandLogic.ts:3234-3435`
   (the peers walk) · `api/mixin.ts:957` (`isOpenContainer`)
10. `packages/content/trade-forestry/src/thing/Panel.ts` ·
    `src/lib/Stand.ts` · `src/idea/cmd/forestry/FellController.ts` ·
    `content/trade/forestry/thing/plant/oak-standard.yaml` ·
    `content/trade/forestry/cmd/forestry/fell.yaml`
11. `packages/content/rejection/content/world/terminus/rejection/hanging-wood/*`
    · `…/thing/store-counter.yaml` · `…/location/provisioning.yaml`
12. `packages/content/trade-quarrying/content/trade/quarrying/{idea/maturation/brine,thing/salt-pan,thing/brine-hearth}.yaml`
    · `packages/server/src/mud/lib/maturation/Maturing.ts:920-975`
13. `packages/content/trade-textiles/src/idea/cmd/textiles/SpinController.ts:80-100, 231`
    · `content/trade/textiles/cmd/textiles/spin.yaml` ·
    `src/thing/TextileStock.ts`
14. `packages/wire/tests/apiculture.dirty.wire.test.ts` (the harness
    shape, `DIRTY_REASON`, the prompt-recovery note) ·
    `packages/wire/tests/farmstead.dirty.wire.test.ts` (the byre route)
15. `docs/subsystems/{ranching,forestry,apiculture,activity,behavior,time,maturation,husbandry}.md`

---

## Drive record

*(appended at build time)* — the output of running
`packages/wire/tests/taps.dirty.wire.test.ts` against the running game:
the command, the count, each checkpoint's result, and what each failure
was. Precedent: `farming-plan.md § Checkpoint A`.
