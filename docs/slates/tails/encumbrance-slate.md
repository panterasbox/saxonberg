# Encumbrance slate (working doc)

> **Status (2026-06):** the **build has shipped** — the `LoadBearing`
> gauge (borne burden + carry capacity + load ratio), `BodyPlan.baseMass`
> mass-seeding, `Vessel.transmissionFactor` + the `Adornable`→`ExitableVessel`
> narrowing, and the consequence ladder (lift gate / locomotion veto /
> traversal drain) graduated to [encumbrance.md](../../subsystems/encumbrance.md).
> The **cart/conveyance handoff (the "hinge") has now shipped** too — as
> the haulage build (`draftFactor` draft term folded into the gauge + the
> cart-in-room live-ref tow + terrain/breakaway gates), graduated to
> [encumbrance.md § Haulage](../../subsystems/encumbrance.md) +
> [conveyance.md § Haulage](../../subsystems/conveyance.md). What remains
> here is the rest of the deferred design surface: the per-item placement
> refinement (a frame pack beating the worn floor), augment-conferred
> capacity, environmental (gravity) margins, tissue-derived mass, and
> numeric tuning. Endurance *recovery* is **not** an encumbrance tail — it lives
> in the [metabolism-slate](../builds/metabolism-slate.md) (coupled
> recovery closes the one-way drain this build shipped). This slate stays
> until those are absorbed.

Working slate for **encumbrance** — the weight a creature bears and
what bearing it costs. The headline isn't "model carried weight"
(that's nearly free; the substrate is already under us). It's the
**library of interactions** that change *how much a load costs you* and
*how much you can bear* — backpacks, carts, pack animals, exo-frames,
bags of holding. That library is the build.

This slate is the next consumer in the **Vitals & survival** build
(member alongside [vitals-slate](./vitals-slate.md)). It reads the
body-state substrate built on `feature/vitals` and adds one derived
gauge plus the seams that modify it.

See also (read before building — these are the substrate this leans on):

- [docs/subsystems/reserve.md](../../subsystems/reserve.md) — the
  `Reserve` capacity-axis primitive (`current` / `capacity` as
  `Quantity<U>`, `floorEffect`). Encumbrance borrows its **shape**;
  see the load-bearing difference below.
- [docs/subsystems/vitals.md](../../subsystems/vitals.md) —
  `getConditionBand` / `getConsciousness` and the vital signs the
  margin conditions read.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) —
  `Quantity<'kg'>`, the unit everything here is measured in.
- `Tangible.mass: Quantity<'kg'>` ([material](../../subsystems/race.md))
  — every tangible thing already has honest weight. **No new weight
  field is needed.**
- [docs/subsystems/embodiment.md](../../subsystems/embodiment.md) +
  [docs/subsystems/slot.md](../../subsystems/slot.md) — worn vs held
  is slot occupancy; "frees your hands" falls out of this, not a flag.
- [docs/subsystems/conveyance.md](../../subsystems/conveyance.md) —
  the cart's second hat. Where load leaves the body, placement hands
  off to conveyance.
- [docs/subsystems/augmentation.md](../../subsystems/augmentation.md) —
  `AugmentMixin.confers()`; the exo-frame / belt-of-giant-strength
  capacity term.
- [docs/slates/tails/bulkable-slate.md](../tails/bulkable-slate.md) —
  a partially-full waterskin's borne weight tracks its bulk; future
  tie-in.
- [docs/slates/deferred-rpg/capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md)
  — **the boundary.** Encumbrance capacity is *not* a draw on the
  deferred general stat system. See "Capacity is not a stat."
- [docs/slates/deferred-rpg/collision-slate.md](../deferred-rpg/collision-slate.md)
  — container capacity (does the bag *fit* it?) is the other gauge;
  decomposed there, not here.

---

## Principle

Encumbrance is a **current-vs-capacity gauge** on a bearer:

- **`current`** = the **borne burden** — how much the stuff you're
  bearing actually presses on *you*.
- **`capacity`** = how much you can bear before it bites.

It has the *shape* of a `Reserve`, with one difference that turns out
to be load-bearing:

> A biological reserve's `current` is **stored and depletes** (endurance
> bleeds as you act). Encumbrance's `current` is **derived and
> recomputed** — it's the running sum of what you're bearing. It doesn't
> regenerate; it changes when you pick things up and put them down.

So the whole design surface is **two derivation functions**, and every
interaction in the game is a *term* in one of them:

| Half | Function | Interactions live here |
|---|---|---|
| `current` | the **load term** | backpacks, carts, bags of holding, posture, environment |
| `capacity` | the **capacity term** | physiology, augments, exhaustion, hypoxia, gravity |

The build is *assembling that library of terms*. The gauge itself is
trivial; the terms are the game.

---

## Units: mass → effective-kg → ratio

Encumbrance is measured in **kilograms** — no fantasy unit, no "load
points." The coupling factors are *dimensionless multipliers* (1.0,
1.4, ~0), and kg × a unitless number is still kg. So burden stays in
kilograms; it just stops being the *mass* and becomes a
**load-equivalent**: "what mass, borne ideally, would tax me the same?"

This is the wind-chill trick. A thermometer reads 5 °C but it "feels
like" -3 °C — same unit, run through a transfer function (wind,
humidity), anchored to a reference condition. Encumbrance is **effective
kilograms**: the same unit as mass, transformed by coupling, anchored to
the `1.0` floor (bearing it ideally, where perceived equals true).

Three honest layers:

| Layer | Unit | Meaning |
|---|---|---|
| **true mass** | kg (real) | what a scale reads — conserved, physical (`Tangible.mass`) |
| **effective burden** | kg (perceived) | mass run through the coupling tree-walk — 20 kg in your arms feels like 28; in a good pack, 20; in a bag of holding, ~0 |
| **load ratio** | % (dimensionless) | `current / capacity` — the signal thresholds and the cockpit bar actually read |

Both halves of the gauge are kg: `current: Quantity<'kg'>` (effective
burden borne), `capacity: Quantity<'kg'>` (effective kg you can bear,
~80 for a human; margin conditions and augments are dimensionless
multipliers on it, same as the load side). The meaningful output is the
fraction between them. Maps directly onto the `Reserve` shape (which
already carries `%` as a unit for the derived ratio).

> **Footgun.** Effective-kg and true-mass share the *same*
> `Quantity<'kg'>` type, so nothing stops a call site from adding a real
> mass to a burden. They're the same dimension but semantically distinct
> — *mass is what a scale reads; burden is what the gauge accumulates.* A
> discipline note, not worth a branded type.

---

## The model is mass — not RPG slots

No inventory tetris, no slot counting, no "you are over-encumbered!"
modal. The gauge is one scalar (`borneBurden / carryCapacity`), surfaced
in the cockpit vitals readout like a condition. It mostly doesn't bother
you — normal adventuring weight is fine. It bites only when you try to
*haul* something: loot a corpse's plate, carry a body, move furniture.
**That** is a fun, intentional moment ("can I drag this chest?"), not a
constant nag.

Consequences are a **soft tax, not a hard gate** (the house style:
soft diegetic limits over hard engine caps). The graduated ladder:

| Load | Effect |
|---|---|
| Light | nothing |
| Moderate | endurance drains faster when you move/act |
| Heavy | locomotion modes suppressed (can't run/climb/swim over-loaded — the locomotion gates already exist); movement labored; endurance bleeds |
| Past the possible | you strain and **fail to lift it** — surfaced as a failed action ("the anvil doesn't budge"), never as a slot rule |

The only "hard" point is diegetic and lives at the moment of lifting.

### The spiral (flagged for tuning)

Overload taxes endurance → low endurance shaves capacity (a margin
condition, below) → the same load is now *more* overloaded. Pick up too
much and flee, and the system can walk a careless player into collapse
on its own — diegetically, honestly, no special case. It's a real
dramatic engine and potentially brutal. **How steeply exhaustion bites
capacity is a dial, not a detail** (see open questions).

---

## The load side: through what coupling, onto which bearer?

The entire load term reduces to one question: **through what coupling
does this mass reach which bearer?** Answering it lines every
interaction up on one spectrum:

| # | Where the load goes | What you pay | Seam |
|---|---|---|---|
| 1 | **In your arms** | full mass on your body, *bad* coupling (a surcharge), hands gone | held slot + placement penalty |
| 2 | **Worn pack** | full mass on your body, *good* coupling (the honest floor), hands free | worn slot + placement factor |
| 3 | **Dragged cart** | mass leaves your body onto the wheels; you stop paying encumbrance and start paying **propulsion** (drag × terrain) + a path constraint | conveyance handoff |
| 4 | **Pack animal / porter** | mass onto *another bearer* with its own gauge | containment onto another Creature |
| 5 | **Bag of holding** | mass *gone* (dimensional); pay the item's cost | container transmission ≈ 0 |

### Two gauges, one coupling

The backpack is the object where two gauges that look like one pull
apart:

- **The container's gauge** — *can it hold this?* Volume/mass the bag
  can physically swallow. (Container capacity — lives in the
  [collision-slate](../deferred-rpg/collision-slate.md) decomposition,
  **not here.**) The backpack sees the honest 20 kg.
- **The bearer's gauge** — *how much does bearing it cost me?* This is
  encumbrance. The bearer sees a *burden*, not a mass.

The link is the **coupling**, and it factors into two distinct knobs:

1. **Container transmission** — does a container's contents' weight
   reach the outside at all? Mundane sack = `1.0` (full weight passes
   through). Bag of holding = `~0.0` (weight is dimensionally
   elsewhere). A property of the *container*.
2. **Placement coupling** — how a borne thing attaches to the bearer's
   body. Worn-on-frame-with-hip-belt = efficient; loose-in-arms =
   inefficient (moment arm, weak load path) **and** occupies hands. A
   property of the *attachment / slot*.

So the aggregation is a **weighted tree-walk**, not a flat sum:

```
borneBurden = Σ over top-level borne items [
  itemMass
    × Π(container transmission for each container on the path)
    × placementCoupling(slot the top-level item attaches through)
]
```

A bag-of-holding node multiplies its whole subtree by ~0; a worn pack
passes its subtree through at the good-coupling floor; a loose item
pays the held-slot penalty. One recursion does all of it.

### The honest-physics stance

A mundane backpack **can't make kilograms disappear** — your legs and
spine still bear all 20. What it does is let you bear the true weight
*the good way* instead of the dumb way. So:

- The honest **floor is `1.0` = true mass, achieved by bearing it well**
  (a good worn pack).
- **Carrying loose is the surcharge** (`> 1.0`) — bad coupling + hands
  gone.
- Only **magic goes below the floor** (transmission → 0).

This reframes "20 kg isn't 20 kg in a backpack": *in* the pack, 20 really
is 20; it's *out* of the pack, in your arms, that 20 costs like 28.
Mundane gear **manages** weight; only magic **erases** it. (Whether a
top-tier mundane pack may dip a *little* below the floor — gear-quality
relief before magic takes over — is a deferred dial, see open questions.)

### Hands-free is not special-cased

Loose-carry claims **hand slots**; a worn pack claims a **back slot**.
You physically can't wield a sword while hauling a chest in your arms,
and the pack just doesn't take your hands. The
[embodiment/slot](../../subsystems/embodiment.md) substrate already
models this — encumbrance reads it, doesn't reinvent it.

---

## The capacity side: derived physiology, drifting on the margins

### Capacity is not a stat

There is **no general strength stat**, and none is coming. The vitals
build deliberately omitted scalar STR/CON. Carry capacity is
**derived, encumbrance-specific**, from physical properties of the body
and its augmentations:

```
carryCapacity = f(physiologyBaseline, augments) × Π(marginConditions)
```

This is distinct from — and does **not** wait on — the deferred
[capability-magic](../deferred-rpg/capability-magic-slate.md) stat
system. It reads physiology directly for one purpose.

The consequence is that **capacity barely moves over a character's
lifespan.** You don't grind it up. Which is the whole reason the *fun*
has to come from the interaction library, not from growing the number.

### The terms

- **Physiological baseline** — derived from body mass, body plan,
  tissue. A draft-creature carries more than a sprite. Roughly fixed.
  (Whether the baseline is *authored on the species* or *summed from
  BodyPlan tissue composition* is a fidelity dial — open question.)
- **Augmentations** — `AugmentMixin.confers()` confers a capacity term.
  An exo-frame / power-loader (scifi) or a belt of giant strength
  (fantasy): **same seam, two fictions** (liberal diegesis). This is
  the main permanent-feeling capacity lever — gear, not grind.
- **Margin conditions** — temporary, *read existing state*: exhaustion
  (endurance reserve low), hypoxia (`spo2` low), injury
  (`getConditionBand`), high gravity. Each shaves the capacity term.
  This is where capacity "drifts on the margins" — and the input to
  the spiral above.

---

## The cart is the hinge

> **Shipped** as the haulage build → [conveyance.md § Haulage](../../subsystems/conveyance.md#haulage--pulling-a-cart)
> + [encumbrance.md § Haulage](../../subsystems/encumbrance.md#haulage--the-cart-the-draft-term).
> One refinement on the sketch below: the dragged-cart cost is **not** a
> separate "propulsion" gauge — it folds into the encumbrance gauge as one
> `draftFactor`-attenuated `draftLoad` term, so the whole consequence
> ladder reuses. The terrain trade ("dragged load gates your *path*") is
> the `Exit.media` (`wheeled`) gate + a default-true `Exit.wheelPassable`
> bit for the stairs residue.

The cart wears two hats, and they hand off cleanly at the point the
load leaves your body:

- **Placement hat** — answers *where does the weight go?* → onto the
  axle, ~0 to your encumbrance.
- **Conveyance hat** — takes over for everything after: it's a Drivable
  you're engaged with, it has its own containment (cargo), its own
  mobility envelope, and dragging it is a **new cost that isn't
  encumbrance at all** — propulsion (drag force × terrain) plus a path
  constraint.

So the trade is **carried load gates your locomotion *mode*; dragged
load gates your *path*.** You swap a body constraint for a terrain
constraint — can't drag a cart up stairs, through a stile, or over a
no-floor edge. This is where encumbrance touches
[conveyance](../../subsystems/conveyance.md), boundaries, and the
gravity/floor sketch. The backpack never makes this handoff; its weight
stays on you, it just couples well.

---

## What is *not* special: bearers

"Another bearer" (pack mule, hired porter) is **not a new term.** The
bearer is *any Creature*; load routes onto its gauge; whether it's
driven by a player, a brain, or nothing is invisible to encumbrance. A
mule is just a Creature with a small capacity. **There is no
`PorterMixin`.**

The porter who sets the crate down and refuses the last hill is a
**brain** deciding to drop load — pure behavior, **out of scope** here
(rides [npc-behavior](./npc-behavior-slate.md)). The only genuinely-new
sliver is the **handoff** — moving load from your gauge onto another
creature's — and even that splits: the *transfer* is just containment
onto the other bearer (an existing primitive), the *come along* is
following/leading (conveyance or automation). Nothing
encumbrance-specific.

---

## Scope

This is the platform-design line, drawn the same way the rest of the
codebase draws it:

**Settled structure (this build):**

- The derived gauge: `borneBurden` (weighted tree-walk) vs
  `carryCapacity` (physiology × margins).
- The two coupling knobs: container transmission + placement coupling.
- The soft-tax consequence ladder wired to existing seams (endurance
  drain, locomotion-mode suppression, the diegetic lift failure).
- The cart handoff to conveyance.

**Deferred dials (content + playtesters):** every *magnitude* — the
arms surcharge, the pack floor, bag-of-holding transmission, the
spiral's steepness, whether great mundane gear dips below the floor.
These live on content, not in the engine; the engine only needs to know
the dials exist and where they attach.

**Out of scope (this session):** bearer *behavior* (a mule balking, a
porter refusing) — that's automation. Movement-*speed* effects if no
speed representation exists yet (endurance tax is the clean v1; speed
rides later). Container capacity (the bag's own gauge) — that's the
collision-slate decomposition.

---

## Open questions

- **Where does the gauge live?** `borneBurden` / `carryCapacity` /
  `loadRatio` are derived reads on the bearer (a Creature). Methods on
  `Creature`/`Tangible` reading existing substrate, or a thin
  `Encumbered`-style mixin? Lean: derived methods + small fields on the
  attachment/container, **no new mixin** unless state genuinely needs a
  home (default-to-no-new-mixin). Settle at build time.
- **Container transmission vs placement coupling — one field or two?**
  The tree-walk needs both, but they could collapse if no object ever
  varies them independently. (A bag of holding varies transmission; a
  hip-belt frame varies placement. They *do* vary independently —
  probably two fields. Confirm with first content.)
- **Physiology baseline — authored or tissue-derived?** A human "~70 kg
  baseline" authored on the species (simple), or summed from BodyPlan
  tissue composition (higher fidelity — losing a limb literally lowers
  it). Demand-driven answer: author until something reads the tissue
  version. But anatomy is already tissue-real, so this may be where it
  pays off.
- **The spiral's steepness** (tabled). Should overload → exhaustion →
  collapse be a trap a careless player can fall into, or should the
  exhaustion-shaves-capacity term be gentle enough to be flavor?
- **The cart's terrain-trade ownership** (tabled). Does a conveyance
  *declare its needs* ("needs level floor, min-width passage") and the
  boundary answer, or does the boundary declare a max draggable bulk?
  Lean conveyance-declares, boundary-answers.
- **Mundane floor: sacred, or a little gear relief?** (tabled — deferred
  to content/testers per the user.) Honest physics says the floor is
  true mass; game-feel might let a top-tier pack buy a little real
  relief before magic takes over.
- **Worn-distribution fidelity tier.** Placement coupling as a single
  worn-vs-held distinction (cheap) vs. per-slot ergonomics
  (back/hip/shoulder load paths). The fine version is a teaching
  surface but easily a later wave.
- **Does load touch movement speed?** Only if a speed representation
  exists. Endurance tax is the v1; speed is a tail.

---

## Hypothetical acceptance roster (for shape)

```
> get anvil                          # 200 kg, capacity ~80 kg
You strain, but the anvil doesn't budge.      (status = declined,
                                               diegetic, not a slot rule)

> get plate-armor                    # 25 kg, into arms; capacity ~80
You pick up the plate armor.                  (status = ok)
> climb rope                         # over the heavy-load threshold
You're carrying too much to climb.            (status = declined,
                                               locomotion-mode gate)

> put plate-armor in backpack        # worn pack, good coupling
You stow the plate armor in your backpack.    (borne burden drops from
                                               the arms surcharge to the
                                               worn floor; hands free)

> put chest in cart                  # 60 kg chest onto a hand-cart
You load the chest onto the cart.             (your encumbrance ~0 for it;
                                               you now pay drag)
> drag cart up stairs
The cart won't go up the stairs.              (status = declined,
                                               path constraint)

> put gold in bag-of-holding         # transmission ~0
You drop the gold into the bag. It feels      (borne burden barely
  no heavier.                                  changes)
```

---

## Cross-references

- [docs/subsystems/reserve.md](../../subsystems/reserve.md) — the gauge
  shape; the stored-vs-derived `current` distinction is the key
  departure.
- [docs/subsystems/vitals.md](../../subsystems/vitals.md) — condition
  band + vital signs the margin conditions read.
- [docs/subsystems/embodiment.md](../../subsystems/embodiment.md) /
  [slot.md](../../subsystems/slot.md) — worn vs held; hands-free.
- [docs/subsystems/conveyance.md](../../subsystems/conveyance.md) — the
  cart's second hat.
- [docs/subsystems/augmentation.md](../../subsystems/augmentation.md) —
  the capacity-conferring gear seam.
- [docs/slates/builds/vitals-slate.md](./vitals-slate.md) — sibling in
  the Vitals & survival build.
- [docs/slates/deferred-rpg/collision-slate.md](../deferred-rpg/collision-slate.md)
  — container capacity (the other gauge).
- [docs/slates/deferred-rpg/capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md)
  — the stat-system boundary encumbrance deliberately does not cross.
</content>
</invoke>
