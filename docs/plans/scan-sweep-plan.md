# Scan sweep — load on use — implementation plan

Executes [scan-sweep-requirements](../requirements/scan-sweep-requirements.md)
(kind: **refactor/sweep**, lead end: **kernel**, first consumer: the
Terminus realm as it stands plus every typed-word verb). The doctrine:
**content loads when a player's act forces it, by following AUTHORED
references from what is already loaded — never by searching the template
table, and never at boot unless the reason is written down and holds.**
A zone may load its own insides; unobserved simulation reconciles when
the place next loads; typed-word dictionaries may be indexes built
lazily; only engine wardens stay booted.

The build GENERALISES the maritime worked example (commit `27c439468`:
`structures:` on `SpatialZone`, kicked-not-awaited; `lookOutFrom`;
`Voyaging.onRestored` reconciling a gap) — it does not reinvent it.

Paths: **S** = `packages/server/src/mud`, **C** = `packages/content`,
**scripts** = `packages/server/scripts`. Line numbers are as of
`reqs/scan-sweep` at `e2f6c1e75` and will drift; grep the symbol.

---

## Grounding

Every fact below was verified by opening the file this cycle.

### The worked example (the pattern to generalise)

- `S/lib/zone/SpatialZone.ts:73-75,283-340` — `structures:` is declared
  `{ instruction: true, authorable: true }`; `applyStructures(paths)`
  stores the paths, KICKS `StuffApi.singleton(p)` per path without
  awaiting (a ship standing up reaches back for its sea → a sea that
  awaited its ships inside its own load would wait on itself), keeps the
  `Promise.all` in `structuresLoading`; `structuresLoaded()` is the
  awaitable; `getStructures()` is the sync live read
  (`findByTemplatePath` per named path); `structureOf(locationPath)`
  the innermost member walk.
- `S/lib/expanse/Expanse.ts:370-373` — the override: `await
  super.applyStructures(paths); void this.compile()`.
- `S/lib/zone/LocationZone.ts:60-91` — `addLocation` → `lookOutFrom`:
  stands up (once, kicked, non-cascading) the zones a room's or zone's
  `horizon` names.
- `S/lib/expanse/Voyaging.ts:406-431` — `onRestored`: a restored
  under-way craft kicks `expanse.bands()` (never awaits — the deadlock
  class), restarts the voyage and runs one `watch()` to work out the
  time away. **This is the catch-up shape every "place next loads"
  reconcile in this build copies.**
- `scripts/check-template-census.ts:110-215` — `refsOf` is the one list
  of path-bearing fields the census resolves (`_biomePath`,
  `_speciesPath`, `_bodyPlanPath`, `_parentCladePath`, `_materialPath`,
  `_defaultMaterialPath`, `endpoints`, `featured`, `horizon`,
  `structures`, `entries[].path`, `props`, `cast`, …). Every new
  reference field this build adds goes in it.

### The TemplateApplier (where "a holder loads what it cites" attaches)

- `S/platform/idea/TemplateApplier.ts:139-184` — **Phase 1 property
  fields**: for each declared persistent field in `data`, the applier
  calls `set<PascalField>` if defined and **AWAITS it** ("an asynchronous
  one that touches other Stuff completes before the next field"), else
  bracket-assigns. Phase 1 runs on clone, go-live AND restore.
- `:185-199` — **Phase 2 instruction fields** (`apply<Field>`, required),
  skipped on restore. `applyContainer` (`S/lib/spatial/Containable.ts:236`,
  `{ instruction: true, authorPicker: 'Template' }`) already resolves a
  cited path via `StuffApi.singleton` — the precedent for a field whose
  application loads another row.
- `scripts/check-field-meta.ts:523-540` — `KNOWN_PROPS` is the closed
  set of `fieldMeta` keys (`persistent`, `instruction`, `seed`,
  `birthOnly`, `authorable`, `authorPicker`, `marshaller`, …). A new
  key must be added there or `lint:field-meta` refuses it.
- `S/lib/stuff/Location.ts:346-361` — `Location.onCreate` must load
  nothing; `scripts/check-on-create.ts:72-86` pins `ON_CREATE_CEILING =
  82` and `ON_CREATE_LOADING_CEILING = 35`. **No new `onCreate` body in
  this build** — loading rides appliers, awaited setters, `onRestored`
  and `onDestruct`.

### Boot entries — 128 across 16 packs

Counted from `grep -c "template:" C/*/pack.yaml`: platform 55, terminus
45, hearts-delight 7, eternal-university 4, saxonberg-lounge 3,
hearthworks 2, hinkley-hills 2, newbie-wilds 2, base-library 1,
trade-apiculture 1, trade-dyeing 1, corpo-{aevex,goodkin,hollis,veshko,
vionne} 1 each. Manifest parse: `S/platform/idea/api/PackLogic.ts:500-527`
(`readBoot`: keys `template/role/reason/dependsOn`, roles
`sync-read|producer`, `reason` non-empty). **The only lint that reads
`boot:` is `lint:openings`** (`scripts/check-openings.ts:107-132`, rule 3
at `:296-318`: a position with `headcount` must be a `boot:` entry of
its own pack). `scripts/check-instanceable-placement.ts` reads no `boot:`
(content-packs.md:1149-1150 claims it does — false).

Platform's 55 (`C/platform/pack.yaml:52-109`), classified at plan time:

| entry | class of reason | this build |
|---|---|---|
| EventRegistry, EventSubscriptions, GroupRegistry, AccessRegistry, ParcelRegistry, ChattelRegistry, OfficeRegistry, WorldClockRegistry, SchedulerRegistry, MqlSubscriptionRegistry, CardRegistry, ForumSubscriptionRegistry, ReactionRegistry, StreamState, SubjectCatalogue, ChannelCatalogue, CentralBank, LocationGraphRegistry, `/platform/location/void` | engine registries / the one sanctioned index / money anchor | **keep**, reason re-read for honesty |
| EmploymentEngine, ResidencyWarden, WatchWarden, Renown/Participation/ProducerStandings, SandboxWarden, AttendantWarden, ResetWarden, PresenceRelay, PartyRoster | engine wardens (arm timers) | **keep** |
| PressBoard | a window over release DOCUMENTS (not rows); the ticker at login | **keep** |
| BlueprintCatalogue | code skeleton, author tooling | **keep** (tooling is a stated non-goal) |
| MaterialCatalogue, BiomeCatalogue, FabricCatalogue, ConditionCatalogue, MaturationProfileCatalogue, FractionScheduleCatalogue, CorpoCatalogue | warm-only content rosters ("rows cannot stand themselves up") | **replaced by citation** (D4) → removed |
| ReadingCatalogue, PlacementCatalogue, SpellCatalogue, HelpCatalogue, OperationCatalogue, DisciplineCatalogue, GovernmentCatalogue, SoulCatalogue, RecipeCatalogue, ArchetypeCatalogue, AddressRegistry | typed-word / keyed dictionaries | **lazy** (D5) → removed; Reading + Placement are already lazy and merely booted |
| TopicCatalogue | sync on every message render (`S/platform/idea/api/MessageLogic.ts:119,131`); `feedsFor` already fails OPEN when cold | **decide in W5 by reader** (D5 table): lazy at the first async send if one precedes every sync read, else kept with that reason |
| `/compact/press`, `/compact/executive`, `/compact/treasury`, `/compact/trade` | organizations "resolved by templatePath" at async touches | **loaded by the reference that names them** (D7) → removed |

The other 73 (`C/terminus/pack.yaml:104-200`, hearts-delight:63-93,
eternal-university:48-59, saxonberg-lounge:21-23, hearthworks:28-29,
hinkley-hills:20-21, newbie-wilds:24-25, trade-apiculture:39,
trade-dyeing:22, base-library:13, corpo-*): F1 advertising houses (6),
F2 houses whose hand runs a beat (21), G premises rooms (23), H
buildings/warrens (4), I props/books (5), B species rows (5), E
organizations (7), D dyestuff catalogue (1), base-library's universe
biome (1). **All go except the universe biome** (D4: the engine's own
default, cited by code — `BiomeLogic.ts` "throws when the root biome
isn't loaded — a boot-time invariant"), whose reason is rewritten.

### Employment (build-order 1)

- `S/platform/idea/api/EmploymentLogic.ts:1440-1506` — the business memo:
  `allBusinesses()` = `allBusinessesImpl()` = `StuffApi.findByMixin
  ('BusinessMixin')` (live); keyed maps `businessByLocation` /
  `businessByProprietor`; `businessByKey` **drops the memo and
  re-enumerates on every miss**. Most rooms have no business, so a miss
  is the ordinary answer and `noticesAt` (`:1946`, called from
  `S/platform/idea/cmd/perception/LookController.ts:315` on every look)
  rescans per room and per fixture.
- `:1964-1992` `operatorsAtImpl` — room path + each non-interactive
  fixture's identity path through `businessByKey`; doc: *"Live only, and
  deliberately … walking past a shop must not be [an economic act]
  … lint:openings"*. **Reversed by requirements decision 1.**
- `:2002-2017` `buildOperatorIndex` — `Template.findDescendants('/')`
  (the WHOLE table) → `operatingLocations → business row path`;
  `:2026-2082` `ensureOperatorAtInternal` — live hit → `closedSignImpl` +
  `tickBusiness`; miss → the index → `StuffApi.singletonOrClone(tplPath)`
  → `invalidateBusinessCache()` → `runTick()` (the whole realm's roster).
  Callers: BankController:150, OrderController:155,219, BuyController:81,307,
  BankingLogic:538, ContractLogic:1276, TitleController:529,
  `S/lib/commerce/PricedOffer.ts:127,134`, terminus StallController:168,217,
  tpa `FastTravel.ts:816,834`, `settleSale` (`:2181`).
- `:1593-1603` `runTick` — every live business: `tickBusiness` + kicked
  `closedSignImpl`; `:1623-1690` `tickBusiness` — per assignment:
  `ensureRostered`, house card, `roster.evaluate(assignment, date)` →
  `beginShift`/`endShift` with `settleShiftWageImpl` on the on→off
  transition (**a lump of rate × shift-hours, once, at the boundary**),
  `moveForShift`, then `reconcileCover`. `installRosterSchedule`
  (`:1693`) arms the hourly game-time tick; `EmploymentEngine`
  (`S/platform/idea/EmploymentEngine.ts:42-51`) warms it.
- `:625-680` `closedSignImpl` (vacate absent holders → the closed sign →
  estate touches). `bringCurrent` (`:2150`) IS `closedSignImpl`; its one
  caller is `HouseController.ts:210`.
- `:1288-1330` `settleShiftWageImpl` → `payHouseWageImpl(business,
  workerKey, amountMinor)` (`:1161`: arrears first, a working-capital
  draw where earned, else a refusal on the book — **the ledger
  chokepoint; no raw balance write anywhere**).
- `S/lib/employment/Roster.ts:75-88` `evaluate(assignment, {weekday,
  hour})` → `'on-shift' | 'off-shift'` from `schedule[].days/hours`.
- `S/platform/idea/Business.ts:156-335` — `BusinessMixin` fields
  `operatingLocations` (persistent, authorable), `banksAt`, `parLines`,
  `charter`, `payrollArrears` (persistent); `closed` is runtime-only.
  `:358-370` `BusinessEntity extends BusinessMixin(PublisherMixin(
  OrganizationMixin(Idea)))` — **composes no `PersistableMixin`**: the
  closed sign and `payrollArrears` do not survive a restart today.
- `S/lib/employment/Organization.ts:240-270` — `parentOrganization`,
  `proprietorPath` (`authorPicker: 'Template'`), `positions`,
  `rosterSlots`, `call`. `S/lib/employment/Employed.ts:322` —
  `institution: { ref: 'identity', persistent: true, authorable: true }`
  (the sentry's `institution:` citation).
- `S/lib/attendant/Attendant.ts:131,205,304` — `businessPath` (fixture →
  business, authorable) followed FORWARD by `requestAttention` and
  `resolveServer` via `findByTemplatePath`.
- Authored references: business → rooms `operatingLocations:` (61 rows,
  e.g. `C/hearthworks/content/world/terminus/hearthworks/idea/business.yaml`);
  fixture → business `businessPath:` (25 counters, e.g.
  `C/terminus/content/world/terminus/general-store/counter.yaml`); ship →
  business `house:` (`C/terminus/content/world/terminus/hesper/structure.yaml:24`).
  **No room → business and no zone → business field exists.**
- Zones are `CartesianZone` rows one per locality/premises:
  `C/terminus/content/world/terminus/{general-store,counting-houses,
  wharfside,wharfside/{mill,dyehouse,knackers,tannery,chandlery},
  goods-yards/{veshko,hollis,crowsfoot,oilworks,bottling,pantry,brewing,
  farm,vintner},mayfield-row,mayfield-row/{tailor,seznick-house},registry,
  realty,market,infirmary,hesper,terminal,…}.yaml`;
  `C/saxonberg-lounge/content/world/lounge.yaml`;
  `C/hearthworks/content/world/terminus/hearthworks.yaml`;
  `C/eternal-university/content/world/terminus/eternal/{duncan-hall,
  campus-farm}.yaml`; `C/hinkley-hills/content/world/terminus/hinkley-hills.yaml`.
- `S/platform/idea/api/ZoneLogic.ts:207-225` `resolveZoneForPath` —
  walks `Template.ancestorPaths(path)` with EXACT `Template.findByPath`
  reads (no scan) and `StuffApi.singleton`s the first spatial-zone
  ancestor. This is how a room (or a fixture path) finds its zone.
- `S/backend/AppBootstrap.ts:210-233` — post-manifest sequencer lines:
  `ResidencyApi.spawnNow()` and `EmploymentApi.tickRoster()`.
- `S/api/stuff.ts:780-815` — **`StuffApi.singleton(path)` on a
  `PersistableMixin` host with no persistence key restores its
  `holder_snapshots` record when one exists (`PersistableApi.materialize`
  → the host's `onRestored`), else lays down `seedBornWith()` and
  captures the first record.** `Persistable.onCreate` itself drives
  nothing (`S/lib/persistence/Persistable.ts:384-400`). So a house KICKED
  by the zone (D1) and a counter placed by a room's `props:` both reach
  `onRestored` on the second and every later stand-up — the catch-up
  attach point D3 and D6 use. Multi-instance hosts (a dorm unit, an
  Avatar) are keyed by their provisioner and never come through here.
- `scripts/check-openings.ts` — also rule 0–2 (position vocabulary), the
  `banksAt`-when-waged rule, rule 4 (a fulfilling seat has premises and
  its holders stand on them), rule 5 (a par line's supplier lists its
  room); `roomOf` built from every room's `cast:`/`props:`;
  `COUNTER_CLASSES` = `/trade/shopkeeping/thing/{Stock,ConsignmentShelf}`.

### Stock / spawn (build-order 2)

- `S/lib/retail/Stock.ts:73-87` `StockLine { itemTemplatePath, par,
  brandKey?, supplier?, pricing? }`; `:99-101` `StockBase =
  PersistableMixin(…ResettableMixin(…))` — **the counter IS persistable**
  (holder_snapshots); `:155-165` `shortSuppliedLines()`; `:211-214`
  `onCreate` → `reset()`; `:285-300` `reset()` clones IMPORT lines
  (no `supplier`) to par, skips supplied lines; `:303`
  `resetsWhilePresent() → true`.
- `ResettableMixin` composers: `Stock` and
  `C/trade-farming/src/thing/ToolRack.ts` (tools back on the rack;
  `resetsWhilePresent() → false`). Nothing else.
- `S/platform/idea/api/ResidencyLogic.ts:431-478` `collectSpawnCandidates`
  — `Template.findWhereDataHas('censusKey')` (58 rows; 45 author
  `container:` — the 13 without are `C/arcane-library/…/magic/*` wands
  and `C/arcana/…/mana-cell`, which `StuffApi.clone` at `:314` places
  NOWHERE: homeless draws are unreachable objects today) +
  `getAllObjects()` over `Circulating` (`:458`). `:290-340` the per-region
  draw (`SpawnTable.draw`, `rollBlessing`). Runs at boot
  (AppBootstrap:221) and on `installSpawnSweep` (`:748`, every
  `residency.spawn.intervalS`); `installResetSweep` (`:710`, every game
  hour, `getAllObjects` at `:543`); `installEvictionSweep` (`:681`,
  stays). `ResidencyWarden.warm()` (`S/platform/idea/ResidencyWarden.ts:42-52`)
  arms all three.
- Zone-side spawn fields: `S/lib/zone/SpatialZone.ts:55-57,93-125`
  `stocks` / `favours` / `blessingOdds` — read ONLY by the spawn sweep.
  Authored by 3 rows: `C/terminus/…/goods-yards/veshko.yaml:14-21`,
  `C/terminus/…/infirmary.yaml`, `C/rejection/…/rejection/ferrow.yaml`.
- Producer floors author `stockLines: []` and rely on the sweep
  (`C/terminus/…/goods-yards/{veshko,oilworks,crowsfoot,farm,bottling,
  brewing,…}/thing/stock.yaml`, `wharfside/mill/thing/stock.yaml`); the
  general store authors 27 import lines
  (`general-store/counter.yaml`); the cash-and-carry
  (`counting-houses/distributor/thing/counter.yaml`) authors 2 terms
  lines, `purchasing: terms`, `listingCapOverride: 120`.
- `S/lib/retail/Consignment.ts:150-165` — `recordListing(chattelId,
  consignorKey, askMinor, basis?)`, `removeListing`, `listingFor`,
  `listingsOf`, `activeListingCount`; `ConsignController` stamps an
  unstamped good to the consigning business and records the listing.
- Brains (`presenceGated = false`, literal verbs via `forceCommand`):
  `C/trade-shopkeeping/src/behavior/consigns.ts` (hand: floor stock →
  walks to the cash-and-carry → `consign … --ask` as the outfit → walks
  home; config `stock`/`shelf`); `stocks.ts` (keeper: `shortSuppliedLines`
  → `bank borrow` when short → `buy` at the supplier on terms → `put … in
  counter`; config `counter`/`bank`); `S/lib/behavior/restocks.ts:147-445`
  (Mara: `stockSheetFor` → ONE `job post supply … --bounty --business`
  per short line to the bench, guarded by `pendingKinds` over
  `ContractApi.openGigsOn(board)`; config `shelf`/`board`/`bench`/
  `reward`/`batch` in `C/saxonberg-lounge/…/agent/mara.yaml:64-79`);
  `S/lib/behavior/prints.ts` (editor: once per `press.indexEditionGameHours`
  of game time, `BankingApi.priceIndex()` → `executeCommand('press post …
  --as /world/terminus/gazette --kind notice')`, state `lastEditionS` on
  the brain ctx; config `publisher`); `C/trade-haulage/src/behavior/hauls.ts`
  (carter: untaken gigs past the window). `S/lib/behavior/Behaved.ts:438,589`
  — the presence gate; cadences are REAL time.
- `S/platform/thing/JobBoard.ts` — kernel class, `fieldMeta = {}`;
  `JobController.ts:85` resolves `reachable:[class.JobBoard]`;
  `ContractApi.post(GigSpec{ boardPath, condition, rewardMinor,
  claimMode, asBusiness?, originPath?, … })`, `openGigsOn(boardPath)`
  (`S/api/contract.ts:113,185`). The generic row
  `/trade/haulage/thing/works-board` is propped by eight rooms (the
  lounge bar, the goods yards, the knackers' yard, …).
- `S/platform/idea/api/BankingLogic.ts:842-870` `priceIndexImpl` —
  counters from `reserve.indexBasket`, **sync live-only
  `findByTemplatePath`**: an unloaded counter silently drops out; a
  basket nobody stocks reads 100.
- `S/platform/idea/api/PressLogic.ts:334-358` `frontPagePublishersImpl`
  — `press.frontPage` paths resolved LIVE-ONLY (`resolvePublisherImpl`),
  skipped with a warning when cold.

### Residence (build-order 4)

- `C/residence/src/idea/ResidenceCatalogue.ts:150-200` —
  `Template.findWhereDataHas('parentExtent')` (4 rows:
  eternal-university `duncan-hall/idea/dorm-warren` (class
  `…/idea/DormWarren`), terminus `mayfield-row/seznick-house/building`
  (`/system/residence/idea/BuildingWarren`), hinkley-hills
  `idea/plat-book` (`PlatBook`, `holderPath` → `idea/lot-holder`
  (`PlatWarren`))); resolves LIVE only. Readers: `platBooks()` ←
  `S/platform/idea/cmd/civics/TitleController.ts:140-160` (`title list`,
  afforded to every character by `Persona.ts:198`) and
  `C/terminus/src/realty/agent/Realtor.ts:80-100` (`offers()`, static);
  `institutionsCovering(key)` ← `S/lib/location/OuterWarren.ts:358-392`
  (`admitFor` — the keyed-room re-entry) ←
  `S/platform/idea/api/PersistableLogic.ts:376` (login restore);
  `holdingsUnder(extent)` ← `C/residence/src/behavior/maintains.ts:96,138`.
- The Registry: `C/terminus/…/registry/{business,clerk,desk,office}.yaml`
  — the desk is `/system/residence/thing/DeedDesk`
  (`C/residence/src/thing/DeedDesk.ts`: `extends Thing {}`, no fields).
  Ricky: `C/terminus/…/realty/agent/ricky.yaml` (class
  `/world/terminus/realty/agent/Realtor`, dialogue effects
  `realty-list` / `realty-buy`).

### Water & fishing (build-order 3)

- `C/water/src/idea/WatercourseCatalogue.ts:1143-1148` `loadWorks` —
  `Template.findByClass` of `/system/water/thing/{Conduit,ControlStructure}`
  (5 rows: terminus `wharfside/thing/{city-intake,city-outfall,
  aqueduct-house,cold-fell-aqueduct}`, hearts-delight `thing/millrace`);
  `:913-935` `worldScan` → **live objects only** (`findByTemplatePath`;
  "authored but not standing" is skipped) → `:839-870` `contaminationAt`.
  Also `findDescendants('/stuff/idea/Watercourse')` (`:1019`) and every
  Locality (`:1363`) in the index compile. The outfall row
  (`city-outfall.yaml`) authors `reachRef: kestrel:confluence`,
  `dischargeLoadPerSecond: 0.6`, `dischargeKind: organic`, `on: true`,
  `direction: disposal`, `capacityM3S`.
- `C/water/src/idea/Watercourse.ts:73-124` — `WatercourseNode` carries
  optional `stocks?: WatercourseStock[]` (`{ species, capacity }`);
  **supported, unauthored** (`C/world-seed/content/stuff/idea/Watercourse/
  kestrel.yaml:35-56` nodes: headwaters, falls, confluence, estuary).
- `C/water/src/idea/FisheryRegistry.ts:482-491` `readSpecies` —
  `Template.findByClass('/platform/idea/species/Species')` and
  `StuffApi.singleton` of EVERY habitat species, memoised per six game
  hours; `:193-220` `standingAt` iterates that list and prefers an
  authored `reach.stocks` entry (`stocked: true`, `fit: 1`) else derives
  capacity from habitat fit × abundance × length; `:246-283`
  `seaStandingAt` reads `sea.getStock()` + the band's `stock` (the
  Westerlies: `stock: { /stuff/idea/species/grey-mullet: 0.6 }`).
  Species rows: `C/trade-fishing/content/stuff/idea/species/{brown-trout,
  carp,eel,grey-mullet,shore-crab,sturgeon}.yaml`.
- Locality `_reach` citations (`C/world-seed/content/stuff/idea/Locality/*`):
  `kestrel:confluence` ×4 (eternal-campus, university-avenue,
  counting-houses, +1), `kestrel:headwaters`, `delight:flats`,
  `blackmere:mere`, `circlemere:mere`, `clearmere:mere`, `holloway:vale`.
  The fishing drive fishes at the store/square/bank (kestrel:confluence),
  the heath (moor) and the millsite (delight:flats).

### Reference vocabularies (build-order 5) and species (6)

- Warm shape, all `onCreate → warm()` over a path infix or class:
  `S/platform/idea/MaterialCatalogue.ts:63` (`/idea/material/`),
  `BiomeCatalogue.ts:103` (`/idea/biome/`), `FabricCatalogue.ts:69-78`
  (`/idea/fabric/`, `Construction.registerFabric`; a garment row's
  `constructionForm: woven` THROWS at hydration against a cold roster —
  `S/lib/material/Construction.ts:142,379-390`),
  `FractionScheduleCatalogue.ts:58`, `MaturationProfileCatalogue.ts:68`,
  `ConditionCatalogue.ts:86`, `DisciplineCatalogue.ts:161`,
  `OperationCatalogue.ts:79`, `SpellCatalogue.ts:160` (+ effect
  validation at warm), `HelpCatalogue.ts:183-205` (harvests
  `CommandApi.allDefinitions()`, the api surface, schema docs, and
  concept rows via `findByClass` at `:999`), `TopicCatalogue.ts:262-266`,
  `CorpoCatalogue.ts:163-172`, `GovernmentCatalogue.ts:125`,
  `AddressRegistry.ts:200-203` (Locality roster → `StuffApi.singleton`
  each), `ReadingCatalogue.ts:70-79` and `PlacementCatalogue.ts:77-86`
  (**already lazy**: `warmed(name)` warms on the first miss),
  `C/trade-dyeing/src/idea/DyestuffCatalogue.ts`.
- Readers: materials by PATH (`MaterialLogic.ts:889`,
  `S/lib/bulk/SourceSlot.ts:75` — `findByTemplatePath`;
  `MaterialApi.findByTag/findByElement` have no production callers);
  biomes by path (`BiomeLogic.ts:754`; `Atmospheric.getBiome` re-resolves
  per call); `FractionSchedule.byKey / forMaterial(material.hasTag)`
  (`S/lib/fractionation/FractionSchedule.ts:498-520`, a `findByPathGlob`
  over LIVE rows; called from `Fractionating.ts:337` at the charge);
  `MaturationProfile.byKey / forMaterial / cultureForStrain`
  (`S/lib/maturation/MaturationProfile.ts:575-615`; `Maturing.ts:826` at
  the fill, `:1307` at the pitch); `Dyestuff.forMaterial(materialPath)`
  (`C/trade-dyeing/src/idea/Dyestuff.ts:170`, over live rows; ←
  `DyeController.ts:101,231`); `Branded.getBrand()` →
  `CorpoApi.getBrand(key)` (`S/lib/corpo/Branded.ts:60-80`, sync, on
  presentation); spells by typed name (`MagicLogic.ts:433,709` via a
  sync `catalogue()`); disciplines by key (`Advancement.ts:233,541`,
  `Employed.ts:125`) and `allDisciplines()` for the conditioning stocks
  (`Advancement.ts:171`); operations (`C/trade-medicine/src/idea/cmd/
  medical/OperateController.ts:68-71`, `TemplatePaths.operationCatalogue`
  → `allOperations()`); help (`S/api/help.ts:52-57`, sync `catalogue()`).
- Citation fields that exist today (`authorPicker` tells the picker what
  to offer; nothing LOADS the cited row): `_speciesPath` on
  `S/lib/species/Organism.ts:147` (sync `getSpecies()` =
  `findByTemplatePath`, `:225-228`) and `S/platform/thing/Seed.ts:28`;
  `_biomePath` (`S/lib/biome/Atmospheric.ts:405`); `_materialPath`,
  `_detailMaterialPaths` (`S/lib/material/Tangible.ts:150-151`);
  `interiorMaterial`, `surfaceMaterial` (`S/lib/bulk/Bulkable.ts:565,569`);
  `_decayProductPath` (`S/lib/material/Radioactive.ts:82`);
  `parentOrganization`, `proprietorPath` (Organization), `banksAt`
  (a KEY, not a path), `principal`/`remote` (Display), `seatIn`
  (Fixture), `_vehicularModePath` (Drivable), `holderPath` (PlatBook),
  `programmePath`/`roadTemplate`/`corridorTemplate`/`lobbyPath`
  (PlatWarren/BuildingWarren), `carrierPath` (RateBoard), `_address`.
- `SpeciesApi.isSentient` (`S/platform/idea/api/SpeciesLogic.ts:85-90`)
  returns **false** when the species is not resident — fail OPEN.
  Tolerant wrappers: `CombatLogic.ts:4883-4889`, `S/lib/hazard/Hazard.ts:431`;
  direct: `MagicLogic.ts:1435`; the safety gates:
  `C/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`,
  `C/trade-ranching/src/idea/cmd/ranching/SlaughterController.ts`,
  `C/trade-medicine/…/TransfuseController.ts`. `preloadAnatomy`
  (`SpeciesLogic.ts:94-114`) stands a species + its ancestors up
  tolerantly — on the deliberation beat only (`Behaved.ts:573`).

### Part 1 registry scans (build-order 7)

- `S/api/stuff.ts:76-152` `RegistryWideReaders` — 12 `(template, method)`
  pairs: persistable `captureAtShutdown`; attendant `allPoints`; banking
  `branchOf`; employment `allBusinesses`, `employeesOf`,
  `findOrganization`; address `settleStreetLighting`; press
  `holdsAnyPublishingPosition`; residency `takeCensus`, `spawnNow`;
  magic `decoyNameFor`; `/**/idea/cmd/**` `resolveScreen`; plus
  `FromTemplate('/platform/idea/api/mql')`. `lint:gates` resolves every
  pair at build time.
- `S/lib/command/CommandController.ts:90-115` `resolveScreen` — mind path:
  `findByMixin('DisplayMixin')` + `await mayDrive` on each. Pairing is on
  the DISPLAY (`S/lib/display/Display.ts:166-169,239-258`: `held` =
  carried; `remote` = carries the named remote; `staff` = `principal`
  business employs/has-as-proprietor the actor; `open` = reach).
- `S/platform/idea/api/BankingLogic.ts:300-335` `findBranchOf` memoises
  a HIT only; `branchOfImpl` = `findByMixin('BankMixin')`. `BankMixin`
  (`S/lib/banking/Bank.ts:110,172`) has no lifecycle hook.
- `S/platform/idea/api/PressLogic.ts:171-180`
  `holdsAnyPublishingPositionImpl` — `findByMixin('PublisherMixin')` per
  validation.
- `S/platform/idea/api/AttendantLogic.ts:97-110` `onPlayerDisconnected`
  → `allPoints()` (the idle sweep's use of `allPoints` is legitimate).
- `S/api/stuff.ts:1637-1647` `findTemplatesByPath` — O(N) walk of `byId`
  matching `.path`; ← `S/api/mql/resolver.ts:388` on a non-glob path-atom
  miss (sync).
- `S/lib/wiki/components/composition.ts:403` — `Template.findDescendants('/')`
  per render (author tooling — kept, with the reason written).
- `S/lib/stuff/Template.ts:492-575` — `findByClass` and
  `findWhereDataHas` union every row carrying `extends` via
  `#inheritedMatches`, materialised, on EVERY call. Template writes go
  through `TemplateLogic.saveTemplate` (`S/platform/idea/api/TemplateLogic.ts:59,126`
  → `tpl.save()`) and the pack reconcile installer.
- Template-scan call sites across kernel + packs (the census for the new
  gate): 36 files — the catalogues above, `WatercourseCatalogue` (3),
  `FisheryRegistry`, `ResidenceCatalogue`, `EmploymentLogic`,
  `ResidencyLogic`, `LsController`/`RmController`/`GrepController`
  (author tools), `TemplateLogic`, `CmsLogic`, `SandboxLogic`,
  `LocationGraphRegistry`, `Ship.ts`, `Expanse.ts`, transport
  `LaneCatalogue`, energy `GridCatalogue`, trade-smelting
  `SmeltController`, wiki `composition.ts`.

### The drive harness

`packages/wire/src/harness`: `Session.open(handle, { startLocation?,
wizard? })`, `s.cmd(text) → CommandResult`, `s.prose(text)`,
`s.listen(ms)`, `s.drainProse()`, `expectOk/expectRefused/expectNote`,
`advanceWorldClock('1 day')` (`world.ts:157`, the test-only clock route;
returns before/after), `declareFile({ file, packs, dirtyReason })`.
Exemplar: `packages/wire/tests/maritime-space.dirty.wire.test.ts`. A wire
file cannot restart the server (step 11 is by hand). The runner boots
one owned world per run (`runner/boot.ts`).

---

## Plan-level decisions

**D1 — The ZONE names what loads with it; typed fields over one
mechanism.** `SpatialZone` gains two instruction fields beside
`structures:` — `businesses:` and `institutions:` — each applied by the
same private stand-up mechanism `applyStructures` already is (paths
stored; `StuffApi.singleton` per path, KICKED; a per-field loading
promise; a sync "what is standing" read). Not one generic field: a
typed field is what lets `lint:openings` say *every advertising house is
named by the zone over its premises*, lets the census check the branch
of what is named, lets the studio picker offer the right rows, and
matches the house style (`props:`/`cast:`/`structures:` are typed by
what they hold). Not on `Location`: a field on every room is blank on
almost every room (the `Street`/PublicLighting lesson, and
`SpatialZone`'s own `address` docstring — one declaration on the region
covers every room including minted ones). A zone loading its insides is
the sanctioned eager case.

**D2 — The location index is maintained on WRITE; a miss is an answer.**
`EmploymentLogic`'s memo stops re-enumerating on a miss. A business
enters the `operatingLocation → business` and `proprietor → business`
maps when `setOperatingLocations` / `setProprietorPath` run (phase-1
setters, the `noteEmployments`-from-the-`employments`-setter precedent)
and leaves them in `onDestruct`. `buildOperatorIndex` (the whole-table
scan) is deleted; `ensureOperatorAt(path)` becomes: live index hit →
else `ZoneApi.resolveZoneForPath(path)` → `await zone.businessesLoaded()`
→ index hit → else `null`. `allBusinesses()` stays a `findByMixin` read
for the engine tick only (the pair stays in `RegistryWideReaders`).

**D3 — A house catches up on load, through the ledger.** `BusinessEntity`
composes `PersistableMixin` (a singleton keyed by its template path —
the shape the spine serves) so the stamp `currentAsOfS` and the
already-declared-persistent `payrollArrears` and the closed sign survive
a restart. `EmploymentLogic.bringCurrent(house)` becomes the catch-up:
(1) integrate each roster assignment's shifts over `(currentAsOfS, now)`
hour by hour with `Roster.evaluate`, settling each completed shift as a
lump through `payHouseWageImpl` (arrears / working-capital / refusal on
the book — never a balance write), at **today's** rate (decision 5); (2)
`tickBusiness(now)` for the present on/off state, cover, house cards;
(3) `closedSignImpl` (vacancies, the sign); (4) stamp and capture. Run
from `onRestored`, from the zone's stand-up chain, from `ensureOperatorAt`
and `HouseController` as today. The hourly `EmploymentEngine` tick keeps
ticking the LIVE houses (it is an engine warden and already reads the
live population); the boot `tickRoster` sequencer line goes. A fresh
house (no record) stamps now — there is nothing to catch up.

**D4 — A holder loads what it cites: `cites:` in `fieldMeta`.** The
TemplateApplier gains a step after phase 1: for every declared field
with `cites: true`, if the applied value is a path string (or array of
them), `await StuffApi.singleton(path)` (warn, never throw, on a row that
does not stand up); with `cites: '<row path>'`, stand up THAT row — for a
field whose value is a KEY into a catalogue (`_brandKey` →
`/platform/idea/CorpoCatalogue`, `constructionForm` →
`/platform/idea/FabricCatalogue`, `maturationProfileKey` /
`runScheduleKey` → their catalogues), whose `onCreate` warm then IS the
lazy index. Runs on clone, go-live and restore (a restored collie loads
its species). **Awaited, because the sync reads that follow hydration
(`getSpecies()`, `getMaterial`, `taps()`, `isSentient`) need the row; a
reference row has no back-edge to its citer, so the maritime deadlock
class cannot arise — `cites:` is for REFERENCE rows only, and anything
that could reach back (a structure, a business, an institution) is
KICKED through D1.** `lint:field-meta`'s `KNOWN_PROPS` gains the key;
`lint:census` `refsOf` reads every `cites: true` field by name.

**D5 — Typed-word dictionaries are lazy; the catalogue decides by its
reader.** Every catalogue that is read by a word a player typed
(`measure <channel>`, `cast <name>`, `help <concept>`, `operate`, `put
… <placement>`, `competence`/discipline keys, `government`, an address,
an emote verb, a recipe id, an archetype id) takes the `ReadingCatalogue`
shape: a sync `peek` over whatever is warmed and an async `warmed()`
that warms on the first miss; the verb's controller (async) awaits
`warmed()` before the sync read. A miss after warming is **final within
a process** (a pack installed live calls `invalidate()`, the existing
HMR seam — slate open question 4). A catalogue whose only readers are
sync paths with no act-shaped async seam before them (`TopicCatalogue`
if every message render precedes any `send()`) keeps its boot entry with
THAT sentence as its reason — the honest answer, not a lie about
laziness. Attribute matches with no reference (`forMaterial` by tag,
`cultureForStrain`, `Dyestuff.forMaterial`) stay lazy indexes
(requirements decision 6): the material is the commons' and the schedule
is a trade's, so a reference on the material would point a kernel row at
a pack row — the wrong direction twice.

**D6 — Stock refills on load, from its own lines, by elapsed time.**
`StockMixin` gains `stockedAtS` (persistent; rides the counter's
existing snapshot) and `bringCurrent(nowS)`: for each IMPORT line,
refill `min(par − onHand, ceil(par × elapsed / refillPeriodS))`
(`refillPeriodS` = the existing `residency.reset.intervalS` dial — the
sweep's own rate, so a day's gap fills a shelf and an hour's gap fills
an hour's worth); for each SUPPLIED line, the keeper's derived purchase
(D8). Called from `onRestored`, from `BuyController` before it offers,
from `LookController` for each Stock in the room (one awaited call), and
from the house's stock sheet. The boot spawn sweep, the recurring spawn
sweep and the hourly reset sweep are retired with `SpawnTable`'s draw,
`rollBlessing`-at-spawn and the three zone-side fields
`stocks`/`favours`/`blessingOdds` (no reader remains). **The rate source
is the counter's `stockLines` and nothing else**: the three zone
`stocks:` tables become `stockLines` on the floors they stocked
(Veshko's `spirit:volk: 24` → `{ itemTemplatePath: …/volk, par: 24 }`).
Product rows keep `container:` (the clone pipeline's self-placement,
still authored forward) and `censusKey` (the census vocabulary
`takeCensus` counts); `regionTarget` is retired. The 13 homeless wand
rows were never reachable; the spawn-distribution slate records that a
random distribution needs a place that NAMES what it holds.
`ToolRack` keeps `reset()` but is driven by its own `onRestored` and a
`look` in its yard with no other occupant, not by a sweep;
`ResettableMixin` stays (two composers, the hook name is right),
`resetsWhilePresent` goes with the sweep.

**D7 — Organizations load by the reference that names them.**
`AccessRegistry`'s organization-held title check, `BankingLogic`'s
treasury touches, `PressLogic.resolvePublisherImpl` (the front page,
`press post --as`), `AppointController`'s path form and the
`Organization.parentOrganization` / `Employed.institution` citations
(`cites: true`) resolve the org with `StuffApi.singleton(path)` at
their (async) read instead of a live-only `findByTemplatePath` plus a
diagnostic. `findOrganization(asked)` (a label a player typed) stays a
lookup over the LIVE population — a typed word over what is loaded. The
eleven E-category boot entries go.

**D8 — Supply between places is derived at the RECEIVING end, through
the same chokepoints the verbs use, and the brain and the derivation
share ONE implementation so nothing double-counts.**
- *Consignment* (the cash-and-carry): `ConsignmentShelfMixin` gains
  `consignors: string[]` (persistent, authorable; the floor STOCK paths
  it draws from — each stock's `businessPath` says which outfit consigns)
  and `bringCurrent(nowS)`: per named stock, `singleton` it (it loads
  with nothing else), `stock.bringCurrent(now)`, then move up to
  `min(the outfit's listing headroom, the shelf line's par shortfall
  where it has a line, batch × elapsed beats, floor on-hand)` goods
  onto the shelf as listings via `recordListing` + the chattel stamp
  (what `ConsignController` does), ask = the floor stock's `prices:` for
  the row (authored by the producer) else the good's base price. Money
  moves at RESALE as today (sale-or-return), so no ledger leg at
  consignment. The `consigns` brain's beat calls the shelf's own
  `takeConsignment(stock, outfit, goods)` for the goods it carried, so
  the two paths share the listing code and the headroom guard.
- *Gigs* (the job board): a board's posters are the houses operating the
  room it stands in (`operatorsAt(room)` — no new field; a `posters:`
  override is deferred until a board is posted to from elsewhere).
  `JobController`'s browse awaits `board.bringCurrent()` → for each
  poster: `house.bringCurrent()` then `EmploymentLogic.orderShortfall
  (house, board, bench, reward, batch)` — `restocks.ts`'s `order()` moved
  into the kernel logic, posting through `ContractApi.post({ asBusiness:
  true, … })` under the house, with its `pendingKinds` guard as the
  dedup. The house's ordering policy moves onto the Business row
  (`ordering: { board, bench, rewardMinor, batch }` — the par manifest's
  own rule: *policy is the owner's*); Mara's brain reads it and calls the
  same method.
- *The keeper's books*: `Stock.bringCurrent` for a SUPPLIED line moves
  `min(shortfall, batch × elapsed days, supplier on-hand)` goods from the
  supplier's counter (loaded by `singleton` via the supplier business's
  operating counter) onto the shop's counter as `terms` listings
  (`recordListing(…, 'terms')` — title retained, the supplier owed at
  sale), which is what her `buy` at a `purchasing: terms` counter does;
  no cash moves, so no borrowing is derived. ⚠ The approximation is
  stated in retail.md: the derived keeper buys on terms only; a cash
  purchase she would have borrowed for (`stocks.ts` rung 1) happens only
  when she is loaded and her beat runs.
- *The Gazette*: the press-room read (`pressRoomImpl` / the ticker)
  brings each front-page publisher current: an `Organization` whose row
  authors `editions: [{ kind: price-index, everyGameHours, positionKey }]`
  prints a due edition by standing up the seat's rostered assignee
  (`singleton` of the editor row — following the roster reference) and
  running `press post …` through `executeCommand` exactly as the
  `prints` brain does; `lastEditionS` moves from the brain's `ctx.state`
  to the Organization (persistent) so the brain and the read share the
  window guard. `BankingApi.priceIndex()` becomes async and `singleton`s
  every basket counter before reading (requirements decision 3), which
  refills each through D6.
- *Visible carters* are a stated non-goal: untaken gigs stay on the board
  for players; `hauls` runs only when the carter is loaded.

**D9 — The river is honest from rows; a reach holds the species it
names.** `WatercourseNode` gains `works?: string[]` (authored on the
course row's nodes); `WatercourseCatalogue.works()` is the union of the
reaches' lists (no `findByClass`); `worldScan` reads each work LIVE when
standing, else its ROW by exact path (`Template.findByPaths(paths)` — one
indexed query — for `dischargeLoadPerSecond`, `dischargeKind`, `on`,
`direction`, `capacityM3S`), so an unloaded outfall fouls and a shut
sluice stops drawing the moment it is shut. `FisheryRegistry` drops
`readSpecies`: `standingAt` iterates `reach.stocks[]` and
`seaStandingAt` the sea's + band's `stock` keys, `singleton`-loading
each named species; `WatercourseStock.capacity` becomes optional — a
named species with no capacity keeps today's habitat-fit derivation
(the limiting-factor prose survives). The reaches that should hold fish
are authored (W3 names them). A reach naming none has no fish.

**D10 — Residence: the extent's zone names its institution; the desk
and the agent name their books.** `institutions:` (D1) on the zones
over Duncan Hall, Mayfield Row and Hinkley Hills name the dorm-warren,
the Seznick building, the plat book and the lot holder;
`OuterWarren.institutionsCovering(key)` resolves the key's zone, awaits
`institutionsLoaded()`, and filters the standing institutions (and
those of the zone's ancestors) whose `parentExtent` prefixes the key.
`ResidenceCatalogue`'s `findWhereDataHas` goes. `DeedDesk` (the
residence pack's own class) gains `books: string[]` (persistent,
authorable, `cites: true`); `title list` lists the books of the
reachable desk (`reachable:[class.DeedDesk]`, the JobBoard precedent)
and answers "there is no registry here" without one; `Realtor` (the
terminus pack's class) gains `books: string[]` the same way and
`offers()` takes the realtor instance. `holderPath` on `PlatBook` gains
`cites: true`.

**D11 — `lint:openings` rule 3 flips; two new gates; two ratchets.**
Rule 3 becomes: *a house that advertises (and any house with
`operatingLocations`) is named in the `businesses:` of exactly one row
whose path is a prefix of every one of its operating rooms* (the zone
over its premises). New `lint:boot-entries` (`scripts/check-boot-entries.ts`):
reads every pack's `boot:`; the count is a ceiling pinned at the number
left after this build, may fall and never rise; every entry's `reason`
must be non-empty (already parsed) and the gate prints the roster so a
rise is a visible diff. New `lint:template-scans`
(`scripts/check-template-scans.ts`): `Template.findByClass |
findByPathInfix | findWhereDataHas | findDescendants(` outside an
allowlist of sanctioned homes with a one-line reason each (the location
graph, author tooling — `Ls`/`Rm`/`Grep`/`Cms`/`Sandbox`/wiki
composition, the lazy typed-word dictionaries' `warm()`, `TemplateLogic`,
`LocationGraphRegistry`), ceiling pinned at the post-build count.
`RegistryWideReaders` gets a pinned pair count in `S/api/__tests__`
(ratchet; W6 lowers it by four). Both new gates self-enrol through
`lint:family`.

**D12 — `isSentient` fails CLOSED.** `SpeciesLogic.isSentient` throws a
named `SpeciesUnresolved` error when `_speciesPath` is set but the row
is not resident; `ButcherController`, `SlaughterController` and
`TransfuseController` refuse on it (*"you cannot make out what it
was"*); the two tolerant wrappers keep their catch (accountability and
hazard are not the person gate). With D4 the throw is a defect signal,
never a path a player meets.

**D13 — Part 1's nine, each by the owner's question.** (3) displays a
mind can drive: `DisplayLogic` keeps `principal → live displays`
(registered from `setPrincipal` on write, dropped in `onDestruct`);
`resolveScreen`'s mind path asks it for each business the actor is
employed by / proprietor of, then `mayDrive` over that handful; the
`resolveScreen` glob pair goes. (4) `BankMixin.setBank` registers the
branch with `BankingLogic` on write, `onDestruct` removes; `branchOf` is
a map read; the pair goes. (5) `holdsAnyPublishingPosition` asks the
principal's own employments (`EmployedMixin.getEmployments()` → each
organization by path, `singleton`) and the proprietor memo; the pair
goes. (6) `AttendantLogic` keeps `customer → points` written by the
lease and queue paths (`requestAttention`, `enqueue`, `dropCustomer`),
and `onPlayerDisconnected` reads it; `allPoints` stays for the idle
sweep (a sweep). (7) dissolves with the spawn sweep; `takeCensus` reads
`findByMixin('CirculatingMixin')`. (8) `StuffApi` gains a `byDocPath`
index on registered objects carrying a string `path` (Template objects),
maintained in `#updateIndexes`; `findTemplatesByPath` reads it. (9) the
wiki composition page is allowlisted with its reason. (10)
`Template.#inheritedMatches` memoises the `extends` row set per process,
dropped by `Template.save()`/delete (the hook the writes already pass
through) and the pack reconcile.

**D14 — The premises boot entries go WITH the refill, not before it.**
A `Stock` stood up alone (no room) is the reentrant-populate defect the
oilworks note records; so W1 removes only the advertising houses' and
the beat-running houses' entries that the zone now names, and W2
removes the 23 premises rooms together with the sweeps and the
`stockLines` authoring.

---

## ⭐⭐ Host placement

| new field / mixin / class | host | what composing it claims |
|---|---|---|
| `businesses: string[]` (instruction) | `SpatialZone` | every region in space may name the houses operating in it; a `FolderZone` cannot (the `stocks`/`address` reasoning verbatim). Never `Location`. |
| `institutions: string[]` (instruction) | `SpatialZone` | same. |
| `currentAsOfS`, `ordering`, `editions`, `lastEditionS` | `BusinessMixin` (`currentAsOfS`, `ordering`) / `OrganizationMixin` (`editions`, `lastEditionS`) | a trading house has a clock and a buying policy; ANY organization may publish on a schedule (the Gazette is an `Organization`, not a Business). `editions` is read only by `PublisherMixin` hosts — the Gazette composes both; a non-publisher authoring `editions` is refused by the setter. |
| `PersistableMixin` on `BusinessEntity` | `S/platform/idea/Business.ts` (the concrete twin only) | every authored house is a snapshot host keyed by its row path — exactly what `payrollArrears: { persistent: true }` already claimed. Not on the mixin: a test business built on another base is not thereby a persistence host. |
| `stockedAtS`, `bringCurrent()` | `StockMixin` (`S/lib/retail/Stock.ts`) | every counter with lines refills by elapsed time. ⚠ Not on `ConsignmentShelfMixin`: a pure brokerage shelf has nothing to refill. |
| `consignors: string[]`, `bringCurrent()`, `takeConsignment()` | `ConsignmentShelfMixin` (`S/lib/retail/Consignment.ts`) | any shelf may name the floors that feed it (empty by default; the cash-and-carry authors it). |
| `works?: string[]` on a node; `capacity?` optional on `WatercourseStock` | `C/water/src/idea/Watercourse.ts` (the water pack's row shape) | a reach may name the works on it and the species in it. |
| `books: string[]` | `DeedDesk` (`C/residence/src/thing/DeedDesk.ts`) and `Realtor` (`C/terminus/src/realty/agent/Realtor.ts`) | a desk fronts named books; an agent fronts named books. Two pack classes, no kernel field — a third fronting class is the signal to promote. |
| `cites:` fieldMeta key | `TemplateApplier` (kernel) + each citing field's declaration | a declared citation is LOADED by the applier. Adding `cites: true` to `_speciesPath`, `_biomePath`, `_materialPath`, `_detailMaterialPaths`, `interiorMaterial`, `surfaceMaterial`, `_decayProductPath`, `_bodyPlanPath`, `_parentCladePath`, `parentOrganization`, `proprietorPath`, `institution`, `holderPath`, `house` (Ship), `principal` (Display), `books`; `cites: '<catalogue>'` on `_brandKey`, `constructionForm`, `maturationProfileKey`, `runScheduleKey`, a condition's cited path, a discipline key field. ⚠ NOT on `container:` (already an instruction that loads) and NOT on `operatingLocations` (a business must not stand its rooms up — the direction D1 reverses). |
| `SpeciesUnresolved` | thrown by `SpeciesLogic` | a named error class in `S/lib/species/` (a value object of the species substrate), not a free helper. |
| `byDocPath` index | `StuffApi` `#indexes` | one more index in the one audit point. |
| maintained maps (`businessByLocation`, `branchByBank`, `displaysByPrincipal`, `pointsByCustomer`) | the owning logic singletons | memos filled on write, never warmed. |

**The guard test**: none of the above needs a guard that re-narrows the
host set. If W-anything finds itself writing `if (MixinApi.isX(host))`
inside one of these to skip a composer, stop and record the finding.

---

## Convention conformance

- `props:` / `cast:` are the designation fields (`populates:` retired);
  this build adds `businesses:` / `institutions:` beside `structures:`
  as zone designations — all instruction fields, all in `refsOf`.
- Locations, not rooms: `CartesianLocation` / `SingletonCartesianLocation`
  rows; zones are `CartesianZone`. No `FurnishableRoom` touched.
- `<root>/<branch>/` paths: new scripts under `scripts/`; no new class
  files except `S/lib/species/SpeciesUnresolved.ts` (value object) — no
  new module category, no free helper (the `order()` / `supplierCounterOf`
  / `pendingKinds` helpers in `restocks.ts`/`stocks.ts` move into
  `EmploymentLogic` as module-private functions of a logic singleton,
  the sanctioned home).
- Module scope declares; lifecycles initialize: every warm stays in
  `onCreate`/`warmed()`; every index fills on a setter or `onRestored`.
- `lint:imports`: packs import the kernel by package specifier only;
  the water pack reads rows via `Template.findByPaths` through
  `@saxonberg/server/mud/lib/stuff/Template` (already imported there).
- Verbs on objects: `stock.bringCurrent()`, `shelf.bringCurrent()`,
  `board.bringCurrent()`, `house.bringCurrent()` are methods; the Api
  forwards (`EmploymentApi.bringCurrent` stays a thin forwarder).
  `MqlApi` is `resolveOne` / `resolveMany` only.
- Lint gates this build must pass: `lint:family` in full, and
  specifically `lint:openings` (rewritten), `lint:census`, `lint:gates`,
  `lint:world-scan`, `lint:whole-table`, `lint:field-meta`,
  `lint:on-create` (ceiling 82 / 35 — **no rise**), `lint:lib-statics`
  (no rise), `lint:instanceable`, `lint:reachability`,
  `lint:no-authored-faucet`, `lint:idle-cadence`, `lint:unconsumed-seams`,
  `lint:mixin-names`, `lint:schema`, `lint:test-bootstrap`, plus the two
  new gates `lint:boot-entries` and `lint:template-scans`.
- No new Mongo collection; no migration — a dev DB that predates a
  renamed field is DROPPED (the `holder_snapshots` capture of a counter
  gains `stockedAtS`; a missing stamp reads as "now").
- No new `isWizard` check anywhere.

---

## Waves

Each wave ends at a commit, lands with `pnpm test:near` + every touched
pack's vitest + `lint:family` green, and leaves the shipped wire drives
passing. Content re-authoring lands in the wave whose mechanism it
feeds.

### W0 — Substrate: the zone stand-up mechanism, `cites:`, the gates at census

**Goal.** Everything later waves consume, with no behaviour change yet.

**Implements** D1 (mechanism), D4 (applier), D11 (gates at census).

**Files.**
- `S/lib/zone/SpatialZone.ts` — refactor `applyStructures` into a private
  `standUp(field: 'structures'|'businesses'|'institutions', paths)` +
  `loadedPromise(field)`; add `businesses` / `institutions` to
  `fieldMeta` (`{ instruction: true, authorable: true }`),
  `applyBusinesses`, `applyInstitutions`, `businessesLoaded()`,
  `institutionsLoaded()`, `getBusinesses()`, `getInstitutions()` (sync,
  live, narrowed by `MixinApi.isBusiness` / `isOrganization`). Keep
  `structuresLoaded`/`getStructures`/`structureOf` byte-identical in
  behaviour. `S/lib/expanse/Expanse.ts` override untouched.
- `S/platform/idea/TemplateApplier.ts` — the `cites` step after phase 1
  (D4), warn-not-throw; `S/lib/mixin.ts` `FieldMeta` type gains
  `cites?: true | string`; `scripts/check-field-meta.ts` `KNOWN_PROPS`
  gains `cites`; `MixinApi.getAllCitingFields(ctor)` beside
  `getAllInstructionFields`.
- `scripts/check-template-census.ts` `refsOf` — add `businesses`,
  `institutions`, `books`, `consignors`, `works` (nested under
  `nodes[]`), `stocks[].species` (nested), and every field a class
  declares `cites: true` (read the fieldMeta census the gate already
  parses, or list them explicitly beside `_speciesPath`).
- `scripts/check-boot-entries.ts` + `package.json` `lint:boot-entries`
  — ceiling **128** at W0 (lowered by each wave that removes entries;
  pinned finally in W6). `scripts/check-template-scans.ts` +
  `lint:template-scans` — census of the 36 files at W0 with every file
  allowlisted and a reason stub, ceiling = that count (lowered per wave).
  `S/api/__tests__/registry-wide-readers.test.ts` — pins 12.
- `docs/subsystems/templates.md` — the `cites:` paragraph under *Property
  vs instruction fields*; `docs/subsystems/zone.md` — the three
  designations; `docs/lint-family.md` — the two gates.

**Tests.** `SpatialZone.test.ts`: `businesses:`/`institutions:` kick
and resolve, a path that does not stand up warns and the rest still
load; `TemplateApplier.test.ts`: `cites: true` loads a cited row on
clone AND on restore, `cites: '<path>'` loads the fixed row, a bad path
warns; the two gate scripts have a `--list` and fail on a rise.

**Acceptance.** `lint:family` green; no boot entry removed yet; the
maritime wire drive passes.

**Commit.** `feat(zone): businesses:/institutions: beside structures:; cites: in fieldMeta; boot + scan ratchets at census`

### W1 — Employment: the zone names its houses; a house catches up on load

**Goal.** AC 2, 3 (and the first half of 1).

**Implements** D2, D3, D7 (the employment half), D11 (rule 3), D14.

**Files.**
- `S/platform/idea/Business.ts` — `BusinessEntity` composes
  `PersistableMixin`; `currentAsOfS` (persistent), `ordering`
  (persistent, authorable: `{ board, bench, rewardMinor, batch }`);
  `setOperatingLocations` / `setProprietorPath` call
  `EmploymentApi.noteBusiness(this)`; `onDestruct` →
  `EmploymentApi.forgetBusiness(this)`; `onRestored` →
  `EmploymentApi.bringCurrent(this)`.
- `S/platform/idea/api/EmploymentLogic.ts` — delete
  `buildOperatorIndex` + `operatorIndex` + the miss-rescan in
  `businessByKey` + `invalidateBusinessCache`'s use as a rescan; add
  `noteBusiness`/`forgetBusiness` (gated to the Business participant);
  `ensureOperatorAtInternal` per D2 (zone → `businessesLoaded()`);
  `bringCurrent` per D3 with `integrateShiftWages(business, fromS, toS)`
  (module-private; walks hours with `DefaultCalendar.decompose`,
  settles each completed shift via `payHouseWageImpl`; the open shift
  at `toS` is left to `tickBusiness`'s normal boundary settle — its
  `onShiftSince` stays the true start); `operatorsAtImpl` adds the
  forward step: each fixture's own `getBusinessPath()` (Attendant)
  resolved with `singleton`; `runTick` unchanged (live houses). Remove
  the `EmploymentApi.tickRoster()` line from `S/backend/AppBootstrap.ts`
  (keep the Api method — tests use it).
- `S/platform/idea/cmd/perception/LookController.ts:315` — before
  `noticesAt`, `await ZoneApi.businessesReadyAt(here)` (one awaited
  `businessesLoaded()` on the room's zone; a null zone is a no-op).
- `S/api/employment.ts` — `noteBusiness`, `forgetBusiness`; `bringCurrent`
  doc updated. `S/api/zone.ts` — `businessesReadyAt(location)`.
- `S/platform/idea/AccessRegistry.ts:505-530`,
  `S/platform/idea/api/BankingLogic.ts` (treasury touches),
  `S/platform/idea/api/PressLogic.ts` `resolvePublisherImpl`,
  `S/platform/idea/cmd/employment/AppointController.ts:94` — `singleton`
  at the read (D7); delete `reportUnresolvedOrganization`.
  `S/lib/employment/Organization.ts` `parentOrganization` /
  `proprietorPath` and `S/lib/employment/Employed.ts:322` `institution`
  gain `cites: true`. `S/platform/idea/Ship.ts` `house` gains `cites: true`.
- `scripts/check-openings.ts` — rule 3 rewritten (D11); `bootByPack`
  deleted; a `businessesByZone` map built from every row's `businesses:`.
- **Content** (same wave): add `businesses:` to every zone over a house's
  premises — terminus: `general-store.yaml` (`general-store/business`),
  `counting-houses.yaml` (`counting-houses/business`,
  `distributor/idea/business`, `/world/terminus/gazette`),
  `wharfside/{mill,dyehouse,knackers,tannery,chandlery}.yaml`
  (their `idea/outfit`), `goods-yards/{veshko,hollis,crowsfoot,oilworks,
  bottling,pantry,brewing,farm,vintner}.yaml` (their `idea/outfit`),
  `mayfield-row.yaml` (`idea/agency`), `mayfield-row/tailor.yaml`
  (`idea/outfit`), `registry.yaml` (`registry/business`), `infirmary.yaml`
  (`infirmary/idea/{window,bloodworks}`), `market.yaml` (stalls' houses
  as authored), `hesper.yaml` is NOT needed (the ship's `house:` cites
  its outfit); lounge `lounge.yaml` (`/world/lounge/idea/business`);
  `hearthworks.yaml` (`hearthworks/idea/business`); `campus-farm.yaml`
  (`campus-farm/idea/farm-unit`), `duncan-hall.yaml` (`idea/college`).
  Use `grep -rl operatingLocations C/*/content` as the checklist — 61
  rows, each named by exactly one zone (rule 3 enforces it). Mara's
  `restocks` config `board`/`bench`/`reward`/`batch` move to
  `/world/lounge/idea/business.yaml` `ordering:`; the brain reads the
  house (`restocks.ts` keeps posting through the shared method — D8's
  gig half lands in W2, so in W1 `order()` still lives in the brain but
  reads `house.getOrdering()`).
  Remove boot entries: F1 (6: lounge business, campus farm-unit,
  terminus `counting-houses/business`, hesper outfit, tailor outfit,
  hearthworks business), F2 (21 outfits/businesses/agency/college/gazette
  — NOT their rooms), E (11: four `/compact/*`, five corpo orgs, two
  newbie-wilds institutions), the lounge `idea/business`. Lower the
  boot-entries ceiling to the new count.
- Docs: `employment.md` (reverse §"Live businesses only", the
  `lint:openings` paragraph, `bringCurrent` = catch-up, the stamp);
  `content-packs.md:1140-1156` corrected; `terminus/pack.yaml:131-136`
  and `eternal-university/pack.yaml:53` comments corrected.

**Tests.** `EmploymentLogic` unit: a business standing up enters the
index on write; `ensureOperatorAt` on a cold room stands the zone and
its houses up and answers; `bringCurrent` over a 3-day gap settles the
right number of shifts at today's rate through the ledger
(`bank_ledger` rows, never a balance assignment) and leaves
`currentAsOfS = now`; a restored house catches up once; a fresh house
stamps now. `check-openings` fixture: an advertising house named by no
zone fails; named by two fails.

**Acceptance.** On a fresh DB with the F1/F2/E entries gone: walk into
the Hearthworks → HELP WANTED on first look (AC 2); advance a game day,
walk into the general store → the keeper or cover is behind the counter
(AC 3); `trades-and-labor`, `economic-bootstrap`, `work`,
`blood-economy` wire drives pass.

**Commit.** `feat(employment): the zone names its houses — no table scan, no miss rescan; a house catches up on load through the ledger; lint:openings rule 3 flipped`

### W2 — Stock refills on load; supply derived at the receiving end; the sweeps retire

**Goal.** AC 4, 5, 6 (the price index half), second half of 1.

**Implements** D6, D8, D14.

**Files.**
- `S/lib/retail/Stock.ts` — `stockedAtS`, `bringCurrent(nowS)` (import
  refill; supplied terms purchase via the supplier house's operating
  counter — `EmploymentApi.counterOf(business)` resolves the Stock named
  in the house's `operatingLocations`/fixture `businessPath`), `onCreate`
  keeps `reset()` for a fresh counter and stamps; `onRestored` →
  `bringCurrent`; delete `resetsWhilePresent`.
- `S/lib/retail/Consignment.ts` — `consignors`, `bringCurrent`,
  `takeConsignment(stock, outfitPath, goods, askFor)`; the chattel stamp
  + `recordListing` moved here from `ConsignController` (the controller
  calls it — mixin authoritative, controller dumb).
- `C/trade-shopkeeping/src/behavior/consigns.ts` → calls
  `shelf.takeConsignment` for what it carried; `stocks.ts` → calls
  `counter.bringCurrent` then does only the cash rung; `S/lib/behavior/
  restocks.ts` → `order()` + `pendingKinds` move to `EmploymentLogic`
  as `orderShortfallImpl`; the brain calls `EmploymentApi.orderShortfall
  (house)`; `S/lib/behavior/prints.ts` → `lastEditionS` read/written on
  the Organization, the print itself via `OrganizationMixin.printDueEdition
  (now)`; `S/platform/thing/JobBoard.ts` — `bringCurrent()` (posters =
  `EmploymentApi.operatorsAt(room)`), called from `JobController`'s
  browse; `S/platform/idea/api/BankingLogic.ts` `priceIndexImpl` async +
  `singleton` per basket counter (and `BankingApi.priceIndex` signature;
  callers: `prints.ts`, the `reserve` dashboard controller);
  `S/platform/idea/api/PressLogic.ts` `pressRoomImpl` → per publisher
  `bringCurrent(now)` (prints a due edition per D8).
- `S/lib/employment/Organization.ts` — `editions`, `lastEditionS`,
  `printDueEdition(now)` (stands the seat's rostered assignee up and
  `executeCommand`s the post; refuses on a non-publisher host).
- `S/platform/idea/api/ResidencyLogic.ts` — delete `collectSpawnCandidates`,
  `spawnNow`/`installSpawnSweep`, the reset sweep (`installResetSweep`,
  `runResetSweep`), `SpawnTable` draw + `rollBlessing` at spawn
  (`S/lib/residency/SpawnTable.ts` goes if nothing else reads it);
  `takeCensus` over `findByMixin('CirculatingMixin')`; `ResidencyWarden`
  arms eviction only; `S/backend/AppBootstrap.ts` spawn line removed;
  `S/api/stuff.ts` `RegistryWideReaders` drops `spawnNow`;
  `S/lib/zone/SpatialZone.ts` drops `stocks`/`favours`/`blessingOdds`;
  `S/lib/residency/Circulating.ts` drops `regionTarget`;
  `C/platform/content/settings/residency.yaml` drops the spawn keys
  (keep `residency.reset.intervalS` — now the refill period; rename the
  doc line, not the key).
- `C/trade-farming/src/thing/ToolRack.ts` — `onRestored` → `reset()`;
  the yard's look path calls `rack.reconcile(viewer)` which runs
  `reset()` only when the viewer is the sole occupant.
- **Content**: `stockLines` on every producer floor's stock
  (`C/terminus/…/goods-yards/*/thing/stock.yaml`, `wharfside/mill/thing/
  stock.yaml`, `infirmary/thing/*` cold case, rejection's ferrow floor)
  carrying the pars the three zone `stocks:` tables and each row's
  `regionTarget` gave (Veshko: the seven spirit lines at 24/18/18/18/18/
  12/12); `prices:` where the hands' `askFor` config set asks; delete the
  three zone `stocks:`/`favours:` blocks and every `regionTarget:`;
  cash-and-carry counter `consignors:` = the nine producer stock paths;
  `/world/terminus/gazette.yaml` `editions: [{ kind: price-index,
  everyGameHours: <press.indexEditionGameHours>, positionKey: editor }]`;
  Mara's bar business `ordering:` (if not landed in W1). Remove boot
  entries G (23 premises rooms) and the lounge `thing/terminal` /
  `check-rack` ONLY IF W4 has not yet landed them — otherwise leave to
  W4. Lower both ratchets.
- Docs: `retail.md` (the counter's clock, the approximation),
  `residency.md` (the sweeps retired; the faucet is the counter's lines),
  `credit.md` (drive step 6 → derived on terms), `press.md` (the edition
  policy on the Organization), `behavior.md:613-620` (the brains share
  the house's methods), `spawn-distribution-slate` (the homeless rows,
  the random faucet needs a namer), `magic-items.md` census line.

**Tests.** `Stock.test.ts`: refill proportional to the gap, never above
par, zero on a zero gap; a supplied line moves goods from the supplier's
counter as terms listings and never mints; `Consignment.test.ts`:
`bringCurrent` lists up to headroom/par/on-hand, idempotent on a second
call with no gap; `JobBoard.test.ts`: a board whose poster's line is
short gains ONE gig and a second `bringCurrent` adds none;
`Organization.test.ts`: a due edition prints once per window;
`BankingLogic.test.ts`: `priceIndex` loads an unloaded basket counter.

**Acceptance.** Drive steps 3–6 on a fresh DB with every G entry gone;
`economic-bootstrap`, `trades-and-labor`, `work`, `cold-storage`,
`blood-economy`, `whiskey`, `grain-chain` wire drives pass.

**Commit.** `feat(retail): a counter refills on load; the cash-and-carry, the job board and the Gazette derive their suppliers' work at the receiving end; the spawn and reset sweeps retire`

### W3 — Water and fishing: the reach names its works and its species

**Goal.** AC 7.

**Implements** D9.

**Files.** `C/water/src/idea/Watercourse.ts` (`works?` on the node
shape, `capacity?` optional, the setter validations),
`C/water/src/idea/WatercourseCatalogue.ts` (`loadWorks` → the reaches'
lists; `worldScan` live-else-row; delete the two `findByClass`; the
`findDescendants('/stuff/idea/Watercourse')` index compile stays
allowlisted with its reason — it is the water SYSTEM's own index of its
courses, keyed by the citation a Locality authors — or, preferably,
becomes a lazy index warmed on the first `_reach` resolve, which is the
typed-citation shape), `C/water/src/idea/FisheryRegistry.ts` (delete
`readSpecies`/`species()`/the memo; iterate named stocks; `singleton`
per species). **Content**: `kestrel.yaml` nodes `confluence` gets
`works: [/world/terminus/wharfside/thing/city-intake, …/city-outfall,
…/aqueduct-house, …/cold-fell-aqueduct]` (place each on the node its
`reachRef` names), `delight.yaml`'s reach gets `millrace`; `stocks:` on
the reaches the drives fish — `kestrel:confluence` (eel, carp, grey-mullet),
`kestrel:headwaters` (brown-trout), `delight:flats` (carp, eel), the
three meres and `holloway:vale` as their habitats fit — capacity
omitted (derived) unless the row already authored one. Boot: none to
remove here. Lower the scan ratchet.

**Tests.** `WatercourseCatalogue.test.ts`: contamination below an
outfall whose object is NOT standing equals the row's load attenuated;
a standing, shut work draws nothing; `FisheryRegistry.test.ts`: a reach
naming no species has none; a named species with no capacity derives
fit. Docs: `watershed.md:714-726` rewritten; `fishing.md` (the reach
names its species).

**Acceptance.** Drive step 8; `fishing`, `climate-and-water`,
`maritime-space` wire drives pass.

**Commit.** `feat(water): the reach names its works and its species — an unloaded outfall fouls; the species class scan goes`

### W4 — Residence and cross-town listings

**Goal.** AC 6 (realtor half), AC 10; H and I boot entries.

**Implements** D10.

**Files.** `S/lib/location/OuterWarren.ts` (`institutionsCovering` via
the zone chain; `admitFor` unchanged otherwise), `C/residence/src/idea/
ResidenceCatalogue.ts` (no scan; keep as the pack's resolver facade or
delete), `C/residence/src/thing/DeedDesk.ts` (`books`),
`C/residence/src/idea/PlatBook.ts` (`holderPath` cites),
`C/residence/src/behavior/maintains.ts` (`holdingsUnder` via the zone),
`S/platform/idea/cmd/civics/TitleController.ts` (`title list` through
the reachable desk), `C/terminus/src/realty/agent/Realtor.ts` (`books`;
`offers(realtor)`). **Content**: `duncan-hall.yaml` `institutions:
[…/idea/dorm-warren]`, `mayfield-row/seznick-house.yaml` `institutions:
[…/building]`, `hinkley-hills.yaml` `institutions: [idea/plat-book,
idea/lot-holder]`; `registry/desk.yaml` `books: [/world/terminus/
hinkley-hills/idea/plat-book]`; `ricky.yaml` `books:` likewise; the
lounge `bar.yaml` props the terminal (verify — the TPA network cascades
from any node by `singleton`, `FastTravel.ts:14-15,392`) and
`office.yaml`/`bar.yaml` props the check-rack (its `seatIn` stays the
forward reference). Remove boot entries H (4), I (5: three farmstead
books already in `farmstead-yard.yaml` props, plat-book, lot-holder).
Lower both ratchets. Docs: `residence.md`, `holding.md` (the keyed-room
re-entry walks the zone), `fasttravel.md` (no eager root).

**Tests.** `OuterWarren.test.ts`: `admitFor` on a cold world stands the
zone's institution up and admits; `TitleController` test: no desk →
refusal, desk → the named book; `Realtor.test.ts` over `books`.

**Acceptance.** Drive steps 7 and 11 (11 by hand: log out in a keyed
dorm room, restart, log in there — recorded in the drive record);
`residences` and `tpa` behaviours in `platform-smoke` / `reachability`
drives pass.

**Commit.** `feat(residence): the zone names its institutions; the desk and the agent name their books; no warren, book or prop is booted`

### W5 — Vocabularies and species: holders load what they cite; dictionaries are lazy

**Goal.** AC 8, 9; the A/B/D boot categories.

**Implements** D4 (the declarations), D5, D12.

**Files.** `cites: true` on every path field in the Host-placement table;
`cites: '<catalogue>'` on `_brandKey` (`S/lib/corpo/Branded.ts`),
`constructionForm` (the garment/construction field — find it in
`S/lib/material/Construction.ts`'s composer), `maturationProfileKey`
(`Maturing.ts`), `runScheduleKey` (`Fractionating.ts`), the condition
citations (`Contaminable`/toxin fields naming `/platform/idea/Condition/*`
— `cites: true` where the value is a path), discipline keys on
`Position.requires.discipline`/`fulfills` (the Business's
`setPositions` awaits `DisciplineCatalogue.warmed()`), dyestuffs (the
`dye` controller awaits `DyestuffCatalogue.warmed()` — a lazy index over
`/**/idea/dyestuff/`). Each lazy catalogue: `warmed()` + `peek`
(ReadingCatalogue shape) — `SpellCatalogue` (MagicLogic `cast`/`spells`
await it; effect validation at warm), `HelpCatalogue` (`help` verb + the
REST help route await), `OperationCatalogue` (`OperateController`),
`DisciplineCatalogue` (`competence`, `apply`, the conferral fold —
`Advancement.ts:171` names the two conditioning stocks by path instead
of `allDisciplines()`), `GovernmentCatalogue` (`government`, civics),
`SoulCatalogue` (emote dispatch), `RecipeCatalogue` (craft resolve),
`ArchetypeCatalogue`, `AddressRegistry` (the first address resolve /
`settleStreetLighting`), `TopicCatalogue` (per the D5 table — the build
reads `MessageLogic.ts` and `S/api/message.ts`'s `send()`; if every sync
read is preceded by an async send, lazy; else the entry stays with that
reason), `CorpoCatalogue` / `FabricCatalogue` / `MaturationProfileCatalogue`
/ `FractionScheduleCatalogue` warmed by the `cites: '<catalogue>'`
hydrations above, `MaterialCatalogue` / `BiomeCatalogue` /
`ConditionCatalogue` with NO roster warm at all (every reader is by
path; keep the classes only if a reader remains — `MaterialApi.findByTag`
has no production caller: delete it). `SpeciesLogic.isSentient` fails
closed (D12) + `S/lib/species/SpeciesUnresolved.ts`; the three safety
controllers refuse on it; `preloadAnatomy` keeps its ancestor ensure
(a species' `_parentCladePath` cites, so it is mostly a no-op).
**Boot**: remove platform A entries (MaterialCatalogue, BiomeCatalogue,
FabricCatalogue, ConditionCatalogue, MaturationProfileCatalogue,
FractionScheduleCatalogue, CorpoCatalogue, ReadingCatalogue,
PlacementCatalogue, SpellCatalogue, HelpCatalogue, OperationCatalogue,
DisciplineCatalogue, GovernmentCatalogue, SoulCatalogue, RecipeCatalogue,
ArchetypeCatalogue, AddressRegistry; TopicCatalogue per the table), B
(5 species), D's `AddressRegistry`/`HelpCatalogue`, trade-dyeing's
catalogue; rewrite base-library's universe-biome reason. Lower both
ratchets. Docs: `race.md` (the organism loads its species),
`materials-response.md:130-142` (the fabric warm is a citation),
`instrumentation.md`, `magic.md`, `help.md`, `biome.md`,
`maturation.md`, `fractionation.md`, `corpo.md`, `textiles.md`
(dye), `advancement.md`.

**Tests.** Per catalogue: cold → first typed use answers correctly
(unit, with `StuffApi.clearAll` between); `Organism.test.ts`: a cloned
collie has its species resident without a boot entry; `butchery.test.ts`:
butchering with a cold species row refuses (the gate fails closed) and
with a cited one refuses on sentience; `Branded.test.ts`: a bottle's
brand resolves on a cold world.

**Acceptance.** Drive steps 9 and 10; `instrumentation`, `apiculture`,
`carcass-chain`, `taps`, `farmstead`, `textiles`, `whiskey-styles`,
`clinical-medicine`, `crafting`, `cooking` wire drives pass.

**Commit.** `feat(templates): cites: — a holder loads what it cites; typed-word dictionaries warm on first use; isSentient fails closed; no vocabulary or species is booted`

### W6 — Part 1's nine, the ratchets pinned, the docs

**Goal.** AC 11, 12; the gates become ratchets at their final counts.

**Implements** D13, D11 (final pins).

**Files.** `S/lib/command/CommandController.ts` + `S/platform/idea/api/
DisplayLogic.ts` + `S/lib/display/Display.ts` (`setPrincipal` notes,
`onDestruct` forgets); `S/platform/idea/api/BankingLogic.ts` +
`S/lib/banking/Bank.ts` (`setBank` notes); `S/platform/idea/api/
PressLogic.ts` (`holdsAnyPublishingPosition` via the principal's
employments); `S/platform/idea/api/AttendantLogic.ts` + `S/lib/attendant/
Attendant.ts` (the customer index); `S/api/stuff.ts` (`byDocPath`;
`RegistryWideReaders` minus `branchOf`, `holdsAnyPublishingPosition`,
`resolveScreen`, `spawnNow` → 8 pairs; the test pins 8);
`S/lib/stuff/Template.ts` (the `extends` memo + invalidation on
`save`/delete; `S/platform/idea/api/PackLogic.ts` reconcile calls
`Template.invalidateInheritance()`); `S/lib/wiki/components/composition.ts`
allowlisted with reason. Final pins: `lint:boot-entries` ceiling = the
count now in the tree; `lint:template-scans` ceiling = the files that
remain, each with its reason. Docs: `display.md`, `banking.md`,
`press.md`, `attendant.md`, `mql.md`, `templates.md` (the memo),
`lint-family.md` (the two gates + the ratchet lesson), `antipatterns.md`
(*a reference that points away from the asker*), `residency.md`.

**Tests.** `resolveScreen` mind path tries only the actor's houses'
displays; `branchOf` on a bank with no branch does not enumerate
(spy on `findByMixin`); `holdsAnyPublishingPosition` for a stranger
reads no publisher bucket; a disconnect drops only the points the
customer held; `findTemplatesByPath` is a map read; `findByClass` twice
runs the `extends` query once and again after a save.

**Acceptance.** Drive step 12; `world-scan`, `envelope`, `consequence`,
`presentation` wire drives pass; `lint:family` green with both ratchets
pinned.

**Commit.** `refactor(scan-sweep): the nine registry scans ask their owners; the extends union is memoised; boot-entry and template-scan ratchets pinned`

### W7 — The drive

`packages/wire/tests/scan-sweep.dirty.wire.test.ts` (D16 of the wire
harness: `.dirty` because it takes a job, buys, posts, prints and
advances the clock). Then the full suite ONCE, the drive record appended
below, the MR opened.

---

## Reachability wiring

For each capability: **verb · affordance · data · boot · arg gate**.

| capability | verb | affordance | data (the row that must exist) | boot | arg gate |
|---|---|---|---|---|---|
| a house advertising on first look | `look` (existing) | — | the zone's `businesses:` names the house; the house's `operatingLocations` names the room | NONE (the point) | `lint:openings` rule 3: unnamed → fail at build |
| a house catching up | `look`/`buy`/`order`/`house` | — | `currentAsOfS` in the house's snapshot | none | a house with no snapshot stamps now |
| a counter refilling | `look`/`buy` | the counter's existing contributions | `stockLines` with `par` — **a floor with `stockLines: []` refills NOTHING**; W2's content checklist is every `thing/stock.yaml` | none | `lint:counters` (existing) + a new W2 unit test that every producer stock row authors ≥1 line |
| consignment derived | `look` at the cash-and-carry, `buy` | — | `consignors:` on the counter; each named stock's `businessPath` | none | an unnamed consignor silently consigns nothing → `refsOf` resolves the paths; the W2 test asserts the nine |
| gigs derived | `job` | the board's existing affordance | the house's `ordering:` + `parLines` with suppliers; the board in a room the house operates | none | a board in a room no house operates lists only player postings (an answer) |
| the Gazette edition | `press` / the ticker | — | `editions:` on the Gazette row; `press.frontPage` naming it; the editor on its roster | none | a publisher without `editions` prints nothing (an answer) |
| price index over the basket | `press`, `reserve` | — | `reserve.indexBasket` naming counters that EXIST (`refsOf` cannot see a setting — the W2 test resolves each path) | none | — |
| the river fouled from rows | `analyze water` | the existing reading row | `works:` on the reach node; the work row's `reachRef` matching | none | a work on no reach's list discharges nowhere → `refsOf` resolves `works`; a W3 test asserts every Conduit/ControlStructure row is named by its reach |
| fish by name | `fish` | — | `stocks[].species` on the reach | none | a reach naming none bites nothing (intended) |
| keyed-room re-entry | login | — | `institutions:` on the zone over the extent | none | `admitFor` null → "host left where cloned" warning (existing); W4 test |
| `title list` | `title` | Persona (existing) | `books:` on the reachable `DeedDesk` | none | no desk → refusal note `no-registry` |
| Ricky's list | dialogue `realty-list` | the Realtor's tree | `books:` on Ricky's row | none | empty → "nothing on the books" |
| typed-word dictionaries | `measure`, `cast`, `spells`, `help`, `operate`, `put` | existing | the rows under their infix/class | none — `warmed()` on first use | a miss after warm is final; `invalidate()` on pack go-live |
| species on a cold world | `butcher`, `shear`, `draft` | existing | `_speciesPath` on the animal/corpse (`cites`) | none | `SpeciesUnresolved` → refusal |
| organizations by reference | `appoint`, `press post --as`, title checks | existing | the citing field (`parentOrganization`, `institution`, a title's holder) | none | a path that does not stand up → the existing refusal, no diagnostic flood |

---

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| 1 fresh boot loads no house / counter / premises / structure / sea / species / content catalogue; every entry has a reason | W1 (houses, orgs), W2 (premises), W4 (warrens, props), W5 (species, catalogues), W6 (pins) |
| 2 first `look` shows an opening with nothing booted | W1 |
| 3 counter staff, closed sign, wages, vacancies correct on arrival after a gap | W1 |
| 4 shelf refilled in proportion, never above par | W2 |
| 5 cash-and-carry, job board, keeper's books reflect the gap unvisited | W2 |
| 6 realtor lists every book; price index covers the basket | W4, W2 |
| 7 water fouled from rows; a reach bites only named species | W3 |
| 8 `measure`/`readings`/`help`/`cast`/`spells`/`operate` first use | W5 |
| 9 `butcher` of a sentient animal refused cold | W5 |
| 10 keyed-room login after restart | W4 (+ by hand) |
| 11 Part 1 spot checks | W6 |
| 12 every shipped drive passes | each wave runs its named drives; W7 runs all |

No AC is unmapped.

---

## Test & gate strategy

- **Unit** (per wave, `test:near`): the mechanisms above, with
  `StuffApi.clearAll` between cold-world cases; every "derived at the
  receiving end" test asserts idempotence on a second call with no gap
  (the double-count guard) and that money moved only through
  `bank_ledger` rows.
- **Gate**: `lint:family` after every wave. The two new gates start as a
  census at W0 and are lowered by each wave; W6 pins them. ⚠ A rise in
  `lint:on-create` or `lint:lib-statics` is a plan defect, not a number
  to raise — this build adds no `onCreate` body and no lib static.
- **Wire** (what only a drive proves): the thirteen steps in W7; each
  wave runs the shipped drives it touches (named per wave) — ⚠ *"not
  refused" is not "succeeded"*: every checkpoint asserts the verb was
  understood AND a state change (the maritime file's rule).
- **`pnpm test`** at exactly two moments: before the MR opens (after
  W7) and at `/finalize`.
- A fresh Mongo DB per worktree; a renamed field = drop the DB, never a
  migration.

---

## Risks & opens

**For the user (product forks the requirements did not decide):**

1. **The derived keeper buys on terms only** (D8). Her rung-1 cash loop
   (`bank borrow` when short, repay at sale) runs only when she is
   loaded. The requirements say "the store keeper's credit history is
   current"; the terms obligations ARE her history, but the credit
   slate's drive step 6 (she borrows on her own cadence with nobody
   connected) becomes "she borrows when somebody is in the store". Is
   that acceptable, or should the derivation also borrow through
   `BankingApi.advance` when a line is a cash line?
2. **Zone-level `stocks:`/`favours:`/`blessingOdds:` are removed with the
   spawn sweep** (D6) and the 13 homeless wand rows stop being drawn
   (they were drawn into nowhere). The spawn-distribution slate keeps the
   design. Confirm the removal rather than leaving three dead fields.
3. **`TopicCatalogue` may remain booted** (D5) if no async send precedes
   every sync topic read; the reason would be written. Confirm that an
   honest surviving entry is preferable to a lazy warm that could drop a
   frame's facets once per process.
4. **A job board's posters default to the houses operating its room**
   (D8) — no `posters:` field. The hearts-delight public-works board and
   the goods-yards board inherit that rule; if a house elsewhere is meant
   to post to them, say so and `posters:` ships.

**Engineering risks the build should price:**

- **Catch-up money at scale.** A house unloaded for a game-year settles
  ~365 shifts' wages on load through `payHouseWageImpl`; the house
  account's working-capital rule and the refusal-on-the-book path carry
  it, but the first load after a long gap may post hundreds of ledger
  rows. Cap nothing; log the count.
- **The awaited `cites:` step lengthens hydration** by one `singleton`
  per citation (a species chain is ~8 rows). The coalescing
  `#pendingSingletons` keeps repeated citations free. If a drive shows a
  room standing up slowly, the fix is to cite fewer rows, not to kick.
- **`Persistable` on `BusinessEntity`**: `StuffApi.singleton` restores
  the record BEFORE returning (Grounding, `stuff.ts:780-815`), so the
  zone's kicked stand-up chain sees a house that has already run
  `onRestored` → `bringCurrent`; the chain's own `bringCurrent` call is
  then a zero-gap no-op. `currentAsOfS` on the restored record is the
  guard either way — `bringCurrent` must be idempotent at a zero gap
  (the W1 test asserts it).
- **Executing `press post` as a stood-up editor with no room**: verify
  `executeCommand` on a containerless NPC dispatches a `press` verb
  (the verb is a Persona affordance, not a room's). If it does not, the
  fallback is to run the post under the editor's identity through the
  same acting-author seam `CommandGiver.executeCommand` uses — read it
  before W2.
- **The `extends` memo** must be invalidated by EVERY template write,
  including the CMS save go-live and the pack reconcile; a stale memo
  hides a child row from a lazy warm.
- **`lint:openings` rule 3's zone resolution** is by path prefix over
  rows carrying `businesses:` — a house whose premises span two zones
  fails it; none does today (the 61 rows).

---

## Deferred seams

- `JobBoard.posters:` — a board posted to from elsewhere (one line, when
  a row needs it). → `livelihood-slate`.
- Exact piecewise replay of a gap (prices and pars as they WERE) →
  `reconcile-chains-slate` (the stamp `currentAsOfS`/`stockedAtS` is the
  attach point).
- The random distribution of homeless `Circulating` rows → a place that
  names what it holds (a magic shop's `stockLines`, or a zone instruction
  that mints into a named container) → `spawn-distribution-slate`.
- Pins / allowances for keeping a thing loaded unobserved →
  `eager-residency-slate`.
- Player automation of labour → `standing-instructions-slate`.
- A `cites:` that may reach back (kicked citations) — not needed; the
  zone designations cover every back-edged case today.

---

## Critical files

Read first, in this order:

1. `docs/requirements/scan-sweep-requirements.md`,
   `docs/slates/builds/scan-sweep-slate.md` (Part 2's table of wrong-way
   references).
2. `S/lib/zone/SpatialZone.ts` (`structures:` — the pattern),
   `S/lib/zone/LocationZone.ts` (`lookOutFrom`),
   `S/lib/expanse/Voyaging.ts` (`onRestored`), `S/lib/expanse/Expanse.ts`.
3. `S/platform/idea/TemplateApplier.ts`, `docs/subsystems/templates.md`
   § Property vs instruction fields, `scripts/check-field-meta.ts`.
4. `S/platform/idea/api/EmploymentLogic.ts` (the memo, `operatorsAtImpl`,
   `ensureOperatorAtInternal`, `runTick`/`tickBusiness`,
   `closedSignImpl`, `settleShiftWageImpl`, `payHouseWageImpl`),
   `S/platform/idea/Business.ts`, `S/lib/employment/{Organization,
   Employed,Roster,ParLine}.ts`, `S/lib/attendant/Attendant.ts`,
   `scripts/check-openings.ts`, `docs/subsystems/employment.md`.
5. `S/lib/retail/{Stock,Consignment}.ts`, `S/platform/idea/api/
   ResidencyLogic.ts`, `S/platform/idea/ResidencyWarden.ts`,
   `S/lib/behavior/{restocks,prints}.ts`, `C/trade-shopkeeping/src/
   behavior/{consigns,stocks}.ts`, `S/platform/thing/JobBoard.ts`,
   `S/api/contract.ts`, `S/platform/idea/api/{BankingLogic,PressLogic}.ts`,
   `docs/subsystems/{retail,residency,credit,press,behavior}.md`.
6. `C/water/src/idea/{Watercourse,WatercourseCatalogue,FisheryRegistry}.ts`,
   `C/world-seed/content/stuff/idea/Watercourse/kestrel.yaml`,
   `docs/subsystems/{watershed,fishing}.md`.
7. `C/residence/src/idea/ResidenceCatalogue.ts`, `S/lib/location/
   OuterWarren.ts`, `S/platform/idea/cmd/civics/TitleController.ts`,
   `C/terminus/src/realty/agent/Realtor.ts`, `docs/subsystems/residence.md`.
8. `S/platform/idea/{ReadingCatalogue,SpellCatalogue,HelpCatalogue,
   DisciplineCatalogue,CorpoCatalogue,FabricCatalogue,MaterialCatalogue,
   BiomeCatalogue,TopicCatalogue}.ts`, `S/platform/idea/api/
   {SpeciesLogic,MessageLogic,MagicLogic}.ts`, `S/lib/species/Organism.ts`,
   `S/lib/corpo/Branded.ts`, `S/lib/material/Construction.ts`.
9. `S/api/stuff.ts` (`RegistryWideReaders`, `singleton`,
   `findTemplatesByPath`, `#updateIndexes`), `S/lib/stuff/Template.ts`,
   `S/lib/command/CommandController.ts`, `S/lib/display/Display.ts`,
   `scripts/{check-world-scan,check-whole-table,check-template-census,
   check-on-create}.ts`, `docs/lint-family.md`.
10. `packages/wire/tests/maritime-space.dirty.wire.test.ts`,
    `packages/wire/src/harness/{session,world,assertions}.ts`,
    every pack's `pack.yaml` `boot:` block, `S/backend/AppBootstrap.ts:205-240`.

---

## The drive (W7) — what each step needs

File: `packages/wire/tests/scan-sweep.dirty.wire.test.ts`, `declareFile
({ packs: [terminus, hearthworks, eternal-university, hearts-delight,
hinkley-hills, water, trade-fishing, world-seed, generic-objects,
saxonberg-lounge, residence, distribution, trade-shopkeeping,
trade-haulage, trade-medicine, arcana, arcane-library], dirtyReason })`.
Every checkpoint: `expectOk` (or a NAMED refusal) AND a state change.

| step | needs |
|---|---|
| 1 boot list | assert from `WIRE_SERVER_LOG` (the installer's boot lines) that no `/world/…`, `/stuff/idea/species/…`, `*Catalogue` line is booted — the honest reading of the installed packs; also `lint:boot-entries --list` in the W6 tests |
| 2 Hearthworks | `Session.open(h, { startLocation: '/world/terminus/hearthworks/location/cookhouse' })`; `look here` → `/HELP WANTED/`; `apply kitchen-hand` → `expectOk` + an `employment` note / `house roster` lists the handle |
| 3 general store | `advanceWorldClock('1 day')`; open at `/world/terminus/general-store/shop-floor`; `look here` → the keeper or cover line; `look counter` → `On the shelves:` with counts ≤ par and ≥ 1; `buy torch` → ok + inventory gains; `advanceWorldClock` past closing → `look counter` → "nobody is behind" |
| 4 cash-and-carry | open at `/world/terminus/counting-houses/cash-and-carry`; `look counter` → consignors' goods present (match a floor keyword: `volk`, `grist`) with none of the yards visited |
| 5 job board | open at `/world/lounge/location/bar` (or any room with a board whose house has short supplied lines — Mara's); `job` → at least one `supply …` gig |
| 6 Gazette | `press` (the ticker/front page) → an edition line `Prices: the basket stands at …`; assert through `reserve` (wizard) or the release text that `lines.length` equals the basket's priced keys (expose the count in the notice or assert via a second `press read`) |
| 7 Ricky + Registry | open at `/world/terminus/realty/office`; `talk ricky` → choose "What's on the books?" → the Hinkley plat book; open at `/world/terminus/registry/office`; `title list` → the book |
| 8 the Kestrel | open at `/world/terminus/counting-houses/banking-hall` (kestrel:confluence, below the outfall; the wharfside bank room never opened); `analyze water` → a fouled reading (level > 0); `fish` at the square/bank with a rod from the store (the fishing drive's recipe) → the bite names one of the reach's `stocks` |
| 9 dictionaries | `measure depth` on water, `readings`, `help <concept>`, `spells`, `cast <a known spell>` (arcana, a caster — reuse the practicum recipe), `operate` at the infirmary — each the FIRST use after boot: run this step before any other step touches them, or boot order makes it vacuous |
| 10 Hearts Delight | open at the farmstead yard; `butcher collie` → refused with the sentience reason; `shear ewe` → ok + fleece; `collect eggs`/the hen tap → ok |
| 11 restart | BY HAND: log out in a keyed dorm room, restart the server, log in → the same room; record in the drive record |
| 12 Part 1 | `house shop` through a paired screen; `bank` at a branch; `press post` as a publisher ok / as a stranger refused (`requiresPublisher`); queue at a counter, close the socket, reopen → the lease is gone |
| 13 maritime | run `maritime-space.dirty.wire.test.ts` in the same wire run; 40/40 |

---

## Drive record

*(appended at build time)*
