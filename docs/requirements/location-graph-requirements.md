# The location graph — the world's shape, and what a player knows of it

**Kind:** feature
**Leads from:** kernel (first consumers, all shipped content: the
University Avenue crossing and its two-sided zone boundary, the Duncan
Hall dorm warren, the Hinkley Hills plat warren, and the TPA departures
board)

Everything in Saxonberg is lazy-loaded, so what the server holds at
runtime is only *what players have visited and what has not been reaped*.
There is no artifact anywhere that knows the shape of the world. This
build makes one — **a derived, persisted projection of every location and
its exits** — and then gives each player **their own copy of what they
know of it, which may be wrong.**

⭐⭐ **The two halves are deliberately different kinds of thing, and the
absence of a join between them is the mechanic.** The graph is the
server's complete truth and never leaves the server. A player's map is a
document they own, written when they perceive a place and never
re-reconciled against the truth. *A relational view would be silently
always-correct and you could never be wrong.* Join on read and **being
lost is deleted from the game.**

Executes `location-graph-slate` (UNBUILT, design agreed). Unblocks
`map-slate` (⛔ blocked on this — *"the renderer has nothing to read until
the index exists"*) and resolves `pathfinding-slate`'s standing question.

---

## What already exists

**Nothing shows a player more than the room they are standing in** — and
the survey of all 596 command rows found four partial exceptions, no real
one. `look` surveys where you are. `sense` is the **arrival** verb, and its
card is the closest thing today to a trail of places visited — *"the one
you left stays in the feed as the record of a place you were"* — but that
is a transcript artifact, not a model. `locate` walks a containment chain
and so names rooms you are not in, but answers *containment, never route*.
`journey`'s refusal already lists *"the places this road actually goes"*
from here. And bare `teleport` at a node renders the departures board —
*"a timetable is public, so it shows every route the node runs whether or
not you have registered them."*

⛔ **There is no `map`, `exits`, `where`, `compass`, `directions`,
`departures`, `route`, `navigate`, `explore`, `chart` or `wayfind` verb
anywhere in content.** Nothing answers *what is next to what* for more
than one hop, and nothing at all answers *where have I been*.

**Discovery ships, and it is per-EDGE by deliberate narrowing.**
`ConcealableMixin` is composed onto `Good`, `Creature` **and `Exit`** —
*"the three perceivable bases that cover the loose perceivables… a secret
door"* — and `search` already finds them. ⭐ But it is **deliberately not
on `Location`**: *"you cannot hide a floor… Concealment is a property of
something loose in a place; matter that IS the place has nothing to be
concealed from."* So **today you discover edges and never nodes**, and
that narrowing is right — which means discovering a *place* is a new
concept rather than a missing composition.

**The `DISCOVERY` belief realm is real, persisted and GC-exempt** (its
referent can be an exit's synthetic key with no live Stuff to reach). ⚠
But it is written by the **detection resolver**, never by arrival — so
*"I have been here"* is recorded nowhere. The frame store holds the
arrival frame as prose inside a 2,000-frame window, which is scrollback.

⚠⚠ **And the elastic world is unaddressable and undiscoverable today, by
decision.** The Warren chose the opposite of stable ids on purpose: *"**No
synthetic per-instance paths** — the instances keep their shared template
path, and the exits point at the specific live room directly"*, and its
rooms are *"runtime clones, gone on restart, recreated on the next
first-landing."* The documented cost is exactly this build's problem: an
exit whose source room has no durable template path has
`getDiscoveryKey() === undefined`.

⭐ **The elastic half therefore splits in two, and only one half is
solved.** `PlatPlan` (`lib/location/PlatPlan.ts`) is persisted topology
with a slot grammar in three shapes — `static`, `linear` (`f<n>-r<p>`) and
`branched` (`lot-<n>`) — four stateless reads, and `routeOf(nodeId)`
implemented at line 358. `HoldingWarren` stands its rooms up as **keyed
instances of real rows** (`scope` = the row, `key` = `<extent>/<leaf>`),
which replaced rowless minted paths precisely because those *"could not be
edited, addressed or resolved to a zone."* **That covers holdings. The
lounge-style procedural Warren has none of it.**

**Five graph walks ship, over five different graphs, and none knows about
the others** — `LaneCatalogue.planRoute` (a BFS per lane over the
mode-filtered exit graph), `LaneCatalogue`'s `byNode` induction,
`WatercourseCatalogue` (a compiled downstream *set*, not a walk), the TPA
cascade load, and `OuterWarren`'s circulation map. ⚠ **Every one compiles
its own edge set at runtime, in memory, from a seed, and is dropped on
reload. None survives a restart and none can enumerate.** The standing
decisions point away from a shared one: *"there is no general pathfinding
Api and should not be one yet"*, *"the zone is never an exit source"*,
*"the terminals already are the graph."*

**A zone guarantees less than it looks.** Three fields; same-size cells in
a `CartesianZone`; no implicit adjacency in a `SphericalZone`; and ⭐ the
one guarantee that matters here — **cardinals are intra-zone and a
non-cardinal label is accepted only when the destination resolves to a
different zone**, checked path-based without loading the room. That is
what makes a zone's interior griddable.

**The data is in better shape than the absence suggests.** Across 2,544
rows: 103 declare exits for 197 edges; **197 of 197** carry a literal
destination; **85 of 197** already carry `edgeMinutes`; **102 of 103**
carry `coords`. ⚠ `_address` is on 52 of 103 **and is not unique** — two
rows both claim `terminus/city/campus/duncan-hall`. `content` has only
`{path}` unique and `{extends}`: no zone index, no exit index.

**The document tree is the right home and its own criteria say why.**
`/home/<self>` is the personal workspace tier; `owner` is set from
context, never from the caller; and ⭐ the register-vs-record split is
stated as *"the record lives with its owner; the register lives on the
branch of the institution that keeps it."* A cross-cutting *every place in
the world* register **fails the document-store's own criterion** —
*"nobody holds title to it, so nobody can write it"* — which is
independently why the graph must be a collection and the map must not be.

⭐ **And the accumulating-personal-knowledge card already has a
precedent**: the `survey` card is pinned, not live, accumulates across a
walk, and is *"a **projection of the character's DISCOVERY beliefs**"* —
while its own comment disclaims being one: *"⚠ Deliberately **not a map
and not a minimap**: it is a LEDGER of readings."*

⚠⚠ **The reveal vocabulary exists and its gate must not be reused.** The
wiki ships two axes — capability *deletes* a fragment, appetite *tags* it —
over `SpoilerLevels.ofField` as the one seam. But `wiki.md` states flatly
that **appetite is not epistemics**, and calls reaching for a spoiler level
to model what a character knows a misuse. **Reuse the vocabulary; do not
reuse the gate.**

⛔ **No published, offline or draft concept exists anywhere.** The CMS
"draft" is an editor-local dirty buffer and *"a save adopts the draft as
the new persisted baseline"* — **saving writes through to the live
template** — and the overlay that would make staging cheap is explicitly
deferred.

⛔⛔ **So today a dangling exit is caught by crashing the boot.**
`crossing.yaml` says it in its own comment: exits *"eager-clone their
destination at boot… so the north gate points at a real loadable stub, NOT
a dangling path."* Because a save writes through, **an author can create
that crash and not meet it until the next restart.**

**Therefore what is genuinely new here is:** a persisted artifact that
knows the world's shape and can *enumerate* it · a stable node id for an
elastic room, where the Warren deliberately decided against one ·
discovery of a **place** rather than an edge, and a record of having *been*
somewhere · a claim that is allowed to be **wrong**, where every shipped
epistemic (honest fog, a bare `found: true`, last-writer-wins) tolerates
no error · an **awareness band attached to a claim** rather than used as a
pass/fail capacity term · a surface that **declines to merge** and shows
the disagreement · and publish-state as a queryable property of a place.

## Goals

- **The world's shape is a thing the server can read** without hydrating
  content and without scanning a collection — sharded by zone, rebuilt at
  boot, maintained at the single write chokepoint, and **droppable and
  rebuildable at any moment** because it is derived and never a source.
- ⭐⭐ **A player owns a map of each locality they know, and it can be
  wrong.** Written when they perceive a place, never re-reconciled. The
  map document **is** the discovery record — discovery stops being hidden
  server state and becomes something the player can look at.
- **One map per `(player, locality)`**, so knowledge of one place is
  giftable, sellable and copyable **without handing over everything you
  know**.
- **Four reveal channels with four different trust properties**, three of
  which can be wrong: you saw it · it was published · somebody told you ·
  you bought it.
- ⛔ **The graph never reaches a client.** A player's map is composed
  server-side from what they earned; the index itself is behind the
  evidence firewall.
- **An author learns about a broken exit from a check, not from a dead
  world.** Five graph invariants become reportable: a destination naming
  nothing, a non-reciprocal bidirectional edge, a room unreachable from
  its zone's entrance, a cross-zone edge authored on one side only, and
  an edge from live content into content that was never published.
- **Content can be taken down honestly.** Draft content is a wall; offline
  content evicts the people inside, refuses the exits that pointed in, and
  **tells the owner of those exits that their content just lost a
  destination** rather than failing silently.
- **Finding something hidden in one instance of a room does not reveal it
  in every other instance** — the defect this build fixes.
- **Hierarchical pathfinding becomes possible for free** for whoever
  builds it: the inter-zone skeleton is one indexed query and is tiny.

## Non-goals

- **The map renderer, and the card it lives in.** ⛔ A client build,
  separately blocked on an icon set the client does not have (measured
  2026-10-01: no icon library, two client files with inline SVG). ⚠ And
  `CardId` is a **closed eleven-word union**, so the card is a platform
  edit on the same footing as a document kind. **Destination:**
  `map-slate` (which already resolved it as a *zone navigation* card — SVG
  grid, compass rose, interzone list, honest-state panel) +
  `iconography-slate` + `client-vocabulary-slate`.
- **A second reveal model.** ⚠⚠ The wiki's two axes are reader
  **permission** and reader **appetite**, and `wiki.md` says plainly that
  *appetite is not epistemics*. A map's channels are character knowledge,
  which is a different question — so this build reuses the **vocabulary**
  and not the **gate**, and does not extend `SpoilerLevels`.
  **Destination:** `spoiler-slate`, whose unbuilt half is server-side
  fact-gating in the percept projection, to be coordinated with rather
  than duplicated.
- **The router / pathfinder.** This build supplies the graph, not the
  search. **Destination:** `pathfinding-slate`, with
  `location-graph-slate § 18`'s requirement attached — ⭐ *the router must
  plan on the player's map rather than on the world*, because an
  omniscient router is a worse spoiler than a minimap, and because then
  *"the route states its assumptions"* is free: **the assumption list is
  the diff between the two plans.**
- **Cartography as a trade, map decay, and the map market.** The document
  shape must not preclude them. **Destination:**
  `location-graph-slate §§ 12, 17`.
- **A told direction being a deliberate lie, and attributing it.** ⚠ The
  one reveal channel that can be *false on purpose*;
  `accountability.md` has no notion of bad directions, and whether this
  is a fine social mechanic or a griefing vector depends entirely on
  attribution. **Destination:** `location-graph-slate § 9` +
  `accountability.md`, to be decided before the cartography trade exists.
  **This build ships the channel's shape and no way to author a claim into
  somebody else's map.**
- **A draft/staging overlay.** There is none, and this build does not
  invent one — which is exactly why publish-state is a flag rather than a
  layer. **Destination:** `cms.md`'s deferred changeset model.
- **Live indexing of the occupancy warren.** It would mean runtime writes
  to a derived store that can then lie after a crash. The declared hole is
  honest and cheaper; it stays reflected at query time. **Destination:**
  nowhere, deliberately — recorded as a lean in the slate.
- **Anything else on `ParcelRecord`'s model** — ceilings, covenants,
  obligations, improvement, the allowance meter. ⚠ `published` is in (see
  surface decision 6) and it is **one field, not an opening**.
  **Destination:** the parcel-model design pass.

---

## Placement

**Kernel**, and it has to be: the graph's consumers are the boot, the
write chokepoint, the lints, the perception framework and the document
tree — none of which a pack may own. `NavigationApi` already exists as the
string-keyed direction surface and is the natural home; the index is keyed
on **paths, not Stuff**, which is also why it does not trip the
verbs-on-objects rule the way a `pathFrom(room, …)` shape would.

The graph is **its own collection** — read-heavy, write-rare, sharded by
zone. A player's map is **the document tree** at
`/home/<player>/map/<locality>`, which passes the document-tree test
exactly (*owner-scoped content with a place*) and inherits the title gate,
path-addressing and findability for nothing. ⭐ And a bought map is the
same kind of document at a different owner's path, so **a cartographer's
inventory, a player's own map and a published timetable are one document
kind with three provenances.**

⭐ **The placement test:** a second locality needs zero code — its nodes
project from its rows, its players' maps appear at their own paths. A
second *edge kind* (a conduit, a lane) needs a declaration and no new
store.

---

## Collisions

- **University Avenue's crossing** — the exemplar of *"two
  independently-owned zones that touch"*, and the row whose own comment
  documents the boot-crash failure mode. It is the first thing the
  cross-zone invariant checks.
- **Duncan Hall's dorm warren** — multi-instance rooms sharing one
  template, so it is both the elastic-graph case and ⭐ the place the
  discovery defect actually bites: a secret found in one dorm room
  currently reads as found in all of them.
- **Hinkley Hills** — a `PlatWarren` whose lots are generated under an
  operator dial, so nodes must come from the **plan** rather than from
  rows, and a map must remember **the slot, not the occupant**: *"I have
  been to lot-7"* survives lot-7 being reaped and re-minted.
- **The lounge satellites** — ephemeral by design, no minted identity, and
  ⭐ `undefined` is the **right** discovery answer for them: a secret found
  in a satellite should not stick.
- **The TPA board and its nodes** — the publication channel's only
  existing consumer, and the first time-varying edge (a fare, a wait, a
  timetable, a per-player gate).
- **The ford** — `FordExit` already sets a `blocked` bit from a cached
  water reading, so a conditional edge exists and the graph must represent
  a dropped edge rather than pretend it is gone forever.
- **`beliefs` and `player_frames`** — the two stores a personal map must
  *not* live in: frames are a retention window and not an archive, and
  beliefs are identity memory. ⭐ The division to hold: **the map remembers
  places; belief remembers who is behind the door.**
- **`distance-perception-slate`'s problem** — ⭐ the closest conceptual
  neighbour, and it names the rot this build is the cure for: *"rooms have
  no fixed spatial relation beyond exits… so everything 'seen at a
  distance' today is hand-painted prose that can rot silently — **the
  Duncan steps described a quad that didn't exist**."*
- **The cut `place` card** — the card catalogue once had a second row for
  rooms and it was removed, because every surviving difference was a
  *lifetime* or *layout* decision rather than an identity. ⚠ And
  `locationDependent` was deleted from `CardSource` along with it, with
  the note that *re-resolve when the viewer moves* is a **relative query**,
  not an inspection card. A navigation panel is a relative query, and the
  underlying wake still exists — so this build must not resurrect the card
  shape that was correctly cut.
- **The `survey` card** — the shipped precedent for pinned, accumulating,
  per-character knowledge projected from `DISCOVERY`, which explicitly
  disclaims being a map. Whatever a map document renders into should look
  like its sibling, not its replacement.
- **`play`'s empty default arrangement** — ⭐ deliberately empty, because
  *"an arrangement names a card KIND while an inspection card is ABOUT a
  subject the arrangement cannot know."* There is a hole exactly where a
  navigation panel goes, and it is the renderer build's to fill.
- **The CMS save path** — the single write chokepoint the index is
  maintained at, and the path by which an author can currently author a
  boot crash.

---

## Surface decisions

### 1. The graph is the server's truth; a player's map is a document — and they never join

**The question.** One store with a per-player view, or two stores?

**The answer.** Two, and no read-time join. On arrival the server reads
the graph and projects **the nodes that player perceived** into their
document. On a map read the server serves **the document** and never
consults the graph.

**The reasoning, and it is the whole build:** *"A relational view would be
silently always-correct and you could never be wrong. A copied document
rots — and rot is the feature."* Being lost is a false belief, not an
absence, and a join deletes it.

### 2. The map document IS the discovery record

**The question.** Does discovery need its own per-player store beside the
map?

**The answer.** No — what you have discovered *is* what is in your map.
One artifact, and discovery stops being hidden server state and becomes
something the player owns and can read.

### 3. Four reveal channels, and three of them can be wrong

| channel | revealed by | can be wrong |
|---|---|---|
| a walking exit | **perception** — you saw it | yes, if it changed |
| a TPA route | **publication** — a timetable is public | yes, if a station went dark |
| a told direction | **somebody said so** | ⚠ yes, and they may have lied |
| a bought survey | **a transaction** | yes, and that is the seller's reputation |

A claim carries **its channel and an awareness band**, not one date for
the whole document — so a map is many claims of differing age and
provenance rather than a single snapshot.

### 4. Do not merge — render the disagreement

**The question.** When two claims about the same place conflict, which
wins?

**The answer.** Neither. ⭐ Show the disagreement. A merge algorithm picks
a winner and hides that it did, which turns a knowledge model back into a
truth model; and *"who was there more recently"* dissolves anyway once a
map is many claims rather than one document with one date.

### 5. One map per (player, locality)

So that knowledge of one place can be given, sold or copied **without
handing over everything you know** — which is the only way map-selling can
work. And a bought map is the same document kind at a different owner's
path.

### 6. `published` lives on the parcel — one field, and it earns its place

**The question.** Where does publish-state live, given there is no staging
layer to put it in?

**The answer.** A flag, on the parcel. ⭐ It inherits an authority model,
an appeal route and an audit trail that **all already exist** — title,
chain-of-title, and the path gate — rather than minting a new authority
for *"may I take my content down."* And because there is no staging,
"unpublished" cannot mean "exists only in staging": a flag is not one of
two options, it is the only available one.

⚠ **Recorded honestly:** this is one more piecemeal field on a record that
already carries thirteen, with `allowance` inert and `area` declared
rather than derived. That pattern is real debt and the parcel-model design
pass inherits it. The field is defensible on its own terms — it is a
**readiness declaration about content**, not a regulation on land — and
that is the only reason it is in.

### 7. One field, two lives: draft is a wall, offline is a camera

| state | who is inside | what happens |
|---|---|---|
| **draft** — never been live | nobody, by construction | ⭐ an exit into it **refuses** |
| **offline** — was live, now dark | **possibly people** | exits stop working, people inside are **moved out**, and the boundary is **reported to whoever owns the rooms that pointed in** |

Draft is a wall because the alternative is the boot crash. Offline needs
an eviction path, and the honest form of one is a self-describing
tombstone that names the missing place, says who to report it to,
guarantees a way out, and removes itself once nobody is inside.

### 8. The lint checks one direction only

⭐ **`published → unpublished` is a dangling edge waiting to happen;
`unpublished → published` is harmless** — a draft zone pointing out at the
live world is how it attaches when it lands. So the check runs one way,
and the reverse-edge index serves it directly.

### 9. The discovery key must read identity, and the fix is not one word

**The question.** An exit's discovery key currently reads
`getTemplatePath()` unconditionally, so finding a secret door in one
instance reads as found in **every** instance for that player — the same
bug class that cost a shared bank account.

**The answer.** Key on the **minted identity**, and `undefined` when there
isn't one. ⚠ Swapping in `getIdentityPath()` is *not* the fix: it falls
back to the template path when no identity was minted, so it would hide
the collision instead of removing it. What is needed is a way to ask for
*the minted identity specifically, null when absent* — which does not
exist today, and is plausibly why the original author reached for the
lineage path and wrote a comment they wished were true.

⭐ And `undefined` is the **right** answer for an ephemeral satellite: a
secret found in a lounge room that is gone on restart should not stick.

⚠⚠ **This is a code trace, not a run.** No test covers the multi-clone
exit case, and this bug class has escaped the suite twice before — both
times found *by driving the world*. It gets a test that fails first.

### 10. The map is a runtime-written RECORD, so it survives the night

**The question.** The nightly reset is `wipe-except / keep:
declared-document-kinds` — does a player's accumulated map survive it?

**The answer.** Yes, and it must, and the schema already says on what
grounds. `documents.yaml` splits the kept kinds into *"pack-installed
world content, reference data not player state"* and ⭐ *"the
**RUNTIME-WRITTEN record kinds** (water rights, bills of lading, warehouse
receipts, rate cards) — **a record of something that happened, which
nothing may erase because a night went by.**"*

A map is unambiguously the second. You went there; a night passing does
not un-go it. So the new document kind lands beside the water right, with
that reason written into the schema doc rather than inherited silently.

⚠ And `DocumentKinds` is a **closed vocabulary** — *"a kind needs a code
consumer and a go-live hook… a capability pack cannot declare one"* — so
adding it is a deliberate platform act, which is the gate working.

### 11. The elastic half splits, and only holdings are solved

**The question.** The slate says the elastic graph is mostly authored
already. Is it?

**The answer.** Half. `PlatPlan` plus `HoldingWarren`'s keyed instances
give **holdings** a durable slot and a real row — so Duncan Hall and
Hinkley Hills project nodes from the plan. But the lounge-style
**procedural** Warren deliberately has no stable id (*"no synthetic
per-instance paths"*) and its rooms are gone on restart, which is also why
their exits have no discovery key today.

⭐ So those rooms stay **out of the graph and reflected at query time**,
and that is the honest answer rather than a gap: indexing a room that will
not exist after a restart would be a derived store that lies. A player's
map of a lounge satellite is correctly nothing.

### 12. The graph is derived, so it is never a source

Rebuilt at boot, maintained at the write chokepoint. A disagreement with
the templates is a **bug, not a state**; it must be droppable and
rebuildable at any moment. 2,544 rows is nothing to walk.

---

## Lens pass

1. **Pedagogy** — what it teaches is **the map is not the territory**, and
   it teaches it by letting you be wrong: knowledge has a provenance, an
   age and a channel, and a claim can be stale, second-hand or sold to you
   by someone careless. Everything is derivable — coverage comes from what
   you recorded, cost from edges the content already carries, the
   inter-zone skeleton from the graph. ⚠ **The gap: no Discipline is
   exercised.** No cartography or surveying Discipline ships, and this
   build deliberately does not add the trade that would own one, so there
   is no band and no transcript entry here. Recorded rather than filled.
2. **Expression** — the ordinary case needs **no code and no new
   authoring**: you declare exits exactly as you do now and the graph
   derives. What an author gains is that their mistakes are **reported
   instead of fatal**, which is the expressive win — the current state of
   affairs is that a wrong destination kills the world at the next
   restart. The bespoke case is a zone declaring which wayfinding rung it
   offers, so a medieval place has directions where a modern one has
   routes. ⭐ **Fork decided by this limb:** the invariant check ships
   **first and alone**, before any store or renderer, because an author
   being told what they broke is worth more than anything else here.
3a. **Immersion** — the strongest heading in the pass, and the reason the
   design is shaped the way it is. **The fiction cannot betray itself in
   two places:** the index must never reach a client, or discovery is dead
   permanently; and the map must never silently correct itself, or being
   lost is impossible. Both are structural here rather than enforced by
   discipline — the firewall is a rule about what crosses the wire, and
   the absence of the join is the absence of a mechanism.
3b. **Participation** — it opens the role of **the person who knows the
   way**: a guide, a surveyor, a seller of maps, and the friend who tells
   you to go north twice. ⭐ *Can the polity do something we did not want?*
   Yes, and it is the sharpest version in any slate I have read: **a
   player can tell you something false about geography.** That is either a
   real social mechanic with a reputational cost or a griefing vector, and
   this build ships no way to author a claim into somebody else's map
   precisely because the answer isn't decided.
4. **Values** — the undecidable choice is **whether a player may lie about
   the world**, and the design refuses to answer it by mechanism: it
   builds the channel's shape and withholds the ability to use it until
   attribution exists. ⚠ The honest gap: that defers the question rather
   than deciding it, and a deferred channel has a way of arriving as a
   surprise. Written down so the cartography build meets it on purpose.
5. **Continuity** — ⭐⭐ this build *is* the epoch model for wayfinding:
   **place → object → device → service**, where the knowing lives in a
   person, then a remembered sequence, then an object you read, then a
   service computed for you. Three of the four already ship. So a medieval
   zone does not *lack* navigation — it has directions instead of routes,
   and the same commands answer in both: *where am I, how do I get there,
   what do I know about it.* **What changes across the epoch is only
   whether you can be lost.**
6. **Economy** — it **produces** a good that is genuinely new in kind: a
   map is a document, so selling a survey is *copying a document between
   branches*, and it is the first intangible with a provenance that
   affects its worth. It **consumes** a surveyor's attention and pace —
   recording effort is already shipped as the pace model, so there is no
   new friction to invent. ⭐ The demand is unambiguous and predates
   everything: there are 72 locations against thousands needed, and
   **nothing in the game today tells a player where anything is.**
7. **Governance** — publish-state is the only part that judges, and it
   judges **content, not people**: the criterion is ownership, resolved by
   title and the existing path gate, with the appeal route and audit trail
   that already exist. ⭐ The one genuinely new obligation is **outward**:
   taking your content offline breaks somebody else's exits, so the design
   requires that they be *told* rather than silently broken — an
   obligation to neighbours, which is the right shape for a governance
   answer about property. ⚠ And the told-direction lie is where this would
   judge a person; it is deferred with its reason, and when it lands it
   needs a criterion, an appeal and an entrenchment tier.

---

## The drive

Ten steps, run against the live game before the MR opens.

1. **A broken exit is reported, not fatal.** As a wizard, author an exit
   whose destination does not exist. Run the check: it names the row and
   the direction. Then restart the world — **it boots.** Today this is a
   boot crash an author cannot see coming.
2. **A one-way exit is surfaced as a question.** Author a `bidirectional`
   exit the far side does not reciprocate. The check reports the asymmetry
   so an author can say whether they meant it.
3. **A cross-zone edge authored on one side only is caught** — at the
   University Avenue crossing, the exemplar of two zones that touch, which
   `boundary.md` requires and nothing verifies today.
4. **You have a map of where you walked, and nothing else.** As a new
   player, walk the arrival gate → the crossing → the campus gate. Open
   your map of Terminus: three places and the edges you used. Nothing you
   did not see.
5. **An unvisited locality says so.** Open your map of Hinkley Hills,
   having never gone. It tells you that you have no map of it — rather
   than rendering as an empty place.
6. **Published knowledge reads differently from walked knowledge.** The
   TPA board lists Hinkley Hills. It appears on your map **marked as
   published**, distinguishable from somewhere you have been.
7. ⭐ **Your map can be wrong, and the world does not fix it.** Have a
   wizard wall up an exit you have walked. Open your map: the old exit is
   still there. Walk it: it is gone. The map was wrong, nothing corrected
   it behind your back, and the disagreement is visible once you look
   again.
8. ⭐ **A secret found in one room is not found in all of them.** Discover
   a hidden exit in one Duncan Hall dorm room. Go to another dorm room
   from the same template: its hidden exit is **still hidden.**
9. **Taking content down is honest.** Offline a zone with somebody inside:
   they are moved out, the exits that pointed in refuse with a reason, a
   tombstone names the missing place and who to tell, and the owner of the
   pointing rooms is notified that their content lost a destination. Then
   try to walk into a **draft** zone: refused, not crashed.
10. **The graph does not leave the server.** Drive the client and inspect
    what crosses the wire while opening a map: nothing in it names a place
    the player has not earned.

---

## Acceptance criteria

Observable from outside the code.

1. An author who writes a destination that does not exist is told which
   row and which direction, **before any restart**.
2. The world boots with a dangling exit present in content.
3. A non-reciprocal bidirectional edge, a room unreachable from its zone's
   entrance, and a one-sided cross-zone edge are each reported to their
   author.
4. A player can open a map of a locality and see exactly the places they
   have been and the edges they used — no more.
5. A map of a locality the player has never visited tells them so.
6. A place known only from the departures board appears on the map marked
   as published knowledge, distinguishable from a place they walked.
7. When the world changes under a player's map, **the map keeps the old
   claim** until they next perceive the place, and the two can be seen to
   disagree.
8. Finding something hidden in one instance of a multi-instance room does
   not reveal it in any other instance, for that player or anyone else.
9. A hidden thing found in an ephemeral room does not persist past the
   room.
10. Offlining content moves the people inside out, refuses the exits that
    pointed in with a reason that names the missing place, and tells the
    owner of those exits.
11. An exit into never-published content refuses instead of crashing the
    boot.
12. Nothing a client receives while reading a map names a place the player
    has not earned.
13. A map document can be copied to another player's tree and read by them
    as their own — and copying one locality's map hands over nothing about
    any other.
14. A player's map of a generated lot survives that lot being reaped and
    re-minted: *"I have been to lot-7"* still reads true.
15. A player's map survives the nightly reset. Walk somewhere, let the
    reset run, and the map still says you were there.
16. A player's map of a lounge-style procedural room is honestly nothing,
    rather than a stale entry for a room that no longer exists.
17. ⭐ A second locality and a second player need no engine change for
    either to have a map. The build is not done until somebody
    demonstrates it.

---

## Cross-references

**Seeding slate** — `location-graph-slate` (primary; UNBUILT, design
agreed)

**Unblocked by this** — `map-slate` (⛔ blocked on the index; then a
client build, itself blocked on `iconography-slate`) ·
`pathfinding-slate` (this supplies the graph, the cost field and its
third consumer; §18 carries the requirement that the router plan on the
player's map)

**Subsystem docs** — `location.md` (Warrens, `PlatPlan`, `routeOf`) ·
`zone.md` · `boundary.md` (two-sided cross-zone edges) ·
`perception.md` + `concealment.md` (the `DISCOVERY` realm, the pace
model) · `belief.md` (identity memory, and the line against the map) ·
`document-store.md` (`DocumentKinds`, the path gate) ·
`record-layer.md` (`player_frames` as a window, not an archive) ·
`fasttravel.md` (the board, and publication as a channel) ·
`logistics.md § Routing` (the standing no-pathfinder decision) ·
`parcel.md` (title, chain-of-title, the authority `published` inherits) ·
`cms.md` (the write chokepoint; the absent draft overlay) ·
`watershed.md` (compiled reachability as prior art) ·
`accountability.md` (what a told-direction lie would need)

**Related requirements in flight** — `premises-requirements` (unagreed;
shares nothing but the parcel, and deliberately does not touch
`published`)
