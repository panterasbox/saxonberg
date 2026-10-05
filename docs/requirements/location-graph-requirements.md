# The location graph — the world's shape, what a player knows of it, and telling one room from another

**Kind:** feature
**Leads from:** kernel — ⭐ and **its first consumer ships in the same
build**: Stage A's addressing substrate is proved by Stage B's player map,
over the shipped University Avenue crossing, the Duncan Hall dorm warren,
the Hinkley Hills plat warren and the TPA departures board.

Everything in Saxonberg is lazy-loaded, so what the server holds at
runtime is only *what players have visited and what has not been reaped*.
There is no artifact anywhere that knows the shape of the world. This
build makes one — **a derived, persisted projection of every location and
its exits** — and gives each player **their own copy of what they know of
it, which may be wrong.**

⭐⭐ **The two halves are deliberately different kinds of thing, and the
absence of a join between them is the mechanic.** The graph is the
server's complete truth and never leaves the server. A player's map is a
document they own, written when they perceive a place and never
re-reconciled against the truth. *A relational view would be silently
always-correct and you could never be wrong.* Join on read and **being
lost is deleted from the game.**

---

## ⭐⭐ Two stages, one build — and why they are not two builds

**Stage A — instance addressing.** The world cannot tell one dorm room
from another. ⛔ The registry index keys on `identity ?? template`, so it
answers *"find the thing called X"* and *"find every clone of row Y"* out
of one bucket and **the second question silently loses wherever an
identity is minted** — `findAllByTemplatePath('/platform/agent/PrimaryAvatar')`
returns nothing, and `assertUniqueKey` is **inert for every stamped keyed
host.** Executes `instance-addressing-slate`.

**Stage B — the graph, and the map you own.** The projection, the
invariants as a check, publish-state, and a per-player map document that
can be wrong. Executes `location-graph-slate`.

> ⭐⭐⭐ **Why one build.** Stage A has **no observable acceptance of its
> own.** *"The index answers two questions"* is not something a player can
> see, and this project's standing rule is that a kernel-led build must
> name the consumer that will exercise it or admit it is premature. Stage
> B is that consumer, and it turns the substrate into something a player
> can check: *find a secret door in your dorm room, and the one next door
> is still hidden.* Shipped apart, Stage A's acceptance would be a test
> pointing at itself.

⭐ And Stage B needs Stage A rather than merely benefiting from it: the
graph's node key, the discovery key and the map's claim key are all *"the
durable handle of this instance"*, which is the thing Stage A names.

### What this leaves blocking the rendered map: nothing of ours

The SVG zone-navigation card is **out** (see non-goals), and it is out
because it waits on the **client's** own debt — an icon set that does not
exist (*"the minimap is already blocked on it"*) and `CardId` being a
closed eleven-word union. Neither is addressing and neither is the graph,
and including the renderer would mean doing two further client builds.

⭐ So when this build lands the map is **usable, not merely possible**: a
`map` verb that reads in prose to yourself, accumulating, fallible,
surviving the nightly reset and giftable. The renderer is a presentation
upgrade with no dependency on anything here.

---

## What already exists

### Stage A — the addressing half

⛔⛔ **The uniqueness invariant is inert for every host that has an
identity.** `api/stuff.ts:230` keys the registry on
`Stuff._identityStampOf(obj) ?? obj.getTemplatePath()` — *"deliberately
the raw slot, never the overridable method"* — and `findAllByTemplatePath`
reads that bucket with `exact()`. So a **stamped** instance is filed under
its identity rather than its row, and three things follow, all live:

- no read enumerates every instance of a row whose instances are stamped
  (⭐ the index *can* — `PathTrie` ships `glob`; nothing asks it to);
- ⛔⛔ `assertUniqueKey`'s scan needle is `scope = getIdentityPath()`, so
  for a stamped host the bucket holds only itself — which the scan skips.
  **The market stall counter is both stamped and keyed, so the invariant
  stopping it from clobbering its own record has never been able to
  fire.** It works where identity is absent and is inert where it is
  present, which is backwards;
- `liveKeyed` fails identically, reporting *"not standing up"* so a caller
  mints a duplicate.

**`stuffId` already is the non-durable unique instance id** — *"a fresh
`uuid()` per construction, not persisted"*. **And the durable
per-instance handle already exists too**, as `placeIdOf`'s
`` `${scope}#${key}` ``, guarded on `isPersistenceKeyExplicit()`, with
`Exit`'s own discovery key using the same `#` joiner. ⚠ What is missing is
that the handle has no sanctioned name, so consumers reach for identity
instead.

**Identity is minted by six sites in six improvised shapes**, and
`asIdentityPath` is typed `string` with no assertion, no prefix check and
no scheme. **Keys come in three shapes**: `<the manager's own key>/<leaf>`
for warren rooms (⭐ relative, as it should be — the absoluteness is
inherited from the manager's key being a parcel extent), a bare `uuid()`
for plants and named animals (honest; no manager), and ⚠ an **Avatar
identity path** for the market stall, which says *who rents it* rather
than *which stall it is*.

⚠ **And the obvious fix already shipped once and was reverted.**
`smallholding.md`: a synthesized `<lotExtent>/<leaf>` path *"made the
room's `templatePath` resolve to **no row at all**. A rowless path cannot
be edited by an author, cannot resolve a zone from its ancestry, and
cannot be hydrated from content… The channel is **deleted**."*

### Stage B — the graph half

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
carry `coords`. `content` has only `{path}` unique and `{extends}`: no
zone index, no exit index.

⭐⭐ **And `_address` is not unique — which is the concept working, not a
defect.** Four rows (Duncan Hall's lobby, corridor, steps and dormroom)
all author `_address: terminus/city/campus/duncan-hall`. The slate records
the duplication as a data problem and that reading is wrong: `_address`
names *where the room is*, and where it is, is the **building**. Four
rooms agreeing is four rooms correctly declaring membership in one
structure, by hand, in content. Uniqueness was never promised because it
was never a room identifier. See surface decision 12.

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

### Stage A

- ⛔ **The uniqueness invariant covers the hosts that have an identity.**
  `assertUniqueKey` scans by the **row**, not by the host's own identity,
  so it stops being inert for stamped keyed hosts. ⭐ The registry's
  keying does not change.
- **The world can enumerate every instance of a row** — a read the index
  can already serve, because individuation handles are row-prefixed.
- ⭐⭐ **An identity path exists iff it is DURABLE.** Ephemeral instances
  get `stuffId` and no identity at all — which is what `stuffId` is for.
- ⭐ **A keyed instance's durable handle has one sanctioned read**, of the
  form *row **plus** decoration*, so nothing has to reach for identity to
  ask *which one*.
- **A continuity identity is minted into a namespace its family declares**,
  validated rather than improvised.
- **A key is relative to whatever manages the instance** — including the
  market stall, which today keys on its renter.
- **No player can be addressed into existence to resolve ambiguity.** ⭐ If
  two things match, you get a list and you choose. The design does not get
  clever here.

### Stage B

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

- **The map RENDERER, and the card it lives in** — ⭐ and this is the
  only thing standing between this build and a rendered map, which is why
  it is named precisely. ⛔ It waits on the **client's** own debt, not on
  ours: the direction/elevation icon set does not exist (`iconography-slate`
  records that *"the minimap is already blocked on it"*, measured — no icon
  library, two client files with inline SVG), and `CardId` is a **closed
  eleven-word union** whose slate calls itself *"the hinge five other
  things hang off."* Including the renderer means doing both of those
  builds too. **Destination:** `map-slate` (which already resolved the
  design — a *zone navigation* card: SVG grid, compass rose, interzone
  list, honest-state panel) + `iconography-slate` +
  `client-vocabulary-slate`.
  ⭐⭐ **What ships here instead is a `map` verb reading in prose to
  yourself**, so the map is usable and not merely possible — and the
  renderer, when it comes, reads an index that is already there.
- **Splitting the registry index.** ⭐ Considered and refused — see
  decision 9b. The keying is correct; a scan needle and a missing read
  were the defect, and splitting it would have broken
  `findByTemplatePath`'s singleton guardrail and every stored-key
  round-trip for nothing. **Destination:** nowhere, deliberately.
- **Retiring `getIdentityPath()`'s default-to-template.** It answers *who
  do I act as*, which always has an answer; ~200 readers depend on it and
  the ones that matter resolve a stored key through the index. Stage A
  changes the **index**, not the method. **Destination:**
  `instance-addressing-slate` open question 3.
- **A per-instance addressing surface for players** — naming a specific
  clone on the command line. ⛔ Refused on principle: `stuffId` exists for
  machine targeting, and ambiguity resolves to a list the player picks
  from, which already ships. **Destination:** nowhere, deliberately.
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
- **Structures — a building as a thing.** ⚠ Four rooms already declare
  membership in Duncan Hall by address, so the *declaration* exists and
  nothing reads it. This build reads it as a grouping key (decision 12)
  and does **not** mint the concept. **Destination:**
  `structures-slate`, whose own justification test is *"something must be
  true of a SET of rooms that no room can decide alone"* — and whose
  passing candidates are overwhelmingly **fire, weather and vertical
  space** (a shared roof, a flue serving two hearths, warm air rising from
  the taproom), which makes a thermal build its natural owner rather than
  a mapping one. ⭐ One candidate on that list *is* this build's business
  and is noted for it: *"Entrances — which door is **the** door, for
  wayfinding."*
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

### 9. The discovery key reads the HANDLE, not the identity — and the handle is row-plus-decoration

**The question.** `Exit.getDiscoveryKey()` reads
`source.getTemplatePath()` unconditionally, so finding a secret door in
one instance reads as found in **every** instance of that row for that
viewer — the same bug class that cost a shared bank account. What should
it read?

**The answer.** The instance's **durable handle**, not its identity. And
the handle is the **row plus a decoration**, joined so the two stay
separable: `` `<row>#<key>` `` for a host with an explicit persistence
key, and `undefined` when there is no durable key at all.

**The reasoning, and it is the build's spine.** The template path is the
*substance* of a keyed instance's identity — it is how you find the row,
the backing class and the hydration content. What the warren contributes
is *decoration*: it says **which one** and nothing about **what it is**.
⭐ A `/` join pretends the decoration is a path segment and **loses the
row**, which is exactly why the synthesized-path channel was deleted. A
`#` keeps them separable — and `placeIdOf` already computes precisely
this, guarded on an explicit key, with `Exit`'s own key already using that
joiner.

⭐ And `undefined` is the **right** answer for an ephemeral room: a secret
found in a lounge satellite that is gone on restart should not stick.
That falls out of *no durable key*, rather than being a special case.

⚠⚠ **This is a code trace, not a run.** No test covers the multi-clone
exit case, and this bug class has escaped the suite twice before — both
times found *by driving the world*. It gets a test that fails first.

### 9a. An identity exists iff it is durable; `stuffId` covers the rest

**The question.** Should an ephemeral instance — a lounge satellite, a
runtime clone — get an identity that differs from its row?

**The answer.** No. `stuffId` is already *"a fresh `uuid()` per
construction, not persisted"* — a non-durable unique id for an instance,
which is exactly the job. Minting an identity that will not survive a
restart buys nothing and makes two mechanisms mean the same thing.

⭐ So the lounge Warren's *"no synthetic per-instance paths"* was right
and changes nothing. And the player-facing consequence **is** the design
rather than a fallback: if a thing cannot be named, you get **a list of
matches to choose from**, which already ships as disambiguation. ⛔ The
build may not invent per-instance addressing to avoid that.

### 9b. The index was fine — the SCAN was asking the wrong question

**The question.** The registry keys on `identity ?? template`, so a
stamped instance is filed under its identity and not its row. Does the
index need splitting?

**The answer.** No. ⭐ **Nothing about the registry's keying changes.**
What changes is one needle and one read.

**The needle.** `assertUniqueKey` and `liveKeyed` scan with
`scope = getIdentityPath()`, so for a stamped host the bucket holds only
itself — which the scan skips. **They must scan by the ROW.** That single
change is what makes the invariant cover a stamped keyed host (the stall
counter, never covered) instead of being inert for exactly the hosts that
have an identity.

**The read.** An honest *every instance of this row* surface, which the
index can already serve: `PathTrie` ships `glob` and `longestPrefix`
beside `exact`. ⭐ And it works because **individuation handles are
row-prefixed by construction** — decision 9's substance-and-decoration
rule showing up as an index property:

| | filed under | found by `<row>` prefix |
|---|---|---|
| an unstamped clone | the row | ✓ |
| a warren room (keyed, unstamped) | the row | ✓ — ⭐ which is *why* the invariant works for them today and nowhere else |
| the stall (keyed **and** stamped `${STALL_SEED}/<leaf>`) | its row-prefixed identity | ✓ |
| ⛔ an Avatar (continuity) | `/platform/agent/Avatar/<playerId>` | ✗ — the row is not a prefix |

⭐⭐ **And the one case a prefix cannot reach costs nothing, because
continuity subjects are ROSTERED rather than discovered.** `PlayerApi`
already keeps the avatar register (`registerAvatar` /
`unregisterAvatar` / `findAvatarByPlayerId`). *Find every avatar* is a
register read — a family's membership is a known set, not something you
discover by prefix — and it was never the index's job.

⭐ **So `findByTemplatePath`'s "expected singleton, found N" guardrail is
untouched**, and so is every `findByTemplatePath(<stored identity key>)`
round-trip, which keeps resolving through `exact()` exactly as today.
And `findByIdentityPath` returning an **array** is free: it is `exact()`
on the same trie — one hit for a minted identity, N for unstamped clones
sharing the template fallback.

⚠ **Recorded because it was nearly built:** an earlier pass of this doc
called for splitting the index into one per question, and handed the
planner the resulting `findByTemplatePath` contract break as *the* shape
decision. The index was never the defect. **A reader asking a question the
index cannot answer is not the same thing as an index that answers two.**

### 9c. A key is relative to its manager — the stall is the exception to fix

**The question.** Keys ship in three shapes. Which is right?

**The answer.** **Relative to whatever manages the instance.** A warren
room's `<the manager's own key>/<leaf>` already is — it reads as absolute
only because the manager's key is a parcel extent. A bare `uuid()` for a
plant or a named animal is honest, because nothing manages it. ⚠ The
market stall is wrong: its key is an **Avatar identity path**, so the
counter records *who rents it* rather than *which stall it is* — and it is
the only site writing its discriminator twice, since its stamped identity
is derived from the same renter key.

⚠ Normalizing it re-keys the stall's record. No migration: that one
fixture's record is dropped and reseeded. Nothing else moves.

### 9d. Continuity declares; individuation derives

**The question.** `asIdentityPath` is typed `string` with no check, and
six sites mint six shapes. What constrains it?

**The answer.** Only **continuity** mints at all — one subject across
several templates, where the template is deliberately absent because
outliving it is the job, and the namespace is declared by the family that
owns it. **Individuation never mints**: the row plus a durable key already
individuates, and that is the handle of decision 9.

⚠ The Avatar is why a single rule would have been wrong: three named
bodies share `/platform/agent/Avatar/<playerId>` on purpose, so a
template-must-prefix rule would fragment the family and break a shade's
deeds attributing to the same person.

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

### 12. `address` is a GROUPING key, not display chrome

**The question.** The slate's key table marks `_address` *"display only —
52/103, and not unique"*, and therefore unreliable. Should the projection
carry it as chrome?

**The answer.** No — carry it as a **grouping candidate**. The
non-uniqueness is the declared answer to *"which building is this room
in"*, authored deliberately: Duncan Hall's four rooms all claim the same
address because they are all in Duncan Hall.

⭐ **Why it matters now even though structures do not exist.** A map of a
locality that lists its interzone exits wants to say *"Duncan Hall"*, not
six room names. Today a map can group by **zone** and get the right answer
for most shipped content — the general store says so in its own comment,
*"Its own zone"* — and the two cases where zone and building come apart
are the ones `structures-slate` names: a zone holding several buildings,
and a building carved across sub-zones.

⭐⭐ So treating `address` as a grouping key costs nothing today and means
a **structure node becomes another grouping key on the node, additively**,
the day it exists. Reading it as display-only is what would force the
projection to change later.

⚠ It is still not a node **key** — the node key is the minted identity.
Address groups; identity identifies. Those are different jobs and the
slate is right that conflating them is how the shared-bank-account bug
class happens.

### 13. The graph is derived, so it is never a source

Rebuilt at boot, maintained at the write chokepoint. A disagreement with
the templates is a **bug, not a state**; it must be droppable and
rebuildable at any moment. 2,544 rows is nothing to walk.

---

## Lens pass

⚠ **Stage A scores nothing on its own and that is expected** — an index is
not a design with a pedagogy or an economy. Every heading below is Stage
B's, which is the honest reading of why the two ship together: Stage A is
answerable to Stage B's lens pass rather than to one of its own.

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

12 steps, run against the live game before the MR opens. Steps 1–3
are Stage A's, and they are the ones that prove the substrate without a
test pointing at itself.

1. ⭐ **A secret found in one room is not found in all of them.** Discover
   a hidden exit in one Duncan Hall dorm room. Go to another dorm room
   provisioned from the same template: its hidden exit is **still
   hidden**. (Today it reads as found.)
2. ⭐ **A secret found in an ephemeral room does not follow you.** Find
   one in a lounge satellite, leave, come back to a fresh instance: it is
   hidden again, because the room never had a durable handle to remember
   it by.
3. **Two of a kind are both addressable, and the world can list them.**
   As a wizard, ask for every instance of a dorm-room row and get **all of
   them** — then rent a second market stall and confirm the first keeper's
   counter still answers for the first keeper. (Today the enumeration is
   empty for stamped rows and the stall's uniqueness check cannot fire.)
4. **A broken exit is reported, not fatal.** As a wizard, author an exit
   whose destination does not exist. Run the check: it names the row and
   the direction. Then restart the world — **it boots.** Today this is a
   boot crash an author cannot see coming.
5. **A one-way exit is surfaced as a question.** Author a `bidirectional`
   exit the far side does not reciprocate. The check reports the asymmetry
   so an author can say whether they meant it.
6. **A cross-zone edge authored on one side only is caught** — at the
   University Avenue crossing, the exemplar of two zones that touch, which
   `boundary.md` requires and nothing verifies today.
7. **You have a map of where you walked, and nothing else.** As a new
   player, walk the arrival gate → the crossing → the campus gate. Open
   your map of Terminus: three places and the edges you used. Nothing you
   did not see.
8. **An unvisited locality says so.** Open your map of Hinkley Hills,
   having never gone. It tells you that you have no map of it — rather
   than rendering as an empty place.
9. **Published knowledge reads differently from walked knowledge.** The
   TPA board lists Hinkley Hills. It appears on your map **marked as
   published**, distinguishable from somewhere you have been.
10. ⭐ **Your map can be wrong, and the world does not fix it.** Have a
   wizard wall up an exit you have walked. Open your map: the old exit is
   still there. Walk it: it is gone. The map was wrong, nothing corrected
   it behind your back, and the disagreement is visible once you look
   again.
11. **Taking content down is honest.** Offline a zone with somebody inside:
   they are moved out, the exits that pointed in refuse with a reason, a
   tombstone names the missing place and who to tell, and the owner of the
   pointing rooms is notified that their content lost a destination. Then
   try to walk into a **draft** zone: refused, not crashed.
12. **The graph does not leave the server.** Drive the client and inspect
    what crosses the wire while opening a map: nothing in it names a place
    the player has not earned.

---

## Acceptance criteria

Observable from outside the code. The first four are Stage A's, and they
are what make the substrate checkable by a person rather than by a test
pointing at itself.

1. Finding something hidden in one instance of a multi-instance room does
   not reveal it in any other instance, for that player or anyone else.
2. A hidden thing found in a room that does not survive a restart does not
   stay found.
3. Asking the world for every instance of a shared row returns **all of
   them**, including instances that carry a minted identity — and asking
   for every member of a continuity family (every avatar) answers from
   that family's register rather than from the index.
4. Two players renting stalls from one seed each get their own counter,
   their own stock and their own takings — and a stored key still resolves
   to the right live object.

5. An author who writes a destination that does not exist is told which
   row and which direction, **before any restart**.
6. The world boots with a dangling exit present in content.
7. A non-reciprocal bidirectional edge, a room unreachable from its zone's
   entrance, and a one-sided cross-zone edge are each reported to their
   author.
8. A player can open a map of a locality and see exactly the places they
   have been and the edges they used — no more.
9. A map of a locality the player has never visited tells them so.
10. A place known only from the departures board appears on the map marked
   as published knowledge, distinguishable from a place they walked.
11. When the world changes under a player's map, **the map keeps the old
   claim** until they next perceive the place, and the two can be seen to
   disagree.
12. Offlining content moves the people inside out, refuses the exits that
    pointed in with a reason that names the missing place, and tells the
    owner of those exits.
13. An exit into never-published content refuses instead of crashing the
    boot.
14. Nothing a client receives while reading a map names a place the player
    has not earned.
15. A map document can be copied to another player's tree and read by them
    as their own — and copying one locality's map hands over nothing about
    any other.
16. A player's map of a generated lot survives that lot being reaped and
    re-minted: *"I have been to lot-7"* still reads true.
17. A map of a locality can group its rooms by building wherever the
    content declares one — Duncan Hall's four rooms read as Duncan Hall,
    not as four unrelated places.
18. A player's map survives the nightly reset. Walk somewhere, let the
    reset run, and the map still says you were there.
19. A player's map of a lounge-style procedural room is honestly nothing,
    rather than a stale entry for a room that no longer exists.
20. ⭐ A second locality and a second player need no engine change for
    either to have a map. The build is not done until somebody
    demonstrates it.

---

## Cross-references

**Seeding slates** — `instance-addressing-slate` (⭐ **Stage A**; the
index defect, the durability rule, the row-plus-decoration handle) ·
`location-graph-slate` (⭐ **Stage B**; UNBUILT, design agreed)

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
