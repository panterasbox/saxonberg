# Location graph slate — the map you can read without loading the world

> **Status: UNBUILT, design agreed.** A **derived, persisted projection of
> every location and its exits**, so mapping, pathfinding, discovery and
> publish-state can all be answered without hydrating content and without
> a collection scan. ⭐⭐⭐ The decisive finding: **the elastic half is
> already authored** — `PlatPlan` is persisted topology with stable node
> ids and `routeOf()` is already implemented, so the warren hole is far
> smaller than it looks.
> **Left:** the node projection + its five indexes · the boot rebuild +
> write-chokepoint maintenance · `PlatPlan` expansion as a graph source ·
> occupancy-warren reflection at query time · per-`(player, zone)`
> discovery sets · `published` on the parcel + the one-directional lint ·
> the eviction path for offlined content
> **Size:** **a build.** The lint is the cheapest wave and worth shipping
> first on its own.

**Captured 2026-10-01.** Everything in the game is lazy-loaded, so runtime
state is only *what players have visited and what has not been reaped*.
The authored truth is in the templates, and a full scan of those is not a
thing to do per map read.

Related: [pathfinding-slate](./pathfinding-slate.md) (three searches, three
graphs, and the *"where does it live"* question this answers) ·
[map-slate](./map-slate.md) (the renderer — ⚠ and a dependency correction,
§7) · [location.md](../../subsystems/location.md) (the Warren, the
membership discriminator) · [boundary.md](../../subsystems/boundary.md)
(`DeferredDestinationExit`) · [templates.md](../../subsystems/templates.md)
(`extends` resolves at read) · [parcel.md](../../subsystems/parcel.md)
(title, for `published`) · [address.md](../../subsystems/address.md)

---

## 1. The measurements that decide the design

```
2,544 template rows                103 rows declare exits, 197 edges
197/197 edges carry a literal `destination`   (no runtime-decided dests in content yet)
 85/197 carry `edgeMinutes`        ← a cost model already exists in the data
102/103 carry `coords`             ← the grid renderer has its data almost everywhere
 52/103 carry `_address`  ⚠ and NOT unique (two rows both claim
                              `terminus/city/campus/duncan-hall`)
content indexes: { path: 1 } unique, { extends: 1 }.  No zone index, no exit index.
projection size: 316 bytes/row against 1,635 full — only 5.2× smaller
```

⚠ **The payload argument is weaker than it looks and is not the case for
this build.** At 10,000 rooms the projection is still **3.16 MB** — too
big for a per-request read either way. **The case is that the projection
shards by zone and the source cannot.**

## 2. ⛔ Why it cannot be an index on `content`

Our standing rule is *an index before a collection*, so this needs
arguing. Four reasons, and the fourth is decisive:

1. **Inheritance.** `extends` resolves at read and is never flattened, so
   a raw query on `data.exits` is **quietly short** — the same failure
   `content.yaml` already documents for class queries, and the reason
   `findByClass` unions children that carry a parent.
2. **Reverse edges.** *Who points at me* is not a question a template can
   answer.
3. **Asymmetry.** A one-way exit is a property of the pair, declared by
   neither side.
4. ⛔⛔⛔ **The elastic graph is not in templates at all.** `Warren` holds
   `_members` and an `_attachments` map of `{direction, opposite}` —
   **transient instance refs**. An index over `content` structurally
   cannot hold an edge no template declares, and if this artifact is to be
   *the map*, it must.

## 3. The node projection — flat rows, not materialized zone blobs

⚠ **Rejected: one document per zone holding that zone's adjacency.** It
amplifies staleness — editing one room invalidates a whole blob — and the
write path is per-template.

**One row per location:**

```
{ identity:    "/world/terminus/university-avenue/location/crossing"  // unique — see §5
  template:    "/platform/location/Crossing"        // the EDGE LABEL
  zone:        "/world/terminus/university-avenue"  // indexed
  address:     "terminus/city/university-avenue/crossing"   // display only
  coords:      { x: 0, y: 0, z: 0 }
  edges: [ { dir: "south", to: "…/terminal/location/arrival-gate", minutes: 1 },
           { dir: "north", to: "…/location/campus-gate",
                           door: "…/thing/campus-gate-door" },
           { dir: "in",    to: null, deferred: "/system/residence/…/warren",
                           label: "/platform/location/DormRoom" } ]
  crossesZone: true      // derived, indexed
  published:   true      // from the parcel — indexed
  origin:      "template" | "plan" | "live"
}
```

### The five queries, and the index each uses

| query | consumer | index |
|---|---|---|
| every room + exit in a zone | editor canvas, zone map | `{ zone }` |
| my neighbours to depth N | the player minimap | `{ identity }` → `edges.to` |
| **who points at me** | reciprocity lint, offline boundary | `{ "edges.to" }` |
| the inter-zone skeleton | **pathfinding, level 1** | `{ crossesZone: true }` |
| online rooms with an edge into dark content | the publish gate | `{ "edges.to": {$in}, published: true }` |

⭐⭐⭐ **Hierarchical pathfinding falls out for free.** `{crossesZone:true}`
*is* the level-1 graph and it is tiny: search it for the sequence of
zones, then search only the zones on that route at level 0. That is HPA\*,
and it is the right shape because our world is localities with authored
both-sided boundaries — `crossing.yaml` says so outright: *"two
independently-owned zones that touch."*

### ⭐⭐ Where it lives — and the pathfinding slate's blocker dissolves

`pathfinding-slate` question 3 says `lint:object-verbs` forbids
`NavApi.pathFrom(room, …)` because the first parameter is a world object.
**The index is keyed on paths — strings, not Stuff** — so
`NavigationApi.routeBetween(a, b)` is not subject-first and the lint never
fires. `NavigationApi` is already the string-keyed direction table
(`normalizeDirection` / `invertDirection` / `directionOffset`) over a
hot-reloadable `NavigationLogic` singleton. **It is the home.**

⭐ Note also what this does to that slate's acceptance test (*"if the two
shipped walks don't migrate, the primitive has one consumer and should not
exist"*): the map is a **third** consumer, and the first one that wants
the whole graph rather than a local walk.

## 4. ⭐⭐⭐ Three node kinds — and the elastic half is mostly authored

| kind | topology from | node key | in the index |
|---|---|---|---|
| **singleton** | authored `exits:` | its template path | **stored** |
| **planned warren** | ⭐ authored **`plan:`** | `"<road>:<segment>"` · `lot-<n>` · `f<floor>-r<pos>` | **the plan is stored; nodes expand on read** |
| **occupancy warren** | nothing — it is pressure | the live instance | **not stored. Reflected at query time.** |

### `PlatPlan` is persisted elastic topology

`OuterWarren.fieldMeta` carries `plan`, `capacityKey`, `defaultCapacity`,
`parentExtent` as **`persistent: true, authorable: true`**, and `plan:`
parses into an immutable `PlatPlan`:

> *"**how a holding institution's map grows**: authored data mapping slot →
> circulation node. Layout is data on the institution row (`plan:`), never
> code."* — **static** (`nodes:` enumerates authored rooms) · **linear**
> (floor math, `frontagesPerNode`) · **branched** (roads × segments,
> `frontagesPerSegment`, `branchesFrom`, per-segment authored paths).
>
> *"A node id is `"<road>:<segment>"`… **`routeOf(node)` is the node's path
> back to the authored entrance** — the contiguity spine the reap invariant
> walks."*

Three consequences:

1. ⭐⭐⭐ **The per-instance node identity already exists.**
   `DeferredDestinationExit` said *"the unique per-instance identity a
   global/explored map would need is held by the subclass… and **can be
   surfaced when that feature lands**."* It is held by the **plan**, and it
   is persisted. **This build is that feature.**
2. ⭐⭐⭐ **Pathfinding inside an elastic region is already implemented** —
   `routeOf()` walks a node back to the entrance, because the reap
   invariant needed it. Nobody writes that search.
3. ⭐⭐⭐ **`heading`** — *"the planar cardinal the road RUNS in, away from
   the entrance"* — **makes a plan spatially renderable.** A subdivision's
   streets, courts and culs-de-sac can be drawn **without minting a single
   room.**

> **So do not reflect a planned warren's runtime state — expand its plan.**
> Strictly better: it works when nobody is there, survives restart, is O(1)
> storage for O(n) rooms, and the parse *"throws on malformed data… so a
> typo fails at install."*

### The occupancy warren stays unmapped, and that is the honest answer

`LoungeWarren extends SingletonMixin(InnerWarren)` with **no plan**. Its
satellites exist because people are standing in them: *"Every room instance
is a runtime clone, gone on restart, recreated on the next first-landing.
Only the templates + the Warren definition persist."*

> ⭐⭐ **A lounge satellite is a room that exists because you are in it.**
> There is nothing to remember, and a map that claimed otherwise would be
> lying. The index's answer at that edge is *"a space through this door,
> shape unknown"* — the same honest-fog seam as
> [concealment.md](../../subsystems/concealment.md).

### How the halves join

Already doctrine, which is why this works at all:

> *"**Coordinator, not a containment tier.** Member Locations stay ordinary
> roots (`getContainer()` → null)… **The membership discriminator** — does
> the room's existence and placement depend on the Warren's policy? Yes →
> a member. No → **an external neighbor, reached by a plain exit from the
> host and left alone.**"* — Dave's Bar is the worked case.

**A warren touches the global graph at one node — the host — by ordinary
exits to persisted singletons.** A unified read is then:

1. read the persisted rows for the zones on the route (`{zone}`);
2. where an edge lands on a **planned** warren, expand the plan's nodes you
   need and use `routeOf()` for the interior leg;
3. where it lands on an **occupancy** warren, ask the live instance — and
   if it is not loaded, say so.

⭐ **Cost is right:** step 1 scales with content, step 3 scales with
*occupied* warrens, which is bounded by player count rather than world
size.

⚠⚠ **Host is a migrating runtime role** (*"migrating the role on forced
host destruction"*). **The graph node must be the template path, with the
warren resolving the current host at call time.** An index that stores the
host *instance* goes stale the first time a host dies.

## 5. The keys — four of them, one job each

| key | stable across | job |
|---|---|---|
| **`getIdentityPath()`** | reap, re-mint, restart | ⭐ **the node key** |
| `getTemplatePath()` | everything | the **edge label** (*"→ a dorm room"*) |
| `stuffId` | nothing — a fresh `uuid()` per construction, **not persisted** | ⭐ **guards a live cache** |
| `_address` | — | ⚠ **display only.** 52/103, and not unique |

⚠⚠ **Never key a node on `templatePath`** — many warren rooms share one,
and that is the exact shape of the bug that cost a shared bank account
(see [antipatterns.md](../../antipatterns.md)). `getIdentityPath()` *"falls
back to `getTemplatePath()` for anything with no minted identity, so it is
safe everywhere."*

⭐ **`stuffId`'s job here is specific:** `DeferredDestinationExit` caches
its destination as a within-session live ref and *"re-materialize[s] after
a reap."* A cached edge target can be re-minted under you, and **`stuffId`
is the only thing that detects a replacement rather than the thing you
indexed.**

## 6. Discovery — the same shard key as the graph

`player_frames` cannot carry it (*"deliberately NOT an archive… the
retention rule is a window"*). `beliefs` is the right *shape* — one row
per `(viewerId, realm, referent)` — but it is identity memory.

> ⭐⭐ **Per `(playerId, zone)`, holding the set of discovered node keys in
> that zone.** The minimap only ever needs one zone, so **one graph read
> plus one discovery read renders a map.** `$addToSet` on arrival, bounded
> document size, and no row-per-visit — which is the thing that actually
> gets expensive at player × room scale.

⭐ **And discovery remembers the ADDRESS, not the occupant.** *"I have been
to lot-7"* survives lot-7 being reaped and re-minted, because the plan maps
**slot** → node and the slot is the durable thing. Who lives there now is
[belief.md](../../subsystems/belief.md)'s question. **The map remembers
places; belief remembers who is behind the door.**

## 7. ⛔⛔ Published / offline — and there is no staging layer

**Confirmed: no published, offline or draft concept exists anywhere in the
tree**, and the overlay that would make one cheap is explicitly deferred.
`cms.md`'s deferral boundary:

> *"**Drafts / staging / changeset overlay + atomic publish** → later
> (depends on the versioning/changeset model)."*

The CMS "draft" is an editor-local dirty buffer — *"a save adopts the draft
as the new persisted baseline"* — so **saving writes through to the real
template.**

⚠⚠ **Dependency correction for [map-slate](./map-slate.md):** it says the
editor *"reads templates **through the draft overlay** — so you see the
zone as authored / as it will be."* **There is no draft overlay to read
through.** That slate's editor adapter either reads live templates or waits
on the changeset model.

⭐⭐⭐ **Which settles the mechanism: a flag is not one of two options, it is
the only available one.** "Unpublished" cannot mean "exists only in
staging," because there is no staging.

### One field, two lives

| | state | who is inside | enforcement |
|---|---|---|---|
| **draft** | never been live | nobody, by construction | ⭐ **wall** — an exit into it refuses |
| **offline** | was live, now dark | **possibly people** | ⭐ **camera + eviction** |

**Draft is a wall** because the alternative is the boot crash in §8.
**Offline is a camera plus eviction**: the exits stop working, people inside
are moved out, and **the boundary is reported to whoever owns the rooms
that pointed in** — their content just lost a destination, and that is
theirs to fix rather than silently yours.

### ⭐⭐⭐ The asymmetry that makes the lint cheap

> **published → unpublished is a dangling edge waiting to happen.
> unpublished → published is harmless.**

A draft zone pointing *out* at the live world is expected — that is how it
attaches when it lands. **The lint checks one direction only**, and the
reverse-edge index serves it directly.

### `published` on the parcel, not the zone

Parcels carry `ParcelRecord` + chain-of-title; `ParcelApi.ownerOf` resolves
by longest prefix; `AccessApi.canAtPath` already gates the path-addressed
trees. ⭐ **So the flag on the parcel inherits an authority model, an
appeal route and an audit trail that all already exist** — rather than
minting a new authority for "may I take my content down."

⭐ And `published` is **a declaration**, which puts it in
[content-declaration-slate](./content-declaration-slate.md)'s loop:
derive the boundary, declare the readiness.

### The eviction path

⭐⭐⭐ Steal **`un.c`** from EotL ([eotl-craft.md](../../eotl-craft.md)): a
self-describing tombstone that names the missing place, tells you who to
report it to, guarantees an exit through a four-level fallback cascade, and
**destructs the moment no interactive player is inside it.** Offlining
content needs an eviction path and that is the honest form of one.

## 8. ⭐⭐⭐ What this buys that nothing else does — graph invariants become lintable

`crossing.yaml` documents the current failure mode in its own comment:

> *"exits **eager-clone their destination at boot**
> (`Exitable.applyExits → StuffApi.singleton`), so the north gate points at
> a real loadable stub, **NOT a dangling path**."*

> ⛔⛔ **Today a dangling exit is caught by crashing the boot** — and
> because a CMS save writes through, an author can create that crash and
> not meet it until the next restart.

With the index, these become a lint beside `lint:locations`
(`check-location-classes.ts`):

- no `destination` naming a path that does not exist;
- ⭐ no edge from published content into an unpublished parcel (§7);
- `bidirectional` edges actually reciprocal, and asymmetry **deliberate**;
- no room unreachable from its zone's entrance (the Spherical
  **reachability** check `map-slate` already owes, now computable);
- every cross-zone edge authored on both sides, which `boundary.md`
  requires and nothing currently verifies.

**This is the cheapest wave and it is worth shipping alone**, before any
renderer or router exists.

## 9. Authoritative or advisory

⭐ **Rebuilt at boot, maintained at the write chokepoint.** `content.yaml`
says *"writes go through the pack installer or the CMS save path"* — a
single seam — and a boot rebuild makes staleness **self-healing rather
than a state anybody manages.** 2,544 rows is nothing to walk; `extends`
chains are capped at 32.

⚠ The index is **derived**, so A3 applies: it is never a source, a
disagreement with the templates is a bug rather than a state, and it must
be droppable and rebuildable at any moment. Precedent: `Collections` /
`COLLECTION_POLICIES` are generated artifacts with a do-not-edit banner.

## Open questions

1. **Does the occupancy warren ever get indexed live?** Possible, but it
   means runtime writes to a derived store that can then lie after a crash.
   ⭐ The declared hole is honest and cheaper. *Lean: leave it reflected.*
2. **New collection, or the document tree?** The standing rule is *an
   index before a collection* and *no new Mongo collections — parcel-local
   persistence is the document tree*. §2 argues a separate artifact is
   forced; whether it is a collection or a `DocumentKinds` member is
   undecided, and the per-`(player, zone)` discovery set may want a
   different answer from the graph itself (high write volume, per-player
   ownership).
3. **Cost model.** `edgeMinutes` exists on 85 edges today. `pathfinding-slate`
   notes transport counts **legs**, a walker counts rooms, a hauler counts
   difficulty and mode — so cost is a **parameter**, and `edgeMinutes` is
   one of several, not the one.
4. ⚠ **What offlines a parcel whose rooms are a warren host?** Evicting a
   host migrates the role; evicting the *whole warren* is a different act.
   The eviction path needs to know which it is doing.
