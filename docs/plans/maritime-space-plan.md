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

## ⭐⭐⭐ Revision 1 — perception at range (2026-10-10, after MR !358 opened)

Decided in conversation with the user after review of !358. The product
half is the requirements' new section *Perception at range* and ACs
28–29, 33–42 (revised). **Superseded here:** D24 entirely (the room hook
and the vantage object), D13's narration (the seat's height stays), D6's
beat items 3–4 (landmark fixes and sightings), D10's vantage and
landmark wiring, and build decisions B-3, B-4, B-5, B-6. The lenses
decided it — **3b**: the engine was doing the lookout's and the
navigator's jobs; **1**: the lessons are in the acts (climb, look, take
a bearing).

### Decisions

**R1 — The Structure is Visible.** `Structure` composes `VisibleMixin`
and `DetailedMixin` (precedent: `Species` is `VisibleMixin(Idea)`):
short/long description, keywords, details, authored the ordinary way.
⛔ `outsideDescription` is deleted from `Structure`, `ExpanseNode`,
`Expanse`/`WaterExpanse` and `Band`, and from `StructureCatalogue`'s
row view. A Structure gains `landmark: boolean` — opt-in to be
**featured** on the horizon (visibility itself is derived and generous).

**R2 — Deleted:** `RoomContributorMixin` (+ `Mixins.RoomContributor`,
`MixinApi.isRoomContributor`, its refusal phrase if any), `Vantage` (class
+ the headland's `headland-view` row), `Shore.contributeToRoom`,
`LookController.roomContributions` and every landmark append. ⛔ The
engine appends nothing to a room's prose. The `Crossing` location
subclass (its code-built `tower` detail) is retired: the row's class
becomes `Street`, and the detail is static prose.

**R3 — Authority: zones name zones.** `SpatialZone.visibleLandmarks` is
replaced by **`horizon: string[] | null`** — the ZONE paths scanned from
here, inherited by the ordinary `lookupField` walk; `[]` = nothing.
`Location` gains the same field (the room's own value wins, then the
zone walk — the `suppressesMagic` shape) and **`featured: string[]`**
(structures this room features, beyond the landmarks). Declared in
`fieldMeta` on both, or the hydrator drops them.

**R4 — The `horizon` scope.** A new MQL seed `horizon` (fixed-pool,
like `here`), resolved by **`PerceptionApi.horizonFor(viewer)`** →
`PerceptionLogic` (PerceptionApi is already exempt from
`lint:object-verbs` as a viewer-relative query). It returns Stuff:
- **at sea** (the viewer's root resolves a craft on an expanse): the
  expanse's visual contacts from the viewer's eye height
  (`Expanse.contactsFrom`) — craft and fixed structures; seeded traffic
  has no object and is reported in prose only;
- **on land**: the nearest `horizon` declaration (room, then zone walk);
  for each named zone, the Structures whose `extent` lies in it, kept if
  the derivation admits them: the viewer's room must be **sky-exposed**
  (`BiomeApi.isSkyExposed`); distance is approximated from **zone extents
  in metres** (cell size × the bounding box of the zone's rows' `coords`,
  computed once per zone, cached); a structure is in reach when its
  `heightM` + the elevation difference clears `distance / HORIZON_RATIO`
  (grain, a dial `perception.horizonRatio`); optics later (the optics
  slate) widen it.
- ⛔ the viewer's own Structure is never on its own horizon.

**R5 — `look horizon`.** `LookController` takes the `horizon` seed as a
whole-scope target and renders like a room: **featured** structures
(`landmark: true` or the room's `featured`) each with its short
description, then *"You can also make out: …"* for the rest, then (at
sea) seeded traffic in words. `look horizon:<kw>` is ordinary `look` on
the matched Structure — its own description and details.

**R6 — `watch horizon`.** The livestream `watch` view gains the horizon
target: `WatchController` dispatches on the bound target — a streamer as
today; the `horizon` seed starts a **`HorizonWatch`** sustained
engagement on the WATCHER (`lib/perception/HorizonWatch.ts`; slots
`['attention']`; one emission per game minute-band, a dial). Each beat
recomputes `horizonFor(watcher)` (+ seeded traffic at sea) and tells the
watcher only what came into or went out of view. `cancel` ends it.
⚠ The view's arg gate must admit the horizon target — the fifth
reachability link.

**R7 — The hired lookout.** A brain (`/system/water/behavior/keeps-watch`,
water pack `src/behavior/`): an agent holding the house's `lookout` seat
ON SHIFT and standing in a member room of the craft starts
`watch horizon` and **says** each new sighting to the room (*"Light on
the starboard bow!"*). The seat's `sightHeightFor` (masthead) is what
makes the lookout see further. Nobody on watch → nobody told.

**R8 — `measure bearing`.** A platform `Reading` row
(`/platform/idea/reading/bearing`, `BearingReading`), instrument
capability `bearing` (a hand-bearing compass tool row; the helm's
binnacle is prose), eye rung allowed with a wide bracket, subject = a
thing in view (the view's subject scope admits `horizon`). Truth = the
true bearing from the craft to the subject; the bracket by band. On a
**fixed** subject (a landmark) it corrects the reckoning to within
`range × tan(bracket)` (`Voyaging.takeFix`). Credits `navigation`.

**R9 — The voyage beat.** `Voyage.beat` keeps arrival and neglect and
**loses** sightings, automatic fixes and `fixedFrom`. The boundary report
becomes a **derived delta**: for each crossing, compare the field just
before and just after — sea-state word, set (on/off, direction), depth
band, weather type — and say only what changed (*"the sea gets up, short
and steep"*, *"a current takes her, setting north-east"*, *"fog closes
in"*). Nothing changed → nothing said. `Expanse.readAt` is deleted;
`WaterExpanse` exposes the derived pieces.

**R10 — Fog is a weather lean.** `Band` gains `weatherLean: ClimateLean`
(the shipped per-type multiplier). **The seam (option 1, user-decided):**
`WeatherLogic`'s lean resolution gains a positional source — a scope
whose root resolves a craft on an expanse takes the narrowest band's
`weatherLean`, multiplied over its Locality's. It must stay SYNC (the
weather reads are), so it reads only warm state: a new
`ExpanseApi.leanAtSync(placePath)` over the StructureCatalogue's loaded
rows and the expanse's `peekBands()`; cold → no lean. Downstream with no
special case: the sky read (a sight refused in fog), the crossing delta,
and visual range (`contactsFrom` multiplies range by a per-weather
visibility factor, a dial table: `fog 0.1`, `rain 0.6`, …). ⚠ Overlaps
build-4 (climate-and-water) — whichever lands second rebases.

**R11 — The headland is a sub-zone.** `/world/terminus/estuary/headland`
becomes a zone row (`CartesianZone`, its own `elevation`, `horizon:
[/stuff/idea/WaterExpanse/greywater]`) with the headland room beneath it.
The bay below is **later** (→ navigable-water slate § 3).

**R12 — Content.** The terminal Structure: `landmark: true`, Visible
fields (short: *the terminal clock tower*). The avenue, wharf and estuary
zones: `horizon: [/world/terminus/terminal]`; the four wharfside interiors
`horizon: []`. The light on Gannet Rock: `landmark: true`. A hand-bearing
compass on the Hesper's deck. A lookout Cast on the Hesper (the outfit's
roster) with the `keeps-watch` brain. The `delight-road/flats` detail
keyword `horizon` renamed (the seed would shadow it).

### Waves

- ✅ **C1 — subtraction.** R1 (Visible Structure, `landmark`), R2, the
  `outsideDescription` deletions, `Crossing` → `Street`. Tests: Structure
  is Visible; look appends nothing. Commit `build(maritime C1): …`.
- ✅ **C2 — the horizon.** R3, R4, R5. Tests: land scan (a named zone's
  landmark admitted from a sky-exposed room, refused from an interior and
  by `[]`, reach by height vs zone extent), sea scan (contacts), the seed
  in MQL, `look horizon` featured/also-make-out. Commit `…C2`.
- ✅ **C3 — watching.** R6, R7. Tests: HorizonWatch reports in/out deltas
  only; WatchController dispatch; the brain says sightings when on shift
  and not otherwise. Commit `…C3`.
- ✅ **C4 — the bearing.** R8. Tests: truth, bracket by band, fix on a fixed
  subject only. Commit `…C4`.
- ✅ **C5 — the water, the fog.** R9, R10. Tests: the delta (no change → no
  line), the lean seam (inside the haar the sky reads fog; cold → no
  lean), visibility factor. Commit `…C5`.
- ✅ **C6 — content, drive, docs.** R11, R12; the drive's steps 19, 20,
  23–26 rewritten to the revised script; expanse.md, perceiver.md (the
  horizon scope), mql-grammar.md (the seed), weather.md (the positional
  lean), zone.md (`horizon`). Re-drive cold to green; `pnpm test` before
  pushing. Commit `drive(maritime): …`.

### Revision 1 — build log

*(Decisions the revision's build made that R1–R12 did not are marked
**B-n**, continuing the main log's numbering.)*

- ✅ **C1 + C2, one commit.** They had to land together: C1's new
  `Location.horizon`/`featured` fields have their only reader in C2, and
  `lint:unconsumed-seams` refuses a field nothing else reads. The census
  reads `featured` and `horizon` in place of `overlooks`/`visibleLandmarks`.
  - Structure composes `DetailedMixin(VisibleMixin(PerceptibleMixin(…)))`.
    **B-38:** `Perceptible` too, because `keywords` is that mixin's field
    (the `Material` precedent, `PerceptibleMixin(Idea)`); without it
    `horizon:tower` could not match and the rows' `keywords` were orphan
    keys (`lint:instanceable` invariant 12). The terminal row drops its
    Named `name` so it presents as *the terminal clock tower* (a Named
    name outranks the short description).
  - **B-39 (R2 reversed in part):** the `Crossing` location class STAYS.
    It predates this build, and its live `tower` detail (the civic time,
    which Gus's slow watch disagrees with) is exactly what the
    requirements keep: *a venue that mentions the tower does so in its own
    words, for its own reason* — the user's own example was *a clock tower
    tells time*. Lens 2 (the bespoke case without breaking) decided it.
  - The voyage's automatic sightings and landmark fixes went in C1, not
    C5: deleting them is subtraction. The beat keeps the crossing report
    (interim: the frame's `readAt` answers nothing until C5's delta),
    arrival and neglect.
  - **B-40:** the MQL resolver is SYNCHRONOUS and the horizon is not
    (catalogue rows, structure singletons, the zone walk). So
    `PerceptionApi.horizonFor` (async) computes and remembers per viewer;
    the `horizon` seed reads `peekHorizon`; and the command binder awaits
    a new `MqlApi.prepare(raw, giver)` before resolving any object field
    (it recomputes the horizon when the query names the seed).
  - **B-41:** a bare `horizon` names a WHOLE SCOPE (`MqlApi.namesWholeScope`):
    the binder binds no stuff, keeps the raw, and skips `onExcess: prompt`
    — otherwise `look horizon` asked *"which target?"*. `LookController`
    surveys it.
  - **B-42:** `StructureCatalogue` warms LAZILY, with no `onCreate` and no
    boot entry. An eager warm was tried and refused: `lint:on-create`'s
    ceiling may not exceed its landing census (82), and the
    `LocationGraphRegistry` argument holds — nothing reads the horizon at
    boot; `horizonFor` awaits `all()`, which stands every Structure up.
  - **B-43:** a load-time cycle (Visible → MQL subscription → resolver →
    PerceptionLogic → ExpanseApi → StructureCatalogue → Structure →
    Visible) is broken the `WeatherLogic` way: `horizonAtSea` /
    `horizonAshore` `await import(…)` ExpanseApi, BiomeApi and Location.
  - **B-44 (the derivation, a grain):** a zone's span is
    `CartesianZone.getExtentM()` — cell size × the larger side of its
    resident grid's bounding box, remembered at its widest (an evicted
    corner room does not shrink the avenue); a non-gridded zone answers
    `null`. Distance from inside a named zone is half its span, from
    another zone half of each; a structure is in view when
    `(heightM + |Δelevation|) × perception.horizonRatio (20) ≥ distance`.
    Elevation either way helps — a high viewer sees over roofs, a high
    tower stands over them.
  - At sea `look horizon` gives a compass point and a rough range
    (*to the north-east, some 3 miles off*) — a glance. The bearing worth
    fixing by is C4's `measure bearing`.
- ✅ **C3.** `HorizonWatch` (`lib/perception/`) holds the watcher's
  `attention`, looks every `perception.watchGameMinutes` (5) and says only
  the delta; the first look reports what is in view. `watch horizon`
  branches in `WatchController` BEFORE the player-client check, so an NPC
  can take it; `watch off` stands a watch down before it touches the
  embed. **B-45:** the glance wording (*to the north-east, some 3 miles
  off*) is ONE `PerceptionApi.glance` used by both `look horizon` and the
  watch — two public statics on the lib class would have risen
  `lint:lib-statics`, and two copies of one sentence drift. **B-46:** the
  watch keeps its beat's news (`takeNews`, capped at 20) so the
  `keeps-watch` brain can call it on the watcher's behalf — the brain is
  stateless and the engagement is where the watching happens. The brain
  stands down off shift (`watch off`) and calls sightings RELATIVE to the
  ship's head (*on the starboard bow*), by the compass at anchor; it
  claims only `voice` (the watch holds `attention`). **B-47 (for C6):**
  the Hesper's outfit gets `startsShiftOnHire: true`, so `appoint` alone
  puts a hired lookout on watch.
- ✅ **C4.** `BearingReading` (`/platform/idea/reading/bearing`,
  capability `bearing`, eye rung at `untrained` = ±10°) answers off the
  expanse's own `contactsFrom` from the reader's eye, so a light below
  your horizon cannot be taken; a FIXED contact mends the reckoning to
  `range × tan(bracket)` and a sail mends nothing. **B-48:** `measure`'s
  and `analyze`'s subject scope gains `horizon` LAST (after `$focus` and
  `reachable`), so `measure bearing light` finds the light without the
  `horizon:` prefix; `MqlApi.prepare` therefore warms when a SCOPE names
  the seed, not only the query. **B-49:** the hand-bearing compass row
  lands with C4 on the Hesper's deck (not C6) — `lint:reachability`
  refuses a row nothing places. The reading has no `truth()` override: a
  bearing depends on the observer, and the engine's read has no single
  scalar.
- ✅ **C5.** The crossing report is a DERIVED DELTA: `Expanse.changesAcross
  (before, after)` (`@hook`) — the frame says what the SET did (*a current
  takes her, setting north-east* / *lets her go* / *swings*, felt above
  `expanse.setFeltKn` 0.3 kn); `WaterExpanse` adds the sea getting up or
  going down (a step on the scale, or turning steep) and the water paling
  over / darkening off shallow ground (`expanse.shoalM` 12 m), then chains
  `super`. Nothing changed → nothing said. The sky is a second delta, per
  watch: the deck's `skyReadFor` against the last watch's (*Fog closes
  in.* / *The fog thins and lifts.*). `Expanse.readAt` is gone; the
  gunwale's read is `WaterExpanse.seaReadAt`. **B-50:** the manned watch's
  automatic *"calls a warning"* on entering a hazard band is DELETED, not
  moved — seeing the race ahead is the lookout's job (the lens finding
  that started revision 1), and the water says what it does to her once
  she is in it.
  - R10's seam, as decided: `Band.weatherLean` (a `ClimateLean`; keys NOT
    checked against the weather vocabulary — **B-51**, the Locality
    precedent, because `lint:closed-vocabularies` refuses a new content-
    facing kernel list); `ExpanseApi.leanAtSync(placePath)` reads only warm
    state (`StructureCatalogue.peekStructureOf`, `Expanse.peekNarrowestAt`);
    `WeatherLogic` multiplies it over the Locality's lean in every
    scope-bearing compute. **B-52:** WeatherLogic loads `ExpanseApi` lazily
    on its first async read (its own BiomeApi precedent — a static import
    closes a cycle), so a sync read before any async one leans by the
    Locality alone: *cold → no lean*, exactly the plan's rule.
  - Visibility: `contactsFrom` multiplies VISUAL range by the observer's
    sky (`fog 0.1`, `storm 0.3`, `snow 0.4`, `rain 0.6`; retune by
    `expanse.visibility.<type>`); a signal is heard, not seen, and is
    unaffected.
  - The haar row: `weatherLean: { fog: 40 }` — nothing authors foggy.
- **C6 (content, drive, docs).** **B-53:** a zone's `horizon` may name an
  EXPANSE, and the land scan then reads it like a deck — from the node
  whose landing shares the longest path with the viewer's room
  (`Expanse.shorePositionFor`; sharing only the realm's root is not near)
  at the zone's elevation + a 2 m eye, through `Expanse.sightingsFrom`
  (the core `contactsFrom` now delegates to). That is what makes R11's
  headland work: it names the Greywater, and its 40 m raises the light
  eighteen miles off. **B-54:** the estuary zone names the Greywater too,
  so the drive's step 23 is a real comparison — the strand raises the
  Hesper at the bar and not the light; the headland above it does.
  **B-55:** at sea the horizon also requires a sky-exposed room (through
  any vessel to its Location), and the hold gains the indoor biome — so
  somebody below decks sees nothing (step 19's second observer).
  **B-56:** the lookout Cast (Tam Rook, a placeholder) is `archetype:
  hand` and her brain rides `trigger: candidate` (`lint:dossiers`,
  `lint:idle-cadence` — a brain that declares urgency rides the one beat);
  she is UNSEATED until appointed, and `startsShiftOnHire` puts her on
  watch at `appoint`. **B-57:** the flats' `horizon` detail keyword is
  `skyline` (the seed would shadow it). The headland is the zone at
  `estuary/headland`, its one room `estuary/headland/brow`.
  - The drive is rewritten to the revised script: 23–24 (ashore, with
    `horizonUntil` waiting out weather between looks), 9/11/13/14/26 (a
    passage in ten-minute legs so a watch falls INSIDE the two-and-a-half
    -mile haar; the sextant is tried when the fog closes in), 19 (the Rock,
    the hold), 20 (a watch from the deck misses the light; an appointed
    lookout calls it — at anchor, so weather can be waited out) and 25
    (close the coast, raise the light, `measure bearing`).
- ✅ **Revision 1 drive record — 26/26 on a cold world** (run 4 of 4,
  `packages/wire/tests/maritime-space.dirty.wire.test.ts`, `reset:db`
  before each). What driving found, each fixed:

  | # | found | fixed |
  |---|---|---|
  | R-1 | step 1 still expected the river in the bank's own `look` — that was the deleted room hook | the drive looks at the water's edge (`look edge`), which is the requirement |
  | R-2 | waiting out weather in three-hour jumps on a windy height, wet from the wade, put the founder on the ground (*"Your vision tunnels…"*) and cascaded through the run | the horizon steps run dry, before the wade, waiting an hour at a time |
  | R-3 | `look horizon`'s lines were separate sends and split across captures | ONE scene, like a room's body |
  | R-4 | ⚠ the estuary inherited Terminus's 35 m, so the strand saw the light as if from a cliff | the estuary zone is at `elevation: 0` (the Kestrel's own estuary node says 0); the headland 45 |
  | R-5 | `appoint tam` found nobody — a Cast's name is not addressable until you are introduced | the drive appoints *the deckhand* |
  | R-6 | ⭐ the hired lookout never called: `watch` was afforded only by `Avatar`, so an NPC's `watch horizon` was an unknown verb | **B-58:** `watch` moves to `PerceiverMixin` (keeping a watch is a perceiver's act; the stream form still refuses a non-player in words) |
  | R-7 | ⚠ the gunwale's failed read stored an EMPTY line list, which the augmenter rendered as nothing — no water at all, not even *hard to read yet* | the failed memo carries no `lines`; the drive looks again while a fresh cell's read lands |
  | R-8 | drive-only: anchoring after arrival is refused (`not-under-way`); the lookout rides the 20 s / 120 s-by-night beat | get under way first; longer listening and per-step timeouts |

  ⭐ Proven on the wire: the strand raises the Hesper and NOT the light;
  the headland raises the light at 18 miles; the tower featured from the
  avenue, the wharf and the mouth and read once; an interior and the hold
  see nothing; a current takes her entering the Westerlies; *Fog closes
  in* inside the haar and the sextant is refused by the fog; the race
  gets up short and steep; nothing is sighted or fixed by being seen; a
  watch from the deck misses the light and the appointed deckhand CALLS
  it; `measure bearing` on the light fixes her.
- **Revision 1 full suite:** 39/40 packages green on the one run; the
  server package's two (13,232 passed) were this revision's own — the
  Avatar affordance test asserted `watch` on Avatar's own list (it is
  `PerceiverMixin`'s now, which the Avatar composes) and the wiki spoiler
  snapshot gained/lost exactly the revision's fields. Both fixed and
  re-run green.
- **Review round 1 — the horizon is synchronous (supersedes B-40, B-42).**
  The user: *"I don't want every MQL caller in the game having to make two
  calls."* The `MqlApi.prepare` + per-viewer memo meant only the command
  binder got a current horizon; the other ~42 direct MQL call sites would
  have read a stale or empty one, silently. Now `PerceptionApi.horizonFor`
  is SYNC over warm state and `prepare` and the memo are deleted:
  **B-59** resident craft and structures by ONE `StuffApi.findByMixin
  (Voyaging)` read (perception's `horizonFor` and expanse's `leanAtSync`
  admitted by name to the registry-wide allowlist); an Idea that voyages
  is a Structure (`isIdea()` — a value import of `Structure` or
  `Location` closes the MQL load cycle; `ExpanseApi`/`BiomeApi`/
  `WeatherApi` do not, probed). **B-60** Structures never culled
  (`Structure.canEvict`) and every Structure and expanse row BOOTED by its
  pack — the new **`lint:structures`** gate refuses one that is not (the
  terminal, the light and the Greywater gained boot entries; world-seed
  its first `boot:`). **B-61** `Zone.peekField` — the sync sibling of
  `lookupField` over resident zones (`peekAncestorField` the override
  point). **B-62** the cached sky read the user chose: WeatherLogic caches
  every scope's Locality on each async read, and `WeatherApi.peekSkyType`
  computes the type from it (the positional lean live); never-read → `null`
  once (counted clear) and the read starts. **B-63** the Expanse has ONE
  sync sighting core, `sightingsAmong(here, eye, channel, hour, candidates,
  seeing, exclude)`, fed by `contactsFrom` (the sea's registry, async) and
  by the horizon (resident craft); `peekShorePositionFor` reads the
  compiled nodes (a sea nobody compiled answers `null` once and starts
  compiling). `StructureCatalogue` is rows-only again.
  - Re-driven after the sync horizon: **26/26 cold**. Two drive-only
    findings, both the weather moving with the 12× clock under machine
    load: the founder, wet from the wade, was put on the ground by a cold
    night before boarding (the wade is now somebody else's — the sailor
    stays dry), and rain hid the light from the masthead past step 20's
    timeout (at anchor, the drive now waits for a sky that permits sight,
    probed with the sextant's refusal). `horizonUntil` gives a cold read a
    moment of real time before spending game time.

## ⭐⭐⭐ Revision 2 — looking at many things (2026-10-11, review round 1)

Decided in conversation with the user during review. The product half is
the requirements' *Looking at many things* section, drive steps 27–30 and
ACs 43–48. **Supersedes:** B-41 and `MqlApi.namesWholeScope` (a side
protocol on MqlApi — the user: *"if you're adding anything to mqlapi other
than the two mqlone and mqlmany functions you're probably doing something
wrong"*), and `look horizon`'s bespoke survey render (it becomes the
general list). Same MR, by the user's decision.

### Decisions

**S1 — The result says how it resolved.** `MqlMany` (and `MqlOne`) gain
ONE field set by the resolver from the parsed query: whether the head was
a NAME (a keyword search — fuzzy, can be ambiguous) or a SET (a seed:
`horizon`, `peers`, `inventory`, a pronoun, a path). Nothing else is added
to `MqlApi`; the binder and controllers read the field. No list of
"survey seeds" anywhere — every seed is a set by what it is.

**S2 — The binder's how-many rule** (`CommandLogic`, the object/objects
branches):
1. the player's own quantity wins — the query's existing `MqlQuantity`
   (`all`, a count, `:{N}`, `:{*}`) and ordinals (already applied by the
   resolver) override the view's `cardinality`/`onExcess` default;
2. a view's HARD limit (a declared `max` the player exceeds) refuses in
   words (`controller-rejected`, reason `too-many`) — never a prompt;
3. `onExcess: prompt` fires ONLY for a NAME that matched more than the
   slot takes with no player quantity — a SET is never prompted;
4. the prompt and the display are independent: a view may show the
   candidates and ask (the prompt widget's own candidate list is the
   display unless the build finds it absent — then the binder sends one
   uncarded list line before asking).

**S3 — `look` is plural.** Its `target` becomes `type: objects`,
`onExcess: prompt` (names only, by S2). One bound thing → today's
single-target look, unchanged. Several → the list render (S5). A bare
`look` is still the room.

**S4 — One visibility rule**, a viewer-relative read on `PerceptionApi`
(already exempt from `lint:object-verbs` as viewer-relative):
`visibleContentsOf(viewer, target)` → `{ worn, held, carried }` filtered
by what this viewer may see:
- a PERSON (an agent with slots): occupants of slots that ACCEPT a
  wearable → `worn`; that accept a wieldable (the hands) → `held`; every
  other slot (an implant) and every pocket/pack content → hidden, unless
  `viewer === target` (your own: everything, pockets as `carried`);
- a CONTAINER: everything if open, nothing if sealed shut, concealed
  stays concealed (the shipped concealment filter);
- derived from what the slot `accepts`, never a list of slot names.
Both `look` and `inventory` call it, so they cannot disagree.

**S5 — One list render** (a LookController/InventoryController shared
shape — a module-private helper in each would be two copies of one
sentence, so it lives where both can reach it without a new module
category: the decision for the build is `Mml.list` + per-item relation
from `via`, rendered by a method on the perception logic the two verbs
call). Each entry: the thing's presentation + its relation to the viewer,
from the match's `via`: placement (*on the table*), worn/held, or the
horizon's glance — `MqlMatchVia` gains an optional `glance`
(bearing/range) that the `horizon` seed attaches per match, so the list
never calls `horizonFor` twice. Owned set → the owner's own description
heads it; unowned set → no header. Featured (landmark / room `featured`)
sorts first.

**S6 — The summary.** `look` at a container or person lists inline up to
FOUR things (the shipped `Mml.list` block threshold), else the first four
and *"and N more things — `inventory <it>`"*.

**S7 — `inventory` is the ledger for anything.** Optional `target`
(`type: object`, scope `reachable`); none → yourself. Grouped *worn /
held / carried* for a person (S4), the contents for an open container, a
shut one refuses in words (*"the chest is shut"*). `look in <thing>` (the
`in`/`inside` prepositions `look` already declares) routes to the same
ledger. The help text's worn/wielded promise becomes true.

**S8 — Cards.** A set has no single subject, so a plural `look` opens no
card this build (prose only); a single target opens one as today. The
list card is a deferred seam → card-surface slate.

**S9 — Deletions.** `MqlApi.namesWholeScope` / `MqlLogic.namesWholeScope`,
the binder's raw `horizon` special case, `LookController.lookAtHorizon`'s
bespoke render (the horizon becomes a SET rendered by S5, the empty case
still *"Nothing beyond where you stand catches the eye."* when the set is
the horizon and empty).

### Waves

- **D1 — the result and the binder.** S1, S2, S9's MQL half. Tests: a
  name vs a set on the result; player quantity overrides the default; a
  hard limit refuses in words; a set never prompts; a name prompts.
- **D2 — the visibility rule and the list.** S4, S5 (+ `via.glance` on
  the horizon seed). Tests: a person's worn/held only, never pockets or an
  implant; your own everything; shut container nothing; the list's
  relation per kind; owned vs unowned header.
- **D3 — plural look.** S3, S6, S8, S9's look half. Tests: `look horizon`
  lists with glances, `look all brass` lists, `look 2nd brass` one,
  `look brass` prompts; the person branch shows worn/held only (the leak
  closed); summary past four.
- **D4 — inventory.** S7. Tests: self grouped; container; person;
  shut refuses; `look in` routes to it.
- **D5 — content, drive, docs.** A container with more than four things
  and two same-keyword things where the drive stands (rows), drive steps
  27–30 appended and steps 19/23/24 re-asserted against the list render,
  docs (perceiver, command-spec § cardinality, mql-grammar § how many,
  inventory/look help), `pnpm test`, cold re-drive, push.
### Revision 2 — build log

- ✅ **D1–D4, one commit** (`11a2458a1`) — D1 alone would have left `look
  horizon` refused as *too many* (a set in a one-thing slot) until D3 made
  `look` plural, so they land together.
  - **B-64 (S1 as built):** the result field is `isSet?: true` — present
    only for a set, so every existing caller (absent = a name) is
    unchanged. A single referent (`here`, `me`, `it`, `#id`) is NOT a set
    (a bare `look` is the room, not a list of it); a single referent
    stepped through set steps (`me:i`) is.
  - **B-65:** the binder needed a third number beside min/max:
    **`cardinality.named`** — how many a plain NAME takes. A plural slot
    with no limit never prompts, yet `look brass` (two) must ask. `look`
    is `type: objects, cardinality: { named: 1 }`. Schema, load-time check
    (`named ≤ max`) and `CardinalitySpec` carry it.
  - **B-66:** a player COUNT on a one-thing slot stays what it always was —
    units off the top stack (`drop 5 coins`) — so the player's word means
    *take the top, never ask*; only `all`/a count past a plural slot's hard
    `max` refuses in words.
  - **B-67 (S5 corrected):** `MqlMany` keeps `via` only when every match
    shares it, so per-item glances cannot ride the binder's result. `look`'s
    list asks `horizonFor` once and annotates whatever listed thing is in
    view; no list helper module — the shared piece is the visibility rule
    plus `Mml.list`, and each verb's grouping heading is the relation.
    Passers-by are told when the set IS what is in view (derivable, no
    raw-text check); the empty-set line is neutral (*"You see nothing
    there."*).
  - **B-68:** `look` unwraps its binding with `MqlApi.extractStuffs`, so
    the one-thing shape still reads (39 shipped test models untouched).
  - **B-69:** the person rule applies to an AGENT with slots — a rack is
    slotted and wears nothing. Which slot is which is read off `accepts`
    (wearable → worn, wieldable → held) plus an outward face
    (`userFacingDetail`: a pack on the back is worn); a slot naming only a
    body part (the implant) is hidden.
  - **B-70:** `InventoryController.ledger` is a public static for exactly
    two callers (`inventory`, `look in`); class `@internal` per
    `lint:lib-statics`' caller audit, no ceiling rise.
- **D5:** a sea chest on the Hesper's deck (six things); drive steps
  27–30 (the prompt answered over the wire by starting the command and
  awaiting the prompt); the interiors' empty horizon now reads *"You see
  nothing there."*; docs — command-spec (who decides how many, `named`),
  mql-grammar (a set or a name), perceiver.
- **Next (sequenced with the user):** after !360 lands — catch up,
  port `AboardExit`/`AshoreExit` to build-4's async `canTraverse`
  (dropping `Exit.prepareTraversal`), take !360's Zone→SpatialZone
  fields; then the *shore as a place* slate (the water read reached by
  looking at the cited water BY NAME — no room hook; the vantage is
  already the zone `horizon`).
- **B-71 — the !360 merge** (`462586b68`). `AboardExit`/`AshoreExit`
  warm inside the async `canTraverse` (and in `computeDestination`, so
  a resolve that skips the gate still finds the node);
  `Exit.prepareTraversal` deleted. WeatherLogic takes master's
  `ClimateSite` beside the positional lean; the site is cached with
  the Locality so `peekSkyType` stays synchronous AND reads the right
  hemisphere. The sea fishery's season is `WeatherApi.seasonAt` at the
  cell's latitude (maritime, sea level); no sea ice (`Gunwale` memo
  `ice: null`). SpatialZone keeps `horizon` beside the geography block.
- ✅ **Revision 2 drive — 30/30 cold** (run 3 of 3). Found:
  | # | found | fixed |
  |---|---|---|
  | R2-1 | ⚠ the binder never copied `isSet` onto the BOUND result, so `look horizon` with one thing in view rendered that thing's own look | `isSet` rides the bound `MqlManyResult`/`MqlOneResult` |
  | R2-2 | ⚠ an EMPTY set lost `isSet` in `walkScopes` (no scope found anything → a bare `{stuff: []}`) — an interior's `look horizon` said *"You don't see any 'horizon'"* | an empty set stays a set |
  | R2-3 | drive: a pick-MANY prompt (`look`'s plural slot) answers with a JSON array of ids, and the envelope is read by what it carries | the step reads `promptId`/`stuffId` by pattern |
  | R2-4 | ⚠ NOT FIXED (finding 11 again, the focus owner's): after going below, `$focus` still points into the hold, and `measure`'s scope tries `$focus` first — `measure bearing light` bound the hold LAMP | the drive says `measure bearing horizon:light` |
  ⭐ Proven on the wire: your own ledger grouped; another player's look and
  ledger show what they wear and hold and never the implant; a chest of six
  names four and points at `inventory chest`, whose ledger (and `look in`)
  lists all, and shut it refuses; `look greywater` ASKS which chart and the
  answer reads one, `look all greywater` lists both, `look 2nd greywater`
  reads one; every revision-1 step still green through the plural `look`.

## ⭐⭐⭐ Revision 3 — the shore as a place (2026-10-11, after the !360 merge)

Decided in conversation with the user during review. The product half is
the requirements' *The shore as a place (revision 3)* section, its
Non-goals / Collisions / Lens-pass additions, drive steps 31–39 and
ACs 49–55; the seed is `docs/slates/builds/shore-as-place-slate.md`
(its two rulings at the top bind: no room-level prose hook, the vantage
needs nothing). Same MR, by the user's decision. **Supersedes** the
water pack's `Shore` Thing, `Gunwale`, the six prop rows that stand in
for a water, and fishing's `reachable:[class.Shore]` binding.

### Grounding (verified 2026-10-11; K = `packages/server/src/mud`, W = `packages/content/water/src`, F = `packages/content/trade-fishing/src`)

- **Details.** `DetailedMixin` K/lib/description/Detailed.ts:212;
  `Location` composes it (K/lib/stuff/Location.ts:160-170, the base of
  every room). `details` is `{ instruction: true, authorable: true,
  inherit: 'by-key' }` and ⛔ NOT persistent (:285, two drive-found
  reasons in the comment). `applyDetails` (:557-603) reads `keywords`,
  `description` and the five sense slots and **drops every other key
  silently** — a citation cannot ride inside a detail entry.
  `getDetail(id, senseOrParent?, parent?, viewer?)` (:367) is SYNC;
  `getDetailFor(viewer, id, sense='vision')` (:399) is what `look
  <detail>` calls; `getDetailEntry(key, viewer?)` (:647) returns the
  alias-grouped entry — the way a typed alias (`kestrel`) is turned back
  into its entry.
- **The dynamic-detail precedent.** `PublicLightingMixin.getDetail`
  (K/lib/perception/PublicLighting.ts:179-224): the MIXIN FIELD names the
  detail key (`publicLighting.detail`, bank.yaml `detail: lamps`), the
  override calls `Base.prototype.getDetail` then appends a live line when
  `id === spec.detail` and `senseOrParent === undefined || === 'vision'`
  (⚠ :197-205 records the `!== undefined` bug that hid the line for
  months; `Crossing.getDetail` K/platform/location/Crossing.ts:49-71 is the
  same shape). ⚠ It drops the 4th `viewer` argument when calling base;
  the shore's read needs it (the fishery band is per viewer).
- **`Street`** (K/platform/location/Street.ts): `class Street extends
  PublicLightingMixin(SingletonCartesianLocation) {}` — the worked
  precedent for *a mixin on the places that have the thing, never on the
  base*; its header is the base-class-narrowing correction in full.
- **MQL.** `candidatesForHere` K/api/mql/scope-walk.ts:60-97 yields the
  room, then `pushDetails` (:344-371) one candidate PER ALIAS with
  `stuff: host, via: { detailPath: [id] }`. A `[mixin.X]` filter
  evaluates the candidate's stuff — the room — so every detail candidate
  of a Shore room passes `[mixin.ShoreMixin]`; `finalize`
  (resolver.ts:1800-1823) dedups by stuffId. Controllers read
  `model.x.via?.detailPath`. `MqlOneResult.raw` is the typed text
  (`Reading.resolveSubject` K/lib/instrument/Reading.ts:895-930 hands it to
  `analyze()` as `param`, and hands a NAMED detail's stuff — the room —
  as `target`).
- **Bulk.** `BulkableApi.slotFor(holder, affordance)` K/api/bulk.ts:123 →
  `BulkableLogic.slotFor` K/platform/idea/api/BulkableLogic.ts:76-86:
  `null` unless `isBulkable`. 48 callers; the three this revision touches
  pass `model.x.via?.bulk?.affordance` (FillController:49/:62,
  DrinkController:45, WashController:232 passes `undefined`).
  `mustHaveBulkSlot` (K/lib/command/validators/mustHaveBulkSlot.ts:33-43)
  refuses `"<x> doesn't hold liquid"` when `slotFor(stuff, undefined) ===
  null` — its header says it deliberately asks the BROADER question than
  the controller. `BulkSlot` (K/lib/bulk/Bulkable.ts:242-340) is a handle
  over `host: Stuff & Bulkable` delegating every read/write to the host's
  slot-policy methods; `getHolder(): Stuff & Bulkable`. `transfer`'s
  thermal step (BulkableLogic.ts:393-405, 579-595) blends ONLY when
  `MixinApi.isThermal(from.getHolder())`. `computeApplied` (:735-760):
  `kind: 'all'` → `min(sourceAvail, destRoom)`, and with `to === null`
  (`drink`) and an unbounded source that is `min(∞, ∞)` — **a latent
  hazard for the shipped tap, fatal for a river**. `UnboundedSourceMixin`
  (K/lib/bulk/UnboundedSource.ts) overrides three policy seams
  (`getBulkAvailable → ∞`, `isBulkEmpty`, `debitBulk → no-op`);
  `WaterFixture` (K/platform/thing/WaterFixture.ts) is
  `UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)))`, `suppliedBy`
  → empty when the main's `supplyStateNow() !== null` (a TAP REFUSES
  fouled; the river must DELIVER it), affords `wash` on `peers` (:170-185).
  `BulkableMixin.commandContributions` (Bulkable.ts:460-475) grants
  `fill`/`drink`/… on `peers` + `environment`, never `inventory`.
  `drink` ingests via `Freshness(fromSlot).ingestPayload()` and
  `BulkableApi.ingest(giver, material, applied, payload)`
  (DrinkController:64, :115).
- **Materials.** `/stuff/idea/material/bulk/fouled-water` (water pack;
  `toxicity: [{dysentery, 12}]`, `purifiedByBoiling → water`, tags incl.
  `water` — its comment names the tag/leaf split);
  `/stuff/idea/material/bulk/salt-water` (base-library; tags `liquid,
  brine, conductive`, NO `water` tag, `nutrients: []`, `edibility:
  false`). `hasTag('water')` readers: WashController:236,
  CoolController:120, RinseController:140 (+ the craft matcher by the
  fouled-water comment).
- **Fouling.** `Conduit` W/thing/Conduit.ts:539-547: `fouled` iff
  `foulingOf(contaminationAt(reachRef).level) > dial(water.fouledAt)`
  (0.35, W/../content/settings/water.yaml:149). `WatercourseCatalogue.
  contaminationAt(ref, nowS)` :748-800 sums every discharge with
  `hops === 0` when `at === ref`, divided by `flowAt`. The outfall row
  (`city-outfall.yaml`: `direction: disposal`, `reachRef:
  kestrel:confluence`, `dischargeLoadPerSecond: 0.6`, `on: true`) and the
  intake both cite `kestrel:confluence` — so the bank's reach carries the
  outfall's whole load at hops 0, diluted by the confluence's flow. ⚠
  Whether that exceeds 0.35 is NOT grounded by any shipped-row test
  (`Contamination.test.ts` uses synthetic `kestrel:town`/`kestrel:mill`
  reaches); W3's drive step 34 grounds it, and W1 adds a probe test (see
  Risks).
- **The water pack's reads to move.** W/thing/Shore.ts — `ShoreMemo`,
  `refresh()` per `SEGMENT_S = 6 h` gated on the world clock being
  resident, `readWater` via `cat.reachOf` / `registry.standingAt` /
  `cat.iceAt`, `bandOf(viewer)` from setting
  `water.fishery.readDiscipline`, `physicalRead` (name · breadth ·
  current/salinity/temperature/hardness · *an outfall discharges* · the
  ice lines), fishery lines `registry.readFor(standing, band)` (the only
  per-viewer piece). W/thing/Gunwale.ts — `getReachRef()` =
  `"<expanse>@<lat.1>,<lon.1>"` off the craft (`StructureCatalogue.
  structureOf(roomPath)` → `row.path`, `isPositioned`), `readWater` →
  `WaterExpanse.seaReadAt(pos, room)` + `standingAt`, `ice: null`.
  `FisheryRegistry.standingAt(ref, nowS)` :166 routes `@` refs to
  `seaStandingAt` :226; `readFor(standing, band)` :292 sync.
  `WatercourseCatalogue.iceAt` :427 → `IceRecord { thicknessM, kind,
  rotting, reason }`; `reachOf` :460; `waterStateAt(ref, nowS)` gives
  `temperatureK`. `WaterExpanse` (W/idea/WaterExpanse.ts:74) `extends
  Expanse` (K/lib/expanse/Expanse.ts:122, `abstract class Expanse extends
  SingletonMixin(SpatialZone)`); `waterStateAt(pos)` :185 →
  `temperatureK`, `salinityPpt`; `seaReadAt(pos, scope)` :145.
  `Expanse.peekShorePositionFor(placePath)` :450 is SYNC, kicks a compile
  and answers `null` the first cold call (PerceptionLogic.ts:1304 already
  consumes it this way for the headland horizon).
- **Fishing.** fish.yaml:59-65 / lay.yaml:31-37 / release.yaml:16-22:
  `shore` arg, `default: "reachable:[class.Shore]"`, `requires: any`.
  `FishingController.reachFor` (F/idea/cmd/fishing/FishingController.ts:
  33-40) duck-types `getReachRef`, else `Waters.reachAt(room)` (F/idea/
  Waters.ts:65, the Locality's `getReach()`). Brains `fishes.ts:73-85`,
  `reads-water.ts:129-140` read `config.shore` (a Shore path →
  `getReachRef`); the fisher row (`terminus/…/wharfside/agent/fisher.yaml:
  49-55`) carries it twice.
- **`analyze water`.** W/idea/reading/WaterReading.ts: targeted (:119-122
  → `reportOn` :210, duck-typed `supplyReport`), bare (:124-206, the
  Locality's reach → flow/snow/navigability + the ice line by `physics`).
- **The seam precedent.** `GroundSourceMixin` K/lib/ground/GroundSource.ts
  (one `@hook` method, `null` = *I don't know*); `Floor.groundBeneath`
  K/lib/ground/Floor.ts:512-536 finds implementers by **cited template
  path** (`StuffApi.findByTemplatePath`, resident only) then by the dial
  `AppSettingKeys.groundDefaultSourcePath` (K/lib/config/AppSettings.ts:
  1538; set by `packages/content/ground/content/settings/ground.yaml:15`),
  narrowing `MixinApi.isGroundSource` (K/api/mixin.ts:1703). `Mixins.
  GroundSource` K/lib/mixin.ts:413 + its refusal phrase :804.
  `MixinConstructor` (K/lib/mixin.ts:21) admits `abstract new`, so a
  pack may compose a kernel mixin onto `Expanse`.
- **Rows.** bank.yaml (`class: Street`; details `lamps` · `line` · `river`
  [keywords river, kestrel, water, confluence, delight] · `steps` ·
  `arch`; `props:` river-edge :133); world-seed `moor/stormy-heath.yaml`
  (SCL, no details, prop `heath-mere`; ⚠ `mere` is the heath floor's pool
  keyword); `north/shore.yaml`, `circle/shore.yaml`, `circle/bare/
  shore.yaml` (SCL, no details, props blackmere/circlemere/clearmere; ⚠
  the room keywords include `mere`); `hesper/deck.yaml` (SCL, prop
  gunwale); `estuary/strand.yaml` (SCL, prop still-water — stays);
  `estuary/headland/brow.yaml` (SCL, zone `headland.yaml` `horizon:
  [/stuff/idea/WaterExpanse/greywater, …]`). The Hesper's
  `structure.yaml`: `extent: /world/terminus/hesper`, `expanse:
  /stuff/idea/WaterExpanse/greywater`. Prop rows to delete: wharfside/
  thing/river-edge, moor/heath-mere, north/blackmere, circle/circlemere,
  circle/bare/clearmere (the three set `_materialPath`), hesper/thing/
  gunwale. The estuary `tide.yaml` is a `WaterFixture` of salt-water and
  stays (it is a fixture at the mouth, not a shore).
- **Tests and drives that bind the objects.** `terminus/src/__tests__/
  fishing-content.test.ts:51-56,157-161`; W `__tests__/Shore.test.ts`,
  `Ice.test.ts`, `WaterExpanse.test.ts:20,125` (a `Gunwale`); F
  `Waters.test.ts:25`, `behavior/__tests__/brains.test.ts:90-94`,
  `idea/cmd/fishing/__tests__/verbs.test.ts:101-115`; transport
  `IceCrossing.test.ts`; wire `fishing.dirty` (`peek edge` :257, `peek
  tarn` :551), `maritime-space.dirty` (`look edge` :175, `look --peek
  gunwale` :509), `climate-and-water.dirty` (`analyze water` at the circle
  shores :280, :367 — bare, unchanged by the move), `reachability.dirty`
  :484 (a comment). Comments: swim.yaml:10, StillWater.ts:16,
  trade-quarrying `Working.ts:191`, fish.yaml:56, `Waters.yaml:2`,
  `Discipline/fishing.yaml:4`. ⚠ `trade-mining`'s `ShoreController` is the
  `shore` TIMBERING verb — unrelated, untouched.
- **Gates.** `lint:family --list` (2026-10-11): the roster includes
  `lint:mixin-names`, `lint:instanceable`, `lint:lib-statics`,
  `lint:on-create` (ceiling 82 / loading 35 — `check-on-create.ts:72,79`),
  `lint:object-verbs`, `lint:unconsumed-seams` (⚠ an un-overridden `@hook`
  counts; the ceiling may not rise — so a seam and its first implementer
  land in ONE wave), `lint:reachability`, `lint:location-graph`,
  `lint:locations` (an enumerated `FurnishableRoom` roster — a new
  Location class that is not Furnishable is outside it),
  `lint:verb-collisions`, `lint:instrument-args`, `check-field-meta
  --lint` (a bare-persistent Map is refused; a plain object is fine).

### Decisions

**T1 — Two classes, one kernel mixin, no base-class claim.**
`ShoreMixin` (K/lib/location/Shore.ts — `lib/location/` already exists;
no new subsystem folder) composes onto exactly two new instanceable
classes: `platform/location/Shore.ts` — `class Shore extends
ShoreMixin(SingletonCartesianLocation) {}` (the five mere/heath/deck/
strand/brow rows) and `platform/location/Quay.ts` — `class Quay extends
ShoreMixin(Street) {}` (the lit public waterfront: the bank). Never on
`Location`/`CartesianLocation` — `Street`'s header is the correction this
follows. What composing it claims: *this place is beside a named water*
and nothing else; seven rows in the realm say so, and nothing else pays
a field, a memo or a verb. The mixin file and the class file share a
basename in different directories (the `platform/thing/Thing` ↔
`lib/stuff/Thing` precedent); the mixin exports `ShoreMixin`, marker
`static _mixinName: string = 'ShoreMixin'` (⚠ widened to `string`).

**T2 — The citation is a mixin field keyed by detail, never inside the
detail.** `applyDetails` drops unknown keys, so (the PublicLighting
shape) the mixin field names the detail:

```yaml
class: /platform/location/Quay
data:
  details:
    river: { keywords: [river, kestrel, water, confluence], description: … }
  waters:
    river: kestrel:confluence
```

`waters: Record<string, string>` — a plain object (never a `Map`), each
key a detail id or alias of THIS room, each value an **uninterpreted
citation string** the kernel stores and never parses. Declared `{
instruction: true, authorable: true, inherit: 'by-key' }` with a phase-2
`applyWaters(data)` applier — ⛔ NOT persistent, for `details`' own two
reasons (:285): a citation is authored content re-applied from the row on
every hydrate, so an edited row reaches a booted world and nothing
travels through `holder_snapshots`. `applyWaters` keeps the object;
resolution of key → detail entry is lazy at first read (`getDetailEntry`
over the alias group), because phase-2 appliers across two mixins have
no guaranteed order. A key that names no detail of the room warns once
at first read and is ignored (fail loud in the log, never silent).

**T3 — The seam: `WaterSourceMixin`, two implementers, found by the
ground ladder.** Kernel `K/lib/location/WaterSource.ts` declares the
capability *this Idea can read a cited water for a place*, three `@hook`
methods:

- `currentWaterRef(citation, place): string | null` — SYNC; the concrete
  ref to fish/analyze NOW (`kestrel:confluence` for a reach; the derived
  `"<expanse>@<lat.1>,<lon.1>"` for a sea), `null` when not yet knowable;
- `readWater(citation, place, nowS): Promise<WaterRead | null>` — ASYNC;
  `null` = *this source does not know this water*;
- `waterLinesFor(read, viewer): string[]` — SYNC, per viewer: the
  physical read for everyone, then the fishery read at the viewer's band.

`WaterRead` (a kernel value type beside the mixin): `{ ref: string; atS:
number; name: string; pending?: true; frozen: boolean; draw: {
materialPath: string; temperatureK: number } | null; opaque?: unknown }`
— the kernel reads `ref`/`atS`/`name`/`pending`/`frozen`/`draw` and
hands `opaque` back untouched. Implementers (both in the water pack,
composing the kernel mixin by package specifier): **`WatercourseCatalogue`**
(reach refs: `reachOf` · `waterStateAt` · `contaminationAt` · `iceAt` ·
`standingAt`; `draw` is `fouled-water` when `contaminationAt(ref).level >
dial(water.fouledAt)` — the Conduit rule WITHOUT a treatment factor, a
river treats nothing — else `water`, at `waterStateAt(ref).temperatureK`;
`frozen` when `iceAt(ref).thicknessM > 0`, `draw: null`) and
**`WaterExpanse`** (`class WaterExpanse extends WaterSourceMixin(Expanse)`
— `MixinConstructor` admits the abstract base; sea refs, T11). The finder
ladder in the kernel mixin, mirroring `Floor.groundBeneath`: (1) a
citation that is path-shaped (`startsWith('/')`) → `StuffApi.singleton
(citation)` narrowed `MixinApi.isWaterSource` (the sea: the expanse row IS
the source); (2) else the realm's default source, `AppSettingKeys.
waterSourcePath` (`water.sourcePath`, a kernel key the water pack's
`settings/water.yaml` sets to `/system/water/idea/WatercourseCatalogue`
— the `ground.defaultSourcePath` shape exactly). No new collection, no
new Api, no free helper; the two implementers satisfy *a hook needs more
than one implementer*, and `lint:unconsumed-seams` is why the seam and
both implementers land in the same wave. `Mixins.WaterSource`,
`MixinApi.isWaterSource`, refusal `"{} can't read a water"`.

**T4 — The memo lives on the room, per cited detail, and nothing warms
it at birth.** `ShoreMixin` keeps a transient `Map<detailKey, { read:
WaterRead | null; refreshing: Promise<void> | null }>` (not persistent,
not a field). Refresh policy (`Shore.ts`'s, moved): kicked
fire-and-forget from `getDetail` and awaited by `settleWater(key)`;
refreshes when there is no memo, when `nowS − atS ≥ SEGMENT_S` (6 game
hours, a module-private const), when `currentWaterRef(citation) !==
memo.ref` (the deck moved a cell), or when the memo is `pending`; gated
on `StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)` as
today. ⛔ No `onCreate` — `lint:on-create`'s ceiling (82) does not move;
lazy first use is the sanctioned initializer.

**T5 — `getDetail` appends the read; the room's prose is untouched.**
`ShoreMixin.getDetail(id, senseOrParent?, parent?, viewer?)` calls the
base WITH all four arguments, and when `id` resolves (via the alias
group) to a cited key and the sense is visual (`undefined || 'vision'`,
the Crossing/PublicLighting bug avoided) returns `base + '\n\n' +
lines`, where `lines` is `source.waterLinesFor(read, viewer)` for a
landed read, *"The water is hard to read yet."* for none/pending, and
*"Nothing here can read this water."* (+ one `console.warn`) when the
source returned `null`. `look river` therefore renders the author's words
then the water's; `look` on the room renders nothing new (AC 49).

**T6 — The mixin resolves a name to a water and RETURNS refusals.**
`waterFor(name?: string): WaterPick` where `WaterPick = { key: string;
citation: string } | { refusal: string; reason: 'not-water' |
'which-water' | 'no-water' }`. Named: `getDetailEntry(name)` → the entry
whose ids intersect `waters` keys, else `not-water` (*"The lamps are not
water."*). Unnamed: one cited water → it; two or more → `which-water`
(*"Which water — the Kestrel or the Delight?"*, the names from each
memo's `read.name` when landed, else the detail key); none → `no-water`.
`async waterRefFor(name?)` = `waterFor` + `settleWater(key)` +
`currentWaterRef` → `{ ref } | { refusal, reason }` (pending → `{ refusal:
'The water is hard to read yet.', reason: 'unread' }`). Controllers
render what they are handed and decide nothing (*mixin authoritative,
controller dumb*). Both are methods ON the room; no `ShoreApi`.

**T7 — Fishing binds the place.** fish/lay/release: `default:
"reachable:[mixin.ShoreMixin]"`, `requires: any` unchanged. A bare verb
binds the room with no via; `fish kestrel` binds the room with
`via.detailPath: ['kestrel']`; `fish at lamps` binds the room with
`['lamps']`. `FishingController.reachFor(giver, shore)`: when
`MixinApi.isShore(shore.stuff)` → `await stuff.waterRefFor(shore.via?.
detailPath?.[0])`, a refusal → `decline(ctx, line, reason)`; otherwise
(no shore bound) `Waters.reachAt(room)`. The `getReachRef` duck-typing
goes. The wharfside fisher keeps the bank's reach because the bank cites
ONE water (T13).

**T8 — Brains fish where they stand, through ONE place.** `Waters.reachAt
(room, name?)` becomes *the reach a room fishes*: `isShore(room)` →
`room.waterRefFor(name)` (a refusal → `null`), else the Locality's
`getReach()`. `fishes.ts` and `reads-water.ts` drop `shoreReach` and
`config.shore` and call `waters.reachAt(room)`; `fisher.yaml` loses both
`shore:` lines. `Waters.test.ts` and `brains.test.ts:90-94` follow.

**T9 — Drawing: a `SourceSlot` the room hands out, through `slotFor`.**
- `K/lib/bulk/SourceSlot.ts` — a value-object class, `class SourceSlot
  extends BulkSlot`: constructed with the room and a `WaterRead.draw`;
  `getMaterialPath` → the drawn material, `getAmount` → `∞`,
  `getCapacity` → `null`, `available()` → `∞`, `isEmpty()` → `false`,
  `debit()` no-op (⭐ drawing never depletes), `getPayload()` → `null`,
  `setPayload` no-op, `remaining()` → `∞` (a river takes what you pour
  — recorded, not designed), `getTemperatureK()` → the water's.
- `BulkSlot` gains `getTemperatureK(): number | null` (the host's
  temperature when `isThermal`, else `null`) and `transfer`'s step 6
  reads `from.getTemperatureK()` instead of narrowing the holder — the
  same number for every existing slot, the water's for a `SourceSlot`.
  `BulkSlot`'s host and `getHolder()` widen to `Stuff` (a `SourceSlot`'s
  holder is a room); the base delegations narrow once internally, and the
  ~10 bulk callers of `getHolder()` already narrow (`isThermal`,
  `isGraded`, `isMaturing`) or only need a `Stuff`. Build audits each.
- `BulkableLogic.slotFor(holder, affordance, named?)`: not Bulkable and
  `MixinApi.isShore(holder)` → `holder.waterSlot(named)` (the mixin:
  `waterFor(named)` → a landed, unfrozen read with `draw` → `new
  SourceSlot(this, read.draw)`; else `null`, kicking a refresh). `named`
  is `via?.detailPath?.[0]`. `BulkableApi.slotFor` gains the optional
  third parameter; the 48 existing callers are unchanged.
- `BulkableApi.whyNoSlot(holder, affordance, named?): string | null` —
  one sibling static on the SAME per-subsystem Api: `isShore(holder) ?
  holder.waterRefusal(named) : null`. The mixin owns the words: frozen
  (*"The mere is frozen from bank to bank; nothing comes up but ice."*),
  which-water, not-water, unread (*"You cannot tell what you would be
  drawing yet."*), no draw. Fill (source), Drink (target) and Wash
  (water) use it in the null-slot branch they already have: `whyNoSlot(…)
  ?? <today's line>`. Nothing else in the controllers changes.
- `mustHaveBulkSlot` passes when `slotFor(stuff, undefined) !== null ||
  whyNoSlot(stuff, undefined) !== null` — *a slot, or a diegetic reason
  there is none right now* — which is the header's own "broader question"
  and the doctrine *afford statically, decline diegetically*. A frozen
  mere offers `fill` and refuses in words; a room that is not a shore
  still cannot be drunk from. `requires: VisibleMixin` on fill/drink's
  args: a room is Visible, passes.
- `drink` with no measure from an unbounded source: `computeApplied`
  clamps `kind: 'all'` to `dial(bulk.draughtL)` (`AppSettingKeys.
  bulkDraughtL`, default 0.25 L, set in the platform pack's settings)
  when `to === null && !Number.isFinite(sourceAvail)`, with a
  `quantity-clamped` note — a river has no "all", and the shipped tap had
  the same hole.
- `wash`: the `water` arg becomes `requires: any`, `default: "reachable:
  [mixin.BulkableMixin],reachable:[mixin.ShoreMixin]"` (`,` is MQL's
  union, mql-grammar.md:66). This does not delete a check: the memory's
  rule is about collapsing two ACTS; `wash` is one act with a second kind
  of source, and the existing `findWater` narrowing (a slot whose material
  is water) is the refusal (*no water in reach*). `findWater` calls
  `slotFor(c, undefined, named)` so the shore path is the generic path.
- **Salt water washes.** `findWater` accepts a material tagged `water` OR
  `brine` (salt-water's own identity tag). ⛔ Not by giving salt-water the
  `water` tag — the craft matcher reads it and seawater would brew ale.
  `cool`/`rinse` stay fresh-only (unasked; recorded). Drinking salt water
  needs nothing: `nutrients: []` means no hydration, and `DrinkController`
  has no edibility gate (grounded).
- No rights check anywhere on the draw path (`WaterRightRegistry` is never
  consulted) — AC 52's *nobody's standing is asked*.

**T10 — `analyze water` reads the room's water before the Locality's.**
`WaterReading.analyze`: with a target that `isShore` (a named detail
binds the ROOM as `target` with `param` the typed word, per
`resolveSubject`) → `target.waterRefFor(param)`, a refusal rendered in
its words; with no target and the giver's place a shore →
`place.waterRefFor()` (one water → its ref; two → the which-water
refusal; none → fall through to today's Locality read). The reach report
(flow · snow · navigability · the ice by `physics`) is factored out of
the bare branch into `reachReport(ref)` and both paths call it; an `@`
ref (a sea) reports the sea's `waterStateAt` in the same shape (salt,
temperature) instead of *"nothing here knows what is running through
it"*. `reportOn(target)` (a conduit/tap's `supplyReport`) is unchanged.
⭐ The read never says *fouled* (AC 53): `analyze water`'s lines are
already the gauge, and the look read's *an outfall discharges into this
water* is a fact about the map, kept.

**T11 — A deck and a beach cite the sea; the position is derived by the
implementer.** In `WaterExpanse`: `currentWaterRef(citation, place)` —
the craft of `place` (resolved once per place path through
`StructureCatalogue.structureOf(place.getTemplatePath())`, cached on the
expanse; before the first async resolve → `null`) → `"<path>@<lat.1>,
<lon.1>"` off `getExpansePosition()`; a place in no craft →
`peekShorePositionFor(place.getTemplatePath())` (the headland's own
mechanism, PerceptionLogic:1304) → the same grammar, or `null` on the
cold first call. `readWater`: resolve the craft, derive the ref; `null`
ref → `{ pending: true }` (*"hard to read yet"*, retried on the next
look); else `seaReadAt(pos, place)` + `standingAt(ref)` → `name: this.
getName()`, `frozen: false` (no sea ice is modelled), `draw: {
salt-water, waterTemperatureK }`, `opaque: { standing }`;
`waterLinesFor` → the sea line + `registry.readFor(standing, band)`.
The `Gunwale`'s cell-change refresh is T4's `currentWaterRef !== memo.ref`
rule. Nothing is re-authored as she moves (AC 54).

**T12 — Retirement.** Delete W/thing/Shore.ts, W/thing/Gunwale.ts,
W/__tests__/Shore.test.ts; rewrite the `Gunwale` case in
`WaterExpanse.test.ts` against `currentWaterRef`/`readWater`; delete the
six prop rows; remove the six `props:` lines; fix the comments listed in
Grounding. No migration: the dev DB is dropped (the rows are content;
the memo was never persisted).

**T13 — The seven rows, and two keyword rules.**
- bank → `class: /platform/location/Quay`, `waters: { river: kestrel:
  confluence }`; ⚠ drop `delight` from the `river` detail's keywords —
  `look delight` must not answer *This is the Kestrel*. ONE water, so the
  fisher's bare `fish` and step 33 hold; a second (Delight) citation is a
  deferred seam, not content.
- stormy heath → `Shore`, detail `tarn: { keywords: [tarn, "black mere",
  black-mere, peat-water], description: <the heath-mere prose> }`,
  `waters: { tarn: holloway:head }`. ⛔ Not `mere` (the floor pool's
  keyword) and not `water` (the pool's too) — the requirement's own
  ruling: *the heath's water answers to black mere and tarn*.
- the three mere shores → `Shore`, detail `mere: { keywords: [mere,
  water, ice, <blackmere|circlemere|clearmere>], description: <the old
  prop's prose> }`, `waters: { mere: <key>:mere }`; ⚠ remove `mere` from
  each ROOM's `keywords` (`[shore, mere, …]` today) so `look mere` cannot
  resolve to the room ahead of its detail (the dedup-by-stuffId risk —
  see Risks). `_materialPath` lines die with the prop rows (a mere shore's
  ground is the floor's).
- deck → `Shore`, details `sea: { keywords: [sea, water, over, side],
  description: "Below the rail, the water." }` and `gunwale: {…the rail's
  old prose…}` (a rail is not water), `waters: { sea: /stuff/idea/
  WaterExpanse/greywater }`.
- strand → `Shore`, detail `sea: { keywords: [sea, greywater, bay] }`,
  `waters: { sea: /stuff/idea/WaterExpanse/greywater }` (the pool stays a
  place with `still-water` in it).
- headland brow → `Shore`, detail `sea`, same citation (step 38).

**T14 — Who affords the draw verbs at a shore.** `ShoreMixin.static
commandContributions = { inventory: ['platform/cmd/bulk/fill.yaml',
'platform/cmd/bulk/drink.yaml', 'platform/cmd/crafting/wash.yaml'] }` —
the room is the player's CONTAINER, and a container grants inward on
`inventory` (drive finding 10; `Boat`); `peers`/`environment` would reach
nobody. Mixin statics union down the chain (Bulkable, Wearable do this).
`lint:reachability` sees the three views conferred by a class a row
names.

**T15 — Registry + dials.** `Mixins.Shore: 'ShoreMixin'`, `Mixins.
WaterSource: 'WaterSourceMixin'`; refusals `ShoreMixin: "{} isn't beside
any water"`, `WaterSourceMixin: "{} can't read a water"`; `MixinApi.
isShore`, `MixinApi.isWaterSource` (the `isGroundSource` shape).
`AppSettingKeys.waterSourcePath` (`water.sourcePath`) and
`AppSettingKeys.bulkDraughtL` (`bulk.draughtL`).

**T9′ — (the user's ruling on the plan, 2026-10-11) the refusal rides the
SLOT; no `whyNoSlot`.** ⛔ No new Api static whose first parameter is a
world object (`lint:object-verbs` holds at zero; *"it saves three callers"*
is not a reason). Instead `BulkSlot` gains `whyEmpty(): string | null`
(base: `null`), and for a shore room `slotFor` ALWAYS returns a
`SourceSlot` for the water as named — one that cannot deliver (frozen,
unread, which-water, not-water, no draw) is EMPTY and carries the
mixin's words in `whyEmpty()`. Fill / Drink / Wash's existing
empty-source branch prints `slot.whyEmpty() ?? <today's line>`.
`mustHaveBulkSlot` is unchanged (a shore always has a slot), so the
"slot OR diegetic reason" broadening of T9 is dropped with it.

**T16 — (the user's ruling) the outfall is honest.** If W1's probe finds
`kestrel:confluence` reading clean under the shipped outfall, the
outfall's authored load is raised to what an untreated city sewer at its
own wharf actually does, so the confluence reads fouled in a dry month —
⭐ lens 1's dominant lesson needs the wharf below the sewer to be foul.
Not a second shore downstream; not a clean bank.

### ⭐⭐ Host placement

| what | host | what composing it claims about everything else on that host |
|---|---|---|
| `ShoreMixin` (`waters`, the memo, `getDetail`, `waterFor`/`waterRefFor`/`settleWater`/`waterSlot`/`waterRefusal`, `commandContributions`) | `platform/location/Shore` (over `SingletonCartesianLocation`) and `platform/location/Quay` (over `Street`) — **only** | seven rows are beside water; no cookhouse, cellar, field or deck-less room carries a `waters` field, a memo or `fill`/`drink`/`wash`. ⭐ The test: there is no `if (!this.waters) return` guard anywhere except the ordinary "this detail is not a cited one" branch of `getDetail`, which is a lookup, not a host re-narrowing |
| `WaterSourceMixin` | `WatercourseCatalogue` (W/idea), `WaterExpanse` (W/idea) | the catalogue already answers every reach question; the expanse already answers every sea question. Composing the seam on them adds a vocabulary, not a responsibility |
| `waters` field | `ShoreMixin` | an instruction field keyed by detail — a citation, like `SpatialZone.deposit`/`groundCharacter`, interpreted by the kernel nowhere |
| `WaterRead` value type | `K/lib/location/WaterSource.ts` | the kernel's half of the read; the pack's half rides `opaque` |
| `SourceSlot` | `K/lib/bulk/SourceSlot.ts` (a `BulkSlot` subclass) | bulk substrate learns *a slot whose holder is not a vessel*; it does not learn what a shore is. ⛔ The room is NOT `Bulkable`/`UnboundedSource`: that would put every shore room in `reachable:[mixin.BulkableMixin]`, leak liquid keywords into room scope through `pushBulk`, and say a bank *holds* water — the cited-never-contained ruling the whole revision keeps |
| `getTemperatureK` | `BulkSlot` | one method; every existing slot answers what it answered |
| `whyNoSlot`, `slotFor(…, named?)` | `BulkableApi`/`BulkableLogic` | the per-subsystem Api grows two members; no per-feature Api |
| `bulk.draughtL`, `water.sourcePath` | `AppSettingKeys` (kernel); values in the platform pack's and the water pack's settings | the `ground.defaultSourcePath` shape |
| `reachReport` | `WaterReading` (W) | a private method on the reading that owns the channel |
| `reachAt(room, name?)` | `Waters` (F) | the fishing pack's one answer to *which reach does this room fish* |

### Convention conformance (checked 2026-10-11)

- `props:`/`cast:` — the move DELETES six `props:` entries; nothing new
  is propped. `populates:` nowhere.
- Locations, not rooms — the two classes are Locations over
  `SingletonCartesianLocation`/`Street`; `FurnishableRoom` untouched
  (`lint:locations`' roster is unchanged).
- Namespace — kernel classes at `/platform/location/Shore` and
  `/platform/location/Quay`; rows in content packs name them exactly as
  they name `Street`. Mixins at `K/lib/location/`, substrate at
  `K/lib/bulk/`. The water pack's implementers stay at `/system/water/
  idea/…`; the `greywater` row stays at `/stuff/idea/WaterExpanse/…`.
- Module scope declares — one `const SEGMENT_S`; the memo is instance
  state, initialised lazily.
- Import boundary — the water pack imports the kernel by specifier
  (`@saxonberg/server/mud/lib/location/WaterSource`, `…/lib/bulk/…`;
  `./mud/lib/*` and `./mud/platform/location/*` are in the server's
  `exports` map). `FromModule` gates are absolute. No pack Api, no pack
  logic singleton, no free helper in either tree.
- Verbs on objects — `room.waterFor(…)`, `room.waterSlot(…)`,
  `source.readWater(…)`; `BulkableApi.slotFor/whyNoSlot` are the one
  existing orchestration surface the bulk family already routes through
  (`lint:object-verbs`' census stays where it is — `slotFor` is a
  pre-existing member and `whyNoSlot` is its sibling with the same
  signature shape; if the gate counts it, the build files it as the
  validator-and-controller surface it is, with the caller audit written
  down, rather than a doctrine quotation).
- Gates this build must satisfy: `lint:mixin-names` (two names
  registered), `lint:instanceable` (two instanceable classes under
  `platform/location/`, no `/lib/` row), `lint:lib-statics` (no new lib
  static beyond `_mixinName`/`fieldMeta`/`commandContributions`),
  `lint:on-create` (unchanged), `lint:unconsumed-seams` (three hooks,
  two overrides each, in one wave), `lint:reachability` (fill/drink/wash
  conferred by `ShoreMixin`; `fish`/`lay`/`release` as before),
  `lint:location-graph` (no exit changes), `lint:verb-collisions` (no
  new verb), `lint:instrument-args` (wash's `water` default stays
  declared), `check-field-meta --lint` (a plain-object instruction
  field), `lint:imports`, `lint:module-scope`, `lint:test-bootstrap`.

### Waves

Each lands green on `pnpm test:near` + every touched pack's vitest +
`lint:family`, and ends at a commit. The full suite runs once, before
review re-opens; the drive is the exit.

- **T-W1 — the place cites the water, and the water answers** (T1–T8,
  T11–T13, T15 minus the bulk dial). ⚠ One wave because
  `lint:unconsumed-seams` refuses a seam with no implementer and the old
  `Shore` cannot be deleted until `fish` binds the place. Internal order:
  (a) `WaterSource.ts` + `WaterRead`, `Shore.ts` mixin (field, applier,
  memo, `getDetail`, `waterFor`, `waterRefFor`, `settleWater`),
  `platform/location/Shore.ts`, `Quay.ts`, `Mixins`/refusals/predicates,
  `AppSettingKeys.waterSourcePath`; (b) the two implementers in the water
  pack + `water.sourcePath` in `settings/water.yaml`; (c) the seven rows
  re-classed with their detail + `waters:`, the six prop rows deleted,
  `props:` lines removed; (d) fish/lay/release defaults, `FishingController.
  reachFor`, `Waters.reachAt(room, name?)`, the two brains, `fisher.yaml`;
  (e) `WaterReading` (T10); (f) delete `Shore.ts`/`Gunwale.ts`/`Shore.
  test.ts`, rewrite `WaterExpanse.test.ts`'s gunwale case, fix
  `fishing-content.test.ts`, `Waters.test.ts`, `brains.test.ts`,
  `verbs.test.ts`, `Ice.test.ts`, `IceCrossing.test.ts`; the drive lines
  `look edge`→`look river` (maritime :175), `look --peek gunwale`→`look
  --peek sea` (:509), `peek edge`→`peek river` (fishing :257), `peek tarn`
  stands (:551); the comments. Tests (kernel, a fake `WaterSource`
  composed onto an `Idea` in the test, no pack import): `look river`
  renders base + lines with the viewer threaded; pending → *hard to read
  yet*; an unknown key warns once; `waterFor` named/unnamed/two/not-water;
  `currentWaterRef` change → refresh; no `onCreate`. Tests (water pack):
  the catalogue's `readWater` for a clean reach, a fouled reach (`draw`
  = fouled-water) and a frozen one (`frozen`, `draw: null`); the
  expanse's deck ref off a positioned craft and a beach ref off
  `peekShorePositionFor`, `pending` on the cold call. Tests (fishing):
  `fish` binds the room's water; `fish lamps` refused `not-water`; two
  waters prompt `which-water`; the brains fish the room they stand in.
  ⭐ A **fouling probe test** in the water pack against the SHIPPED rows
  (the outfall + the kestrel course): assert whether
  `contaminationAt('kestrel:confluence').level` is above or below
  `water.fouledAt` and record the number in the test name — W3 needs to
  know which shore draws fouled (Risks 3).
- **T-W2 — drawing** (T9, T14, `bulk.draughtL`). `SourceSlot`,
  `BulkSlot.getTemperatureK` + the holder widening, `BulkableLogic.
  slotFor(named)`/`whyNoSlot`/the draught clamp/step-6 via the slot,
  `BulkableApi`'s two members, `mustHaveBulkSlot`, Fill/Drink/Wash's null
  branches, `wash.yaml`'s `water` arg, `findWater` (brine, `named`),
  `ShoreMixin.waterSlot`/`waterRefusal`/`commandContributions`. Tests:
  `fill pail from river` fills with the read's material at its
  temperature; a fouled reach fills fouled-water; the sea fills salt-water
  (and `wash` accepts it, `drink` hydrates nothing); a frozen mere refuses
  with the ice line and the validator still admits the verb; `drink` from
  a tap or a river with no measure takes a draught, not `∞`; a pail is
  no lighter for the river (never depletes); a non-shore room still
  *doesn't hold liquid*; the 48 `slotFor` callers compile unchanged.
- **T-W3 — the drive, the docs, the sweep.** Steps 31–39 appended to
  `packages/wire/tests/maritime-space.dirty.wire.test.ts` (step 34's
  fouled draw at whichever shore W1's probe named; step 36 at the
  blackmere shore, whose sheet is a metre thick from day 0; step 37's
  *hard to read yet* loop as the gunwale step did it); re-run
  `fishing.dirty`, `climate-and-water.dirty`, `reachability.dirty`. Docs:
  `fishing.md § The shore, and the read` rewritten (the citation on the
  place; the `fishing.md` prop-defect paragraph closed by *the read is the
  water's own look*); `watershed.md` (+ *drawing at a shore*: the Conduit
  rule without treatment; the draught); `bulk.md` (`SourceSlot`,
  `getTemperatureK`, `whyNoSlot`, the draught clamp, a holder that is a
  room); `expanse.md:156` (the deck as a `Shore` of the sea; `Gunwale`
  gone); `location.md` (the two classes beside `Street`); `ground.md`
  (the seam pattern's second instance); `content-packs.md` (the water
  pack's class list); `navigable-water-slate § 5a` (the vehicle moved,
  the ruling kept); `shore-as-place-slate` → status BUILT, its tail
  kept. `pnpm test` once; cold drive; the drive record below.

### Reachability wiring

| link | fill / drink / wash at a shore | fish / lay / release | `look <water>` | `analyze water` |
|---|---|---|---|---|
| 1 · affordance | `ShoreMixin.commandContributions.inventory` (T14) | the fishing pack's rod/trap statics, as today | `look` is universal | `analyze` is universal; the `water` Reading row is the water pack's |
| 2 · scope/default | `reachable` (the room is in reach); wash's `water` default unions `[mixin.ShoreMixin]` | `default: "reachable:[mixin.ShoreMixin]"` | the detail candidate via `pushDetails` | `subject` → the room with `raw` = the word |
| 3 · arg gate | `requires: VisibleMixin` (a room passes); `mustHaveBulkSlot` admits a slot OR a diegetic refusal; wash `requires: any` | `requires: any` | — | the Reading's own `scope` |
| 4 · controller → mixin | `slotFor(stuff, affordance, via.detailPath[0])`, `whyNoSlot(…)` | `reachFor` → `room.waterRefFor(via.detailPath[0])` | `getDetailFor(viewer, id)` → `ShoreMixin.getDetail` | `target.waterRefFor(param)` / `place.waterRefFor()` |
| 5 · the seam | `ShoreMixin.waterSlot` → memo → `source.readWater` | `currentWaterRef` after `settleWater` | `source.waterLinesFor(read, viewer)` | `currentWaterRef` → `reachReport` |

Each link fails closed and silent; W1 and W2's tests assert each, and
the drive asserts a STATE CHANGE (the pail's material, the engagement's
`reachRef`, the shirt's soiling) never *not refused*.

### Acceptance-criteria coverage (49–55)

| AC | decision | wave | proof |
|---|---|---|---|
| 49 a waterside place names its water; author's words then the live read; no object, no room prose | T2, T5, T12, T13 | W1 | kernel `getDetail` test; drive 31, 32 (`look river`, `look tarn`), 37/38 (`look sea`); `look` on the bank matches no *edge* |
| 50 only waterside places are shores; elsewhere the Locality's water or words | T1, T7, T8, T10 | W1 | `verbs.test.ts` Locality fallback (delight:flats) kept; `fish` in a non-shore room with no Locality reach refuses as today |
| 51 fishing at a shore acts on its water unnamed; naming picks; not-water refused; the NPC fishes where it stands | T6, T7, T8 | W1 | fishing tests; drive 33 (`fish`, `fish kestrel`, `fish at lamps` refused; the fisher's engagement reach) |
| 52 fill/drink/wash at any shore; fouled where fouled, salt at sea, the water's temperature; ice refuses; never depletes; no standing asked | T9, T11, T14 | W2 | W2 tests; drive 34 (fouled + clean draws, `drink`), 35 (`boil`), 36 (ice), 37 (salt, drink), 39 (wash) |
| 53 fouling announces itself to no sense | T5, T10 | W1 | the look lines are `Shore.ts`'s moved (no *fouled* word); test asserts the read of a fouled reach contains *outfall* and not *foul* |
| 54 a deck is a shore of the sea under it; a beach reads the nearest landing | T11 | W1 | expanse tests (deck ref moves with the craft; beach ref = landing; cold → pending); drive 37, 38 |
| 55 every shipped shore works; climate's `analyze water` + ice checks pass | T13, T10 | W1, W3 | `climate-and-water.dirty` :280/:367 re-run green; `Ice.test.ts`, `IceCrossing.test.ts` |

### Test & gate strategy

- Kernel unit tests beside the mixins (`lib/location/__tests__/Shore.
  test.ts`, `WaterSource.test.ts`) with a test-local `WaterSourceMixin`
  composer — the kernel suite never imports the water pack. Bulk tests
  beside `Bulkable.ts` (`SourceSlot`, the draught clamp, `getTemperatureK`
  through `transfer`). Validator test for the or-rule.
- Water pack: `readWater` for the three reach states; the expanse's two
  derivations; the fouling probe against shipped rows.
- Fishing pack: `verbs.test.ts` rebuilt around a `Shore` room (not a
  Shore Thing); `brains.test.ts` around a room; `Waters.test.ts`.
- Terminus: `fishing-content.test.ts` asserts the bank is a `Quay` citing
  `kestrel:confluence` under its `river` detail and props no edge.
- Wire: steps 31–39; `look river` / `look tarn` / `look sea` by the
  detail's own name (the `water` keyword is now unambiguous on the bank
  — the drive may assert `look water` asks nothing, step 31).
- Lint: the family, every wave. `pnpm test` ONCE before the MR re-opens
  for review (`git status` filter first — a green run stands until a
  source file changes).

### Risks & opens

1. **Typed keyword vs room keyword.** When the typed word matches both
   the ROOM's own `keywords` and one of its details, `finalize` dedups by
   stuffId and which `via` survives is unverified (grounding says a typed
   detail keyword yields `via.detailPath`, but the same-stuff tie is
   untested). Mitigation in content (T13: no room keyword is also its
   water's name) and a W1 test that `look mere` on a mere shore renders
   the DETAIL; if the room wins, the fix is in the resolver's dedup
   (prefer the candidate with a via when the typed word matched it), a
   small change the build records as B-nn.
2. **Multi-word detail keywords** (`"black mere"`) — thing rows carry
   them (`tide.yaml` `"salt water"`); whether `applyDetails` → MQL scoring
   matches a two-word alias is unverified. `tarn` is the drive's handle
   regardless; `black-mere` is the fallback spelling.
3. ⚠⚠ **Which shore reads fouled.** The outfall and the bank share
   `kestrel:confluence` at hops 0, so the bank reads
   `0.6 × survival⁰ / flow(confluence)`; whether that clears 0.35
   depends on the confluence's flow in the drive's month (the row's own
   prose: *worst in a dry month*). W1's probe test answers it. If the
   bank reads CLEAN, there is **no shipped shore below an outfall** —
   the meres are isolated basins and the heath is a head — and step 34's
   fouled draw has nowhere to stand. **User's eye:** author a shore on
   `kestrel:estuary` (the lower towpath / estuary mouth is already
   downstream content), or raise the outfall's load, or accept a clean
   draw at the bank with `analyze water` naming the outfall. ✅ **Decided
   (T16): raise the outfall's load — honest, the bank is foul.**
4. **`BulkSlot.getHolder()` widening** touches ~10 bulk sites (BulkableLogic
   :319/:344/:355/:364/:396-397/:682-686, Freshness:558, WaterActivity:
   491, CraftingLogic:2811) — each already narrows or needs only a
   `Stuff`; a site that calls a Bulkable method on the holder unguarded
   is a latent bug this surfaces.
5. **`requires: any` on wash's `water`** admits a non-vessel into the
   bound list; `findWater`'s material test is the only gate. It was
   already the only gate for the contents question.
6. **`drink` offered at every shore** on the menu (the inventory bucket) —
   intended; the refusal is diegetic when the water is frozen.
7. **The cold first read** at a beach/deck (`peekShorePositionFor` →
   `null`; the structure catalogue unresolved) — *hard to read yet*, the
   drive loops as the gunwale step did (`:504-512`).
8. **A room's `look` must not change.** W1 asserts the bank's `look`
   text is byte-identical before and after (minus the edge in the
   contents list).
9. ~~**`lint:object-verbs`**~~ ✅ moot (T9′: no `whyNoSlot`). Was: may count `whyNoSlot(holder, …)`; its
   first parameter is a world object by the same necessity as
   `slotFor`'s (the validator has no `this`). If the census moves, the
   build files the caller audit (two controllers' null branch + one
   validator) and asks, rather than quoting doctrine.
10. The requirements' *"with one water, without naming it"* for drawing
    leaves TWO unnamed waters undefined; T6's `which-water` refusal is
    the engine's answer (no shipped row has two).

### Deferred seams (slates, not plan sections)

- A second water on the bank (the Delight at the confluence) →
  `shore-as-place-slate` tail (needs `delight:<node>` at the confluence
  and a decision about the fisher's default).
- `launch`/`dive` as the two further faces on the citation →
  `navigable-water-slate § 5a`, `underwater-slate` (already homed).
- `sip`/`pour`/`spill` refusal words at a shore (they reach the generic
  `slotFor` path and work; only the null-branch wording is generic);
  pouring INTO a river as a contamination event (`SourceSlot.remaining()
  = ∞` today) → `watershed`'s contamination tail.
- `cool`/`rinse` in salt water; a `rinse`-worthy liquid vocabulary
  beyond `water`|`brine` → the recovery slate.
- A general *any place made waterside from its own description* →
  `shore-as-place-slate` (kept, as its tail — the requirement's non-goal).
- The place↔bulk line (a bath, a trough, a cistern) → requirements open
  question 2, unchanged.

### Critical files

Kernel: `K/lib/location/Shore.ts` (new), `K/lib/location/WaterSource.ts`
(new), `K/platform/location/Shore.ts` (new), `K/platform/location/Quay.ts`
(new), `K/lib/mixin.ts` (two names + refusals), `K/api/mixin.ts` (two
predicates), `K/lib/config/AppSettings.ts` (two keys), `K/lib/bulk/
SourceSlot.ts` (new), `K/lib/bulk/Bulkable.ts` (`BulkSlot` host type,
`getTemperatureK`), `K/platform/idea/api/BulkableLogic.ts` (`slotFor`,
`whyNoSlot`, `computeApplied`, step 6), `K/api/bulk.ts`,
`K/lib/command/validators/mustHaveBulkSlot.ts`, `K/platform/idea/cmd/bulk/
FillController.ts`, `…/DrinkController.ts`, `K/platform/idea/cmd/crafting/
WashController.ts`. Platform content: `cmd/crafting/wash.yaml`,
`settings/<bulk>.yaml` (`bulk.draughtL`). Water pack: `W/idea/
WatercourseCatalogue.ts`, `W/idea/WaterExpanse.ts`, `W/idea/reading/
WaterReading.ts`, `content/settings/water.yaml`, delete `W/thing/Shore.ts`,
`W/thing/Gunwale.ts`, `W/__tests__/Shore.test.ts`; `W/__tests__/
WaterExpanse.test.ts`, `Ice.test.ts`. Fishing pack: `F/idea/cmd/fishing/
FishingController.ts`, `F/idea/Waters.ts`, `F/behavior/fishes.ts`,
`F/behavior/reads-water.ts`, `content/trade/fishing/cmd/fishing/{fish,lay,
release}.yaml`, the three test files. Content rows: terminus
`wharfside/bank.yaml`, `hesper/deck.yaml`, `estuary/strand.yaml`,
`estuary/headland/brow.yaml`, `wharfside/agent/fisher.yaml`; world-seed
`moor/stormy-heath.yaml`, `north/shore.yaml`, `circle/shore.yaml`,
`circle/bare/shore.yaml`; delete `wharfside/thing/river-edge.yaml`,
`moor/heath-mere.yaml`, `north/blackmere.yaml`, `circle/circlemere.yaml`,
`circle/bare/clearmere.yaml`, `hesper/thing/gunwale.yaml`. Tests: terminus
`fishing-content.test.ts`, transport `IceCrossing.test.ts`. Wire:
`maritime-space.dirty`, `fishing.dirty`, `climate-and-water.dirty`,
`reachability.dirty`. Docs: fishing, watershed, bulk, expanse, location,
ground, content-packs, navigable-water-slate, shore-as-place-slate.

### Revision 3 — build log

*(appended by the build: B-72 onward, then the revision-3 drive record.)*

- ✅ **T-W1 done** (the place cites, the water answers).
  - **B-72 — the strand is NOT a shore.** It faces the still pool, not
    the sea; the estuary mouth already has the tide (a salt-water
    fixture you fill from). The deck and the headland brow cite the
    Greywater; the strand stays a plain place. (Lens 3a: a beach in the
    lee of a pool reading the open sea would betray itself.)
  - **B-73 — `waters` is `persistent + authorable`, a plain object** —
    `PublicLightingMixin`'s exact declaration, not the plan's
    instruction-field/applier: phase-1 dispatch prefers `setWaters`, and
    the one shipped dynamic-detail precedent is the stronger pattern.
  - **B-74 — `reachFor` returns the place's refusal**, not `null`:
    `{ reach } | { refusal, reason } | null` — the three fishing
    controllers render it (`not-water`, `which-water`, `unread`). A named
    thing that is no shore at all is refused (`There is no water in the
    chair.`), never answered with the Locality's reach.
  - **B-75 — the source's shared reads moved onto the registry.**
    `FisheryRegistry.readDisciplineKey()` / `readForViewer(standing, key,
    viewer)` — both implementers call them; the physical-read words are
    module-private in `WatercourseCatalogue.ts` (only a reach speaks
    them).
  - **B-76 — `analyze water` on a sea** reports *the water, salt, its
    temperature*: a sea has no catchment to drain.
  - **B-77 — `lint:mass` lowered 240 → 238**: two deleted prop rows had
    stated neither mass nor material.
  - The fouling probe (Risks 3 / T16) runs in the drive, against the
    drive's own world: `analyze water` on the bank prints the flow, and
    the draw shows which way it falls.

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
  closed and silent at the binder). ~~**B-20:**~~ *(superseded by the
  !360 merge: `canTraverse` is async and the lookups moved into it;
  `prepareTraversal` is deleted)* `Exit.bind` is `@Final`, so
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

- ✅ **B2**. `Boat` = `Singleton(Persistable(Voyaging(Engaged(Positioned(
  Mobile(ExitableVessel))))))` in the transport pack. **B-30:** `launch`
  and `recover` are TRANSPORT-pack verbs afforded from INSIDE the boat
  (`inventory` — a container grants inward; `environment` flows OUT from a held item to its holder, which the drive found) — a kernel Helm naming a pack view would be the wrong
  direction, and you must be in the boat to go over the side with it.
  The boat's `environment` also names the kernel `course`/`anchor`/`hail`
  views (the ratified pack-static-names-kernel-view direction), so a boat
  steers like a ship. **B-31:** no transport `dinghy` row — the Boat is a
  singleton, so one row is one boat and it lives with the ship that
  carries it (B3). **B-32:** no `getBiome` override for an adrift boat —
  nothing in the drive reads a boat's biome; recorded as a seam.
  `onRestored` puts a boat whose record has a position back in the water
  (the row seats it on the deck). `journey` refuses a sea node by name
  over the `ExpanseNode` rows, naming `course`.

- ✅ **B3**. The Greywater (world-seed: five nodes, four bands — the
  bar is a linear passage over the confined channel, landing at the
  estuary mouth; the pool is a PLACE whose content is the swimmable pool;
  the haar is a belt with the race laid over it), the Hesper (zone, deck,
  hold, Structure lying at the bar, outfit with a `lookout` seat), the
  light on Gannet Rock (a positioned Structure with no deck — a landmark),
  the terminal clock tower as a Structure named by three zones and refused
  by four wharfside interiors (`[]`), the strand / pool / headland with
  `StillWater` and a `Vantage`, the pilot Nell Abery on the bank, two
  charts in the hold (one wrong), the lead line and the sextant on deck.
  **B-33:** the expanse's compile now ALSO stands up every Structure row
  sited on it — one with a deck (`deckHeightM`) is a SHIP and is
  registered from the start (else a ship that has never sailed is never
  "alongside" its landing), one without is a LANDMARK; contacts carry
  `fixed` and only a fixed contact is a free fix. **B-34:** that made a
  deadlock (the compile stands the ship up, the ship's `onRestored`
  awaited the compile) — `onRestored` kicks the compile and does not
  await it. **B-35:** the pool node is the pool itself, not a landing
  for a ship; the strand and headland are reached on foot from the
  estuary mouth. **B-36:** gates taught three facts, each read as data:
  `lint:census` reads the maritime citations (`destination`, `along`,
  `entrance`, `house`, `expanse`, `of`, `endpoints`, `overlooks`,
  `visibleLandmarks`, `entries[].path`); `lint:location-graph` treats an
  expanse node's landing as an entrance (the `seatIn` way — you arrive by
  sea through a code edge); and `GraphInvariants`' cross-zone rule now
  honours a declared `oneWay`, as its asymmetric sibling already did (the
  rock's `aboard` returns by the deck's code-resolved `ashore`). No
  ceiling rose. **B-37:** the hold is lit by a lantern adornment (a room's
  light must name its source); the outfit is `boot:`-listed (an
  advertised seat needs a live house, and `appoint` validates a live
  one); the dinghy is NOT (it is a deck prop of a singleton row — booting
  it would clone it twice), so a boat adrift across a restart waits for
  its deck to stand up — recorded as a seam.

---

## Drive record

`packages/wire/tests/maritime-space.dirty.wire.test.ts`, run cold
(`WIRE_BOOT=1 WIRE_PORT=2014`, freshly reset database, world up in
299 s): **24 / 24 checkpoints pass** (run 16). Sixteen runs to get there;
what they found, every item fixed unless marked:

| # | found by driving | fix |
|---|---|---|
| 1 | `course` was `unknown-verb` with the tiller in the room — the Helm afforded on `environment`, which in the code flows OUT from a held item to its holder | `Helm` affords on `peers` |
| 2 | `swim` refused "There's no water to swim in." beside the water — `StillWater` authored no `axes`, and the default enables no direction | `axes: ['*']` on the row |
| 3 | ⚠ PRE-EXISTING: the estuary was too dark to describe at noon — its rooms authored 600–700 lumens of ambient, which REPLACES the sky's noon flux, and over a 20 m cell that is under two lux | authored ambient removed; the rooms follow the sky |
| 4 | reading ink needs the `bright` band (60 lux); the hold's lantern lights it to see by, not to read by | charts are carried up and read on deck in good light (the drive waits for it) |
| 5 | a whole-world fog belt never won anywhere a corridor ran through it (the narrowest owns the field) — the haar was never reported | the haar is bounded in longitude; the rule is documented in expanse.md |
| 6 | a restored lighthouse registered itself as craft and was reported as "a sail" | only a craft under way registers on restore; the compile registers ships by deck; landmarks are considered first; `aboard` requires a deck |
| 7 | the two charts shared a keyword | the true one is the *survey* chart |
| 8 | the watch's narration could not be asserted — `cmd` clears the prose buffer | `Session.listen(ms)` in the wire harness |
| 9 | `route` to a CHARTED sea node planned over the claim and said "you do not know the way" | the sea check runs before the claim lookup |
| 10 | `launch` was `unknown-verb` from inside the dinghy — a container grants verbs inward on `inventory`, not `environment` | `Boat` affords on `inventory`; expanse.md corrected |
| 11 | ⚠ NOT FIXED (perception's): a bare `look` after handling things in a room you have since left raised "which target?" between a chart in hand and that room's lantern — `$focus` stays on the room's things | the drive uses `look here`; → the focus owner |
| 12 | ⚠ NOT FIXED (boundary's): a bare `out` answered `unknown-verb` inside a recovered dinghy, where `go out` works — the coach's own docs say "alighting is `out`" | the drive uses `go out`; → boundary / the vessel exits |
| 13 | a drive harness concern: the realm's till is empty, so a pilot's fee in coin needs an embodied character (the Arrival Note's twenty) | the mate is embodied |

| 14 | the stated bracket read "within about 1 miles" | `Plot` says "a mile" |
| 15 | ⚠ NOT FIXED (cosmetic, locate's): `locate me` aboard names the ship's zone "something" in its chain — the zone's presentation | recorded |

**Step 22, by hand (2026-10-10), on the world the drive left:** logged in
with no start location — the founder came back ON THE DECK (where they
logged off). `course 180` → *Your course: 180 at 6 knots … 41°55.3'N
7°55.2'W*. Server stopped (graceful) and restarted. Logged back in: still
on the deck, *Your course: 180 at 6 knots … 41°53.8'N 7°55.2'W* — the
course survived the restart and the craft had moved south while nobody
was logged in. ✅

**Covered elsewhere, honestly:** step 8's *different bracket at a
different band* is `LatitudeReading.test.ts` (no wire session can hold a
navigation band it did not earn); step 21's *same traffic, same place,
same hour* is `Expanse.test.ts`; step 22 is below, by hand.
