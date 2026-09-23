# Underwater slate — places below the surface, and the way back up

> **Status: UNBUILT** — designed 2026-09-18 out of the fishing rewrite,
> to be built when somebody wants it; the design is the point of writing
> it now. No underwater room, medium, column or ascent exists.
> **Left:** the column — bands as zones, `depth` as a zone field,
> `up`/`down` derived · implicit up + declared ceilings + the reach-to-air
> gate · medium derived from the reach's level · light / temperature /
> pressure derived from depth · buoyancy as a read (density × volume vs
> the medium) and the placement rule · the ascent/descent **Journey** on
> the `swim` mode with the buoyancy load factor · the lifeline and the
> ballast stone · the tank epoch (the bends as a stop set) · per-individual
> stature (body density) · the default column for a dive-declared body
> **Size:** a build — places first; hunting is the act that happens in them

**Sits on:** [logistics.md](../../subsystems/logistics.md) (⭐⭐ **the
Journey — a sustained engagement whose beat is one leg; every beat issues
the same `traverse`; the vehicle is present in every node; length is an
event budget; express vs local is one lane with two stop sets; the fault
table**) · [watershed.md](../../subsystems/watershed.md) (the reach and
its level) · [location.md](../../subsystems/location.md) + `SphericalLocation`
(no implicit adjacency, explicit exits) · [zone.md](../../subsystems/zone.md)
(field inheritance) · [respiration.md](../../subsystems/respiration.md)
(`breathableMedia`, the water-breather inversion, `AirTank`) ·
[thermal.md](../../subsystems/thermal.md) (`conductivityOf(water)`) ·
[light.md](../../subsystems/light.md) · [locomotion.md](../../subsystems/locomotion.md)
(`Swimmable`) · [encumbrance.md](../../subsystems/encumbrance.md)
(`LoadBearing`) · [materials-response.md](../../subsystems/materials-response.md)
(`Material.density`, `getMass()`) · [mortality.md](../../subsystems/mortality.md)
(the corpse) · [fishing-slate](../tails/fishing-slate.md) § 6 (layers; the reach
as the bus) · [hunting-slate](./hunting-slate.md) (the act) ·
[physiology-slate](./physiology-slate.md) (BMI / body density).

Markers: **[DECIDED]** with the user · **[LEAN]** · **[OPEN]**.

---

## 1. What this is, and is not **[DECIDED]**

Underwater content **operates on the same terms as content above water**
— rooms, zones, exits, brains — with a little ingenuity and narrative
licence. **Atlantis is in bounds.** It is not procgen (nobody generates
rooms), not foraging, and not fishing's: the act below the surface is
**hunting's** (stalk and strike), fishing owns angling and trapping from
above. This slate is the *places*, their physics, and the journey between
them and the air.

## 2. ⭐⭐ The invariants **[DECIDED]**

**Implicit up.** In open water, *up* is implicit the way *the sky* is
outdoors. The mine's rule inverts: there, every room needs an authored
way out and a collapse takes it; here every open-water node has a way to
the surface by default, and only a **ceiling** takes it.

> An underwater node has an implicit `up` unless it declares
> `ceiling: true`. A ceiling node must reach a node with an air surface
> through authored exits, and a gate proves it — the way `lint:locations`
> proves every location plots.

**Ceilings are declared, never inferred** — a cave, a wreck's deck, ice,
an overhang. An air pocket in a cave is a node whose level is above the
water's (the air bell divers find). A tidal cave whose mouth *becomes* a
ceiling at high water is legible, predictable, and avoidable by reading
the clock — the flat's cutoff, turned vertical.

**Depth is a number on the node; the vertical exits derive from it.** An
author writes `depth: 12` (metres below the reach's surface), never an
`up`/`down` arrow — the watershed's move (*an uphill reach is
unrepresentable*). Adjacent nodes at different depths get `up`/`down`
derived; a gate refuses a column where `up` does not shrink depth.

**Every water node cites its reach, and the reach's level is the
surface.** Medium is **derived** from `level − elevation`, not authored:
a shallow node goes dry on the ebb, a shore node goes under on the flood,
and nobody re-authors anything. The level is already the water pack's one
piece of state; tide is already a derive-on-read clock.

**Derived, not authored, from depth and the reach:** light (surface light
× attenuation by depth and the reach's clarity — never a per-room
`ambientIntensity`, the lesson Rejection's twelve dark rooms taught
forestry), temperature (the thermocline off the reach's temperature),
pressure (a *reading* until the tank epoch), and ascent time.

**Survivability is the player's arithmetic, not a guarantee.** The path
exists and its cost is derivable: depth ÷ ascent rate = the breath you
need; the water's cold is the second clock (`conductivityOf(water)` is
~25× air). The deep is legitimately deadly, as the mine's bottom is. What
must hold is *legibility* — the depth reads in the prose, the breath reads
in the body — and one principle:

> ⭐⭐ **Ascent is never gated on skill. Only on breath and ballast.**

## 3. ⭐ Buoyancy — a read, and a placement rule **[DECIDED]**

Every term exists: a material's `density`, a thing's `getMass()`, and the
medium's density (`BiomeApi.densityOf('water')`, beside `breathableOf`).
Buoyancy is `(ρ_medium − ρ_object) × volume` — no new state — and each
outcome is a placement rule:

| net | what | on `drop` in water |
|---|---|---|
| **sinks** | iron, stone, a weight belt, most tools | to the **bed** — the lowest node of the column |
| **floats** | wood, cork, a corked bottle, a body with full lungs | to the **surface** |
| **neutral** | a fish; a diver with the right ballast | stays; the **current** carries it |

Across an abstract layer the reach is the bus (fishing § 6): a floater
dropped in a concrete grotto under an abstract surface becomes **flotsam
on the reach**; a sinker dropped from a boat on an abstract reach lands in
the concrete bed room that cites it.

**The one gap is hollow things.** A sealed steel vessel floats: its
effective density is mass over *displaced* volume. `Bulkable` knows a
vessel's capacity, so displacement is `capacity + shell` for vessels; a
`displacement` field on `Tangible` covers the odd sealed thing (a diving
bell, a hull). The only addition.

**Bodies** — where the deep's push-your-luck lives:

- A body is about neutral; what you carry decides the sign. **Underwater,
  `LoadBearing` measures net negative buoyancy, not weight** — carry a lot
  of what floats, very little of what sinks. **The treasure's density is
  the danger**: a bag of pearls is nothing; one ingot is a sinker with you
  attached.
- **Ballast is deliberate**: the pearl diver's stone takes you down fast;
  **`drop belt` is the one verb that never fails** — instant positive
  buoyancy, the reason the ascent principle holds.
- **Body density is body composition** — fat floats, muscle sinks — which
  is why the physiology slate now carries per-individual stature and BMI:
  a heavy lean body needs less ballast going down and more effort coming
  up; a fat one bobs. True, derivable, and never a number anyone sees.
- The grim honest one: a drowned body sinks, then floats as decay gases
  form. `Postmortem` already stages decay; density by stage is a line.

## 4. Epochs decide the danger stack **[DECIDED]**

The medieval diver is a **breath-hold** diver — sponge and pearl divers, a
stone and a rope. So the first gauntlet is **breath + cold + dark +
buoyancy**, all shipped or derived, and *pressure is a reading*. The
**tank epoch** (`ToolMixin.epoch`, the covenant's axis) brings the bends,
narcosis, and the tank's own ballast — as tools, not code. Atlantis stays
reachable to a medieval diver with a rope and a big chest.

**The lifeline** — a rope to the boat — is the medieval "guaranteed path":
an object spanning the layers, hauled from an abstract surface into a
concrete room. Historically it *is* how breath-hold divers survived;
dropping it is the choice you regret.

## 5. ⭐⭐⭐ The column is a lane; the ascent is a Journey **[DECIDED]**

Two kinds of vertical movement:

| between | act | what it is |
|---|---|---|
| two **authored** rooms at different depths | `swim up` / `swim down` | ordinary traversal on a derived exit — a staircase, wet |
| a node and the surface (or the bed), with nothing authored between | `ascend` / `descend` | **a Journey** along the column |

⚠ **Not a `DurativeActivity` with a transient depth** — that idea left a
mid-rise encounter with nowhere to happen (neither the bed nor the
surface fits it) and was not restart-safe. Logistics already built the
right shape for wagons, and it reads unchanged with water for road:

| road (logistics) | column |
|---|---|
| the lane's nodes | **depth bands** — as many as the water's character warrants, **never one per ten feet** |
| `edgeMinutes` on an edge | the band's thickness ÷ swim rate × the **buoyancy load factor** |
| the driver engaged, the vehicle traverses | the diver engaged, the diver traverses — holding **`body`** (not the driver's `hands`), so hands stay free to fight and to drop the belt |
| the vehicle is present in every node | the diver is **in each band, for real** — a predator there is an NPC with a presence trigger in a room, not a bespoke emission |
| express / local stop sets | a breath-hold diver goes **express** to the surface; a tank diver goes **local** — ⭐ **the decompression stop is a stop set**, and the bends is what skipping it costs |
| `route-blocked` | a ceiling that closed — the tidal cave |
| `driver-incapable` | out of breath — the body goes limp and **buoyancy places it** (§ 3); the lifeline is the rescue |
| server restart | the journey is gone and you are **parked in a real band at a real depth** — restart-safe |
| being attacked does not stop the wagon | the shark biting you does not stop you kicking for the surface; stopping is your own `cancel` |

**A mid-rise fight happens in the band you are in** — a room made for that
depth, its light, its cold, its fauna — not at either end.

**Bands come from the physics, not from feet.** A water body has a
surface, a lit layer down to where its clarity kills the light, a
thermocline where the season's warm water sits on the cold, the dark
below, and the bed. A shallow clear pond collapses to **two** bands; a
deep murky estuary has five. So the **default column** for a
dive-declared body derives its band count from the reach's clarity,
temperature and depth — derivation, not procgen, and the boundaries fall
where the *experience* changes. Atlantis authors its own bands and puts
forty rooms in them.

**Every band is its own zone.** The medium's properties — depth, light,
temperature, pressure, what lives there — are **zone fields** inheriting
through the shipped chain, as `_biomePath` and elevation already do.
Twelve rooms at one depth share one band-zone and author none of it
twice.

**Coordinates are the author's choice**: `CartesianLocation` for a
gridded reef; `SphericalLocation` — exists, positions by focus and
radius, *no implicit adjacency, every exit explicit* — for a column, a
dome, a city under one. A column's exits are `up` and `down`, derived
from depth. `lint:locations` is satisfied either way.

**The top band is always concrete.** Even under an abstract surface, the
column's top node is a real room — *the surface at the Kestrel's mouth* —
whose exits are the boat and the bank you dove from; the current's
displacement over the journey (duration × the reach's flow) is *which* of
those exits you surface at, or a shore you do not know. The reach
citation binds it to the record and the bus.

**Express past a hunter [LEAN in].** A diver going express through a band
where something is hunting is present for one beat — long enough for a
presence-triggered brain to act once. The drift-by: the fast ascent is
*safer from the water and less safe from what is in it*, a real trade,
and the encounter is the band's fauna doing its job rather than a roll on
the way up. If the express diver should pass untouched, that is one flag
on the stop set.

## 6. What it costs

Nearly nothing new. The Journey, the Route value object, the per-leg
transaction boundary and its fault table are shipped; `swim` is a
locomotion mode; zones inherit fields; spherical locations exist;
respiration, thermal, light and encumbrance are shipped drivers.
Additions: **`depth` as a zone field** (+ `ceiling` on a node, `_reach`
citation); the **buoyancy load factor** in the leg budget (negative
enough and the budget goes infinite until you drop something — the
principle in one term); a **`swim`-mode Journey** holding `body`; the
**default column** derivation; `displacement` on `Tangible`;
per-individual stature (physiology). The bends is a stop-set rule at the
tank epoch.

## 7. Open

1. **The abort rule for a breath-hold diver who runs out mid-column** —
   `driver-incapable` then buoyancy places the body (lean), or the body
   stays in the band it was in (harsher, simpler).
2. **Where you surface** — the entry point by default with the current
   deciding only over long ascents (lean), or the current always decides.
3. **Ceilings and the gate** — reach-to-air within the column, or within N
   hops across authored exits; and whether an air bell counts as air for
   the gate (lean yes: it is where you breathe).
4. **Pressure as harm at the breath-hold epoch** — none (lean; free-divers
   equalize), or ear/sinus injury below a depth for the untrained.

*(Retire when: the column, the medium and the ascent Journey ship and
hunting has acted in one authored underwater place.)*
