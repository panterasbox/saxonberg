# Geography — requirements

**Status:** agreed 2026-11-16 (the owner).

**Kind:** feature
**Leads from:** kernel, with a content stage. The first consumers are
Terminus's own places and landmarks (the Market, the Harbor, the Estuary
headland, Hollow Mere, Hinkley Hills, Waponi Woo, the Terminal, Gannet
Rock), in this build's content stage. The client's horizon section is a
second consumer, in the navigation pane build.

The land gets the sea's frame. Today the horizon is three shapes: at sea
it is geometry (bearing, range, the curve of the earth); on a river it is
whoever is on the water nearby, by name; ashore it is an authored list of
zones, by name, with no direction and no distance. This build gives every
real place a position on the same chart the sea already uses, so the
horizon is one rule everywhere. ⭐ It does so the way the games that
handled distance did it: **what is far and does not move is worked out
ahead of time, at the grain of a place, from a sparse set of landmarks;
what is far and moves is found only by an act** — never a per-room sight
computation.
Seeded by [geography-slate](../slates/builds/geography-slate.md); runs in
parallel with the [navigation-server](./navigation-server-requirements.md)
and [zone-instancing](./zone-instancing-requirements.md) builds (the latter's
requirements are in flight on `reqs/zone-instancing`).

## What already exists

- **The chart.** The Greywater has a fixed point on the chart (42°N,
  8.47°W) and every sea position derives from it. Shore landings have sea
  positions, so a headland already sees sails with bearing and range.
- **The three horizons.** `query horizon` lists what is in view beyond
  your room (`look` describes one thing; listing a set is `query`'s);
  `watch horizon` keeps a watch and tells you what comes and goes. The
  horizon is computed on arrival and never pushed. At sea each sighting
  comes with a **rough direction** — a compass point and a rough distance,
  *NE, some 6 miles off*. On a river and ashore, names only.
  ⚠ Ashore, only structures that are **already loaded** are seen: a
  distant tower nobody has visited since boot is invisible.
- **Precision is already skill-banded.** The horizon's rough direction is
  eight compass points and a rough distance; `measure bearing <thing>` (the
  Navigation Discipline, a hand-bearing compass; the bare eye reads to
  ten degrees) narrows it. A bearing on a fixed thing whose place is
  known fixes you. `measure latitude` (a sextant, a clear sky) reads
  how far north you are.
- **Landmarks.** Three structures are marked as landmarks: the Terminal,
  Gannet Rock, Waponi Woo. Structures carry a height.
- **Elevation and latitude.** Elevation is a ground fact on the zone (21
  places author it); the watershed and the altimeter read it, and it is
  already separate from a room's `z`. Latitude for climate is authored on
  7 zones, mostly test-fixture worlds.
- **Localities.** 24 of them: the shipped realm (Terminus, Terminus City,
  Hollow Mere, Heart's Delight, Hinkley Hills, Rejection, Waponi Woo, the
  Campus, the Counting-Houses, University Avenue) and the test-fixture
  worlds (Narnia, the North, the South Station, the Circle, the Weeping
  Moor, the pair, the Lounge, the Last Counted Mile). None has a place on
  the chart.
- **Authored horizon lists.** 11 places declare one (the Harbor,
  Wharfside and its mill, tannery, chandlery, dyehouse and lavoir, the
  Estuary and its headland, University Avenue, the bathhouse).
- **In flight.** The navigation-server build sends today's horizon as
  data and leaves bearing and range ashore to this build. Zone instancing
  gives copies their own zones; a copy has no position of its own and
  stands where its Locality is.

**Therefore what is genuinely new here is:** a position on the chart for
each real Locality and for the structures worth seeing; one horizon rule
for land, river and sea, worked out per place and kept; seeing far
things without loading them; and the authored lists recast as overrides.
The rough direction, `measure bearing`, the Discipline, the compass and the sight
rule all ship already. The reuse ledger is in the slate
([geography-slate § Reuse ledger for the plan](../slates/builds/geography-slate.md)).

## Goals

- **Every real place is somewhere.** Each shipped Locality of the realm
  has a position on the chart, with a radius: the same chart the sea is
  on. A structure worth seeing from afar has its own point.
- **One horizon.** Ashore, afloat and on a river, what you can see beyond
  your room is decided by one rule: the heights of you and the thing, the
  ground's elevation, the curve of the earth, the light. Ashore gains the
  sea's rough direction: *the lighthouse, NE, some 6 miles off*.
- **The view is a place's, worked out ahead of time.** A place's skyline
  is computed once and kept; it changes only when something tall is
  built or pulled down, or a point moves. Arriving somewhere costs a
  lookup, about what `look` costs.
- **Far things are seen without being visited.** A tower is in view
  because of where it stands and how tall it is, never because someone
  happened to load it.
- **Standing higher sees farther.** A room with its own point (the top of
  a tower, the lighthouse gallery) has its own skyline.
- **Precision is what you can read.** Everyone in view gets the rough direction;
  `measure bearing` with a compass, and the Navigation Discipline,
  narrow it, ashore exactly as at sea. Bearings on two known landmarks
  tell you where you are.
- **Authors still shape the view.** An authored horizon list becomes an
  override: *nothing past this ridge*, or *from here, the whole bay*.
- **Latitude has one home.** A place's climate latitude comes from its
  Locality's position unless a zone states its own.

## Non-goals

- **Moving things on land** seen from afar (a caravan on the road,
  smoke from a fire) → [geography-slate § Open](../slates/builds/geography-slate.md);
  they would join through the same act-only rule as sails.
- **Moving elevation off the zone** → nowhere, deliberately (the owner,
  2026-11-16): elevation stays a ground fact on the zone; this build only
  reads it.
- **Weaving landmarks into room descriptions** (Koster's composed
  description) → nowhere, deliberately: the skyline is plain lines, never
  prose decoration.
- **Footprints** (a Locality as an outline rather than a point and a
  radius) → geography-slate, when a need appears.
- **Placing zones** → nowhere: zones stay unplaced; your map's geometry
  still lives in zones.
- **The atlas** and its land-and-sea chart → [atlas-slate](../slates/builds/atlas-slate.md),
  a later client build.
- **Longitude by clock** → the latitude reading's own note (another build).
- **Points for the test-fixture worlds** → nowhere: they keep today's
  named-only horizon.
- **The client's horizon section** → the navigation pane build; this
  build sends the result through the navigation-server's horizon data.

## Placement

Kernel: the chart position on a Locality and a structure, the one
horizon rule, the kept skyline, the overrides. The rule is true whether
or not anyone is looking, and every pack's places stand on it.
Content: the points themselves, in the packs that own each place
(`terminus`, `hollow-mere`, `waponi-woo`, `world-seed` for the realm
Localities it carries), and the recast horizon lists.
⭐ **A second place needs no code:** a row gains a point and a radius;
a tall structure gains a point; nothing else.

## Collisions

- **The navigation-server build.** It sends the horizon as data, and at
  sea it sends bearing and range. ⚠ Under this build's rule what reaches
  the client is the **rough direction** you could read (the compass point
  and the rough distance), never the true bearing; `measure bearing` is how you
  get more. That is a change to what the navigation-server build sends at
  sea; agree it with that build before either plan is written.
- **The Harbor, Wharfside, the Estuary, the headland, University Avenue,
  the bathhouse.** Their authored lists name zones today; each becomes
  an override or is dropped because the rule now gives the same answer.
  Every one of them must still see what it sees today, or say why not.
- **Wharfside, the Harbor and the other city districts** stand under the
  Terminus or Terminus City Locality today; with only the city's point
  they would all stand at the city's center. A district far enough from
  the center that its rough direction would be wrong gets its own Locality as
  content: a named place in the fiction, never a meta partition.
- **Gannet Rock** is a fixed thing on the sea already, with its own
  position; it must not get a second, disagreeing point.
- **The Hesper** and other craft: their sea positions are unchanged; the
  shore sees them as today, and they see the land by the same rule.
- **The climate.** 7 zones author latitude. They keep it as an override;
  places that author none read their Locality's.
- **Copies** (zone instancing): a copy stands at its Locality's point.

## Surface decisions

### Sparse landmarks, a kept skyline per place **[DECIDED — the owner]**
The precedents (Skyrim's distant LOD, EVE's overview and directional
scan, Google Earth's prominence by zoom, Achaea's `SURVEY`, Koster's
sparse map) agree: far and static is precomputed and coarse; far and
moving is an act. The skyline is per Locality, plus one per room with its
own point. Nothing is computed per room per arrival.

### A point with a radius **[DECIDED]**
Enough for a rough direction and for *you are here*; cheap to author. Outlines
wait for a need.

### Inside your own Locality: *close by* **[DECIDED]**
When you and the thing are both within your Locality's radius and you
have no point of your own, it is *close by*, with no compass point, since
a bearing from the center would be wrong for half the people standing
there. With points on both, the rough direction is real.

### What is worth seeing **[DECIDED — lens 2]**
Prominence is derived: a structure's height and its landmark flag decide
what is listed, most prominent first, and a skyline shows a handful,
never every chimney. An author marks a landmark; nobody ranks by hand.

### Precision is skill-banded **[DECIDED — the owner, lens 1]**
The rough direction (eight points, rough miles) is what anyone gets; the compass
and the Discipline narrow it through `measure bearing`, the shipped
reading. Data sent to the client carries the rough direction, not the truth.

### Night and weather **[DECIDED — lens 3a]**
The sea's rule already takes the hour: unlit things are not seen in the
dark; a lit light is. Ashore follows it: by night the lighthouse is seen,
an unlit tower is not.

### Elevation stays on the zone **[DECIDED — the owner]**
Read, not moved.

### The authored lists become overrides **[DECIDED]**
Two kinds: **block** (*nothing past the ridge*) and **reach** (*the whole
bay from here*). A list that the rule now reproduces is deleted rather
than kept as a duplicate.

## Lens pass

1. **Pedagogy.** Navigation reaches the land: steering by a landmark, a
   bearing taken, two bearings crossed to find yourself (resection).
   Derivable: the distance to the horizon is √(2Rh); the bearing is
   spherical trigonometry the sea already does. The Navigation
   Discipline is earned on land too.
2. **Creative expression.** The ordinary case is a point on a row and a
   height on a structure, no code. The bespoke case (a valley that sees
   nothing, a tower that sees the bay) is an override, still no code.
3. **Immersion / participation.** The lighthouse is in the same place
   from everywhere; you cannot see through the ridge an author drew; the
   dark hides what is unlit. ⭐ The polity can change a skyline: build
   something tall enough and the town sees it from the hills. *Can the
   polity do something we did not want?* Yes, and that is the point:
   a monument, a beacon, a spite tower.
4. **Values.** Who may mark a structure a landmark: the author of the
   row, which is the structure's owner. ⚠ Gap: whether a player-built
   structure becomes prominent by height alone (yes, by the rule) or can
   also claim the landmark flag. Recorded; the rule makes height enough.
5. **Continuity.** The geometry survives every epoch; light changes the
   dynamics (oil lamps, then electric light, extend what night shows).
   The compass and sextant are medieval-to-modern instruments already
   shipped; a future rangefinder narrows the same reading.
6. **Economy.** Produces wayfinding; consumes nothing. Demand was there
   first: sailors already read the sea's horizon; the land had nothing
   for them to steer by. Tall structures gain a value (a lookout's
   tower, a beacon), paid for by whoever builds them.
7. **Governance.** Judges no person. n/a.

## The drive

Places: the Market (Terminus City), the Estuary headland, Hinkley Hills,
Hollow Mere, the lighthouse on Gannet Rock, the Terminal, the Hesper.

### Blocking drive

1. `instant` · player — Restart the world and go straight to the Market
   without visiting anywhere else. Under open sky, `query horizon`: the
   Terminal and the lighthouse on Gannet Rock are listed, landmarks
   first, each with a rough direction (*NE, some N miles off*). Neither had been
   visited since the restart.
2. `instant` · player — `measure bearing lighthouse` with no compass:
   a bearing to ten degrees. With a hand-bearing compass: narrower.
3. `instant` · player — Go to Hinkley Hills; `query horizon`: the same
   lighthouse, at a different compass point and distance, consistent
   with the Market's (from the two, the lighthouse lies where both say).
4. `instant` · player — In the Market, a structure inside Terminus City's
   radius is *close by*, with no compass point.
5. `instant` · player — Climb to a room with its own point (the top of a
   tower): something not visible from the street below is listed.
6. `instant` · player — Step indoors: no horizon.
7. `short` · player — Wait for night (a clock jump of hours). From the
   Market: the lighthouse is seen (it is lit); an unlit tower is not.
8. `instant` · player — In a place whose override blocks the view past a
   ridge: the lighthouse is not listed, though the rule would see it.
9. `instant` · player — On the Estuary headland: the Hesper at sea,
   with a rough direction, as today; then aboard the Hesper at sea: the Terminal
   and the headland's landmarks, with a rough direction, by the same rule.
10. `instant` · player — Each of the 11 places that authored a horizon
    list: what it saw before this build it still sees (or the drive
    record says why the change is right).
11. `staged` · staged — Stand up a tall structure in Hollow Mere with a
    wizard tool: from Hinkley Hills, it now appears on the horizon. Pull
    it down: it is gone.
12. `instant` · player — `measure latitude` at Hollow Mere under a clear
    sky (sextant): a latitude that agrees with Hollow Mere's position;
    the weather there matches its latitude.
13. `instant` · player — In a test-fixture world (the Weeping Moor):
    the horizon behaves as today, by name.
14. `instant` · player — ⭐ Restart; from the Market again: the same
    horizon as step 1.
15. `instant` · player — With the map card open in the Market, the
    horizon section shows the same rough directions `query horizon` gave: no
    exact bearings reach the client.

### Soak drive

None: nothing in this build moves on a span of the clock.

## Acceptance criteria

- Ashore, `query horizon` lists what is in sight with a compass point
  and a rough distance, landmarks first.
- A tower is seen from afar whether or not anyone has visited it since
  the world started.
- From two places, the same landmark's rough directions are consistent with one
  position for it.
- Things inside your own Locality are *close by* unless you stand
  somewhere with its own point.
- A higher room sees what a lower one cannot.
- At night only lit things are seen from afar.
- `measure bearing` on a landmark works ashore as at sea; the compass
  narrows it.
- A place with a block override does not see past it; one with a reach
  override sees what it names.
- Every place that authored a horizon list before still sees what it
  saw, or the drive record says why not.
- A tall structure built or pulled down changes the skyline of the
  places that can see it.
- A place's climate latitude agrees with its position unless its zone
  states its own.
- Test-fixture worlds behave as today.
- The client is never sent a bearing more precise than the rough direction.
- Arriving somewhere costs no more than `look` does today.

## Cross-references

- [geography-slate](../slates/builds/geography-slate.md) (seeding; the
  reuse ledger)
- [navigation-server-requirements](./navigation-server-requirements.md) ·
  [zone-instancing-requirements](./zone-instancing-requirements.md) ·
  [map-slate](../slates/builds/map-slate.md)
- [expanse.md](../subsystems/expanse.md) · [river.md](../subsystems/river.md) ·
  [perceiver.md](../subsystems/perceiver.md) ·
  [instrumentation.md](../subsystems/instrumentation.md) ·
  [construction.md](../subsystems/construction.md) ·
  [watershed.md](../subsystems/watershed.md) ·
  [weather.md](../subsystems/weather.md) · [address.md](../subsystems/address.md)
- Precedents: [Koster — A Spatial Representation of the Virtual World](https://www.raphkoster.com/games/insubstantial-pageants/a-spatial-representation/) ·
  [Achaea — The Wilderness Map](https://www.achaea.com/game/helpview?id=289)
