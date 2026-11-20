# Navigation card — requirements

**Status:** AGREED 2026-11-20 (reopened 2026-11-10; rewritten after the
navigation-server, zone-instancing and tooltips builds merged).

**Kind:** client
**Leads from:** content — the server half shipped in the navigation-server
build (MR !595). **First consumer:** zones already in the game — the Sunken
Delve (two levels, a diagonal, a hidden cache, dark rooms), the lounge and
Dave's Bar (a hidden door, rooms that exist only while occupied), the
sparse country of Rejection and Hearts Delight (tracks over open ground,
many levels), the Hush (a spherical cavern) and the Hesper (a ship).

In Explore mode the docked card on the left becomes **the zone navigation
card: where you are and where you can go, drawn only from what you know.**
Today it is a text navigator — a breadcrumb read from the live world, a
3×3 grid of direction buttons, a list of ways, the weather and the
jurisdiction. The server already sends the client a live copy of your own
map and where you are in seven sections; nothing draws them. This build
draws them: a map you can read and click, the ways from here, and the
sections of the card widest to narrowest, every mark explained by a
tooltip. Seeding slates: [map-slate](../slates/client/map-slate.md)
(§ It is a ZONE NAVIGATION card, and everything after it — above all § The
whole card), [client-knowledge-model-slate](../slates/client/client-knowledge-model-slate.md),
[locality-knowledge-slate](../slates/engine/locality-knowledge-slate.md),
[navigation-server-slate](../slates/engine/navigation-server-slate.md).

## What the thing is

- **Where you are and where you can go.** Position, never place: what a
  room is like stays on its inspection card.
- **One zone, never more.** How zones join is the atlas's, later.
- **Only what you know.** Everything on it is your own map — places you
  walked, places you know of without walking, openings you have not taken.
  Nothing is read from the world as it really is.
- **An input surface.** You move by clicking it.
- **Interface, not fiction** — the same card in every epoch. Whether a
  realm hands out maps cheaply is content and economy.
- **One card per player, one zone in it at a time.** A new zone, realm or
  pack needs only its own rows.

## What already exists

- **Your map, on the client.** The server keeps a document per player per
  Locality — append-only claims through six channels (`walked`, `seen`,
  `searched`, `published`, `charted`, `told`), each dated — and pushes a
  live copy to the client, repaired after a gap. ⭐ **Every claim records
  where the place is** (zone, coordinates, level). Nothing on the client
  reads the copy yet.
- **First visits.** Walking into a Locality writes it into your map (name,
  government, kind). The breadcrumb still reads the live world.
- **Where you are, in seven sections**, each pushed only when it changes:
  the zone (kind, cell size, a label), the Localities, the horizon, the
  building, the ways (state, leaves-the-zone, one-way, muffled, what a way
  needs of you, its opening, a track's length), the place (light, sky,
  water, crowding, elevation) and you (pace, posture, hands, load, light,
  mount).
- **`route`** plans over your own map only, names its least certain step,
  and already sends its plan as data. Nothing on the client draws it.
- **`map`** opens the docked card and prints your map as text; `map
  <locality>` lists what you know of a Locality.
- **The navigator** — the text card above; docked in Explore.
- **Tooltips** (MR !633) — one tooltip everywhere; a small document with
  facts that carry their source and date; terms that nest; no buttons.
- **The way's state** — every exit reads open, shut, locked or window,
  and says whether it leaves the zone; inside a zone every way joins
  neighboring cells, except a **track** over open ground.
- **`locate`** is retired; `course` gives the reckoning at the helm.
- **Discipline:** `navigation` (reckoning a position). No cartography.
- **In flight:** none of the four sibling builds touches the card, the map
  or the sources.

**Therefore what is genuinely new here is:** drawing — the map from your
copy (tiers, levels, diagonals, tracks, zoom, your position, the route);
the card's sections widest to narrowest with the glance rule; a breadcrumb
from your own map; the ways as a rose and a list with every state told
apart; four lenses; a tooltip on every mark; the direction glyphs; the
outdoor conditions on the status bar; and one panel width for every mode.
The reuse ledger for the plan is
[map-slate § Reuse ledger for the plan](../slates/client/map-slate.md).

## Goals

- **A map of the zone you are in**, drawn from your own knowledge: walked
  rooms solid, known ones outlined, openings into blank space; doors and
  windows in their states; diagonals corner to corner; tracks along their
  bearing over open ground; your position; the levels you know; three zoom
  steps; the client's house style.
- **The map is how you move.** Clicking a neighbor moves you by the
  ordinary command, echoed; clicking a distant room draws the route to it
  and moves nobody.
- **The card, widest to narrowest**, each section seen as *navigating the
  game's content as you explore*: you are here · in the world · the zone
  and its map · the horizon · the structure · the ways · the place · you.
- **The ways are always honest about you**: every direction and every
  named exit, each in its state — open, a shut door, locked, a window, a
  mode it needs, **there but not for you right now**, or no way you know
  of — and any exit that leaves the zone marked.
- **A breadcrumb that is yours**: a Locality you have never visited is not
  named; each crumb's tooltip tells you about the place above you.
- **Lenses** — frontier, route, refusals, boundaries — in one row.
- **A tooltip on every mark** — every room, way, level, crumb, lens mark,
  section and control says what it is and everything you know of it, with
  source and date, and what a click would do. No legend.
- **The card fits the window.** It fills the height it has, opening
  sections in order, and folds them back when space runs out.
- **The weather and time are on the status bar**, where every mode sees
  them.
- **One panel width in every mode.**

## Non-goals

- **The movement block, walking to a distant room, the step beat** →
  [step-beat-slate](../slates/engine/step-beat-slate.md), the movement
  build. Here a distant click draws the route only.
- **New knowledge records** — your trail, notes and pins, prices seen,
  freshness bands, a recent list → the *your map grows* build
  ([map-slate § Lenses](../slates/client/map-slate.md)).
- **Staged versus persistent** on the structure and place, and freshness
  as *restaged since you saw it* → [staging-slate](../slates/platform/staging-slate.md);
  the server does not send it yet ([navigation-server-slate § Left after
  the first pass](../slates/engine/navigation-server-slate.md)), so it is
  absent.
- **Actions inside tooltips** (open, unlock, look through, route there,
  lay a course) → nowhere, deliberately: a tooltip runs nothing (the
  tooltips build's rule). Those acts are the way's own menu — below.
- **The card's small and large sizes** (other modes' awareness strip; the
  full-size chart and course plotting) → map-slate § The card's sizes.
- **Browsing your map without moving** → [atlas-slate](../slates/client/atlas-slate.md);
  here only one hop of lookahead.
- **Illustrated maps, the room view, map styles as options** → map-slate,
  their own builds.
- **Charts of spherical zones and expanses** → map-slate § The card's sizes
  (the large card); here *no map for this kind of space yet*.
- **Lenses as instruments, the situational lens, the long candidate list**
  → map-slate § Lenses.
- **A view of zones joined together** → map-slate § Zone level.
- **The Explore card in other modes** → the card-surface pass; only the
  panel's width is shared here.
- **A cartography discipline** → nowhere, deliberately, until a map can be
  wrong in a way skill corrects.
- **The server items left after its first pass** (a building's entrance
  direction, a remote way's door name, a river's named reach, a searched
  flag) → navigation-server-slate; until they land the fields are absent.

## Placement

The client, on the platform — no pack. A second zone, realm or pack needs
**no code**: its rooms' coordinates and its zone's cell size are already
authored, and what a Locality teaches on a first visit is its own rows.
The content changes are a name and the Delve's Locality (below).

## Collisions

- **The navigator** — replaced by the card; its outdoor conditions move to
  the status bar, its jurisdiction to the zone section, its "leaving this
  area" list into the ways (a marker on the exit).
- **`map`** — keeps its text; its card is the drawn one.
- **`route`** — unchanged; its latest plan is what the route lens draws.
- **The lounge's occupancy rooms** — they write no claims, so the map draws
  *a space through this door, shape unknown*.
- **Hidden ways** (the office's north door, the Delve's cache) — absent
  until found; then drawn.
- **Tracks in Rejection, Hearts Delight and Waponi** — long ways over open
  ground in zones whose cells are metres apart.
- **Maps written before claims knew where** — dev data only; a place with
  no position is listed in the zone section as *known, not yet placed*
  until you see it again. No migration.
- **The panel's width** — today 15 rem in every mode; this build sets it
  for all of them.
- **The icon set** — the direction and elevation glyphs the iconography
  slate reserved.
- **The affordance menu** (right-click, a mouse hold, a phone's *actions*)
  — a way in the rose or the list gets it, so a shut door can be opened
  and a locked one unlocked from the card.
- **The Sunken Delve is covered by no Locality**, so walking it writes
  nothing to your map. It joins the Last Counted Mile beside it, as the
  steading's rooms already do (content).
- **Two Localities named "Terminus"** (the realm and the city) — the city's
  row is renamed *Terminus City*, so the crumbs stop reading *Terminus ›
  Terminus*.
- **card-sizes-slate** proposed the Zone as its own card; it is a section
  of this one (recorded in that slate).

## Surface decisions

### The card, widest to narrowest **[DECIDED — the owner, 2026-11-14]**
One column, no tabs, in a fixed order (muscle memory), as
[map-slate § The whole card](../slates/client/map-slate.md) sets it:

1. **You are here** — the room's name, small. The place appears once.
2. **In the world** — the Locality crumbs, stopping one short of the place.
3. **The zone** — its label, `x: · y: · z:` with z stressed, who keeps it
   and the rules in force, the extent and levels you know — then **the
   map**, full width, with only the level control and zoom on it.
4. **The horizon** — what you can see beyond this room, landmarks first,
   each with its compass point and range; bearing ticks at the map's edge.
   Click: `look` at it.
5. **The structure** — inside (its name, the storey you are on of how
   many, the way out), outside at a landing (what stands beside you, which
   face, the way in), or aboard ship (her decks, the gangway, where she is
   made fast). Storeys, never z. Click: `look` at it.
6. **The ways** — the rose and the named exits (below).
7. **The place** — only what bears on moving through it: light, open sky
   or roofed, water, crowding, hazards found, what your map knows of it
   (first walked, last seen, sources, disagreements). Click: bring its
   inspection card forward.
8. **You** — as a navigator: pace, posture, load, the light you carry, a
   mount.

The **lenses** sit in one row under the map.

### The glance rule, filling, and absence **[DECIDED — the owner]**
The place name, the map and the ways are always open; every other section
is **one summary line** that opens on click, its detail in its tooltip. The
card **fills the window's height**: with room to spare the next sections
open by themselves in order, widest first; when space runs out they fold
back, last first, and only then does text truncate (full text in its
tooltip). A section the player opened or closed stays as set, and the card
remembers. A section with nothing to say is **absent** — a bare cave has no
horizon and no structure — except the map's *no map for this kind of space
yet*.

### Claims carry where; the extent and levels are yours **[DECIDED — shipped]**
The map is drawn from positions in your own claims — the firewall: the
client receives only your knowledge. The zone section's extent and the
level control show what **you have found**, never the zone's real size.
⭐ **The level control appears only when you know more than one level.**

### Three tiers **[DECIDED]**
Walked (solid) · known without walking — seen, searched, told, charted,
published (outlined) · an opening into blank space (a door to a *?*). A
concealed way you have not found is absent. Where two claims about one
way disagree, both show with their dates.

### A click **[DECIDED]**
On a neighbor: the ordinary `go <direction>`, echoed. On a distant room:
its route drawn, its least certain step marked, nobody moves. `route to
<room>` draws the same. On a way in the rose or the list: an open way
moves you; anything else does what the ordinary command would, and says so.

### The ways **[DECIDED — the owner, 2026-11-14/15]**
The **rose** holds the cardinal exits — eight directions, up and down
(ordinary directions between levels). The **list** holds the named exits by
their **own names** (the command words), nothing written over them.
**Leaving the zone is a marker on any exit**, never a section. Each state at
a glance: open · a shut door · locked or blocked · a window (see through,
never go through) · a mode it needs (climbing, swimming) · **amber — there,
but not for you right now** (sitting, cannot swim, your load will not fit)
· dim (no way you know of) — so *no way* never looks like *a door*. Hovering
an exit shows a **preview strip** under the section — where it leads as
your map knows it, what stands in it, its state — holding nothing
clickable: **one click moves you**, never select-then-confirm.

### A way's tooltip, and its menu **[DECIDED — the owner, 2026-11-20]**
The tooltip says the command, where it leads as your map knows it, what
stands in it, the opening (and *your load won't fit*), one-way, muffled,
*found by searching*, a track's length, and what stops *you* now. ⭐ A
boundary's part is **assembled from what it is made of** — a block for each
navigation-relevant thing it is (opens and shuts; locks, and your key;
the opening and what passes it; grime on the glass; never shuts) — never a
fixed *door / window* shape, so a pack's portcullis or airlock shows with
no client change. ⛔ **No buttons in a tooltip** (the tooltips build's
rule): opening, unlocking and looking through are on **the way's own
menu** — right-click, a mouse hold, a phone's *actions* — as on every other
thing in the client.

### One hop of lookahead **[DECIDED]**
Hovering a way out of the zone, or a crumb, shows that zone or Locality
*as you know it* in its tooltip — a small thumbnail where you have one.
Browsing further is the atlas's.

### Breadcrumb **[DECIDED]**
The crumbs read **your map**: a Locality you have never been to is not
named. ⭐ **Every crumb has a tooltip** — you almost always stand on a
leaf, so the crumbs are how you learn about the places above you: its name,
when you first came and how you know it, how much of your map lies there,
its government and who holds its seats, whether you live here, the weather
and forecast. Clicking a crumb shows that Locality as you know it.

### Lenses **[DECIDED]**
Frontier (openings not taken), route (the latest plan, for the session),
refusals (a way you saw locked or shut), boundaries (where the
jurisdiction changes, as you know it). One lens per channel; these four
hold four channels, so all can be on at once. The compass is not a lens —
it is the rose.

### Zoom, levels, coordinates **[DECIDED]**
Three steps — whole zone · nearby · close — each changing what is drawn;
*me* recenters. The level control lists the levels you know, yours marked.
Coordinates read `x: 2  y: 3  z: 0`, z stressed. **z is position on the
zone's grid, nothing more**; elevation is the place's, shown apart.

### Kinds of space **[DECIDED in shape]**
A grid zone draws. A frame inside one draws as its own zone. **Aboard a
ship** the ship is the last crumb and the zone section shows two
positions: you on her decks, and her in the world (made fast alongside, a
reach, or *at sea* — the reckoning only at the helm, by `course`). A
sphere, an expanse or moving water shows *no map for this kind of space
yet*, and the rest of the card still works. The per-kind contents are
[map-slate § The Locality section and the Zone section](../slates/client/map-slate.md).

### Paths are a spoiler **[DECIDED — the owner]**
The zone shows a label; its path is a spoiler on the appetite axis, as
every path is ([spoiler-slate § Paths are a spoiler](../slates/platform/spoiler-slate.md)).

### Where the data comes from **[DECIDED]**
Every field on the card and its tooltips comes from the copy of your map,
the where-you-are sections, or a tooltip's own round trip. A field the
server does not send yet is **absent, never guessed**.

### The panel's width **[DECIDED — the owner]**
**22 rem, the same in every mode.** At the owner's 125% zoom on 2560 px
that leaves two card columns beside the terminal; at 100% three. The panel
no longer collapses to make room for another column — only at the narrow
tier.

### House style **[DECIDED]**
The map draws in the client's house style; parchment is for illustrated
maps, so the two never look alike.

## ⚠ The commitments to scrutinize

The owner reviews mostly by seeing, so the expensive-to-reverse decisions
are named, biggest first. (The three largest in the first draft — the
client's copy of your knowledge, claims that carry where, and how the copy
travels — shipped in the navigation-server build.)

1. **The drawn map** — the client's first real renderer. The lenses, the
   illustrated map and the room view will all draw on it, so its shape —
   one renderer, lenses as overlays — is set here.
2. **Reading your knowledge on the client** — the first feature that reads
   the copy of your map. Every later one that shows anything beyond the
   room you stand in (the atlas, a journal, *you are here*) reads it the
   same way, so the reads are views over the copy, never a second model of
   the world.
3. **The card's section frame** — the glance rule and filling the height
   are the shape the small and large sizes, and later the movement block,
   plug into.
4. **The panel's width, for every mode**, before forum, chat, govern and
   make are designed — the owner's preference, with his own caveat.

## The order **[DECIDED]**

- **Across builds:** tooltips (merged) → this build → the movement build
  (step beat, walking to a place) → *your map grows*.
- **Within this build:** a **plain map drawn from real knowledge on a
  running world first** — the owner gives most feedback by looking — then
  clicking it; then the ways; then the card's sections and the glance
  rule; then the breadcrumb from your map; then the lenses; then the
  tooltips on every mark; the status bar and the width alongside. Each
  piece lands visible on a running world for review, not only at the end.

## Lens pass

1. **Pedagogy** — the card teaches what you know versus what is: three
   tiers, sources and dates make knowledge visible as knowledge;
   coordinates make a zone's geometry learnable. No Discipline gates any of
   it; the gap is cartography, deliberately deferred.
2. **Creative expression** — the ordinary case needs no code: any authored
   zone draws, any boundary's tooltip assembles from what it is. Bespoke: a
   Locality authors what a first visit teaches.
3. **Immersion / participation** — the map never shows what you do not
   know, so it cannot betray the fiction; hidden ways stay hidden; amber is
   honest because it is about *you*. Knowledge spreads by telling,
   charting and publishing, so a player who maps a delve and tells others
   shapes what they see.
4. **Values** — a map is only as good as your sources; a wrong told claim
   draws wrong until you walk it. Chosen.
5. **Continuity** — the same card in every epoch; a ship, a cavern, a
   river all show something, and claims from before still list, unplaced.
6. **Economy** — none directly; it makes charts and published maps worth
   having, which the illustrated-maps build prices.
7. **Governance** — none: no person is judged.

## The drive

Paces: `instant` · `short` · `staged`. Assertions: `player` or `staged`.
Every step is walked in a browser; steps 16–17 also as a wire drive.

### Blocking drive

1. `instant` · player — A new character with an empty map walks into the
   Sunken Delve. The card: the vestibule's name small at the top, the
   crumbs, the zone line with `x: · y: · z: 0` and z stressed, the map
   with the vestibule solid, no level control, the rose with the ways it
   can see, and the way back out marked as leaving the zone.
2. `instant` · player — `look`. The ways it can see appear as openings
   into blank space; the frontier lens marks the openings not taken.
3. `instant` · player — Click a neighboring room on the map. `go
   <direction>` echoes, the character moves, the room turns solid, the map
   follows.
4. `instant` · player — Walk the third corridor's southeast diagonal to
   the vault: drawn corner to corner.
5. `instant` · player — In the second corridor, `search` finds the hidden
   way *down*; the rose's *down* lights; go down to the pit. The level
   control appears — two levels known, yours marked; choose the other
   level and see what you know of it.
6. `instant` · player — The pit is dark: `look` sees nothing, no neighbor
   appears, the place section says dark, the map shows only what you walked.
   (Light.)
7. `instant` · player — The first corridor's hidden northeast way to the
   vault: absent until `search` finds it; then drawn, and its tooltip says
   *found by searching*.
8. `instant` · player — Click a distant known room. The route is drawn with
   its least certain step marked; nobody moves. `route to <room>` draws the
   same.
9. `instant` · player — Open the zone section: kind, cell size, extent and
   levels known, walked against known, sources. Read the place section:
   what your map knows of this room, from whom, when.
10. `instant` · player — Hover each exit in the rose and the list: the
    preview strip shows where it leads and its state; clicking moves you in
    one click.
11. `instant` · player — In the bar, the hidden way north to the office is
    absent; `search` finds it and it appears. At the Wharfside bank the
    `pumphouse` way's door is locked: red, the refusals lens marks it, and
    right-clicking it opens the door's own menu; a shut door elsewhere in
    Terminus is gold and its menu offers *open*. No tooltip has a button.
12. `instant` · player — In the steading yard, the low door east into the
    cottage refuses a standing body: that way is amber and its tooltip says
    what stops you, in `go`'s own words, and what would let you through;
    do that and it clears.
13. `instant` · player — The lounge's occupancy rooms draw as *a space
    through this door, shape unknown*.
14. `instant` · player — In Rejection, walk a track: drawn as a long way
    over open ground, its length in its tooltip; *whole zone* fits what you
    know. The horizon section names a landmark with its bearing and range,
    and the map's edge carries its tick; clicking it `look`s at it.
15. `instant` · player — In Hearts Delight, climb through several levels;
    the level control lists only the levels found. Enter a building: the
    structure section says *floor N of M* and the way out.
16. `instant` · player — First visit to a Locality: the breadcrumb gains it
    by name; its tooltip says when you first came and how much of your map
    lies there; clicking it shows the Locality as you know it. A second
    character who has never been there sees it unnamed.
17. `instant` · player — A second player B stands in the same delve with a
    different map; B's card shows only B's knowledge.
18. `instant` · player — Turn on all four lenses at once. Hover a room, a
    door, a corridor, a level button, a crumb, each section's summary line
    and every lens mark: each tooltip says what it is and what you know of
    it, with source and date; a term inside one opens a nested tooltip.
19. `instant` · player — Shrink the window: sections fold back last first
    and become summary lines; grow it and they open in order. Close one by
    hand; it stays closed after a reload.
20. `short` · staged — Restart the world. On reconnect the card redraws the
    same map; nothing lost or duplicated. Log in from a second browser: the
    same map.
21. `instant` · player — The status bar shows the weather and time; the
    zone section shows who keeps the ground.
22. `instant` · player — Board the Hesper at her berth: the last crumb is
    the ship, the zone section shows your place on her decks and where she
    is made fast, the structure section her decks. Put to sea: the crumbs
    still end at the ship, the outer position says *at sea*, and only at
    the helm does `course` give the reckoning.
23. `instant` · player — In the Hush the map reads *no map for this kind of
    space yet* and the rest of the card still describes the cavern.
24. `instant` · player — Hover the *Terminus City* crumb: its government,
    the seats and their holders, resident or visitor, the forecast; the
    crumbs never read *Terminus › Terminus*.
25. `instant` · player — At 125% zoom on a 2560 px screen the panel is
    22 rem with two card columns beside the terminal; switch to the forum
    mode and its panel is the same width.

### Soak drive

None — nothing here depends on game time.

## Acceptance criteria

- A player sees a map of the zone they are in, drawn only from their own
  knowledge, with walked, known and unexplored places told apart.
- Clicking a neighboring room moves the player; clicking a distant one
  draws the route and moves nobody.
- The map shows diagonals, tracks and three zoom steps; the level control
  appears only once the player knows more than one level.
- The ways show every direction, up and down included, and every named
  exit by its own name, each in its state; *there but not for you* is told
  apart from *no way*; any exit that leaves the zone is marked.
- A shut or locked door can be opened or unlocked from its menu on the
  card; no tooltip carries a button.
- The card's sections run widest to narrowest; a section with nothing to
  say is absent; the card fills the window's height and folds as it
  shrinks; a section the player set stays set.
- The zone section describes the zone as the player knows it, never more.
- A hidden way is absent until found.
- The breadcrumb is the player's own: a Locality they have never visited
  is unnamed.
- The four lenses work together.
- Every mark on the card has a tooltip saying what it is and what the
  player knows of it, with sources.
- The weather and time are on the status bar.
- The panel is the same width in every mode.
- After a restart, a reconnect or a second device, the map is the same.
- Two players in one place see two different maps.

## Cross-references

- [map-slate](../slates/client/map-slate.md) ·
  [client-knowledge-model-slate](../slates/client/client-knowledge-model-slate.md) ·
  [locality-knowledge-slate](../slates/engine/locality-knowledge-slate.md) ·
  [navigation-server-slate](../slates/engine/navigation-server-slate.md) ·
  [step-beat-slate](../slates/engine/step-beat-slate.md) ·
  [atlas-slate](../slates/client/atlas-slate.md) ·
  [iconography-slate](../slates/client/iconography-slate.md) ·
  [card-sizes-slate](../slates/client/card-sizes-slate.md) ·
  [tooltip-slate](../slates/client/tooltip-slate.md) ·
  [spoiler-slate](../slates/platform/spoiler-slate.md)
- [tooltips.md](../subsystems/tooltips.md) ·
  [subscription.md](../subsystems/subscription.md) ·
  [location-graph.md](../subsystems/location-graph.md) ·
  [boundary.md](../subsystems/boundary.md) ·
  [card-surface.md](../subsystems/card-surface.md) ·
  [client-shell.md](../subsystems/client-shell.md) ·
  [zone.md](../subsystems/zone.md)
