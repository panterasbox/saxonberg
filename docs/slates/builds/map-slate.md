# Map / spatial-visualization slate (working doc)

> **Status: UNBUILT** — no renderer exists on either data source
> **Left:** the 2D per-floor grid + the player minimap · the 2D
> node-graph · the 3D procedural box render · the draft-template and
> live-Stuff adapters · `SphericalZone.canPlace` non-overlap
> **Size:** a build

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
part.** See [location-graph-slate](./location-graph-slate.md).

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
  [location-graph-slate](./location-graph-slate.md).

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

## Open questions

1. **Game minimap discovery model** — fog-of-war (discovered rooms only) vs
   full; ties to senses/exploration. *Lean: discovery-filtered.*
2. **2D node-graph layout** — auto (force/dagre/elk) vs hand-positioned vs
   hybrid (auto + manual nudge).
3. **Spherical 3D** — worth a 3D force-graph, or 3D is Cartesian-only and
   Spherical stays 2D?
4. **Data-source adapter** — one renderer with template-adapter (editor,
   draft-aware) + live-Stuff-adapter (game, discovery-filtered); confirm the
   seam.
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
   [location-graph-slate § 4](./location-graph-slate.md).
7. **3D editing, ever?** — or permanently 2D-edit / 3D-view.

---

## Build order

**Wave 1 — the 2D renderer.** The per-floor **grid** + the player
**minimap**, from coordinate data; the zone editor's edit canvas and the
game minimap panel. (The functional, foundational 2D — what unblocks the
zone editor's visual mode.)

**Wave 2 — the 2D node-graph.** Spherical/semantic zones + cross-zone
connectivity views; the layout algorithm.

**Wave 3 — the 3D procedural render.** Boxes-from-coordinates (three.js /
r3f, instanced) — the view/navigate/demo mode; then the **polish pass** for
demo-quality (lighting/materials).

**Far future.** 3D editing; fancy isometric/stylized views; Spherical 3D.

---

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
  ([location-graph-slate](./location-graph-slate.md)) for every whole-world
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
