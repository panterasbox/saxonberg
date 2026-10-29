# Worlds slate — planets, space, and the venues of science fiction

> **Status: UNBUILT** — designed at high level 2026-10-29 with the owner. What ships: biomes with
> path-decoupled `extends:` inheritance under one universe root, the root carrying Earth's air,
> 9.81 m/s² and 101,325 Pa, the planet's radius on the root only
> ([biome.md](../../subsystems/biome.md)); a per-zone celestial profile (day, year, tilt, suns,
> moons) and latitude as a parameter everywhere ([time.md](../../subsystems/time.md)); the
> atmosphere tag admitting `vacuum`; water as a state of any place
> ([underwater.md](../../subsystems/underwater.md)); ships as places and the expanse's chart
> ([expanse.md](../../subsystems/expanse.md)); the teleport cost `m·g·Δh` and the surveyed network
> ([arcane-science.md](../../arcane-science.md), [fasttravel.md](../../subsystems/fasttravel.md)).
> Decided before: the heavy world — a third of Earth's radius at Earth's gravity
> ([the-world-slate](../tails/the-world-slate.md)); Coordinated Metaversal Time
> ([stage-and-simulation-slate](./stage-and-simulation-slate.md)).
> **Left:** bodies as biomes under a space root · re-parenting today's world under a home-planet
> biome · the radius inheritable, gravity derived from mass and radius · the celestial profile on the
> planet biome · the root-biome and 9.81 readers re-pointed at the body a place is on · space and free fall as states of a place · travel between
> bodies · venues as technology, infrastructure and clocks
> **Size:** a build

## 0. The ask **[DECIDED — the owner]**

*"We eventually want to have different planets and solar systems and galaxies and interplanetary
space and all that possible content. But that presents a problem for our clocks. We already ran into
some problems we assumed with gravity and planet composition and density. If I wanna make content on
Mars, I dunno that our models support that very well right now. … What about Star Trek or Star Wars
stuff? Different venues in those stories call for different notions of time and space, right?"*

## 1. What assumes one planet

- **The radius** is read off the root biome only (`_planetRadiusM`, `inherit: never` — *"one world,
  one radius"*).
- **Gravity** is read off the root or hardcoded: `LoadBearing` (`G = 9.81`), magic's teleport cost,
  the water pack's `Conduit`, `StorageNode` and `ControlStructure`, `biome.ts`'s fallback; the-world
  § 7 adds `Pumping`, `PowerReading` and `WaterExpanse` (via `standardGravity()`).
- **Sea-level pressure** is the root's (the altimeter; 101,325 Pa as fallback); `SoundModality` reads
  the root too.
- **Ready already:** the celestial profile is per zone, latitude is a parameter on every celestial
  function, and the atmosphere tag admits `vacuum`.

## 2. ⭐⭐⭐ A body is a biome; the root is space **[DECIDED — the owner]**

The owner: *"Why isn't the celestial body just a biome itself? Our biomes are hierarchical, so why not
mint different roots for different planets, with maybe a single ancestor of everything that's just
0g interplanetary space — if you're not on a planet it falls back to that."* biome.md anticipated it:
*"a future 'alien planet' biome can sit at any admin path and explicitly extend
`/stuff/idea/biome/universe`"*, and its spine puts **medium first — air, water, vacuum**.

```
universe                 ← space: vacuum, no pressure, ~3 K, no gravity
├── <the home world>     ← radius, mass, air, sea-level pressure, day, year, suns, moons
│   ├── outdoor/baseline …
│   └── indoor/baseline …
├── mars                 ← surface, habitat …
└── station-<name>       ← an interior: air, spin gravity
```

**The planet is the nearest biome in the chain that declares a body** (radius and mass) — no new
class. ⚠ This replaces the-world § 7's host (the top of a world *zone* tree). Consequences **[LEAN]**:

1. ⚠ **The root stops being Earth.** Every place that falls through to the universe row gets Earth
   today; with space at the root, a **home-planet biome is inserted** between `universe` and the
   baselines, and rooms citing no biome at all (two in Rejection) need that default. The one step that
   can break the whole world if done carelessly.
2. **The radius becomes inheritable**, read off the nearest body biome.
3. ⚠ **Planet facts live in one hierarchy.** Radius, gravity and pressure are on the biome; the
   celestial profile is looked up through the *zone* tree. Day, year, tilt, suns and moons are the
   planet's, so the profile moves to (or resolves through) the planet biome; latitude and elevation
   stay with the place — *where on* the body.
4. **Every root reader asks for the body a place is on** — each already has the place in hand.

## 3. ⭐⭐ Gravity derived from mass and radius **[DECIDED — the owner]**

A body declares radius and mass; surface gravity is `G·M/r²`. ⚠ **The heavy world stays** — the
founder's decided postulate (a third of Earth's radius, 16.5 g/cm³, a metal core) derives 9.81 m/s²
exactly; it stops being authored separately from the radius. A local override needs a cause — spin
on a station, or a device (§ 4).

## 4. ⭐⭐⭐ One physics, many venues **[DECIDED — the owner]**

Under B1 (*nothing contradicts real science*) the engine runs one physics. What differs between
science-fiction venues is **technology, infrastructure and clocks**:

| | The Expanse | Star Trek | Star Wars |
|---|---|---|---|
| between stars | no FTL until the gates | warp | ⭐ hyperspace lanes |
| here | ships under orbital mechanics | locality failure — the postulate | ⭐⭐ **the teleport network exactly** — *"without precise calculations we could fly right through a star"* is the survey cost |
| gravity | real; Belters cannot stand Earth | artificial, everywhere | Earth-like everywhere |
| here | derived from mass and radius | spin, or a deck device — a binding with a power draw (momentum conserved) | a body authored at Earth-like mass, or the device |
| time | light lag | stardates | Galactic Standard |
| here | MTC | a derived clock | a derived clock |
| comms | light-lagged | subspace | holonet |
| here | — | the aether (§ 7) | the aether |

⭐⭐ **The one postulate covers FTL** **[LEAN]**: arcane-science's exemption is that *locality fails
for a caster acting deliberately*, and every FTL device — warp, hyperspace, the transporter, the
ansible — is a locality violation. *Future tech and magic are one axis* (design-lenses § 5) covers
starships with no second exemption.

## 5. MTC is cosmic time **[LEAN]**

Cosmology has a legitimate universal time coordinate — **cosmic time**. Relativity bites only near
light speed or deep in a gravity well (Mars against Earth: microseconds, GPS's correction), and FTL
here is locality failure, not near-light travel, so nobody is time-dilated. MTC is cosmic time; each
body's sol and year are derived clocks in the registry.

## 6. Teleporting between worlds costs a fortune **[DERIVED]**

`m·g·Δh` assumes uniform gravity; between bodies it is the change in **gravitational potential**.
Climbing out of Earth's well is ~63 MJ/kg — ~4.4 GJ for a 70 kg person — against a caster's ~300 kJ
reserve. **No caster teleports between worlds; only infrastructure does**, at power-plant scale — the
stargate and hyperspace network's shape, handed over by the physics.

## 7. ⭐⭐ The aether is faster than light **[DECIDED — the owner]**

> ✅ **The rule is written** — [arcane-science.md](../../arcane-science.md) § *The second postulate*:
> information only, at once in MTC, by the field where you stand.

Chat works across worlds — subspace, the holonet, Le Guin's ansible — and *one line is every line*
holds across a galaxy. ⚠ The aether is invented physics outside the one postulate (a field the five
senses do not meet), so **its rule must be written down** as its own statement — what it carries,
how fast, and what it can never do — before content leans on it.

## 8. Space, free fall, and travel **[LEAN]**

- **Vacuum and microgravity as states of a place**, as underwater made water a state of any place.
  The hard-hat diving suit is the spacesuit's ancestor; air tanks ship.
- ⚠ **Orbit is free fall, not zero gravity** — at station altitude gravity is ~90% of the surface's;
  you float because you are falling around the planet. For a player both read *weightless*; for the
  physics (and the teleport cost) the station is in the planet's well.
- ⭐ **Space carries no sound** — `SoundModality` read through a vacuum biome propagates nothing.
- **Ships as places**, from ships-and-harbors; orbits as the hard-science form of the expanse's chart.
- **Travel between bodies** — a surveyed network (hyperspace, the gate) on the teleport model, and/or
  real orbital transfer.

## 9. The lens pass

1. **Pedagogy** — gravity from mass and radius; cosmic time; potential energy across worlds; free
   fall versus zero gravity; no sound in vacuum — all derivable.
2. **Expression** — a new world is rows: a body biome and its children.
3. **Immersion** — every venue's wonders cost what the physics says. **Participation** — the
   network as infrastructure somebody builds.
4. **Values** — none forced.
5. **Continuity** — the same objects answer the same commands on every world.
6. **Economy** — interplanetary travel is a utility at power-plant scale.
7. **Governance** — who builds and runs the network.

## 10. Open

1. **The re-parenting** — naming the home world, and the order of operations so no place breathes
   vacuum for a boot.
2. ✅ **The aether's written rule** — arcane-science.md § *The second postulate*.
3. **Orbit** — model free fall honestly now, or *weightless* as a state first.
4. **Travel between bodies** — the network, orbital transfer, or both. ⭐ Flight stays within one
   body's air and rockets are not flight; the pad is the seam ([flight-slate](./flight-slate.md) § 10a).
5. **Several suns** — `CelestialApi` assumes one.
