# Respiration slate — the sealed room, and where the oxygen isn't

> **Status: TAIL** — drafted 2026-09-21 out of the fishing build's
> immersion work (MR !268), after reading what `RespirationMixin` and the
> fire driver actually do. Respiration shipped its crisis engine, the
> water-breather inversion, the air tank and the contaminant channel; the
> original slate was absorbed and retired. This is what is left once the
> [underwater slate](../builds/underwater-slate.md) has taken depth,
> pressure, the bends, buoyancy, the snorkel and the tidal node.
> **Left:** ⚠ **the in-place trigger** (a body standing still is never
> re-checked — fire's smoke is a live consumer today) · **the air reserve
> as a breathable read** (rooms already carry one; nobody breathes it) ·
> a BOD term on the reach's oxygen (watershed's line) · three named
> non-goals with destinations
> **Size:** a tail — one small kernel build plus one watershed line

**Sits on:** [respiration.md](../../subsystems/respiration.md) (the
crisis engine, `breathableMedia`, the immersion read, `AirTank`) ·
[fire.md](../../subsystems/fire.md) (the `air` reserve, `markFireSmoke`)
· [reserve.md](../../subsystems/reserve.md) (`ReservedMixin`) ·
[biome.md](../../subsystems/biome.md) (`Atmospheric.setAtmosphere`, the
media table) · [watershed.md](../../subsystems/watershed.md)
(`waterStateAt`, `oxygenMgL`) · [race.md](../../subsystems/race.md)
(`OrganismMixin` — a plant IS an organism; it is not a creature) ·
[augmentation.md](../../subsystems/augmentation.md) (confers-a-mixin).

Markers: **[DECIDED]** with the user · **[LEAN]** · **[OPEN]**.

---

## 1. What is true today **[verified 2026-09-21]**

- **Every `Creature` composes `RespirationMixin`**; the opt-out is
  `respires: false` on the body plan. `Organism` is biology (species,
  age, lifecycle); `Creature` is a body (vitals). Respiration drives a
  vital sign (`spo2`), so it sits on the body — **a plant is an organism
  and not a breather**, and that is correct, not a gap.
- **The medium is resolved in three steps**: the engaged locomotion
  mode's `medium` (swimming is *in* the water) → ⭐ the liquid you are
  immersed in (the nearest ancestor with a non-empty bulk interior —
  fishing's addition; a carp in a bowl, a man in a vat) → the biome's
  atmosphere tag walked outward from the room.
- **Hostile iff `medium ∉ breathableMedia` AND the medium is known** to
  the biome table (`ATMOSPHERE_BREATHABLE`: air · water · vacuum · smoke
  · blackdamp · stinkdamp · carbon-dioxide). Immersion is exempt from the
  known-medium exemption — a liquid is a liquid.
- **Amphibians ship**: the shore crab's plan is `breathableMedia: [water,
  air]`. No clock on either — a crab in air is fine forever.
- **The reassess triggers are exactly three**: `onTraversed`, `onMoved`
  (fishing), and the drain's own tick *while a drain is already running*.
  Nothing else in the tree calls `reassess()`.
- **Enclosed rooms author an `air` reserve** (`reserves: { air: … }` in
  %, the brewing cold-store and the vintner floor do). The **fire driver**
  consumes it per burning object, a ventilated boundary refills it, and
  at the floor the fire smothers; starved combustion calls
  `markFireSmoke(room)`, which sets the scope's atmosphere to `smoke`.
- **Respiration reads none of that.** It reads the tag, never the reserve
  — a room at 3 % air is `air` and breathable; four people sealed in a
  cellar with no fire are fine forever.
- **In water, `oxygenMgL` is a derived read** (saturation at temperature
  × turbulence) that the six fish species have Liebig tolerances against
  (trout ≥ 7, carp ≥ 3). Nothing depletes it — the outfall fouls the
  fish's flesh (e-coli, a `ContaminableMixin` event) and never the water's
  oxygen.
- **Seams laid, unconsumed**: the effective-media derivation
  (species ∪ media granted by active conferred mixins — gills, implants, a
  potion); the `'channel'` cause (strangulation — combat's).

## 2. ⚠ The defect: a body standing still is never re-checked **[DECIDED]**

`fire.md` says the smoke "asphyxiates for free — the existing respiration
medium crisis". It does, **for anyone who walks into the room.** Anyone
already standing in it when the fire starves keeps breathing until they
leave and come back, because `setAtmosphere('smoke')` tells nobody. The
same wall is waiting for the underwater slate (medium derived from the
reach's level — a shore node going under on the flood) and for the tidal
cave that becomes a ceiling.

> **The medium change fans out to the scope's occupants.** When a scope's
> atmosphere changes — `Atmospheric.setAtmosphere`, and the air reserve
> crossing its floor (§ 3) — every respiring occupant, one containment
> level deep (a body in a bath in the room is immersed and unaffected;
> a body in an open crate is not), gets a `reassess()`. Fire-and-forget,
> caught, the `onMoved` shape.

Not a scheduler, not a poll: the idle case stays provably zero-cost.
The trigger lives with the *setter* (the biome/atmospheric side), not
with fire — fire is the first caller, the tide the second, a wizard's
`config` the third.

## 3. The air reserve as a breathable read **[DECIDED]**

The atmospheric oxygen economy is **already three-quarters built** and
owned by the wrong consumer. The reserve exists, is consumed, is
replenished by ventilation, and has a floor. Two additions make it honest:

1. **Breathers draw on it.** A respiring occupant of a scope with an
   `air` reserve debits it per game-minute — a small dial
   (`respiration.drawPerBreatherPerMin`), scaled by nothing yet (body
   mass is a later fidelity). Same ventilation refill fire already
   applies, so an open door is enough and nothing changes in a room with
   a window.
2. **The floor is hostile.** Below `respiration.reserveHostileBelowPct`
   (lean: the fire's own incomplete-combustion threshold, so one dial
   means one thing) the scope reads as un-breathable: `assessExchange`
   consults the reserve after the tag — a room whose tag is `air` and
   whose reserve is floored produces `cause: 'medium'` like any other.
   Crossing the floor fires § 2's fan-out; recovering above it fires it
   again (the drain cancels on the next tick regardless — the fan-out only
   makes it prompt).

What it buys: the coffin, the collapsed drift with the door shored shut,
the sealed vault, the ferment cellar with the hatch down; and the
**underwater slate's air bell** — a ceiling node with an air surface is a
scope with an air reserve and no ventilation, and the divers' breath is
what empties it. The same read, nothing new.

⚠ **Not a new room field and not automatic.** A room that wants a finite
air budget authors the reserve, as it does today for fire. Outdoors and
ventilated interiors keep the unlimited default; the sky edge is the
producer.

## 4. The reach's oxygen can be pulled down — watershed's line **[LEAN]**

`oxygenMgL` gains a **deficit term** from the reach's contamination load
(BOD — biochemical oxygen demand: sewage and organic waste are eaten by
bacteria that use the oxygen). Still a derived read in `waterStateAt`, no
state: `oxygen = saturation × turbulence − k · load`, with turbulence
already the re-aeration term. Below the outfall the trout go first
(min 7), the carp last (min 3), and the fisher's read says so — the
textbook lesson with nothing new on the fishery record.

Belongs to the water pack, not to respiration, and it needs the
contamination load to be a number per kind (it is: `contaminationAt`).
Offered to the water pack / fishing slate § 13; sized at one term and one
test.

## 5. Named non-goals, each with a destination

- **Plants as oxygen producers → the air reserve, on demand.** A plant is
  an organism (`Plant` composes `OrganismMixin`) and not a breather; what
  it would be, if anything, is a *producer on the room's air reserve*
  (`adjustReserve('air', +x)` per growing plant per tick, gated on light).
  Below the expression floor at room scale — one houseplant beside four
  people in a cellar is a rounding error nobody can act on. The seam is
  right and it holds from a Roman cellar to a space station (the epochs
  lens); ship it when a sealed grow-room or a life-support scenario asks.
- **The amphibian clock → the fishing tail.** A crab's gills work in air
  *while wet*; today they work forever. A duration on the tolerance
  (`air: { forS: … }`, reset by immersion or wetness) is the whole shape.
  Nothing asks yet; metabolism starves a potted crab eventually.
- **Gills · implants · water-breathing potions → the augmentation grant
  seam**, when arcana or augmentation wants it. A conferred mixin *grants*
  a medium; the engine's one read site swaps from the plan's set to
  species ∪ grants. The tank epoch and the underwater build need none of
  it. Magic and future tech are one axis: the same grant.
- **Strangulation (`'channel'`) → combat**, with the grapple substrate.
- **Depth · pressure · the bends · buoyancy · the snorkel · the tidal node
  → the [underwater slate](../builds/underwater-slate.md).** Scuba is
  built and has never been driven; the tank epoch drives it.

## 6. Open

1. **Does a breather draw while asleep / unconscious?** Lean yes at a
   lower rate — the coffin is the point, and a drugged body in a sealed
   vault is the story.
2. **Does the reserve draw scale by body mass now or later?** Lean later
   — one dial, the fidelity is a line when physiology lands stature.
3. **The fan-out depth.** One containment level (lean) or the full
   reachable set. One level covers a crate and a bath; a body in a
   closed wardrobe in a smoky room is *in the wardrobe's air*, which is
   an honest answer.

*(Retire when: the in-place trigger and the reserve read ship with fire as
the driven consumer, and the BOD term has a home in the water pack or has
been declined there.)*
