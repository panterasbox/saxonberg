# Navigation — requirements

**Status:** DRAFT — reopened 2026-11-10.

**Kind:** client (with a server part)
**Leads from:** kernel. **First consumer:** zones already in the game — the
Sunken Delve (a small dungeon on two levels with a diagonal), the lounge and
Dave's Bar (a hidden door; rooms that exist only while occupied), and the
sparse country of Rejection and Hearts Delight (tracks over open ground,
depth, levels from −1 to 8).

In Explore mode the left pane becomes **the picture of what you know of the
zone you are in**: a map you can read and click, the zone as a card, the
ways that leave it, a breadcrumb drawn from your own map, and a few lenses
that ask the map a question. Today the pane is a text navigator — a
breadcrumb read from the live world, a text compass, a list of ways out —
and nothing on the client knows anything about a place you are not standing
in. This build gives the client a **copy of your own knowledge**, kept
current by the server, and draws the pane from it. Seeding slates:
[map-slate](../slates/builds/map-slate.md) (§ The navigation pane, revised,
and everything after it), [client-knowledge-model-slate](../slates/builds/client-knowledge-model-slate.md),
[locality-knowledge-slate](../slates/builds/locality-knowledge-slate.md).
The design canvas the owner iterated on (private): the pane, its three
looks, and a behavior board.

## What the thing is

- **One zone, never more.** The pane shows the zone you are in. How zones
  relate to one another is a different thing, later.
- **Only what you know.** Everything on it is your own map: places you
  walked, places you know of without having walked them, openings you have
  not taken. Nothing is read from the world as it really is.
- **Position, never place.** Where you are relative to things; what a room
  is like stays on its inspection card.
- **An input surface.** You move by clicking the map.
- **Interface, not fiction** — the same pane in every epoch. Whether a realm
  hands out maps cheaply is content and economy, not this build.
- **One pane per player, one zone in it at a time, one copy of your
  knowledge per player.** A new zone needs only its own rows.

## What already exists

- **Your map.** A document per player per Locality, append-only claims
  through six channels — `walked`, `seen`, `searched`, `published`,
  `charted`, `told` — each with its dates; looking, searching, walking,
  reading a timetable and reading a chart write it. ⚠ A claim records a
  place, its ways and where they lead, but **not where the place is** — no
  zone, no coordinates, no level.
- **`map`** — opens the docked navigator and prints your map as text;
  `map <locality>` lists what you know of a Locality, with disagreements and
  staleness.
- **`route`** — plans over your own map only and says the plan's least
  certain steps. It prints and stops; nothing keeps the plan.
- **The navigator** (client-surface, shipped): a breadcrumb from the live
  world, a text compass, a list of ways out, outdoor conditions and
  jurisdiction — docked in Explore, refreshed on every move.
- **The way's state** (boundary, shipped): every exit reads `open`, `shut`,
  `locked` or `window`, and says whether it leaves the zone. Inside a zone
  every way joins adjacent cells — except a **track**, the long walk over
  open ground in sparse country.
- **Authored geometry** — rooms carry coordinates; zones a cell size.
- **The location-graph index** — the world's real shape. ⛔ It never
  reaches a client, and this build keeps it that way.
- **Discipline:** `navigation` (reckoning a position). No cartography
  discipline exists.
- **In flight:** controller-liquidity (!561) touches the same client and
  movement files; documents-path-identity (!560) changes how documents are
  named and read. The build starts after !561 merges.

**Therefore what is genuinely new here is:** your knowledge reaching the
client as a live copy; **where things are** becoming part of what you know;
the drawn map with its levels, zoom and diagonal and track ways; the Zone
card and the Ways-out list in the pane; a breadcrumb from your own map, with
a first visit writing the Locality into it; five lenses and a legend; and
the direction glyphs the client does not have. The reuse ledger for the
plan is in [map-slate § Reuse ledger for the plan](../slates/builds/map-slate.md).

## Goals

- **The client holds your knowledge.** A copy of your own map, kept current
  as you learn, consistent after a reconnect, a restart or a second device;
  never anything you have not learned.
- **Where a place is, is part of what you learn about it.** Standing in a
  room or seeing it records where it is; a source that told you a place
  tells you what it knew of where.
- **A map of the zone you are in**, drawn from that knowledge: walked rooms
  solid, known ones outlined, openings into blank space; doors and windows
  in their states; diagonals corner to corner; tracks along their bearing
  over open ground; your position and coordinates with the level stressed;
  the levels you know; three zoom steps; house style.
- **The map is how you move.** Clicking a neighbor moves you there by the
  ordinary command; clicking a distant room shows the route to it.
- **The zone as a card**: its kind, cell size, your extent and levels known,
  how much of it you have walked and from what sources, and what holds
  across it (sky, climate, jurisdiction).
- **Ways out**: the exits that leave the zone, named, with where they lead.
- **A breadcrumb from your own map.** Your first visit to a Locality writes
  it into your map; the breadcrumb reads your map; clicking a crumb shows
  that Locality as you know it.
- **Lenses** — frontier, route, refusals, boundaries, compass — one per
  drawing channel, each with a tooltip, and a legend for every mark.

## Non-goals

- **Walking to a distant room, the step beat, pace-dependent noticing** →
  [step-beat-slate](../slates/builds/step-beat-slate.md), the movement build
  after controller-liquidity. Here a distant click shows the route only.
- **New knowledge records** — your trail, notes and pins, prices seen, NPC
  hours learned, freshness bands — → the *your map grows* build
  ([map-slate § Lenses](../slates/builds/map-slate.md)).
- **Staged versus persistent on the Zone card**, and freshness as
  *restaged since you saw it* → [staging-slate](../slates/builds/staging-slate.md).
- **Illustrated maps** (owned paper maps, *you are here*) → map-slate § The
  illustrated map; its own build.
- **The room view** → map-slate § The room view; later.
- **Lenses as instruments; the situational lens; the long candidate list**
  → map-slate § Lenses.
- **Spherical zones and expanse charts** → map-slate; the pane shows *no
  map for this kind of space yet* and the Ways-out list.
- **The pane in modes other than Explore** → a later card-surface pass;
  untouched here.
- **A view of zones joined together** → map-slate § Zone level.
- **Map styles as options** → later, as content.
- **A cartography discipline** → nowhere, deliberately, until a map can be
  wrong in a way skill corrects.

## Placement

Kernel and client — the platform, not a pack. The map is how every realm
is shown, and a second zone, realm or pack needs **no code**: its rooms'
coordinates and its zone's cell size are already authored. The Locality's
learnable facts are the Locality's own rows.

## Collisions

- **The navigator** (client-surface) — replaced by the pane; its outdoor
  conditions move to the **status bar**, its jurisdiction to the Zone card.
- **`map`** — keeps its text; its card becomes the drawn pane.
- **`route`** — unchanged; its latest plan is drawn by the route lens.
- **The lounge's occupancy rooms** — they write no claims, so the map draws
  *a space through this door, shape unknown*.
- **Hidden ways** (the office's north door) — absent from the map until
  found; then drawn.
- **Tracks in Rejection, Hearts Delight and Waponi** — drawn as long ways
  over open ground, in zones whose cells are metres apart.
- **Existing maps** — claims written before this build have no coordinates.
  No migration: a place without one is listed on the Zone card as *known,
  not yet placed* until you see it again. (Dev data only.)
- **card-sizes-slate** proposed the Zone as its own card; it is the pane's
  tab here (recorded in that slate).
- **The icon set** — the direction and elevation glyphs the
  iconography slate reserved for this.

## Surface decisions

### Claims carry where the place is **[DECIDED — the firewall]**
Coordinates, zone and level become part of what a claim records, written
when you stand in a place or see it; a source passes on what it knew. The
alternative — the server joining your claims to the world's index when it
sends them — would put the index's facts on the wire. The location-graph
firewall decides it: the client receives only your own knowledge, so the
coordinates must *be* your knowledge.

### The zone's extent and levels are yours **[DECIDED]**
The Zone card's "extent known" and the level control show the extent and
levels **you have found**, never the zone's real size — that would tell you
what you have not explored.

### Three tiers on the map **[DECIDED]**
Walked (solid) · known without walking — seen, searched, told, charted,
published (outlined) · an opening into blank space (a door to a *?*). A
concealed way you have not found is absent, not hidden.

### A click **[DECIDED]**
A neighbor: the ordinary `go <direction>`, echoed. A distant room: its route
drawn, with the least certain step marked; no movement.

### Lenses in this build **[DECIDED]**
Frontier (openings not taken), route (the latest plan, for the session),
refusals (a way you saw locked or shut), boundaries (where the jurisdiction
changes, from what you know), compass (on by default while it is an
experiment). The rule is one lens per channel — turning one on turns off
whatever holds its channel, and says so — but this build's five use five
different channels, so all can be on together; the rule bites when the next
build adds trail. Every lens has a tooltip; a legend explains every mark.

### Zoom, levels, coordinates **[DECIDED]**
Three steps — whole zone · nearby · close — each changing what is drawn;
*me* recenters. A level control lists the levels you know, yours marked.
`x · y · z` always shown, z stressed.

### House style **[DECIDED]**
The map draws in the client's house style; parchment is for illustrated
maps, so the two never look alike.

### Breadcrumb and first visits **[DECIDED]**
Your first visit to a Locality writes it into your map with what it
declares as learnable (its name, its description when it has one, its
government). The breadcrumb reads your map. A crumb opens the Locality as
you know it.

### The copy is the server's **[DECIDED]**
The server owns your knowledge; the client's copy is kept current by the
server and repaired after a gap. Nothing on the client is invented. Whether
the copy also lives on the device between sessions is the plan's
performance call.

## ⚠⚠ The commitments to scrutinize

The owner reviews this build mostly by seeing it, so the decisions that are
expensive to reverse are named here, biggest first.

1. **The client knowledge model** ([client-knowledge-model-slate](../slates/builds/client-knowledge-model-slate.md))
   — the revived *shadow model*. This build makes the client hold a copy of
   your knowledge, kept current by the server, read only through derived
   views. ⭐ **It is the largest commitment here and outlives the map:**
   every later client feature that shows anything beyond the room you stand
   in — the lenses still to come, the illustrated map's *you are here*, a
   quest journal, the room view — will read through it. Getting its
   boundary right (a copy of the server's documents about *you*, never a
   mirror of the world) is what keeps it honest and small. It is the
   build's foundation, built first.
2. **Claims carry where the place is.** A change to what your map records —
   every writer of knowledge (walking, looking, searching, timetables,
   charts) records the place's zone, coordinates and level from now on.
   `route` and `map` read the same claims. Reversing it later means
   unwriting knowledge players have.
3. **How the copy travels.** A new kind of push from server to client, or
   the subscriptions that already push live results. A third push path is a
   standing cost every later feature pays; reusing one is preferred and the
   plan must say why if it does not.
4. **The drawn map.** The client's first real renderer (SVG). The lenses,
   the illustrated map and the room view will all draw on it, so its shape
   (one renderer, lenses as overlays on it) is set here.
5. **A zone-facts read.** The first time the server tells a client about a
   zone rather than a room — kept to the zone's kind, name and cell size,
   because anything more (its true extent, its levels) would tell you what
   you have not explored.

## The order **[DECIDED]**

- **Across builds:** this build first; the movement build (step beat,
  walking to a place) after controller-liquidity merges; then *your map
  grows* (trail, notes, freshness).
- **Within this build:** the knowledge model and claims-with-coordinates
  first — nothing draws without them — then the map, then the Zone tab and
  Ways out, then the breadcrumb, then the lenses and legend.
- ⭐ **Seen early.** The owner gives most of his feedback by looking, so a
  plain map drawn from **real knowledge on a running world** comes before
  any polish — the first thing after the foundation — and each later piece
  lands visible on a running world for review, not only at the end.
- **Starts after controller-liquidity (!561) merges** — it rewrites the
  same client and movement files.

## Lens pass

1. **Pedagogy** — the map teaches what you know versus what is: three tiers,
   sources and dates make knowledge visible as knowledge. Coordinates make a
   zone's geometry learnable. No Discipline gates any of it (navigation's
   reckoning is unchanged); the gap is cartography, deliberately deferred.
2. **Creative expression** — the ordinary case needs no code: any authored
   zone draws. Bespoke: a Locality authors what a first visit teaches.
3. **Immersion / participation** — immersion: the map never shows what you
   do not know, so it cannot betray the fiction; hidden ways stay hidden.
   Participation: knowledge spreads by telling, charting and publishing, so
   a player who maps a delve and tells others shapes what they see.
4. **Values** — a map is only as good as your sources; a wrong told claim
   draws wrong until you walk it. That is the honest answer, chosen.
5. **Continuity** — the same pane in every epoch; claims made before this
   build still list, unplaced, until seen again.
6. **Economy** — none directly; it makes charts and published maps worth
   having, which the illustrated-maps build prices.
7. **Governance** — none: no person is judged.

## The drive

Paces: `instant` · `short` · `staged`. Assertions: `player` or `staged`.

### Blocking drive

1. `instant` · player — A new character with an empty map walks into the
   Sunken Delve. The pane shows the vestibule solid, `x · y · z` with z
   stressed, the ways it can see, and the way back out listed under Ways
   out.
2. `instant` · player — `look`. The rooms it can see appear outlined; the
   frontier lens marks the openings not taken.
3. `instant` · player — Click a neighboring room on the map. `go
   <direction>` echoes, the character moves, the room turns solid, the map
   follows.
4. `instant` · player — Walk the diagonal from the third corridor to the
   vault: drawn corner to corner.
5. `instant` · player — Go down to the pit. The level control shows both
   levels, yours marked; choose the other level and see what you know of it.
6. `instant` · player — The cache: absent from the map until `search` finds
   it; then drawn.
7. `instant` · player — Click a distant known room. The route is drawn with
   its least certain step marked; nobody moves. `route to <room>` draws the
   same.
8. `instant` · player — Open the Zone tab: kind, cell size, extent and
   levels known, walked against known counts, sources, ways out; then Ways
   out.
9. `instant` · player — In the lounge, the office's north door is absent;
   `search` finds it and it appears. A locked or shut door is drawn so, and
   the refusals lens marks it.
10. `instant` · player — The lounge's occupancy rooms draw as *a space
    through this door, shape unknown*.
11. `instant` · player — In Rejection, walk a track: it is drawn as a long
    way over open ground; *whole zone* fits what you know of the zone.
12. `instant` · player — In Hearts Delight, climb through several levels;
    the level control lists only the levels you have found.
13. `instant` · player — First visit to a Locality: the breadcrumb gains it
    by name; click the crumb and see the Locality as you know it. A second
    character who has never been there sees it unnamed.
14. `instant` · player — Toggle every lens, all five at once (none of this
    build's five share a channel, so all can be on); hover each for its
    tooltip; open the legend and find every mark on screen in it.
15. `instant` · player — A second player B stands in the same delve with a
    different map. B's pane shows only B's knowledge.
16. `short` · staged — Restart the world. On reconnect the pane redraws the
    same map from the server; nothing is lost or duplicated.
17. `instant` · player — Log in from a second browser: the same map.
18. `instant` · player — In a pitch-dark delve room, `look` sees nothing:
    no neighbor appears; the map shows only what you walked. (Light.)
19. `instant` · player — The status bar shows the weather and time the
    navigator used to; the Zone card shows the jurisdiction.

### Soak drive

None — nothing here depends on game time.

## Acceptance criteria

- A player sees a map of the zone they are in, drawn only from their own
  knowledge, with walked, known and unexplored places told apart.
- Clicking a neighboring room moves the player; clicking a distant one
  shows the route.
- The map shows levels, coordinates, diagonals and tracks, and three zoom
  steps.
- The Zone tab and Ways out describe the zone as the player knows it, never
  more.
- A hidden way is absent until found.
- The breadcrumb is the player's own: a Locality they have never visited is
  unnamed.
- The five lenses work, one per channel, each explained; the legend explains
  every mark.
- After a restart, a reconnect or a second device, the map is the same.
- Two players in one place see two different maps.

## Cross-references

- [map-slate](../slates/builds/map-slate.md) ·
  [client-knowledge-model-slate](../slates/builds/client-knowledge-model-slate.md) ·
  [locality-knowledge-slate](../slates/builds/locality-knowledge-slate.md) ·
  [step-beat-slate](../slates/builds/step-beat-slate.md) ·
  [iconography-slate](../slates/builds/iconography-slate.md) ·
  [card-sizes-slate](../slates/builds/card-sizes-slate.md)
- [location-graph.md](../subsystems/location-graph.md) ·
  [boundary.md](../subsystems/boundary.md) ·
  [card-surface.md](../subsystems/card-surface.md) ·
  [client-shell.md](../subsystems/client-shell.md) ·
  [zone.md](../subsystems/zone.md)
