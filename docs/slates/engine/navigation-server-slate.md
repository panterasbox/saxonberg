# Navigation server slate — what the server must change for the client's models

**Status:** slated 2026-11-14; ⭐ **first pass BUILT** by the
navigation-server build (MR !595, 2026-11-17) — see § Left after the first
pass for what remains. A sub-slate of the navigation build
([navigation-requirements](../../requirements/navigation-requirements.md)).
**Size:** a set of light server touches. The owner's plan: *"a first pass
trying not to touch the server much, then follow up — some light server
touches are probably fine."* Each item says whether the navigation build
needs it (**first pass**) or it follows (**follow-up**).

⭐ **Priority (the owner, 2026-11-14):** this server work comes first, so
the client is unblocked as soon as possible. The order: this slate's
first-pass items (S0–S15) as one server build; zone instancing ([zone.md § Copies](../../subsystems/zone.md), shipped MR !599)
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
push path ([client-knowledge-model-slate](../client/client-knowledge-model-slate.md)).

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
[spoiler-slate § Paths are a spoiler](../platform/spoiler-slate.md)): **paths
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
zone instancing ([zone.md § Copies](../../subsystems/zone.md), shipped MR !599)). So S1 records, for
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
at sea it is geometry. The [geography-slate](../world/geography-slate.md) gives
the land the sea's frame — Localities carry geographic anchors, landmarks
their own points — and the horizon becomes one computation everywhere
(bearing, range, visibility by height, elevation and curvature), with the
authored lists kept as occlusion and reach overrides. S16 sends its result
as data.

### S21 — A richer way record **[first pass]**
`WayRecord` carries direction, state, `crossesZone`, the destination's name
and the boundary's name. The ways section wants, per way: one-way, muffled,
the media it needs (climb, swim), a track's length, the opening, and
⭐ **whether you can take it now and, if not, which gate** — a dry run of
the real `canTraverse`, so it can never disagree with trying. ⭐ The
boundary's part is **its own projection by composition**: which
navigation-relevant mixins it composes and each one's facts (open or shut;
locked, whether you hold the key, opens free from one side, closes behind
you; the channels it passes; grime) — never a fixed door/window shape, so
a pack's new boundary is described with no client change. Reuse the
projection the inspection card already uses before adding a hook.

### S22 — The place and you, as data **[first pass]**
The place section: light, open sky, water (depth, current), staged or
persistent, crowding — reads `look` already does — plus your map's
`searched` claim and the hazards you have found there (confirm discovery is
recorded per player — [concealment.md](../../subsystems/concealment.md)).
The you section: your pace (`movement.defaultMode`), endurance, load and
what it bars (size-and-carrying), the light you carry, posture, a mount or
vehicle.

### S14 — *Terminus City* **[first pass — content]**
Two Localities are both named *Terminus* (the realm and the city), so the
crumbs read *Terminus › Terminus*. Rename the city's row (`terminus-city.yaml`)
to *Terminus City* (the owner: *"fine for now"*). ⚠ Not a one-line edit:
TPA boards name destinations by Locality name, and the name lookup resolves
the collision to the broader place today — the build checks both.

## Left after the first pass (navigation-server, MR !595)

Built: the one subscription protocol (`docs/subsystems/subscription.md`),
your map as a copy and where-you-are as seven sections, claims that know
where (`location-graph.md`), ways that never disagree with trying
(`boundary.md`), `route` as data, `locate` retired. What the build left:

- **Section fields not computed:** `place.staged` / `searched` / `found`;
  the building's `entrance` beyond `{ here: true }` (its name and the first
  direction toward it, from your map).
- **A remote way's door name and opening on edge claims (S8)** — attaches at
  the cartographer's edge claim, beside `state`.
- **A named reach on `LineFrame`** (the outer crumb says the river and km);
  **a trail of reckonings** (one reckoned claim per sea today) — the
  *your map grows* build.
- **The room card's `exits` refreshing on a door** — `Exit.wayChanged()` is
  the seam (boundary-slate).
- **Movement in progress (S19)** — an eighth section of the same source
  (step-beat-slate).
- **Renaming the two shipped registries to sources** — a naming sweep.
- **`you.hands` pairs held things to hand slots by order** — a per-slot
  read on `Attired` would be exact.
- **Not driven** at the build's drive: the Delve's lower level (dark), the
  two charts, two holdings of one plan, the horizon at the headland beyond
  geography's step 15, the Kestrel, the mounted / led / pole cases — their
  substrate is unit-tested.
- **Card pause / resume** — crowded-rooms carries it; on this protocol it is
  `subscription-pause` / `-resume`, the paused flag in the MQL source's
  state, resume answering `subscription-result` at rev 0.

**What the drive found** (the plan's drive record, kept here when the plan
retired): the map copy's read refused itself at its own gate; the building
section's name read empty; ⭐ **concurrent writes to one map document lost
claims** (a look, the walked edge and the walked place each loaded, grew and
saved the same document — now serialized per document); ⭐ `route` printed a
row path when an edge claim's `toLabel` (a path) was taken for a name; ⭐ the
horizon section, the place's first read at a session's open, took the
unread weather as clear and named a light eighteen miles off through fog (it
now stands the horizon up first, as a `look` does). Drive premises
corrected: the Delve is pitch black past its mouth and covered by no
Locality (so a walk there writes nothing, rightly), and Duncan Hall has no
Building row. ⚠ Open, not this build's: the sync horizon read still answers
unknown weather as clear (`seeingFrom` on a null `peekSkyType`) for any
caller that has not stood the place up.

## Not here

- **A live describe** for items, people and doors you are looking at —
  the [tooltip-slate](../client/tooltip-slate.md)'s.
- **Glossary terms** — the help REST API already serves topics (class C);
  no server change.
- **Trail, notes, prices seen, NPC hours** — the *your map grows* build.

## Reuse ledger for the plan

From the requirements survey (2026-11-16, verified against `cc6f8dc60`).
Every row is one the plan must account for: reuse, generalize, or say why not.

| concept | what already does it | this build |
|---|---|---|
| a claim | `MapClaim` (`lib/location/MapClaim.ts`); writers `Cartographer.recordPerceived` / `recordTimetable` / `recordTraversal`, `Charted.ts` | extend — add zone, coords, level; no new writer |
| the push | `SaxonbergClient.refreshNavigator` → `touchCard(…, {kind:'navigation', where})`, only while the `map` card is open; card-surface's card-touched wire | reuse the card wire before any third path; the copy's transport is the open question |
| live results | MQL subscriptions (per-Stuff field descriptors) | consider for the copy's deltas; say why not if unused |
| zone facts | the zone class is the kind; `CartesianZone.getCellSize`; `SpatialZone.getExtentM` (⛔ never sent) | read only |
| Locality chain | `AddressApi.coverageChainOf` (Whereabouts, `Perceiver.ts:252`); `_governmentKey` | add government + kind (kind derives from the address tier — no field) |
| route | `RoutePlan` (`lib/location/RoutePlan.ts`), `RouteController` prints MML | send the same plan as data |
| a way | `Exit.wayRecord()`; flags `oneWay`/`muffled`/`media`/…; `canTraverse` → `TraversalGuard` (overrides: KeptDoor, AshoreExit, BerthExit, SandboxCrossingExit) | extend; ⚠ verify every override is side-effect free before using it as a dry run |
| boundary projection | none — lock/door mixins have no subscribable fields | new, by composition |
| horizon | `PerceptionApi.horizonFor` → `HorizonView`; `HorizonWatch` (never pushes) | send on arrival only |
| structure | `Structure` getters (`getStoreys`, `storeyOf`, `getEntrance`, `isLandmark`, `getHeightM`, `isTitleSold`, `landingsNow`); `Place.landedStructuresNow()` | read only |
| jurisdiction aboard | `GovernmentLogic.subjectTo` (ship chain first); Whereabouts uses `governmentAt(address)` | switch Whereabouts to the verb's read |
| ship position | `LocateController` `whereSheLies` (alongside / under way), the reckoning; `MovingZone.getAddress()` follows the reach | move into the section; the river reach is new |
| copy identity | `Warren.mintedKeyOf` (FloorplanWarren: holdings, ships, mines); `ReachWarren` already mints a zone per member; DormWarren keys by parcel extent | one identity for every copy kind — ⭐ the **`FloorplanWarren.zoneFromFor(spec, key)` path** (the holding's key; a ship's `<kind row folder>/<serial>`, `ShipWarren.ts:281`), which zone instancing (build-4) mints as the zone's identity, so claims need no migration; a reach/sea patch room keys on the **river/sea position**, never the patch; dorms and Seznick House's let units take the same route (`DormWarren.standUpHolding` clones a `HoldingWarren` programme keyed on the unit's parcel extent, so `zoneFromFor`'s default is the extent) — record the extent; build-4 re-keys the one-room case's room, not the zone |
| discovery | belief DISCOVERY realm (`hasDiscovered`) | read only |
| the you section | `movement.defaultMode`, `Posed.getPosture`, `Mountable`, `LoadBearing` (`borneBurden`, `loadRatio`; size-and-carrying adds `burdenWords`, the clearance/hands-needed gates) | read only; reconcile with build-1 |
| spoilers | wiki `SpoilerLevels` (`lib/wiki/render.ts`), `FieldMetaEntry.spoiler` | reuse; place paths among the levels |
| elevation | `ZoneApi.elevationFor` (zone chain only — z already excluded) | read only |

**Slate corrections found by the survey:** S13's formula is a stale comment
(`SpatialZone.ts:330`), not the code; S0's `locate me` users are maritime,
river-e soak and `Ship.aboard.test.ts`, not pets, and eight docs name it;
S10's `locate` had no river case; S14's board label comes from the
Locality's name (`FastTravel.getDestinationLabel`), not a name lookup.
