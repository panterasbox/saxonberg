# Apiculture — requirements

**Kind:** feature (content-led, with **two named kernel touches**)
**Leads from:** content — a new `trade-apiculture` pack, proved at Heart's
Delight's upper bench. The two kernel touches, both settled with the user
2026-09-25: a **set-count latch** on the growth model so pollination has
somewhere to land, and **venom riding the wound** in the hazard path so worn
covering stops a sting.

Bees are the last family on the resource roster, and they are the only one
whose yield comes from **land you do not own**. A hive raises the crop of the
orchard next door whether or not anybody asked, and it is fed by flowers
nobody planted — so beekeeping is the first trade in the game that *gives* to
a commons instead of drawing it down, and the first that must be paid for
parking rather than for delivering. This build makes a colony something a
person can acquire, keep alive through a year, and take a surplus from — and
makes that surplus honest, because what you may take is what the bees did not
need.

⭐ **It is also a promise already made.** Three shipped, player-facing surfaces
mention bees today: the honeybee's own description, the clover plant (*"its
heads working with bees"*), and the husbandry clock's attention ladder, which
tells players outright that **bees want "a look every week or two"**. A player
can read all three and find nothing to keep. This build is less a new feature
than the payment of that promise.

Seeded by [apiculture-slate](../slates/builds/apiculture-slate.md); the
roster's own record of the gap is
[ranching.md § ⚠ Not built: bees](../subsystems/ranching.md), which states
that **its acceptance criterion 14 is unmet and is the follow-on's first
item.**

## What already exists

A survey of the built surface, at the level a player would recognise.

**The grammar is already fluent.** Nearly every act this trade needs is a
shipped verb:

| act | the verb that already does it |
|---|---|
| take a crop off a plant | **`harvest`** (with `pick` as its alias) — ⚠ but its subject must be a growing plant or a bed, so **it cannot take honey**; see *Surface decisions* |
| turn one input into different products by tool and method | **recipes** — data, already the mechanism behind every craft |
| stack a box on the hive | **`put`** / **`place`** |
| unseal a box | **`open`** |
| divide a colony | **`split`** — already mandated as *"divide an oversized or aggregated thing into usable units"* |
| read a creature's real condition | **`handle`** — the quiet-inspection verb, which already earns stockmanship |
| draw a product off a living animal | **`milk`** · **`shear`** · **`gather`** — three verbs over **one** mechanism, whose own source says a fourth product (honey) is *"a row on a species and a fifteen-line subclass"* |

⚠ **Three verbs are taken and must not be reused.** **`tend`** belongs to
medicine (sitting with a wounded body). **`smoke`** belongs to cooking
(preserving a cut over a low fire). **`feed`** means working compost into
soil, not feeding an animal — animal feeding lives in the pet-keeping
substrate with its own style vocabulary.

**The economics and the clock are shipped.** A product drawn off a living
animal has a settled taxonomy — some products *accrue*, some *expire*, some
are *continuous* — and neglect has a named consequence for each. Seasons are
read from **daylength, never from a date**, and the shipped example refuses in
those words (*"the days are still too long, she will not take"*). A game day
is two real hours, which makes a beekeeping year about a real month. Yield
already scales with an animal's condition rather than being handed out.

**The landscape is shipped.** Twenty-two crop varieties exist, **ten of them
fruiting** — cherry, orange, lemon, lime, grapefruit, grape, olive, juniper,
cranberry, mint — so a pollination subject is a row that already exists rather
than one to invent. Clover ships as a plant *and* as a fraction of a pasture's
sward, described in the code as *"the best forage there is, and the classic
bee plant."* Every plant already reports whether it is **in flower**.

**The hazard is shipped.** A puncture that carries a dose into the
bloodstream already has a delivery path and a banded severity ladder, and the
ladder's own description names *"a bite / sting."* Clothing already resists a
puncture **per body part**, and warmth is already derived from what you are
wearing rather than authored.

**Preservation and fermentation are shipped.** Honey's keeping quality is
already cited in the settings as the textbook case of a food too concentrated
to spoil. Fifteen maturation recipes exist across five packs, three of which
ship **no code at all** — which is the template mead should follow.

**The place is shipped, and smaller than its design.** Heart's Delight is a
six-room grain chain: a valley gate, a lane, Quist's farmstead yard, a barn, a
millsite, and one 4000 m² field called the upper bench. One farmer, one
miller, no store and no market. ⚠ The orchard town with eight farms is a
**staging document that has not been built**; its own status line says so.

**Nothing bee-shaped exists.** No hive, super, frame, queen, swarm or apiary.
No honey, no beeswax, no nectar, no pollen, no mead. **No candle anywhere in
the game**, in any pack, despite lighting pricing one. And no Discipline for
this trade.

> **Therefore what is genuinely new here is: one object and one reading.** The
> **colony** — a population with a strength, stores and a queen that is one
> thing you keep, with no individual animal beneath it — and the **forage
> read**, which asks what is in flower within range of a hive. Everything else
> is rows over shipped verbs, shipped taps, shipped seasons, shipped
> puncture-and-dose, and shipped fermentation.

## Goals

- A person can **acquire a colony** three ways — buy one, split one they have,
  or catch a swarm — and the three cost different things.
- A colony is **one thing you keep**: it has a strength, stores of honey and
  pollen, a queen, and a temper, and it is read by handling it rather than by
  a number.
- **What you may take is the surplus**, and what the colony needs to winter is
  **derived from the weather and the hive's own construction** — so the same
  colony in a thin box and a thick one are different decisions.
- A colony that is given no room **swarms**, and the swarm is a real thing
  somebody can catch — including somebody else.
- **The crop is the landscape's.** Honey's quantity and its character both come
  from what was in flower within range, so two apiaries a valley apart produce
  different honey, and nobody authored either.
- **A hive raises the yield of fruiting plants near it**, on land its keeper
  need not own.
- **Two ways to take honey**, with opposed costs: crush the comb for wax and
  less honey, or extract and keep the comb for more honey and none.
- **Wax has somewhere to go** — it makes candles, and the game currently has
  none.
- **Working a hive badly hurts**, and how badly depends on what you are
  holding and what you are wearing.
- Honey has a **high-value outlet**: mead, which ties honey up for weeks and
  sells for more.
- A neglected colony **leaves**.

## Non-goals

- **Varroa and other parasites** → [apiculture-slate](../slates/builds/apiculture-slate.md)'s
  husbandry section. Deliberately: a realm without varroa is the correct
  pre-industrial rung, and its arrival is a regional fact rather than a
  mechanism change.
- **Foulbrood and colony disease** → same slate. Cut *with* varroa so the
  build ships no half a husbandry model.
- **Robbing between colonies** → same slate; it wants the dearth model beside
  it.
- ⚠⚠ **The allergy and anaphylaxis seam** → the **pharma** build, where it
  becomes that build's first indication. **Reason it must not ship here:** the
  remedy does not exist, and a reaction nothing lifts is a death sentence with
  no counterplay, which the project's own rule forbids. It also closes
  [lineage-slate](../slates/builds/lineage-slate.md)'s open question about
  endowments, which is not this build's question.
- **Queen rearing as a vocation**, and the mating lottery → same slate. The
  queen is *kept* here; *breeding* her is a trade of its own.
- **Pollination as a paid contract** → same slate. The externality exists in
  this build; charging for it is the next ring.
- **Wax's other consumers** (comb foundation, sealing wax, waxed thread) →
  same slate. One candle discharges the obligation; pharma has already
  promised a second consumer.
- **Robbing a wild nest / honey hunting** → the **foraging** build
  ([discovery-slate](../slates/builds/discovery-slate.md)); it is a forager's
  rung, not a keeper's.
- ⭐ **The entire sugar and cane chain** → its own build, and it needs a warm
  climate that is blocked on
  [biome-normalization-slate](../slates/builds/biome-normalization-slate.md).
  It was bundled here only to feed colonies in a dearth, and that turns out to
  be satisfiable with the sugar the pantry already sells.
- **A multi-chambered-vessel substrate** →
  [chambered-vessels-slate](../slates/tails/chambered-vessels-slate.md), paid
  for by the refrigerator. A hive's boxes are ordinary contents and the
  shipped reach already covers the acts beekeeping actually performs.
- **A general "when is a tap open" rule** →
  [tapping-slate](../slates/builds/tapping-slate.md). See *Surface decisions*:
  honey does not need one.
- ⭐ **A `face` and `neck` body part** → its own small increment on the biped
  plan. It is worth doing and its best argument is not bees: there is already a
  `neck` wear slot with **no body part and no covering edge**, so a gorget
  protects nothing today; and a face part would give **disguise an anatomical
  anchor**, combat a throat cut distinct from a skull hit, and armour the
  helm/visor/gorget distinction. But the suit works at head granularity, which
  is how a bee suit is actually sold, so this build does not need it.
- **Building out Heart's Delight** (the co-op, the store, the cannery, the
  flats) → [towns-slate](../slates/builds/towns-slate.md). This build adds
  only what its own drive needs.

## Placement

**A new capability pack, `trade-apiculture`, at root `/trade/apiculture`.**

The precedent is explicit and recent: the quarrying trade's own Discipline row
states *"Every RGO trade ships one,"* and the extraction build cut a fresh
pack per trade rather than annexing mining. Beekeeping is a trade somebody
practises and can quit, so it is a trade root, not a system.

**The honeybee itself stays where it is.** Its path already sits in the
commons rather than under a trade, for the same reason milk does — *"milk is a
fact about mammals and not about the trade."* A honeybee is a fact about the
world; a hive is a thing a beekeeper owns.

**Mead ships in the winemaking pack**, by the rule the spirits already cite:
*the trade whose process makes it ships it.* Mead ferments a sugar solution
like a fruit wine and never mashes, so it is winemaking's and not brewing's.
(Braggot, which does mash, would be brewing's — and is out of scope.)

**The candle ships in the general-object library**, beside the lantern and the
sconce, because a candle is not a beekeeper's tool.

⚠ **Heart's Delight stays rows-only.** That pack deliberately ships no code,
and its README says so; adding code there would claim a namespace and break
every class reference in the locality. Everything this build puts in the
valley is a row.

**The second-instance test:** a second apiary anywhere in the realm is a hive
row and a placement. No code.

## Collisions

**Heart's Delight, and it is thinner than its reputation.** The valley is six
rooms, one farm and one mill. The upper bench is the only sky-exposed field,
carries the only plants in the locality (three wheat stands), holds three
props, and is four minutes' walk from Odell Quist's consignment shelf — which
is the same selling mechanism the general store uses, so honey has a buyer for
free.

⚠ **Three things the valley does not have, and the build must add:**

1. **Nothing dependably blooms.** Wheat is the only plant, it is
   wind-pollinated, and it reports as in flower only at maturity. The bench's
   pasture is authored with **no clover at all**, deliberately — its ground
   description says it *"never had clover on it and it shows."*
2. **No pollination subject.** Nothing in the valley bears fruit. The orchards
   and peaches on the valley gate are **prose**, not plants. ⭐ Ten fruiting
   crop rows exist elsewhere in the game, so this is a planting, not an
   invention.
3. **No private landholder.** The only title covers the whole locality and is
   held by a government group, so *"the owner refuses you"* cannot be shown.

**Who is already there:** Odell Quist (farmer, 05–19 daily, sells off a
consignment shelf, grows wheat and keeps hens in prose) and Sennet Aubry
(miller, takes a toll in kind). Quist is the natural host, the natural
pollination beneficiary, and the natural buyer. **Nothing in the valley
claims the words bee, hive, honey, wax or apiary** — they are free.

**Two name collisions elsewhere, both resolved:**

- **`smoke`** is cooking's preservation verb. This build claims **no verb for
  the smoker** — see *Surface decisions*.
- ⚠ **`pollinate`** is spoken for by farming's unbuilt plant-genetics design
  (`pollinate <A> with <B>`, crossing two plants). This build's pollination is
  a **passive consequence of a hive being near a crop**, not an act, so it
  claims no verb and the collision does not arise. Recorded so a later build
  does not discover it.

**The husbandry clock already lists bees** with their attention interval, so
the build must match what that text promises: *a look every week or two, and
almost nothing daily.*

## Surface decisions

### The colony is the animal; the queen is the only individual

A colony is one thing you keep — a strength, stores, a temper and a queen — and
individual bees are scenery. The honeybee's own row already commits to this
(*"you never draft a bee"*). **The queen is the exception**: she is what you
buy, requeen and lose to a swarm, and reading her is how you judge the colony.
So exactly one individual survives the abstraction.

*Alternative rejected:* modelling bees as a stack of thousands of animals.
Nothing a player does addresses one bee, so one bee is not an object.

### Honey needs no "when is the tap open" rule

Honey is a product drawn off a living thing, like milk and wool — but unlike
milk it has no calving date and unlike sap no thaw. **Honey accrues at a rate
set by what is in flower**, so the stores *are* the state: out of season there
is simply nothing to take, and the refusal says so. A separate rule about
whether the tap is open would be a second source of truth for the same fact.

⭐ This is the build's cheapest decision and it removes a dependency: the
general tap-window question stays with
[tapping-slate](../slates/builds/tapping-slate.md), which needs it for milk and
sap. **Hand that slate this finding** — one of its three consumers does not
need the feature.

### The smoker is not a verb

A smoker is a thing you hold that changes what happens when you open a hive —
the same shape as the veil you wear. Two mitigations, one shape, **no new
verb**, and cooking's `smoke` stays unshadowed. It is also the more honest
model: you puff smoke continuously while you work, not as a discrete act.

### ⭐⭐ Taking honey is TWO acts, so it needs no new verb argument

The act I had called one act is two: **you take a box off the hive**, and then,
at a bench, **you get the honey out of the comb.** Only the second one cares
about a tool. So:

- the colony's tap yields **capped comb**, the way the shipped animal taps
  already hand a product to whoever takes it;
- **crushing and spinning are two recipes over that comb** — one input, two
  outcomes (honey and wax, or honey and an intact comb) — and recipes already
  select their product by tool and method.

⚠ **This replaces an earlier decision that `harvest` would take honey with the
tool choosing the outcome. Both halves of that were wrong**: `harvest` requires
its subject to be a growing plant or a bed, so it refuses a hive outright; and
its controller reads the product before it looks at the tool, so a tool cannot
select between outcomes. Discovered in grounding, corrected here rather than in
the plan.

⭐ What this buys: no verb collision to resolve, no hidden branch in a shipped
controller, and the technology ladder becomes **which recipe you know and which
tool you own** — which is data, and legible.

**The verb is `rob`** — standard beekeeping English for taking honey off a
hive, unclaimed (checked), and it sits in the shipped act-named tap family
beside `milk`, `shear` and `gather`. It also resonates with the colony-on-colony
robbing this build defers. (`pull` is the modern alternative if `rob` reads as
theft.)

### ⭐ Venom rides the wound — and this is a defect fix

A sting that does not get through your clothes does not poison you. Today the
hazard path attenuates a puncture's **energy** through the covering stack and
then delivers the toxin **unconditionally** — so a boot stops a poisoned
needle's wound and the poison lands in full. The trap's own authored
description already says *"a boot mitigates."*

So: **if the covering stopped the puncture, the toxin does not land.** One
condition at one call site, it makes the shipped trap behave the way its own
text claims, and it is what makes a veil worth wearing. Settled with the user
2026-09-25.

### A hive's boxes are ordinary contents

The reach a player has into things already extends one container deep, which
covers exactly what beekeeping does: you **lift a super off** the hive and
work it on a stand; you do not fish a frame out of a standing hive. So no new
containment rule is needed here. The general multi-chambered-vessel question
belongs to the refrigerator, which reaches into a compartment in place.

### The apiary is its own Discipline

By the roster's own rule — every resource trade ships one. Handling a colony
may also exercise the shipped animal-handling competence; Disciplines are not
exclusive.

### Forage range is measured in steps, not metres

Range is a walk outward from the hive with a cost per step, so a valley with
coordinates and a corridor of rooms both degrade honestly. A player can reason
about it as *about an hour's flight*.

### Crowding must be visible

Forage is a commons with **no title**, deliberately — that is the lesson. But a
worked-over range that silently halves a crop is a hidden penalty rather than a
lesson, so a beekeeper must be able to *see* that a range is crowded. A
reading, never a gauge.

### Quist gets his bench, and a fruit crop

To make placement consent and pollination demonstrable, the bench is
subdivided to Quist as a private holding and planted with a fruiting crop. This
is content, it improves the valley on its own terms (a farmer who owns his own
field), and it is what lets a beekeeper be a **second party on somebody else's
land**.

## Lens pass

1. **Pedagogy** — a new Discipline, and one derivable equation at the centre:
   **a colony stores a surplus, and the surplus is what the winter did not
   need.** Winter demand follows from the weather and the hive's walls, so a
   player who understands it can predict it and be right. ⚠ Swarming is
   **derived from crowding, never drawn** — a rolled swarm would convert the
   whole skill into luck, and the project forbids rolling what your action did.
   The one legitimate uncertainty is *epistemic*: you do not know the queen
   until you read her brood.
2. **Expression** — the strongest result. Honey's character comes from the
   flowering census, so **an author who adds a flowering plant gets a new
   honey with no row written for it**. A second apiary is a row and a
   placement. The toolkit is instruments carrying capabilities, which is the
   shipped pattern.
3. **Immersion** — ⭐ **you heft the hive.** Weight tells you stores, entrance
   traffic tells you strength, comb tells you brood; there is no strength
   number anywhere. Expertise is discrimination, exactly as tasting is in the
   kitchen. And roleplay follows without scripting: a swarm in a tree belongs
   to whoever boxes it, and it came out of somebody's under-supered hive.
4. **Values** — the forced choice is **how much honey to take**, with the
   consequence a season away and no rule stopping you. Then crush against
   extract, and how many hives to crowd onto one range. Standing is conferred
   by the growers who have you back.
5. **Epochs** — the cleanest ladder the game has: robbing a wild nest → a
   straw skep whose comb must be destroyed → movable frames and a spinner →
   hives hauled to orchards for hire. Only **whether the comb survives**
   changes, and that is a property of the hive, not a different machine.
6. **Economy & governance** — **produces** honey, wax, colonies as capital,
   and **pollination**, which lands on somebody else's land; **consumes**
   time, woodenware, and sugar in a dearth. The demand was there first: three
   shipped surfaces already promise bees, lighting already prices a candle
   nothing makes, and fruiting crops already exist with nothing to pollinate
   them. **Who can be wronged:** a grower whose crop you decline to serve (the
   criterion is a bargain, and there is no bar); a landholder whose ground you
   want (the criterion is title, and they may simply refuse); a neighbour your
   bees sting (an apiary is an unwanted land use, and ⭐ the cultivation rules
   have **nothing to say** about a hive — it grows nothing — so whether you may
   keep bees near a road is a question for the polity, not the code); and
   ⚠ **a beekeeper crowded out of a range, who has no appeal at all, because
   forage is owned by nobody.** That one is deliberate and is the lesson —
   which is why it must be visible.

## The drive

Run in the live game before the MR opens. Starts at Quist's farmstead yard in
Heart's Delight.

1. Walk `up` to the upper bench. The bench reads as pasture **in flower** —
   clover, in words, not a number.
2. `look` at the fruit trees on the bench. They are bearing; note how much.
3. Buy a **nucleus colony** off Quist's shelf, and a **hive**, a **smoker** and
   a **veil**.
4. `put` the hive on the bench. Install the colony.
5. `handle` the hive **bare-handed and unsmoked**. You are stung. The response
   names what you should have had, and the sting reads as a sting — not as a
   fight, and not as a poisoning.
6. Put the veil on and `handle` again, still unsmoked: **fewer stings**, and the
   ones you take land where you are bare.
7. Hold the smoker too, and `handle` again. You get a **reading**:
   entrance traffic, the weight when you heft it, the brood on the comb. No
   numbers.
8. `open` the hive; `look` inside; take a frame out and look at it.
9. Let the flow run. `handle` again — the stores are heavier and the colony is
   crowded.
10. `put` a **super** on the hive before it swarms.
11. On a **second** hive, deliberately do not super it. It **swarms**. Find the
    swarm, box it, and keep it — a colony you did not pay for, out of your own
    mistake.
12. `rob` the first hive. You come away with **capped comb**, and the colony
    notices it has gone.
13. Crush that comb at the bench: you get honey **and wax**, and the comb is
    gone. Spin a second comb instead: **more honey, no wax**, and the comb
    survives to go back on.
14. Look at the fruit trees again. **They are setting more fruit than in step
    2.** Nothing was authored to make that happen.
15. Make a **candle** from the wax. Light it. It lights a room.
16. Take **all** the honey off a third hive before winter, and leave enough on a
    fourth. Run the year forward. **One is dead and one is alive**, and the
    difference is legible in what you did.
17. Put a second apiary on the same range. The forage reading says the range is
    **worked over**, in words.
18. Neglect a hive badly. It **absconds** — the box is empty and nothing died.
19. Dissolve honey in water, ferment it, and taste the **mead**. Then leave a
    jar of honey where it can take up damp, and find it fermenting **on its
    own**.
20. Sell honey on Quist's shelf. Somebody can buy it.

## Acceptance criteria

Observable from outside the code.

1. A player can get a colony **three ways** — bought, split, or caught — and
   each costs something different.
2. Handling a hive tells a player its condition **in words**, and no screen
   anywhere shows a colony's strength as a number.
3. A player who opens a hive without smoke or covering **is stung**, and a
   player wearing a veil and gloves is stung **less** — because the covering
   stopped it, not because a number was lowered. ⚠ At the granularity the body
   already has: a veil covers the head, gloves the hands. The finer
   face-versus-neck distinction is **out** (see non-goals).
4. The same sting is **one sting's worth of pain** once, and a medical problem
   thirty times, without anyone authoring the second case.
5. A player **cannot fight a colony**, and the refusal says what they can do
   instead.
6. A colony that is given no room in time **swarms**, the swarm is findable and
   catchable, and a player who supered in time keeps their crop.
7. Two hives on the same bench, one in a thin box and one in a thick one,
   **need different amounts of honey to winter**, and a player can find that
   out without being told a number.
8. A player who takes the whole crop loses the colony by spring; a player who
   leaves the surplus does not. **Nothing warned them.**
9. Honey taken beside clover and honey taken beside a different bloom **are
   different honey**, and no author wrote either.
10. Fruit trees within range of a hive **set more fruit** than the same trees
    before the hive arrived.
11. Crushing yields **wax and less honey**; spinning yields **more honey and no
    wax** — and a player can tell which they want.
12. Wax becomes a **candle** that lights a room.
13. A second beekeeper on one range **can tell** that the range is crowded.
14. A badly neglected colony **leaves**, and the player finds an empty box
    rather than dead bees.
15. Honey left damp **ferments by itself**, and honey deliberately diluted and
    fermented becomes **mead** — the same mechanism, once as a spoilage and
    once as a product.
16. Honey can be **sold** where a player already sells things in that valley.
17. A person who has never kept bees can read the husbandry clock's existing
    promise — *"a look every week or two"* — and find that it is true.
18. A second apiary anywhere in the realm needs **no new code**.

## Cross-references

**Seeding slates**
- [apiculture-slate](../slates/builds/apiculture-slate.md) — the full design,
  including everything this build defers.
- [rgo-unification-slate](../slates/builds/rgo-unification-slate.md) — binding
  rulings: bees is the last resource family and the one new shape; **honey must
  not satisfy the sugar category**; and this build defines the forage reading
  that foraging inherits.
- [tapping-slate](../slates/builds/tapping-slate.md) — owns the general
  tap-window question, which this build does **not** need; also owns the
  promotion of the tap mechanism out of the ranching pack.
- [field-substrate-slate](../slates/tails/field-substrate-slate.md) — the
  outward walk this build's forage reading is the fourth instance of.
- [ranching-slate](../slates/builds/ranching-slate.md) — the parent; bees were
  carved out of it, with its criterion 14 unmet.
- [chambered-vessels-slate](../slates/tails/chambered-vessels-slate.md) — the
  hive-as-boxes design, and why beekeeping needs none of it.
- [flowers-slate](../slates/builds/flowers-slate.md) — ⚠ shares the
  pollination-as-externality thesis; read before authoring a bee plant.
- [farming-slate](../slates/builds/farming-slate.md) — owns a **different**
  `pollinate`, as a plant-crossing act. Do not claim the verb.

**Subsystem docs**
- [ranching.md](../subsystems/ranching.md) — the taps, the attention ladder,
  photoperiod seasons, the unmet criterion.
- [husbandry.md](../subsystems/husbandry.md) — flowering, the fruit cycle, the
  limiting factors.
- [thermal.md](../subsystems/thermal.md) — the envelope, and why a hive's walls
  decide its winter.
- [spoilage.md](../subsystems/spoilage.md) — why honey keeps, and why damp
  honey does not.
- [maturation.md](../subsystems/maturation.md) — mead.
- [hazard.md](../subsystems/hazard.md), [harm.md](../subsystems/harm.md),
  [metabolism.md](../subsystems/metabolism.md) — the sting's delivery, wound
  and dose.
- [textiles.md](../subsystems/textiles.md),
  [embodiment.md](../subsystems/embodiment.md) — the veil, per part, and why a
  suit is hot.
- [time.md](../subsystems/time.md), [weather.md](../subsystems/weather.md) —
  the beekeeping year.
- [soil.md](../subsystems/soil.md), [smallholding.md](../subsystems/smallholding.md),
  [parcel.md](../subsystems/parcel.md) — the bench, its sward and its title.
- [behavior.md](../subsystems/behavior.md) — swarming and absconding as a
  colony's own conduct.
- [light.md](../subsystems/light.md) — the candle's lumens.
- [pets.md](../subsystems/pets.md) — animal feeding, for the dearth.

**Related requirements in flight**
- [return-leg-requirements.md](./return-leg-requirements.md) — also ranching's;
  no overlap (bees make no muck), but both touch the same parent slate.
