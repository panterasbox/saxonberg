# Zone instancing slate — a zone can be cloned, and its warren names the copy

**Status:** slated 2026-11-14, from the navigation requirements (what zone a
map claim records for a room inside a copy). **Size:** a build —
cross-cutting architecture (zone stamping, the template applier, every
floorplan warren, moving water). **Priority:** the owner, 2026-11-14 —
*"we're going to prioritize all of this server stuff"* so the client
(the navigation pane) is unblocked as soon as possible.

## The problem — "frames" are a workaround

A room's zone is stamped from its **template path**: `Stuff.zone` is the
nearest spatial-zone ancestor *by template path*
([zone.md](../../subsystems/zone.md)). Every copy of a floorplan's room is
minted from the **same row**, so every copy lands in the **same zone** —
the row's — whatever identity the warren gives it. Copies therefore cannot
register coordinates on that zone's grid (*"every Hinkley yard would claim
one square of the lots' grid"*, `FloorplanWarren.layOut`), so a plan's room
rows author no `coords:` and the warren **derives** per-copy coordinates
from the entrance and the copy's cardinal ways — never stored, on no zone's
grid. A warren that does this answers `laysOutOwnFrame() → true`
(`FloorplanWarren` and so `HoldingWarren` and `ShipWarren`; `ReachWarren`
and `SeaWarren`), and the edge rules exempt any way into or out of a frame
(*"across zones or holding frames, a way is a threshold"*). A mine does
not: its carved cells sit on its zone's grid.

So the same thing — a house on a lot, a dorm room, a smack's decks, a
reach patch — is a set of rooms in a shared zone with colliding derived
coordinates, and the map cannot tell house A from house B.

## The model **[DECIDED — the owner]**

> *"If the whole idea is whole zones can be cloned and multiple instances
> running, joined at different places on the location graph, then the
> zones themselves need to be cloneable, not just the stuff inside it. And
> it means the warren needs to give those zones their own identity path,
> since the template path would now be ambiguous. I'm fine with all of this
> so long as it's managed through the warren and we architect it in a way
> that these patterns are repeatable for different kinds of warrens."*

It is a known pattern applied to zones —
[ref-shapes.md](../../ref-shapes.md)'s identity doctrine (lineage is the
template path, *what kind*; identity is *which one*; minted identities with
scheme-derived keys, as every player's body is
`/platform/agent/Avatar/<playerId>` with no row of its own):

- **A zone row is lineage** — *a Hinkley-style holding*, *a smack's decks*.
- **A copy of the zone is a minted identity**, named by the warren that
  mints it under a scheme it declares (`<holding extent>`,
  `ship/<registry serial>`, `/home/<key>/…`).
- **A room in a copy belongs to the copy** — its zone follows its
  **identity**, not its template path. Its coordinates are real
  coordinates on the copy; the edge rules apply normally; **frames go
  away** (`laysOutOwnFrame` retires, and the threshold exemption with it).
- **Repeatable:** one capability a warren composes — *this warren mints
  zone instances* — carrying the naming scheme, the wake and sleep of a
  whole copy, and the joining of the copy's entrance into the location
  graph. Holdings, dorms, ships of a kind and moving water compose it
  rather than each re-solving it.

## The crack, stated plainly **[DECIDED — the owner]**

> *"It creates a big crack in the architecture, because now the only true
> record of the zone graph is runtime state — it can't be purely derived
> from content. That said, I would want to do our best to express all of
> this through the content system as best we can … what we can make
> declarative we should."*

Kept as narrow as it can be:

- **Declared in content wherever possible.** The **zone row** says its
  instances are minted by a warren (and which kind). The **warren row**
  declares its plan, its naming scheme and where copies attach. So content
  still says, statically, *which* zones can be cloned, *by whom*, *named
  how* and *joined where*; only *which copies exist now* and their serials
  are runtime.
- **The location-graph index records copies as they are minted**, so the
  zone graph is queryable — and the firewall stands unchanged.
- **The lint checks the declarations** — a row claiming warren-managed
  identity has a warren that mints it; the naming scheme resolves — even
  though it cannot enumerate copies.

## Sequencing with the navigation build

Neither blocks the other:

1. **The navigation server pass** records a map claim's zone as **the
   copy's identity** — the key the warren already mints — never the row's
   shared zone ([navigation-server-slate § S15](./navigation-server-slate.md)).
   The map is right from day one: house A and house B are separate on it.
2. **Zone instancing** then makes that key a real zone and retires frames.
   No migration: the key claims already carry *is* the zone's identity
   path.

## Open

1. **The content shape** — the field a zone row uses to say *my instances
   are minted* (and by which warren kind), and the warren row's naming
   scheme.
2. **The template applier** — how a zone instance is cloned (its fields
   inherit from the row by `lookupField`, as zones already inherit from
   their template ancestors).
3. **Authored ships** (the Hesper, the Corrigan) are their own zones today,
   while ships of a kind are warren copies — two shapes for one thing a
   player sees as *a ship*. Whether authored ships become single minted
   instances too.
4. **Moving water** — a reach patch is minted per drift and not persisted;
   whether it becomes a zone instance or stays a place inside one.
5. **Persistence** — which instances persist (a holding, a ship) and which
   are transient (a reach patch); their identity must survive a restart
   ([memory: an identity key must survive a restart]).
6. **The location-graph index** — recording and retiring instances; what
   the invariant lint can still prove.

## Cross-references

- [zone.md](../../subsystems/zone.md) · [holding.md](../../subsystems/holding.md) ·
  [ship.md](../../subsystems/ship.md) · [river.md](../../subsystems/river.md) ·
  [location-graph.md](../../subsystems/location-graph.md) ·
  [boundary.md](../../subsystems/boundary.md) (the edge rules) ·
  [ref-shapes.md](../../ref-shapes.md) (lineage and identity)
- [navigation-server-slate](./navigation-server-slate.md) ·
  [map-slate](./map-slate.md)
