# Geography slate — one geographic frame for land and sea, carried by Localities

**Status:** slated 2026-11-14, from the navigation pane's horizon section
([map-slate § The whole card](./map-slate.md)); the owner: *"this sounds
better than what we have now."* **Requirements drafted 2026-11-16**
([geography-requirements](../../requirements/geography-requirements.md)),
in parallel with the navigation-server and zone-instancing builds. **Size:** a build — server-led, with
content (anchors for the shipped Localities and landmarks). **Priority:**
with the navigation server work ([navigation-server-slate § S20](./navigation-server-slate.md)).

## The problem — land has no frame; the sea does

- **At sea** there is a real frame: an Expanse has an origin in latitude and
  longitude, every node and craft a position, and bearing and range come
  out of geometry — sight by the curve of the earth, heights, elevations
  ([expanse.md](../../subsystems/expanse.md)).
- **Ashore** there is none: *a Cartesian zone has no origin, no offset, and
  no position relative to any other zone* ([map-slate § Zone level](./map-slate.md)).
  So the horizon ashore (`PerceptionApi.horizonFor`, `horizonAshore`) falls
  back to an **authored list** of zones you can see into, estimates
  distance from the zones' sizes, and reports **no bearing and no range** —
  a list of buildings with no directions, while the same section at sea is
  a bearing-and-range picture. Two shapes for one question.

## The model **[DECIDED in shape — the owner]**

Geography lives on the **Locality** tree — *"only Locality is really
spatial or geographic at all"* (the owner); zones are the meta layer
(extents, authority, rules), never placed.

- **Each Locality carries a geographic anchor** in the same latitude and
  longitude frame the Expanse already uses — so **land and sea are one
  frame**.
- **A landmark or structure may carry its own precise point** when it
  matters (the lighthouse, the mill tower).
- **A room's position in the world** is its structure's point when it has
  one, else its Locality's anchor. Zones stay unplaced; your map's precise
  geometry still lives in zones, and zone-to-zone misclosure is untouched.
- **The horizon is one computation everywhere:** from where you stand, to
  every sightable thing in the frame — real bearing and range; visibility
  by height, elevation and the curve of the earth, **the formula the sea
  uses now**. Ashore gains compass points and ranges; the map gains edge
  ticks everywhere; the client builds one horizon.
- **Authored `horizon` lists stay — as overrides:** occlusion (*this valley
  cannot see past the ridge*) and reach (*from this tower you see the whole
  bay*).

## The cost model — sparse landmarks, a kept skyline **[DECIDED — the owner, 2026-11-16]**

The owner: *"there's a reason MUDs never did this shit."* The precedents
that handled distance agree on one shape, and it is the build's:

- **Skyrim's distant LOD** — far objects flagged *visible when distant*,
  baked at authoring time; only nearby cells simulate.
- **EVE Online** — static celestials always on the overview; ships
  beyond the grid only through the **directional scan**, an act with a
  range (our `watch horizon` and the lookout).
- **Google Earth** — a hierarchy of cells; labels by **prominence at the
  zoom**; a *what is near here* query is a few cells, never a scan.
- **Achaea's wilderness** — `SURVEY`, a low survival skill, adds *the
  approximate direction of well-known places*: coarse, skill-gated.
- **Koster, *A Spatial Representation of the Virtual World*** — the
  **sparse** map stores only landmarks; a place's view composed from
  proximity, visibility and notability. He knew of no server that did
  the prose well — so the skyline is plain lines, never woven prose.
- **Diku/Circle `scan`** — a walk along exits for who is near; no
  skyline at all.

So: **far and static is precomputed per place (per Locality, plus a room
with its own point) and kept**, redone only when something tall is built
or pulled down or a point moves; **far and moving is found only by an
act**, bounded by the geometric horizon √(2Rh) (about 4.6 km from eye
height, 35 km from a 100 m tower). **Nothing is loaded in order to be
seen** — the skyline reads points and heights from the rows or the
location graph's record (today's ashore horizon sees only structures
already loaded, a defect against *load on use*).

⭐ **Precision is skill-banded** (the owner): everyone in view gets the
glance (eight points, rough miles); `measure bearing` with a compass and
the Navigation Discipline narrows it — the shipped instrumentation rule
(*competence resolves detail, never access*). The client is sent the
glance, never the true bearing.

## Reuse ledger for the plan

| concept | what does it today | this build |
|---|---|---|
| a point on the chart | `GeoPosition` (`lib/expanse/GeoPosition.ts`); the Expanse's `origin` | **reuse** for Locality and structure points |
| bearing and range between two points | the Expanse's sight math (`sightingsAmong`, `contactsFrom`) | **generalize** out of the sea into the one rule |
| visibility by heights and curvature, by hour | `Expanse.sightingsAmong(…, hour, …)`, the craft's `sightHeightFor` | **reuse** |
| the glance | `PerceptionApi.glance(bearingDeg, rangeNm)` | **reuse** unchanged |
| the horizon's shape | `HorizonView {things[{stuff, bearingDeg, rangeNm}], traffic, atSea}` — bearing and range already nullable | **reuse**; ashore fills them |
| the three horizons | `horizonAtSea`, `horizonOnRiver`, `horizonAshore` in `PerceptionLogic` | **replace** with one; the river's `LineFrame.sightablesNear` and the sea's `sightables()` stay as the moving-thing sources |
| the precise reading | `measure bearing` — `BearingReading` row, hand-bearing compass (`capabilities: [bearing]`), Navigation Discipline | **reuse**; check it accepts a land subject |
| latitude | `measure latitude`; `SpatialZone.latitude` (7 rows) feeding climate | **reuse**; Locality point as the fallback |
| elevation | `SpatialZone.elevation` (21 rows), `ZoneApi.elevationFor` | **read only** (the owner) |
| height, landmark | `Structure.getHeightM()`, `isLandmark()` | **reuse**; prominence derives from them |
| the authored lists | `SpatialZone.horizon`, `Place.getHorizon()` (11 rows) | **recast** as block / reach overrides |
| which structures exist where, without loading | `NavigationApi.attachedWithinNow` (live only) and the `location_graph` record | ⚠ **the gap** — the skyline needs points and heights without loading; find the record that carries them before adding one |
| a Locality | `platform/idea/Locality.ts` — no position field | **extend** with a point and radius |
| Gannet Rock's position | a fixed sightable on the Greywater | **reuse** — must not get a second, disagreeing point |

## What it buys beyond the horizon

- The illustrated maps' **"you are here"** gets a real position for every
  Locality ([map-slate § The illustrated map](./map-slate.md)).
- The atlas's large chart shows **land and sea together**
  ([atlas-slate](./atlas-slate.md)).
- **Latitude has one honest home** — zones carry `latitude` today for
  climate; it can come from (or move to) the Locality's anchor.

## Decided at requirements (2026-11-16)

1. **Point or footprint** — a point with a radius.
2. **Elevation** — stays on the zone (the owner); read, not moved.
3. **Latitude** — from the Locality's point unless a zone states its own.
4. **Content** — points for the realm's real Localities and the
   structures worth seeing; districts too far from their Locality's center
   get a Locality of their own; the test-fixture worlds get none.
5. **The candidate set** — static: landmark and tall structures, ranked by
   prominence; moving: craft and river traffic, by an act only.

## Open

1. **Moving things on land** seen from afar (a caravan, smoke) — would
   join the act-only rule.
2. **Outlines** for a Locality, when a need appears.
3. **A player-built structure's landmark flag** — prominent by height
   alone today; whether an owner may also claim the flag (lens 4).

## Cross-references

- [expanse.md](../../subsystems/expanse.md) · [address.md](../../subsystems/address.md) ·
  [perceiver.md § Beyond the room](../../subsystems/perceiver.md) ·
  [construction.md](../../subsystems/construction.md) (structures, height,
  landmark) · [weather.md](../../subsystems/weather.md) (latitude)
- [map-slate](./map-slate.md) · [navigation-server-slate](./navigation-server-slate.md) ·
  [atlas-slate](./atlas-slate.md)
