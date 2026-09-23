# Extraction slate — the ground cut from above, and the yield a place concentrates

> **Status: UNBUILT** — the five shipped RGOs (mining · farming · ranching ·
> fishing · forestry, plus water as the sixth) cover the planted, the kept,
> the standing and the sunk. Nothing cuts the ground from the surface, and
> nothing takes a yield the surroundings concentrate for you.
> **Left:** ⭐ **Stage A — the open working**: ground cut from above
> (overburden as the gate, the dressed block as forestry's bole, rubble as
> bulk) · stone · clay · sand · limestone → the limekiln → the smelt's missing
> **flux** · coal · peat (a field that does not renew, cut wet and dried) ·
> rock salt · the `quarrying` Discipline · ⭐ **Stage B — the concentrated
> yield**: the saltern (yield = f(weather, elapsed)) · the hive (yield = f(a
> neighbourhood you do not own) + pollination back into farming) · honey ·
> beeswax → the candle
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
· [husbandry.md](../../subsystems/husbandry.md) (min-of-four) ·
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

## ⭐⭐⭐ The two shapes, and why they gate the unification

Every one of the five shipped RGOs derives its yield **from the parcel, reach
or stand under your feet**. That is the abstraction a unified RGO interface
would be drawn from — and it would be wrong, because two of the four families
here do not fit it:

| family | new mechanism? | why |
|---|---|---|
| quarry · claypit · sandpit · limestone | **no** | mining's `Deposit` + forestry's bole. Rows on a shape that exists. |
| coal · peat | **no** | a deposit row; peat is a field that does not renew, which is how `Deposit` already behaves |
| **salt (the saltern)** | ⭐ **yes** | production by **evaporation, under weather, over elapsed time**. Nothing among the five is an open-air durative transform. |
| **apiculture (the hive)** | ⭐⭐ **yes** | yield derived from a **neighbourhood you do not own**. The only RGO that reads outward instead of downward. |

**Therefore the order is A → B → unify → foraging/hunting.** Stage B must land
*before* the unification wave, or the interface gets drawn from five instances
of one shape and grows a guard the first time it meets a sixth. This is the
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
| **peat** | the same fuel slot; the poor household's fuel | ⭐ cut **wet**, then dried — `CuredMixin.moisture` already models drying, and *drying reverses* is exactly a turf stack in the rain |
| **rock salt** | `salt` (the shipped `cure` hurdle) | none |

### Design notes

- **A working is a Location with a field and a face, not a warren.** Lean, not
  settled (see open questions): a quarry is one hole, and the warren shape
  earns itself underground because getting lost and drowning are the hazards.
- **Peat's field does not renew on a human timescale.** That is not a
  limitation to apologize for — it is the depletion lesson, and `Deposit`
  already behaves this way. The turbary is where a player watches a commons
  run out.
- **Coal and rock salt are rows on BOTH mechanisms.** Opencast here, adit in
  mining's existing `Deposit`. One good, two sources, different economics —
  and that is the honest model, not a duplication to eliminate.
- **`quarrying` as a Discipline of its own**, minted here.
  [trade-roster-slate](../tails/trade-roster-slate.md)'s gap report has
  `extraction` for the delver; surface and underground are genuinely different
  competence, and masonry, ceramics and glasswork will all read the surface one.

---

## Stage B — the concentrated yield

> **Two mechanisms, two goods, and the shapes the unification needs to see.**

### The saltern

An open-air pan. **Yield is a function of weather over elapsed time** — sun and
wind concentrate brine, rain sets you back. [ranching-slate](./ranching-slate.md)
AC 37 already states it: *"a saltern yields salt as a function of weather over
elapsed time, with no …"*.

- **Lean on the host:** `MaturingMixin` on the pan. Maturation is already *the
  durative transform on a vessel*; what is new is a **rate read from the
  weather field** rather than from a cellar's stable conditions. If that holds,
  Stage B's first half is small.
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
- **Pollination goes back into farming.**
  [flowers-slate](./flowers-slate.md) D35 has it as a positive externality and
  D43 has clover as the bee plant; husbandry's **min-of-four** limiting factor
  is where it lands. Lean: **ship it in Stage B**. Without the return leg the
  hive is a honey vending machine and the lens-1 payoff is gone.
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

## Open questions

1. ⭐ **Is a working a Location with a face, or a Warren that grows downward?**
   Lean: a Location with a field and a face. A quarry is one hole; the warren
   shape earns itself underground because navigation *is* the hazard there. But
   a deep quarry has benches, and a bench is arguably a heading.
2. **Does peat's drying reuse `CuredMixin.moisture`, or want its own clock?**
   Lean: reuse. *Drying reverses* is already modelled and a rain-soaked turf
   stack is the same fact.
3. **Is the saltern's host `MaturingMixin`?** Lean: yes, with the rate read
   from the weather field. If that fails, Stage B doubles.
4. **Pollination in Stage B, or held?** Lean: **in.** Without it the hive is a
   vending machine.
5. **How many packs?** Lean: `trade-quarrying` for Stage A (stone, clay, sand,
   limestone, coal, peat, rock salt — one mechanism, one pack) and
   `trade-apiculture` for the hive. ⚠ **The saltern's home is the real
   question**: salt is one good with two sources, and the pack that owns the
   good should probably own both — which argues the saltern rides
   `trade-quarrying` despite having nothing to do with cutting.
6. **`quarrying` Discipline, or a band of `extraction`?** Lean: its own key.
