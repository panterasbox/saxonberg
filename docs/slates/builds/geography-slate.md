# Geography slate — one geographic frame for land and sea, carried by Localities

**Status:** slated 2026-11-14, from the navigation pane's horizon section
([map-slate § The whole card](./map-slate.md)); the owner: *"this sounds
better than what we have now."* **Size:** a build — server-led, with
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

## What it buys beyond the horizon

- The illustrated maps' **"you are here"** gets a real position for every
  Locality ([map-slate § The illustrated map](./map-slate.md)).
- The atlas's large chart shows **land and sea together**
  ([atlas-slate](./atlas-slate.md)).
- **Latitude has one honest home** — zones carry `latitude` today for
  climate; it can come from (or move to) the Locality's anchor.

## Open

1. **Point or footprint** — a Locality anchor as a point, a point with a
   radius, or a rough outline. Lean: **a point with a radius** — enough for
   a horizon's range and for *"you are here"*, cheap to author; an outline
   waits for a need.
2. **Elevation** — the owner: elevation is a setting fact, determined by
   biome and place. Whether the Locality anchor carries a ground elevation,
   and how it relates to zone `elevation` today
   ([navigation-server-slate § S13](./navigation-server-slate.md)).
3. **Latitude's move** — derive the climate's latitude from the anchor, or
   keep zones' `latitude` as an override.
4. **Content** — anchors for the 24 shipped Localities and points for the
   landmark structures; the test-fixture Localities (narnia, north, south,
   pair, circle, moor) may need none.
5. **The candidate set** — which things are sightable at all (landmark
   structures, craft, named features), and the spatial query that finds
   them within range without a scan.

## Cross-references

- [expanse.md](../../subsystems/expanse.md) · [address.md](../../subsystems/address.md) ·
  [perceiver.md § Beyond the room](../../subsystems/perceiver.md) ·
  [construction.md](../../subsystems/construction.md) (structures, height,
  landmark) · [weather.md](../../subsystems/weather.md) (latitude)
- [map-slate](./map-slate.md) · [navigation-server-slate](./navigation-server-slate.md) ·
  [atlas-slate](./atlas-slate.md)
