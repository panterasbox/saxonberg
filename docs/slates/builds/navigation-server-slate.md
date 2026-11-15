# Navigation server slate — what the server must change for the client's models

**Status:** slated 2026-11-14, a sub-slate of the navigation build
([navigation-requirements](../../requirements/navigation-requirements.md)).
**Size:** a set of light server touches. The owner's plan: *"a first pass
trying not to touch the server much, then follow up — some light server
touches are probably fine."* Each item says whether the navigation build
needs it (**first pass**) or it follows (**follow-up**).

⭐ **Priority (the owner, 2026-11-14):** this server work comes first, so
the client is unblocked as soon as possible. The order: this slate's
first-pass items (S0–S15) as one server build; [zone-instancing-slate](./zone-instancing-slate.md)
as its own build beside or after it; then the tooltip build and the
navigation pane on the client.

The client draws the pane from four classes of data:

| class | meaning | latency |
|---|---|---|
| **A — on the client today** | pushed on every move in `Whereabouts`, for the room you stand in | instant |
| **B — on the client after the navigation build** | the copy of your map documents, and the zone-facts read | instant |
| **C — a server round trip** | fetched on hover, then cached (glossary terms through the help REST API; later, a live describe) | ~100 ms once |
| **D — the server does not have it** | the items below | none until built |

**What `Whereabouts` carries today (A)**, for the current room only: the
place's name; the building's name; every enclosing Locality's **name and
address**, outermost first; `x, y, z`; the perceivable exits as
`WayRecord`s (direction, state, `crossesZone`, destination name, the
boundary's name); weather, season, day or night; the innermost
jurisdiction's name.

## The items

### S0 — Retire `locate` **[first pass — DECIDED, the owner 2026-11-14]**
`locate <target>` walks any target's containment chain out to its zone and
prints it, over the scope `["online", "/stuff/**", "/platform/**"]` — an
**omniscient where-is** on every player, older than the map's knowledge
model and its firewall. It undercuts `scry` (remote perception is an
instrument's, and may refuse) and breaks the pets drive's doctrine
(*"ownership must never locate"*). Each of its jobs has a home:

| its job | its home |
|---|---|
| where is *that* (anything, anywhere) | gone — `query` lists what you can reach; `scry` is the costly far sight |
| where am I | the navigation pane (the Locality crumbs, the Zone block) |
| at sea, the reckoning | **`course`**, which already reads it (bare `course`) — and stays **helm only**: a passenger knows what they can see and what the crew says |
| in port, *made fast alongside …* | the pane's outer position for the ship |

Touches: `LocateController` + its view and controller row, the
affordance on the perceiver mixin, `Perceiver` mentions, `Ship.aboard`
test, three wire tests that run `locate me` (pets, maritime-space,
river-e soak) — they read the reckoning through `course` or assert the
state — and `perceiver.md`, `senses.md`, `ship.md`, `expanse.md`.

### S1 — Claims carry where the place is **[first pass — in the requirements]**
Zone, coordinates and level written on every place claim at perception
time; a told or charted source passes on what it knew. Without it no map
can be drawn from your knowledge ([location-graph.md](../../subsystems/location-graph.md);
the firewall decides it).

### S2 — The copy of your map reaches the client **[first pass — in the requirements]**
A transport for your map documents, kept current by deltas, repaired
after a gap, consistent across a reconnect, a restart and a second
device. Reuse the subscription path or card pushes before adding a third
push path ([client-knowledge-model-slate](./client-knowledge-model-slate.md)).

### S3 — A zone-facts read **[first pass]**
The zone's kind and cell size, and a **derived label** (*"this grid of
rooms, 3 m cells"*) — never its true extent or levels, which would tell you
what you have not explored. The zone's path travels spoiler-tagged (S9).

### S4 — Each Locality on the wire **[follow-up, partly first pass]**
Today only a Locality's name and address reach the client, and only the
**innermost** jurisdiction. A breadcrumb's tooltip wants, per Locality:
its government (the Locality carries `_governmentKey`), its kind (realm,
city, district — derived from the address tier; there is no field), and
its description once Localities have one (23 of 24 have none; needs
Named/Visible on Locality, per
[locality-knowledge-slate](./locality-knowledge-slate.md)). Climate lean
and street lighting are on the Locality too, but read as outdoor
conditions (the status bar's). **First pass:** government and kind, cheap
reads on the coverage walk `Whereabouts` already does.

### S5 — The first-visit claim for a Locality **[first pass — in the requirements]**
Entering a Locality you have no claim for writes one with what it
declares learnable; the breadcrumb reads it.

### S6 — A route plan reaches the client as data **[first pass]**
`RoutePlan` (legs, cost, assumptions) is plain data, but `route` prints
MML only. The route lens and a room tooltip's *To get there* need the
structured plan — knowledge-gated, planned over your own map, never the
index.

### S7 — What a door looked like when you saw it **[first pass]**
Edge claims do not record a way's state (`open · shut · locked · window`)
at the time you saw or tried it. The *refused* lens and a door's *last you
knew* need it. Banked like the keywords are: what you saw is what you
learned.

### S8 — Door names and openings on edge claims **[follow-up]**
A way's boundary name (*the iron-bound door*) and opening reach the client
only for the room you stand in. A tooltip on a remote way shows *a door*
until this lands.

### S9 — Paths travel spoiler-tagged **[first pass]**
⚠ A claim's `place` is the place's **identity path** and its `label` its
**template path** (`Cartographer` writes it as *"the row behind the
place"*). The owner's position (2026-11-14,
[spoiler-slate § Paths are a spoiler](../tails/spoiler-slate.md)): **paths
are a spoiler on the appetite axis** — hidden by default, one deliberate
click to see, never prevented. So the copy of your map carries them
**tagged with a spoiler level**, as the wiki's reveal model does
(*appetite keeps and tags; capability deletes*), and the client collapses
them unless the player's appetite says otherwise. The same holds for a
zone's path (S3) and anything else a tooltip shows that names a row.

### S10 — A ship is a Locality **[first pass]**
Aboard, **the ship is your Locality** (the owner): the last crumb. Today a
ship has no address, so it resolves to no Locality and files no map.
Either a ship covers its own address, or the crumb line takes a ship crumb
from the ship itself. And the Zone section shows **two nested positions**:
you within the ship (its deck frame), and the ship within the world — at
sea the **reckoning** on the Expanse (worded by your skill, never the true
position; `course` already computes it), in port **where she is made
fast** in the wharf zone, on a river the reach and how far along. The
retired `locate` already worked out the three outer cases.

### S11 — The jurisdiction aboard a ship **[first pass — a bug]**
`whereabouts` reads `governmentAt(address)`; aboard a ship it says *no
government claims this ground* while the `government` verb, through
`subjectTo`, answers the port and then the flag state. The pane must use
the same read the verb does.

### S12 — Moving places change Locality while you stand still **[first pass]**
A river patch's address follows its km, so drifting carries you across
Localities. The pane refreshes on a move today; it must also refresh when
your covering Locality changes under you.

### S13 — Elevation is not z **[to examine]**
The owner: *"z is discrete position on a fixed grid, and that grid changes
frequently. Elevation is elevation — determined by biome and location and
all sorts of other things; an expression of your actual setting in the
narrative."* The pane shows `z:` as position only and elevation as a
setting fact. ⚠ `ZoneApi.elevationFor` computes height as *zone elevation
+ z × cellSize*, tying the two together — examine whether the code's model
is wrong before anything reads it for the pane.

### S15 — A claim's zone is the copy's identity **[first pass]**
A room inside a copy (a house on a lot, a dorm room, a smack's decks, a
reach patch) is stamped today with **its row's zone**, shared by every copy,
and **derived coordinates** that collide between copies (*frames* —
[zone-instancing-slate](./zone-instancing-slate.md)). So S1 records, for
such a room, **the copy's identity** — the key its warren mints — as the
zone, and the copy's coordinates. House A and house B are separate on your
map from day one, and when zone instancing makes that key a real zone, the
claims already carry its identity: no migration.

### S16 — The horizon as data **[first pass]**
`query horizon` lists what can be seen from here beyond the room —
landmarks first, each with its compass point and range — but in prose. The
card's horizon section and the map's bearing ticks need it as data, resent
when what is in view changes.

### S17 — The structure as data **[first pass]**
`Whereabouts` carries only the building's name. The card wants, cheaply:
the storey you are on and the storeys, the entrance and the way to it,
height, landmark, whether its title is sold, and — outside — the
structures you are **landed at** (`Place.landedStructuresNow()`), i.e. the
faces you can reach.

### S18 — The navigation payload, pushed in sections **[first pass]**
`Whereabouts` grows into one structured payload in sections — zone, horizon,
structure, ways, place, you, movement — each versioned, each with its own
triggers (a move; a Locality change while drifting, S12; a door you can see
opening; a change of pace, load or posture), and the server sends only the
sections that changed, coalescing to one push per beat while steps are
queued. Measure the sizes before committing to the shape.

### S19 — Movement in progress, from the engagement **[first pass / follow-up]**
The movement block reads whatever movement engagement you are in: its
destination, legs done and left, ETA, pace, and what would stop it. The
shipped Journey ([logistics.md](../../subsystems/logistics.md)) exposes its
progress this way; the queued walk (the movement build) does too; voyages
and freight later. One shape, so the card never learns a new transit kind.

### S20 — The horizon, one computation on one frame **[first pass]**
Ashore the horizon is an authored list of zones with no bearing or range;
at sea it is geometry. The [geography-slate](./geography-slate.md) gives
the land the sea's frame — Localities carry geographic anchors, landmarks
their own points — and the horizon becomes one computation everywhere
(bearing, range, visibility by height, elevation and curvature), with the
authored lists kept as occlusion and reach overrides. S16 sends its result
as data.

### S14 — *Terminus City* **[first pass — content]**
Two Localities are both named *Terminus* (the realm and the city), so the
crumbs read *Terminus › Terminus*. Rename the city's row (`terminus-city.yaml`)
to *Terminus City* (the owner: *"fine for now"*). ⚠ Not a one-line edit:
TPA boards name destinations by Locality name, and the name lookup resolves
the collision to the broader place today — the build checks both.

## Not here

- **A live describe** for items, people and doors you are looking at —
  the [tooltip-slate](./tooltip-slate.md)'s.
- **Glossary terms** — the help REST API already serves topics (class C);
  no server change.
- **Trail, notes, prices seen, NPC hours** — the *your map grows* build.
