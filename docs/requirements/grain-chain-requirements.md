# The grain chain — requirements

**Kind:** feature (two new trade packs + one kernel wave)
**Leads from:** content — but with a real kernel wave beneath it (the
thermal-dose integral). First consumers of the kernel half are named
throughout and all six of them already exist.

The chain `grain → flour → dough → loaf → eaten → hungry again` is the
one `content-packs-slate.md` has used as its running worked example
since the pack architecture was designed — *"What is the first trade to
build end-to-end? Baking — but it needs milling and farming beneath
it."* Farming shipped a real cereal on 2026-09-11. This build closes the
chain: a **grist mill** that turns grain into flour, a **bakery** that
turns flour into bread that goes stale, and the retrofit that makes the
brewer and the distiller the mill's other two customers.

It also absorbs cooking's **tending wave**, because the two builds turn
out to share one mechanism. Doneness, scorch, the microbial kill and
**staling** are the same mathematical object — `∫f(T)dt` — and shipping
them apart would mean building it twice with opposite signs.

Seeded by: `cooking-slate.md` (the baker/miller pre-registration and the
audited tending-wave seam bill) · `trade-roster-slate.md` (the `baking`
Discipline decision) · `content-packs-slate.md` (the chain as the pack
architecture's worked example) · `vocations.md` (miller as a registered
GAP) · `preservation-slate.md` (the victualler boundary).

---

## What already exists

Surveyed against the tree this cycle, not recalled.

**The chain's head is built and unplanted.** `trade-farming` ships a
real barley cereal — plant, crop, seed, species (`hordeum vulgare`) and
a `barley-grain` material with a full nutrition profile — and a player
can till, sow, water and harvest it today. ⚠ But **nothing in world
content plants grain anywhere.** There is exactly one authored field in
the world (the campus home field, 400 m², currently under a clover ley),
and the farm outfit's own comment admits its produce is stubbed: *"the
growing is the smallholding's; the floor stands at target through the
sweep until a grower supplies it."* None of `roadmap.md`,
`farming-slate.md`, `husbandry.md`, `soil.md` or `smallholding.md`
mentions barley at all — they are stale relative to the content.

**The chain's tail is built and waiting.** The `Oven` ships as a
`FurnaceMixin` appliance holding 500 K with no bellows, lit with
`ignite` — and its authored prose already says *"smelling of woodsmoke
and bread."* Its only placement is the Hearthworks cookhouse, which
⚠ has **no inbound exit** and is reachable only by teleport.

**Everything the dough needs is built, and the design note for it is
already written.** `maturation.md` carries a parked bread note:

> *"Bread — designed for (D14's baking seam). The starter is a kept
> culture over a levain material, fed by a flour-water pour — **works
> verbatim**. The rise is a proofing-bowl row (Vat family) + a dough
> profile, and D3's machinery hands **over-proofing over for free**
> (finished + open + fractional `turnDays` → collapsed dough as the
> turned material). The exit from bulk is CRAFTING's: the bake is a
> recipe (dough bulk + oven heat → a tangible loaf), grade flowing
> weakest-link."*

`jar-of-barm` proves the starter's shape (a `Vat` holding a living
culture material, `starveDays: 12`, pitched and fed by `pour`).
`MaturationProfile` already carries the temperature bands a proof needs
— `stallBelowK` (a cold kitchen will not rise), `happyK`,
`damageAboveK`, `killK` (you scalded the yeast), `spontaneousLagDays`
(⭐ leave it open and wild flora take it — that *is* a sourdough
starter).

**Grade already flows end to end.** `Crop` composes `CraftedMixin`, so a
harvest carries a grade and the grower's mark; recipe input slots gate
on `minGrade`; and `Grade` derives **weakest-link**. So *lean grain
honestly makes worse bread* needs no new mechanism — it is the property
pedagogy demanded when it killed the flat `smelt` recipe in the metal
chain.

**The hunger it answers is real.** `satiation` and `hydration` are
draining Reserves (~6.9 h and ~4.6 h of *active play* at basal rates, at
the 12× clock), `carb`/`sugar` route to fast satiation, and hitting zero
spawns a starvation Condition. The clock freezes when you are away —
you get hungry from *playing*.

**What does not exist at all:** no flour, dough, loaf, bun, pastry or
pie anywhere in content; no grinding act of any kind (the winemaking
`crush` is a liquid press, and ⭐ **ore is smelted whole** — nothing in
the tree reduces a solid to particles); no milling or baking pack; no
`milling` Discipline (and none is even gapped anywhere); no `baker` row
in `vocations.md`; no mechanical-power consumer; no `maxHeatK`, so
**nothing in this game can burn** (the fixture literally named
`scorched-cutlet` just declines); and no durative cooking — `cook` is
one-shot.

⭐ **Therefore what is genuinely new here is** four things: a
**comminution + separation** act (grinding, then bolting to an
extraction rate); **one thermal-dose gauge** with six consumers;
**mechanical power** as a load on a head of water; and **two trades and
a bakery** assembled almost entirely out of shipped substrate. The
dough, the oven, the grade chain, the hunger and the retail counter are
all already there.

---

## Goals

- **Grain becomes flour by an act with a decision in it.** Milling is
  grinding *and then separating*: the miller chooses an **extraction
  rate**, and that one number trades nutrition against keeping quality
  against yield.
- **A player can bake bread from grain they grew**, end to end, and the
  bread is worse if the grain was worse.
- **Bread goes stale, and staling is not spoilage.** A loaf carries two
  opposed clocks and there is no storage that satisfies both.
- **Cooking becomes durative.** A pot on a lit fire heats toward the
  fire's temperature over time; dishes accumulate thermal dose; things
  reach done, and then go past it.
- **Anything that can be cooked can be overcooked.** One ceiling, one
  burnt outcome, six consumers.
- **The microbial kill becomes honest.** Pasteurization units rather
  than a threshold crossing, which makes a sear, a simmer and a lazy
  warm-through three genuinely different acts of food safety.
- **Milling has three paying customers on day one** — the baker, the
  brewer and the distiller — and undercuts the import faucet rather than
  being handed a monopoly.
- **A mill sits where the head is, not where the people are**, so
  haulage is priced into bread.
- **The miller stops being a registered GAP and the baker acquires a
  row**, as the first of the general store's predicted city-scale
  fragments to actually ship.

---

## Non-goals

Every one names where it goes.

- **Malting** (barley → malt) — stays the honestly-labelled import
  faucet it already advertises itself as. `malt.yaml` says *"when a
  malting trade earns its pack (the vocations demand test), the material
  moves out with it."* → a future malting pack. **This build does not
  need it**: grist is milled *malt*, bought from the counter.
- **Threshing, winnowing and chaff** — asserted in the barley crop's
  prose (*"still with a little chaff in it"*) and modelled nowhere. The
  crop arrives threshed. → `farming-slate.md`. Legitimate under the
  abstraction law only because the *growing* still costs the activity.
- **Rancidity** (the germ's oil oxidising) — a genuinely different
  chemistry from both staling and microbial growth, and a third clock is
  one too many. Wholemeal's shorter life is expressed through its
  **water activity and the shipped growth law** instead. → the
  victualler, `preservation-slate.md`.
- **The crafting-wide skill seam ("control unfixed")** — declared as
  crafting's own next wave and it touches every trade. Consequence
  accepted: doneness windows are the same width for everyone until it
  lands. → `crafting.md`'s declared next wave.
- **Confectionery** — clusters with the baker by the same
  sells-stock test, and `cooking-slate.md` pre-registers it as a sibling
  specialization. → a second wave of `trade-baking`.
- **Enriched doughs and pastry** — need dairy, and the standing tap does
  not exist. ⭐ Lean bread (flour, water, salt, leaven) is honest
  medieval baking and needs none. → `trade-baking`'s dairy-era wave.
- **Zoning enforcement.** The `industrial` land use ships
  (*"workshops, forges and furnaces"*) and **nothing consumes it**;
  `vocations.md` names the miller as its pending example. Tempting, and
  not ours. → `zoning-slate.md`, whose Left already owns *"industrial
  premises + the stockyard fight"*.
- **Ore dressing / the stamp mill.** A grist mill and a stamp mill are
  historically the same machine, and ore is smelted whole today. The
  comminution primitive is built so this is a *second consumer*, but the
  metal chain's adoption of it is → `metal-chain-slate.md`.
- **A power grid.** The mill reads a load off a head of water; it does
  not create a transmissible power network. The kernel already parks
  the supply vocabulary for a future power pack. → `mana-economy-slate.md`.
- **Cold storage / the icebox** — the other end of the temperature axis,
  and ⚠ it is the thing that would make staling *worse*, which is the
  joke. → `fridge-design-pack.md`.
- **Heart's Delight and the Delight-road flats** — the ploughed strip
  with nobody working it is flagged in-repo as future content for an
  unbuilt town. → `towns-slate.md`.
- **An acidity read for the lactic family** (sourdough's sourness as a
  number) — the hydrometer pattern with a different instrument; SG and
  ABV mean nothing for dough. → `instrumentation-slate.md`.

---

## Placement

**Two new packs, both content-led with a `src/`:**

- **`trade-milling`**, root `/trade/milling`. Owns the grinding act, the
  two mill rungs, the flour and bran materials, the `milling`
  Discipline, and the millsite.
- **`trade-baking`**, root `/trade/baking`. Owns the levain, the dough
  profile, the bake recipes, the bread, the staling axis's authored
  data, the `baking` Discipline, and the bakery.

⭐ **The second-instance test passes both ways.** A second grist mill is
rows (a millsite, a business, stones); a second bakery is rows (a
premises, an oven, a stock counter). Neither needs pack code — the
`trade-hospitality` property, where a venue pack ships no `src/` at all.

**The kernel wave** carries what no pack may own: the thermal-dose
integral, the pot-on-the-fire thermal couple, the scorch ceiling, the
comminution primitive, and the mechanical-power load. All five have
consumers outside these two packs, which is the test.

**Edits to shipped packs:** `trade-farming` gains wheat and a cereal
course on the campus field; `trade-brewing` and `trade-distilling` gain
the grist retrofit; `distribution` gains a grist line beside the malt
sack.

⚠ **Naming.** The grain mill is a **grist mill**, never "the mill" —
`trade-textiles` already ships **the Wharfside mill**, a named fulling
and spinning venue with its own agents and stock. This is exactly the
collision class the collision question exists to catch.

---

## Collisions

**Places.**

- ⭐⭐⭐ **There is already a waterwheel in this game, and it powers
  nothing.** The Cold Fell **aqueduct house** at Wharfside's edge — *"a
  squat stone building where the channel makes its last drop into the
  reservoir, with a wheel inside it turning steadily"* — is a
  `ControlStructure`, `headM: 60`, `generates: true`. Its docstring
  reads as an invitation. It is the mechanical-power seam's first
  consumer and it is already built and sited.
- ⭐ **The millsite is already chosen in a comment.** The Kestrel's
  `falls` node (500 m, channel 18 m) is annotated *"the obvious place to
  put a wheel or a dam"* and **has no location built on it**. It is the
  only open site in the world with moving water, an authored head and no
  building — between Rejection and Terminus, currently bypassed by a
  walking-only pass.
- **⚠ The Wharfside textile mill** already occupies the riverside-mill
  niche, *"a long low shed with the river running under one end of it."*
  Name collision (above); geographic near-neighbour.
- **⚠ There are no vacant premises anywhere.** No boarded shopfront, no
  disused building, no commercial unit to let. Hinkley Hills' unsold
  lots are residential garden plots; Seznick House is apartments; the
  valley crossroads is reserved for a depot. **The bakery is new build**,
  and it goes in **Terminus**, which `settlement-model.md` predicts:
  a city is where the general store fragments into
  *"greengrocer/butcher/baker/fishmonger"* — and the baker would be the
  first of those four to ship.
- **The campus home field** (400 m², behind the university farmyard,
  under a clover ley at `legumeFraction: 0.4`) is the world's only
  authored field and gains the cereal course. ⭐ It already runs the
  Norfolk four-course and the rotation is **missing its own cereal
  quarter** — the rotation test says so: *"WHEAT (stood in for by
  barley's draw — a cereal is a cereal)."*
- **The cash-and-carry** (south of the Counting-Houses) is where the
  malt sack stands at par (6 sacks, price 5) and where the grist line
  joins it. Every venue's keeper buys here.
- **⚠ The Hearthworks cookhouse** is the fullest kitchen in the game and
  has **no inbound exit** — teleport only. It is where the tending
  wave's durative cooking will mostly be *driven*, and it is not
  somewhere a bakery can be.

**People.** No baker, grocer, victualler or innkeeper exists; **no
farmer or grain-grower NPC exists anywhere.** The food cast is **Odo**
(Hearthworks cook — ⚠ his menu offers four dishes and **no bread**, and
none of his stocked ingredients are grain-derived), **Rufus Penhallow**
(the pantry hand, who consigns sugar/salt/coffee/syrup and ⚠ has no
flour line), **Wen Hartley** (the farm hand, fruit for cocktails),
**Tam Ferrier** (the cash-and-carry clerk who prices every consigned
good in Terminus, including the malt sack), and the Lounge's bar staff.

**Verbs.** `mill`, `grind`, `bake`, `knead`, `prove`, `shape` and `sift`
are all free. ⚠ **`score` is taken** — it is the social identity card
(`score`/`me`), so "score the loaf" is forbidden. ⚠ And two collisions
already ship in this neighbourhood — `butcher` (cooking *and* ranching)
and `hang` (platform inventory *and* cooking's `dry`) — so a third
claimant on either is out.

**Behaviour.** ⚠⚠ The dose integral **changes the microbial kill for
every perishable in the tree**, from ">60 °C once" to pasteurization
units. This build owns the resulting calibration pass on the ptomaine
bands, which `cooking-slate.md` already obliged and deferred.

---

## Surface decisions

### Wheat comes in — lens 1 chose

Barley is the only cereal, and it is low-gluten; the slate says the
baker's frontier **is** gluten development. A trade whose subject is
dough chemistry needs a flour that can build a crumb, so wheat ships as
one crop/seed/plant/species/material set in farming's established
pattern.

⭐ **And it pays for itself twice.** Barley grows where wheat will not —
colder, poorer ground — and makes worse bread. The growth engine already
discriminates on temperature and moisture curves, so that is a real
agronomic choice nobody has to author: the grower picks the crop the
ground will carry and the baker lives with it.

### Milling is separation, not grinding — and extraction is the miller's decision

Grinding alone would be one act with no judgment in it, which was the
whole objection to milling as a trade. The real act is grind **then
bolt**, and what the miller keeps is the **extraction rate**:

- **high extraction → wholemeal** — more of the grain, more nutrition,
  coarser, and it keeps the bran and germ, so it does not last
- **low extraction → white** — less of the grain, keeps and travels,
  feeds you less, and was historically what money bought

One number, derivable from principles, teaching where both the nutrition
and the spoilage live (lens 1) and forcing *who eats white bread* (lens
4). It reuses the shipped `nutrientAmounts` and `waterActivity` fields
and invents nothing.

### Two mill rungs, and the mill cannot be in town

**A mill wants head, not flow.** Terminus sits at the confluence — 90 m
of channel, 30 m of elevation: plenty of water, no drop. The falls has
500 m of head and 18 m of channel.

- **The hand quern** — in town, slow, no capital, anyone. The income
  floor, and the reason a player with no money can still mill.
- **The water-powered grist mill at the falls** — fast, capital,
  premises, and ⭐ **the grain must be hauled up and the flour hauled
  down.** That prices haulage into every loaf, which is the von Thünen
  shape `freight-slate.md` predicted, arriving as a consequence rather
  than a feature.

Two rungs as *rows*, per the instrument-affords-the-verb pattern — the
capital ladder, not two mechanisms.

### Mechanical power is a load on a head, not a new physics

Watershed already computes `ρ·g·Δh·Q·η` and a `ControlStructure`
already generates. A millstone consumes that figure exactly as the
shipped conduit pump does — lens 5's wall-socket property, a second
consumer of one equation. ⭐ The aqueduct house's wheel is the first
consumer and it is already turning.

⚠ Rejected: inventing torque, RPM or a rotating-shaft class. That would
be modelling at the level of the technology instead of the physics,
which is precisely lens 5's failure mode.

### One gauge, six consumers — `∫f(T)dt`

Doneness, scorch, the microbial kill, **staling**, bread's mould, and
(already waiting in the slate) scalded tea, fish's narrow window and
alcohol retention are all the same accumulator, rate-gated on
temperature, reconciled on read — the pattern `FreshnessMixin` already
proves.

⭐⭐ **Staling is that integral with the temperature term inverted.**
Retrogradation is fastest at ~4 °C, paused frozen, slower at room
temperature. Microbial growth is strictly monotonic the other way. So a
loaf carries **two opposed clocks**:

| storage | mould | staling |
|---|---|---|
| cold | stopped | **fastest** |
| room | growing | slow |
| frozen | paused | paused |

**There is no storage that satisfies both**, which is why bread is baked
daily, and why a baker's business is throughput rather than inventory.
Nobody authors that; it falls out of one inverted sign.

⚠ This is also the trap the slate pre-registered: reuse the freshness
gauge unchanged for staleness and *the icebox makes perfect toast*.

### Sequencing: the script is the sequence — lens 2 chose

Braise is ordered stages and so is bread (mix → knead → bulk ferment →
divide → shape → prove → bake). `Recipe` stays one-shot slots-and-gates;
a staged dish is a **recipe-script over one-shot stanzas**, no schema
fork. A script is data an author writes; a `Recipe` fork is a kernel
edit.

⭐ And baking is not one script, honestly: the proof is a *maturation*
that takes hours and rides the vessel, detected rather than hooked. So
the shape is **build by hand → wait → bake**, with a real wait in the
middle. That is what baking is.

### `knead` is a mix method, not a subsystem

The manual build already records mix methods (`stir`, `shake`).
Kneading is one more method word on that ladder, which keeps the
learn-by-hand-then-`make` progression the cooking trade already uses and
adds no machinery.

### The retrofit sells both, and the miller undercuts the faucet

The mash and the wash come to want **grist** (milled malt) rather than
whole malt — the distilling recipe's own comment already says *"the
distiller's grist."* The counter then stocks **both**: whole malt at
par, pre-ground grist at a markup.

Existing brewing and distilling play keeps working, and a real miller
competes with the import price rather than being handed a captive
market. That is exactly how `distribution` describes its own role — *"the
honestly-labelled imported-input faucet… the first thing a malting trade
replaces."*

⚠ Rejected: whole-malt-only. It would give the miller day-one demand by
**breaking two shipped verticals** until a mill is reachable, and Dave's
Bar sits downstream of that chain.

### The grain has to actually grow somewhere

A cereal course on the campus home field. It is the world's only
authored field, it already runs the four-course, and the rotation is
missing its cereal quarter. Without this the miller's only input is the
import faucet and the chain's head is **the data link failing closed and
silent** — the failure this repo has paid for three times.

### The bakery is in Terminus, and the stale shelf needs no new mechanism

`consign` moves custody of **the actual item**, so a consigned loaf
keeps its own clocks and goes stale on the shelf for free. Only authored
`stockLines` mint fresh clones — so an NPC bakery has eternally fresh
bread, exactly as every other NPC shop does today. Noted, not built.

---

## Lens pass

1. **Pedagogy.** Exercises `milling` (new) and `baking` (`specializes:
   cooking`), against `agriculture`, `soil-science`, `cooking` and
   `fermenting`. What is derivable without a lookup: that extraction
   trades nutrition against shelf life; that a mill belongs at the fall
   and not in the town; that water stops at 373 K so you cannot brown by
   boiling; that a cold larder stops the mould and ruins the crumb; that
   lean grain makes lean bread eight steps later. The dose integral is
   real food science (D/F values), and the kill becoming pasteurization
   units makes it *more* honest than what ships.
2. **Expression.** The ordinary case is entirely data: a flour is a
   material row, a proof is a `MaturationProfile` row, a loaf is a
   recipe, a staged dish is a script, a second mill or bakery is a
   premises plus fixtures. Bespoke: an author who wants a regional
   bread, a different extraction convention, or a wild-caught starter
   writes rows, not classes. ⭐ The system suggested its own bespoke
   idea here — `spontaneousLagDays` already meant "leave it open and
   wild flora take it", which *is* sourdough, unprompted.
3. **Immersion.** The bread box has no right answer. A mill is loud,
   dusty, and inconveniently far up a river. A loaf you baked this
   morning is worth more than the same loaf tomorrow, and everybody
   knows it without being told. Nothing here is a gauge: staleness and
   doneness read as band phrases on `look` and `smell`, and a number
   costs an instrument.
4. **Values.** The choice forced is **what you keep and who eats it** —
   extraction is literally the decision of whether to sell nutrition or
   shelf life, and the historical answer (white bread was status) is
   reachable in play without being asserted. Standing is conferred by
   the shipped grade and maker's mark: a baker's loaves carry their name
   and their verdict. Throughput is *not* rewarded for its own sake —
   bread that does not sell goes stale in your own shop.
5. **Epochs.** The quern → watermill → (later) roller mill ladder is the
   same mechanism re-parameterized: head, flow, efficiency. The dose
   integral is epoch-free — it is the physics of heat and time, and it
   is as true of a clay oven as of a thermostat. ⚠ **The gap, recorded
   as a gap:** industrial milling's real change is *roller mills making
   white flour cheap*, which inverts the class story above. Nothing
   breaks, but this build does not model the inversion and a later
   industrial wave should.

---

## The drive

Run against the running game before the MR opens. Written now.

**Part 1 — the grain exists and can be got**

1. Go to the campus home field. `look`. → The field is under a cereal
   course; the rotation reads as four-course with a cereal in it.
2. `survey` / `analyze ground`. → Soil reads honestly; nitrogen reflects
   what a cereal takes off.
3. Harvest the cereal. → You hold a sack of grain carrying a **grade**
   and **your mark**. `look` at it and both are legible.
4. Go to the cash-and-carry. `buy malt sack`. → Whole malt, at par.
   `buy grist`. → Ground grist, **at a higher price than the malt**.

**Part 2 — the quern: milling with no capital**

5. With the grain and a hand quern, `mill grain`. → You get flour. It
   took real time and it was slow.
6. `mill grain --extraction 0.9` (or the authored coarse setting). →
   Wholemeal: `look` shows it darker/coarser, and its nutrition label
   carries more than the white flour's.
7. `mill grain --extraction 0.6`. → White flour, plus **bran** as a
   residue. ⚠ Confirm the bran is a real good, not destroyed.
8. Compare the two flours' keeping: the wholemeal's water activity is
   higher and it sits closer to the growth floor.
9. Mill a **poor-grade** grain. → The flour's grade is no better than
   the grain's (weakest-link).

**Part 3 — the mill at the falls: capital and haulage**

10. Travel the Kestrel road toward the falls. → A millsite exists and is
    reachable; the room reads as moving water with a real drop.
11. `look` at the grist mill. → It is unpowered or idle until water is
    admitted.
12. Admit the water / engage the stones. → `analyze` (or the authored
    read) reports the **power available from the head**, and it is a
    figure derived from `ρ·g·Δh·Q·η`, not authored.
13. `mill` a sack here. → Much faster than the quern, per sack.
14. ⚠ Confirm the economics bite: getting the grain up and the flour
    down costs you time or a carrier. The mill is not free throughput.
15. Visit the **aqueduct house** at Wharfside. → Its wheel now reads as
    driving something, or at minimum reports its available power on the
    same seam. (The invitation in its docstring is answered.)

**Part 4 — the dough**

16. In the bakery, `look`. → An oven (unlit), a trough or proofing bowl,
    a counter.
17. `ignite oven`. → It lights, consumes fuel, and climbs toward 500 K
    **over time** (S1: it is not instantly hot).
18. Build a dough by hand: `add flour`, `add water`, `add salt`,
    `knead`. → `knead` is accepted as a mix method and recorded.
19. Leave the dough in the bowl, **open**, with no starter. Wait. →
    After the spontaneous lag, wild flora take it: you have a starter
    without having bought one.
20. Alternatively `pour` from a starter jar. → Immediate, clean start.
21. `look` / `smell` the dough while it proves. → A sensory band, never
    a number. It is visibly working.
22. Prove it in a **cold** room. → It stalls. `look` says so in prose.
23. Prove it with water hot enough to pass `killK`. → The culture dies;
    the dough does not rise. ⚠ Confirm the failure is legible, not
    silent.
24. Leave a **finished** proof open past `turnDays`. → It collapses
    (over-proofed) into the turned material. This should cost nothing to
    implement — D3 hands it over.

**Part 5 — the bake, and burning it**

25. Divide and shape the dough, then `make lean-loaf` (or `bake`) at the
    lit oven. → A tangible loaf, graded weakest-link from the flour and
    the proof.
26. `eat` a slice. → Satiation rises; the nutrition label reflects the
    flour's extraction. Wholemeal feeds you more.
27. Bake with the oven **cold**. → Declines cleanly: insufficient heat.
28. ⭐⭐ Bake and **leave it in too long**. → It **burns**. A burnt loaf
    is a real off-spec outcome, not a decline. This is the assertion the
    whole doneness annexation exists for.
29. Bake at a temperature above the recipe's `maxHeatK`. → Scorched on
    the outside; the dose integral got there faster.

**Part 6 — the two clocks, which is the point**

30. Keep a fresh loaf at **room temperature** for a day. → It stales
    slowly and begins to grow mould.
31. Keep an identical loaf **cold**. → No mould, and it stales
    **faster**. ⚠⚠ Read both loaves side by side and confirm the prose
    distinguishes *stale* from *spoiled*. They must not be one band.
32. Keep a third **frozen**. → Both clocks pause.
33. Put a stale loaf **back in the oven**. → It refreshes, at least
    partly. (Toast un-stales bread; this is real and it is the reward for
    modelling retrogradation rather than decay.)
34. `consign` a loaf on the bakery counter, wait, and `look` at the
    shelf. → The listed loaf is the **actual** loaf and it has aged.

**Part 7 — the tending wave in its own trade**

35. Put a pot of water on a lit hearth. → It heats **toward** the
    fire's temperature over time, and stops at 373 K. It does not jump.
36. Start a braise as a recipe-script over stanzas. → The stages run in
    order over game time; the dish accumulates dose.
37. Walk away mid-braise and come back. → It progressed. Interrupt it →
    it aborts legibly through the shipped engagement vocabulary.
38. Overcook a shipped dish (a roast). → It passes done and degrades.
    ⚠ Confirm this did not silently break any of the 19 shipped cooking
    recipes.
39. Sear a contaminated cut vs. warm it through lazily. → Different
    pasteurization outcomes, and the dose explains why. ⚠ Confirm the
    ptomaine bands were re-calibrated: the dose is now common, and the
    old thresholds were tuned for one authored trap ration.

**Part 8 — the retrofit**

40. As a brewer, `mash` with **whole malt**. → It is refused or clearly
    wants grist.
41. `mill` the malt into grist, then `mash`. → Works.
42. `mash` with **bought** grist from the counter. → Works, and cost
    more than milling it yourself.
43. Run an existing brewing or distilling flow end to end. → ⚠⚠ Confirm
    Dave's Bar's supply chain still closes. This is the blast-radius
    check.

---

## Acceptance criteria

Observable from outside the code. A player, not a test.

1. A player can grow a cereal, harvest it, mill it, bake it, eat it, and
   be less hungry — without buying anything.
2. The same player can taste the difference their grain's grade made,
   and the loaf's verdict names them as its maker.
3. Choosing a high extraction visibly yields darker, more nutritious,
   worse-keeping flour, and a low extraction yields white flour **plus
   bran you can still sell**.
4. A player with no money can mill by hand; a player with capital mills
   at the falls much faster and pays for the haul.
5. A player can read the power the falls makes, and the figure tracks the
   head and the flow rather than being authored.
6. A dough can be started from a bought culture **or** caught from the
   air by leaving it open, and both work.
7. A cold room stalls a proof, a scalding pour kills it, and forgetting a
   finished proof collapses it — and in each case the player can tell
   which happened from the prose.
8. **A loaf can be burnt**, and burnt is a thing you are holding rather
   than a refusal.
9. Two identical loaves stored cold and warm diverge in **opposite**
   directions, and the prose for *stale* is never the prose for
   *spoiled*.
10. Re-baking a stale loaf improves it.
11. A brewer who has never seen this build can still supply Dave's Bar.
12. A brewer who mills their own malt spends less than one who buys
    grist.
13. Every one of the 19 shipped cooking recipes still produces what it
    produced before, except that it can now be overcooked.
14. `vocations.md` no longer lists the miller as a GAP, and lists a
    baker.

---

## Cross-references

**Seeding slates**
- `docs/slates/builds/cooking-slate.md` — the baker/miller
  pre-registration, the staling trap, and the audited tending-wave seam
  bill (S1, S2, S4, S5). ⭐ Its Left loses *"the tending wave"* and
  *"the baker pack"* to this build.
- `docs/slates/tails/trade-roster-slate.md` — `baking` at ISCED-F 0721,
  `specializes: cooking`. ⚠ Its ISCED codes were written from memory and
  need checking before seeding. **No `milling` Discipline is named
  there**; this build mints one.
- `docs/slates/builds/content-packs-slate.md` — the chain as the pack
  architecture's worked example; its Left loses *"milling"*.
- `docs/vocations.md` — the demand test and the five criteria; the
  miller's two GAP rows; the absent baker row.
- `docs/slates/tails/preservation-slate.md` — the victualler boundary
  (jam is theirs, compote is cooking's; rancidity is theirs).
- `docs/slates/tails/farming-slate.md` — ⚠ its status block is **stale**:
  it says Stage B waits, and the farmstead build shipped both blockers
  on 2026-09-06.

**Subsystem docs**
- `docs/subsystems/maturation.md` — the parked bread note, which this
  build executes; the vessel-carries-the-transform rule; the
  grade-from-process decision.
- `docs/subsystems/spoilage.md` — the growth law, the bands, the kill
  this build makes honest, `lint:perishable`.
- `docs/subsystems/crafting.md` — the recipe grid, the heat gate, the
  manual build, weakest-link grade.
- `docs/subsystems/watershed.md` — the head/flow reading and the power
  equation the mill loads.
- `docs/subsystems/bulk.md` — ⚠ v1 bulk is liquid; the granular phase is
  an anticipated tail. The malt sack is the precedent a flour sack
  follows.
- `docs/subsystems/retail.md` — consignment vs. stock lines, and why the
  stale shelf needs nothing new.
- `docs/subsystems/metabolism.md` — the hunger this chain answers.
- `docs/subsystems/fire.md` · `docs/subsystems/thermal.md` — the furnace
  and the Newton cooling S1 couples.
- `docs/settlement-model.md` — the nineteen needs; *food, prepared*; the
  specialization gradient that predicts the baker.
- `docs/uncertainty.md` — the abstraction law, applied to threshing.
- `docs/design-lenses.md` — the pass above.

**Related requirements in flight**
- `docs/requirements/pets-requirements.md` · `return-leg-requirements.md`
  — no overlap; noted because both are live in sibling worktrees.
