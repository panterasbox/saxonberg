# Hearth & larder design pack — the kitchen as a real place

> **Status: design, planner-ready, captured 2026-08-11. Not requirements.**
> The domestic integrating vertical — Dave's Bar for the home. Three halves
> that make each other matter: you **preserve** food, a cold store **buys
> time**, what spoils anyway goes to **compost**, and the room you do it in
> has a **fire**. Follows the [fridge pack](./fridge-design-pack.md)'s
> template deliberately (a passive tier that ships first · a shared substrate
> · a vocation woken · an existing clock given a counter).
>
> ⭐ **The compost half is the cheapest thing in the stewardship family**, and
> for a specific reason: **its consumer already ships and its producer does
> not** (Part 3).

See also: [stewardship-doctrine](../../stewardship-doctrine.md) (the pillar) ·
[spoilage](./spoilage-design-pack.md) (**the keystone clock all three answer
to — and it owns the preserving MECHANISM**) ·
[preservation-slate](./preservation-slate.md) (⭐ **owns the endeavor, salt,
and the agricultural year — read before touching Part 2**) ·
[fridge](./fridge-design-pack.md) (the cold-store tier) ·
[room-condition](./room-condition-design-pack.md) (the room this happens in) ·
[household](./household-design-pack.md) · substrates:
[thermal](../../subsystems/thermal.md) (⚠ **read its non-goals — Part 1 is
scoped by them**) · [fire](../../subsystems/fire.md) ·
[crafting](../../subsystems/crafting.md) ·
[smallholding](../../subsystems/smallholding.md) (the nitrogen reserve) ·
[husbandry](../../subsystems/husbandry.md) ·
[sanitation-slate](./sanitation-slate.md) (*abandonment is an act*) ·
[vocations](../../vocations.md).

---

## Part 0 — What the fridge actually was, and why it generalises

The fridge pack is worth reading as a **template** rather than a one-off. Four
things made it work, and all four are reusable:

1. **A passive tier that ships first** — the icebox needs no power and no
   dependency, so the design starts earning immediately.
2. **A shared substrate underneath** — the atmospheric container, which the
   jar, the cellar-chest and the icebox all wanted anyway.
3. **A vocation woken** — the icehouse keeper.
4. **An existing clock given a counter** — spoilage runs; the fridge buys time.

> ⭐⭐ **Stewardship objects are tools that buy slack against a clock.** That
> is the shape to look for, and the three halves below each have it.

**Why one build and not three.** They are the same room. Preservation is the
craft, the cold store is the machine that devalues it, compost is where the
race you lost still pays, and the fire is what the room is built around. Each
makes the others matter; separately they are three small features.

---

## Part 1 — ⭐ The hearth: a room that answers to what is burning in it

⚠ **Scoped by an existing decision, and narrower than "the house as a thermal
envelope."** [thermal.md](../../subsystems/thermal.md)'s **non-goals** list
rules out *"ventilation (no inter-room air mixing)"* and *"sauna rooms (the
heat-index/wet-bulb model is in; **rooms are not**)"*. A building-wide
envelope with airflow between rooms is **refused**, not merely unbuilt, and
this pack does not reopen it.

**What IS available is named as pending work in the same doc:**

> *"The Wave-2 indoor convection room-bump … Steps 2.1 / 2.4 indoor are
> **partial**: the outdoor warming-slot `warmth` path is wired end to end; the
> **indoor room-ambient bump is a follow-on**."*

So the honest scope is: **a room's ambient responds to heat sources inside
it.** One room, no airflow, no envelope.

### It is the fridge with the sign flipped

A fridge holds cold *in* a box; a hearth holds heat *in* a room — and it is
the same `τ = R·C` Newton cooling either way. The substrate is already
built and already has the fields:

| Need | Ships as |
|---|---|
| heat capacity | `C = mass × specificHeat` on `ThermalMixin` |
| insulation | ⭐ **`barrier`** — already a field on the mixin |
| cached ambient | `lastAmbientK` |
| the heat source | [fire](../../subsystems/fire.md)'s combustion driver + furnace family |
| outdoor conditions | [weather](../../subsystems/weather.md) + `SkyExposed` |

**Passive tier:** thermal mass and `barrier` — a stone room holds temperature,
a draughty one does not. **Active tier:** a fire in the grate, then a furnace.

⭐ **Law-2 is already clean here and for a reason worth keeping**: fire ticks
are **presence-gated**, so a hearth burns no fuel while you are away, and a
room drifting back to outdoor ambient costs you nothing but the time to light
it again.

> ⚠ **Refuse frozen pipes.** A cold house is a comfort state; burst plumbing
> would be *damage accruing from absence*, which is the one thing the doctrine
> forbids outright. Model the cooling, never the burst.

**What reads it:** `ThermalRegulationMixin` already cascades body temperature
into conditions, so a cold room becomes a cold *person* through shipped
machinery — and `restQuality` gains a second input beside bedding cleanliness.

---

## Part 2 — The larder: what this pack adds, and what it must NOT re-design

> ⚠⚠ **Corrected by the reconciliation pass, 2026-08-11.** This part
> originally re-designed preservation from scratch and attributed it to
> `fire.md`'s deferred recipe list. **That was wrong on ownership and
> duplicative on mechanism.** Two documents already own it:
>
> - ⭐ **[preservation-slate](./preservation-slate.md) owns the ENDEAVOR** —
>   it is titled *"spoilage, the counterplay, and the agricultural year,"*
>   and carries salt, the trade geography, and the seasonal argument.
> - ⭐ **[spoilage](./spoilage-design-pack.md) Part 4 owns the MECHANISM** —
>   curing/smoking/salting are **rate-reducer recipes** on
>   `outputApplication: 'tangible'` (the fresh→cured material swap), and
>   drying/salting work by pushing **water activity `a_w`** down, *read
>   straight off the shipped `WetMixin` gauge*. That is more precise than
>   what this pack had, and it points at something already built.
>
> **Defer to both.** What follows is only what this pack genuinely adds.

**What the larder adds: the room, and the economic story.**

The preserving crafts need somewhere to happen and something to happen
*around* — a fire to smoke over, a cool corner to hang in, a heap for what
fails. That is Parts 1 and 3, and it is why preservation belongs in this
build rather than standing alone.

> ⭐⭐ **And the economic story is this pack's own contribution: the machine
> devalues the craft.** When the icebox arrives, the pickler's skill becomes a
> hobby. A world where that happens *on-screen*, to a vocation players can
> hold, is the industrial revolution rendered in one kitchen — and it is a far
> better teacher of technological unemployment than any lecture. Neither
> preservation-slate nor the spoilage pack makes that argument; it needs the
> cold-store tier standing next to the craft to be visible at all.

> ⭐⭐ **And the economic story is real history: the machine devalues the
> craft.** When the icebox arrives, the pickler's skill becomes a hobby. A
> world where that happens *on-screen*, to a vocation players can hold, is
> the industrial revolution rendered in one kitchen — and it is a far better
> teacher of technological unemployment than any lecture.

⭐ **The vocation** is the **victualler** ([guild-slate](./guild-slate.md)
already names one), and the register's [slaughterer/butcher](../../vocations.md)
entry sits directly upstream.

---

## Part 3 — ⭐⭐⭐ The compost heap: closing a loop that is already open at one end

**The finding that makes this the cheapest item in the family.** Compost is
not a new concept in this codebase — **it is a shipped input with no source:**

- `feed.yaml` + `FeedController` ship the **`feed`** verb.
- `COMPOST_TAG = 'compost'` is a real bulk material tag.
- The controller resolves *"a carried bulk source of compost"* and converts
  litres into **percentage points of nitrogen** on a bed's reserve.
- [smallholding](../../subsystems/smallholding.md): *"harvesting **exports**
  nitrogen; `feed` puts it back."*

> ⭐⭐⭐ **So the consumer ships and the producer does not.** Nothing in the
> world *makes* compost — you can only buy a sack. That is precisely the
> shape the [doctrine](../../stewardship-doctrine.md) found for spoilage
> (*"spoilage has no producer anywhere"*), one system over.

### The loop, and every link exists but one

```
food  →  spoils (spoilage, designed)  →  ▓ COMPOST HEAP ▓  →  compost (ships)
                                                 ↓
                                        feed (ships) → soil nitrogen (ships)
                                                 ↓
                                   crops (husbandry ships) → food
```

**One new object**, and it is the fridge's shape inverted — a container whose
*job* is to let a clock run:

| | The heap |
|---|---|
| **Input** | spoiled food, kitchen scraps, [room-condition](./room-condition-design-pack.md) debris |
| **Process** | a slow continuous conversion — **archetype 2**, and it *should* run over absence |
| **Output** | `compost` bulk, at a `Grade` |
| **Care** | turning it, keeping it damp — care *raises grade*, neglect only slows it |

⭐ **Why this changes how the pillar feels, which is the real argument:**

> **Spoilage stops being pure loss.** The fridge buys you time; when you lose
> the race anyway, the food still feeds the garden. That is the difference
> between a system that punishes you and one that closes a loop — and it is
> the single cheapest way to make the spoilage keystone feel generous
> instead of punitive.

It also gives [sanitation](./sanitation-slate.md)'s *"abandonment is an act;
`collect` never `destroy`"* its **domestic** instance, and teaches **nutrient
cycling**, which is the actual foundation of soil science.

---

## Part 4 — Designed to the format

**1–2. What it is / composition.** One **room-ambient read** (the named
thermal follow-on), one **craft branch** (preservation recipes), one **new
object** (the heap). No new subsystem.

**3. New / updated surfaces.**

| | Work | State |
|---|---|---|
| ⭐ **Room-ambient bump from heat sources** | thermal's own named Wave-2 follow-on; one room, no airflow | **new (small) — the substrate ships** |
| ⭐⭐ **`CompostingMixin`** | a container that converts organic input → `compost` bulk on a continuous clock, at a `Grade` | **new — the one genuinely missing piece** |
| ✳ **Preservation recipes** | dry · salt · smoke · pickle; each extends a `Freshness` clock | **rides [crafting](../../subsystems/crafting.md) + spoilage** |
| ✳ **`restQuality` gains room temperature** | a second input beside bedding | **update** |
| ✳ **Scraps as compost input** | spoiled food + debris are already objects | **rides spoilage + room-condition** |
| ⛔ **Whole-house thermal envelope / inter-room airflow** | — | **refused by thermal's non-goals; not reopened** |

**4. Verbs & affordances.** `light`/`douse` ship; `feed` ships; preservation is
`craft`. ⭐ **One candidate new verb — `turn` (the heap)** — and it should be
resisted if an existing verb fits, per the standing preference for subcommands
over new verbs.

**5. Persisted fields.** The heap's contents + its clock stamp (husbandry's
reconcile shape). Preservation state rides `Freshness`. Room ambient is
derived.

**6. Seams & dependencies.** ⚠ **Spoilage is the hard prerequisite for two of
the three halves** — preservation has nothing to preserve against and the heap
has nothing to eat without it. **The hearth does not depend on spoilage** and
could land first.

**7. Fault line.** ⭐ **The compost heap is near-term and nearly free once
spoilage lands** (its consumer already ships). The hearth is a small
independent slice available *now*. Preservation is the largest of the three
and wants the crafting-recipe branch fire.md already defers.

---

## Part 5 — ⚠ Dangers

**1. Reopening a refused non-goal.** The pull toward a whole-house thermal
model is strong. `thermal.md` refused inter-room mixing deliberately; Part 1
stays inside one room.

**2. Frozen pipes** (Part 1) — the one place this build could accidentally
tax absence.

**3. The heap as an errand.** Turning compost must **raise grade**, never
gate output. Neglect slows it; nothing is lost. Otherwise it is a chore with
a timer.

**4. Preservation as busywork.** If salting is strictly better than a fridge
with no trade-off, it is a tax on the player's time. The honest trade:
preservation is **cheap, slow, and changes the food** (salt fish is not fresh
fish); refrigeration is **expensive, fast, and preserves the thing as it is.**

---

## Part 6 — Pedagogy

- ⭐⭐ **Nutrient cycling** — the loop in Part 3 is the foundation of soil
  science, and a player closes it with their own kitchen waste.
- ⭐⭐ **Technological unemployment**, lived: the icebox arrives and a craft
  becomes a hobby (Part 2).
- **Food microbiology** — why drying, salting, smoking and acidifying all
  work, and that they work by *different* mechanisms against the same
  organisms.
- **Heat transfer** — `τ = R·C` in a room you live in: thermal mass,
  insulation, why a stone house is cool in summer.
- **Conservation of matter** — nothing is destroyed; food becomes soil becomes
  food. `collect`, never `destroy`.

---

## Interop map

- **[Spoilage](./spoilage-design-pack.md)** — the clock all three answer to;
  the hard prerequisite for two.
- **[Fridge](./fridge-design-pack.md)** — the machine half of Part 2's craft/
  machine pair; same template.
- **[Room-condition](./room-condition-design-pack.md)** — debris is compost
  input; the room is where the hearth is.
- **[Smallholding](../../subsystems/smallholding.md)** — the nitrogen reserve
  and the shipped `feed` consumer this closes the loop into.
- **[Thermal](../../subsystems/thermal.md) + [fire](../../subsystems/fire.md)**
  — Part 1's substrate, and the scope that bounds it.
- **[Sanitation](./sanitation-slate.md)** — the heap is the domestic instance
  of *abandonment is an act*.
- **[Vocations](../../vocations.md)** — wakes the **victualler**; the
  icehouse keeper arrives with the fridge.

---

## Open questions

1. ⭐ **Does the heap belong to the kitchen or the garden?** It is fed by one
   and feeds the other. *Lean: the garden* — it is `fixedGround`-adjacent, it
   wants to be outdoors, and putting it in the kitchen makes a smell problem
   nobody asked for.
2. **How much compost does a household actually produce?** If a kitchen's
   scraps fertilise a whole smallholding, farming loses its input economy.
   *Lean: a household heap feeds a household garden and no more* — the scale
   should be honest, which also means a real farm buys or keeps stock.
3. **Does preservation change what a food *is*, or only how long it lasts?**
   *Lean: both* — salt fish should be a different item with different
   `Freshness` and different meal tags, which is what makes the craft/machine
   trade real rather than a duration dial.
4. **Room ambient: derived per read, or a stamped room field?** Thermal
   already stamps `lastAmbientK` on objects. *Lean: follow whatever the Wave-2
   follow-on chose* — this pack should not invent a second convention.
5. **Does a hearth make a room a better place to recover mana?**
   [Mana](./mana-economy-design-pack.md) ties recovery to ambient *mana*, not
   temperature — so probably not, but a warm dry room plausibly helps
   `restQuality`, which throttles endurance. Worth checking the two do not
   accidentally double-count comfort.
