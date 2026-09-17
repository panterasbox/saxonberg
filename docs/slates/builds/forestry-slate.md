# Forestry slate — the crop you inherit

> **Status: UNBUILT** — design surface only; ⭐ **lens pass run
> 2026-09-17** (§ below) and the open questions decided; the
> `trade-fuel` coppice panel is the accidental head start.
> **Left:** the `trade-forestry` pack (column one of the chain — growing
> and felling only) · each clearing IS ground and its stand is a
> cover on it (the field's shape, decided 2026-09-17) · felling and
> the bole · grown-plant authoring ·
> the compressed rotations, set end to end · the wood species rows · the
> silviculture Discipline · the wood above Rejection · instrument
> `epoch` stamps
> **Size:** a build — conversion (`trade-sawing`) and forest law (the
> [covenant](./land-use-covenant-slate.md)) are their own

> **Status: design surface, unbuilt, no phase gate passed.** Written
> 2026-09-03 out of the farmstead *(retired artifact)*
> land-use pass, which found that **wood has more consumers than any other
> material in the game and no producer designed for it.**
>
> ⚠ **Partly built already, and by accident.** `trade-fuel` ships a coppice
> because charcoal needed one — and its README names the seam this slate is
> for, verbatim: *"the coppice — authored beds over the shipped
> `CultivableMixin`/`GrowingMixin` … **a cut-and-regrow rotation is the seam a
> later build widens.**"* Farmstead **D70** widens it; this slate is the
> industry around it.
>
> **There is no forestry vocation in the register.** The only wood entry is
> *charcoal burner / collier*, marked shipped — which is a customer, not a
> producer.

See also: farmstead plan *(retired artifact)*
(**D63** winter fuel · **D70** woodland as a land use · **D74** the commons
rights) · [mining-slate](./mining-slate.md) + [metal-chain-slate](./metal-chain-slate.md)
(**the three-pack precedent, and the timber customer**) ·
[fire-combustion-slate](./fire-combustion-slate.md) ·
[hunting-slate](./hunting-slate.md) (forest law is one law) ·
[vocations register](../../vocations.md) · [trade-roster-slate](../tails/trade-roster-slate.md).
Substrates: [husbandry.md](../../subsystems/husbandry.md) (`GrowingMixin`) ·
[smallholding.md](../../subsystems/smallholding.md) (`CultivableMixin`) ·
[fire.md](../../subsystems/fire.md) · [mining.md](../../subsystems/mining.md)
(`TimberSet`) · [crafting.md](../../subsystems/crafting.md) ·
[materials-response.md](../../subsystems/materials-response.md) ·
[watershed.md](../../subsystems/watershed.md) (**water power**) ·
[field-substrate-slate](../tails/field-substrate-slate.md).

---

## What actually ships today

| | State |
|---|---|
| `trade/fuel/thing/hazel-stool` | a `Plant` with `harvestTemplatePath: cordwood`, **authored already-grown**, with the rotation named as a seam on the species row |
| `trade/fuel/thing/cordwood` | a `Provision` — *"the ONE supply two trades compete for: the collier chars it and the mine shores with it"* |
| `corylus/avellana` | the hazel species row |
| `charcoal`, `ash`, `brands`, `clamp` | the burn, both as things and as material rows |
| `TimberSet` (mining) | a placed `Durable` that decays and is repaired — ground support as an object |
| `material/wood/oak` | ⚠ **the only wood material in the game** |

> ⚠⚠ **A content defect to fix in passing:** `cordwood.yaml` describes *"a
> straight length of hazel"* and carries `_materialPath: …/wood/oak`. Hazel
> cordwood made of oak. It is invisible today because oak is the only wood row
> that exists — which is itself the finding.

**One wood species is the real gap.** Wood is not one material: oak for
structure and tannin, ash for anything that takes shock, hazel for hurdles and
wattle, willow for baskets, elm for water pipes because it does not rot wet,
pine for cheap boards. `materials-response` already models response as
`f(mechanism, material, construction)`, so the substrate is waiting; only the
rows are missing.

---

## ⭐⭐⭐ The crop you inherit — and it dissolves the timescale problem

A worked wood produces **two crops on two timescales from one piece of ground**,
which is the structural fact of pre-industrial forestry:

- **Coppice** — cut to the stool, regrows from the stump, a short rotation.
  Poles, rods, fuel, charcoal, hurdles, withies.
- **Standards** — scattered trees left to grow, for decades, into structural
  timber.

*Coppice with standards* is one stand doing both, and it is the sharpest
multi-timescale decision available to a player: every standard you leave shades
the coppice beneath it.

The clock is the obvious objection. A game year is **30 real days**, so a
seven-year hazel rotation is seven real months and an oak standard is
unreachable in a human lifetime of play. Farmstead **D23** already set the
policy — *compress the absolute scale, preserve the ratios* — and here it
resolves into something better than a dial:

> **Coppice is a crop you can complete. Timber is a crop you inherit.**
>
> A mature stand was planted by somebody long dead. You manage it, you harvest
> it, you decide how fast to spend it — and planting a standard is an act of
> faith for a player who does not exist yet.

**Forestry is the only industry in the game whose full cycle a single player
cannot close**, and that is not a limitation to engineer around. It is the
content. It gives the chronicle something real to hold, it makes an inherited
holding materially different from a bought one, and it is the honest reason
forests were governed by institutions rather than owners.

---

## Wood's consumers — the deepest demand list in the game

| Consumer | Product | Status |
|---|---|---|
| **the collier** | cordwood → charcoal | **ships** |
| **the mine** | timber sets | **ships** |
| **winter** | firewood | farmstead **D63** |
| **building** | structural timber, boards | the residence ladder |
| **the tanner** | ⭐ **oak bark** | `tannin.yaml` ships in `trade-dyeing`; bark is its source |
| **the pigs** | mast — pannage | farmstead **D30**, **D74** |
| **fencing** | hurdles, stakes, hedgerow | farmstead **D56** |
| **soil** | wood ash → potash | farmstead **D68**; `ash` ships |
| **basketry, hafts, wheels, barrels** | withies, ash, elm | the crafting chain |
| **brine boiling** | fuel | farmstead **D71** |

⭐ **Oak bark closes hide → leather**, which farmstead D68 left with a reagent
and no source. And bark stripping is properly seasonal — spring, when the sap
rises and the bark peels — so it is a real labour spike, not a stock you draw on.

**The wood contest is now at least four-way** for one stand: charcoal, mine
timber, hearth firewood, and construction. `cordwood.yaml` already calls the
two-way version *"the whole reason the fuel yard is a business rather than a
prop."*

---

## ⭐⭐ Deforestation is the lesson, and it must be allowed to happen

A forest is renewable **only while the cut rate stays under the growth rate**,
and that inequality is the entire subject. Exceed it and you get the documented
history: the salt towns ate their woods, navies panicked about oak, and
**coal replaced charcoal because the wood ran out.**

The game has a mining chain. So the arc is available end to end:

> **A player can be made to discover *why coal*** — not told it, driven to it by
> a stand that could not keep up.

Which means the design must **let a wood be destroyed.** Not a warning, not a
soft cap, not a regrowth timer that quietly outruns demand. A stand cut past its
increment declines, and the consequence arrives as a fuel price and a cold
winter. This is farmstead D45's cliff/slope distinction applied at the scale of
a locality rather than a player, and it is the commons problem in its most
consequential form.

---

## Silviculture — what the discipline actually is

Real, teachable, and it rides substrate we have:

- **Species by site.** Farmstead **D2**'s seeded ground character — soil, aspect,
  drainage, depth — decides what will grow well where. The survey (**D4**) is
  already the instrument.
- **Rotation length** — the coppice decision, trading pole size against
  frequency.
- **Thinning** — take some now so the rest grow better. Genuinely
  counter-intuitive and genuinely correct.
- **Regeneration** — natural seeding versus planting, and whether stock browsing
  the regrowth prevents it. ⭐ *Grazing a wood stops it being a wood* — the
  farmstead's own animals are the threat, which is why wood pasture was managed
  and fought over.
- **Stool longevity** — a coppice stool outlives the trees around it; some are
  centuries old, which is the inherited asset made concrete.

## Conversion, and seasoning is the interesting half

Felling → cross-cutting → **cleaving** (riving along the grain, strong, fast,
no mill) versus **sawing** (dimensionally accurate, slow by pit, fast by water).

⭐ **Water-powered sawing** is a natural consumer of the shipped watershed —
flow, head, and a mill site that is worth owning. It is the clearest case in the
game of a *place* having industrial value.

⭐⭐ **Seasoning** is the decision worth building. Green wood is easy to work and
then **shrinks and moves**; seasoned wood is stable and hard. Air-drying runs
roughly a year per inch of thickness, which makes a timber store a **capital
asset that appreciates while sitting still** — the same shape as the
fermentation build's cellar, on the same reconcile-on-read machinery, and a
direct consumer of the moisture model farmstead already extends.

---

## The law — and this is where estovers finally lands

Farmstead **D74** listed the *profits à prendre* and left them unowned. Wood
holds three of them, and they are named separately for a reason:

| Right | What it takes |
|---|---|
| **housebote** | wood to repair your dwelling |
| **haybote** | wood to repair your fences |
| **firebote** | wood to burn |

Together they are **estovers**, and they are limited by *reasonableness* — the
classic vague standard, which is exactly why it generated centuries of
litigation. A polity that has to decide what "reasonable" means, for a resource
that visibly runs out, is doing real legal work.

The **woodward** is the medieval office for it — an officer who guards the wood
— and it is the same shape as the gamekeeper in
[hunting-slate](./hunting-slate.md). ⭐ **Historically it was the same law**:
forest law governed *vert and venison*, the wood and the deer, together. The two
slates should share their enforcement design rather than inventing two.

---

## ⭐ A stand is a record — the pattern's fourth consumer

Herd (farmstead **D20**) → hive (**D34**) → wild population
([hunting-slate](./hunting-slate.md)) → **stand.** You do not instance five
hundred trees. A stand is **a population with an age structure and a species mix
over an area**, from which an individual materializes when you engage it — you
fell it, or it is the named oak everybody navigates by.

Its halves compose the way soil's do: **seeded character** (what grows here,
from site and biome) × **derived state** (what is left, from what has been cut).

⚠ **No regrowth timers.** Growth is an increment against a standing stock, which
is what makes the cut-rate-versus-growth-rate lesson expressible at all.

---

## Where it lives

**A `trade-forestry` pack, with the coppice moving out of `trade-fuel`**, which
becomes its customer. That is the metal chain's shipped precedent —
`trade-mining` / `trade-fuel` / `trade-smelting` as three packs over one
locality — and it is the honest supply chain: **a forester and a collier are
different trades**, and the collier buying cordwood rather than growing it is
what makes the contest real.

The **forester / woodward** is the register's missing vocation, and its demand
test passes on the consumer table above without needing a single new customer.

---

## What must not happen

- **No infinite trees, and no regrowth timer that outruns demand.** Growth is an
  increment; if it cannot be outrun, nothing here teaches anything.
- **Do not prevent deforestation.** The whole arc depends on it being possible.
- **No tech-tree unlock for the sawmill or anything else** — trades advance by
  exercised disciplines.
- **Do not instance a forest.**
- **No single "wood" material.** Species differ, and `materials-response` is
  already built to express that.

## ⚠ What the metallurgy drive handed over (2026-09-16)

Found by charring in a live browser, not by a test. Two of the three are
this slate's to answer; the first is already fixed.

- ✅ **The coppice afforded nothing.** `harvest` is contributed by
  `CultivableMixin`, not by `Plant`, so the fuel yard's loose-propped
  `hazel-stool` answered *"I don't understand 'harvest'."* to everybody.
  Cordwood — *"the ONE supply two trades compete for"* — was unreachable
  by any route, which is why four authored charcoal baskets were the
  realm's entire fuel economy and one player could end iron-making for
  that world permanently. Fixed with `trade/fuel/thing/coppice-panel`, a
  six-slot `GardenBed` whose own `props:` seat the stools. ⭐ The lesson
  to carry: **a crop propped on the floor is scenery** — the growth model
  only reaches it through ground.

- ⚠⚠ **Nothing in the game authors a GROWN plant, and this slate needs
  it.** `growthStage` is `persistent` but not `authorable`, and **zero
  shipped rows set it** — so every authored plant begins at `seedling`,
  the starter pot's peace lily included. `hazel-stool.yaml` carries a
  comment saying it is *"authored ALREADY GROWN under the
  model-consistency rule"*; nothing implements that. ⭐ This is load-
  bearing for *"timber is a crop you inherit"*: an inherited stand is
  **exactly** a plant somebody must be able to author mature. Whatever
  the mechanism is (an authorable stage, a `plantedAtGameDay`, a seeded
  age from the site), it is this build's to design — and it is the
  difference between a coppice you inherit and one you plant and outlive.

- ⚠ **The rotation is uncompressed, so the panel cannot yield.**
  `daysToStage.mature: 2500` is ≈208 REAL days at
  `WorldClockApi.DEFAULT_SCALE = 12`, and `fruitFillDays: 120` is ten
  more on top. That is the § Open questions lean — *"coppice ≈ one game
  year, so a player can complete one"* — meeting a shipped row that
  predates it. ⭐ The numbers are now concrete rather than hypothetical:
  **a smelt wants ≥2 baskets, a burn is 3 game days (6 real hours), and
  `yieldFor` turns cordwood into baskets** — so the rotation, the panel
  density and the realm's iron ceiling are ONE arithmetic chain this
  slate gets to set end to end.

## Open questions — decided by the lens pass (2026-09-17)

Each carries the limb that chose it. Sequencing and content calls that
the lenses do not decide are marked *(user)*.

- **How compressed are the rotations?** ⭐ **Coppice = one game year;
  a standard = fifteen.** Real hazel is 7 years, real oak 80–120, a
  ratio near 1:15 — *preserve the ratio* (farmstead D23) is what lens 1
  requires, and one game year (30 real days) is what makes a coppice a
  crop a player can complete. Fifteen game years is 450 real days, which
  is *inherited* in every sense that matters and still reachable by a
  realm that lasts. The shipped `hazel-stool` row (`mature: 2500`
  game-days ≈ 208 real days) is replaced, not tuned. **Lens 1.**
- **Seeded field or derived stock?** ⭐ **Both, composed** — species
  and site quality from the seeded field (the mine's `Deposit` shape,
  derived from the address, nothing stored); volume and age structure
  from the record of what was cut and planted. This is the only model
  under which *cut rate vs growth rate* is a real inequality rather than
  a timer, and it is what the mine already does. **Lens 1**, and it
  answers field-substrate's open *"do seeded and derived compose?"* with
  yes.
- **Does planting a standard need a mechanism?** ⭐ **No. It is a deed.**
  The stand's record carries the planting with the planter's identity
  (`getIdentityPath()`), the chronicle records the deed, and the payoff
  is to the chronicle and to whoever holds the wood fifteen game years
  on. Any reward machinery here would be a gauge on faith. **Lens 4.**
- **Where does the sawmill sit?** ⭐ **In `trade-sawing`, a separate
  conversion trade, and NOT in this build.** The chain generalizes the
  metal chain's three packs — *RGO trade → conversion trade → maker
  trade*: `mining → smelting → smithing`, `farming → milling → baking`,
  **`forestry → sawing → carpentry`**. The saw frame is the water pack's
  `generationW` sibling with a different working head (the grain chain's
  `GristMill` shape), and the second-venue test settles the pack: a
  sawmill in a valley with no forester needs no forestry code. Cleaving
  by hand ships here as the conversion floor (the quern rung). **Lens
  2.** Water power is therefore sawing's v1, not forestry's.
- **One enforcement design for forest law and game law?** ⭐ **Yes, and
  it is the [land-use covenant](./land-use-covenant-slate.md)** — one
  predicate over the bound instrument, act or clock; estovers, the close
  season and *no chainsaws* are rows of it. This build ships only the
  cheap half: instruments declared as arguments and stamped with an
  `epoch`. The law itself waits for the covenant build. **Lens 2.**
- **The hazel/oak `cordwood` mismatch** — ⭐ **fixed here**, because the
  wood species rows are this build's and `wood/hazel` is one of them.
- **Where is the first forest?** *(user, decided 2026-09-17)* ⭐ **The
  hill above Rejection**, from `hillside.yaml` up — no new town. Both
  shipped consumers (the collier, the mine's timber sets) are in the
  fuel yard, and the Forest of Dean is the exact historical precedent:
  iron, charcoal, coal and a royal forest on one hill, with its own
  miners' law and its own verderers' court. The wood is **common land**
  of the settlement (`landUse: wild`, group-titled), which is what makes
  the deforestation arc a commons problem and not a landlord's. Newbie-
  wilds' dark wood is the *second* forest — the zero-code test.
- **The Discipline.** *Lean:* one, **silviculture** — the management of
  a stand is the skill; felling is the craft it exercises, the way
  `geology` is exercised by `hew`. A second (felling / conversion craft)
  is `trade-sawing`'s to name if it needs one.

---

## ⭐⭐ The structural bet — an authored forest is a forest; the stand is the one thing that moves

Decided 2026-09-17 in the forests-as-venue conversation, and then
**cut back the same day** when the first draft reached for runtime
land-use conversion. The user's constraint, standing:

> *"if someone authors a forest, it's always going to be a forest … I
> don't want to try to program something that simulates the biology of
> every living organism in the game … we pick and choose where we want
> to spend our expressiveness."*

So:

- **The forest is authored, and invariant.** Its Locality, its rooms,
  its clearings and paths are written by an author and are the same
  after every reboot. A clearing is a room because an author wrote one;
  nothing carves rooms at runtime, and nothing turns a wood into a field
  or a field into anything else. If authors ever want conversion of land
  use at runtime, that is a system built then, on request — not here.
- **The stand is the one dynamic thing** — species mix and standing
  timber, drawn down by felling and restored by the increment. ⭐
  Revised 2026-09-17: it is not a filed record but **a cover on the
  ground**, the way a field's sward is — each clearing is a persistable
  location that IS soil (a sky edge, a moisture ledger), and its stand
  is a mixin on the room, so rain and drought reach the trees and
  `look` reads it as the room's own prose. A wood is the sum of its
  clearings. Its terminal state is **an empty forest**: the prose still
  says trees, the record says there is nothing left to cut, and the
  collier's baskets stop filling. That is the whole deforestation lesson
  and it needs no conversion — a depleted seam is still a mine, and the
  mine already works exactly this way.
- **The lifecycle is abstracted to what a player can act on.** A
  coppice is *cut → regrowing → ready* on a one-game-year rotation; a
  standard is *sapling → mature* over fifteen, plus the deed of having
  planted it. Two stages and an increment. Nothing per tree, no
  succession model, no biome drift.
- **The forest-as-field survives only as numbers rooms READ** — canopy
  for the light model, species-by-site for what grows there, the
  stand's volume — the way rooms already read a biome. It never creates
  a room. *Getting lost* is a venue outcome an author writes (a lean on
  the address walk, a room with no landmark), not an engine that
  materializes wood off the path.
- **Assarting** — the medieval clearing of woodland for farmland — is a
  word the pedagogy teaches and a thing an *author* does when they write
  a farm where the wood used to be. It is not a verb.

**Why lenses 1 and 2 still choose this.** Honest (lens 1): darkness,
concealment and the year the wood fails all derive from values the
stand and the biome carry, nothing asserted in prose. Expressive (lens
2): the ordinary case is a biome row, a stand row and a handful of
clearings, no code; a second forest is a second Locality; and the
bespoke case — the grove, the talking oak, the wood that will not let
you leave — is an author's room, not an engine feature. ⚠ The
antipattern it exists to make unwriteable is still the MUD forest —
forty rooms of *"You are in a forest. Exits: n s e w."* — and the
answer is fewer, better clearings over one stand, not a generator.

⭐ **The doctrine underneath, worth carrying to every RGO:** expression
is an **inelastic resource** — NetHack, Dwarf Fortress and the board
games spend a fixed alphabet with great care — and the game's dynamism
comes from *everyone being an author*, so the code is always changing,
not from one codebase simulating every outcome. Abstract the parts of a
lifecycle that are meaningful to the player and that the platform can
persist and compute; leave the rest to the next author.

---

## Lens pass (2026-09-17)

1. **Pedagogy** — **silviculture** (new Discipline: rotation, thinning,
   species by site, regeneration, *grazing a wood stops it being a
   wood*), riding `soil-science`'s survey and `geology`'s site reads;
   **ecology** (succession after a cut, canopy → understory, the edge
   effect); **wayfinding** (sun, slope, water downhill — celestial and
   watershed are built); **legal history** (*forest* as a jurisdiction,
   estovers, assarting). Derivable throughout: a player who understands
   canopy predicts the dark; one who understands the increment predicts
   the year the wood fails. ⚠ **Gap:** wayfinding as a *Discipline* has
   no home — `awareness` is close; decide at requirements. Being lost
   is authored, not generated.
2. **Expression** — the ordinary case with no code: a biome row
   (`outdoor/forest`, canopy attenuation, humidity, the sound/smell
   MML), a Locality with a handful of clearings that have coords, a
   stand field over the zone, a `stocks:` table, a collier with a brain.
   The bespoke case: the grove over a mana field, the talking oak as a
   `Cast`, the wood that won't let you leave. ⭐ The test passes twice: a
   second forest (newbie-wilds' dark wood) needs zero pack code, and a
   second *use* of the same wood (a hunt, a coven, a smuggler's route)
   needs no forestry code at all.
3. **Immersion** — the sim's existing honesty pays out hardest here
   without a line of script: ⭐ **darkness under canopy is the light
   model working**, so the metallurgy drive's *"every object reads
   'something'"* finding is now load-bearing for a whole venue, not a
   polish item; rain arrives late under canopy (a biome pin);
   concealment bands are high by default so ambush and the deer that saw
   you first fall out of `stealth.md`; cold + wet + night are thermal +
   weather + celestial; the campfire in the clearing is a shipped
   thermal precedent; the collier — historically a man who lived in the
   wood for the days a burn takes — is the resident NPC and a shipped
   trade. ⚠ **Gap:** the room/object light disagreement must be fixed
   before the first wood ships, or the venue is unreadable.
4. **Values** — the choices forced: cut past the increment or not (the
   deforestation arc, *why coal*); take the last cordwood from the
   shared panel; plant a standard for somebody unborn; extend the count
   into the woods or leave them outside (newbie-wilds' *counted vs
   uncounted* geography already lives here); what *reasonable* estovers
   means when the wood is visibly running out. Who confers standing: the
   **woodward** (the Wardens; *vert and venison* being one office), the
   settlement that holds the common, and — for the standard — **the
   chronicle**. ⚠ **Gap:** Rejection has no woodward seat; the co-op's
   `office` substrate is where one goes, and that is content, not code.
5. **Epochs** — holds by construction: prehistory (the forest *is* the
   world), medieval (the royal forest, coppice, the charcoal economy —
   **where this ships**), industrial (the timber boom, clear-cut, Muir
   vs Pinchot), modern (the managed forest, wildfire, the campsite),
   future (the last forest; the wood that grew over the ruins — a
   pre-Fallow wood is the most this-game forest imaginable). Mechanism
   constant: light, increment vs cut, concealment, jurisdiction. Only
   the axe changes — so the axe, billhook and framed saw ship with
   `epoch: medieval` and the chainsaw is one row away, gated by the
   covenant, not by code.

**What the pass changed.** The slate leaned toward building the
industry first and letting the forest be its venue; the pass inverts
that — *the forest is the venue and forestry is the mechanism by which
it becomes anything else*. Conversion left the build (lens 2, the
three-pack chain). The law left the build (lens 2, the covenant). The
stand-as-the-one-moving-thing entered it (lenses 1 and 2), and runtime
land-use conversion was ruled out by the user. Nothing else moved.

## Dimensions of a tree — what the design expresses, and what it leaves (2026-09-17)

Run after the plan, when the user asked what *bigness* forces and
whether every dimension of a tree has a home. The answers, and the
gaps, so nobody re-derives them.

### ⭐ A tree has three representations, and each answers different questions

| representation | what it is | use it for |
|---|---|---|
| **a record** | a number in a stand — *twenty-four oaks* | inherited stock; anything never looked at singly |
| **a slot-plant** | a real `Plant` in a bed slot, on the growth model | anything tended, cut or planted — *yours* |
| **a prop** | a `Plant` (or a detail) propped in a room | the landmark oak, the hanging tree — scenery **by design**; never harvested, never a record |
| ⭐ **a place** | a **column of Locations** sharing the tree's `x, y` at `z: 0, 1, 2…`, joined by `climb` exits | the treehouse — see § Anatomy below; the tree at its foot is a *prop*, so nobody can fell a tree with a house in it |

Every later question — can it burn, can I climb it, can a deer eat it,
does it seed — has a different answer per representation. The forestry
doc opens with this table.

### ⭐ Anatomy — a tree's parts are five primitives, not one class

Asked 2026-09-17 with two inverse cases: *a tree in a house* (the
Christmas tree, end to end) and *a house in a tree* (the Swiss Family
Robinson treehouse). Both work on shipped primitives once the parts
are placed where they belong:

| part | what it is to the engine | exists |
|---|---|---|
| **roots** | the interface to the ground — the bed or field, the `root` limiting factor, the nutrient draw | ✅ |
| **trunk** | a **detail** to look at; an **exit** to climb (`ClimbableMixin`, the `climb` mode, an `Adornable` ladder); a **bole** once felled | ✅ |
| **branches** | **slots** — where things hang, sit, nest (`SlottedMixin`: `accepts`, `capacity`, `postures`) | ✅ (⚠ no `hanging` posture word) |
| **leaves / canopy** | not on the tree: the **room's** light and biome, and litter → the soil ledger | ✅ authored |
| **bark · mast · sap · resin** | products | ❌ the multi-product gap |
| **the stool / stump** | the part that persists a cut — why coppice regrows | ✅ the stool row |
| **the crown** | logs when it falls | ✅ |

⚠ The tempting wrong answer: the `sessile` `BodyPlan` is **empty on
purpose** (zero slots, zero ports). A tree's anatomy is details and
slots, not body parts; felling is labour, not harm.

**The tree in the house** — a Christmas tree walked end to end: a
panel of spruce on an eight-year rotation → *a good one* is the
harvest **grade** and its appearance → `fell` a small tree yields **the
tree itself**, one carryable object (⭐ *the felling product is sized by
the tree* — plan D3/D4, in) → carried home → stood in a **stand that is
a pot with water and no soil** (a slotted thing with a moisture reserve
you `pour` into; a rootless tree's vigor declines by the model that
exists, dries, and is `Combustible` in a lit room — the Hearthworks
fire) → decorated (ornaments are `Slottable`; the branches are a slot)
→ presents **on the skirt** (a surface — literally true) → taken down →
firewood, or the tip. A Plant that died is still a Plant, made of wood;
nothing changed class. Three gaps it exposes: **`hanging`** as a slot
posture (one vocabulary word, whoever hangs the first thing); **there
is no *under*** — the spatial model has *in* and *on* only, and that is
a spatial-substrate question (under the bed, under the floorboards),
filed there, not forestry's; and the **tree-in-a-stand** as a seam for
whichever pack wants a solstice.

**The house in the tree** — the fourth representation, and the rule
that makes it work without nesting containers is the engine's own:
*Locations, not rooms; every location plots.* Roots = the clearing at
`z: 0`, propping the tree as a landmark with `details: {trunk, roots}`
and `ClimbableMixin`. Trunk = the exit `up`, mode `climb`, adorned
with the rope ladder — sealable, so pulling the ladder up seals the
house, which is the whole point of that book. Limbs = Locations at
`z: 1, 2, 3…` on the clearing's `x, y` — **in the tree's column, not in
the tree**; the tree is not a `Container`. The platforms are
`SkyExposed` (rain gets in). Canopy = the biome above. ⭐ *What the
outside looks like from inside* is **built**: a `Window` is a shipped
`Boundary` implementing `LineOfSight` + `LightConduit` + `SoundConduit`,
and an open exit already leaks light and sound both ways — a person on
the platform hears the clearing. Subdividing the tree into rooms = the
residence ladder (*a holding is a warren one level down*): a treehouse
is a holding whose spine is a climb, in a sub-zone with a **small
cell** (a platform is 4 m across and lux is lumens ÷ cell², so a
lantern on it reads *bright* only if the zone says so — the Ferrow
warren nested in Rejection is the precedent). And the doctrine pays at
the seam: **a tree with a house in it is a prop, and a prop is never
fellable** — if an author wants the Robinsons' fig to come down, that
is their storm, not a verb.

### Bigness — a tree is the first `Thing` whose product exceeds a body

| what size forces | state |
|---|---|
| a standing tree cannot be carried, moved or contained; its slot is the ground | ✅ the panel's mass; the slot |
| ⭐⭐ **felling leaves something on the floor nobody can lift** | ✅ **the bole** (decided 2026-09-17): the trunk lies where it fell, ~675 kg of oak; cross-cutting takes lengths off it one act at a time; it is the seam sawing attaches to and the sledge's first real load |
| its lifetime exceeds the player's | ✅ inherit |
| its number exceeds instancing | ✅ the record |
| it is a *place* — things nest in it, hang from it, shelter under it | ⏸ the prop representation grows into this (a surface, a posture slot); a landmark must never be a record |
| it changes the room — canopy light, late rain, sound | ✅ authored on the room/biome; the room *is* the canopy |
| **it burns as a whole** | ❌ a forest fire is an operation on the record; nothing does it → fire-combustion |
| **it has several products over a year** — bark (spring, the tanner), mast (autumn, the pigs), poles (winter), sap, resin | ❌ one harvest product per plant; the consumers are farmstead's and the tanner's |

### The axes, and where each lives

- **Leaf habit — deciduous · evergreen · marcescent** (oak and beech
  hold dead leaves through winter). Lands on the growth profile's
  `coldStopK`: deciduous stops cold, evergreen crawls. Winter light
  under a bare canopy is a light-model tail, not a tree question.
- **Conifer vs broadleaf** is a different axis and lands on the
  *material* (softwood/hardwood = density + hardness; resin = heat of
  combustion) and the species' `reproductiveMode` (cones vs flowers).
- **Fruiting · flowering · fruitless · and dioecious.** The polycarp
  latch covers *sets seed at maturity*. **Masting** (oak and beech seed
  heavily some years and not others — why pannage was a gamble) is the
  profile's own deferred *alternate bearing* dial. ⭐ **Willow and yew
  are dioecious** — only the female seeds — and `Species.sexDeterminationSystem`
  already says so; nothing reads it. A planted willow that never sets
  seed is a derivable fact the engine has the data for and no mechanism.
- **Seed vs sapling.** Real forestry plants two-year transplants from
  a nursery. The pieces exist — a pot is a bed of one; `transplantDifficulty`
  is on the growth model — so *acorn → pot → transplant → panel* is the
  nursery ladder with no new engine **if** a seedling can be moved bed
  to bed (verify; the plan plants seed directly for v1).
- **Form — coppice · pollard · standard** are management states of an
  *individual*, not species (a hazel can be a standard; pollarding is
  the wood-pasture answer to grazing). A row per shipped form today
  (`hazel-stool`, `oak-standard`); a **stamp on the instance** later,
  the way fit stamps a garment. ⚠ Do not add `oak-stool.yaml` as the
  third row — that is the signal to build the stamp.

### Gaps the plan carries knowingly

- **No age structure in the record** — standing, capacity and an
  increment per species; *how old* is prose and the plantings list.
- **Shade is asserted, not modelled** — *every standard you leave
  shades the coppice beneath it* is the slate's sharpest sentence and a
  standard in a panel lowers nobody's lux. v1 does not claim it in
  prose; later, a standard in a panel lowers the panel's sampled light.
- **Browse** — *grazing a wood stops it being a wood* wants a sixth
  limiting factor that hunting and ranching drive.
- **The bole is not persisted** and no act hauls it — a felled trunk
  left in the wood is the wood's again after a restart, and moving one
  is the transport pack's day.

## Scope guardrails

- **Reuse the growth model.** `GrowingMixin` and `CultivableMixin` already run
  plants on reconcile-on-read; a stand is a density decision, not a new engine.
- **No new Mongo collections.**
- **The wood species rows are the cheapest high-value work here** — one material
  row per species unlocks `materials-response` behaviour that is already built.
- **If this is cut for scope, cut conversion before the stand.** The stand and
  the cut-rate-versus-growth-rate inequality are the lesson; sawing is a
  convenience on top of it.
