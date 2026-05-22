# Zone architecture slate (working doc)

Working slate for the zone-architecture rethink — what zones are
actually for, how they relate to spatial coordinate systems, how
template-tree ancestry expresses inheritance, how zone assignment
is derived from templatepath, how the cardinal-only-intra-zone
exit invariant constrains structure, and what authoring patterns
we recommend for content teams.

**Status**: design substantially converged. The Edifice /
containment-nesting alternative was considered and rejected in
favor of flat-siblings. Zone derivation rule (templatepath-
derived, nearest SpatialZone ancestor wins, FolderZones skipped)
articulated and ratified. Authoring guidelines drafted. Remaining
open questions are smaller: generic-FolderZone naming, resource-
boundary semantics (deferred to its own slate), granularity
calibration at first content build.

See also:

- [docs/subsystems/spatial.md](../subsystems/spatial.md) — existing
  zone substrate: `Zone` / `SpatialZone` / `CartesianZone` /
  `SphericalZone` / `Clade` / `HomeZone`. This slate's
  resolutions land here once shipped.
- [docs/subsystems/templates.md](../subsystems/templates.md) —
  folder/leaf invariant; the template tree this slate operates
  within.
- [docs/slates/biome-slate.md](./biome-slate.md) — `Biorealm` is
  one of today's folder-zone classes; biome inheritance walks
  template ancestry, which is the same chain mechanism this slate
  generalizes for zones.
- [docs/slates/world-clock-slate.md](./world-clock-slate.md) —
  celestial profile lives on the SpatialZone and inherits via the
  walk described here.

---

## The four jobs of Zone

Today's `Zone` quietly does four jobs at once:

1. **Template-tree node** — namespace, inheritance anchor, scope
   for config (celestial profile, gravity, biome family).
2. **Coordinate frame** — Cartesian grid or Spherical focus
   system, with its own topology and `deriveExit` strategy.
3. **Resource boundary** — runtime caps, reset cadence, perception
   scope cutoffs, mob population limits (mostly aspirational
   today).
4. **Authoring unit** — what one content author owns / works on at
   a time.

These don't all naturally want the same granularity. Worth naming
explicitly so future design decisions can choose which of the four
they're optimizing for.

In particular: the **coordinate-frame** role wants smaller, hand-
authored regions (a building interior, a forest area, a dungeon
level). The **template-tree** role wants ancestry that mirrors
*organizational* nesting (campus has biology-building has
classroom-101) regardless of where each spatial zone actually
sits.

### The split we chose: soft, via subclasses

Organizational and spatial concerns both live on Zone, but are
distinguished by **subclass**:

- **FolderZone-shaped classes** (today: `Clade`, `Biorealm`,
  `HomeZone`; future: a generic one) — organizational, no
  coordinate frame, no rooms. Their job is to anchor inheritance
  and to satisfy the folder/leaf invariant.
- **SpatialZone subclasses** (today: `CartesianZone`,
  `SphericalZone`) — coordinate frame, owns rooms, defines
  topology.

Both live on one templatePath tree. This is a **soft split**.

### Hard split alternative (considered, rejected)

We considered a hard split: make organizational structure and
spatial structure two genuinely separate substrates. A `Realm`
substrate (inheritance/namespace, no coordinate frame) and `Zone`
purely as a coordinate frame that *references* a Realm for its
inheritance chain. Two trees, related but separate.

Rejected because template-path ancestry already handles inheritance
well and Zone subclasses already differentiate folder-vs-spatial.
The hard split adds substrate complexity without solving a real
problem.

---

## The spatial-structure model: flat siblings

The **Edifice** proposal (a stationary container-with-interior,
shaped like `Vessel` but specifically for buildings / dungeons /
caves that don't get relocated) was considered and rejected.

**The chosen model: flat siblings + Vessel kept narrowly for
containers-with-interiors.**

- Every coherent coordinate region is its own Zone, period.
  Wilderness, building interior, dungeon level — sibling zones
  at the same conceptual level.
- "Going into a building" is just an exit traversal with the label
  `in` (or `enter`, etc.). No containment relationship between
  zones. The building's interior is NOT inside the wilderness in
  any data sense — they're connected by a doorway.
- `Vessel` stays exactly as today — for the case where a
  container is itself Containable, i.e., the container has an
  interior AND can be relocated, with the interior traveling
  with it. Chests, packs, ships, wagons, flying castles. The
  interior-survives-relocation property is what distinguishes
  these from ordinary Containables (a sword has no interior; a
  chest does).
- Stationary buildings are NOT Vessels — they're just connected
  zones. No `Edifice` class. No Location/Vessel collapse.
- Locations stay non-Containable.
- Inheritance/config still works via template-tree ancestry,
  independent of spatial relationships.

### Why this over containment-nesting

- Avoids the Vessel/Location/Edifice/Place semantic tarpit
  (questions about roots, depth invariants, class collapse).
- Skyrim and CircleMUD both ship without it — establishes that
  the explicit-containment relationship between outdoor and
  indoor is not load-bearing.
- The cardinal-only-intra-zone exit invariant (below) already
  forces a zone break at every meaningful "go in" boundary, so
  the structural separation happens automatically without needing
  containment semantics.
- Simpler. No new top-level class; no substrate refactor of
  Location's Containable-ness.

### Trade-offs accepted

- "This castle is inside this wilderness" can't be queried as a
  containment fact — would walk exits or use template-path
  ancestry as a proxy.
- "Destroy the building, contents fall to the outdoor zone"
  needs explicit event handling rather than cascade-on-destroy.

### No single world-root

Locations are non-Containable — they have no `environment`,
they're not inside anything. There's no Stuff that "contains the
world" or that all places trace back to via containment. The
campus, the city, the wilderness, Narnia, dream realms — these
exist as independent Locations connected to each other via exits
(or portals, or wardrobes) when they're connected at all, never
via containment. Forcing a single world-root would be invented
structure that fights how realms reach each other.

The only containment relationships in the world are
Vessel-shaped: a chest inside a room, a backpack inside an
Avatar's slot, a ship inside an ocean Location. Vessels live
inside Locations, but Locations don't live inside anything.

---

## Zone derivation: template-path determines zone

A Location's zone is the **nearest SpatialZone ancestor** in its
templatepath. FolderZones are skipped during the walk.

```
/narnia/woods/                       SpatialZone (Cartesian grid)
  clearings/                         FolderZone (organizational)
    western-glade                    → zone is /narnia/woods/
  paths/                             FolderZone
    woodland-trail                   → zone is /narnia/woods/
  npcs/                              FolderZone
    wolf-pack                        → zone is /narnia/woods/
  secret-grove/                      SpatialZone (sub-grid)
    altar                            → zone is /narnia/woods/secret-grove/
```

Everything under `/narnia/woods/` that isn't under a deeper
SpatialZone lives in the woods grid. The folder hierarchy is
purely organizational. When a deeper SpatialZone appears
(`secret-grove`), its subtree resolves to that zone instead.

**The rule in one sentence:** a SpatialZone owns every leaf under
its templatepath, except for sub-trees rooted at deeper
SpatialZones. FolderZones don't create new spatial grids.

This is the existing `ZoneApi.resolveZoneForPath` behavior; this
slate makes it explicitly load-bearing for authoring guidance.

### Why derived, not free-assignment

Considered: an explicit `zone` field on Locations that overrides
templatepath derivation, letting two leaves in different folders
share a zone. Rejected.

Reasons to keep derivation:

1. **Simple authoring mental model.** "Where is this thing?" =
   "what's its templatepath?" One question, one answer.
2. **The flexibility authors actually want is already there via
   FolderZones** — organize freely without creating grids;
   promote a folder to SpatialZone when you want a new grid.
3. **Cardinal-rule + derived zone composes cleanly.** Non-cardinal
   exits cross zone boundaries, which corresponds to crossing
   into a different SpatialZone's subtree. The constraint and the
   structure align.
4. **"I want X in folder A but in zone B" use cases** are usually
   a smell that the templatepath fights the spatial reality —
   fix the path, not via metadata override.

Cost accepted: **placing a SpatialZone in the tree is a
load-bearing commitment.** Once `/narnia/forest/` is a
SpatialZone, everything underneath shares its grid; future
re-organization is restructure-the-tree, not edit-metadata.

### Inheritance walk for zone-carried fields

For any zone-carried field (celestial profile, gravity, base
biome, future resource caps), the resolution walks template-tree
ancestry — same shape as zone derivation but reading field
values along the way:

```
read field on /narnia/woods/secret-grove
  → defined here? use it.
  → walk up to /narnia/woods/. Defined? use it.
  → walk up to /narnia/. Defined? use it.
  → ... up to universe default.
```

FolderZones participate as inheritance nodes (they can carry
defaults too) even though they don't anchor a spatial grid.
`/narnia/` as an FolderZone can declare "Narnia celestial
profile" once, and every SpatialZone underneath inherits it.

Tentative API surface:

```ts
class ZoneApi {
  // Existing
  static resolveZoneForPath(templatePath: string): SpatialZone | null;

  // New: generalized field resolution along template ancestry.
  static resolveZoneField<T>(zone: Zone, fieldName: string): T | null;
}
```

---

## The cardinal-only-intra-zone exit invariant

Current behavior (per `CartesianLocation.ts:32-39` and
spatial.md): **CartesianLocation rejects ANY non-cardinal exit,
intra-zone or inter-zone.** That's stricter than the intent. The
actual load-bearing invariant is:

> Inside a CartesianZone, any exit that **stays in-zone** must be
> one of the 10 cardinal directions. Any exit that **leaves the
> zone** can carry any label.

Reasons to keep the invariant (in its corrected form):

1. **Grid math stays honest.** `CartesianZone.deriveExit` derives
   cardinal adjacency automatically and depends on every intra-
   zone neighbor being reachable by a known cardinal offset. A
   `closet` exit mid-grid breaks the assumption silently.
2. **Composes with flat-siblings.** Every "enter the castle" /
   "go in the wardrobe" / "down the rabbit hole" is exactly a
   cross-zone exit, which is precisely where exotic labels
   naturally belong.
3. **Useful structural force for authors.** Want a "secret
   passage"? Either make it cardinal (down through a trapdoor) or
   cross a zone boundary (the passage IS its own zone). No
   in-between exotic-label-same-grid shape — and that's fine.
4. **Does most of the zone-separation work for us.** Authors can't
   accidentally shove a building interior into the surrounding
   wilderness zone, because doing so would require a non-cardinal
   `in` exit. So a lot of "what's its own zone" is decided
   structurally, not by author judgment.

### Implementation change

`CartesianLocation.addExit` relaxes from "if `isCardinal`, allow;
else throw" to "if `isCardinal`, allow; else require destination
resolves to a Location in a different zone."

Wrinkle: cross-zone Pattern C exits resolve lazily, so the
destination may not be available at `addExit` time. Validation
can happen at link-time when destinations resolve, same way
other zone-crossing validations work. Concretely:

- Destination already resolved + same zone → reject non-cardinal
  at `addExit`.
- Destination lazily resolved → defer; reject non-cardinal-same-
  zone at resolution time if the lazy resolution surfaces a
  same-zone destination.

`SphericalLocation` stays unchanged (no adjacency derivation; any
label, intra or inter, is fine).

### Documentation

spatial.md gains a paragraph capturing the invariant in its
corrected form, replacing the current "Overrides `addExit` to
reject any non-cardinal direction" passage.

---

## Folder zones — generic class needed

Today's folder-zone classes are namespace-specific (`HomeZone` for
`/home/`, `Biorealm` for `/idea/biome/`, `Clade` for
`/idea/species/`). Missing: a generic "I'm just a folder, no
spatial topology" class for paths like `/domain/narnia/`,
`/narnia/woods/clearings/`, etc.

Recommendation: add a generic class — provisional name
`FolderZone` — bare Zone subclass with no special semantics. Same
shape as existing folder-zone classes minus the namespace-
specific bits. Used for any organizational folder that doesn't
anchor a special namespace.

Naming options for review: `FolderZone` / `DomainFolder` /
`FolderZone` / `Section`. Lean `FolderZone` for breadth (works
under both `/idea/` and `/domain/`); not critical, settle at
implementation.

---

## Permissions are independent of zones

Permissions live on template-path prefixes (or repo paths for
code), NOT on Zone class or zone subtree. The permissions check
is "does this user's role grant access to this path?"

Three layers:

- **Code permissions** — files/directories in the repo,
  CODEOWNERS-style. The MQL team owning `MqlApi` is a repo
  concern; has nothing to do with `/idea/mql/`-anything.
- **Core taxonomy permissions** — the `/idea/...` subtree
  (Material, Species, Biome registries) owned by core. These
  trees ARE Zones (`Clade`, `Biorealm`) because they're folders
  in the content tree — but their permission scope is "core
  only," set by tree path, not by Zone class.
- **Content domain permissions** — `/domain/<group>/` subtrees
  owned by the corresponding team. Inside their subtree, they
  organize however they want.

Zones happen to be the substrate that anchors templatepath
prefixes (because of the folder/leaf invariant), but permissions
checking treats it as "what's this path?" not "what Zone class
is this?"

Implication: **don't bake permissions into Zone classes or zone
metadata.** Permissions are a separate concern that operates on
the path tree.

---

## Authoring guidelines

The cardinal-rule and the zone derivation rule together do most
of the structural work for authors. The cardinal-rule forces zone
breaks at meaningful boundaries (building entries, portals); the
derivation rule means folder organization is free of zone
implications as long as folders stay non-spatial. So a lot of
"what's its own zone" gets decided automatically. What's left as
author judgment is **how to organize within and across zones**.

### Default pattern for `/domain/<team>/`

```
/domain/narnia/                       FolderZone (organizational)
  forest/                             CartesianZone — woods, one grid
    western-clearing                    Location (leaf, at coords)
    wolf-pack                           NPC (leaf, in the woods zone)
    silver-knife                        Item (leaf, in the woods zone)
  castle/                             FolderZone (castle has substructure)
    exterior                            CartesianZone (small grid)
    great-hall                          CartesianZone (interior grid)
    dungeon                             CartesianZone (interior grid)
    aslan-statue                        Item leaf, shared across castle zones
  shared/                             FolderZone — reused across regions
    items/
      excalibur                         Item leaf
    npcs/
      tumnus                            NPC who wanders (leaf)
```

The CartesianZones connect via cross-zone exits at their
boundaries (e.g., `castle/exterior` → `castle/great-hall` via an
`enter` exit on the front door).

### Principles

1. **Top-level under a team's domain: geographic.** Reflects how
   authors think ("I'm working on the forest"). Inherits
   geographic-flavor defaults cleanly (forest biome at
   `/narnia/forest/`).
2. **Within a region: categorical or flat, author's call.** Either
   `/narnia/forest/western-clearing` flat, or
   `/narnia/forest/clearings/western-clearing` sub-categorized.
   Both fine; depth is a taste choice.
3. **Shared content: a sibling `shared/` (or `items/`, `npcs/`)
   folder.** Things reused across regions live there. Don't force
   them into one region's tree just because they appear there
   first.
4. **Internal nodes are Zones; leaves are content.** This is the
   folder/leaf invariant; not negotiable. SpatialZone if the node
   anchors a coordinate grid; FolderZone if purely organizational.
5. **The cardinal-rule decides "is this its own zone."** If you'd
   need a non-cardinal exit to reach a place from its neighbor,
   that place is its own zone. Period. Don't fight this.
6. **Granularity heuristic (not a rule):** rough ~50–200 rooms per
   CartesianZone (CircleMUD area precedent). Tune at content
   build; don't ship a 5000-room zone.

### Anti-patterns to discourage

- **"Everything categorical at the top"** (`/narnia/rooms/`,
  `/narnia/items/`, `/narnia/npcs/`). Breaks inheritance — can't
  carry forest defaults if rooms are scattered across the
  categorical tree.
- **"One zone for the entire team's domain."** Too coarse; the
  cardinal rule will force splits as soon as you have any
  indoor/outdoor distinction.
- **"Deeply nested per-sub-sub-region trees."** Authoring overhead
  doesn't pay off below ~2–3 levels of organizational depth.
- **"Mixing geographic and categorical at the same level"**
  (`/narnia/forest/`, `/narnia/items/`, `/narnia/dungeon/` all at
  the top). A sibling `shared/` is OK because it's clearly a
  meta-category; mixing semantically same-level dirs is confusing.
- **"Putting a SpatialZone where you really wanted a folder."**
  Promotes the whole subtree's contents into the same grid,
  potentially merging things you didn't mean to merge. If you're
  unsure, start with FolderZone; promote to SpatialZone only when
  you actually want a coordinate frame.

### `/idea/...` vs `/domain/...` are organized differently

Worth noting: core taxonomies (`/idea/material/`, `/idea/species/`,
`/idea/biome/`) are organized **taxonomically** (root → kingdom →
species, or biome category hierarchy), not geographically. The
recommendations above apply to `/domain/<team>/`. Core taxonomies
have their own structure determined by their domain.

---

## Sketch tree (full picture)

```
/domain/                              FolderZone
  /saxonberg-campus                   CartesianZone (main outdoor play)
    (rooms, NPCs, items as leaves)
  /saxonberg-city                     CartesianZone (surrounding city)
  /wilderness/                        FolderZone
    /forest                           CartesianZone
    /coast                            CartesianZone
    /mountains                        CartesianZone
  /narnia/                            FolderZone
                                        (declares Narnia celestial profile —
                                         inherits to everything under)
    /forest                           CartesianZone
    /castle/                          FolderZone
      /exterior                       CartesianZone (one or few rooms)
      /great-hall                     CartesianZone (interior grid)
      /dungeon                        CartesianZone (interior grid)
    /shared/                          FolderZone
      /items/                         FolderZone
        narnia-orb                    Item leaf
      /npcs/                          FolderZone
        tumnus                        NPC leaf
/idea/
  /biome/                             Biorealm
    /outdoor/forest/temperate         Biome leaf
    ...
  /species/                           Clade
    ...
/home/                                HomeZone
  /<playerId>/
    ...
```

CartesianZones connect via cross-zone exits at their boundaries.
FolderZones provide organizational anchoring and inheritance
without contributing to spatial structure.

---

## Prior art surveyed

Workflows from existing games / MUDs that handle similar concerns:

- **Skyrim / Bethesda games**: outdoor cells tile in a 1km grid
  for continuous wilderness; everything indoors (houses,
  dungeons, caves) is a separate "interior cell" entered via a
  door. No coordinate continuity outside-to-inside. Loading
  boundary is the door. **This is the flat-siblings pattern.**
- **CircleMUD / DikuMUD**: rooms group into "areas" of ~50–200
  rooms. Areas are the resource-boundary unit (reset cadence,
  mob caps), the authoring unit (one author per area), and the
  organizational unit. Coordinate systems usually only loosely
  enforced — rooms linked by named exits.
- **Discworld MUD**: rooms grouped into "domains" (Ankh-Morpork,
  Klatch, Genua). Organizational/admin units, not coordinate
  frames.
- **Skotos / MUSH "scenes"**: hierarchical scene tree, parent
  scenes contain child scenes. Navigation up/down the tree is
  first-class.
- **Dwarf Fortress**: explicitly two-tier — world map (continent
  tiles) zooms into local map (each world tile is a finer grid).
  Two coordinate systems by design.

The unifying pattern: successful systems **pick natural seams for
each concern** (resource / authoring / coordinate /
organizational) rather than making one structure serve all of
them. Saxonberg's soft-split (Zone subclasses) + permissions-
on-paths + cardinal-rule-as-forcing-function aligns with this
pattern.

---

## Open questions

1. **Generic FolderZone class name.** `FolderZone` vs
   `DomainFolder` vs `FolderZone` vs `Section`. Settle at
   implementation. Lean `FolderZone`.
2. **Resource-boundary semantics.** Are runtime caps (mob counts,
   item limits, reset cadence) at the zone level? Aspirational
   today. Lean zone-level for v1; worth a dedicated discussion
   as its own slate.
3. **Exit validation timing.** Cardinal-only-intra-zone check
   needs destination's zone. At `addExit` time, destination may
   be unresolved (Pattern C lazy resolution). Lean: validate at
   `addExit` when possible, defer to link-time when not. Both
   paths throw on same-zone-non-cardinal.
4. **Granularity calibration.** ~50–200 rooms per zone is the
   CircleMUD heuristic. Saxonberg might differ. Tune at first
   content build-out.

---

## What this slate does NOT cover

- Resource-boundary mechanics (mob caps, reset cadence,
  perception cutoffs). Those deserve their own slate.
- The detailed inheritance-walk caching strategy.
- Authoring tooling for laying out zones.
- Cross-zone exit specifics beyond the cardinal-only invariant
  clarification.
- Coordinate translation between adjacent zones (deliberately
  not a thing — zones are independent coordinate frames).
- Containment-nesting via Edifice or similar (explicitly
  rejected; recorded here for the record).

---

## Once shaped into formal requirements

- Generic `FolderZone` / `FolderZone` class.
- Tightened `CartesianLocation.addExit` — cardinal-only intra-
  zone enforcement; non-cardinal allowed across zone boundaries.
- `ZoneApi.resolveZoneField` — generalized template-ancestry
  inheritance walk for arbitrary zone-carried fields (used by
  celestial profile, future zone-carried config).
- Authoring guidelines documented for content authors (probably
  as a section in spatial.md and/or a contributor guide).
- spatial.md updates capturing the zone-derivation rule, the
  cardinal invariant tightening, the FolderZone/SpatialZone
  soft-split, and the permissions-independence note.
- Resource-boundary slate spawned separately.
