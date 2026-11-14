# Navigation — requirements

**Status:** DRAFT — reopened 2026-11-10.

**Kind:** client (with a server part)
**Leads from:** kernel. **First consumer:** zones already in the game — the
Sunken Delve (a small dungeon on two levels with a diagonal), the lounge and
Dave's Bar (a hidden door; rooms that exist only while occupied), and the
sparse country of Rejection and Hearts Delight (tracks over open ground,
depth, levels from −1 to 8).

In Explore mode the left pane becomes **the picture of what you know of the
zone you are in**: a map you can read and click, the ways from where you
stand (every direction, every other way, and the ways that leave the zone),
the place you have selected, the zone in one line that opens, a breadcrumb
drawn from your own map, and a few lenses that ask the map a question —
every mark on it explained by a tooltip. Today the pane is a text navigator — a
breadcrumb read from the live world, a text compass, a list of ways out —
and nothing on the client knows anything about a place you are not standing
in. This build gives the client a **copy of your own knowledge**, kept
current by the server, and draws the pane from it. Seeding slates:
[map-slate](../slates/builds/map-slate.md) (§ The navigation pane, revised,
and everything after it), [client-knowledge-model-slate](../slates/builds/client-knowledge-model-slate.md),
[locality-knowledge-slate](../slates/builds/locality-knowledge-slate.md).
The design canvas the owner iterated on (private): the pane, its looks, a
behavior board, the **stacked** pane this doc follows, and the tooltips.

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
the drawn map with its levels, zoom and diagonal and track ways; the
stacked pane — the ways from here, the selected place, the zone line; a
breadcrumb from your own map, with a first visit writing the Locality into
it; four lenses; a tooltip on every mark; and the direction glyphs the
client does not have. The reuse ledger for the
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
  over open ground; your position; the levels you know; three zoom steps;
  house style.
- **The map is how you move.** Clicking a neighbor moves you there by the
  ordinary command; clicking a distant room shows the route to it.
- **Where you are, spelled out:** the place's name and `x: · y: · z:`,
  with z stressed.
- **The ways from here:** every direction as a rose — the eight horizontal
  ones and up and down — each in its state; every other way beside it (in,
  out, named ways); and the ways that **leave the zone**, named, with where
  they lead.
- **The selected place** — you, until you click another: what you know of
  it, from whom and when, and how to get there.
- **The zone in one line** that opens into its facts: its kind, cell size,
  your extent and levels known, walked against known, your sources, and
  what holds across it (sky, climate, jurisdiction).
- **A breadcrumb from your own map.** Your first visit to a Locality writes
  it into your map; the breadcrumb reads your map; clicking a crumb shows
  that Locality as you know it.
- **Lenses** — frontier, route, refusals, boundaries — in one compact row.
- **A tooltip on every mark** — every room, way, level, lens mark and
  control on the pane says everything you know about it on hover, so you
  never click through to find out. The legend is just "hover any mark".

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
  untouched here (but its width is shared, below).
- **The tooltip system itself** → [tooltip-slate](../slates/builds/tooltip-slate.md),
  its own build, **before** this one; this build only supplies the map's
  tooltip content.
- **A view of zones joined together** → map-slate § Zone level.
- **Browsing your map records without moving** → [atlas-slate](../slates/builds/atlas-slate.md),
  its own card; here only a one-hop lookahead (a way out's tooltip shows
  that zone as you know it, with *open in the atlas*).
- **The card's small and large sizes** (the large one with full-size maps
  and the Expanse chart) → map-slate § The card's sizes; this build is the
  docked size.
- **The Place section's content** → the next design topic in this
  conversation; this build reserves its place below the Zone block.
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
- **card-sizes-slate** proposed the Zone as its own card; in the pane it is
  the zone line that opens (recorded in that slate).
- **The panel's width** — today 15 rem, shared by every mode; this build
  sets it (below), so every mode's panel inherits it.
- **The icon set** — the direction and elevation glyphs the
  iconography slate reserved for this.
- **`locate`** — retired; three wire drives that used `locate me` read the
  reckoning through `course` instead.
- **Ships** — they have no Locality today; aboard, the crumbs were empty
  and the navigator named no government.
- **Two Localities named "Terminus"** — the city's row is renamed
  *Terminus City* (content), so the crumbs stop reading *Terminus ›
  Terminus*.

## Surface decisions

### Claims carry where the place is **[DECIDED — the firewall]**
Coordinates, zone and level become part of what a claim records, written
when you stand in a place or see it; a source passes on what it knew. The
alternative — the server joining your claims to the world's index when it
sends them — would put the index's facts on the wire. The location-graph
firewall decides it: the client receives only your own knowledge, so the
coordinates must *be* your knowledge.

### The zone's extent and levels are yours **[DECIDED]**
The zone's "extent known" and the level control show the extent and levels
**you have found**, never the zone's real size — that would tell you what
you have not explored. ⭐ **The level control appears only when what you
know spans more than one level.** On a first visit everything is z: 0 until
you find otherwise, and in most zones most players never see the control.

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
changes, from what you know). The compass is not a lens: it is the rose in
the ways section. The rule is one lens per channel — turning one on turns
off whatever holds its channel, and says so — but this build's four use four
different channels, so all can be on together; the rule bites when the next
build adds trail.

### The pane, top to bottom **[DECIDED]**
No tabs — one column, sections that fold: **the place's name**, small, at
the top · **the Locality breadcrumb**, stopping one short of the place ·
**the Zone block** (the zone's label, `x: · y: · z:`, the
extent and levels you know) · the map, full width, with only the levels and
zoom on it · the lenses in one row · the ways from here (the rose with up
and down, the other ways, the ways leaving the zone) · the selected place ·
the zone line. ⭐ **Locality and Zone are two trees** and each keeps its
information together: the breadcrumb is where you are in the world; the
Zone block — directly above the map, which *is* the zone — is your position
in the zone.

### The rose **[DECIDED]**
Up and down are ordinary directions between levels inside a zone, so they
sit with the eight horizontal ones. A direction you know of no way in reads
dim; a door reads as a door; a refused way reads refused — so *no way* never
looks like *a door*.

### Zoom, levels, coordinates **[DECIDED]**
Three steps — whole zone · nearby · close — each changing what is drawn;
*me* recenters. The level control lists the levels you know, yours marked.
Coordinates read `x: 2  y: 3  z: 0`, z stressed.

### Tooltips on the map **[DECIDED]**
Every room, way, level, lens mark and control carries a tooltip in the
app-wide model ([tooltip-slate](../slates/builds/tooltip-slate.md)): what
it is, everything you know of it with source and date, how to get there,
and what a click would do — terms opening nested tooltips. Composed from
your own knowledge, so they are instant and honest. No separate legend.

### The panel's width **[DECIDED]**
**22 rem, the same in every mode.** On the owner's screen (125% zoom, about
118 rem wide) that is the widest the panel can be and still leave two card
columns; at 100% it leaves three; on a 1920 px screen two. The panel no
longer collapses to make room for another card column — only at the narrow
tier, where the terminal and one card column would not otherwise fit.

### House style **[DECIDED]**
The map draws in the client's house style; parchment is for illustrated
maps, so the two never look alike.

### Breadcrumb and first visits **[DECIDED]**
Your first visit to a Locality writes it into your map with what it
declares as learnable (its name, its description when it has one, its
government). The breadcrumb reads your map. ⭐ **Every crumb has a
tooltip** — you almost always stand on a leaf, so the crumbs are how you
learn about the places above you without inspecting them by hand: its
name, its address, when you first came and how you know it, how much of
your map lies there, and (once the server sends them) its government and
kind. A crumb opens the Locality as you know it.

### The two sections' contents **[DECIDED in shape]**
The Locality section's crumb tooltips and the Zone block, by zone kind —
Cartesian, a frame inside one, aboard a ship, Spherical, an Expanse, moving
water, the underwater column — are set in
[map-slate § The Locality section and the Zone section](../slates/builds/map-slate.md).
Highlights a player sees: a crumb says who governs the place and who holds
its seats, whether you live here, your standing here, the weather and a
true forecast, and the lights tonight; the Zone block says how the space is
laid out and where you are in it. Where a kind has no map yet (a sphere, an
expanse, moving water) the map shows *no map for this kind of space yet*
and the rest of the Zone block still works.

### Aboard a ship **[DECIDED — the owner]**
The ship is your Locality — the last crumb — and the Zone section shows two
positions: you on her decks, and her in the world (at sea the reckoning,
in port where she is made fast, on a river the reach). The reckoning itself
is read at the helm (`course`); a passenger knows what they can see and what
the crew says.

### `locate` is retired **[DECIDED — the owner]**
It answered *where is anything, anywhere* for every player — which the map's
honesty and `scry`'s cost forbid. Its jobs are already elsewhere: `query`
for what you can reach, the pane for where you are, `course` for the
reckoning.

### z and elevation **[DECIDED — the owner]**
`z:` is position on the zone's grid, nothing more. Elevation is a fact of
your setting — biome, place — shown apart from it.

### Paths are a spoiler **[DECIDED — the owner]**
Anything that names an object's row — a template or identity path — is a
spoiler on the appetite axis: hidden by default, shown by one deliberate
click (*"What is this, really?"*) or by raising your appetite, never
prevented ([spoiler-slate § Paths are a spoiler](../slates/tails/spoiler-slate.md)).
The zone shows a derived label by default; its path is that kind of
spoiler.

### Where the data comes from **[DECIDED]**
Every field on the pane and its tooltips is sourced from what the client
already holds, the copy of your map this build adds, or a cached round
trip — and what the server does not yet have is listed, item by item, in
[navigation-server-slate](../slates/builds/navigation-server-slate.md)
(S1–S9), each marked first pass or follow-up. A field the server cannot
supply yet is absent, never guessed.

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
6. **The panel's width, for every mode.** 22 rem, shared by forum, chat,
   govern and make before any of them is designed — the owner's preference,
   with his own caveat that it may constrain those designs.
7. **Tooltips everywhere** — not built here, but this build is its first
   big consumer, so it comes after the tooltip build.

## The order **[DECIDED]**

- **Across builds:** the tooltip build; then this build; the movement build
  (step beat, walking to a place) after controller-liquidity merges; then
  *your map grows* (trail, notes, freshness).
- **Within this build:** the knowledge model and claims-with-coordinates
  first — nothing draws without them — then the map, then the ways and the
  selected place, then the zone line, then the breadcrumb, then the lenses
  and the map's tooltips.
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
   Sunken Delve. The pane shows the vestibule solid, `x: · y: · z: 0` with
   z stressed, no level control (one level known), the rose with the ways it
   can see, and the way back out under *leaving the zone*.
2. `instant` · player — `look`. The rooms it can see appear outlined; the
   frontier lens marks the openings not taken.
3. `instant` · player — Click a neighboring room on the map. `go
   <direction>` echoes, the character moves, the room turns solid, the map
   follows.
4. `instant` · player — Walk the diagonal from the third corridor to the
   vault: drawn corner to corner.
5. `instant` · player — The rose's *down* lights; go down to the pit. The
   level control appears now — two levels known, yours marked; choose the
   other level and see what you know of it.
6. `instant` · player — The cache: absent from the map until `search` finds
   it; then drawn.
7. `instant` · player — Click a distant known room. The route is drawn with
   its least certain step marked; nobody moves. `route to <room>` draws the
   same.
8. `instant` · player — Open the zone line: kind, cell size, extent and
   levels known, walked against known, sources; click a distant room and
   read the selected place: what you know, from whom, how to get there.
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
14. `instant` · player — Turn on all four lenses at once (none share a
    channel). Hover a room, a door, a corridor, a level button and every
    lens mark: each tooltip says what it is and what you know of it, with
    source and date; hover a term inside one and a nested tooltip opens.
15. `instant` · player — A second player B stands in the same delve with a
    different map. B's pane shows only B's knowledge.
16. `short` · staged — Restart the world. On reconnect the pane redraws the
    same map from the server; nothing is lost or duplicated.
17. `instant` · player — Log in from a second browser: the same map.
18. `instant` · player — In a pitch-dark delve room, `look` sees nothing:
    no neighbor appears; the map shows only what you walked. (Light.)
19. `instant` · player — The status bar shows the weather and time the
    navigator used to; the zone line shows the jurisdiction.
20. `instant` · player — Board a ship at a wharf: the last crumb is the
    ship, the Zone block shows your place on her decks and where she is made
    fast. Put to sea: the crumbs still end at the ship, the outer position
    says *at sea*, and only at the helm does `course` give the reckoning.
    The jurisdiction names the port, then the flag.
21. `instant` · player — In the Hush (a spherical zone) the map reads *no
    map for this kind of space yet* and the Zone block still describes the
    cavern. `locate` is not a command.
22. `instant` · player — Hover a crumb in Terminus City: its government,
    the seats and their holders, resident or visitor, the forecast.
23. `instant` · player — At 125% zoom on a 2560 px screen the panel is
    22 rem and two card columns sit beside the terminal; open the forum
    mode and its panel is the same width.

### Soak drive

None — nothing here depends on game time.

## Acceptance criteria

- A player sees a map of the zone they are in, drawn only from their own
  knowledge, with walked, known and unexplored places told apart.
- Clicking a neighboring room moves the player; clicking a distant one
  shows the route.
- The map shows diagonals and tracks and three zoom steps; the level
  control appears only once the player knows more than one level.
- The ways from here show every direction, up and down included, and every
  other way, each in its state; the ways leaving the zone are listed with
  where they lead.
- The zone line describes the zone as the player knows it, never more.
- A hidden way is absent until found.
- The breadcrumb is the player's own: a Locality they have never visited is
  unnamed.
- The four lenses work, one per channel.
- Every mark on the pane has a tooltip saying what it is and what the
  player knows of it, with sources.
- The panel is the same width in every mode.
- After a restart, a reconnect or a second device, the map is the same.
- Two players in one place see two different maps.

## Cross-references

- [map-slate](../slates/builds/map-slate.md) ·
  [client-knowledge-model-slate](../slates/builds/client-knowledge-model-slate.md) ·
  [locality-knowledge-slate](../slates/builds/locality-knowledge-slate.md) ·
  [step-beat-slate](../slates/builds/step-beat-slate.md) ·
  [iconography-slate](../slates/builds/iconography-slate.md) ·
  [card-sizes-slate](../slates/builds/card-sizes-slate.md) ·
  [tooltip-slate](../slates/builds/tooltip-slate.md) ·
  [navigation-server-slate](../slates/builds/navigation-server-slate.md) ·
  [spoiler-slate](../slates/tails/spoiler-slate.md)
- [location-graph.md](../subsystems/location-graph.md) ·
  [boundary.md](../subsystems/boundary.md) ·
  [card-surface.md](../subsystems/card-surface.md) ·
  [client-shell.md](../subsystems/client-shell.md) ·
  [zone.md](../subsystems/zone.md)
