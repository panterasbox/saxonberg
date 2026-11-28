# Mountain slate — ground that rises, and the people who go up it

> **Status: UNBUILT.** Seeded 2026-10-24 by the owner during sugar's review
> (MR !439): *"we probably want to create a whole mountain slate that'd
> include the mountain as a biome and mountaineering as a discipline… I
> don't really think mountains are structures, but maybe there's a common
> superclass there for 'big things that appear on the horizon'."*
> **Left:** the Landform sibling and `Structure` made abstract (biome design D6 — replaces the
> horizon-feature split) · the slope bands derived from each biome's climate range and the mountain's
> named sequence (D5) · orographic rain and the rain shadow (one sequence per side) · the body at
> height (altitude sickness, acclimatization — § 4) · ⭐ mountaineering (§ 5, **designed 2026-11-28**):
> the climbing Discipline, routes as pitches, falls with causes, placed protection that persists · the
> volcano as a mountain with a vent · Waponi Woo's peak retrofitted as the first Landform
> **Size:** a build

⭐⭐ **Designed with the biome conversation** (owner, 2026-11-28) →
[biome-normalization-slate](../tech-debt/biome-normalization-slate.md) § *The design* D5–D6:
**a mountain is a Landform** (a sibling of `Building` and `Ship` under an abstract `Structure`, which
**supersedes § 1's horizon-feature split**); its places climb through a stack of biomes the mountain's
Locality names (one sequence per side), each place's band derived from its temperature; the landmark
height is derived from the highest member place; a place may be on one Landform and in one building
at once, and nothing nests.

**Sits on:** [expanse.md](../../subsystems/expanse.md) (landmarks, sight by
curvature, `Sighted`) · [construction.md](../../subsystems/construction.md)
(`Structure` — membership, storeys) ·
[watershed.md](../../subsystems/watershed.md) § Elevation
(`SpatialZone.elevation`, `ZoneApi.elevationFor`) ·
[biome.md](../../subsystems/biome.md) (pressure from elevation, the chain) ·
[weather.md](../../subsystems/weather.md) · [climate-slate](../engine/climate-slate.md)
· [respiration.md](../../subsystems/respiration.md) ·
[exertion.md](../../subsystems/exertion.md) (the climb's rest) ·
[locomotion.md](../../subsystems/locomotion.md) (`climb`, `Climbable`) ·
[cover-slate](../trades/cover-slate.md) (mountain pasture) ·
[mining.md](../../subsystems/mining.md).

## 1. ⭐ The horizon feature — ⚠ SUPERSEDED by the biome design D6 (Landform, not a split)

**What shipped:** a landmark at sea is a `Structure` with `landmark: true`
and a `heightM`, found through the node its extent covers (`expanse.md`:
*"its landmarks — a BUILDING standing at one of its nodes"*). There are
three: Gannet Rock's light, the terminal, and the peak of Waponi Woo.

**The stopgap:** sugar W6 made the peak a `Structure`
(`waponi-woo/structure.yaml`) because it is the only type the sea can
sight. The drive needed the island to be raisable (the ship sailed
straight past a one-mile node on dead reckoning). It works, but
`Structure` means *"these rooms are one building, seen from outside"*,
and a mountain is not a building.

**What the sea actually needs** is small: a position (from a node), a
height, an appearance, a name. That is the `Sighted` candidate the horizon
already reads. So the shape is **"something that stands above the
horizon"**, and two kinds implement it:

- **built:** `Structure` (a light, a tower, a terminal). Unchanged; `Ship`
  still extends it.
- **ground:** a mountain, a volcano, a sea stack, a headland, a great
  cliff. Ground probably belongs on the **zone**: watershed already gives
  every `SpatialZone` an elevation, so a mountain is a zone that rises, and
  its summit height is the landmark height. A smoke plume or a great tree
  may be the same shape.

**Decided (2026-10-24): not split during sugar.** The owner asked whether
to split `Structure` now in anticipation. It was not done: an interface
with one implementer guesses the seam's shape, and the split touches
`Ship`, `StructureCatalogue`, `lint:structures-booted` and the sighting,
which would have meant re-driving the voyages while sugar blocked
harbors. **The split is this build's first step,** designed with the
second implementer in hand.

## 2. The mountain as rising ground

- **Elevation is the ground's** (watershed D: *"elevation is a property of
  the ground; temperature and pressure are properties of the air"*).
  Pressure already derives from it (`pressureFromElevation`, `P = P_sea −
  ρ·g·h`), and the barometer reads a cause.
- **Altitude bands:** forest → scrub → alpine meadow → rock and ice. The
  biome by elevation, resolved by the chain, not authored per room.
  ⚠ Today the volcano is one `Locale` on the baseline biome.
- **A mountain is several places:** the slopes as a column or a warren
  (the underwater column and the river line are the precedents), the
  summit as a place, and passes as the ways through.

## 3. Mountain weather

- **Lapse rate:** about 6.5 K colder per kilometer, derived from
  elevation, never authored.
- **Orographic rain:** air forced up a windward slope rains; the lee is a
  rain shadow. Climate and weather are the hosts.
- **Snowline, and snowpack** (watershed already has snowpack in its flow).

## 4. The body at height

- **Thin air:** respiration's partial pressure falls with elevation
  (`respiration.md` lists altitude as a later fidelity layer).
- **Altitude sickness** as a condition, with acclimatization as a slow
  stock (exertion's slow-stock shape).
- **Cold:** clothing (textiles' clo) and shelter matter more.

## 5. ⭐⭐ Mountaineering **[DECIDED — the owner, 2026-11-28]**

Designed beside the [biome design](../tech-debt/biome-normalization-slate.md) § *The design*, by the
same method: player expectations first, then what is particular to us.

### What players and climbers expect

| source | what climbing is there |
|---|---|
| Breath of the Wild | climb anything; a stamina meter is the whole constraint; rain makes rock slip |
| Cairn, Jusant | each hand and foot placement chosen on a real face; reading the line, pitons, chalk, rest |
| Death Stranding | terrain reading, and ropes, ladders and anchors you place that **stay and other players use** |
| Skyrim and most open worlds | steep ground to scramble; the summit view is the payoff |
| real mountaineering | routes are named facts with a grade and a first ascensionist; gear left by earlier parties ages on the rock; topo guides; objective hazards (rockfall, avalanche, weather) vs subjective ones (fatigue, mistakes); acclimatization, weather windows, huts; guides and porters for hire |

**Distilled:** effort is the constraint; reading the face is the skill; gear changes the route;
weather and the hour matter; falling is the risk and the summit the reward.

### M1 · A fall has a cause, never a roll

The uncertainty rule ([uncertainty.md](../../uncertainty.md)): randomness may decide what the world
*is*, never what an act *did*. So a fall is caused by:

- **exhaustion** — exertion's limits (the subjective hazard);
- **wet or iced rock** — the weather on the face;
- **a loose hold or rockfall** — a **seeded** fact about the rock, which competence and testing read
  (the objective hazard).

The danger is real, always readable, and always has a cause.

### M2 · A route is a chain of pitches on a Landform

- **A pitch is a way between two ledge places** on the mountain's Landform (biome design D6); a route
  is a chain of them, summit to foot.
- **The difficulty is in the rock** — hold size, angle, soundness, wetness. **Competence decides how
  well the route reads and what it costs** to climb.

### M3 · ⭐⭐ Placed protection persists, belongs to someone, ages, and changes the route for everyone

The particular thing a shared, persistent world adds — Death Stranding's idea with weight:

- **Bolts, pitons and fixed ropes are things in the world.** They have an owner, they **age** (the
  decomposition build's rust and rot) and they can be **stripped**.
- **A route gets easier as people work on it** and harder again as its gear decays.
- **First ascents are deeds** — the chronicle's singular events (*first up the north face, and they
  named the route*).
- **Guidebooks are player-written**, on paper or in the press, and go stale like the almanac.
- **Guiding, portering and hut-keeping are jobs**; rescue is emergency services'.

### M4 · The ladder — scramble, climb, roped — all soft

- **Scramble:** steep ground anyone crosses; effort and time, no Discipline.
- **Climb:** real rock or ice. Anyone may try — limits are soft, never a wall — but without competence
  it reads worse, costs more, and the hazards bite.
- **Roped:** a partner on the belay, a rope, protection — what makes hard climbing survivable rather
  than merely possible. `belay` and the rope at a drop ship ([cordage.md](../../subsystems/cordage.md));
  `climb` and exertion's climb-with-a-rest ship.

### M5 · The Discipline is **climbing**; mountaineering draws on several

- **Climbing** is a Discipline for a way of moving, the sibling of **swimming** — moving on vertical
  ground and reading holds. It is not only the mountain's: a sailor aloft, a thatcher on a roof, a
  forester up a tree, a miner in a shaft, a burglar up a wall.
- **Mountaineering is an activity**, exercising climbing · **ropework** (knots, belays, anchors) ·
  **navigation** (finding the route) · **awareness** (the loose hold) · **geology** (reading the rock)
  — all shipped Disciplines but climbing.

### M6 · Grades are culture, not engine

The engine knows the rock's physical difficulty and exposes it through readings; **a grading scale is
something climbers invent** (the real French and American scales disagree). Grade names live in
player-written guides — *wait for players to design it*.

### M7 · Altitude is the body reading the air

- **Thin air** from pressure, which already derives from elevation; cold from the lapse rate the
  climate expression already applies.
- **Altitude sickness** is a condition above some height; **acclimatization** is a slow stock built by
  time spent high — exertion's slow-stock shape. Climb high, sleep low, wait for the window. (Absorbs
  § 4's altitude sickness and acclimatization.)

### Left for the build

The verbs for placing, testing and stripping protection (one verb per act — choose from what ships
before adding any) · how a route's difficulty is authored on a pitch · the reading that reports a
route by competence · what a fall costs a body · the gear as trade goods (rope from cordage, pitons
from the smith).

## 6. Volcanoes — a mountain with a vent

- Fumaroles and sulfur (Waponi Woo ships both); ash soils (the island's
  rich ground is the volcano's).
- Eruption as an AUTHORED event (the hazard and decomposition doctrine:
  authored, never a random disaster).

## 7. Economy (lens 6)

- **Passes are trade routes** (logistics' cost surface; a toll is
  governance's).
- **Mountain pasture:** summer grazing, transhumance. It ties into the
  cover build's sward and ranching's herds.
- **Mining country** (the deposit field), **timber** high up, **ice and
  snow** (the ice trade).
- **Guides, porters, hut-keepers.**

## 8. First retrofit

**Waponi Woo's peak** moves off `Structure` onto the ground shape, with
the drive's step 13 (raising the island and taking a bearing) re-run.
`volcano.yaml` becomes the slope bands of a rising zone.
