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
> occupancy-warren reflection at query time · **TPA routes as time-varying
> edges** · ⭐ the player's map as a **document-tree artifact** (not a view,
> not a collection — §6) · the four **reveal channels** (§9) · `published`
> on the parcel + the one-directional lint · the eviction path for
> offlined content · **coverage** as a derived per-locality fact (§11)
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

  // ⭐ the ZONE facts a router must read, denormalised onto the node so it
  // does not re-read a covenant per hop (§10, §11)
  epochCeiling: "medieval" | null     // which wayfinding RUNG may be offered
  coverage:     "surveyed" | "partial" | "unmapped"   // derived — see §11

  // ⭐⭐⭐ TPA routes are EDGES, with a fare, a wait, and a per-player gate
  tpa: { role: "arrival" | "departure" | "both",
         boardLabel: "Terminus",
         routes: [ { to: "…/hinkley-hills/location/stop",
                     fare: 2, advanceMode: "scheduled",
                     departures: ["06:00","18:00"] } ] }
}
```

### ⭐⭐⭐ A TPA route is an edge, and it is the first *time-varying* one

Folding the TPA in is not completeness for its own sake — it changes what
the router is:

- **a fare and a wait, but zero distance.** Which is exactly why
  `pathfinding-slate` is right that cost is a **parameter**: a TPA leg is
  cheap in rooms and expensive in coin, and no single number orders them.
- ⚠⚠ **`advanceMode: scheduled` makes it a time-varying edge** — traversable
  only at certain game times. **Time-dependent shortest path is a
  materially harder problem than Dijkstra**, and it should be flagged here
  rather than discovered by whoever builds the router.
- **per-player admission.** Clearance is identity-bound, so **the edge
  exists and is closed to you specifically** — the same shape as a
  concealment gate, and the reason the index cannot pre-filter edges by
  viewer.
- **arrival / departure / both**, per EotL's split, so a zone's departure
  console need not sit in its arrival room.

⭐⭐ **And it collapses three products into one edge set:** the **departures
board** is tpa-edges-from-here, the **schedule pamphlet**
([content-declaration-slate § 6.3](./content-declaration-slate.md)) is
all-tpa-edges, and **your map** is all-edges-you-know. Same data, three
slices, three reveal rules (§9).

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

## 6. ⭐⭐⭐ The player's map is a DOCUMENT, and there is no read-time join

**Two stores, and they are deliberately different kinds of thing:**

| | what | where |
|---|---|---|
| **the graph** | the server's complete truth | ⭐ **its own collection.** Read-heavy, write-rare, sharded by zone |
| **a player's map** | ⭐ **what they know, and it may be wrong** | **the document tree** — `/home/<player>/map/<locality>` |

A personal map passes our own test for the document tree exactly —
**owner-scoped content with a place** — which buys the title gate,
path-addressing and findability for nothing. And it collapses something I
had as two artifacts:

> ⭐⭐⭐ **The map document IS the discovery record.** What you have
> discovered *is* what is in your map. No separate per-player set, and
> discovery stops being hidden server state and becomes **a thing the
> player owns and can look at.**

⭐⭐ **One document per `(player, locality)`**, so a map of one place is
giftable, sellable and copyable **without handing over everything you
know** — which is how map-selling has to work.

> ⭐⭐⭐ **And a map you buy is the same kind of document at a different
> owner's path.** Selling a survey is *copying a document between
> branches*. A cartographer's inventory, a player's own map and a published
> timetable are **one `DocumentKinds` member with three provenances.**

### ⭐⭐⭐ The absence of a join is the mechanic

- **Write time** — you arrive → the server reads the **graph** → projects
  the nodes you *perceived* into **your document**.
- **Read time** — you open your map → the server serves **your document**.
  **It never consults the graph.**

> **A relational view would be silently always-correct and you could never
> be wrong. A copied document rots — and rot is the feature.** Join on read
> and you have deleted *being lost* from the game.

So the graph's readers are: the router, the lints, the publish gate, and
the cartographer's survey act. ⛔ **Never a player's map read.**

⚠ `player_frames` cannot carry any of this (*"deliberately NOT an
archive… the retention rule is a window"*), and `beliefs` is the right
*shape* but is identity memory. The document tree is the third option and
the right one.

⭐ **And a map remembers the ADDRESS, not the occupant.** *"I have been to
lot-7"* survives lot-7 being reaped and re-minted, because the plan maps
**slot** → node and the slot is durable. Who lives there now is
[belief.md](../../subsystems/belief.md)'s question. **The map remembers
places; belief remembers who is behind the door.**

## 7. ⭐⭐⭐ Being lost is a false belief, not an absence

The thematic claim this build exists to make possible, and it is the reason
§6 is shaped the way it is.

> *"This is the last generation that knows what it is to be lost."*

Not knowing where you are is mild — you stop and look around. **Being lost
is being *wrong* about where you are and acting on it.** GPS did not mainly
give us information; it removed **the possibility of being confidently
mistaken.**

| | | |
|---|---|---|
| **ignorance** | never been there | fog of war — an absence |
| **knowledge** | been there, still true | the happy case |
| ⭐⭐⭐ **stale belief** | been there, **and it changed** | **where "lost" lives** |

⭐⭐ `belief.md` is already this mechanism pointed at people: disguise works
because *your belief about who someone is can be false*. **A map that can
be wrong is the same mechanism applied to place.**

And our architecture **manufactures** the third state without trying:

- a zone gets **offlined** (§13) → your map holds a room that is not there
- an elastic slot is **reaped and re-minted** → `lot-7` is a different
  holding now
- an owner **edits their exits** — a CMS save writes through
- a **covenant changes** what you may carry through

> ⭐⭐⭐ **Which makes "the last generation that knows what it is to be lost"
> a place you can walk into** — by declaration, as a property of somewhere,
> rather than a difficulty setting or a punishment.

### ⭐⭐⭐ And the peers rule makes it better, not worse

Universal aether coverage is settled and not negotiable. **But navigation
is not comms**, and the combination is the most interesting version:

> **You can always phone a friend. You just cannot tell them where you
> are.**

That is exactly the modern experience of being lost with a full signal bar.
And it gives the mutual-aid norm a new kind of teeth: *"come get me"*
requires **somebody else** to know where you are, which requires them to
have a map — **which makes cartography socially load-bearing** rather than
a convenience.

## 8. ⚠⚠ The map may not be a privileged reader

**If `look` would not show you an exit, the map must not either.**
Concealment bands, a hidden passage, an honest-fog seam — **discovery is
downstream of perception, not a parallel channel.** You record what you
perceived, through the same gate.

> ⛔ Otherwise the minimap quietly becomes the best search tool in the game
> and `search` stops meaning anything. ⚠ This is the default failure: a
> minimap that renders *"rooms adjacent to you"* has told you an exit
> exists before you found it.

## 9. ⛔⛔⛔ The index is a giant spoiler — so reveal is per EDGE KIND

The graph is the whole world. If a client ever receives it, discovery is
dead permanently. **The index never leaves the server** (A15, the evidence
firewall); a player's map is composed server-side from what they have
earned.

But *earned* is not one thing, and perception only covers one of four
channels:

| edge kind | revealed by | can it be wrong? |
|---|---|---|
| a **walking exit** | **perception** — you saw it | yes, if it changed |
| a **TPA route** | ⭐ **publication** — *a timetable is public*; the network advertises itself | yes, if a station went offline |
| a **told direction** | **somebody said so** | ⭐⭐ **yes — and they may have lied** |
| a **bought survey** | **a transaction** | yes, and that is the seller's reputation |

> ⭐⭐⭐ **Four reveal channels, four different trust properties, and three
> of the four can be wrong** — which is precisely why `belief.md` belongs in
> a mapping subsystem and why §6 refuses a read-time join.

⚠⚠ **And a told direction is the first edge in the graph that can be a
deliberate lie.** Perception goes stale, publication goes out of date, a
survey can be shoddy — but *"go north twice and you'll find the mill"* can
be **false on purpose.** [accountability.md](../../subsystems/accountability.md)
has no idea what to do with bad directions today. That is either a fine
social mechanic with a reputational cost on discovery, or a griefing
vector, **and which one it is depends entirely on whether the ledger can
attribute it.** Decide before the trade exists.

## 10. ⭐⭐⭐ Four wayfinding rungs — and they resolve the pathfinding slate

| epoch | where the knowing lives | what you get | built? |
|---|---|---|---|
| **prehistory** | **a person** | a guide who walks you there | ⭐ `patrols` |
| **medieval** | **a sequence** | directions, held and followed | ⭐ **`ways: [{to, go, back}]`** |
| **industrial** | **an object** | a map you read | **this build** |
| **modern** | **a service** | a route computed continuously | the pathfinder |

**Place → object → device → service** — the same shape as the aether-carrier
ladder ([content-declaration-slate § 5](./content-declaration-slate.md)),
and for the same reason: **both are about how far the knowing travels from
the place.**

> ⭐⭐⭐ **Three of the four already ship**, and this is what resolves
> [pathfinding-slate](./pathfinding-slate.md). That slate asks whether a
> shared pathfinder should exist at all, and notes that pets wanted
> **memory** and the shopkeeper wanted **authored directions** — treating
> those as unrelated answers that undercut the case.
>
> **They are not unrelated. They are rungs.** Which one a consumer wants is
> a function of what epoch it belongs to, so *"ask how far the consumer is
> actually going"* becomes ***"ask which rung the consumer lives on."*** The
> slate's census of one becomes a ladder of four — and **the shared thing
> underneath them is the GRAPH, not the search.**

⭐ So *"deliberately degrading capability"* is the wrong description: **it is
not a loss of function but a change of which function.** A medieval zone
does not lack navigation — it has directions instead of routes. **You still
get where you are going. What changes is whether you can be lost.**

## 11. ⭐⭐⭐ Instrument and coverage are two axes — and coverage is not an epoch

| axis | the question | whose property |
|---|---|---|
| **instrument** | *can I record and recall my position exactly?* | **mine** — the epoch of my kit |
| **coverage** | *has anyone already surveyed this?* | ⭐ **the place's** |

Epoch is already *"a stamp on the **instrument**, never on the act."*
**Coverage is the other half, and it is a state of the world produced by
labour.** Which is why the two arrived a decade apart in reality: consumer
GPS was the instrument rung; Google Maps and OSM were the coverage rung,
**and only the second one ended being lost.**

> ⭐⭐⭐ **So the cartography ceiling is `modern`. There is no future
> *instrument*.** `Epoch.ts` gives `future` a stated job — *"magic and
> future tech are one axis, so `future` is the last word"* — and the thing
> that feels like a further rung here is **coverage**, which should be a
> **derived per-locality fact**, not an epoch band.
>
> ⭐⭐ **Better than an epoch band, because it can be moved by players.** An
> epoch is a declaration; **coverage is an achievement**, and raising it is
> what the cartography trade is *for*.

### The intersection is the mechanic

```
                no coverage                      surveyed
modern kit   ⭐ you know your position to the     the ordinary
                metre and have no idea            modern world
                where to go
medieval kit    genuinely lost                   you have directions
```

**A perfect instrument over unsurveyed ground leaves you precisely located
and completely lost** — a real experience (full GPS in a country with no
road data), and *more* interesting than having neither, because you can
record your own wandering exactly and still not get out.

⭐⭐ It also makes the explorer's product legible: **you do not survey for
yourself, you survey to raise a locality's coverage**, and that is a thing
other people buy. *"Truly undiscovered country"* is the only place coverage
can go up.

## 12. ⭐⭐ Cartography is a trade, and maps decay

Because a map is a **document** rather than a view, it can be drawn,
carried, copied, sold, stolen, annotated, incomplete and **wrong**.

- **A cartographer's product is a better map than you could make
  yourself** — more complete, more current, or covering somewhere you have
  never walked.
- ⭐⭐⭐ **A map decays, because the world it describes is edited by other
  people.** Information with a shelf life is a **recurring-revenue good** —
  the same shape as spoilage — which gives the trade a reason to exist past
  its first sale.
- ⭐ **Two goods, not one:** the TPA schedule is **free, takeable,
  disposable and network-wide** (a published timetable with no author);
  a survey is **bespoke, owned and signed.** Both should exist.

### And the logistics pedagogy writes itself

`pathfinding-slate` already found the lesson: transport counts **legs**, a
walker counts **rooms**, a hauler counts **difficulty and mode**, *"and a
shared search has to take it as a parameter."*

> ⭐⭐ **Those are not three implementations — they are three objective
> functions over one graph**, and *choosing the cost function is the actual
> skill.* That is operations research's real content: a Discipline with a
> derivable right answer **once you have declared what you are
> optimising** — and the declaration is the part that is not derivable.
>
> Which puts it on the declaration form: **a hauler declares what they are
> optimising, and the measurement is whether the route they took matches
> it.**

## 13. ⛔⛔ Published / offline — and there is no staging layer

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

**Draft is a wall** because the alternative is the boot crash in §14.
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

## 14. ⭐⭐⭐ What this buys that nothing else does — graph invariants become lintable

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
- ⭐ no edge from published content into an unpublished parcel (§13);
- `bidirectional` edges actually reciprocal, and asymmetry **deliberate**;
- no room unreachable from its zone's entrance (the Spherical
  **reachability** check `map-slate` already owes, now computable);
- every cross-zone edge authored on both sides, which `boundary.md`
  requires and nothing currently verifies.

**This is the cheapest wave and it is worth shipping alone**, before any
renderer or router exists.

## 15. Authoritative or advisory

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
2. ~~**New collection, or the document tree?**~~ ⭐⭐⭐ **DECIDED** — **both,
   and they are different kinds of thing** (§6). The graph is **a new
   collection** (server truth, read-heavy, sharded by zone). A player's map
   is **the document tree** at `/home/<player>/map/<locality>` — it is
   *owner-scoped content with a place*, it **is** the discovery record, and
   there is **no read-time join** between them, because the join is what
   would make it impossible to be wrong.
3. **Cost model.** `edgeMinutes` exists on 85 edges today. `pathfinding-slate`
   notes transport counts **legs**, a walker counts rooms, a hauler counts
   difficulty and mode — so cost is a **parameter**, and `edgeMinutes` is
   one of several, not the one.
4. ⚠ **What offlines a parcel whose rooms are a warren host?** Evicting a
   host migrates the role; evicting the *whole warren* is a different act.
   The eviction path needs to know which it is doing.
5. ⚠⚠ **Can a told direction be a deliberate lie, and can the ledger
   attribute it?** (§9.) Perception goes stale and a survey can be shoddy,
   but *"go north twice and you'll find the mill"* can be **false on
   purpose**, and [accountability.md](../../subsystems/accountability.md)
   has no notion of bad directions. **A fine social mechanic with a
   reputational cost, or a griefing vector — and which one depends entirely
   on attribution.** Decide before the trade exists.
6. ⭐⭐ **How is `coverage` derived?** (§11.) It is an achievement rather
   than a declaration, so something has to move it — presumably a survey
   act whose output is a document, aggregated per locality. The open part is
   whether coverage is *one* number or **per-edge** (a surveyed road through
   unsurveyed country is the interesting case, and it is how real maps grew).
7. ⚠ **Time-dependent routing.** A scheduled TPA route makes the graph
   time-varying (§3), which is a materially harder search than Dijkstra.
   Options: route against *now* and re-plan on arrival, route against a
   departure window, or refuse to route through scheduled edges and let the
   player read the board. ⭐ The last one is cheapest and arguably the most
   honest — **it is what a traveller actually does.**
8. **Does `edgeMinutes` survive as the cost field,** given §12 says cost is
   an objective function rather than a number? It is on 85 edges and it is
   a *duration*; a fare is coin, a haul is mass×grade. Probably `edgeMinutes`
   stays as one term and the index carries the others beside it.
