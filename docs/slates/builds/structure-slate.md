# Structure slate — a building is a thing, and it is made of something

> **Status: UNBUILT** — nothing here exists. There is no object that is a
> building: `duncan-hall` is a copy-pasted address string in four files with
> no referent, no construction verb exists (`build`/`construct`/`erect` are
> all absent; `raise` is mining's), **nothing in the repo consumes a building
> material**, `ParcelRecord` carries no value field, and the shell
> (condition + weathering + `UPKEEP_TERMS` + `survey`/`maintain`) is scoped
> to residence holdings and describes condition, never composition.
> **Left:** ⭐ the structure tier (membership-primary, thresholds derived) ·
> fabric · the shell promoted out of `/system/residence` into the kernel ·
> maintenance as the first materials sink · then **Phase 2** construction as
> a commissioned project · then **Phase 3** demolition / ruins / salvage
> **Size:** **a build** (Phase 1), with two more behind it
> **Wants first:** [legibility-slate](legibility-slate.md) **Part A**
> (`extends:`) — see § Dependencies

**Written 2026-09-24**, in conversation during the extraction MR's review,
from the question *"we have indoor locations and we have zones but nothing
organizes all of that content into the idea of a building."*

**Sits on:** [holding.md](../../subsystems/holding.md) (the shell, the two
clocks, `UPKEEP_TERMS`, archetype satisfaction) ·
[furnishing.md](../../subsystems/furnishing.md) ·
[parcel.md](../../subsystems/parcel.md) ·
[ground.md](../../subsystems/ground.md) ·
[logistics.md](../../subsystems/logistics.md) (⭐ the lane — the induced
edge set, and the precedent this slate argues *against* copying) ·
[fire.md](../../subsystems/fire.md) · [address.md](../../subsystems/address.md)

**Feeds, does not duplicate:** [property-slate](property-slate.md) Phase 3
owns **valuation + resale** — fabric gives it a cost basis ·
[development-slate](../tails/development-slate.md) owns FAR, density and
*entitlement vs built* · [zoning-slate](zoning-slate.md) owns who regulates
the ratios · [insurance-slate](insurance-slate.md) is **designed and needs a
cost basis to exist at all** · [delivery-slate](delivery-slate.md) § *Anchors*
owns delivery, and needs **no** structure tier.

---

## Principle

> **A structure is a physical fact. An address is a service identity. A
> parcel is a title. A zone is a coordinate frame. Four independent axes,
> and a building is the one that was missing.**

A barn stands whether or not anyone delivers to it, holds title to it, or
authored a zone around it. That is why every attempt to derive a building
from one of the other three fails, and the failures are instructive:

| derive it from | why it breaks |
|---|---|
| the **zone** | *"nothing in the game says a zone boundary respects a building boundary — a single zone can be an exterior path that exits past a threshold into an interior space, all on one grid, and only grid structure is enforced."* |
| the **parcel extent** | a lot carries **several** structures — a house, a barn and a workshop. It is 1:N, not 1:1. The dorm/apartment case only works *because* those all belong to one structure |
| the **address node** | an **off-grid** structure has no node to key on, and making the wilderness case unrepresentable is the opposite of what off-grid is for |

⭐ All three are **envelopes**. Which is the same error class logistics
already caught and fixed: *"a corridor is asked over its LANE, not its
zone… that is the unit that was reachable, not the unit that was right."*

---

## ⭐⭐ Decided: membership is primary, thresholds are DERIVED

Two shapes were argued. The **induced** one copies the lane — `seeds:` plus
an authored threshold bit on the edge, and the structure *is* the subgraph
reachable without crossing one. The **membership** one has each interior
Location name its structure, and derives the edges.

**Membership wins, on the lane doc's own evidence:**

> ⚠ *"Every road exit must declare `media: [ground]` explicitly… a corridor
> authored the ordinary way has a `wheeled` lane that compiles **completely
> empty**, with nothing anywhere saying why. **This is the single likeliest
> thing for a corridor author to get wrong.**"*

So induction's authored bit is, by its own documentation, the likeliest
authoring error *and it fails silently*. For a lane that means an empty
lane. For a structure it is worse than empty — it is **expansive**: miss one
threshold bit and the bank swallows the street, and everything downstream
keeps working while reporting nonsense.

Membership's failure is the opposite shape: a room names no structure, so
that room is in **no** structure. Local, bounded, and **lintable**.

And the derivation is free and exact:

```
isThreshold(exit) = structureOf(nearSide) !== structureOf(farSide)
```

⭐ No authored bit at all. The induced shape had **two** chances to be wrong
(the bit *and* the walk); this has one, and it is the checkable one. It also
hands you the front door for free, which is exactly where a delivery
**anchor** wants to sit. On both axes that were raised — complexity and
performance — membership is an O(1) field read against a cached graph walk
with the lazy-load seeding problem the lane doc documents.

### The resolve chain — four steps, mirroring `resolveLocalityFor`

1. the Location's **explicit** `_structure` (the override, and what the lint counts)
2. ⭐ the **parent row's** value, through `extends:` — see § Dependencies
3. the **zone** field (`lookupField('structure')`) — available, and one of the
   two near-precedents `ref-shapes.md` names for inheritance
4. **none** — a normal value, not an error. An unstructured Location is a
   field, a road, a cave

### ⚠ The gate that makes step 3 safe — the sky-exposed census

Step 3 reintroduces the threshold blindness by the back door: a mixed zone
would silently make the street part of the bank. So:

**Census every Location that resolves to a structure; flag the sky-exposed
ones.** A sky-exposed member is either a courtyard or an atrium
(legitimate — declare it) or a zone leak (a bug). ⭐ `biome.md` ships
`cafeteria-atrium.yaml` as a `SkyExposedBiome`, an interior that sees the
sky, which is exactly why this is a **declaration rather than a ban** — and
why sky exposure is the wrong *predicate* for membership and the right
*check* on it.

Census-then-ratchet, per [lint-family.md](../../lint-family.md): count
today's interior Locations resolving to nothing, gate that count as the
ceiling, drive it down.

### ⚠ Warren-generated rooms need the explicit stamp

Thirty dorm units cloned from one `dormroom.yaml` share that templatePath,
so nothing path-shaped can distinguish two buildings that share a room
template. But `HoldingWarren.wakeRoom` already stamps each room's address
(`room.setAddress(base + '/' + leaf)`) — the structure stamp goes on the
line beside it. Authored rooms inherit; generated rooms are stamped by the
generator that already knows.

---

## Fabric — what it is made of

The half no shipped object can express. `ParcelRecord` has `extent`,
`holder`, `landUse`, `areaM2`, `storeys`, `allowance`, `keyway`, `grants`
and **no value**; the shell has a condition band and no composition.

⭐ **And this is the economic point, not an accounting one.** Extraction just
shipped stone, clay→pot, lime, salt and peat; the metal chain ships iron;
forestry ships timber and boles. Almost nothing consumes any of it at
volume, so the quarry is supply with no demand — and
[vocations.md](../../vocations.md)'s own rule is that *a vocation exists iff
there is unmet demand*. **A building is the largest sink in the game, and it
is lumpy**: one project consumes hundreds of units at once. Trickle demand
makes a shop; lumpy demand makes a market, with lead times, stockpiles and
somebody who buys stone before they need it.

Corroboration that the cut is right: `vocations.md` lists **carpenter ·
joiner** as a GAP (framed as furniture and rigs, off `forestry → sawing →
carpentry`) and **monument mason** as a GAP (the necropolis). **The builder
proper is absent from the register entirely** — which is correct under the
demand test, and means construction is what creates the demand that
justifies the trade.

### ⭐ Open fork — one fabric, or an assembly?

The over-simulation risk, and *expression is inelastic*. The lean is **one
fabric plus a roof**, because fire and repair need exactly two distinctions
and a wall-by-wall assembly is the placement puzzle wearing a different hat.
A third (foundation) buys the stone-versus-timber cost story and nothing
else. **Not decided.**

---

## ⭐⭐ The cut: maintenance before construction

> **Demand before the ceremony.**

If construction ships first you get a way to make buildings and no reason to
make one; the materials sink arrives as a one-off, per building, for whoever
bothers. Lens 6 asks *was the demand there first*.

Invert it. **Generalize the shell first and every authored building in the
realm starts weathering.** `survey` and `maintain` already ship. That is
~20 buildings creating *continuous, recurring* demand for lime, timber,
thatch and stone, forever, with **no new verb**. Repair is construction's
sentence with a smaller number — *this structure consumes these materials* —
validated on content that already exists.

Three things fall out:

- ⭐ **It gives the structure tier its first consumer**, which a kernel
  substrate must name or it is the reference-Idea trap for the fourth time.
  The structure exists because the shell reads it; the fabric exists because
  repair consumes it.
- **Recurring beats lumpy for making a market.** A trickle that never stops
  supports a stockist; a one-off every few months does not.
- It is an honest, recurring **money sink**.

### The shell promotes to the kernel — and the precedent is one commit old

Its composers under generalization are a barn (farming), a counting house
(banking), a kiln house (quarrying) — **no common pack ancestor**, which is
`CLAUDE.md`'s documented test for promoting substrate to the kernel.

⭐ Extraction **W2 just did this exact move**: `ImprovableMixin` left farming
for `lib/ground/Improvable.ts`, including the pattern for what the kernel
cannot know — three host hooks (`improvementBill` / `improvementPace` /
`improvementSpoils`), with the bill returning **`null`** so a host that
composes the mixin and answers nothing is *visibly* broken rather than
silently free. The shell promotion is the same shape: the kernel holds the
clock and the bands; the host answers `fabricOf()` and its repair bill.

⚠ **Open:** kernel, or does `/system/residence` widen into
`/system/structure`? Host placement, and the wrong answer is a rewrite.

---

## Phases

**Phase 1 — a building is a thing, and it wears out.** The tier, fabric, the
shell promotion, maintenance demand, the census lint. Lands entirely on
existing content; no new verb.

**Phase 2 — construction.** ⭐ **Commissioned, not placed.** Rimworld places
walls; tile-laying in a room-graph MUD is a placement puzzle pretending to be
construction. `contract.md` already ships clauses over verifiable conditions,
escrow, a board and the custodian rule; `ManualBuildStep` + `SchedulerApi`
ship durative work; `employment.md` ships rosters and shifts. So a building
is a **project** with a bill of materials and a bill of labour — a
multi-person economic event, and the labour market's first big-ticket job.
Lenses 1 and 2 both pick it: pedagogy gets a bill of quantities and a
critical path, and an author writes a row rather than a wall layout.

**Phase 3 — demolition, ruins, salvage.** A shell past `dilapidated` is a
**materials source** — the only RGO that exists because somebody else failed.
[guilds](guild-slate.md)'s *ship ruins, not institutions* already wants it.

### Non-goals for Phase 1 — this is where these go wrong

No construction act · no valuation (property-slate's) · no FAR or density
(development-slate's) · no decor ([decor-slate](decor-slate.md)) · no new
trade (the builder cannot be justified until Phase 2) · no demolition.

---

## Dependencies

⭐ **Wants [legibility-slate](legibility-slate.md) Part A (`extends:`) first.**
Membership-primary means every interior Location names its structure, and
`extends:` is what makes that one line per room instead of a field per room —
a `bankRoom` parent row carrying `structure:` once. Two mechanisms were
considered and dropped:

- **template-path extents** (a record claiming a path prefix, the
  `ParcelRecord` / `Conduit` shape) — dropped because legibility Part A
  decided against path-ancestry on structural grounds (the folder/leaf
  invariant) and because *"`Biome` deliberately moved off path-walking so the
  inheritance graph stays independent of what the path tree means."* A file
  reorg must not move membership.
- **template inheritance faked locally** — `ref-shapes.md` forbids it by
  name.

⚠ **Not a hard blocker.** The explicit `_structure` field is rung 1 of the
resolve chain and stays legitimate forever. But **there are no migrations**,
so shipping structures first means authoring ~100 rooms the expensive way and
living with it.

---

## Opens

1. ⭐ Fabric: one + a roof, or three? (§ Fabric)
2. ⚠ Shell to the kernel, or `/system/residence` widens? (§ The shell promotes)
3. Does a structure carry its own name, or take the parcel's / the archetype's?
   — the one place this touches identity rather than geometry.
4. Does `storeys` / `allowance` (inert on `ParcelRecord` today) get spent by a
   structure, or does that stay development-slate's? Probably theirs, but the
   first thing that ever *occupies* an allowance is a building.
