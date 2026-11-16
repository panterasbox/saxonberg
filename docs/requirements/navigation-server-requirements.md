# Navigation server pass — requirements

**Status:** DRAFT — 2026-11-16.

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
[navigation-server-slate](../slates/builds/navigation-server-slate.md)
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
- **In flight:** size-and-carrying (build-1, in finalize) adds the words for
  a load and what it bars (clearance, hands needed) and the stoop and crawl
  paces.

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
- **The ways say whether you can take them** and, if not, which gate —
  always the same answer trying it would give — and describe a boundary by
  what it is made of, so a new kind of boundary needs no client change.
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
  the [tooltip-slate](../slates/builds/tooltip-slate.md).
- **One horizon computation for land and sea** (S20; bearing and range
  ashore) → [geography-slate](../slates/builds/geography-slate.md), its own
  build. This build sends today's horizon as data.
- **Movement in progress** (S19) → the movement build
  ([step-beat-slate](../slates/builds/step-beat-slate.md)).
- **A remote way's door name and opening** (S8) → a follow-up of this
  slate.
- **A Locality's description** (S4) → [locality-knowledge-slate](../slates/builds/locality-knowledge-slate.md);
  23 of 24 have none to send.
- **Renaming *Terminus City*** (S14) → the realm-naming conversation (no
  slate yet). Every name is placeholder but Terminus and Eternal
  University; the criterion until then: **rename only when a duplicate
  breaks something a player does.** The crumbs tell the realm and the city
  apart by their kind.
- **Zone instancing** (copies as real zones; frames retired) →
  [zone-instancing-slate](../slates/builds/zone-instancing-slate.md); this
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
- **size-and-carrying** (build-1) — the *you* section shows a load in its
  words; whichever merges second reconciles.

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

### Sections, and only what changed **[DECIDED]**
Zone · Localities · horizon · building · ways · place · you. Each is sent
when it changes — a move, a Locality changing under you, a door you can
see opening, a change of pace, load or posture. The sizes are measured and
recorded before the shape is fixed.

### `locate` is retired **[DECIDED — the owner]**
`query` for what you can reach, `course` at the helm for the reckoning, the
pane for where you are, `scry` for the costly far sight.

## Lens pass

1. **Pedagogy** — keeps the lookout a skill (the horizon is a glance) and
   the reckoning the navigator's. No Discipline is exercised by the data
   itself; a cartography Discipline waits until a map can be wrong in a
   way skill corrects.
2. **Creative expression** — the ordinary case is no code: a new zone,
   Locality, building or boundary describes itself. A pack's bespoke
   boundary is projected by what it composes.
3. **3a immersion** — removes two betrayals: the omniscient `locate`, and
   *no government claims this ground* aboard a ship that `government` says
   is flagged. **3b participation** — what a player knows becomes
   something the client can show, which is what lets maps be traded,
   charted and lied about later.
4. **Values** — the firewall *is* the value: the interface never knows more
   than you. Paths as spoilers keeps the curious one click away, never
   prevented.
5. **Continuity** — the same data in every epoch; a ship or a cart of
   another age answers the same sections.
6. **Economy** — produces nothing in the world; the pilot's and the chart's
   claims gain the places' positions, so what they sell is worth more.
7. **Governance** — the jurisdiction aboard is the same read as the
   `government` verb; judges no one.

⚠ **Gap:** for the interval until the pane ships, nothing reads this — the
drive is the only reader.

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
7. `instant` · player — `route to` a distant known room: the plan arrives
   as data (legs, cost, its least certain step) and says what the prose
   says. A place you do not know is refused the same in both.
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
    dark, the copy gains nothing from `look`. (Light.)
15. `instant` · player — The you section: your pace, the load you bear in
    its words and what it bars, the light you carry, your posture, a mount.
    Pick up something heavy: only the you section is sent again.
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
- Every way says whether it can be taken now, and its refusal matches
  trying it word for word.
- Aboard a ship, the ship is the last Locality and the jurisdiction matches
  `government`.
- The horizon arrives on arrival and never while standing still.
- No path reaches the client untagged; nothing reaches it that the player
  does not know.
- `locate` no longer exists; the reckoning is `course`'s at the helm.

## Cross-references

- [navigation-server-slate](../slates/builds/navigation-server-slate.md) —
  the items (S0–S7, S9–S12, S15–S18, S21, S22 here; S8, S13, S14, S19, S20
  elsewhere)
- [navigation-requirements](./navigation-requirements.md) — the client half
- [location-graph.md](../subsystems/location-graph.md) — the map and the
  firewall
- [card-surface.md](../subsystems/card-surface.md) — today's push
- [boundary.md](../subsystems/boundary.md) — the way record
- [zone-instancing-slate](../slates/builds/zone-instancing-slate.md),
  [geography-slate](../slates/builds/geography-slate.md),
  [tooltip-slate](../slates/builds/tooltip-slate.md),
  [spoiler-slate](../slates/tails/spoiler-slate.md)
- size-and-carrying (build-1) — the load words the *you* section uses
