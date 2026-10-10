# RGO unification slate — promote at the third consumer, not at the end

> **Status: UNBUILT** — the RGO roster is closed in **SHAPE** (mining ·
> farming · ranching · fishing · forestry · water shipped; extraction added
> quarrying/salt/coal-peat in MR !291; apiculture shipped), and every one of
> them rolled its own version of the same few shapes.
> ⚠ **Drilling is the last FAMILY** (seeded-field), and the roster stays
> open in **CONTENT** — ice, whaling and guano are rows on shipped shapes.
> ⭐⭐⭐ **And foraging is not a family at all — it is a MODE over the whole
> roster, the prehistoric rung every trade is missing** (user, 2026-10-08;
> § below, which also reconciles the 09-25 priority with it).
> **Left:** ⭐ `ProducingMixin` (the tap) promoted out of `trade-ranching`'s
> pack lib into the kernel · a home for the pin walk (`stepOutwardForPin`,
> copied 3×) · the **sweetener vocabulary** decided once across sugar, honey
> and maple · and — **held deliberately** — the derived-field interface, which
> waits for foraging to be **DESIGNED** (not built — § below)
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

### ⭐⭐ Update 2026-09-25 — `design/tapping` merged, and it took this item

Two corrections from reading what landed:

1. ⭐⭐ **The tap VOCABULARY is already kernel.** `TapSpec` ships at
   `platform/idea/species/Species.ts:332`, with `protected production:
   TapSpec[]` plus `getProduction()` / `setProduction()` on `Species`. So the
   data half was never pack-side: **a tap is a `production:` block on a species
   row.** What remains pack-side is **`ProducingMixin`** (the host face), and
   the promotion is smaller than this slate first framed it.
2. **[tapping-slate](./tapping-slate.md) owns the move**, listing
   *"`ProducingMixin`'s promotion out of `trade-ranching`"* under its own Left.
   So this slate tracks it rather than claiming it — and its own status line is
   the best summary of why it is a promotion at all: *"every piece it needs
   ships, in three separate places that do not know about each other."*

⭐ **And the rival field has a second claimant, independently.**
[drilling-slate](./drilling-slate.md) reached the same place from the industrial
end — it names *"rule of capture vs correlative rights"* as *"a genuine legal
doctrine"*, and worries about the player who *"drains a field and asks why
nothing stopped them."* So forage and the reservoir are now **two slates
describing one primitive**, which is exactly the third-consumer signal — and it
strengthens the recommendation below: **whoever ships first should ship it as
the shared one.**

⚠ Drilling is deliberately scheduled **after** destructive distillation and
behind inquiry's epoch on-ramp, and foraging is nearer. So on current ordering
**forage defines the rival field**, which is the outcome this slate wanted.

### 2. The pin walk — ⚠⚠ NOT ready, and the earlier claim here was wrong

⚠ **Correction, 2026-09-25 (grounding for the apiculture plan).** This slate
said `stepOutwardForPin` was *"copied three times"* and therefore past the
promotion threshold. **It has exactly ONE copy** — module-private at
`platform/idea/api/WeatherLogic.ts`, four lines, walking containment via
`Containable.getContainer()`, depth-capped at 32, first hit wins.

What is genuinely true is subtler and more interesting: the **pattern** appears
three times with **three different depth caps and three different termination
rules** — the weather pin walk (cap 32), `Growing.sampleLux` (cap 8) and
`Growing.resolveWarmth` (cap 8), with the biome chain resolver as a fourth
relative. So this is **not one helper copied**; it is three walks that
superficially rhyme, and whether their differences are meaningful is an open
design question rather than a mechanical promotion.

> **By this slate's own rule that makes it a ONE-consumer item, so it should
> not be promoted yet.** A forage range would be a second walk, and the right
> first step is to decide whether the caps and termination rules *should* be the
> same — not to hoist four lines.

[field-substrate-slate](../tails/field-substrate-slate.md) still lists *"a home
for the pin walk"* under Left, correctly; what changes is that it is a design
question, not a ready promotion.

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

> ⚠ **Superseded in part, 2026-10-08** — steps 5 and 6 are **one build**,
> and foraging is a MODE over the roster rather than family #11. Drilling
> is a **seeded**-field RGO, so it is not gated on foraging. See
> § *Foraging is a MODE, not a family* and § *The 09-25 priority vs. the
> 10-08 direction* at the end of this slate.
>
> ⚠⚠ **And drilling is NOT "the last family"**, which is what this note
> said when it was written. The roster correction immediately below —
> from the ice/whaling session, same week — adds three more. ⭐ Two
> sessions each closing the roster on their own last family, a week
> apart, is the closure claim failing for the fourth and fifth time;
> read the correction, not this note, for what is left.

### ⚠⚠ Roster correction 2026-10-08 — the closure claim has failed twice

This slate says the roster is *"nearly closed… **apiculture is the last
family**."* The ice/whaling design session then added **ice** and
**whaling** as "the last two," and a water-trade audit raised
**submersion**. ⭐ **Three additions to a set declared closed.**

⭐⭐⭐ **And there is a structural reason: the census enumerated PRODUCTS
and PLACES** — mining, farming, ranching, fishing, forestry, water,
quarrying, apiculture. **Submersion is neither; it is a MEDIUM OF
ACCESS**, so it was invisible to the enumeration. ⚠ **The census should be
re-run on that axis**, because if one family hid there another may.

⛔ **Submersion is NOT a family.** It is a row on **axis 2** (*access
mode · where it is · who can tap it*) — the axis this slate already calls
*"the one the whole roster needs."* The trades behind it (gathering,
underwater mining, salvage, construction, cable-laying) are ordinary
families **paying a medium tax**. See
[underwater-slate](./underwater-slate.md) § 8.

**The path, as it now stands:**

> … apiculture → **the bed · ice · whaling** → foraging → hunting

⭐ **And within that tranche, the bed first**, for three reasons that are
not about interest: it proves the **share/lay** mechanism before whaling
needs it · it contains a cheap **depletion** case (coral) before whaling's
expensive one · and its reservoir is a **shipped pattern with a new
feedstock** (forestry's `StandMixin` cover on ground), so it is the least
new code of the three. Ice stays blocked on
[climate-slate](./climate-slate.md) regardless.

### ⚠⚠ And item 4 (the derived-field interface) now waits on a SECOND unseen shape

This slate holds the field interface deliberately, because the hive was
*"the one genuinely new shape"* and unifying before seeing it would unify
around the easy cases.

⭐⭐ **The bed is a second unseen shape, and unseen in the way that
matters: a cover on ground whose RECHARGE RATE IS A FUNCTION OF THE
HARVEST ACT.** Nothing in the roster has that — mining's recharge is
zero, fishing's recovers by half-life regardless, forestry's coppice is on
a fixed rotation. So the held interface waits on the bed too, or it gets
unified around the easy cases exactly as feared. **This is the
accommodation check this slate asked to keep running, firing.**

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

### ⭐⭐⭐ Irrigation — the worked epoch ladder, and groundwater is a DIFFERENT RGO CLASS

Added 2026-10-09 from the water-trade audit. **The best epoch story in
the roster**, and it belongs here rather than in a trade slate because of
the last row.

The capability is *get water to a field that does not get enough rain.*
It survives every epoch. ⭐⭐⭐ **What changes is not the technology — it
is the institution the technology requires.**

| rung | what moves the water | command area set by | institution required | the reservoir |
|---|---|---|---|---|
| **flood recession** | nothing — **the planting moves** | the flood's reach | a **calendar** | the river, **visible** |
| **gravity ditch** | the contour | **topography** | a **labour commons** (the annual clean-out) | the river, **visible** |
| **pump (surface)** | energy | **money** | optional | the river, **visible** |
| **pump (ground)** | energy | money | **none** | ⚠⚠ **an aquifer — invisible, recharge ≈ 0** |
| **drip / pivot** | energy + control | money | none | both, metered |

- ⭐ **Rung zero is not a device, it is a calendar.** Plant in the mud
  behind the receding flood — the Nile for three thousand years, no works
  at all. **And it is buildable today**: the freshet is computable, so
  planting behind it is a derivable strategy with no new mechanism.
- ⭐ **Gravity means geography decides.** You can only water what lies
  below the intake, so contour lines draw the irrigated region.
  `Zone.elevation` doing real work.
- ⭐⭐⭐ **The pump breaks the tyranny of contour — and dissolves the
  commons.** Command area stops being set by topography and starts being
  set by money; and because a pump serves ONE farm, **you no longer need
  your neighbours.** *The gravity ditch forced cooperation; the pump lets
  you defect* — and **the institution was the thing keeping the water
  allocated.** (Historically exact: acequia systems ran four centuries;
  the centrifugal pump ended cooperative water management in one
  generation.)
- ⭐⭐⭐ **And the fourth rung changes the RGO CLASS, which is why this
  is a roster entry.** Surface water is a **renewable commons with a
  recharge rate**; groundwater is a **depletion resource that looks
  renewable because it is invisible.** Same trade, same verbs, same
  `Conduit` — **a different reservoir law.**
- ⚠⚠ **And you cannot SEE a falling water table.** Surface scarcity is
  public — the river is low and the gauge says so. Groundwater scarcity is
  invisible until the well fails. **The industrial rung removes the public
  instrument that made the commons manageable**: the staff gauge made the
  water argument factual for everybody, and **a well has no gauge.**
- ⭐⭐ At the **modern** rung, efficiency becomes maximally destructive:
  drip is ~95% efficient, so there is **almost no return flow**, and every
  downstream user living on his neighbour's waste is destroyed by his
  neighbour's environmental improvement. **The most efficient irrigation
  is the most legally destructive**, and it arrives dressed as
  conservation. (See
  [navigable-water-slate](./navigable-water-slate.md) § 5c.)

✅ **The lens-5 test passes cleanly**: at every rung the verb is the
same — divert, deliver, water — and `Conduit` already covers
gravity-versus-pumped as **one object** (*"which one you have is the sign
of `headM`"*). Nothing is rewritten; it is re-parameterised.

⭐⭐⭐ **But *who is holding the obsolete half* has a NEW KIND of
answer:** the four recorded instances (the ferryman, the whaler, the
iceman, the laundress) are all **people**. Here the thing the pump
obsoletes is **the ditch company** — **cooperation itself, a polity
rather than a trade.** And it is a worse loss: when the ferryman goes you
lose a livelihood; when the ditch company goes **you lose the only body
that was allocating the water**, so the water keeps being allocated right
up until it is not. Promoted to
[design-lenses.md](../../design-lenses.md) § 5.

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

> ⚠⚠ **Scoped, 2026-10-08:** *"late-stage"* over-generalised. The rule
> holds for a late-stage RGO whose stock is **derived**; **drilling's is
> seeded**, which is the dry hole's own honesty argument, so drilling was
> never in this rule's scope. See § *The 09-25 priority vs. the 10-08
> direction* at the end of this slate.

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

---

## ⭐⭐⭐ Foraging is a MODE, not a family (2026-10-08)

Captured in conversation after the fire/DD merge, and it corrects this
slate's own framing. Everywhere above, foraging is **item 5 in a list of
families** — one more RGO to ship before the roster closes. User:

> *"foraging is how you get any of these resources **without
> cultivation**. every RGO in the game wants a foraging counterpart —
> after all the G in RGO is 'gathering'. foraging isn't just foraging
> it's also hunting. basically it's the **prehistoric epoch
> implementation that every trade is missing** to round out the epoch
> lens."*

That is a different object than a family, and three consequences follow
that the list framing hides.

### ⭐⭐ Every trade has a three-rung epoch ladder, and we ship only the middle

| rung | the act | what it costs | state |
|---|---|---|---|
| **prehistoric** | gather · hunt · fish-by-hand | ⭐ nothing — no title, no tool, no land, no season | ⛔ **absent from every trade** |
| **medieval** | cultivate · extract · keep | a tool, a title, a season | ✅ the whole shipped roster |
| **industrial** | lift the medieval limit | a works, and theory | ⏳ drilling · plastics · fertilizer |

The industrial half of this was already on the record — § *The
through-line: an industrial RGO exists to LIFT a medieval limit*. **The
prehistoric half is the same observation turned around and nobody had
written it down.** `lib/craft/Epoch.ts` declares `prehistory` as the
first of five eras; **8 rows in the tree stamp `medieval`, zero stamp
anything else, and nothing reads the field.**

⭐ So foraging and drilling are the **two ENDS of one ladder**, which is
the real argument for designing them together — not scheduling
convenience. Each defines a boundary rung, and neither's shape is honest
without the other's.

### It is a platform pass, and must not be smuggled into a trade build

A mode over the whole roster is cross-cutting by construction, so the
standing rule applies with full force: ⛔⛔ *never solve a cross-cutting
capability inside a trade build.* Its size is **one rung × N trades**,
not one family — materially larger than the list framing implies, and the
reason it should be the last thing built rather than the next thing.

### ⭐ It is also the participation floor

The prehistoric rung is the only mode that needs **no capital** — which
makes it every trade's on-ramp for a player with nothing, and the first
answer this backlog has to lens 3b's *can the polity do something we did
not want*. Nothing else in the deck provides it.

## ⚠⚠ The 09-25 priority vs. the 10-08 direction — and the resolution

Two recorded user decisions point opposite ways, so they are reconciled
here rather than left for the next reader to trip over.

| when | the decision |
|---|---|
| **2026-09-25** (§ *The priority, settled*) | *"Medieval RGOs before foraging. **Late-stage RGOs gated ON foraging** — not the other way around."* |
| **2026-10-08** (this section) | *"RGO unification obviously depends on drilling, it's our last RGO in the deck… I would think **foraging would get more out of unification** than the other way around."* |

**Both are right, about different fields, and the seeded/derived split is
what separates them.**

> ⭐⭐⭐ **Drilling is a SEEDED-field RGO.** That is not incidental — it is
> the dry hole's entire honesty argument (*the oil either is or is not
> there, deterministically, before anybody looks; your uncertainty is
> epistemic, never resolutional*). So **drilling does not consume the
> derived-field interface at all**, and is not gated on the thing
> foraging completes.

The 09-25 rule holds for any late-stage RGO whose stock is **derived**.
Drilling isn't one, so it is not an exception to the rule — it was never
in the rule's scope, and the word "late-stage" over-generalised.

And item 4 above (⏸ the derived-field interface · HELD) needs foraging
**designed**, not **built**. Once its shape is on paper the interface can
be fixed, and the promotion lands on schedule with foraging's stock as
its declared second consumer. ⭐ **That single distinction is what makes
build order free**, which is the point of designing the pair together.

### The sequencing, as it now stands

1. **the design pass** — the shared RGO/epoch spine, then drilling, then
   foraging+hunting (one build). The spine fixes the derived-field
   interface, so nothing downstream waits on a build.
2. **drilling** — closes the roster in SHAPE, so the promotions become
   final rather than provisional. It is also the build most likely to add
   parallel structure (a new extraction shape, a fourth gas source) against
   a slate already warning about two parallel gas economies, so it wants
   unification live while it lands.
3. **the promotion increments** — the tap and the sweetener vocabulary are
   READY now and independent of all of this; they land between builds
   whenever, per § *The operational form*.
4. **foraging + hunting**, as one build, at the prehistoric rung across the
   roster.

## ⚠ The roster is closed in SHAPE, open in CONTENT

Asked directly whether any RGO had been forgotten. Not space (out of epoch,
nothing demands it); underwater is covered (fishing ships, the deep is a
tail). Three real gaps, none of which blocks unification, because each is
rows-on-a-shipped-shape or a variant of a designed act:

- ⭐⭐ **ICE — and it is an RGO nobody had classified as one.** A seasonal
  harvested natural resource with a reservoir, a recharge, an act and a
  credit. ⭐ The **first RGO whose reservoir is the CLIMATE itself**, and
  therefore the first whose recharge window is a season rather than a
  rate — which lands on `TapWindowSpec`'s `photoperiod` / `rising`
  machinery. Promoted in priority by user decision the same day; see
  [cold-chain-slate](./cold-chain-slate.md) for the demand case and the
  one thing blocking it.
- ⭐ **WHALING** — hunting at sea, and it has shipped demand in front of
  it: lamp oil's consumer landed with the energy build (street lighting,
  the civic bill, `FuelStore` burning a street-night at a time) while its
  producer is *"an oil works"* whose crafted route does not exist. Lamp
  oil before kerosene **is whale oil**, which also makes it drilling's
  direct historical antagonist — kerosene is what ended the whale
  fishery. → [hunting-slate](./hunting-slate.md).
- **GUANO / NITRATES / PHOSPHATE** — named as absent by this slate's own
  census (§ *The roster is EPOCH-BOUNDED*) and still absent. Fertilizer
  is farming's industrial limit-lifter, the same shape as coke for the
  furnace.
