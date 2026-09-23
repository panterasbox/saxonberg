# Stewardship slate — land use, the allowance cascade, and the residence ladder

> **Status: PARTIAL** — land use, the frontier smallholding, condition +
> the two-part ascent gate (read over every held unit), and the let rung
> shipped → [holding.md](../../subsystems/holding.md) +
> [smallholding.md](../../subsystems/smallholding.md)
> **Left:** premises + utilities (the lease's money leg) · the allowance
> meter · the cascade + the zoning authority (who decides · the two checks
> · Tiebout) · the ranching/pets land-use ceilings + the leash law · the
> smallholding + farm rungs' ascent gates · the Stewardship Discipline ·
> condition's consequence ladder
> **Size:** a build

> **Stewardship** is the player-facing name for all of it: holding property and
> being answerable for it, the same way you are in life. You can be good at it
> or bad at it.

See also: [property-slate](./property-slate.md) (**the parent** — title, tenure,
the compute-allowance thesis, the residence ladder's forward sketch in §L) ·
[farming](farming-slate.md) · [ranching](./ranching-slate.md) ·
[pets](./pets-slate.md) (the three consumers) ·
[power-utility-slate](./power-utility-slate.md) (utilities as a premises
obligation; independently arrived at the parcel as the billing unit) ·
[guild-slate](./guild-slate.md) (the Landwrights — survey, valuation,
conveyancing, tenancy-stewardship) · substrates:
[parcel.md](../../subsystems/parcel.md) ·
[residence.md](../../subsystems/residence.md) (the dorm — the tutorial rung) ·
[civics.md](../../subsystems/civics.md) (**the zoning authority** — Government
Idea, Locality-declared jurisdiction, seats-as-positions) ·
[address.md](../../subsystems/address.md) (the Locality tier) ·
[advancement.md](../../subsystems/advancement.md) (the Stewardship Discipline) ·
[access.md](../../subsystems/access.md) ·
[chattel.md](../../subsystems/chattel.md).

---

## The doctrine line — zoning governs use, never self-expression

*Homed 2026-09-22 → [settlement-model.md § 4 · Absorbed from stewardship-slate](../../settlement-model.md).*

---

## The three layers

The four-layer sketch this session started from collapsed to three, because land
use and allowance turned out to be one decision (below).

| Layer | Answers | State |
|---|---|---|
| **Parcel** | who holds this extent | **shipped** — title, chain-of-title, transfer, `UseGrant` leases |
| **Land use ⊕ allowance** | what may happen here, and how much of it | **absent — the core of this slate** |
| **Premises** | what holding it obliges you to (utilities, upkeep, tax) | absent; where [power-utility](./power-utility-slate.md) lands |
| **Stewardship** | how well you meet those obligations | absent; rides shipped advancement |

*Land use shipped as a field on `ParcelRecord` read through
`ParcelApi.landUseOf` by longest prefix — no new Api, and not the
`Zone.lookupField` sketch →
[parcel.md § Land use and area](../../subsystems/parcel.md#land-use-and-area-living-world-phase-2)
+ [smallholding.md § Land use](../../subsystems/smallholding.md#land-use--the-closed-six-and-it-refuses).*

---

## Land use ⊕ allowance — one decision, two faces **[DECIDED]**

The instinct to model these separately is wrong. They are the **qualitative**
and **quantitative** halves of a single allocation:

- **Land use** — *what* may happen here (dwelling, cultivation, livestock,
  commerce, industry).
- **Allowance** — *how much of it*, in the only genuinely scarce currency.

Real zoning works exactly this way: a density limit **is** the quantitative half
of a use classification. So a city government's actual act is **one thing** —
*"this district is residential, at this density, with this much liveness."*

### The vocabulary is closed

*Shipped: `lib/parcel/LandUse.ts`, the closed six →
[smallholding.md § Land use — the closed six](../../subsystems/smallholding.md#land-use--the-closed-six-and-it-refuses).*

### What a use declares, and who asks

Each use carries **capability + ceiling**, so every consuming system asks one
question against one table:

| Asker | Question | Answer space |
|---|---|---|
| **farming** | may I cultivate here, at what density? | none · a bed · a field |
| **ranching** | may I keep stock, how many head? | none · a few · a herd |
| **pets** | may I keep companions, how many? | 0 · 1 · several |
| **pets** | may an unattended animal be in public here? | the **leash law** |

Counting what is already present is a **derive-on-read MQL query over the
extent** — no stored counters, consistent with the rest of the family.

### The leash law — a second consequence beyond capacity

Added 2026-07-31 from the pets session. A **`ranging`** species (a cat) roams
its home parcel *plus adjacent public space*, so land use also declares
**whether unattended animals are permitted in public**. A dense residential
district may forbid it; the frontier obviously does not.

This is worth having because it is a *behavioural* consequence rather than
another ceiling: it makes **urban and rural pet-keeping genuinely different**,
and it gives pets' "someone else has been feeding your cat" outcome an actual
**place** to happen. See
[pets-slate § Home range](./pets-slate.md).

### A farm is ONE parcel

*Shipped: a field is a room hung on the holding (`admitPlot`), its area
summed against the parcel's yard →
[soil.md § `plot`](../../subsystems/soil.md#plot-and-the-field-ceilings-first-consumer)
+ [holding.md § The floorplan is the INITIAL mint](../../subsystems/holding.md#the-floorplan-is-the-initial-mint-never-the-closed-set).*

---

## The allowance cascade **[DECIDED 2026-07-31]**

The move that makes land scarcity real instead of asserted.

### Two channels, and they never mix

| Channel | Funds | Source | Why |
|---|---|---|---|
| **Sandbox** | authoring — you build the place | **the Compact, directly**, per player (possibly scaling with standing) | a hostile local government must never be able to squeeze your creative channel |
| **Residence** | living — you adopt the place and arrange it | **its parent parcel**, apportioned by the locality | liveness in a shared city comes out of a shared pool |

**The line between them is authorship, and it maps onto tiers that already
exist.** The sandbox is where you author new primitives (**Tier 2**); the
residence is where you arrange published ones (**Tier 0/1**). Stated as a rule:

> **The Compact funds authorship. The locality funds living.**

### The cascade, and the conservation rule

```
Compact  ──grant──▶  Locality (a bundle)  ──apportion──▶  Parcel
   │                                                        │
   └── direct, per-player ────────────────▶ Sandbox ────────┘
```

**The Compact is the only mint. Localities transfer, never mint.** Same
chokepoint discipline as the central bank in banking — and the tenure decision
already framed compute-allocation as a governed *module* with
`market / quota / commons-pool` as its named options. This design picks
**quota, hierarchically apportioned**, which is also what the anti-grief rule
prescribes: exclusive resources get a lease, **common-pool resources get a
quota**, and allowance is common-pool.

### What it buys

- **Settling somewhere becomes a political choice.** Your residence's liveness
  comes out of a pool your neighbors also draw on, apportioned by a government
  you can lobby, elect, or leave.
- **Neighborhoods can be made genuinely valuable.** A content creator building a
  fine district can award the *only* actually-scarce thing. Value stops being
  decoration.
- **Rent gets a cost basis.** Downtown is expensive because allowance density is
  high and the city funds it from a finite bundle — a price tracking a real
  conserved resource instead of an authored number.
- **Offices become real allocators.** The property slate wanted to "stress-test
  whether Offices are *real allocators* or just founder-default seats."
  **Apportionment is the test, and this passes it.**
- **The commons split becomes legible.** Every unit given to a public park is
  one not given to a residence. The slate called the public/private compute
  split "*the* recurring governance call"; now it is a number players can argue
  about on the forums. Prime polity-paper material.

### Two checks on the power

**1. The floor is kernel, and it binds the executive.** The tenure resolution
already places **guaranteed-compute inside the protected holder bundle** — "real
because it **binds even the executive** by due process." So a locality
apportions freely *above* the floor and **cannot go below it**. A resident is
not starvable mid-tenancy. This is a decided constraint being consumed, not a
new invention, and it is what makes the political game safe to play.

**2. Exit — Tiebout sorting.** Localities compete for residents on allocation
policy: a city that lavishes allowance on civic vanity gets cheap rent and dead
homes. Real political economy, genuinely teachable.

> **Dependency: this needs a second city to be alive.** With one city there is
> no exit and no competition, and the politics is theatre. Civics already
> supports plural governments ("mintable per city"); the *content* is the gap.

### The guardrail — never give it a costume

**Compute is a metaresource: outside the fiction, at the machine level,
subdivided by parcels. No in-fiction name, ever.** A *diegetic seat may
administer an honestly-labeled out-of-fiction meter* — that is fine, and the
property slate independently demands "keep the compute gauge honest, never dress
it as a fantasy resource."

What breaks the rule is **naming**. A city council voting on server capacity is
slightly odd and completely honest; "the ley-lines of Terminus" is the
metaresource rule gone. Utilities (below) are **money** and fully diegetic;
allowance is **meta** and stays undressed. Two scarcities, never conflated.

---

## Who decides what — and no, you don't need a committee

Two layers, and only one of them is governed:

**The vocabulary is engine, closed, shipped as code.** Like `LocomotionMode` or
the Material library. No committee, no process — a Locality cannot mint a land
use.

**The assignment is diegetic, local, and political.** Zoning is *the* archetypal
municipal power, and [civics](../../subsystems/civics.md) shipped the hook: a
Government claims a Locality's address prefix, jurisdiction resolves by
longest prefix, seats are positions. Zoning + apportionment become that
government's first genuinely allocative power.

**Know what you are building on:** Localities allocate **nothing** today — they
appear in the corpus only as addressing ("Localities name and nest land; they do
not allocate it"). The jurisdiction hook shipped; the power is new.

---

## The residence ladder **[SHIPPED 2026-08-31 — the first three rungs]**

> Still proposal: the smallholding and farm/ranch rungs' ASCENT (the ground
> itself is buyable and farmable today — that is the farming build — but no
> gate ties those rungs to the ladder), and every allocation procedure.

| Rung | Tenure | Land use | Supports | Gate to next |
|---|---|---|---|---|
| **Dorm room** | granted lease | residential (institutional) | a houseplant | none — the tutorial |
| **Apartment** | rented | residential (urban) | plants, a small companion | money |
| **Townhome / house** | owned | residential (with yard) | a garden bed, a pet | money **+ condition of the last** |
| **Smallholding** | owned, frontier | agricultural (small) | a field, a few head | money + condition + zoning available |
| **Farm / ranch** | owned, rural | agricultural | the Warren buds; scale | money + condition + stewardship band |

### The design claim

*Shipped and documented — money necessary, condition binding, the read
over every held unit so the obligations are the cap →
[holding.md § The ascent gate](../../subsystems/holding.md#the-ascent-gate).*

---

## Stewardship — two things, not one

They behave differently and should not be fused:

- **Property condition** — derived state on the premises (obligations met vs
  missed), reconciled on read like everything else in the family. **Visible**,
  gates the ladder, degrades on a slope rather than a cliff.
- **Stewardship competence** — a `Discipline` on the character. Buys **precision
  and access** (better reads on what a property needs, wider options) and
  **never a multiplier**, per farming's rule that competence sharpens
  instruments rather than inflating yield.

The two-learner firewall holds: the avatar carries a band, the human makes the
decisions.

**Cheap to add.** Disciplines are pure data — 39 ship today and **none are
agricultural**, so stewardship, farming, and husbandry rows all land together in
the "vanilla discipline pack" already on the launch worklist as a **T1
pure-data** item. (Each needs an ISCED-F field code, per the seed shape.)

*The "no decay-through-neglect exists" premise is superseded: the shell
weathers on the calendar →
[holding.md § Condition](../../subsystems/holding.md#condition--the-weathering-clock).*

---

## Premises — the obligations common to every rung

What a dorm, an apartment, a house, and a farm all share, **scaled by land
use**:

- **Utilities.** [power-utility](./power-utility-slate.md) independently arrived
  at the same billing unit: "**metered per-parcel service** — service to titled
  property; the invoice-the-owners loop." An apartment draws a little power; a
  farm needs water at volume (irrigation); a greenhouse needs fuel for heat. Its
  own guidance is *design once, instantiate per utility*, with water the obvious
  sibling.
  - **Utilities are paid in MONEY** and ride the conserved economy — "rates are
    transfers between players/businesses/the polity, **never a mint**." They are
    fully diegetic. See the guardrail above: do not let the power bill become
    the allowance meter's costume.
- **Upkeep / wear.** The shipped `DurableMixin` wear economy, applied to a
  dwelling's fixtures.
- **Tax.** The parcel tax (property Phase 1) — the money-side sink.
- **Security.** Locks and keys — shipped.

---

## Blockers (verified 2026-07-31; re-verified 2026-08-31)

> **2026-08-31 re-verification.** Two of these four moved, and the way they
> moved is worth recording because it was not by closing them.
>
> - **Dense suburbia** — still structurally impossible, and the residences
>   build **routed around it rather than through it**. A subdivision is one
>   parcel with children (`lot-<n>`), and a lot's rooms are keyed
>   instances rather than grid members — so a lane of houses needs no
>   region parcel and no grid fragmentation. That is enough for Hinkley
>   Hills and enough for Mayfield Row; it is NOT dense suburbia, and a
>   coordinate-region parcel is still the thing that would buy it.
> - **The allowance still has a field and no meter.** Untouched.
>   Capacity — how many lots a subdivision offers, how many units a
>   building lets — turned out to be a *different* question with a
>   different answer (an `AppSettings` operator dial per institution), so
>   the ladder shipped without the allowance meter existing. The cascade
>   above remains a policy over a meter that must still be built.
> - **No allocation procedure exists** — one now does, and it is the
>   simplest possible: a plat book offers lots at an authored price, first
>   come, and a land agent fronts every book at one counter. No auction, no
>   queue, no application. Enough to sell ground; nowhere near a land
>   office.
> - **One city.** Unchanged.

- **Dense suburbia is structurally impossible today.** The property slate names
  it exactly: a suburb of many single-family lots without grid-fragmentation "is
  exactly the **coordinate-region ('region parcel')** case §F deferred — the one
  thing today's parcel=zone model cannot express, **and it is precisely the
  suburbia case the ladder needs.**" The ladder's middle rungs depend on a
  deferred primitive.
- **The allowance has a field and no meter.** `ParcelRecord.allowance` ships
  inert; "Phase 1 → **the entire budget/degradation design**" is explicitly
  un-designed. Until it exists, "prestige = a bigger allowance" means nothing —
  **and so does the whole cascade above.** The cascade is a *policy* over a
  meter that must be built first.
- *No allocation procedure* — superseded: the plat book at an authored
  price, first come, a land agent at one counter (the box above) →
  [holding.md](../../subsystems/holding.md).
- **One city.** The political layer needs a rival locality to be more than
  theatre.

---

## Where to start

Suggested sequence — **re-ordered 2026-08-31 to what actually shipped**:

1–4. ✅ **shipped** — land use, the frontier smallholding, condition + the
   gate (NOT the Discipline), the let rung →
   [smallholding.md](../../subsystems/smallholding.md) +
   [holding.md](../../subsystems/holding.md).
5. **Premises + utilities** — obligations, on the money side. **Now the
   next thing**: a lease with no money leg is the ladder's biggest
   remaining fiction, and the contract substrate is where rent belongs.
6. **The allowance meter** (property Phase 1) — still the prerequisite for…
7. **The cascade + zoning authority** — the political layer, once there is a
   meter to apportion and a second city to compete.

---

## Open questions

- **Does the locality apportion, or does a meta staff?** The design above puts
  apportionment at a **diegetic seat** administering an honestly-labeled meter.
  The property slate's "two staffs never merge" (meta = owners+wizards; diegetic
  = seat-holders) could be read as putting it on the meta side instead. *Lean:
  diegetic seat — it is far more interesting, and honesty is preserved by
  refusing the resource a costume, not by hiding who allocates it.*
- **Does personal (sandbox) allowance scale with standing?** Raised, unresolved.
  Watch the [capital-standing](./cooperative-slate.md) rule — standing is a
  voice, not a claim on resources — before coupling them.
- **Density as a sub-axis or separate uses?** `residential-urban` vs
  `residential-rural` as distinct vocabulary entries, or one `residential` use
  with a density parameter? *Lean: one use, a density parameter — keeps the
  closed set small.*
- **Rezoning an occupied parcel** — what happens to a herd when the district is
  rezoned residential? Grandfathering ("nonconforming use") is the real-world
  answer and probably the right one.
- **Who pays to rezone**, and is it petitionable by the owner or purely the
  government's initiative?
- **Condition's exact consequence ladder** — what a dilapidated house actually
  does beyond gating the next rung.
- **Numeric calibration** — every ceiling, every apportionment default. Deferred
  to a running game, as farming and ranching both did.
