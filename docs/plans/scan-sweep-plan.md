# Scan sweep — load on use — implementation plan

Executes [scan-sweep-requirements](../requirements/scan-sweep-requirements.md)
(kind: **refactor/sweep**, lead end: **kernel**; first consumer: the
Terminus realm as it stands plus every typed-word verb). The doctrine:
**content loads when a player's act forces it, by following AUTHORED
references from what is already loaded — never by searching the template
table, and never at boot unless the reason is written down and holds.**

⚠ **This plan replaces one the user rejected in review (2026-10-14).**
What was cut, and why, is binding on every wave below:

- **The NPC economy is out.** No counter refills by elapsed time, no
  derived consignment / gigs / Gazette editions, no retiring the
  residency spawn or reset sweeps. → [unobserved-economy-slate](../slates/builds/unobserved-economy-slate.md).
  The houses and premises whose NPCs act with nobody present **stay
  booted**; only their `reason:` changes, to point at that slate.
- **The classification rule for a boot entry.** An entry whose ONLY
  reason is *a synchronous / live-only read cannot find it* **goes**.
  One whose reason is *its NPC acts unobserved / it runs a beat / it is
  a spawn target* **stays**.
- **One list, on any place.** A room or a zone names what stands with
  it in ONE field — not a field per kind, not zones only. It
  generalises the maritime fix's `structures:`.
- **No new persistence.** Requirements § 7 is binding: persist only what
  no existing record (ledger, clock, row) already holds; capture with
  the host; loss on unload is legitimate. `Business` does NOT become
  Persistable; no `currentAsOfS`, no `stockedAtS`.
- **The marker is the existing identity axis**, split — not a new
  fieldMeta concept.

Paths: **S** = `packages/server/src/mud`, **C** = `packages/content`,
**scripts** = `packages/server/scripts`. Line numbers are as of
`reqs/scan-sweep` at `7d2758d23` and will drift; grep the symbol.

---

## Grounding

Every fact below was verified by opening the file this cycle.

### The worked example — what `stands:` generalises

- `S/lib/zone/SpatialZone.ts:73-75,283-340` — `structures:` is
  `{ instruction: true, authorable: true }`; `applyStructures(paths)`
  stores the paths and KICKS `StuffApi.singleton(p)` per path without
  awaiting (a ship standing up reaches back for its sea; a sea that
  awaited its ships inside its own load would wait on itself), keeps
  `structuresLoading`; `structuresLoaded()` is the awaitable;
  `getStructures()` the sync live read; `structureOf(locationPath)` the
  innermost-extent member walk.
- `S/lib/expanse/Expanse.ts:365-373` — the override: `await
  super.applyStructures(paths); void this.compile()`. `Expanse extends
  SingletonMixin(SpatialZone)` (`:143`).
- `S/lib/zone/LocationZone.ts:60-91` — `addLocation` → `lookOutFrom`:
  the zones/seas a room's `horizon` names are stood up once, kicked,
  non-cascading.
- Four rows author `structures:` today: `C/terminus/content/world/terminus/{hesper,gannet-rock,terminal}.yaml`
  and `C/world-seed/content/stuff/idea/WaterExpanse/greywater.yaml`.
- `scripts/check-template-census.ts:110-215` — `refsOf` is the
  hand-enumerated list of path-bearing fields the census resolves;
  `structures` is read at `:201`. `fishing.md:59`: the census walks
  `nodes[].stocks[].species`.
- `S/lib/stuff/Location.ts:161-175` — `LocationBase =
  AddressableMixin(AmbientLit(Atmospheric(Adornable(Container(Visible(
  Detailed(Perceptible(Stuff))))))))`. Subclasses: `CartesianLocation`
  (`S/lib/location/CartesianLocation.ts:57`, composes `StagedMixin` —
  `props:`/`cast:` live THERE, on `S/lib/stuff/Staged.ts:258-259`, and on
  containers like `Chest`/`Crate`/`Well`), `SphericalLocation`,
  `FurnishableRoom` (`ReservedMixin(StagedMixin(Location))`),
  `CircleFloor`, `Tombstone`, `Offstage`, `VoidLocation`.
- `S/lib/location/CartesianLocation.ts:50-55` — the lesson:
  `PublicLightingMixin` on the base gave a cellar and a mine heading a
  lighting field **and an `onCreate` hook** to answer for; it lives on
  `platform/location/Street`.
- `S/lib/stuff/Location.ts:346-361` — `Location.onCreate` must load
  nothing; `scripts/check-on-create.ts:72-79` pins `ON_CREATE_CEILING =
  82`, `ON_CREATE_LOADING_CEILING = 35`. **No new `onCreate` body in this
  build.** `postRegister` was retired 2026-10-01 (`Stuff.ts:1416`);
  `onCreate` runs AFTER the applier's three phases (`Stuff.ts:1427-1431`).
- `S/platform/idea/TemplateApplier.ts:124-200` — Phase 1 property
  fields: for each declared persistent field in `data`, `set<Field>` if
  defined (AWAITED), else bracket-assign; runs on mint, go-live and
  restore. Phase 2 instruction fields (`apply<Field>`, required), skipped
  on restore. Phase 3 seed, mint only. `reportUnapplied` warns on a key
  nobody applies.
- `S/api/stuff.ts:755-828` — `StuffApi.singleton(path)`: live hit, else
  `clone()` coalesced through `#pendingSingletons`; a `PersistableMixin`
  host with no key is materialized from `holder_snapshots` when a record
  exists, else `seedBornWith()` + first capture. `S/lib/persistence/Persistable.ts:340-350`
  — `seedBornWith` lays down retained `props:`/`cast:` once (the mixin
  overrides `applyProps`/`applyCast` to RETAIN specs). ⭐ So the clone
  step (mint, all three phases) runs BEFORE materialize — a phase-2
  instruction on a persistable place runs on every stand-up.

### The identity axis today

- `S/lib/mixin.ts:148-164` — `FieldMetaEntry.ref?: 'identity' |
  'instance'`; `lifetime`/`inverse` for instance refs only.
- `scripts/check-field-meta.ts:523-539` `KNOWN_PROPS`; `:550`
  `REF_VALUES = {identity, instance}`; `:676-682` the `ref` value check;
  `:722-726` `identity` + `lifetime` refused.
- **Nine `ref: 'identity'` declarations exist** (grep, no tests):
  `platform/thing/ReadingRecord.ts:45,48` (`takenWith`, `sampledAt`),
  `platform/thing/Well.ts:61` (`standing`), `lib/pump/Pumping.ts:139`
  (`mechanism`), `lib/instrument/Sampled.ts:91` (`sampledAt`),
  `lib/butchery/Cut.ts:57,60` (`tissues`, `_speciesPath`),
  `lib/employment/Employed.ts:322` (`institution`),
  `platform/thing/WaterFixture.ts:90` (`suppliedBy`).
- The resolving citation fields declare NO `ref` today — only an
  `authorPicker`: `_speciesPath` (`S/lib/species/Organism.ts:147`;
  `getSpecies()` = sync `findByTemplatePath`, `:225-228`;
  `S/platform/thing/Seed.ts:28`), `_biomePath`
  (`S/lib/biome/Atmospheric.ts:405`), `_materialPath` /
  `_detailMaterialPaths` (`S/lib/material/Tangible.ts:150-151`),
  `interiorMaterial` / `surfaceMaterial` (`S/lib/bulk/Bulkable.ts:565,569`),
  `_decayProductPath` (`S/lib/material/Radioactive.ts:82`),
  `parentOrganization` / `proprietorPath` (`S/lib/employment/Organization.ts:255-264`),
  `operatingLocations` / `banksAt` / `offstage` (`S/platform/idea/Business.ts:169-180`),
  `businessPath` (`S/lib/attendant/Attendant.ts:131`; followed forward at
  `:205-209`), `house` (`S/platform/idea/Ship.ts:50`), `principal` /
  `remote` (`S/lib/display/Display.ts:165-170`), `speciesPath`
  (`C/trade-ranching/src/thing/Herdbook.ts:79`), `holderPath` (`PlatBook`).
  Content: 349 rows author `_materialPath`, 141 `_speciesPath`, 90
  `_biomePath`; 223 material rows, 88 species rows, 14 biome rows (9
  with `extends:`), 5 fabric rows.
- `Species` (`S/platform/idea/species/Species.ts:613`) and `Material`
  (`S/lib/material/Material.ts:137`) compose `SingletonMixin`; `Biome`
  (`S/lib/biome/Biome.ts:55-57`) is a bare `Idea`; `BusinessEntity`
  (`S/platform/idea/Business.ts:358`) is `BusinessMixin(PublisherMixin(
  OrganizationMixin(Idea)))` — no `SingletonMixin`, no
  `PersistableMixin`; `/compact/*` and `/corpo/*` rows are
  `class: /platform/idea/Organization`. `singletonOrClone` (`stuff.ts:727`)
  clones a class without `SingletonMixin`.
- `scripts/pack-roots.ts` exports `packSources`, `classFileOf`,
  `composesMixin`, `extendsAny`, `templateRows`, `effectiveRow`,
  `fieldMetaEntries(source)` — the static readers the new census
  clauses compose from.
- `ref-shapes.md:153-177` — "`ref: 'identity'` was declared nowhere until
  2026-09-24 … the framework attaches no runtime behaviour to the
  identity axis … the enforcement is build-time: `lint:census` … its
  field list is enumerated by hand." Both sentences change in this build.

### Boot entries — 128 across 16 packs

Manifest parse: `S/platform/idea/api/PackLogic.ts:368,506-527` (keys
`template/role/reason/dependsOn`; roles `sync-read|producer`; `reason`
non-empty). **The only lint reading `boot:` is `lint:openings`**
(`scripts/check-openings.ts:107-131` builds `bootByPack`; rule 3 at
`:290-318`: a position with `headcount` must be a `boot:` entry of its
own pack). `check-instanceable-placement.ts` reads no `boot:`.
`S/backend/AppBootstrap.ts:220-233` — the two post-manifest sequencer
lines `ResidencyApi.spawnNow()` and `EmploymentApi.tickRoster()` (both
STAY — the unobserved economy's).

Classified at plan time by the user's rule (the full roster is in each
`pack.yaml`; `awk '/^boot:/{f=1} f' C/<pack>/pack.yaml` prints it):

| entries | why booted today | verdict |
|---|---|---|
| platform: EventRegistry, EventSubscriptions, GroupRegistry, AccessRegistry, ParcelRegistry, ChattelRegistry, OfficeRegistry, WorldClockRegistry, SchedulerRegistry, MqlSubscriptionRegistry, CardRegistry, ForumSubscriptionRegistry, ReactionRegistry, StreamState, SubjectCatalogue, ChannelCatalogue, CentralBank, LocationGraphRegistry, `/platform/location/void`, PressBoard (release DOCUMENTS), BlueprintCatalogue (tooling) | engine registries, the sanctioned index, the money anchor, a window over documents, author tooling | **keep** |
| platform: EmploymentEngine, ResidencyWarden, WatchWarden, Renown/Participation/ProducerStandings, SandboxWarden, AttendantWarden, ResetWarden, PresenceRelay, PartyRoster | engine wardens arming timers | **keep** |
| platform: MaterialCatalogue, BiomeCatalogue, FabricCatalogue, ConditionCatalogue, MaturationProfileCatalogue, FractionScheduleCatalogue; trade-dyeing's DyestuffCatalogue | warm-only: "rows cannot stand themselves up; a synchronous reader sees only live ones" | **go** — a holder loads what it is made of (D2); the keyed ones become lazy (D6) |
| platform: ReadingCatalogue, PlacementCatalogue (already lazy), SpellCatalogue, HelpCatalogue, OperationCatalogue, DisciplineCatalogue, GovernmentCatalogue, CorpoCatalogue, SoulCatalogue, AddressRegistry | typed-word / keyed dictionaries | **go** — lazy on first use (D6) |
| platform: TopicCatalogue, RecipeCatalogue, ArchetypeCatalogue | read SYNCHRONOUSLY with no act-shaped seam before the read (`Sensor.ts:62`, `Avatar.ts:1455` on every message render; `ThermalDose.ts:741` inside a thermal fold; `SurveyController.ts:162`); Recipe/Archetype index DOCUMENTS, not rows (`PackLogic.ts:3549-3560` re-warms them on go-live) | **decide by the reader rule (D6)**; expected to STAY with the sentence as the reason — ⚠ flagged in Risks & opens |
| platform: `/compact/press`, `/compact/executive`, `/compact/treasury`, `/compact/trade`; corpo-{aevex,goodkin,hollis,veshko,vionne}: `/corpo/<x>` | "resolved by templatePath" at appoint / title checks / publish | **go** — a relation resolved at the act (D3, D4) |
| newbie-wilds: `idea/watch`, `idea/long-road` | the sentry's `institution:` names it; `chronicle <body>` binds a LIVE org by label | **go** — the `crossroads` zone (`C/newbie-wilds/content/world/newbie-wilds/crossroads.yaml`, a CartesianZone; the sentry stands at `crossroads/watchpost`) names them in `stands:` (D1) — there is no top-level newbie-wilds zone row |
| terminus: hesper outfit; mayfield agency; counting-houses/business (Goodkin's lender); dyehouse floor + outfit; knackers yard + outfit; tannery yard + outfit; chandlery floor + outfit; tailor shop + outfit; seznick-house/building | advertising, "a position materialized over a live business", "a counter is the attendance point", "a prop nothing warms", a warren at postRegister — every one a live-only-read reason; none runs a beat | **go** — the room (or zone) names it (D1) |
| terminus: cash-and-carry + distributor business; mill floor + outfit; crowsfoot, veshko, hollis, oilworks, bottling, pantry, brewing (+ cold-store), farm, vintner floors + outfits; general-store shop-floor + business; avenue-block + gazette; infirmary ward, collection, window, bloodworks | hands run `consigns`, the keeper `stocks`, the editor `prints`, the registrar `banks`; floors are spawn targets | **stay** — `reason:` rewritten to name the beat and point at `unobserved-economy-slate` |
| eternal-university: dorm-warren, college, farm-unit, campus-farm yard | postRegister install; "provision asks a position"; advertising | **go** — the duncan-hall zone names the warren + college; the campus-farm yard names the farm unit |
| saxonberg-lounge: `thing/terminal`, `thing/check-rack` | "nothing else instantiates it" (both `seatIn: /world/lounge/idea/warren`) | **go** — the lounge zone (`C/saxonberg-lounge/content/world/lounge.yaml`, a CartesianZone) names them |
| saxonberg-lounge: `idea/business` | Mara's `restocks` beat | **stay**, reason rewritten |
| hearthworks: business + cookhouse | advertising; "the house must operate a room that exists" | **go** — the cookhouse and smithy name the business |
| hinkley-hills: plat-book, lot-holder | "title enumerates live books"; "the book names it by path" | **go** — the hinkley-hills zone names both; the desk and Ricky name the book (D5) |
| hearts-delight: flock-book, ox-book, hen-book | "a prop nothing warms" — all three ARE in `farmstead-yard.yaml` `props:` (`:38,49,53`) | **go** (already propped) |
| hearts-delight ×4, trade-apiculture ×1: species rows | `isSentient` fails OPEN; taps/yields are sync species reads (`Producing.ts:247`) | **go** — the animal / book loads its species (D2), `isSentient` fails closed (D7) |
| base-library: `/stuff/idea/biome/universe` | `getRootBiome` throws when cold (`BiomeLogic.ts:762-771`, 6 callers) | **keep** as the engine's fallback for a place citing no biome; reason rewritten |

Docs that overclaim: `C/terminus/pack.yaml:131-136` and
`C/eternal-university/pack.yaml:50-56` say `lint:openings` holds the
room half (it never checks rooms); `docs/subsystems/content-packs.md:1149-1150`
says `lint:instanceable` checks boot entries (it reads no `boot:`) and
`:1145-1148` puts three entries in `world-seed` that live in
eternal-university and hinkley-hills.

### Employment (build-order 1)

- `S/platform/idea/api/EmploymentLogic.ts:442-447` `allBusinessesImpl` =
  `StuffApi.findByMixin('BusinessMixin')` (live; the `allBusinesses`
  pair in `RegistryWideReaders`). `:1448-1506` the memo:
  `businessCache` + `businessByLocation` + `businessByProprietor`
  derived from it; `businessByKey` **drops the memo and re-enumerates on
  every miss** (`:1489-1499`). Most rooms have no business, so a miss is
  the ordinary answer.
- `:1953-1992` `noticesAt` (sync) ← `S/platform/idea/cmd/perception/LookController.ts:315`
  (every look) and `ApplyController.ts:43,55`; `operatorsAtImpl` — room
  path + each non-interactive fixture's identity path through
  `businessByKey`; its doc: *"Live only, and deliberately … walking past a
  shop must not be [an economic act] … `lint:openings`"* — reversed by
  requirements decision 1.
- `:2002-2017` `buildOperatorIndex` — `Template.findDescendants('/')`
  (the WHOLE table) → `operatingLocations → row path`; `:2026-2082`
  `ensureOperatorAtInternal`: live hit → `closedSignImpl` +
  `tickBusiness` (**the existing one-house catch-up**, idempotent);
  miss → the index → `singletonOrClone` → `invalidateBusinessCache` →
  `runTick()` (the whole realm).
- `ensureOperatorAt` callers and what they pass: `BankController.ts:150`
  (the bank COUNTER's path), `ContractLogic.ts:1276` (a counter),
  `TitleController.ts:529` (the giver's container), `BankingLogic.ts:538`
  (a branch path), `S/lib/commerce/PricedOffer.ts:127,134` (the fixture's
  identity path, then its container), `C/tpa/src/lib/FastTravel.ts:816,834`
  (the departure and destination TERMINAL fixtures — both live),
  `BuyController`, `OrderController`, terminus `StallController`,
  `settleSale` (`:2181`). ⭐ Every caller has a LIVE object in hand whose
  room is loaded; `operatingLocations` names fixtures as well as rooms
  (`market/business.yaml:39-41`, `bakery-business.yaml:28-31`,
  `general-store/business.yaml:69-72`).
- `:1590-1600` `runTick` over `allBusinesses()`; `:1695` the hourly
  game-time tick; `bringCurrent` (`:2152`) IS `closedSignImpl`.
  `employment.md:1023-1035` — the closed sign and `vacated` are written by
  `bringCurrent` from the employment ledger + the clock: **nothing a
  house would persist that a record does not already hold.**
- `S/platform/idea/Business.ts:317-335` `getOperatingLocations` /
  `setOperatingLocations` (the phase-1 setter); `S/lib/employment/Organization.ts:521`
  `getProprietor`. 44 content rows author `operatingLocations`
  (27 terminus, 6 rejection, 3 hearts-delight, 2 trade-haulage, 1 each
  eternal-university, hearthworks, newbie-wilds, saxonberg-lounge, tpa,
  trade-shopkeeping); 25 fixtures author `businessPath`.
- `S/platform/idea/Ship.ts:85-96` — the lookout seat reads the
  OBSERVER's `getEmployment(housePath)` by path string; the house need
  not be live. (So the Hesper outfit's "live roster" reason is false.)
- `S/platform/idea/api/ZoneLogic.ts:208-225` `resolveZoneForPath` —
  exact `Template.findByPath` reads up the ancestor paths, then
  `singleton` of the first spatial-zone ancestor. No scan.
- `scripts/check-openings.ts` — `roomOf` (`:106`) maps every
  `cast:`/`props:` entry to its room; `operatingByPath` (`:122`); rule 5
  (a par line's supplier lists its room); `COUNTER_CLASSES`.

### Organizations resolved live-only (category E)

- `S/platform/idea/AccessRegistry.ts:488-494` `subjectHoldsOrganization`
  (async) — `findByTemplatePath(owner.templatePath)`, cold → diagnostic
  "List it under the owning pack's boot: entries" + `false`.
- `S/platform/idea/api/PressLogic.ts:132-137` `resolvePublisherImpl`
  (sync, live-only) ← `publishImpl` (async), the front page / press room;
  `:171-178` `holdsAnyPublishingPositionImpl` walks the `PublisherMixin`
  bucket (the pair).
- `S/platform/idea/cmd/employment/AppointController.ts:94` —
  `findByTemplatePath(asked)` for a path form.
- `S/platform/idea/api/BankingLogic.ts:568-583` — `/compact/treasury` is
  an ACCOUNT KEY (`ensureVenueAccountImpl(TREASURY_PATH, …)`); no live
  organization read found in the file.
- `S/platform/idea/cmd/charactergen/ChronicleController.ts:185-193` —
  `chronicle <body>` binds a LIVE org (MQL) and reads its record by path.
- `C/newbie-wilds/content/world/newbie-wilds/agent/{sentry,sellsword}.yaml`
  author `institution:`; `terminus/.../infirmary/agent/donor.yaml` too.

### Water & fishing (build-order 3)

- `C/water/src/idea/WatercourseCatalogue.ts:1143-1148` `loadWorks` —
  `Template.findByClass` of `/system/water/thing/{Conduit,ControlStructure}`
  (5 rows: terminus `wharfside/thing/{city-intake,city-outfall,aqueduct-house,cold-fell-aqueduct}`,
  hearts-delight `thing/millrace`); `:913-935` `worldScan` reads LIVE
  objects only ("authored but not standing" skipped) → `:821-870`
  `contaminationAt`. `:1017` `loadIndex` = `findDescendants('/stuff/idea/Watercourse')`
  (the course rows), `:1363` every Locality (catchments) — the lazily
  compiled index, no boot. `watershed.md:714-726` documents the live scan
  as "derive-on-read, not a registry".
- `C/terminus/.../wharfside/thing/city-outfall.yaml` authors
  `reachRef: kestrel:confluence`, `direction: disposal`,
  `dischargeLoadPerSecond: 0.6`, `dischargeKind: organic`, `capacityM3S`,
  `fixedInPlace: true` (the row's comment: RUNNING).
- `C/water/src/idea/Watercourse.ts:72-124` — `WatercourseNode { name,
  elevation?, channelWidthM?, catchmentKm2?, meanDepthM?, stocks?:
  WatercourseStock[] }`; `WatercourseStock { species, capacity }`
  (required capacity; "no shipped row authors one").
- `C/water/src/idea/FisheryRegistry.ts:482-491` `readSpecies` —
  `Template.findByClass(Species)` + `singleton` of EVERY habitat species,
  memo per six game hours (`:100`); `:193-220` `standingAt` iterates that
  list and prefers an authored `reach.stocks` entry (`fit: 1`); `:246-283`
  `seaStandingAt` = the sea's `getStock()` ∪ the band's `stock`
  (`the-westerlies.yaml:20-21`: `grey-mullet: 0.6`), still iterating every
  species. Species rows with `habitat`: `C/trade-fishing/content/stuff/idea/species/*`
  (6).
- Reaches: `kestrel.yaml` nodes headwaters / gorge / falls / confluence /
  estuary; `delight.yaml` spring / flats / mouth; also blackmere,
  circlemere, clearmere, cold-fell, holloway. The fishing drive fishes
  at the store / square / bank (`kestrel:confluence`), the heath and the
  millsite (`delight:flats`); its `FISH` regex accepts any of the six.

### Residence (build-order 4)

- `C/residence/src/idea/ResidenceCatalogue.ts:150-200` —
  `deriveRows` = `Template.findWhereDataHas('parentExtent')`; resolves
  LIVE only (`coveringNow`, `resolve`). Four rows author `parentExtent`:
  `eternal-university/.../duncan-hall/idea/dorm-warren.yaml` (`/world/terminus/eternal/duncan-hall/dorms`),
  `hinkley-hills/.../idea/plat-book.yaml` + `lot-holder.yaml`
  (`/world/terminus/hinkley-hills`; the book's `holderPath` names the
  holder), `terminus/.../mayfield-row/seznick-house/building.yaml`
  (`/world/terminus/mayfield-row/seznick-house`). Their zones:
  `duncan-hall.yaml`, `seznick-house.yaml`, `hinkley-hills.yaml` (all
  `CartesianZone`).
- Readers: `platBooks()` ← `S/platform/idea/cmd/civics/TitleController.ts:144-160`
  (`title list`, by path + duck type) and `C/terminus/src/realty/agent/Realtor.ts:82-100`
  (`offers()`, static, enumerates live books); `institutionsCovering(key)`
  ← `S/lib/location/OuterWarren.ts:375-420` (`admitFor` → the keyed-room
  re-entry) ← `S/platform/idea/api/PersistableLogic.ts:368-380` (login
  restore); `holdingsUnder(extent)` ← `C/residence/src/behavior/maintains.ts:96,138`
  (Katie, `C/eternal-university/.../agent/katie.yaml:80-83`, config
  `extent: /world/terminus/eternal/duncan-hall/dorms`).
- `C/residence/src/thing/DeedDesk.ts` — `extends Thing {}`;
  `C/terminus/.../registry/desk.yaml` and `realty/desk.yaml` are its rows;
  `ricky.yaml` (class `/world/terminus/realty/agent/Realtor`, effects
  `realty-list` / `realty-buy`).

### Vocabularies (build-order 5) and species (6)

- Warm shape, all `onCreate → warm()`: `S/platform/idea/MaterialCatalogue.ts:54-80`
  (`findByPathInfix('/idea/material/')`), `BiomeCatalogue.ts:103`
  (`/idea/biome/`), `FabricCatalogue.ts:69-90` (`/idea/fabric/`, then
  `Construction.registerFabric` per row — and `Fabric.onCreate` ALSO
  registers itself, `S/platform/idea/material/Fabric.ts:143`),
  `FractionScheduleCatalogue.ts:58` (`/idea/fractionation/`),
  `MaturationProfileCatalogue.ts:68` (`/idea/maturation/`),
  `ConditionCatalogue.ts:85-100` (`findDescendants(condition prefix)`),
  `DyestuffCatalogue.ts:56` (`/idea/dyestuff/`), `SpellCatalogue.ts:158`
  (`findByClass(Spell)`), `OperationCatalogue.ts:78`,
  `DisciplineCatalogue.ts:161`, `TopicCatalogue.ts:262-266`
  (`findDescendants` + a prune WRITE), `CorpoCatalogue.ts:163-172`,
  `GovernmentCatalogue.ts:125`, `AddressRegistry.ts:197-203`
  (`findDescendants` over `ADDRESS_ROSTER` → `singleton` every Locality),
  `HelpCatalogue.ts:183-205,995-1000` (concept rows by class + the
  command/api/schema harvest). `ReadingCatalogue.ts:70-90` and
  `PlacementCatalogue.ts:72-95` are **already lazy** (`warmed(name)` warms
  on the first miss; `peek` reads cold honestly) and merely booted.
- Readers: materials by PATH (`S/lib/bulk/SourceSlot.ts:75`;
  `MaterialApi.findByTag/findByElement` have no production callers);
  biomes by path (`BiomeLogic.ts:752-756`); `Constructed.setConstructionForm`
  (`S/lib/material/Constructed.ts:55-62`) THROWS on a form word
  `Construction.isForm` does not know (41 rows author `constructionForm:`);
  `FractionSchedule.byKey / forMaterial` (`S/lib/fractionation/FractionSchedule.ts:490-520`,
  a `findByPathGlob` over LIVE rows) ← `Fractionating.ts:337`;
  `MaturationProfile.byKey / forMaterial / cultureForStrain`
  (`S/lib/maturation/MaturationProfile.ts:575-615`) ← `Maturing.ts:826,1307`;
  `Dyestuff.forMaterial(materialPath)` (`C/trade-dyeing/src/idea/Dyestuff.ts:170`,
  over live rows) ← `DyeController.ts:101,231` (async controller);
  `Branded.getBrand()` → `CorpoApi.getBrand(key)` sync (`S/lib/corpo/Branded.ts:78-80`);
  spells by typed name via a sync `catalogue()` (`MagicLogic.ts:417-433,709`;
  the controllers are `C/arcana/src/idea/cmd/magic/{Cast,Spells}Controller.ts`);
  disciplines (`Advancement.ts:166-171` `allDisciplines()`, `:233`
  `getConferrals` inside async `bandsForImpl`; `Employed.ts:125`);
  operations (`C/trade-medicine/.../OperateController.ts:68-71`, sync
  `findByTemplatePath` in an async controller); help (`S/api/help.ts:53-150`,
  eight sync `catalogue()` reads; `HelpController` and
  `S/backend/HelpRoutes.ts` are async); topics (`Sensor.ts:62`,
  `Avatar.ts:1455` — sync per message); recipes (`ThermalDose.ts:735-748`
  sync inside the dose fold; `CraftingLogic.ts:81`; `FireController.ts:74`);
  archetypes (`SurveyController.ts:162`); governments (`GovernmentLogic.ts:30-34`
  sync `catalogue()`); addresses (`AddressApi.resolveLocalityFor` ×15
  callers); emotes (`ReactController.ts:108,121` `await SoulApi.resolve`).
- `S/platform/idea/api/SpeciesLogic.ts:84-90` `isSentient` returns
  **false** when the species is not resident — fail OPEN. Callers:
  `ButcherController.ts:190-201` and `SlaughterController.ts:104-120`
  (both `preloadAnatomy` then null-check — the belt), `TransfuseController.ts:166`;
  engine: `CombatLogic.ts:4885`, `Hazard.ts:431`, `Metabolic.ts:1678`,
  `ConditionLogic.ts:1164`, `MagicLogic.ts:1435`, `lib/behavior/combatant.ts:85`;
  `Organism.ts:335` (senescence, species-side). `preloadAnatomy`
  (`:94-114`) stands the species + ancestors + body plan up tolerantly.

### Part 1's registry scans (build-order 7)

- `S/api/stuff.ts:76-152` `RegistryWideReaders` — 12 pairs; `lint:gates`
  (`scripts/check-gate-strings.ts:61`) resolves every
  `FromTemplateMethod` pair at build time.
- `S/lib/command/CommandController.ts:90-111` `resolveScreen` — the mind
  path: `findByMixin('DisplayMixin')` + `await mayDrive` on each
  (`Display.ts:239-258`: `staff` pairing resolves `principal` live).
- `S/platform/idea/api/BankingLogic.ts:314-337` `findBranchOf` memoises a
  HIT only; `branchOfImpl` = `findByMixin('BankMixin')`;
  `S/lib/banking/Bank.ts:168-174` `getBankPath` / `getBank` (`bank ||
  corpoKey`).
- `S/platform/idea/api/AttendantLogic.ts:96-110` `onPlayerDisconnected`
  → `allPoints()`; `S/lib/attendant/Attendant.ts:196-295` the lease
  (`_leases.set`, `:246`), `release` (`:254`), `dropCustomer` (`:281`), the
  queue push (`:295`).
- `S/platform/idea/api/ResidencyLogic.ts:431-478` `collectSpawnCandidates`
  — `findWhereDataHas('censusKey')` (STAYS, allowlisted → the slate) +
  `getAllObjects()` over `Circulating` (`:458`); the reset sweep's raw
  walk (`:543`, legitimate).
- `S/api/stuff.ts:1637-1647` `findTemplatesByPath` — O(N) over `byId`
  matching `.path`; ← `S/api/mql/resolver.ts:388` on a non-glob path
  miss.
- `S/lib/wiki/components/composition.ts:403` `findDescendants('/')`.
- `S/lib/stuff/Template.ts:492-575` — `findByClass` / `findWhereDataHas`
  union every row carrying `extends` via `#inheritedMatches`,
  materialised, on EVERY call ("one extra query, at boot-warm time" —
  true of the catalogues, not of the runtime callers). `findByPath` /
  `findByPaths` (`:452,475`) are exact reads.
- `scripts/check-world-scan.ts:69-73` — the `getAllObjects` allowlist
  (`api/stuff.ts`, `api/mql/resolver.ts`, `ResidencyLogic.ts`);
  `check-whole-table.ts` is a ratchet at zero on the consumer.
- Template-scan call sites (the census for `lint:template-scans`): the
  catalogues above; `WatercourseCatalogue` (3); `FisheryRegistry`;
  `ResidenceCatalogue`; `EmploymentLogic`; `ResidencyLogic`;
  `LsController` / `RmController` / `GrepController`; `TemplateLogic`;
  `CmsLogic`; `SandboxLogic`; `LocationGraphRegistry`; `Ship.ts:103`
  (`findDescendants(extent)` — a structure's own members); `Expanse.ts`;
  transport `LaneCatalogue`; energy `GridCatalogue`; trade-smelting
  `SmeltController`; wiki `composition.ts`. The build re-runs the grep
  (`Template\.(findByClass|findByPathInfix|findWhereDataHas|findDescendants)\(`)
  at W0 — the list above is a reading, not the census.

### The drive harness

`packages/wire/src/harness`: `Session.open(handle, { startLocation?,
wizard? })` (`session.ts:259`), `s.cmd(text)`, `expectOk` /
`expectRefused` / `expectNote`, `advanceWorldClock('1 day')`
(`world.ts:157`), `declareFile({ file, packs, dirtyReason })`.
Exemplars: `packages/wire/tests/maritime-space.dirty.wire.test.ts`
(the checkpoint rule — *the verb was UNDERSTOOD and a state change*),
`fishing.dirty.wire.test.ts` (the rod/bait recipe via `talk fisher`),
`clinical-medicine.dirty.wire.test.ts:174` (`operate patient for
extraction`), `injury.wire.test.ts` (`cast`). A wire file cannot
restart the server.

---

## Plan-level decisions

**D1 — ONE list on any place: `stands:` on `SiteMixin`, composed on
`Location` and `SpatialZone`; `structures:` folds into it.**
`S/lib/stuff/Site.ts` exports `SiteMixin` (`_mixinName = 'SiteMixin'`,
`Mixins.Site`): `fieldMeta = { stands: { instruction: true, authorable:
true, inherit: 'by-entry' } }`; `applyStands(paths)` stores the paths
and KICKS `StuffApi.singleton(p)` per path, never awaiting (the
maritime back-edge: a ship reaches back for its sea), warning on one
that does not stand; `standsLoaded(): Promise<void>` for a caller that
must have them; `standing(): Stuff[]` the sync read of the named ones
that are resident; `standsPaths(): readonly string[]`. It sits beside
`props:`/`cast:` and names the things that are NOT contained — a
business, a structure, an institution, a fixture that seats itself
(`seatIn`). The author puts it where the relation belongs: a shop room
names its house, a district zone names its tower, a suburb's zone names
its plat book.
*Host:* `Location` (the base, composed as the OUTERMOST layer of
`LocationBase` so the eight-deep chain's inference is untouched — the
`FurnishableRoom`/Enclosed note is the warning) and `SpatialZone`
(`abstract class SpatialZone extends SiteMixin(Zone)`). Not
`CartesianLocation`: the user's ruling is *any place*, and a
`FurnishableRoom`, a `Tombstone`, an `Offstage` descend from `Location`
without passing through it. Not `StagedMixin`: a chest composes that,
and a chest does not have a business standing with it. Not `Zone`: a
`FolderZone` and a `Clade` are not places. **The lighting lesson is
respected because no guard and no `onCreate` are needed** — the applier
is host-agnostic, and a blank list on a dorm unit costs nothing.
`SpatialZone.applyStructures` / `structuresLoaded` / `getStructures` are
deleted; `structureOf(locationPath)` reads `standing()` and keeps the
entries that answer the Structure shape (`hasMember` + `getExtent`) —
a consumer narrowing its own answer, not a host guard.
`Expanse.applyStructures` → `applyStands` (same body). The four rows
rename `structures:` → `stands:`; `refsOf` reads `stands`.

**D2 — The identity axis splits into four sub-values; a constituent
loads with its holder.** `FieldMetaEntry.ref` becomes
`'instance' | 'identity:constituent' | 'identity:relation' |
'identity:kind' | 'identity:provenance'`. Bare `'identity'` is refused
by `lint:field-meta` ("name which kind"); the nine existing sites are
re-declared. Meaning and runtime:
- **constituent** — what the holder is MADE OF (its material, biome,
  species, body plan, clade, mechanism, the water standing in a well).
  The `TemplateApplier`, in phase 1, before dispatching the field's
  setter, awaits `StuffApi.ensureConstituent(path)` for every path the
  value carries (a string, an array, or a map's values). Runs on mint,
  go-live AND restore (a restored collie loads its species). ⭐ A
  constituent must be `persistent` (phase 1 only sees persistent
  fields) — `lint:field-meta` refuses a constituent that is not.
- **relation** — something the holder POINTS AT (a treasury, an
  organization, its premises, its proprietor, the house a counter
  belongs to, the main a tap is plumbed to). Nothing loads at
  hydration; the act that follows it resolves it then, with
  `await StuffApi.singleton(path)`. Loading a business never loads its
  rooms (`operatingLocations` is a relation).
- **kind** — a path to a row that is not a singleton: what a harvest
  yields, what a bow shoots, what a reach's road is minted from. Nothing
  loads; minting is an act.
- **provenance** — a historical claim (`sampledAt`, `takenWith`). Never
  resolved, and the census does not require the row to exist.

`StuffApi.ensureConstituent(path)` (an Api static): live → return;
pending in `#pendingSingletons` → return without awaiting (a cycle or a
concurrent load — the pending clone completes on its own; the census
refuses an authored cycle, so this branch is the concurrent case);
else resolve the row's `extends:` ancestors first, in order (a cited
biome's parent chain is walked live by `BiomeApi`; ancestors are
constituents of what cites them), then `await this.singleton(path)`,
warning — never throwing — on a row that will not stand (a holder with
a bad citation is a degraded holder, not a failed clone). The
coalescing index keeps repeated citations free.

The declaration sweep (every field the census already reads by hand,
re-declared on its owner — the build verifies each reader before
choosing): constituent — `_speciesPath` (`Organism`, `Seed`, `Cut`),
`speciesPath` (`Herdbook`), `_bodyPlanPath`, `_parentCladePath`,
`_defaultMaterialPath` (`Species`), `_materialPath`,
`_detailMaterialPaths` (`Tangible`), `interiorMaterial`,
`surfaceMaterial` (`Bulkable`), `_biomePath` (`Atmospheric`),
`_decayProductPath` (`Radioactive`), `standing` (`Well`), `mechanism`
(`Pumping`), `_vehicularModePath` (`Drivable`), `conditionPath` (three
rows; find the declaring class), `enclosure.material` and
`floor.material` (nested — stay on the hand list, resolved by their own
appliers; declared constituent in prose). Relation — `institution`,
`parentOrganization`, `proprietorPath`, `operatingLocations`,
`offstage`, `businessPath`, `house` (`Ship`), `principal`, `remote`
(`Display`), `suppliedBy`, `holderPath`, `lobbyPath`, `seatIn`,
`carrierPath`, `mainsRef`, `source`, `tollBinPath`, `productMaterial`,
`residueMaterial`, `standardMaterialPath`, `destination`, `along`,
`entrance`, `expanse`, `of`, `formationPath`, `tissues` (`Cut`, unless a
sync reader is found), `books` (D5), `works` (D8). Kind —
`growsIntoPath`, `seedTemplatePath`, `harvestTemplatePath`,
`projectileTemplate`, `castTemplate`, `productVessel`, `residueVessel`,
`bornWithCell`, `roadTemplate`, `corridorTemplate`, `programmePath`,
`roomTemplate`, `floor.template`, `stockLines[].itemTemplatePath`,
`prices` keys. Provenance — `sampledAt`, `takenWith`. ⚠ `banksAt`,
`reachRef`, `_brandKey`, `_governmentKey`, `constructionForm`,
`runScheduleKey`, `maturationProfileKey` are KEYS, not paths: they are
not on the axis (D6 handles them).

*Census.* `lint:census` gains clause (f): every field any `fieldMeta`
in the tree declares `identity:*` (read statically with
`fieldMetaEntries` from `pack-roots.ts`, kernel + every pack's `src/`) is
resolved on every row that authors it; a constituent or relation target
must resolve to exactly one SINGLETON-SHAPED row — its class is on the
`idea` branch (`<root>/idea/…`) or composes `SingletonMixin` on its
`extends` chain (`classFileOf` + `composesMixin` + `extendsAny`); a kind
target must resolve to a row; a provenance target is not checked; and
the constituent graph over rows is acyclic. The hand list in `refsOf`
shrinks to the nested/structural shapes (`props`, `cast`, `costume`,
`exits`, `entries[].path`, `enclosure`, `floor`, `stocks[].species`,
`works[]`, …) — a field a class declares is read by its declaration.
One field name with two kinds on two classes is a finding.

**D3 — Employment: the index is maintained on write; `ensureOperatorAt`
follows the place; a glance never stands a house up.**
- `BusinessMixin.setOperatingLocations` and its `setProprietorPath`
  override call `EmploymentApi.noteBusiness(this)` (gated
  `FromMixin(Business)`); `BusinessMixin.onDestruct` calls
  `forgetBusiness(this)` and chains. `EmploymentLogic` keeps
  `businesses: Set`, `businessByLocation`, `businessByProprietor` as
  maps filled on write (re-indexed idempotently per note; reset with the
  singleton on `StuffApi.clearAll`). `businessByKey` is a map read — **a
  miss is an answer, never a rescan**. `allBusinesses()` returns the set;
  `allBusinessesImpl` and the `allBusinesses` pair in
  `RegistryWideReaders` are deleted. `buildOperatorIndex` and
  `operatorIndex` are deleted.
- `ensureOperatorAtInternal(path)`: (1) live index hit → the existing
  one-house pass (`closedSignImpl` + `tickBusiness`) → return. (2) miss
  → the live object at `path` (the room, or a fixture → its container);
  if it composes `Site`, `await standsLoaded()`, then re-read the index.
  (3) still a miss → the ROW: `Template.findByPath(path)`, its
  `data.stands`, else its `data.container` row's `stands` (one hop) —
  exact reads, no scan — `singleton` each named path, re-read the index.
  (4) `null`. The whole-realm `runTick()` on standup goes; the one-house
  pass replaces it.
- `noticesAt(here)` becomes `async`: for each candidate path
  (`operatorsAtImpl`'s walk) it runs `ensureOperatorAtInternal`, so the
  house the room already stood up is rostered (`ensureRostered` hires
  the cast into its seats) before its openings are read — an
  un-rostered house would advertise every seat. ⭐ This is not the act
  the doc forbade: nothing is stood up by a look (step 2 only awaits
  what the arrival kicked); the pass on a live house is the engine's own
  hourly tick run early, idempotent. `LookController` and
  `ApplyController` await it. `operatorsAt(here)` stays sync.
- `lint:openings` rule 3 flips: for every row with `operatingLocations`,
  each operating path that is a Location row must list the house in its
  `stands:`; an operating path that is a FIXTURE row is covered when
  the room whose `props:` places it (`roomOf`) lists the house. The
  message names the room and the key. `bootByPack` is deleted.
- Fixture → house (`businessPath`, `identity:relation`) keeps resolving
  forward at `requestAttention` (live; the room's `stands:` loaded it).

**D4 — The house is current through the catch-up it already has;
nothing new is persisted.** `bringCurrent` stays `closedSignImpl`; the
one-house pass is `closedSignImpl` + `tickBusiness`. Both derive from
the employment ledger and the clock. Checked against requirements § 7
rule 1: the closed sign, vacancies, cover and on-shift state are all
re-derivable from records, so `Business` gains no snapshot, no
`PersistableMixin`, no stamp. The `tickRoster` sequencer line stays
(the booted houses must be rostered at boot).

**D5 — Organizations, books and the basket are relations resolved at
the act.** `AccessRegistry.subjectHoldsOrganization`,
`PressLogic.resolvePublisherImpl` (made async; its callers are),
`PressBoard.warm`, `AppointController`'s path form and the
`parentOrganization` / `institution` reads resolve the organization
with `await StuffApi.singleton(path)` instead of a live-only read; the
"list it under boot:" diagnostic becomes "the row did not stand up".
`findOrganization(asked)` (a LABEL a player typed) stays a lookup over
the live population. The newbie-wilds `crossroads` zone names its two
institutions in `stands:` (`chronicle <body>` binds a live org). `DeedDesk.books:
string[]` and `Realtor.books: string[]` (both `identity:relation`,
authorable): `title list` lists the books of the reachable desk
(`singleton` each; no desk → "there is no registry here"); Ricky's
`realty-list` effect fronts the books HIS row names, `offers(realtor)`
taking the instance. `BankingApi.priceIndex()` becomes `async` and
`singleton`s every basket counter before reading (`prints.ts` and the
`reserve` dashboard are async). ⚠ A counter stood up this way
self-places through its row's `container:` instruction, which stands
its ROOM up with the room's props and the room's `stands:` — the
existing self-placement, accepted by requirements decision 4 for a
basket of two or three counters. `PlatBook.holderPath` resolves with
`singleton` at the sale.

**D6 — Vocabularies: warm-only catalogues retire; keyed and typed-word
dictionaries become lazy; a catalogue with a sync reader and no seam
keeps its entry with that sentence as its reason.**
- *Retired outright* (class, row, `TemplatePaths` constant, boot entry;
  every reader is by PATH and the citing row now loads it):
  `MaterialCatalogue` (+ `MaterialApi.findByTag`/`findByElement`, no
  production callers), `BiomeCatalogue` (+ `biome.md:376`),
  `ConditionCatalogue`. The pack go-live re-warm of these in `PackLogic`
  goes with them. ⚠ `lint:biome` and `lint:instanceable` clause (c) are
  checked for references first.
- *Keyed, lazy through the citing setter* (the row loads what it is
  made of, by KEY): `Constructed.setConstructionForm(value)` (async) —
  `if (!Construction.isForm(value)) await FabricCatalogue.warmed(value)`
  then re-check, then the existing throw; `FabricCatalogue.warmed(key)`
  warms the `/idea/fabric/` roster once (rows register themselves in
  `Fabric.onCreate`). `Branded.setBrandKey` → `await CorpoApi.ready()`
  (warms `CorpoCatalogue` once; `getBrand()` stays sync). The persisted
  `runScheduleKey` / `maturationProfileKey` setters (find them on
  `Fractionating` / `Maturing`) → `await <Catalogue>.warmed()`; the
  charge / fill / pitch readers (`Fractionating.ts:337`,
  `Maturing.ts:826,1307`) await the same before the sync `forMaterial` /
  `cultureForStrain` match (requirements § 6: an attribute match with no
  reference stays a lazy index). `Locality`'s `_governmentKey` setter →
  `await GovernmentApi.ready()`. `DyeController` → `await
  DyestuffCatalogue.warmed()` before `Dyestuff.forMaterial`.
- *Typed-word, lazy on first use* (the `ReadingCatalogue` shape —
  `peek` cold, `warmed()` warms once; a miss after warm is final within
  a process, and the installer's go-live re-warm / `invalidate()` is the
  existing seam): `SpellCatalogue` (`prepareCastImpl` and the `spells`
  controller await `warmed()`; effect validation at warm),
  `OperationCatalogue` (`OperateController`), `DisciplineCatalogue`
  (`bandsForImpl`, `verbsFor`, `Employed.ts:125` — each async seam
  awaits `ready()`), `HelpCatalogue` (`HelpController` and `HelpRoutes`
  await `HelpApi.ready()`), `AddressRegistry` (the first
  `resolveLocalityFor` / coverage read / `settleStreetLighting` warms),
  `SoulCatalogue` (`SoulApi.resolve` is async), `GovernmentCatalogue`,
  `CorpoCatalogue`, `ReadingCatalogue`, `PlacementCatalogue` (already
  lazy; the entries go).
- *The reader rule.* A catalogue read synchronously from a path with no
  act-shaped async seam before it in the same act keeps its boot entry,
  with that sentence as its reason — honest, not a lie about laziness.
  At plan time this is expected of `TopicCatalogue` (every message
  render), `RecipeCatalogue` (the dose fold) and `ArchetypeCatalogue`
  (re-warmed by the installer with Recipe). The build decides each by
  reading its readers and records the decision in the entry's `reason`.
  → Risks & opens 1.

**D7 — Species load with their holders; `isSentient` fails CLOSED.**
With `_speciesPath` a constituent, every animal, seed, cut and herdbook
loads its species (and the species its body plan, clade and default
material) as it hydrates — on a cold world too. `SpeciesLogic.isSentient`
throws `SpeciesUnresolved` (`S/lib/species/SpeciesUnresolved.ts`, an
`Error` value object of the species substrate) when `_speciesPath` is
set and the row is not resident; it returns `false` only for a thing
with no species at all. The three safety gates (`Butcher`, `Slaughter`,
`Transfuse`) keep `preloadAnatomy` + the null-check and refuse on the
throw with the same "cannot make out what it was" line. The six engine
callers (`CombatLogic:4885`, `Hazard:431`, `Metabolic:1678`,
`ConditionLogic:1164`, `MagicLogic:1435`, `combatant.ts:85`) catch it and
take the SENTIENT branch — the cautious one (consent, blame, no cull).
The five species boot entries go.

**D8 — The river is honest from rows; a reach holds the species it
names.** `WatercourseNode` gains `works?: string[]` (the work rows on
that reach; `identity:relation` in prose, `nodes[].works[]` in the
census). `WatercourseCatalogue.works()` is the union of every reach's
list — `loadWorks` and both `findByClass` calls are deleted.
`worldScan` reads each work LIVE when standing, else its ROW
(`Template.findByPaths(paths)` — one `$in` query, memoised with the
index since paths are authored content) for `dischargeLoadPerSecond`,
`dischargeKind`, `on`, `direction`, `capacityM3S`, `reachRef` and the
withdrawal fields; so an outfall nobody has visited fouls the reach it
names, and a shut sluice stops drawing the moment it is shut. A work's
unpersisted live state is lost when it unloads and comes back as its
row says (§ 7 rule 3). `FisheryRegistry` drops `readSpecies`,
`species()` and the memo: `standingAt` iterates `reach.stocks[]`,
`seaStandingAt` the sea's `getStock()` ∪ the band's `stock` keys, each
species `singleton`-loaded at the read (a relation at the act);
`WatercourseStock.capacity` becomes optional — a named species with no
capacity keeps today's habitat-fit derivation (`fit`, `limiting`,
`stocked: false`). A reach naming nothing has no fish. The index
compile (`findDescendants('/stuff/idea/Watercourse')` + the Locality
walk for catchments) stays, allowlisted in `lint:template-scans` as the
water system's own keyed index of its courses, compiled lazily once.

**D9 — Residence: the extent's zone names its institution; the kernel
asks the zone.** `stands:` on `duncan-hall.yaml` (`idea/dorm-warren`,
`idea/college`), `seznick-house.yaml` (`building`),
`hinkley-hills.yaml` (`idea/plat-book`, `idea/lot-holder`),
`campus-farm.yaml` or its yard (`idea/farm-unit`).
`OuterWarren.institutionsCovering(key)` → `ZoneApi.resolveZoneForPath(key)`
→ `await zone.standsLoaded()` → the standing `OuterWarren`s of that
zone and of its ancestors (`getParent()` chain) whose `getParentExtent()`
prefixes the key, innermost first. `admitFor` is otherwise unchanged.
`ResidenceCatalogue` (class, row, `RESIDENCE_CATALOGUE_PATH`) is
deleted: `holdingsUnder(extent)` in `maintains.ts` walks the extent's
zone the same way; `platBooks()`'s two readers follow D5. The kernel
no longer reaches a pack class by path + duck type for this.

**D10 — Part 1's nine, each by the owner's question.**
(3) `DisplayMixin.setPrincipal` → `DisplayApi.notePrincipal(this)`,
`onDestruct` forgets; `DisplayLogic` keeps `principal → displays`;
`resolveScreen`'s mind path asks for the actor's houses
(`getEmployments()` org paths + `businessOfProprietor`) and runs
`mayDrive` over that handful; the glob pair goes. (4) `BankMixin`'s
`setBank` / `setCorpoKey` → `BankingApi.noteBranch(this)`, `onDestruct`
forgets; `findBranchOf` is a map read; the pair goes. (5)
`holdsAnyPublishingPosition(principal)` reads the principal's own
employments (`getEmployments()` → each organization, `singleton` at the
validator — the build confirms the validator seam is async per
`command-routing.md`; if it is not, the read is live-only and the entry
is written as a known limit) plus the proprietor memo; the pair goes.
(6) `AttendantLogic` keeps `customer → points` written by
`requestAttention` (lease), the queue push, `release` and
`dropCustomer`; `onPlayerDisconnected` reads it; `allPoints` stays for
the idle sweep (a sweep). (7) `collectSpawnCandidates`'s `getAllObjects`
→ `findByMixin('CirculatingMixin')` under the `spawnNow` pair (kept);
its `findWhereDataHas('censusKey')` is allowlisted → the slate. (8)
`StuffApi` gains a `byDocPath` index over registered objects carrying a
string `path`, maintained in `#updateIndexes`; `findTemplatesByPath`
reads it. (9) `composition.ts` is allowlisted (a tool's job). (10)
`Template.#inheritedMatches` memoises the `extends` doc set per
process; `Template.invalidateInheritance()` is called from
`Template.save()` / delete (`TemplateLogic.saveTemplate`) and the pack
reconcile (`PackLogic`).

**D11 — Two gates, census-then-ratchet; the pair count pinned.**
`lint:boot-entries` (`scripts/check-boot-entries.ts`): reads every
pack's `boot:`; (a) the total is a ceiling that may fall and never rise
(128 at W0, pinned at the post-build count in W5); (b) every entry's
`reason` is non-empty; (c) ⭐ every entry whose template is under
`/world/` or `/trade/` or `/corpo/` or `/compact/` (content, not the
engine) must cite `unobserved-economy` in its reason — the world rows
booted for any other reason are exactly what this sweep removed;
`--list` prints the roster. `lint:template-scans`
(`scripts/check-template-scans.ts`): a census of
`Template.(findByClass|findByPathInfix|findWhereDataHas|findDescendants)(`
call sites across the kernel and every pack's `src/` (not `__tests__`,
not `Template.ts` itself); every surviving site is an `ALLOWLIST` entry
`{ file, reason }`; a site not on the list fails; the ceiling is the
list's length. Sanctioned homes and their reasons: the location graph;
author tooling (`Ls`/`Rm`/`Grep`/`Cms`/`Sandbox`/wiki composition/
`Blueprint`); the installer (`TemplateLogic`, `PackLogic`); each lazy
dictionary's `warm()`; the water index compile; the residency spawn
sweep (→ unobserved-economy-slate); a structure's own members
(`Ship.liveMembers`); `Expanse.compile`; transport `LaneCatalogue`;
energy `GridCatalogue`; trade-smelting (the build reads it and writes
the reason or removes the scan). Both self-enrol through `lint:family`.
Their tests assert the INVARIANT (at or below the ceiling, above zero)
and a POSITIVE fixture (a violation is found). `RegistryWideReaders` gets
`S/api/__tests__/registry-wide-readers.test.ts` asserting the pair
count is at or below the high-water mark; W5 lands it at 8.

**D12 — Persistence: nothing new.** Every field this plan adds is
authored (`stands`, `works`, `books`), a memo filled on write, or a
transient promise. No snapshot grows; no host becomes Persistable; no
Mongo collection changes; no migration — the `structures:` → `stands:`
rename lands by pack reconcile, and a dev DB that will not boot is
dropped.

---

## ⭐⭐ Host placement

| new field / mixin / class | host | what composing it claims |
|---|---|---|
| `SiteMixin` with `stands:` (instruction) | `Location` (base, outermost layer) and `SpatialZone` | every place in space — every room rung and every spatial zone — may name non-contained singletons that stand with it. A `Zone` that is not spatial (`FolderZone`, `Clade`, `HomeZone`) cannot; a `Thing` cannot (a chest's `props:` is containment). **No guard**: the applier does not look at its host. A blank list on a minted dorm unit is a blank list. |
| `ref` sub-values (`identity:constituent` …) | the declaring field's OWNER (`Organism`, `Tangible`, `Atmospheric`, `Employed`, …) | the owner says what its reference means; the applier and the census read the declaration — no per-host logic anywhere. |
| `StuffApi.ensureConstituent(path)` | `StuffApi` (an Api static) | the one cycle-safe constituent load; beside `singleton`. |
| `works?: string[]` on a node; `capacity?` optional | `C/water/src/idea/Watercourse.ts` (the water pack's row shape) | a reach may name the works on it and the species in it. |
| `books: string[]` | `DeedDesk` (residence pack) and `Realtor` (terminus pack) | a desk fronts named books; an agent fronts named books. Two pack classes; a third fronting class is the signal to promote. |
| maintained maps: `businesses` + `businessByLocation` + `businessByProprietor` (`EmploymentLogic`), `branchByBank` (`BankingLogic`), `displaysByPrincipal` (`DisplayLogic`), `pointsByCustomer` (`AttendantLogic`) | the owning logic singletons | memos filled on write through participant-gated Api statics (`FromMixin(Business/Bank/Display/Attendant)`), never warmed; a fresh singleton starts empty. |
| `byDocPath` index | `StuffApi #indexes` | one more index in the one audit point. |
| `SpeciesUnresolved` | `S/lib/species/SpeciesUnresolved.ts` (an `Error` value object) | thrown by `SpeciesLogic`; a named vocabulary, not a free helper. |
| `Template.invalidateInheritance()` + the `extends` memo | `Template` (static) | the write paths drop it; nothing else. |
| `FabricCatalogue.warmed(key)`, `CorpoApi.ready()`, `GovernmentApi.ready()`, `DyestuffCatalogue.warmed()`, `HelpApi.ready()`, `SpellCatalogue.warmed()`, … | each catalogue (the `ReadingCatalogue` shape) | a dictionary warms itself on first use; the Api forwards. |

**The guard test**: none of the above needs a guard that re-narrows the
host set. If a wave finds itself writing `if (MixinApi.isX(host))`
inside one of these to skip a composer, stop and record the finding in
Risks & opens.

---

## Convention conformance

- `props:` / `cast:` are the designation fields (`populates:` retired);
  `stands:` lands beside them as a designation on PLACES — instruction
  field, `inherit: 'by-entry'`, in `refsOf`.
- Locations, not rooms: `CartesianLocation` / `SingletonCartesianLocation`
  rows; zones are `CartesianZone`. No `FurnishableRoom` touched.
- `<root>/<branch>/` paths: new files are `S/lib/stuff/Site.ts` (a
  mixin, beside `Staged.ts`), `S/lib/species/SpeciesUnresolved.ts` (a
  value object), two scripts under `scripts/`. No new module category, no
  free helper: the index-maintenance entry points are Api statics with
  participant gates; module-private helpers live inside the logic
  singletons that own them.
- Module scope declares; lifecycles initialize: every warm stays in a
  `warmed()`; every index fills on a setter or `onDestruct`; no new
  `onCreate` body (`lint:on-create` 82 / 35 — **no rise**).
- `lint:imports`: packs import the kernel by package specifier only; the
  water pack already imports `Template`; the residence and terminus
  packs stop importing `ResidenceCatalogue`.
- Verbs on objects: `site.standsLoaded()`, `site.standing()`,
  `desk.getBooks()`, `catalogue.warmed()` are methods; `MqlApi` is
  `resolveOne` / `resolveMany` only; no `XApi.verb(host, …)`.
- `_mixinName` is a mutable static (widens to `string`); `Mixins.Site`
  is added in `S/lib/mixin.ts` (`lint:mixin-names`).
- Gates this build must pass: `lint:family` in full, and in particular
  `lint:openings` (rule 3 rewritten), `lint:census` (clause f),
  `lint:field-meta` (the four sub-values), `lint:gates` (the pairs),
  `lint:world-scan`, `lint:whole-table`, `lint:on-create` (no rise),
  `lint:lib-statics` (no rise), `lint:instanceable` (deleted catalogue
  rows and `TemplatePaths` constants), `lint:mixin-names`,
  `lint:unconsumed-seams` (`stands` is consumed by its applier),
  `lint:biome`, `lint:reachability`, `lint:test-bootstrap`, plus the two
  new gates `lint:boot-entries` and `lint:template-scans`.
- No new `isWizard` check; no new Mongo collection; no migration.

---

## Waves

Each wave ends at a commit, lands with `pnpm test:near` + every touched
pack's own vitest + `lint:family` green, lowers the two ceilings to the
count it leaves, and leaves the shipped wire drives it touches passing.
Content edits land in the wave whose mechanism they feed.

### W0 — Substrate: `stands:`, the identity sub-values, the gates at census

**Goal.** Everything later waves consume, with no behaviour change.

**Implements** D1, D2 (mechanism; no field re-declared yet except the
nine bare-`identity` sites), D11 (both gates at today's count), D12.

**Files.**
- `S/lib/stuff/Site.ts` (new, `SiteMixin`); `S/lib/mixin.ts`
  (`Mixins.Site`; the `ref` type); `S/api/mixin.ts` (`isSite`);
  `S/lib/stuff/Location.ts` (`LocationBase = SiteMixin(Addressable(…))`);
  `S/lib/zone/SpatialZone.ts` (`extends SiteMixin(Zone)`; delete the
  `structures` field, `applyStructures`, `structuresLoaded`,
  `getStructures`; `structureOf` over `standing()`);
  `S/lib/expanse/Expanse.ts` (`applyStands` override); every reader of
  `structuresLoaded`/`getStructures` (grep) → `standsLoaded`/`standing`.
- Content: `structures:` → `stands:` on `terminus/{hesper,gannet-rock,terminal}.yaml`
  and `world-seed/.../greywater.yaml`.
- `S/platform/idea/TemplateApplier.ts` (the constituent step in phase
  1); `S/api/stuff.ts` (`ensureConstituent`); `scripts/check-field-meta.ts`
  (`REF_VALUES`, the constituent-requires-persistent rule, bare
  `identity` refused); the nine existing `ref: 'identity'` sites
  re-declared (`sampledAt`/`takenWith` provenance; `standing`,
  `mechanism`, `_speciesPath` (Cut) constituent; `institution`,
  `suppliedBy`, `tissues` relation).
- `scripts/check-template-census.ts` (clause f; `stands` in `refsOf`;
  the hand list trimmed to structural shapes once clause f reads the
  declared ones).
- `scripts/check-boot-entries.ts` + `scripts/__tests__/check-boot-entries.test.ts`;
  `scripts/check-template-scans.ts` + its test; `package.json`
  `lint:boot-entries`, `lint:template-scans` (ceilings 128 and the
  census count, every site allowlisted with a reason stub that W5 makes
  final); `S/api/__tests__/registry-wide-readers.test.ts` (12).
- Docs: `templates.md § Property vs instruction fields` (the `stands:`
  applier beside `applyProps`; the constituent step); `ref-shapes.md`
  (the four sub-values; the "attaches no runtime behaviour" and "field
  list enumerated by hand" paragraphs rewritten); `zone.md:119-126`;
  `lint-family.md` (the two gates); `mixins.md` (the new kernel mixin).

**Tests.** `Site.test.ts`: `stands:` kicks and resolves on a Location
and on a zone; a path that does not stand up warns and the rest load;
`standing()` cold is empty, `standsLoaded()` resolves. `SpatialZone.test.ts`
/ `Expanse.test.ts` byte-identical behaviour under the new name.
`TemplateApplier.test.ts`: a constituent loads on mint AND on restore;
an array and a map of paths; a pending path is kicked not awaited; a
bad path warns. `check-field-meta`: bare `identity` refused;
constituent without `persistent` refused. The two gate tests: invariant
+ positive fixture.

**Acceptance.** `lint:family` green with both new gates enrolled; the
maritime wire drive passes (the rename is behaviour-neutral).

**Commit.** `feat(site): stands: on every place — structures: generalised; the identity axis names constituent · relation · kind · provenance; boot-entry and template-scan ratchets at census`

### W1 — Employment and organizations: the place names its house

**Goal.** AC 2; the house and organization half of AC 1.

**Implements** D3, D4, D5 (organizations), D6 (nothing yet).

**Files.**
- `S/platform/idea/Business.ts` (`noteBusiness` from the two setters;
  `onDestruct`); `S/lib/employment/Organization.ts` and
  `S/platform/idea/Business.ts` fieldMeta (`identity:relation` on
  `parentOrganization`, `proprietorPath`, `operatingLocations`,
  `offstage`); `S/lib/attendant/Attendant.ts` (`businessPath`);
  `S/platform/idea/Ship.ts` (`house`); `S/lib/display/Display.ts`
  (`principal`, `remote`).
- `S/platform/idea/api/EmploymentLogic.ts` (the maintained maps;
  `businessByKey` a map read; delete `allBusinessesImpl`,
  `buildOperatorIndex`, `operatorIndex`, the miss-rescan;
  `ensureOperatorAtInternal` per D3 steps 1–4; `noticesAt` async;
  `noteBusiness` / `forgetBusiness` gated to the Business participant);
  `S/api/employment.ts` (`noteBusiness`, `forgetBusiness`, `noticesAt`
  async); `S/api/stuff.ts` (`RegistryWideReaders` minus `allBusinesses`;
  the test → 11); `S/platform/idea/cmd/perception/LookController.ts:315`
  and `S/platform/idea/cmd/employment/ApplyController.ts:43,55` (`await`).
- `S/platform/idea/AccessRegistry.ts:488-494` (`singleton` at the read;
  the diagnostic reworded), `S/platform/idea/api/PressLogic.ts`
  (`resolvePublisherImpl` async + its callers; `PressBoard.warm`),
  `S/platform/idea/cmd/employment/AppointController.ts:94`.
- `scripts/check-openings.ts` (rule 3 per D3; delete `bootByPack`).
- **Content.** `stands:` on every room (and the room of every fixture)
  that a house's `operatingLocations` names — the checklist is
  `grep -rl operatingLocations: C/*/content` (44 rows) and rule 3 is the
  proof; the newbie-wilds `crossroads` zone names `idea/watch` and
  `idea/long-road`; `hearthworks` cookhouse AND smithy name the
  business. Boot entries removed: platform's four `/compact/*`; the five
  corpo packs' orgs; newbie-wilds' two; terminus hesper outfit, agency,
  counting-houses/business, dyehouse ×2, knackers ×2, tannery ×2,
  chandlery ×2, tailor ×2; eternal-university college + farm-unit +
  campus-farm yard; hearthworks ×2. Every KEPT house / premises entry's
  `reason` rewritten to name its beat and `unobserved-economy-slate`;
  `PressBoard`'s `dependsOn` on the two organizations goes. Lower both
  ceilings.
- Docs: `employment.md:482-485` (reverse "Live businesses only"; the
  `lint:openings` paragraph; `ensureOperatorAt`'s three steps);
  `press.md` (publishers resolved at the act); `access.md`;
  `residency.md:557-566` (the kept list, pointing at the slate);
  `content-packs.md:1138-1156` corrected; `terminus/pack.yaml:128-136`
  and `eternal-university/pack.yaml:50-56` comments corrected.

**Tests.** `EmploymentLogic` unit: a business entering the index on its
setter and leaving on destruct; `businessByKey` miss does NOT call
`findByMixin` (spy); `ensureOperatorAt` on a cold room whose row names
its house stands it up through the row hop and answers; on a loaded
room awaits `standsLoaded()`; a second call is a zero-work no-op; the
one-house pass runs, the realm's does not (spy on `runTick`).
`check-openings` fixtures: a house named by no operating room fails
naming the room; a fixture operating path covered by its room passes.
`AccessRegistry` test: an organization-held title admits its staff on a
cold world.

**Acceptance.** On a fresh DB: walk into the Hearthworks cookhouse →
HELP WANTED on the first look; `apply` takes the seat (AC 2). The
`trades-and-labor`, `economic-bootstrap`, `work`, `blood-economy`,
`maritime-space` wire drives pass.

**Commit.** `feat(employment): the place names its house — the index is kept on write, no table scan, no miss rescan; organizations resolve at the act; lint:openings rule 3 flipped`

### W2 — Water and fishing: the reach names its works and its species

**Goal.** AC 4.

**Implements** D8.

**Files.** `C/water/src/idea/Watercourse.ts` (`works?`, `capacity?`,
setter validation), `C/water/src/idea/WatercourseCatalogue.ts`
(`works()` from the reaches; `worldScan` live-else-row; delete
`loadWorks`), `C/water/src/idea/FisheryRegistry.ts` (delete
`readSpecies` / `species()` / memo; iterate named stocks; `singleton`
per species). **Content:** `kestrel.yaml` — each work on the reach its
`reachRef` names (`city-intake`, `city-outfall`, `aqueduct-house` at
`confluence`; `cold-fell-aqueduct` on `cold-fell.yaml` if that is its
reach), `delight.yaml` — `millrace` on its reach; `stocks:` (species
only, capacity omitted) on the reaches the drives fish —
`kestrel:confluence` (eel, carp, grey-mullet), `kestrel:headwaters`
(brown-trout), `delight:flats` (carp, eel), the heath's reach and the
meres as their habitats fit. `refsOf` reads `nodes[].works[]`. Lower
the scan ceiling (two sites). Docs: `watershed.md:714-726` rewritten
(the row is the record; the live object is the override),
`fishing.md` (the reach names its species).

**Tests.** `WatercourseCatalogue.test.ts`: contamination below an
outfall whose object is NOT standing equals the row's load attenuated
by hops and diluted by flow; a standing, shut work draws nothing; a
work named by no reach is not read. `FisheryRegistry.test.ts`: a reach
naming no species has none; a named species with no capacity derives
fit; the sea band's stock still bites.

**Acceptance.** Drive step 5; `fishing`, `climate-and-water`,
`maritime-space` wire drives pass.

**Commit.** `feat(water): the reach names its works and its species — an unvisited outfall fouls from its row; no species class scan`

### W3 — Residence, the books, the basket, the self-seating fixtures

**Goal.** AC 3, AC 7; the building / warren / prop / book entries.

**Implements** D5 (books, basket), D9.

**Files.** `S/lib/location/OuterWarren.ts` (`institutionsCovering` via
the zone; delete the catalogue reach), `C/residence/src/idea/ResidenceCatalogue.ts`
(deleted, with its row and path constant),
`C/residence/src/behavior/maintains.ts` (`holdingsUnder` via the zone),
`C/residence/src/thing/DeedDesk.ts` (`books`),
`C/residence/src/idea/PlatBook.ts` (`holderPath` relation; `singleton`
at the sale), `S/platform/idea/cmd/civics/TitleController.ts` (`title
list` through the reachable desk), `C/terminus/src/realty/agent/Realtor.ts`
(`books`; `offers(realtor)`), `S/platform/idea/api/BankingLogic.ts`
(`priceIndexImpl` async + `singleton` per counter; `BankingApi.priceIndex`
signature; callers `S/lib/behavior/prints.ts` and the `reserve`
controller). **Content:** `stands:` on `duncan-hall.yaml`
(`idea/dorm-warren`, `idea/college`), `seznick-house.yaml`
(`building`), `hinkley-hills.yaml` (`idea/plat-book`, `idea/lot-holder`),
the lounge zone `lounge.yaml` (`thing/terminal`, `thing/check-rack`);
`registry/desk.yaml` and `realty/desk.yaml` `books: [/world/terminus/hinkley-hills/idea/plat-book]`;
`ricky.yaml` `books:` likewise. Boot entries removed: eternal-university
dorm-warren; terminus seznick building; lounge terminal + check-rack;
hinkley-hills ×2; hearts-delight's three books. Lower both ceilings.
Docs: `residence.md § ResidenceCatalogue` (replaced by the zone),
`holding.md` (the keyed-room re-entry walks the zone), `fasttravel.md`
(no eager root: the network cascades from whichever node first loads),
`banking.md` (the index loads its basket).

**Tests.** `OuterWarren.test.ts`: `admitFor` on a cold world stands the
zone's institution up and admits the keyed room. `TitleController`: no
desk → the refusal; a desk → the named book. `Realtor.test.ts` over
`books`. `BankingLogic.test.ts`: `priceIndex` loads an unloaded basket
counter and covers every priced key.

**Acceptance.** Drive steps 3, 4 and 8 (8 by hand — log out in a keyed
dorm room, restart, log in there — recorded in the drive record);
`platform-smoke`, `reachability` and `economic-bootstrap` wire drives
pass.

**Commit.** `feat(residence): the zone names its institutions; the desk and the agent name their books; the price index loads its basket; no warren, book or self-seating fixture is booted`

### W4 — Vocabularies and species: holders load what they are made of; dictionaries are lazy

**Goal.** AC 5, AC 6; the catalogue and species entries.

**Implements** D2 (the declaration sweep), D6, D7.

**Files.** The constituent / relation / kind declarations of D2 on
their owners (kernel and packs; grep every `authorPicker: 'Species' |
'Material' | 'Biome' | 'Template' | 'Business' | 'Brand'` and every
field the census reads). The retired catalogues (D6) and their
references in `PackLogic`, `lib/paths.ts`, `lint:biome`. The keyed
setters (`Constructed`, `Branded`, `Fractionating`, `Maturing`,
`Locality`) and the lazy `warmed()` / `ready()` on each dictionary with
its readers awaiting (D6's list). `S/platform/idea/api/SpeciesLogic.ts`
(`isSentient` throws), `S/lib/species/SpeciesUnresolved.ts`, the three
safety controllers, the six engine callers. **Boot:** remove platform's
Material, Biome, Fabric, Condition, MaturationProfile,
FractionSchedule, Corpo, Government, Discipline, Operation, Spell, Help,
AddressRegistry, Reading, Placement, Soul; trade-dyeing's catalogue;
hearts-delight's four and trade-apiculture's one species; rewrite
base-library's universe-biome reason; Topic / Recipe / Archetype per
the reader rule with the decision in their reasons. Lower both
ceilings. Docs: `race.md` (the organism loads its species),
`materials-response.md:134-141` (the fabric roster warms on the first
form word), `biome.md:376`, `instrumentation.md`, `magic.md`, `help.md`,
`maturation.md`, `fractionation.md`, `corpo.md`, `textiles.md`,
`advancement.md`, `civics.md`, `address.md`, `emotes.md`, `topics.md`.

**Tests.** Per lazy catalogue: cold → the first typed use answers
(`StuffApi.clearAll` between cases). `Organism.test.ts`: a cloned collie
has its species resident with no boot entry; a RESTORED one too.
`butchery.test.ts`: a cold species row refuses with the unidentified
line; a cited one refuses on sentience. `Constructed.test.ts`: a garment
with `constructionForm: woven` hydrates on a cold world.
`Branded.test.ts`: a bottle's brand resolves cold. `SpeciesLogic.test.ts`:
`isSentient` throws unresolved; the engine wrappers take the sentient
branch.

**Acceptance.** Drive steps 6 and 7; `instrumentation`, `apiculture`,
`carcass-chain`, `taps`, `farmstead`, `textiles`, `whiskey-styles`,
`clinical-medicine`, `crafting`, `cooking`, `injury`, `identity` wire
drives pass.

**Commit.** `feat(templates): a holder loads what it is made of; typed-word and keyed dictionaries warm on first use; isSentient fails closed; no vocabulary or species row is booted`

### W5 — Part 1's nine, the ratchets pinned, the docs

**Goal.** AC 8; both gates become ratchets at their final counts.

**Implements** D10, D11 (final pins).

**Files.** `S/lib/command/CommandController.ts` +
`S/platform/idea/api/DisplayLogic.ts` + `S/lib/display/Display.ts`;
`S/platform/idea/api/BankingLogic.ts` + `S/lib/banking/Bank.ts`;
`S/platform/idea/api/PressLogic.ts` (the principal's employments);
`S/platform/idea/api/AttendantLogic.ts` + `S/lib/attendant/Attendant.ts`;
`S/platform/idea/api/ResidencyLogic.ts:458` (`findByMixin`);
`S/api/stuff.ts` (`byDocPath`; `RegistryWideReaders` minus `branchOf`,
`holdsAnyPublishingPosition`, `resolveScreen` → 8; the test's
high-water mark lowered); `S/lib/stuff/Template.ts` (the memo +
`invalidateInheritance`; `TemplateLogic.saveTemplate` and `PackLogic`'s
reconcile call it); `scripts/check-template-scans.ts` (final allowlist
with every reason written; the residency spawn sweep and the wiki page
among them); `scripts/check-boot-entries.ts` (ceiling = the roster now
in the tree; clause c enforced). Docs: `display.md`, `banking.md`,
`press.md`, `attendant.md`, `mql.md`, `templates.md` (the memo),
`lint-family.md` (the ratchet lesson: a reference that points away from
the asker), `antipatterns.md` (the same, as a lookup-table entry),
`residency.md`.

**Tests.** `resolveScreen`'s mind path tries only the actor's houses'
displays (spy on `findByMixin`); `branchOf` on an unknown bank does not
enumerate; `holdsAnyPublishingPosition` for a stranger reads no
publisher bucket; a disconnect drops only the points the customer held;
`findTemplatesByPath` is a map read; `findByClass` twice runs the
`extends` query once and again after a save.

**Acceptance.** Drive step 9; `world-scan`, `envelope`, `consequence`,
`presentation` wire drives pass; `lint:family` green with both ratchets
pinned.

**Commit.** `refactor(scan-sweep): the nine registry scans ask their owners; the extends union is memoised; boot-entry and template-scan ratchets pinned`

### W6 — The drive

`packages/wire/tests/scan-sweep.dirty.wire.test.ts` (D16 of the wire
harness; `.dirty` because it takes a job, buys, posts, fishes and
advances the clock). Then `pnpm test` ONCE (foreground), the drive
record appended below, the branch pushed, the MR opened.

---

## Reachability wiring

For each capability: **verb · affordance · data · boot · arg gate**.

| capability | verb | affordance | data (the row that must exist) | boot | arg gate / silent failure |
|---|---|---|---|---|---|
| a place standing its house up | arrival (`traverse`, login) | — | the room's `stands:` names the house; the house's `operatingLocations` names the room | NONE (the point) | `lint:openings` rule 3 fails at build on a house no operating room names; `lint:census` on a path that resolves to nothing |
| the opening on first look | `look` (existing) | — | as above | none | `noticesAt` awaits the kicked load; an un-rostered house would over-advertise — the one-house pass runs first (D3) |
| a house catching up | `look` / `buy` / `order` / `bank` / `house` | — | the employment ledger + the clock | none | nothing persisted, nothing to drift |
| a holder loading its constituents | hydration (mint / go-live / restore) | — | the cited row (`_speciesPath`, `_materialPath`, …) | none | a bad path WARNS (degraded holder); the census refuses it at build; a cycle is a census finding and a kick at runtime |
| a relation at the act | `appoint`, `press post --as`, title checks, `title buy`, the price index | existing | the citing field's row | none | a path that will not stand → the existing refusal, one diagnostic per path |
| organizations by label | `chronicle <body>`, `appoint … at <name>` | existing | the zone's `stands:` names the institution | none | a cold org by LABEL is unfindable — the zone naming it is what makes the label reachable |
| the river fouled from rows | `analyze water` | the existing reading row | `works:` on the reach node; the work row's `reachRef` matches | none | a work on no reach's list discharges nowhere → `refsOf` resolves `works`; a W2 test asserts every Conduit / ControlStructure row is named by a reach |
| fish by name | `fish` | — | `stocks[].species` on the reach | none | a reach naming none bites nothing (intended) |
| keyed-room re-entry | login | — | `stands:` on the zone over the extent names the institution | none | `admitFor` null → "host left where cloned" (existing); W3 test |
| `title list` | `title` | Persona (existing) | `books:` on the reachable `DeedDesk` | none | no desk → `no-registry` refusal |
| Ricky's list | dialogue `realty-list` | the Realtor's tree | `books:` on Ricky's row | none | empty → "nothing on the books" |
| the basket | `press` / `reserve` | — | `reserve.indexBasket` naming counters that EXIST | none | `refsOf` cannot see a setting — a W3 test resolves each path |
| typed-word dictionaries | `measure`, `readings`, `help`, `cast`, `spells`, `operate`, `put`, `react` | existing | the rows under their infix / class | none — `warmed()` on first use | a miss after warm is final; the installer's go-live re-warm / `invalidate()` |
| keyed dictionaries | hydration of a citing row | — | the fabric / brand / schedule / profile / government row | none — warmed by the first citing setter | an unknown form word still THROWS (the existing invariant), now after one warm |
| species on a cold world | `butcher`, `slaughter`, `transfuse`, `shear`, the egg tap | existing | `_speciesPath` on the animal / book (constituent) | none | `SpeciesUnresolved` → the "cannot make out what it was" refusal |
| self-seating fixtures | arrival in the lounge | — | the lounge zone's `stands:` names the terminal and the rack; each row's `seatIn` | none | a fixture named by no place never seats — `refsOf` resolves `stands` |

---

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| 1 a fresh boot loads no content catalogue, structure, sea, species row, organization or advertising-only house; every remaining entry is a warden or an unobserved-economy house / premises with a reason | W1 (houses, orgs), W3 (warrens, props, books), W4 (catalogues, species), W5 (the pins; clause c) — ⚠ Topic / Recipe / Archetype per Risks & opens 1 |
| 2 the first `look` in a room whose house advertises shows its opening with the house never booted | W1 |
| 3 the realtor lists every book he names; the price index covers its basket | W3 |
| 4 water below an outfall reads fouled unvisited; a reach bites only species it names | W2 |
| 5 `measure`, `readings`, `help <concept>`, `cast`, `spells`, `operate` answer on first use | W4 |
| 6 `butcher` of a sentient animal is refused on a cold world | W4 |
| 7 logging back in to a keyed room after a restart works | W3 (+ by hand) |
| 8 the Part 1 spot checks behave as before | W5 |
| 9 every shipped drive still passes | each wave runs its named drives; W6 runs the whole wire suite |

No AC is unmapped.

---

## Test & gate strategy

- **Unit** (per wave, `pnpm test:near` + the touched pack's vitest):
  the mechanisms above, with `StuffApi.clearAll` between cold-world
  cases; every "maintained on write" test spies on `findByMixin` to
  prove the scan is gone, not merely cached.
- **Gate**: `lint:family` after every wave. The two new gates start as a
  census at W0 and are lowered by each wave; W5 pins them. A rise in
  `lint:on-create` or `lint:lib-statics` is a plan defect, not a number
  to raise — this build adds no `onCreate` body and no lib static.
- **Wire** (what only a drive proves): the ten steps in W6; each wave
  runs the shipped drives it touches. *"Not refused" is not
  "succeeded"*: every checkpoint asserts the verb was understood AND a
  state change (the maritime file's rule).
- **`pnpm test`** at exactly two moments: before the MR opens (after W6)
  and at `/finalize`. Never in the background.
- One Mongo DB per worktree; a DB that predates the `structures:` →
  `stands:` rename or the deleted catalogue rows is DROPPED, never
  migrated.

---

## Risks & opens

**For the user — decisions the plan makes that need an eye:**

1. **Three catalogues are expected to stay booted** by D6's reader rule:
   `TopicCatalogue` (read synchronously on every message render —
   `Sensor.ts:62`, `Avatar.ts:1455`), `RecipeCatalogue` (read
   synchronously inside the thermal dose fold — `ThermalDose.ts:741`)
   and `ArchetypeCatalogue` (re-warmed by the installer with Recipe;
   both index DOCUMENTS, not rows). AC 1 says *no content catalogue*.
   The plan's answer is an honest surviving entry whose reason is that
   sentence; the alternative is making the message pipeline and the
   dose fold async, which is a different build. Confirm.
2. **A look runs the one-house pass on a LIVE house** (D3). The arrival
   stands the house up; the first read after that — `look`, `buy`,
   `order`, `bank` — runs the idempotent roster pass so the opening is
   honest. The requirements' sentence forbids a look STANDING A HOUSE
   UP, which it never does now; but the pass does settle a shift
   boundary the hourly tick would otherwise settle an hour later. If a
   look must touch nothing at all, the alternative is to let the
   opening over-advertise until the next tick.
3. **The price index pulls a counter's ROOM in** through the counter
   row's own `container:` self-placement (D5) — the room, its props and
   its `stands:`. Requirements decision 4 accepts the counters; the
   room is the existing clone pipeline's doing. Noted, not asked.

**Engineering risks the build should price:**

- **Constituent loading lengthens hydration** by one coalesced
  `singleton` per distinct citation (a species chain is ~4 rows; a
  room's twenty props mostly share a dozen materials). The coalescing
  index keeps repeats free. If a drive shows a room standing up
  slowly, cite fewer rows — never kick a constituent.
- **A constituent cycle** (material → condition → tissue material)
  deadlocks an awaited load; `ensureConstituent`'s pending-skip and the
  census's acyclicity clause are the two halves of the guard. Run the
  census before declaring `conditionPath` / `tissues` constituent.
- **TS inference on `LocationBase`** — the chain is eight mixins deep and
  one more layer collapsed it once (the Enclosed note). Compose
  `SiteMixin` outermost; if inference still collapses, declare the field
  and the three methods directly on `Location` and on `SpatialZone` and
  record why.
- **`holdsAnyPublishingPosition` may be a sync validator seam.** If
  `command-routing.md` says validators cannot await, the check reads the
  principal's organizations live-only and a publisher whose org is cold
  is refused until it loads — written down, not hidden.
- **`lint:openings` rule 3 across packs**: a `trade-haulage` or `tpa`
  house operates rooms or fixtures in another pack's content; the rule
  resolves rows across every pack (the census walks all of them) and
  the `stands:` edit lands on the room's pack. A house operating a
  MINTED stall (a player's) is set at runtime and never authored — the
  rule reads authored rows only.
- **Boot order for the kept premises**: a booted floor now kicks its
  house through `stands:` while the house keeps its own entry —
  `singleton` coalesces both onto one clone, order-independent.
  `tickRoster` at the end of boot still rosters every live house.
- **The `extends` memo** must be dropped by EVERY template write — the
  CMS save go-live, `TemplateLogic.saveTemplate`, the pack reconcile; a
  stale memo hides a child row from a lazy warm.
- **The universe biome** stays as the engine's fallback; with
  `ensureConstituent` walking `extends:` ancestors, a cited biome's
  chain reaches it anyway on a populated world.

---

## Deferred seams

- The residency spawn and reset sweeps, their `censusKey` scan, and
  every house / premises entry kept for an unobserved beat →
  [unobserved-economy-slate](../slates/builds/unobserved-economy-slate.md).
- Who may keep a thing loaded while unobserved (pins, allowances) →
  `eager-residency-slate`.
- The water index's Locality walk for catchments (reach ← localities
  is the wrong-way reference; the reach could name its catchment area
  directly) — one row edit per reach, not in scope; a one-line note in
  the watershed slate.
- `stands:` inherited through `by-entry` from an `extends:` parent row
  is supported by the field rule and unused by shipped content.
- A third class fronting `books` → promote the field to a kernel
  mixin; until then two pack classes carry it.

---

## Critical files

Read first, in this order:

1. `docs/requirements/scan-sweep-requirements.md`;
   `docs/slates/builds/scan-sweep-slate.md` (Part 2's table of
   wrong-way references); `docs/slates/builds/unobserved-economy-slate.md`
   (what stays booted and why).
2. `S/lib/zone/SpatialZone.ts` (`structures:` — the pattern),
   `S/lib/stuff/Staged.ts` (`props:` — the designation shape),
   `S/lib/stuff/Location.ts:155-180,346-361`, `S/lib/expanse/Expanse.ts:365-373`,
   `S/lib/zone/LocationZone.ts:55-91`.
3. `S/lib/mixin.ts:44-247` (`FieldMetaEntry`), `docs/ref-shapes.md`,
   `S/platform/idea/TemplateApplier.ts:124-200`, `S/api/stuff.ts:727-828`,
   `scripts/check-field-meta.ts`, `scripts/check-template-census.ts`,
   `scripts/pack-roots.ts`, `docs/subsystems/templates.md § Property vs
   instruction fields`.
4. `S/platform/idea/api/EmploymentLogic.ts` (`:436-447`, `:1448-1506`,
   `:1590-1700`, `:1925-2095`, `:2150-2195`), `S/platform/idea/Business.ts`,
   `S/lib/employment/Organization.ts`, `S/lib/attendant/Attendant.ts`,
   `S/platform/idea/AccessRegistry.ts:468-535`, `S/platform/idea/api/PressLogic.ts:125-215`,
   `scripts/check-openings.ts`, `docs/subsystems/employment.md`.
5. `C/water/src/idea/{Watercourse,WatercourseCatalogue,FisheryRegistry}.ts`,
   `C/world-seed/content/stuff/idea/Watercourse/*.yaml`,
   `C/terminus/content/world/terminus/wharfside/thing/city-outfall.yaml`,
   `docs/subsystems/{watershed,fishing}.md`.
6. `C/residence/src/idea/ResidenceCatalogue.ts`, `S/lib/location/OuterWarren.ts:350-440`,
   `S/platform/idea/api/PersistableLogic.ts:360-390`,
   `S/platform/idea/cmd/civics/TitleController.ts:130-165`,
   `C/terminus/src/realty/agent/Realtor.ts`, `C/residence/src/behavior/maintains.ts`,
   `S/platform/idea/api/BankingLogic.ts:296-340,838-870`,
   `docs/subsystems/residence.md`.
7. `S/platform/idea/{Material,Biome,Fabric,Condition,FractionSchedule,
   MaturationProfile,Reading,Placement,Spell,Help,Operation,Discipline,
   Topic,Corpo,Government,Recipe,Archetype,Soul}Catalogue.ts`,
   `S/platform/idea/AddressRegistry.ts`, `C/trade-dyeing/src/idea/DyestuffCatalogue.ts`,
   `S/lib/material/Constructed.ts`, `S/lib/corpo/Branded.ts`,
   `S/platform/idea/api/{SpeciesLogic,MagicLogic,MessageLogic}.ts`,
   `S/lib/species/Organism.ts`, `S/api/help.ts`.
8. `S/api/stuff.ts:76-152,1637-1647`, `S/lib/stuff/Template.ts:445-580`,
   `S/lib/command/CommandController.ts:85-115`, `S/lib/display/Display.ts`,
   `S/platform/idea/api/{AttendantLogic,ResidencyLogic}.ts`,
   `scripts/{check-world-scan,check-whole-table,check-on-create,check-gate-strings}.ts`,
   `docs/lint-family.md § census, then ratchet`.
9. `packages/wire/tests/maritime-space.dirty.wire.test.ts`,
   `packages/wire/tests/fishing.dirty.wire.test.ts`,
   `packages/wire/src/harness/{session,world,assertions}.ts`, every
   pack's `pack.yaml` `boot:` block, `S/backend/AppBootstrap.ts:205-240`.

---

## The drive (W6) — what each step needs

File: `packages/wire/tests/scan-sweep.dirty.wire.test.ts`;
`declareFile({ packs: [terminus, hearthworks, eternal-university,
hearts-delight, hinkley-hills, water, trade-fishing, world-seed,
generic-objects, saxonberg-lounge, residence, trade-medicine, arcana,
newbie-wilds], dirtyReason })`. Every checkpoint: `expectOk` (or a NAMED
refusal) AND a state change.

| step | needs |
|---|---|
| 1 boot list | a `scripts/__tests__` assertion over `check-boot-entries --list`: no `/stuff/idea/species/`, no `/idea/material/` or `/idea/biome/`, no `*Catalogue` outside the reader-rule survivors, no `/world/…` entry whose reason lacks `unobserved-economy`; the wire file asserts step 2 on a house that is NOT in the list |
| 2 a house that advertises, unbooted | `Session.open(h, { startLocation: '/world/terminus/hearthworks/location/cookhouse' })`; `look` → `/HELP WANTED/`; `apply` for the kitchen-hand → `expectOk` + an employment note; `house roster` lists the handle |
| 3 Ricky + the Registry | open at `/world/terminus/realty/office`; `talk ricky` → the "on the books" branch → the Hinkley plat book named; open at `/world/terminus/registry/office`; `title list` → the same book |
| 4 the basket | `press` (the ticker / front page) or `reserve` as a wizard → the index line; assert the number of priced lines equals the basket's priced keys (resolve each `reserve.indexBasket` path's row in the test) |
| 5 the Kestrel | open at `/world/terminus/counting-houses/banking-hall` (`kestrel:confluence`, below the outfall; the wharfside bank room never opened); `analyze water` → a fouled reading; the fishing recipe (`talk fisher`, the rod, `fish`) at the square → the bite names a species the reach's `stocks` lists |
| 6 dictionaries, first use | run BEFORE any other step touches them, or boot order makes it vacuous: `measure depth` at the water, `readings`, `help gluten` (trade-baking's concept) — or whichever concept pack is installed — `spells` and `cast <a known working>` with the `injury.wire` caster recipe, `operate patient for extraction` with the clinical-medicine recipe; each answers correctly the first time |
| 7 Hearts Delight | open at the farmstead yard (`/world/terminus/hearts-delight/location/farmstead-yard`); `butcher collie` → refused with the SPECIES-KNOWN reason (`no-yield` — a dog has no butchery yield), which proves the species loaded with the dog; a `unidentified-species` refusal is the cold-row failure and fails the step; `shear` the ewe → fleece in hand; the hen's egg tap → an egg |
| 8 restart | BY HAND: log out in a keyed dorm room, restart the server, log in → the same room; record in the drive record |
| 9 Part 1 | `house shop` through a paired screen; `bank` at a branch; `press post` as a publisher ok / as a stranger refused (`requiresPublisher`); queue at a counter, close the socket, reopen → the lease is gone |
| 10 every drive | the whole wire suite in the same run; the maritime file 38/38 |

---

## Drive record

*(appended at build time)*
