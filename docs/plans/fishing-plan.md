# Fishing — implementation plan

Executes [fishing-requirements.md](../requirements/fishing-requirements.md)
(**kind: feature · leads from: content**). What is built: a **fishery
record on every reach** the water pack already compiles, derived from
species habitats and never tabled; a `trade-fishing` capability pack
carrying the tackle, the `fish` act with its wait / bite / landing
contest, `set` / `lift` for a pot and a net, `dig` for bait, `release`,
the `fishing` Discipline and two brains; a fish stall that takes your
catch on consignment (the shipped counter, no new verb); six aquatic species; a fish you can keep in a bowl;
and the content at two waters (wharfside's bank, the moor's heath) with
the third — Heart's Delight's millsite — proving the zero-code claim
from a pack this build does not touch.

Content-led, so it lands as **Stage A** (the kernel seams, five commits)
and **Stage B** (the water pack's record, the trade pack, the content,
the drive — seven commits). Every wave is independently landable.

---

## Grounding

Facts verified by opening files on `design/fishing` (at `0841b66d6`,
current with `origin/master`), 2026-09-17. Line numbers are approximate.

### The water pack's reading surface

- `packages/content/water/src/idea/WatercourseCatalogue.ts` (1328 lines)
  — the singleton at `/system/water/idea/WatercourseCatalogue`
  (`WATERCOURSE_CATALOGUE_PATH`, l.76; row
  `packages/content/water/content/system/water/idea/WatercourseCatalogue.yaml`,
  `data: {}`, no hydrator, lazily cloned). Public, all async and
  self-loading: `reachOf(ref)`, `reachesOf(courseKey)`, `allReaches()`,
  `compare(a,b)`, `isUpstreamOf`, `downstreamOf`, `successorsOf`,
  `hopsDownstream`, `flowAt(ref, nowS, draws) → FlowReading | null`
  (`{ref, m3s, naturalM3S, meltM3S, drawnM3S, snowpackMm, navigable}`),
  `airTemperatureKAt(ref, nowS)` (the CATCHMENT's air by season and
  elevation — a reach has no biome chain), `liveDraws(nowS)`,
  `contaminationAt(ref, nowS) → {reachRef, level, byKind}` (l.525).
  `CompiledReach` (l.117): `ref, courseKey, nodeName, basin, index,
  elevation, channelWidthM | null, depthToSea, catchmentKm2,
  climateLocalityPath`.
- ⚠ **`contaminationAt` counts an outfall AT the reach** (`hops = at ===
  ref ? 0 : …`, l.541). The Wharfside outfall discharges into
  `kestrel:confluence`, the same reach as the bank and the intake, so
  **the confluence's own reading carries the city's load**, and the
  estuary reach carries 55 % of it (`CONTAMINANT_SURVIVAL_PER_HOP.organic
  = 0.55`). One reach cannot tell above-the-outfall from below it.
- The exemplar of a pack reading the catalogue without importing it:
  `packages/content/trade-milling/src/thing/GristMill.ts` l.39–60 — a
  path constant, a duck-typed `FlowSource` interface, `StuffApi.singleton`
  by path, and a sync memo refreshed off-band (`_cachedW`, `settlePower()`)
  because the read is async and the consumer is sync.
- Watercourse rows (commons, `packages/content/world-seed/content/stuff/idea/Watercourse/`):
  `kestrel.yaml` — `headwaters(1400) → gorge → falls(500, w18) →
  confluence(30, w90) → estuary(0, w160)`; `holloway.yaml` — `head(1100)
  → vale(300, w14) → mouth(0, w70)`; `delight.yaml` — `spring(720) →
  flats(180, w22) → mouth(35, w30)`, `branchesFrom: kestrel:confluence`.
  A node is `{ name, elevation?, channelWidthM?, catchmentKm2? }` and
  is parsed in the catalogue (`WatercourseNode`, exported at l.1328).
- The catalogue finds its rows by class (`Template.findByClass(cls)`,
  l.816) — the pattern the fishery record uses to find species.
- `packages/content/water/src/idea/WaterRightRegistry.ts` — a register
  in the water pack (`WATER_RIGHTS_PREFIX = '/system/water/rights'`,
  `WATER_RIGHT_KIND`), the in-pack precedent for a second one.
- Dials: `packages/content/water/content/settings/water.yaml` (the
  `settings` kind, merge-missing), read through kernel `AppSettingKeys`
  consts; ⭐ a pack may also read a raw key — precedent
  `packages/content/terminus/src/mayfield-row/idea/cmd/LeaseController.ts`
  l.153 `AppApi.setting('residence.ascent.minCondition')`. So `fishing.*`
  keys need **no kernel const**: seeded literal at the call site, retuned
  by the pack's own `content/settings/fishing.yaml`.
- Manifests: `packages/content/water/pack.yaml` (`root: /system/water`,
  group `water`, title `/system/water`);
  `packages/content/trade-ranching/pack.yaml` + `package.json` (the
  trade-pack shape: `dependsOn` derived from `@saxonberg/content-*`
  dependencies; ships commons species rows into `/stuff/idea/species/…`
  under species-and-names' host claim); `vitest.config.ts` with
  `callSecPlugin()`.
- Consumers' dependency lines: `packages/content/terminus/package.json`
  already depends on `water`, `transport`, `trade-*`;
  `packages/content/world-seed/package.json` depends on `platform`,
  `transport`, `water`. ⚠ A pack rename or a new pack ⇒ `pnpm install`
  (memory: stale `node_modules` fails every pack suite at collection).

### Where a reach is cited today

- `Locality._reach` / `_catchmentKm2` (`packages/server/src/mud/platform/idea/Locality.ts`
  l.112–197, `getReach()`); `AddressApi.resolveLocalityFor(scope)`
  (`packages/server/src/mud/api/address.ts` l.87) resolves the covering
  Locality of a room.
- Localities citing a reach (`packages/content/world-seed/content/stuff/idea/Locality/`):
  `hearts-delight.yaml` → `delight:flats`; `moor.yaml` (`_address: moor`)
  → **`holloway:vale`**; `counting-houses`, `university-avenue`,
  `eternal-campus`, `hinkley-hills` → `kestrel:confluence`; `rejection` →
  `kestrel:headwaters`.
- ⚠⚠ **Wharfside has no reach by locality.** The bank is `_address:
  terminus/city/wharfside` (`packages/content/terminus/content/world/terminus/wharfside/bank.yaml`)
  and the estuary rooms are `terminus/city/wharfside/{reach,lower-towpath,estuary-mouth}`;
  the covering Locality is the platform's `terminus-city.yaml`
  (`packages/content/platform/content/platform/idea/Locality/terminus-city.yaml`,
  `_address: terminus/city`) which declares **no `_reach`**. The
  fishable feature at the bank is therefore load-bearing, not
  decorative.
- The water pack's own works cite a reach as **`reachRef`**
  (`packages/content/hearts-delight/content/world/hearts-delight/thing/millrace.yaml`
  — `reachRef: delight:flats`; `GristMill` reads `getReachRef()`). The
  feature this build adds uses the same key.
- The heath: `packages/content/world-seed/content/world/moor/stormy-heath.yaml`
  — `SingletonCartesianLocation`, `address: moor/heath` (⚠ the row key is
  `address`, not `_address`, and it resolves today), `_biomePath
  outdoor/baseline`, `adornments: [/world/moor/heath-floor]`
  (`heath-floor.yaml` is a `/platform/thing/Floor` with surface bulk).
  No exits; reachable by teleport (`startLocation` in a wire session).
- The millsite (`packages/content/hearts-delight/content/world/hearts-delight/location/millsite.yaml`)
  — `_address: terminus/hearts-delight`, `props:` the millrace, the
  grist mill, the toll bin; `cast:` the miller. **Not edited by this
  build.** Its reach resolves through its Locality.

### The record pattern

- `packages/content/trade-ranching/src/idea/HerdRegistry.ts` —
  `RegistrarMixin(Idea)`; constructor sets `registerPrefix`,
  `registerOwner`, `registerKind`; `file()` and `update()` write through
  `DocumentApi.saveToRegister(this, path, data)`; `read()` re-verifies
  the prefix (`isRegistryPath`, separator included) AND the kind;
  `all()` is private; module-private `pathOf`, `isRegistryPath`,
  `herdOf` (parse-or-null) live in the same file. `canEvict` vetoes.
- `packages/server/src/mud/lib/document/Register.ts` — the kernel
  `Registrar` shape; the invariant: owner is a prefix of the register's
  own template path, and the prefix lies under the owner.
- `packages/server/src/mud/lib/document/DocumentKinds.ts` — closed;
  `'water-right'` and `'herd'` are path-keyed, `onVanish: 'keep'`,
  `naturalKey: null`; `bill-of-lading`, `warehouse-receipt`, `rate-card`
  the same. **A `fishery` entry is the same shape.**
- `DocumentApi` (`packages/server/src/mud/api/document.ts`): `read`,
  `list(prefix)`, `listOfKind`, `saveToRegister`, `save`, `delete`.
- The register row: `packages/content/trade-ranching/content/trade/ranching/idea/HerdRegistry.yaml`
  shape (class + `data: {}`), and `StuffApi.singleton(path)` is the
  get-or-create (`lint:get-or-create`: never a `findByTemplatePath`
  pre-check in front of it).

### Species, body plans, kept animals

- `packages/server/src/mud/platform/idea/species/Species.ts` —
  `FEEDING_STYLES = ['hand','ground','graze','bowl','trough','hopper']`
  (l.205), `FEEDER_KINDS = ['bowl','trough','hopper']` (l.217, the
  vessel subset — a new non-vessel style does not touch it);
  `setFeedingStyle` throws on an unknown rung (l.929); `fieldMeta`
  (l.623): `handlingRange` and `biddability` are `spoiler: 1,
  spoilerName: 0`; `feedingStyle`, `adultMass`, `lifespanMin/Max`,
  `stature`, `butcheryYield` (`{cut, units}`, l.44) authorable;
  `_bodyPlanPath`, `olfactoryProfile` persistent. `getBodyPlan()` is a
  live lookup (`StuffApi.findByTemplatePath`).
- ⚠ **`breathableMedia` is on the BodyPlan, not the species**
  (`packages/server/src/mud/platform/idea/species/BodyPlan.ts` l.221,
  `['air']` default; `respires` l.231). Shipped plans:
  `species-and-names/content/stuff/idea/species/BodyPlan/{biped,quadruped,sessile}.yaml`,
  `trade-mining/…/BodyPlan/avian.yaml`. **No aquatic plan exists.** The
  build authors one by copying `avian.yaml`'s shape.
- Species exemplars: `packages/content/species-and-names/content/stuff/idea/species/cat.yaml`
  (the full dial set: `vitalProfile`, `adultMass: 4`, `lifespanMax`,
  `ageCurve`, `diet`, `olfactoryProfile`, `feedingStyle: [bowl, ground,
  hand]`, `handlingRange`, `biddability: 0.1`, `_defaultMaterialPath:
  /stuff/idea/material/tissue/flesh`); `hog.yaml` l.44 `butcheryYield:
  [{cut: /stuff/thing/items/stew-meat, units: 6}, {cut:
  /stuff/thing/items/prime-cut, units: 2}, {cut: /stuff/thing/items/offal,
  units: 2}]`. ⚠ The task brief's `suidae/sus/domesticus.yaml` is in
  **trade-ranching** and carries no yield; `hog.yaml` is the exemplar.
- The kept animal: `packages/server/src/mud/lib/creature/KeptAnimal.ts`
  (`PostRegistrationMixin` innermost — `docs/antipatterns.md` l.4929;
  `pinsResidency() → true`); the pack subclass precedent
  `packages/content/trade-ranching/src/agent/WorkingAnimal.ts` (`import {
  KeptAnimal } from '@saxonberg/server/mud/lib/creature/KeptAnimal'`;
  `HandledMixin(KeptAnimal)`). Agent row exemplar
  `packages/content/generic-objects/content/stuff/agent/cat.yaml`
  (`class: /platform/agent/KeptAnimal`, `handling: 0.25`, three
  `behaviors`).
- `packages/server/src/mud/lib/husbandry/Bonded.ts` — `FOLLOW_BOND 0.5`,
  `NAME_BOND 0.6`, `HOME_DAYS 3`; `offerRung(person)` (l.452) gates on
  `feedsBy('hand')`; `creditHomeCandidate(placeId, gameDay)` (l.567)
  sets `home` after `HOME_DAYS` distinct days; `postRegister` (l.381)
  warms the species and **seeds `home` to the birthplace** (l.423) — so
  `home !== ''` alone cannot mean "earned"; `getFollowedKeys()`;
  `commandContributions.peers` = pet/call/stay/name/offer (a static on
  the mixin). `feedsBy(style)` is `false` for a species declaring none.
- `packages/server/src/mud/platform/idea/cmd/social/NameController.ts`
  l.78–90 — the two gates in one sentence: `animal.bondWith(actor) <
  NAME_BOND || !followed` → `not-chosen`, *"It has not chosen you."*
- `packages/server/src/mud/platform/idea/cmd/inventory/OfferController.ts`
  l.73–120 — `offerRung`; `after-you-go` reason is `feedsBy('hand') ?
  'too-wild-for-a-hand' : 'no-hand-rung'`; `approach` starts
  `OfferEngagement` (`lib/husbandry/OfferEngagement.ts`, a
  `DurativeActivity` on `hands`, `getHost()` = the animal).
- `packages/server/src/mud/lib/behavior/feeds.ts` — `foodInVessel(here,
  host)` / `emptyFeeder(here, host)` scan `here` (the room's contents)
  for `isFeeder` of a kind the host `feedsBy`; a meal from a vessel
  credits `creditHomeCandidate(PersistableApi.placeIdOf(room), day)`
  with `day = floor(now / 86_400)` (`SECONDS_PER_GAME_DAY`, l.58). ⚠ The
  animal's own container is never considered a feeder.
- `packages/server/src/mud/lib/husbandry/Feeder.ts` (`feederKind`,
  `offerings()`, `lastFilledBy`, an *it is empty* augmenter) over the
  concrete `packages/server/src/mud/platform/thing/Feeder.ts` =
  `FeederMixin(BulkableMixin(ContainerMixin(DetailedMixin(Thing))))`.
  Row exemplar `packages/content/generic-objects/content/stuff/thing/vessel/saucer.yaml`
  (`feederKind: bowl`, `interiorBulk: true`, `interiorCapacity: 0.3`).
  A fish bowl is this class, one row, a bigger interior.
- `packages/server/scripts/check-kept-animals.ts` — three directions;
  only VESSEL rungs are checked against Feeder rows (l.227); a `Bonded`
  class's species must declare `biddability`.
- `packages/server/src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts`
  — enumerates every `fieldMeta` key with its reveal level and carries a
  review log; a new Species field is a diff to answer.

### Respiration and death

- `packages/server/src/mud/lib/respiration/Respiration.ts` —
  `resolveCurrentMedium()` (l.215): the engaged locomotion mode's
  `medium`, else `BiomeApi.resolveAtmosphereFor(self)`; **nothing looks
  at a vessel's interior liquid**. `getBreathableMedia()` (l.190) reads
  the body plan. `findWornAirSupply` (l.246) already matches
  `getBulkMaterial('interior')?.getName()` against the breathable set —
  so a medium is a **material NAME** (`'water'`). `reassess()` is called
  from `onTraversed` (l.394) and the drain/recovery ticks only; **a
  containment move does not re-check the medium**.
- `packages/server/src/mud/lib/spatial/Containable.ts` l.162 —
  `onMoved?(from, to)` post-move hook, fired by `ContainmentLogic`
  l.248; `lib/thermal/Thermal.ts` l.571 shows the chain-super shape.
- `packages/server/src/mud/platform/idea/api/BiomeLogic.ts` —
  `resolveStringFor` (l.793) → `runChainWalk` (l.964): `syncChainWalk`
  over per-detail / room-or-vessel `Atmospheric` overrides, then the
  zone, then the root biome; `stepOutward` (l.563) walks
  `getContainer()` while the ancestor is a `Container`. The atmosphere
  is a property of the AIR over a place; it is not the seam for
  immersion.
- Death of a non-player body: `packages/server/src/mud/platform/idea/api/ConditionLogic.ts`
  l.360–372 — the body **stays**, `setLifecycleState('dead')`,
  `markDeceasedAt(nowS)` (Postmortem clock). No `Corpse` is minted for
  an NPC or beast. `lib/mortality/Postmortem.ts` — `sinceDeath()`,
  `getDecayStage()` over `DECAY_STAGES = ['fresh','stale','decomposed','spent']`
  (`MortalArc.ts` l.58, one game-hour a stage); no `markupAugmenters`.
- `Creature` (`lib/creature/Creature.ts` l.134–180) composes Chattel,
  Branded, Postmortem, Concealable, LoadBearing, Container, Containable,
  …, Respiration, Metabolic, Vitals, Reserved, Organism. ⚠ Not
  `Contaminable`, not `Freshness`.

### Butchery, spoilage, the kitchen

- `packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`
  — gates: `isOrganism && isDead()` (`not-a-carcass`, l.114),
  `preloadAnatomy` + species (`unidentified-species`), `isSentient`
  (`sentient-corpse`), a bladed instrument (`blade` arg, `objects`,
  `requires: [ConstructedMixin]`), `getButcheryYield()` non-empty
  (`no-yield`); the cuts are cloned from `line.cut` (l.198), aged from
  `sinceDeath()` at the carcass's temperature (`ageAtKill`,
  `Freshness.advance(Freshness.inoculum(), agedS, material, carcassK)`,
  l.256), and gut-spilled by skill (`spillGut`); contamination lands on
  Contaminable hosts only (`isContaminable(onto)`, l.269). **The body's
  OWN pathogen load is never read** — a carcass cannot carry anything
  onto its cuts today. View: `packages/content/trade-cooking/content/trade/cooking/cmd/crafting/butcher.yaml`
  (`verbs: [butcher, dress]`, `body` arg `requires: any`).
- `packages/server/src/mud/platform/thing/Provision.ts` =
  `Crafted(Composed(Contaminable(Cured(ThermalDose(Freshness(Thermal(Detailed(Thing))))))))`.
  Rows: `packages/content/terminus/content/world/terminus/general-store/thing/rations.yaml`
  (`_materialPath: /stuff/idea/material/food/trail-ration`);
  `/stuff/thing/items/{stew-meat,prime-cut,offal}` (cited by yields).
- Material exemplar `packages/content/base-library/content/stuff/idea/material/food/trail-ration.yaml`
  (`ConsumableMaterial`: `density`, `edibility`, `tastes`,
  `spoilActivationEnergy`, `waterActivity`, `nutrients`, `tags: [food,
  preserved]`).
- `packages/content/trade-cooking/content/recipes/smoke-cure.yaml` —
  `inputSlots: [{slot: meat, category: meat, …}]`, output
  `/trade/cooking/thing/treated-cut`, `cure: {moisture: 0.55}`;
  `salt-cure.yaml`, `air-dry.yaml` the same family. **A material tagged
  `meat` is accepted by the shipped cure / smoke / dry rows with no new
  recipe.**
- `Freshness` statics (`lib/material/Freshness.ts`): `inoculum()`,
  `advance(load, elapsedS, material, tempK)`, `bandFor(load)`,
  `doseFor`, `isPerishable`. `lint:perishable` reads rows' `_materialPath`
  only (`scripts/check-perishable.ts` l.194); agent rows carry
  `_speciesPath` and are not in its scope.
- `Contaminable` (`lib/material/Contaminable.ts`): `getPathogenLoad()`,
  `transferContaminationTo(...)`; the roster is five `Condition` rows
  under `/platform/idea/Condition/pathogen/` — `e-coli` is the sewage
  organism (spoilage.md).

### Retail, banking, employment, identity

- `packages/server/src/mud/platform/thing/Stock.ts` — `stockLines`
  (`{itemTemplatePath, par, brandKey?}`), `prices` via `PricedOffer`,
  `postRegister → reset()`; `commandContributions.peers = [buy, consign,
  reclaim]` (l.87). Views in
  `packages/content/platform/content/platform/cmd/retail/` (`buy`,
  `check`, `consign`, `menu`, `order`, `reclaim`); **no `sell`**.
  `buy.yaml`'s `counter` arg (`default:
  "reachable:[mixin.ConsignmentShelfMixin]"`) is the declared-instrument
  shape. `BuyController` (`platform/idea/cmd/retail/BuyController.ts`).
- The store counter `packages/content/terminus/content/world/terminus/general-store/counter.yaml`
  (`stockLines` + `prices`, cross-pack paths are normal —
  `/system/arcana/thing/mana-cell`, `/trade/farming/thing/pot/small`);
  ⚠ `packages/content/terminus/src/__tests__/general-store-content.test.ts`
  l.134–200 — a class allowlist every shelf good must be on
  (`/platform/thing/Feeder` and `/platform/thing/Provision` are already
  there; a new class needs a line).
- `BankingApi` (`packages/server/src/mud/api/banking.ts`): `transfer`
  (l.270, *only from your own account*), `settle(charge, method)` (payer
  derived from execution context — the customer), `payWage(employerAccountId,
  workerKey, amount, category: PnlCategory = 'wages', memo)` (l.325,
  pays red by design), `payDraw` (solvency-checked), `ensureVenueAccount`.
  `LEDGER_KINDS` (`lib/banking/LedgerEntry.ts` l.48) includes
  `'payment'`; `PnlCategory` includes `'cogs'`. **No primitive pays a
  person for goods from a business account.**
- `EmploymentApi.ensureOperatorAt(fixturePath)`, `operatingAccountOf`,
  `ensurePayableWorker` (employment.md); the market business
  `packages/content/terminus/content/world/terminus/market/business.yaml`
  (`appointingAuthority: {kind: committee, parcel: /world/terminus/market}`,
  `positions: []`, `rosterSlots: []`, `banksAt: goodkin`,
  `operatingLocations: [/world/terminus/market/stalls]`); the baker
  `market/agent/baker.yaml` (`Cast`, `archetype: baker`, `prologue`,
  `competence`, `dispositions`, `introduces` on `witness:arrival`, `idles`
  on `cadence:38s`). Market dir: `agent/baker.yaml`, `bakery.yaml`,
  `business.yaml`, `idea/`, `square.yaml`, `stalls.yaml`,
  `thing/{bakery-shelf,bread-counter}.yaml`.
- `shifts` authored right: `packages/content/saxonberg-lounge/content/world/lounge/agent/mara.yaml`
  l.48 (`trigger: cadence:30s`, `config: {behindBar, offstage}`) with
  `…/lounge/location/offstage.yaml` (`/platform/location/Offstage`).
  ⚠ Authored wrong: `terminus/necropolis/agent/undertaker.yaml` l.30 and
  `terminus/infirmary/agent/physician.yaml` l.30 ship `shifts` with no
  `trigger:` — the defect not to repeat. **Terminus has no `Offstage`
  row.**
- An NPC row carries inventory through `props:` —
  `packages/content/eternal-university/content/world/eternal/duncan-hall/agent/katie.yaml`
  l.29 (`props: [/system/residence/thing/householders-kit]`).
- `packages/server/src/mud/platform/agent/Cast.ts` = `CastMixin(NPC)`;
  `lib/npc/NPC.ts` = `BehavedMixin(PostRegistrationMixin(Character))`,
  so a Cast is `Engaged` (Character) and `Behaved`. `talk.yaml`'s target
  `requires: BehavedMixin`; `TalkController` finds the `trigger: engage`
  spec and calls the brain's `open` (`lib/behavior/tree-dialogue.ts`
  l.44: validates the tree, needs both parties `Engaged`, declines a
  busy NPC, then hands a `DialogueConversation` the tree).
  `DialogueTree` guards are a fixed fact namespace (`regard`,
  `position:<org>`, `time:*`; `lib/npc/tree.ts` l.83–101); a `beat` is a
  plain string, not templated.
- `lint:dossiers` requires a `Cast` with a dossier to carry an
  `archetype:` — the value is an open string (`scripts/check-dossiers.ts`
  l.173); shipped values include `baker`, `undertaker`, `physician`,
  `teller`.
- Chronicle: `avatar.recordDeed({ template, vars, tags })` on the persona
  (`platform/idea/cmd/charactergen/EnrollController.ts` l.765).
  Advancement: `giver.creditDeed({ discipline, difficulty, outcome })`
  when `MixinApi.isAdvancing(giver)` (`trade-mining/src/idea/cmd/mining/HewController.ts`
  l.214; `Subcheck` in `lib/advancement/ActSignature.ts` l.64);
  `competenceBandFor(discipline)` is **async**; the **sync** read is
  `competenceDigestCached(): DisciplineBand[] | undefined`
  (`lib/advancement/Advancement.ts` l.548) — what a sync `look` augmenter
  can use. Discipline row exemplar
  `packages/content/trade-mining/content/trade/mining/idea/Discipline/mining.yaml`
  (`key`, `channel: skill`, `label`, `iscedf`, `description`, `requires:
  []`); the roster reserves `fishing`, ISCED 0831 (`docs/vocations.md`
  l.122 lists the fisher as designed).

### Activity, tools, seeds, verbs, gates

- `docs/subsystems/activity.md` — `DurativeActivity` vs
  `SustainedEngagement`; `emissions[{intervalMs, event}]` on game time,
  interval fixed at start; `SchedulerApi.start/cancel/complete` (l.159,
  165, 205 of `api/scheduler.ts`); `cancel <type>`. The sustained
  exemplar in a pack: `packages/content/transport/src/lib/journey/Journey.ts`
  (`implements SustainedEngagement`, `slots` = `hands`,
  `interruptibleBy = new Set()`, `emissions` with `intervalMs =
  TICK_GAME_MINUTES * 60 * 1000`, `getHost()`, `SchedulerApi.complete(this)`
  at l.324).
- `packages/server/src/mud/lib/craft/Tooled.ts` `ToolMixin` — fieldMeta
  `capabilities` only; **no `epoch`**. `origin/build/forestry`'s copy
  (l.40–77) adds `epoch: { persistent: true, authorable: true }`, `public
  epoch: string = ''`, `getEpoch()` / `setEpoch(value ?? '')` and the
  interface doc *"`prehistory · medieval · industrial · modern · future`
  or `''`"* (forestry-plan D16, unmerged).
- `packages/server/src/mud/lib/Seeded.ts` — the determinism primitive
  (`Seeded.unit(hash, salt)` etc.); the pack precedent
  `trade-ranching/src/lib/HeadSeed.ts` imports it by specifier.
- Verbs: `fish`, `set`, `lift`, `release`, `dig`, `reel`, `slack`
  are **unclaimed** in every `cmd/` view (checked whole-word across
  `packages/content/*/content`); `give` is `platform/cmd/inventory/give.yaml`
  (`verbs: [give, hand]`); `cast` is arcana's
  (`arcana/content/system/arcana/cmd/magic/cast.yaml`); `cancel` is
  `platform/cmd/system/cancel.yaml`; `put.yaml` target `requires:
  [VisibleMixin, ContainerMixin|SurfacedMixin]`; `get.yaml` item
  `requires: [VisibleMixin, ContainableMixin]`.
- `swim` mode: `packages/content/platform/content/platform/idea/LocomotionMode/swim.yaml`
  (`medium: water`, `requiresBodyPlanMode: [swim]`).
- Gates (`docs/lint-family.md`; 45 in `pnpm -C packages/server
  lint:family --list`): `lint:verb-collisions` (allowlist with reasons,
  `scripts/check-verb-collisions.ts` l.88), `lint:lib-statics`
  (`LIB_STATICS_CEILING = 337`, `scripts/check-lib-statics.ts` l.94,
  counts public statics on classes across the kernel's `lib/` +
  `platform/` **and every pack's `src/`** — ⭐ this build adds NO public
  static anywhere), `lint:instrument-args`, `lint:capabilities`,
  `lint:kept-animals`, `lint:perishable`, `lint:pathogens`,
  `lint:object-verbs`, `lint:whole-table`, `lint:world-scan`,
  `lint:test-content` (`test-content-allowlist.txt`), `lint:drive-scripts`
  (ceiling 0 on `scripts/drive-*.ts`), `lint:arg-kinds` (a pack mixin
  needs `static _mixinRefusal`), `lint:mixin-names`, `lint:instanceable`,
  `lint:census`, `lint:untitled`, `lint:identity`, `lint:dossiers`,
  `lint:unconsumed-seams`, `lint:binder-models`, `lint:gates`,
  `lint:imports`, `lint:module-scope`, `lint:field-meta`,
  `lint:test-bootstrap`.
- Wire drives: `packages/wire/tests/` — `pets-offer.dirty.wire.test.ts`
  (founder `reserve issue 500` + `drop coins` → `get coins` / `bank
  open` / `bank deposit coins` → `buy rations` ×3 at the store; wizard
  `eval --on cat` to skip game-days; `DIRTY_REASON` export;
  `declareFile({file, packs, dirtyReason})`), `work.dirty.wire.test.ts`
  (a fresh handle per run — `startLocation` is a birth setting).

---

**Read at the handoff (2026-09-18) — the two in-flight branches:**
`build/forestry` (W0–W6 + drive, 15/15, full suite green — expect it on
master before this build starts) and `design/nutrition-fitness` (a slate
only; cites the underwater design; touches nothing here). Forestry's
facts this plan leans on: its `Tooled.epoch` hunk is the one A3 pastes
verbatim (Risks 1); its stand is a *location* carrying a cover, NOT the
herdbook's consumer — ranching.md now says why (*a herd MOVES; a stand
does not*), and fish move, so D1's record is the consistent answer;
`check-template-census.ts` learned to walk array entries
(`mix[].speciesPath`) — B1 extends it the same way for `stocks[].species`;
`GrammarApi.inWords` exists for any count the prose must say;
⚠ and its last drive commit found the race this build's drive will hit
(B7).

## Plan-level decisions

Numbered so waves and commits can cite them. Each: the question, the
choice, the reason.

### D1 — the fishery record is the WATER pack's, keyed on the reach, state-only

**Question.** Where does the record live, and what does it hold?

**Choice.** A `FisheryRegistry` singleton `Idea` in the water pack —
class `packages/content/water/src/idea/FisheryRegistry.ts`
(`RegistrarMixin(Idea)`), row
`packages/content/water/content/system/water/idea/FisheryRegistry.yaml`
(`class: /system/water/idea/FisheryRegistry`, `data: {}`), reached by
`StuffApi.singleton('/system/water/idea/FisheryRegistry')`. Register
prefix `/system/water/fisheries`, owner `/system/water`, kind `fishery`
(the kernel `DocumentKinds` entry, D2). One document per reach at
`/system/water/fisheries/<courseKey>/<nodeName>`, **get-or-create on
first draw**, holding only what cannot derive:

```ts
interface FisheryRecord {
  reachRef: string;
  /** per species template path: fish drawn down and not yet recovered */
  drawn: Record<string, number>;
  /** game-seconds the drawn map was last reconciled */
  reconciledAtS: number;
}
```

Capacity is derived at every read (D3); `level = capacity − drawn`;
recovery is reconcile-on-read — `drawn` decays exponentially toward 0
with half-life `water.fishery.recoveryHalfLifeDays` (seed 2) — and is
**written only on a draw or a release**, never on a `look`. Reads on a
reach with no document derive against `drawn = {}` and write nothing,
which is what makes *every reach holds fish, unasked* true at zero cost.

**Why the water pack.** The record reads the catalogue, which the kernel
cannot import; two trades (fishing now, hunting later) will read the
record and have no common pack ancestor below `water`; and *a system is
true whether or not anyone participates* — fish are in the river
whether or not anybody fishes. `trade-fishing` depends on `water`; the
water pack learns nothing about fishing. Read-side verification is
mandatory (prefix + kind on every read, the herdbook's rule).

**Surface** (instance methods, no statics — `lint:lib-statics`):

- `standingAt(reachRef, nowS): Promise<FisheryStanding | null>` —
  `{ reachRef, species: Array<{ speciesPath, capacity, level, fit,
  stocked: boolean }>, flow: FlowReading, contamination:
  ContaminationReading, waterTempK }`. Pure derive; no write.
- `draw(reachRef, speciesPath, count, nowS): Promise<number>` — the
  count actually available (min of asked and level), written.
- `release(reachRef, speciesPath, count, nowS): Promise<void>`.
- `canEvict()` vetoes (the register's own rule).

Module-private in the same file: `pathOf`, `isRegistryPath`,
`recordOf` (parse-or-null), the fit arithmetic (D3).

### D2 — a `fishery` document kind, kernel

Add to `packages/server/src/mud/lib/document/DocumentKinds.ts`:

```ts
fishery: { kind: 'fishery', naturalKey: null, contentDir: 'fisheries', ext: 'yaml', onVanish: 'keep' },
```

with a doc comment in the `herd` / `water-right` voice: runtime-written,
path-keyed under `/system/water/fisheries/<course>/<node>` because a
basin's book is `list(prefix)`; `keep` because the record is what
happened to a reach. No pack ships one. No collection, no index
(path-keyed kinds get none), no `gen:schema`.

### D3 — capacity derives from habitat × composition; `stocks:` on the NODE overrides it

**Habitat** is a kernel `Species` field (D4): tolerances over the
closed water-parameter vocabulary. For each species row that authors
one, and each reach, the registry asks the species — `species.fitIn(
waterStateAt(reach, now))` — and the species answers by **the one law
every RGO shares** (decided with the user at the handoff; D22 says why):

```
f_p(x)   = 1 inside [min, max]; linear to 0 across `margin` beyond either bound
           (a toxin is a `max` with a margin — that IS a dose response; no second shape)
f_seas   = 1 in an authored season, 0 out (a window is a tolerance with no margin)
fit      = min over every parameter the habitat authors   — Liebig's minimum
limiting = the parameter at the minimum (null when fit = 1)
capacity = round(fit × abundance × water.fishery.reachLengthKm (seed 3))
```

An unauthored tolerance is factor 1 — soil's rule, *unmodelled is not
zero*. **Interactions live in the derivation of the state, never in the
combining rule** (warm water holds less oxygen: `oxygenMgL` is derived
from temperature, and the trout's oxygen tolerance does the rest). The
words the read uses — *fresh / brackish / salt*, *still / slow / fast* —
are presentation bands over the numbers, not a second vocabulary.

**The override.** `WatercourseNode` gains an optional
`stocks: Array<{ species: string; capacity: number }>` (water pack,
`Watercourse.ts` + the catalogue's node parse), surfaced on
`CompiledReach.stocks`. A stocked species' capacity is the authored
number regardless of fit, and `standingAt` marks it `stocked: true` so
the trade's prose can say so (*the water is stocked with pike*). No
shipped row authors one; the field is the aquaculture seam.

**Why not the zone's spawn `stocks:`** — that mints objects into rooms;
this is a population that never exists as objects until drawn.

### D4 — species habitat, and `'surface'` as a feeding rung (kernel `Species`)

`Species.ts` gains:

```ts
/** ⭐ The closed vocabulary of what a body of water REPORTS — a reach derives
 *  it (D22), a tank will ledger it. Adding a word here is a kernel MR. */
export const WATER_PARAMETERS = ['temperatureK', 'currentMps', 'salinityPpt',
  'oxygenMgL', 'pH', 'hardnessDgh', 'nitrateMgL', 'ammoniaMgL', 'nitriteMgL',
  'contamination'] as const;
export type WaterParameter = (typeof WATER_PARAMETERS)[number];
export type WaterState = Record<WaterParameter, number>;   // contamination = the shipped level
export interface Tolerance { min?: number; max?: number; margin?: number }  // an absent bound is unbounded
export const HABITAT_ROLES = ['bait', 'forage', 'predator', 'apex'] as const;
export interface Habitat {
  /** absent parameter = factor 1 (unmodelled is not zero) */
  tolerances: Partial<Record<WaterParameter, Tolerance>>;
  seasons?: Season[];                 // absent = all year
  role: HabitatRole;
  /** individuals per km of reach at perfect fit */
  abundance: number;
  /** 0..1 — what a hooked one does; drives the contest and the size band */
  fightRating: number;
}
protected habitat: Habitat | null = null;   // fieldMeta: persistent, authorable
getHabitat(); setHabitat(value)  // validates every parameter word and role; throws like setFeedingStyle
fitIn(state: WaterState): { fit: number; limiting: WaterParameter | null }  // D3's law; null habitat → fit 0
```

A species authors only what distinguishes it: the trout `temperatureK:
{ max: 291, margin: 4 }, oxygenMgL: { min: 7, margin: 2 }, currentMps:
{ min: 0.3, margin: 0.2 }`; the carp `temperatureK: { min: 283, margin:
5 }, oxygenMgL: { min: 3, margin: 2 }, currentMps: { max: 0.2, margin:
0.3 }`; the mullet and the crab `salinityPpt: { min: 5, margin: 5 }`; the
eel nothing but `contamination`. Every fish authors `ammoniaMgL: { max:
0.02, margin: 0.5 }` and `nitriteMgL` (the numbers a tank will one day
move); the contamination sensitivity of the first draft is `contamination:
{ max: 0, margin: 1 / sensitivity }`.

and `FEEDING_STYLES` gains `'surface'` (an animal in water that comes up
for the hand — not a vessel kind, so `FEEDER_KINDS` and
`lint:kept-animals`' vessel check are untouched). `BondedMixin` gains
`takesFromHand(): boolean` = `feedsBy('hand') || feedsBy('surface')`;
`offerRung` and `OfferController`'s reason line use it instead of
`feedsBy('hand')`.

Reveal: `habitat` is **level 0** in the spoiler snapshot with the reason
*natural history a player is meant to learn — the whole pedagogy claim
is that the distribution is derivable from it*; `fightRating` rides
inside it and is not a weakness.

### D5 — the bite is the fish's decision; one epistemic draw; the contest is pure

`trade-fishing/src/lib/FishingEngagement.ts` — `implements
SustainedEngagement`, `type = 'fishing'`, slot `hands`, `interruptibleBy`
empty, `cancelable`, `getHost()` = the rod. One emission every game
minute (`intervalMs = 60_000` game-ms, the Journey's constant shape).
Each tick:

1. asks the singleton `Waters` (D7) for the reach's standing and the
   feed factors — hour (dawn/dusk via `CelestialApi.solarAltitudeDeg`
   within ±10°: ×`fishing.bite.twilight` seed 1.8), weather (a `storm`
   or `rain` segment ×`fishing.bite.preStorm` seed 1.5, from
   `WeatherApi.sampleFor(room).type`), season (already in fit), bait
   match (`fishing.bite.match` seed 1.0 when the bait's kind suits the
   species' role — worm → forage/bait, baitfish → predator/apex, bare
   hook → 0.15 everywhere, crumbs → 0), tackle (`Rod.presentation`, a
   row number);
2. accumulates `pressure += Σ_species (level/capacity) × factors ×
   fishing.bite.ratePerMinute` (seed 0.12) — **deterministic**;
3. when `pressure ≥ 1`: **the one draw** — which species — by
   `Seeded.unit(hash(reachRef, engagementId, tickIndex))` weighted by
   each species' term (epistemic: what the water held under the hook was
   always going to be something); `pressure -= 1`;
4. the individual's `lengthM` is seeded from `(reachRef, speciesPath,
   drawnOrdinal)` around `Species.stature` (`0.6 … 1.6 ×`), and
   `fight = habitat.fightRating × (lengthM / stature)`;
5. `fight < fishing.contest.fighterAt` (seed 0.45) → **lands itself**:
   clone the species' agent row into the angler's hands, `draw(1)`,
   `creditDeed({discipline: 'fishing', difficulty: 'easy', outcome:
   'success'})`; the prose names the fish and its size in words, never
   a number. Otherwise the engagement enters `fighting` with a fresh
   `LandingContest`.

A tick with no bite prints **nothing** (*every refusal is silence*).

`trade-fishing/src/lib/LandingContest.ts` — a value object, **instance
methods only**, no randomness: state `{ line ∈ [0,1] (out), strain ∈
[0,1], stamina ∈ [0,1] }` seeded from `fight`; `reel()`: `line -= gain`,
`strain += reelStrain × stamina`; `slack()`: `strain -= relief`, `line +=
run × stamina`; `tick()` (each game minute): `stamina -= tire ×
strain`, `strain += pull × stamina`, and if `strain ≤ 0` for two ticks
the hook is **thrown**. Outcomes: `landed` when `line ≤ 0 && stamina ≤
landAt`; `snapped` when `strain ≥ rod.breakStrain`; `thrown` as above.
Dials `fishing.contest.*` with seeds chosen so that **two `reel`s inside
one tick at full stamina snap a fighter** and a patient alternation
lands it in 4–8 ticks. `reel` / `slack` verbs act on the actor's
`fishing` engagement (`getEngagementByType`); a snap ends the
engagement (`SchedulerApi.complete`) with the rod intact and
`creditDeed(…, outcome: 'failure')`, and the message names what the
reach holds in bands, not what the player did wrong. Landing a fighter
credits `difficulty: 'standard'` (`'hard'` for an apex).

An apex landed or released is a chronicle deed
(`giver.recordDeed({ template: "Landed a {{species}} at {{reach}}.",
tags: ['fishing', 'landmark'] })` / `"Released …"`).

### D6 — the individual is a pack `Fish` class over `KeptAnimal`, alive until it is not

`trade-fishing/src/agent/Fish.ts`:

```ts
const FishBase = ContaminableMixin(KeptAnimal);
export default class Fish extends FishBase {
  static commandContributions = { peers: ['trade/fishing/cmd/fishing/release.yaml'], self: [], environment: [] };
  static markupAugmenters = [sizeLine, turnedLine];
  static fieldMeta = { lengthM: { persistent: true } };
  public lengthM = 0;  getLengthM / setLengthM
  sizeWords(): string   // 'a finger long' … 'longer than your arm', from lengthM
}
```

Six agent rows under `/trade/fishing/agent/{brown-trout,eel,grey-mullet,carp,shore-crab,sturgeon}`
(`class: /trade/fishing/agent/Fish`, `_speciesPath`, `handling`, a
`feeds` brain at `cadence:60s`; ⚠ no `follows`, no `homes` — a fish
does not walk). The landed fish is **alive**: moving it into a hand
re-checks its medium (D8), the crisis drain runs, and it dies in the
shipped `DYING_WINDOW` — `lifecycleState: dead`, Postmortem clock
started — after which `butcher` works on it (`isOrganism && isDead`).
Killing is not a fishing verb.

`turnedLine` renders, for a dead fish, the Freshness band derived from
the Postmortem clock (D9) in the shipped band words; `sizeLine` renders
`sizeWords()`. Neither prints a number.

**Why `KeptAnimal`.** The requirement *a kept fish is a kept animal in a
bowl* wants the Bonded / Persistable / pins-residency stack exactly; a
`Creature` subclass would re-derive it. **What composing `Contaminable`
here claims:** every fish can carry a pathogen load — true of a fish and
of nothing else `KeptAnimal` instances (the cat, the collie, the canary
stay clean). Not on `KeptAnimal`, not on `Creature` (the spoilage doc's
`Weapon` lesson).

### D7 — the trade's shared logic is a singleton `Idea`, not statics

`trade-fishing/src/idea/Waters.ts` at `/trade/fishing/idea/Waters`
(row `content/trade/fishing/idea/Waters.yaml`, `data: {}`; reached by
`StuffApi.singleton`). Instance methods: `reachAt(room): Promise<string
| null>` (the covering Locality's `getReach()` via
`AddressApi.resolveLocalityFor` — the fallback when no feature is bound),
`registry()` (the water pack's `FisheryRegistry` by path, duck-typed as
`GristMill` types the catalogue), `standingFor(reachRef, nowS)`,
`feedFactorsAt(room, nowS)`, `speciesFor(reachRef)`, `bandOf(viewer):
CompetenceBandName` (sync, from `competenceDigestCached()` for the
`fishing` Discipline, floor when undefined). ⭐ `readFor(standing, band):
string[]` — the banded prose (*"there are eels in this water, and
something large"*; `fished out` when every level is under
`water.fishery.read.emptyBelow`; the apex named *a royal fish* only at
`practised+`) — lives on the **`FisheryRegistry`** (B1), because the
`Shore` that renders it is the water pack's (D15) and a system pack
imports nothing of a trade. This is where the trade's
world-level arithmetic goes so no `lib/` value class grows a static
(`LIB_STATICS_CEILING = 337` may not rise).

### D8 — immersion: a body inside a vessel of liquid breathes the liquid (kernel `Respiration`)

Two changes in `lib/respiration/Respiration.ts`, no change in
`BiomeLogic`:

1. `resolveCurrentMedium()` gains an **immersion step** between the
   engaged mode and the atmosphere: walk `getContainer()` outward from
   the body; the first ancestor that `MixinApi.isBulkable` with
   `getBulkAmount('interior').rawValue() > 0` answers
   `getBulkMaterial('interior')!.getName()`. A carp in a bowl of water
   breathes `water`; a man in a vat of ale does not breathe; a fish in a
   bowl of *fouled water* does not breathe either (the material name is
   `fouled water`), which is the honest answer.
2. `onMoved(from, to)` — implemented on the mixin (chaining a base
   `onMoved` first, the `Thermal.ts` l.571 shape) → `void
   this.reassess()`. Every containment move re-checks the medium: the
   landed fish starts drowning in the hand, stops in the bowl, and a
   person carried into a flooded cell is not exempt.

**Why here and not the atmosphere chain.** The atmosphere is the air
over a place (temperature, pressure, humidity ride the same walk);
immersion is the body's immediate medium and only respiration asks.
Putting it in `syncChainWalk` would make `resolveTemperatureFor` read a
vessel's water as the room's air. **What the change claims:** every
respiring body inside a liquid-holding vessel is immersed — true.

### D9 — a dead body's flesh spoils on the shipped law (kernel `Postmortem`)

`lib/mortality/Postmortem.ts` gains `freshnessLoad(): number` =
`Freshness.advance(Freshness.inoculum(), sinceDeath() ?? 0,
<the organism's default material>, Freshness.hostTemperatureK(this))` —
exactly the arithmetic `ButcherController.ageAtKill` runs on a cut,
now answered by the carcass itself so the consignment refusal (D11) and
the `Fish` augmenter read one number. No augmenter on `Postmortem` (a player's
corpse keeps its shipped prose). **Claims:** every dead creature's
flesh has a spoilage state — true.

### D10 — the naming gate for an animal that cannot follow (kernel `Bonded` + `NameController`)

`BondedMixin` gains a persistent `homeEarnedDay = -1`, written by
`creditHomeCandidate` at the moment `home` moves (the seeded birthplace
never sets it), and `hasChosen(person): boolean` =

```
bondWith(person) ≥ NAME_BOND
  && ( getFollowedKeys().includes(key(person))
       || (homeEarnedDay ≥ 0 && home === PersistableApi.placeIdOf(getContainer())) )
```

`NameController` replaces its inline two-gate check with
`animal.hasChosen(actor)`; the refusal sentence is unchanged. ⚠ This
**widens the cat's gate too**: a stray fed from a bowl in one room for
three game days can be named there without ever following — which is
the requirements' own sentence (*the other route home the pets build
already has*) and is recorded in § Risks & opens for the user's eye.
No species flag, no locomotion read.

`feeds.ts` gains one line of scope: the host's **own container**, when
it is a Feeder of the host's rung, is a feeder — an animal living in its
bowl eats from it and earns its home there. (**Claims:** an animal inside
a feeder feeds from it — a bird in a hopper does.)

### D11 — the fish stall is a consignment counter, not a buyer (no `sell`)

⭐ **Decided with the user at the handoff:** nobody pays anyone. The
market's shipped pattern is consignment — `consign mullet --ask 4` moves
**custody** to the stall's shelf while the owner-stamp stays put; a
*buyer's* `buy` settles the ask, splits the remainder to the consignor's
primary account and leaves the stall its commission
(`retail.consignment.commissionRate`); `reclaim` takes an unsold fish
back. Coin only moves when a buyer moves it — *"coin circulates; there
is no faucet"* is literally true, and the business earns its commission
instead of running red. `Stock` already composes `ConsignmentShelfMixin`
(`platform/thing/Stock.ts` l.54), so the stall is a `/platform/thing/Stock`
row with `stockLines: []` and needs **no kernel verb, no `purchaseLines`,
no `BankingApi.payForGoods`** — the buy-side the first draft of this
plan minted is gone.

The one kernel change: **`consign` refuses a turned good.** In
`platform/idea/cmd/retail/ConsignController.ts`, before the stack split
(the last gate), reject with `controller-rejected` reason `turned` when
the item is a `Provision` whose Freshness band is `turned`, or a
`Postmortem` body whose `Freshness.bandFor(freshnessLoad())` (D9) is
`turned`. A live fish is fresh. This is a rule of every shelf, not the
fish stall's — no shopkeeper lists a turned loaf either — so it needs
no hook, no subclass and no data; a *state* read, not a host narrowing.
An unbanked consignor is already refused by the shipped controller (the
Goodkin nudge).

**What the fishmonger does:** keeps the stall (D17) — the roster, the
shift, `appoint`. The stall authors `staffingPolicy: self-service` like
the general-store counter so a monger's absence never blocks a
consignment (Risks 23).

**What the drive proves (steps 11–12):** a fresh mullet consigned at an
ask is listed; a second character buys it and the consignor's balance
rises by the ask less the commission; a fish held a game-day is refused
`turned`.

### D12 — `dig` for bait costs the soil something

`trade-fishing/src/thing/Trowel.ts` (`DurableMixin(ToolMixin(DetailedMixin(Thing)))`,
row `/trade/fishing/thing/trowel`, `capabilities: [digging]`, `epoch:
medieval`) affords `dig` (`peers` + `environment`). `dig [<ground>]`:
ground arg `default: "reachable:[mixin.CultivableMixin]"`, `requires:
[CultivableMixin]`; a 2-game-minute `DurativeActivity` on `hands`; at
completion draws `fishing.dig.organicPerWorm` (seed 0.05) from the
ground's `organicMatter` reserve (`SOIL_ORGANIC_MATTER_RESERVE_KEY`,
`lib/husbandry/Soil.ts`) and clones one `/trade/fishing/thing/worm`
(class `/trade/fishing/thing/Bait`, `baitKind: worm`) into the hand;
refuses `worked-out` when the reserve is at floor. The store also sells
worms (`Bait` admitted to the goods allowlist). No new state anywhere:
the soil's own ledger is the cooldown.

### D13 — `set` / `lift`: one `Trap` class, two rows, reconcile at lift

`trade-fishing/src/thing/Trap.ts` (`DurableMixin(ToolMixin(DetailedMixin(Thing)))`)
with fields `drawPerHour`, `takesRoles: HabitatRole[]`, `capacity`,
`epoch`, and runtime-state `setAtS`, `setReach`, `setBy` (persistent —
a set trap survives a bounce). Rows `/trade/fishing/thing/{pot,net}`
differ by numbers only: the pot `drawPerHour 0.4`, `takesRoles: [bait,
forage]`, `capacity 2`; the net `drawPerHour 6`, every role, `capacity
12`. `set <trap> [at <shore>]` moves it from the hand to the room,
stamps `setAtS`/`setReach` (the bound shore's reach or `Waters.reachAt`),
sets `fixedInPlace = true` and vetoes eviction while set (`canEvict`,
the `Vehicular` precedent). `lift <trap>` integrates the elapsed
game-hours against the record — `expected = Σ_species min(level,
drawPerHour × hours × level/capacity) over takesRoles`, capped by
`capacity`; `floor(expected)` fish, the fraction decided by one seeded
unit — clones them into the lifter's hands, `draw`s them, clears the
stamps. No skill credit, no engagement, no tick.

### D14 — the tackle carries an epoch now

`ToolMixin` gains `epoch` **byte-identical** to `origin/build/forestry`'s
`lib/craft/Tooled.ts` (interface doc, `fieldMeta` line, field, getter,
setter). Whichever branch merges second sees an identical hunk. Rows:
rod, pot, net, trowel author `epoch: medieval`. Knowingly unread
(forestry D16); its reader is the covenant.

### D15 — the fishable feature is the water pack's `Shore`; the locality is the fallback

⭐ **Decided with the user at the handoff: `Shore` is the water system's,
not the trade's.** A riverbank is there whether or not anyone fishes —
the `/system/` test — and the record it reads (D1) is already the water
pack's. `packages/content/water/src/thing/Shore.ts` at
`/system/water/thing/Shore` (`DetailedMixin(Thing)`, `fixedInPlace`,
persistent+authorable `reachRef`, `getReachRef()`, a sync `waterRead`
augmenter over a memo refreshed fire-and-forget at `postRegister` and on
every render — the `GristMill` shape). The augmenter prints the physical
read for everyone (the reach's name, width in words, flow band, *the
outfall discharges into this water* when `contamination.level > 0` — a
fact about the map, not a hazard readout) and the fishery read
(`FisheryRegistry.readFor`, D7) at the viewer's band in **whatever
Discipline `water.fishery.readDiscipline` names** (the water pack's
`content/settings/water.yaml`; default `/trade/fishing/idea/Discipline/fishing`).
The code knows *a Discipline path*, never the word fishing; when the
row the setting names is not installed, the band is the floor and the
read is physical only — honest for a realm with water and no fishing
trade. Rows: `/world/terminus/wharfside/thing/river-edge` (`reachRef:
kestrel:confluence`, `props:` on `bank.yaml`) and `/world/moor/heath-mere`
(`reachRef: holloway:head`, `props:` on `stormy-heath.yaml`).

The verbs take `shore` as a **declared arg** (`default:
"reachable:[class.Shore]"`, optional); when unbound the controller asks
`Waters.reachAt(room)` — the Locality's reach — which is how the
millsite fishes with no row and no code. ⚠ Wharfside has no locality
reach (Grounding), so its `Shore` is what makes `fish` possible there.

**Cost:** none in the dependency graph — `terminus` and `world-seed`
already depend on `@saxonberg/content-water`; only `terminus` gains
`trade-fishing` (the fisher's rod, the store's tackle lines).
`world-seed` stays a realm seed with no trade dependency.

### D16 — the fisher fishes bare-hook, catch-and-release, on his own cadence

`trade-fishing/src/behavior/fishes.ts` (`claims: ['hands']`,
`requiresFree`, `trigger: cadence:<n>s`, config `{ shore: <path> }`):
each beat, if no `fishing` engagement is live, starts one with the rod
in his own inventory (`host.getContents()` is the ask-the-owner rung)
and no bait; the engagement's landing path, when the actor is not a
player, releases the fish at once (`registry.release`) and speaks one
line. He draws from the same record through the same engagement, so a
netted-out reach is a reach he sits at all day with nothing on the
line. No creel, no faucet, no memory. Bare-hook take is honest and
small (`fishing.bite.match` 0.15).

`trade-fishing/src/behavior/reads-water.ts` — the mentor: `trigger:
engage`, `open(args)` builds a `DialogueTree` **from the record**
(`Waters.standingFor` + the registry's `readFor` at the *practised*
band) and hands it
to `DialogueConversation` exactly as `tree-dialogue.open` does (import
`DialogueConversation`, `DIALOGUE_CONVERSATION_TYPE` from
`@saxonberg/server/mud/lib/npc/DialogueConversation`). The config
carries the man's **lines**, keyed by what the record says —
`{ empty: "…nothing in it. Nothing.", thin: "…", holds: "Eels run on
the ebb. {{read}}", apex: "The big one lies under the far bank." }` —
and the mechanism chooses which; `{{read}}` is replaced by the banded
species list. When the reach is empty he says so and *nothing about who
did it* (the record holds no names).

### D17 — the fishmonger is the baker's shape plus a shift

`market/business.yaml` gains `positions: [{ key: monger, label:
"keeping the fish stall", noun: fishmonger, wageRate: 4, confers: [] }]`,
`rosterSlots: [{ positionKey: monger, assignee:
/world/terminus/market/agent/fishmonger, schedule: [{ days:
[0,1,2,3,4,5,6], hours: [5, 14] }] }]`, `operatingLocations` +
`/world/terminus/market/thing/fish-stall`. `market/thing/fish-stall.yaml`
is a `/platform/thing/Stock` with `stockLines: []`, `staffingPolicy:
self-service`, `businessPath`, `props:` onto `stalls.yaml` — a
consignment counter (D11). `market/agent/fishmonger.yaml` is a `Cast`
(`archetype: fishmonger`, dossier, `introduces` on `witness:arrival`,
`shifts` on `cadence:30s` with `{ behindBar: /world/terminus/market/stalls,
offstage: /world/terminus/market/offstage }`) and
`market/offstage.yaml` is the market's `Offstage` row (terminus has
none). `appoint <player> to monger at /world/terminus/market/business`
works through the committee authority the row already declares.

### D18 — species and materials are commons rows shipped by the trade

Six species under `/stuff/idea/species/` (the pig precedent: a trade
ships commons species under species-and-names' claim): `brown-trout`,
`eel`, `grey-mullet`, `carp`, `shore-crab`, `sturgeon`. Each authors the
cat's dial set with `_bodyPlanPath: /stuff/idea/species/BodyPlan/fish`
(the crab: `…/BodyPlan/crustacean`), `_defaultMaterialPath:
/stuff/idea/material/food/fish-flesh`, `habitat`, `biddability: 0`
(`lint:kept-animals`), `handlingRange` (carp `{0.1, 0.6}`; the rest
`{0, 0.15}`), `feedingStyle` (carp `[surface]`; the rest none),
`butcheryYield` (fillet, roe, offal — **no bone or skin row exists**
in any pack, so those two cuts are the noun wave's and the yield stops
at three), `adultMass`, `stature`,
`olfactoryProfile: { acuity: dull }`. Habitats:

| species | temperatureK | oxygenMgL | currentMps | salinityPpt | seasons | role | abundance | fight |
|---|---|---|---|---|---|---|---|---|
| brown-trout | 275–288 m4 | min 7 m2 | min 0.3 m0.2 | max 0.5 m2 | all | predator | 40 | 0.5 |
| eel | 278–295 m4 | min 3 m2 | — | — | spring·summer·fall | forage | 60 | 0.35 |
| grey-mullet | 283–298 m4 | min 4 m2 | max 0.5 m0.3 | min 5 m5 | spring·summer·fall | forage | 80 | 0.4 |
| carp | 285–300 m5 | min 3 m2 | max 0.2 m0.3 | max 2 m3 | all | forage | 50 | 0.3 |
| shore-crab | 278–298 m4 | min 3 m2 | max 0.5 m0.3 | min 5 m5 | all | bait | 120 | 0.1 |
| sturgeon | 280–294 m4 | min 5 m2 | max 0.5 m0.5 | min 2 m3 | spring·summer | apex | 2 | 1.0 |

(`m` = margin; every row also authors `ammoniaMgL: { max: 0.02, margin:
0.5 }`, `nitriteMgL: { max: 0.1, margin: 1 }` and `contamination` as D4
says — the tank's numbers, inert in a river.) Read against D22's
derivations:
the confluence (30 m, brackish, 90 m wide, slow, hard) holds mullet,
eel, crab, carp and the sturgeon; the Holloway head (1100 m, fresh,
fast, cold, soft and acid) holds trout and nothing else; the Delight
flats (180 m, fresh, 22 m, moderate-to-slow, the highest nitrate) holds
trout and carp. The species test asserts these three outcomes from the
rows and the law, never from a table. Two `BodyPlan` rows
(`fish`: `breathableMedia: [water]`, `locomotionModes: [swim]`,
minimal slots, copied from `avian.yaml`'s shape; `crustacean`:
`breathableMedia: [water, air]`). One material
`/stuff/idea/material/food/fish-flesh` (`ConsumableMaterial`; `tags:
[food, meat, fish]` — `meat` is what lets the shipped cure / smoke / dry
rows accept a fillet unchanged; `spoilActivationEnergy: 60000`,
`waterActivity: 0.99`, `tastes: [umami, salty]`, `nutrients` protein +
fat). Two Provision rows `/trade/fishing/thing/{fillet,roe}` over it;
offal is the shipped `/stuff/thing/items/offal`.

### D19 — the verb `give` collides; the contest verbs are `reel` and `slack`

`give` is `platform/cmd/inventory/give.yaml` and `lint:verb-collisions`
refuses a second view; the requirements' contest pair ships as `reel` /
`slack` (`slack` is what an angler says). The requirements doc was
edited to `slack` at the handoff, so the two agree.

### D20 — what the kitchen gets: butchery carries the body's own load

`ButcherController` (trade-cooking): after `ageAtKill` and before
`spillGut`, `if (MixinApi.isContaminable(body))
body.transferContaminationTo(cut)` — the carcass's own load rides onto
every cut. A fish landed at the confluence is stamped at landing with
`e-coli` at `contamination.byKind.organic × fishing.contamination.loadPerUnit`
(seed 2.0, tuned so the drive's confluence fish meets the roster's
`infectiousDose` raw and not after a `sear`) — `Fish.setPathogenLoad`
through the Contaminable surface. *Look at it says nothing*: the mixin
ships no augmenter. **What the trade-cooking edit claims:** any
Contaminable carcass carries what it carries onto its meat — true, and
today no carcass is Contaminable but a fish.

### D21 — the drive is a dirty wire file

`packages/wire/tests/fishing.dirty.wire.test.ts`, exporting
`DIRTY_REASON` (issues coin, buys tackle, draws fish down, names a carp,
sells a fish). Two sessions plus a wizard: the founder-coin → bank → buy
pattern from `pets-offer`; game-day skips by `eval`; the restart step
(Barnaby in his bowl) and the third session at the millsite are run and
recorded in § Drive record by hand. The requirements' step 10 (*the room
below the outfall*) is run **at the bank** — the confluence reach is the
outfall's reach (Grounding) — and its raw meal is the raw **fillet**
after `butcher`, because a whole fish is a body, not food.

### D23 — decisions the build made (recorded for the review)

Each decided by the order the build skill names — requirements, plan,
lenses, conventions, the nearest pattern — and none stopped for.

1. **`fitIn(state, season?)`** — the season is an argument, not read
   inside the species, so the species stays pure over its inputs;
   `limiting` widened to include `'season'`.
2. **`homeKeyOf(container)`** — a stamped chattel is a home by its
   chattel id (`placeIdOf` answers a Thing with its template path, so
   every fish bowl was one home); rooms unchanged.
3. **Immersion is exempt from the unknown-medium exemption** — a liquid
   a body sits in is a liquid whether or not the biome table names it.
4. **The epoch is forestry's closed vocabulary** — three files taken
   byte-identical from `origin/build/forestry` at `b1177185d`.
5. **"Turned" = past `fresh`** — the shipped band vocabulary has no
   `turned`; `Bonded.wouldEat`'s rule, so an animal and a shelf agree.
6. **Hydraulic geometry** for an unauthored channel width or depth; the
   `water.reach.meanDepthM` dial is gone.
7. **One-kilometre reaches** (`reachLengthKm` 1, not 3) and a sixty-fish
   net — the requirements' *afternoon* was unreachable at 800 fish.
8. **`lay`, not `set`** — `set` is a scripting builtin; the collision
   gate now knows the builtins.
9. **`peers` affordances reach one level into an open container**, both
   ways — the kernel walk matches the `peers` scope (nearest pattern:
   `scope-walk.ts` already did this).
10. **The wait ends at a landing**; **the species draw is weighted by
    level** (how many), the pressure by fullness (how full).
11. **The band words read `level / full`** (the capacity at a perfect
    fit), so *a few carp* beside *too much salt for carp*.
12. **The read is on `look <shore keyword>`**, not the room's `look` — a
    prop contributes nothing to its room's prose; a hook is a sweep
    finding. `water` and `mere` are room details too (a prompt).
13. **The intake and the outfall are `on: true`** — the Kestrel below
    Terminus had never been fouled (a shipped defect the AC depends on).
14. **`witness:arrival` → `arrival`** on five rows, three of them shipped
    with an `introduces` that never fired (two in `hearts-delight`, a
    pack this build otherwise leaves alone — a one-word trigger fix is
    not fishing content).
15. **The carp's handling ceiling is 0.75** (was 0.6): naming wants a
    bond of 0.6 and the bond is regard × handling.
16. **Contest dials** retuned from a simulation; **`lineWords()`** on
    reel/slack so the lesson is learnable.
17. **The species `name`** on a standing is the row's first common name.
18. **The drive skips game time on the OBJECT that carries the clock**
    (a net's set stamp, a fish's death stamp, a carp's fed days) and turns
    two dials for the reads (`water.fishery.recoveryHalfLifeDays`,
    `freshness.band.taintedAt`), never the world clock; the wizard biases
    the draw by `setHabitat` on the species singleton through `eval`.
19. **Each worktree owns a `WIRE_PORT`** (build-2 = 2013): two owned
    boots on 2012 attach to each other's world and kill each other's
    server.

### D24 — `dig` withdrawn in review: digging is foraging's act, not fishing's

Decided with the user 2026-09-21 on the open MR. Digging something out of
the ground for food or use is not a fishing concern; it is the nearest
thing to foraging, which is unbuilt and waiting on the RGO designs
(`discovery-slate`). Cut: the `dig` view + `DigController` (+ its row),
`Trowel` (class, row, the store's line and price), the
`fishing.dig.organicPerWorm` dial, and the kernel seam
`Soil.drawOrganicMatter` (a method with no consumer is inert — it comes
back with foraging). D12 stays in the plan as history; its design (the
ground's own ledger is the cooldown; the instrument affords, the ground
is the argument, the yield is the ground's to say) is recorded on the
discovery slate. Worms are bought — which is what the drive always did.
The alternative — a platform `dig` whose yield the ground declares —
*is* the foraging build's distribution table, and does not get built
inside a fishing MR to keep one verb.

### D25 — `haul`, not `lift`: the barbell got there first

At the catch-up merge from master (2026-09-21) `lint:verb-collisions`
failed: the nutrition build (MR !269) shipped `device/lift` — *lift a
chosen load on a load device* — and two views on one verb shadow each
other silently. Fishing's is the newcomer, so fishing's renamed:
**`lay` / `haul`** (`HaulController`, `haul.yaml`; you *haul* pots and
*haul in* a net). Prose, tests and the drive follow; `Trap.markLifted()`
keeps its name — it describes the act, not the verb. Recorded here
rather than rewritten through the waves, as `set` → `lay` was.

### D26 — the rig, the lure, the keepnet: how rich the tackle is (review, B8)

Decided with the user 2026-09-21 on the open MR, through the five
lenses: *"this build doesn't seem to ship much of any of it — how rich
do we want this experience?"* The first cut had three tackle dials
(`showing`, `breakStrain`, `baitKind`) and content that turned none of
them; the read told you *eels on the bottom, a sturgeon in the deep*
and nothing on the angler's side could act on either sentence — the
lesson was written on one side of the water only (lens 1).

**The rule: richness lands as numbers on the tackle that the bite
reads, coupled by the rows, and every real-world item either maps to
one or does not exist** (lens 2 — expression is inelastic; an item with
no decision behind it is inventory clutter):

| the thing | what it honestly is | shipped as |
|---|---|---|
| line test | `breakStrain` — already there, unauthored | turned on the rows |
| hook size | selectivity: a fish shorter than 8 × the gape nibbles and is gone, silently | `Rod.hookGapeM` |
| bobber / weights | *where you present* against *where it feeds* | `Rod.presentsAt` × kernel `Habitat.feedsAt` (surface · mid · bottom) — same layer 1, one over 0.5, across the column 0.1; unauthored feeds anywhere |
| lure vs bait | not eaten, *worked*: draws predators only while `reel`ed within two ticks; survives the take | `baitKind: lure`, the tin spoon; `FishingEngagement.work()` on `reel` with nothing on |
| a caught baitfish | the requirements promised it and the types forbade it (`bait instanceof Bait`) | a `Fish` ≤ 0.25 m on the hook reads as `baitfish`; bread (`hasMaterialTag('bread')`) as `crumbs` |
| the stringer / keepnet | a vessel IN the water, the immersion read already shipped | `Trap = BulkableMixin(ContainerMixin(ToolItem))`; a laid trap with an interior fills with the reach's water on `lay`, drains on `haul`, hands its contents over; the keepnet is a Trap row with `drawPerHour: 0` |
| swivels · hook numbers · poundage · a separate line object | nothing a player acts on; the line is the rod row's `breakStrain` — one thing in hand | never |

The coupling that makes it a choice (lens 4): the float rod is fine,
shows well, parts easily, surface, small hook; the leger rod is heavy,
shows poorly, holds the sturgeon, bottom, big hook; the cane rod is
between. You choose it for what you are fishing FOR. The keepnet is the
honesty fix (lens 3): a landed fish drowned in the hand and only a bowl
stopped it — keep or let go is the angler's now, not the clock's.

Kernel: `Habitat.feedsAt?: WaterLayer` + `WATER_LAYERS` (Species.ts),
carried onto the water pack's standing. ⚠ Not the pet `feedingStyle`
rung (that is how an animal takes food from a PERSON); where a hook
finds a fish is a habitat fact. The carp authors both — `surface` for
the hand, `bottom` for the hook — and they do not collide.

---

### D22 — the reach reports every parameter a tank will ever hold (water pack)

⭐ **Decided with the user at the handoff.** After the RGOs are all built
they get unified along whatever fault lines emerge; the fault lines are
already visible — a field's medium is *seeded* (`GroundCharacter`), a
reach's is *derived* (topology + weather), a tank's will be *made* (a
ledger the keeper moves) — and the plan does not pre-unify them. What it
does is refuse to let the aquarium build reopen the wild water: **every
parameter a tank will ledger is reported by a reach now**, the species
tolerances are authored against the same words now, and the fit and its
limiting factor are the species' own method now. The tank build's kernel
work is then the *vessel's* ledger producing a `WaterState` and
respiration reading it — no reach, no species row, no law is touched.

**Why one law, and why Liebig.** Three candidates: the product of factors
(the first draft), Liebig's minimum, and an unweighted mean. The minimum
wins on the ground every RGO shares:

1. it is the law husbandry already teaches (`satWater/satLight/satRoot` →
   the minimum), so a farmer, an angler and an aquarist learn one rule;
2. ⭐ it always **names** the limiter — *the water is too warm for trout
   this month* — and that sentence is the whole pedagogy of both the
   field and the tank (find the worst thing, fix it; the mirror shows
   you). A product cannot say which factor, a mean hides it;
3. stacked mild stresses do not compound to death (five factors at 0.8
   are 0.33 under a product and 0.8 under the minimum); organisms mostly
   die of one thing;
4. fixing the limiter always moves the number — the improvement is
   legible;
5. the mine's binary breathability is the same rule at 0/1, so the
   respiration read of a foul tank later is the same law again.

Where the minimum is honestly wrong — independent mortality *events*
(disease, predation) — those are events, not fit, exactly as spoilage
is a clock and contamination an event.

**The reach's side.** `WatercourseCatalogue` gains `waterStateAt(reachRef,
nowS): WaterState`, pure derive:

| parameter | v1 derivation | the seam it leaves |
|---|---|---|
| `temperatureK` | `airTemperatureKAt` (no thermocline) | the underwater slate's depth |
| `currentMps` | `flow.m3s / (channelWidthM × meanDepthM)`, `meanDepthM` authorable on the node, seed `water.reach.meanDepthM` 1.0 | — |
| `salinityPpt` | 33 at elevation 0; seed 15 where `depthToSea ≤ 1` below `water.fishery.brackishBelowM`; else 0.3 | the tide clock replaces this one function |
| `oxygenMgL` | saturation at temperature (seeded two-point table, 14.6 at 273 K → 7.5 at 303 K) × a turbulence factor by current band (still 0.8 … fast 1.0) | — |
| `pH`, `hardnessDgh` | **seeded on the course row** — `water: { pH, hardnessDgh, nitrateMgL }` on `Watercourse`, every node inherits; **flow-weighted at a confluence** where the catalogue already sums flow | the join to the catchment's `GroundCharacter` (the moor's peat is soft and acid; the ore country's limestone hard and alkaline) |
| `nitrateMgL` | the course seed, flow-weighted; the Delight (the farming valley) authors the highest | soil's `out: leaching` → the river (the reserve table already names it and it goes nowhere today) |
| `ammoniaMgL`, `nitriteMgL` | 0 in a flowing river | the outfall's kind, if a later build makes it sewage rather than `contamination` |
| `contamination` | the shipped `contaminationAt(...).level` | — |

The four Watercourse rows gain a `water:` block (world-seed, commons
rows; Kestrel 7.8 / 12 / 2, Holloway 6.0 / 3 / 0.5, Delight 7.4 / 9 / 8,
Cold Fell 6.8 / 5 / 0.5 — authored stances, retuned in the row).
`standingAt` returns `water: WaterState` and, per species, `{ fit,
limiting }`; `readFor` at *practised* names the limiter for a species the
reader can name (*too warm for trout this month · not enough salt for
mullet this far up*) — the same sentence a test kit will one day give at
a tank. Nothing consumes oxygen or nitrate in a river; they are reads.

---

## ⭐⭐ Host placement

For every new field, mixin and class: the host, and what composing it
claims about everything else on that host. **The test:** a guard that
re-narrows the host set means the host is wrong.

| new thing | host | what it claims about the whole host set | narrowing guard? |
|---|---|---|---|
| `fishery` document kind | kernel `DocumentKinds` | the store can hold a runtime-written, path-keyed, kept record — same as `herd` | none |
| `FisheryRegistry` (+ its `fisheries` documents) | water pack `/system/water/idea/`, `RegistrarMixin(Idea)` | the water system keeps a population book for every reach it compiles — true whether or not anyone fishes | none; reads verify prefix + kind |
| `WatercourseNode.stocks` | water pack `Watercourse` node (data) | any reach may be stocked by an author — the aquaculture seam | none |
| `WATER_PARAMETERS` / `WaterState` / `Tolerance` | kernel `Species.ts` types | one vocabulary for what water reports, spoken by a reach today and a tank later | none |
| `Species.habitat` + `fitIn()` | kernel `Species` | every species *may* declare tolerances and answer its fit in a water; `null` = not in any water (the cat, the pig) → fit 0 | none — an absent habitat is zero fit, not a guard |
| `WatercourseCatalogue.waterStateAt` + the `water:` course block + node `meanDepthM` | water pack | every reach reports the whole vocabulary, seeded where it cannot derive | none |
| `'surface'` in `FEEDING_STYLES` | kernel `Species` vocabulary | a feeding rung an animal in water has; not a vessel kind | none |
| `Bonded.takesFromHand()` / `hasChosen()` / `homeEarnedDay` | kernel `BondedMixin` (every kept animal) | every bonded animal remembers whether its home was earned; `hasChosen` is the naming gate for all of them | none — the cat's gate widens honestly (Risks) |
| `feeds` reads the host's own container | kernel brain | an animal inside a feeder of its rung eats from it | none |
| `Respiration.onMoved` + the immersion step | kernel `RespirationMixin` (every respiring body) | a move re-checks the medium; a body in a vessel of liquid breathes the liquid | none |
| `Postmortem.freshnessLoad()` | kernel `PostmortemMixin` (every creature) | a dead body's flesh spoils on the shipped law | none |
| `ToolMixin.epoch` | kernel `ToolMixin` | every tool has an epoch (`''` = unstated) | none |
| the `turned` refusal in `consign` | kernel `ConsignController` | no shelf anywhere lists a turned provision or a carcass past fresh | none — a state read of the good |
| `Fish` = `ContaminableMixin(KeptAnimal)` | trade-fishing `/trade/fishing/agent/Fish` | every fish can carry a pathogen load and can be kept; nothing else kept can carry one | none |
| `Fish.lengthM`, `sizeWords()` | `Fish` | every fish has a length worth words | none |
| `Shore` (`reachRef`, the water read) | **water pack** `/system/water/thing/Shore` | a room-fixed feature that cites a reach and reads the water — true whether or not anyone fishes (the `/system/` test); the fishery read is gated by whatever Discipline `water.fishery.readDiscipline` names | none |
| `Rod`, `Trap`, `Trowel`, `Bait` | trade-fishing `/trade/fishing/thing/*` — plain classes, no new mixin | one class per instrument; the pot and the net are rows of one class (numbers, never a `trapKind` branch) | none |
| `Trap.setAtS/setReach/setBy` + `canEvict` veto while set | `Trap` | a set trap is fixed and stays resident | none |
| `FishingEngagement`, `LandingContest` | trade-fishing `src/lib/` (value classes, instance methods only) | substrate only ever instantiated by the trade's own controllers and brain | none |
| `Waters` singleton | trade-fishing `/trade/fishing/idea/Waters` | the trade's world-level arithmetic (`reachAt`, `bandOf`, `feedFactorsAt`), in one place a doc can find; `readFor` lives on the registry (D7) | none |
| `fishes`, `reads-water` brains | trade-fishing `src/behavior/` | any `Behaved` row may fish or read water | none |
| `fishing` Discipline | trade-fishing `/trade/fishing/idea/Discipline/fishing` | — | — |
| the fish `props`-row `/trade/fishing/thing/fish-bowl` | kernel `/platform/thing/Feeder` (a row) | nothing new — a feeder with a bigger interior | none |

Two placements considered and refused, in the shape of the commits that
haunt this repo:

- **`Contaminable` on `KeptAnimal`** ("a kept animal is often food") —
  false of the cat, the collie and the canary; the `Weapon` mistake.
- **the immersion rule in `BiomeLogic.syncChainWalk`** — it would make
  the room's *temperature* resolve from a bowl's water; only respiration
  asks the immersion question.

---

## Convention conformance

Checked at plan time, not recalled.

- **`props:` / `cast:`** — the Shore rows, the fish stall and the
  fisher's rod are `props:`; the fisher and the fishmonger are `cast:`
  (`bank.yaml`, `stalls.yaml`, `stormy-heath.yaml`). `populates:` is
  retired.
- **Locations, not rooms** — no new location class; the two waters are
  existing `SingletonCartesianLocation`s; the market `Offstage` is the
  shipped class.
- **The five axes / `<root>/<branch>/`** — `/system/water/idea/FisheryRegistry`
  (mechanism, the water system's); `/trade/fishing/{thing,agent,idea,behavior,lib}/…`
  (the trade's mechanism); species and the material under `/stuff/`
  (the commons); `/system/water/thing/Shore` (the water system's
  mechanism); the Shore ROWS under `/world/…` (expression).
  Controllers at `/trade/fishing/idea/cmd/fishing/<Name>Controller`
  (rows + `src/idea/cmd/fishing/`), views at
  `/trade/fishing/cmd/fishing/<verb>` — a new `fishing` command
  category, as `mining` is `trade-mining`'s.
- **Module scope declares; lifecycles initialize** — the registry and
  `Waters` load lazily on first read (no `boot:` entry; a warmed roster
  is the trap); the Shore memo refreshes at `postRegister`.
- **The import boundary** — pack code imports the kernel only by
  `@saxonberg/server/mud/…` specifier; the trade reads the water pack's
  registry **by path, duck-typed** (the `GristMill` rule), and the water
  pack imports nothing of the trade. `lint:imports` pack tier.
- **No Api, no logic singleton, no free helper in a pack** — `Waters`
  and `FisheryRegistry` are singleton Ideas; the contest is a value
  object; module-private functions live inside the class file that owns
  them (the `HerdRegistry` precedent).
- **No new public static anywhere** — `LIB_STATICS_CEILING` counts pack
  `src/` too.
- **Verbs live on objects** — `hasChosen`, `takesFromHand`,
  `freshnessLoad`, `standingAt`, `readFor`, `draw`, `release`,
  `sizeWords` are all instance methods on the thing they are about;
  `SchedulerApi.start/complete` stay on the orchestrator.
- **The instrument affords the verb** — `Rod` affords `fish`/`reel`/`slack`;
  `Trap` affords `set`/`lift`; `Trowel` affords `dig`; `Fish` affords
  `release`; `Stock` already affords `consign`/`buy`/`reclaim`. All as class statics; no row
  `commandContributions:`.
- **An instrument is an argument** — every verb declares its shore /
  rod / bait / ground / trap / counter as a bound arg with a default
  query; controllers narrow on state only.
- **A PERSON keys on `getIdentityPath()`** — `Trap.setBy`, the fisher's
  deeds (the consignor key is the shipped controller's).
- **Lint gates this build must pass:** `lint:family` whole, and by name
  the ones its shape touches — `verb-collisions`, `instrument-args`,
  `capabilities` (`angling`, `digging` consumed by the `fish` / `dig`
  views' instrument args), `kept-animals`, `perishable`, `pathogens`,
  `object-verbs`, `whole-table` (the registry narrows its own table),
  `world-scan` (no world enumeration — species by class, works by rows),
  `lib-statics`, `test-content` (pack tests beside their content; kernel
  tests use `/test/**` paths), `drive-scripts`, `arg-kinds` (a `requires:
  any` on `bait` and `body`-shaped args only), `mixin-names` (no new
  mixin), `instanceable` (`Waters`/`FisheryRegistry` rows have no
  `hydratorClass` and `data: {}`), `census` (`butcheryYield` cuts,
  `_bodyPlanPath`, `_speciesPath` resolve), `untitled` (every new row
  under a claim — `/trade/fishing` claimed by the pack), `identity` +
  `dossiers` (two new Cast rows with archetypes and dossiers),
  `unconsumed-seams` (`habitat` is read by the water pack; `epoch` is
  `lib/` and out of that gate's scope, as forestry recorded),
  `binder-models` (every controller test uses the binder or the
  factory), `gates`, `imports`, `module-scope`, `field-meta`,
  `test-bootstrap`, `schema` (no collection change — must still read 48).

---

## Waves

One commit per wave; the commit title is given. Each wave ends green on
`pnpm test:near` + every touched pack's own `vitest run` +
`pnpm -C packages/server lint:family`. `pnpm test` runs once, before
the MR.

### Stage A — the kernel seams

✅ **A1–A5 landed** (`544f42d25` · `c4393944b` · `7a271139c` · `70568c6fc`
· `431624a7f`). Build notes, for whoever reconstructs the review:

- **A2.** `fitIn(state, season?)` — the season is an optional second
  argument so the species stays pure over its inputs (the registry
  derives the season from the celestial profile); `limiting` widened to
  `WaterParameter | 'season' | null`. `homeKeyOf(container)` was added
  to `Bonded` (Risks 6): `placeIdOf` answers for a Thing but with its
  **template path**, so every fish bowl was one home — a stamped chattel
  is keyed `chattel:<id>`; a room is still its place id. The `feeds`
  brain looks at the vessel the animal is *inside* (`vesselsAround`).
- **A3.** Immersion returned a shape, not a name: `resolveCurrentMedium`
  → `{ medium, immersed }`, because the shipped rule *an unmodelled
  medium raises no crisis* would have let a man breathe ale — an
  immersion is a liquid whether or not the biome table names it, so it
  is exempt from that exemption. Forestry's epoch became a **closed
  vocabulary** in its review (`b1177185d`, `lib/craft/Epoch.ts`), so A3
  took all three of its files byte-identical (`Epoch.ts`, `Tooled.ts`,
  `CraftMixins.test.ts`) — verified with `diff` against
  `origin/build/forestry`. The spoiler snapshot gained `habitat`,
  `homeEarnedDay`, `epoch`, each answered in the review log.
- **A4.** The shipped band vocabulary is `fresh · tainted · spoiled ·
  rotten` — there is no `turned` band. *Turned* = past `fresh`, which is
  `Bonded.wouldEat`'s rule, so an animal and a shelf refuse the same
  thing. The Consignment suite's shape is direct `execute` (not the
  binder); the new tests match it.
- **A5.** The butchery suite asserts arithmetic, not the controller; the
  transfer test uses `setPathogenLoads` (the landing stamp's shape)
  because `contaminate` is inoculum-scaled off a roster the test does
  not load `e-coli` into.

#### A1 — the `fishery` document kind
- **Implements** D2.
- **Touches** `packages/server/src/mud/lib/document/DocumentKinds.ts`;
  `packages/server/src/mud/lib/document/__tests__/` (extend the kinds
  test: `fishery` is path-keyed and kept; `FLAT_KEY_DOCUMENT_KINDS`
  unchanged).
- **Acceptance** `lint:schema` still reports 48; `DECLARED_DOCUMENT_KINDS`
  includes `fishery`.
- **Commit** `build(fishing A1): the fishery document kind`.

#### A2 — species habitat, the surface rung, the earned home
- **Implements** D4, D10.
- **Touches** `platform/idea/species/Species.ts` (`Habitat` + the three
  vocab consts + `habitat` field/fieldMeta/accessors + `'surface'`);
  `lib/husbandry/Bonded.ts` (`takesFromHand`, `homeEarnedDay`,
  `hasChosen`, `creditHomeCandidate` writes the day, `offerRung` uses
  `takesFromHand`); `platform/idea/cmd/inventory/OfferController.ts`
  (the reason line); `platform/idea/cmd/social/NameController.ts`
  (`hasChosen`); `lib/behavior/feeds.ts` (own container as feeder);
  `__tests__/wiki-spoiler-fields.snapshot.test.ts` (bless `habitat` at
  0 with the reason, and `homeEarnedDay` at 0 — it is a clock, not a
  secret); tests: `Species.test.ts` (setHabitat validates; unknown words
  throw; `fitIn` is the minimum and names the limiter; an unauthored
  parameter is factor 1; a null habitat is 0), `Bonded.test.ts` (a seeded home does not satisfy `hasChosen`;
  three distinct fed days do; a follower still does), `feeds.test.ts`
  (an animal inside a bowl-kind feeder eats from it), `NameController`
  tests keep passing.
- **Acceptance** `lint:kept-animals` green; the pets wire suite untouched.
- **Commit** `build(fishing A2): habitat on Species; surface rung; the earned home is the other naming gate`.

#### A3 — immersion, the move re-check, the carcass's clock, the epoch
- **Implements** D8, D9, D14.
- **Touches** `lib/respiration/Respiration.ts`; `lib/mortality/Postmortem.ts`;
  `lib/craft/Tooled.ts` (paste forestry's hunk verbatim); tests:
  `Respiration.test.ts` (a water-breathing fixture in a fixture vessel
  holding `water` reads medium `water`; in air it reads `air`; `onMoved`
  calls `reassess`), `Postmortem.test.ts` (`freshnessLoad` grows with
  `sinceDeath` and equals `Freshness.advance` at the same inputs),
  `Tooled.test.ts` (`epoch` round-trips; `''` unstated).
- **Acceptance** respiration + mortality suites green; no Corpse prose
  changes.
- **Commit** `build(fishing A3): a body in a vessel breathes the liquid; a carcass knows its own freshness; tools carry an epoch`.

#### A4 — `consign` refuses what has turned
- **Implements** D11.
- **Touches** `platform/idea/cmd/retail/ConsignController.ts` (the
  `turned` refusal before the stack split); tests: the controller's
  existing suite through the binder (a fresh Provision lists; a
  Provision in its `turned` band is refused `turned`; a `Postmortem`
  fixture past fresh is refused; a live fixture lists). No view change,
  no `Stock` change, no banking change.
- **Acceptance** `lint:binder-models` 0; the retail wire suite untouched.
- **Commit** `build(fishing A4): a shelf refuses a turned good`.

#### A5 — the carcass carries its own load
- **Implements** D20.
- **Touches** `packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`
  (+ `butchery.test.ts`: a Contaminable fixture body's `e-coli` load
  lands on every cut; a clean body changes nothing).
- **Acceptance** trade-cooking suite green; `lint:pathogens` green.
- **Commit** `build(fishing A5): butcher carries a carcass's own contamination onto its cuts`.

### Stage B — the record, the trade, the content, the drive

✅ **B1–B6 landed** (`1d3327eaf` · `b27029110` · `dfbab252d` ·
`349b50fa8` · `920348813` · `315edddbf`); B7 (the drive) in progress.
Build notes:

- **B1.** An unauthored channel width or depth is derived from the flow
  by **hydraulic geometry** (`w = 5√Q`, `d = 0.4·Q^0.4`, Leopold &
  Maddock) rather than the plan's 1 m dial — a headwater with no width
  read 8 m/s. `meanDepthM` stays authorable; no shipped row authors it.
  The reach's temperature floors at 274 K (water under ice). The mullet
  and crab salinity margin is **4**, not 5: at 5 a fresh reach still
  read 6 % mullet. `SpeciesStanding.name` is the row's first common name
  (a test path leaf read *trout 3s*), and `SpeciesStanding.full` (the
  capacity at a perfect fit) is what the band words read against — at
  capacity, a species the water barely suits read *plenty of carp*
  beside *too much salt for carp*. `fitIn` resolves a tie between two
  total limiters to the first parameter in the vocabulary (the trout at
  the confluence reads *too slow* when current and salt are both 0).
- **B2.** The pack must be added to the **root `package.json`** (the
  deployment manifest) or `PackLogic` never discovers it — the boot died
  on the store's `rod` line. Six species; `FisheryRead.ts` is the shape
  the trade meets the water pack over (types only, `lib/`).
- **B3.** `Rod.presentation` renamed `showing` (`getPresentation` is
  Stuff's). The contest's dials retuned from a simulation (reelGain
  0.25, reelStrain 0.4, slackRelief 0.4, slackRun 0.08, tire 0.35): two
  reels inside a tick snap a full fighter, a strain-feedback policy
  lands every fighter in 5–8 ticks. *Thrown* is counted BEFORE the fish
  pulls (after, it was unreachable). The controllers print
  `lineWords()` — *the line is singing / the rod is bent hard / it is
  resting* — because *give when it runs, gain when it rests* is only
  learnable if you can feel which. ⭐ **The wait ends at a landing**
  (drive finding: the next `fish` said *already fishing*).
  `Respiration.onMoved` swallows a failed fire-and-forget re-check.
- **B4.** `Soil.drawOrganicMatter()` (the twin of `drawNutrient`) was the
  kernel seam `dig` cost the ground through — **`dig`, the trowel and the
  seam were withdrawn in review (D24)**. ⚠ **`set` is a SCRIPTING
  BUILTIN** (`lib/script/builtins.ts`: `set x y` binds a shell variable)
  and the interpreter takes the line before dispatch — `set pot` answered
  with silence; the verb is **`lay`**, and `lint:verb-collisions` now
  counts the builtins as claims (a gate gap the drive found).
- **B5.** `reads-water` exposes `treeFor`/`lineFor` as statics on the
  brain class-expression (the `open` contract's shape), so the tree is
  testable without a conversation.
- **B6.** ⚠ `witness:arrival` is not a trigger the grammar knows
  (`arrival` is) — the baker, the miller and the farmer had shipped
  `introduces` that never fired; fixed on all five rows. ⚠ **The city's
  intake and outfall were OFF**: `Switchable` defaults off and a conduit
  that is off discharges nothing, so the Kestrel below Terminus had never
  been fouled — `on: true` on both rows. The store's `pot` is the farming
  clay pot; the crab pot answers to `crab-pot`.
- **Affordance (kernel, drive finding).** `peers` contributions now reach
  **one level into an open container standing in the room, both ways**
  (`CommandLogic.applyContainmentDeltaImpl`), matching what the `peers`
  SCOPE already offered: a carp in a bowl on the floor could be bound by
  `name carp` and afforded nothing to name it with.
- **Contributions.** `environment` = whoever HOLDS it; `peers` = whoever
  stands where it lies. The rod, the trowel and the fish afford through
  `environment`; the trap through both (the controllers narrow on state).
- **The room's `look` does not carry the water read** — a prop
  contributes nothing to its room's prose (only the floor puddle has a
  kernel hook). The read is on `look edge` / `look tarn` (the Shore's
  own keywords; `water` and `mere` are ambiguous with room details and a
  disambiguation prompt hangs a wire session). A room-level contribution
  hook is a finding for the sweep.

#### B1 — the fishery record in the water pack
- **Implements** D1, D3.
- **Touches** `packages/content/water/src/idea/Watercourse.ts` (node
  `stocks?`), `WatercourseCatalogue.ts` (parse + `CompiledReach.stocks`; the `water:`
  course block, node `meanDepthM`, `waterStateAt` — D22), the four
  Watercourse rows in `world-seed` (`water:` blocks),
  `packages/server/scripts/check-template-census.ts` (push `stocks[].species`
  per entry, forestry's `mix[]` shape — a rowless stocked species is a
  fish of nothing), new `src/idea/FisheryRegistry.ts` (+ `readFor`, D7), new
  `content/system/water/idea/FisheryRegistry.yaml`, new `src/thing/Shore.ts`
  + `content/system/water/thing/Shore.yaml` (D15), `content/settings/water.yaml`
  (`water.fishery.*` incl. `readDiscipline` and `read.emptyBelow`, with
  comments), `src/__tests__/FisheryRegistry.test.ts`
  (against a synthetic `/test/…` species template authoring a habitat
  and the shipped Kestrel/Holloway rows: the confluence's capacity for
  a brackish-slow species is > 0 and the Holloway head's is 0; a cold
  fast species is the reverse; `waterStateAt` reports every word of
  `WATER_PARAMETERS`, the Holloway soft and acid, the Kestrel hard, the
  confluence flow-weighted between them; the limiter is named; `draw` then `standingAt` shows the level
  down; recovery after a half-life; a `stocks:` node overrides fit;
  reads verify prefix + kind; no document is written by a read;
  `readFor` names an apex only at practised+), `Shore.test.ts` (a Shore
  memo renders the physical read at floor and the species read at
  practised, from a stubbed standing; with `readDiscipline` naming a
  missing row it renders the physical read only).
- **Acceptance** water suite green; `lint:world-scan` untouched.
- **Commit** `build(fishing B1): the fishery record and the shore — every reach holds what belongs in it`.

#### B2 — the trade pack: rows, species, material, `Fish`, `Waters`, the Discipline
- **Implements** D6, D7, D15, D18.
- **Creates** `packages/content/trade-fishing/` — `package.json`
  (`@saxonberg/content-trade-fishing`; deps: platform, base-library
  (the material root), species-and-names (the species root),
  generic-objects (ships `/stuff/thing/items/offal`, the offal cut),
  water, server, types — no trade-cooking dependency),
  `pack.yaml` (`root: /trade/fishing`, group `fishing`, title
  `/trade/fishing`), `vitest.config.ts`, `src/` (`agent/Fish.ts`,
  `idea/Waters.ts`), `content/` (six species rows,
  two BodyPlans, the material, `thing/{fillet,roe}.yaml`, six agent
  rows, `idea/Waters.yaml`, `idea/Discipline/fishing.yaml`,
  `settings/fishing.yaml`). Then `pnpm install` at the root (a new pack).
- **Tests** `src/__tests__/rows.test.ts` (every row resolves; every
  species' `_bodyPlanPath`, `_defaultMaterialPath`, `butcheryYield.cut`
  resolves — the `carcass-rows` precedent), `Fish.test.ts` (`sizeWords`
  bands; a dead fixture reads a band, never a number; a live one reads
  nothing), `Waters.test.ts` (`reachAt` reads a Locality; `bandOf` reads
  the floor for a viewer with no transcript).
- **Acceptance** `lint:perishable`, `lint:pathogens`, `lint:kept-animals`,
  `lint:census`, `lint:untitled`, `lint:instanceable` green;
  `lint:capabilities` unchanged (no instrument yet).
- **Commit** `build(fishing B2): trade-fishing — six species, a fish, and the Discipline`.

#### B3 — the rod, the wait, the bite, the contest, `release`
- **Implements** D5, D19.
- **Creates** `src/thing/Rod.ts` (+ `Bait.ts`), `src/lib/FishingEngagement.ts`,
  `src/lib/LandingContest.ts`, `src/idea/cmd/fishing/{Fish,Reel,Slack,Release}Controller.ts`,
  the four views `content/trade/fishing/cmd/fishing/{fish,reel,slack,release}.yaml`
  and controller rows, rows `thing/{rod,worm}.yaml` (`capabilities:
  [angling]`, `epoch: medieval`; `worm` `baitKind: worm`). The `fish`
  view: `rod` arg `default: "inventory:[capability.angling]"`, `requires:
  [ToolMixin]`; `bait` optional (`with`), `scope: inventory`, `requires:
  any`; `shore` optional (`at`), `default: "reachable:[class.Shore]"`.
- **Tests** `LandingContest.test.ts` (pure: two quick reels snap a full
  fighter; alternation lands one; slack twice throws), `FishingEngagement.test.ts`
  (with a stubbed registry: no bite prints nothing; pressure crosses
  deterministically; the species draw is stable for a seed; a small
  fish lands into the hand and `draw` is called; a fighter opens a
  contest; an NPC actor releases), controller tests through the binder
  (`fish` with no rod is refused before any controller runs — the arg
  gate; `reel` with no engagement says so; `release` returns a fish to
  the record and destructs it; an apex release records a deed).
- **Acceptance** `lint:capabilities` sees `angling` consumed;
  `lint:instrument-args` 0; `lint:arg-kinds` green.
- **Commit** `build(fishing B3): fish, reel, slack, release — the bite is the fish's decision`.

#### B4 — the pot, the net, the trowel, the bowl
- **Implements** D12, D13. *(D12's `dig` + trowel withdrawn in review — D24.)*
- **Creates** `src/thing/{Trap,Trowel}.ts`, controllers + views
  `set`/`lift`/`dig`, rows `thing/{pot,net,trowel,fish-bowl,fish-food}.yaml`
  (`fish-bowl`: `/platform/thing/Feeder`, `feederKind: bowl`,
  `interiorCapacity: 4`; `fish-food`: a `/platform/thing/Provision` over
  the shipped `trail-ration` material — no new material for crumbs —
  keywords `[crumbs, feed, fish-food]`). The pot and net rows author
  `capabilities: [trapping]`, consumed by the `set`/`lift` views'
  `trap` arg default.
- **Tests** `Trap.test.ts` (`lift` after `h` hours integrates against a
  stubbed standing; a net empties a reach in an afternoon of game time;
  a set trap vetoes eviction and is `fixedInPlace`), `dig` through the
  binder (draws organic matter; refuses at floor; a worm in hand).
- **Acceptance** `lint:capabilities` sees `digging` consumed.
- **Commit** `build(fishing B4): set and lift a pot and a net; dig for worms`.

#### B5 — the brains
- **Implements** D16.
- **Creates** `src/behavior/fishes.ts`, `src/behavior/reads-water.ts`,
  tests (`fishes` starts one engagement per beat and never two; the
  released fish returns to the record; `reads-water.open` builds a tree
  whose beat is the `empty` line when the standing is empty and the
  `holds` line with species names at practised; a busy NPC declines).
- **Commit** `build(fishing B5): the fisher fishes and reads the water`.

#### B6 — the content: two waters, two people, the store, the stall
- **Implements** D15 (rows), D17, the store lines.
- **Touches** `terminus`: `wharfside/bank.yaml` (`props:` + river-edge,
  `cast:` + fisher), new `wharfside/thing/river-edge.yaml`, new
  `wharfside/agent/fisher.yaml` (`Cast`, `archetype: fisher`, dossier,
  `props: [/trade/fishing/thing/rod]`, `behaviors`: `introduces`,
  `fishes` `cadence:90s` with `shore`, `reads-water` `engage` with the
  lines), `market/business.yaml`, new `market/thing/fish-stall.yaml`,
  new `market/agent/fishmonger.yaml`, new `market/offstage.yaml`,
  `market/stalls.yaml` (`props:` + stall), `general-store/counter.yaml`
  (lines + prices: rod 9, worm 1, pot 7, net 15, trowel 3, fish-bowl 5,
  fish-food 1 — against the shipped ladder), `src/__tests__/general-store-content.test.ts`
  (admit `/trade/fishing/thing/{Rod,Trap,Trowel,Bait}`), `package.json`
  (+ trade-fishing); `world-seed`: `world/moor/stormy-heath.yaml`
  (`props:` + heath-mere), new `world/moor/heath-mere.yaml` (class
  `/system/water/thing/Shore` — `world-seed` already depends on `water`,
  no new line). Then `pnpm install`.
- **Tests** content tests beside the rows (the terminus pack's shape:
  rows resolve; the fisher's brain paths resolve through
  `StuffApi.resolveExport`; `lint:identity`/`dossiers` green; the
  market business's roster names a live Cast; no `shifts` without a
  trigger — assert it).
- **Acceptance** boot on a fresh DB: `PackApi: 'trade-fishing' installed`,
  no `requires-kernel` failure, the fish stall stands up on the first
  `consign`.
- **Commit** `build(fishing B6): the confluence bank and the moor heath fish; the fisher and the fishmonger`.

#### B7 — the drive, the record, the subsystem doc
- **Implements** D21.
- **Creates** `packages/wire/tests/fishing.dirty.wire.test.ts` — ⚠ its
  `act()` waits for the EFFECT, not the frame (forestry's `7fa3d70cb`:
  the `engagement-completed` frame lands when the timer does; a landed
  fish is a mint + a registry `draw` + a chattel stamp that finish a beat
  later — poll a landed predicate, 10 s bound, as `forestry.dirty.wire.test.ts`
  does);
  `docs/subsystems/fishing.md` (the doc the sweep expands; the CLAUDE.md
  one-line pointer is left to the sweep — index files get swept, not
  raced); append the drive record below.
- **Acceptance** every drive step run against the live game and
  recorded with its output; `lint:drive-scripts` 0.
- **Commit** `drive(fishing): <what driving found>` then `build(fishing B7): the drive as a wire file; docs/subsystems/fishing.md`.

#### B8 — the rig, the lure, the keepnet, a fish on the hook (review)
- **Implements** D26. Added in review at the user's call ("fishing is
  very incomplete"); one MR per build means the build is not done until
  the feature is.
- **Kernel** `Species.ts`: `WATER_LAYERS`, `Habitat.feedsAt?`, validated
  in `setHabitat` (+ test). **Water** `FisheryRegistry.ts`: the standing
  carries `feedsAt`. **Trade** `FisheryRead.ts` the shape; `Rod`
  (`presentsAt`, `hookGapeM`, `RIG_LAYERS`); `Bait` (`lure`); `Trap`
  becomes a bulk container; `FishingEngagement` (`presentation()`, the
  gape at the take, `work()` / `isLure()`, `baitKind()` reading a `Fish`
  or bread); `ReelController` works the lure; `LayController` fills an
  interior with `/stuff/idea/material/bulk/water`; `HaulController`
  hands over contents and drains. **Rows** `float-rod`, `leger-rod`,
  `spoon`, `keepnet`; `rod.yaml` says `presentsAt: mid`; six species
  author `feedsAt` (mullet surface; trout mid; eel, carp, crab, sturgeon
  bottom). **Store** four lines + prices (tackle count 10).
- **Tests** `FishingEngagement.test.ts` (the rig — same / one over /
  across; the gape; the worked lure; a fish and a big fish on the hook),
  `traps.test.ts` (the keepnet fills, holds, drains and hands back; a pot
  hands back what was put in it), `Species.habitat.test.ts`.
- **Drive** step 17: the leger over a mullet shoal vs the float; the
  big hook over crabs (silence, the worm stays) vs the plain hook; the
  spoon left to lie vs worked; a fish in a laid keepnet alive a minute
  on, hauled into the hand, dead a minute later.
- **Commit** `build(fishing B8): the rig, the lure, the keepnet, and a fish on the hook`.

---

## Reachability wiring

Five links per capability — verb · affordance · data · boot · arg gate.
Each fails closed and silent.

| capability | verb (view) | affordance (a class static) | data (rows that must exist) | boot (what warms it) | arg gate (`requires:` the target composes) |
|---|---|---|---|---|---|
| angling | `trade/fishing/cmd/fishing/fish.yaml` | `Rod.commandContributions.peers/environment` | `/trade/fishing/thing/rod` (`capabilities: [angling]`), a bait row, the species + agent rows, a reach (Shore row or Locality `_reach`) | nothing — `Waters` and the registry load lazily; the Shore memo refreshes at `postRegister` | `rod` `ToolMixin` (default `[capability.angling]`); `bait` `any`; `shore` `class.Shore` default, optional |
| the contest | `reel.yaml`, `slack.yaml` | `Rod` (same statics) | — | the live `fishing` engagement (`getEngagementByType`) | no object arg |
| release | `release.yaml` | `Fish.commandContributions.peers` | a Fish in hand at a reach | — | `fish` arg `scope: inventory`, `requires: any`; the controller narrows `instanceof Fish` (the pack's own class) and refuses `not-a-fish` |
| trapping | `set.yaml`, `lift.yaml` | `Trap.commandContributions` | `/trade/fishing/thing/{pot,net}` | — | `trap` `ToolMixin` (default `inventory:[capability.trapping]` — `Trap` rows author `capabilities: [trapping]`, consumed here) |
| bait digging | `dig.yaml` | `Trowel.commandContributions` | `/trade/fishing/thing/{trowel,worm}`; a `CultivableMixin` ground | — | `ground` `CultivableMixin`; `trowel` default `[capability.digging]` |
| consigning | `consign`/`buy`/`reclaim` (shipped) | `Stock`'s shipped statics | the fish-stall `Stock` row (`stockLines: []`, self-service); the consignor's bank account; the business stood up (`ensureOperatorAt`) | the business stands up lazily on the first `consign` | `counter` `reachable:[mixin.ConsignmentShelfMixin]` (shipped) |
| the water read | `look` (shipped) | `Shore.markupAugmenters` (water pack) | the Shore row `props:`-ed on the room; `water.fishery.readDiscipline` naming an installed Discipline row for the species read | the memo's first refresh at `postRegister` — ⚠ verify the first `look` after boot is warm (Risks) | — |
| the fishery record | — | — | `FisheryRegistry.yaml`; species rows with `habitat`; Watercourse rows | lazy on first `standingAt` | — |
| the kept fish | `put` / `offer` / `name` (shipped) | `BondedMixin.peers` (inherited) | `/trade/fishing/thing/fish-bowl` (Feeder), `fish-food`; carp `feedingStyle: [surface]`, `biddability: 0` | `Bonded.postRegister` warms the species | `put` target `ContainerMixin` ✓ Feeder; `offer` animal arg — ⚠ its scope must reach INTO an open bowl (Risks) |
| the fisher | `talk` (shipped) | `Cast` is `Behaved` | the fisher row with `reads-water` at `trigger: engage` and `fishes` at a cadence, `props: [rod]`, on the bank's `cast:` | the room's cast minted at boot | `talk` target `BehavedMixin` ✓ |
| the fishmonger | `appoint` (shipped) | `Persona.self` | `business.yaml` position + roster, the stall, the Offstage row, the Cast on `stalls.yaml`'s `cast:` | the roster tick (`EmploymentApi.boot`) materializes the Employment | field validator `mustHoldAppointingAuthority` — the committee, founder passes |
| the rig (B8) | `fish.yaml` (`using <rod>`) | `Rod` (same statics) | `/trade/fishing/thing/{float-rod,leger-rod}` with `presentsAt` / `hookGapeM`; species rows with `habitat.feedsAt` | the standing carries `feedsAt` per read | `rod` `ToolMixin` in hand |
| the lure (B8) | `fish.yaml` (`with spoon`), `reel.yaml` (works it) | `Rod` (same statics) | `/trade/fishing/thing/spoon` (`baitKind: lure`) | the live engagement's `workedAtTick` | `bait` `requires: any` |
| the keepnet (B8) | `lay.yaml`, `haul.yaml`, `put` (shipped) | `Trap.commandContributions` | `/trade/fishing/thing/keepnet` (`interiorBulk: true`, `drawPerHour: 0`); `/stuff/idea/material/bulk/water` | — | `trap` `ToolMixin`; `put`'s target is a Container (Trap is one now) |
| the Discipline | — | — | `/trade/fishing/idea/Discipline/fishing` | `DisciplineCatalogue` warms by class | — |
| the deed | — | — | — | `recordDeed` on the persona | — |

⚠ Two of these were dead once before in this repo and are the ones to
walk first at the drive: a row's `commandContributions:` (never — every
affordance above is a class static) and `props:` on the wrong host (the
rod goes on the *fisher's* row, the Shore on the *room's*).

---

## Acceptance-criteria coverage

| requirement AC | waves |
|---|---|
| wait, silent refusal, small fish lands itself, lose or land a fighter through `reel`/`slack` | A2 (surface/hand not needed here), B2, B3, drive 3–6 |
| no number ever shown — size, stock, competence, rod condition | B1 (`readFor` bands), B2 (`sizeWords`), B3 (contest prose), shipped Durable bands; drive 1, 4 |
| confluence and heath hold different species with no table; the millsite yields from the Delight's reach with its pack untouched | B1 (fit), B2 (habitats), B6 (rows), D15 fallback; drive 13, 13b |
| a practised reader is told the one factor that limits a species, in words | A2 (`fitIn`), B1 (`waterStateAt`, `readFor`); drive 2, 13 |
| the fisher fishes, reads aloud, reports empty without naming who | B5, B6; drive 9 |
| the fishmonger is committee-appointed, keeps a shift, replaceable by `appoint` | B6 (D17); drive 11 + an `appoint` step added to the wire file |
| a net empties a reach in an afternoon and it recovers over days; a practised `look` reads both | B1 (recovery, `readFor`, `Shore`), B4 (net numbers); drive 9 |
| a fish below the outfall carries the load; raw it sickens; nothing says so | A5, B3 (stamp at landing), D20; drive 10 (at the bank — see D21) |
| the stall lists a fresh fish and refuses a turned one; a buyer's coin reaches the consignor less the commission; a fillet spoils; smoked or salted keeps | A3 (D9), A4, B2 (material tags), shipped consignment + cure rows; drive 11–12 |
| a carp kept and fed three days can be named, `find … mine` lists it without a place, it is in its bowl after a restart; before three days *not chosen* | A2 (D10, feeds), A3 (D8), B4 (bowl, food); drive 14–15 |
| the sturgeon is in the record, reads royal, catch and release are deeds | B2 (habitat apex, prose), B3 (deeds); drive 16 |
| `cast` still casts spells | D19 (no `cast` view touched); `lint:verb-collisions` |
| every drive step run live and recorded | B7 |

Unmapped: none.

---

## Test & gate strategy

- **Unit, in the kernel** (A1–A4): the kinds table; `Species.setHabitat`;
  `Bonded.hasChosen` in both routes and the seeded-home negative;
  `feeds` inside a feeder; respiration's immersion + `onMoved`;
  `Postmortem.freshnessLoad`; `Tooled.epoch`; the `consign` `turned`
  refusal through the binder.
  Kernel fixtures use `/test/**` paths (`lint:test-content`).
- **Unit, in packs** (A5, B1–B5): trade-cooking's carcass load; the
  registry's fit table against the shipped Watercourse rows (the water
  pack's own suite already boots them); the contest as pure arithmetic;
  the engagement with a stubbed registry; every controller through the
  binder (`lint:binder-models`); brains with a stubbed standing.
- **Content tests** (B6): rows resolve, brain paths resolve, roster
  names a Cast, `shifts` has a trigger, the store allowlist.
- **Only the drive can prove:** that the bite arrives at all on a live
  clock; that a landed fish dies in the hand and lives in the bowl;
  that the record survives a restart; that the moor's read differs from
  the confluence's; that the fisher says *empty* after a net; that a raw
  confluence fillet sickens within the hour; that Barnaby is in his bowl
  after a reboot.
- **Gates:** `pnpm -C packages/server lint:family` after every wave; the
  ones named in § Convention conformance are the ones expected to move.
- ⚠ `pnpm test` runs at exactly two moments: before the MR opens and at
  `/finalize`. Between, `pnpm test:near` + each touched pack's `vitest
  run` + the family. Never in the background.

---

## Risks & opens

What could break; what the build should decide by the recorded lean and
what it should stop for.

1. **The forestry merge (`epoch`).** A3 pastes forestry's hunk verbatim.
   If `build/forestry` merges first, A3's `Tooled.ts` change is a no-op
   diff — drop it from the commit and note it. If fishing merges first,
   forestry's rebase sees an identical hunk. Do not rename, reorder or
   reword it.
2. **The confluence carries the outfall's load** (Grounding:
   `contaminationAt` counts `at === ref`). Every fish landed at the
   bank is dosed; the intake, a hundred paces up, is on the same reach.
   The drive runs step 10 at the bank. ⭐ For the user: is a per-reach
   granularity acceptable for v1, or does the bank want a second reach
   (`kestrel:wharf` between confluence and estuary, a world-seed edit)?
   **Decided at the handoff: accept for v1**; the requirements' *"the
   reach below it carries the city's contamination"* is literally true
   of the confluence. A `kestrel:wharf` node is a water-slate finding.
3. **The dose must actually bite raw.** `fishing.contamination.loadPerUnit`
   is tuned against the `e-coli` row's `infectiousDose` and the
   confluence's live `contamination.level` at the drive; the drive step
   is the calibration, not a doc number. If a raw fillet does not sicken
   within the hour, the dial moves — never the roster.
4. **The Shore's first `look` must be warm.** The memo refreshes at
   `postRegister` and on every render; a session that arrives before the
   first refresh lands reads *the water is hard to read yet*. Verify at
   the drive (step 2); if it bites, kick the refresh from the room's
   arrival witness or `settle()` it from `fish`.
5. **`offer … to carp` inside a bowl.** The `offer` view's animal arg
   must resolve a fish inside an open container in the room. Check
   `platform/cmd/inventory/offer.yaml`'s scope at B4; if it is `peers`
   only, widen to `[reachable]` (a kernel view edit, a local fix).
6. **`PersistableApi.placeIdOf(bowl)`.** `hasChosen` and `feeds` compare a
   *vessel's* place id. Confirm at A2 that `placeIdOf` answers for a
   Thing (it is called with a room today); if it answers only for
   locations, key the home on the vessel's `getIdentityPath()` instead.
7. **Barnaby after a restart.** A keyed `Persistable` inside a bowl
   inside a room or an inventory: `HostPlacement.via` carries nested
   anchors (`[table, cage]`), so a bowl on a shelf should restore. The
   drive keeps the bowl **in the player's inventory** for the restart
   step (the snapshot captures the whole tree) and records what the
   room case does; a failure there is a finding for the pets slate, not
   a blocker.
8. **A set trap in a public room.** `canEvict` vetoes while set and
   `fixedInPlace` stops `get`; the reset sweep re-mints `props:` rows
   but does not touch a player's dropped chattel. Verify at the drive
   (step 8) that a pot survives a wizard game-hour skip.
9. **The water material's name is `water`.** The immersion step matches
   the body plan's `breathableMedia` against `getBulkMaterial('interior')
   .getName()`. Confirm the base-library water row's `name` at A3; the
   bowl is filled with that material.
10. **No water source at the bank.** A bowl cannot be filled from the
    river (the bank's river is a `details:` entry). The drive fills it at
    a tank or standpipe (Hinkley's, or the store's waterskin → `pour`).
    ⭐ For the user: a finding — a person standing at a river with a
    bowl cannot fill it. Out of scope; recorded.
11. **`lint:lib-statics` at 337.** Every new class here has instance
    methods only; module-private functions live in the owning file. A
    single new public static fails the family.
12. **The store-goods allowlist** admits four pack classes (B6).
13. **The wiki spoiler snapshot** gains `habitat` and `homeEarnedDay`
    (A2) — answer the question in the review log; do not bless blind.
14. **The moor Locality cites `holloway:vale`**; the heath's Shore cites
    `holloway:head`. The feature wins over the locality by design (D15);
    nothing on the moor row changes. The weeping chamber is untouched.
15. **`hearts-delight` untouched** — the millsite fishes via
    `Waters.reachAt` → `delight:flats`. If the drive finds the Delight's
    flats holding nothing for a trout at the drive's season, the fix is a
    habitat number, never a millsite edit.
16. **The BodyPlan row shape** is copied from `avian.yaml`; the fish plan
    must declare `breathableMedia: [water]` and a `swim` locomotion mode
    or `Respiration` reads `['air']` and the fish drowns in its bowl.
    `Species.test`'s row check pins it.
17. **The naming gate widens for every kept animal** (D10). ⭐ For the
    user: a stray fed from a bowl in one room for three game days can be
    named there without following. The requirements call this *the other
    route home*. **Decided at the handoff: accept the widening** — a
    stray fed at one door three days running has chosen it; the gate is
    three *distinct* fed days at one place, never three feedings.
18. **Nobody buys the catch but a buyer** (D11, decided at the handoff).
    In a one-player session a consigned fish sits on the shelf; the drive
    buys it with a second character. `reclaim` is the honest exit.
19. **Fish agent rows under `/trade/fishing/agent/`**, not `/stuff/agent/`
    (D6). The species stay commons; the individual a trade materializes is
    the trade's. ⭐ For the user, since the brief leaned `/stuff/agent/`.
20. **`meat`-tagged fish-flesh** means `smoke-cure` outputs the cooking
    pack's `treated-cut` (its composition names fish-flesh). Fish-specific
    cure rows are the noun wave's.
21. **The fisher fishes bare-hook and releases everything** (D16). ⭐ For
    the user: he is a reader with a rod, not a supplier. A creel and a
    consignment beat are the commercial wave's.
22. **`pnpm install` after B2 and B6** — a new pack and one new
    dependency line (terminus); forgetting it fails every pack suite at collection
    and reads like a repo defect.
23. **The fishmonger's roster hours** `[5, 14)` — outside them the stall
    is unattended; the stall authors `staffingPolicy: self-service` like
    the general store (D11), so a monger's absence never blocks a
    consignment. Decided.
24. **Stop and ask** only for: a worktree hazard; a `lint:mixin-names`
    collision (none expected — no new mixin); a `requires-kernel` failure
    naming a class this plan does not list.

---

## Deferred seams

Clean attach points, each with the slate it leaves as. None of these
lives in this plan after the sweep.

- **`WatercourseNode.stocks`** (D3) — aquaculture and the stocked pond
  with ownership → `fishing-slate` § 3 (the override with ownership).
- **`Habitat.role`** — the food web (bait feeding predators inside the
  record) → `fishing-slate` waves.
- **`ToolMixin.epoch`** and `Trap.takesRoles` — the covenant's predicate
  (*no nets above the falls*) → forestry's land-use covenant; the fishery
  right rides `water-right` → `fishing-slate` § 7.
- **The tide** — `waterStateAt`'s `salinityPpt` line (D22) is the one function a tide clock
  replaces → `fishing-slate` § 9.
- **The named apex** — the sturgeon as an individual with a chronicle →
  `fishing-slate` (the user's wanted tail).
- **Fishing from the barge** — a Shore on a vehicle → `fishing-slate`'s
  boat follow-on; the underwater regime → `underwater-slate`; the spear →
  `hunting-slate`.
- **Fish-specific recipes, skin and bone cuts, crustaceans beyond the
  crab** → `fishing-slate`'s noun wave.
- **The fisher's creel and a consignment beat** → the commercial wave.
- **A river you can fill a bowl from** → a finding for the water slate.
- **The home tank** (D22) — the vessel's ledger of the same `WaterState`
  (oxygen drawn, ammonia → nitrite → nitrate, a water change, the
  filter's culture as a living material), respiration reading it (the
  mine's write-through pattern), the test kit (the instrumentation
  slate), the maintenance service (a contract clause over a reading),
  disease → `fishing-slate` § 12. Touches no reach, no species row, no
  law.
- **The catchment's geology → `pH`/`hardnessDgh`; soil leaching → `nitrateMgL`** — the joins D22 seeds around → the RGO unification pass.

---

## Critical files

Read first, in this order.

1. `docs/requirements/fishing-requirements.md`, `docs/slates/builds/fishing-slate.md`
2. `docs/subsystems/watershed.md` § *`Watercourse`*, § *Flow*, § *Contamination*; `packages/content/water/src/idea/WatercourseCatalogue.ts`; `packages/content/water/src/idea/WaterRightRegistry.ts`
3. `packages/content/trade-ranching/src/idea/HerdRegistry.ts`; `packages/server/src/mud/lib/document/Register.ts`; `packages/server/src/mud/lib/document/DocumentKinds.ts`
4. `packages/content/trade-milling/src/thing/GristMill.ts` (the duck-typed catalogue read + the sync memo)
5. `docs/subsystems/pets.md`; `packages/server/src/mud/lib/creature/KeptAnimal.ts`; `packages/server/src/mud/lib/husbandry/Bonded.ts`; `packages/server/src/mud/lib/behavior/feeds.ts`; `packages/server/src/mud/platform/idea/cmd/social/NameController.ts`; `packages/server/src/mud/platform/idea/cmd/inventory/OfferController.ts`; `packages/content/trade-ranching/src/agent/WorkingAnimal.ts`
6. `packages/server/src/mud/platform/idea/species/Species.ts`; `packages/server/src/mud/platform/idea/species/BodyPlan.ts`; `packages/content/species-and-names/content/stuff/idea/species/cat.yaml`, `hog.yaml`; `packages/content/trade-mining/content/stuff/idea/species/BodyPlan/avian.yaml`
7. `packages/server/src/mud/lib/respiration/Respiration.ts`; `packages/server/src/mud/lib/mortality/Postmortem.ts`; `packages/server/src/mud/lib/thermal/Thermal.ts` l.560–590 (the `onMoved` chain)
8. `docs/subsystems/activity.md`; `packages/content/transport/src/lib/journey/Journey.ts`; `packages/server/src/mud/lib/husbandry/OfferEngagement.ts`
9. `packages/server/src/mud/lib/craft/Tooled.ts` and `git show origin/build/forestry:packages/server/src/mud/lib/craft/Tooled.ts`
10. `docs/subsystems/retail.md`; `packages/server/src/mud/platform/thing/Stock.ts`; `packages/server/src/mud/platform/idea/cmd/retail/BuyController.ts`; `packages/content/platform/content/platform/cmd/retail/buy.yaml`; `packages/server/src/mud/api/banking.ts` (`payWage`, `payDraw`); `packages/server/src/mud/lib/employment/CategoryMeasure.ts`
11. `packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`; `packages/content/trade-cooking/content/recipes/smoke-cure.yaml`; `docs/subsystems/spoilage.md`
12. `packages/server/src/mud/lib/behavior/tree-dialogue.ts`; `packages/server/src/mud/lib/npc/DialogueConversation.ts`; `packages/content/saxonberg-lounge/content/world/lounge/agent/{dave,mara}.yaml`; `docs/subsystems/behavior.md` § *Brains in packs*
13. `packages/content/terminus/content/world/terminus/{wharfside/bank.yaml,market/business.yaml,market/agent/baker.yaml,general-store/counter.yaml}`; `packages/content/terminus/src/__tests__/general-store-content.test.ts`; `packages/content/world-seed/content/world/moor/stormy-heath.yaml`; `packages/content/eternal-university/content/world/eternal/duncan-hall/agent/katie.yaml` (`props:` on an agent)
14. `docs/subsystems/content-packs.md` § *The capability rung*, § *How a pack EXPOSES something*; `packages/content/trade-ranching/{pack.yaml,package.json,vitest.config.ts}`
15. `docs/lint-family.md`; `packages/server/scripts/check-lib-statics.ts` (the ceiling), `check-kept-animals.ts`, `check-verb-collisions.ts`
16. `packages/wire/tests/pets-offer.dirty.wire.test.ts`, `work.dirty.wire.test.ts`; `docs/testing.md`
17. `packages/server/src/mud/lib/Seeded.ts`; `packages/server/src/mud/lib/advancement/Advancement.ts` (`creditDeed`, `competenceDigestCached`); `packages/server/src/mud/lib/husbandry/Soil.ts` (the organic-matter reserve)

---

## Drive record

**`packages/wire/tests/fishing.dirty.wire.test.ts` — 17/17 on the
fifteenth run** (2026-09-18, an owned world on `WIRE_PORT=2013`,
`WIRE_FRAME_TIMEOUT=60000`, a fresh `saxonberg_build2` each run). The
requirements' steps, what each proved, and what the run before it found:

| step | proved live | what driving found on the way |
|---|---|---|
| 1 the store | rod · worm · crab-pot · net · bowl · fish-food · trowel bought and in hand; `look rod` names no number | the pack was not in the root `package.json` — the first boot died on the store's rod line; `pot` at the counter is the farming clay pot |
| 2 the water read | `look edge`: *This is the Kestrel, a broad river. The water is slow, brackish, cool and hard. An outfall discharges into this water.* — nothing of what it holds at the floor | the room's `look` carries no prop's prose (a sweep finding); `look water` prompts (the room's `river` detail); **the city's intake and outfall were OFF** — no contamination line until `on: true` |
| 3 the wait | `fish with worm` → engagement; `say` works; `reel` mid-wait: *Nothing is on it* | `reel` was unknown — `peers` ≠ held; the rod affords through `environment` |
| 4 a fish lands itself | a fish in hand ~55 s; `look`: *It is a foot long*, no number, nothing of the water | `look eel` prompted: the crab pot's `creel` keyword; the wait did not end at a landing (*already fishing*) |
| 5 the snap | four fast reels on a fighter: *The line parts…the water is as it was*; the rod stays; `reel` after refuses | the contest needed feedback — `lineWords()` |
| 6 the landing | slack/reel by feel lands the next fighter in ~60 s | dials retuned from a simulation |
| 7 release | gone from hand; `look edge` byte-identical | releasing a drowning fish mid-drain was an **unhandled rejection that killed the server** (`Respiration.reassess` on an inert proxy) |
| 8 the pot | `lay crab-pot` → in the water; a wizard sets the stamp back; `lift`: a crab or nothing, no word about luck | **`set` is a scripting builtin** and never reached dispatch — `lay`; the lint gate now knows the builtins; the wire world's clock starts at 0 |
| 9 the net | five lifts thin the confluence to nothing; `talk fisher` (then `talk tull`): *Nothing in it. Nothing. Somebody has had the lot* — no name; the half-life dial turned, the next lift fills again and he reads *Eels run on the ebb…* | a 3 km reach held 800 fish and never emptied → 1 km and a 30-fish net; a 60-fish lift blew the 30 s frame budget; a known Cast's keywords are his NAME |
| 10 below the outfall | the landed fish's `e-coli` load > 0 (wizard read); `look` says nothing | evals reach only inside the wizard's parcel (the square) |
| 11 the stall | `consign X on slab --ask 4`; a second character with a banked purse `buy X from slab`; the consignor's balance (read at the hall) moves | the consign default shelf is the produce stalls; `stall` is both counters' keyword; a purse cannot buy a consignment (the split needs an account); a second founder drop in the hall lands in the till |
| 12 turned | a wizard kills and back-dates the fish; `consign` → `controller-rejected: turned` | `butcher` is afforded by the cookhouse's block (trade-cooking), not a clasp knife — the carcass-load transfer stays A5's unit test; `smoke` likewise (the `meat` tag proves the recipe match) |
| 13 the heath | `look tarn`: *This is the Holloway… fast, fresh, cold and soft* — no mullet, no crab, no eel | `mere` is also the floor's pool detail |
| 13b the millsite | `fish` from the millsite (rod in hand) → engagement — the Delight's flats through the Locality, no row, no code | `fish` is unknown without a rod: the instrument affords it |
| 14 the kept carp | a wizard-biased carp landed; the bowl on the floor, filled; `put carp in bowl` → no drain; `name carp Barnaby` → *not chosen*; three fed days credited by eval → `name` ok; `find carp mine` → *Barnaby* | `put` targets peers (the bowl must be down); **`peers` affordances did not reach into the bowl** (kernel fix); the draw was weighted by fullness, not count; the carp's handling ceiling 0.6 could not reach the naming bond |
| 15 the restart (by hand) | with the bowl on the square's floor: Barnaby is stood up **in the square, loose**, and the bowl restores **into the owner's inventory** — *not in his bowl*. With the bowl carried away after naming: Barnaby stood up but nowhere findable | ⚠ **Risk 7 materialized** — a pets/furnishing finding, not fixed here: a keyed animal's placement is captured at naming and not when its vessel moves, and a dropped chattel restores to `inventory`. ⚠ And **a bought good vanished at restart** (the rod, the fish food) — `buy` stamped the buyer but never `followCustody()`; fixed in `BuyController` (every other custody verb does) |
| 16 the sturgeon | `talk`: *And a royal fish — a sturgeon — lies in the deep water*; wizard-biased, landed by feel; `chronicle`: *Landed a sturgeon at kestrel:confluence.* | — |

**Also found and fixed:** `witness:arrival` on five rows (three shipped:
the baker, the miller, the farmer — their `introduces` had never fired);
`Respiration.onMoved` swallowing a failed re-check; the `eval` sandbox's
`--on` is reachable scope (run it where the thing is).

**Findings left for the sweep / slates:** the room-level prose hook for a
prop (fishing-slate); a keyed animal inside a moved vessel, and a
dropped chattel restoring to inventory (pets/furnishing); `find` and the
`inventory` scope not reaching into a carried container; the
`PersistableMixin.cleanupOnDestruct` capture error on a destructed
unkeyed animal (`host.getDeepContents is not a function`, logged on
every released fish — pets); a Cast's keywords becoming its name once
known (`talk fisher` fails after the introduction — presentation).

**Review round, B8 (2026-09-21) — what driving the rig found.** Runs
17–19 of the drive, on the merged tree with step 17 added:

| found | where | what was done |
|---|---|---|
| three rods in hand: `look rod` and a bare `fish` PROMPT, and a prompt is not a dispatch-response — the session jammed at step 1 | the drive | the drive names the rod (`using cane`), as a player with three would |
| `fish with worm using cane` → `shape-fall-through`: the binder fills positionals in order and a preposition skips FORWARD, never back; the rod was declared before the bait | `fish.yaml` | bait first, then rod, then shore |
| `look edge` prompted between the river's edge and the **ledger** rod: `"a ledger rod".includes("edge")` | the matcher | the row is *leger* (the angler's spelling), and — |
| `haul net` with a keepnet in hand hauled the **keepnet**: `"a net"` and `"a keepnet"` both scored 50 by substring and the tie fell to pool order (inventory before the room). Third instance in one build: creel/eel, ledger/edge, keepnet/net | `scoreCandidate` (kernel MQL) | ⭐ a new tier — every query word a WHOLE word of the name → 60, above substring's 50; three rods still tie on `rod`, which is the prompt, and correct (`scope-walk.score.test.ts`) |
| ⚠⚠ **the angler COLLAPSED at the seventh game hour** — `drop` refused by `requiresConscious` — and the server log showed every unfed Cast in the world going the same way: *Sefa Roke, Wren Ashby, the hewers — "not conscious enough" → "not currently animate (dead)"* | the world (master) | a probe on a fresh body at the square, one reading a game-quarter-hour: **satiation falls 24 %/h, linear, from 100 to 0 at hour 4.5; `starvation` lands; the core starts to drift.** The consumer is `ThermalRegulation`'s cold branch: `COLD_SPEND_PER_DEGREE 0.05 %/min/K` below a comfort floor of `310 − 8 − 2.5·clo` K — a body in nothing at 294 K (21 °C) has an 8 K gap and burns 24 %/h; in the student outfit (~0.6 clo, 1.5 K of band) ~19 %/h. Out of fuel, the branch drifts the core toward ambient — death by exposure at room temperature. ⚠ **Not fishing's; the thermal/injury owner's.** Two dials look an order of magnitude off physiology: 1 clo is *defined* as comfort at 21 °C sitting, so the band should move ~7 K per clo, not 2.5; and shivering peaks near 5× basal, so the spend at a 10 K gap should be ~+6 %/h, i.e. `~0.01 %/min/K`, not 0.05. And **no Cast row wears anything.** What IS this build's: wire test characters were minted naked (`enroll` dresses a real one) — `TestHooks` now dresses them in the first aspiration's outfit; and the drive's angler buys rations and eats one at each afternoon's start, which is what a person fishing all day does |
| the probe's own two false starts | — | the eval sandbox exposes no `WorldClockApi`; `eval --on me` is parcel-bound (the square, not the bank) |

**The full suite, once, before the MR** (2026-09-18): `pnpm test` green
— 29 packages, 13,150 tests passed (server 10,966 · client 999 ·
trade-fishing 58 · water 150), `EXIT 0`. The first attempt was killed by
the OS for memory beside two sibling worktrees' runs; the rerun is the
one cited. `lint:family` green at every wave.
