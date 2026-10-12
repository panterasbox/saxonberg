# Expanse — a region you cross by setting a course

The maritime build's subsystem: a sea (and in principle a desert, an ice
sheet, a void) whose places are reached by **setting a course**, not by
walking an exit. It is the second and third spatial registers beside the
room grid:

| register | what a position is | neighbours |
|---|---|---|
| the **grid** | a room with cardinal exits | the exits |
| a **passage** | a fraction along one dimension (a channel over a bar) | its two ends |
| a **field** | a coordinate | none — you steer |

⭐⭐ **Two layers, and nothing is ever inside the frame.** An expanse holds
**nodes** (`ExpanseNode` — places and passages at geographic positions)
and **bands** (`Band` — regions with a width that confer cost and
character). Both are Ideas. Behind a node may sit ordinary rooms — a
landing, a pool, a lighthouse's foot — authored exactly as any other
place. Nothing about the sea enters the location graph.

## The three tiers

| tier | where | what it adds |
|---|---|---|
| the **frame** | `lib/expanse/Expanse.ts` (kernel, abstract) | nodes, bands, composition, the craft registry, sight, traffic |
| the **medium** | `/system/water/idea/WaterExpanse` (water pack) | the column (depth, bottom), derived sea state, the water state fish read |
| the **realm's sea** | `/stuff/idea/WaterExpanse/<key>` (a row) | the Greywater: its nodes and bands beneath it |

The frame is a `SpatialZone` (it has an address, landmarks, stock) and
composes **no** Location half — `LocationZoneMixin` (`lib/zone/LocationZone.ts`)
is what holds rooms, and only `CartesianZone` / `SphericalZone` compose it.

## Position: geographic frame, plane-sailing plot

`GeoPosition` (`lib/expanse/GeoPosition.ts`) is latitude, longitude and
`depthM` (always `0` until the underwater build). The frame is
geographic so a node sits anywhere on no lattice; the arithmetic is
plane sailing (`cos(lat)` departure), which is what a navigator with a
traverse table does. Persisted as its plain record.

`PositionedMixin` (kernel) carries `expansePosition` and `expanse` (the
row path). Composed by `ExpanseNode`, `Structure` and the transport
pack's `Boat` — never by `ExitableVessel` or `Mobile`. Two height hooks
— `sightHeightFor(observer)` and `getTargetHeightM()` — are what the
horizon reads.

⭐ A person's position is never their own: `ExpanseApi.craftAt(placePath)`
answers the craft a place IS (a launched boat) or is IN (the Structure
whose extent covers the room). Callers walk their own containment
(`getRootContainer()`) and pass the root's path — the Api takes paths
only (`lint:object-verbs`).

## Bands: cost and character, never connectivity

`BandExtent` is a closed two-word vocabulary: a **corridor** (two points
and a width — a rectangle on the local plane) or a **belt** (a lat span,
longitude optional — joins nothing). Inside or not is the one question;
`crossings(a, b)` is an exact Liang–Barsky clip, so a boundary crossing
is a parameter along the track, orderable and deterministic.

⛔ Removing every band from a sea leaves it fully crossable. A band sets
you (`setKn` along `direction`), slows you (`cost.wayFactor`), leans the
wind (`lean: { directionDeg, strengthMps }` — its own shape, not
`ClimateLean`, which has no direction), wears gear (`gearHardness`), and
places things (`hazards`, `stock`). `endpoints` are a planning
affordance; a `confined` corridor is what a **linear** node rides, and
from such a node only its two ends are a course.

**Composition** (`Expanse.fieldAt`): a field value comes from the
NARROWEST band containing the position (the zone walk's innermost rule);
placed things union. ⚠ So a belt right round the world never wins
anywhere a corridor runs through it — bound a belt's longitude if its
weather must be felt.

## The voyage — held by the craft

`VoyagingMixin` (kernel; `Structure`, `Boat`): ⭐⭐ the voyage's whole state
is **three persisted fields** — the stored `expansePosition` IS the fix,
plus `course` and `courseSetAtS`. `getExpansePosition()` answers the
DERIVED position while a course is set:

    positionNow = fix + course × (now − courseSetAt) + Σ set × time-in-band

integrated piecewise along the undisplaced track, split at every
boundary. `rebase` is the one writer; `steer` / `anchorHere` / `placeAt`
are the acts.

`Voyage` (`lib/expanse/Voyage.ts`) is a **sustained engagement whose
actor is the craft** — nobody's `cancel` reaches it, logging out does
not end it, a craft under way with nobody aboard still advances. One
emission per watch (`expanse.watchGameHours`, default 4):

1. **the water says what CHANGED** — at every band boundary crossed, in
   order, the field just before against just after
   (`Expanse.changesAcross`, a `@hook`: the frame reports the SET — *a
   current takes her, setting north-east*, *the current lets her go*;
   `WaterExpanse` adds the sea getting up or going down and the water
   paling over shallow ground), then the sky over the deck against the
   last watch's (*Fog closes in.*). Never a position, never authored; a
   crossing that changes nothing perceptible says nothing;
2. **arrival** — a course set for a node arrives when the track passes
   within `expanse.arrivalNm`; a bare bearing never does;
3. **neglect** — the deck's `Durable` gear wears by
   `gearHardness × roughness × expanse.neglectWearPerWatch`, a quarter of
   that when the watch is manned. Nothing new persists.

⛔⛔ **The beat sees nothing and fixes nothing** (revision 1). Noticing a
sail is the lookout's job (`watch horizon`, the `keeps-watch` brain) and
fixing the position is the navigator's (`measure bearing`); a beat that
announced either made the seat decorative. It names no hazard either:
seeing the race ahead is somebody's job, and the water says what the race
does to her once she is in it.

`Persistable.onRestored()` re-arms it after a restart. ⚠ It does NOT await
the expanse's compile — the compile stands the ships up, so awaiting it
from inside a ship's restore deadlocks.

## The plot — the other position

`Plot` is the reckoning: the last fix carried along the courses steered,
knowing nothing of the set. `course` and `locate` report THIS, labelled
as a reckoning, with an uncertainty (`expanse.reckoningGrowthNmPerHour`)
worded by the reader's `navigation` band — never refused. A fix
collapses it, and every fix is an ACT: a bearing taken on a fixed thing
(`measure bearing` — to within `range × tan(bracket)`), a sounding over
ground with a depth of its own, arriving somewhere; a sun sight
(`measure latitude`) mends the latitude only. ⛔ Nothing fixes you by
being seen.

## What the frame registers

The expanse's compile also stands up every Structure row sited on it: one
with a **deck** (`deckHeightM`) is a SHIP and is registered as craft from
the start (so it is alongside its landing before it ever sails); one
without is FIXED — a light on a rock: in view from a craft's eye, never a
sail, and the thing a bearing fixes by.

## Sight and traffic

`SightingChannel` = `visual | signal`. Visual range is
`1.17 (√h_obs + √h_tgt)` nautical miles, heights in feet; signal is
`expanse.signalRangeNm` regardless of height. Traffic is a SEEDED field
(`Expanse.trafficAt`): FNV over the expanse, the 0.1° cell and the game
hour against the narrowest band's `traffic` weight — the same for every
observer, unfarmable, nothing drawn.

## The water tier

`WaterExpanse` / `WaterBand` add `depthM`, `bottom`, `fetchKm`, `stock`.
⭐ **Sea state is derived and no row authors it**: wind direction from the
narrowest band's lean (else the prevailing wind), strength from the
weather field plus the lean, fetch and depth from the band — `Hs ≈
0.0016·U·√(F/g)`, capped at a developed sea, **steepened** where the
water is shallower than eight wave heights. Rendered in words.

A deck is a **shore of the sea under it** (maritime revision 3): the
deck row is a `/platform/location/Shore` whose `sea` feature cites the
expanse, and `WaterExpanse` — a `WaterSourceMixin` implementer — derives
the cell from the craft's position (a beach's from its nearest landing,
`peekShorePositionFor`) as `"<expanse path>@<lat>,<lon>"` quantized to
0.1°. The fishery reads that cell from its bands' stock — `fish`, `look
sea`, and a bucket over the side (salt water) all work from a deck.
Nothing is minted when a craft stops. (Was `Gunwale extends Shore`, a
prop; retired.)

## Knowledge: charts and pilots

`ChartedMixin` — *a source whose knowledge is claims*. A `Chart` read
writes `charted` claims; a `Pilot` paid (`pilot`) writes `told` claims
signed `toldBy`. Entries are authored as the source states them, so a
wrong chart is wrong in one row and never reconciled. See
[location-graph.md § Six channels](./location-graph.md).

## Verbs

| verb | afforded by | does |
|---|---|---|
| `course` | `Helm` (peers), `Boat` (inventory — granted inward to whoever sits in it) | reads the plot; lays a course by bearing or node |
| `anchor` | same | stops where she is |
| `hail` | same | signals a contact in signal range |
| `launch` / `recover` | `Boat` (inventory — you are in it) | over the side / back aboard |
| `pilot` | `Pilot` (peers) | buy told claims |
| `measure depth` / `measure latitude` | reading rows (`sounding` / `sighting`) | the sounding; the noon sight |
| `measure bearing` | reading row (`bearing`; the hand-bearing compass, or the eye at ±10°) | the bearing of a thing in view; a fix on a fixed one |
| `scan horizon` | `query` (alias `scan`; a bare `horizon` names a set) | what is in view beyond the room |
| `watch horizon` | `watch` (the stream verb's horizon form) | keep a watch: told only what changes |
| `swim` | `StillWater` (environment, peers) | a small water is a place |
| `go aboard` / `go ashore` | `AboardExit` / `AshoreExit` | the far side recomputed every traverse |

⛔ No `fix` verb: the four fixes are four acts that already have verbs.

## Exits

`AboardExit` (on a node's landing) resolves to the entrance of whatever
SHIP lies at that node now; `AshoreExit` (on a ship's entrance) to the
landing of the node she lies at. Both refuse in words otherwise. Their
lookups (which node is this landing, which craft is this deck's) run
inside the async `canTraverse` at the moment of asking, cached after
the first — the one gate every crossing goes through (see
[locomotion.md](./locomotion.md)).

## Perception at range (revision 1)

⭐⭐ **Pull, never push.** Nothing on the horizon is ever announced to
anybody: somebody looks (`scan horizon`) or keeps a watch (`watch
horizon`, `HorizonWatch` — an engagement on the watcher's attention that
says only what came into or dropped out of view). Push comes only from
emitters that announce themselves (a bell, a gun, a signal).

- **What is in view** is `PerceptionApi.horizonFor(viewer)`, and it is
  ⭐⭐ **SYNCHRONOUS** — it is the MQL `horizon` seed's pool and the
  resolver cannot wait, so every MQL caller gets the truth with one call.
  It reads only warm state: the RESIDENT craft and structures (one
  `StuffApi.findByMixin(Voyaging)` read, admitted by name in the
  registry-wide allowlist; Structures are booted and never culled —
  `Structure.canEvict`, `lint:structures`), the resident zones' fields
  (`Zone.peekField`, the sync sibling of `lookupField`), the compiled sea,
  and the cached sky (`WeatherApi.peekSkyType`). A sky nobody has read yet
  counts as clear once and starts its read; a sea nobody has compiled
  shows a height ashore nothing once and starts compiling. Afloat: the
  resident craft on her sea from the viewer's own eye (`Structure.sightHeightFor` — the lookout seat is the
  masthead), nothing below decks. Ashore: the nearest `horizon`
  declaration (a room's, then the zone walk) names ZONES; a Structure in
  one is in view from a sky-exposed room when `(heightM + |Δelevation|) ×
  perception.horizonRatio ≥` the distance the zones' spans imply
  (`CartesianZone.getExtentM`). A zone naming an EXPANSE is read like a
  deck: from the nearest landing (`Expanse.peekShorePositionFor`) at the
  zone's elevation, through the one sync sighting core
  (`Expanse.sightingsAmong`, which `contactsFrom` also uses over the sea's
  own registry) — the headland raises the light, the strand below it does
  not.
- **A Structure is Visible** (+ Detailed + Perceptible — `Species`'s and
  `Material`'s precedent): described once, the ordinary way; its inside is
  its member rooms. `landmark: true` FEATURES it in the summary; a room's
  `featured` features others. Whether it can be seen is derived.
- ⛔ **The engine appends nothing to a room's prose.** A room that mentions
  the tower does so in its own words, for its own reason (the crossing's
  `tower` detail tells the time).
- **Weather shortens sight**: visual range × the observer's sky (`fog
  0.1 · storm 0.3 · snow 0.4 · rain 0.6`, `expanse.visibility.<type>`); a
  signal is heard and unaffected.
- **Fog is a weather lean**: `Band.weatherLean` multiplies over the
  Locality's lean wherever a scope is aboard a craft inside the band
  (`ExpanseApi.leanAtSync`, warm state only — cold leans nothing). See
  [weather.md](./weather.md). No band authors prose.

## Deferred seams

| seam | attach point | slate |
|---|---|---|
| hazards firing at a boundary | `Band.hazards[]` + the boundary report | navigable-water § 3b |
| the berth | `AboardExit.computeDestination` | navigable-water § 7a |
| the second depth value | `GeoPosition.depthM` | underwater |
| the tide, a water biome, latitude as a resolved value | `WaterExpanse`, the `open-water` stub | climate-and-water |
| vector wind | `Band.lean` becomes a deviation | weather |
| a boat adrift across a restart | the dinghy is a deck prop, not boot-listed | the vessel build |
| cargo in a ship's hold | the rooms are singleton, non-persistable | the vessel build |

## History

- **Maritime revision 1 — perception at range (2026-10, before merge).**
  The room hook (`RoomContributorMixin`), the `Vantage` object, every
  `outsideDescription`, the beat's automatic sightings and fixes and its
  hazard warning were REMOVED: the engine was doing the lookout's and the
  navigator's jobs (lens 3b). In their place: the `horizon` scope, `look
  horizon`, `watch horizon` + the hired lookout's brain, `measure
  bearing`, the derived crossing delta, and fog as a weather lean.
- **Maritime build (2026-10).** The frame, the water tier, the voyage,
  the Structure, the two channels, the Greywater and the Hesper. The
  `SpatialZone` split into the region and `LocationZoneMixin`.
