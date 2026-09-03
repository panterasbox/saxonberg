# Farmstead — requirements

**One cycle, three entangled systems: the field, winter, and livestock.**

Farming Stage A shipped the orchard half — the fruit cycle, `pick`, the ten
grown families, the farmers market, the `farms` brain — on top of living-world
phases 1–2 (the growth model, the garden bed, land use, soil). What it did
**not** ship is the field: cultivation today is `PlantPot` and `GardenBed`, a
1,000 m² Hinkley lot holds a four-plant bed, and the shipped
`trade/farming/location/farm` is a packing shed whose own comment says *"the
growing is the smallholding's."* **There is no farm in this game.**

Three unbuilt things gate each other in a circle the shipped docs already
record. Farming Stage B is gated on **winter** (the clock has seasons; the crop
does not — husbandry's own words are *"no bloom, no season of readiness"*) and
on **ranching** (*"nitrogen is a reserve that harvesting exports and `feed`
restores from nowhere: a faucet at both ends"*). Ranching's signature claim —
*pasture is a field* — is gated on Stage B. And winter is the annual spine of
both. The circle does not resolve by picking a side: **the field, the season and
the animals that eat it are one piece of work**, which is what "pasture is a
field" was always saying.

This build closes that circle, and in doing so closes named faucets in two merge
requests currently in flight: textiles (!236) ships `wool.yaml` with
`biologicalSource: null` and a `ScutchController` deliberately written so
*"naming the flax row here would be the one line that stops wool"*; cooking
(!231) ships `render-tallow`, `hearty-stew`, `fine-roast` and three more recipes
wanting protein **no animal produced**.

Seeding slates: [farming](../slates/builds/farming-slate.md) ·
[ranching](../slates/builds/ranching-slate.md) ·
[field-substrate](../slates/builds/field-substrate-slate.md) ·
[pets](../slates/builds/pets-slate.md) (conventions only) ·
[weather (tail)](../slates/tails/weather-slate.md). Sequence context:
[living-world-roadmap](../living-world-roadmap.md) phases 4–5;
[farming-plan § Stage B](../plans/farming-plan.md).

---

## Goals

- **A player can plot a field out of land they own**, walk it, read its ground,
  and **make it into a field** — clear it, treat it, work it, and watch it revert
  if they stop. The level-up-your-farm loop the farming slate designed and nobody
  built.
- **Land can hurt you, and so can what lives on it.** Failure has more than one
  shape, and at least one of them is sharp.
- **Soil is one model** across pot, bed, field and pasture, with its seeded
  character and its derived state separated and composed.
- **Reading ground is a discipline** with an instrument ladder, not a number you
  can `look` at.
- **Crops, animals and hives answer to the season**, from one derived signal.
- **The nitrogen cycle closes at both ends** — harvest exports what it took,
  manure returns what wasn't used, legumes fix, leaching loses.
- **Livestock are kept, individually first**, with a record that compresses the
  ones you have stopped looking at.
- **The wool, meat, tallow, milk, egg and malt faucets close**, feeding
  textiles, cooking, fermentation, brewing and distilling from real production.
- **A farmstead archetype states its needs** so a locality can bind them with
  zero pack code.

## Non-goals

- **Heart's Delight.** Stage B is written as the valley and towns-slate D5 says
  it ships both halves at once. This build ships *mechanism*; the valley is
  *expression* and follows as a content build. If it can later be authored
  against the farmstead archetype with no pack code, the cut was right — which
  is the point of separating them.
- **The shared `Genome`.** Husbandry-wide and owed to a build that does crops
  too. Parentage-seeding stands in underneath an unchanged surface (D26).
- **Disease, and zoonoses with it.** Living-world phase 6. This build must make
  the condition score honest because phase 6 reads it as the resistance term; it
  must not stub `ContagionSpec`. A sick animal making its keeper sick is the
  sharpest hazard on the farm and it belongs to that build, not this one.
- **Downstream nitrate contamination.** The loss leg ships; the commons dilemma
  it implies is a civics build with a victim, an evidence trail and a
  legislative response (D18).
- **Per-locality climate.** Still a reserved `Locality` field. Winter is global
  and meant to be.
- **Aquaculture**, goats, and the pet *experience* layer (adoption, the
  un-delegable outcome). This build lands the substrate pets will inherit; it
  does not ship pets.
- **A `FieldApi`** (D6).

---

## Surface decisions

### The field

**D1 — The soil checkpoint splits out of `CultivableMixin` into its own mixin.**
`CultivableMixin` requires `Stuff & Container & Bulkable & Slotted & Populates &
Reserved` — a *Thing* with a bulk interior of soil in litres. A field-room is not
that shape and must not be made that shape. The soil already has its own
checkpoint (`soilClockStamp`, `_soilMeanMoisture`, its own reentry guard, and a
separate sky-edge stamp), deliberately self-contained since the residences
build. Lift it whole; the Thing-shaped bed and the Location-shaped field both
compose it. Duplicating it would fork the soil model, and *pasture is a field*
dies the moment pasture's soil is not farming's soil.

**D2 — Ground character is a SEEDED field; seeded and derived compose.** The
field-substrate slate's register lists *"soil quality — seeded (probably) —
deferred"*. It ships here, as the third field after weather and mine geology,
and it answers that slate's own open question about whether the two kinds
compose. They do, by multiplication:

- **Seeded character** — texture, drainage, aspect, depth, stoniness, native pH.
  A pure function of address + seed, exactly like `Deposit`. Always was true,
  cold-starts fully specified. ⚠ *"Never changes"* is true **of ground** and
  false of a bed — D65 draws the line, and pH is offsettable everywhere (D66).
- **Derived state** — the reserves. A function of recorded history.

Character sets the curve; state is the position on it. The same manure on sand
and on loam does different things. This is the reaction norm the farming slate
already uses for genetics, applied to dirt.

**D3 — A field is *plotted* out of land you already own.** Not a lot bought from
a plat book — that is the residential path. `plot` is the act. The field-room is
a Warren satellite with no coordinates, reached through a gate, exactly as a
Hinkley lot is (*"a lot's room is NOT on the street's grid"*). `PlatWarren`,
`PlatPlan`, `HoldingWarren` and `LotGateExit` all ship; this points them at
farmland. Count is bounded by the shipped land draw (`draw = Σ
landRequirementM2`) against the parcel's declared area. **No maximum is
written down** — the same answer smallholding reached for beds.

Because the ground was always there (D2), **you can survey before you commit.**
Plotting becomes a decision about *where*, informed by work you chose to do or a
gamble you chose to take.

**D4 — Soil is a career, not scenery.** The field-substrate slate's law: *a
field you read for free is scenery; a field you pay to read is a career.*
Reading soil **costs**, on the ladder:

| Rung | Cost | Reading |
|---|---|---|
| Look | free | a coarse honest band — *"heavy ground; the low corner stays wet"* |
| **The ribbon test** | a spade, your hands, time | texture class, by the real field procedure |
| Instruments | capital | pH, then assay numbers with error bars |
| The survey | many samples | the holding, known |

`analyze ground` **already ships** as a stanza with mining owning
`AnalyzeGroundController`. Farmland is a second reading on the same channel —
the instrumentation split, not a new verb. Decided by lens 1: soil science is a
real discipline and free-and-coarse teaches none of it.

**D5 — The survey is per-viewer.** *The map is a record of your sampling, not of
the world.* Land you have worked for years, you know; land you just bought, you
don't. This makes buying land a real risk, makes an honest surveyor worth
paying, and is the same doctrine as the herdbook (D20) arriving from the
opposite end of the build.

**D6 — No `FieldApi`.** The slate resisted one at two consumers on purpose:
`Deposit` re-implements the thirty lines of hash-and-mix rather than importing
weather's, because what they do not share is everything that matters — 1,015
lines of fronts and seasons against a plane and three bands. Soil's grammar is a
third distinct thing. Shared shape, not shared code. Reaffirmed at three.

### Land use

**D7 — A field has no `use` field.** Both slates carry a table committing a
field each season to crop / hay / graze / orchard. The table is right about
consequences and wrong about mechanism: land use in reality is a *description of
what you did*, not a declaration. An enum there would be the engine holding an
opinion about something it should be reading. Delete it, and the four uses fall
out of **two facts** — what is standing on the field, and whether the mouth
eating it is standing there too:

| | Standing on it | Mouth | Nutrients |
|---|---|---|---|
| **Crop** | a sown crop | elsewhere | **exported** |
| **Hay** | sward | elsewhere | **exported** |
| **Graze** | sward | **on the field** | **cycled in place** |
| **Orchard** | trees | elsewhere | mixed, multi-year |

*Pasture is a field* stops being a claim needing defence. **Fertility follows
the mouths** — a sentence a player derives rather than a rule they are told.
⚠ These four are all one thing wearing four hats — **growing**. Ground can do
three other things entirely, and **D69 generalizes this table**.
The shipped `LandUse` six are untouched: that is *zoning*, a different layer,
and it still gates whether agriculture is permitted at all.

**D8 — What binds is physical, never administrative.** A sward takes a season to
establish, so ploughing one up destroys a multi-season asset — the real
distinction between permanent pasture and an arable ley. And the calendar bounds
sowing and growth. The field is never *locked*; changing your mind just costs
you what you built.

**D9 — Residual and recovery is the one genuinely new sward mechanic.** Grazed
below its residual, a sward has spent its root reserves and regrows slowly. This
is what makes moving stock a **read** (move at residual, return at recovery)
rather than a timer, and it makes overstocking *and* understocking both
mistakes — grass that gets ahead of the herd goes stemmy and its feed quality
drops. **An overgrazed paddock is a recovery-rate penalty**, never a dead field or a
dead animal — which is what lets the world-time clock run freely across an
absence. ⚠ This is a rule about **absence**, not a rule about safety; D45 scopes
it, and the earlier phrasing *"every failure is a slope, never a cliff"* was
overbroad.

### Winter

**D10 — Winter is not a mode; it is cold and short days at a place.** No season
flag on a plant — a plant answers to the conditions where it actually is. Three
consequences: the dorm houseplant does not die every real month; **the
greenhouse falls out for free** (somewhere warm and lit in February, making
"buy your way out of winter" an economic decision against the shipped fuel
chain rather than an architectural unlock); and the mechanism is identical
indoors, outdoors, under glass and underground, so authors extend it without
asking for a flag.

**D11 — Photoperiod is the keystone signal, and one signal drives three
systems.** `CelestialApi` already computes solar declination from real orbital
geometry (`δ = tilt · sin(2π · dayIndex / Y)`, 23.5° tilt), hour angle,
`nextSunrise` and `nextSunset`. **Daylength is arithmetic on two shipped calls
and nobody has ever asked for it.** It drives:

- **crop dormancy and bolting** — the signal real plants use;
- **hens stop laying in short days** — which is why a lit hen house is a real
  thing to build, and why eggs are seasonal unless you spend;
- **the breeding season** — ewes are short-day breeders and lamb in late
  winter, cattle are near-aseasonal, horses are long-day. **Lambing in spring is
  a consequence of the calendar, not a flavour decision we author.**

**D12 — Winter stays hard: 7.5 real days, global, once a real month.** Softening
it would gut preservation, the salt interlock and the reason storage exists —
the scarcity *is* the lesson, and spoilage (cooking !231, W0) just made storing
well pay. The slate's honest worry — that 7.5 days of no growth bounces a
farming-only player — gets a better answer than "mining absorbs them":
**livestock do not stop.** They need feeding daily, they are in the barn where
you are actually handling them, and lambing and calving are late-winter events.
Farming stops; husbandry does not. Winter is when the animals are closest to you
and most demanding — which is true to life and is itself an argument for
building these together. Guardrail: a player must never be *unable to act* in
winter (wage labour, the market, the barn and the whole indoor transform chain
remain).

**D13 — Winter feeding is a sequence, not a cliff.** Stockpiled standing forage
(real practice — defer a paddock in late summer and graze it into early winter,
quality decaying as it stands), then hay, then bought feed. Planning is rewarded
with no planning UI.

### The soil ledger

**D14 — Soil nitrogen and dietary protein are one accounting.** Crude protein is
nitrogen × 6.25 — how feed is actually valued and sold. The engine already has
both halves and has never connected them: soil carries a `nitrogen` reserve, and
`Material` carries `nutrients` / `nutrientAmounts` (`stew-meat` authors
`protein: 26000`). Connecting them closes the faucet **mechanically** —
harvested matter carries away the nitrogen it took, manure returns the nitrogen
the animal did not use — and **pedagogically**, because the player watches
fertility become feed value become growth become fertility. It also makes hay's
feed quality and the field's fertility the same number seen twice, which is
*why* understocking hurts: stemmy grass is low-protein grass.

**D15 — Two honest openings, and they are the real ones.** A closed loop would
be wrong; the real cycle is not closed either. **In: legume fixation** (N₂ from
the atmosphere — a genuine faucet in reality, and it makes the legume rotation
derivable rather than a "+N bonus"). **The legume is clover** — see D43. **Out: leaching and volatilization** (rain
carries nitrate past the roots; surface manure loses ammonia). The losses stop
fertility accumulating to infinity and teach why you incorporate manure and why
you do not spread before a storm.

**D16 — Four derived reserves, not six.** D2's seeded character absorbs what the
extra reserves were being asked to do. Only what your history changes is a
reserve:

| Reserve | In | Out | Teaches |
|---|---|---|---|
| **moisture** *(shipped)* | rain, watering | ET, uptake | evapotranspiration |
| **nitrogen** *(shipped, both legs open)* | manure, legumes | uptake, leaching | the cycle |
| **organic matter** | manure, residues, roots | slow mineralization | the long game |
| **structure** | rest, roots, tilth | compaction, poaching | why you don't graze wet clay |

Seeded texture then modulates all four — sand holds little water and leaches
fast; clay holds water but poaches badly. Four reserves × ground character gives
more distinguishable, diagnosable situations than six flat reserves would.
**Organic matter earns its place on its own**: slow, built by exactly what
ranching produces, and the mechanical reason *land you farmed well is better
land* — permanence you can sell, and the reason your own survey record is worth
having.

**D17 — Poaching: ranching can hurt the farm.** Animals on wet ground destroy
structure. Every other interlock runs ranching→farming as a benefit; this is the
other direction, and it makes "put the herd on the tired field" a judgement
rather than a free move.

**D18 — The loss leg ships; downstream contamination does not.** Nitrate that
leaches goes downhill, and the water pack ships watercourses with contamination
by kind and derived downstream reachability. The commons dilemma is real and
worth having — agricultural runoff is *the* classic nonpoint-source case, with a
downstream victim who can name the upstream cause — but it is a civics build.
Shipping a shallow version here would spend a good idea cheaply.

### The animals

**D19 — The individual is the base case; the herd is the compression you apply
to animals you have stopped looking at.** The ranching slate's stance —
*"a rancher does not win over a cow"*, livestock are fungible and managed at
scale — is true of a 500-head operation and false of six goats on a quarter
acre, which is the land this game actually has. Pets settles it: **there is
never a herd of pets**, so if the herd were the base case, pets would be a
special case of it, and it obviously is not. Pets is this base case with the
compression unavailable.

**D20 — The herd is a record. It *is* the herdbook.** Not an object in a room —
a register naming these head, this composition, this age structure, on this
ground. The room's prose describes animals; there is never a herd-object to
`look` at. Chattel titles the register. **A herd is not a glob**: a glob's
members are *identical* and share one state, where a herd's members are
*unindividuated* and their states **diverge** — not a weaker version of the same
thing, the opposite thing. Not-yet-distinguished is not interchangeable, and the
management game is about the tail (the three thin ones, the lame one, the barren
cow), never the mean. Pedagogically the herdbook is the actual instrument of
animal husbandry: selection is impossible without records.

**D21 — Individuals are materialized from a seed plus a sparse overlay.** The
field pattern again: head *n* is a deterministic function of the herd's identity
and its index (`Deposit.sampleAt`'s trick, applied to livestock — *seeded, never
drawn*, so the answer was true before anyone asked), with a **sparse per-head
record of what actually happened** layered over it, because the herd must
remember head 17 while 17 is not an object. The boundary acts take the
stockman's own word: **draft** a head out into its own page, **return** it to the
tally. Returning folds its condition into the mean and destructs the object; the
asymmetry is honest, because its identity was the record, not the flesh.
**Identity is earned by being measured** stops being a metaphor and becomes the
implementation.

**D22 — `ChattelMixin` moves onto the `Creature` stack.** It is composed in
exactly one place — `lib/stuff/Thing.ts` — and `Creature` descends from `Agent`,
so **nothing alive is ownable today** and `ChattelApi.stamp` refuses a cow. The
gate is structural (`MixinApi.isChattel`), not tier-based, so one composition
line gives livestock, pets and future aquaculture per-instance ownership with
chain-of-title from shipped code. This retires the pets slate's sketched
`CompanionMixin` + `ownerPath`.

**D23 — The maturation driver, with absolute time compressed and ratios
preserved.** `Organism.age` and `lifecycleState` are persistent fields with **no
driver** — `setAge` has zero callers and `ageCurve` is a reserved comment.
Reconcile-on-read against world time walks an authored `ageCurve` on `Species`.
A game year is 30 real days, so a true cattle generation interval is a
two-to-three *real month* investment: the term that makes animal breeding
interesting is the term that would make it unplayable. **Compress the absolute
scale; preserve the inter-species ratios.** What teaches `R = h²·S / L` is that
sheep improve faster than cattle *because their generation interval is shorter*,
and that survives compression intact. Per-species authored, never hardcoded.

**D24 — Condition is derived, never stored.** The running result of the
partitioning cascade (maintenance → thermoregulation → growth → production →
reproduction): sustained surplus gains, sustained deficit loses, and **production
dies before condition does** because it sits lower in the order — the forgiveness
curve with no special case. The read ladder mirrors D4 and cooking's palate:
**by eye** a coarse band (thin / good / fat); **with your hands** a precise score,
because real body condition scoring is palpation of spine and ribs — *precision
costs an act*; **with a scale** kilos with error bars. This is phase 6's
disease-resistance term (*good husbandry is immunity*), so it must be honest here.

**D25 — Three taps, three real neglect failures.** A tap fills from the
**production slice of the energy budget** — copy `Stock`'s reset *sweep*, never
its `par` semantics, which is a faucet shape and would mint matter from nothing.

| | Behaviour | Neglect |
|---|---|---|
| **Milk** | must be taken daily | she **dries off** for that lactation; mastitis is the sharper version |
| **Eggs** | accumulate | they **spoil** |
| **Wool** | grows continuously, harvested once | a worse fleece, and a hot sheep |

Three renewable products, three genuine consequences, no invented punishments.

**D26 — Breeding: photoperiod season, parentage-seeded heritability.**
`SexedMixin` composes into every Creature and `Species.reproductiveMode` is
authored with **no reader**; gestation runs over `WorldClock`. Breeding without
heredity is multiplication, so an offspring's character is seeded **from its
parentage** — the same seeding trick on a different key. That gives selection
real traction and approximately correct response-to-selection, and the genome
later replaces the seeding function underneath an unchanged surface.

**D27 — Handling, not bond, is the individual axis for livestock.** A cow must
not have pet-love, but without *something* an individual is per-head bookkeeping.
**Handling** — temperament, flight zone, ease of working — is real animal
husbandry, earned by contact, lost by neglect, and economically consequential: a
quiet cow milks better and a flighty one hurts you. **The second clause is the
important one — see D46, where handling is a safety mechanic before it is an
efficiency one.**

**D28 — Slaughter is sober and complete.** It exists because cooking !231 needs
protein. It is work, it takes skill, and the animal is used entirely — meat and
offal to cooking, tallow to the shipped render pot, hide to leather, bone and
horn to crafting. **Make waste the thing that feels bad, not the killing.** No
minigame, no guilt meter. The density dial does the rest unaided: a number in the
herdbook is easy to cull and an animal you named is not.

**D29 — One mortality rule for every kept animal.** The family conventions say
livestock die of neglect but pets never starve. Once the individual is the base
case, the same animal cannot be mortal in a barn and immortal in a bedroom. Any
kept animal can decline to death; **the automation ladder is the protection, not
an exemption** — a hired hand covers the material floor for wages, the decline is
legible in bands the whole way down, and a pet is cheap to provision. The
player's real-life time is protected by the mitigation being always available and
cheap. *(Revises a `[DECIDED]` line in the pets slate.)*

### The roster and the economics

**D30 — Five species, each argued from unmet demand.**

| | Products | The demand it closes |
|---|---|---|
| **Chickens** | eggs, meat, manure | **the on-ramp** — a hen is to ranching what the houseplant is to farming. Laying stops in short days, so photoperiod teaches itself on day one. |
| **Sheep** | **wool**, milk, meat, sheepskin | textiles !236's sourceless `wool.yaml` and its deliberately generic `ScutchController`. Short-day breeder — the lambing rhythm. |
| **Cattle** | **milk**, meat, **tallow**, hide, draught, the most manure | cooking !231's `render-tallow`, `hearty-stew`, `fine-roast`; dairy into the shipped fermentation substrate. The investment that makes the winter-feed budget bite. |
| **Pigs** | meat, lard | **the waste converter** — `spent-grain` ships in *both* trade-brewing and trade-distilling with nowhere to go. |
| **Bees** | honey, wax, **pollination** | see D34–D39. |

Goats overlap sheep; deferred. Three tap behaviours, terminal harvest, and three
scales of commitment — a player must be able to start with six hens on a quarter
acre and never be told they are not ranching.

**D31 — Barley ships, and closes three faucets at once.** Nothing grows grain
(fruit, mint, one carrot), and `malt.yaml` ships in base-library with **no crop
behind it — brewing and distilling are both drawing malt from nowhere right
now.** Barley closes brewing, closes distilling, feeds pigs and hens, and is the
classic arable partner to a grass ley, giving the rotation's arable half
something to be.

**D43 — Clover ships, and it is the plant three other decisions already
assume.** Added after the flower pass; numbered by addition order rather than
position, to avoid renumbering. Clover is simultaneously:

- **the legume** that fixes atmospheric nitrogen (D15),
- **among the best forage** in a sward (D9), and
- **the classic bee plant** — which is why "clover honey" is the default honey
  in the real world (D37).

One plant satisfies all three, which is what makes the nutrient loop, the
pasture and the hive **one system** rather than three that happen to share a
field. It was implicit in three decisions and unstated in all of them; naming it
is a correction, not an addition.

**D44 — Saffron ships as the labour-intensive smallholder crop.** The build
otherwise specs grain, cattle and hay, **all of which want acres**, on a world
whose land scale is the 1,000 m² lot — leaving a smallholder with hens,
vegetables and nothing of value to grow.

Saffron is the most expensive agricultural product by weight in the world
because it is the hand-picked stigmas of a crocus and takes roughly **150
flowers per gram**. Its value comes from **labour intensity, not land** — the
exact inverse of grain, which is land-intensive and labour-light. That contrast
is a real agricultural-economics distinction this build could not otherwise
teach, and it hands a player with a small plot and time to spend a genuine
career on ground too small for a cow.

The harvest is the mechanism: **per-flower, by hand, in a narrow window**, which
is the whole lesson made physical rather than asserted through a price.

⭐ **The fact that unifies flowers generally**, worth carrying into the content:
*a flower is a plant's advertisement to a pollinator.* Colour, scent and nectar
exist to attract an insect — so dye, perfume, flavour, medicine and ornament are
all human interception of a signal that was never meant for us. Pollination
(D35), the dyestuffs textiles already ships, and saffron are not four unrelated
industries; they are four ways of harvesting the same evolutionary bribe.

**D32 — The pack cut.**

- **Kernel** — the soil split (a `GardenBed` is a kernel class and cannot import
  a pack, so the substrate must be kernel), the seeded ground field, the
  field-room `Location`, the maturation driver on `Organism`, the `ChattelMixin`
  move, and **handling** (pets will want it and pets is not ranching, so its
  composers share no pack ancestor).
- **`trade-ranching`** — the herdbook Idea, the verbs its own content affords
  (`draft`, `shear`, `milk`, `muck`), the venue archetype, the hand's brain.
  `feed` and `water` already ship in the platform's bulk category; reuse them.
- **The commons** — the species rows. A sheep exists whether or not anybody
  ranches; the *husbandry* is the trade, the *animal* is a thing in the world.
- **`trade-farming`** — barley, `plough`, the arable rotation.

**D33 — The farmstead archetype states needs; a locality binds them.** Ground, a
barn, water, a way to market. Proven on modest ground already owned. If Heart's
Delight can later be authored against it with **zero pack code**, mechanism and
expression were cut correctly — and we find out while it is still cheap.

**The money loop.** A ranch is a business with **working capital**, which is what
makes it feel unlike a farm. In: eggs and milk daily (small, steady — the
on-ramp's income), wool annually, meat and hide at slaughter, breeding stock at
the top end *and only if you kept records*, and manure, which you spread or
**sell to a farmer** — a real trade between the two halves of the Grange. Out:
feed, wages, fencing, and the winter budget. Nothing mints: every product is a
transform of feed, which is a transform of sunlight and soil.

### Bees

**D34 — The colony is the herdbook with the individual end amputated.** You never
draft a bee. A hive is exactly D20's record — a population with a strength,
stores and a queen, on a piece of ground — minus the promotion act, which
*validates* the primitive: if the aggregate stands alone it is a real thing, not
a compression trick. The one new term is that **a colony's strength changes on
its own**, where a herd's tally moves only when you act.

**D35 — Pollination modifies fruit set, and never gates it.** `Growing.ts` ships
`fruitSetCount`, the `_flowering` latch and an `onFloweringLatched` host hook,
and nothing uses them. Pollination improves yield; wind and self-pollination are
real for most staples, so a player with no bees is never blocked. That is what
keeps it a **positive externality** rather than a tax — and the lesson only works
if the benefit is real but hard to charge for. The apple-orchard-and-beekeeper
case is Meade's 1952 textbook externality; Cheung's *"The Fable of the Bees"*
(1973) went and looked and found **pollination contracts had existed all
along**. The work-contract substrate already ships — clauses over verifiable
conditions, escrow, a board — so a beekeeper renting hives to an orchardist for
the season is expressible with **zero new code**, and both sides of the most
famous argument in externality economics are playable.

**D36 — Forage range is relational, never radial.** Fields within a few graph
hops, or within the locality. A radius is a shape; shapes do not survive
translation to prose. Hops read as a sentence.

**D37 — Honey's character derives from what is in flower within range.** Clover
and heather honey are genuinely different. Your honey is a function of your
neighbours' land use — emergent from the field model, and a reason to care where
a hive stands.

**D38 — Swarming closes the stock faucet.** A colony reproduces by **fission**.
Catch the swarm and you have two hives, so after the first one **your own bees
make you more bees** with no vendor in the loop.

**D39 — Bees are the last wave and are explicitly cuttable.** A hive is severable
from a working ranch in a way barley and the field-room are not; the pollination
coupling is the part that would be painful to retrofit, which is why it is
designed now.

**Overwintering is the winter-feed problem inverted**: the bees store their own,
you take the surplus, and the judgement is how much to leave. Same lesson from
the opposite direction, needing no new mechanism.

### Draught animals and working dogs

**D40 — Draught power is body mass; there is no new mechanism.** `PitPony` is the
shipped precedent and its own doc says it: carry capacity derives from body mass
in the encumbrance substrate, *"the pony is better at hauling because it is
heavier, which is the actual reason, and the engine already knew it."*
`HaulingCreature` ships; hitch/unhitch ships. So **ploughing costs draught
power** — by hand it is punishing, with an ox it is work — which makes the ox a
genuine capital investment and the first rung of a mechanization ladder we never
author ahead of demand. And **an ox eats whether or not it works**: the
depreciating-asset-that-consumes insight applied to a tool, which is the honest
economics of draught power.

**D41 — A working dog is a brain plus a `Creature`.** Brains are path-resolved
modules (`wanders`, `patrols`, `maintains`, `wary`); herding is one more. A dog
**substitutes for player attention** in stock work — one shepherd with a good dog
handles a flock that would otherwise need several people.

**D42 — The dog is the exception that proves the automation ladder.** The ladder
is *by hand* (attention) → *hired NPC* (wages) → *script* (compute), under the
rule that **automation maintains your assets and cannot maintain your
relationships.** The dog is a fourth rung that costs **a relationship** — and it
does real economic work, which means a poorly bonded dog works badly. So bond
acquires an economic consequence **without giving any livestock a bond stat**:
the slate's divergence survives intact, and the pet gets a job. This is the one
place pets and livestock touch mechanically, and it is why the family is one
substrate.

### Hazard and failure

*(D45–D52, added after the hazards pass. Numbered by addition order rather than
position, to avoid renumbering.)*

**D45 — Slopes for absence, cliffs for presence, and weather is neither.** The
slates' forgiveness contract exists to protect a player **who was not there**,
and D9 originally over-generalized it into a world where nothing can hurt
anybody. Three regimes, not one:

- **What accrues in your absence is a slope.** You could not respond, so it must
  not be catastrophic — overgrazing, drifting condition, a hedge going gappy.
- **What happens in your presence can be a cliff.** You are standing there and
  can act, so a bull in a pen with you is allowed to be exactly as dangerous as a
  bull.
- **Weather is neither, because it is not a judgement on you.** Hail an hour
  before harvest is catastrophic and fair, because it fell on everyone's field
  and not only the negligent one's. That is a legitimate *environmental*
  provenance under the uncertainty doctrine, and it is what the
  [insurance slate](../slates/builds/insurance-slate.md) is for.

**D46 — Handling is a safety mechanic before it is an efficiency one.** D27 gave
tractability an economic consequence, which is the smaller half. **Quiet stock
handling exists in the real world because flighty animals injure people.**
Cattle are the most dangerous thing on a farm — a bull, and a cow with a calf.
Crushing against a gate, kicks, trampling in a race. The combat substrate already
models a heavy thing that charges, and `harm.md`'s `ConditionApi.inflict` already
delivers the consequence. **A badly handled animal is a hazard, not an
inconvenience** — which is what gives D27 its teeth and gives the player a
reason to handle stock properly beyond a yield percentage.

**D47 — The farm has its own damps, and the rescue is what kills.** The direct
analogue of the mine's bad air, riding shipped `breathableMedia`, asphyxiation
and the crisis engagement drain:

- **Manure pit hydrogen sulfide** — the signature agricultural fatality, and its
  signature is *multiple* deaths: one person goes down, the people who go in
  after them die too. H₂S also deadens the sense of smell at lethal
  concentrations, so **the warning disappears exactly when it matters**. The
  canary's dark twin, and the one hazard here that specifically punishes courage
  rather than negligence.
- **Silo gas** — nitrogen dioxide off fermenting silage.
- **Grain entrapment** — you sink in flowing grain; seconds to be trapped.
- **Cellar CO₂** — already shipped by the fermentation build.

**D48 — Hay fire, and it is the memorable one.** Bale hay too wet and microbial
activity heats the stack until it ignites — genuinely how barns burn. It reads
the moisture reserve, the fermentation heat model and `FireApi`, **all shipped**,
and it destroys the entire winter feed store *weeks after* a mistake that was
invisible at the time. Build this one first: it is the single most instructive
failure in the design, and it costs almost no new mechanism.

**D49 — Slow poisons, delivered by your own hand.** Ragwort is cumulatively
hepatotoxic and is **more palatable dried than growing**, so animals that would
step around it in a field eat it in a bale. A poison you cut, dried, stacked and
fed, months later, invisible throughout. The husbandry lesson that no amount of
attention on the day can save you from.

**D50 — Predators, and the dog's third job.** Named in the ranching slate and
dropped from the first draft: *"a real ranch threat, a fear-axis consumer, and
the one live-tick compute consumer probably worth paying for."* A fox in a hen
house **surplus-kills** — it does not take one bird, it kills everything — which
is a sudden total loss with a real and buildable defence. **A working dog guards
as well as herds and keeps deer out** (D41/D42 gain a third reason to exist), and
predators range across parcels, which makes them a **commons problem** and
therefore civics content rather than a personal chore.

**D51 — The operator gets hurt, and the farm does not stop needing work.** The
failure mode agriculture is actually famous for, and the build said nothing about
it. `harm.md` ships. An injured keeper still owes the animals their feed, which
is precisely when the automation ladder stops being a convenience and becomes the
thing that saves the herd — the wage line paying for itself in the only way that
really lands.

**D52 — Five failure shapes, deliberately varied.** The first draft was
monotonic: everything degraded gracefully. The variety *is* the texture, and
each shape teaches a different lesson:

| Shape | Example | What it teaches |
|---|---|---|
| **Sudden total loss** | fox, hail, hay fire | why you insure, why you diversify |
| **Slow poison** | ragwort, deficiency | that attention on the day is not enough |
| **The compounding cascade** | wet autumn → poached ground → poor spring grass → thin stock → hard winter | **the year that actually breaks farms** |
| **The rescue trap** | H₂S in the pit | that the second casualty is caused by the first |
| **Injury to the operator** | clearing, handling, machinery | that the farm is a body, not a spreadsheet |

**D53 — The antagonist is the year; the creature is a returning predator.** The
mine got a boss. The farmstead's structural antagonist is **winter**, and the
design already says so. Where a creature is wanted, the shape is **not a monster
with a health bar** — it is a predator that keeps coming back: named, learning,
costly, and something the whole locality has a stake in killing or living with.
The mine's cast works because it is *in the mine*; the farm's antagonist works
because it is *in the neighbourhood*, and it produces collective action rather
than an encounter.

### The lifecycle of a plot

*(D54–D60, added after the same pass.)*

**D54 — `plot` is a claim, not a field.** The first draft made plotting produce
ready-to-use ground, which is the Stardew model where the farm is already a farm.
Real ground has a lifecycle and the build owes all of it:

> **ground → claim → clear → treat → establish → maintain → *revert*.**

`plot` is step two. **Reclamation** sits between owning ground and planting on
it; **maintenance** sits between being a field and staying one.

**D55 — Seeded character's primary consequence is the cost of improvement, not
the yield.** This amends the emphasis of D2. Stony ground costs stone-picking;
wet ground costs ditching and drains; scrub and wood cost clearing; steep ground
costs terracing or refusal; sour ground costs lime. **That is why some land was
farmed for a thousand years and some was never farmed at all** — not lower yield,
but improvement costing more than it returned. It is also a far better use of
M.U.L.E.'s unequal-plots idea than a yield modifier, because the player *pays*
the difference in labour instead of reading it off a number.

**D56 — The cleared stone is the wall.** The stone walls of Ireland and New
England are the fields' own stones stacked at the edge. So stony ground is
**expensive to clear and cheap to fence** — and fencing is needed anyway for
stock (and is what bounds paddock subdivision). Zero waste, historically exact,
and it inverts an expectation in a way a player remembers.

**D57 — Improvement is a third axis, independent of character and of zoning.**
Ground carries an **improvement state** separate from its seeded character (D2)
and separate from `LandUse` — because *permission* and *capability* are different
questions and both must be satisfied. One consequence matters more than the rest:
**authored content ships land at any point on the axis**, so raw wilderness, a
working farm and a derelict one are the same object at three settings rather than
three kinds of thing.

**D58 — Improved land reverts.** Stop clearing the drains and the field goes wet;
stop cutting and scrub returns; fences fail. **Land is a maintained state, not a
permanent one.** This gives upkeep something to be other than an HP bar —
farming's own stated rule — and it puts **abandoned, reverted farms in the world
as real places**: cheap because somebody stopped, and worth buying if you will do
the work. That is the smallholder's actual path, and it is a better start than a
tidy empty plot.

**D59 — ⭐ Land improvement is capital formation, and it lands the tenant
improvement problem.** The biggest pedagogical payload in the build, and it
emerges rather than being staged. Converting labour into a durable asset is the
most tangible instance of capital anyone will meet, and on shipped substrate it
produces:

- **Why tenure matters** — you will not drain a field you might lose next year.
  This is the **tenant improvement problem**, one of the most consequential
  arguments in agricultural economics and law, and the reason long leases,
  compensation-for-improvements and the Ulster custom exist. This game has
  tenure, leases, a parcel registry and a
  [legal-code slate](../slates/builds/legal-code-slate.md): the problem lands on
  real substrate and produces real politics.
- **Why you would rent rather than buy**, answered by something other than price.
- **What you are paying for when you buy improved land** — somebody else's
  accumulated labour, *visible in the survey* (drains, walls, tilth, organic
  matter). Improvements are legible, which makes the price difference
  intelligible instead of arbitrary.

**D60 — Fauna are inhabitants, then pressure — never a monster gate.** They were
there first, which is the honest frame. **Clearing is displacement**: a badger
sett, a rabbit warren, a fox earth, boar, a wasp nest. Some leave, some return,
some object — and clearing is the heaviest work, so it is where injury lives
(D51). **And it does not end**: deer and rabbits come back for the crop, birds
take the grain, boar root a field overnight. Pest pressure is ongoing, not a gate
passed once. Defences are things already being built — fencing, hedges, the dog
(D50) — plus hunting, for which no verb exists today and which is noted as a gap
rather than assumed. **Seam, not scope:** clear too thoroughly and you lose
whatever was eating the rabbits; hedgerows exist for a reason.

**Irrigation rides water rights.** Not a separate decision because it needs no
new mechanism: the water pack ships watercourses, conduits, and rights (prior
appropriation recorded, riparian derived). Irrigating a field is therefore a
**rights** problem before it is a ditch, which is the correct order and puts the
commons where it belongs.

### The wild, the yard, and the second half of winter

*(D61–D64, added after the colony-games pass.)*

**D61 — ⭐ Forage is the reclamation income, and clearing spends it.** Clearing
(D54) is currently pure cost with no return until a crop matures. Newly claimed
ground is **wilderness, and wilderness is forageable** — which pays for the
clearing. [discovery-slate](../slates/builds/discovery-slate.md) owns the
foraging design in full (*authors write the TABLE, the world computes the
STOCK*; depletion is a choice, not a tragedy; derive-on-read, so unvisited
ground costs nothing) and **this build does not redesign it** — it consumes it.

What is new is the coupling, and it is the best thing the design has:

> **The forage declines as you clear.** You are converting a foraging commons
> into a farm — *the neolithic transition, expressed as a cashflow decision.*

Wild forage is immediate, zero-capital and low-yield per acre. Farming is
high-yield but demands capital, labour and waiting. So the player faces the
question our ancestors actually faced — **can I afford to stop gathering long
enough to start growing?** — and the answer depends on their labour and how long
they can go without income. Not narrated; budgeted.

It also gives D58's derelict farm a second life: reverted ground **has gone back
to being forageable**, which is part of why buying it cheap works.

**D62 — The dwelling's yard is the on-ramp, and the residence ladder is the same
continuum.** Manor Lords attaches production to *dwellings*: a house plot has a
backyard whose size decides what it holds — a vegetable garden, a chicken coop, a
goat shed, an apiary. That answers the smallholder problem a second way,
complementary to saffron (D44), and it costs little because residences already
ship (`HoldingWarren`, `PlatPlan`, tenure, the leased dorm room).

> **windowbox → a yard with hens → a smallholding → a farm.**

One continuum rather than two systems that meet at a boundary, and it gives the
cuttable bee wave (D39) its natural first home: **a hive in a townhouse yard.**

**D63 — Winter demands FUEL as well as feed.** Banished's most famous loop is a
supply chain — foresters, woodcutters, land — whose only purpose is not dying in
winter. This build gave winter a *feed* budget for animals and forgot a *fuel*
budget for people. We ship the fuel chain (`trade-fuel`, `char`), combustion,
thermal and `ThermalRegulation`, so **a cold house costs you**, and winter
generates demand for firewood exactly as it generates demand for hay. It is the
second half of the winter economy and it was absent.

**D64 — Predator abatement is somebody's business, not the holder's chore.** The
[guild slate](../slates/builds/guild-slate.md) already wrote the seam, verbatim:
the Wardens' demand anchor is *"hazard abatement for landholders — parcel owners
pay to clear traps/beasts."* So D50's fox is not a chore the holder grinds
through; it is **a job they hire out**, which puts it on the work-contract
substrate, gives another vocation paying demand, and keeps the commons dimension
intact. Hunting itself belongs to the Wardens and to
[hunting-slate](../slates/builds/hunting-slate.md), **not to this build** — what
farmstead owes is the seam.

### Materials, and what soil can actually be changed into

*(D65–D68, added after the materials pass.)*

**D65 — ⭐ The scale rule: you cannot change a field's texture, but a bed's is
whatever you carried there.** Farthest Frontier lets a player amend soil with
sand and clay. We must not copy it, because **it is the one soil amendment that
does not work**: shifting a texture class needs well over half the volume in
sand, and in the quantities anyone would actually spread, sand into clay makes
something closer to concrete. Correcting that misconception is worth more than
reproducing it.

The honest version is a **scale distinction, and the codebase already encodes
it**: `CultivableMixin` is documented as *"ground that holds plants: **a bulk
interior of soil**"*, and `fixedGround` exists precisely to separate *"soil in
the earth"* from *"a container of soil you can pour."*

> **A field's texture is fixed because it is the earth. A bed's is free because
> it is imported.** You are not amending a bed; you are filling it.

Which finally gives the pot → bed → field ladder a meaning beyond size, and
makes a raised bed the correct answer to bad ground rather than a smaller
version of the same thing.

**D66 — What is amendable, and with what.**

| Property | On ground | What changes it |
|---|---|---|
| **texture** | **fixed** (free in a bed) | imported mix — bed only (D65) |
| **pH** | seeded base, **offsettable** | lime up; sulfur and organic acids down |
| **organic matter** | derived | manure, compost, residues, green manure |
| **nutrients** | derived | manure, ash, bone meal, legumes (D15) |
| **structure** | derived | rest and roots build it; poaching destroys it (D17) |
| **drainage** | seeded, **physically alterable** | ditches and field drains — you do not change the soil, you change where the water goes |

**And the one amendment that genuinely does what Farthest Frontier's clay
does: marl.** Digging calcareous clay from a pit and spreading it on light land
was *the* land improvement of its era, and marl pits are still visible in field
corners. It carries lime and clay together, it is brutally labour-intensive, and
it lands exactly on D55 — **ground quality is the cost of improvement.** Marl is
how a player buys their way up the seeded-character ladder, by digging.

**D67 — ⭐⭐ Turnips ship, and the Norfolk four-course becomes derivable.** With
turnips added to barley (D31) and clover (D43), the build contains the whole
historical rotation — wheat → **turnips** → **barley** → **clover** ley — and
every term of it is already a mechanic:

- clover **fixes nitrogen** (D15, D43);
- the ley is **grazed and returns fertility in place** (D7);
- turnips are **folded** — sheep penned on the turnip field, eating it where it
  stands and manuring as they go, which is *literally* D7's `graze` row applied
  to a root crop and needs **no new mechanism at all**;
- and the rotation needs **no fallow year**, which is the entire point of it.

So a player who understands the nitrogen ledger can **rediscover the
agricultural revolution from the mechanics** rather than read about it. That is
the highest form of what this platform claims to do, and it costs one crop row.

⚠ **Author it honestly**, the same way the flowers slate handles tulip mania:
the four-course was developed more gradually and by more hands than the "Turnip
Townshend" story suggests. The mechanism is real; the great-man framing is not.

Turnips also earn their place independently as **winter fodder**, which is what
D13's feeding sequence otherwise has to buy in.

**D68 — The materials are mostly other systems' byproducts, and that is the
point.** Sorted by where each comes from, almost nothing here is net-new
substance:

| Origin | Materials |
|---|---|
| **Livestock** | manure (the return leg, D14); **bone → bone meal** for phosphorus, which closes D28's completeness ethic *into the soil*; hide, tallow, horn, sinew |
| **Barley** | ⭐ **straw** — the sleeper. It is **bedding**, and bedding plus dung is what farmyard manure actually is; and it is **thatch** for the barn |
| **The fuel chain** | wood ash, for potash |
| **Clearing** | stone — the wall (D56) and rubble for drains |
| **Mining** | **limestone**, burnt in a kiln for lime. `Kiln` ships as a class and the metal chain ships the digging, so soil amendment **couples to the mining chain** instead of inventing a source |
| **Textiles, already shipped** | `tannin.yaml` in `trade-dyeing` — **hide → leather has its reagent waiting** |
| **Genuinely new** | marl, lime, turnips, and silage if wanted (a ferment the shipped substrate supports, whose hazard is D47's silo gas) |

**The straw loop deserves its own line**, because it is the one most designs
miss: barley makes grain *and* straw; straw becomes bedding; bedding plus dung
becomes the manure that fertilises the barley. The nitrogen ledger's return leg
runs through a byproduct nobody planned for.

### What else ground can be doing

*(D69–D74, added after the land-use pass.)*

**D69 — ⭐ Ground has four modes, and D7's table only covered one of them.**
Crop, hay, graze and orchard are four hats on a single activity: **growing**.
Three others exist, each modelled after something already designed:

| Mode | The land is… | Product | Modelled like |
|---|---|---|---|
| **Growing** | a medium | the plant | the rest of this document |
| **Concentrating** | **an apparatus** | a mineral the weather deposits | new — D71 |
| **Accumulating** | **the product itself** | what took millennia to form | **mining**, not farming — D72 |
| **Being** | already what it should be | amenity | **not this build** — the [flowers slate](../slates/builds/flowers-slate.md) owns it |

The fourth is why lawns and ornamental landscaping are **out of scope here**:
land whose product is amenity is *conspicuous consumption of ground*, which is
the flowers slate's category, not the farmstead's.

**D70 — Woodland is a land use, and the wood contest becomes three-way.**
⭐ `trade-fuel` **already ships a coppice** — `hazel-stool`, `cordwood`, a hazel
species row — and its README states the seam explicitly: *"the coppice —
authored beds over the shipped `CultivableMixin`/`GrowingMixin` … **a
cut-and-regrow rotation is the seam a later build widens.**"* **This is that
build.** The coppice widens from authored beds into a managed stand on a
cut-and-regrow rotation, which is a rotation exactly like the field's, only
slower.

The pack also already names a **two-consumer wood contest** — *"the same stand
that yields charcoal yields the timber the mine shores with."* **D63 makes it
three**: firewood for heating. Winter now bids against the smelter and the mine
for one stand, which is where the fuel economy gets its teeth.

Woodland also supplies **pannage** for the pigs (D30), hedgerow material for
fencing (D56), and `ash` — whose material row **already ships** in `trade-fuel`,
so D68's potash leg needs no new substance.

**D71 — Salt: the field as an apparatus.** ⭐ *Cuttable, like bees (D39).* A
saltern does not grow salt: you admit seawater and **the weather does the work**,
which makes the field a machine and the sun its power source. We ship
temperature, humidity and wind.

Three sources, with deliberately different economics so that **place matters**:

- **Solar salterns** — free energy, but need coast, sun, and a climate where
  evaporation beats rainfall. Slow, seasonal, large.
- **Brine boiling** — works anywhere there is a brine spring, but it is
  **fuel-ravenous**, so it bids against D70's stand and D63's hearth for the
  same wood.
- **Rock salt** — straight onto the metal chain's shipped machinery.

Salt earns its place twice: it is **the** preservation input, which is what makes
D12's hard winter survivable and what the preservation slate waits on; and it is
the great civics commodity. An inelastic necessity is maximally enforceable *and*
maximally regressive to tax — the gabelle helped end a monarchy and Gandhi walked
to the sea over one — so a polity taxing salt is making a decision whose
incidence players can actually discover.

**D72 — Peat: a soil you mine.** ⭐ *Cuttable.* Peat accumulates at roughly a
millimetre a year, so a metre of it is a thousand years old. Cutting turf
**looks like farming and behaves like mining** — extraction from a stock that
does not renew on any human timescale — and it sits in the *same landscape* as
the renewable system. Same weather, same ground, opposite economics: the
sharpest available lesson about renewable versus not, taught by adjacency
instead of assertion.

It is also fuel (D63) in the places wood is not.

⚠ **And draining a bog destroys the asset.** Exposed peat oxidises and the land
**sinks** — Holme Fen has dropped about four metres since 1852, measured against
a post driven to the clay. That is the counterweight to D59's tidy account of
capital formation: **some improvements consume the thing they improve.**

**D73 — Water-managed ground, and we already ship a cranberry with no bog.**
`trade-farming` ships cranberries among Stage A's ten families and nothing models
the bog they would actually grow in. The distinctive part is the harvest:
**flood the bog and the berries float.** Rice is the sibling, and its best
teachable fact is that a paddy is flooded **for weed control, not because rice
wants standing water.**

The unifier is ground where **you control the water level**, and the water pack
ships watercourses, conduits, `SupplyState` and storage. Marsh and fen also give
reed for thatch (D68), withies, wildfowl and salt-marsh grazing.

⚠ **Draining wetland is D18's commons dilemma in physical form** — drain upstream
and you flood downstream, and the water system already derives downstream
reachability. Unlike nitrate this one has a **visible victim and an obvious
cause**, which may make it the more buildable version of that argument.

**D74 — ⭐⭐ Every extraction system in this build already has a name in one body
of law.** Peat's is **turbary** — the right to cut turf on ground you do not
own — and it belongs to a family of *profits à prendre*, rights to take produce
from another's land:

| Right | What it takes | Our system |
|---|---|---|
| **common of pasture** | grazing | the sward, D7 |
| **pannage** | pigs on woodland mast | pigs, D30 + D70 |
| **estovers** | wood | D63, D70 |
| **turbary** | peat | D72 |
| **piscary** | fish | the fishing slate |
| **common in the soil** | sand, gravel, marl | D66 |

That is not a coincidence — the medieval commons was a worked solution to
exactly the problems this build keeps arriving at. It gives
[hunting-slate](../slates/builds/hunting-slate.md)'s *ferae naturae* material a
family to sit in, and it is the legal frame the enclosure argument behind D59's
tenant-improvement problem is already half inside. **Model the rights, and the
politics of enclosure becomes available without authoring a villain.**

### Technology, and magic

*(D75–D78, added after the progression pass.)*

**D75 — ⭐ Technology is the removal of a constraint you have felt, so the
pre-industrial economy is the prerequisite and not a phase.** Read as a table of
*which constraint each tier removes*, rather than as a tech tree:

| Constraint | Prehistoric | **Medieval — this build** | Industrial | Future |
|---|---|---|---|---|
| **nitrogen is scarce** | — | manure, clover, folding (D14–D16, D67) | ⭐ **Haber-Bosch destroys it** | synthesised |
| **the season** | — | preservation and salt (D12, D71) | refrigeration + rail | closed environment |
| **motive power** | your back | **the ox** (D40) | steam | — |
| **the soil itself** | — | the field | — | hydroponics |
| **distance** | walking | the cart | the railway | **the TPA** |

Haber-Bosch is the most consequential agricultural technology in history and it
means **nothing** to a player who has not spent a winter short of manure. Every
later tier is only legible as the removal of something you felt, so building
this tier first is correct sequencing rather than a limitation.

⭐ **And the prehistoric column already ships in this build**: D61's forage *is*
the pre-agricultural mode, and clearing is the transition. The design spans two
tiers already.

**What this obliges:** name the constraint each system imposes, so a later build
can remove it deliberately. **No tech tree, ever** — trades advance by exercised
disciplines and nobody authors tech ahead of demand.

**D76 — The world is not uniform, and that is diffusion rather than
chronology.** An ox in a world with a teleport network is not an inconsistency.
**A technology spreads where its capital cost is repaid by the labour it saves**
— which is why, today, people plough with oxen a plane ride from datacentres.
Terminus has the TPA because Terminus has capital; a smallholding has an ox
because an ox is what pays there. And the game can make that visible in a way no
other medium can: **you can see the teleport network from behind the plough.**

**D77 — ⚠⚠ Magic cannot do agriculture, and the reason is arithmetic.** Run
against [arcane-science.md](../arcane-science.md) rather than assumed. `k = 1
kJ/τ` and a mid reserve is `300 τ` — so **a full reserve is 300 kJ: about three
percent of a day's food, or a hair dryer for five minutes.** Every negative below
follows from that, and none is a rule anybody has to remember:

- **It cannot fertilise.** Fixing nitrogen runs ~30 MJ/kg N — **about a hundred
  full reserves per kilogram**, against tens of kilograms per hectare per year.
  **Clover is cheaper than a wizard, permanently.**
- **It cannot irrigate.** Conjure-water is a dehumidifier, self-limiting by heat
  — the caster is the condenser and cooks on the fourth casting, for 100 mL each.
  Irrigation stays a ditch (D73).
- **It cannot heat a field or a glasshouse.** Heat is the *cheapest* delivery and
  a small glasshouse on a cold night still costs about twelve reserves an hour.
- **It cannot plough, and cannot conjure seed, manure or an animal** — matter
  creation is 9 × 10¹⁶ J/kg.

> **The entire farmstead economy is magic-proof by derivation.** Every scarcity
> carrying the pedagogy survives contact with wizards, and the price list already
> says so.

⚠ **Write it down anyway**, because "a growth spell" is exactly what gets
authored in two years by somebody who did not do the arithmetic. All three
calculations are worked in `arcane-science.md`.

**D78 — What magic *does* do here: the instrument and the hand, never the
engine.** `Perceive` is the cheapest verb — a probe and a return — and patterning
is energetically negligible. So the affordable magic is **diagnosis and
handling**:

- **Perceive·Earth reads the ground** — the top rung of D4's survey ladder, above
  the spade and the assay. Magic **joins** the instrument chain instead of
  bypassing it; and because a probe reads where you *are*, you still walk the
  field.
- **Perceive·Beast reads an animal** — D24's condition, without the palpation.
- **Control·Mind quiets a beast** — D46's handling, and the honest reason a
  hedge-witch is worth hiring at lambing.
- **Create·Light for night work**, about 8 τ an hour. The only cheap thing on the
  list.
- **Ignition, spot heat, a wasp nest, a frozen pipe.** Small energy delivered
  exactly.

⭐⭐ **And the structural result, derived from the postulate rather than
asserted:**

> **Technology is capital. Magic is labour.**

A technology removes a constraint permanently, for everyone, once it diffuses;
it scales, and it works while you sleep. Magic removes one momentarily, for one
person, and **cannot scale — because the caster is always one endpoint and their
own body is the bottleneck.** A tractor does not cook itself. That is why nothing
in this setting industrialised by magic, and why the TPA is a metered utility
rather than a wizard doing favours.

⚠ **One live consequence:** the TPA runs on mana. Any future magical farm work at
scale bids against the transport network for one supply — a competition on
already-shipped substrate.

---

## Constraints

- **No new Mongo collections.** Parcel-local persistence is the document tree
  under the owning parcel; `canAtPath` is the authority.
- **No migrations.** Content edits plus dropping the DB. Any compat/legacy/adopt
  shim is junk on sight.
- **Reconcile-on-read, no ticks.** The family clock: owned things integrate the
  full elapsed gap against world time; **only the inhabited body gets the
  far-past guard** (`MAX_REASONABLE_GAP_SEC` *drops* the interval, it does not
  clamp, and it is 4 real hours — a herd inheriting it would gain nothing across
  any absence longer than lunch). Bound long absences with a step/sample cap,
  never a time cap.
- **Seeded, never drawn.** Ground character, herd individuals and offspring are
  fields, not distributions: *must the answer have been true before anyone
  asked?* Yield never comes off a die (resolutional randomness is banned).
- **Verbs on objects.** `lint:object-verbs` census stays zero; no
  `XApi.verb(host, …)`. The `XApi` ↔ `XLogic` split is mandatory and separate
  from that.
- **Nothing instances `/lib/`.** A pack `lib/` is legal under the pack's own
  root; the kernel's is not instanceable.
- **A verb lives with the pack whose content affords it**, and a verb affordance
  is a **static on a class** — a row's `commandContributions:` is dead silently.
- **Cultivation verbs are embodied acts.** No designation at a distance; the god
  view is refused. Delegation goes through the ladder.
- **Every location plots.** `coords:` is the membership operation; a row without
  them is in no grid and inherits nothing.
- **`Collections.X`, never a string literal.** `lint:schema` gates it.
- **Anything touching the wired runtime imports `test-bootstrap`**
  (`lint:test-bootstrap`).
- **Bands are presentation, not security.** Honest opacity: coarse by eye,
  numbers with error bars through instruments.
- **`pnpm test` runs at exactly two moments** — before the MR opens, and at
  `/finalize`. Everything between is `test:near` + touched pack suites + the
  lint family, regardless of how structural a change is.

## Acceptance criteria

1. A player can `plot` a field on agricultural ground they hold, walk to it
   through its gate, and the field draws against the parcel's declared area.
2. `analyze ground` on a field returns a soil reading; the free read is a band,
   the ribbon test returns a texture class, and an instrument returns numbers
   with error bars. Two players who have sampled differently see different
   surveys of the same ground.
3. The soil mixin is composed by both `GardenBed`/`PlantPot` and the field-room;
   there is exactly one soil checkpoint implementation.
4. Ground character is deterministic from address + seed across a cold boot, and
   nothing about it is stored.
5. A sward grows under weather and soil, is consumed by animals standing on the
   field, is cut as hay, and grazing below residual measurably slows recovery.
6. Nitrogen is conserved across the loop: harvest debits the field by what the
   crop carries, manure credits it, legumes fix, leaching loses, and no path
   credits nitrogen from nowhere.
7. In winter, sward growth reaches zero, hens stop laying, and a plant in a
   warm lit room keeps growing.
8. Ewes conceive in the short-day window and lamb in late winter, driven by
   derived daylength and not by an authored date.
9. A herd exists as a record; drafting a head mints a `Creature` deterministically
   and returning it folds its condition back into the tally. Head *n* drafted
   twice is the same animal.
10. An animal's condition is derived on read, bands by eye, and yields a precise
    score only through a handling act.
11. Milk, eggs and wool each accumulate from the production slice of the energy
    budget, and each fails differently under neglect.
12. Wool reaches the textiles chain and meat/tallow reach the cooking chain from
    a real animal; `wool.yaml` carries a `biologicalSource`.
13. Barley grows, malts, and feeds animals; no shipped recipe draws malt from a
    sourceless row.
14. A hive pollinates fields in range, raising fruit set; removing the hive
    lowers yield without blocking it. A swarm can be caught into a second hive.
15. An ox hitched to a plough works ground a person cannot work at the same rate;
    a dog reduces the attention cost of moving stock, and a poorly handled dog
    does it badly.
16. The farmstead archetype states its needs and is bound by a locality that
    ships no pack code.
17. Subsystem docs exist and are the source of truth: **`docs/subsystems/soil.md`**
    (the ledger, seeded character, the survey), **`ranching.md`** (the herdbook,
    the taps, the cascade), and updates to `husbandry.md`, `smallholding.md`,
    `weather.md`/`time.md` (photoperiod) and `field-substrate-slate.md`'s
    register.
18. All lint families green; `pnpm test` green once before the MR and once at
    finalize.
19. Clover sown in a sward fixes nitrogen into the field's reserve, feeds grazing
    animals, and is read by a hive in range as forage that shapes its honey —
    the same row satisfying all three without a special case.
20. Saffron is harvested per flower within its window, and the yield per unit of
    ground is small while the yield per unit of labour is high — observably the
    inverse of barley.
21. Newly plotted ground is **not plantable**. Clearing, and the treatment its
    seeded character calls for, are required first, and two plots of different
    character demand measurably different work to reach the same state.
22. Improvement state is readable in the survey, is authorable at any setting
    (wilderness / working / derelict all ship as the same object), and **decays
    when unmaintained** — a field left alone goes back.
23. A poorly handled animal can injure the handler, through the shipped harm
    path, and handling reduces the risk.
24. A manure pit is lethal to enter unventilated, and entering to rescue somebody
    already down kills the rescuer too unless they take a precaution.
25. Hay baled above a moisture threshold self-heats and can ignite the store,
    weeks after baling.
26. A fox reaching a hen house kills more birds than it takes; a dog on the
    holding prevents it.
27. Ragwort cut into hay poisons the animals fed on it cumulatively, with no
    signal at the moment of feeding.
28. Newly claimed wilderness yields forage, and the forage available measurably
    declines as the ground is cleared toward cultivation.
29. A dwelling's yard holds production scaled to its size, and the same objects
    work in a townhouse yard and on a smallholding.
30. An unheated dwelling in winter imposes a real cost on its occupant, and
    firewood demand rises across the locality when the season turns.
31. A landholder with a predator problem can hire it solved through the shipped
    work-contract substrate rather than only solving it personally.
32. A bed's soil composition can be set by what is put in it; a field's texture
    cannot be changed by any amendment, and attempting it is refused with the
    reason named.
33. Lime measurably moves a field's pH off its seeded base, and marl improves
    light ground at a labour cost proportionate to the improvement.
34. Sheep folded on a standing turnip crop consume it in place and return
    fertility to that field, using the same path as grazing a sward.
35. A four-course rotation of wheat, turnips, barley and clover sustains yield
    across repeated cycles **without a fallow year**, and a player can verify
    that from the nitrogen ledger alone.
36. A coppice stand is cut and regrows on a rotation, and a single stand cannot
    simultaneously satisfy charcoal, mine timber and winter firewood — the
    contest is observable.
37. A saltern yields salt as a function of weather over elapsed time, with no
    plant involved; brine boiling yields it faster and consumes fuel that
    heating and charcoal also want.
38. Cut peat does not measurably regrow, and a drained peat field subsides.
39. A flooded bog can be harvested by flotation, and draining ground upstream
    changes water reaching ground downstream.
40. A right to take produce from land somebody else holds — grazing, mast, wood,
    turf — is expressible and enforceable without transferring title.
41. No spell, item or working improves a field's fertility, waters a field, or
    warms one at production scale; attempts are priced out by the shipped price
    list rather than refused by a special case.
42. A caster can read soil and animal condition as instrument-tier readings with
    error bars, and can quiet an animal — and doing so requires being present at
    the thing read.

## Slate revisions this cycle makes

Three `[DECIDED]` lines change, and the slates must be corrected at the sweep:

- **farming + ranching** — the four-use *seasonal commitment* table becomes four
  *descriptions* derived from two facts (D7).
- **ranching** — the herd stops being the default with individuals as the
  exception; the individual is the base case (D19), and the aggregate is a
  record rather than an object (D20).
- **pets** — "a pet never starves to death" becomes one mortality rule for every
  kept animal, protected by the ladder rather than by exemption (D29).

Also: the field-substrate slate's register gains **soil quality — shipped**, and
its open question *"do derived and seeded fields compose?"* is answered yes, by
multiplication (D2).

## Cross-references

**Seeding slates** — [farming](../slates/builds/farming-slate.md) ·
[ranching](../slates/builds/ranching-slate.md) ·
[field-substrate](../slates/builds/field-substrate-slate.md) ·
[pets](../slates/builds/pets-slate.md) ·
[weather (tail)](../slates/tails/weather-slate.md) ·
[towns](../slates/builds/towns-slate.md) (Heart's Delight, deferred) ·
[disease](../slates/builds/disease-slate.md) (phase 6, reads D24) ·
[discovery](../slates/builds/discovery-slate.md) (**owns foraging** — D61
consumes it and does not redesign it) ·
[hunting](../slates/builds/hunting-slate.md) (the Wardens' side of D60/D64) ·
[guild](../slates/builds/guild-slate.md) (the Wardens' demand anchor) ·
[insurance](../slates/builds/insurance-slate.md) (D45's weather) ·
[legal-code](../slates/builds/legal-code-slate.md) (D59's tenant improvement) ·
[flowers](../slates/builds/flowers-slate.md) (the social half, spun out).

**Subsystem docs** — [husbandry](../subsystems/husbandry.md) ·
[smallholding](../subsystems/smallholding.md) · [parcel](../subsystems/parcel.md) ·
[location](../subsystems/location.md) (the Warren) · [zone](../subsystems/zone.md) ·
[weather](../subsystems/weather.md) · [time](../subsystems/time.md) ·
[race](../subsystems/race.md) · [vitals](../subsystems/vitals.md) ·
[metabolism](../subsystems/metabolism.md) · [chattel](../subsystems/chattel.md) ·
[reserve](../subsystems/reserve.md) · [encumbrance](../subsystems/encumbrance.md) ·
[conveyance](../subsystems/conveyance.md) · [behavior](../subsystems/behavior.md) ·
[mining](../subsystems/mining.md) (the `Deposit` field) ·
[fermentation](../subsystems/fermentation.md) · [contract](../subsystems/contract.md) ·
[employment](../subsystems/employment.md) · [content-packs](../subsystems/content-packs.md).

**Sequence** — [living-world-roadmap](../living-world-roadmap.md) phases 4–5 ·
[farming-plan § Stage B](../plans/farming-plan.md) ·
[launch-worklist](../launch-worklist.md).

**In flight, and depended upon** — textiles MR !236 (wool's consumer) ·
cooking MR !231 (spoilage, and meat's consumer).
