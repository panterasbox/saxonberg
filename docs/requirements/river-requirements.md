# River — requirements

**Kind:** feature
**Leads from:** content and kernel together. The river is the water
pack's, but the moving place, small craft and the sea retrofit are
kernel ground. The first consumer is the Kestrel and the Delight
themselves: Wharfside, the Delight ford, the gorge, the falls, the
estuary.

Build 2 of the water sequence (underwater → river → craft), with craft
pulled in: **one build, one MR, staged in waves**. The river has been
hydrology and law since the watershed build: named points with
elevations, a flow, a navigable flag, rights. Nobody can be in it, it has
no length, and nothing it does moves anyone. This build makes the river
**the only water with a direction**: a line with a current that carries
you, your boat, your logs and your body, unless somebody pays to go the
other way. Seeding slate: [river-slate](../slates/builds/river-slate.md).
It also takes cuts of
[ships-and-harbors-slate](../slates/builds/ships-and-harbors-slate.md)
(ships alongside rooms; the room where a ship stops) and
[decomposition-slate](../slates/builds/decomposition-slate.md) (a corpse
floats again), and retrofits the sea's small boats to the same rule.

The model below was settled in conversation with the founder over several
passes, by walking six experiences end to end (white-water rafting, a
swept swimmer, a canoe trip upstream, fishing from a drifting boat, a
ferry crossing, a paddle steamer), not by reading the slate's sections
in turn.

## What already exists

- **The water as a place** (underwater, shipped): a place can be water
  you are in, with a depth; the column of bands below a water; timed
  swims down and up; breath as a store, cold shock, drowning by cost,
  the surface hold for a disconnected body; the medium (bubbles for a
  voice, no fire, wet gear, light dimming). See
  [underwater.md](../subsystems/underwater.md),
  [respiration.md](../subsystems/respiration.md).
- **The river as hydrology** (watershed, shipped): `Watercourse` rows
  for the Kestrel, the Delight, Holloway and Cold Fell, plus the meres;
  flow from runoff and snowmelt; a current from flow over width and
  depth; navigability as a yes/no; rights; contamination by node. See
  [watershed.md](../subsystems/watershed.md).
- **Cold water** (shipped): water conducts heat away about 23× faster
  than air; hypothermia, torpor, cold shock.
- **Still-water ice** (shipped): thickness, black and snow ice, bearing,
  ice crossings. A water whose current is at least 0.5 m/s reads as
  running and does not freeze.
- **The sea** (maritime, shipped): the expanse, a frame of nodes and
  bands you cross by setting a course; ships as places with a position;
  the horizon (pull, never push); charts and pilots; `course`,
  `anchor`, `hail`, `launch`, `recover`, `pilot`, boarding and going
  ashore.
- **Traps** (shipped): hazards that pin a body, including a swimmer.
- **Weirs** exist as works (the Heart's Delight millrace, the aqueduct
  house); nothing derives what is below them.
- **The Delight ford** (shipped) closes above 12 m³/s.
- **Towpaths** (valley road, lower towpath, the reach) are rooms beside
  the Kestrel that cite nothing.
- **Readings:** `measure temperature` (the air, or a thing),
  `measure depth` (the lead line), `analyze water` (flow, ice, the tide).
- **Verbs:** `swim`/`jump`/`dive`, `climb`, `descend`/`ascend`,
  `throw … to`, `pull`, `tug`, `lie` (to float), `fish`, the helm verbs.
  ⚠ `drift` is mining's.
- **Disciplines:** swimming, diving, navigation, fishing.

**Therefore what is genuinely new here is:** the river's length and
everything derived along it; a place that moves (the water around you);
being carried, crossing, wading and getting out; small craft that go
where you would swim; ships on a river, the head of navigation and
grounding; ferries; the river's own killers and readings; the sea's
small boats brought into line; and the defect that would duplicate gear
left on a riverbank.

## The model (agreed)

### Two planes: the line and the places

- **The overworld is the river's line.** A position is km from the
  mouth, and how far across. Stretches are the river's character along
  it (pool, run, riffle, rapid, falls, gorge), all derived from the
  profile. Nothing on the line is a room.
- **Places are authored rooms at a position on the line**, like a sea
  node with rooms behind it: a quay, a ford, a landing, five rooms of
  gorge, a mill pond. A place covers its span of the line (and, on a wide
  river, the part of the width it occupies). It has a downstream end and
  an upstream end, the seams where the line hands you in and takes you
  out. A river place with no downstream end fails to load unless it
  declares itself the end.
- **One owner per length of river.** Between places, the line owns the
  river. Inside a place, the author owns the water: each water room
  inherits the line's current at its position or says otherwise (still,
  an eddy, a race). Nothing is moved by both, and they cannot disagree,
  because they own different lengths.

### Only places are tracked on the overworld

- **A ship is a place** (it has rooms), positioned on the line or the
  sea.
- **Everything else is always in a place**: a person, a canoe, a raft, a
  log, a body. A thing's position is its container's, always.
- **The water around you is a place that moves**: the reach patch, the
  water within hail of you, carried by the current plus or minus what its
  people put in. A canoe is in a patch; the patch is on the line. Its
  look is the river at its position. Its ways out (a bank, a place, a
  ship, the column below, another patch) are worked out against the line
  when you take them, so what you can do from it is bounded by where it
  is.
- **People within hail are together.** Patches merge when they come
  within hail and split when they drift out of it. A little river is
  narrower than hail and is one patch across; a wide river has several
  across, so a canoe at the margin and a steamer in the channel are in
  sight of each other but not together.
- **Stopping is landing.** A canoe cannot anchor in moving water (a stone
  killick holds it only where the current is slack). You stop by pulling
  in to a bank or an eddy, by catching on something, or by being handed
  into a place. A stop between places is a patch that has stopped: one
  room, kept while anything is in it, gone when empty. The bed under
  moving water does not move: what sinks, or whoever reaches the bed,
  is at a fixed spot there.
- **The moving place is reusable**: a river patch, someone walking the
  bank, a stopped ship's room at sea, and future content (a raft yard, an
  ice floe) are all the same idea.

### The sea, brought into line

- At sea, a launched boat is a thing in the room alongside its ship
  (from ships-and-harbors: a ship stopped at sea is alongside one room,
  the water within hail of her, carried by the set; ships stopped near
  each other share it). It is no longer positioned on its own.
- Going over the side at sea puts you in that room. Swimmers at sea now
  exist, only where a ship has stopped.
- A ship under way is alongside nothing; her boats come and go only when
  she stops.

## Goals

- A river is a line with a source, a mouth and a character along it,
  derived from its profile and overridable by authors.
- Being in a river means being carried: you feel the current every beat,
  you can be swept, you can cross, wade, get out, or be delivered
  somewhere downstream, alive or dead.
- A person can be rescued from a river by someone on the bank, wading
  in, or in a boat, and the rescuer can be swept too.
- A small boat goes where you would swim, driven by its people's arms or
  a pole or a sail, and can be poled, lined, portaged, capsized and
  fished from.
- A ship on a river is limited by the river: draft against depth by
  season, width, bends, snags, the falls. The head of navigation is a
  derived fact, and the town below it is where freight changes hands.
- A ferry crosses a river by the same physics a swimmer does, or by the
  current itself on a cable.
- The river's dangers can be read before they kill you (`look`,
  `measure current`, `measure temperature`, sound ahead).
- The sea and the river follow one rule about what is tracked.

## Non-goals

- **Floods, levees, ice jams, breakup** →
  [flooding-slate](../slates/builds/flooding-slate.md).
- **Harbors, building ships, construction** →
  [ships-and-harbors-slate](../slates/builds/ships-and-harbors-slate.md).
- **Contamination diluting along the river's length** → the watershed
  tail in [watershed.md](../subsystems/watershed.md); per-node works stay.
- **The border that follows the deepest channel** → nowhere until a
  polity needs it (governance content).
- **Locks and canals** → authored content on what this ships; a slate if
  wanted.
- **Steam engines and boilers as technology** → the machines slate. A
  river ship's fuel burn here is the minimal version.
- **Narcosis, the bends' onset delay, deep diving** → underwater's known
  gaps; no river here is deep enough.

## Placement

- **The water pack** (`/system/water`) owns the river: profiles,
  stretches, the line, the patch, readings, river ice, river hazards.
  A second river needs only a profile row and the places an author wants.
- **The kernel** owns the moving place (any place whose position is a
  variable), being swept and the current as a force on bodies (any
  water with a current), wading by stature, and what is tracked on the
  overworld.
- **`trade-diving` and `transport`** own small craft (hulls and
  propulsion by part, poling, lining, portage, the killick) and the
  sea's boats.
- **Fishing** owns fisheries per stretch and drift fishing.
- **Ships** stay maritime's; this adds the river frame, the alongside
  rule and grounding.
- **Content** for the drive lives with its realms: the terminus pack
  (Wharfside, the estuary, the Delight ford, the towpaths), rejection
  (the put-in), hearts-delight (the mill weir), and the world seed (the
  profiles).

⭐ The test: a second river, or a second ferry, needs no code — a profile
row and authored places.

## Collisions

- **Wharfside.** The basin below the quay stays still water off the
  stream (the dive shop depends on it). The quay becomes a place on the
  Kestrel's line with a downstream and upstream end. The city intake and
  outfall move from one shared point to their own positions, 100 m
  apart. The lavoir is unaffected. Seven localities that drain to the
  confluence keep that as a node name.
- **The Delight ford** stops closing at 12 m³/s and reads the current
  against each body crossing.
- **Heart's Delight**: its millrace and sawmill weirs now each make a
  hydraulic below them.
- **The aqueduct house weir** (Cold Fell) likewise.
- **The towpath rooms** become places on the Kestrel's line, so the bank
  between them is walkable.
- **The estuary**: its rooms become the Kestrel's mouth places, joined to
  the Greywater's node, so a ship and a drifting body can pass between
  river and sea.
- **Fishing**: fisheries move from per node to per stretch; the Wharfside
  and confluence fish change where they are found.
- **Maritime**: the *Hesper*'s boats stop being positioned; the maritime
  drive's boat steps change.
- **The estate**: owned goods left in a stop on a riverbank would
  duplicate on restore; this must be fixed here.

## Surface decisions

### A river's ends are required
Every course declares how it starts (rills, a spring, an outlet from a
still water, melt) and where it ends (another river, a still water, the
sea at a named node, or a sink where it runs out). A course without both
fails to load, naming itself. A sink's end moves with the season.

### Positions are a named point plus a distance
`kestrel: confluence+0.4, left`: anchored on a name so editing one span
does not move the rest. River left and right are as you face downstream.

### Stretches, banks and the meander are derived from a seed
Generative and the same river for everyone; never a roll. Every stretch
and bank can be overridden.

### The channel is derived from the bend
The deepest, fastest water swings to the outside of each bend (lens 1);
an author can override it (lens 2).

### Fords read the body, not a threshold
The look tells you how deep and fast; whether you try is yours (lens 3b).
A ford refuses only where the water is over your head (then it is a
swim). A crossing can fail part-way and sweep you.

### A disconnected body is delivered, alive
It drifts to the first spot where it can be held out of the current and
is held there; the river's killers do not act on it while you are away
(lens 4, the shipped rule that absence never kills you).

### Pull, never push, on the river too
Nothing in view is announced. You look or keep a watch (to the next bend,
or by height on a straight reach). What announces itself: a shout within
hail, a bell, a rapid's roar ahead. Your own surroundings changing as you
are carried is not the horizon; it is told.

### The engine never writes into an author's prose
Inside an authored place the river's current and temperature are read
from the water (`look river`, `measure current`), never appended to the
room's description.

### Hazards have a side and an approach
A strainer is on the outside of the bend; pass it in mid-channel and you
are clear. How you meet it matters: head first and swimming hard you go
over; feet first or passive you go under.

### River technique is learnable
Floating on your back, feet downstream, costs less breath in rough water
and hits less hard. Standing in fast water over rock jams a foot. Eddies
are slack water you can rest in or climb behind.

### A ship's limits are truth; the pilot's knowledge is claims
A course past a falls is refused. A course into water too shallow for her
draft this month is allowed if the pilot believes it is deep, and she
grounds at the entry to it. Getting off: wait for a rise, lighten her,
or kedge.

## Lens pass

1. **Pedagogy.** Hydraulics derived from slope, bed and depth; the channel
   to the outside of bends; fords on riffles; eddies; the ferry glide; the
   reaction ferry; drift collecting on point bars; cold water's clock;
   foot entrapment and the feet-first float; Boyle at the column; the head
   of navigation and why towns sit there. Disciplines: swimming, diving,
   navigation, fishing; a gap — boating/pilotage has no discipline yet
   (recorded; navigation covers the ship's pilot for now).
2. **Expression.** The ordinary case is a profile row and a few authored
   places; the bespoke case (an authored rapid, a braided channel, a
   cable ferry) is rooms and overrides. Derived rooms read generic: the
   stretch prose is a row per kind with seeded variation.
3. **Immersion / participation.** The current is always on and always
   felt. A road that only runs one way for free is full of jobs: the
   ferryman, the pilot, the woodhawk, the deckhand, the river guide, the
   rescuer. The polity can do things we did not script: run a ferry, sell
   wood to steamers, guide a party down the gorge.
4. **Values.** Whose weir makes the drowning machine; leaving someone in
   the water is recorded; a disconnected body is never killed by absence.
5. **Continuity.** Ford → ferry → bridge; paddle → pole → tow → steam →
   motor. The same acts answer at every rung: cross, go upstream, land.
6. **Economy.** Downstream is nearly free and upstream costs labor, which
   is why towns are where they are. Ships buy wood (forestry); ferries
   charge fares; freight transships at the head of navigation. Gap: no
   steady freight wants to move on the Kestrel yet; the woodyard and the
   ferry are the first demand.
7. **Governance.** Thin: who may build a weir is the shipped rights
   model; leaving someone in the water is an accountability event.

## The drive

Stage A — the line and the patch
1. `look river` from the Wharfside quay: the current, its color, how deep,
   in words. `measure current` gives the number; `measure temperature`
   gives the water's, not the air's.
2. `swim` off the quay steps into the stream (not the basin): you are
   carried. Your status reads the stretch and the last landmark. Stretch
   changes are told as you pass them. `look` reads where you are now.
3. A second character swims after you and catches up when they paddle
   or swim with the current; within hail you are together and can talk;
   one of you swims hard ahead and you split at hail range.
4. `swim for the right bank` on a fast run: refused by the margin, in
   words; on a slow pool it lands you on a gravel bar (a stop). Leave the
   bar: it is gone.
5. Swim to the confluence: the Delight joins; going upstream you must
   choose a branch.
6. Drift into the estuary: you are handed into the Kestrel's mouth place.

Stage B — bodies
7. At the Delight ford, a tall character crosses; a short one is knocked
   over mid-ford and swept.
8. The swept character floats feet first, then tries to stand in a fast
   riffle and has a foot jammed.
9. A rapid's roar is heard before it is seen; in the rapid, breath runs
   down faster.
10. A strainer on the outside of a bend: passing mid-channel you are clear;
    meeting it passive you are pinned.
11. A rescuer watching from the bank sees the swimmer coming, throws a line
    inside the reach window, and the swing brings the swimmer in.
12. A rescuer runs the bank to get ahead: on a fast run the current wins;
    on a slow pool the runner does.
13. A rescuer wades in after a swimmer and is swept too.
14. Disconnect mid-river: you are carried to the first eddy or bar and held
    there; reconnect, alive, on a bank downstream.
15. A body drowned in the river sinks; days later it floats and fetches up
    on a gravel bar downstream.
16. Drop a sword from a drifting patch: it lies on the bed at that point.
17. In winter, a pool is frozen and a rapid runs open; fall through into a
    current and be carried under the sheet.
18. Dive in a deep pool from a drifting patch: the column moves with it;
    reach the bed and you stop.

Stage C — small craft
19. Paddle a canoe upstream: slower in the channel, faster in the slack
    along the inside bank; tire; stop paddling and drift back.
20. Pole up a shallow riffle; line the canoe up a fast one from the bank;
    portage around a rapid; the gorge's walls refuse both.
21. Capsize a canoe in a rapid: the canoe and its people are carried
    together; `grab the canoe`, `pull <them> in`.
22. Drop the killick on a slow pool: the canoe holds; in fast water it
    drags.
23. Fish from a drifting canoe: the bite depends on the stretch you are
    over and where across; drift too fast and nothing takes; a hooked fish
    fights while you drift toward a rapid.
24. Camp on a gravel bar with the canoe beached; restart the server; the
    bar and the canoe are there, and there is one canoe.

Stage D — ships and ferries
25. Board the *Ostrander* at the Wharfside quay; she steams upstream slower
    than she comes down and burns more wood.
26. Wood up at the woodyard landing.
27. A canoe in the channel is swamped by her wake at speed; slowed, it is
    not.
28. Go over her side: you are in the river at her position and she steams
    on; her `course` refuses while you are in the water unless someone
    leaves you deliberately.
29. Take soundings; in August she grounds below Hob's Bend; lighten her and
    she floats.
30. Course for the falls: refused. The landing below the falls is as far as
    she goes.
31. Steam down to the mouth and out over the bar into the Greywater; her
    seaworthiness is now what matters.
32. The Nesbit ferry: the ferryman poles across, angled upstream, and lands
    at the far landing; a novice who does not angle lands downstream.
33. Summon the ferry across the river by hailing or ringing the bell; at
    high water he refuses.
34. A wagon goes aboard the ferry flat and ashore on the far side; the route
    planner routes a journey through the ferry.

Stage E — the sea, brought into line
35. The *Hesper* stops at sea: launch her boat; it is in the water beside
    her. Row to another ship stopped within hail. Go over the side and swim
    to the boat. Her `course` refuses until her people are back aboard.

## Acceptance criteria

- A player can be carried down the Kestrel from the gorge to the sea,
  passing every authored place on the way, and is told where they are
  and what the river is doing at every point.
- A player in the river is never in two places, never in a place that is
  not water, and always within reach of what the line says is at their
  position (a bank, a place, a ship, another swimmer within hail).
- Two players in the river are together exactly when they are within
  hail.
- Authored places on the river behave as their authors wrote them; the
  river's derived behavior never contradicts an authored water room.
- A ford, a crossing, a bank and a rapid can each be read before trying
  them, and the outcome follows from what was read.
- A rescue from the bank, from the water and from a boat each works, and
  each can fail in a way the rescuer could have seen coming.
- A disconnected player is never killed by the river.
- A ship cannot pass the falls and grounds in water too shallow for her;
  both are told in words.
- A ferry crosses with a fare and lands downstream if steered badly.
- Gear left on a riverbank is there after a restart, once.
- The sea's boats and swimmers follow the same rule as the river's.

## Cross-references

- Seeding: [river-slate](../slates/builds/river-slate.md),
  [ships-and-harbors-slate](../slates/builds/ships-and-harbors-slate.md),
  [decomposition-slate](../slates/builds/decomposition-slate.md),
  [underwater-slate](../slates/builds/underwater-slate.md).
- Subsystems: [watershed.md](../subsystems/watershed.md),
  [underwater.md](../subsystems/underwater.md),
  [respiration.md](../subsystems/respiration.md),
  [expanse.md](../subsystems/expanse.md),
  [location.md](../subsystems/location.md) (warrens),
  [hazard.md](../subsystems/hazard.md),
  [thermal.md](../subsystems/thermal.md),
  [fishing.md](../subsystems/fishing.md),
  [logistics.md](../subsystems/logistics.md),
  [chattel.md](../subsystems/chattel.md) (the estate defect).
