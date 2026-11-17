# Navigation server pass — requirements

**Status:** AGREED — 2026-11-16 (the builder lens on the map parked to map-slate).

**Kind:** feature (server half of the navigation build)
**Leads from:** kernel. **First consumer:** the navigation pane
([navigation-requirements](./navigation-requirements.md)), which ships after
the tooltip build — ⚠ so for that interval nothing on the client reads what
this build sends. The owner accepted that (2026-11-16): the wire drive is
the proof, and the pane is the reader. The content it is driven over is
already in the game: the Sunken Delve, the lounge, the Hesper and the
Greywater, the Kestrel, Rejection's tracks.

The navigation pane draws **what you know of where you are**, and today the
server cannot say it. Your map records places with no idea where they are,
nothing about your map ever reaches the client, and the only thing pushed
is a short where-you-are summary for the room you stand in. This build makes
the server able to tell the client, **as data**, two things and never a
third: **your knowledge** (your map, kept current on the client as a copy
the server owns) and **what you perceive from here, now** (the zone, your
Localities, the horizon, the building, the ways, the place, yourself).
**Never the world as it really is** — the world's index stays on the
server. It also retires `locate` and fixes the jurisdiction read aboard a
ship. Seeding slate:
[navigation-server-slate](../slates/engine/navigation-server-slate.md)
(its first-pass items); the client half is
[navigation-requirements](./navigation-requirements.md).

## What the thing is

- **Interface, not fiction.** No new object, place or verb; the same in
  every epoch. Whether a realm hands out maps is content.
- **Two sources, never a third.** Every field is either *your knowledge* (it
  persists, it is yours, it can be wrong or stale) or *what you perceive
  from here now* (ephemeral, gone when you leave). The firewall between
  your map and the world's index is the build's invariant.
- **One copy per player, pushed on change.** Cheap enough to send on every
  move: only what changed travels.
- **Absent, never guessed.** A field the server cannot supply is missing,
  not filled.

## What already exists

- **Your map** — claims on four channels (`walked` · `seen` · `searched` ·
  `published`, plus charted and told claims from charts and the pilot),
  filed per Locality. `map` and `route` read it. Claims record what a place
  is called and how you know it — **not where it is**.
- **The where-you-are push** — for the room you stand in only: the place,
  the building's name, your Localities by name and address, coordinates,
  the ways you can see (direction, state, whether it leaves the zone,
  where it goes, the boundary's name), the weather, and the innermost
  jurisdiction. It is sent only while the map card is open. Nothing about
  your map reaches the client.
- **`route`** plans over your own map and states its assumptions — in prose
  only.
- **The horizon** — `query horizon` / `scan horizon`: at sea with bearing
  and range, ashore by name only. ⭐ Nothing on the horizon is ever pushed:
  noticing is the lookout's act (`watch horizon`, the hired lookout).
- **`government`** answers aboard a ship (the port, then the flag); the
  where-you-are push does not — it says *no government claims this
  ground*.
- **`locate`** — an omniscient *where is anything*, on every player.
- **Discovery** of hidden things is already recorded per player; elevation
  is already separate from `z` (a test holds it).
- **Spoilers** — the wiki's reveal model (capability deletes, appetite
  keeps and tags).
- **Size and carrying** (build-1; it merges before this build starts, so it
  is treated as shipped): a way now refuses by **clearance** (your body
  against its opening, a held thing against it, a long thing against a
  stair's turn, a cart, a led animal, a rider) and by **hands** (a ladder
  wants both), and the refusal **names what would work** — *"you'd have to
  stoop — `stoop north`"*, *"remove backpack"*, *"you'd have to dismount"*.
  `stoop` and `crawl` are paces; a low ceiling refuses `stand`. Things are in
  a hand, ready, worn or packed; a load has words for what it costs; a
  pack animal is led on a rope that takes a hand; a hitched cart fills the
  hands its row says. ⭐ Its perceiving rule: **anything that shows a result
  shows only what you perceive** — the client's cards included. And a
  **builder lens** (`lens on`) lets you perceive everything inside extents
  you hold, labeled builder information.

**Therefore what is genuinely new here is:** where a place is, on every
claim; your map reaching the client and staying current; a first-visit
record for a Locality; the ways, horizon, building, place and you as data;
a ship as your Locality; and the retirement of `locate`.

## Goals

- **Your map knows where places are.** Every claim — walked, seen,
  searched, published, charted, told — records the place's zone, its
  coordinates and its level as you learned them; a told or charted claim
  carries what its source knew.
- **Copies are separate places.** A room in a copy of a row (a house on a
  lot, a dorm room, a ship's decks) is recorded under **that copy**, so
  house A and house B never merge on your map.
- **Your map reaches your client whole** — every claim with how you know it
  (walked, seen, searched, published, charted, told and by whom) and when,
  so two claims that disagree arrive side by side.
- **Your map reaches your client and stays right** — after a move, after a
  gap, across a reconnect, a restart and a second device — and nobody
  else's map ever does.
- **A first visit to a Locality is remembered** with what it declares as
  learnable (its name, its government, its kind).
- **What a door looked like when you saw it** is on your map: open, shut,
  locked, a window — what you saw, not what it is now.
- **A route is data** as well as prose, planned over your map.
- **Where you are, as data, in sections** — the zone (kind, cell size, a
  derived label — never its true extent or levels), your Localities
  outermost first (each with its government and kind), the horizon as you
  arrive, the building, the ways, the place and you — and only the sections
  that changed are sent.
- **The ways say whether you can take them** and, if not, which gate **and
  what would work** (stoop, crawl, take the pack off, dismount, free a
  hand) — always the same answer, in the same words, trying it would give —
  and describe a boundary by what it is made of, so a new kind of boundary
  needs no client change.
- **Aboard a ship, the ship is your Locality**, and where she is (made
  fast at a wharf, at sea, on a river's reach) is a second position; the
  jurisdiction aboard is the one `government` gives.
- **Drifting changes your Locality** without your moving, and the client
  is told.
- **Paths are spoilers**: everything that names a row travels tagged,
  hidden by default.
- **`locate` is gone.**

## Non-goals

- **The pane, the map renderer, the tooltips** → the navigation build and
  the [tooltip-slate](../slates/client/tooltip-slate.md).
- **The builder lens on the map** — your own extents drawn from the world
  rather than from your knowledge, labeled builder information →
  [map-slate](../slates/client/map-slate.md). Lens 2 wants it (an author
  should see the zone they are drawing); it is its own decision about the
  firewall, so not here. With the lens on, this build's copy is still only
  your knowledge.
- **One horizon computation for land and sea** (S20; bearing and range
  ashore) → [geography-slate](../slates/world/geography-slate.md), its own
  build. This build sends today's horizon as data.
- **Movement in progress** (S19) → the movement build
  ([step-beat-slate](../slates/engine/step-beat-slate.md)).
- **A remote way's door name and opening** (S8) → a follow-up of this
  slate.
- **A Locality's description** (S4) → [locality-knowledge-slate](../slates/engine/locality-knowledge-slate.md);
  23 of 24 have none to send.
- **Renaming *Terminus City*** (S14) → the realm-naming conversation (no
  slate yet). Every name is placeholder but Terminus and Eternal
  University; the criterion until then: **rename only when a duplicate
  breaks something a player does.** The crumbs tell the realm and the city
  apart by their kind.
- **Zone instancing** (copies as real zones; frames retired) →
  [zone-instancing-slate](../slates/engine/zone-instancing-slate.md); this
  build records the copy's identity so that build needs no migration.
- **Glossary terms, a live describe of what you look at** → help's REST
  surface and the tooltip slate.
- **Your trail, notes, prices seen, freshness** → the *your map grows*
  build.

## Placement

Kernel — the map, perception and the push are the platform's. No pack
gains code; a new zone, Locality, building or boundary needs only its own
rows. ⭐ The test: a pack's new kind of door is described on the ways with
no client change and no kernel edit.

## Collisions

- **Every writer of your map** — walking, looking, searching, the
  timetables, charts, the pilot's told claims — writes the new fields.
  Maps already on disk lack them: the dev worlds are dropped (no players,
  no migration).
- **`map` and `route`** read the same claims and must not change what they
  say.
- **The maritime and river drives** use `locate me`; they read the
  reckoning through `course` instead. `locate` is named in eight subsystem
  docs.
- **The horizon watch and the hired lookout** — the horizon section is a
  glance on arrival, never a feed (decision below).
- **The Hesper and the Corrigan, the river boats, the dinghy** — a ship as
  your Locality; a boat on the Kestrel carried across Localities.
- **Holdings, dorm rooms, ships of a kind, mines** — copies of one row.
- **The map card** — today's only push; the new sections must not break
  the text navigator that reads it.
- **size-and-carrying** (build-1, merged first) — the ways section speaks
  its gates and its *what would work*; the *you* section its hands, paces,
  load words, mount, led animal and cart; the place section its low
  ceiling; and every section obeys its perceiving rule. The sites it built
  (the low door, the crawlway, the tight stair, the ladder, the mule, the
  handcart) are where this drive checks the ways.

## Surface decisions

### The horizon is a glance, not a feed **[DECIDED — lens 1]**
The horizon section is computed when you arrive somewhere, as `look` is. A
sail coming into view while you stand still reaches you only through
`watch horizon` or a lookout — the shipped rule that noticing is an act.
Pedagogy decides it: the lookout is a skill, and a pane that pushed every
change would be a free radar.

### Today's horizon, as data **[DECIDED]**
At sea, each sighting with its bearing and range; ashore, each by name,
landmarks first. Bearing and range ashore wait on the geography build.

### Elevation is a setting, z a position **[DECIDED — the owner]**
Already true in the world (the slate was wrong). Elevation travels in the
place section as a fact of your setting; `z` only as grid position.

### A copy is recorded as itself **[DECIDED]**
A claim for a room in a copy names the copy, with the copy's own
coordinates — never the row's zone, which every copy shares.

⭐ **Moving water is the exception** (agreed with zone instancing,
2026-11-16): a patch of river or sea is the water within hail of you as it
passes, not a place you could come back to. A claim made in one records
**the river or the sea and where on it you were**, never the passing
patch.

### Your map is yours alone **[DECIDED — the firewall]**
The client receives your claims and the present section for where you
stand; nothing derived from the world's index, and nothing from another
player's map. A zone's facts are its kind, cell size and a derived label —
its extent and levels would tell you what you have not explored.

### Paths are spoilers **[DECIDED — the owner]**
Every identity or template path the client receives is tagged as a spoiler
on the appetite axis. Where paths sit among the spoiler levels is this
build's to settle in the plan, on the wiki's model.

### The ways cannot disagree with trying **[DECIDED]**
*Can you take it* is the same check moving runs, asked without moving.
Its refusal is the same gate in the same words.

### Aboard a ship **[DECIDED — the owner]**
The ship is the last crumb. The second position: in port, *made fast
alongside* the quay; on a river, the reach and how far along; at sea, *at
sea* — the reckoning itself only at the helm (`course`); a passenger knows
what they can see.

### What the ways and the you section say **[DECIDED]**
A way: its direction, where it goes as you know it, its state, whether it
leaves the zone, one-way, muffled, what it needs (swim, climb, a free hand),
a track's length, its opening, and **can you take it now** — and if not,
the gate and what would work, in size-and-carrying's words. You: your pace
(including stoop and crawl), your posture, what each hand holds, the load
in its words and what it bars, the light you carry, and anything with you —
a mount, an animal on a rope, a cart in hand. Nothing on either is a number
a player must interpret where the game already has words.

### Only what you perceive **[DECIDED — size-and-carrying's rule]**
Crowding counts the people you perceive; a hider you have not found is not
in it. A held thing shows on the you section; another's covered pockets
never reach a place section.

### Sections, and only what changed **[DECIDED]**
Zone · Localities · horizon · building · ways · place · you. Each is sent
when it changes — a move, a Locality changing under you, a door you can
see opening, a change of pace, load or posture. The sizes are measured and
recorded before the shape is fixed.

### `locate` is retired **[DECIDED — the owner]**
`query` for what you can reach, `course` at the helm for the reckoning, the
pane for where you are, `scry` for the costly far sight.

## Lens pass

Altitudes: **invariant** (the platform's law) · **grain** (a default an
author may change) · **title** (a realm's or a player's own).

1. **Pedagogy.** *Generates:* source criticism. Every claim on the copy
   carries how you know it (walked, seen, searched, published, charted,
   told — and by whom), so a wrong chart or a lying pilot is *legible*: the
   pane can show a told claim beside the walked one that contradicts it,
   and a player learns to weigh sources by being burned (the old chart of
   the Greywater already does this). The ways teach the physical model —
   *why* you cannot pass is a derivable reason (your height, the pack's
   width, both hands for a ladder), never a stat. The horizon stays a
   glance so the lookout stays a skill. **Invariant:** the interface never
   explains more than the world would. **Gap:** no Discipline reads a
   map yet; a cartography Discipline waits until a map can be wrong in a way
   skill corrects (it can now be wrong — the seed of it is here).
2. **Creative expression.** *Generates:* mazes, secret doors and misleading
   country that work with no code, because the map shows only what you know
   and paths are spoilers (a hidden room's row name never leaks). A
   Locality decides what a first visit teaches — its name, its government,
   its kind; a closed city could keep its government to itself — **grain**.
   A pack's new boundary (a portcullis, a bead curtain, a force field) is
   described by what it is made of, with no client change — **invariant**.
   The zone's derived label is wording — **grain**. The builder lens on the
   map is the creative-expression ask this build leaves for the map slate.
3. **3a Immersion** — removes two betrayals: the omniscient `locate`, and
   *no government claims this ground* on a flagged ship. A dark room
   teaches nothing; a hider you have not found is not in the crowd; a door
   is as you saw it, not as it is. **3b Participation** — *generates:*
   knowledge as a good. Claims with positions are what a guide, a pilot, a
   chart-seller or a lying map-maker sells; the copy is what they would be
   selling into. The polity can do what we did not plan: a guild publishes
   a false map, a town sells the true one, a smuggler keeps a route off
   every chart — each recorded as told by whom. (Selling and copying maps is
   the *your map grows* build; this build makes the goods real.)
4. **Values.** The firewall is the value: **the interface never knows more
   than you** — **invariant**. Paths are spoilers on the appetite axis: the
   curious are one click away, never prevented — **invariant** (where paths
   sit among the levels is **grain**). Your map is yours: no one else's
   copy reaches you, and yours reaches no one — **invariant** until a
   player chooses to share it (later, by a verb).
5. **Continuity.** The same sections in every epoch: a ship of sail or
   steam, a cart or a truck answers *can you take this way* through the same
   gate; a GPS-era realm publishes claims on the `published` channel and the
   pane does not change. *Who holds the obsolete half:* `locate`'s jobs —
   all rehomed (`query`, `course` at the helm, the pane, `scry`).
6. **Economy.** Produces no goods; makes knowledge goods (charts, the
   pilot's claims) worth more, since they now carry where things are — the
   demand was there first (the pilot ships). Consumes server bandwidth on
   every move — measured before the shape is fixed; who pays is the
   operator.
7. **Governance.** The jurisdiction aboard is the `government` verb's own
   read; a Locality's government is learnable on a first visit unless it
   declares otherwise. Judges no one.

## The drive

Paces: `instant` · `short` · `staged`. Assertions: `player` or `staged`.
Every step asserts **what the client received**, over the real socket.

### Blocking drive

1. `instant` · player — `locate me` is not a verb. At the Hesper's helm,
   `course` gives the reckoning; a passenger's `course` refuses.
2. `instant` · player — A new character walks into the Sunken Delve. The
   client holds a copy of the character's map: the vestibule, walked, with
   its zone, coordinates and level. Nothing else.
3. `instant` · player — `look`: each room it can see arrives on the copy,
   `seen`, with its position. The zone facts arrive: kind, cell size, a
   label — no extent, no levels. Every path on them is spoiler-tagged.
4. `instant` · player — Walk the diagonal and go down to the pit: claims
   on two levels, the diagonal's two ends where they are.
5. `instant` · player — `search` finds the cache: a `searched` claim with
   its position arrives. A second character who has not searched receives
   nothing of it.
6. `instant` · player — In the lounge, a shut door, then a locked one: the
   ways say *shut*, then *locked* with the gate trying it gives — and
   trying it refuses in those words. The copy records the door as seen.
   Another character opens it; the first character's copy still says what
   they saw.
6a. `instant` · player — At size-and-carrying's low door, before trying it:
   the way says *you'd have to stoop — `stoop north`*; `go north` refuses in
   exactly those words; `stoop north` goes through, and the you section
   says you are stooping. At the crawlway with a pack on: the way says the
   pack won't go and to take it off; `remove backpack`, and the way says
   you can crawl it. At the ladder with a lantern and a sword in hand: the
   way says it wants both hands.
7. `instant` · player — `route to` a distant known room: the plan arrives
   as data (legs, cost, its least certain step) and says what the prose
   says. A place you do not know is refused the same in both.
7a. `instant` · player — `read` the old chart of the Greywater, then the
   survey: the copy holds both claims about the Westerlies, each saying how
   you know it (charted, and from which chart), with its position — the
   contradiction is visible as data.
8. `instant` · player — Walk into a Locality for the first time: the
   Localities section gains it with its government and kind, and the copy
   gains the first visit. The realm and the city of Terminus are told apart
   by their kind.
9. `instant` · player — Two holdings of one row: walk into house A, then
   house B. The copy holds them as two places, each with its own
   coordinates.
10. `instant` · player — Board the Hesper at the wharf: the last Locality is
    the ship; the second position, *made fast alongside*; the jurisdiction,
    the port then the flag — the same as `government`. Put to sea: *at
    sea*, and the jurisdiction the flag.
11. `instant` · player — On the headland brow: the horizon arrives with the
    light on Gannet Rock first. Stand still while the Hesper sails out of
    sight: nothing is pushed. `watch horizon` reports it.
12. `instant` · player — Inside a building: the storey you are on and the
    storeys, the entrance and the way to it, its height, a landmark,
    whether its title is sold. Outside it: the buildings whose faces you
    can reach.
13. `instant` · player — In a boat on the Kestrel, drift: the Locality
    changes while you stand still and the client is told; the second
    position names the reach and how far along.
14. `instant` · player — The place section in the Delve by day and in a
    pitch-dark room: light, sky, water, crowding, elevation — and in the
    dark, the copy gains nothing from `look`. (Light.) A second character
    hidden in the room is not in the crowding until found. In the low room,
    the place says the ceiling is low.
15. `instant` · player — The you section: your pace, your posture, what
    each hand holds, the load in its words and what it bars, the light you
    carry. `get pole`: both hands, and only the you section is sent again;
    the ladder's way now says it wants a free hand. Lead the mule on a rope:
    the you section shows it and one hand on the rope; at the narrow gate
    the way says the panniers won't fit. Mounted on the horse at the low
    door: the way says *you'd have to dismount*.
16. `instant` · player — A move sends only the sections that changed; the
    sizes of a full push and a typical move are recorded in the plan.
17. `short` · staged — Restart the world. On reconnect the copy is the
    same: nothing lost, nothing doubled. (Restart.)
18. `instant` · player — The same character from a second session: the
    same copy, and a move in one reaches the other.
19. `instant` · player — The firewall: across the whole drive, nothing the
    client received names a place the character has not walked, seen,
    searched, been told of or been shown by a chart.

### Soak drive

None — nothing here waits on the clock.

## Acceptance criteria

- A player's client holds their own map, and only theirs, current after a
  move, a gap, a reconnect, a restart and a second session.
- Every place on that map says where it is — zone, coordinates, level — as
  the player learned it; copies of one row are separate places.
- A first visit to a Locality is on the map with its name, government and
  kind.
- A door on the map reads as the player last saw it, not as it is.
- A route arrives as data that agrees with `route`'s prose.
- Where the player stands arrives in sections — zone, Localities, horizon,
  building, ways, place, you — and a move sends only what changed.
- Every way says whether it can be taken now, and if not, what would work —
  stoop, crawl, take off the pack, dismount, free a hand — matching trying
  it word for word.
- Every claim on the copy says how you know it, so two claims that
  disagree are both there, each with its source.
- Aboard a ship, the ship is the last Locality and the jurisdiction matches
  `government`.
- The horizon arrives on arrival and never while standing still.
- No path reaches the client untagged; nothing reaches it that the player
  does not know.
- `locate` no longer exists; the reckoning is `course`'s at the helm.

## Cross-references

- [navigation-server-slate](../slates/engine/navigation-server-slate.md) —
  the items (S0–S7, S9–S12, S15–S18, S21, S22 here; S8, S13, S14, S19, S20
  elsewhere)
- [navigation-requirements](./navigation-requirements.md) — the client half
- [location-graph.md](../subsystems/location-graph.md) — the map and the
  firewall
- [card-surface.md](../subsystems/card-surface.md) — today's push
- [boundary.md](../subsystems/boundary.md) — the way record
- [zone-instancing-slate](../slates/engine/zone-instancing-slate.md),
  [geography-slate](../slates/world/geography-slate.md),
  [tooltip-slate](../slates/client/tooltip-slate.md),
  [spoiler-slate](../slates/platform/spoiler-slate.md)
- size-and-carrying (build-1) — the load words the *you* section uses
