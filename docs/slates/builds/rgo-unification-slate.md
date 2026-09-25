# RGO unification slate — promote at the third consumer, not at the end

> **Status: UNBUILT** — the RGO roster is nearly closed (mining · farming ·
> ranching · fishing · forestry · water shipped; extraction added
> quarrying/salt/coal-peat in MR !291; **apiculture is the last family**), and
> every one of them rolled its own version of the same few shapes.
> **Left:** ⭐ `ProducingMixin` (the tap) promoted out of `trade-ranching`'s
> pack lib into the kernel · a home for the pin walk (`stepOutwardForPin`,
> copied 3×) · the **sweetener vocabulary** decided once across sugar, honey
> and maple · and — **held deliberately** — the derived-field interface, which
> waits for foraging
> **Size:** several waves, landed **between** builds rather than as one build

> **Captured 2026-09-25.** User direction, and it reorders the RGO path:
>
> > *"I'd rather stay ahead of unification when we can. unification is
> > basically tech debt."*
>
> The retired extraction/RGO-census slate had scheduled a **terminal
> unification pass** after every RGO family shipped. That is by construction
> interest payment on debt taken on deliberately, so the sequence changes:
> **promote each shared primitive at the moment its third consumer is real,
> as its own small increment.**

Substrate: [field-substrate-slate](../tails/field-substrate-slate.md) (the
field half) · [ranching.md § The taps](../../subsystems/ranching.md) ·
[apiculture-slate](./apiculture-slate.md) ·
[dairy-slate](./dairy-slate.md) ·
[discovery-slate](./discovery-slate.md) (foraging, the case that completes
the field interface).

---

## The rule, and its limit

The repo already states the promotion trigger, in `CLAUDE.md`: substrate goes
to the kernel **"when its composers have no common pack ancestor"**, and
**"a third pack wanting a mixin without depending on its owner is the signal
to promote it."** Not *count them up later*.

⚠ **The limit is real and is why the pass was originally scheduled late.**
The census argued the **hive is the one genuinely new shape** among the
remaining RGOs, so a field interface unified before seeing it would be
unified around the easy cases. `lint-family.md` says the same from the other
side: *"driving it lower would mean unifying mechanisms that really are
distinct."*

> **The discipline: promote when the third consumer is real and in hand; hold
> when the hardest case is still hypothetical.**

## The promotion queue

### 1. ⭐⭐ The tap — `ProducingMixin` → kernel · READY

`ProducingMixin` lives at `packages/content/trade-ranching/src/lib/Producing.ts`
— a pack lib. A **tap** is a recurring, non-lethal draw on a living thing's
surplus, rate-limited by the organism's condition, with a neglect behaviour.
`ranching.md § The taps` already ships three behaviours:

| | behaviour | neglect |
|---|---|---|
| **milk** | expire | she dries off for that lactation — a slope, not a cliff |
| **eggs** | accrue | they spoil in the nest past what a clutch holds |
| **wool** | continuous | a worse fleece, and a hot sheep |

**Three consumers are now real:** ranching (milk · eggs · wool), forestry
(**maple sap · rubber latex** — in design in the `master` worktree as of
2026-09-25), apiculture (**honey** — a surplus drawn from a living colony).

⭐ **Maple sap is seasonal-continuous, latex is continuous-with-recovery, and
honey is accrue-then-expire — all three fit that table without extending
it**, which is the strongest available evidence that the primitive is real
rather than a compression trick.

⚠ The tapping build is the forcing event, so **this wants doing before it
lands**, not after.

### 2. The pin walk — a home for `stepOutwardForPin` · READY

Copied **three times** already;
[field-substrate-slate](../tails/field-substrate-slate.md) lists *"a home for
the pin walk"* under **Left**. The hive's forage range would be the fourth
copy. Three is past any reasonable threshold.

### 3. ⚠⚠ The sweetener vocabulary · READY, and cheapest right now

Three builds need a sweetener taxonomy and none of them owns it:

- **sugar** — `category: sugar` is consumed by simple-syrup, mojito and
  old-fashioned, and **produced by nothing** (the census's one unresolved
  demand root after salt shipped).
- **honey** — [apiculture-slate](./apiculture-slate.md) settles one half
  negatively: **honey must NOT satisfy `category: sugar`**, or bees alone
  close the sugar root and the sugar chain loses its demand case. It is also
  true that honey syrup and simple syrup are different drinks.
- **maple syrup** — a third, and **confirmed in scope** (user, 2026-09-25:
  *"maple syrup will be in scope when we get to tapping yes"*). So the
  vocabulary has **three** members, not two.

**Three builds each inventing their own category is the duplicate-ground
hazard the slates index warns about.** It is a vocabulary, not a mechanism,
so it costs nothing to settle now and gets expensive the moment two builds
guess differently.

### 4. ⏸ The derived-field interface · HELD

Every shipped field is **seeded** (weather, `Deposit`, `GroundCharacter`).
Foraging's stock is the first **derived** one, and it is the case that
completes the interface — so unifying the seeded fields without it would bake
in the wrong shape.

⭐ Sequencing consequence recorded in the apiculture slate: **whoever ships
first defines the interface.** Bees should ship its nectar availability *as*
the first derived field, **deliberately**, with foraging named as its declared
second consumer — the way the field pattern was validated before (weather,
then `Deposit`, then `GroundCharacter`).

## ⭐ The operational form

**One small promotion increment per primitive, landed between builds.** Not a
big unification build at the end, and **not smuggled inside a feature build
either** — smuggling turns a content build into a kernel refactor with a
content build attached, which is the shape that goes long. Each promotion is
independently landable and proves itself against its existing consumers
immediately.

⭐ The project is already doing this elsewhere: **template inheritance was
pulled up into its own build** because it had come up three times in a week.
Infrastructure landing as its own increment, ahead of the content that needs
it, is the same move.

## The RGO path, as it now stands

1. ✅ **ground** → **extraction** (MR !291: quarry/salt/coal-peat)
2. ⏳ **envelope** (in flight, `design/envelope` — enclosures) → **template
   inheritance** (its own build)
3. **the tap promotion** + **the sweetener vocabulary** (small, between
   builds)
4. **apiculture** (+ sugar) — the last RGO family, and the new shape
5. **foraging** — the first derived field, which completes the field
   interface; keep it adjacent and do not pad the gap with trade builds
6. **hunting**

**The standing rule is unchanged: all RGOs before foraging/hunting.**

## ⚠⚠ The roster is EPOCH-BOUNDED, and that was the oversight

Confirmed 2026-09-25: `docs/roadmap.md` and `docs/vocations.md` contain **zero
mentions** of oil, drilling, petroleum, rubber, plastics, fertilizer, nitrates,
phosphate, guano, sulfur, bauxite or copper. The entire **industrial
extraction epoch is absent from both**, and the `master` worktree walking
tapping → rubber → drilling → oil → plastics is what surfaced it. User:
*"the fact that drilling wasn't even on our roadmap was probably an oversight
even if in the end it ends up being nonblocking."*

### ⚠⚠ Correction (same day): drilling WAS designed — in the mana pack

The claim above is true of `roadmap.md` and `vocations.md` and **false of the
slates**. [mana-economy-design-pack](./mana-economy-design-pack.md) already
contains drilling, as **Axis 2 of a two-axis grid**, and it contains more than
that — see *The grid that already exists* below. So this was **not a design
gap; it was a DISCOVERABILITY failure.** The generalized field interface has
been sitting in the magic pack and the RGO census never looked there.

> ⭐⭐⭐ **The reusable lesson: a subsystem doc is the SHIPPED truth, not the
> whole truth — and `roadmap.md` is the BUILT-and-planned truth, not the
> designed truth. Grep the slates too.** (Same class as the
> `ref-shapes` "template inheritance does not exist" correction, where the
> design existed in `legibility-slate` Part A all along.)

⭐⭐ **Why the census missed it, which matters more than the gap.** The census
that closed the roster worked two ways — demand side was *every recipe's
`inputSlots[].category` minus every category some recipe produces*; supply
side was *materials with consumers and no producer*. **Both halves read the
SHIPPED content.** It found `salt` and `sugar` because medieval recipes ask
for them, and it could never have found petroleum because **no shipped recipe
asks for plastic**.

> **A demand-side census is epoch-bounded by construction. It can find a
> missing producer; it cannot find a missing EPOCH.**

**The fix is a forward pass, and lens 5 is already the instrument:** run the
epoch ladder (prehistory · medieval · industrial · modern · future) against
the roster and write down what each epoch *adds*. That converts the
industrial families from unknown-missing to **known-deferred**, which is the
difference between an oversight and a decision.

### ⭐⭐ The through-line: an industrial RGO exists to LIFT a medieval limit

| family | the limit it lifts | is the limit modelled today? |
|---|---|---|
| nitrates · phosphate · guano | soil nitrogen | ✅ soil.md's four reserves + muck → midden → field |
| oil · gas | draft animals and muscle | ⏳ `design/energy` in flight |
| ice → refrigeration | spoilage | ✅ milk keeps hours; cold-chain-slate |
| rubber · sulfur (vulcanization) | sealing and waterproofing | partly |
| copper · bauxite | conductors | ✅ electricity.md |

⭐ **So the accommodation the medieval builds owe the industrial ones is not a
schema change — it is to model the LIMIT honestly.** Fudge soil nitrogen and
fertilizer becomes a number that makes another number go up; model it
honestly and fertilizer is a revolution a player can derive.

### The three concrete accommodations

1. ⭐ **The field interface must admit a RIVAL field** — extraction by A
   reducing what is available to B *elsewhere*. Mining's `Deposit` is not
   rival across locations (your drift does not drain my seam); **forage is**
   (two beekeepers on one range) and an oil reservoir is (two wells on one
   pool — the **rule of capture**). **Forage is the medieval instance, and oil
   inherits it for free** if bees ships it. This is also why the priority
   order below is right on technical grounds and not only on taste.
2. ⚠ **Recovery must be a parameter that can be NONE.** Fishing recovers by
   half-life, forage recovers seasonally, **a reservoir never recovers.**
   Trivial if anticipated; a rewrite if the interface assumes regeneration.
3. ⚠ **Keep the tap honest — a tap is on a LIVING thing's surplus.** Latex is
   a tap; **oil is not** (it neither lives nor regenerates). If `Producing`
   drifts into meaning "extraction with recovery" it swallows the field and
   stops being a claim about anything. The inverse of the usual naming error:
   do not name substrate so broadly that it asserts nothing.

⭐ And `excludability is physics`
([metal-chain-slate](./metal-chain-slate.md)'s own phrasing) is the axis both
forage and oil sit at the non-excludable end of, with mining at the
excludable end. Already named; no work.

### The priority, settled (user, 2026-09-25)

> **Medieval RGOs before foraging. Late-stage RGOs gated ON foraging** — not
> the other way around.

So the industrial families do **not** gate foraging, and foraging's completion
of the derived-field interface is what the later ones build on. ⚠ *Unless* a
modern RGO's design turns out to really affect how the medieval ones are
built — which is what the accommodation list above exists to keep checking.

⚠ **A roadmap line is owed and deliberately NOT taken here.** `roadmap.md` is
a swept index file (CLAUDE.md § Worktrees rule 5), and the envelope build is
finalizing right now, so adding the industrial-epoch entry from a design
branch would race its sweep. **Sweep item: add the industrial extraction
families to the roadmap as known-deferred.**

## ⭐⭐⭐ The grid that already exists — and it belongs to the whole roster

[mana-economy-design-pack](./mana-economy-design-pack.md) defines an RGO
taxonomy on two independent axes. **Axis 2 is the one the whole roster needs**,
because it is about the economics rather than the fiction:

| access mode | where it is | who can tap it |
|---|---|---|
| **Surface** — it outcrops or seeps | in the open | ⭐ **anyone — this is the foraging case** |
| **Subsurface solid** | in rock | a **miner**; capital + a shaft |
| ⭐ **Subsurface fluid** | under pressure | a **driller**; capital + a well — **and it comes to you** |

> *"The seep → drill arc is the entire history of oil. Surface seeps were known
> for millennia and used at trivial scale; **drilling made the industry.** Free
> to find, tiny; expensive to reach, enormous."*

And the pack states the field equation in its general form, which is the
accommodation this slate derived independently a few hours later:

> *"A node is a stock with an inflow, the same equation
> [discovery-slate](./discovery-slate.md) already uses for forage (inflow =
> regrowth) and ore (inflow = zero). **A renewable node has an inflow; a
> depletable one does not.**"*

It even flags its own duplicate: *"a **node** here is the same kind of thing as
this pack's Part 3 **deposit** — the two docs used two names for one
concept."*

⭐⭐ **Read our roster against Axis 2 and the hole is systematic:**

| access mode | what we have |
|---|---|
| **surface** | forestry · forage (coming) · salt pans · peat · quarrying — covered |
| **subsurface solid** | mining · coal · quarrying — covered |
| ⭐ **subsurface fluid** | **nothing. We have never drilled anything.** |

> **The missing thing is an ACCESS MODE, not a resource** — and it is the one
> mode with the rule-of-capture commons problem, because fluids move between
> wells. Which is why oil, gas and a mana spring are all one build shape.

⭐ **Promotion item (documentation, not code):** the access-mode grid should be
readable from the roster, not only from the magic pack. The pack is unbuilt, so
this is a slate move — a pointer both ways, added 2026-09-25.

## ⭐⭐ The forward pass — classified by what it MANDATES at platform level

User direction, 2026-09-25, and it is the sequencing rule:

> *"it's not about how many crops or products we make, its about which ones
> force platform level support"*

> *"unless a plantation is a fundamentally different thing than a farm, we
> could easily ship all those crops together"*

**The whole remaining resource space contains THREE platform mandates, and one
is already in flight.**

| family | what it forces at platform level | verdict |
|---|---|---|
| **subsurface fluid** — oil · gas · mana springs | a **rival field** (rule of capture: extraction *elsewhere* drains yours), continuous delivery from a fixed point, pressure decline | ⭐ **primitive — in flight** |
| **rubber / elastomers** | a material property axis **that does not exist**, plus **containment under pressure** | ⭐⭐ **primitive** |
| **plastics / synthetic polymers** | **derived** material properties — computed from a process rather than authored | ⭐⭐⭐ **primitive, the biggest** |
| **plantation crops** — coffee · tea · cocoa · tobacco · cotton · spices · sugar | **nothing** | ⚠ **a PLACE, not a primitive** |
| **underwater** | spatial work only (bands as zones, depth as a zone field, derived up/down, `noDefaultFloor`) — **no new processes** | **spatial, not economic** |
| tungsten · chromium · aluminium · non-ferrous ores · gold · gems · cement · potash · saltpetre · furs | nothing — a better tool rung is the shipped instrument ladder (two rungs per verb as rows), a better edge or armor is the `materials-response` grid, and cement is `burn-lime` + clay | **ROWS — batch anytime** |
| spectrum · compute | an allocation with **no place** — closer to banking's quota/license than to a field | rows + a registry; defer |
| **magic reagents from creatures** | the consent / accountability ledger applied **to the resource itself** | small primitive, and a real ethics vertical |
| **magic tailings / residue** | a negative externality on a field — the exact mirror of bees | small; conservation already demands the waste go somewhere |

### ⭐⭐ Why rubber is the one that unlocked a realm

`Material` carries exactly: density · specific heat · thermal conductivity ·
electrical conductivity · water absorption · hardness · toughness. **There is
no elasticity and no impermeability-under-deformation** — which is rubber's
entire distinguishing property, with nowhere to live.

And ⚠ **containment under pressure is essentially unmodelled**: `bulk.md` and
`thermal.md` mention pressure **zero times**, and `SealableMixin` is a binary
open/closed latch for doors and windows. A gasket only matters where
containment can *fail*.

⭐ Hence the realm: rubber is the missing property for **four shipped
subsystems at once** — insulation (electricity), seals (watershed's conduits),
tyres (conveyance), waterproofing (textiles). It is not a product; it is a
property those systems have been doing without. Recorded in
[materials-response-slate](../tails/materials-response-slate.md).

⚠⚠ **Sequencing warning for the `master` session: their path puts rubber
BEFORE drilling.** Rubber looks like a content step and is not — it is a change
to the kernel `Material` shape, so they hit a kernel mandate earlier than the
ordering suggests.

### Why plastics is the deep one

Every material in the game is a row of **authored constants**. Polymer
engineering means synthesizing **to spec** — you choose the properties. So
honest plastics wants material properties **derived from the process**, which
is a different relationship between content and mechanism than anything
shipped: not *"add a material"* but *"a material can be a RESULT."* Last in the
master session's path, so there is runway — but it wants thinking about before
it arrives.

### Plantations: the mechanism ships, the WORLD does not

Checked every way a plantation might differ from a farm, and it does not:

- **perennial bearing** — ships (the polycarp cycle bears repeatedly);
- **climate gating** — ships: `LimitingFactor` includes **warmth**, with a
  Kelvin threshold *and* a growing-degree-day sum, so a coffee bush declares a
  higher threshold and a cold place limits it automatically;
- **on-site processing within hours** (cane inverts, coffee cherries must be
  pulped, tea must be withered) — ships: the same *the works co-locates with
  the field* fact as milk;
- **the long haul** — [logistics-slate](./logistics-slate.md), already designed.

⚠⚠ **But there are only ~8 biome rows and every one is temperate or indoor**
(baseline · indoor · outdoor · meadow · woodland · underground ·
upper-workings · cafeteria · universe). **No tropical, warm, arid or coastal
biome exists.** So the colonial crop family's prerequisite is **a warm place on
the map** — a world-building decision, not a platform one, which means all
those crops can ship together whenever there is somewhere for them to grow.
Recorded in [farming-slate](./farming-slate.md).

### The census gaps behind the table

**Present with sources** (richer than assumed — extraction did a lot): copper ·
tin · bronze · lead · sand · glass · leather · tannin · alum · sulfur · madder
(`rubia`) · woad (`isatis`).

**Missing entirely:** zinc · silver · **gold** · mercury · potash · saltpetre ·
soap · gems · tobacco · cotton · hemp · indigo · cochineal · pepper · cinnamon.
And `coffee` + `tea` **materials ship with no plant and no producer** — exactly
like `sugar`.

Three worth naming:

- ⚠ **Gold.** `banking.md` says *"mined gold is sold for circulated coin like
  any good"* — it names a good with **no material row and no producer**. Not a
  conservation hole (the currency is deliberately not gold-backed, which that
  doc is emphatic about), but the doc references something that does not exist.
- ⭐ **Saltpetre** was **farmed from dung heaps** (nitre beds), so it couples
  straight to ranching's muck → midden → field return leg: a medieval RGO
  manufactured from manure.
- ⭐ **Potash** is wood ash — a **forestry byproduct** that is simultaneously
  glass flux, soap lye and fertilizer. One byproduct, three industries, and
  soap does not exist.

### ⭐ Borrowed structure worth keeping (Stellaris)

Not the noun list — the **role**: a *strategic resource* is a small-volume
input that gates **what you can make** rather than **how much**. We have no
instance of that economic role, and **tungsten is the historical version of
exactly it**, which makes it the cheapest way to introduce the shape before any
future content needs it.

## ⚠ Cross-session coordination (2026-09-25)

The `master` worktree session is designing **tapping — maple syrup and
rubber**. Two overlaps, both named above and both worth carrying to them
directly:

1. **The tap primitive** is shared, and their build is what makes the
   `ProducingMixin` promotion unavoidable. If their build lands first it
   forces the promotion early.
2. **The sweetener vocabulary** — maple is the third sweetener.

## Open questions

1. Does the tap promotion carry the three **neglect behaviours** as a closed
   vocabulary, or does a pack declare its own?
2. Does honey's "surplus you may take, and the colony dies if you take more"
   fit the tap, or is it a fourth behaviour?
3. Who owns the sweetener vocabulary — the commons (`/stuff`), or a
   `sweetener` category on the recipe side only?
4. Does the pin walk's home want to be the same module as the field
   interface, or is it independent substrate that ships earlier?
