# River — implementation plan

Executes [river-requirements.md](../requirements/river-requirements.md):
the river as a **line** with a current that carries everything on it; the
**moving place** (the reach patch, a bank walker, a stopped ship's room at
sea); bodies in moving water; small craft; ships and ferries on the line;
and the sea's small boats brought under the same rule. **Kind:** feature.
**Lead:** content and kernel together — the water pack owns the river, the
kernel owns the moving place and the current as a force, `transport` and
`trade-diving` own small craft, and the first consumer is the Kestrel
itself (Wharfside, the ford, the gorge, the falls landing, the estuary).
ONE MR; the waves below are ordering, never cuts. Build 2 of the water
sequence, after the underwater build (MR !408, merged at `80aaacea9`).

The plan is written for a fresh-context build agent. Every grounding fact
below was verified by opening the file named; re-verify anything that has
moved since 2026-10-21.

## Decided with the user (2026-10-21)

Seven forks were put to the user and decided; each is recorded in the
decision it belongs to — the Kestrel's falls re-authored to 140 m, the
one-node meres exempt from the required ends, and the Holloway's sea node
(**D1**); `pull canoe` / `pull <person>` with `PullableMixin` on
`Creature` (**D22**); the Nesbit ferry's siting and the cable ferry as
mechanism only (**D31**); the *Ostrander*'s house (**D36**). Two revisions
followed the same day: small craft are propelled by a new verb, `paddle`
(**D21**, **D23**, **D35**), and **no zone changes at runtime** — a moving
place has a moving zone (**D38**), which replaced the containment opening
D24 had proposed. The maritime drive going red at W3 and repaired at W5 is
accepted. Nothing is left for the user to answer before the build.

## Grounding

Paths are under `packages/`; `server/src/mud/` is "the kernel".

### The river as hydrology, today

- `content/water/src/idea/Watercourse.ts` — `Watercourse extends
  NamedMixin(Idea)`, `boundaryRole = 'commons'`; rows at
  `/stuff/idea/Watercourse/<key>` (world-seed). `WatercourseNode = { name,
  elevation?, channelWidthM?, catchmentKm2?, meanDepthM?, stocks?, works?
  }`. **No** `km`, length, across, stretch, source/mouth kind, drop, bed,
  hazards. The docstring says a row "is never cloned as live Stuff"; the
  catalogue reads `tpl.data` directly, but the class is real and
  `StuffApi.singleton(rowPath)` stands one up (D2 uses this).
- `content/water/src/idea/WatercourseCatalogue.ts` (2,022 lines),
  `/system/water/idea/WatercourseCatalogue`, `WaterSourceMixin(Idea)`.
  `loadIndex()` → `CompiledIndex { reaches, downstream, successors,
  byCourse, predecessors, waterByCourse }`; `interpolate()` fills
  elevations linearly between control points and **throws** on an uphill
  course (l.1327–1392). `buildSuccessors` attaches a `branchesFrom` branch
  by nearest elevation. `flowAt(ref, nowS, draws)` → `FlowReading {m3s,
  naturalM3S, meltM3S, drawnM3S, snowpackMm, navigable}`; `navigable` reads
  `water.navigable.minFlowM3S` with a code fallback of **8** (l.750) while
  `content/water/content/settings/water.yaml:125` ships **3** — the data
  drift the requirements name. `waterStateAt(ref, nowS)` (l.835–901):
  temperature = the catchment's air floored at 274 K; `widthM =
  channelWidthM ?? 5√Q`, `depthM = meanDepthM ?? 0.4·Q^0.4`, `currentMps =
  Q/(w·d)` — ONE value per node, no slope term; salinity by the tide at
  elevation ≤ 0 (`tideOf`, l.792); oxygen by temperature × turbulence.
  `iceAt(ref, nowS, history?)` (l.580): running (no sheet) when
  `currentMps ≥ water.ice.stillWaterMps` (0.5), else Stefan; `iceAtSync`.
  Memos: natural flow per weather segment (`flowCache`, l.1122), ice per
  segment, `sharedReads` keyed `<citation>@<segment>` (l.409–420).
  `currentWaterRef(citation)` returns the citation unchanged (l.386) — a
  bank does not move. `readWater` returns a `WaterRead` (`lib/location/
  WaterSource.ts`: `ref, atS, name, frozen, draw, underIce?, levelM?,
  clarityM?, tide?, oxygenMgL?, opaque`) — no current, no stretch.
  `physicalRead()`/`currentWords()` (l.1608–1655) power `look river`.
- Rows (`content/world-seed/content/stuff/idea/Watercourse/`): kestrel —
  headwaters 1400 (catch 380) · gorge · falls 500 (w 18) · confluence 30
  (w 90; works city-intake, city-outfall) · estuary 0 (w 160); delight
  `branchesFrom: kestrel:confluence` — spring 720 · flats 180 (w 22; works
  **millrace only**) · mouth 35 (w 30); holloway head 1100 · vale 300 ·
  mouth 0; cold-fell tarn 1650 · cascade 1150 (works aqueduct-house,
  cold-fell-aqueduct) · sink 800. Every row authors `site: { latitudeDeg:
  42 }` and a `water:` chemistry seed.
- Citations in shipped content: `water: { of, depthM, feature?, rimM? }`
  on water places (`lib/location/WaterPlace.ts:110`); `waters: { river:
  kestrel:confluence }` on shores (`wharfside/bank.yaml`); `reachRef:` on
  `Conduit`/`ControlStructure` rows; `crossesReach:` on `FordExit`
  (`delight-road/exits/delight-ford.yaml`: `delight:mouth`, threshold 12,
  `conditional: true`); `_reach:` on Localities (eternal-campus,
  university-avenue, counting-houses, hinkley-hills → `kestrel:confluence`;
  hearts-delight → `delight:flats`; rejection → `kestrel:headwaters`;
  moor → `holloway:vale`; the meres' localities → `<mere>:mere`).
- `content/water/src/thing/ControlStructure.ts` — `controlKind`
  (`dam|headgate|weir|sluice`, **read by nothing**), `reachRef`,
  `passFraction`, `headM`, `generates`. Rows: `hearts-delight/thing/
  millrace.yaml` (weir, `delight:flats`, head 6) and `sawmill-race.yaml`
  (weir, head 2, **absent from the delight row's `works`**);
  `wharfside/thing/aqueduct-house.yaml` (weir, `cold-fell:cascade`, head
  60). `rowWork()` in the catalogue reads a work from its ROW by class
  suffix when it is not standing (l.1282).
- `water.yaml` dials in use: `water.ice.*`, `water.navigable.*`,
  `water.fishery.reachLengthKm` (1), `water.tide.*`, `water.column.*`.

### The water place, the column, the warrens

- `lib/location/WaterPlace.ts` — `WaterPlaceMixin` over `Shore &
  Swimmable & {getFloor}`: `water`, `column {neighbors}`, `tide`;
  `levelNow / depthNow / stateNow` (`dry · wading · swimming · frozen`;
  wading = ONE dial `water.column.wadeM` 1.5 for every body, l.870);
  `bandsNow()`; `mediumFor(occupant)` → `MediumRead {tag, substance,
  immersed, atSurface, temperatureK, depthM, waterRef, visibilityM?,
  oxygenMgL?}` (`api/biome.ts:157`) — **no current**; `surfacePlace()` =
  this; `holdAtSurface` (the linkdead hold); `takeUnder`; `canRise`;
  `wayDown/wayUp`; `sinks(thing)` (dense, still, not an agent/Mobile, not
  buoyed) → `sink()` to the bed band; `canExit` admits swimming and
  climbing; `onContainableAdded` wets/douses/fills and sinks a dense
  arrival; `reconcileOccupants` (the strandline's drift, the flood's hold).
- `content/water/src/idea/ColumnWarren.ts` —
  `WaterColumnMixin(SingletonMixin(PersistableMixin(RoomWarren)))`, one
  for the realm at `/system/water/idea/ColumnWarren`
  (`TemplatePaths.waterColumn`). Members keyed `${surfacePath}#${band}`
  where `surfacePath = getIdentityPath() ?? getTemplatePath()`; budded by
  `createMemberSerialized()` cloning `/system/water/location/band/{lit,
  dark,bed}`; coordinates set to the surface's with z decreasing
  (`setCoordinates`, never grid-indexed); `PersistableApi.restoreOrSeed
  (room, key)`; `reconcile()` captures a member with no `HasInteractive`
  occupant and reaps it only when its surface no longer has that band.
  `wireHubExit` is a no-op; `ColumnExit` (`DeferredDestinationExit`,
  `wiresItsOwnInverse() → true`, `targetNow()` recomputed against
  `bandsNow()`, `crossingRealS` = `verticalSwimSeconds`).
- `content/water/src/location/Band.ts` =
  `WaterPlaceMixin(SwimmableMixin(ShoreMixin(PersistableMixin(
  WarrenMemberMixin(Location)))))`; `attachTo(surface, band)`;
  `getSurface()` resolves `this.surface` by `StuffApi.findByTemplatePath`
  (works for a minted identity path too — avatars are found the same
  way). The band rows under `/system/water/location/band/` resolve **no
  zone** (no zone row under `/system/water/location`); their coordinates
  are decoration. `noDefaultFloor: true` on lit/dark.
- `lib/location/Warren.ts` — `leafOccupants(m)` counts `HasInteractive`
  contents ONLY (l.498); `createMemberSerialized`, `addMember/removeMember`,
  `wireHubExit/unwireHubExit` (live-ref bidirectional exits), `teardown`,
  `cleanupOnDestruct`. `RoomWarren.occupantsOf = leafOccupants`.
  `WarrenMember.canEvict` vetoes residency while owned (l.78).
  `Warren.laysOutOwnFrame()` (l.127).
- `platform/location/Pool.ts` = `WaterPlaceMixin(SwimmableMixin(
  ShoreMixin(Locale)))`, floor defaults to `TemplatePaths.waterSurface`.
  `Quay = ShoreMixin(Street)`, `Shore = ShoreMixin(Locale)`.
  `lib/location/Shore.ts`: `waters`, `waterFor/waterRefFor`,
  `peekWaterRead/settleWater`, `drawAt`, `wayIntoWater()` (the first exit
  whose destination is a water place; refuses `iced-over`), `depthWords()`,
  `onWaterRead` hook, `getObviousNeighbours()` (used by the lifeline's
  reach, below).
- `platform/thing/WaterSurface.ts` — the pool's floor: `goIn(actor)`,
  `giveWay`, `reconcileSupport`, `openWaterAreaM2`.
- `platform/idea/LocationGraphRegistry.ts:437–441` — attachments: a
  **Structure-class** row with `extent` → `structure`, with `expanse` →
  `craft`. `Expanse.craft()` (`lib/expanse/Expanse.ts:359`) unions the
  registered set with `NavigationApi.attachedNow(seaPath, 'craft')`.

### The sea, the voyage, the boats

- `lib/expanse/Positioned.ts` — `expansePosition: GeoPositionRecord |
  null`, `expanse: string | null`, `sightHeightFor`, `getTargetHeightM`.
  Composed by `Ship` and `Boat`; the docstring forbids `ExitableVessel`
  and `Mobile` hosts and sharing a host with `CartesianCoordinatesMixin`.
- `lib/expanse/Voyaging.ts` — three persisted fields (`course {bearingDeg,
  speedKn, node}`, `courseSetAtS`, `plot`) + `speedKn`;
  `getExpansePosition()` derived via `positionAtS → driftAtS` integrating
  band set/wayFactor; `rebase` the one writer; `steer`, `anchorHere`,
  `placeAt`, `onRestored` (restarts the `Voyage`; never awaits the sea's
  compile — deadlock). `lib/expanse/Voyage.ts` — a `SustainedEngagement`
  whose actor is the craft; one beat per `expanse.watchGameHours`;
  boundary report (`Expanse.changesAcross`), arrival, neglect.
- `platform/idea/Ship.ts` = `PersistableMixin(VoyagingMixin(EngagedMixin(
  PositionedMixin(Structure))))`; `deckHeightM`, `mastheadHeightM`, `house`;
  `liveMembers()` = `Template.findDescendants(extent)` then
  `findByTemplatePath` (singleton rooms); `aboard()`, `watchRoom()`,
  `gearAboard()`. `Structure` (`platform/idea/Structure.ts`): `extent`,
  `entrance`, `landmark`, `heightM`, `storeys`, `hasMember(path)`.
- `content/transport/src/thing/Boat.ts` = `SingletonMixin(PersistableMixin(
  VoyagingMixin(EngagedMixin(PositionedMixin(MobileMixin(ExitableVessel))))))`;
  affords `launch`, `recover`, `course`, `anchor`, `hail` on `inventory`;
  `onRestored` detaches a boat whose record has a position. The dinghy row
  `terminus/hesper/thing/dinghy.yaml` (speedKn 3, mass 120, oak).
  `LaunchController` detaches to null, `placeAt(ship's position)`,
  `expanse.register(boat)`; `RecoverController` finds the nearest `Ship`
  within `expanse.recoverNm` and moves the boat onto its deck.
- `platform/idea/api/ExpanseLogic.ts:29` `craftAt(placePath)` — the
  outermost positioned thing a place is or is in. Readers of
  `isPositioned`/`craftAt`: `LaunchController`, `keeps-watch` brain,
  `WaterExpanse`, `DepthReading`, `Expanse`, `AboardExit`, `ExpanseLogic`,
  `AnchorController`, `CourseController`, `RouteController`,
  `LocateController`, `HailController`, `BearingReading`, `LatitudeReading`.
- `content/water/src/idea/WaterExpanse.ts` — `craftOfPlace` and
  `positionFor(place)` key on **template path** (l.132–246): two budded
  rooms sharing one row would collide. `refAt()` is the 0.1° cell the
  fishery keys on. `seaStateAt` (wind, fetch, depth → Hs, roughness).
- `platform/idea/AboardExit.ts` / `AshoreExit.ts` — `DeferredDestinationExit`s
  recomputing the far side at `canTraverse` (a `Ship` at the node, at
  anchor); kind rows `platform/idea/exits/{aboard,ashore}.yaml`.
  `lib/boundary/DeferredDestinationExit.ts` — `computeDestination()`
  abstract; `resolveDestination()` caches a live ref; `getDestination()`
  throws before resolve.
- Greywater rows: `greywater.yaml` (origin 42.000/−8.470, tidal 3 m);
  `bar.yaml` (linear passage along `channel`, destination
  `/world/terminus/estuary/estuary-mouth`, focus rho 0); `channel.yaml`
  (corridor 740 m, depth 4); `the-pool.yaml` (place, destination
  `estuary/pool`).
- The estuary rooms (`terminus/content/world/terminus/estuary/`):
  `estuary-mouth` (Shore; `waters: { channel: greywater }`; exits west
  reach, east strand, north channel, `aboard` → hesper/deck), `channel`
  (Pool, `water: { of: greywater, depthM: 3, feature: channel }`), `reach`
  and `lower-towpath` (Locale, media ground+water, **cite no water**).
  `valley-road/towpath` (Locale, cites nothing; its `river` detail says
  the water is "running the other way, and audibly").
- `wharfside/bank.yaml` (Quay; `waters: { river: kestrel:confluence }`;
  exit `river` → `wharfside/water/location/basin` with media
  `[water, vertical]`; props intake, outfall, barge, quay-steps,
  heaving-line, bell-hoist, air-pump; cast fisher, pilot, tender,
  pump-hand). `basin.yaml` (Pool, `water: { of: kestrel:confluence, depthM:
  6 }`, column neighbor `intake-mouth` beside `dark`; prose: *"The current
  pulls at you"* — the basin stays still water, so that line goes).
- The *Hesper*: `hesper/structure.yaml` (Ship, extent `/world/terminus/
  hesper`, entrance deck, `expanse: greywater`, position at the bar);
  `deck.yaml` (Shore; props helm, lead-line, dinghy …; `ashore` exit).
- `packages/wire/tests/maritime-space.dirty.wire.test.ts` step 15 (l.553):
  `go dinghy` · `launch` · `locate me` reads *at sea, by reckoning* ·
  `recover` · `go out`. Steps 12 and 37 fish over the side from the deck.

### Bodies

- `lib/respiration/Respiration.ts` — the clock is REAL seconds;
  `treadBeat(elapsedS)` (l.1099): free when floating/held up/buoyed (lift ≥
  30 N × size); else `exert(TREAD_W 150 × technique × buoyancy × (1 +
  clingers))`; spent → the drowning response → `takeUnder` after 60 s.
  `float()` (l.1269: at the surface, ≥ novice, not too heavy), `holdUp /
  releaseHold / isHeldUp`, `coldShock` (l.1677), `verticalSwimSeconds`,
  `beClungTo`. No current or rough-water term anywhere.
- `lib/character/Avatar.ts:1567` `onLinkdead()` → `holdIfInWater()`
  (l.1615) → `WaterPlace.holdAtSurface(this)`.
- `lib/exertion/Exerting.ts` — `exert({durationS, powerW})`,
  `sustainableW()` (300 × (1 + 1.5·wind)), `currentPowerW()` fades over
  `CURRENT_POWER_FADE_S` = 30 **game** seconds (l.585) — the known
  effort-vs-breath gap. `exertTraverse(mode)`.
- `lib/hazard/Hazard.ts` — `HazardMixin<MixinConstructor>` (any host);
  `trigger: traversal | interact` handled, `proximity | timer | remote`
  unhandled; `resolveTraversal(mover, mode)` (l.297): `moverAvoids` by
  discovery/perception/`clearedByMedium` (a swim clears a ground hazard);
  `pin` = `HazardActivity` on the body slot for `hazard.pinSeconds`.
  Fired from `Mobile.traverse` (`lib/spatial/Mobile.ts:1068–1088`) over the
  destination, its contents and the exit — never from a containment move.
- `platform/thing/Corpse.ts` — a `Thing` (`Postmortem(Concealable(
  Contaminable(Container(Thermal(Vitals(…Organism(Propertied(Thing)))))))`),
  material flesh (density 1060 → it sinks); `lib/mortality/Postmortem.ts`
  `getDecayStage()` = `fresh · stale · decomposed · spent` by
  `MORTALITY_DEFAULTS.DECAY_STAGE_SEC` (3,600 game-s per stage,
  `MortalArc.ts:64`), `interred`, `canEvict`. No buoyancy change.
- `content/transport/src/idea/FordExit.ts` — `_crossesReach`,
  `_floodThresholdM3S`; `refreshCrossing()` per 6 h segment sets the
  SHARED `blocked` bit; `canTraverse` refreshes then defers to the base
  `blocked` gate. `IceCrossingExit.ts` is the per-mover shape: reads the
  sheet (shared), weighs THIS mover (`massOf`, `DEFAULT_MOVER_KG` 80),
  stores no verdict; `isBlocked()` answers for a person on foot. Kind rows
  author `_conditional: true`, `_crossesReach` (world-seed's
  `north/exits/ice-crossing.yaml`), which `lint:location-graph`'s
  `conditional-kind-undeclared` check requires of any class overriding
  `applyTraversal`/naming `blocked`.
- `platform/idea/api/LocomotionLogic.ts:263` `overYourHead()` refuses a
  ground mode into a `swimming` water place; `engageHost` (l.556) passes
  the water density to the load veto for water modes and refuses weight
  only on the way `up`.
- `lib/encumbrance/LoadBearing.ts` — `getNetBuoyancyN(ρ, depthM)`,
  `getDisplacedVolumeM3`, `getBorneBurden(ρ)`. `Creature.getBodyDensity()`.
  Stature: `Species.getStature()` (m; own, else the plan's, else 0;
  `platform/idea/species/Species.ts:1124`), read by `Creature.bodyMassIndex`.
- `lib/spatial/Tossable.ts` + `content/trade-diving/src/thing/Lifeline.ts`
  — `throw <line> to <person>`: `personWithinReach(holder, word)` searches
  the holder's room and its `getObviousNeighbours()` (l.220–240) — the
  water one way off the quay; `heaveTo` makes the end fast and `holdUp`s a
  body in a water place. `pull line` brings whoever is on the end one band
  per pull. `SignalBell` (`ring`) is a 95 dB hearing event.
- `platform/idea/cmd/movement/SwimController.ts` — bare `swim` = the way
  into the water (`Shore.wayIntoWater`) or `WaterSurface.goIn`; `dive` in
  a water place = `wayDown`; a typed target = the crossing.
  `LocomotionControllerBase.cross` (l.158) runs a timed crossing when
  `exit.crossingRealS(actor) > 0` (a `ManualBuildStep` on hands, then
  `arriveAfter`). `Mobile.traverse(exit, mode, { carriedBy })`.
- `lib/chattel/Estate.ts` — `hydrateSlice`: `storage` → nothing minted;
  `inventory` → cloned into the owner; a room id → kept, the room's
  overlay; a `key` entry → stood up from its own record.
  `platform/idea/api/ChattelLogic.ts:262` `followCustodyOnce`:
  `nearestHost(item)` (l.394, the nearest `Persistable` ancestor) — when
  **null** (*"transient space — leave the last placement alone"*) the
  good's `place` stays `inventory` and the owner's next materialize clones
  a second copy. `ESTATE_INVENTORY`/`ESTATE_STORAGE` are the only place
  words (`lib/persistence/PersistenceSlice.ts:142`); readers:
  `Chattel.ts`, `ChattelRecord.ts`, `Estate.ts`, `ChattelLogic.ts`.
  `PersistableApi.placeIdOf(host)` = `<row>#<key>`; `restoreOrSeed(host,
  key)`, `standUpKeyed(scope, key)`, `capture(host, key?)`.
- `platform/idea/api/ContainmentLogic.ts:224–245` — pre-flight (1)
  exitables only into exitables; (2) an exitable may not change zone by
  containment, with ONE opening: a water band whose `surfacePlace()` is in
  the item's own zone. A pack `thing` row (`/system/transport/thing/…`)
  resolves **no** zone, so a boat clones with `zone = null` and may enter
  a zoneless band/patch but **not** an authored place (zone ≠ null).
  `StuffApi.clone(row, ctx, { asIdentityPath, zoneFrom, madeFrom })`
  (`api/stuff.ts:611–657`): an identity-stamped clone is indexed by its
  identity path; a class may declare its identity namespace;
  `lint:identity-mints` requires a marker at every `asIdentityPath` site.

### Fishing, logistics, readings

- `content/water/src/idea/FisheryRegistry.ts` — `standingAt(reachRef,
  nowS)` capacity = fit × abundance × `water.fishery.reachLengthKm` (1);
  `draw/release`; records keyed on the reach ref (a sea's on the 0.1°
  cell string). `content/trade-fishing/src/lib/FishingEngagement.ts` —
  `reachRef` fixed at construction (l.134); `tick()` once a game minute;
  `presentation(rod.getPresentsAt(), species.feedsAt)` (l.274);
  `Rod.hookGapeM`; the lure worked by `reel`. `trade-fishing/src/idea/
  Waters.ts:68` `reachAt(room)` = the shore's own water else the
  Locality's reach.
- `content/transport/src/lib/journey/Journey.ts` — one game-minute tick;
  `advance()` (l.226) re-validates per leg, `LaneCatalogue.exitBetween(from,
  to)`, the same `traverse` a player's `go` makes; `route-blocked` on a
  refusal. `NavigationApi.routeBetween` plans over `location_graph`;
  `StoredEdge` (`lib/location/PlaceNode.ts:51`) carries `media`,
  `wheelPassable`, `conditional`, `minutes`, `kind`; `TravelProfile.admits`
  mirrors `Exit.allowsMode`. Lanes: `/stuff/idea/Lane/{spine,estuary,city,
  ferrow-tram}` — `estuary` is `sailed`, seeded at the bank. `Barge =
  VehicularMixin(Bulkable(Drivable(Slotted(Mobile(Vessel)))))` (not
  exitable, so it crosses zones freely). `HaulableMixin.passageMode`
  (default `wheeled`) is what the haulage `terrain` gate checks against
  the exit's `media`/`wheelPassable`.
- `platform/idea/ReadingCatalogue.ts` — every `<root>/idea/reading/<ch>`
  row whose class extends `Reading`, warmed lazily. `content/water/src/idea/
  reading/DepthReading.ts` — `seaUnder(giver)` → the positioned craft's
  `WaterExpanse.depthAt(pos)`; **river: none**. `platform/idea/reading/
  TemperatureReading.ts` + `platform/idea/reading/temperature.yaml`
  (`scope: [subject, here]`, `subjectRequires: [ThermalMixin]`,
  `BiomeReading` → the AIR). `content/water/src/idea/reading/WaterReading.ts`
  (`analyze water`) never prints a current.
- `platform/idea/cmd/movement/CourseController.ts` — `course <bearing>` /
  `course <node>` (`expanse.nodeByKeyword`), confined-passage ends;
  `AnchorController` → `anchorHere()`; `HailController` → `expanse.
  contactsFrom(craft, giver, 'signal', hour)`. `Helm` affords the three on
  `peers`. `PerceptionLogic.horizonFor` (l.559) = `horizonAtSea(viewer) ??
  horizonAshore(viewer)`; `watch horizon` → `HorizonWatch` (diffs only).
- `content/water/src/behavior/keeps-watch.ts` — a pack brain shape
  (`/system/water/behavior/keeps-watch`). Brains live at `src/behavior/`.
- Settings keys live in `lib/config/AppSettings.ts` (`AppSettingKeys`)
  with seeded literals at every call site; the water pack's dials in
  `content/water/content/settings/water.yaml`.

### Gates this build must satisfy (named at plan time)

`lint:family` runs every `lint:*`. The ones this build touches:
`lint:water-citations` (a `waters:` key must be a `details:` feature),
`lint:instanceable` (nothing instances `/lib/`; `container:` refused;
invariant 3 — a pack namespace resolves into the pack's `src/`),
`lint:locations` (every room class resolves a zone or is zoneless like the
bands; the furnishable roster is enumerated), `lint:location-graph`
(`conditional-kind-undeclared`; exit-kind rows declare their keys),
`lint:reachability` (arm A: every view is named by a static or declares
`unreachable:`; arm G: no article defect — `greedy: true` on object args a
player may put `the` before), `lint:verb-collisions` (one view per verb;
scripting builtins count), `lint:identity-mints` (a marker at every
`asIdentityPath` site), `lint:template-scans` (no new table scan outside
the allowlist — the river compile rides the catalogue's existing
`findDescendants` entry), `lint:world-scan`, `lint:graph-walks` (no
hand-written graph walk — use `Traversal`), `lint:census` (the template
census walks `nodes[].stocks[].species` and `nodes[].works[]`; new
row-naming lists on the Watercourse (`places[]`, `hazards[].row`) get an
arm), `lint:envelope`, `lint:completion-this` (no `this.` in a
controller's `onComplete`), `lint:counters`, `lint:idle-cadence` (the
ferryman's brain is a `witness`/`candidate`, never a `cadence:`),
`lint:reconcile-chains` (the corpse's immersion integral may not sample
`getTemperature()` once — it integrates per weather segment),
`lint:object-verbs` (no `XApi.verb(host, …)`), `lint:lib-statics`,
`lint:mixin-names` (kernel mixins in `Mixins`; pack mixins own their
constant), `lint:module-scope`, `lint:imports`, `lint:self-contributions`,
`lint:field-meta`, `lint:schema` (no new collection — still 48),
`lint:test-bootstrap`, `lint:test-content`, `lint:drive-scripts`.

## Plan-level decisions

### The line

**D1 — The line is a value object compiled from the profile, memoized by
the catalogue.** `Watercourse` rows gain, on the course: `source: { kind:
rills | spring{yieldM3S} | outlet{of} | melt }`, `mouth: { into: river{
course,node} | still{water} | sea{node} | sink }`, `bed: ground | gravel |
rock | sand | mud` (default `ground`), `banks: { wooded?: boolean }`
(default wooded), `stretches: [{ from, to, kind?, bed?, banks? } | { at,
side, bank }]` (overrides only), `hazards: [{ at, side, kind, row? }]`,
`bends: [{ at, name }]` (named landmarks on a derived bend), `meander: {
seed? }` (default: FNV of the course key); on each node: `km` (from the
mouth, required on every node of a course with ≥ 2 nodes), `drop` (a falls'
step, m). A course of two or more nodes with no `source` or no `mouth`, or
a node with no `km`, or `km` not strictly decreasing source-first, **fails
the compile naming itself** (the uphill rule's shape, l.1327). A one-node
still water is exempt (decided; below). A sink mouth's end moves: the line
ends where `flowAt` reaches 0 walking down from the last node. A river
place (D7) with no downstream end fails to load unless it declares
`ends.downstream: end`.

The compile (`content/water/src/lib/RiverLine.ts`, a pack `lib/` value
object — substrate only inherited, per CLAUDE.md § Module Categories)
derives, per course, **once per compile** (nothing here depends on flow):

- **Gradient** per node pair: `S = Δelevation / Δkm`. A node's `drop` is
  taken out first as a `falls` stretch of 0.05 km.
- ⭐ **Step–pool distribution** (the honest answer to a steep profile — the
  drop of a river is concentrated in its steps; pools between are nearly
  flat): the fraction of a reach's length in steps is `f = clamp((S −
  S_pool) / (S_step − S_pool), 0, 1)` with `S_pool = 0.0003` and `S_step =
  0.02` (dials `water.river.poolGradient`, `water.river.stepGradient`); the
  steps carry the drop, the pools carry `S_pool`. Where `f ≥ 1` the whole
  reach is rapids at `S` (a cascade — the Kestrel's gorge).
- ⭐ **The meander is a SEEDED field over km** (never a roll): bends every
  `λ ≈ 11 × width` (sinuosity falls with gradient — a flat river wanders,
  a steep one runs straight), the outside side alternating with a seeded
  phase. Pools sit on the outside of bends, riffles at the crossings
  between them, so the pool–riffle sequence and the meander are one
  function. Steps from the distribution above are placed at the crossings
  first (riffles), with the remainder as rapids where the step budget
  exceeds what crossings absorb.
- **Stretch kinds**: `pool` (a bend's outside, or `S < S_pool` with depth
  over wading), `run` (the ordinary state), `riffle` (a crossing, derived
  depth at or under wading), `rapid` (a step steeper than
  `water.river.rapidGradient` 0.008, or bed rock at a step), `falls` (a
  node's `drop`), `gorge` (both banks `wall` — an override, since
  confinement is a valley's fact no profile holds). Every stretch has a
  stable id `<course>:<n>` (source-first ordinal), **the key the fishery
  and the ice use** — stable across restarts because the inputs are the
  rows and the seed.
- **The channel**: the thalweg's `across` swings to the outside of each
  bend (`across = w × (0.15 | 0.85)` by side, `0.5` at a crossing). **Banks
  per side per stretch**: the cut bank (outside: `steep` or `undercut`,
  deep margin, current ≈ 0.9 × channel), the point bar (inside: `bar` —
  shelving gravel, margin current ≈ 0.25 × channel, depth ≤ wading); a
  gorge `wall`; an authored place's bank is that place (`{ at, side, bank:
  quay }`). Each bank carries `{ margin, walkable, climbable, currentFraction,
  depthFraction, wooded }`.
- **Eddies**: slack water on the inside of each bend just below its apex
  and below every authored obstruction — the first holdable spots a drift
  passes. **Drift collection points**: every point bar and every strainer
  (what floats and is not driven fetches up at the next one).
- **Hazards**: authored (`hazards:`) plus derived: a **hydraulic** 0.03 km
  below every `ControlStructure` with `controlKind: weir` and `headM > 0`
  on the course (read off the works the nodes name, by row — `rowWork`'s
  shape, so the Delight's two mills each make one); **strainers** seeded
  on the outside of bends in wooded reaches at a density per km
  (`water.river.strainerPerKm` 0.4); **undercuts** on every undercut bank
  (a hazard with `approach` policy, not pinning). Each hazard is `{ id, km,
  side, kind, row }` where `row` is the water pack's `/system/water/thing/
  river-hazard/<kind>` (D12).
- **Obstruction and vegetation** per stretch: `obstruction = woodedness ×
  seeded density` (snags), `vegetation` from the chemistry's nitrate and a
  slow warm shallow stretch — the two derived terms the slate names; read
  by ships (D27) and propulsion (D21).

The catalogue gains `lineOf(courseKey)` (the compiled `RiverLine`),
`positionOf(citation)` (D3), `stretchAt(pos)`, `banksAt(pos)`,
`hazardsBetween(course, kmA, kmB, side?)`, `eddiesBetween`,
`collectsAt(course, km)` (the next collection point downstream), `sightKm
(pos, eyeHeightM)` (how far the line is in view: to the next bend, or by
height on a straight reach), and **`riverStateAt(pos, nowS)`** — the flow
read at the enclosing node pair (interpolated by km), the stretch's local
gradient and bed roughness through **Manning** (`v = (1/n)·R^(2/3)·S^(1/2)`
with `R ≈ depth`, `n` by bed: gravel 0.035, rock 0.05, sand 0.03, mud
0.025) for the **channel current**, the margin current by the bank's
`currentFraction`, depth at the thalweg (`0.4·Q^0.4` scaled so the pool is
deeper and the riffle shallower: pool ×1.8, riffle ×0.5, run ×1.0, rapid
×0.7), width from `channelWidthM` interpolated between nodes, temperature
(the reach's, D17's source-kind term below), roughness (0 pool · 0.2 run ·
0.4 riffle · 1 rapid, scaled by current), `oxygenMgL` by the existing
turbulence rule, and `ice` (D16). Memoized **per weather segment beside the
flow memo** (`flowCache`'s shape), keyed `<stretchId>@<segment>`; the
static compile (stretches, bends, banks, hazards) is memoized once with the
index and dropped by `invalidateCache()`.

Why the catalogue and not a second singleton: the catalogue IS the realm's
water source (`WaterSourceMixin`), already memoizes per segment, and every
existing citation resolves through it; a second roster would be the
inert-reference trap this repo has paid for three times.

⭐⭐ **The Kestrel's falls are re-authored to 140 m (decided with the user,
2026-10-21).** `kestrel.yaml` authors falls **500 m** and confluence
**30 m**; with the slate's kilometers (falls km 41, confluence km 9) the
navigable reach fell 470 m in 32 km — a mean gradient of 1.5 %, class III
whitewater by Manning (~4 m/s), which no sternwheeler steams and which
the drive (steps 25–31) cannot survive. The step–pool distribution above
makes SOME gradient survivable, not that one. So the falls become 140 m
(the 22 m drop stays; the gorge above takes the 1,260 m from the
headwaters at 1400 — a cascade, which is what a gorge nobody has boated
up should be); the lower Kestrel is then 0.27 % — pools with a riffle
every half-mile, a brisk navigable mountain-front river. Nothing shipped
reads the falls' elevation but the snowpack at that reach and the climate
drive's temperature expectations (`climate-and-water.dirty` — W0 re-runs
it). **The one-node still waters are exempt from `source`/`mouth`**
(decided): the four meres are one-node courses the compile already treats
as a lake, and a lake has no direction to declare. **The Holloway gets a
sea node** (decided): `greywater/holloway-mouth`, a passage node with no
destination west of the bar, so its mouth is "the sea at a named node"
as the requirements say.

**D2 — The river's frame for ships is the `Watercourse` row, stood up.**
The kernel gains a protocol mixin `lib/expanse/LineFrame.ts`
(`LineFrameMixin`, `Mixins.LineFrame`): `lengthKm()`, `advance(from:
LinePosition, speedThroughWaterMps, direction, fromS, toS) → { at,
stoppedBy? }` (integrates the current per stretch, piecewise, stopping at a
landing, a falls, a too-shallow stretch or the mouth), `landingsAlong(a, b)`,
`changesAlong(a, b)` (the stretch changes in words, the `Voyage` beat's
line report), `mouth()` / `source()` (the frame change, D29), `craft()`.
Every method has a refusing default; the water pack's `Watercourse`
composes it (`LineFrameMixin(NamedMixin(Idea))`) and forwards to the
catalogue's compiled line. A ship on a river authors `line: /stuff/idea/
Watercourse/kestrel` and the attachment derivation
(`LocationGraphRegistry.ts:437`) gains one line: a Structure-class row
with `line` attaches as `craft` to that path — so the river loads what is
attached to it exactly as the sea does, with no boot list (the slate's
open 3). A `Watercourse` row stood up as a Stuff is harmless: the catalogue
keeps reading `tpl.data`; the instance is the frame's identity for
`craft()` and the protocol. The meres compose it too (length 0; nothing
asks).

**D3 — The citation is `course:node[±km][,side]`, parsed by the catalogue.**
`positionOf('kestrel:confluence+0.4,left')` → `{ course, km, across, side }`
where `across` is meters from river left (left = 0, right = width, `in`/`mid`
= the channel's across at that km, the default when no side is given). The
grammar EXTENDS the shipped reach ref: `kestrel:confluence` still parses
(offset 0, mid) so every shipped citation keeps its meaning. River left and
right are as you face downstream. The following fields carry a citation
and are re-read through `positionOf`: `water.of` on water places,
`waters.<key>` on shores, `reachRef` + a new **`at`** on `Conduit` and
`ControlStructure` (a work sits at a position — the intake at
`confluence+0.05`, the outfall at `confluence+0.15`, 100 m apart; the node
part keeps the works' index working), `crossesReach` on `FordExit`,
`ShoreMixin.bank` (D8). A Locality's `_reach` stays a node name (where a
catchment drains). `currentWaterRef(citation, place)` answers the
**stretch id** for a river citation (`kestrel:<n>`), so the fishery, the
ice and the shared read key per stretch (the "fisheries per stretch"
collision); for a moving place it reads the place's own position first
(D5). No data migration — the DB is dropped at the build's first boot.

### The moving place

**D4 — The moving place is a kernel mixin over a positioned Location.**
`lib/location/MovingPlace.ts` — `MovingPlaceMixin` over `Stuff & Container
& Exitable & Positioned` (`Mixins.MovingPlace`): `getFramePosition() /
setFramePosition()` (through `Positioned`'s two halves, D18), `hailRangeM()`
(a `@hook`, default `expanse.hailRangeM`), `absorb(other)` (take another
moving place's contents and offsets; the warren reaps the other), `budOff
(members)` (the warren mints a new place at the members' position),
`offsetsOf()` (per-mover relative position along the frame, D6), `onFrameMoved
(from, to)` (a `@hook` the pack overrides to tell occupants what changed),
and the `Drift` engagement hook `nextEventAtS()` (D6). `PositionedMixin`'s
docstring is amended: it may share a host with `CartesianCoordinatesMixin`
when the host is a `MovingPlace` (its coordinates are decoration, as a
band's are, never grid-indexed). Composed by the water pack's `ReachPatch`
and `ReachStop` (river water), `BankPatch` (a walker on the bank between
places) and `SeaRoom` (the stopped sea room, D30); a floe or a raft yard
later. ⭐ What composing it claims: the host is a place whose exits are
resolved against a frame when taken, and whose ZONE is its own moving
zone — one `MovingZone` instance per moving place, minted with it and
reaped with it, whose identity never changes and whose state follows the
place (D38); a lounge satellite does not compose it and never will.

**D5 — Patches and stops are minted with identity paths, each with its
own zone; a stop persists by `(scope, key)`.** The rows are
`/system/water/location/reach/patch/water`, `…/reach/stop/water` and
`…/reach/bank/ground`, each under its own authored **kind zone** row
(`reach/patch.yaml`, `reach/stop.yaml`, `reach/bank.yaml` — class
`/system/water/location/ReachZone`, D38) so a named exit between a patch
and a stop, a bank or an authored place is cross-zone by path, as
`Location.addExit` requires. A moving patch is cloned `asIdentityPath:
/system/water/location/reach/patch/<course>/<serial>/water` (marker
`none` — it buys nothing durable and is counted; a patch is gone when
empty) **and its zone** `…/reach/patch/<course>/<serial>` (marker
`lookup` — the place's `getZone()` resolves to this instance), so
`WaterExpanse.positionFor`, `craftOfPlace`, `Band.getSurface` and
`Ship.liveMembers` — all of which resolve by template/identity path —
never collide across budded clones. A stop is `asIdentityPath:
/system/water/location/reach/stop/<course>/<km×1000>/<side>/water` (marker
`own-record`: it files its `holder_snapshots` record under it) with its
zone `…/stop/<course>/<km×1000>/<side>`, and `PersistableApi.restoreOrSeed
(stop, key)` with the same key — so a canoe beached on a bar, a sword on
the bed, a body under a strainer are there after a restart, once (the
keyed record + D34); the warren mints the zone again from the key on
restore. `WaterExpanse.craftOfPlace` is re-keyed on `stuffId` (it is
transient) and `positionFor(place)` reads a `MovingPlace`'s own frame
position before the structure/landing lookup.

**D6 — One warren, one scheduled event per patch, offsets within hail.**
`content/water/src/idea/ReachWarren.ts` =
`SingletonMixin(PersistableMixin(RoomWarren))` at
`/system/water/idea/ReachWarren`, one for the realm (the `ColumnWarren`
shape — a second river needs zero rows). It overrides `occupantsOf(m)` to
count **every tangible content** (a canoe, a body, a dropped sword), not
only `HasInteractive`, so a stop holding anything is never reaped and a
moving patch holding only a log keeps drifting; `reconcile()` captures a
stop with contents and reaps a member with none. `patchAt(course, km,
across)`, `stopAt(course, km, side)` (mint or find — the `DormWarren.admit`
shape, also the `standUpKeyed` entry for the residency pin roll),
`patchesNear(course, km, acrossBand, hailM)`, `handIn(body, course, km,
across)` (the one entry for a swept body, a boat leaving a place, a ship's
over-the-side).

Each moving patch holds a kernel **`Drift`** sustained engagement
(`lib/location/Drift.ts`, actor = the place, slot `body`, not cancelable
by anyone — the `Voyage` shape) with ONE scheduled next event: the earliest
of {the next stretch boundary, the next authored place's upstream end, the
next hazard on its side within reach, the next stop/bank-patch/ship within
hail, a merge with a patch ahead/behind, the next collection point for a
passive floater, the mouth} computed by `ReachWarren.nextEventFor(patch)`
from the line and the patch's velocity — game seconds through
`WorldClockApi.at(deadline, cb, { tag })` (never a Node timer; the callback
runs in a fresh root frame, so the handler catches and logs, as
`arriveAfter` does). On each event the patch advances its position
(current × Δt, piecewise per stretch), tells its occupants what changed
(`onFrameMoved` → *"the run opens out into a long brown pool"* — told, not
the horizon), rewires its within-hail exits (D7), resolves hazards (D12),
checks merges and splits, and schedules the next event. **Offsets:** every
mover in the patch (a swimmer stroking, a driven boat) carries a relative
km offset integrated from its own speed through the water (D11, D21); when
a mover's offset exceeds half the hail range it is **split** into a new
patch at its own km (and anything inside it comes along); when two patches
on the same course and across band come within hail they **merge** into
the elder. A wide river has `ceil(width / hailM)` across bands; a river
narrower than hail is one band across.

**D7 — Exits are resolved against the frame at traverse time.** A patch's
standing ways are `ReachExit`s (`content/water/src/idea/exits/ReachExit.ts`,
a `DeferredDestinationExit`, kind row `/system/water/idea/exits/reach`,
`wiresItsOwnInverse() → true`): `left` / `right` (the bank: an attempt,
D14), `down` (the column, D9), `upstream` / `downstream` (only for a driven
mover — a swimmer stroking or a boat; refused for a passive drifter, who
is carried), and at a junction the branch by course name (`swim delight`,
`swim kestrel`, requirement step 5). `computeDestination()` asks the warren
NOW; `canTraverse` refuses in the margin's or the line's words. The
**within-hail ways** come and go: on every drift event the warren wires a
live-ref bidirectional exit (the ships slate's rule; `Warren.wireHubExit`'s
machinery) between the patch and each fixed place within hail — an
authored river place's bank (named for the place: `quay`), a stop
(`bar`), a bank patch (`bank`), a stopped ship (named for her: `ostrander`)
— and unwires it when the patch passes out of hail. That is what gives the
throw (`Lifeline.personWithinReach` walks obvious neighbors), `hail`,
`look`, `climb` and `go aboard` their reach for free. An authored river
place hands you in and out at its ends: a `RiverPlace` (D8) declares
`span` and `ends: { upstream: handoff | <place> | end, downstream: handoff |
<place> | end }`; a body swept out of its downstream end is `handIn`'d to a
patch at the place's downstream km; a patch reaching a place's upstream
end puts its occupants into the place (the place owns the water inside).

**D8 — Authored places on the line.** Two shapes, by whether the place is
water or land:

- A **water** place on the line composes `RiverWaterMixin` (the pack's
  `src/lib/RiverWater.ts`, over `WaterPlace`): `river: { course, at,
  span?, side? }` (its position and the length of line it covers — its
  `water.of` may still cite the same position for the read), `current:
  inherit | still | eddy | { mps }` (the author's override; `inherit` reads
  the line at its position — *one owner per length*), `ends`. The pack's
  instanceable class is `/system/water/location/RiverPlace` =
  `RiverWaterMixin(Pool)` (a river place IS a pool with a line position —
  ordinary OO over the platform twin). The stream below the Wharfside quay
  is one; the gorge rooms are five; the mill pond is one.
- A **land** place beside the line (a quay, a towpath, a landing, a bar)
  cites where it stands on the bank: **`bank: { course, at, side, span? }`
  on `ShoreMixin`** (a kernel field, an opaque citation the pack
  interprets — the `waters:` precedent). A shore with a `bank` is a
  `walkable` bank at its km: a bank patch walking the river arrives in it,
  a patch within hail wires a way to it, and `look river` from it reads the
  line in view. The towpaths become `Shore` rows (`Locale + ShoreMixin`)
  with `waters: { river: kestrel:confluence-1.2 }`, a `river` detail
  (`lint:water-citations`) and a `bank`.

Host placement: `bank` on `ShoreMixin` claims every shore may stand on a
line; a sea shore authors none and `null` is honest. `RiverWaterMixin` is
the pack's and composes only on river water (the patch, the stop,
`RiverPlace`).

**D9 — The column under a moving patch; the bed is fixed.** A moving
patch's `bandsNow()` yields its lit and dark bands (they move with it —
their `surface` is the patch's minted identity, and the `ColumnWarren` keys
them on it) and **no bed**: its deepest band's `down` is a `ColumnExit`
whose target is the **stop's** bed at the patch's current km
(`ReachStop.bandsNow()` includes `bed`). `ReachPatch.sink(thing)` finds or
mints the stop at its km and moves the thing to that stop's bed; a diver
who reaches the bed is in the stop's column and the patch leaves without
them (requirement step 18). What floats up from a stop's column arrives in
the stop's surface and, if the current there is not slack, is swept
(`sweep`, D11) into a patch.

**D38 — Zones never change at runtime; a moving place has a moving
zone.** (Decided with the user, 2026-10-21; replaces the containment
opening D24 first proposed.) The principle: *no location's and no
vessel's zone ever changes; a moving place's zone is its own, with a fixed
identity for the place's life, and that zone's STATE follows the place.*

- **(a) The class and where it lives.** Kernel `lib/zone/MovingZone.ts` —
  `MovingZoneMixin` over `SpatialZone & LocationZone` (`Mixins.MovingZone`):
  holds ONE weak live ref to its place (a `Stuff & Positioned`, set by
  `adopt(place)`, which calls the zone's own `addLocation` — the
  `FromSpatialZone`-gated `setZone` is the zone's to call, so the place is
  restamped to its moving zone without any new seam), `cellSize` = the
  frame's hail range (the room IS the water within hail — so the ranged
  band ladder, light scale and `getLinearExtent` read it), and overrides
  `lookupField` / `peekField` for the **position-dependent names**, read
  off the frame at the place's CURRENT position through the kernel
  protocols: `elevation` (`LineFrame.elevationAtKm`; a sea room 0),
  `address` (`LineFrame.localityAddressAt(km)` — the reach's
  `climateLocalityPath`'s own address root, so a patch at the headwaters
  is in Rejection's weather and, as grain, its jurisdiction until the
  thalweg border is designed; a sea room answers its `Expanse`'s authored
  `address`), the climate site (`latitude` / `continentality` /
  `climateOffsetK` from the reach's `site`), and `horizon` (null — the
  river's and the sea's sightables are `horizonOnRiver` / `horizonAtSea`,
  D26). Every other name walks to the ancestor as any zone does
  (`lookupAncestorField` → the KIND zone row's enclosing chain). The
  water pack's instanceable classes are `/system/water/location/ReachZone`
  = `MovingZoneMixin(CartesianZone)` (the three kind rows above) and
  `/system/water/location/SeaZone` (`sea.yaml` over `sea/room.yaml`). A
  pack may ship a zone class (`lint:locations` derives zone classes by
  walking `extends`, never a list). **One zone per moving place**, never
  per course or per kind: `lookupField` has no asker, so two patches at
  different kilometers need two zone objects. The kind row is a
  `CartesianZone` singleton standing empty — the path resolver's answer
  for the row (*a region that only carries geography and holds no rooms*
  is a shipped shape); the per-place instances are minted from it with
  `asIdentityPath` (the singleton guard keys on the identity path, so N
  instances of one zone row are legal, exactly as N avatars are).
  Every zone reader keeps working with no change of its own: biome's
  step-5 `atmosphere.*` and `elevationFor`, address's step-2 fallthrough
  (and through it `WeatherLogic.localityOf`), access's `zoneOf` (a minted
  zone's template path is the kind row, under the water title),
  perception's `horizonAshore` (null horizon → nothing; the river reads
  its own), `Place.onDestruct` → `removeLocation`, `Location.getZone()`
  (a `CartesianZone` subclass, so the narrowing holds). Weather's
  positional lean for a sea room rides the shipped `leanAtSync(placePath)`
  unchanged, because the room itself is `Positioned`.
- **(b) The containment pre-flight is UNCHANGED, and its three clauses
  are one principle.** `moveCore`'s rule reads: an exitable may not land
  in a container of a different zone — *unless it has no zone*
  (`item.getZone() &&`), *or the destination is a band of the water
  beneath its own zone's surface* (the diving bell's opening). Restated
  as the principle this build adopts: **an exitable belongs, for life,
  to the zone its ROW lives in; a vessel whose row lives in no spatial
  zone belongs nowhere and goes wherever it is carried; and any vessel
  may go down the column beneath its own zone's water.** A boat is the
  second clause: every boat is a KIND row in `transport`
  (`/system/transport/thing/canoe` …), instanced by `props:` on a deck or
  a landing or sold from a shelf, and a pack `thing` path resolves no
  spatial zone — so a canoe's zone is `null` from its first second to its
  last, it may be put into a patch, a stop, the Wharfside stream, a
  ferry landing's stop or a ship's deck by the shipped rule, and nothing
  is ever restamped. ⛔ A boat row authored under a venue (`/world/…/thing/
  punt`) would be zoned and stuck at its first landing; the *Hesper*'s
  dinghy and Nesbit's punt are therefore transport kind rows propped
  where they lie (D20), and a transport unit test asserts that every
  `Boat`-class row in every pack resolves no spatial zone (a census in a
  test is not a runtime scan). **A boat's interior is NOT a moving
  place** and has no zone of its own (decided): a boat is a Thing in a
  water room; its interior is a transparent step in the biome walk
  (`ExitableVessel` is `Atmospheric` with no inline atmosphere), so
  everything positional about the people in it is the room's — which is
  the requirements' rule (*a thing's position is its container's,
  always*). The bell keeps the third clause. No new hook on
  `ExitableVessel`; the `followsZoneOfContainer` opening is withdrawn.
- **(c) Persistence and restart.** A moving zone stores nothing: its
  state is derived on every read from its place's frame position, which
  is stored ONCE (`Positioned.linePosition` on the place; persisted for a
  stop, runtime for a patch). On a stop's restore (`standUpKeyed` /
  `restoreOrSeed`) the warren mints the zone from the stop's key and
  `adopt`s the place before anything reads it. A zone is destructed when
  its place is (`LocationZone.canDestruct` refuses while it holds a room,
  so the warren removes the place first); `canEvict` on a moving zone
  vetoes while it holds its place.
- **(d) The map.** `location_graph` projects authored rows only, so
  minted places and zones never enter the index or the attachment
  derivation. The map WRITER is the risk: `Cartographer` records every
  exit it perceives or a walker takes as an `edge` claim with the far
  side's row path as `toLabel`, with no filter. So the kernel `Exit`
  gains **`isMapped(): boolean`** (a `@hook`, default `true`); the
  within-hail wired exits, a ship's alongside exits and every
  `ReachExit`/`SeaRoomExit` answer `false`, and `Cartographer` skips an
  unmapped exit in both its passes — *maps never name a ship*, and never
  a patch. A stop has a durable handle and may be recorded as a place a
  walker stood in; a claim naming a bar that has since gone is the map
  rotting, which is the feature.
- **(e) Lints.** `lint:locations`: the kind zone rows' stems zone their
  directories (`orphanedZones`); the four place rows carry no `coords:`
  and join `MINTED_ROWS` beside the band rows (the roster is the gate's
  design question — *is this a KIND of place?* — and it is); the zone
  classes are found by the `extends` walk. `lint:instanceable`: the
  class paths resolve into the pack's `src/`. `lint:untitled`: every path
  is under `/system/water`. `lint:identity-mints`: four marked sites (a
  patch, its zone, a stop, its zone; the sea room and its zone two more).
  `lint:location-graph`: no new exit kind row names `blocked` without
  `conditional`.

### Bodies

**D10 — The current is on the medium read.** `MediumRead` (kernel,
`api/biome.ts`) gains `currentMps` (the water's current where the occupant
is — the margin's for a body at a bank, the channel's mid-river; 0 in air,
a pool, or slack) and `roughness` (0–1). Every water place answers them:
`WaterPlaceMixin` adds `currentFor(occupant)` and `roughnessFor(occupant)`
as `@hook`s defaulting to 0; `RiverWaterMixin` answers from the line
(`inherit`) or the author's override; a `Pool` citing a sea answers the
tide's `streamMps`. Nothing else in the kernel reads a river.

**D11 — The current is a force on every immersed body, per beat.** In
`Respiration.treadBeat` (kernel, real-seconds clock): the hold cost gains a
drag term — holding position against `v` costs `½·ρ·C_d·A·v³` watts
(`A = 0.3 m²`, `C_d = 1`: 0.4 m/s is cheap, 1.5 m/s is 500 W, more than a
fresh body sustains) added to the tread; a body that is **not holding**
(floating, held up, linkdead, in the drowning response, or whose host says
so) is **swept**: `WaterPlace.sweep(body)` (a new `@hook`, default: nothing
— a pool has nowhere to sweep you) and the river's water places implement
it as `ReachWarren.handIn` at the place's downstream end. In a **patch** a
body is never swept (the patch carries it: holding costs nothing, the
tread is the surface's ordinary tread) — the force shows as the stroke
cost of going anywhere BUT with the current: `swim upstream` (a
`ReachExit`) is a timed crossing whose seconds are `stepM / (swimMps −
currentMps)` and refuses when the current is faster than you swim
(`verticalSwimSeconds`' bands give `swimMps`: untrained 0.4 … expert 1.2);
`swim downstream` adds your speed to the drift (an offset, D6).
**Rough water costs breath:** the tread's burn is multiplied by `(1 +
roughness)` and in a stretch with `roughness ≥ 0.6` each beat takes a
share of the store (`USABLE × 0.08 × roughness`, the time under) — the
feet-first float (D13) halves both. **Cold** is already the thermal
immersion fold; D17 makes a melt river colder than a lowland one.

**D12 — Hazards have a side and an approach, and a proximity trigger.**
The kernel `HazardMixin` handles its reserved `proximity` trigger: a new
`resolveProximity(mover, context: { approach: 'head-first' | 'feet-first' |
'passive' })` (`@hook`, default = the traversal resolution without the
medium clear — a swim does not clear a water hazard) that a HOST calls when
a mover comes within the hazard's reach; the drift beat calls it for every
occupant of a patch passing a hazard's km **on the hazard's side** (a
strainer on the outside of the bend is passed clear in mid-channel). The
water pack's `/system/water/thing/RiverHazard` (`HazardMixin(Good)`, the
`Trap` shape; rows `river-hazard/{strainer, hydraulic, undercut}`) carries
`side`, `approach` (a policy: `strainer` — head-first and stroking goes
over, feet-first or passive goes under and is pinned; `hydraulic` — any
approach is held, the way out is lateral or a line; `undercut` — passive
drifts in, swimming stays out), and the pin: the body is moved into the
stop minted at the hazard's km (the patch goes on), the `HazardActivity`
pin holds the body slot for `hazard.pinSeconds` × the hazard's `holdFactor`,
breath and cold keep running, and the way out is `swim <sideways>` from the
stop once the pin ends, or a line from a bank/boat within hail (`pull line`
frees a pinned body first). A hazard is a `Good` placed in its stop when
the stop is minted (so `look`, `search` and `disarm`'s found gate work as
anywhere). ⭐ A linkdead body is never handed to `resolveProximity` (D15).

**D13 — The feet-first float and foot entrapment.** `lie` in a patch
floats you (the shipped `float()`); in moving water a floating body is
**feet-first** by derivation (`Respiration.isFeetFirst()` = floating with
`currentMps > 0`): it halves rough-water cost and reads `approach:
feet-first` at a hazard; not floating and stroking (any swim act in the
last 20 real seconds) is `head-first`; everything else is `passive`.
**Standing in fast water over rock jams a foot:** a wading-depth patch or
stop has the pack's floor row `/system/water/thing/river-bed` (a floor
whose material is the stretch's bed); `RiverBed.occupy` (the posture slot)
calls the stretch's `entraps(body)` — `currentMps ≥ water.river.entrapMps`
(1.0) and bed `rock | gravel` with roughness ≥ 0.4 — and on `true` starts
a `HazardActivity` pin (`HAZARD_PIN_TYPE`, `water.river.entrapS` 45) on the
body with the line *"Your foot goes down between two rocks and the river
takes the rest of you…"*; `lie`/`swim` refuse while pinned; a rescuer's
`pull <person>` (D22) ends it; when the pin ends on its own the body is
swept (D11). Competence is never a gate here — the read (`look`, `measure
current`) says the water is fast over rock.

**D14 — Getting out is an attempt.** `swim left` / `swim right` (or `swim
for the left bank`, `swim bank`) from a patch is a `ReachExit` crossing
whose `crossingRealS` = `(across to the margin) / swimMps` and whose
destination is computed at arrival: the patch has drifted `current × t`
meanwhile; the bank at the arrival km on that side decides — `bar` or
`shelving` or `climbable` → you land in the **stop** at that km/side (a
gravel bar: `dry`, floor `river-bed`, kept while anyone or anything is in
it, gone when empty); `steep` / `undercut` / `wall` → the crossing's
`arriveAfter` refuses in the margin's words (*"the bank is a wall of roots
higher than your reach; the water carries you on"*) and you stay in the
patch, the exertion spent. `look` from a patch reads both banks in words
beforehand (*"on the left a steep undercut of roots; on the right shingle
shelves out of the water"*). Wading out: in a `riffle` patch (wading
depth) `swim left` is a wade and costs less. **Eddies** are stops with
`current: still` at the line's eddy points; `swim <eddy>` is offered when
one is within hail and landing in it holds you (rest, then climb behind
it).

**D15 — The disconnect delivery rule.** A linkdead body in a patch is
marked passive; on the next drift event the warren delivers it to the
**first holdable spot** — the next eddy, bar or stop downstream — and
`holdAtSurface`s it there (the stop keeps it, persisted); the body is
skipped by every hazard (D12), by the sweep (D11) and by the rough-water
cost; the metabolism/respiration freeze already covers cold and breath.
`Avatar.holdIfInWater` is unchanged (the patch answers `holdAtSurface` by
asking the warren to deliver). On reconnect the body is in the stop, alive,
on a bank downstream (requirement step 14).

**D16 — River ice per stretch.** `iceAt` takes a river position: a
stretch's ice reads the **stretch's** current (a pool freezes, a rapid runs
open; the margin can be still while the channel runs — border ice per
side). A frozen pool stretch's patches are **stops** (nothing moves under
a sheet on its own) whose floor is the water pack's `ice-sheet` row (the
storage-and-ice floor, with its patch log); breaking through
(`giveWay`) puts you in the water under the sheet; from there the drift
beat carries a swimmer **downstream under the ice** (the patch moves; its
`up` is refused by `ColumnExit`'s ceiling rule — *the only way up is the
hole* — unless the patch is back at the stop whose sheet has the hole, or
the sheet ends at the open rapid below). Swimming back upstream to the
hole is `swim upstream` against the current (D11). Requirement step 17.

**D17 — The water's temperature reads the source kind.** `riverStateAt`'s
temperature = the reach's air-floored temperature (shipped) adjusted by the
source: `spring` holds near the spring's ground temperature year-round
(`water.river.springK` 282), `melt` is pulled toward 274 K in proportion to
`meltM3S / m3s`, `rills` and `outlet` as today; a lowland August river
reads warm. The cold killers are then the shipped thermal immersion fold.

**D18 — The frame position is one record with two halves.**
`PositionedMixin` gains `line: string | null` and `linePosition: {
course, km, across } | null` beside the chart halves (`expanse`,
`expansePosition`); `framePath()` and `getFramePosition()` return
whichever is set; an invariant on the setter refuses both halves set at
once. No reader of `expansePosition` changes; `Voyaging.positionAtS`
branches on the half: on a line it asks the frame (`LineFrame.advance`)
with the craft's speed through the water and direction. `CourseRecord`
gains `direction: 'upstream' | 'downstream' | null` and `landing: string |
null` for the line (a node, a landing place path, or a bank stop). The
`Voyage` beat on a line reports `changesAlong` (the stretch changes, the
water paling over a riffle), arrives at the landing's km (within
`water.river.arrivalM` 50), and runs the hull checks (D26).

### Small craft

**D19 — `Boat` loses its singleton and its position.** `Boat` =
`PersistableMixin(HaulableMixin(ClimbableMixin(PullableMixin(BuoyMixin(
AssemblyMixin(EngagedMixin(MobileMixin(ExitableVessel))))))))` —
`PositionedMixin`, `VoyagingMixin` and `SingletonMixin` come off. A boat is
**a Thing in a water room**: a patch, a stop, a river place, a sea room
(D30), or a ship's deck. Its persistence key is its **chattel id**
(`isPersistenceKeyExplicit`, `pinsResidency() → true`), so an owned beached
canoe is stood up at boot by the pin roll and its owner's estate carries a
`{ key }` reference, never a copy (requirement step 24). An authored named
boat (the *Hesper*'s dinghy, Nesbit's punt) is a prop of its deck/landing
and is keyed the same way the first time it is titled. `launch`/`recover`
stay the boat's verbs (D30 changes what they do). `course` / `anchor` /
`hail` are NOT afforded by a boat any more: `paddle` is (D21), the
killick affords `anchor` (D23), a fitted tiller affords `course`, and
`hail` is the place's.

**D20 — Hulls and propulsion are parts.** A boat is an assembly whose bill
is `hull` (one, the kind's own: `{ form: flat | round | keeled, draftM,
beamM, lengthM, freeboardM, capacityKg, massKg }`) and `propulsion` (one
or more joints taking a `Propulsion` good — rows `/system/transport/thing/
propulsion/{paddle, oar, pole, sail, propeller, air-propeller}`, each `{
kind, needs: water | bottom | wind | air, crewPowered: boolean, powerW? }`).
`fit paddle in canoe` is assembly's shipped `fit`; a boat kind row names
its default parts (`parts:`), so a bought canoe comes with paddles. Kind
rows: `canoe` (round, 0.15 m draft, 2 paddles), `punt` (flat, 0.1 m, a
pole), `rowboat` (round, 0.25 m, 2 oars), the shipped `dinghy` re-authored
as a rowboat kind. Suitability is **per part against the water**: a pole
needs `depth ≤ poleLengthM`; a sail needs `width ≥ 3 × hullLength` and
wind; a propeller refuses `vegetation > 0.6` or `depth < draft + 0.3`; an
air propeller refuses nothing. Transport owns the rows (a craft exists
whether anyone paddles — the `/system/` test); the outfitter who sells
them is Rejection's content (D36).

**D21 — Small craft are propelled by their people: the one new verb,
`paddle`.** (Decided with the user, 2026-10-21: a canoe is not navigated
like a ship; `course` / `anchor` / `hail` are the helm's and stay the
ship's and the sea's, and `Boat` no longer affords any of them.)
`paddle upstream | downstream | <landing> | <bank> | bar | left | right`,
with `--inside` (hug the inside bank, where the margin current is a
quarter of the channel's — requirement step 19) and `--hard` (a burst);
`stop` ends it. The view is the transport pack's
(`content/system/transport/cmd/movement/paddle.yaml`, controller
`/system/transport/idea/cmd/movement/PaddleController`, category
`movement`), **conferred by `Boat.commandContributions.inventory`** — you
are in it. ⭐ **One verb per act:** paddling, rowing and poling are one
act — propelling a small craft with your own effort — and the fitted
crew-powered part (`paddle`, `oar`, `pole`) decides the physics and the
prose (*you dig the pole in and lean*), never a second verb; `row` and
`pole` are not verbs here. `paddle` starts a **`Propel`** sustained
engagement (`content/transport/src/lib/Propel.ts`, host the boat, actor
the giver, slots `hands` of every paddler aboard who joins — the first
`paddle` enrolls the giver; others `paddle` too to add their arms) that
on each beat (one game minute) `exert`s each paddler at their pace
(`water.craft.paddleW` 120 sustained; `--hard` 250) and sets the boat's
**speed through the water** from the summed power against hull drag
(`v = (P·η / (½·ρ·C_d·A))^(1/3)`, `η 0.5`, `A` from the hull's beam ×
draft). The patch's offset for the boat is `(v_boat − current)` upstream
or `(v_boat + current)` downstream. `stop` cancels the engagement and the
boat drifts back with the patch. A paddler whose `canSustainPace` fails
drops to the sustainable rate and is told (*"your arms are going"*).
⭐ **A small boat that is not crew-powered is steered, not paddled:** a
sail boat's bill fits a **tiller** — a row of the platform's `Helm`
(`platform/thing/Helm`, which affords `course` / `anchor` / `hail` on
`peers`, and a thing in the boat's contents is a peer of whoever sits in
it) — so a sailing dinghy answers `course` and the wind drives `Propel`
(`v` from the sail's area against the wind over the stretch, refused
where the water is narrower than three hull lengths); the cable ferry
(D31) is the same case with the current as the engine. *The instrument
affords the verb*: `paddle` by the boat you sit in, `course` by a tiller.
⚠ The known gap stands: `currentPowerW` fades on game seconds while
breath is real-time; the engagement tracks its own power and does not
read `currentPowerW`. `lint:verb-collisions`: `paddle` names no shipped
view, alias or scripting builtin (the word is only a thing keyword on a
carpet beater and two mash tuns, which the gate does not count).

**D22 — Capsize, swamping, and pulling people in.** Freeboard =
`hull.freeboardM − load / (ρ · waterplane)`; the wave height here = the
stretch's roughness × 0.6 m + any wake (D28); `wave > freeboard` **swamps**
the boat on the beat it happens: its people are moved out into the patch
(they stay together — the canoe is in the same patch, capsized:
`Boat.capsized = true`, runtime), its loose contents sink or float by the
shipped rule. `pull canoe` from the water (the `Pullable` protocol:
`Boat.pullBy(puller)`) rights it and gives the puller a hold — the boat
`buoys()` whoever holds it (`BuoyMixin`), so the tread is free; `climb
canoe` (the `Climbable` enablement, the way out of the water onto something
climbable) puts you back in it. `pull <person>` from a boat or a bank
within reach hauls a body out of the water into the boat or onto the bank:
**`PullableMixin` composes on `Creature`** with `pullBy(puller)` refusing
unless the body is in a water place the puller is beside or in a boat in
(then it is a timed step on the puller's hands, the lifeline's pace); it
ends an entrapment pin (D13). Lens 2 and the one-verb rule chose `pull`
over `grab`/`haul`/`rescue`.

**D23 — Stopping is landing; the killick is `anchor`, afforded by the
killick.** The act is the same act a ship's anchor is — stop the craft
where it is — so one-verb-per-act keeps the word; what changes is who
affords it: not the boat (D21 took the helm verbs off `Boat`) but the
**killick itself**, a `Killick` good (`/system/transport/thing/killick`, a
stone on a line, in a canoe kind's `parts:`; `commandContributions.peers:
[anchor.yaml]` — the `Helm`'s shape exactly), so whoever sits in a boat
that carries one can `anchor`. Dropped, it **holds** where `currentMps <
water.river.killickHoldsMps` (0.3) — the boat and its people become a
**stop** at that km (the patch is reaped around them); in faster water it
**drags**: the patch keeps moving at `current × 0.6` and you are told.
There is no weigh verb: the next `paddle` takes it up and goes (the line
says so). `paddle <bank>` / `paddle bar` / `paddle <landing>` lands the
boat: an attempt like a swimmer's (D14) at the boat's speed; landing puts
the boat (and you in it) in the stop; from a stop `paddle downstream`
pushes off into a new patch. A boat in an authored place (`paddle quay`)
is handed in at the place's end exactly as a swimmer is.

**D24 — Poling, lining, portage.** **Poling** is the `pole` propulsion
part: `paddle upstream` with a pole fitted works where the stretch's depth
≤ `poleLengthM` (2.5) and gives `v` from the poler's power at ×1.6 the
paddle's efficiency in shallows (a riffle is a pole's water); over depth it
refuses in words (*the pole finds no bottom*). **Lining** is the painter:
every boat kind carries a `painter` (a `Lifeline` row of `kind: painter`,
15 m, in the boat's contents); `throw painter to <person on the bank>`
makes it fast to them; `pull painter` from a bank patch or a bank place
tows the boat's patch with the puller (the puller walks upstream — `go
upstream` on the bank patch, D25 — and the boat follows at the walk's
pace while the line is held; the pull's exertion is the current's drag on
the hull per step). **Portage** is carrying: `hitch canoe` (the boat
composes `HaulableMixin` with `passageMode: walk` — a carried load is
admitted by any ground exit — and `draftFactor` by its mass over a yoke,
0.6) and the shipped tow carries it over ground exits as a unit; `unhitch`
sets it down. ⭐ No zone changes on the way (D38): a boat's row lives in
no spatial zone, so the shipped containment rule admits it into the quay's
stream, a landing's stop and the bank alike without restamping anything —
the `followsZoneOfContainer` opening this decision first proposed is
withdrawn. The gorge's walls refuse both (`walkable: false` on both banks
— no bank patch to pull from or carry on; the `ReachExit` says so).

**D25 — The bank is a moving land patch.** `/system/water/location/reach/
bank` (`BankPatch` = `MovingPlaceMixin(ShoreMixin(…Location))`, dry, floor
`river-bed`'s bank variant) is minted when somebody leaves a stop or an
authored bank place along the river (`go upstream` / `go downstream` from
a quay's bank, a bar) where the bank is `walkable`; it holds one party and
moves with them: `go upstream|downstream` is a **timed crossing**
(`crossingRealS` = `water.river.bankStepM` (100) / the mover's pace in
game seconds — `walk` 1.4 m/s, `run` 2.5, scaled by `LocomotionMode.speed`)
after which the patch's km advances a step; reaching an authored bank
place's span hands the walker into it; a bank that becomes `steep | wall |
undercut` refuses the step (*"the bank rises into a wall of roots"*). The
bank patch wires within-hail ways to water patches (D7), so the race
(requirement step 12) is the arithmetic: a runner at 2.5 m/s against a
pool's 0.3 m/s wins, against a run's 2 m/s loses; the river's beat and the
walker's timed steps share the game clock.

**D26 — The bank rescue, and reading the river.** From a bank place or a
bank patch: `look river` (the shore's cited water, as today) reads the line
in view — the stretch here, both banks, and **what is on the water within
sight** (`sightKm(pos, eyeHeightM)` to the next bend, or by height on a
straight reach): a patch with people in it is *"someone in the water,
upstream, coming down"* — pull, never push. `watch horizon` keeps a watch
on it: `PerceptionLogic.horizonFor` gains `horizonOnRiver(viewer)` (asked
before ashore for a viewer in a place with a river position) whose
sightables are the line's patches, stops, ships and hazards within sight
from the river frame (`LineFrame.sightables(pos, eye)`), so `HorizonWatch`
tells the watcher when the swimmer comes into view and nothing is
announced otherwise. The **reach window** is hail: a patch within hail of
the bank is a wired neighbor (D7), so `throw line to <swimmer>` works
(`personWithinReach` walks obvious neighbors) and `pull line` brings them
to the bank at the lifeline's pace while the patch drifts on — the
**swing** (the patch's offset for a body on a held line is `−current`, the
line's length is the leash: past `lengthM` of drift the line parts from
the holder's hands with a word). **Wading in** after a swimmer is `swim`
from the bank into the patch within hail (the way in; the current then has
you too — requirement step 13).

**D27 — A corpse sinks, then floats, by decay and temperature.**
`PostmortemMixin` gains `buoyantNow()`: `false` at `fresh`/`stale`, `true`
at `decomposed` (gas), `false` again at `spent`; the stage clock, while the
body is immersed, runs on **integrated water temperature** — per weather
segment `Q10` over the water's temperature at the corpse's position
(`riverStateAt` per segment, the flow memo's own exactness) — so a body in
a cold spring river floats days later than one in a warm pool; the
reconcile integrates segments and never samples the current temperature
(`lint:reconcile-chains`). `WaterPlace.sinks(thing)` asks `thing.buoyantNow?()`
before density. A stop's bed holding a corpse is re-reconciled by the
`ReachWarren` on each of its own captures and nightly (few corpses, cheap);
a body that floats goes up to the stop's surface, is swept, and the drift
delivers a passive floater to the next **collection point** (a point bar
stop) — requirement step 15. Not the exposure clock (decomposition-slate):
only the refloat, on the shipped stage model.

### Ships, ferries, readings

**D28 — Hull versus river, and the three limits.** `Ship` (kernel) gains
`hull: { draftM, beamM, lengthM, airDraftM? }` (every ship has a hull;
authored) and `fuel: { kind: materialTag, kgPerKmAtSpeed, speedKn } | null`
(a steamer burns cordwood; sail authors none). On a line the `Voyage`
beat, before entering each stretch: **draft** against the stretch's depth
this segment at the course's across (the pilot's channel) — too shallow
and she **grounds at the entry** (`aground: true`, persisted; `course`
refused *"she is hard aground"*); **beam** against width (refused at
planning — truth); **length** against the bend's radius (`λ / 4` from the
meander) — refused at planning; a **falls** on the course — refused at
planning (*"nothing goes up past the falls"*); the **head of navigation**
is derived: the furthest landing a ship of her draft can reach this
month. **Getting off:** a rise (the beat re-checks depth; she floats when
it exceeds her draft), **lightening** (draft is `hull.draftM + cargoKg /
(ρ · hull.lengthM · hull.beamM · 0.7)` — put cargo ashore and she floats),
or **kedging**: her boat `launch`ed into the room alongside (D30), `anchor`
from the boat a hail off drops the kedge (a stop), back aboard and `pull
capstan` (`Capstan`, a `PullableMixin(Fitting)` prop on her deck) hauls
her to the kedge in spells, each a timed step on the pullers' hands. The
pilot's knowledge stays claims: a `pilot`'s told claims on the river are
this month's channel depths per stretch (`ChartedMixin` entries on the
line's stretch ids — the same rows the sea's claims use).

**D29 — Snags, the wake, fuel, the mouth.** **Snags:** a stretch's
`obstruction` is a seeded snag density; a strike is deterministic —
`speedMps > sightSpeed(clarity, daylight)` (`sightSpeed = clarityM × 0.4
m/s` by day, a quarter of that at night) through a stretch with
`obstruction > 0.3` → `holed: true` (she stops, aground-like; `repair`
later, the ships slate's leak) and the beat says so. **Wake:** a ship
passing (within hail) a patch holding a boat at `speedMps > water.river.
wakeSpeedMps` (2.5) raises a wave `0.08 × v²` m that swamps a boat whose
freeboard is less (requirement step 27); slowed, nothing. **Fuel:** the
`bunker` is a `Holder` prop on her deck accepting goods whose material
carries the fuel's tag (cordwood); the beat consumes `kgPerKmAtSpeed ×
(v_through_water / speedKn)² × km` of it; empty bunker → speed through
water 0 (she drifts with the current, which is honest); upstream burns
more per km because the km take longer. The woodhawk sells cordwood at the
woodyard landing (`buy cordwood`, `put cordwood in bunker` — no verb).
**The mouth:** a course `downstream` past km 0 or `course bar` from the
river: on reaching the mouth the frame changes — `line/linePosition` →
null, `expanse/expansePosition` = the mouth node's position, the ship
stopped at the bar node (the next `course` is the sea's); from the sea,
`course kestrel` (the river's name is a node keyword on the mouth node)
at the bar swaps the other way to km 0 and `course upstream` proceeds; the
voyage persists either half (`PersistableMixin`). A drifting body never
enters the field (D30): the last patch at km 0 hands it into the mouth
place (the estuary channel, D37).

**D30 — The sea, brought into line.** The water pack's `SeaRoom`
(`/system/water/location/sea/room`, `MovingPlaceMixin(WaterPlaceMixin(…))`
citing its sea at its position) is budded by a `SeaWarren` (the ships
slate's expanse warren; `SingletonMixin(RoomWarren)` at `/system/water/idea/
SeaWarren`) **only where a ship has stopped**: keyed on the **hail cell**
(the 0.1° grammar the fishery already uses, refined to `expanse.hailRangeM`),
carried by the band's set (the `Drift` engagement with the sea's
`driftAtS` arithmetic — a ship hove to drifts with it, anchored holds
both); ships stopped in one cell share one room; each room's zone is its own
`SeaZone` instance (D38), minted and reaped with it. A ship stopped at sea
or on a river is **alongside** that room: she wires an exit on it named
for her to her deck and `over the side` / `ashore` on her deck back
(`Warren.wireHubExit`'s live-ref pair; `isMapped() → false`, so never
written to the map; two ships in one room are two exits); under way she
unwires them and is alongside nothing. **`launch`** moves the boat from
the deck into the room alongside (a Thing in a water room — `paddle
<ship>` rows to another ship stopped within hail, `paddle <landing>` /
`paddle ashore` where a landing's water is within hail); **`recover`**
moves it from the room onto the deck of a ship alongside that room.
**Over the side** is `swim` from the deck (the deck is a shore whose way
into the water is the alongside exit); swimmers at sea exist only where a
ship has stopped. ⭐ **`course` is refused while
her own people or boats are in the water** — her own count: bodies and
boats in the room alongside whose last place aboard was hers (the
`SeaRoom`/`ReachPatch` records `cameFrom` per arrival) — unless `course …
--leaving-them`, which records an `AccountabilityApi` event (`kind:
abandonment`) naming each person left, and only then sails. `ExpanseApi.
craftAt(placePath)` keeps answering the Structure a place is in; a boat
is no longer positioned, so the two callers that relied on a launched boat
answering (`LaunchController`, `DepthReading.seaUnder`) read the boat's
ROOM's frame position instead (a `SeaRoom`/`ReachPatch` is `Positioned`);
`LocateController` / `RouteController` / the readings answer from the room
alongside when the viewer is in a boat.

**D31 — Ferries.** A crossing is an exit kind: `/system/transport/idea/
exits/ferry` (`FerryExit`, a `DeferredDestinationExit`, kind row declares
`_conditional: true`, `media: [ground]`, `wheelPassable: true`, `_ferry:
<ferry row>`, `_fareMinor`, `_edgeMinutes`) placed on each landing with the
far landing as its destination — so it is ONE edge the route planner
costs and flags (*this way is not always passable*), and a `Journey`'s leg
across it is the same `traverse` with the wagon towed. `canTraverse`: the
ferry (a `Boat` of kind `ferry`: flat hull, a pole or a cable, capacity for
a wagon — it is an exitable vessel, a rig is a plain `Vessel`, so pre-flight
(1) admits it) must be **alongside this landing** (stopped in the landing's
stop), somebody must be at its pole (the ferryman on shift, or you), the
river's state must admit the crossing (the ferryman's threshold:
`currentMps < water.ferry.refuseAboveMps` 1.2 → *"not at this water"*), and
the fare is taken (banking's `transfer` from the mover's wallet to the
ferry's business account, the `pilot` verb's shape; refused unpaid).
`applyTraversal` handles the crossing itself: the mover (and tow) go
aboard, the ferry's `Propel` runs the crossing as a timed step
(`crossingRealS` = `width / v_across`), and the landing is computed at
arrival: the **ferry glide** — the ferryman's `navigation` band decides the
angle he holds upstream; drift = `current × t − v × sin(angle) × t`; a
competent hand lands at the far landing's span, a novice lands downstream
in a stop on the far bank and poles up (requirement step 32). The
ferryman's own act is `paddle <far landing>` (a poled punt, D21). A
**cable ferry** (`tethered: <cable row>`, a `FerryCable` thing spanning
the crossing) is the not-crew-powered case: its bill fits a tiller and
the crossing is `course <far landing>` — the current is the engine, the
tiller the angle — with zero drift at `v_across = current ×
sin(cableAngle)`; **mechanism + unit test, no authored instance**
(decided with the user: the drive has no step for it; the first crossing
that wants one is a row). **Summoning:** `hail` from a landing (the river
frame's `contactsFrom` within hail — `hail` is afforded by the PLACE: a
`ShoreMixin` host with a `bank` or a river/sea position, on `inventory`,
so a landing, a patch and a sea room offer it, and a boat offers nothing)
or `ring bell` (a `SignalBell` row on each landing) is a hearing event the
ferryman's **`ferries`** brain (`trade-haulage/src/behavior/ferries.ts`,
`witness` trigger, a `candidate` for the beat) acts on: he `paddle`s
across, refuses at high water with a shout. A **big ferry as a ship** is a
`Ship` row with a vehicle deck and the same `FerryExit` naming her — the
exit's `alongside` test reads a ship's wired exit as readily as a boat in
the stop. ⭐ **Siting (decided with the user):** the Nesbit ferry crosses
the **Kestrel just below the confluence**, from the **lower towpath**
(city side) to a new **Nesbit's landing** on the far bank that joins the
Delight road at the **milestone** — so when the ford is up a wagon still
has a way to the crossroads, the first demand the ferry has (lens 6) and
what makes step 34's route-planner leg real.

**D32 — Readings.** `measure current`: a new water-pack channel
(`/system/water/idea/reading/current.yaml`, `CurrentReading`, instrument
`current-log` — a new tool row `/system/water/thing/current-log`, a float
and a line, `capabilities: [current-log]`, sold at the outfitter and the
dive shop; `discipline: swimming`; eye rung in words: *slack · slow · brisk
· fast · racing*; the bracket by band on the figure) reading the water at
the giver's position (a water place, a patch, a boat's room, a shore's
cited water — `scope: [here]`). `measure temperature` at a water place or
of a shore's water feature reads the **water**: `TemperatureReading`'s
`here` branch asks `BiomeApi.mediumFor(giver)` first — immersed → the
medium's `temperatureK`; a feature subject that is a shore's cited water
(`via.detailPath`, the `waterSlot` shape) → `waterTemperatureK()`; the air
otherwise. `measure depth` on a river: `DepthReading` generalizes
`seaUnder` to `frameUnder` — the frame position of the giver's room or
craft; on a line the depth is `riverStateAt(pos).depthM` at the across of
the asker; a sounding over a riffle or a bar is a fix on the line only in
the sense that it names the stretch (no reckoning on a river — you always
know where you are).

### The estate defect

**D33 — A good in transient space is `loose`.** `ESTATE_LOOSE = 'loose'`
joins `inventory` and `storage` in `lib/persistence/PersistenceSlice.ts`.
`ChattelLogic.followCustodyOnce` writes `loose` when `nearestHost` is null
(instead of leaving `inventory` standing); `Estate.hydrateSlice` keeps a
`loose` entry titled with no presence (the existing *not inventory, no
key* branch), so the owner's next materialize **mints nothing** — the good
is where it was left if its holder persisted (a stop's slice carries it,
D5) and lost otherwise, titled still. A good that later lands in a
persistable host is re-placed by the same custody call. Release on GC
drops the estate entry (`_dropEstateEntry` from the chattel logic's
release path — verify, it is the one write the fix needs besides the word).
Readers of the place words (`ChattelRecord`, `ChattelRegistry.placedUnder/
placedIn`, `evictToStorage`) are unaffected. Requirement: *"Gear left on a
riverbank is there after a restart, once."*

**D34 — Fisheries per stretch; drift fishing.** `FisheryRegistry` keys a
river record on the stretch id the catalogue answers for a position
(D3) — the confluence's fish move to the pool stretches around it, the
Wharfside bank fishes the stretch the quay stands on. `FishingEngagement`
reads its reach each tick from the rod's room (`reachNow()` via
`Waters.reachAt`, memoized per tick) instead of freezing it at
construction, so a drifting canoe fishes the stretch it is over and a fight
goes on while the patch drifts toward a rapid (the engagement holds the
rod, not the room). Presentation gains a **drift** term: the pressure is
multiplied by `clamp(1 − currentMps / water.fishery.driftKillMps (1.0), 0,
1)` unless the boat is stopped (killick held, beached) — drift too fast and
nothing takes; and an **across** term: a species' habitat may author
`lies: channel | margin | any` (default any); a rod presented at the
patch's across band on the wrong side of the thalweg fishes at 0.3.
`Rod.presentsAt` and `feedsAt` are untouched. The fisher NPC fishes his
bank's stretch with no row change.

### Content and conventions

**D35 — Verbs: exactly one new, `paddle`.** Every other act rides a
shipped verb: `swim` (`jump`/`dive`) with a direction, a bank, a branch, a
place, or a canoe; `lie` (the float) and `stand`; `climb` (steps, a canoe,
a bank); `throw … to`; `pull` (a line, a painter, a canoe, a person, the
capstan); `paddle` (a direction, a landing, a bank, a bar, a ship within
hail — D21, the one new view, transport's, conferred by `Boat`); `course`
(a ship's: a direction, a landing, a node; a sail boat's or a cable
ferry's through its tiller) / `anchor` (a ship's by her helm; a canoe's by
its killick) / `hail` (the place's, where it has a river or sea position);
`ring`; `stop`; `hitch` / `unhitch` (portage); `launch` / `recover`;
`fish` / `reel` / `slack`; `measure current | temperature | depth`; `look
river` / `watch horizon`; `buy` / `put`; `go aboard` / `go ashore` / `go
upstream` / `go downstream` / `go <ferry>`; `journey`; `fit`. Collisions
checked: `drift` (mining) unused; `paddle` names no shipped view, alias
or scripting builtin; `pole`, `row`, `line`, `beach`, `land`, `grab`,
`ferry` are never verbs here; `ring`'s one view is diving's (afforded by
the bell); `course`'s view is the platform's and grows a line grammar in
its controller. New VIEWS: one (`paddle`). New arg grammar: `course`
accepts `upstream | downstream | <landing> | <node>` (already `greedy:
true`); `paddle` takes one greedy `heading` string plus `--inside` /
`--hard`; `swim` accepts `left | right | upstream | downstream | <course
name> | bank | bar | <place>` as a target word resolved by the controller
before MQL (a direction word must never be a detail keyword —
`logistics.md`'s warning). `lint:verb-collisions` and `lint:reachability`
arm A hold (`paddle.yaml` is named by `Boat`'s static; the river's
`ReachExit` ways are exits, not verbs).

**D36 — Content, by pack.** `world-seed`: the four profiles (km, ends,
drops, beds, the gorge override, Hob's Bend named at `confluence-15`, the
Kestrel's falls at **140 m** — D1), the Greywater `holloway-mouth` node,
the falls landing locality (`/world/falls-landing/`: the landing quay at
`falls-0.3`, the head of navigation — a Shore with a `bank`), the gorge
locality (`/world/kestrel-gorge/`: five `RiverPlace` rooms with `current:
inherit`, walls both sides, one authored hydraulic below the chute).
`terminus`: the Wharfside **stream**
(`wharfside/water/location/stream`, a `RiverPlace` at `confluence+0.1`,
span 0.2, `current: inherit`, exits `steps` up to the bank and `basin` into
the still basin; the bank's `river` exit re-pointed to it; the basin's
prose loses its current; the intake/outfall rows gain `at:`), the towpaths
(valley-road/towpath, estuary/lower-towpath, estuary/reach, estuary-mouth
as `Shore` rows with `waters.river`, a `river` detail and a `bank`), the
estuary channel re-cited to `kestrel:estuary` (the tidal reach; the sea's
pool keeps the Greywater), the **Nesbit ferry** (`/world/terminus/nesbit-
ferry/`: two landings with `FerryExit`s and bells, the ferryman, the punt
propped on the city-side landing from transport's kind row, a `Business`
with the fare), the ***Ostrander*** (`/world/terminus/ostrander/`:
structure, deck with helm · lead-line · capstan · bunker · her boat
(transport's rowboat row, propped), saloon, hold, **her house a terminus
`Business` row like the *Hesper*'s outfit** (decided with the user) with
master, engineer, deckhand positions on a PM-appointed roster —
`keeps-watch` for the lookout, a `stokes`-like `fires` brain feeding the
bunker on shift), the **woodyard
landing** at `confluence-12` (`/world/terminus/woodyard/`: a Shore with a
bank, the woodhawk's counter stocked with cordwood from forestry's wood
column, a `Business`). `rejection`: the **put-in** at `headwaters-1.5`
(a Shore with a bank off the kestrel-road, below the pass) with the
outfitter's shop (canoes, paddles, poles, painters, current logs,
`trade-shopkeeping`'s counter + keeper). `hearts-delight`: `sawmill-race`
added to the delight row's `works` (world-seed), both races gain `at:`,
the millsite's water read gains the hydraulics. `water`: the rows named
above (`reach/{patch,stop,bank}`, `sea/room`, `river-hazard/*`,
`river-bed`, `current-log`, `reading/current`, `exits/reach`,
`ReachWarren`, `SeaWarren`, dials), the `water.navigable.minFlowM3S`
code fallback corrected to the shipped **3**. `transport`: the boat kinds
and propulsion rows, `exits/ferry`, `Propel`. `trade-haulage`: the
`ferries` brain and the ferryman's position. No new Mongo collection; no
new document kind; a stop's record is `holder_snapshots`.

**D37 — The estuary is the Kestrel's mouth.** `channel.yaml` cites
`kestrel:estuary` (tidal: the catalogue's `tideOf` already reverses the
stream at elevation 0 — `currentFor` reads `streamMps` signed); it is the
mouth place a drifting body is handed into at km 0 (requirement step 6) and
the room a ship passes through in prose only (a ship never enters a room;
she passes the bar at km 0 → the Greywater's bar node, D29). The cove
(`pool`) stays the sea's.

## Host placement

| new field / mixin / class | host | what composing it claims about everything else on that host |
|---|---|---|
| `km`, `drop` on `WatercourseNode`; `source`, `mouth`, `bed`, `banks`, `stretches`, `hazards`, `bends`, `meander` on `WatercourseDescriptor` | `content/water/src/idea/Watercourse.ts` (authored data) | every course of ≥ 2 nodes is a line; a one-node mere authors none (D1) |
| `RiverLine` (value object) | `content/water/src/lib/RiverLine.ts` | pack `lib/`: inherited/used by the catalogue only; never instanced; no Api, no free helper |
| `LineFrameMixin` (protocol) | kernel `lib/expanse/LineFrame.ts`; composed by `Watercourse` | a `Watercourse` stood up is a frame crafts attach to; the meres answer length 0 |
| `line`, `linePosition` | kernel `PositionedMixin` | every positioned thing has at most one frame half set; `Ship` and the moving places use it; `Boat` no longer composes `Positioned` at all |
| `direction`, `landing` on `CourseRecord` | kernel `Voyaging` | a sea course leaves them null |
| `hull`, `fuel`, `aground`, `holed` | kernel `Ship` | every ship has a hull (true); `fuel: null` is sail |
| `MovingPlaceMixin` | kernel `lib/location/MovingPlace.ts`; composed by `ReachPatch`, `ReachStop`, `BankPatch`, `SeaRoom` | a place whose exits resolve against a frame and whose zone is its own moving zone; nothing authored composes it |
| `MovingZoneMixin` | kernel `lib/zone/MovingZone.ts` over `SpatialZone & LocationZone`; composed by the pack's `ReachZone` and `SeaZone` | one instance per moving place, minted and reaped with it; identity fixed, state derived from its place's frame position; stores nothing (D38) |
| `ReachZone`, `SeaZone` + the kind zone rows `reach/{patch,stop,bank}.yaml`, `sea.yaml` | pack `/system/water/location/{ReachZone,SeaZone}` = `MovingZoneMixin(CartesianZone)` | the kind row stands empty as the path resolver's answer; a named exit between two kinds is cross-zone by path |
| `Exit.isMapped()` hook (default `true`) | kernel `lib/boundary/Exit.ts`; `Cartographer` skips an unmapped exit | the wired alongside/within-hail exits and the `ReachExit`/`SeaRoomExit` answer `false` — maps never name a ship or a patch |
| `Drift` engagement | kernel `lib/location/Drift.ts` | actor = a moving place |
| `currentMps`, `roughness` on `MediumRead`; `currentFor`, `roughnessFor`, `sweep` hooks | kernel `api/biome.ts`, `WaterPlaceMixin` | every water place answers a current (0 unless it says otherwise); a pool never sweeps |
| `stateFor(occupant)` (wading by stature) | kernel `WaterPlaceMixin` | wading depth is `stature × water.column.wadeFraction` per body, the dial the fallback |
| `bank: { course, at, side, span? }` | kernel `ShoreMixin` | a shore MAY stand on a line; null for a sea shore or a mere's |
| `RiverWaterMixin` (`river`, `current`, `ends`, `span`) | pack `content/water/src/lib/RiverWater.ts`; composed by `RiverPlace`, `ReachPatch`, `ReachStop` | only river water; a sea room or a mere does not inherit the line |
| `RiverPlace` | pack `/system/water/location/RiverPlace` = `RiverWaterMixin(Pool)` | an authored water place on the line; the platform `Pool` stays the still-water class |
| `ReachPatch`, `ReachStop`, `BankPatch`, `SeaRoom` | pack `/system/water/location/{reach/patch, reach/stop, reach/bank, sea/room}` | minted, zoneless, keyed (stops) or ephemeral (patches) |
| `ReachWarren`, `SeaWarren` | pack `/system/water/idea/{ReachWarren,SeaWarren}` (`SingletonMixin(PersistableMixin(RoomWarren))`) | occupancy counts tangible contents (the override on these two only) |
| `ReachExit`, `SeaRoomExit` | pack `/system/water/idea/exits/{reach,sea-room}` | `DeferredDestinationExit`s; `wiresItsOwnInverse` |
| `resolveProximity(mover, ctx)` + the `proximity` trigger handled | kernel `HazardMixin` | a host that calls it decides when a mover is "near"; every existing hazard keeps `traversal` |
| `RiverHazard` (`side`, `approach`, `holdFactor`) | pack `/system/water/thing/RiverHazard` = `HazardMixin(Good)` | river facts live on the river's hazard class, not on the kernel mixin |
| `RiverBed` floor + `entraps` | pack `/system/water/thing/river-bed` (a `Floor` row class) | only the river's wading floors trap a foot |
| drag + roughness terms, `isFeetFirst()` | kernel `RespirationMixin.treadBeat` | every immersed body feels a current; a current of 0 costs what it costs today |
| `buoyantNow()` + the immersed stage integral | kernel `PostmortemMixin` | every corpse floats at `decomposed`; a fresh one sinks as today |
| `PullableMixin` on `Creature` (`pullBy` refusing unless in water beside the puller) | kernel `lib/creature/Creature.ts` | any body can be hauled out of water by a neighbor; corpses are `Thing`s and are `get`/`put` |
| `ESTATE_LOOSE` | kernel `PersistenceSlice.ts`; `ChattelLogic`, `Estate` readers | a titled good can have no presence |
| `Boat` recomposed; `Propulsion`, `Killick`, `Ferry`, `FerryCable`, `Propel`; the `paddle` view | `content/transport/src/thing/*`, `src/lib/Propel.ts`, `src/idea/cmd/movement/PaddleController.ts`, `content/system/transport/cmd/movement/paddle.yaml` | a boat is a thing in a water room with NO spatial zone, for life (a kind row in transport, never a venue row — D38); every boat is haulable (carried), climbable, pullable, a buoy when capsized; `Boat` affords `paddle` on `inventory` and nothing of the helm's; the killick affords `anchor` on `peers`, a fitted tiller (`Helm`) `course` |
| `FerryExit` | `content/transport/src/idea/FerryExit.ts` + kind row | a conditional ground edge; the planner costs it |
| `ferries` brain | `content/trade-haulage/src/behavior/ferries.ts` | who makes: the ferryman is haulage's (the ships slate) |
| `CurrentReading`, `current-log` | `content/water/src/idea/reading/`, `src/thing/CurrentLog.ts` | a channel any pack could have shipped; water ships it |
| `horizonOnRiver` | kernel `PerceptionLogic` (asked before ashore) | a viewer at a river position sees the line; reads the frame by `LineFrame`, never a registry |
| `at:` on `Conduit`/`ControlStructure` | pack rows + classes | a work sits at a position; `reachRef` keeps the node |

⭐ The narrowing test was run on each: `PullableMixin` on `Creature` is the
one that needed it — the guard inside `pullBy` is a STATE condition (in
water, beside the puller), not a host-set narrowing, so it stays; a
`RescuableMixin` would have been the costume. `MovingPlaceMixin` and
`MovingZoneMixin` compose on pack classes with no common ancestor below
`Location`/`SpatialZone` and are reused by a stopped sea room, which is
why they are kernel. A boat's interior is deliberately NOT a moving place
(D38): giving it one would be a zone that follows a thing, which is the
rule the user refused.

## Convention conformance

- **`props:` / `cast:`** on every place row (no `populates:`, no
  `container:`); the hazards and the painter are props of their stop/boat.
- **Locations, not rooms:** `RiverPlace` over `Pool`/`Locale`; the gorge
  and the landing are `Locale`/`Shore` rows; nothing uses
  `PersistentLocation` (the furnishable roster is untouched).
- ⭐ **Zones never change at runtime** (D38): no `setZone`/`_stampZone`
  outside a zone's own `addLocation`; a moving place's zone is minted with
  it; a boat's zone is null for life (kind rows in transport, never venue
  rows); the containment pre-flight is untouched.
- **Paths:** `/system/water/<branch>/…` for the pack's classes and rows,
  `/stuff/idea/Watercourse/<key>` for the realm's rivers (commons),
  `/world/<place>/…` for places, `/system/transport/thing/…` for craft,
  `/trade/haulage/behavior/ferries` for the brain. Controller files mirror
  their template paths.
- **Module scope declares; lifecycles initialize:** the line compiles on
  first read; the warrens are singletons stood up by path; no boot entry.
- **The import boundary:** packs import the kernel by specifier only
  (`@saxonberg/server/mud/lib/…`, `…/platform/thing/*`, `…/platform/idea/*`,
  `…/api/*`); the kernel never imports a pack — it reaches the river by
  path + `MixinApi.isLineFrame` / `isWaterColumn` shapes, exactly as
  `WaterPlace` finds the column. `lint:imports` holds.
- **No new module category, no free helper:** `RiverLine` and `Propel` are
  value-object/engagement classes in `src/lib/`; arithmetic that is not a
  class's own goes on the catalogue or the frame as a method.
- **Verbs on objects:** `boat.pullBy(puller)`, `creature.pullBy(puller)`,
  `hazard.resolveProximity(mover, ctx)`, `place.sweep(body)`,
  `warren.handIn(body, …)`, `ship.liveMembers()`; no `XApi.verb(host, …)`.
- **Methods are the contract:** every cross-Stuff read is a method; the
  patch's offsets are read through `offsetsOf()`.
- **Settings:** every new dial has a seeded literal at its call site and a
  row in `water.yaml` (`water.river.*`, `water.craft.*`, `water.ferry.*`)
  with keys in `AppSettingKeys`.
- **Prose:** American English; the engine appends nothing to an author's
  room prose — the line is read by `look river` and the patch's own
  `getLong()`.
- **Gates:** named in Grounding; the build runs `lint:family` after every
  wave and `pnpm test:near` + each touched pack's vitest; the full suite
  once before the MR and once at `/finalize`.

## Waves

Each wave is independently landable and ends at a commit
`build(river W<n>): …`. Order matters (W1 needs W0's line; W2–W4 need W1's
patch; W5 needs W1's moving place; W6 needs everything).

### W0 — The line and the profile

**Goal.** A river has a length and a character along it, readable before
anyone can be in it. **Decisions:** D1, D3, D17, D32 (current/temperature),
D34 (keys only), D36 (profiles, the data drift).

**Files.** `content/water/src/idea/Watercourse.ts` (fields, setters with
invariants); `content/water/src/lib/RiverLine.ts` (new); `content/water/
src/idea/WatercourseCatalogue.ts` (`lineOf`, `positionOf`, `stretchAt`,
`banksAt`, `hazardsBetween`, `eddiesBetween`, `collectsAt`, `sightKm`,
`riverStateAt`, `currentWaterRef` → stretch id, `readWater` adds
`currentMps`/`roughness`/`stretch` words to the read's `opaque` and
`physicalRead` prints the stretch and both banks, the source-kind
temperature, `iceAt(position)`, the ends/km compile failures, the works'
`at:`); `lib/location/WaterSource.ts` (`WaterRead.currentMps?`,
`stretch?`); `api/biome.ts` (`MediumRead.currentMps`, `roughness`);
`lib/location/WaterPlace.ts` (`currentFor`/`roughnessFor` hooks answering
0; `mediumFor` carries them); `content/water/src/thing/{Conduit,
ControlStructure}.ts` (`at`); `content/water/src/idea/reading/
CurrentReading.ts` + `content/water/content/system/water/idea/reading/
current.yaml` + `src/thing/CurrentLog.ts` + its row; `platform/idea/
reading/TemperatureReading.ts` (the water branch); `content/water/content/
settings/water.yaml` (+ `AppSettingKeys`); the four profile rows + the
Greywater `holloway-mouth` node; `lint:census` arm for `hazards[].row`;
tests `RiverLine.test.ts` (the step–pool distribution, the seeded meander
is stable across two compiles and differs across seeds, banks flip at a
bend, a hydraulic appears below each weir, the ends and km failures name
themselves, the lower Kestrel at 140 m reads as pools and riffles and at
the old 500 m as rapids — the D1 decision pinned), the
catalogue's read tests, the reading tests.

**Acceptance.** `look river` at the Wharfside bank prints the stretch, its
current in words, both banks; `measure current` prints a bracketed m/s;
`measure temperature` in the basin prints the water's figure, not the
air's; `analyze water` unchanged; a course missing `mouth` fails the
compile naming the course; the fishery at the bank keys on a stretch id;
`lint:family` green; `pnpm -C packages/content/water test` green.

**Commit.** `build(river W0): the river as a line — profile, stretches, banks, hazards, two readings`

> ✅ **W0 done (2026-10-21).** Build notes, for whoever reads this after
> the context is gone:
> - **Depth and current are Manning's NORMAL depth with continuity**, not
>   `0.4·Q^0.4 × kind`: `d = (Q·n / (w·√S))^0.6`, `v = Q/(w·d)`, at the
>   stretch's own gradient (a pool ×1.3 for bend scour). The plan's kind
>   multipliers overestimated a pool's speed (~1.1 m/s at the confluence);
>   the normal depth gives a pool ~0.35 m/s and a riffle ~1.4 m/s from the
>   same water, which is what the drive needs.
> - **`water.river.rapidGradient` is 0.012, not 0.008**, and crossings are
>   **0.3** of a bend: with the plan's 0.008 every crossing on the 0.27 %
>   lower Kestrel was a rapid (the step gradient there is ~0.85 %), which
>   contradicted the plan's own *"pools with a riffle every half mile"*.
>   Pinned by `RiverLine.test.ts` (140 m → pools and riffles; 500 m → rapids).
> - **A node citation with no offset is a POSITION** (the stretch at the
>   node's km) — so a shore citing `kestrel:confluence` reads the stretch
>   the quay stands on, and the fishery's confluence stocks live in the
>   POOLS around it (D34); `FisheryRegistry.test.ts` now reads the nearest
>   pool. Flow, chemistry, contamination and stocks resolve to the nearest
>   node; current and temperature are the position's own.
> - **Offsets are DOWNSTREAM-positive** (`confluence+0.4` = km 8.6), so the
>   plan's `falls-0.3` (the landing *below* the falls) and `headwaters-1.5`
>   (the put-in) were upstream of their nodes — one above the falls, one off
>   the top of the river. Decided: the falls landing is at **`falls+0.3`**
>   and the put-in at **`headwaters+1.5`** (W2/W3 content). Hob's Bend at
>   `confluence-15` (km 24) and the woodyard at `confluence-12` are right.
> - **Kms authored:** Kestrel 62/48/41/9/0 (the slate's); Delight 60/40/0
>   (lengthened so the flats→mouth reach is 0.36 % and its crossings are
>   riffles — the ford is an authored riffle override at `mouth-0.4..-0.25`);
>   Holloway 45/25/0; Cold Fell 9/5/0 (a sink).
> - The ends/km rule broke every multi-node test fixture, as it should
>   (fails loudly); fixtures got neutral `source: rills, mouth: sink` and
>   km by index. `RiverLine` carries a class-level `@internal`
>   (`lint:lib-statics`). The current log is stocked at the dive counter
>   (`lint:reachability` arm R); the outfitter adds it in W3.
> - The climate drive asserts nothing about the falls reach (risk 1 is moot).

### W1 — The moving place and the reach patch

**Goal.** Swim off the quay into the stream and be carried; two swimmers
within hail are together; a bar is a stop; the estuary hands you in; the
estate defect is fixed. **Decisions:** D2 (the frame protocol and
attachment — no ship yet), D4–D9, D15 (delivery only), D33, D37, D36
(stream, towpaths, estuary).

**Files.** kernel: `lib/location/MovingPlace.ts`, `lib/location/Drift.ts`
(new), `lib/expanse/Positioned.ts` (D18), `lib/expanse/LineFrame.ts` (new),
`lib/mixin.ts` (`MovingPlace`, `LineFrame`), `api/mixin.ts` (predicates),
`lib/location/Shore.ts` (`bank`), `lib/location/WaterPlace.ts` (`sweep`
hook, `stateFor` by stature, `holdAtSurface` → delivery when the place is
moving), `platform/idea/LocationGraphRegistry.ts` (`line` → `craft`),
`lib/persistence/PersistenceSlice.ts` + `platform/idea/api/ChattelLogic.ts`
+ `lib/chattel/Estate.ts` (D33), `lib/zone/MovingZone.ts` (new, D38),
`lib/boundary/Exit.ts` (`isMapped()`) + `lib/location/Cartographer.ts` (skip
unmapped exits), `lib/mixin.ts` (`MovingZone`), `api/weather.ts` +
`platform/idea/api/WeatherLogic.ts` (`forgetScope(stuffId)` — risk 2),
`scripts/check-location-classes.ts` (the four rows join `MINTED_ROWS`).
The containment pre-flight is NOT touched (D38 b). water pack:
`src/idea/ReachWarren.ts`, `src/location/{ReachZone,ReachPatch,ReachStop,
BankPatch,RiverPlace}.ts`, `src/lib/RiverWater.ts`, `src/idea/exits/
ReachExit.ts`, `src/idea/Watercourse.ts` (composes `LineFrameMixin`;
`elevationAtKm`, `localityAddressAt`, `climateSiteAt`), `src/idea/
ColumnWarren.ts` (a moving surface's bands; the bed on the stop), rows
under `content/system/water/location/reach/{patch,stop,bank}.yaml` (the
kind zones) + `reach/{patch/water,stop/water,bank/ground}.yaml`,
`idea/ReachWarren.yaml`, `idea/exits/reach.yaml`, `src/idea/WaterExpanse.ts`
(D5 re-key). terminus:
the stream, the bank's exits, the basin prose, the towpaths and estuary
rows (D36/D37). Tests: `MovingPlace.test.ts`, `Drift.test.ts`,
`ReachWarren.test.ts` (bud/merge/split, offsets, next-event, a stop
persists keyed and is reaped when empty, non-interactive occupancy),
`ReachExit.test.ts`, `Estate.loose.test.ts` (the duplicate is gone),
`Positioned.frame.test.ts`, `MovingZone.test.ts` (a patch's zone answers
the line's elevation and locality at its km and changes as it drifts
while `getZone()` is the same object throughout; a stop restored from
its key gets its zone back before any read; the zone is reaped with its
place; a named exit patch→stop passes `addExit`), `Exit.mapped.test.ts`
(a walked unmapped exit writes no claim).

**Acceptance.** Drive steps 1–6 pass over the wire (stage A file); a
restart with a sword on a bar brings the bar and one sword back; the
underwater, fishing and storage-and-ice drives still pass (the basin, the
column and the bank are unchanged in behavior).

**Commit.** `build(river W1): the moving place — reach patches, stops, the bank, the estate's loose goods`

> ✅ **W1 built (2026-10-21).** Decisions the build made:
> - **Stops persist by `(row, key)`, NOT identity-stamped** (D5 said both).
>   `PersistableApi.standUpKeyed(scope, key)` clones the SCOPE as a row, so
>   a minted identity with no row can never be stood up — an avatar logged
>   out on a bar would have come back nowhere. The stop's key is its
>   position (`kestrel@8650@left`); its row is shared; its zone is minted
>   with an identity of its own (`/system/water/location/reach/stop/…`).
>   Patches are never persisted and share their row too.
> - **No column under river water** (D9 deferred): the deepest Kestrel pool
>   is ~2.5 m at the thalweg, too shallow for bands. A patch's `down` is a
>   `ReachExit` to the STOP at its km (the bed), what sinks goes to that stop
>   (`ReachPatch.sink`), and a stop's floor is the bed. The column under a
>   moving surface waits for a river deep enough to need it.
> - **`Drift` is a schedule holder, not an `EngagedMixin` engagement**: a
>   patch is not an actor; it holds one `WorldClockApi.at` event (host = the
>   patch). Event = next stretch boundary / place upstream end / a fixed
>   place coming within hail / the river's end, capped at 600 game-s.
> - **Offsets are discrete strokes**: `swim downstream|upstream` from a patch
>   is a timed crossing of 1.1 × hail that lands you in the patch within hail
>   there (catching up = joining it) or a new one (splitting). Merge radius =
>   hail. Crossings are reckoned in GAME seconds and handed back as real ones
>   (risk 5: in real seconds a 40 m margin swim drifted you a kilometer).
> - **The line names its places** (`places:` on the Watercourse row, census
>   arm) instead of places being searched for — the reverse-question rule.
> - **A bank's way in** is a kernel hook: a `Shore` with a `bank` tells its
>   water source it stood (`WaterSource.onBankStood`), and the water pack
>   installs a `river` `ReachExit` (way `enter`); `Exit.leadsIntoWater()` is
>   the kernel hook a bare `swim` reads (default: the far side is a loaded
>   water place).
> - **`lint:locations`**: the two reach rows are `OWN_FRAME` (each patch is
>   its zone's origin), not `MINTED_ROWS` (that roster is the kernel
>   `Location` class only).
> - The quay's `river` exit goes to the new **stream** (requirement 2); the
>   basin has its own `basin` exit — sibling drives that typed a bare `swim`
>   at the quay for the basin must say `swim basin` now.

### W2 — Bodies

**Goal.** The current is felt every beat; the ford reads the body; floats,
entrapment, rough water, hazards with a side, the rescue three ways, the
disconnect delivery, the corpse that floats again, river ice.
**Decisions:** D10–D17, D22 (`pull <person>`), D25, D26, D27.

**Files.** kernel: `lib/respiration/Respiration.ts` (drag, roughness,
`isFeetFirst`, the sweep call), `lib/hazard/Hazard.ts` (`proximity`,
`resolveProximity`), `lib/hazard/HazardActivity.ts` (a hold factor),
`lib/mortality/Postmortem.ts` (`buoyantNow`, the immersed integral),
`lib/creature/Creature.ts` (`PullableMixin`), `platform/idea/cmd/inventory/
PullController.ts` (a person as target; `pull.yaml` gains the target
`requires: [PullableMixin]` — already), `platform/idea/api/PerceptionLogic.ts`
(`horizonOnRiver`), `platform/idea/cmd/posture/LieController.ts` (the
feet-first line), `platform/idea/cmd/movement/{SwimController,
LocomotionControllerBase}.ts` (direction words; the attempt's
`arriveAfter` refusal in the margin's words). transport: `src/idea/
FordExit.ts` (the per-body attempt; `floodThresholdM3S` retired;
`delight-ford.yaml`). water pack: `src/thing/{RiverHazard,RiverBed}.ts` +
rows, `ReachWarren` (hazards, delivery, collection, the corpse sweep), the
ice per stretch, `src/location/BankPatch.ts` steps, the gorge locality and
its hydraulic (world-seed), the mill weirs' `at:`. Tests:
`Respiration.current.test.ts` (holding cost, swept when passive, rough
water, feet-first halves), `Ford.body.test.ts` (tall crosses, short is
swept, over-the-head refuses), `RiverHazard.test.ts` (side, approach,
pin, the linkdead skip), `Entrapment.test.ts`, `BankPatch.test.ts` (the
race arithmetic), `Corpse.refloat.test.ts` (sinks fresh, floats at
decomposed, cold delays), `RiverIce.test.ts`, `horizonOnRiver.test.ts`.

**Acceptance.** Drive steps 7–18 pass (stage B file; 15 and 17 are
clock-jumped within the harness's ceiling or asserted at their start, with
the finish unit-tested — see Test & gate strategy); every refusal in the
water's own words.

**Commit.** `build(river W2): bodies in moving water — the current, the ford, hazards, the rescue, the delivery, the corpse`

> ✅ **W2 built (2026-10-21), landed in the W1 commit and the W3 commit.**
> Decisions the build made:
> - **The current in `treadBeat`** is a drag `½ρC_dAv³` paid every beat
>   while you hold station, and the sweep when you do not; rough water takes
>   a share of the store; the feet-first float halves both. A body's own
>   swim speed is `Respiration.swimSpeedMps` (the stroke, noted per crossing).
> - **The ford reads the body** (`FordExit.verdictFor`): over the head
>   (0.85 × stature) refuses — a swim; depth × speed past the
>   0.6 m²/s standing figure scaled by stature and mass sweeps you, handed to
>   the warren at the ford's citation. `floodThresholdM3S` is retired.
> - **Entrapment lives on the bed** (`RiverBed.occupy`): taking your feet in
>   a riffle or rapid over rock or gravel at ≥ 1 m/s pins you (a
>   `HazardActivity`); `pull <person>` (now `PullableMixin` on `Creature`)
>   cancels it; when it ends the river hands you on.
> - **Hazards are things with a side** (`RiverHazard`, `HazardMixin(Good)`),
>   minted onto a patch when the line puts one within reach; `catches`
>   reads the approach (passive / feet-first / swimming).
> - **A corpse floats again at `decomposed`** (`Postmortem.buoyantNow`);
>   the warren's drift fetches a floating body up on the next bar.
> - ⭐ **The drive found it:** a swimmer who found their feet in the
>   shallows kept the swim mode, and every bank refused them as water too
>   rough to swim (`gate: capability`); and the patch that drifted into a
>   deep pool kept them standing. Fixed by the bed's `occupy` dropping a
>   water mode for walk (the mirror of `giveWay`), the warren reconciling
>   who the bed bears whenever a place's depth is refreshed, and the patch's
>   `left`/`right` ways taking ground as well as water (you wade out).
> - ⚠ **Owed, not built yet:** river ice per stretch (D16, drive step 17)
>   and white water heard ahead (step 9) are wired in code (`hearAhead`) but
>   undriven — the lower Kestrel has no rapid within a drift of a standing
>   place. Recorded for W6.

### W3 — Small craft

**Goal.** A canoe goes where you would swim. **Decisions:** D19–D24, D34
(drift fishing), D36 (the put-in and outfitter).

**Files.** transport: `src/thing/Boat.ts` (recomposed; affords `paddle`),
`src/thing/Propulsion.ts`, `src/thing/Killick.ts` (affords `anchor` on
`peers`), `src/thing/FerryCable.ts` (the row class only; D31 uses it),
`src/lib/Propel.ts`, `src/idea/cmd/movement/PaddleController.ts` +
`content/system/transport/cmd/movement/paddle.yaml` (the one new view;
`greedy: true` heading; `requiresAnimate`, `requiresConscious`), rows
`content/system/transport/thing/{canoe, punt, rowboat, ferry, killick,
propulsion/*}.yaml` (a sail boat kind's bill names a `tiller:` part — a
`/platform/thing/Helm` row), `hesper/thing/dinghy.yaml` retired for the
rowboat kind propped on the deck; `platform/idea/cmd/movement/
CourseController.ts` (a tiller in a `Boat`: the craft is the vessel the
helm stands in, and `Propel` runs under sail); `platform/idea/cmd/
inventory/PullController.ts` (a boat as target); `lib/slot/Haulable.ts`
(`passageMode: walk` admitted — verify the terrain gate reads `media` for
a walk mode); trade-fishing: `src/lib/FishingEngagement.ts` (`reachNow`,
drift and across terms), `Species.habitat.lies`; rejection: the put-in and
the outfitter; `trade-diving`: the `painter` lifeline kind row. Tests:
`Boat.keyed.test.ts` (two canoes from one row, keyed by chattel, restored
once), `Boat.zone.test.ts` (every `Boat`-class row in every pack resolves
no spatial zone; a canoe moves patch → stream → landing stop → bank with
`getZone()` null throughout — D38), `Paddle.test.ts` (the view is
conferred by `Boat`; `paddle` refuses with no crew-powered part; speed
from power, slack vs channel, tire and drift back; `--hard`), `Pole.test.ts`,
`Sail.test.ts` (a tiller affords `course`; refused on narrow water),
`Lining.test.ts`, `Portage.test.ts` (the gorge refuses), `Capsize.test.ts`,
`Killick.test.ts` (`anchor` afforded by the killick; holds slack, drags
fast; the next `paddle` takes it up), `DriftFishing.test.ts`.

**Acceptance.** Drive steps 19–24 pass (stage C file); the maritime drive's
step 15 is red here and is fixed in W5 (recorded in the commit).

**Commit.** `build(river W3): small craft — hulls and propulsion by part, paddling, poling, lining, portage, the killick, drift fishing`

> ✅ **W3 built (2026-10-21).** Decisions the build made:
> - **Propulsion is CARRIED, not fitted.** A `Propulsion` part (paddle,
>   oar, pole) is a thing in the boat; `Boat.propulsion()` reads the first
>   crew-powered one. No assembly bill — a paddle is not a part of a canoe,
>   it is in it, and you can hand it to the next boat (lens 2: a new boat
>   kind is one row with `props:`).
> - **`Boat` is not Persistable.** It persists as content of the stop it is
>   beached in (stops are persisted, W1) and as its owner's estate; the
>   `Boat.keyed` test is replaced by the census that every `Boat` row is a
>   transport KIND row (D38's zone-null guarantee), `Boat.test.ts`.
> - **`Propel` is one engagement on the paddler's hands**, beating every
>   20 game-s: `v = ∛(P·η·crew / (½ρC_dA))`, the current added downstream
>   and subtracted upstream (losing ground is told once), `--inside` reads
>   the river at the inside of the bend, a pole needs `depth ≤ reach` and is
>   the strongest thing in the shallows, a wave over freeboard capsizes.
>   Each 1.1 hails of way moves the boat into the water the warren names —
>   the same `destinationOf` a swimmer's stroke takes.
> - **`launch` / `recover` by shape**: the river's warren gives the stop at a
>   bank's edge (`launchPlaceFor`) and the bank within hail
>   (`recoverPlaceFor`); the sea's will answer the same two questions (W5).
> - **The killick** affords the platform's `anchor` (`AnchorController` asks
>   a duck-typed `dropAnchor` first); the warren holds a boat under
>   `water.river.killickHoldsMps` by turning its spot into a stop.
> - **The put-in** (D36): rejection's `put-in` zone, a Shore at
>   `headwaters+1.5` left, Ada Fenn's boat shed (`Fenn's boats`, a Stock
>   counter selling canoes, a punt, paddles, a pole, killicks, a current
>   log and a thermometer); the upper climb gains `down` to it.
> - ⚠ **Owed for W6, not built in this wave:** lining from the bank, sail /
>   tiller (`course` in a `Boat`), `FerryCable` (W5 needs it), the
>   lifeline `painter`, `DriftFishing.test`. Drive steps 23–24 are
>   unit-territory (fishing's reach-following is in `FishingEngagement`;
>   a wire drive cannot restart its own server).

### W4 — Ships on the river

**Goal.** The *Ostrander* steams the lower Kestrel. **Decisions:** D18
(the line half of the voyage), D28, D29, D32 (`measure depth`), D36 (the
*Ostrander*, the falls landing, the woodyard, Hob's Bend).

**Files.** kernel: `lib/expanse/Voyaging.ts` (the line branch of
`positionAtS`, `steer` on a frame), `lib/expanse/Voyage.ts` (`changesAlong`,
the hull checks, fuel, the wake, snags, the frame change at the mouth),
`platform/idea/Ship.ts` (`hull`, `fuel`, `aground`, `holed`, the alongside
wiring — `comeAlongside(room)` / `leaveAlongside()` called by `anchorHere`/
`steer` on both frames), `platform/thing/Capstan.ts` + row, `platform/idea/
cmd/movement/CourseController.ts` (line grammar; refusals for the falls,
the beam, the bend; `--leaving-them`), `platform/idea/AshoreExit.ts` (a
landing on a line), `platform/idea/AboardExit.ts` (a ship alongside a
river place's stop); water pack: `src/idea/reading/DepthReading.ts`
(`frameUnder`), `Watercourse` `LineFrame` methods (`advance`, `landingsAlong`,
`changesAlong`, `sightables`, `mouth`), `ReachWarren` (a ship's room
alongside = the stop at her km; her over-the-side exit), `ChartedMixin`
claims on stretch ids (the pilot). content: the *Ostrander* and her outfit,
the falls landing, the woodyard, Hob's Bend, cordwood on the woodhawk's
counter. Tests: `Voyaging.line.test.ts` (upstream slower and burns more,
arrival at a landing, the mouth swap both ways), `Hull.test.ts` (draft vs
August depth at Hob's Bend grounds at the entry; lightening floats her;
the kedge), `Snag.test.ts`, `Wake.test.ts`, `Alongside.test.ts` (exits
wired on stop, unwired on sailing; two ships two exits; `course` refused
with her own people in the water; `--leaving-them` records the event).

**Acceptance.** Drive steps 25–31 pass (stage D file, first half).

**Commit.** `build(river W4): ships on the line — the voyage, the hull against the river, grounding, snags, the wake, wood, the mouth`

> ✅ **W4 built (2026-10-21).** Decisions the build made:
> - ⭐ **The passage is planned, not integrated per read.** A ship's
>   position on a line cannot be derived synchronously the way the sea's
>   is (the flow behind the current is async), so `course` asks the frame
>   for a `PassagePlan` — `[km, atS]` at every stretch boundary, and the
>   stop it will come to (landing · aground · holed · stemmed · falls ·
>   mouth · head) — and the plan rides the persisted `CourseRecord.line`.
>   `getLinePosition()` interpolates it; restart-safe; the watch (10 game
>   minutes on a river) tells what changed, burns fuel, throws the wake, and
>   acts on the stop when it comes.
> - **`course upstream` with no landing stops below the first falls** (the
>   head of navigation); a landing beyond a falls is refused before she moves.
> - **Snags strike above obstruction 0.5**, not D29's 0.3: the profile
>   derives a wooded bend's obstruction in 0–0.6, so 0.3 put a snag on
>   nearly every stretch (the planner's test found every passage holed).
>   Sight is `clarityM × 0.4` with clarity 6 m (a quarter at night);
>   `course … slow` runs at 40% through snag water, and the watch tells
>   when snags show ahead. Lens 1: the rule is visible and acted on.
> - **The *Ostrander* draws 0.6 m light** (a sternwheeler), not 1.2: the
>   derived riffles are shallow; the live drive says whether she floats.
> - **The bunker is a ref on the ship** (`bunker:`), a `Chest` on her deck
>   — cordwood burned billet by billet, the remainder carried as debt; an
>   empty bunker sets her drifting downstream with the current.
> - **Kedging** is `Capstan` (`pull capstan`): it hauls a grounded ship to a
>   stop within hail holding a boat with its killick, and she floats if the
>   water there is deeper than she draws.
> - **The mouth swap** is the ship's (`onPassageStop('mouth')` → chart at
>   the river's mouth node), and back in is `course <river>` at a node that
>   names its river (`ExpanseNode.river`, the bar's `river: kestrel`).
> - **Her people in the water** (D30, brought forward from W5): a water
>   place told it was entered from a ship's deck tells her
>   (`Ship.noteOverboard`); `course` refuses while any is still in the
>   water; `--leaving-them` sails and records an `abandonment` accountability
>   row (a fifth kind, never terminal).
> - **Alongside on a river** is a landing within 60 m of her position, read
>   off the river's list of places — `AboardExit`/`AshoreExit` gained a line
>   branch. Over the side is an authored `overside` reach way on her deck.
> - ⚠ **Not built:** the pilot's `ChartedMixin` claims on stretch ids;
>   beam/length refusals are planned but no authored river is narrow or
>   tight enough to hit them yet.

### W5 — Ferries, and the sea brought into line

**Goal.** The Nesbit ferry crosses by the swimmer's physics; the sea's
boats and swimmers follow the river's rule. **Decisions:** D30, D31.

**Files.** transport: `src/idea/FerryExit.ts` + kind row, the `Ferry` kind
row, `FerryCable`, `Propel` (the glide, the cable); trade-haulage:
`src/behavior/ferries.ts`, the ferryman position; terminus: the Nesbit
ferry locality (landings, bells, the punt, the ferryman, the business, the
fare); water pack: `src/idea/SeaWarren.ts`, `src/location/SeaRoom.ts`,
`src/idea/exits/SeaRoomExit.ts`, `src/location/SeaZone.ts` + `sea.yaml`
(D38), rows; transport: `Launch/RecoverController.ts` (into/out of the
room alongside), `PaddleController.ts` (`paddle <ship>` in a sea room rows
to a ship stopped within hail; `paddle ashore` / `paddle <landing>`);
`WaterExpanse` (`currentWaterRef` for a sea room); kernel: `ExpanseLogic.craftAt` callers
audited (`LocateController`, `RouteController`, `HailController`,
`BearingReading`, `LatitudeReading`, `keeps-watch` read the room's frame
when the viewer is in a boat); `packages/wire/tests/maritime-space.dirty.
wire.test.ts` step 15 rewritten (launch → *you are in the water beside
her*; `recover`; over the side; `course` refused until recovered). Tests:
`FerryExit.test.ts` (alongside gate, the fare, the planner edge is
conditional, a journey's leg crosses with a wagon, the glide by band, the
cable), `ferries.brain.test.ts` (hail → crosses; high water → refuses),
`SeaWarren.test.ts` (keyed by hail cell, carried by the set, shared by two
stopped ships, reaped when empty), `Boat.seaRoom.test.ts`.

**Acceptance.** Drive steps 32–35 pass (stage D second half, stage E);
the maritime drive is green again.

**Commit.** `build(river W5): ferries, and the sea's boats and swimmers brought into line`

> ✅ **W5 built (2026-10-21), with the W3 items owed.** Decisions the build made:
> - **The sea's warren keys rooms by distance, not by a cell.** A ship
>   stopped within hail of a room's spot shares it; a rounded cell key put
>   two ships eight meters apart into two waters at a cell line (the
>   test found it). Rooms do **not drift** — a stopped ship holds her fix,
>   and so does her water; a ship hove-to drifting with the set is the
>   ships slate's. No column under the sea room (`bandsNow` is empty).
> - **Over the side is an authored way on a sea-going deck** (`side`, a
>   `SeaRoomExit` kind row), refused while she is under way; up is a way
>   named for the ship, installed on the room. `locate` in the water beside
>   a ship reads her reckoning (`SeaRoom.alongsideCraft`).
> - **On a river, her boat goes into the water at her position** (the
>   warren's `launchPlaceFor` reads a ship's deck) and comes back up onto
>   her deck while she lies within hail.
> - **Ferries:** `FerryExit` (transport) with `ferry`, `house`, `fareMinor`,
>   `crossesReach`, `tethered`; the glide by the poler's `navigation` band;
>   the fare through `EmploymentApi.settleSale` (the shipped retail path —
>   no operator serves free, and the shipped float policy applies rather than
>   a new refusal); a hand who does not angle lands downstream in a stop with
>   the ferry. **Summoning is the bell, not `hail`:** the ferry bell is a
>   `SignalBell` row that now remembers when it was rung, `ring`'s scope
>   takes a bell on its post, and the ferryman's `ferries` brain (an
>   ungated beat) answers it by crossing with the ferry — at high water he
>   shouts the refusal across. `hail` from a landing (a place-afforded
>   hail) is not built.
> - **The cable ferry** is `FerryCable` + `FerryExit.tethered`: the
>   current drives her across at `current × sin(angle)`, nothing drifts,
>   slack water refuses. Mechanism + unit test, no authored instance (D31).
> - **Nesbit's ferry**: the lower towpath ↔ Nesbit's landing (right bank,
>   `confluence+0.4`) ↔ the milestone; Orrin Nesbit, his house, the fare (2),
>   both bells; the ferry propped on the city side.
> - **Lining (owed from W3) rides the shipped lifeline:** a `painter` row
>   (a `Lifeline`, 15 m, sold at the put-in) thrown from the boat to
>   somebody on the bank; as they walk the bank (a bank patch) the boat comes
>   to the water beside them (`ReachWarren.lineBoatTo`), the walker paying the
>   current's drag. ⚠ Lining from an AUTHORED bank place is not built — a
>   bank patch only.
> - **The sail (owed from W3):** a `sail` propulsion part (needs wind, not
>   crew-powered), a `tiller` (a `Helm` row, so it affords `course`), a
>   `sailing-dinghy` kind propped at the estuary mouth; `course` in a small
>   boat delegates to `Boat.sailCourse` by shape; `Propel` under sail makes
>   a third of the wind's speed (less beating upstream), nobody tires,
>   refused below 1.5 m/s of wind and on water narrower than three hull
>   lengths.
> - **River ice (owed from W2, D16) — the body under the sheet:** the
>   kernel `WaterPlace.headOutAt` hook; a reach patch in a stretch frozen over
>   answers `false` (no air: the breath model does the rest), its way up is
>   refused in the ice's words, and the drift says when the ice closes over.
>   ⚠ Not built: frozen stretches' places taking the `ice-sheet` floor (so
>   walking out on a frozen river is still not possible), the hole.
> - **Drift fishing** is unit-tested (`DriftFishing.test.ts`).

### W6 — The drive, the docs, the sweep of what the build touched

**Goal.** The exit criterion. **Files.** `packages/wire/tests/river-a.dirty.
wire.test.ts` … `river-e.dirty.wire.test.ts` (one file per stage, each
with its `DIRTY_REASON` and `declareFile({ packs })`; the harness's
`advanceWorldClock` for the corpse and the ice; every checkpoint asserts
the verb was UNDERSTOOD (status ok or a NAMED refusal) and a state change
or the words that prove one — never `refusedFor` alone); `docs/subsystems/
river.md` (new, the source of truth: the line, the patch, bodies, craft,
ships, ferries, the sea rule, files, dials, known gaps); updates to
`watershed.md` (the line section, `at:`, the works' hydraulics),
`underwater.md` (the moving column, the bed, the current on the medium,
the sea room), `expanse.md` (the frame halves, the sea room, launch/
recover, `course --leaving-them`), `fishing.md` (per stretch, drift),
`logistics.md` (the ferry edge), `chattel.md` (`loose`), `hazard.md`
(`proximity` handled), `respiration.md` (the current and roughness terms,
feet-first), `mortality.md` (refloat), `locomotion.md` (direction words),
`content-packs.md` one line for the new packs' rows; `CLAUDE.md`'s map
line for `river.md` (left to the sweep — index files are swept, not raced);
the slates: `river-slate` → the compaction pass's job at `/finalize`
(deferred seams below); the drive record appended to this plan.

**Commit.** `drive(river): the five stage files, and what they found`, then
the doc commits.

## Reachability wiring

| capability | verb | affordance (the static) | data (the row) | boot / warm | arg gate |
|---|---|---|---|---|---|
| `look river` reads the line | `look` (shipped) | `ShoreMixin` (shipped) | `waters.river` + a `river` detail on the place (`lint:water-citations`) | the catalogue's lazy compile | — |
| `measure current` | `measure` (shipped platform view) | the instrument affords nothing: the channel is a ROW the catalogue warms | `current.yaml` + `current-log.yaml`; sold at the outfitter and the dive shop (a stocked line) | `ReadingCatalogue` lazy + `onCreate` | `scope: [here]`; no object arg |
| `measure temperature` of the water | `measure` | — | `temperature.yaml` (`scope: [subject, here]`) | — | ⚠ the feature subject must bind: the binder's detail candidate (the `fish kestrel` shape) |
| `measure depth` on a river | `measure` | — | `depth.yaml` (`instrument: sounding`, the lead line a prop on the *Ostrander*'s deck and the outfitter's shelf) | — | — |
| swim into the stream | `swim` (`ShoreMixin` affords on `inventory`) | the bank's `river` exit → the stream | `stream.yaml` | — | `target` optional, `requires: any` |
| `swim left/right/upstream/downstream/<course>/bar/<place>` | `swim` | `WaterPlaceMixin` (shipped `descend`/`ascend`) + the patch's `ReachExit`s | `exits/reach.yaml` | the warren mints exits at bud | the controller resolves direction words BEFORE MQL |
| `lie` (float), `stand` | shipped | `PosedMixin.self` | — | — | — |
| `climb` out (steps, a canoe, a bank) | shipped | `Ladder`/`ClimbableMixin` on `Boat`; a shelving bank's stop has a `climb`-able way | `river-bed` floor row | — | enablement gate |
| `throw line to <swimmer>` | shipped | `Tossable` on `Lifeline` | heaving line (shipped), `painter` row | — | `personWithinReach` walks obvious neighbors — the within-hail wiring is what makes the patch a neighbor |
| `pull line` / `pull painter` / `pull canoe` / `pull <person>` / `pull capstan` | shipped `pull` | `PullableMixin` on `Lifeline`, `Boat`, `Creature`, `Capstan` | — | — | `requires: [PullableMixin]` on the target (shipped) |
| `watch horizon` on a river | shipped `watch` | shipped | — | `horizonOnRiver` reads the frame | — |
| **`paddle`** (the one new verb) | `paddle` — `content/system/transport/cmd/movement/paddle.yaml`, controller `/system/transport/idea/cmd/movement/PaddleController` | `Boat.commandContributions.inventory` (you are in it) — conferred, so `lint:reachability` arm A passes; a fitted crew-powered part (`paddle`/`oar`/`pole`) is what the controller reads | boat kind rows (`canoe`, `punt`, `rowboat`, `ferry`), the propulsion rows, the outfitter's and Nesbit's instances | the frame by the room's position; nothing booted | one greedy `heading` string + `--inside`/`--hard` flags; the controller refuses in the part's words when no crew-powered part is fitted (*there is nothing to paddle with*), and the direction/landing words are resolved before MQL |
| `course` from a ship on a line, or from a sail boat / cable ferry by its tiller | shipped | `Helm.peers` (shipped) — the ship's helm; a `Helm` row as the boat kind's `tiller` part | the *Ostrander*'s helm; the sail boat and cable ferry bills | the frame by `line:` attachment | `heading` greedy string |
| `anchor` — a ship's by her helm; a canoe's killick | shipped | `Helm.peers`; `Killick.commandContributions.peers` | the `killick` row in a canoe's `parts:` | — | — |
| `hail` from a landing, a patch, a sea room | shipped | `Helm.peers` (a ship); `ShoreMixin.inventory` for a shore with a `bank` or a river/sea position (new) | — | — | `contact` greedy |
| `stop` (stop paddling) | shipped | the engagement's own cancel | — | — | — |
| `hitch canoe` / `unhitch` | shipped | `HaulerMixin` on `Character`; target `requires: [HaulableMixin]` | `Boat` composes `Haulable` | — | `hitch.yaml:35` |
| `fit paddle in canoe` | shipped | assembly | the bill on the boat kind | — | — |
| `launch` / `recover` | shipped (transport) | `Boat.inventory` | — | — | — |
| `go aboard` / `go ashore` / `go <ship>` | shipped | the wired alongside exits | `exits/{aboard,ashore}.yaml`; the ship's named exit is minted | wired on stop | — |
| `go upstream` / `go downstream` on a bank | shipped `go` | the bank patch's exits | `reach/bank.yaml` | minted on leaving a bank place | — |
| the ferry crossing | shipped `go <far landing>` / `journey` | the `FerryExit` on each landing | `exits/ferry.yaml` (`_conditional: true`) | the landings are authored rooms | the fare and the alongside gate inside `canTraverse` |
| `hail` / `ring` the ferry | shipped | the landing's `hail` is the shore's (above); `ring` by the bell | bell rows on the landings | the `ferries` brain `witness` | `contact` greedy |
| `fish` from a drifting canoe | shipped | `Rod` | — | — | the place binds (`reachable:[mixin.ShoreMixin]` — the patch is a `Shore`) |
| `buy cordwood` / `put cordwood in bunker` | shipped | the woodhawk's counter; `bunker` a `Holder` | the woodyard rows | — | — |
| `course … --leaving-them` | shipped `course` | — | — | — | a flag on the greedy heading; recorded by `AccountabilityApi.record` |

⚠ Each link fails closed and silent. The build checks, per capability,
that the view is reachable (`lint:reachability` arm A), that the row is
warmed or minted (a `look` at the place lists it), that the mixin is
composed on the class the row names, and that the arg gate admits the
target (`affordances` / the binder's refusal reads the named mixin).

## Acceptance-criteria coverage

| requirement | waves |
|---|---|
| carried from the gorge to the sea past every authored place, told where you are and what the river is doing | W1 (patches, places, the estuary), W2 (the gorge), W0 (the words) |
| never in two places, never in a place that is not water, always within reach of what the line says is at your position | W1 (one patch per body; `ReachExit`s computed against the line; within-hail wiring) |
| two players together exactly when within hail | W1 (merge/split, offsets) |
| authored places behave as written; derived behavior never contradicts an authored water room | W1 (`current: inherit|still|eddy`, ends; the basin still) |
| a ford, a crossing, a bank, a rapid readable before trying, outcome follows the read | W0 (`look river`, `measure current`), W2 (the ford attempt, the margins, roughness) |
| rescue from the bank, the water, a boat — each works, each can fail foreseeably | W2 (throw, swing, wade in, run the bank), W3 (`pull <person>` from a boat) |
| a disconnected player is never killed by the river | W2 (D15) |
| a ship cannot pass the falls and grounds in shallow water, both in words | W4 |
| a ferry crosses with a fare and lands downstream if steered badly | W5 |
| gear left on a riverbank is there after a restart, once | W1 (D5 stops, D33 loose) |
| the sea's boats and swimmers follow the same rule as the river's | W5 |

Drive steps: 1–6 W1 (1's readings W0) · 7–13 W2 · 14 W2 · 15 W2 (a clock
jump; the float-up is unit-tested, the wire asserts the stage and the
bar) · 16 W1 · 17 W2 (winter: pinned content weather at the gorge pool —
a `snow` pin on the gorge locality, the climate drive's recipe) · 18 W1 ·
19–24 W3 · 25–31 W4 · 32–34 W5 · 35 W5. Nothing unmapped. The steps' acts
in this plan's words: 19 `paddle upstream --inside` then `stop`; 20
`paddle upstream` with a pole fitted, `pull painter` from the bank,
`hitch canoe`; 21 `pull canoe`, `climb canoe`, `pull <them>`; 22 `anchor`
(the killick); 23 `fish` from the drifting canoe; 32 the ferryman's
`paddle <far landing>`; 33 `hail` / `ring bell` from the landing; 35
`launch`, `paddle <ship>`, `swim` over the side, `swim <boat>` / `climb
<boat>`, `course` refused until `recover`.

## Test & gate strategy

- **Unit (vitest, colocated `__tests__/`):** every arithmetic — the
  step–pool distribution and Manning current, the seeded meander's
  stability, banks per side, hazard derivation, the citation grammar, the
  drift integration and next-event choice, merge/split by offsets, the
  hold cost and the sweep, the ford's knock-over criterion by stature and
  load, the approach policy per hazard kind, the corpse's integrated
  refloat, propulsion speed from power, freeboard vs wave, the killick,
  the glide angle by band, draft vs depth and lightening, fuel per km up
  and down, the frame swap at the mouth, the `loose` place word, the
  keyed stop's round trip through `holder_snapshots`, the sea room keyed
  by cell. Anything touching the wired runtime imports `test-bootstrap`.
  Every touched pack's own vitest (`water`, `transport`, `trade-fishing`,
  `trade-haulage`, `trade-diving`, `terminus`, `rejection`, `world-seed`).
- **Wire (the drive):** `packages/wire/tests/river-{a,b,c,d,e}.dirty.
  wire.test.ts`. Each checkpoint asserts status + a state read
  (`query('here', …)`, `query('peers')`) or a counted `prose()`; a forced
  command's envelope is not the answer to yours (`forced: true` skipped
  by the harness). ⚠ The clock ceiling: a drift down a 1 km pool at 0.3
  m/s is ~55 real seconds at 12×; the stage A file waits on the patch's
  position (`query('here')` ref changes) with a bound, as the underwater
  drive waits on a crossing. The corpse refloat (hours of game time) is
  a clock jump (`advanceWorldClock`), the winter pool a content pin. A
  drive longer than ~4 game hours feeds its character.
- **Render:** none owed; a live browser walk of stage A and C is owed
  before the MR is READY (the textiles and underwater lessons: the LIVE
  drive finds what wire cannot — the HERE row, the card's exit links for
  `left`/`right`).
- **Gates:** `pnpm -C packages/server lint:family` after every wave; the
  specific gates named in Grounding. `pnpm test` exactly twice: before the
  MR opens and at `/finalize`; `pnpm test:near` otherwise. Check `git
  status --short | grep -vE '^.. (docs/|…)'` before any rerun.
- **Sibling drives that must stay green:** `underwater.dirty`,
  `fishing.dirty`, `storage-and-ice.dirty`, `climate-and-water.dirty`,
  `maritime-space.dirty` (rewritten at W5), `cold-storage.dirty`.

## Risks & opens

1. ⭐ **The profile numbers (decided: falls 140 m).** The residual risk is
   what else read 500 m: the snowpack at the falls reach and the climate
   drive's temperature expectations. W0 re-runs `climate-and-water.dirty`
   and adjusts its falls-reach assertions in the same commit, naming the
   change.
2. **The moving zone (D38).** Three things to prove in W1's first tests,
   because each fails silently if wrong: (i) a `CartesianZone` row minted
   N times under distinct identity paths — the singleton guard keys on
   the identity path (`api/stuff.ts:611`), but nothing has minted a ZONE
   that way before; (ii) `ZoneApi.resolveZoneForPath` and the exit
   invariant read the KIND row's zone while `getZone()` answers the
   instance — the two must never be compared by identity anywhere that
   matters (the pre-flight compares `getZone()` on both sides: a boat
   with a null zone is admitted; two moving places never contain each
   other); (iii) every zone reader that caches by zone path
   (`WeatherLogic.localityByScope` keys on the SCOPE's stuffId — fine;
   biome's provenance reports the kind row's path — fine) must not cache
   a moving zone's answer across a move: `WeatherLogic.localityByScope`
   caches the Locality per scope and **nothing ever deletes an entry**
   (verified: no `delete`/forget on it in `WeatherLogic.ts`), so a patch
   that drifted from Rejection's reach into the confluence's would keep
   Rejection's weather for its life. W1 adds the kernel seam
   `WeatherApi.forgetScope(stuffId)` (one `Map.delete` on both
   `localityByScope` and `siteByScope`, gated to the moving-place callers)
   and the `Drift` beat calls it on every event that crosses a reach
   boundary. A venue-authored boat row is the other silent failure, and
   the transport test is its tripwire.
3. **The `Band.getSurface()` lookup for a minted patch identity.**
   `findByTemplatePath` must find an identity-stamped clone (it does for
   avatars); confirm for a Location in the first W1 test or key the band's
   `surface` on `stuffId` for a moving surface.
4. **Hail-range wiring cost.** Each drift event rewires exits to fixed
   places within hail; on a river with many stops and bank patches this
   is a small set but it runs on every beat; the warren indexes fixed
   places by km (a sorted array per course) so the query is a binary
   search, never a scan.
5. **The real-time breath against the game-time drift.** A swimmer in a
   rapid drifts 12 game-m per real second at 12×; breath is real. The
   requirements accept the shipped clocks; the drive's numbers are tuned
   so a rapid of 200 m costs a fresh body about a third of a breath. If
   playtest finds it wrong, the dials are `water.river.*`.
6. **`PullableMixin` on `Creature`** touches every body's class chain;
   `lint:mixin-names`, Studio's blueprint and `pull.yaml`'s `requires`
   all see it. The refusing default must not make `pull <person>` succeed
   anywhere but beside water.
7. **Per-mover offsets vs the one-room model.** Two swimmers in one patch
   with different offsets are still one room; a `throw` between them
   works at any offset under hail. That is the design (within hail is
   together). The split threshold (half of hail) and the merge threshold
   (hail) differ on purpose to avoid flapping.
8. **The maritime drive breaks at W3 and is repaired at W5.** Both
   commits say so; the MR opens only after W5.
9. **`lint:template-scans`**: the river compile reads rows through the
   catalogue's existing allowlisted `findDescendants`; `ReachWarren` and
   `SeaWarren` must not add a scan (they are told what exists by the line
   and the ships' attachments).
10. **The ferryman's brain** must be `witness` + `candidate`, never a
    `cadence:` (`lint:idle-cadence`); his refusal at high water reads the
    river through the catalogue by shape.
11. **The stage-E rewrite of the maritime drive** removes `locate me`'s
    *at sea, by reckoning* assertion for a launched boat (a boat has no
    reckoning now; the room alongside does not plot). Record it in the
    drive record.
12. **`Exit.isMapped()` and the Cartographer.** The map writer records
    every exit it perceives with no filter today; the hook is new kernel
    surface read in two places. A missed site writes *the ostrander* onto
    somebody's map of Wharfside — `Exit.mapped.test.ts` walks both
    passes. The `route` verb over claims is unaffected (unmapped exits
    never become claims).

## Deferred seams

| seam | attach point | slate |
|---|---|---|
| floods, levees, ice jams, breakup | `riverStateAt`'s level term; a stop's `depthM` | `flooding-slate` |
| harbors, berths, building ships, keyed ship floorplans, `(extent, key)` membership, leaks and sinking, the wreck as her rooms | `Ship.hull`, `comeAlongside`, the `SeaWarren` | `ships-and-harbors-slate` |
| contamination diluting by km | `contaminationAt` per position (today per node, with the works' `at:` deciding above/below within a reach) | watershed tail |
| the thalweg border | the line's channel across | governance content |
| locks and canals | a `RiverPlace` with `current: still` and a `ControlStructure` at each end | a slate if wanted |
| steam engines and boilers | `Ship.fuel` | the machines slate |
| boating/pilotage as a Discipline | `navigation` bands read by the glide and the pilot | recorded gap (requirements lens 1) |
| the exposure clock on things dropped in the river; wrecks that decay | `Postmortem.buoyantNow` is the only decay read here | `decomposition-slate` |
| a `walked` map claim that records what you were driving (`route by canoe`) | `route` refuses honestly | `map-slate` |
| the effort-vs-breath clock | `Propel` tracks its own power | respiration's recorded gap |
| the bearer warehouse receipt, the depot | untouched | `storage-slate` |
| the cable ferry's first authored crossing | `Ferry.tethered` | content, when a crossing wants it |
| the log drive (forestry's boles on the water) | a bole is a passive floater; collection points | `forestry` / a river tail |
| the snag boat gig; the river authority as a firm | `obstruction` per stretch | `river-slate` § 10 (keep as a tail) |

The river slate's § 1–10 are absorbed by this build; its § 11–12 and the
tails above remain and are compacted at `/finalize`.

## Critical files

Read first, in this order:

1. `docs/requirements/river-requirements.md` — the model section is
   binding.
2. `docs/subsystems/underwater.md`, `watershed.md`, `expanse.md`,
   `location.md` (the Warren), `hazard.md`, `respiration.md`,
   `fishing.md`, `logistics.md` (the lane, the Journey, the routing),
   `chattel.md`, `spatial.md` (placement, the two layers of movement),
   `mixins.md` (protocol mixins, composition order, pack mixins).
3. `packages/content/water/src/idea/WatercourseCatalogue.ts`,
   `Watercourse.ts`, `ColumnWarren.ts`, `src/location/Band.ts`,
   `src/idea/exits/ColumnExit.ts`, `src/idea/WaterExpanse.ts`,
   `src/idea/FisheryRegistry.ts`.
4. `packages/server/src/mud/lib/location/{WaterPlace,Warren,RoomWarren,
   Shore,WaterSource,WaterColumn}.ts`, `lib/expanse/{Positioned,Voyaging,
   Voyage,Expanse}.ts`, `platform/idea/{Ship,Structure,AboardExit,
   AshoreExit,LocationGraphRegistry}.ts`, `lib/boundary/
   DeferredDestinationExit.ts`, `lib/hazard/Hazard.ts`,
   `lib/respiration/Respiration.ts` (`treadBeat`, `float`),
   `lib/character/Avatar.ts` (`onLinkdead`), `lib/chattel/Estate.ts`,
   `platform/idea/api/{ChattelLogic,ContainmentLogic,PerceptionLogic,
   LocomotionLogic}.ts`, `lib/mortality/Postmortem.ts`,
   `platform/thing/{Corpse,WaterSurface}.ts`.
5. `packages/content/transport/src/{thing/Boat.ts, idea/FordExit.ts,
   idea/IceCrossingExit.ts, idea/cmd/movement/{Launch,Recover}Controller.ts,
   lib/journey/Journey.ts, lib/Vehicular.ts}`,
   `packages/content/trade-diving/src/thing/Lifeline.ts`,
   `packages/content/trade-fishing/src/lib/FishingEngagement.ts`.
6. The content rows named in Grounding (the four profiles, the Greywater
   bar, `wharfside/bank.yaml`, `basin.yaml`, the estuary rows, the
   *Hesper*, `delight-ford.yaml`, the mill races, the towpaths).
7. `packages/wire/tests/{underwater,maritime-space}.dirty.wire.test.ts` —
   the drive file shape; `docs/testing.md § Two tiers`.
8. `packages/server/scripts/{check-water-citations,check-location-classes,
   check-location-graph,check-identity-mints,check-reachability}.ts` —
   the gates this build most often trips.

## Drive record

*(appended at build time, not at plan time — the output of running the
five stage files against the running game: the run number, the count,
what each failure was, and what was fixed.)*

### During the build — stage A against a standing world (runs 1–8)

Stage A was driven repeatedly while W1–W3 were built. What it found and the
build fixed: the hydration setter collision that broke the *Hesper*'s
restore; a same-zone non-cardinal exit refused by `addExit` (river ways now
name the reach directory); the deferred destination thrown "not
materialized" during a timed crossing; night ("pitch dark" — the drive
swims in the morning); a wooden spear that floats (a diving stone now);
a dry bar refusing `swim` (stop ways take ground too); the gorge counted
unreachable (river landings are entrances); and ⭐ a swimmer who stood in
the shallows kept the swim mode and every bank refused them "too rough"
(W3: finding your feet drops the water mode; the bed reconciles on every
depth refresh; patch bank ways take ground).

### Pass 1 — all five stages, a fresh world (2026-10-22): 7 / 28

A 5/9 · B 2/5 · C 0/4 · D 0/6 · E 0/4. Found (57bdfa433):

- ⭐ **A bank's way into the river was installed from the room's
  `onCreate`, inside the clone tree loading it**; two banks loading in one
  boot cascade collided on the exit row ("circular template dependency")
  and the estuary reach had no way in (A6). Now load on use (`bankStood`).
- ⭐ **The put-in's counter stocked boats** — a counter cannot hold a vessel —
  and the failure broke every room loaded through the pass at boot (the
  newbie-wilds terminal and budget, and the put-in: C's logins 500). Boats
  are props on the shingle; the shed sells the gear.
- ⭐ **The ford and the ferry read the river at its margin** (the citation's
  position, river left): a wader crosses the channel.
- A stone dropped in wading water rode on with the patch; `lie` in fast
  shallows lay down on the bed; `locate` beside a ship asked only the root.
- Drive corrections: `go aboard`/`go across`; a line is thrown to someone
  by what the thrower knows them as (introduce); a fresh diver (the first
  had passed out after an hour in snowmelt — the body model, working); a
  route asked by somebody whose map holds the far landing.

### Pass 2 — after those fixes (2026-10-22): 11 / 28

A 7/9 · B 1/5 · C 1/4 · D 1/6 · E 0/4. Found (5393031b8, bcd80b1ae,
10d2e20f2), with real numbers from a throwaway compile of the shipped
Kestrel and Delight through a year:

- A3: a stroke typed while standing in the water was refused "too rough";
  then the stroke ended standing (merged into wading water) and the arrival
  was refused. A stroke pushes off at both ends.
- A18: a patch at a bar's edge read a margin depth of nothing. A patch under
  way is at least 0.3 m.
- ⭐ B7: an authored `kind: riffle` relabelled a pool and kept its gradient,
  so the Delight's ford was 2.4 m deep at 0.7 m/s in rain — over a wader's
  head before it took their feet. An authored riffle carries a riffle's
  gradient: a road in the dry, swept in spate (~1.0 m at 1.7 m/s).
- ⭐ D25–31: the riffles between the quay and the woodyard carry ~0.46 m in a
  wet month; the *Ostrander* (0.6 m) grounded at once. She draws 0.4 m now
  (runs wet, grounds dry — D28's August). The bend rule refused a 38 m
  steamer at the Kestrel's tightest bend (127 m) under length > radius/2;
  now length > radius.
- E35: `getExits()` is a Map, iterated as if it held exits. B8: a drifting
  patch reads no current of its own — under way is moving water. B12: a
  login on a bank installs its ways, and movement from a bank waits on them.
  C: a leftover `canoes` detail bound `go canoe` to the room.

### Pass 3 (2026-10-22): 13 / 28

A 7/9 · B 3/5 · C 1/4 · D 1/6 · E 1/4. Found (8e2a9c117): a ship aground
had no watch to see the river rise — a course now first asks whether she
floats; the drives ran in winter (iced pools) and now start in late spring
(days 60–100); stage E read an arrival off prose that named the far bank.
(Its "three canoes" fix was the wrong door — see pass 5.)

### Pass 4 (2026-10-22): 10 / 23 (E did not run)

The live world's own readings (`analyze water`, day 147): the Kestrel at the
quay 14 m³/s, the Delight at the ford 2.5, the put-in 1.8. ⭐ **Content: the
Kestrel's confluence (90 m) and the Delight's mouth (30 m) were three to four
times the width their flows fill** — the Kestrel's riffles carried ~0.25 m
and no steamer moved. Now 35 m and 12 m (the estuary stays 160 m, tidal).
⚠ These widths predate this build — flagged on the MR.

### Pass 5 (2026-10-22): 13 / 28

⭐ The canoe crash, found properly by a unit test (`Exit.manyOfARow`): a
vessel's own exits stored their far side's row path, and callers looked a
destination up by it — throwing for a row with three canoes. The vessel's
exits use the existing `keepLiveDestination`; `Exit.peekDestination()`
answers the far side without throwing. A swimmer carried into a fast riffle
was stood up on arrival (`WaterPlace.standsOnArrival`: a river says no —
standing is `stand`). The bell offered `ring` to `peers`; a ferry is
`isConditional()` by its class.

### Pass 6 (2026-10-22): A 7/9, B 2/5 — then out of memory

The world ran out of heap (4 GB) during stage C. A reaped place's own zone
was left for eviction; D38 says reaped WITH its place — destructed now.
⚠ **The ford**: six passes read it "running briskly, shallow enough to wade"
in every season. The shipped Delight never floods in a year of this world's
weather, and the drive has no honest way to raise it (the locality's
weather pin is on a commons row the founder holds no authority over; most
of the catchment is wild ground). Step 7 drives the low-water ford; the
swept branch stays unit-tested — **a content finding for the user.**

### Pass 7 (2026-10-22): 17 / 28 — memory flat (650–800 MB, sampled)

A 8/9 · ⭐ **B 5/5** (the jammed foot at the put-in's snowmelt) · C 2/4 ·
D 1/6 · E 1/4. Found (091d64d4d): snags were decided when the course was
SET — the engine holing her before anyone could see; by day a choked reach
now stops her at its edge (a `snags` stop — "take her through slow"), by
night it holes her. A swamped boat's people could not `pull` it (the boat
offered verbs only to its sitters). The ferryman's brain issued a bare
`across` (unknown verb). A SEEN ferry way was mapped without its
conditional flag.

### Pass 8 (2026-10-22): 19 / 28 — memory peak 1.2 GB

A 6/9 · B 5/5 · C 3/4 · D 3/6 · E 2/4. Found (fc115ceb2): a patch under way
read its depth at the swimmer's margin, not the channel (no dive anywhere);
`slow` was 40% of her speed and could not stem the current at the quay while
full speed was refused among the snags — now `slow` caps her speed over the
ground at what the water can be read at, in snag reaches only; a merge
compared a fresh position with others' minutes-stale ones (`patchNearNow`
carries them on); the ferryman's brain claimed the hands his own crossing
needs; both decks had a detail answering to `side`.

### Pass 9 (2026-10-22): 24 / 28

The steamer leaves with wood; the dive is in deep water (f48ef731a).

### Pass 10 (2026-10-22): A 9/9 · B 4/5 · C 0/4 · D 4/6 · E 3/4

C and B14 failed on fetch timeouts, and C22's `anchor` was unknown: the
world had stalled (4,351 Mongo `CursorNotFound` on `transcripts`; command
views are read from the store). D26/D31: `Ship.burnFor` duck-typed a
`getMaterialPath()` no Tangible has, so every billet was filtered out, the
fire died with a full bin and she went adrift below the quay; it reads
`getMaterial()?.getTemplatePath()` now (d6ac09e88). E35: a deck is gone
over with a bare `swim`, not `swim side`.

### Pass 11 (2026-10-22): 19 / 28 — and the world at 6.3 GB

Run before the fix above. ⭐ The idle world afterwards held 6.3 GB RSS
with **313 MB** of live JS heap: ~21,000 resident 256 KB V8 pages. A forced
full GC (the inspector) dropped it to 1.17 GB — garbage, not a leak. The
world had been started with `--max-old-space-size=6144`, so V8 let a
burst's garbage (the season-jump catch-up, which also starved the loop into
the cursor timeouts) pile up to the ceiling. Drive worlds now start at
3 GB and are sampled each minute (`mem12.log`).

### Review — D22 reshaped: pulling out of the water is the water's act

The user's review asked why a body was `Pullable` (any creature, a spider
or a horse alike; no thing could be pulled out; no consent). With the
cordage requirements (build-2) in view — *one rope; what it is for is where
its ends are tied* — the line is the rope and the far end is a load, so a
body is not a thing on a line. `Creature` drops `PullableMixin` (restored to
its merge point); `WaterPlace.pullOut` hauls anything in it out by hand,
gated on the puller's strain ceiling against the load (half for a swimmer
who helps), with a player's consent unless helpless or of the puller's
party; `WaterPlace.deliverOut` is the one landing a hand and the lifeline
share, so cordage's rope lands the same way. `pull`'s target declares
`requires: any` and the controller asks the water within reach (here, the
boat's water, one way off) by name when the target is not on a line. Drive
step C21 now pulls the mate back into the righted canoe. The ferryman's
brain claims `attention` (lint:idle-cadence), not his hands.

### Review — W7: one craft, either frame

The user's review: the line had landed on the same interfaces as the chart
side by side — `Voyaging` the union of two craft surfaces, `Voyage` two
watches, `Expanse` and `LineFrame` sharing nothing. Now `Frame`
(`lib/expanse/Frame.ts`) is the one protocol a craft talks to; `Expanse`
and `LineFrameMixin` implement it (the chart's drift, arrival search and
watch moved off `Voyaging`/`Voyage` onto `Expanse`; the passage read and
the river watch onto `LineFrameMixin`). `Voyaging` is frame-agnostic —
one `steer(request)`, `whereAtS`, `placeAt(pos[, framePath])`,
`liveFrame` — and `burnFor`, `hullNow`, `onStop` are the craft's on either
frame (a steamer burns at sea now; the line-only `burnFor` was the
symptom). The plot stays chart-only behind `Frame.reckons`. Commands
unchanged; maritime's voyage tests pass unchanged but for `toward:`.

### Pass 17 — the drive's memory runaway is the clock's drain, not the river

A guarded stage-D run with `SAXONBERG_QUERY_TRACE=1`: idle after D the
world kept climbing, and the trace showed ~21,000 queries at an average of
12 s each — wages and payroll (`EmploymentLogic` → banking) and practice
(`Advancement` transcripts), queued behind the Mongo pool and each holding
its results. `WorldClockRegistry.drainDue` fires every schedule tick in a
jumped interval synchronously and awaits none of them, so each of the
drive's ten-day jumps (`morning()`, up to forty per stage) launches
thousands of concurrent chains. A kernel test-seam defect every jumping
drive shares; reported to the user. D31 hears her whole way down now and
never the mouth — open.

### Review — W8–W12: the trajectory (decided with the user, 2026-10-22)

The user's review of `MovingPlace` / `MovingZone`: nothing in the
abstraction says fast or slow, a slow move wants PHASES, and a moving place
need not move along a line (random, teleporting). The lens pass: lens 2
decides (a timetable, a migration, a fair, a floe's breakup become ROWS,
not a warren each) and lens 5 confirms (a sail ferry, a steam ferry and a
railway answer the same commands from one timetable model). The user:
*nail the water location model, futureproofed; all on this MR.*

- **D39 — A trajectory is what a moving thing WILL do, as a value.**
  Kernel `lib/expanse/Trajectory.ts`: legs (`from → to` as `FramePos` over
  `[t0, t1]`, a `glide`, a `hold` or a `jump`) and marks (a named moment:
  words, and the state it sets). Position at a time is interpolation —
  synchronous, derived, restart-proof. A trajectory may cross frames (the
  mouth is a leg ending on the line and the next starting on the chart).
- **D40 — Phases are state.** A mark sets the mover's state (`phase`), which
  the mover reads (`currentPhase()`), so a floe's strength or a fair being
  open IS the phase, not words about it.
- **D41 — One `Moving` capability** (kernel `lib/expanse/Moving.ts`) holds
  the trajectory and its one `Drift` (the next leg boundary or mark); a
  ship (`Voyaging`) and a moving place both compose it. *How it moves* is
  separate from *what it is*.
- **D42 — Told in chunks, per viewer.** What a moving thing tells its
  occupants is buffered per recipient over a real-time window
  (`moving.tellWindowMs`), so a fast run is one beat, not a line per
  boundary; a slow change is READ (`look`), and only a mark is pushed.
- **D43 — Persisted iff touched.** The world's own motion re-derives from a
  seed and an epoch; a course somebody set, or an interference, is a
  persisted re-plan.
- **D44 — `Frame.siteAt(pos)`** answers elevation, address and climate at a
  position, so `MovingZone` reads any frame's geography (the sea's chart
  too — a sea room's zone followed nothing before); per-mover km offsets
  leave the kernel for the water pack's `ReachPatch`, the one thing that
  integrates them.
- **D45 — First slow consumer: a timetable.** Nesbit's ferry runs an
  authored timetable in season (rows: legs and marks — boarding, crossing,
  landing) and answers the bell out of hours.
- **D46 — The clock's drain waits** (prerequisite): `WorldClockApi.advance`
  fires each due schedule and awaits it before the next, so a drive's jump
  returns when the catch-up has happened, not while thousands of chains
  are still in flight (pass 17).

Waves: **W8** the drain (D46) · **W9** the kernel model (D39–D44) ·
**W10** the river on it (patch drift, the steamer's passage) · **W11** the
chart on it (drift through bands as legs, arrival as a mark) · **W12** the
timetabled ferry (D45), drive steps, a full guarded pass.

### W8–W12 landed

- **W8** (84a4e917d): a test-world clock jump waits for the database to go
  quiet (`PersistenceManager.whenQuiet`, pool check-out events) before it
  returns; the kernel clock is untouched.
- **W9** (4bee7e5a3): `Trajectory` + `TrajectoryBuilder`, `MovingMixin`,
  `Frame.siteAt`, frame-agnostic `MovingZone` and `MovingPlace` (the dead
  km offsets removed). Two public statics on `Trajectory` were dropped for
  constructors to keep `lint:lib-statics` at its ceiling.
- **W10/W11** (41cf0a461): `planCourse` returns the trajectory; the line's
  passage and the chart's drift through bands (planned once, cut at band
  crossings, `arrived` marks, a bare bearing planned to a horizon and
  extended a watch early from its end) are trajectories; river patches get
  a glide to the next event, so their positions are true between events.
  `Frame.craftPositionAt` and the chart's arrival memo are gone.
- **W12**: `FerryService` (transport) — the timetable as rows, phases read
  by `FerryExit` and the `ferries` brain; Nesbit's market boat; drive step
  E36. The census reads `service` and `landings`.

### Review — W13: a place sited on a frame, not a river bank on every shore

The user's review: `ShoreMixin` is the shore model for everyone, but this
build had put `bank: { course, at, side, span, name }` on it — left and
right bank mean nothing beside a mere or the sea. Now `FrameSitedMixin`
(kernel, `lib/expanse/FrameSited.ts` — named for the frames model, not a
universal "site", at the user's word) is the static twin of `Moving`: a
fixed place's `frameSite: { frame, cite, span?, name? }`, the citation in
the frame's own grammar. `Frame` gains `siteOf(cite)` (the line reads
`node±km,side`, the chart a node or `lat,lon`) and `onSiteStood(place)`
(the river's bank way; nothing on the chart yet). Composed on `Shore` and
`Quay`; the eleven banked rows now author `frameSite`; `ShoreMixin` lost
`bank`, `bankStood` and the runtime frame memo; `WaterSource.onBankStood`
is gone (the river's `Watercourse.onSiteStood` does it). The warren keeps
its river terms through one private adapter (`bankOf`). The census reads
`frameSite.frame`.

### ⭐ Where things stand (handoff, 2026-10-22)

- **Pass 12** runs against d6ac09e88 on a 3 GB world
  (`~/.claude/jobs/477f9cab/tmp/drive12.sh`, logs `drive12-{a..e}.log`).
- **Unproven since pass 10:** D26/D31 (the fire), E35 (bare `swim`), and all
  of C on a world that is not stalled. A1's first `measure current` after a
  season jump can outlast 30 s — a performance finding for the MR.
- **For the user's eye (content, not code):** (1) the Kestrel confluence and
  Delight mouth widths were narrowed (90→35 m, 30→12 m) to match their flows
  — they predate this build; (2) in this world's weather the Delight never
  floods, so its ford is never dangerous — step 7 drives the low-water ford,
  the swept branch is unit-tested only.
- **Not built (recorded in wave notes):** pilot claims on stretches, `hail`
  from a landing, `paddle <ship>` at sea, sea rooms drifting, walking out on
  river ice and the hole, lining from an authored bank.
- **After the drive passes:** update the MR description (findings + the
  content items), then `/finalize` is the user's call.
