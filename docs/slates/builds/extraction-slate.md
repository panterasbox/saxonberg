# Extraction slate — the ground cut from above, and the yield a place concentrates

> **Status: UNBUILT — design closed 2026-09-23, ready for `/requirements`.**
> The five shipped RGOs (mining · farming · ranching ·
> fishing · forestry, plus water as the sixth) cover the planted, the kept,
> the standing and the sunk. Nothing cuts the ground from the surface, and
> nothing takes a yield the surroundings concentrate for you.
> **Left:** ⭐ **Stage A — the open working**: **W0, the open air dries what
> you leave in it** (the `dry` act's rate reads the weather — peat, the
> saltern, hay and a ham on a line, all one term) · ground cut from above
> (overburden as the gate, the dressed block as forestry's bole, rubble as
> bulk) · stone · clay · sand · limestone → the limekiln → the smelt's missing
> **flux** · coal · peat (a field that does not renew, cut wet and dried) ·
> rock salt · the `quarrying` Discipline · ⭐ **Stage B — the concentrated
> yield**: the saltern (a `MaturationProfile` with `mechanism: evaporative` on
> a Bulkable pan, riding W0) · **the hive** (yield = f(a neighbourhood you do
> not own) — the one genuinely new shape, and the one that gates the
> unification) + pollination scaling `fruitSetCount` at SET · honey · beeswax →
> the candle
> **Size:** two builds

See also: [mining-slate](./mining-slate.md) (*"Quarrying (stone, flux) —
open-pit bulk"* is on its Left; the underground half of coal and rock salt is
its `Deposit`) · [ranching-slate](./ranching-slate.md) (**AC 37–39 already
specify the saltern, peat and the bog**) · [flowers-slate](./flowers-slate.md)
(**D35 pollination as a positive externality**, D43 clover as the bee plant) ·
[field-substrate-slate](../tails/field-substrate-slate.md) (⭐ the hive is what
finally gives `stepOutwardForPin` a home — it is the fourth copy) ·
[discovery-slate](./discovery-slate.md) + [hunting-slate](./hunting-slate.md)
(**the two RGOs deliberately AFTER this one** — the user's sequencing: exhaust
the civilized forms before the hunter-gatherer ones) ·
[trade-roster-slate](../tails/trade-roster-slate.md) (the unminted Disciplines:
`ceramics`, `glasswork`, `masonry`, `leatherwork` — the trades that follow) ·
[content-packs-slate](./content-packs-slate.md) (its Part 6 roster already
lists *quarrying · pottery & glass · masonry · tanning* as unbuilt trades) ·
[vocations.md](../../vocations.md) (`quarrier · GAP · mining's sibling`; the
knacker/chandler built on the candle). Substrates:
[mining.md](../../subsystems/mining.md) (`Deposit`, `WorkingMixin`, `MineWarren`
carve/shore/promote) · [forestry.md](../../subsystems/forestry.md) (⭐ **the
place-with-a-cover and the bole** — Stage A's two nearest precedents) ·
[soil.md](../../subsystems/soil.md) · [weather.md](../../subsystems/weather.md)
· [husbandry.md](../../subsystems/husbandry.md) (⭐ the polycarp cycle's
**latch → set → fill → ripe** — pollination attaches at SET) ·
[spoilage.md](../../subsystems/spoilage.md) (`CuredMixin.moisture` — *drying
reverses and curing does not*, which is exactly peat) ·
[maturation.md](../../subsystems/maturation.md) (the durative transform on a
vessel — the saltern's candidate host).

**Captured 2026-09-23**, out of the question *"is that all the RGOs?"* after
the fishing build merged. The answer is no, and the evidence below is a census
rather than a recollection.

---

## ⭐⭐ Why this slate exists — the census, run two ways

The demand side and the supply side catch different holes, so both were run.

### Demand side — what the crafting graph bottoms out on

Take every recipe's `inputSlots[].category`, subtract every category some
recipe produces, and 24 **root** categories remain: the things the economy
consumes and does not make. Twenty-two resolve to a shipped RGO (farming's 25
plant and 10 crop rows, forestry's cordwood and standards, fishing's 6 species,
ranching's taps, milling, smelting). **Two do not:**

| root category | consumed by | produced by |
|---|---|---|
| **`salt`** | `salt-cure`, and the shipped `CuredMixin` solute hurdle | **nothing** — authored as *"a half-empty sack of coarse salt"* on a kitchen shelf |
| **`sugar`** | `simple-syrup` | **nothing** — no cane, no beet, no honey |

### Supply side — materials consumed and never minted

| material | consumer sites | producer |
|---|---|---|
| `rock/granite` | **13** | — |
| `rock/slate` | **10** | — |
| `ceramic/ceramic` | **9** | — · ⚠ **no `clay` material exists at all** |
| `glass/glass` | **5** | — · ⚠ **no `sand` material exists at all** |
| `caustic/quicklime` | 1 | — · no limestone, no kiln |
| any fuel | everywhere | ⚠ **wood, and only wood** — no coal, no peat |

No recipe produces stone, clay, glass, ceramic or lime. They are **authored
into existence**, which is the shape of a chain with no root.

⚠ **Two orphans that are NOT gaps:** `organic/rubber` and `textile/down` have
**zero** consumers. They are materials waiting on a build, not roots waiting on
a producer — do not let them into scope.

⭐ **And one thinness finding, which is content and not mechanism:** the entire
mining sector is **one deposit row** (`world/rejection/idea/deposit/ferrow`).
Fishing is six species. The substrate is fine; the world is thin. That belongs
to the localities, not here.

### The completeness argument

Freeform recall cannot prove a list is finished, so the external-sector
checklist ([vocations.md § method 3](../../vocations.md) — *"the only method
that catches blind spots"*) was run against the primary sector's eleven
families:

| family | state |
|---|---|
| agriculture · livestock · forestry · fishing · metal ore · water | ⭐ **shipped** |
| **non-metallic minerals** (stone · clay · sand · limestone) | **this slate, Stage A** |
| **salt** | **this slate, both stages** (rock salt in A, the saltern in B) |
| **fuel minerals** (coal · peat) | **this slate, Stage A** |
| **apiculture** (honey · beeswax) | **this slate, Stage B** |
| hunting · trapping | → [hunting-slate](./hunting-slate.md), deliberately after |
| gathering of wild flora | → [discovery-slate](./discovery-slate.md), deliberately after |
| oil · gas · rubber | a later epoch; nowhere yet, deliberately |
| sericulture · whaling · sealing | ⛔ **rejected** — no unmet demand, so criterion 1 of [vocations.md](../../vocations.md) fails. Do not add them to be thorough. |
| gems · precious metals as store-of-value | → [mining-slate](./mining-slate.md); a deposit row + a material, not an RGO family. ⭐ Coinage does **not** need it — `platform/thing/Coin` carries a denomination identity, not a composition. |

> **With those four families built, the civilized primary sector is closed.**
> What remains is not an RGO the world is missing; it is foraging and hunting,
> which are the same shape run over fugitive and wild stock.

---

## ⭐⭐⭐ The ONE new shape, and why it gates the unification

Every one of the six shipped RGOs derives its yield **from the parcel, reach or
stand under your feet**. That is the abstraction a unified RGO interface would
be drawn from — and exactly one family here does not fit it:

| family | new mechanism? | why |
|---|---|---|
| quarry · claypit · sandpit · limestone | **no** | mining's `Deposit` + forestry's bole. Rows on a shape that exists. |
| coal · peat | **no** | a deposit row; peat is a field that does not renew, which is how `Deposit` already behaves |
| salt (the saltern) | **no** — ⚠ *corrected 2026-09-23* | a `MaturationProfile` with a new `mechanism` value on a Bulkable pan. `MaturationProfile` already declares `mechanism` as the extension point (*"the same move `Dyestuff.chemistry` makes"*), the rate is already credited at the host's reconciled `ThermalMixin` temperature. **A profile row, a pan row and a humidity term** — not a mechanism. ⚠⚠ **Correction, 2026-09-23 (the plan's code survey):** this row also claimed *"weather already stamps temperature/humidity/wind onto every SkyExposed scope."* **It does not.** `setHumidity` and `setWind` exist as definitions and **nothing in the engine calls them**; the weather boundary fan-out restamps **thermal only**, so a room's humidity is its authored biome's, not the weather's. The air read the drying rate needs has to be built (the plan reads weather directly, the way soil already does). The claim came from a subsystem doc's prose and was cited twice before anybody read the code — a premise stated once and never checked gets cited as fact. |
| **apiculture (the hive)** | ⭐⭐ **yes, and alone** | yield derived from a **neighbourhood you do not own**. The only RGO that reads *outward* instead of downward. |

**Therefore the order is A → B → unify → foraging/hunting.** Stage B must land
*before* the unification wave — not for the saltern, which rides shipped
substrate, but for **the hive**: draw the interface from six instances of one
shape and it grows a guard the first time it meets the seventh. This is the
same argument [field-substrate-slate](../tails/field-substrate-slate.md) makes
from the other end: it wants *"a home for the pin walk
(`stepOutwardForPin`, now copied three times)"*, and **the hive is the fourth
copy** — the one that makes the outward walk a shared primitive instead of a
habit.

⚠ **And foraging is not merely a consumer of the unified interface — it is the
case that completes it.** Every shipped field is *seeded*; field-substrate
names *"foraging stock as the first DERIVED field"*. So unification and
foraging want to be adjacent, which is the argument for not padding the gap
between them with trade builds.

---

## Stage A — the open working

> **One mechanism, seven goods.** Ground you cut from above.

Mining is extraction *underground*: `MineWarren` grows a graph of headings
because **navigation is the danger** — air, support, the water table. Forestry
is extraction *at the surface*, but only of a standing crop. Neither is a hole
open to the sky, and the difference is not cosmetic:

- **Overburden is the gate, and it is the lesson.** You strip waste before you
  cut good, and the ratio of the two is what makes a working economic. ⭐ This
  is the first RGO in the game whose **cost is what you throw away** — no other
  one teaches it, and it is the whole of extractive economics.
- **Two output shapes off one face.** A **dressed block** is forestry's bole
  again (too heavy to lift; dress or cross-cut a piece at a time), and
  **rubble** is bulk. The same face yields both, and which one you take is a
  competence-and-tool decision rather than a dial.
- **No air, no hoist, no shoring.** An open working is *safer and cheaper per
  tonne and worse per unit of good* than a shaft, which is exactly why the real
  world chooses between them. The two mechanisms are siblings on purpose.

### The goods, and the tail each needs to be real

⭐⭐ **Every one already has a shipped consumer waiting.** This is the strongest
lens-6 pass available: the demand was there first, measurably.

| good | closes | the tail it needs |
|---|---|---|
| **building stone** (granite · slate) | 13 + 10 consumer sites | none — the rows already name the material |
| **clay** | `ceramic` at 9 sites | one kiln recipe → `ceramic`. Hearthworks already has furnaces. |
| **sand** | `glass` at 5 sites | one furnace recipe (sand + lime) → `glass` |
| **limestone** | `quicklime` (ships, 1 consumer) **and the smelt's missing flux** — [metal-chain-slate](./metal-chain-slate.md): *"flux stops being a recipe ingredient"* | the limekiln (a fixture + one recipe) |
| **coal** | every forge, kiln and smelt — today the fuel chain roots on **wood alone** | none; the fuel slot already exists |
| **peat** | the same fuel slot; the poor household's fuel | ⭐ cut **wet**, then dried **by exposure** in a stack — ⚠ *corrected at plan time*: not by the `dry` act, which stays the rack-hanging act (a turf stack is not a drying rack). Turves dry because they are out in the air, and *drying reverses* is exactly a stack caught in the rain |
| **rock salt** | `salt` (the shipped `cure` hurdle) | none |

### Design notes

- ⭐⭐ **A working is a Location with a field and a face, not a warren —
  settled by the shipped doctrine.** `mining.md`'s governing split is *"reads
  go to the space, mutation goes to the warren"*: every read lives on
  `WorkingMixin` and derives from the room and its zone, and `MineWarren` owns
  only **carve · abandon · the tier ledger · seal-and-reap**. The precedent is
  already a class: `AuthoredWorking = WorkingMixin(SingletonCartesianLocation)`,
  seven rows at Rejection, added **because driving found** the authored
  galleries had no faces, no stability and no acts.
  ⭐ **The real question was never Location-vs-Warren — it is whether a quarry
  grows by ADDING ROOMS.** A mine does, because you drive headings into unknown
  ground and navigation *is* the hazard. A quarry does not: **the face retreats
  and the floor drops — one place changing, not new places appearing.** So a
  `QuarryMixin` sibling of `WorkingMixin` on an authored singleton, and no
  warren in Stage A. When a pit is deep enough that a bench is genuinely a
  heading, that is a promotion, not a rewrite — mining.md states `MineWarren`
  is *"shaped for a BASE SWAP, not a redesign."*
- ⭐ **Cutting does NOT grow the parcel.** Depth is a number on the working and
  the widening is prose; `areaM2` stays [smallholding](../../subsystems/smallholding.md)'s
  and this build does not reach into the land record. (Decided — the tempting
  version, *what has been taken IS how big the hole is*, buys one honest number
  at the price of pulling the land market into an extraction build.)
- ⭐⭐ **W0 — the open air dries what you leave in it.** ⚠ Peat cannot dry
  passively: `spoilage.md` is explicit that *"the passive arm only ever RAISES
  moisture. Nothing dries on its own: drying is an act"*, because a gauge that
  quietly dried the pantry would change how every shipped row behaves. So peat
  dries by the **shipped `dry` act** — which today is *"time only."*
  **The primitive: `dry`'s rate reads the weather.** That does not breach the
  prohibition (you asked for the act), and it is the same term the saltern
  needs, so it belongs at the front of Stage A rather than in Stage B. It
  serves four things immediately: peat, the saltern, a ham or a fish dried in
  the open, and **haymaking** (`food/hay` ships and ranching makes it).
  ⭐ `CuredMixin` is the right carrier and welcomes this: it lives at
  `lib/material/Cured.ts` and its own doc says *"leather, timber and grain are
  all dried and none of them rot on a microbial curve."*
- **Peat's field does not renew on a human timescale.** That is not a
  limitation to apologize for — it is the depletion lesson, and `Deposit`
  already behaves this way. The turbary is where a player watches a commons
  run out.
- **Coal and rock salt are rows on BOTH mechanisms.** Opencast here, adit in
  mining's existing `Deposit`. One good, two sources, different economics —
  and that is the honest model, not a duplication to eliminate.
- **`quarrying` as a Discipline of its own**, minted here — `channel: skill`.
  ⚠ [trade-roster-slate](../tails/trade-roster-slate.md)'s gap report lists an
  `extraction` key, but **it was never minted**: `trade-mining` shipped
  `mining` (ISCED-F 0724) + `geology`, `trade-forestry` shipped `silviculture`
  (0821), `trade-fishing` shipped `fishing` (0831). Every RGO pack ships its
  own, so `quarrying` follows the precedent and there is no `extraction` for it
  to be a band of. ⚠ **Verify the ISCED-F code against a source before
  seeding** — trade-roster's own standing warning.

---

## Stage B — the concentrated yield

> **Two goods, one new shape.** The saltern rides shipped substrate; the hive
> is what the unification must see before it is drawn.

### The saltern

An open-air pan. **Yield is a function of weather over elapsed time** — sun and
wind concentrate brine, rain sets you back. [ranching-slate](./ranching-slate.md)
AC 37 already states it: *"a saltern yields salt as a function of weather over
elapsed time, with no …"*.

- ⭐⭐ **The host is settled: `MaturingMixin` on the pan, and it needs almost
  nothing new.** The mixin composes on a **Bulkable** host
  (composition-validated), which a pan holding brine is exactly; a
  `MaturationProfile` already declares its **`mechanism`** as the extension
  point (*"the same move `Dyestuff.chemistry` makes: one substrate, two
  mechanisms"*) — so the saltern is `mechanism: evaporative`; and the rate is
  already *"credited at the vessel's own reconciled `ThermalMixin`
  temperature — the cold cellar is a PLACE, never a rule"*, which for an
  outdoor pan is already weather-driven. **What Stage B adds is a profile row,
  a pan row, and W0's humidity/wind term.** This is why the saltern is not a
  new mechanism.
- ⭐ **And the rain setback is free.** The pan is a vessel, so rain filling it
  is ordinary bulk transfer — no special case, and the dilution falls out of
  the same arithmetic that concentrated it.
- **Salt with two sources is the point.** Rock salt is a face you cut (Stage A);
  bay salt is weather you wait on. Same good, opposite risk profile — inland
  versus coastal, capital versus patience. That is a real economic geography
  falling out of one material.

### The hive

**Yield derived from a neighbourhood you do not own.** A colony forages
outward; what it brings back is a function of what is flowering within range,
on land that belongs to other people.

- ⭐⭐ **This is the slate's most valuable object**, and not because of honey.
  It is the game's first **externality with no villain**: your yield depends on
  a neighbour's land use, and their yield (via pollination) depends on your
  hive. Nobody is cheating; the interests are simply entangled. Lens 4 rarely
  gets a case this clean.
- ⭐⭐ **Pollination goes back into farming — and it attaches at SET, not as a
  limiting factor.** [flowers-slate](./flowers-slate.md) D35 has it as a
  positive externality and D43 has clover as the bee plant. Husbandry's polycarp
  cycle is **latch → set → fill → ripe**, and `_fruitFill` already scales by
  `limiting` — so a sixth limiting factor would make poor pollination fill
  *slower*, which is wrong. **Poor pollination gives you fewer fruits, not
  slower ones.** Step 2 sets a crop of authored count and step 4 mints
  `fruitSetCount` items, so pollination is **a multiplier on `fruitSetCount` at
  SET**: one term at a named seam, where `_worstLimiting` already re-seeds.
  Ship it in Stage B — without the return leg the hive is a honey vending
  machine and the lens-1 payoff is gone.
- ⭐ **The floor is `0.3`, not zero** (decided). An insect-pollinated crop with
  no hive in range still sets three tenths of its authored count, because *wild
  pollinators exist*. A zero is realistic and it is a trap: it makes clover and
  the orchards unplayable until somebody keeps bees, which is a **new player
  obligation invented to create a market** — the failure
  [vocations.md](../../vocations.md) names as criterion 1 failing in disguise.
  The floor keeps the hive a **premium**, which is what an externality should
  be.
- **Honey closes `sugar`** — the census's second unrooted root, and the
  honest medieval answer to it.
- **Beeswax opens the candle** — one recipe, and it feeds
  [vocations.md](../../vocations.md)'s knacker/chandler, *"the only genuinely
  new trade the settlement pass produced"*, whose whole justification is that
  Rejection's culture section is built on the candle.

---

## Lens pass

1. **Pedagogy** — three lessons no shipped RGO teaches: **the waste ratio**
   (overburden : good is the first cost that is what you discard), **depletion
   on a human timescale** (the turbary runs out and does not come back), and
   **the externality** (the hive and the neighbour's field). Derivable: every
   yield reads a field; nothing is a number on a row.
2. **Creative expression** — a new quarry is **rows**: a deposit row plus a
   working location. A bespoke one overrides the field, the way `GroundCharacter`
   and `Deposit` already permit. ⭐ A second quarry needs zero pack code.
3. **Immersion & roleplay** — a saltern is weather you watch instead of a
   progress bar; a hive's take falls the season a neighbour ploughs the clover
   in. Both are readable in words, and neither is a gauge.
4. **Values** — the commons question, arriving honestly: turbary and quarry
   rights are classic *profits à prendre*, so **who may cut** is a live
   question with a real record behind it
   ([parcel.md](../../subsystems/parcel.md), and watershed's rights as the
   precedent). The hive forces a conflict with no wrongdoer.
5. **Technology & magic** — an open pit is an open pit from Rome to the Rand;
   blasting and draglines change the *dynamics*, never the mechanism. A skep
   and a Langstroth hive differ in yield and in whether you kill the colony to
   take it; the neighbourhood read is identical.
6. **Economy** — ⭐⭐ **the demand was there first, and it is countable**: 13 ·
   10 · 9 · 5 consumer sites, two shipped recipes, and a fuel chain with one
   root. This is the rare build that adds producers to markets that already
   exist rather than markets to producers.

---

## Non-goals — each with its destination

- **The trades that follow** — masonry, ceramics, glasswork, the chandler, the
  tanner. ⭐ **Soon to follow, and deliberately not here** (user, 2026-09-23:
  *"extraction only, but the trades will be soon to follow"*). They are
  consumers of a substrate this build ships, and they want to be written
  **after the unification wave** so they are drawn against the settled
  interface. → [content-packs-slate](./content-packs-slate.md) Part 6 roster +
  [trade-roster-slate](../tails/trade-roster-slate.md)'s unminted Disciplines.
- **The RGO interface unification** — the phase after Stage B. →
  [field-substrate-slate](../tails/field-substrate-slate.md) (the seeded ×
  derived seam, the pin walk's home) +
  [api-normalization-slate](./api-normalization-slate.md).
- **Foraging** → [discovery-slate](./discovery-slate.md). **Hunting** →
  [hunting-slate](./hunting-slate.md). Both after this slate, by the user's
  sequencing.
- **Working below the water table** — a quarry that fills, a pump, a bench
  deep enough to be a heading → [mining-slate](./mining-slate.md), whose Left
  already owns *"everything below the water table — shaft/hoist/pump"*. The
  open working stops at the water.
- **Gems and precious metals** → [mining-slate](./mining-slate.md) (a row, not
  a family).
- **Oil, gas, rubber** — a later epoch. Nowhere yet, deliberately; `rubber`
  ships as a material with zero consumers and should stay that way until
  something needs it.
- **Sericulture, whaling, sealing** — ⛔ rejected on criterion 1. Not deferred:
  **declined.**
- **More deposit rows for the existing mine** — the one-row thinness finding is
  the localities' work, not a mechanism gap.

---

## ⭐⭐ Decided — the open-questions pass, 2026-09-23

Six questions went in; four came out settled against the shipped code, one
changed the staging, and one turned out to be moot. **Recorded here so the
requirements phase does not re-open them.**

| # | question | decided |
|---|---|---|
| 1 | working = Location, or Warren? | **Location.** `mining.md`'s *reads-to-the-space / mutation-to-the-warren* split already settles it, and `AuthoredWorking` is the shipped precedent. ⭐ The real question was *does a quarry grow by adding rooms* — it does not; the face retreats and the floor drops. `QuarryMixin` on an authored singleton, no warren; a bench-deep pit is a later base swap. |
| 2 | peat drying — `CuredMixin` or its own clock? | **`CuredMixin`, via the shipped `dry` ACT**, never passively — *"nothing dries on its own"* is a stated prohibition with a stated reason. ⭐ **And the weather term moved to Stage A W0**, because the saltern needs the identical primitive. |
| 3 | saltern host = `MaturingMixin`? | **Yes, and it needs almost nothing new** — a Bulkable pan, `mechanism: evaporative`, the rate already credited at the host's `ThermalMixin` temperature. ⚠ **This demoted the saltern from a new mechanism to a profile**, which is why only the hive gates the unification. |
| 4 | pollination in Stage B, or held? | **In — and at SET, not as a limiting factor.** A multiplier on `fruitSetCount`, because poor pollination gives fewer fruits rather than slower ones. |
| 5 | how many packs? | **`trade-quarrying` (Stage A + the saltern) · `trade-apiculture` (the hive).** The reason improved: after Q2 the saltern and peat **share W0's drying term**, so they want the same pack whatever salt feels like. |
| 6 | `quarrying`, or a band of `extraction`? | ⛔ **Moot.** `extraction` was never minted — it is a row in trade-roster's *gap report*, and `trade-mining` shipped `mining` + `geology`. There is nothing to be a band of. |
| 7 | should the hole visibly widen? | **No — do not grow the parcel** (user, 2026-09-23). Depth is a number on the working, width is prose. `areaM2` stays smallholding's, and an extraction build does not reach into the land record. |
| 8 | unpollinated crop: zero, or a floor? | **A floor of `0.3`** (user, 2026-09-23) — *wild pollinators exist*. A zero would make clover and the orchards unplayable without a hive in range, which is manufactured demand. |

---

## Open questions

**None.** The six-question pass closed four against the shipped code, moved one
into Stage A's W0, and struck one as moot; the user closed the remaining two on
2026-09-23. ⭐ **This slate is ready for `/requirements`.**

One residual is recorded rather than asked, because it is a different subject:

- **Is there ever a `trade-salt`?** Only if salt gets a *trade* rather than just
  a source — the salter, and above all **the salt tax**, which was historically
  enormous and would make a genuinely good governance object. If that is ever
  wanted, salt wants its own pack; until then it rides `trade-quarrying`. →
  [institutions-slate](./institutions-slate.md) /
  [legal-code-slate](./legal-code-slate.md) if the tax is what appeals.
