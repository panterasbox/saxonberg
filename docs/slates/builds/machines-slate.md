# Machines slate — power through parts, breakage from duty, and roles between function and form

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of
> the gap walk, now that [assembly](../../subsystems/assembly.md) has shipped.
> What exists: parts as plain records, joints, wear routed to the part that gives
> first, derived failure, `fit`/`repair`/`salvage`, nesting by row reference and
> **the leaf rule**; `Powered` as the mover shape (*"a prime mover is a `Powered`
> implementer"*, [pump.md](../../subsystems/pump.md)), implemented by the grid
> ([energy.md](../../subsystems/energy.md)); the grist mill and sawmill reading
> power from their race. The [steam-engine slate](./steam-engine-slate.md) names the
> gap: *"shaft work as a coupling — the thing nothing in the realm has."*
> **Left:** ⭐ the power path on the bill (the schematic) · duty wear from running ·
> lubrication · derived failure (worn out, seized, cascade, overload) with a sense
> signature before each · ⭐ fit by tolerance — interchangeability as an achievement
> of precision · ⭐ roles: function mixins declare the roles their physics reads,
> bills map parts onto them · the generic machine capability · the drive in a place
> (one mover, several machines) · the mover family made complete (wind, the horse
> gin) · the player's surface · the millwright and the stone dresser · tending
> (open) · the pump rebuilt as first consumer
> **Size:** a build (kernel capability + rows; the pump, the mill and the watch as
> consumers)

## 0. What the owner asked, and the answer

*"We shipped repair but we never really talked about breakages. An authored breakage
is one thing but if we wanted to have derived or emergent breakages that actually
reflect some kind of internal schematic …"* — and the scaling worry: *"does the
grist mill have big machines and do those big machines have small machines? …
there's kind of a fractalisation that happens with mechanics and assemblies because
it's all based on interchangeable parts. Even our pre-industrial epoch is still
basically based on interchangeable parts just because that's the platform
mechanics."*

Machines need no new model of *things*. They need a model of **power moving through
things**, and of **what running does to them**.

## 1. ⭐⭐⭐ What already answers the scaling **[DECIDED]**

- ⭐⭐ **The leaf rule** — *"the depth of an assembly is bounded by what a player
  DECIDES about, never by how many pieces it has."* Model down to where someone
  decides; below that, prose. A watch and a mill are one model at two decision
  depths: the watchmaker decides about mainspring, balance, escapement and jewels
  (the train is one line); the millwright about wheel, shaft, cogs, bearings and
  stones.
- **No child objects** — a part is a plain record in its host and becomes a Thing
  only when it leaves (`salvage`) or arrives (`fit`). **The parts economy already
  works**: a cog, a bearing, a mainspring is a good with a row.
- ⭐ **A mill is a place, not a machine of machines.** A grist mill is a structure
  whose **drive** couples **separate machines** — the stones, the saw, the hoist —
  each its own assembly, each nesting sub-assemblies only where someone decides.
  That stops the fractal.

## 2. ⭐⭐⭐ The schematic — the power path on the bill **[DECIDED]**

Today breakage comes from blows (a strike, a hew). Machines break from **duty** —
turning under load, hour after hour. That needs one addition to the bill:

```yaml
bill:
  parts: [wheel, shaft, crown-wheel, stones, bearing ×4, hopper]
  path:  [wheel → shaft → crown-wheel → stones]   # the order power flows
  rides: { bearing: shaft }                          # what turns in what
```

- **Duty wear** — running wears each part on the path by its duty: gear teeth by
  the load they carry, bearings by turning under load, the working end by the work
  done. Derived from power × time; never authored.
- **Lubrication** — a state on the bearings. Oil cuts friction; a dry bearing heats
  (thermal ships), wears fast, then **seizes**. Oil is a real consumable (rendering,
  the olive, later the whale).
- **Failure, derived:**
  - **worn out** — gradual, through the broken dial (ships);
  - **seized** — a dry bearing stops the shaft;
  - ⭐ **cascade** — a seized bearing jams the shaft and the shock lands on **the
    weakest part on the path**: the shipped *routed to the part that gives first*,
    fired by a jam instead of a blow;
  - **overload** — a load beyond a part's strength.
- ⭐⭐ **A sense signature before every failure**, derived from the part's condition
  band: a worn cog **knocks**, a dry bearing **runs hot**, a slipping belt
  **squeals and smells**. That is the diagnosis surface (§ 6).

## 3. ⭐⭐⭐ Interchangeability is an achievement of precision **[DECIDED — lens 1, lens 5]**

The platform makes everything plug in; history did not. Before about 1800 every
part was **fitted to its own machine** by hand; making parts to gauge so they swap
freely — the armory system — was an industrial achievement. Derivable:

- **A part carries a deviation from its pattern**, from its maker's competence — a
  master's cog close to true, a novice's off.
- **`fit` checks the deviation against the joint's tolerance**: within it, the part
  drops in; outside it, it **seats short** — weaker, wearing faster — unless someone
  **fits it by hand** (files and shims it to this machine), a skilled engaged act.
  The precedent ships: a cupped board *"seats short"* in a glued joint.
- **The epoch ladder** — bespoke → hand-fitted → made to gauge. ⭐ The early
  millwright's real skill is fitting, and the **parts economy changes character**
  when gauges exist: standard cogs from a parts maker instead of one-offs. A spare
  from another mill does not simply fit yours — pre-industrial play becomes the real
  thing rather than dressed-up interchangeability.

## 4. ⭐⭐⭐ Roles — function in the mixin, form in the row **[DECIDED]**

The owner: *"we have a whole mixin for pumps right? but not every pump has the same
assembly. However they do all have the same mechanics. So should the pump mixin
imply some kind of schematic?"*

**Function lives in the mixin; construction lives in the row; roles are the contract
between them.**

1. **The function mixin owns the physics and declares the roles it reads.**
   `PumpingMixin` owns lift, throughput, stroke and the suction ceiling; it declares
   **`seal`** (what keeps water from slipping back), **`valve`** (what stops
   backflow between strokes), **`chamber`** (where the water is worked) and
   **`driver`** (what the mover pushes).
2. **The row owns the construction** — each kind's bill lists its parts, its path,
   and **maps parts onto the roles**.
3. **The generic machine capability** — duty, lubrication, failure, signatures —
   runs on any bill and knows nothing about pumps.

| pump kind | `seal` | `valve` | `chamber` | suction ceiling |
|---|---|---|---|---|
| suction lift pump | the leather bucket or packing | flap valves | the barrel | yes (~10 m) |
| force pump | the plunger's packing | two valves | the cylinder | no |
| chain pump | discs on a chain in a tube | none — the discs carry it | the tube | no |
| ⭐ Archimedes screw | **none** — leakage is the clearance | none | the flights | no |

**The physics reads the role, never the part.** A worn seal leaks back: throughput
falls and ⭐ the pump **loses its prime** — the real reason *priming the pump* is a
phrase. A worn valve lets water fall back between strokes. A pump with no `seal`
role (the screw) has no such failure; its inefficiency is built in. Every pump
answers the same commands while built entirely differently — lens 5's test across
designs rather than epochs.

**It generalizes, and half-ships informally** — Pumping (seal, valve, chamber,
driver) · Milling (runner, bed, feed) · Timekeeping (mainspring, escapement,
balance — [horology](./horology-slate.md)) · Sawing (blade, feed). Today the lamp
reads its `facing` panes, the vat reads `leaks()`, the plough wears its share — each
host reaching into its parts by convention; roles make it a declared contract.

## 5. The drive and the movers **[DECIDED]**

- **A machine is mover → transmission → working end**, each stage parts.
- **Every mover implements `Powered`** — muscle by crank or treadle (exertion), an
  animal at a horse gin (ranching, haulage's draft), water (the race — ships), wind
  (weather's wind ships; **the windmill is a gap**), steam (the steam slate), a spring
  or weight (horology), the grid (ships), mana (arcana's `ManaPowered`). ⭐ The same
  loom answers the same commands whatever drives it.
- **The six simple machines** (lever, wheel and axle, pulley, inclined plane, wedge,
  screw) trade distance for force; exertion already prices a body's work, so a
  windlass or a block and tackle is that derivation with a mechanical advantage.
- ⭐ **The drive in a place — one mover, several machines.** Before electric motors
  one wheel drove a whole mill through a line shaft and belts. A place's mover has a
  power budget; each machine **coupled** to it draws a share; couple one more and the
  others slow — the sawmill's *"a dry August cuts slower"* is already one machine's
  view of it. Each coupling loses a little to friction, which is **why the electric
  motor won**: power by wire, a motor per machine.

## 6. ⭐⭐ The player's surface **[DECIDED]**

**The machine's card**, from its parts (the Thing card's per-capability sections):

```
the mill's stones                         ⚙ Thing · fixed
  driven by   the great wheel, through the crown wheel — running
  speed       slow — the wheel isn't getting much water
  work        grinding wheat · coarse meal
  wear        the crown wheel's cogs are worn · the runner stone is dull
  commands ▸  adjust · switch · dress · oil · fit
```

**Read with the senses** — where the skill is (millers judged their stones by sound
and the feel of the meal): `listen` (*a steady rumble* / *an irregular knock from the
gearing*), `feel` a bearing (*hot to the touch*), `smell` (*hot oil, something
scorching*), and from outside the rumble carries down the lane — **silence means the
mill has stopped.** Competence decides how much you hear.

| command | what it does |
|---|---|
| `switch stones on` / `off` | couple or uncouple that machine from the drive (`switch` ships) |
| ⭐ `adjust stones fine` | set the working end — the millstones' gap decides coarse or fine meal, and so the grade (`adjust` generalized from the old watch verb) |
| `oil bearing` | lubricate |
| ⭐ `dress stones` | re-cut the furrows — a skilled periodic restore of the working end, as `sharpen` restores a blade |
| `fit cog to crown wheel` | replace a part (`fit` ships), by tolerance (§ 3) |
| `measure power` | the number, for whoever has the instrument |

**The decision the drive creates** — in a dry August, run the stones alone at speed,
or both machines slowly: `switch`, and the words on each card.

⭐ **Diagnosis is the gameplay** — output falls and you work out why from evidence: a
low race (look at the water), a slipping belt (listen, smell), worn cogs (look), a
dry bearing (feel). The medic's assess loop pointed at a machine: a mechanic's
Discipline, deepening with competence.

## 7. Small and big — carried and installed **[DECIDED]**

| | small machine | big machine |
|---|---|---|
| is | a good you carry or set down | a **fixture**, installed in a place, part of a structure |
| power | its own — the operator (crank, treadle) or stored (spring, weight) | the place's — the drive, or the grid |
| e.g. | treadle sewing machine, spinning wheel, mangle, coffee mill, clockwork, a gun's lock, the bicycle | the mill, the trip hammer and bellows, the loom shed, the printing press, the crane, the winding engine, the ship's engine |
| built by | a maker, as an assembly | ⭐ **the millwright**, as a [construction](./construction-slate.md) element in its phase |

**Vehicles** are the third case — machines that carry their mover. A watch is the
small-machine test of the whole model: path *mainspring → train → escapement →
balance*; its oil thickens (horology's service); its mainspring fails from fatigue;
a replacement fits or must be fitted.

## 8. Governance and labor **[DECIDED]**

- **Machines kill** — unguarded belts and gearing; Britain's Factory Acts required
  dangerous machinery to be fenced (from 1844). The bursting boiler is the steam
  slate's. A polity's guarding law, with a criterion and an inspector.
- **Machines collapse the hours a good embodies** — silk's *hours × wage* undone;
  prices fall, and **the Luddites** (1811–16) are the real values conflict over whom
  the machine benefits (lenses 4 and 6).

## 9. ⚠ Open — tending

**What may a machine do while nobody tends it?** Cross-cutting: memory records that
offline automation once shipped inside a trade build (taps), and the sawmill already
cuts unattended. History: most machines need tending (the miller watches the grain;
a loom stops at a broken thread); some run alone (a water-wheel pump, a clock).
**Lean:** a machine runs while **tended** — tending a seat a person or a hired hand
holds — and **self-acting** machines are an epoch rung earned, each with a failure
that stops it (the broken thread, the dry race); the sawmill becomes that rung's
first case rather than an accident. To be decided before the build.

## 10. First consumers

1. ⭐ **The pump, rebuilt on roles** — its packing today is *a separate `Tool` set in
   the pump* (a pre-assembly design); it becomes a bill part playing `seal`, worn by
   duty and replaced by `fit`.
2. **The grist mill** at Heart's Delight — the drive, the stones, the dresser.
3. **The watch** — the small end, with the horology build.

**The drive, in one line:** the mill grinds slow; you `listen` and hear a knock,
`look` at the crown wheel and find worn cogs, `fit` new ones (one seats short and you
file it true), `oil` the bearings and `adjust` the stones to fine — the meal comes out
a grade better, and the rumble down the lane is steady again.

## 11. Lens pass

1. **Pedagogy** — simple machines and mechanical advantage; friction and
   lubrication; failure modes and cascades; interchangeability as precision; why the
   motor won.
2. **Expression** — a machine kind is a bill with a path and a role map: rows, no
   code.
3. **Immersion** — the knock before the break; silence from the mill.
   **Participation** — the millwright, the dresser, the mechanic, the parts maker.
4. **Values** — the Luddites; guarding against the cost of a fence.
5. **Continuity** — the same machine under every mover; bespoke → gauge.
6. **Economy** — the parts economy; oil as a consumable; hours collapsed.
7. **Governance** — the Factory Acts; the boiler.

## 12. Open

1. **Tending** (§ 9).
2. **The role vocabularies** — each function mixin's closed list.
3. **Duty rates** — wear per unit of power × time by part kind.
4. **Deviation and tolerance** — the numbers, and how a maker's grade sets them.
5. **The drive's double count** — two machines reading one reach
   ([assembly-slate](../tails/assembly-slate.md)'s deferred seam).
