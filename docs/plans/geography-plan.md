# Geography — implementation plan

Executes [geography-requirements](../requirements/geography-requirements.md)
(agreed 2026-11-16). **Kind:** feature. **Lead end:** kernel, with a content
stage. Every real Locality and every structure worth seeing gets a place on
the chart the sea already uses; the three horizon functions collapse into one
rule; what is far and fixed is worked out from a sparse record and kept, what
is far and moves is read at the act; the authored `horizon` lists become
block / reach overrides. Seeded by
[geography-slate](../slates/world/geography-slate.md) — its reuse ledger is
accounted for row by row in § New substrate.

⚠ **Three places where grounding contradicts the requirements' premises** are
in § Risks & opens (Q1–Q6), all decided by the owner 2026-11-17; each was a stated build
default so `/build` does not stall.

## Grounding

All paths under `packages/server/src/mud/` unless they start `packages/` or
`docs/`. Verified by opening the file, 2026-11-16, at `df9cefdea`.

**The horizon today**

- `platform/idea/api/PerceptionLogic.ts` — `horizonFor` (l.494) is
  **synchronous** and dispatches to three module-private functions:
  `horizonAtSea` (l.1580), `horizonOnRiver` (l.1602), `horizonAshore`
  (l.1636). Helpers beside them: `craftAboard` (l.1527), `seeingFrom`
  (l.1542, the weather factor from `WeatherApi.peekSkyType` over
  `expanse.visibility.<type>`), `expanseAt`, `toView`, `roomOf`,
  `SHORE_EYE_M = 2` (l.1517), `RIVER_EYE_M = 1.7`.
- `horizonAshore` reads `place.getHorizon() ?? zone.peekField('horizon')`
  (a list of ZONE paths); for an Expanse entry it reads the sea from
  `sea.peekShorePositionFor(here)` at `zone elevation + 2 m`; for a land zone
  it iterates `NavigationApi.attachedWithinNow(zonePath, 'structure')`, takes
  **only resident** structures (`StuffApi.findByTemplatePath`, a structural
  `typeof s.hasMember === 'function'` cast) and admits one when
  `(heightM + |Δelevation|) × perception.horizonRatio ≥` a distance guessed
  from `getExtentM()`. Bearing and range are `null`.
- **Callers of `horizonFor`** (all three are sync or tolerate sync):
  `platform/idea/cmd/perception/QueryController.ts` l.211 (`list`, the
  `where` closure words a sighting through `PerceptionApi.glance`);
  `lib/perception/HorizonWatch.ts` l.120; `api/mql/resolver.ts` l.787
  (`candidatesForHorizon` — the `horizon` MQL scope, **synchronous**, which
  is why `horizonFor` cannot become async).
- `api/perception.ts` l.96–137: `HorizonSighting {stuff, bearingDeg|null,
  rangeNm|null}`, `HorizonTraffic`, `HorizonView {things, traffic, atSea}`.
  `glance(bearingDeg, rangeNm)` (logic l.510) is eight points + *close by* /
  *about a mile off* / *some N miles off*.
- `lib/zone/LocationZone.ts` l.106 `lookOutFrom` — when a room joins its
  zone, the zones its `horizon` names (and the structures attached within
  them) are stood up, **kicked, not awaited**. `standUpAttached` (l.79) is
  the same shape and its comment records why nothing here may be awaited
  (a ship standing up reaches back for its sea).
- Tests that pin today's behavior: `platform/idea/api/__tests__/PerceptionLogic.horizon.test.ts`,
  `platform/idea/cmd/perception/__tests__/query-horizon.test.ts`,
  `lib/perception/__tests__/HorizonWatch.test.ts`,
  `lib/zone/__tests__/LocationZone.test.ts`,
  `platform/idea/cmd/stream/__tests__/watch-horizon.test.ts`.

**The chart and the sight math**

- `lib/expanse/GeoPosition.ts` — immutable lat/lon value; `distanceNm`,
  `bearingTo`, `destination`, `atFocus` (the graph→chart bridge);
  `GeoPositionRecord` is the authored/persisted shape.
- `lib/expanse/Expanse.ts` — `origin` (l.153–181); `landmarks()` (l.664,
  private: structures attached at a node's `destination`, **resident only**,
  structural cast again); `sightables()` (l.693: landmarks as `fixed` +
  `craft()`); `sightRangeNm(obsM, tgtM)` (l.711: `1.17(√h₁+√h₂)` in feet,
  scaled by `√(R/R_earth)`) — an instance method that reads nothing of the
  instance; `sightingsAmong(here, eye, channel, hourIndex, candidates,
  seeing, exclude)` (l.783); `peekShorePositionFor` (l.836).
- ⚠ **`hourIndex` is used for exactly one thing: the seeded-traffic key**
  (`trafficAt`, l.731). There is **no night term** anywhere in
  `lib/expanse/` or `lib/structure/` (grep `night|dark|lit` is empty). The
  requirements' *"the sea's rule already takes the hour: unlit things are
  not seen in the dark"* describes code that does not exist → Q2.
- `lib/expanse/LineFrame.ts` l.124 `sightablesNear(place, eyeHeightM)` — a
  river's answer, in river kilometers; a line has no lat/lon (sites carry a
  climate `latitude` only), so a river craft has no chart position → Q3.
- `lib/expanse/Positioned.ts` — `sightHeightFor(observer)` /
  `getTargetHeightM()` hooks; a craft's `getExpansePosition()`.

**Readings**

- `platform/idea/reading/BearingReading.ts` — `take()` **refuses ashore**
  (`'not-afloat'`, l.80): it resolves a craft and reads
  `expanse.contactsFrom`. A land subject binds (the row's `scope:
  [subject]`) and is then declined. HALF_WIDTH by band: untrained 10° …
  expert 0.5°; the row's `eyeCeiling: untrained`.
- `platform/idea/reading/LatitudeReading.ts` — **refuses ashore**
  (`'no-horizon'`, l.60): truth is the craft's `getExpansePosition().latDeg`.
- Rows: `packages/content/platform/content/platform/idea/reading/{bearing,latitude}.yaml`;
  the compass `packages/content/generic-objects/content/stuff/thing/instrument/hand-compass.yaml`.

**Zones, Localities, structures**

- `lib/zone/SpatialZone.ts` — `horizon` (l.274), `elevation` (l.337),
  `latitude` (l.383), `climateSite()` (l.438: the four levers through
  `lookupField`, realm default 42°), `getExtentM()` (l.286). The doc block
  at l.326 states the rule *a place's height above the ground is `zone
  elevation + z × cellSize`* — **no accessor implements it** (grep empty).
- `platform/idea/api/ZoneLogic.ts` l.164 `climateSiteFor(scope)` — the ONE
  resolver every climate reader goes through (`Atmospheric.resolveClimateSite`,
  `BiomeLogic`, `WeatherLogic`, `CelestialLogic.latitudeFor`, the readings).
- `lib/stuff/Place.ts` — `horizon` field (l.207, l.247), `getHorizon()`,
  `getFeatured()`, `structureNow()` (l.306) / `structure()` (l.314),
  `craftHere()`.
- `platform/idea/Locality.ts` — `fieldMeta` l.257 (name, `_address`,
  weather pin, lean, intensity, government key, reach, catchment, lighting);
  **no position**. `api/address.ts`: `resolveLocalityFor` (async),
  `coveringLocalityOf(address)` / `coverageChainOf(address)` (sync).
  ⭐ **Every Locality is resident from boot**: `AddressApi.needs =
  [addressRegistry]`, and the registry's `onCreate` clones every row under
  `/platform/idea/Locality/` + `/stuff/idea/Locality/`
  (`docs/subsystems/address.md` § The coverage index). A Locality's point is
  therefore readable synchronously with nothing new loaded. ⚠ A Locality row
  anywhere else is silently absent (same section).
- `lib/biome/Atmospheric.ts` l.219 `weatherLocality()` — a room's covering
  Locality, memoized **sync**, resolved at room load.
- `lib/structure/Structure.ts` — `extent`, `entrance`, `landmark`,
  `heightM`, `storeys` (l.131–148). `lib/structure/Building.ts` extends it
  (`DurableMixin(FacedMixin(StructureBase))`); `Ship` extends `Structure`
  directly and is `Positioned`. `StoreySpec` (`lib/spatial/Enclosed.ts`
  l.139) is `{key, extent, on?}` — no heights.
- Structure rows: 16 (`grep -rlE "^class: /platform/idea/(Structure|Building|Ship)$" packages/content`).
  Landmarks: the Terminal (25 m), the light on Gannet Rock (30 m, no point —
  *where its rock is*: the Greywater's `gannet-rock` node), the peak of
  Waponi Woo (1100 m, a bare `Structure`, a stopgap per
  `docs/slates/world/mountain-slate.md`). Others ≥ 12 m: Seznick House 13,
  the rubber works 12. There is **no tower-top or gallery room** anywhere
  (Gannet Rock is one `landing` room).

**The record that already knows every structure without loading it**

- `platform/idea/LocationGraphRegistry.ts` — `locationRows()` (l.597) is the
  world's ONE template scan (`Template.findByPathInfix('/')`, held at one
  site by `lint:template-scans`). `deriveAttachments(all)` (l.421) walks
  every row with its `data` in hand and already recognizes a Structure row
  (`isStructureClass`, l.527) to attach it at its `extent` (l.508–520). It
  re-derives after any template write: `DomainHook`
  (`platform/idea/hooks/DomainHook.ts` l.70/103/110) calls
  `NavigationApi.projectRow` / `removeRow`, both of which set
  `attachmentsDirty`. Runtime (minted) structures attach by instance through
  `attachStructure` / `detachStructure` (l.369–381); the one caller is
  `packages/content/residence/src/idea/HoldingWarren.ts` l.358/416.
  The graph warms lazily on the first graph read (`ensureWarm`, l.108);
  `attachedWithinNow` answers `[]` before the first derivation.
- No Mongo collection is involved in attachments: they are an in-memory
  derivation beside the persisted `location_graph` nodes
  (`packages/server/src/schema/location_graph.yaml`).

**Content facts**

- Greywater `origin: {latDeg: 42.0, lonDeg: -8.47}`
  (`packages/content/world-seed/content/stuff/idea/WaterExpanse/greywater.yaml`);
  nodes beneath it: `bar` (rho 0 → `/world/terminus/estuary/estuary-mouth`),
  `the-pool` (1407 m @ 61.7° → `/world/terminus/estuary/pool`), `the-roads`
  (6192 m @ 69°), `gannet-rock` (33111 m @ 52.8° →
  `/world/terminus/gannet-rock/landing`), `open-sea` (48399 m @ 103.3°),
  `holloway-mouth` (9000 m @ 270°), `waponi-woo` (444480 m @ 180°).
  Water lies N-E through S and due W of the bar, so **the land is the
  north-west quadrant**.
- 24 Locality rows (`grep -rl "class: /platform/idea/Locality" packages/content`).
  Realm: `terminus`, `terminus/city` (both in the `platform` pack),
  `terminus/city/{campus,counting-houses,university-avenue}`,
  `terminus/{hinkley-hills,hearts-delight,rejection}` (world-seed),
  `terminus/hollow-mere`, `terminus/waponi-woo`.
- Addresses: the Market is `terminus/city/counting-houses/market-square`;
  the Terminal `terminus/city/arrival-gate`; the Harbor
  `terminus/city/harbor/…`; Wharfside **and every estuary room, the headland
  included**, `terminus/city/wharfside/…`. Seznick House and Mayfield Row's
  street are `terminus/mayfield-row/…` (covered by the realm root only).
- The 11 `horizon:` lists (all in `packages/content/terminus/content/world/terminus/`):
  `university-avenue.yaml` `[terminal]`; `wharfside.yaml` `[terminal]`;
  `estuary.yaml` `[terminal, greywater]`; `harbor.yaml` `[terminal,
  greywater]`; `estuary/headland.yaml` `[greywater, terminal]`; and six
  `[]` — `wharfside/{lavoir,mill,dyehouse,tannery,chandlery}.yaml`,
  `market/bathhouse.yaml`. No test-fixture world authors one.
- Zone `latitude:` rows (7): `hollow-mere` **−58**, `waponi-woo` **30**,
  and the fixtures `south` −89, `circle` −66, `north` 71, `pair/wet` 42,
  `pair/arid` 42. ⚠ Hollow Mere and Waponi Woo are *realm* places whose
  climate latitude disagrees with any chart point near the Greywater (the
  Waponi node is 240 nm due south of the bar: 38°N) → Q1.
- `gannet-rock.yaml` (the zone) authors no `elevation`, so the rock inherits
  Terminus's 35 m.

**Staging and the drive harness**

- `packages/wire/src/harness/world.ts`: `stage(path, method, …args)`
  (`/auth/test-stage`, one authored mutator on a resident Stuff),
  `advanceWorldClock`, `pinWeather`, `isOwnedTestWorld`;
  `Session.open(handle, {startLocation, parcels, committees})`.
  The restart precedent is `packages/wire/tests/cleanliness.dirty.wire.test.ts`
  l.754–790 (`dev-preflight.mjs` with `PREFLIGHT_GRACE_MS`, then
  `bootOwnedWorld()`).
- A new content row is written in-world by `edit -c <path> --class <class>`
  with a `payload.data` map (→ `TemplateApi.saveTemplate` → `DomainHook`),
  removed by `rm` (`docs/subsystems/shell-workspace.md` § Verbs); both are
  gated on held extents.

## ⭐⭐ New substrate

| # | item | kind | ledger row / *genuinely new* |
|---|---|---|---|
| S1 | `Locality._position` (`GeoPositionRecord \| null`) + `_radiusM`; `getPosition()` / `getRadiusM()` | two fields on an existing class | *a Locality — extend with a point and radius*; *a point on the chart — reuse `GeoPosition`* |
| S2 | `Building.position` (`GeoPositionRecord \| null`); `getPosition()` | one field on an existing class | *a point on the chart — reuse for structure points* |
| S3 | `Structure.showsLight` (boolean) | one field on an existing class | **genuinely new** — searched `lib/expanse`, `lib/structure`, `lib/perception/LightSource.ts`, `PublicLighting.ts`: nothing says a structure is lit, and the ledger's *visibility by hour — reuse* row names a term that does not exist (Q2) |
| S4 | `Vantage` — value class, `lib/perception/Vantage.ts`: an eye (a `GeoPosition` + an altitude) that answers range-by-curvature and `sight(target, seeing)` | named value object | *bearing and range between two points — generalize out of the sea* + *visibility by heights and curvature — reuse*: it is `Expanse.sightRangeNm` and the candidate loop of `sightingsAmong`, lifted so land can call them; `Expanse` keeps both names and delegates |
| S5 | the **marks** — a derived, in-memory record on `LocationGraphRegistry` (`{path, at, topM, heightM, landmark, showsLight, address}` per structure worth seeing) + the kept skylines memo beside it | private state on an existing registry | *which structures exist where, without loading — ⚠ the gap*: closed by extending the attachment derivation that already scans every row; **no new collection, no new scan** |
| S6 | `NavigationApi.skylineNow(vantage, own, keepAs?)` / `NavigationApi.skylineReady()` | two statics on an existing Api | S5's read doors (the `attachedNow` / `attachedTo` pair's shape) |
| S7 | `AddressApi.positionedLocalityOf(address)` | one sync static on an existing Api | *a Locality — extend*: the coverage chain's nearest Locality that has a point |
| S8 | `Place.chartPoint()`, `Place.heightAboveGroundM()` and `Place.heightAboveSeaM()` | three methods on an existing class | *a room's position — structure's point, else Locality's* (slate § The model); the height is `SpatialZone`'s documented `z × cellSize` rule given its first accessor |
| S9 | `horizon` retyped: `{block?, reach?}` on `SpatialZone` and `Place` | a field's type on its existing hosts | *the authored lists — recast as block / reach overrides* |
| S10 | `HorizonSighting.closeBy?` and `.fixed?` | two optional members of an existing interface | *the horizon's shape — reuse; ashore fills them* |

No new mixin, no new Api, no new logic singleton, no new hook, no new
registry, no new document kind, no new Mongo collection, no new verb, no new
view key. The one new file in `src/mud/` is `lib/perception/Vantage.ts`.

Ledger rows not in the table: *the rough direction* (`glance`) — reused
unchanged; *the three horizons* — replaced (D3); *the precise reading* and
*latitude* — reused, their ashore refusals lifted (D11, D7); *elevation* —
read only; *height, landmark* — reused, prominence derives from them (D8);
*Gannet Rock's position* — derived from its node, never authored (D4).

## Plan-level decisions

**D1 — The candidate set is the location graph's attachment derivation,
extended; nothing is loaded to decide what is seen.**
`deriveAttachments` already holds every row's `data` and already knows which
rows are structures. In the same pass it records a **mark** for each
structure row that is *worth seeing* — `landmark: true`, or `heightM ≥
perception.skyline.minHeightM` (dial, default 12) — and is **not a craft**
(a row carrying `expanse`, `line` or `berth`, or in `plans`, is a moving
thing or a kind: act-only). A mark carries plain data read off rows:
`heightM`, `landmark`, `showsLight`, and

- **its point**: the row's `position` → else the chart position of the
  expanse node whose `destination` lies in its `extent` (node row `focus`
  through the parent expanse row's `origin`, by `GeoPosition.atFocus` — the
  same bridge the live node uses, so Gannet Rock and the peak stand exactly
  where the sea has them) → else *none of its own*: it stands at its
  Locality's point, found at compute time from the mark's `address`;
- **its address**: the nearest row at or above its `entrance` (else
  `extent`) by template path that declares `_address` (a place) or
  `address` (a zone);
- **its top**: `heightM +` the nearest declared `elevation` on the same
  upward walk (0 when none).

The upward walk is one private helper over the rows map already built at the
top of `deriveAttachments`. Runtime structures (`attachStructure`) add a
live mark read from the instance's own getters, addressed by the same walk
over its extent with any `#key` stripped.
*Rejected:* a Locality-authored list of its landmarks (a reverse copy of
`extent`, the `stands:` mistake the scan sweep already unwound); a new
collection (ruled out); reading `PlaceNode` rows (structures are not nodes).

**D2 — The skyline is derived, kept in memory on the registry, and
invalidated by one generation counter. It is never persisted.**
`skylineNow(vantage, own, keepAs)` computes, for one eye, every mark's
bearing, range and reach by curvature (`Vantage`), sorts — landmarks first,
then by angular height `heightM / rangeNm` — and cuts non-landmarks to
`perception.skyline.size` (dial, default 7). With `keepAs` (the point
owner's path + `|` + the eye altitude rounded to the meter) the result is
memoized; a craft at sea passes none and is computed per read (tens of
marks, arithmetic only). The registry bumps `skylineGeneration` and clears
the memo whenever `deriveAttachments` completes, and on
`attachStructure` / `detachStructure`. A content write (a structure row
saved or removed, a height or a point changed, a Locality's point moved)
already reaches `projectRow` / `removeRow` → dirty → re-derive.
⭐ The grain is **point owner × eye altitude**, one step finer than the
requirements' *per Locality*: the headland (100 m) and the strand (0 m)
share a Locality and must not share a skyline — the requirements' own goal
that the rule reads *the ground's elevation* decides it. The number of
distinct keys is the number of (Locality, zone elevation, storey) triples
people actually stand in.
Each kept entry stores its true range **and** its clear-air limit, so the
weather factor and the night filter are applied at the read without
touching the memo.

**D3 — One rule; `Vantage` is the sight core; moving things stay act-only
sources.** `horizonFor` becomes: no sky → empty (unchanged); build the
viewer's vantage (D4); static sightings = `NavigationApi.skylineNow(…)`
filtered by weather (`seeingFrom`), night (D6) and the place's override
(D5); moving sightings = the craft of the frame the viewer is on or reaches
(`sea.sightingsAmong` with `sea.sightables()`, which now returns **craft
only**; the river's `sightablesNear`, unchanged); merge, de-duplicated by
`stuffId`. `horizonAtSea`, `horizonOnRiver`, `horizonAshore`,
`Expanse.landmarks()` and the `perception.horizonRatio` dial are deleted.
`Expanse.sightRangeNm` and the candidate loop inside `sightingsAmong`
delegate to `Vantage`, so sea and land cannot drift; the `signal` channel
and the seeded traffic stay the sea's. A craft at sea sees the land through
the same `skylineNow` from its own position and
`craft.sightHeightFor(viewer)`.
⚠ River craft keep `bearingDeg: null` (named only) — Q3.

**D4 — Room → position.** `Place.chartPoint()` answers
`{at, owner, radiusM} | null`, synchronously:
1. aboard a craft (`craftAboard`'s rule) → the craft's
   `getExpansePosition()`, owner the craft, no radius;
2. the room's structure (`structureNow()`) has a point of its own — an
   authored `position`, or a sea node (read from the structure's mark) →
   that point, owner the structure, no radius;
3. else the nearest **positioned** Locality over the room's address —
   `AddressApi.positionedLocalityOf(this.weatherLocality()?.getAddress())`
   — owner the Locality, with its radius;
4. else `null`: the place has no position, and its horizon is whatever its
   frame names (a river's traffic) and nothing else. This is the
   test-fixture worlds, by construction rather than by a flag.

⭐ **A room's total height** (the owner, 2026-11-17, via the
navigation-server build: *"z tells you elevation within a zone but not the
total height — you need the zone for that"*) is one named accessor,
`Place.heightAboveSeaM()` = the zone's elevation (`peekField`, 0 when none)
`+ heightAboveGroundM()`. The navigation-server's place section reads it
once this build merges. ⚠ `ZoneApi.elevationFor` is **not** changed here:
it stays the GROUND's elevation, its five readers (`MagicLogic` Δh,
`BiomeLogic` pressure, `WaterFixture`, `WaterStore`, `Well`) and the
*stairwell is not a waterfall* test untouched — two of them switch to the total (D13);
the water readers stay on the ground.

Eye altitude = `heightAboveSeaM()` `+ SHORE_EYE_M`; at sea it stays
`craft.sightHeightFor(viewer)`. `heightAboveGroundM()` is `0` on `Place`
and `z × zone cell size` on `Location` (`getCoords()`, l.451).
**Close by:** when the owner is a Locality (case 3) and a mark's point lies
within `radiusM` of the Locality's point, the sighting is `closeBy: true`
with `bearingDeg` and `rangeNm` `null`. A viewer with a point of their own
(cases 1–2) always gets the real pair.

**D5 — Overrides: `horizon` becomes `{ block?, reach? }` on the same two
hosts, same nearest-declaration walk.**

```yaml
horizon:
  block: all                                  # nothing from in here
  block: [{ from: 20, to: 110, beyondNm: 2 }] # the ridge: nothing past two miles between NNE and ESE
  reach: [/stuff/idea/WaterExpanse/greywater, /world/terminus/terminal/structure]
```

- **block** removes static and moving sightings alike: `all`, or sectors
  (degrees true, clockwise `from`→`to`, `beyondNm` default 0).
- **reach** names an **expanse** (its craft are read from here at the act —
  this is how a shore place looks out on a sea, and it replaces
  `peekShorePositionFor`: the eye is the viewer's own chart point) or a
  **structure** (listed whatever curvature and the handful cut say; the sky,
  the weather and the night still apply).
- The setter **throws** a `RangeError` on the old array form and on an
  unknown key (P3; there is no migration and no compatibility read). The
  rows are recast in the same commit.
- `LocationZone.lookOutFrom` is rewritten to stand up what the room will
  list: its `reach` targets and the entries of its kept skyline.

Per-place table (the check drive step 10 runs):

| place | today | after | still sees |
|---|---|---|---|
| University Avenue | `[terminal]` | **deleted** | the Terminal, *close by* (rule) |
| Wharfside | `[terminal]` | **deleted** | the Terminal, with a direction (rule; Wharfside gets its own point, W3) |
| the Harbor | `[terminal, greywater]` | `reach: [greywater]` | the Terminal *close by*; the sea's craft |
| the Estuary | `[terminal, greywater]` | `reach: [greywater]` | the Terminal with a direction; the Hesper at the bar; **not** the light (2 m eye: 14.6 nm reach, 18 nm off — as its own comment requires) |
| the Headland | `[greywater, terminal]` | `reach: [greywater]` | the same, **plus** the light on Gannet Rock (100 m) with a direction |
| the mill, tannery, chandlery, dyehouse, lavoir, the bathhouse | `[]` | `block: all` where any room of the zone is open to the sky; **deleted** where none is (the sky gate already answers) | nothing, as today |

**D6 — Night.** There is no hour term to reuse (Grounding). The build adds
the smallest honest one: at the read, when
`CelestialApi.skyFactorAt(now, viewer latitude)` is at or below
`perception.skyline.darkSkyFactor` (dial, default 0), a **static** mark is
listed only if `showsLight` is true. ⭐ **Registered craft take the same
test** (the owner, Q2): an unlit ship is not seen by night — a sea-wide
change, decided. The seeded passing traffic is unchanged. The lighthouse
row gains `showsLight: true`; the Terminal does not; the Hesper, the
Corrigan and the ferries do (riding lights), the small boats do not.

**D13 — Pressure and magic read the total height** (the owner, Q7).
`BiomeLogic.pressureFromElevation(scope, …)` and `MagicLogic`'s Δh
(`fromScene`/`toScene`) read `Place.heightAboveSeaM()` when the scope is a
`Place` (the branch predicate, no value import if it closes a cycle), else
`ZoneApi.elevationFor` as today. `Well`, `WaterStore` and `WaterFixture`
stay on `elevationFor` — the ground and its water. `elevationFor` itself is
unchanged, and so is the *stairwell is not a waterfall* test (it asserts
`elevationFor`). ⚠ The `elevation === 0` short-circuit in
`pressureFromElevation` now tests the total: a third-floor room at a
sea-level zone derives a (slightly) lower pressure, which is the point —
`measure altitude` on a tower top reads the tower. New tests: two rooms in
one zone at different `z` get different pressures and the same
`elevationFor`; magic's Δh climbs a stair.

**D7 — Latitude.** `ZoneLogic.climateSiteFor` — the one resolver — resolves
the zone chain's `latitude` as today; when the chain declares none it asks
`AddressApi.resolveLocalityFor(scope)` → `positionedLocalityOf` → that
point's `latDeg`; only then the realm default. `SpatialZone.climateSite()`
takes the fallback as an optional argument so the fold stays in one place.
`MovingZone.getLatitude` (a line's site) is untouched. A zone that states a
latitude keeps it. `LatitudeReading` ashore reads the same resolver (D11),
so the sextant, the sun and the climate cannot disagree.

**D8 — Prominence is derived, in the registry, once.** Landmark flag first;
then angular height. No rank field, no per-room `featured` change
(`Place.getFeatured()` keeps its job in `QueryController`).

**D9 — The viewer is never handed a path that is not standing.**
`HorizonSighting.stuff` must be a live `Stuff` (the `horizon` MQL scope and
`look horizon:<it>` bind it). Deciding what is in view uses only the marks;
*presenting* it stands up the handful on the list — a structure `Idea`,
never its rooms — by following the kept skyline's own paths (load on use).
Two doors: `LocationZone.lookOutFrom` kicks it when the room joins its zone
(unawaited, as today); `PerceptionLogic.observe`'s place branch **awaits**
`NavigationApi.skylineReady()` and the stand-up for the place being looked
at, beside its existing `preloadForSenseGate` await — so the arrival `look`
makes the following sync read complete. A sync read that still meets an
entry not yet standing **skips** it and kicks the stand-up (the documented
this-once skip `peekSkyType` and `sightables()` already use). ⛔ Nothing in
a load path awaits it (the `standUpAttached` deadlock).

**D10 — What reaches a client.** `HorizonView` keeps true bearings
server-side (the reading needs them). Nothing in this build serializes a
`HorizonSighting`; `QueryController` words it through `glance`, plus the
one new phrase `close by` for `closeBy`. The navigation-server build owns
the wire shape and must send the `glance` point and rough miles (or
`closeBy`), never `bearingDeg` — § Sibling builds.

**D11 — The readings follow the horizon.** `BearingReading.take` reads the
subject off `PerceptionApi.horizonFor(giver)` (the one rule) instead of
`expanse.contactsFrom`: not on the horizon → the existing `'not-in-sight'`
decline; `closeBy` → a new decline `'too-close'` (*too near to take a
bearing across*); a `fixed` subject aboard a craft still calls `takeFix`;
ashore it reports the bearing and says a second bearing crosses it (no
reckoning to mend). `LatitudeReading` ashore reads
`ZoneApi.climateSiteFor(place).latitudeDeg` and skips `takeLatitude`; the
sky and sun-up gates are unchanged. Both rows' `improves:` prose and the
help text say they work ashore (P9).

**D12 — Content geometry** (W3). Constraints are the law; the figures are a
grain the owner may move (they are stated so the drive's directions are
predictable):

- land is the NW quadrant from the bar; a point with a sea node is never
  authored; a Locality inside a positioned ancestor's radius gets no point;
- the Market must raise the light (≤ 24.5 nm), the strand must not
  (> 14.6 nm), the headland must; Hinkley Hills must read a different
  compass point for the light than the Market.

⚠⚠ **Re-planned at the drive (2026-11-17): this world is a third of Earth's
radius** (`universe.yaml` `_planetRadiusM: 2124000`, sugar D12) — a degree
is **20 nm**, not 60, and the horizon is **√⅓ ≈ 0.58** as far. The table
below was first computed in Earth degrees, which put every town a third as
far from the bar as intended (the drive's first run read the Terminal
*about a mile* south of Hinkley Hills). The points are re-derived from the
same distances and bearings in this world's degrees. On this world:
**the Market (37 m eye, 14.1 nm reach to a 30 m light) cannot raise the
light 18.7 nm off** — the first constraint above does not hold, and the
drive asserts the honest answer instead; Hinkley Hills (132 m eye, 20.8 nm)
does, the headland (102 m, 19.1 nm) does, the strand (2 m, 8.4 nm) does
not. The gallery's height is shown against a craft (the Hesper, staged ten
miles toward the coast: in the gallery's 12.1 nm, past the landing's 6.9),
since nothing on the coast clears either eye; the rock's zone now
`reach`es the Greywater (a rock at sea looks out on its sea). Waponi Woo's
node, 240 nm south, is **30° N** here — exactly its zone's stated
latitude (the plan's "38° N" was the Earth figure).

| Locality | this world's `_position` |
|---|---|
| Terminus (city) | 42.0472, −8.5802 (the Terminal 42.0473, −8.5805) |
| Wharfside | 42.0229, −8.5008 |
| Hinkley Hills | 42.2806, −8.6885 |
| Hollow Mere | 42.6362, −8.8712 |
| Heart's Delight | 42.2236, −9.5949 |
| Rejection | 42.9514, −9.5523 |
| Waponi Woo | 30.0, −8.47 |

| Locality | `_address` | from the bar | `_position` | `_radiusM` |
|---|---|---|---|---|
| Terminus (city tier) | `terminus/city` | 3.5 km @ 300° | 42.0157, −8.5067 | 2000 |
| **Wharfside** (new row) | `terminus/city/wharfside` | 1.2 km @ 315° | 42.0076, −8.4803 | 1500 |
| Hinkley Hills | `terminus/hinkley-hills` | 12 km @ 330° | 42.0935, −8.5427 | 3000 |
| Hollow Mere | `terminus/hollow-mere` | 26 km @ 335° | 42.2121, −8.6031 | 1500 |
| Heart's Delight | `terminus/hearts-delight` | 32 km @ 285° | 42.0745, −8.8443 | 4000 |
| Rejection | `terminus/rejection` | 46 km @ 320° | 42.3171, −8.8281 | 3000 |
| Waponi Woo | `terminus/waponi-woo` | its node: 240 nm @ 180° | 38.0000, −8.4700 | 4000 |

No point: the realm root `terminus` (a radius that size would make the
whole realm *close by*); the Campus, the Counting-Houses, University Avenue
(inside the city's radius — the chain walk finds the city); the Harbor
(1.5 km from the city's point: inside its radius, so no new Locality);
every test-fixture Locality.
Structures: the Terminal gains `position: {latDeg: 42.0160, lonDeg:
-8.5075}`; the light on Gannet Rock gains `showsLight: true` and **no
point**; `gannet-rock.yaml` gains `elevation: 0` (so the light's top stays
the 30 m the sea already sights). Expected reads: from the Market the light
is *NE, some 19 miles off* (58°, 18.7 nm); from Hinkley Hills *E, some 18
miles off* (73°, 18.2 nm); Hinkley Hills → Hollow Mere is 339°, 7.6 nm.
New room: **the lantern gallery** on Gannet Rock (a `Locale` above the
landing, `z` set so `heightAboveGroundM()` ≈ 26 m, an `up`/`down` way) —
the drive's *room with its own point*.

## ⭐⭐ Host placement

| new thing | host | what it claims of everything else on that host | P2 |
|---|---|---|---|
| `_position`, `_radiusM` | `platform/idea/Locality` | every Locality *may* be somewhere on the chart | `null` means *not on this chart* (a fixture world, the realm root), and D4 case 4 handles it with no guard. Ten of 24 rows will carry one; the rest answer through the chain walk or are fixtures. The class header names itself *the designated home for tier-level fields* (P13) and the owner decided the host |
| `position` | `lib/structure/Building` — **not** `Structure` | every building stands at a point on the ground | `null` means *where my Locality is*, a real answer, not a *no*. On `Structure` it would claim a fixed chart point for every `Ship` (which is `Positioned` and moves) — the `Freshness off every Thing` shape. The peak of Waponi Woo is a bare `Structure` and needs none: it takes its node |
| `showsLight` | `lib/structure/Structure`, beside `landmark` | any structure may show a light by night | ⚠ the quiet form: nearly every row answers *no*. Accepted on the `landmark` precedent (same shape, same host, same reader) and flagged — Q2 may replace it with a derived read, at which point the field goes |
| marks + kept skylines | `LocationGraphRegistry` (private) | the world's-shape index also knows what stands tall where | it already holds the structure attachments this is computed with; a second keeper would be a second invalidation. Read only through `NavigationApi`, server-side |
| `chartPoint()`, `heightAboveGroundM()` | `lib/stuff/Place` (the second overridden on `Location`) | every place can be asked where it is and how high it stands | both are derived reads with honest answers on every place (`null` = unplaced; `0` = on the ground); neither is a field. `structureNow()` / `craftHere()` are the precedent for this family on `Place` |
| `horizon: {block, reach}` | `SpatialZone` + `Place` | unchanged hosts | the field already lives on both; only its type changes |
| `Vantage` | `lib/perception/` value object | — | composes nothing |
| `closeBy`, `fixed` | `HorizonSighting` | — | optional; absent means *as before* |

⛔ No guard re-narrows a host anywhere in this plan. If the build finds
itself writing `if (structure is a Ship) skip position`, the field has
drifted back onto `Structure` — stop and re-read this table.

## Convention conformance

Checked 2026-11-16 against `CLAUDE.md`, `docs/antipatterns.md`,
`docs/lint-family.md`.

- **`props:` / `cast:`** — the gallery room places nothing by `container:`;
  its fixtures, if any, go in `props:`.
- **Locations, not rooms** — the gallery is a `/platform/location/Locale`
  row like the landing; nothing here uses a room class.
- **Namespace** — the new Locality row is `/stuff/idea/Locality/wharfside`
  in the `terminus` pack (`content/stuff/idea/Locality/wharfside.yaml`, the
  `hollow-mere` pack's precedent); ⚠ never under `/world/…` (silently
  unindexed — address.md).
- **Module scope / imports / categories** — one new file, a value object in
  `lib/perception/`; no free helper (the row-walk is a private registry
  method, the horizon pieces stay module-private in `PerceptionLogic`); no
  `eslint-disable`.
- **Verbs on objects** — `place.chartPoint()`, `locality.getPosition()`,
  `building.getPosition()`; no `XApi.verb(host)`.
- **Inter-Stuff methods only** — the registry reads rows (data), never
  another Stuff's fields; live marks read getters.
- **P3 refuse/skip/throw** — bad `horizon` shape, non-finite position,
  `_radiusM ≤ 0`: typed throw at the setter. No position: skip the static
  skyline (D4.4). Entry not yet standing: skip + kick (D9). Subject too
  close / not in sight: a reading decline with a reason. A `reach` target
  that is neither an expanse nor a structure row, and a `landmark` with no
  resolvable point, are **content errors caught by `lint:location-graph`**
  (two new checks), not runtime warnings.
- **P4 no duck typing** — the two structural casts
  (`typeof s.hasMember === 'function'` in `horizonAshore` and
  `Expanse.landmarks`) are deleted with their functions;
  `lint:duck-typing` falls and its ceiling is lowered in the same commit.
  Nothing imports a pack.
- **P5 the model decides** — in view / close by / lit / blocked are decided
  in `PerceptionLogic` + the registry; `QueryController` words a sighting,
  `BearingReading` reads one.
- **P6 persistence per content** — the five authored fields are
  `{persistent: true, authorable: true}` content; the marks and skylines
  are derived and never saved (drive steps 1 and 14 prove a restart
  rebuilds them). No `Map` field is persistent; memo keys are template
  paths.
- **P7 load on use** — no boot entry; Localities are already resident
  through `AddressApi.needs`; the marks ride the one existing scan
  (`lint:template-scans` stays at one site); listed structures are stood
  up by following the kept list.
- **P8 names** — `Vantage` (the headland's own row calls itself *a
  vantage*); *skyline* is the kept, fixed part of the *horizon*;
  `showsLight` says what it does; American spelling throughout.
- **P9** — no view key, option or dispatcher behavior is added; `query`'s
  and the two readings' help say what ashore now returns, and that a
  skyline lists a handful, most prominent first.
- **P10** — no new vocabulary or table; positions are fields on rows that
  already exist; no new `Idea` class (`lint:data-ideas` unchanged).
- **P11** — the three-way dispatch on *where the viewer is* is removed.
  One branch remains and is named: the moving source differs by frame (the
  chart gives positions, the line gives names). Unifying it needs the
  line→chart bridge (Q3), not a caller-side `if`.
- **P12** — `skylineNow` is not a synonym of `attachedWithinNow`; if W4
  leaves `attachedWithin` / `attachedWithinNow` without a caller they are
  deleted, not kept beside it.
- **P13** — read each host's header before adding (table above);
  `lint:mixin-clusters` is untouched (no mixin changes).
- **P14** — the handful cut selects by an author-visible reason (the flag,
  then angular height); *close by* declines to invent a direction; a
  `reach` never retargets.

**Gates this build must pass:** `lint:field-meta`, `lint:instanceable`,
`lint:locations`, `lint:location-graph` (extended, W2/W4),
`lint:template-scans`, `lint:boot-entries`, `lint:imports`,
`lint:module-scope`, `lint:lib-statics` (no new static on a non-Api —
`Vantage` is instance-only), `lint:duck-typing` (falls), `lint:object-verbs`,
`lint:thin-forwarder`, `lint:data-ideas`, `lint:view-keys`,
`lint:test-content` (kernel tests name no shipped row — fixtures only),
`lint:test-bootstrap`, `lint:authored-prose`, `lint:drive-scripts`,
`lint:biome`, `lint:schema` (no collection added). Run
`pnpm -C packages/server lint:family` at every wave.

## Waves

Each ends at a pushed commit; `pnpm test:near` + `lint:family` at each.

**W0 — `Vantage`; the sea delegates.** ✅ done (65c478039) — as planned. D3 (first half).
`lib/perception/Vantage.ts` (+ `__tests__/Vantage.test.ts`: the √(2Rh)
figures — 4.6 km from eye height, 35 km from 100 m — the small-planet
scale, bearing and range against `GeoPosition`). `lib/expanse/Expanse.ts`:
`sightRangeNm` and the candidate loop of `sightingsAmong` call it.
*Acceptance:* every existing `lib/expanse/__tests__` and horizon test green,
unchanged. *Commit:* `refactor(expanse): the sight core is a Vantage`.

**W1 — Points and the room's position.** D4, D7, D13; S1, S2, S3, S7, S8.
`platform/idea/Locality.ts`, `lib/structure/Building.ts`,
`lib/structure/Structure.ts` (`showsLight`), `api/address.ts` +
`platform/idea/api/AddressLogic.ts` (`positionedLocalityOf`),
`lib/stuff/Place.ts` + `lib/location/Location.ts`,
`platform/idea/api/ZoneLogic.ts` + `lib/zone/SpatialZone.ts`
(`climateSite(fallbackLatitudeDeg?)`), and D13's two readers
(`platform/idea/api/BiomeLogic.ts`, `platform/idea/api/MagicLogic.ts`).
Tests: setters refuse bad values;
the chain walk; `chartPoint`'s four cases; latitude — zone states one →
kept, none → the Locality's, neither → 42. *Acceptance:* no row authors a
point yet, so nothing observable changes. *Commit:*
`feat(geography): a Locality and a building have a point on the chart`.

✅ **W1 done.** Built as planned, with three deviations, all for module
cycles or doctrine:
- **`Structure.chartPoint()`** (a hook; default `null` until W2 reads the
  sea node off the mark; `Building` answers its `position` first). `Place`
  cannot `instanceof Building` (a value import closes a cycle) and must
  not duck-type, so the structure is asked. Not a new class or field.
- **`Locality.positionedLocality()`** — `Place.chartPoint` asks its
  memoized weather Locality rather than importing `AddressApi` (cycle).
- **D7's fallback is resolved inside `ZoneLogic.climateSiteFor` through
  the place's own memoized Locality** (`Atmospheric.resolveWeatherLocality`):
  importing `AddressApi` into `ZoneLogic` closed a load cycle (biome → … →
  Tombstone → Location → Place). Every climate reader still goes through
  the one resolver.
- D13: the readers take `(elevationFor ?? 0) + place.heightAboveGroundM()`
  (async ground walk, not `heightAboveSeaM`'s sync `peekField`, so a cold
  ancestor zone is not read as 0). The *stairwell is not a waterfall* test
  keeps its `elevationFor` assertion; its "same pressure" half was the
  premise D13 reverses and became the new thinner-air test.

**W2 — The marks and the kept skyline.** D1, D2, D8; S5, S6.
`platform/idea/LocationGraphRegistry.ts` (one call at the end of
`deriveAttachments`, one each in `attachStructure` / `detachStructure`, and
a marked private section), `api/navigation.ts`,
`platform/idea/api/NavigationLogic.ts`,
`packages/server/scripts/` — the `lint:location-graph` script (a landmark
with no resolvable point). Dials in
`packages/content/platform/content/settings/` (`perception.skyline.*`).
Tests (fixture rows only): a structure row never loaded is a mark; point
resolution order (own → node → Locality); a craft row is not a mark; a row
saved / removed / re-heighted changes the next read; attach / detach of a
live structure; landmark-first and the cut; memo hit and generation
invalidation. *Acceptance:* `skylineNow` answers from rows alone with
`StuffApi.findByTemplatePath(structure) === undefined`. *Commit:*
`feat(geography): the location graph keeps what stands tall, and a skyline per vantage`.

✅ **W2 done.** As planned (`deriveMarks` at the end of `deriveAttachments`,
`markLive`/`unmarkLive` in attach/detach, a fenced private section), plus:
- `NavigationApi.markPointNow(path)` — a structure row's OWN point (authored
  or its sea node) for every structure, tall or not; `Structure.chartPoint()`
  reads it (S8's hook from W1, now live).
- `skylineNow(vantage, {own, keepAs, nearM})`: `nearM` lists a mark inside
  the viewer's Locality radius whatever the curvature (*close by* must not
  depend on height). A dirty read kicks the re-derive and answers unkept.
- ⚠ **Pre-existing defect fixed:** `projectRow` self-called the gated
  `removeRow` through the proxy, so every save of a non-place row (a
  building, a business) threw `SecurityError` into `DomainHook`'s
  diagnostic. Split into a private `removeRowImpl`.
- `Vantage` added to `lint:object-verbs`' value-type list (beside `Light`).
- The landmark-has-a-point check in `lint:location-graph` moves to **W3**:
  it is red until the Terminal has a point.

**W3 — The content stage.** D12, D6 (rows), Q1, Q2 (craft rows), Q5 (Mayfield Row's address).
`packages/content/platform/content/platform/idea/Locality/terminus-city.yaml`;
`packages/content/world-seed/content/stuff/idea/Locality/{hinkley-hills,hearts-delight,rejection}.yaml`;
`packages/content/hollow-mere/content/stuff/idea/Locality/hollow-mere.yaml`;
`packages/content/waponi-woo/content/stuff/idea/Locality/waponi-woo.yaml`;
new `packages/content/terminus/content/stuff/idea/Locality/wharfside.yaml`;
`packages/content/terminus/content/world/terminus/terminal/structure.yaml`,
`gannet-rock/structure.yaml`, `gannet-rock.yaml`, new
`gannet-rock/gallery.yaml` + the landing's way up. Q1's answer lands here
(Hollow Mere's zone latitude). ⚠ Before committing, list what the new
Wharfside Locality changes for the rooms it now covers — weather pin and
lean, `_reach`, government key, public lighting, map filing — by
`trace address` on the bank, the strand and the headland before and after;
copy onto the Wharfside row whatever they inherited from the city that a
finer Locality would otherwise shadow. *Acceptance:* a pack reinstall is
clean; `measure`/climate at every realm place moves by < 0.5° of latitude
except where Q1 says otherwise; the horizon is still today's (W4 has not
landed). *Commit:* `content(geography): the realm on the chart`.

✅ **W3 done**, re-planned in two places (decided by the build, flagged
in the MR for the owner):
- ⚠ **Q5 reversed — Mayfield Row is NOT a typo.** Its street row says so
  in its own words: *"THE LAMPS NOBODY PAYS FOR. Mayfield Row addresses
  `terminus/mayfield-row` — OUTSIDE the city — so its covering locality is
  the realm, which funds no lighting… they stand cold every night."* The
  address is deliberate content (lens 3a: the fiction's own story), and the
  re-address would have lit those lamps. Left as authored; Seznick House
  stands at the realm root (no point), so it is on no skyline but its own
  ground, which is unchanged.
- ⚠ **Q1 deferred — Hollow Mere keeps its zone's −58°.** Measured: at its
  Locality's 42.2° N with the same offset the mere first freezes on
  **day 203** (bears 59 kg; 103 kg on day 205; 1,559 kg on day 223; open
  water day 123–173 of the next year), and on a fresh world's day 0 it is
  ~44 t of winter ice. Three merged drives stand on day-0 Hollow Mere —
  `storage-and-ice` (blocking + soak, day-indexed from 0),
  `controllers-are-io` (17b wades north from the shore into the water)
  and `underwater` (19, the frog in the pool) — so taking Q1 here means
  re-timing other builds' drives. D7 already keeps a stated zone
  latitude, so geography needs nothing from it. The Locality's point is
  authored (the chart is right); the climate contradiction is named on the
  row. Drive step 12 moves to Hinkley Hills (no zone latitude).
- Gannet Rock's gallery is reached by an **iron ladder up the outside of
  the tower** (two rooms, z 1 and 2; the gallery z 3 = 30 m, eye 32 m):
  `lint:locations` requires a way inside a zone to join adjacent cells.
  Open to the sky, so lit by day.
- Wharfside's row copies the city's grid street lighting (streets settle
  with their FINEST covering locality); the government key walks the
  chain, the city pins no weather and declares no reach, so nothing else
  is shadowed.
- Lit ships: the Hesper, the Corrigan, the Ostrander (river). The
  Kittiwake (a ketch) is unlit. The Nesbit ferry is a service row, not a
  structure — nothing to author.
- `lint:location-graph` gained **landmark-without-a-point** (error);
  proved it fails by deleting the Terminal's and the city's points.

**W4 — One horizon.** D3, D5, D6, D9, D10; S9, S10.
`platform/idea/api/PerceptionLogic.ts` (l.1517–1700 replaced; `observe`'s
place branch), `api/perception.ts` (the interface block + `horizonFor`'s
doc), `lib/zone/SpatialZone.ts` + `lib/stuff/Place.ts` (`horizon` type and
setter), `lib/zone/LocationZone.ts` (`lookOutFrom`),
`lib/expanse/Expanse.ts` (`landmarks()` deleted, `sightables()` craft-only,
`peekShorePositionFor` deleted if `grep` finds no other caller),
`platform/idea/cmd/perception/QueryController.ts` (`where`: `close by`),
the `lint:location-graph` script (a `reach` target resolves), the 11
`horizon:` rows (D5's table), the settings row for
`perception.horizonRatio` (removed), the five test files in Grounding
(rewritten against fixture Localities with points). B4: `grep -rn
"horizon:" packages/content` shows only the new shape. *Acceptance:* the
unit forms of AC 1–6, 8–10, 12, 14; `watch horizon` still reports a sail
coming and going. *Commit:* `feat(geography): one horizon for land, river and sea`.

✅ **W4 done.** One rule (`horizonImpl`), as D3/D5/D6/D9/D10 say. What the
build decided beyond the plan:
- **`lib/perception/HorizonOverride.ts`** — a second new file (a value
  class): the `{block, reach}` shape is validated on TWO hosts (`SpatialZone`,
  `Place`) and read by three callers (the horizon, the stand-up, the
  transport pack's `LaneCatalogue.seaNodeNamed`, which used the old list to
  find the seas a place looks out on — it reads `reach` now). One concept,
  no static; `blocks(bearing, range)` lives on it.
- **`Place.horizonOverride()`** (own, else the zone walk), **`Place.horizonVantage()`**
  (chart point + standing eye + kept-skyline key + near radius + own
  structure) and **`Place.standUpHorizon()`** (D9's one stand-up, kicked by
  `LocationZone.lookOutFrom`, awaited by `observe`'s place branch and by the
  bearing reading). ⚠ `peekField('horizon')` reflects through `getHorizon()`
  and returns the VALUE OBJECT, not the record — `horizonOverride` takes
  either.
- **`Positioned.isLitByNight()`** hook (default `false`, `Ship` answers its
  row's `showsLight`): a craft at sea may be a boat that is not a
  `Structure`, so *is she lit* must be answerable on every craft without a
  duck probe.
- The sync read never stands a path up itself (`lint:get-or-create`); a
  skyline entry not standing is skipped and the PLACE's stand-up is kicked.
- The six `horizon: []` rows became `block: all` (all six — it keeps
  today's answer exactly; the plan's "delete where no room is open to the
  sky" is cosmetic). The estuary, harbor and headland `reach` the Greywater;
  University Avenue and Wharfside lost theirs.
- `lint:location-graph` gained **horizon-reach-unresolved** (and refuses the
  list form). `lint:duck-typing` ceiling 474 → 471. `perception.horizonRatio`
  removed. `peekShorePositionFor` stays — the water pack's `WaterExpanse`
  calls it.
- ⚠ Sea-side change: `Expanse.sightables()` is craft only, so `contactsFrom`
  (the hail) no longer lists a light on a rock; the bearing reading reads the
  horizon instead (W5).

**W5 — The readings ashore.** D11.
`platform/idea/reading/BearingReading.ts`, `LatitudeReading.ts`, their rows'
prose, their tests, the help topics. *Acceptance:* AC 7, AC 11. *Commit:*
`feat(geography): a bearing and a latitude are taken ashore`.

✅ **W5 done.** As D11. Ashore a bearing on a fixed mark reports *a line
you stand on; a second crosses it*; `closeBy` declines `too-close`; the
latitude ashore needs an open sky (`no-horizon` under a roof) and mends
nothing. Rows' `improves:` and `query`'s help say so.

**W6 — The drive, the walk, the docs.**
`packages/wire/tests/geography.wire.test.ts` (§ Test & gate strategy),
`e2e/tests/geography-walk.spec.ts` (B3, once), the drive record appended
here; doc edits to `docs/subsystems/{perceiver,expanse,address,location-graph,instrumentation,weather}.md`
for what changed (the subsystem graduation proper is `/finalize`'s).
Then the full suite, once, and the MR.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| the skyline ashore | `query horizon`, `watch horizon` (shipped views; no new verb) | `Perceiver` on the body (shipped) | `Locality._position/_radiusM`; `Building.position`; `heightM`, `landmark`, `showsLight` on structure rows | Localities: resident via `AddressApi.needs`. Marks: the graph's lazy derivation, **awaited at `observe`**, kicked on a dirty sync read. Listed structures: stood up from the kept list at `lookOutFrom` (kick) and `observe` (await) | the `horizon` MQL scope (`api/mql/resolver.ts` l.787) is sync over `horizonFor` — a sighting whose `stuff` is not standing would be unbindable, hence D9 |
| land seen from a deck | same | same | the same marks | the craft's expanse is resident while she sails; marks as above | same |
| `measure bearing <landmark>` ashore | `measure` / `analyze` (shipped) | the `bearing` Reading row; the compass's `capabilities: [bearing]` | the sighting's true bearing, server-side | `ReadingCatalogue` (self-warming) | row `scope: [subject]` — ⚠ confirm in W5 that the subject binder's pools include `horizon` for a land body exactly as at sea (a required arg that binds nothing fails closed and silent — instrumentation.md) |
| `measure latitude` ashore | `measure` | the `latitude` row; a sextant | `ZoneApi.climateSiteFor` | as above | `scope: [here]` |
| block / reach | — (authored) | — | `horizon:` on a zone or place row | hydrated with the room; `reach` targets stood up by `lookOutFrom` | setter throws on a bad shape; `lint:location-graph` on a bad target |
| a tower built / pulled down | an author's `edit -c` / `rm`; a holding's mint | held extents (shipped) | the structure row; or the live instance | `DomainHook` → `projectRow`/`removeRow` → re-derive; `attachStructure`/`detachStructure` → generation | — |
| climate latitude from the point | — | — | `Locality._position` | `resolveClimateSite` at room load (shipped path through `climateSiteFor`) | — |

## Acceptance-criteria coverage

| AC | waves | proved by |
|---|---|---|
| ashore: a compass point and rough distance, landmarks first | W2, W3, W4 | unit (W4) + drive 1 |
| seen whether or not visited since start | W2, W4 | unit (W2: never loaded) + drive 1, 14 |
| two places, one consistent position | W3, W4 | drive 3 (arithmetic on the two reads) |
| *close by* inside your Locality unless you have a point | W1, W4 | unit + drive 4 |
| a higher room sees what a lower cannot | W1, W3, W4 | unit (altitude key) + drive 5 |
| night: only lit things | W1, W3, W4 | unit + drive 7 |
| `measure bearing` ashore; the compass narrows | W5 | unit + drive 2 |
| block does not see past; reach sees what it names | W4 | unit + drive 8, 9 |
| the 11 places still see what they saw | W3, W4 | drive 10 against D5's table |
| built / pulled down changes the skyline | W2 | unit (row write; attach/detach) + drive 11 |
| climate latitude agrees with position unless the zone states one | W1, W3 | unit + drive 12 (⚠ Q1) |
| test-fixture worlds as today | W1, W4 | unit (no position → no static skyline) + drive 13 |
| the client never gets more than the rough direction | W4 | unit: no serializer of `HorizonSighting` exists in `packages/server/src` outside `QueryController`'s `glance` (a grep-test); drive 15 (⚠ shared with navigation-server) |
| arriving costs no more than `look` | W2, W4 | unit: a second `horizonFor` at one vantage performs no mark computation (spy on the registry); the memo key is O(1) to build |

Nothing is unmapped. Two are conditional on an owner answer (Q1) or a
sibling's merge order (drive 15).

## Test & gate strategy

**Unit** (colocated `__tests__/`, fixtures only): `Vantage` arithmetic;
the row-walk and mark derivation; invalidation; `chartPoint`; the latitude
fallback; block sectors and reach; night; `closeBy`; the two readings.
The geometry of the *shipped* rows (D12's expected reads) cannot be a
kernel test (`lint:test-content`) — the drive asserts it.

**The blocking drive** — `packages/wire/tests/geography.wire.test.ts`
(`*.dirty.*` only if a step consumes something; it should not). Restart
steps run only in a world the run owns (`isOwnedTestWorld()`), on the
cleanliness-drive precedent.

| # | pace | how |
|---|---|---|
| 1 | instant | owned-world restart; `Session.open(h, {startLocation: '/world/terminus/market/square'})`; `look`; `query horizon` → the Terminal *close by*, the light *NE, some 19 miles off*, landmarks first. Assert through `eval` that neither structure was resident before the session opened |
| 2 | instant | `measure bearing light` bare-handed → `± 10°`; again holding the compass, with the Navigation Discipline staged to `novice` or better (grep the maritime and harbors wire files for how they staged it; if nothing stages a competence, that is tooling this build owes) → a narrower bracket. ⚠ An untrained reader gets ±10° with or without the compass; the step is only meaningful with the competence staged |
| 3 | instant | a session at `/world/terminus/hinkley-hills/location/arrival`: the light *E, some 18 miles off*; the test crosses the two (point, miles) pairs and asserts they bracket one position |
| 4 | instant | the Market again: the Terminal's line carries no compass point |
| 5 | instant | Gannet Rock: `query horizon` on the landing, then up to the gallery: an entry present above and absent below. ⚠ Which mark discriminates is decided by arithmetic in W3 (candidates: the rubber works at 12 m; if no shipped mark does, W3 authors a height and point on one low waterfront building) and recorded |
| 6 | instant | step into a roofed room: `query horizon` → nothing |
| 7 | short | `advanceWorldClock` to full night; the Market: the light listed, the Terminal not |
| 8 | instant | a place authored with a block sector across the light's bearing (W3 picks one outdoor Hinkley Hills room, or the drive stages `setHorizon` through `stage()` and restores it) → the light absent |
| 9 | instant | the headland brow: the Hesper with a direction (stage her at the bar with `stageShip`); then a session aboard her at sea: the Terminal and the light with directions |
| 10 | instant | one session per row of D5's table, asserting the *still sees* column; any difference is written into the drive record with its reason |
| 11 | **staged** | a session holding `/world/terminus/hollow-mere` (`Session.open(h, {parcels: […]})`) writes a 60 m `Building` row there with **`edit -c`** (payload `data`: `extent`, `heightM`, a name) — the wizard tool; from Hinkley Hills, `look` then `query horizon` → *N, some 8 miles off*; **`rm`** the row → gone. If `edit -c` cannot carry a payload over the wire session, the fallback is `eval --parcel` calling `TemplateApi`'s save and delete; if neither reaches `DomainHook`, that is tooling this build owes (a `/auth/test-template` route beside `/auth/test-stage`) |
| 12 | instant | Hollow Mere, weather pinned clear (its Locality already pins it), a sextant by `hand`: `measure latitude` → agrees with the Locality's point; `measure weather`/temperature consistent with that latitude (⚠ Q1 decides what "agrees" must mean here) |
| 13 | instant | the Weeping Moor: `query horizon` as today (nothing, or a river's craft by name) |
| 14 | instant | restart again; the Market: step 1's lines, byte for byte |
| 15 | instant | assert every envelope the Market session received carries no `bearingDeg` and no three-digit bearing; if the navigation-server build has merged, also that its horizon section equals `query horizon`'s rough directions |

**Soak drive:** none (the requirements name none; nothing here runs on a
span).

**B2** — before trusting a green run, break each checkpoint once (delete a
point, flip `showsLight`, drop the block) and watch it fail.
**B3** — `e2e/tests/geography-walk.spec.ts`, once at code-complete: the
Market, the headland, Hinkley Hills, by day and by night.
**The suite** — `pnpm test` twice only: at code-complete beside review, and
at `/finalize`. Between: `pnpm test:near`, `lint:family`.

## Sibling builds — where the files overlap

**navigation-server** (`build/navigation-server`, build-2; no commits yet).
It reads `PerceptionApi.horizonFor` and sends it as data.
- *Contract this build keeps:* `horizonFor(viewer): HorizonView`, sync,
  same name; `HorizonSighting` only **gains** optional `closeBy` and
  `fixed`; ashore `bearingDeg` / `rangeNm` become non-null.
- *What it must do:* serialize the `glance` point and rough miles, or
  `closeBy` — never `bearingDeg`.
- *Stay out of:* `PerceptionLogic.ts` l.1517–1700 and the
  `HorizonSighting` / `HorizonView` block in `api/perception.ts` are this
  build's; `Cartographer`, the map documents and the client are theirs.
- Drive step 15's second half belongs to whichever build merges second.

**zone-instancing** (`reqs/zone-instancing`, build-4). It reworks warrens,
copies' zones, the graph's record of copies, and ships as copies.
- *Shared file:* `LocationGraphRegistry.ts`. This build adds one call at
  the end of `deriveAttachments`, one in each of `attachStructure` /
  `detachStructure`, and a private section fenced by a comment banner. If
  they replace `liveStructures`, the two calls move with it.
- *No dependency on zones:* a room's position comes from its address and
  its structure, never its zone, so a copy stands at its Locality's point
  with no change here; craft are excluded from marks by their row keys, so
  ships becoming copies changes nothing.
- *Shared file:* `lib/structure/Structure.ts` — this build adds one field.

**Cross-check of the three plans (2026-11-17)** — read against
`navigation-server-plan.md` (c85617da1) and `zone-instancing-plan.md`
(027d72388):

- ⚠ **navigation-server's horizon section still lists `bearingDeg?,
  rangeNm?`** (its § sections, *horizon*). That contradicts the agreed
  rule (the client gets the rough direction only); their plan changes, not
  this one.
- **Map filing.** navigation-server files a map per **finest covering
  Locality** (`/home/<key>/map/<locality address>`). This build's new
  Wharfside Locality and the Mayfield Row re-address move ~25 rooms' claims
  to new documents. No migration (dev data); but any of their wire
  assertions on a Wharfside or Mayfield filing path changes with this
  build — the second to merge fixes the assertion.
- **`Locality.ts` fieldMeta.** navigation-server adds `_learnable` (and a
  kind); this build adds `_position`, `_radiusM`. A textual merge only.
- **zone-instancing D12 (authored ships become single copies of their
  kind).** The Hesper, Ostrander, Kittiwake and Corrigan `structure.yaml`
  rows change shape in their build; this build's W3 adds `showsLight` to
  the same rows. Put it on the **ship's own row** (riding lights are hers,
  not her kind's), and re-check after their merge that the field still
  hydrates on a copy. Craft remain excluded from marks either way.
- **Seznick House.** zone-instancing stamps a unit's address from the
  lobby's base (`HoldingWarren.addressFor`); this build's Mayfield
  re-address changes every Seznick unit's address. Their drive asserts on
  Seznick units — the second to merge re-runs that step.
- **`lookOutFrom`** now fires for rooms in copies (zone-instancing risk 3);
  this build's D9 kick runs there too — a house's yard gets a skyline from
  its Locality's point, which is intended; watch the cold-start cost.

Neither build gates on the other; the second to merge rebases.

## Risks & opens

**Decided by the owner (2026-11-17)** — all six took the recommendation.

- **Q1 — Hollow Mere's latitude → (a).** Drop the zone's `latitude: -58`;
  Hollow Mere's Locality point sits at ~42.2°N, and the mere keeps its
  freeze through a `climateOffsetK` (the frost-hollow tool), proved by
  `WeatherApi.climateAt` arithmetic in a pack test, the cold-storage soak
  named for the lane. Its seasons become the realm's. *Lens 3a chose: a
  place cannot be twenty miles off and in the southern hemisphere.*
  Waponi Woo's zone latitude (30° against its node's 38°N) is left alone —
  no drive step stands on it; listed for the slate.
- **Q2 — What *lit* means → an authored `showsLight`, now; derived later.**
  The flag on `Structure`, as planned. ⭐ **Ships too:** an unlit craft is
  not seen by night — the same D6 test applies to registered craft at the
  read (a `Ship` is a `Structure`, so the field already reaches it), which
  also answers the quiet-form worry on the host: craft are a large share
  of the *yes* rows. W3 authors it on the Hesper, the Corrigan and the
  ferries (riding lights) and leaves the small boats unlit. The seeded
  passing traffic is unchanged by night (ambient, no row to author) —
  recorded in the slate. Deriving *lit* from a real lamp or the street
  lighting → geography-slate § Open.
- **Q3 — River craft → name-only**, the line-to-chart bridge recorded in
  the slate.
- **Q4 — Wharfside only**, no re-addressing.
- **Q5 — Mayfield Row is a typo.** Its shops are already under
  `terminus/city/mayfield-row/…` (3 rows); the street
  (`mayfield-row/street.yaml`) and Seznick House
  (`seznick-house/lobby.yaml`) say `terminus/mayfield-row`. W3 corrects both
  to `terminus/city/mayfield-row[/seznick-house]`, with the same
  before/after `trace address` guard as Wharfside (map filing, government,
  weather) and a grep for the old prefix in tests and `job.yaml`/
  `painters-round.yaml`/`necropolis/ground.yaml`/`pack.yaml`. The Delight
  valley road (`terminus/delight-valley/…`) is countryside between towns:
  no skyline, reported by the census in the drive record.
- **Q6 — Kept per point owner and eye altitude**, as D2 says.

- **Q7 — Which `elevationFor` readers use the total height → pressure and
  magic** (the owner, 2026-11-17, relayed by the navigation-server
  session: *"yes, use the total for pressure and magic"*). D13.

**Engineering risks**

- **Cold start.** The graph warms lazily; D9 awaits it at `observe`. If the
  first `look` after boot is measurably slower, the graph warm moves to the
  boot path it already half-occupies (`standUpAttached` kicks it at the
  first room load) — measure in W4, do not guess.
- **Deadlock.** Nothing in `addLocation`, `postRegister` or a structure's
  own load may await the stand-up (D9). A hang at room load in W4 is this.
- **The static row-walk is a second form of the address and elevation
  walks.** W2 tests it against fixtures; drive step 1 plus an `eval`
  comparison of each shipped landmark's static address against
  `AddressApi.resolveFor(entrance)` catches drift in content.
- **Wharfside's new Locality** changes which Locality covers ~25 rooms
  (weather, reach, government, lighting, map filing). W3's before/after
  `trace address` is the guard; the navigation-server build files maps by
  Locality and must be told (§ Sibling builds).
- **Module cycles.** `LocationGraphRegistry` already imports `Structure`
  lazily for this reason; `GeoPosition` and `Vantage` are leaf value
  modules and safe; `ZoneLogic` → `AddressApi` is new — if it closes a
  cycle, the fallback latitude is passed in by `Atmospheric.resolveClimateSite`
  instead (it already holds the weather Locality).
- **The elevation term widens sight a lot** (a 60 m top is seen ~19 nm from
  the beach). The handful cut and `minHeightM` are what keep a hill town's
  chimneys off every skyline; tune the two dials in W3 against D5's table,
  not the rule.
- **Waponi Woo's peak** gains its zone's 40 m (1140 m top): it is raised
  about a mile sooner at sea than today. Stated, not hidden.

## Deferred seams

- Moving things on land (a caravan, smoke) → geography-slate § Open 1; the
  attach point is the moving-source merge in `horizonFor`.
- A Locality as an outline → geography-slate § Open 2 (`_radiusM` is the
  only reader of extent).
- A player claiming the landmark flag → geography-slate § Open 3; height
  alone already lists a built tower (the live mark).
- *Lit* derived from a real light, and night at sea → **add to
  geography-slate § Open** at the sweep (Q2).
- A line's chart position, so river craft get a direction → **add to
  geography-slate § Open** (Q3).
- The peak as rising ground, not a `Structure` → mountain-slate § 1; marks
  key on the row, so it moves without touching this build.
- The atlas and *you are here* → atlas-slate, map-slate: both read
  `Locality.getPosition()`.
- Longitude by clock → the latitude reading's own note.

## Critical files

Read first, in this order:

1. `docs/requirements/geography-requirements.md`, `docs/slates/world/geography-slate.md`
2. `packages/server/src/mud/platform/idea/api/PerceptionLogic.ts` l.494–520, l.1517–1700
3. `packages/server/src/mud/lib/expanse/Expanse.ts` l.640–870; `GeoPosition.ts`
4. `packages/server/src/mud/platform/idea/LocationGraphRegistry.ts` l.95–235, l.355–560
5. `packages/server/src/mud/platform/idea/Locality.ts`; `api/address.ts`; `docs/subsystems/address.md`
6. `packages/server/src/mud/lib/structure/Structure.ts`, `Building.ts`
7. `packages/server/src/mud/lib/zone/SpatialZone.ts` l.255–460; `LocationZone.ts` l.56–130; `platform/idea/api/ZoneLogic.ts` l.140–180
8. `packages/server/src/mud/lib/stuff/Place.ts` l.200–335
9. `packages/server/src/mud/platform/idea/reading/BearingReading.ts`, `LatitudeReading.ts`
10. `packages/server/src/mud/platform/idea/cmd/perception/QueryController.ts` l.205–260; `api/mql/resolver.ts` l.780–790; `lib/perception/HorizonWatch.ts`
11. `packages/content/world-seed/content/stuff/idea/WaterExpanse/greywater.yaml` and the node rows beneath it
12. `packages/wire/src/harness/world.ts`; `packages/wire/tests/cleanliness.dirty.wire.test.ts` l.754–790; `docs/testing.md` § Staging
13. `docs/review-questions.md`; `docs/subsystems/location-graph.md` § Attachments

## Drive record

*(appended at build time)*
