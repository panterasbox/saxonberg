# Map / spatial-visualization slate (working doc)

> **Status: UNBUILT — design resolved 2026-10-01, ⛔ BLOCKED on
> [location-graph-slate](../tails/location-graph-slate.md).** The renderer has
> nothing to read until the index exists; once it does, **this is 100% a
> client build.**
> ⭐⭐⭐ **Resolved: SVG for 2D, not canvas and not the box model** — the
> `viewBox` is the lattice and the camera. three.js for 3D, **lazy-loaded**.
> ⭐⭐⭐ **And it is a ZONE NAVIGATION card, not a map card** — the grid, a
> **compass rose** (an input surface, and the refusal doctrine rendered), a
> **named list for interzone exits** (the same widget as the departures
> board), and a **zone honest-state panel**.
> ⭐⭐ **And it needs an ICON SET it does not have** — the up/down corner
> glyphs and the compass rose are the first real consumers, and the client
> has no icon library at all (2026-10-01: two non-test files contain inline
> SVG). See [iconography-slate](./iconography-slate.md), whose
> direction/elevation tier exists for this card.
> **Left:** the SVG grid + up/down corner glyphs + the pinned card · the
> **compass rose** and its state vocabulary · the **interzone list** · the
> **zone metadata panel** · ⭐ **the annotation surface (pins, markup,
> notes) — which is the actual feature** · the three-tier provenance render
> + the conflict badge · the 2D node-graph for zone level · the
> stacked-floor isometric · the 3D mode behind `React.lazy` ·
> `SphericalZone.canPlace` non-overlap
> **Size:** a build — and ⭐ the annotation half is the half that matters

Working slate for **the map** — how the world's spatial structure gets
*shown*. The engine already models space honestly (a `CartesianZone` is a
3D integer grid with real `cellSize`; rooms carry `(x,y,z)`; exits connect
them), so visualization is **rendering existing data**, not authoring new
art. One renderer, several modes, three consumers.

The load-bearing decisions:

1. **One renderer, many modes, one dataset.** Grid (Cartesian, per-floor),
   node-graph (Spherical/semantic), 3D box-render (Cartesian), and a
   player-centered minimap — all generated from the same coordinate data
   (`coords` / `cellSize`, focus+radius, exits). Not separate tools; render
   modes over one model.

2. **Procedural from data, not 3D modeling.** Geometry is *generated* from
   coordinates — a box per room at `(x,y,z) × cellSize`, openings where
   exits connect adjacent cells. **No artist meshes, no rigging, no Blender.**
   2D = SVG/canvas (+ a graph-layout lib); 3D = **three.js / react-three-
   fiber** (+ `InstancedMesh` for scale). The skill is "procedural scene
   from data," the easy end of web 3D.

3. **Layered presentation for space (on-thesis).** The map is the spatial
   analog of "instruments reveal the physics" ([design-philosophy.md](../../design-philosophy.md)
   Principle 3): the honest spatial model made visible. A 3D flythrough is
   *proof the coordinates are real* — which is why it carries genuine **demo
   value** for an honest-model platform, not just polish.

4. **Three consumers, one component.** The **game** (a player minimap +
   spatial companion to the text), the **CMS zone editor** (its 2D edit
   canvas + 3D view), and **demo/marketing** (the flythrough). Build once,
   consume thrice.

5. **2D for editing, 3D for viewing.** Precise placement/connection is a 2D
   job (the zone editor's edit mode); 3D is for *navigating / viewing /
   demoing* (immersive). Same data, two modes — 3D doesn't replace the 2D
   editor. (3D *editing* is far-future, if ever.)

See also:

- [docs/slates/cms-slate.md](../builds/cms-slate.md) — the **zone editor** consumes
  this as its canvas (2D edit) and view (3D); the room↔zone "two zooms on
  one dataset" framing.
- [docs/subsystems/spatial.md](../../subsystems/spatial.md) /
  [zone.md](../../subsystems/zone.md) — the **coordinate data** rendered:
  `CartesianZone` (grid, `cellSize` in meters), `SphericalZone` (focus +
  radius, semantic exits), `coords`. (Exits are **explicit-only** as of the
  Terminus build — the former `deriveExit` grid-derivation was removed; the map
  reads the authored exits.) The map visualizes this; it doesn't define it.
- [docs/standard-model.md](../../standard-model.md) /
  [design-philosophy.md](../../design-philosophy.md) — the **honest spatial
  model** the map renders, and **layered presentation** (prose / physics /
  *now space*, same model, different paths).
- [docs/slates/client-cockpit-slate.md](../tails/client-cockpit-slate.md) — the
  game **minimap is a cockpit panel**; the map is a component it hosts.
- [docs/slates/senses-slate.md](senses-slate.md) /
  [fast-travel-slate.md](../tails/fast-travel-slate.md) — **discovery / fog-of-war**
  for the game minimap (show only what the player has perceived/discovered);
  wayfinding.
- [docs/slates/access-slate.md](../tails/access-slate.md) — the data arrives
  over the CMS transport. ⚠ The *"through the draft overlay"* this line used
  to claim is **unbuilt and deferred** (`cms.md` § Deferral boundary).

---

## Principle

1. **One renderer, many modes, one dataset.**
2. **Procedural from honest data** — generate geometry from coordinates; no
   art pipeline.
3. **Layered presentation for space** — the honest model made visible;
   on-thesis + demo value.
4. **Three consumers** (game / editor / demo), one component.
5. **2D edits, 3D views** — and neither is a v1 blocker.

---

## The model

### Modes (all from the coordinate data)

- **2D grid (per-floor)** — `CartesianZone`: a graph-paper grid of
  room-cells per z-level, exits as connectors, vertical-exit (up/down)
  indicators, page-by-floor. The zone editor's **edit canvas** and the basis
  of the player minimap.
- **2D node-graph** — `SphericalZone` / semantic / cross-zone connectivity:
  rooms as nodes, semantic exits as labeled edges, auto-laid-out
  (dagre / elk / d3-force) or hand-positioned.
- **3D procedural render** — `CartesianZone`: boxes at `(x,y,z) × cellSize`,
  sized by cell, openings/corridors for exits, colored by biome/type, orbit
  or fly camera. three.js / react-three-fiber + `InstancedMesh`. (Spherical
  → a 3D force-graph; less architectural, optional.)
- **2D minimap** — a player-centered slice of the grid (nearby rooms), the
  in-game HUD companion to the prose.

### Data sources, one renderer

⚠⚠ **Corrected 2026-10-01 — this said TWO sources and both were wrong in
part.** See [location-graph-slate](../tails/location-graph-slate.md).

- ⛔⛔ **There is no draft overlay.** `cms.md`'s deferral boundary:
  *"Drafts / staging / changeset overlay + atomic publish → later (depends
  on the versioning/changeset model)."* The CMS "draft" is an editor-local
  dirty buffer — *"a save adopts the draft as the new persisted
  baseline"* — so a save writes through to the real template. The editor
  adapter reads **live templates**, or waits on the changeset model.
- ⛔⛔ **Live Stuff cannot answer a whole-world map.** Everything is
  lazy-loaded, so runtime state is only *what players have visited and
  what has not been reaped.* Good enough for a player-centred minimap;
  useless for a zone view, a route, or a publish gate.

**So there are three sources, and the third is the one that makes the
whole-world modes possible:**

- **Editor / authoring** — **templates**, read live (no overlay exists).
- **Game minimap** — **live Stuff**, player-centred, discovery-filtered.
- ⭐⭐⭐ **Everything else** — the **persisted location-graph index**: a
  derived projection of every location and its exits, keyed on
  `getIdentityPath()`, indexed by zone and by reverse edge, with a
  `PlatPlan` expansion for the elastic half. This is what a zone view, a
  route, a reachability check and the offline boundary read. See
  [location-graph-slate](../tails/location-graph-slate.md).

What the renderer draws differs by source; how it draws is one component.

### Three consumers

- **Game** — the player minimap (2D, player-centered, discovery-filtered) and
  (later) a 3D spatial view of surroundings beside the text.
- **CMS zone editor** — the 2D **edit canvas** (place/connect rooms) and the
  3D **view** (navigate the zone as built). (Editing logic is the editor's;
  the map is the render surface.)
- **Demo / marketing** — the 3D **flythrough** of a campus/zone: the visible
  proof that the spatial model is real.

### What's easy vs. hard (the honest cost curve)

- **2D** — easy (SVG/canvas + a graph-layout lib).
- **3D functional** — moderate (procedural boxes from data; r3f;
  `InstancedMesh` solves most of the scale problem).
- **3D demo-quality** — real iteration (lighting, materials, ambient
  occlusion; not programmer-art). This is where the demo value lives, so the
  *pretty* pass is genuine work distinct from the *functional* one.
- **Spherical 3D** — a force-graph, not architecture; may stay 2D-only.
- **3D editing** — fiddly; deferred (2D edits, 3D views).
- **Scale** — `InstancedMesh` / LOD for large zones.

### Spatial validity — surfaced here, owned by the spatial model

The map *surfaces* spatial invariants; it doesn't *own* them. The key one
for Spherical zones: **rooms must not overlap.** Cartesian gets this free
(unique integer coords can't collide); Spherical needs geometry — for every
pair, `distance(center₁, center₂) ≥ r₁ + r₂` (focus + radius, so position
*and* size matter).

- **Owned by the spatial subsystem.** This is a **`SpatialZone`
  placement-validity** invariant — a polymorphic `canPlace` (Cartesian: cell
  free; Spherical: no sphere collision), enforced at the placement
  chokepoint, the geometric sibling of Cartesian's unique-coords and the
  cardinal-only-intra-zone exit invariant. **`SphericalZone` owes a
  non-overlap check** (not yet built); the map *consumes* it.
- **Two distinct checks — Spherical splits what Cartesian fuses.**
  **Overlap** is *geometry* (volumes collide); **reachability** is the *exit
  graph* (every room connected — semantic exits, position-independent).
  Cartesian conflates them (contiguous coords → adjacency → reachable);
  Spherical needs both, separately.
- **The map surfaces both.** Live overlap-prevention on place / move /
  resize; the publish-gate rejects an overlapping (or unreachable) set; and
  the **3D view makes overlaps *visible*** — the render is **diagnostic**,
  not just pretty (you see two spheres intersecting and fix it). Cost is
  O(n) per placement (O(1) with a spatial index for huge zones).

---

## ⭐⭐⭐ The rendering decision — SVG for 2D, and why CSS failed

**Resolved 2026-10-01.** An attempt to build this with CSS *"failed to give
something that rendered nicely with the rules it could engineer"*, and the
cause is structural rather than a skill gap:

> ⛔ **A map is absolute positions on a lattice with arbitrary connectors.
> The box model is for flow layout.** Doing it with `div`s means
> absolute-positioning everything anyway — all of CSS's pain, none of a
> vector surface's benefits.
>
> ⭐⭐⭐ **SVG's `viewBox` *is* a lattice coordinate system.** Declare the
> view in **cell units**, draw at room coordinates, and the browser does
> every pixel.

```svg
<svg viewBox="-1 -1 9 7" preserveAspectRatio="xMidYMid meet">
  <g class="edges"><line x1="0" y1="0" x2="1" y2="0"/>…</g>
  <g class="rooms"><rect x="-.4" y="-.4" width=".8" height=".8" rx=".12"/>…</g>
  <g class="here"><circle r=".18"/></g>
</svg>
```

Rooms at `0.8` with a `0.2` gutter so connectors read; `<line>` between
cell centres; **8-way diagonals free.** Resizing the card is one attribute.

### Four reasons SVG beats canvas here — and the last is near-disqualifying

1. The scene is tiny: a zone view is **tens of cells**, not thousands.
2. ⭐ **Hit testing is free** — a room is a `<rect>` with an `onClick`.
   Canvas needs hand-rolled hit detection.
3. ⭐ **CSS styles it**, so it plugs into the existing theme/overlay cascade
   ([message-rendering.md](../../subsystems/message-rendering.md)).
4. ⭐⭐⭐ **Every room is a real DOM node.** `<title>` gives a tooltip *and*
   a screen-reader label. **Canvas is invisible to assistive tech — in a
   text game.**

### ⭐⭐⭐ And SVG is what makes *our* map possible, not just prettier

Everything the location-graph slate designed — **provenance on every
line** — is a *styling* problem, and SVG is a styling surface:

| the claim | render | mechanism |
|---|---|---|
| recorded 40 days ago | **fades** | `opacity` bound to age |
| recorded by **echo**, not sight | **dashed outline** | `stroke-dasharray` |
| *"searched here, nothing found"* | a distinct glyph | `<use>` of a symbol |
| ⭐⭐⭐ **two sources disagree** | **both, badged** | two `<rect>`s + a marker |
| somebody else's survey | a different hue | a CSS class per source |

One class and one attribute per element. In canvas it is a redraw function
somebody maintains by hand.

### Pan and zoom

> **The `viewBox` is the camera.** Zoom = change `w`/`h`; pan = change
> `minX`/`minY`. No projection matrix.

⭐⭐ And **better than a camera for us because it is serializable**:
`{minX, minY, w, h}` lives in the store, survives a reload, goes in a URL.
A three.js camera is a position + quaternion + fov to marshal by hand.

⚠ **Gotcha worth knowing before it looks like a bug:** scaling the viewBox
scales **stroke widths**, so zooming 4× fattens every connector 4×. Fix is
one attribute — `vector-effect="non-scaling-stroke"`.

### Libraries and the bundle budget

```
2D grid        NOTHING — viewBox + rects + lines
pan/zoom       d3-zoom  (~3KB)   wheel+pinch+drag+double-tap is where the day goes
node-graph     dagre    (~50KB)  elkjs is better and 500KB+; not worth it under ~100 nodes
3D             three + @react-three/fiber (+drei)   ≈ 600KB gzipped
```

⚠⚠ **three.js is larger than the entire current client** (React, zustand,
styled-components, Monaco aside). **3D must be `React.lazy`'d behind the
mode switch** so a 2D user never downloads it. A hard requirement, not a
nicety.

## ⭐⭐⭐ How deep the map goes — the grid bottoms out at the ROOM

What is "inside" a location? **Relations, not coordinates.**
[spatial.md](../../subsystems/spatial.md) models **Placement** — `on` ·
`in` · `from`, a row-extensible vocabulary — plus details, adornments and
slots. **There is no `(x,y)` inside a room.**

> ⛔ **So rendering a room's interior as a grid would be *inventing*
> spatial truth** — which breaks this slate's own Principle 2 (*procedural
> from honest data; no art pipeline*). We would be making up a floor plan.

And the drill-in already exists: `card-surface.md` ships **ONE inspection
card laid out by `StuffKind`.**

> ⭐⭐⭐ **Click a room → push its inspection card.** The map is a
> **navigator for the card surface**, not a deeper viewport.
>
> **The map is spatial down to the room; the card is relational below it** —
> two representations meeting at the room boundary, each honest about what
> it models, and both halves already built.

⭐ Per the standing client rule that **clickables preview their command**, a room click should **preview the
command** it will run (`look <room>`, or `go north` when adjacent) — so the
map is an affordance surface over the command line rather than a parallel
UI.

## ⭐⭐⭐ Zone level — a node graph, not a grid, and misclosure lives here

`CartesianZone` carries `cellSize` and a `grid` and **no origin, no offset,
and no position relative to any other zone.** Every zone is its own frame
from its own `(0,0,0)`, and `cellSize` varies per zone.

> ⛔ **So zones cannot be placed on a lattice.** Two touching zones share a
> **direction** on their crossing edge and nothing else — and with differing
> `cellSize`, composed directions are steps of different lengths.

So the zone view **is** the node-graph mode: `{crossesZone: true}` (the
level-1 skeleton from
[location-graph-slate § 3](../tails/location-graph-slate.md)) laid out by dagre,
with crossing directions as edge labels.

⭐⭐⭐ **But a global frame could be *derived* by composing cross-zone edges —
and that is dead reckoning at the zone level.** Across independently
authored frames, with different scales, and no survey:

> **Two routes between the same pair of zones can imply contradictory
> relative positions.** With no shared origin that is not a bug, it is
> *guaranteed* — and resolving it is a **surveyor's** job, which is where
> the discipline finally has something real to do.

⭐⭐ **And it is a lint.** North from A to B, north from B to C, and C has a
south exit back to A → the realm's geometry is inconsistent. Nothing checks
that today and it is computable from the index.

## ⭐⭐ The provenance UI — clean by default, provenance on demand

Rooms the player knows **but has not visited** must render (bought surveys,
told directions), or the map market has no interface. Three tiers:

| | render |
|---|---|
| **visited by me** | solid fill |
| ⭐ **known from a source** | **outline only, no fill** — *I know it is there; I have not been* |
| **unknown** | absent |

And then:

- **hover / focus** → `<title>` plus a detail strip: *"recorded 40 days ago
  · Faradhi · by sight · awareness 5"*
- ⭐⭐⭐ **a provenance overlay toggle** → the whole map recolours by age or
  by source. **Provenance is one of the overlays, not permanent clutter.**
- ⚠ **Conflicts are always on.** A badge on the cell — because **a stale
  claim is information and a contradiction is a hazard**, and those deserve
  different treatment.

## ⭐⭐⭐ Annotation is in scope — and it is the product

Two kinds of editing, and they separate cleanly:

| | |
|---|---|
| ⭐⭐⭐ **editing YOUR map** — pins, markup, notes | **in scope** |
| **the map as an authoring tool** for rooms and content (the CMS zone builder) | **deferred** |

> ⭐⭐⭐ **Which makes this a bigger build than "a minimap."**
> [location-graph-slate § 17](../tails/location-graph-slate.md) concludes that a
> map's value is its **annotations**, not its geometry — so **the client is
> where the tradeable good actually gets made.** The renderer is
> infrastructure; the annotation surface is the feature.

## ⭐⭐⭐ It is a ZONE NAVIGATION card, not a map card

The reframe that scopes the whole thing: this is **an input surface**, not a
map viewer. Four things in one card, and only the first is the map.

### 1. The grid — with up/down as a corner glyph

⭐ **Decided: vertical exits are a corner glyph per cell** (`▲` / `▼` / both).
Cheap in SVG (a `<use>` of a symbol), unambiguous, and it does not look
provisional while the stacked-floor isometric waits for wave 3.

### 2. ⭐⭐⭐ A compass rose — and it is the refusal doctrine rendered

The map answers *"where am I in this zone."* **The rose answers *"what can
I do from here"*** — a different question, and the one a text player
currently has to re-read a paragraph or type `exits` to get.

Eight cardinals plus up and down, each in a **state**, and the state
vocabulary is the point:

| state | reads |
|---|---|
| **available** | lit, clickable |
| **a closed door** | lit, marked — the wire already carries `open` |
| ⭐ **locked / blocked** | **present and refused** |
| ⭐ **refused by covenant** | present, refused, **with the reason** |
| ⭐ **TPA, not registered** | present, refused, *"not yet registered"* |
| **concealed & undiscovered** | ⛔ **absent** — see below |

> ⭐ **Decided: marker inline, reason on focus.** Every arm carries its
> **state marker always**, so *refused* is never mistaken for *absent* —
> that distinction is the whole value of the rose and it cannot be behind a
> hover. The **sentence** (*"the gate is for the gown"* · *"nothing later
> than medieval"* · *"not yet registered"*) arrives **on focus**, which
> keeps ten arms readable and is reachable by keyboard rather than
> mouse-only.

> ⭐⭐⭐ **A rose that renders *locked* differently from *no exit* IS the
> standing rule — the refusal is the progression UI.** *"If something lifts
> it, the verb must EXIST so you can be told."* This is that rule as
> pixels, and it is the same instinct as a ghost visibly losing verbs
> rather than getting *"that command doesn't exist."*

⭐ And per the clickables rule, each arm **previews the command it will
run** (`go north`, `teleport <keyword>`), so the rose is an affordance over
the command line rather than a parallel input path.

### 3. ⭐⭐⭐ Interzone exits need a LIST, not a rose

Because **they leave the map.** The grid cannot show where you are going —
the destination is in another coordinate frame with no shared origin
(see the zone-level section above). So a cardinal arm is the wrong
affordance even when the exit *is* cardinal.

> ⭐⭐⭐ **Ways out, named, with their destinations — which is the same widget
> as the TPA departures board.** One component: *"from here you can reach…"*
> with a fare and a timetable where the edge is a TPA route and neither
> where it is a road. **The interzone affordance and the departures board
> are one thing**, and `renderDepartures` already shapes it.

### 4. ⭐⭐⭐ Zone metadata — the honest-state panel

What rules apply *here*:

- the **locality / zone name** and the address
- **biome, weather, light, time of day**
- ⭐⭐⭐ **the epoch ceiling** — *what may I use here*
- ⭐ **coverage** — surveyed / partial / unmapped
- **who holds title** (the parcel)
- ⚠ **published state**, for an author

> ⭐⭐⭐ **This is the other half of a problem the content-declaration slate
> left open.** It concluded that *"variable enforcement needs the terms
> visible to players, or two adjacent localities have different rules and no
> way to tell"* — and answered it with EotL's **sign at the gate**, which is
> diegetic and in-fiction. **The zone card is the honest-state half**, and
> both should exist: the plaque is how you meet the rule, the panel is how
> you check it.
>
> And it is on-thesis rather than a concession — lens 62, *transparency is
> the absence of opacity*, and `client-shell.md` already ships **the
> honest-state primitives.**

### ⭐⭐ What is already on the wire, and what is not

The client **already receives** `exits: StuffExitRecord[]` —
`{ direction, door?: { stuffId, displayName, open, primaryKeyword } }` —
documented as *"**Obvious** exits for Exitable hosts: what `look` would
surface."*

> ⭐⭐⭐ **So the rose's geometry is free today, and it is already
> perception-gated** — a concealed exit is not in the list, so the rose
> inherits the x-ray guard
> ([location-graph-slate § 8](../tails/location-graph-slate.md)) **without anyone
> adding a check.**

⚠ **What the state vocabulary needs added:** the destination (so an arm can
be labelled), `blocked` / locked / covenant-refused as distinct from
*absent*, and whether an exit **crosses a zone** (so it routes to the list
rather than the rose). All of it reads off the index.

## The card integration is already decided by doctrine

`card-surface.md` has four body sources, and the minimap is a **`client`**
body: *"the body is the client's own transport (Monaco, the git panel, the
Studio catalogue). The **server** still owns the card's existence,
identity, lifetime and pinned-ness; only the body is the client's."*

> **`map` · source `client` · `pinned: ✓` · `noProse`** — exactly like
> `cms`.

⚠ And it must be **pushed by a command** (`map`), because *the wire cannot
name a card*: there is **one birth path**, and a missing push once went
undetected for a whole build with five green tests over it.

**Data contract** — cheaper than expected:

- entering a new locality → **one read** of that locality's slice of *your*
  map document
- moving within it → **the move frame already says where you are.** No new
  transport
- your map growing → a small delta

## Open questions

1. ~~**Game minimap discovery model**~~ ⭐⭐⭐ **ANSWERED** — three tiers, not
   two: **visited by me** (solid) · **known from a source** (outline only) ·
   **unknown** (absent). Rooms you know but have not been *must* render, or
   the map market has no interface. Provenance detail is an **overlay**;
   conflicts are **always on**.
2. **2D node-graph layout** — auto (force/dagre/elk) vs hand-positioned vs
   hybrid (auto + manual nudge).
3. **Spherical 3D** — worth a 3D force-graph, or 3D is Cartesian-only and
   Spherical stays 2D?
4. ~~**Data-source adapter**~~ ⭐⭐ **ANSWERED** — three sources, and the one
   this build reads is **the player's map document** via the location-graph
   index. One read per locality transition; position comes from the existing
   move frame; growth is a delta. ⚠ The editor adapter stays blocked on the
   absent draft overlay.
5. **3D polish budget / timing** — when demo-quality matters (an investor
   demo?) vs the functional render.
6. ~~**Elastic graphs**~~ ⭐⭐⭐ **ANSWERED 2026-10-01** — and the lean was
   half wrong. Warrens split in two: a **planned** warren's topology is
   *authored and persisted* in `PlatPlan` (roads, segments, `heading`,
   frontages, stable slot ids, and `routeOf()` already implemented), so it
   **renders without minting a single room**. Only an **occupancy** warren
   — the lounge's satellites, which exist because somebody is standing in
   them — is genuinely shapeless, and there the honest render is *"a space
   through this door, shape unknown."* See
   [location-graph-slate § 4](../tails/location-graph-slate.md).
7. **3D editing, ever?** — or permanently 2D-edit / 3D-view. *Lean: never.*
8. ~~**Up/down in the 2D grid**~~ ⭐ **DECIDED** — a **corner glyph per
   cell** (`▲`/`▼`/both). The stacked isometric still lands in wave 3 as the
   richer view, but the glyph is the wave-1 answer and it is not
   provisional.
10. ~~**Does the rose show a refusal's reason inline or on hover?**~~
   ⭐ **DECIDED — marker inline, reason on focus.** The arm carries a state
   marker always (so *refused* is never mistaken for *absent*); the sentence
   arrives on focus. Keeps ten arms legible and keeps the refusal
   un-hideable.
9. ⭐ **Does the zone-level graph expose the composition inconsistency to
   players, or only to the lint?** A realm whose zones cannot be laid out
   consistently is a genuine fact about the world; showing it is either
   fascinating or alarming.

---

## Build order

⛔ **Wave 0 — not this build.** The
[location-graph index](../tails/location-graph-slate.md) has to exist. There is
nothing to render until it does, and the data contract above is its API.

**Wave 1 — the zone navigation card.** `viewBox` in cell units, rects +
lines, **up/down corner glyphs**, `d3-zoom` for pan/zoom, pushed by a
command as a `client` body. Locality-scoped. Plus the **compass rose** —
whose geometry is free off the existing `exits` wire record — the
**interzone list**, and the **zone metadata panel.** The three provenance
tiers and the conflict badge land here too, because they are *render
classes* rather than features.

⭐ **The rose is worth shipping even before the index exists**, since
`StuffExitRecord` already carries direction + door state and is already
perception-gated. It is the one part of this card that is **not blocked on
wave 0.**

⭐⭐⭐ **Wave 2 — annotation. The feature.** Pins, markup, notes, written
into the player's map document. This is what makes a map a tradeable good
rather than a HUD, and everything in the market design depends on it.

**Wave 3 — the zone-level node graph.** dagre over `{crossesZone: true}`,
crossing directions as edge labels. ⭐ Plus the **stacked-floor isometric**,
which is one transform and gets most of "see the whole z-axis" for free.

**Wave 4 — 3D, behind `React.lazy`.** The unified z-axis, **spherical zones
(the only honest way to show focus+radius)**, and the marketing flythrough.
⭐ Utility is explicitly not the goal here; the polish pass is its own
distinct work.

**Deferred, with reasons:**

- ⭐ **A browsable whole-realm map.** Shape unknown — *"I don't really know
  how shallow or deep and how balanced that tree is going to end up
  being."* **Designing a realm navigator now would be designing for a guess
  about a tree nobody has grown.** It wants a full-window route rather than
  a card, and so does 3D; both wait for content to tell us what they need.
- **The CMS zone-building tool** (the map as a *content authoring* surface,
  editable rather than viewable). ⚠ Also still half-blocked: there is **no
  draft overlay** (see above).
- **3D editing.** Permanently 2D-edit / 3D-view unless something changes.

⚠ **For the plan, not this slate:** annotation transport needs an
**optimization pass** — each pin is a document write, and a map-edit session
must not be fifty REST calls. Batch-and-flush is the obvious shape; the
consistency cost is a planning decision.

## What this slate does NOT cover

- **Zone/room *editing logic*** → [cms-slate.md](../builds/cms-slate.md). The map is
  the render surface + canvas; the editing rules are the editor's.
- **The spatial model itself** (coordinates, zones, explicit exits,
  `cellSize`, and the **placement-validity invariants** — Cartesian
  unique-coords, the owed `SphericalZone` non-overlap check) →
  [spatial.md](../../subsystems/spatial.md) / [zone.md](../../subsystems/zone.md).
  The map *surfaces* these; the spatial model *owns* them.
- **The cockpit / HUD layout** → [client-cockpit-slate.md](../tails/client-cockpit-slate.md).
  The minimap is a panel it hosts.
- **3D asset/model pipelines** — there are none; geometry is procedural.
- **The discovery/exploration system** → senses/fast-travel; the minimap
  *consumes* discovery state, doesn't define it.

---

## Once shaped into formal requirements

This slate boils down to:

- **One renderer, many modes** (2D grid / 2D node-graph / 3D box-render /
  minimap), all **procedural from the coordinate data** — no art pipeline.
- ⚠ **Three data-source adapters** — live templates (editor; **there is no
  draft overlay** — see above), live-Stuff-discovery-filtered (game
  minimap), and the **persisted location-graph index**
  ([location-graph-slate](../tails/location-graph-slate.md)) for every whole-world
  mode — one renderer.
- **Three consumers** — game minimap/spatial-view, zone-editor canvas/view,
  demo flythrough.
- **2D edits, 3D views**; **layered presentation for space** (the honest
  model made visible; demo value); **not a v1 blocker** (list/connectivity
  fallback meanwhile).
- The toolkit (SVG/canvas + graph-layout lib for 2D; three.js / r3f +
  `InstancedMesh` for 3D) and the cost curve (2D easy → 3D functional
  moderate → 3D demo-quality real).
- ⭐ **Reachability becomes computable** — the check this slate owes for
  Spherical zones is a graph question, and the location-graph index is what
  can answer it as a lint rather than at render time.
- **Spatial validity is surfaced, not owned**: the map prevents/flags
  overlapping or unreachable placement (the 3D view makes overlaps visible),
  but the invariant — Cartesian unique-coords + the **owed `SphericalZone`
  non-overlap check** (`distance ≥ r₁+r₂`) via `SpatialZone.canPlace` — lives
  in the spatial model. Overlap (geometry) and reachability (exit graph) are
  distinct checks; Spherical needs both.
- Tests: a Cartesian zone renders as a per-floor grid with exits as
  connectors; the same zone renders in 3D as boxes at `coords × cellSize`
  with exit openings; the game minimap shows only discovered rooms; the
  editor canvas reflects the draft overlay; a Spherical zone renders as a 2D
  node-graph; placing overlapping spheres is prevented/flagged.

3D demo-quality polish, Spherical 3D, and 3D editing wait for their own
waves.

---

## ⭐ Unblocked (2026-10-05) — the location-graph build shipped

The data this renderer needs now exists, and the dependency correction
this slate recorded turned out to be the right one: **a map is a
document, not a view over the graph.**

- `/home/<key>/map/<locality address>`, kind `map`, one document per
  `(player, finest covering locality)`. The address keeps its slashes,
  so a coarser read is a **prefix read with no join**.
- A claim carries its own `channel` (`perception` · `publication` ·
  `told` · `bought`), `band`, `firstSeen` and `lastSeen` — **not one
  date per document**.
- `NavigationApi.readMap(viewerKey, prefix)` is the read, and it
  resolves under the actor's own home and nowhere else.

⚠ **What is still this slate's.** `map` renders **MML to self and opens
no card**, deliberately: the inspection card is laid out by `StuffKind`
and a map is not a Stuff, so a `CardId` for it is a card-surface
decision rather than a line in a perception build. The two renderings
worth designing here are **the card** and **the picture** — and the
second has a real question in it, because a claim graph with holes is
not a thing a renderer can lay out without deciding what a hole looks
like.

⭐ And the rot is load-bearing for the renderer: where two claims about
one `(place, dir)` disagree, BOTH must render with their dates, and a
claim older than the latest look at its place must read as *not seen
when you last looked*. A renderer that tidied either away would undo
the knowledge model. See
[location-graph.md](../../subsystems/location-graph.md).
