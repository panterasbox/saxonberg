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

1. **the water tells you** — every band boundary crossed, in order,
   described by the medium (`Expanse.readAt` — the sea state), never a
   position; a manned watch also names the band's hazards;
2. **arrival** — a course set for a node arrives when the track passes
   within `expanse.arrivalNm`; a bare bearing never does;
3. **a landmark is a free fix** — a fixed Structure in sight;
4. **sightings** — craft and seeded traffic, from the highest eye aboard
   (the lookout seat);
5. **neglect** — the deck's `Durable` gear wears by
   `gearHardness × roughness × expanse.neglectWearPerWatch`, a quarter of
   that when the watch is manned. Nothing new persists.

`Persistable.onRestored()` re-arms it after a restart. ⚠ It does NOT await
the expanse's compile — the compile stands the ships up, so awaiting it
from inside a ship's restore deadlocks.

## The plot — the other position

`Plot` is the reckoning: the last fix carried along the courses steered,
knowing nothing of the set. `course` and `locate` report THIS, labelled
as a reckoning, with an uncertainty (`expanse.reckoningGrowthNmPerHour`)
worded by the reader's `navigation` band — never refused. A fix
collapses it: a landmark in sight, a sounding over ground with a depth of
its own, arriving somewhere; a sun sight (`measure latitude`) mends the
latitude only.

## What the frame registers

The expanse's compile also stands up every Structure row sited on it: one
with a **deck** (`deckHeightM`) is a SHIP and is registered as craft from
the start (so it is alongside its landing before it ever sails); one
without is a **landmark** — sighted, a free fix, never a sail.

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

`Gunwale extends Shore` is the deck's moving shore: it cites
`"<expanse path>@<lat>,<lon>"` quantized to 0.1°, and the fishery reads
that cell from its bands' stock — `fish` works from a deck with no
fishing-pack change. Nothing is minted when a craft stops.

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
| `swim` | `StillWater` (environment, peers) | a small water is a place |
| `go aboard` / `go ashore` | `AboardExit` / `AshoreExit` | the far side recomputed every traverse |

⛔ No `fix` verb: the four fixes are four acts that already have verbs.

## Exits

`AboardExit` (on a node's landing) resolves to the entrance of whatever
SHIP lies at that node now; `AshoreExit` (on a ship's entrance) to the
landing of the node she lies at. Both refuse in words otherwise. Their
lookups run in `Exit.prepareTraversal()` (awaited by the movement verbs
before the synchronous gate) — `Exit.bind` is `@Final`.

## The room hook and the landmark

`RoomContributorMixin` — a thing that adds a line to its room's prose
(`Shore`, `Gunwale`, `Vantage`). `SpatialZone.visibleLandmarks` names the
Structures visible from anywhere in a region; their `outsideDescription`
is appended by `look`, each its own uncarded scene. An authored `[]`
stops the walk. ⛔ On land every sight-line is authored; only at sea is a
range computed.

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

- **Maritime build (2026-10).** The frame, the water tier, the voyage,
  the Structure, the two channels, the Greywater and the Hesper. The
  `SpatialZone` split into the region and `LocationZoneMixin`.
