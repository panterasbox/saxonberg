# The world slate — a planet a third the size of Earth, and as heavy

> **Status: UNBUILT** — decided 2026-10-18 with the founder, out of the sugar
> requirements (the sugar island was 25 game days' sail away on an
> Earth-sized globe).
> **Left:** the planet's radius as one setting, from which the chart's
> degree length and the sea's horizon derive · the hard-coded `9.81`s read
> the authored gravity · ⚠ consistent positions for places on the globe
> stays OPEN (§ 5)
> **Size:** a wave — the radius setting rides the sugar build's voyage wave

**Sits on:** [expanse.md](../../subsystems/expanse.md) (the chart in
lat/lon, sight by curvature) · [weather.md](../../subsystems/weather.md)
(latitude as a Locality setting) · [biome.md](../../subsystems/biome.md)
(the root biome's authored gravity) · [time.md](../../subsystems/time.md)
(celestial's deferred planetary anchor) ·
[arcane-science.md](../../arcane-science.md) (the one-postulate rule).

---

## 0. Why

Every distance the engine measures on a globe assumes **Earth**: a degree of
latitude is 60 nautical miles (`GeoPosition`), and how far you see at sea is
Earth's curvature. On Earth a frost-free sugar island is weeks of sail from a
42° N city — about 25 game days, 50 real hours — and *"I'd think we want our
planet to be smaller than that so it's more easily travelled."* The founder
chose a smaller world.

## 1. ⭐⭐ The decision **[DECIDED]**

- **Radius: one third of Earth's** — about **2,124 km**.
- **Gravity stays Earth's, 9.81 m/s²** — so the planet is **three times as
  dense**: about **16.5 g/cm³**. Surface gravity is proportional to radius ×
  density (for a uniform sphere, `g = (4/3)·π·G·ρ·R`), so a third of the
  radius needs three times the density.
- ⭐ **The postulate: a heavy world.** 16.5 g/cm³ is between lead (11.3) and
  gold (19.3) — a planet with an enormous metal core. **A real material
  explains it; no magic is needed**, which keeps the arcane-science rule that
  the world is honest even where it is invented. (A quarter of Earth would
  need ~22 g/cm³, solid osmium at its limit; a sixth, ~33, denser than any
  matter. A third is the smallest size real matter plausibly explains.)
- **Tilt and rotation stay Earth's** — so climate by latitude, the seasons
  and day length are unchanged.
- **The nautical mile stays 1,852 m** (a unit, not a minute of arc): on this
  world **a degree of latitude is 20 nautical miles**. A culture of this
  world would define its own league; that is content, not this slate.

## 2. What follows — derived, not authored

| | Earth | this world |
|---|---|---|
| one degree of latitude | 60 nm (111 km) | **20 nm (37 km)** |
| equator to pole | 5,400 nm | **1,800 nm** — ~12.5 game days at 6 kn |
| horizon, eye at 2 m | ~3.0 nm | **~1.7 nm** (`× √(1/3)`) |
| sight between two heights | `1.17 (√h_obs + √h_tgt)` nm, feet | **`0.675 (√h_obs + √h_tgt)`** |
| 42° N → 30° N (a frost-free island) | 720 nm, ~5 game days | **240 nm, ~1.7 game days** |
| escape velocity | 11.2 km/s | ~6.5 km/s — still holds an Earth-like atmosphere with Earth's gravity at the surface |

⭐ **Pedagogy (lens 1)**: the horizon comes in — a hull drops below it sooner,
a lookout sees less far, a tall light matters more — and the curvature of the
world is something a player can notice. Eratosthenes could measure this
planet with a stick and a well, and get a third of Earth.

## 3. The engine change **[DECIDED]**

- **One authored setting: the planet's radius** (on the root of the world,
  beside its gravity). The chart's degree length (`NM_PER_DEGREE`, today a
  constant 60) and the sight formula's coefficient (today the literal
  `1.17`) **derive** from it. Earth's value is the fallback.
- ⭐ **Every hard-coded `9.81` reads the authored gravity** — today it is
  authored on the root biome (`_defaultGravity`) but also written as a literal
  in the pump (`Pumping`), water power (`PowerReading`), the Greywater
  (`WaterExpanse`) and magic (`MagicLogic`). A census of those literals is
  part of the change; nothing changes value, but the next world can.
- **Authored distances do not move.** The Greywater's nodes are authored in
  metres from its origin, so the sea is the same size in metres; what changes
  is how many degrees that is — a ship's latitude moves three times as fast
  as she sails.

## 4. What does not change

Climate by latitude (each locality declares its latitude); seasons and day
length; gravity everywhere it is read; every authored room and distance in
metres.

## 5. ⚠ Open — places on the globe

**Latitude today is a climate label, not a position.** Each locality declares
one, and nothing places them on a sphere consistently: Hollow Mere sits beside
Terminus in the world and declares −58° while Terminus declares 42° N. Only
the sea chart measures distance in degrees. Whether every place should have a
consistent position on this globe — so a latitude means *where* as well as
*what climate* — is a world-scale question this slate leaves open
(climate-and-water's "latitude as a resolved value" seam, and celestial's
planetary anchor). Until then, a new place picks a latitude for its climate
and a sea node for its distance, as the sugar island will.

## 5b. Open — the magnetic field

**Not modelled; Earth-like by declaration if a reader ever needs one.** A
big metal core does not by itself make a strong field — a field is a dynamo,
a liquid conducting core still convecting, plus rotation (Mercury's huge iron
core has about 1% of Earth's field; Mars had a dynamo and lost it, because a
small planet's core cools and freezes). So for a world this size the field is
a free parameter, declared like the heavy-world postulate. Nothing reads one
today: the compass reading is **true** bearing, and the celestial code's
"declination" is the sun's and the moon's. Where it would show if modelled:
**magnetic variation** in navigation (compass north is not true north — an
instrument-ladder lesson for the maritime trade), **auroras** at high
latitude, **lodestones** as the first compass's epoch rung, and the
atmosphere's shield against the solar wind (backstory, not live physics).

## 6. Lens pass (2026-10-18)

1. **Pedagogy** — gravity as radius × density; why a smaller world needs a
   denser one; the horizon and curvature; measuring a planet.
2. **Expression** — another realm is another radius and gravity; nothing is
   hard-coded to Earth once the literals read the settings.
3. **Immersion** — a smaller sea; the horizon close; voyages measured in days,
   not weeks.
4. **Values** — none forced.
5. **Continuity** — the same chart and the same sight rule at any size.
6. **Economy** — trade by sea becomes practical: the sugar island is days,
   not weeks, away.
7. **Governance** — none.

**Altitude** — *invariant*: distances derive from one radius, gravity from
one setting. *Grain*: this world's radius (a third) and density. *Title*:
the heavy-world postulate.
