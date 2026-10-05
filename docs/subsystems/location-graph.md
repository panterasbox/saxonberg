# The location graph — the world's shape, and what a player knows of it

Two artifacts that **never join**, and the gap between them is the
design:

| | the graph | a player's map |
|---|---|---|
| what | every place in the realm and every exit out of it | the places one player has been, and the edges they used |
| where | the `location_graph` collection | a document at `/home/<key>/map/<locality>` |
| truth | **derived** from the content rows; droppable | **a claim**, written when perceived, never corrected |
| who reads it | the lints, the publish gate, the router, the survey act | that player |
| reaches a client | ⛔ **never** | yes — it is theirs |

⭐⭐ **The evidence firewall is structural, not policed.** A player's map
is not a filter over the graph; it is a separate artifact written from
what they perceived. Nothing joins them, so no read can hand somebody
the shape of places they have not earned. The map writer does not
import `PlaceNode`.

---

## The durable per-instance handle

Everything here keys on a place by its **durable handle**
(`Stuff.getDurableHandle()`), never by its template path. One row backs
forty provisioned dorm rooms, so lineage is the wrong key for *this
room*; `stuffId` is fresh per construction, so it is the wrong key for
*this room after a reload*. The handle is the rule **an identity exists
iff the NAME is durable** — re-derivable or recorded — expressed as a
string. Three rungs, on the hosts that own the facts:

| rung | host | answer |
|---|---|---|
| minted | `Stuff` | the stamped identity, when it differs from the row |
| keyed | `PersistableMixin` | `` `<row>#<key>` `` once the key is **explicit** |
| singleton | `SingletonMixin` | the row — the one instance IS it |

Full contract, including why the `#` joiner is load-bearing and why an
ephemeral clone must answer `null`:
[location.md § The durable per-instance handle](./location.md).

`Exit.getDiscoveryKey()` is built on it
(`<source-handle>#exit:<dir>`), which is what stops a secret found in
one dorm room reading as found in all forty —
[concealment.md](./concealment.md).

---

## What is a node, and what is not

⭐ **A node is a place, and *one row is one place*.**

- A **template node** (`origin: 'template'`) is a content row whose
  effective class extends a Location root **and composes
  `SingletonMixin`**. Its identity IS its row.
- A **plan node** (`origin: 'plan'`) is a circulation node a warren's
  `PlatPlan` declares — a corridor, a road segment. Its identity is
  `PlatPlan.nodeIdentityOf(nodeId, parentExtent)`, which is
  re-derivable from the plan plus the extent, so it survives the node
  being reaped and re-minted.

⚠ **Everything else is a KIND**, minted many times through a warren or
a programme, and is deliberately **absent**. A holding's interior is
somebody's house behind a gate; the gate is all the graph knows, as one
**slot stub** per frontage. The elastic half of the world is perceived
live and never stored — which is also why a lounge satellite is nothing
here, and nothing on anybody's map.

⚠ **Place rows are not all under a `/location/` segment.** Several
predate the `<root>/<branch>/` path pattern, so enumeration is **by
class**, always — never by path infix.

---

## The invariants

`lib/location/GraphInvariants.ts` is one instance value class over
plain data, run by **two** callers: `check-location-graph` over the rows
on disk, and `NavigationApi.checkGraph` over the projected nodes at
runtime. Two copies would drift, and a gate and a runtime check
disagreeing about what a dangling exit is reads as neither of them being
wrong.

**Three errors** — the world is broken or will break:

| rule | what it catches |
|---|---|
| `dangling-destination` | a destination naming nothing. **Today a boot crash** |
| `bidirectional-both-sides` | the same pair declared `bidirectional` twice — the engine installs the pair twice |
| `published-into-unpublished` | a live room pointing into draft content |

⭐ The publish rule runs **one way only**: `published → unpublished` is a
dangling edge waiting to happen, while `unpublished → published` is how
a draft zone attaches to the live world when it lands.

⚠⚠ **`bidirectional: true` means INSTALL BOTH SIDES.** Such an edge is
reciprocal by construction and the far side must not declare it again —
`Exitable._applyExitSpec` calls `addBidirectionalExit`. A rule written
as *"a bidirectional edge the far side does not reciprocate"* flagged
Duncan Hall's correctly-authored front doors; that phrasing has no
referent in the real content format.

**Four questions** — censused and ratcheted, because a one-way passage
is legitimate content and an author must be able to ship one:
`cross-zone-one-sided`, `unreachable-from-entrance`, `asymmetric-edge`,
`destination-is-a-kind`.

⚠⚠ `unreachable-from-entrance` has **false positives by
construction**: code-installed exits are not in rows (a warren's hub
exits, `DormDoor`, `FloorStairExit`), so a zone reached only through a
code-installed door reads as entrance-less. It earns its place because
the count may not **grow**. Counts and ceilings:
[lint-family.md](../lint-family.md).

A zone's **entrances** are derived: the nodes with an inbound
cross-zone edge, plus every travel stop in it, plus the default start
location when it lies there. A zone with no entrance at all is **one**
finding, not one per room — reporting it forty times is how a census
becomes noise nobody reads.

---

## The collection

`location_graph`, one row per node (`PlaceNode`, a `Document` —
`ParcelRecord`'s shape; nothing composes or clones it).

⭐ **`reset: keep`, and the reasoning generalizes**: "derived" is an
argument for being *droppable*, not for being dropped nightly. The
nightly job does not restart the process, so a wipe would leave every
lint, publish gate and board read blind until the next boot rather than
for a moment. There is nothing to gain and a window of blindness to
lose.

`generation` is the rebuild's sweep key: `rebuild()` stamps every
projected node with a fresh generation and deletes the rows carrying any
other — droppable-and-rebuildable with no window in which the graph is
empty. ⚠ **Monotonic, not `Date.now()`**: a wall-clock stamp collides
when two rebuilds land in the same millisecond, and a colliding
generation sweeps *nothing*, because every stale row's stamp equals the
new one. The sweep then silently keeps nodes for rows that have stopped
being places — exactly the failure the generation exists to prevent.

⭐⭐ **The registry warms LAZILY, on the first graph read — there is no
`onCreate`.** Nothing reads the graph at boot: the traversal gate's
publish check goes through `ParcelApi`, and the invariant check, the
re-projection and the router's queries are all later events. So an eager
walk of every content row at boot would be work for no reader. The boot
manifest entry exists so the registry *exists* for `NavigationLogic` to
find; `ReadingCatalogue` is the precedent for the lazy half. The warm is
guarded, so a burst of first reads builds once.

⚠ `PlaceNode` carries **no finder statics**, unlike `ParcelRecord`. The
registry is its only consumer, so the queries are private methods there
over the inherited `Document.find`; the record itself holds only
`toGraphNode()`, a fact about the row rather than a lookup of rows.

## The write chokepoint

`DomainHook` (`AroundSave` + `AroundDelete` over `Collections.Content`)
is **the real template write chokepoint** —
`TemplateApi.saveTemplate` has five direct callers and is bypassed by
the pack installer and by `Template.save()`.

On save it re-projects the row **and every child that `extends` it**
(editing a parent changes every child's effective exits), then runs
`checkGraph(path)` and records each finding against the row through
`DiagnosticApi` — the author's own channel, on the live stream and in
`errors`.

⭐⭐ **A throw in the projection never fails the save.** It is caught,
recorded as a diagnostic against the row, and swallowed: the graph is
derived and self-heals at the next rebuild, and losing an author's save
to a hiccup in a derived store would be the wrong trade. An author who
cannot save because an index is unhappy has no way to understand why.
⚠ A *validator* throw still refuses the save — that gate is not this
one's to soften.

On delete the path is resolved **before** `next`, because afterwards
there is nothing to resolve it from and the graph would keep a node for
a row that is gone.

## A dangling exit is a diagnostic, not a boot crash

⭐⭐ `StuffApi.singleton` throws *Template not found* for a missing row,
and eager rooms come from each pack's `boot:` list — so **one mistyped
destination anywhere in content took the whole world down**, wrapped as
*"failed to clone"*, from a stack trace naming the framework rather than
the row. An author could not see it coming and could not read it when it
arrived.

Now the direction is installed **unbuilt**: `look` still names it, the
destination path is kept, `canTraverse` refuses with `gate: 'unbuilt'`
and *"Nothing lies that way yet"*, and the author is told which row and
which direction.

⭐ **It heals.** An existing unbuilt stub is *replaceable*: create the
row the author meant, re-hydrate, and the real exit lands where the stub
was. Without that the stub would win forever and the fix would look like
it had not worked. ⚠ The reverse is refused — a *working* exit is never
traded for a stub.

⚠⚠ Caught **narrowly**, by the one message `StuffApi.clone` throws for a
missing row, with everything else rethrown: a failure inside a
destination's own `onCreate` is a different fault and must stay loud.
And by a catch rather than a pre-check — a `Template.findByPath` before
every `singleton` adds a store round-trip per authored exit on the
hydration hot path (199 edges at boot) and makes exit installation
depend on a reachable store, which took six suites red on
`isConnected is not a function` and is the same hazard a live server
hits during early boot.

⚠ `Exit._unbuilt` is **transient**. It is a fact about the world as
loaded, and the next hydrate re-derives it; persisting it would outlive
the defect it describes.

## The two far-side gates

`TraversalGate` gains `'unpublished'` and `'unbuilt'`. Both run **before
the lock gate**, so a wall reads as a wall rather than as a locked door,
and both follow the lock gate's own rule: **never resolve the
destination**. One reads a transient flag; the other is
`ParcelApi.isPathPublished`, a sync longest-prefix read.

⚠ An **untitled** path reads as published. There is no parcel there to
be a wall, and `lint:untitled` already forbids shipping an untitled
path — so the honest default for *nobody has said* is *not a wall*,
rather than silently sealing ground whose title somebody forgot to
declare.

`published` is **denormalised** from the covering parcel so
`Exit.canTraverse` can read it synchronously without resolving a
destination (the rule the lock gate already follows). The parcel stays
the source of truth; a flip re-projects the extent.

---

## Cross-references

- [location.md](./location.md) — the durable handle's contract; the Warren graph
- [boundary.md](./boundary.md) — exits, doors, the traversal gates
- [persistence.md](./persistence.md) — the `(scope, key)` spine; the registry's three reads
- [identity.md](./identity.md) — the two identity patterns; the mint census
- [parcel.md](./parcel.md) — title, and `published`
- [lint-family.md](../lint-family.md) — `lint:location-graph`'s counts and ceilings
