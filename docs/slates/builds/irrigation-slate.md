# Irrigation slate — water to a field, the law it brings, and the salt it leaves

> **Status: UNBUILT** — designed at high level 2026-10-20 with the owner, out of the gap
> walk. **Gathers three scattered designs into one build**: the
> [farming slate](./farming-slate.md) § *Irrigation, and the one commons inside private
> farming*; the [rgo-unification slate](./rgo-unification-slate.md) § *Irrigation — the
> worked epoch ladder*; the [navigable-water slate](./navigable-water-slate.md) §
> *Irrigation — what the WATER side owes it*. Staged already at Heart's Delight:
> *"Thinning & the water — the anxious season. Irrigation begins; the head gate matters;
> a dry year is decided now"* ([hearts-delight.md](../tails/staging-leftovers-slate.md#35-the-seasonal-economy)).
> What ships: soil's moisture reserve (*"only RAIN waters the ground"*,
> [soil.md](../../subsystems/soil.md)), the `Conduit` ladder, water rights with priority
> dates, `StorageNode`, `passFraction` ([watershed.md](../../subsystems/watershed.md)).
> **Left:** the bed↔conduit join · the irrigator's acts (headgate, ditch, the turn) ·
> the ditch boss and the district · measuring water (the weir, the miner's inch) · return
> flow · ⭐ salinization and drainage (a salt reserve on soil) · ⭐ the groundwater law ·
> the rain butt filling from its roof · the epoch ladder as designed
> **Size:** a build

## 1. ⭐⭐ Freshwater sources, as modeled today — and where irrigation meets them

| source | model | can it run out? |
|---|---|---|
| a river reach | `Watercourse` — flow as a takeable volume from the precipitation integral, snowpack, rights | ✅ honest |
| a conduit (aqueduct, intake, outfall) | `Conduit`, the six-word `SupplyState` | ✅ through its source |
| a tank | `StorageNode` — the level is its one piece of state | ✅ |
| a tap, basin, standpipe, trough, water butt, leat | `WaterFixture` — **inexhaustible**, ⭐ **unless plumbed**: `suppliedBy` ties it to a main and it reads the main's state | only if plumbed |
| a well | `Well` — *"an inexhaustible body below (the finite aquifer is a non-goal)"* ([pump.md](../../subsystems/pump.md)) | ❌ |
| a bore | drilling's `Wellhead`, bounded by its sump | partly |
| rain on a bed | soil's moisture reserve | ✅ by weather |

### ⭐⭐ One source, two scales **[DECIDED]**

Watershed's rule: *"The mains stay effectively unlimited at the household tap; rivalry
lives at agricultural and industrial scale."* That is the seam with the
[running-water slate](./running-water-slate.md):

- **Domestic** — nobody rations a kettle; a plumbed tap reads its main's state, which
  goes `dry` or `overdrawn` only when something big draws on it.
- **Irrigation is the big draw** — metered against rights. ⭐ So a dry year shows up **in
  the city's taps because of the valley's fields**, through one shared reach, with nobody
  authoring the link: the urban–rural water fight, derived.

### ⭐ Every source answers the same contract; each has its own law **[DECIDED]**

The running-water slate's contract — capacity, head, `SupplyState` — holds for every
source. What differs is the **law**:

- **renewable** — a river, recharged by the precipitation integral;
- **stored** — a tank, cistern or butt, filled by catchment or a conduit;
- ⭐ **groundwater** — slow recharge, a **hidden level** that falls with draw (§ 6);
- **inexhaustible** — an authored convenience, the grain for small sources.

⚠ **The water butt** is an inexhaustible fixture today; a rain barrel should **fill from
the rain on its roof**, as soil does — a small honest fix.

## 2. The join **[DECIDED]**

Soil's input becomes **rain + delivered**. The navigable-water slate: *"Irrigation is
that same number arriving by pipe instead of by sky."* No new mechanism — the join,
farming's to build and water's to expose.

## 3. ⭐⭐ The irrigator's acts **[DECIDED]**

- **The headgate** — open and close the diversion (`switch` covers a conduit's valve;
  ships).
- **The ditch** — dig it; ⭐ **clean it every spring** — the annual clean-out *is* the
  labor commons the gravity rung requires.
- ⭐ **The turn** — acequia systems ran on a **rotation** kept by the ditch boss (the
  *mayordomo*): your hours at the gate, around the clock, night turns included.
- **How the field takes it** — flood, furrow or basin.

## 4. ⭐ Measuring water **[DECIDED]**

You cannot allocate what you cannot measure. The **weir** and the **miner's inch** — a
unit of flow invented to share water by law — are an instrument and a reading
([instrumentation.md](../../subsystems/instrumentation.md)): the three-layer measurement
pattern again.

## 5. ⭐⭐⭐ Return flow — efficiency upstream is an injury downstream **[DECIDED]**

From the navigable-water slate: the `draws` ledger subtracts a withdrawal in full, but
irrigation does not consume all it diverts — crops transpire part and the rest returns
below. **A draw needs a consumptive fraction**, the remainder returning at a downstream
reach. Then: *"if the upstream user lines his ditch, the downstream user is injured"* —
the real no-injury doctrine, computed exactly on both sides; nobody is wrong.

## 6. ⭐⭐⭐ Salinization and drainage **[DECIDED — a fifth soil reserve]**

**The oldest environmental catastrophe on record.** Irrigation water carries dissolved
salt; evaporation leaves it behind; over-watering **raises the water table and draws salt
into the root zone**. Without **drainage**, irrigated soil slowly poisons itself —
southern Mesopotamia's records show farmers shifting from wheat to the more salt-tolerant
barley as their fields salted.

- **Soil gains a `salt` reserve** beside moisture, nitrogen, organic matter and structure:
  in with delivered water, concentrated by evaporation, out only by **leaching through
  drained ground**.
- **The remedy is drainage** — field drains, which the ceramics build's **drain tiles**
  already make.
- Lens 1 (derivable), lens 4 (this year's harvest against the land's future), lens 5
  (Sumer and now).

## 7. ⭐⭐⭐ The groundwater law **[DECIDED]**

The epoch ladder's fourth rung needs the aquifer the `Well` deliberately skipped:

- **The aquifer** — a stored source with **slow recharge** and a **hidden level** that falls
  with every draw. *"Groundwater is a depletion resource that looks renewable because it is
  invisible."*
- ⭐ **A well has no gauge** — surface scarcity is public (the river is low and the staff
  gauge says so); groundwater scarcity is invisible until the well fails. **The
  observation well** is the instrument that makes the commons manageable again.
- This **corrects `Well`'s inexhaustible body** — the village well becomes a window onto a
  shared, finite aquifer.

## 8. The epoch ladder **[DECIDED — rgo-unification]**

| rung | what moves the water | who decides who gets it | the reservoir |
|---|---|---|---|
| flood recession | nothing — the planting moves | a calendar | the river, visible |
| gravity ditch | the contour | ⭐ a labor commons | the river, visible |
| pump, surface | energy | money | the river, visible |
| pump, ground | energy | nobody | ⚠ an aquifer, invisible |
| drip | energy and control | money | both, metered |

⭐ *"What changes is not the technology — it is the institution the technology requires."*
The ditch forces cooperation; the pump allows defection; the well removes the gauge. ⚠ At
the drip rung efficiency is maximally destructive — almost no return flow.

## 9. The lens pass (2026-10-20)

1. **Pedagogy** — contour decides the command area (zone elevation doing real work);
   evapotranspiration; ⭐ salinization; ⭐ return flow; measuring water.
2. **Expression** — an author draws the ditches; a valley's water institution (the
   acequia's rotation, the district's assessment) is content.
3. **Immersion** — the headgate, the spring clean-out, the night turn. **Participation** —
   ⭐ the ditch boss, the ditch rider who walks up and closes your gate; *"an irrigated farm
   suffers law"* — curtailment by name, in person; ⭐ **water theft at night**, the classic
   crime; selling the valley's rights to the city.
4. **Values** — this year's harvest against salting the land; efficiency against the
   neighbor who lived on your leakage; senior against junior; farms against the city.
5. **Continuity** — the ladder (§ 8): the same `irrigate` at every rung, the institution
   changing.
6. **Economy** — yield in dry country and so land value; rights become tradeable (the city
   buying farm water is the real endgame); consumes rights, the ditch labor, pump energy,
   drainage.
7. **Governance** — the district (*"none is a different object"*); the ditch rider's
   curtailment (criterion: priority date; appeal: the water court); water theft; the
   no-injury rule; ⭐ the observation well as what makes a groundwater commons possible.

## 10. First venue

**The Delight valley's anxious season** — senior and junior rights side by side (Furtado's
senior water on the flats, Avila's junior on the bench with his own well), the headgate,
the ditch, the turn.

**The drive, in one line:** in a dry July the ditch boss posts the turns; you open your
headgate at two in the morning, flood the furrows, and close it on time — and the next
week the ditch rider closes the junior gates by name, and Avila's well starts to draw down.

## 11. Open

1. **The salt reserve's rates** — in by delivered water, concentration by evaporation,
   leaching through drainage.
2. **The aquifer's shape** — per zone, per basin, and how wells share one.
3. **The consumptive fraction** — per crop and method.
4. **The turn** — as a schedule document the ditch boss authors, or a calendar entry.
5. **Flood recession** — the freshet-following strategy, which needs no build.
