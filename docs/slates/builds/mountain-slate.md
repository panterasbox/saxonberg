# Mountain slate — ground that rises, and the people who go up it

> **Status: UNBUILT.** Seeded 2026-10-24 by the owner during sugar's review
> (MR !439): *"we probably want to create a whole mountain slate that'd
> include the mountain as a biome and mountaineering as a discipline… I
> don't really think mountains are structures, but maybe there's a common
> superclass there for 'big things that appear on the horizon'."*
> **Left:** the horizon feature split out of `Structure` · the mountain as
> rising ground (elevation bands on the zone, the biome by altitude) ·
> mountain weather (lapse rate, orographic rain, rain shadow) · the body at
> height (thin air, cold, altitude sickness) · mountaineering as a
> discipline · the volcano as a mountain with a vent · Waponi Woo's peak
> retrofitted
> **Size:** a build

**Sits on:** [expanse.md](../../subsystems/expanse.md) (landmarks, sight by
curvature, `Sighted`) · [construction.md](../../subsystems/construction.md)
(`Structure` — membership, storeys) ·
[watershed.md](../../subsystems/watershed.md) § Elevation
(`SpatialZone.elevation`, `ZoneApi.elevationFor`) ·
[biome.md](../../subsystems/biome.md) (pressure from elevation, the chain) ·
[weather.md](../../subsystems/weather.md) · [climate-slate](./climate-slate.md)
· [respiration.md](../../subsystems/respiration.md) ·
[exertion.md](../../subsystems/exertion.md) (the climb's rest) ·
[locomotion.md](../../subsystems/locomotion.md) (`climb`, `Climbable`) ·
[cover-slate](./cover-slate.md) (mountain pasture) ·
[mining.md](../../subsystems/mining.md).

## 1. ⭐ The horizon feature — split it out of `Structure`

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

## 5. Mountaineering as a discipline

- **Route-reading, rope, protection, belaying:** the climb as a cost and
  a risk, never a die roll (`uncertainty.md`). The route is the world's
  fact; the climber's competence resolves how well it is read.
- It overlaps the shipped `climb` locomotion (`Climbable`) and exertion's
  climb-with-a-rest. Ladder: scramble (anyone) → climb (a Discipline) →
  roped climbing (gear + a partner).
- **Guides** as a vocation (the demand test: a pass people must cross).

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
