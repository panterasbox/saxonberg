# Maritime space — implementation plan

Executes [maritime-space-requirements](../requirements/maritime-space-requirements.md).
**Kind:** feature. **Lead end:** kernel-led — Stage A lands the substrate
(the zone frame split, a geographic position, the Structure, the expanse
and its bands, the voyage engagement, the claim-store channels, the two
readings and the Discipline), Stage B lands the water tier, the first
consumer's content, the verbs that content affords, and the drive.

What is being built: a second and third spatial register beside the
room grid — a **passage** (a fraction along one dimension) and a
**field** (a coordinate with no neighbours) — as an `Expanse` frame
holding **nodes** (points of interest, each either a place or a passage)
and **bands** (regions with a direction and a width that confer cost and
character, never connectivity); a **Structure** that says *these rooms
are one building* and whose **position is a variable**; a **voyage**
held by the craft, beating once a watch, re-established at boot; a
reckoned position that diverges from the true one and is never leaked;
the chart as `charted` claims and the pilot as `told` claims; `depth`
and `latitude` as reading rows under a new `navigation` Discipline; and
one craft crossing one sea between two nodes so all of it is reachable.

Everything in this document was checked by opening the file named. Where
a requirements sentence turned out to be wrong about the code, it is
listed under *Risks & opens* as ⛔ and is **not** absorbed here.

---

## Grounding

Facts verified at plan time (2026-10-09), with paths. **S** =
`packages/server/src/mud/`, **C** = `packages/content/`.

### Zones and the frame

- `S/lib/zone/Zone.ts` — abstract `Zone extends Idea`; fieldMeta `name`,
  `wire`, `elevation`; `lookupField` / `lookupAncestorField` (the
  ancestor walk, via `ZoneApi.getEnclosingZone`).
- `S/lib/zone/SpatialZone.ts` — abstract `SpatialZone extends Zone`. It
  carries **both** halves in one class: the region/frame fields
  (`stocks`, `favours`, `blessingOdds`, `address`, `deposit`,
  `groundCharacter`, `celestialProfile`, `suppressesMagic` — all
  `persistent + authorable`, protected, get/set pairs) **and** the
  Location-narrowed surface: `protected locations: Set<Location>`,
  `addLocation(location)` (calls `location.setZone(this)`),
  `removeLocation`, `getLocations`, `contains`, and a `canDestruct` veto
  on a non-empty set. Only `lib/zone/` holds `Zone.ts` + `SpatialZone.ts`.
- `S/lib/stuff/Stuff.ts:107` — `FromSpatialZone =
  SecurityPolicies.FromModule('/lib/zone/SpatialZone#SpatialZone')`;
  `setZone` (:915) is `@CallSecurity(FromSpatialZone)`; the slot is
  `#zone: SpatialZone | null`; the clone pipeline stamps it through the
  caller-allowlisted `Stuff._stampZone` seam (`S/api/stuff.ts:625,680`
  resolve + stamp on every clone).
- `S/platform/idea/location/CartesianZone.ts` =
  `SingletonMixin(SpatialZone)` + `cellSize` + the `grid` index;
  `SphericalZone.ts` = `SingletonMixin(SpatialZone)` + `focusIndex`.
  Other `Zone` subclasses (`FolderZone`, `HomeZone`,
  `WikiNamespaceZone`, `Clade`) extend bare `Zone`. **No pack `src/`
  extends any zone class.**
- Callers of the Location surface (the whole set): `addLocation` —
  `S/lib/location/CartesianLocation.ts:327` (inside `setCoords`),
  `S/platform/location/SphericalLocation.ts:189`, plus `super` calls in
  the two zone subclasses; `removeLocation` — `S/lib/stuff/Location.ts:453`
  + the two subclasses; `getLocations()` / `contains()` — **tests only**.
- `S/platform/idea/api/ZoneLogic.ts:110` — `isSpatialZoneClass` is a
  cached `instanceof SpatialZone` on the resolved class;
  `resolveZoneForPath` (:188) walks `Template.ancestorPaths` nearest-first
  and returns the first ancestor whose class is a `SpatialZone`; a zone
  resolves to no zone. `elevationFor(scope)` (:141) walks containment
  outward then `outermost.getZone().lookupField('elevation')`.
- There is **no `zone:` field** on a Location row; membership is template
  ancestry. `coords` on `CartesianLocation` is `{persistent, authorable}`
  and routes `setCoords → zone.addLocation`.
- The declared-fields gate: `S/lib/zone/__tests__/SpatialZone.authoredFields.test.ts`
  asserts every authored zone key is declared and every literal name any
  source passes to `lookupField` is declared by some zone class. **A new
  zone field must be declared on `SpatialZone` or it is silently dropped.**

### Coordinates

- `S/lib/location/CartesianCoordinates.ts` — `CartesianCoordinatesMixin`,
  `[x,y,z]` integer lattice cell, `coordinates: {persistent}` (not
  authorable, deliberately). `S/lib/location/SphericalCoordinates.ts` —
  `[rho,theta,phi]` + `radius`. **No geographic / lat-long type exists
  anywhere in `lib/`.**
- `S/api/celestial.ts:71` — `CAMPUS_LATITUDE` is a single constant,
  *"single-region v1; per-zone latitude is future work"*.
  `CelestialLogic.solarAltitudeDeg(profile, latitudeDegrees, t)` (:427)
  and `declinationDeg(profile, t)` (:395) **already take latitude as a
  parameter**, so a sight at an arbitrary latitude needs no celestial
  edit. `docs/requirements/climate-and-water-requirements.md:153,195`
  — the climate build makes latitude "a resolved value, inherited"; its
  collision table (:152) says maritime "owns the frame and the zone
  surface".

### The water pack and the shore

- `C/water/pack.yaml` — `id: water`, `root: /system/water`, group `water`,
  title `/system/water`, no `boot:`. `src/idea/` holds `Watercourse.ts`,
  `WatercourseCatalogue.ts`, `FisheryRegistry.ts`, `WaterRightRegistry.ts`,
  `reading/{Power,Water}Reading.ts`, `cmd/`; `src/thing/` holds `Shore`,
  `Conduit`, `StorageNode`, `ControlStructure`. Content:
  `content/{settings,stuff,system}`.
- `C/water/src/idea/Watercourse.ts` — `export default class Watercourse
  extends NamedMixin(Idea)`, `boundaryRole: 'commons'`, fieldMeta `key`,
  `basin`, `nodes`, `branchesFrom`, `water` (all persistent+authorable).
  Rows live at **`/stuff/idea/Watercourse/<key>`** (world-seed), the
  pack ships the class — *"the realm's own pack has to be able to author
  and edit it"*. `/stuff/idea/Watercourse` has no folder row of its own
  (`ls C/world-seed/content/stuff/idea/` shows a bare directory).
- `C/water/src/idea/WatercourseCatalogue.ts` — a singleton `Idea` at
  `/system/water/idea/WatercourseCatalogue`, **lazy and self-loading**
  (*"deliberately no warmed-vs-cold state to get wrong"*), compiles a
  reachability set; `reachOf(ref)` (:371). `FisheryRegistry.standingAt(reachRef, nowS)`
  (:164) resolves the reach through `cat.reachOf`.
- `C/water/src/thing/Shore.ts` — `class Shore extends Thing`; fieldMeta
  `reachRef`; `fixedInPlace` at `onCreate`; `static markupAugmenters =
  [waterReadAugmenter]` appends the water read **to the shore's own
  description on `look <shore>`**; memo refreshed fire-and-forget per
  six-game-hour segment; `bandOf(viewer)` reads the viewer's band in the
  Discipline `water.fishery.readDiscipline` names. Rows:
  `C/terminus/content/world/terminus/wharfside/thing/river-edge.yaml`
  (`kestrel:confluence`, a prop at `bank.yaml:133`) and
  `C/world-seed/content/world/moor/heath-mere.yaml` (`holloway:head`).
- `C/trade-fishing/src/idea/cmd/fishing/FishingController.ts:34` reads
  `shore.getReachRef()` off the bound Shore and hands the string to the
  engagement; `fish.yaml` declares `default: "reachable:[class.Shore]"`.
  The fishing pack never parses the ref — **so a Shore subclass whose
  `getReachRef()` returns a different grammar, plus a `FisheryRegistry`
  that understands it, reaches `fish` with no fishing-pack change.**

### The claim store and routing

- `S/lib/location/MapClaim.ts` — `MAP_CHANNELS = ['walked','seen',
  'searched','published']`; `MapClaimKind = 'place' | 'edge'`; the
  docstring records that `told`/`bought` were **cut** and why. The dedupe
  key lives in `NavigationLogic` (the writer). `S/lib/location/RoutePlan.ts:32`
  mirrors the channels as `RouteClaimChannel`.
- `S/lib/location/Cartographer.ts` — `CartographerMixin`:
  `recordSurroundings(location, perceived, how)`,
  `recordTimetableRead(stops)` (the `published` writer — the model for
  `charted`), `onTraversed`; `keepsMaps()` = durable handle non-null;
  `mapOwnerKey()` = `getIdentityPath()`. Claims use
  `location.getDurableHandle()` as `place`.
- `S/api/navigation.ts` — `NavigationApi`: direction table; the location
  graph (`isGraphWarm`, `rebuildGraph`, `projectRow`, `node`,
  `nodesInZone`, `nodesInExtent`, …); the map (`recordPlace(viewerKey,
  locality, claims)`, `readMap`, `mapNow`); routing (`routeBetween`,
  `routeOnMap`, `routeOverEdges`, `reachFrom`, `costMatrix`). All
  string-keyed — *"not on `lint:object-verbs`' exempt list and should
  not be"*. `S/platform/idea/api/NavigationLogic.ts` methods are gated
  `FromModule('/api/navigation#NavigationApi')`; `KnowledgeGraph`,
  `Traversal`, `TravelProfile`, `RoutePlan` are the firewalled core
  (`lint:graph-walks`, second check, no ceiling).
- `S/lib/location/PlaceNode.ts` — a node is a row whose class composes
  `Location + SingletonMixin` (+ PlatPlan circulation nodes). **An Idea
  row is never projected**, so expanse nodes never enter
  `location_graph`.
- `S/platform/idea/cmd/perception/MapController.ts` reads only
  `NavigationApi.readMap`. `LocateController.ts` walks `getContainer()`
  up and prints the chain (arg `requires: any`). `ReadController.ts`
  requires `[VisibleMixin, MarkedMixin]` (`read.yaml:28-33`), perceives
  then decodes (a no-op today; a scroll fires its working).
  `RouteController.ts` (826 lines) plans only over the viewer's map;
  `BY_WORDS` (~:70) maps `boat|barge|water|sail|ship → 'sailed'`.
- `docs/subsystems/location-graph.md:259` *"Four channels, three of
  which can be wrong"* still lists `perception · publication · told ·
  bought` — **stale**, fix at the sweep.

### Engagements

- `S/api/scheduler.ts:48-89` — `ScheduledEmission {intervalMs, event}`,
  `Engagement {engagementId, type, actor: Stuff & Engaged, startedAt,
  slots, interruptibleBy, emissions?, cancelable, onStart, onAbort,
  getHost?}`, `DurativeActivity` (duration, replaceableBy, effortW?,
  onComplete), `SustainedEngagement = Engagement`. `SchedulerApi.start /
  cancel / complete / cancelAll / cancelByType / cancelByPredicate`.
- `S/platform/idea/SchedulerRegistry.ts` — one `WorldClockApi.every(intervalMs)`
  per emission (game seconds; errors swallowed by `fireEmission`); a
  `StuffDestructed` subscription on `getHost()` → `'host-destroyed'`;
  **`cancelAll` / `cancelByType` never read `cancelable`** (it only rides
  the started note); `interruptibleBy` is read only by
  `Behaved.preemptFor`.
- `S/lib/activity/Engaged.ts` — `EngagedMixin` needs nothing of its host;
  `_engagements` is runtime-only; contributes `cancel.yaml` on `self` and
  the `stop → cancel` alias. **Composed only on `S/lib/creature/Actor.ts:81`**
  (so `Character`, `KeptAnimal`). No Thing or Idea is Engaged.
- `C/transport/src/lib/journey/Journey.ts` — the shipped sustained
  engagement: actor = the **driver**, slots `['hands']`, `cancelable =
  true`, empty `interruptibleBy`, one-game-minute tick emission,
  `getHost()` = the vehicle, per-leg re-validation (`displaced`,
  `route-blocked`, `driver-incapable`), arrival = `SchedulerApi.complete`.
- **Nothing re-establishes an engagement at boot anywhere** (agent
  survey: `Engaged.ts:131-135`, `Wellhead.ts:47-52`, `Comminuting.ts:286`;
  maturation, dying and respiration all reconcile on read or re-arm on
  state change). The voyage will be the first, which is why its state
  must be derivable from three persisted fields.

### Vessels

- `S/lib/boundary/ExitableVessel.ts` =
  `DoorBearing(Exitable(Adornable(Atmospheric(Vessel))))`, authored
  `interiorVolume` (unset declines an interior); may only live inside
  another Exitable (`ContainmentApi.move` enforces).
  `C/transport/src/thing/Coach.ts` = `Vehicular(Drivable(Sealable(Mobile(ExitableVessel))))`.
  `C/transport/src/thing/Barge.ts` = `Vehicular(Bulkable(Drivable(Slotted(Mobile(Vessel)))))`
  — **not** an ExitableVessel; row `C/transport/content/system/transport/thing/barge.yaml`
  (`travelMode: sailed`, `vehicularMode: /platform/idea/LocomotionMode/sailed`,
  a prop at `terminus/wharfside/bank.yaml:159`).
- `S/lib/spatial/Containable.ts:20-26,236` — `ContainmentApi.move(item, null)`
  is a **legal final-detach edge**; `container` is `{instruction, authorable}`
  and **not persistent** (a barge's position does not survive a restart).
- `C/transport/src/lib/Vehicular.ts` — the pack-owned mixin pattern:
  marker `VEHICULAR_MIXIN`, narrowed by `MixinApi.isActive(thing, MARKER)`,
  contributes `system/transport/cmd/movement/journey.yaml`.
- `S/lib/travel/TravelNode.ts` — the **shape seam**: a kernel interface a
  pack class answers structurally so a kernel verb never imports a pack.

### Structure, address, parcel

- **No `Structure` class exists.** The only hit is
  `C/trade-drilling/src/idea/reading/StructureReading.ts` — geology.
- `S/platform/idea/Locality.ts` — reference-data leaf `Idea`, `_address`
  is the coverage prefix; fieldMeta includes `_reach`, `_climateLean`,
  `_weatherPin`. `S/lib/address/Addressable.ts` — `_address:
  {persistent, authorable}`; the resolve walk reads `_address` off
  containment ancestors directly.
- `S/lib/parcel/ParcelRecord.ts:146` — a `Document` (collection
  `parcels`): `extent`, `zonePath`, `area`, `storeys`, `owner`,
  `parentParcel`, `grants`, `allowance`, `keyway`, `landUse`, `reach`,
  `feeder`, `powerBand`, `published`. `docs/subsystems/parcel.md:325`
  — longest-prefix coverage; *"real property bottoms out at the zone"*.
  **Title is code maintenance, never fiction ownership.**
- `S/lib/stuff/Location.ts:161` — `Location = Addressable(AmbientLit(Atmospheric(Adornable(Container(Visible(Detailed(Perceptible(Stuff))))))))`;
  fieldMeta `suppressesMagic`, `floor`, `noDefaultFloor`. **Not
  Containable** — holds and is not held.
- `docs/subsystems/location.md:542` — `getDurableHandle()`: minted →
  keyed (`<row>#<key>`) → singleton (the row) → `null`.

### Perception, prose, the room

- `S/platform/idea/cmd/perception/LookController.ts:157-470`
  `lookAtLocation`: filters contents → light band → body =
  `Mml.location + location.getMarkupLong(actor)` → floor puddle →
  exits (`learnSurroundings`) → *You also see* → concealment hints.
  **Contents cannot add prose to the room; no room-contribution hook
  exists.** `Mml.augment` (`S/api/mixin.ts:2112-2150`) folds the
  host's own class-chain `markupAugmenters` only.
- `S/lib/description/Perceiver.ts:162` — `PerceiverMixin.learnSurroundings`
  records exits + occupants of the **current** location. `PerceptionApi`
  answers questions about a handed-in target or location; **nothing
  answers "can I see room B from room A"**, no vantage/horizon/landmark
  concept anywhere. `LineOfSight.canSeeThrough` (`S/lib/boundary/Conduit.ts:62`)
  is implemented by `Door` and `Window` and **called by nothing**.
- `S/lib/perception/Scryable.ts` — `ScryableMixin` registered,
  **composed by no class**.

### Employment, hazards, readings, disciplines

- `S/lib/employment/Position.ts` — a seat is data: `key`, `label`,
  `noun`, `wageRate`, `fulfills[]`, `headcount`, `requires`,
  `compensation`, `reportsTo`, `purchases`. `Organization.appoint(actor,
  key)` (:689) → `EmploymentLogic.hire`. **No single "who is on shift in
  seat X" method**: `org.holdersOf(key)` (:799) × `actor.getEmployment(orgPath)?.status
  === 'on-shift'` (the `reconcileCover` pattern,
  `EmploymentLogic.ts:1029-1058`) or `actor.isOnShift()` (`Employed.ts:422`).
  No shipped seat has a perceptual effect; the nearest is `picket` on
  `C/newbie-wilds/.../idea/watch.yaml:40` (no mechanics). `appoint.yaml`
  — `verbs: [appoint, hire]`, arg `requires: class:Agent`,
  `mustHoldAppointingAuthority`.
- `S/lib/hazard/Hazard.ts:114` — `HazardMixin`, only host
  `S/platform/thing/Trap.ts` (`HazardMixin(Good)`); fired from
  `S/lib/spatial/Mobile.ts:540-561` after a move (destination, its
  contents, the exit) via `resolveTraversal(mover, mode)`; `trigger:
  proximity | timer | remote` are **authored-representable, unhandled**.
  `HazardDelivery` is a value object → `ConditionApi.inflict`.
  `HazardActivity` pins `body` / disarm holds `hands`.
- `S/lib/instrument/Reading.ts:245` — abstract `Reading` (Idea,
  singleton per channel), `PATH_INFIX = '/idea/reading/'`; fields
  `channel · kind · scope · subjectRequires · discipline · instrument ·
  instrumentNoun · handTool · eyeCeiling · bench · improves · stakes`;
  rungs `analyze` / `measure` / `benchRead` as `@hook`s; `truth()`;
  `observe()` widens by band; `seedFor` (:784) hashes
  `actor|target|channel|day` with a **module-private FNV** (`:1100`).
  `S/platform/idea/ReadingCatalogue.ts:100` warms by path infix +
  `instanceof Reading` (so a pack row registers itself). 37 channels
  ship (agent census); **`depth` and `latitude` are free**.
  `C/platform/content/platform/idea/reading/sky.yaml` — `instrument: ""`,
  `eyeCeiling: expert`, `discipline: awareness`. The pack-owned exemplar:
  `C/trade-drilling/content/trade/drilling/idea/reading/structure.yaml` +
  `src/idea/reading/StructureReading.ts`.
- `S/platform/idea/DisciplineCatalogue.ts:160` warms by
  `Template.findByClass('/platform/idea/Discipline')` wherever a row
  lives; `iscedf` defaults `""`; nothing looks a key up at boot and
  fails. 77 rows; the template
  `C/trade-haulage/content/trade/haulage/idea/Discipline/teamstering.yaml`
  (`iscedf: "1041"  # ISCED-F 2013: transport services`). **No
  lint:disciplines / lint:readings gate exists.**

### Weather, celestial, seeded fields

- `S/api/weather.ts` — `weatherAt(timeS, locality | null)` (pure, sync),
  `deviatedFieldFor(scope, locality, field, timeS)` (sync, needs a `Stuff
  & Container` scope), `resolveWeatherFor(scope)`, `skyReadFor(scope)`
  (→ `{currentType, cloudForm, presageFront}`), `isActive()`.
  `S/lib/weather/WeatherType.ts:59,93` — `WeatherField` has `wind` and it
  is a **scalar** `Quantity<'m/s'>` (D5). `ClimateLean` (:400) is
  `Partial<Record<WeatherType, number>>` — a per-type multiplier, **not a
  direction**; so "the lean's own shape" for a band's wind cannot be
  reused literally — the band needs a direction + strength pair of its own.
- `docs/subsystems/weather.md:106` — the seed derives from the covering
  Locality's address (`AddressApi.resolveLocalityFor`); `null` → the
  global seed. A scope with no address resolves global weather.
- Three module-private FNV copies exist (`Reading.ts:1100`,
  `WeatherLogic.ts:80`, `Appearance.hash` static). **There is no shared
  seeded-hash helper**, by design (no free exported helpers).
- `S/api/biome.ts:401` — `isSkyExposed(scope)` resolves the nearest
  biome ancestor's trait; the deck room's sky exposure is its biome's.
- `C/terminus/content/world/terminus/estuary/estuary-mouth.yaml` —
  `SingletonCartesianLocation`, `_biomePath: /stuff/idea/biome/outdoor/baseline`,
  `_address: terminus/city/wharfside/estuary-mouth`, *"the sea is not
  content … whatever is out there is nobody's business here"*, `coords
  {3,0,0}`, props `tide` + two salt pans, exit west `media: [ground,
  water]`. The six water-media exits run bank → lower-towpath → reach →
  estuary-mouth (`bank.yaml:56`, `lower-towpath.yaml:29,33`,
  `reach.yaml:24,28`, `estuary-mouth.yaml:39`). The Kestrel's `estuary`
  node is elevation 0, 160 m wide (`C/world-seed/content/stuff/idea/Watercourse/kestrel.yaml`).
- `C/terminus/content/world/terminus/estuary.yaml` — `CartesianZone`,
  cellSize 20; `wharfside.yaml` — `CartesianZone`, cellSize 4;
  `terminus.yaml` — `FolderZone`, `elevation: 35`. The clock tower is a
  prose fixture: `terminal/location/arrival-gate.yaml:21,58` and
  `university-avenue/location/crossing.yaml:11-12,78` (a dynamic `tower`
  detail reads the world clock). The terminus manifest has a `boot:`
  list (`pack.yaml:104+`, one line per resident row with a reason).

### Verbs

- 319 command views; **free**: `course`, `hail`, `anchor`, `launch`,
  `recover`, `pilot`, `board`, `fix`, `sound`, `moor`, `berth`, `chart`.
  Taken: `plot`, `watch`, `sink`, `shore`, `study`, `survey`, `set`,
  `dismiss`, `haul`, `drive`, `drift`. `stop` is an alias of `cancel`
  (`Engaged.ts:122`). `swim.yaml` exists with `SwimController`.
  `competence.yaml` is at `platform/cmd/charactergen/`.
- `CancelController` — bare `cancel` runs `SchedulerApi.cancelAll(giver)`:
  **it only ever reaches the GIVER's engagements.** An engagement whose
  actor is the craft is unreachable by anyone's `cancel`.

### Persistence and login

- `S/lib/persistence/Persistable.ts:195` — `PersistableMixin`;
  `(scope = templatePath, key)`; `pinsResidency()`, `canEvict` veto,
  capture-on-destruct backstop. `PersistableApi.capture(host, key?)`,
  `materialize`, `captureHostOf` (walks to the nearest persistable
  ancestor — **a detached boat with no persistable self is captured by
  nothing**), `restoreOrSeed`. `PersistedRecord {scope, owner, state,
  place: HostPlacement | null, writtenAt}`.
- `S/lib/character/Avatar.ts:378,555` — `startLocation: {instruction}`;
  stamped at mint from `defaultStartLocation` (`Login.ts:290`,
  `EmbodyController.ts:685`). At return login `PlayerLogic.materializeAvatar`
  (:577) → `restorePlacement` (`PersistableLogic.ts:320-380`) moves the
  avatar to `place`; if `place` cannot be resolved it `console.warn`s and
  **`Avatar.enter` → `assertStartingLocation` (:943-955) throws**. ⛔ The
  lounge backstop the requirements describe does not exist at login
  today (see *Risks*).
- `C/eternal-university/src/duncan-hall/location/DormRoom.ts:48-67` —
  `extends FurnishableRoom` (Persistable); the key is supplied at
  runtime by the warren. `lint:locations` holds `FurnishableRoom` to an
  **enumerated roster**.

### Lint family

72 gates, derived (`pnpm -C packages/server lint:family --list`). The
ones this build will touch: `instanceable` (class/path under `/lib/`,
every `class:` resolves), `mixin-names` (flat namespace, kernel +
packs), `imports` (the mud boundary, pack tier), `module-scope`,
`field-meta`, `arg-kinds` (every object arg declares `requires:`),
`reachability` arm A (every view named by a static or `unreachable:`),
`verb-collisions`, `location-graph` (ratchets), `locations`, `untitled`,
`object-verbs` (zero census), `lib-statics`, `graph-walks` (the
firewall's import list), `test-bootstrap`, `drive-scripts` (zero),
`gates`, `authored-prose`, `closed-vocabularies`, `capabilities`.

---

## Plan-level decisions

**D1 — The frame is the kernel's, the medium tier is the water pack's,
the realm's sea is a row.** `Expanse` is an abstract Zone subclass in
`S/lib/expanse/Expanse.ts` — a *frame*, never instanced (the
`Holder`/`Actor` pattern: no kernel twin). Its instanceable tier is the
medium's: `/system/water/idea/WaterExpanse` in the water pack. The
realm's sea is a row under `/stuff/idea/WaterExpanse/<key>` (world-seed),
exactly where `/stuff/idea/Watercourse/<key>` sits and for the same
reason (the pack ships the mechanism, the realm edits its own water).
*Reasoning:* CLAUDE.md's test — substrate goes to the kernel when its
composers have no common pack ancestor; sea, desert, ice and void have
none, and the frame must subclass `SpatialZone`, which is kernel. The
water tier exists because of the column (D7), not for water-flavoured
prose.

**D2 — `SpatialZone` splits into the frame and `LocationZoneMixin`.**
`SpatialZone` keeps the region/frame fields and gains one protected
method, `stampZoneOf(stuff, zone)`, that is the **only** place
`setZone` is called — so `FromSpatialZone` (module
`/lib/zone/SpatialZone`) stays the one writer of a zone back-reference
and keeps its meaning. `S/lib/zone/LocationZone.ts` →
`LocationZoneMixin` (`_mixinName 'LocationZoneMixin'`, added to
`Mixins`) carries `locations`, `addLocation` (→ `this.stampZoneOf`),
`removeLocation`, `getLocations`, `contains`, `canDestruct`.
`CartesianZone = SingletonMixin(LocationZoneMixin(SpatialZone))`,
`SphericalZone` the same. `Location.ts:453` narrows with
`MixinApi.isLocationZone(zone)` before `removeLocation`. Behaviour of
every shipped zone is unchanged; `Expanse extends SpatialZone` composes
no Location half and inherits nothing to guard against.

**D3 — A geographic position is a value object plus one mixin.**
`S/lib/expanse/GeoPosition.ts` — immutable `{ latDeg, lonDeg, depthM }`
with `bearingTo`, `distanceNm`, `destination(bearingDeg, nm)` (plane
sailing on the local tangent plane, `cos(lat)` scaling — the plot IS
plane sailing, the frame is geographic, the conversion is arithmetic),
`from()` / `toJSON()`, and a `GeoPositionMarshaller` for fieldMeta.
`S/lib/expanse/Positioned.ts` → `PositionedMixin` (`Mixins.Positioned`)
with fieldMeta `expansePosition: {persistent, marshaller}` and
`expanse: {persistent, authorable}` (the expanse row path — an identity
ref), methods `getExpansePosition / setExpansePosition / getExpanse /
setExpanse`. It coexists with `CartesianCoordinatesMixin` by never
sharing a host: a node or a craft has a geographic position; a room has
a cell. `depthM` is always `0` in this build — the axis exists, nothing
writes a second value (AC 38).

**D4 — The Structure is a kernel `Idea`, not a Parcel, and membership
is by extent prefix.** `S/platform/idea/Structure.ts` =
`PersistableMixin(EngagedMixin(PositionedMixin(NamedMixin(SingletonMixin(Idea)))))`.
Fields: `extent` (a template-path prefix; every Location row under it
is a member — the parcel's own coverage shape, so a mansion carved into
sub-zones is one structure), `entrance` (a member room path — *the way
in*), `outsideDescription` (authored once — *the unit of description read
from outside*), `heightM` (what the horizon formula reads of a target),
`deckHeightM` and `mastheadHeightM` (what it reads of an observer
aboard; null for a building), `house` (the Business row whose roster
mans it; null for a building), and the voyage triple `course`,
`courseSetAtS`, `fixPosition` + the plot `reckonedFix`,
`reckonedFixAtS`, `reckonedFixNm`. `S/platform/idea/StructureCatalogue.ts`
is a lazy self-loading singleton (`/platform/idea/StructureCatalogue`,
the `WatercourseCatalogue` shape) answering `structureOf(path)` by
longest prefix and `all()`. *The structures-slate forks:* (1) **not a
Parcel** — a parcel is title and a record in a gated collection; a
Structure is content, a row anybody holding the ground can author; they
share the prefix shape and nothing else. (3) **no address effect** —
member rooms keep whatever `_address` they author; the Structure names
nothing. (4) **the content author writes it**; nothing derives one from
`storeys`. A building is a Structure whose `expansePosition` is null or
fixed; a ship is one whose position changes. **One field is the whole
difference**, and `course` on a Structure with no `house` and no helm
is simply never afforded (D11), so no guard re-narrows anything.

**D5 — A band is a leaf Idea with a closed extent vocabulary;
containment is the only question.** `S/platform/idea/Band.ts`
(`NamedMixin(SingletonMixin(Idea))`): `extent: BandExtent` where
`BandExtent = { kind: 'corridor', from: GeoPosition, to: GeoPosition,
widthNm } | { kind: 'belt', latMinDeg, latMaxDeg, lonMinDeg?, lonMaxDeg? }`
(vocabulary + validation array in `S/lib/expanse/BandExtent.ts`, the
value-object category; `contains(pos)`, `area()`, `crossings(a, b)` →
the parametric entry/exit `t` of a segment); `direction` (degrees, the
set/trend); `endpoints?: [nodePath, nodePath]` (optional — a planning
affordance only); `cost: { minutesPerNm?, wayFactor?, conditional? }`;
`lean: { directionDeg, strengthMps }` (⚠ **not** `ClimateLean`'s shape
— that is a per-type multiplier with no direction; the requirements'
"in the lean's own shape" cannot be taken literally, see *Risks*);
`setKn` (the current's speed along `direction`, 0 for a wind band);
`traffic` (0..1 weighting); `hazards: string[]` (row paths of classes
composing `HazardMixin`); `stock: Record<string, number>`; `reputation`
(prose — what people *say*); `season?` (a window the climate build will
own; stored, unread); `gearHardness` (0..1). **Composition at a
position** (`Expanse.fieldAt(pos)`): field values resolve to the band
with the **smallest `area()`** among those containing the position
(narrowest wins — the zone walk's innermost rule); placed things
(`hazards`, `stock`) **union**. Linear passages ride this: a corridor
band with endpoints and `confined: true` is what a `linear` node names
(D14).

**D6 — The voyage is a sustained engagement on the craft, one emission
per watch, with no state of its own.** `S/lib/expanse/Voyage.ts`
(`VOYAGE_TYPE = 'expanse-voyage'`): actor = the craft (Structure or
Boat — both compose `EngagedMixin`), slots `['body']`, `cancelable =
false`, `interruptibleBy` empty, `getHost()` = the craft, one
`ScheduledEmission` at `expanse.watchGameHours` (default 4 game h = 20
real min at 12×; an AppSettings dial, so the drive can shorten it).
The beat: (1) read `craft.positionNow()` (derived, below), (2) report
every band boundary the track crossed since the last beat, in order, to
every Sensor aboard — *the water tells you*; (3) arrival: if the course
names a node and the position is within `expanse.arrivalNm` of it, snap
to the node and `SchedulerApi.complete`; a bearing course never
completes; passing within sight of any node or landmark writes a free
fix; (4) sightings via `ExpanseApi.contactsFor` + the seeded traffic
field → a fuse opens for the lookout (D13); (5) neglect: if the watch is
unmanned, every `Durable` good aboard the deck wears by
`gearHardness × seaState × expanse.neglectWearPerWatch` (D23). **The
true position is derived**, never stored per beat:
`positionNow() = fixPosition + course × (now − courseSetAtS)` plus, for
each band the straight track lies inside during that interval, the
band's set × time-in-band (first-order: inside-ness is evaluated along
the undisplaced track; deterministic and re-derivable). So the three
persisted fields plus the clock reconstruct the voyage exactly, which is
what lets `Structure.onCreate` **re-establish** it:
`if (course !== null) SchedulerApi.start(new Voyage(this))`. The
scheduler's `host-destroyed` subscription ends it if the craft goes.
`anchor` is `SchedulerApi.cancel(voyage, 'anchored')` (a new
`AbortReasonRegistry` augmentation declared in `Voyage.ts`) and stamps
`fixPosition := positionNow(); course := null`. **`cancelable` is a
non-problem at the engine level** — `cancel` runs `cancelAll(giver)` and
the craft is nobody's giver — and is set `false` anyway so the envelope
says so.

**D7 — The deck's moving shore is a `Shore` subclass in the water pack,
and the fishery learns one more ref grammar.** `/system/water/thing/Gunwale
extends Shore`: `getReachRef()` returns `"<expanseKey>@<lat>,<lon>"`
for the outermost craft's position (via `ExpanseApi.positionOf(this)`),
`''` when the craft is at a node whose content has its own reach (then
the ordinary fallback applies); `readWater()` builds its memo from
`WaterExpanse.readAt(pos)` (biome, sea state, depth, stock — *grey
water, a long swell, nothing in sight*). `FisheryRegistry.standingAt`
parses the `@` grammar: the standing derives from the expanse's stock
field at that position (bands' `stock` union over the expanse row's
default), capacity and `drawn` keyed on a 0.1° cell so the same spot
depletes and re-entering gains nothing. **No change to the fishing pack**
(its controller passes the string through). Nothing is minted; nothing
persists but the fishery's own `drawn`.

**D8 — Deterministic crossings, seeded traffic, no draw.** Boundary
crossings are exact: `BandExtent.crossings(a, b)` returns the parametric
`t` at which the segment enters/leaves the extent, sorted. Traffic is a
seeded field: `trafficAt(expanseKey, pos, hourIndex)` = FNV of
`"<expanseKey>|<lat cell>|<lon cell>|<hour>"` compared against the
narrowest band's `traffic` weighting (the expanse row's default when no
band) → a contact `{ bearingDeg, rangeNm, kind }` or none; the same at
the same place and hour for every observer; unfarmable. The FNV is
**module-private in `ExpanseLogic`** (the house pattern — three private
copies already exist; no free exported helper). Nothing calls
`Math.random()`.

**D9 — A new subsystem Api, `ExpanseApi` / `ExpanseLogic`; the claim
store stays navigation's.** The expanse is a subsystem with its own doc
(`docs/subsystems/expanse.md`), not a feature of routing, and
`NavigationLogic`'s import list is the `lint:graph-walks` firewall —
growing it is the wrong risk. `S/api/expanse.ts` + `S/platform/idea/api/ExpanseLogic.ts`
(`extends ApiLogic`, methods gated `FromModule('/api/expanse#ExpanseApi')`):
`positionOf(stuff)` (the outward walk — containment, then a Location's
Structure; the **outermost** Positioned with a position wins),
`craftOf(stuff)` (the outermost Positioned), `expanseOf(stuff)`,
`contactsFor(observer, channel)` (every registered craft and fixed
Structure on the same expanse within the channel's range),
`sightRangeNm(hObsM, hTgtM)` = `1.17 (√h_obs_ft + √h_tgt_ft)`,
`trafficAt`, and the registry of craft currently on each expanse
(runtime, in the `Expanse` instance; a craft registers on `course` /
`launch` / boot re-establishment, deregisters on arrival / `recover`).
`positionOf(stuff)` is a containment resolver in `ZoneApi.elevationFor`'s
class — if `lint:object-verbs` counts it, the walk moves onto
`Containable` as `resolveExpansePosition()` and the Api forwards a path;
plan for the Api form first. **`NavigationApi` gains**: the two channels
(`MAP_CHANNELS` += `charted`, `told`; `RouteClaimChannel` mirrors), the
third kind `MapClaimKind = 'place' | 'edge' | 'band'`, an optional
`MapClaim.where?: string` (the charted extent **in words**, as the chart
states it) and `MapClaim.toldBy?: string` (who told you — the minimum
that lets a lie be traced), and `recordChart(viewerKey, locality,
claims)` = `recordPlace` (same growth rule; a wrong chart appends and is
never corrected). `MapController` gets one section, *charted*, rendering
`band` claims — the channels are the words, the kind is new.

**D10 — The first consumer is the Greywater off Terminus, and the craft
is the *Hesper*.** Content (Stage B3): the expanse row
`/stuff/idea/WaterExpanse/greywater` (world-seed); nodes under it:
`bar` (a **linear** passage along the `channel` corridor from the
estuary mouth), `the-pool` (a **place** — a sheltered cove you can see
across; destination = a swimmable `pool` Location in the estuary zone
with `media: [water]` exits to the far strand), `gannet-rock` (an areal
node with content: a landing room + a lighthouse `Structure`,
`heightM: 30`, fixed position), `open-sea` (an areal node with nothing);
bands: `channel` (corridor, confined, the bar — `depthM: 4`, `fetchKm:
120`, `bottom: sand`), `the-westerlies` (a current corridor between the
mouth and Gannet Rock, `setKn: 1.5`, `direction: 70`), `the-haar` (a
belt of fog across everything, `lean` light), `the-race` (a narrow
corridor laid over the haar with a hard lean — the narrow one wins).
The ship: `/world/terminus/hesper/` (a `CartesianZone` row, `biome:
open-water`, `visibleLandmarks: []` for the hold's sub-zone), `deck`
and `hold` (`SingletonCartesianLocation`; the deck's zone names the
open-water biome stub so it is sky-exposed; the hold's own sub-zone
authors `visibleLandmarks: []`), props on the deck: a `Helm` (D11), a
`Gunwale` (D7), `rigging` + `pump` (Durable goods for D23), a `Boat`
(D12); `/world/terminus/hesper/structure` (the Structure: `extent:
/world/terminus/hesper`, `entrance: …/deck`, `deckHeightM: 3`,
`mastheadHeightM: 20`, `house: …/hesper/idea/outfit`); the outfit (a
`Business` with a `lookout` position, `headcount: 1`). The landmark: a
Structure row for the terminal's clock tower (`extent:
/world/terminus/terminal`, `heightM: 25`, the outside description the
arrival gate already carries) named in `visibleLandmarks` on the
`university-avenue`, `wharfside` and `estuary` zones — three zones —
and overridden to `[]` on one interior zone (the hold, or the
counting-house's banking hall) for the "fourth place". The headland: a
`Vantage` prop at `estuary-mouth` citing `the-pool` and `greywater`
(the bay and the sea). The pilot: `/world/terminus/wharfside/agent/pilot`
(`/system/water/agent/Pilot`) at the bank with a dialogue tree whose
paid choice dispatches `pilot <player>`. Charts: two `Chart` rows at the
chandlery — one true, one that draws the Westerlies ten miles south —
consigned (shipped retail) or simply placed. Terminus's manifest gains
`boot:` entries for the `hesper/structure` row and the boat (a craft
under way must advance with nobody aboard). The terminus pack already
claims `/world/terminus`; world-seed's `/stuff` rows ride the platform's
claim (`lint:untitled` satisfied as the Watercourse rows are).

**D11 — Verbs live with the frame; the helm affords them.**
`course`, `anchor` (category `movement`) and `hail` (category `social`)
are **kernel** verbs (the frame is medium-agnostic; a desert caravan
sets a course too) at `C/platform/content/platform/cmd/{movement,social}/`
with controllers at `S/platform/idea/cmd/{movement,social}/`. They are
afforded by the **instrument of steering**, `S/platform/thing/Helm.ts`
(`Good`, `fixedInPlace`, `static commandContributions = { environment:
[course, anchor, hail] }`) — a fixture on the deck — and by the `Boat`
class (`environment`, the same three views; a kernel view named by a
pack class static is the ratified exception). A building has no helm,
so nothing re-narrows. `course` zero-arg reads the plot; `course
<bearing>` / `course <node keyword>` sets one (the node resolves
**against the expanse's own node list by keyword**, never through MQL —
the `TravelNode.resolveRouteByKeyword` precedent; a node the player's map
holds no claim for is still settable by bearing). The controller finds
the craft by `ExpanseApi.craftOf(giver)` and refuses in words when there
is none (*you are not aboard anything that sails*), when the craft is at
no expanse, or when a linear node's confinement forbids the bearing.
`hail <contact>` resolves its arg against `ExpanseApi.contactsFor(giver,
'signal')` by keyword; a real craft gets the hail delivered to every
Sensor aboard it; a seeded contact answers from its `kind` (*she dips
her colours and stands on*). `launch <boat>` and `recover <boat>` are
kernel movement verbs afforded by the `Boat` (`environment` on the deck)
and the `Helm` respectively — the minimum that makes AC 16 reachable
(drive 15); davits, the berth and the complement stay out.

**D12 — The boat is a transport-pack class that holds a position and
persists itself.** `/system/transport/thing/Boat =
PersistableMixin(EngagedMixin(PositionedMixin(MobileMixin(ExitableVessel))))`
+ `SingletonMixin` (one row is one boat, the `Cast` rule), fields
`eyeHeightM`, `heightM`, `speedKn`. `launch` = `ContainmentApi.move(boat,
null)` (the legal final-detach edge), `boat.setExpansePosition(craft's
position)`, register with the expanse; the boat is now the outermost
craft for its occupants and `positionOf` answers with **its** position
(AC 16). `recover` moves it back into the deck room when within
`expanse.recoverNm`. Persistence: a boat on a deck is captured by nobody
(the deck room is not persistable — see *Risks*), so the boat row
declares `container: …/hesper/deck` as its landing and composes
`PersistableMixin` for the adrift case: `capture()` at launch, each
beat and `recover`; `onCreate` after materialize: if
`expansePosition !== null` → detach and re-register, else land on the
deck. It is `boot:`-listed in the terminus manifest beside the ship. Its
`getBiome()` is overridden to answer the expanse's biome when its
container is null (so an adrift boat does not read the `universe`
biome — the chain's own last fallback); this edits no chain code.

**D13 — The lookout is a seat, read off the roster; manning is deck
occupancy.** `Structure.sightHeightFor(observer)`: `mastheadHeightM`
when `observer` holds the Structure's `house`'s `lookout` position **on
shift** (`observer.getEmployment(housePath)?.status === 'on-shift'`
with `position.key === 'lookout'`), else `deckHeightM`; a boat answers
`eyeHeightM`. A watch is **manned** when some occupant of the entrance
room is an alive, conscious organism; the lookout seat does not change
manning — it changes range. `appoint <person> lookout` is the shipped
verb over the shipped roster (the house must hold the authority — the
ship's outfit lists the owner as its appointing authority). A contact
first seen at the lookout's range opens a fuse: the beat narrates it
*hull-down* to the lookout and the helm; unmanned, the same seeded
contact is narrated only when within the deck's own range — *it arrives
AT you*. The fuse length is grain.

**D14 — The three authored facts on a node, and what each does.**
`S/platform/idea/ExpanseNode.ts` (`PositionedMixin(NamedMixin(SingletonMixin(Idea)))`):
`kind: 'place' | 'passage'`; `passage: 'linear' | 'areal'` (required
when `kind === 'passage'`); `destination?: string` (a Location path —
the content behind it; **most nodes have none**); `along?: string` (a
confined corridor band — required when `passage === 'linear'`);
`vantage?: string[]` (what can be seen from here, for a node with
content); `surfaceLevelM` is the **water tier's** (`WaterNode`). A
`place` node's content is a Location you are **in**; crossing it is
`go`. A `linear` node's `course` accepts only the band's other endpoint
and reports the position as a fraction along the band. An `areal` node
is a point you reach by bearing. Nothing about a node is a room, so
nothing is ever inside the frame.

**D15 — The chart is a `Marked` thing whose `read` writes claims.**
`S/platform/thing/Chart.ts = MarkedMixin(Good)` with fieldMeta `of` (the
expanse row path) and `entries: ChartEntry[]` — authored `{ node | band,
path, name, where }` **as the chart states them**, so a wrong chart is
authored wrong in one row and never reconciled. ⭐ **The read effect
follows the shipped seam, not `instanceof`.** `ReadController` already
fires a scroll's working after the decode by narrowing
`MixinApi.isArcane(target)` (`ReadController.ts:163`); the chart takes the
same shape — `S/lib/expanse/Charted.ts` → `ChartedMixin` (`Mixins.Charted`,
`MixinApi.isCharted`) owning `of`, `entries` and `writeClaimsFor(reader)`,
narrowed at the same point. ⛔ No `instanceof` in a controller (the
branch-predicate rule: a method never `instanceof`s). `Chart =
ChartedMixin(MarkedMixin(Good))`. `writeClaimsFor` writes `charted` claims
under the expanse's `address` through `NavigationApi.recordChart` keyed by
`reader.mapOwnerKey()`. `map <sea>` renders them marked *charted*. A
pilot's book or sailing directions would compose the same mixin.

**D16 — `depth` is the water pack's reading; `latitude` and
`navigation` are the platform's.** `/system/water/idea/reading/DepthReading`
(`measure depth` with a tool declaring `instrument: sounding`,
`instrumentNoun: a lead line`; `scope: [here]`; `discipline:
navigation`; `truth()` = `WaterExpanse.depthAt(pos)` — the narrowest
band's `depthM`, else the row's default; at `competent`+ the bottom
character the band authors; `eyeCeiling: untrained` — you cannot see the
bottom). `/platform/idea/reading/LatitudeReading` (`measure latitude`
with `instrument: sextant`, `instrumentNoun: a sextant`; `truth()` =
`positionOf(actor).latDeg`; **refused** when `skyReadFor(scope).currentType`
is not `clear` — *the sky's own terms* — or when the sun is below the
horizon; the bracket by band, never a refusal by band; `improves:
"how far north you are, and nothing about how far along"`). The
`navigation` Discipline row ships in the platform pack exactly as the
requirements print it (`iscedf: "1041"  # ISCED-F 2013: transport
services`, `requires: []`, no `conferrals`, no `synergizes`). Earning
it: `measure latitude`, `measure depth` and arrival-where-you-said
credit `navigation` through the shipped act-signature seam.

**D17 — The pilot is a water-pack agent and the `told` writer is a verb
the pilot runs.** `/system/water/agent/Pilot extends Cast` with
`knows: string[]` (node and band row paths) and `fee`; the water pack's
verb `pilot <person>` (category `social`, afforded on `self` by `Pilot`)
writes `told` claims (`toldBy: pilot.getIdentityPath()`) for everything
the pilot `knows`, charging `fee` from the player's wallet to the
pilot's house through `BankingApi`. The pilot's dialogue tree offers
*"Ask about the water (N credits)"* whose effect is the shipped
`dispatch: "pilot <player>"` (`docs/subsystems/npc-dialogue.md:101`). A
pilot may `know` a band drawn wrong — the row says so, the claim is
wrong, and it stays wrong. ⚠ The requirements name no act for hiring;
this is the engineering answer and is listed under *Risks* for the
user's eye.

**D18 — `route` and `journey` refuse honestly.** `RouteController`:
when the destination keyword resolves to no map claim but matches an
expanse node's keyword (a lookup over the viewer's **own claims** of
kind `place` whose `label` is an `ExpanseNode` row, or over the
expanse the viewer's craft is on), refuse with *there is no road to
<name>; `course` is the verb that knows*. `JourneyController` (transport)
the same when `LaneCatalogue` resolves no place and the keyword names
an expanse node.

**D19 — The way aboard and ashore are two kernel exit kinds.**
`/platform/idea/exits/aboard` (`S/platform/idea/exits/AboardExit.ts
extends DeferredDestinationExit`): placed on a node's landing room,
`computeDestination` → the `entrance` of a craft registered **at this
node**; none → refuses *nothing is alongside*; several → prompts. The
berth (owned, rented, fought over) stays out. `/platform/idea/exits/ashore`
(`AshoreExit`): placed on the entrance room, resolves to the current
node's `destination`; between nodes it refuses *there is nothing to
step onto*. Both are `DeferredDestinationExit`s because the far side
changes, and both are **unmapped** — the Cartographer's `recordPerceived`
already writes `to: null` with a label for a non-resident far side, and
`AboardExit.getDestinationTemplatePath()` returns the kind row so the
map says *a way aboard* and never names a ship that has sailed.

**D20 — The water biome is a stub this build takes and the climate
build replaces.** `/stuff/idea/biome/outdoor/open-water` (world-seed),
`extends: /stuff/idea/biome/outdoor/baseline`, sky-exposed, with a
comment naming the climate build as its owner. The *Hesper*'s zone and
the expanse row cite it. No biome-chain code changes.

**D21 — Sea state is one derived function in the water tier.**
`WaterExpanse.seaStateAt(pos, scope)`: wind direction from the
narrowest band's `lean.directionDeg` (none → the expanse row's
`prevailingDeg`), wind strength from
`WeatherApi.deviatedFieldFor(scope, null, 'wind', now)` + the band's
`lean.strengthMps`, fetch from the narrowest band's `fetchKm` (none →
the row's default), depth from `depthAt`. Significant height ≈
`0.0016 · √fetch_m · U²/g` (the SMB fetch-limited form) **steepened**
where `depthM < h·8` (short steep seas over a shoal — the bar pilot's
danger falls out). Rendered in words by band (`calm · slight · moderate
· rough · very rough`), never a number; no row anywhere authors it. The
same function feeds D23's wear and the boundary report.

**D22 — Co-presence is per channel, on the same expanse only.**
`SightingChannel = 'visual' | 'signal'` (vocabulary + validation array,
`S/lib/expanse/SightingChannel.ts`): `visual` range =
`sightRangeNm(h_obs, h_tgt)`; `signal` range = `expanse.signalRangeNm`
(default 12) regardless of height — the hail at twelve miles is flags, a
light or a gun. `contactsFor` compares only craft registered on the same
expanse (the graph is the broad-phase filter). A third channel is one
more word.

**D23 — Neglect is wear on the gear, not a number on the voyage.** An
unmanned watch calls `wear(amount)` on every `Durable` good in the
craft's entrance room (and the boat's contents) with `amount =
gearHardness × seaStateIndex × expanse.neglectWearPerWatch`; a manned
watch wears at a quarter of that. Nothing new persists: the gear
remembers, which is the honest reading of *"the pumps were not manned,
so water rose at a rate the world already knew"* without a vessel
model, and it keeps AC 24 literally true. What a broken pump costs the
hull is the vessel build's.

**D24 — The landmark and the vantage are the room-contribution hook's
three consumers.** `SpatialZone.fieldMeta` gains `visibleLandmarks:
{persistent, authorable}` (declared, or the gate fails and the hydrator
drops it); `LookController.lookAtLocation` appends, after the body: (a)
for each Structure path in `zone.lookupField('visibleLandmarks')`
(an authored `[]` stops the walk), its `outsideDescription`; (b) for each
content item that **composes `RoomContributorMixin`** —
`S/lib/description/RoomContributor.ts` (`Mixins.RoomContributor`,
`MixinApi.isRoomContributor`, one `@hook contributeToRoom(viewer):
string | null`, default `null`) — its line. ⛔ **Not a `typeof
x.contributeToRoom === 'function'` probe** (CLAUDE.md: narrow with
`MixinApi.isX`, never by method-sniffing). It is a kernel mixin because
`LookController` is kernel and `Shore` is a pack class, so the hook must
be declared where both can see it; three implementers — `Shore` (the
water read, which fishing.md flagged), `Vantage`, and `Gunwale` by
inheritance — so it clears *a hook needs more than one implementer*. `S/platform/thing/Vantage.ts` (`Good`, `fixedInPlace`,
`overlooks: string[]` of node/expanse/structure paths) contributes what
it overlooks (the expanse's read at the cited node + landmarks + craft in
visual range from its room's height — `zone elevation + eye`), and
registers as an observer the beat can narrate to. **Every land claim is
authored** (AC 37); only at sea does the engine compute a range.

**D25 — The drive's clock.** A watch is twenty real minutes; the wire
drive sets `expanse.watchGameHours` low through the shipped `config`
verb before `course` (the dial is read at `Voyage` construction) and
backdates `courseSetAtS` with a wizard `eval` on the Structure for the
"logged off, the craft moved" step — the fishing drive's precedent
(*game-day skips are wizard `eval`s on the OBJECT that carries the
clock*). Nothing moves the world clock.

**D26 — The login fallback rides this MR.** *(User decision, 2026-10-10.)*
`restorePlacement` (`S/platform/idea/api/PersistableLogic.ts`): when
`resolvePlacementAnchor` returns `null`, land the host on the app
setting `defaultStartLocation` (through `ContainmentApi.resolveLanding`,
the same path `startLocation` takes) instead of leaving it where the
clone placed it — so `Avatar.enter` never throws on a place somebody
broke or a ship that no longer exists. One branch; the `console.warn`
stays and names what could not be resolved and where the host went.
⚠ A general lifecycle fix that ships are the first content to need; the
requirements' surface decision is corrected to say this build **adds**
the backstop rather than inheriting it. Test: `PersistableLogic` with a
captured `place` whose container path does not resolve → the host lands
in the default start location.

**D27 — `swim` is this build's to discharge, and the first draft of this
plan omitted it.** `C/platform/content/platform/cmd/movement/swim.yaml`
carries `unreachable: awaiting:navigable-water-slate` and **nothing
composes `SwimmableMixin`** (`S/lib/locomotion/Swimmable.ts`) — the
reachability sweep held the verb for exactly this build. Requirements
drive steps 2 (*wade in*) and 3 (*cross a water you can see across*)
depend on it and would otherwise die as `unknown-verb`. The Ladder shape,
verbatim (`S/platform/thing/Ladder.ts`): `S/platform/thing/StillWater.ts`
= `SwimmableMixin(Good)`, `fixedInPlace`, `static commandContributions =
{ environment: SWIM, peers: SWIM }` — the water you can see across is the
**instrument** of swimming as a ladder is of climbing, and it satisfies
`LocomotionApi.checkEnablementScope` (a host composing the mode's
enablement mixin in the actor's container or its contents). Placed as a
prop in the Pool and the strand; the `media: [water]` exits between them
are what `swim` traverses. The `unreachable:` line is **deleted**
(`lint:reachability` arm A then requires the static, which exists).
⚠ **Wading** is `swim` admitted or refused by the enablement check with
the reason stated — no new verb. ⛔ `Swimmable` goes on **neither `Shore`
nor `Gunwale`**: that would make every riverbank and every deck
swimmable, and the reachability sweep recorded that the water host must
not claim the salt-works' water or the fishery's reach.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `LocationZoneMixin` | `CartesianZone`, `SphericalZone` | these two zones hold rooms; `Expanse` and every future frame do not. `SpatialZone` loses nothing a frame needs. |
| `visibleLandmarks` (field) | `SpatialZone` | any region in space may name what is visible from it; a `FolderZone` cannot (`/wiki` sees no tower). Correct by the same argument as `stocks`. |
| `stampZoneOf` (protected) | `SpatialZone` | only a frame writes a zone back-reference. |
| `Expanse` (abstract) | `lib/expanse/`, extends `SpatialZone` | an expanse is a frame with region fields and no rooms. Never instanced. |
| `WaterExpanse`, `WaterNode`, `WaterBand` | water pack `/system/water/idea/` | the column (surface level, depth, bottom) and sea state are water's; a desert expanse would compose the kernel classes directly. |
| `GeoPosition` | value object, `lib/expanse/` | nothing — a value. |
| `PositionedMixin` | `ExpanseNode`, `Structure`, `Boat` | three composers, no common pack ancestor → kernel. A node's position is authored and still; a Structure's and a Boat's may change. ⚠ **Not** on `ExitableVessel` (a wardrobe would claim it) and **not** on `Mobile` (a swimmer would). The third launched-craft class is the signal to revisit. |
| `EngagedMixin` on `Structure` | `Structure` | a building may hold an engagement. Honest: a mill grinds, a lighthouse keeps a light — and only a craft with a helm is ever afforded `course`, so nothing re-narrows. |
| `PersistableMixin` on `Structure` | `Structure` (singleton) | a Structure's facts outlive the process — the position, the course, the plot. Scope-derived key; `pinsResidency()` true while under way; `canEvict` false while under way. |
| `Structure` fields `course`, `courseSetAtS`, `fixPosition`, plot | `Structure` and `Boat` (via a shared `lib/expanse/Plot.ts` value object + the three fields declared on each) | a craft's voyage state is the craft's. ⚠ Not on `Voyage` (dies at restart) and not on a person (logging out must not end it). |
| `Voyage` | plain engagement class, `lib/expanse/` | nothing — plain object. Its actor is a `Stuff & Engaged & Positioned`. |
| `Helm` | `platform/thing/` (`Good`, fixed) | the instrument that affords `course`/`anchor`/`hail`/`recover`. A deck without one cannot be steered — which is the building. |
| `Vantage` | `platform/thing/` (`Good`, fixed) | a room-fixed feature citing what it overlooks; the land participates only by authored claim. |
| `ChartedMixin` | `Chart` (and later a pilot's book) | a readable thing that writes claims when read; narrowed at the scroll's seam, never by `instanceof`. |
| `Chart` | `platform/thing/` (`ChartedMixin(MarkedMixin(Good))`) | a readable thing that writes `charted` claims. |
| `RoomContributorMixin` | `Shore` (→ `Gunwale`), `Vantage` | a thing in a room may add a line to the room's prose. Kernel, because the reader (`LookController`) is kernel and one composer is a pack class. |
| `StillWater` | `platform/thing/` (`SwimmableMixin(Good)`, fixed) | the instrument of swimming. Composed nowhere near a `Shore` or a deck. |
| `Boat` | transport pack `/system/transport/thing/` | the transport pack owns vehicle shapes; a boat is the fourth. `Persistable + Engaged + Positioned + Mobile + ExitableVessel`, singleton. |
| `Gunwale extends Shore` | water pack `/system/water/thing/` | a shore that moves with its deck; `fish` reaches it through the declared `class.Shore` default with no fishing-pack change. |
| `Pilot extends Cast` | water pack `/system/water/agent/` | a person whose knowledge is claims. A pack agent class, as `trade-fishing/src/agent` already is. |
| `AboardExit`, `AshoreExit` | `platform/idea/exits/` (`DeferredDestinationExit`) | the far side changes; unmapped by construction. |
| `DepthReading` | water pack `/system/water/idea/reading/` | a sounding is water's. |
| `LatitudeReading` | `platform/idea/reading/` | a sight is anybody's; the row is the platform's. |
| `navigation` Discipline row | platform pack | the kernel's reading teaches it. |
| `charted`, `told`, `band`, `where?`, `toldBy?` | `MapClaim.ts` + `RoutePlan.ts` mirror | the map's vocabulary grows by two words and one kind, each with a writer in the same change. |
| `open-water` biome stub | world-seed row | the climate build's to replace. |

The narrowing test, applied: no guard in this plan re-narrows a host.
`course` is not refused on a Structure by `if (isShip)`; it is never
offered where there is no helm. `Positioned` is not refused on a
wardrobe; it is not composed there.

---

## Convention conformance

Checked at plan time against the tree, not recalled:

- **`props:` / `cast:`** — the deck's fixtures (`Helm`, `Gunwale`,
  `rigging`, `pump`, the `Boat`) are `props:`; the pilot is `cast:` on the
  bank. `populates:` appears nowhere.
- **Locations, not rooms** — the ship's spaces are
  `SingletonCartesianLocation`s in their own `CartesianZone`; no
  `FurnishableRoom` (roster-gated by `lint:locations`, and nothing here
  is furnished).
- **`<root>/<branch>/`** — kernel classes under `platform/{idea,thing}/`
  and `lib/expanse/`; water pack under `/system/water/{idea,thing,agent}/`
  → `C/water/src/{idea,thing,agent}/`; transport under
  `/system/transport/thing/`; controllers at `<root>/idea/cmd/<category>/`,
  views at `<root>/cmd/<category>/`; rows: the sea at
  `/stuff/idea/WaterExpanse/…`, the ship at `/world/terminus/hesper/…`.
- **The `/system/` test** — the sea is true with nobody sailing it; the
  water pack is `/system/water`. The frame is the kernel's.
- **Module scope declares** — every catalogue is lazy and self-loading;
  the only module-scope tails are `SecurityApi.decorateApiClass(ExpanseApi)`
  and the `AbortReasonRegistry` declaration merge.
- **Import boundary** — pack files import `@saxonberg/server/mud/…` by
  specifier only; the water pack imports nothing from transport and vice
  versa. `KnowledgeGraph` / `RoutePlan` / `Traversal` / `TravelProfile`
  import nothing new (`lint:graph-walks`).
- **No new module category, no free helper, no new eslint exception** —
  the FNV is module-private in `ExpanseLogic`; `BandExtent` and
  `SightingChannel` are value-object modules (a class/vocabulary + its
  validation array), `GeoPosition` a value class.
- **Verbs on objects** — `craft.positionNow()`, `craft.plot()`,
  `craft.setCourse()`, `expanse.fieldAt(pos)`, `band.contains(pos)`,
  `structure.sightHeightFor(observer)`; the Api resolves chains and
  registries only.
- **`Mixins` registry** — `LocationZone`, `Positioned` added
  (`lint:mixin-names`); pack mixins none.
- **`requires:` on every object arg** (`lint:arg-kinds`): `launch` /
  `recover` → `requires: PositionedMixin`; `read` unchanged
  (`[VisibleMixin, MarkedMixin]`); `hail` and `course` take **strings**
  resolved node-locally (a contact and a node are not in the room).
- **Affordance is a class static** (`lint:reachability` arm A): every
  new view is named by `Helm.commandContributions`, `Boat`'s, or
  `Pilot`'s. No row's `commandContributions:`.
- **A Map field is never bare-persistent** — `stock` on a band is a
  plain `Record`, authored; the craft registry is runtime-only.
- **No new Mongo collection; no migration** — positions ride
  `holder_snapshots`; claims ride map documents; fishery `drawn` rides
  the water pack's existing records. A rename is a dropped dev DB.
- **Gates this build must pass**: the whole derived family
  (`pnpm -C packages/server lint:family`), with particular attention to
  `instanceable`, `mixin-names`, `imports`, `module-scope`,
  `field-meta`, `arg-kinds`, `reachability`, `verb-collisions`,
  `location-graph`, `locations`, `untitled`, `object-verbs`,
  `lib-statics`, `graph-walks`, `test-bootstrap`, `drive-scripts`,
  `closed-vocabularies`, `authored-prose`.

---

## Waves

Every wave lands independently, with `pnpm test:near`, each touched
pack's vitest and `lint:family` green, and ends at the named commit.
Stage A is kernel; Stage B is packs, content and the drive.

### Stage A — kernel substrate

**A0 — the frame split and the geographic position.** *Implements D2,
D3.*
Files: `S/lib/zone/SpatialZone.ts` (remove the Location half; add
`stampZoneOf`; add `visibleLandmarks` to fieldMeta + accessors),
`S/lib/zone/LocationZone.ts` (new), `S/platform/idea/location/{Cartesian,Spherical}Zone.ts`
(compose the mixin), `S/lib/stuff/Location.ts:453` (narrow),
`S/lib/mixin.ts` (`LocationZone`, `Positioned`), `S/api/mixin.ts`
(`isLocationZone`, `isPositioned`), `S/lib/expanse/GeoPosition.ts`,
`S/lib/expanse/Positioned.ts`, tests beside each
(`Zone.test.ts` and the two zone tests keep passing unchanged;
`SpatialZone.authoredFields.test.ts` sees the new field declared;
`GeoPosition.test.ts` pins `destination`/`bearingTo`/`distanceNm` round
trips and the `cos(lat)` scaling).
Acceptance: every shipped zone test green; `lint:family` green;
`FromSpatialZone` still refuses a `setZone` from any other module (a
test calls it from a test module and expects `SecurityError`).
Commit: `build(maritime A0): SpatialZone splits into the frame and LocationZoneMixin; GeoPosition + Positioned`.

**A1 — the Structure, the landmark, the vantage, the room hook.**
*Implements D4, D24.*
Files: `S/platform/idea/Structure.ts`, `S/platform/idea/StructureCatalogue.ts`
(+ its platform row `C/platform/content/platform/idea/StructureCatalogue.yaml`),
`S/platform/thing/Vantage.ts`, `S/lib/description/RoomContributor.ts`
(+ `Mixins.RoomContributor`, `MixinApi.isRoomContributor`),
`S/platform/idea/cmd/perception/LookController.ts`
(the contribution step after the body: landmarks from the zone walk,
then each `RoomContributor` in contents), `S/lib/paths.ts`
(`structureCatalogue`), tests (`Structure.test.ts`: extent membership by
longest prefix, a building with null position, persistence capture of
the position; `LookController` test: a room in a zone naming a landmark
prints its outside description once; a zone authoring `[]` prints
nothing; a `Vantage` line appears).
Acceptance: AC 33, 35 (the fixed half), 36, 37 provable in unit tests.
Commit: `build(maritime A1): the Structure (position as a field), the landmark walk and the vantage`.

**A2 — the expanse, nodes, bands, and the Api.** *Implements D1
(kernel half), D5, D8, D9 (ExpanseApi), D14, D22.*
Files: `S/lib/expanse/Expanse.ts` (abstract frame: compiles its node and
band rows lazily from `Template.findDescendants(this path)`; `nodes()`,
`bands()`, `fieldAt(pos)`, `nodeNear(pos, nm)`, `nodeByKeyword`, the
runtime craft registry `register/deregister/craft()`; fieldMeta
`address` is inherited, plus `prevailingDeg`, `trafficDefault`,
`biome`), `S/lib/expanse/BandExtent.ts`, `S/lib/expanse/SightingChannel.ts`,
`S/platform/idea/ExpanseNode.ts`, `S/platform/idea/Band.ts`,
`S/api/expanse.ts`, `S/platform/idea/api/ExpanseLogic.ts`, `S/lib/paths.ts`,
tests (`BandExtent.test.ts`: corridor/belt containment, `crossings` on a
segment entering and leaving, `area` ordering so a narrow corridor over
a belt wins; `Expanse.test.ts` over synthetic rows: `fieldAt` narrowest,
`hazards`/`stock` union, a belt with no endpoints behaves as a corridor;
`ExpanseLogic.test.ts`: `positionOf` outward walk — a thing in a room of
a Structure, a boat on a deck, a detached boat; `sightRangeNm(100ft,
100ft) ≈ 23`; `trafficAt` same inputs same answer).
Acceptance: AC 1, 3, 4, 5 (the geometry), 17, 18, 28 (the model), 32
(no projection of Idea rows — a test asserts `NavigationApi.node(nodePath)`
is null after `rebuildGraph`).
Commit: `build(maritime A2): the Expanse frame, nodes and bands with a closed extent vocabulary, ExpanseApi`.

**A3 — the voyage, the plot, the helm, the three verbs, the exits.**
*Implements D6, D11 (kernel verbs), D13 (the Structure half), D19,
D23, D25's dial.*
Files: `S/lib/expanse/Plot.ts` (reckoned fix + growth → the stated
bracket by band), `S/lib/expanse/Voyage.ts`, `Structure.ts` (the voyage
triple, `positionNow()`, `plot()`, `setCourse`, `anchor`, `onCreate`
re-establishment, `sightHeightFor`, `isManned`, `canEvict`,
`pinsResidency`), `S/platform/thing/Helm.ts`,
`S/platform/idea/cmd/movement/{Course,Anchor,Launch,Recover}Controller.ts`,
`S/platform/idea/cmd/social/HailController.ts`, views at
`C/platform/content/platform/cmd/movement/{course,anchor,launch,recover}.yaml`
and `social/hail.yaml`, `S/platform/idea/cmd/perception/LocateController.ts`
(when `positionOf(target)` answers, print the reckoning labelled as a
reckoning and **never** the true position), `S/platform/idea/cmd/movement/RouteController.ts`
(D18), `S/platform/idea/exits/{Aboard,Ashore}Exit.ts` + rows
`C/platform/content/platform/idea/exits/{aboard,ashore}.yaml`,
`S/platform/thing/StillWater.ts` (D27) + delete `unreachable:` from
`C/platform/content/platform/cmd/movement/swim.yaml`,
`S/platform/idea/api/PersistableLogic.ts` (D26, the login fallback),
`S/lib/config/AppSettings.ts` + `C/platform/content/settings/expanse.yaml`
(`expanse.watchGameHours 4`, `expanse.arrivalNm 1`, `expanse.recoverNm
1`, `expanse.signalRangeNm 12`, `expanse.neglectWearPerWatch 0.02`,
`expanse.reckoningGrowthNmPerHour 0.5`), tests (`Voyage.test.ts` with a
synthetic Structure over a synthetic expanse and a fake clock: the
position after two watches equals `fix + course×t + set×t_in_band`; a
boundary crossing is reported once and in order; `course <node>`
completes at arrival and a bearing course never does; `anchor` cancels
with `anchored`; constructing a Structure from a snapshot with a course
re-starts the engagement; an unmanned beat wears a Durable aboard by the
formula and a manned beat by a quarter; `locate` prints *reckoned* and
not the true coordinates — assert the true string is absent).
Acceptance: AC 9, 10, 22, 23, 24, 25, 26 (engine half), 27, 29 (the
height read), the honesty of `locate`; `swim` reachable past the binder
where a `StillWater` stands and refused in words where none does; a
login whose captured place does not resolve lands in the default start
location.
Commit: `build(maritime A3): the Voyage on the craft, the plot, course/anchor/hail, the aboard/ashore exits`.

**A4 — the claim store, the chart, the readings, the Discipline.**
*Implements D9 (NavigationApi half), D15, D16.*
Files: `S/lib/location/MapClaim.ts` (+`charted`, `told`; `'band'`;
`where?`, `toldBy?`; rewrite the docstring's cut paragraph to record
the return with writers), `S/lib/location/RoutePlan.ts` (mirror),
`S/platform/idea/api/NavigationLogic.ts` (`recordChart`; the dedupe
key already includes `channel`), `S/api/navigation.ts`,
`S/platform/idea/cmd/perception/MapController.ts` (the *charted*
section; `band` claims render name + `where`), `S/lib/expanse/Charted.ts`
(+ `Mixins.Charted`, `MixinApi.isCharted`), `S/platform/thing/Chart.ts`,
`S/platform/idea/cmd/perception/ReadController.ts` (after decode, beside
the `isArcane` working: `if (MixinApi.isCharted(target))
target.writeClaimsFor(giver)`), `S/platform/idea/reading/LatitudeReading.ts` +
`C/platform/content/platform/idea/reading/latitude.yaml`,
`C/platform/content/platform/idea/Discipline/navigation.yaml`, a sextant
tool row `C/generic-objects/content/stuff/thing/gear/sextant.yaml`
(`instrument: sextant`), tests (`MapClaim` vocabulary; `NavigationLogic`
map test: a chart read twice bumps `lastSeen`, a differing chart appends
and both render; `LatitudeReading.test.ts`: truth = the position's
latitude; overcast → refused in the sky's words; two readers at two
bands get the same centre and different brackets; `RouteController`
refuses an expanse node naming `course`).
Acceptance: AC 11 (the celestial fix + its denial), 12, 19, 20 (the
bracket), 31.
Commit: `build(maritime A4): charted and told with writers, the Chart, measure latitude, the navigation Discipline`.

### Stage B — the water tier, the craft, the content, the drive

**B1 — the water tier.** *Implements D1 (pack half), D7, D16 (depth),
D17, D20, D21.*
Files: `C/water/src/idea/{WaterExpanse,WaterNode,WaterBand}.ts`,
`C/water/src/thing/Gunwale.ts`, `C/water/src/idea/FisheryRegistry.ts`
(the `@` grammar, cell-keyed `drawn`), `C/water/src/idea/reading/DepthReading.ts`
+ `C/water/content/system/water/idea/reading/depth.yaml`, a lead-line
tool row (`instrument: sounding`), `C/water/src/agent/Pilot.ts`,
`C/water/src/idea/cmd/social/PilotController.ts` +
`C/water/content/system/water/cmd/social/pilot.yaml`, `C/world-seed/content/stuff/idea/biome/outdoor/open-water.yaml`,
`C/water/content/settings/water.yaml` (depth default, sea-state words),
tests under `C/water/src/__tests__/` (`seaStateAt`: a long fetch over a
shoal is rougher than the same wind over deep water; the narrow band's
lean wins over the belt's; `Gunwale.getReachRef()` grammar;
`FisheryRegistry.standingAt('greywater@…')` derives from the band stock
and depletes per cell; `DepthReading` truth from the narrowest band;
`Pilot` writes `told` claims with `toldBy`).
Acceptance: AC 7, 13, 14, 21, 8 (the shore is shipped; the gunwale is
its moving twin).
Commit: `build(maritime B1): WaterExpanse — the column, derived sea state, the gunwale, measure depth, the pilot`.

**B2 — the boat.** *Implements D12, D18 (journey).*
Files: `C/transport/src/thing/Boat.ts`, `C/transport/src/idea/cmd/movement/JourneyController.ts`
(the refusal), a boat row `C/transport/content/system/transport/thing/dinghy.yaml`,
tests (`Boat.test.ts`: launch detaches and holds a position; `positionOf`
of an occupant answers the boat's; `recover` within range re-lands it;
a materialized adrift boat detaches itself in `onCreate`; `getBiome()`
answers the expanse's when adrift).
Acceptance: AC 16.
Commit: `build(maritime B2): the Boat — a position of its own, launched and recovered`.

**B3 — the first consumer.** *Implements D10.*
Files: `C/world-seed/content/stuff/idea/WaterExpanse/greywater.yaml` +
`greywater/{bar,the-pool,gannet-rock,open-sea,channel,the-westerlies,the-haar,the-race}.yaml`;
`C/terminus/content/world/terminus/hesper.yaml` + `hesper/{deck,hold,structure}.yaml`
+ `hesper/thing/{helm,gunwale,rigging,pump}.yaml` + `hesper/idea/outfit.yaml`;
`C/terminus/content/world/terminus/terminal/structure.yaml` (the clock
tower); `university-avenue.yaml`, `wharfside.yaml`, `estuary.yaml`
(`visibleLandmarks: [/world/terminus/terminal/structure]`); the
counting-house's hall zone (`visibleLandmarks: []`);
`estuary/{pool,strand,headland}.yaml` + `estuary/thing/{vantage,aboard}` +
a `StillWater` prop in the pool and the strand (D27) +
the `ashore` exit on the deck; `estuary-mouth.yaml` (an exit to the
headland and the `aboard` exit kind); `gannet-rock/{landing,structure}.yaml`
(the lighthouse, `heightM: 30`); `wharfside/agent/pilot.yaml` +
`wharfside/bank.yaml` (`cast:`); `wharfside/chandlery/thing/{chart-greywater,chart-greywater-old}.yaml`;
`C/terminus/pack.yaml` (`boot:` for `hesper/structure` and the dinghy;
the terminus group's titles already cover `/world/terminus`).
Acceptance: `pnpm -C packages/server lint:family` green (`location-graph`
ratchets unchanged — the `aboard`/`ashore` edges carry a kind row as
destination and are excluded as the vessel exits are; verify against
`destination-is-a-kind 2` and raise nothing), a cold boot installs every
row (the `pack` boot line shows no `FAILED`), `look` on the avenue
prints the tower sentence.
Commit: `build(maritime B3): the Greywater, the Hesper, the clock tower as a landmark, the headland, the pilot and two charts`.

**B4 — the drive.** `packages/wire/tests/maritime-space.dirty.wire.test.ts`
(dirty: it issues coin, appoints a lookout, reads charts, depletes a
cell, wears gear — none regenerated). Every one of the requirements'
26 steps is a checkpoint that **owns its position** and **can fail**:
assert the verb was understood (no `command-rejected` /
`validator-failed`) **and** a state change (the engagement note, the
position moved, the claim count grew, the bracket shrank). Clock
technique per D25. Run with `WIRE_BOOT=1 WIRE_PORT=2014` (build-1's
port), record the output, count and every failure in *Drive record*,
fix, re-run, **and re-run after every later review fix**. Then
`pnpm test` (the one pre-MR run), `pnpm wire`, push, open the MR.
Commit: `drive(maritime): <what driving found>`.

**Docs (land with B3/B4, before the MR):** `docs/subsystems/expanse.md`
(new: the two registers, the frame, nodes and bands, the voyage, the
plot, the channels, the Structure, the gunwale, sea state, the exits,
history); one-line map entry deferred to the sweep (CLAUDE.md is an
index file — swept, not raced); `zone.md` (the split, `visibleLandmarks`),
`location-graph.md` (fix the stale *Four channels* section; add
`charted`/`told`/`band`), `fishing.md` (the room hook exists), `activity.md`
(the first re-established engagement), `advancement.md` (`navigation`),
`instrumentation.md` (`depth`, `latitude`), `employment.md` (the lookout
seat read), `content-packs.md` (the water pack's agent + four classes,
transport's Boat).

---

## Reachability wiring

Five links per capability — **verb · affordance · data · boot · arg
gate** — each fails closed and silent.

| capability | verb | affordance (a class static) | data (rows) | boot / warm | arg gate |
|---|---|---|---|---|---|
| set / read a course | `course` (platform, movement) | `Helm.commandContributions.environment`; `Boat` the same | the helm prop on the deck; the expanse row + nodes | the Structure is `boot:`-listed in terminus; the Expanse compiles lazily on first read | `bearing` string; node by keyword, node-local (never MQL) |
| stop | `anchor` | `Helm`, `Boat` | — | — | none |
| hail a contact | `hail` (platform, social) | `Helm`, `Boat` | — | — | contact by keyword from `contactsFor(giver,'signal')` |
| launch / recover a boat | `launch`, `recover` | `Boat` (environment) / `Helm` | the dinghy prop on the deck | the dinghy `boot:`-listed (adrift case) | `requires: PositionedMixin` |
| the reckoning | `locate` (shipped) | shipped (`Perceiver`) | — | — | shipped `requires: any` |
| the chart | `read` (shipped) | shipped (`Marked` target) | two chart rows at the chandlery | — | shipped `[VisibleMixin, MarkedMixin]`; `Chart` composes `Marked` |
| the charted map | `map` (shipped) | shipped (`Avatar`) | the expanse row's `address` | — | string |
| the sounding | `measure depth` (shipped verb) | shipped (`measure`) | `depth.yaml` + `DepthReading` + a lead-line tool row with `instrument: sounding` | `ReadingCatalogue` warms by infix + `instanceof Reading` (pack class resolves via `resolveClassFile`) | the tool must declare the capability — **a tool row with no `instrument` is a silent refusal** |
| the sight | `measure latitude` | shipped | `latitude.yaml` + `LatitudeReading` + a sextant row | same | same |
| the Discipline | `competence` (shipped) | shipped | `navigation.yaml` | `DisciplineCatalogue` warms by class | — |
| the lookout | `appoint` (shipped) | shipped | the outfit Business row with a `lookout` position; the Structure's `house` | the outfit stands up lazily; the Structure reads it on the beat | `requires: class:Agent`; the giver must hold the appointing authority (the outfit's row names the ship's owner) |
| the pilot | `pilot` (water, social) | `Pilot.commandContributions.self` | the pilot cast row with `knows` and a dialogue tree whose choice `dispatch`es `pilot <player>` | the bank's `cast:` | `requires: class:Agent` on the person |
| fish from the deck | `fish` (shipped) | shipped | the `Gunwale` prop | `FisheryRegistry` lazy | shipped `default: "reachable:[class.Shore]"` — the gunwale **is** a Shore |
| aboard / ashore | `go aboard`, `go ashore` (shipped `go`) | shipped exits | the two exit-kind rows installed on the landing room and the deck | — | the exit's `canTraverse` |
| the landmark | `look` (shipped) | — | `visibleLandmarks` on three zone rows, `[]` on one; the tower Structure row | `StructureCatalogue` lazy | — |
| the vantage | `look` | — | the headland's `Vantage` prop | — | — |
| journey refusal | `journey` (transport) | shipped `Vehicular` | — | — | — |
| wade / swim the pool (D27) | `swim` (shipped view, **`unreachable:` deleted**) | `StillWater.commandContributions` (environment + peers) | a `StillWater` prop in the pool and the strand; `media: [water]` exits | — | the exit's mode admission via `checkEnablementScope` — ⚠ refused in words where no `StillWater` stands |

⚠ The fifth link is the binder: `launch`'s `requires: PositionedMixin`
is satisfied only because `Boat` composes it; a barge is refused before
any controller runs, and no controller test will ever see that refusal.
⚠ The two readings fail closed if the **tool row** forgets
`instrument:`; `lint:capabilities` consumes the capability strings, so
author the tool rows in the same wave as the readings.

---

## Acceptance-criteria coverage

| AC | wave | how it is proved |
|---|---|---|
| 1 three authored facts | A2 (fields) · B3 (rows) | `ExpanseNode` validates `kind`/`passage`/`along`; unit + drive 3 |
| 2 content is ordinary | B3 | the Pool and Gannet Rock's landing are `SingletonCartesianLocation`s in ordinary zones; nothing is under the expanse but Ideas |
| 3 geographic position | A0, A2 | `GeoPosition`; a node authored at any lat/lon |
| 4 edges carry cost/character, never connectivity | A2 | `course` consults no band for reachability; a test removes every band and the voyage still arrives |
| 5 band = width; boundary reported; drift detectable; order | A2, A3 | `crossings`; the beat's ordered report; drive 9–10 |
| 6 the field alone is evidence | A3, B1 | the boundary report carries the derived sea state and names no position; drive 11 |
| 7 away from a node a derived place, fishing works | B1 | `Gunwale.readWater`; `standingAt('@')`; drive 12 |
| 8 a shore cites a water | shipped + B3 | `river-edge` / the strand's Shore; drive 1 |
| 9 crossing = setting a course | A3 | `CourseController`; drive 4 |
| 10 reckoned ≠ true; readable; true never reported | A3 | `Plot`; `locate` test asserts the true string is absent; drive 5 |
| 11 four fixes, one weather-denied | A3 (landmark free fix, pilot told), A4 (sight denied), B1 (sounding) | drive 6–7 |
| 12 latitude only | A4 | `LatitudeReading.improves`; the refusal text names a clock |
| 13 sea state derived, no row authors it, no weather edit | B1 | `seaStateAt` test; `lint:authored-prose`; git diff touches no `lib/weather/` |
| 14 stopping mints nothing | A3, B1 | `anchor` creates no Stuff (test counts registry size); drive 12 |
| 15 a band authors only what is TRUE in it | A2 | the `Band` fieldMeta has no hook field; `hazards` are rows |
| 16 a boat holds a position; outward walk | B2 | `Boat.test.ts`; drive 15 |
| 17 belts | A2 | `BandExtent` belt; drive 13 |
| 18 narrowest wins, placed union | A2 | `fieldAt` test; drive 13 |
| 19 `navigation` Discipline | A4 | the row; `competence` on the drive |
| 20 competence gates nothing | A4, A3 | `Reading` never refuses by band (shipped); `Plot` growth stated per band only; drive 8 |
| 21 pilot = claims | B1 | `Pilot` writes `told` with `toldBy` |
| 22 lost has a way out | A3, B1 | `course` readout names the three fixes; drive 6 |
| 23 sustained, arrival detected | A3 | `Voyage.test.ts` |
| 24 state = three fields; re-established | A3 | `Structure.onCreate` test |
| 25 the watch is the beat; manning read | A3 | emission at `watchGameHours`; `isManned` |
| 26 craft holds it; survives restart; nobody dies | A3 · drive 22 | the Structure is `boot:`-listed; the avatar's `place` is the deck room (a singleton row) |
| 27 unattended degrades, seeded | A3 | wear formula test |
| 28 per-observer sight; second channel | A2, A3 | `sightRangeNm`; `SightingChannel`; drive 19 |
| 29 lookout is a seat | A3, B3 | `sightHeightFor`; drive 20 |
| 30 seeded traffic | A2 | `trafficAt`; drive 21 |
| 31 chart procured, `charted`, stays wrong | A4 | map growth test; drive 17–18 |
| 32 no topology reaches a client | A2 | nodes never projected; `map` reads claims only |
| 33 vantage authored, believed | A1, B3 | drive 23 |
| 34 landmark described once; sea range by height | A1, A3 | drive 24–25 |
| 35 Structure coordinates, sparse, position changes | A1, A3 | `StructureCatalogue.structureOf`; `setCourse` |
| 36 a thing contributes to its room's prose | A1 | LookController test |
| 37 land claims authored; computed only at sea | A1, A2 | no code path computes a land range |
| 38 depth axis, zero, nothing writes a second value | A0 | `GeoPosition.depthM`; grep in the suite for `depthM:` writers |

Nothing is unmapped. ⚠ AC 15's **hazard rows** are authored and
union-composed; their *firing* at a boundary is a deferred seam (see
*Risks*), because `HazardMixin`'s locus is a Stuff and a band is a
region — the drive has no hazard step and the requirements table names
hazards as a band *field*, which this build ships.

---

## Test & gate strategy

- **Unit tests** (`test:near`, colocated `__tests__/`): every value
  object (`GeoPosition`, `BandExtent`, `Plot`); the frame split (the
  two zone tests unchanged + `LocationZone.test.ts`); `Expanse` field
  composition over synthetic rows; `ExpanseLogic` resolvers; `Voyage`
  over a fake clock; `Structure` persistence round trip; the claim
  store's growth rule with the new channels; both readings' truth and
  refusal; the water pack's `seaStateAt`, `Gunwale`, `FisheryRegistry`
  grammar, `Pilot`; transport's `Boat`. Every test touching the wired
  runtime imports `test-bootstrap` (`lint:test-bootstrap`). Synthetic
  fixtures, never shipped content (`lint:test-content`).
- **What only the drive proves**: the affordance chain (a `Helm` in a
  room affords `course` to a person standing there), the arg gates, the
  cold-boot install of every row, the lookout's range through a real
  roster, `fish` from the gunwale through the fishing pack unchanged,
  the restart (drive 22 — run by hand, recorded in the plan as fishing
  did), the honesty of `locate` and `course` on a live wire.
- **Gates**: `pnpm -C packages/server lint:family` after every wave;
  `pnpm -C packages/content/water test`, `…/transport test`,
  `…/terminus test` (if present) after B1–B3. Expect `location-graph`'s
  ratchets to **hold**; if `destination-is-a-kind` rises because of the
  `aboard`/`ashore` kinds, the fix is to mark them as the vessel exits
  are marked, never to raise the ceiling.
- **`pnpm test` runs twice**: before the MR opens, and at `/finalize`.
  Nothing in between — `test:near` + pack vitest + the lint family,
  whatever the size of the change.

---

## Risks & opens

**⛔ STOP items — the requirements are wrong or under-specified here;
not absorbed, surfaced:**

1. ⛔ **"`Avatar.startLocation` already is the resolve-failure backstop
   and already defaults to the lounge."** It does not, at login:
   `startLocation` is an instruction stamped at mint, and a return login
   that cannot resolve `place` leaves the avatar with no container and
   `Avatar.enter` throws (`Avatar.ts:943-955`, `PersistableLogic.ts:320-380`).
   For this build the deck room is a singleton authored row, so it
   resolves; the backstop the requirements describe is a **separate
   fix** (`restorePlacement` → `defaultStartLocation` on a null anchor)
   that this build should not quietly own. ✅ **Decided 2026-10-10: it
   rides this MR — D26.**
2. ⛔ **"a wind lean, direction and strength, in the `weather.md` lean's
   own shape."** `ClimateLean` is `Partial<Record<WeatherType, number>>`
   — a per-type multiplier with **no direction**. The band's lean is
   therefore its own small shape (`{ directionDeg, strengthMps }`), and
   the sentence should be corrected in the requirements at the sweep.
3. ⛔ **No act is named for hiring a pilot.** D17 answers with a
   water-pack verb the pilot runs through the dialogue tree's shipped
   `dispatch` effect. If the user would rather the pilot's claims arrive
   by another act (a `talk` effect verb in the kernel, a chart the pilot
   draws), that is a Phase-1 call. ✅ **Accepted 2026-10-10.**
4. ⛔ **Hazard rows in a band cannot fire with the shipped hazard
   model.** `HazardMixin` fires from `Mobile.traverse` on a Stuff locus;
   `proximity` triggers are unhandled kernel-wide; a reef is not
   one-shot. The band carries `hazards[]` (AC 15) and the beat **names**
   them in the boundary report to a manned watch; the harm delivery is
   a seam → `navigable-water-slate § 3b` (grounding = arriving at a shoal
   node, which this build does support). ✅ **Accepted 2026-10-10:
   hazards ship as data, reported by a manned watch; firing is a
   deferred seam, because proximity triggers are a kernel-wide change.**
5. ⛔ **"a ship's rooms are keyed durably by the persistence spine,
   the leased DormRoom's model"** — the only persistable Location class
   is `FurnishableRoom`, roster-gated by `lint:locations`. This build's
   ship rooms are **singleton, non-persistable** rows (their identity is
   the row; the avatar's `place` resolves), and **cargo in the hold does
   not survive a restart** — the vessel build's problem, but the
   requirements sentence overstates what ships here.
6. ⚠ **`linear` passages are thinly exercised.** D14 models them as a
   confined corridor; the drive has no linear step (the bar is authored
   as one and unit-tested). If the register matters now, add a drive
   step; otherwise it is a seam the river's own build will exercise.

✅ **Also confirmed 2026-10-10:** the sea row at
`/stuff/idea/WaterExpanse/<key>` (D1); a new subsystem `ExpanseApi`
rather than growing `NavigationApi` (D9); and with build-4 both editing
the water pack, **whichever lands second rebases** and re-runs B1's
tests.

**Collision map (name them in the MR):**

- **climate-and-water** (build-4, `reqs/climate-and-water`): owns the
  biome chain, the water pack's temperature, latitude and the tide. This
  build adds `open-water` as a **stub row** and passes latitude
  **explicitly** to `solarAltitudeDeg`; it edits no chain code, no
  `lib/weather/`, no `celestial.ts`. ⚠ Both builds edit the **water pack**
  (`FisheryRegistry`, settings) — merge order matters; rebase onto whoever
  lands first and re-run B1's tests.
- **assembly** (build-3): the `Chamber`. Untouched — no stations, no
  compartments. Both edit `ExitableVessel`? **No** — this build composes
  on `Boat`, not on `ExitableVessel`.
- **underwater**: the axis is ours (`depthM`, always 0); their second
  value, the medium and the ascent are theirs. Nothing here reads
  `depthM`.
- **standing-instructions-slate**: unopened. The neglect model wears
  gear; no crew acts on standing orders; the `keeps`-shaped prototype is
  not revived.
- **vector wind**: direction from the band, magnitude from the field;
  when wind vectors, the band's lean becomes a deviation.
- **the word "structure"**: `measure structure` is drilling's geology
  channel; the class is `Structure`, the reading is `structure`, and
  prose must not conflate them.
- **`lint:object-verbs`**: `ExpanseApi.positionOf(stuff)` takes a world
  object. If the census counts it, move the walk onto the object
  (`Containable.resolveExpansePosition()`) and forward a path — do not
  raise the ceiling.
- **`lint:lib-statics`**: `Expanse`, `Structure`, `Band` carry no new
  public statics beyond `commandContributions` / `fieldMeta` / paths.
- **Two worktrees, one master**: build-1 is on `reqs/maritime-space`;
  the build branch is `maritime-space` off fresh master. Stage by name.
  Push every turn.

**Engineering uncertainties the build may meet:**

- `FromModule` matching on `stampZoneOf`: the gate reads the **immediate
  caller's** module. If a mixin method calling `this.stampZoneOf()` is
  denied because the proxy frame attributes the call to the mixin's
  module, the fallback is to widen `FromSpatialZone` to
  `AnyOf(FromModule(SpatialZone), FromModule(LocationZone))` — recorded
  here so it is a decision, not a surprise.
- A detached boat's weather resolves the **global** field (no address);
  a deck room's too. Acceptable: one planet, one field; the band supplies
  direction. If the climate build later lets an expanse carry a
  Locality, the row's `address` is already the hook.
- `DeferredDestinationExit` for `aboard`/`ashore` with a **changing**
  destination: the base caches the live destination; both subclasses
  must override `resolveDestination` to re-compute every traverse.
- Scenes to people aboard from a beat: emissions run in a fresh root
  frame; narrate per occupant guarded on `isSensor` (Journey's `finish`
  pattern) and never through a gated path.

---

## Deferred seams

Each is an attach point this build leaves clean, and the slate it lives
in — never a plan section.

| seam | attach point | slate |
|---|---|---|
| hazards firing at a band boundary | `Band.hazards[]` + the beat's boundary report | `navigable-water-slate` § 3b |
| the berth (owned, allocated) | `AboardExit.computeDestination` is where a berth would resolve | `navigable-water-slate` § 7a |
| stations, the `Chamber`, davits, the complement | the deck is a room; `Boat` is one space | `navigable-water-slate` § 7a · assembly |
| the second depth value, the medium, the ascent | `GeoPosition.depthM` | `underwater-slate` |
| the tide, latitude as a resolved value, a water biome | `WaterNode.surfaceLevelM`, `Expanse.biome`, `positionOf().latDeg` | climate-and-water |
| vector wind | `WaterBand.lean` becomes a deviation | `weather.md` deferred seams |
| what a towed boat means | `Boat.expansePosition` on a contained boat | `navigable-water-slate` § 7c |
| combat at sea, the tether graph | `contactsFor` is the broad phase | `navigable-water-slate` § 7c |
| water ownership | the expanse row's `address` | `navigable-water-slate` § 5 |
| the logbook | `chronicle` is append-only and exists | requirements open Q1 |
| the place↔bulk line (a bath) | — | requirements open Q2 |
| crew acting on standing orders | the neglect model reads manning only | `standing-instructions-slate` |
| a pilotage trade with seats and a licence | `Pilot.knows` | `navigable-water-slate` § 3b |
| cargo persistence in a ship's hold | the rooms are singleton, non-persistable | the vessel build |

---

## Critical files

Read first, in this order, before touching anything:

1. `docs/requirements/maritime-space-requirements.md`
2. `S/lib/zone/SpatialZone.ts`, `S/lib/zone/Zone.ts`, `S/lib/stuff/Stuff.ts:96-110,883-940` (the zone gate)
3. `C/water/src/idea/Watercourse.ts`, `WatercourseCatalogue.ts` (the row-and-lazy-catalogue shape to copy), `C/water/src/thing/Shore.ts`
4. `S/lib/location/MapClaim.ts`, `Cartographer.ts`, `S/api/navigation.ts`, `S/platform/idea/api/NavigationLogic.ts`
5. `S/api/scheduler.ts`, `S/platform/idea/SchedulerRegistry.ts`, `S/lib/activity/Engaged.ts`, `C/transport/src/lib/journey/Journey.ts`
6. `S/lib/persistence/Persistable.ts`, `S/api/persistable.ts`, `docs/subsystems/residence.md § D1`
7. `S/lib/instrument/Reading.ts`, `S/platform/idea/ReadingCatalogue.ts`, `C/trade-drilling/src/idea/reading/StructureReading.ts`
8. `S/platform/idea/cmd/perception/{Look,Locate,Read,Map}Controller.ts`, `S/platform/idea/cmd/movement/RouteController.ts`
9. `S/lib/boundary/{ExitableVessel,DeferredDestinationExit}.ts`, `C/transport/src/thing/{Barge,Coach}.ts`, `C/transport/src/lib/Vehicular.ts`
10. `S/lib/employment/{Position,Organization,Employed}.ts`, `docs/subsystems/employment.md § Capability grant`
11. `S/lib/hazard/Hazard.ts`, `S/lib/material/Durable.ts`
11a. `S/platform/thing/Ladder.ts` + `S/lib/locomotion/Swimmable.ts` + `C/platform/content/platform/cmd/movement/swim.yaml` (D27 — the shape `StillWater` copies, and the `unreachable:` line it deletes); `S/platform/idea/api/PersistableLogic.ts:314-380` (D26)
12. `S/api/weather.ts`, `S/lib/weather/WeatherType.ts:400-520`, `S/api/celestial.ts`, `S/platform/idea/api/CelestialLogic.ts:393-432`
13. `C/terminus/content/world/terminus/estuary/*.yaml`, `wharfside/bank.yaml`, `terminal/location/arrival-gate.yaml`, `C/terminus/pack.yaml`
14. `packages/wire/tests/fishing.dirty.wire.test.ts` (the drive shape), `docs/testing.md § Two tiers`
15. `docs/subsystems/{zone,location,location-graph,activity,instrumentation,content-packs,command-routing}.md`

## Build log

*(appended wave by wave at build time — what changed, what was decided,
what surprised. Decisions the build made that the plan did not are
marked **B-n**.)*

- ✅ **A0** (`6c86e0152`). The split landed as planned. **B-1:** no
  `stampZoneOf` seam — `FromSpatialZone` is `FromModule(SpatialZone,
  { includeSubclasses })` and it resolves the CALLER (the zone instance),
  not the module whose code runs, so `LocationZoneMixin` calling
  `location.setZone(this)` passes exactly as `SpatialZone` did. **B-2:**
  `GeoPosition` persists as its plain record (`{latDeg, lonDeg, depthM}`)
  and is rebuilt on read; no marshaller row. Its constructor takes a
  record or degrees — a public `from()` static would have risen
  `lint:lib-statics` (341 ceiling).
- ✅ **A1**. `Structure` (kernel Idea, persistable singleton),
  `StructureCatalogue` (lazy, reads ROWS by class — the landmark walk needs
  the tower's sentence, not a resident tower), `RoomContributorMixin`,
  `Vantage`, and `look`'s contribution step. **B-3:** the landmark and
  contributor lines ride their OWN uncarded scenes after the room body —
  folded into `body` they would reach the card, which never renders
  handed prose (the help-wanted defect). **B-4:** a landmark is skipped
  when the viewer stands inside its extent. **B-5:** `Vantage` contributes
  each cited row's `outsideDescription`; `ExpanseNode` and the expanse
  rows carry the same field, so *anything with an outside* can be
  overlooked or be a landmark. **B-6:** `Shore` composes the hook and
  contributes the first sentence of its physical read (*This is the
  Kestrel, a great wide water.*). **B-7:** `deckHeightM` /
  `mastheadHeightM` / `sightHeightFor` move to A3 —
  `lint:unconsumed-seams` counts a field consumed only when ANOTHER file
  reads it, and its reader (`ExpanseLogic`) is A3's. **B-8 (for A3):**
  the voyage is re-armed by a new `Persistable.onRestored()` `@hook`
  called after a record restore, NOT `Structure.onCreate` —
  `lint:on-create` holds 82/82 and `StuffApi.singleton` already restores a
  persistable singleton; two implementers (`Structure`, `Boat`).

- ✅ **A2**. `Expanse` (abstract, `SingletonMixin(SpatialZone)`),
  `BandExtent` (corridor = a rectangle on the local plane; belt = a
  lat/lon box, longitude optional; `crossings` is a Liang–Barsky clip, so
  entry/exit are exact parameters), `SightingChannel`, `Band`,
  `ExpanseNode`, `ExpanseApi`/`ExpanseLogic`, `content/settings/expanse.yaml`.
  **B-9:** `ExpanseApi` takes PATHS only (`craftAt(placePath)`,
  `expanse(path)`) — `lint:object-verbs` refuses a world-object-first Api
  static, and rather than widen its exempt list the caller walks its own
  containment (`getRootContainer()`) and hands the root's path. **B-10:**
  composition, sighting and traffic are methods ON the `Expanse`
  (`fieldAt`, `contactsFrom`, `trafficAt`, `sightRangeNm`) — verbs on the
  object that owns the water and the craft registry; the FNV is
  module-private in `Expanse.ts`. **B-11:** `Positioned` gains two height
  `@hook`s, `sightHeightFor(observer)` and `getTargetHeightM()`
  (implemented by `Structure` now, `Boat` in B2), so `contactsFrom` reads
  heights without narrowing on a class. **B-12:** the nodes and bands are
  stood up as live singletons and narrowed by `instanceof` on the class
  (the `ReadingCatalogue` pattern). A linear node with no `along` warns
  and is reached by bearing. **B-13:** five band fields (`endpoints`,
  `setKn`, `reputation`, `gearHardness`, `confined`) join `fieldMeta` in
  A3 with their reader — `lint:unconsumed-seams` again.

- ✅ **A3**. The voyage. **B-14:** the voyage state is `VoyagingMixin`
  (`lib/expanse/Voyaging.ts`, `Mixins.Voyaging`), composed on `Structure`
  now and `Boat` in B2 — two hosts carrying the same three fields plus
  the plot is a mixin, not duplicated fields. ⭐ The STORED
  `expansePosition` IS the fix, and `getExpansePosition()` answers the
  DERIVED position while a course is set, so the persisted triple is
  literally the requirements' *position, course, course-set-time*, and
  everything asking *where is this craft* gets the truth without knowing
  there is a voyage. `rebase(course, now)` is the one writer of the
  triple; `placeAt` snaps (arrival, launch); `steer`/`anchorHere` are the
  acts. **B-15:** the set is integrated piecewise along the undisplaced
  track, split at every band boundary; in each piece the narrowest band
  owns the set and the way (`cost.wayFactor`). The plot (`Plot`) carries
  the reckoning forward along courses steered with NO set; its stated
  bracket is worded by the reader's `navigation` band and never refuses.
  **B-16:** `Persistable.onRestored()` `@hook` (B-8) — `PersistableLogic`
  calls it after a record restore; `Voyaging.onRestored` registers the
  craft and restarts a voyage with a course. **B-17:** `Voyage` beats
  water report → arrival → landmark free fix → sightings (from the
  highest eye aboard — the lookout seat) → neglect wear. The medium
  speaks through two plain polymorphic methods on `Expanse`,
  `readAt(pos, scope)` and `roughnessAt(pos, scope)` (frame defaults: the
  narrowest band's outside description, and `1`); the water tier
  overrides both in B1. **B-18:** `ExpanseApi` is never handed a world
  object — controllers walk `getRootContainer()` and pass the path (B-9);
  each controller has its own three-line `craftOf` (a public static
  helper would rise `lint:lib-statics`). **B-19:** `hail`'s arg is
  optional so a bare `hail` refuses in words (a required string fails
  closed and silent at the binder). **B-20:** `Exit.bind` is `@Final`, so
  the aboard/ashore lookups (which node is this landing, which craft is
  this deck's) happen in a new `Exit.prepareTraversal()` `@hook`, awaited
  by `LocomotionControllerBase` before the synchronous `canTraverse`; two
  implementers. The two exits carry an authored destination (the usual
  berth) and RECOMPUTE on every traverse; nothing alongside / nothing to
  step onto refuse in words. ⚠ They are therefore ordinary edges in the
  location graph (the authored destination), not unmapped — the plan's
  kind-row trick was not needed. `launch`/`recover` moved to B2 with the
  Boat they act on. D26 and D27 landed as planned.

- ✅ **A4**. `charted` + `told` + kind `band` + `where?` + `toldBy?` on
  `MapClaim` (docstring records the return, each with its writer);
  `RouteClaimChannel` mirrors. **B-21:** no `recordChart` — charts write
  through the existing `recordPlace` (same growth rule); a second Api
  static that only forwards would be a thin-forwarder. **B-22:** the
  dedupe key gains `where` and `toldBy`, so a wrong chart APPENDS beside a
  right one and two pilots are two sources (the plan assumed `channel`
  alone was enough — it is not: two charts of one band share every other
  key part). Band claims are skipped when building a route graph (water
  is not a way) and render in `map`'s own *The waters* section.
  `ChartedMixin` + `Chart` + `ReadController.takeAnyChart` at the scroll's
  seam. `LatitudeReading`: the centre is the TRUE latitude, the bracket
  by band, printed to the places the bracket justifies (same answer,
  different bracket — the base `observe()` would have moved the centre
  per reader); refused under any non-`clear` sky in the sky's own word and
  when the sun is down; mends only the plot's latitude; credits
  `navigation`. **B-23:** a sextant row already shipped
  (`/stuff/thing/instrument/sextant`, capability `sighting`, the
  `measure elevation` instrument) — `latitude` names `instrument:
  sighting`, a second reading on the same tool, and no new tool row.

- ✅ **B1**. `WaterExpanse` (the column, derived sea state, the water
  state every fish's tolerances read), `WaterBand` (`depthM`, `fetchKm`,
  `bottom`), `Gunwale extends Shore`, the fishery's `@` grammar,
  `DepthReading`, `Pilot` + `pilot`, the open-water biome. **B-24:** no
  `WaterNode` — `surfaceLevelM` has no reader in this build (the tide is
  climate's), so nodes use the kernel `ExpanseNode`; a field with no
  reader is the `lint:unconsumed-seams` failure. **B-25:** `Band.reputation`
  dropped for the same reason — a pilot's knowledge is entries, not the
  band's prose. **B-26:** the gunwale's citation is
  `"<expanse PATH>@<lat>,<lon>"` (the full row path, not the key, so it
  resolves with no lookup), rounded to the 0.1° cell, so the fishery's
  `drawn` is per-cell with no extra quantizing; its register path is
  `/system/water/fisheries/sea/<key>/n50.2w4.5`. `Shore` opened three
  seams (`_memo`/`refresh`/`readWater` protected, a `lines` memo for a
  water that is not a reach, `disciplineKeyNow()`); the fishing pack is
  untouched. **B-27:** the PILOT is a `ChartedMixin` too — one mixin for
  *a source whose knowledge is claims*; `writeClaimsFor(reader, { by })`
  writes `told` signed `toldBy`. ⚠ **The `pilot` verb is the PLAYER's,
  not the NPC's dispatch (D17 reversed):** `BankingApi.settle` charges
  whoever is acting, so a pilot running `pilot <player>` would pay
  himself. The Pilot affords `pilot` on `peers`; the player pays the fee
  in coin into the pilot's hands and gets the claims. **B-28:** the
  open-water biome ships from the WATER pack at
  `/stuff/idea/biome/outdoor/open-water` (forestry's woodland precedent:
  a trade ships the biome it stands under), not world-seed. **B-29:** a
  sounding over a band that authors its own depth (a bank) is a FIX
  (reckoning to within 2 nm); over the anonymous open sea it only reads
  the depth. ⚠ `depth.yaml` and the lead-line row land in B3 with the
  ship that carries the lead — `lint:capabilities` refuses a reading whose
  instrument nothing offers, and `lint:reachability` a tool row nothing
  places.

---

## Drive record

*(appended at build time, not at plan time)*
