# Forestry slate — the crop you inherit

> **Status: PARTIAL** — the `trade-forestry` pack shipped (MR !262,
> 2026-09-18) → [forestry.md](../../subsystems/forestry.md): a `Wood`
> location that IS ground with a `StandMixin` cover, `fell` and the
> bole, the persistable coppice `Panel` on a one-game-year rotation,
> planting a standard with the deed written by the ground, eight woods
> + eight trees, `silviculture`, the Hanging Wood above Rejection as rows
> only, `ToolMixin.epoch` (a closed vocabulary, unread).
> **Left:** the four seams the doc defers, which have no body section
> here — `analyze wood` + a per-wood roll-up · partial yield below ripe ·
> the Cover seam (Sward + Stand → a kernel `lib/husbandry/Cover`; the
> stand's moisture factor integrated stepwise) · a planted standard
> folding into `mix[].standing` at maturity — plus this slate's own open
> design: multi-product wood (oak bark → the tanner, mast → pannage, the
> spring spike) · the silviculture curriculum (species by site, thinning,
> regeneration, browse, stool longevity) · conversion + seasoning ·
> forest law — estovers, the woodward · the seeded half of the seeded ×
> derived model (the site character for a Wood, soil.md's third-consumer
> rule) · the wayfinding Discipline's home · a woodward seat for
> Rejection · a second authored wood · the tree's anatomy tail (the
> `hanging` posture, the tree-in-a-stand, the treehouse column, *there is
> no under*) · fire on the stand · the tree axes (leaf habit →
> `coldStopK`, masting, a reader for `sexDeterminationSystem`, form as a
> stamp, the nursery ladder) · shade, age structure, hauling the bole.
> **Size:** a tail — several small ones, none blocking the next trade.
> Conversion (`trade-sawing` — the bole is its attach point; the timber
> set's by-hand path goes with it), forest law (the
> [covenant](../builds/land-use-covenant-slate.md)) and carpentry are
> their own builds.

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

⭐ **What shipped, and where it is written down** — the pack, the `Wood`
that is ground, the stand, the bole, the panel's one-game-year rotation,
the four representations of a tree, the eight woods and the deed:
[forestry.md](../../subsystems/forestry.md), whose *§ Why the wood is
shaped this way* now carries the crop-you-inherit and let-a-wood-be-
destroyed arguments this slate used to hold. The vocation rows are in
[vocations.md](../../vocations.md) (*forester / woodcutter* · *coppicer*
· the *sawyer* gap).

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

*(§ A stand is a record — **superseded by the code**: the stand
shipped as a COVER on the ground, not a filed record. See
[forestry.md § The four representations of a tree](../../subsystems/forestry.md)
and § The stand — `StandMixin`.)*

## What must not happen

- **No infinite trees, and no regrowth timer that outruns demand.** Growth is an
  increment; if it cannot be outrun, nothing here teaches anything.
- **Do not prevent deforestation.** The whole arc depends on it being possible.
- **No tech-tree unlock for the sawmill or anything else** — trades advance by
  exercised disciplines.
- **Do not instance a forest.**
- **No single "wood" material.** Species differ, and `materials-response` is
  already built to express that.

## Open questions — decided by the lens pass (2026-09-17)

Each carries the limb that chose it. Sequencing and content calls that
the lenses do not decide are marked *(user)*.

- **Seeded field or derived stock?** ⭐ **Both, composed** — species
  and site quality from the seeded field (the mine's `Deposit` shape,
  derived from the address, nothing stored); volume and age structure
  from the record of what was cut and planted. This is the only model
  under which *cut rate vs growth rate* is a real inequality rather than
  a timer, and it is what the mine already does. **Lens 1**, and it
  answers field-substrate's open *"do seeded and derived compose?"* with
  yes.
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
  it is the [land-use covenant](../builds/land-use-covenant-slate.md)** — one
  predicate over the bound instrument, act or clock; estovers, the close
  season and *no chainsaws* are rows of it. This build ships only the
  cheap half: instruments declared as arguments and stamped with an
  `epoch`. The law itself waits for the covenant build. **Lens 2.**
- **Where is the first forest?** *(user, decided 2026-09-17)* ⭐ **The
  hill above Rejection**, from `hillside.yaml` up — no new town. Both
  shipped consumers (the collier, the mine's timber sets) are in the
  fuel yard, and the Forest of Dean is the exact historical precedent:
  iron, charcoal, coal and a royal forest on one hill, with its own
  miners' law and its own verderers' court. The wood is **common land**
  of the settlement (`landUse: wild`, group-titled), which is what makes
  the deforestation arc a commons problem and not a landlord's. Newbie-
  wilds' dark wood is the *second* forest — the zero-code test.
- *Resolved by the build, cut from this list:* the rotations (coppice =
  one game year, a standard = fifteen) and planting-as-a-deed →
  [forestry.md § The panel](../../subsystems/forestry.md) + *§ Coppice
  with standards*; the hazel/oak `cordwood` mismatch → fixed in the row;
  the Discipline → `silviculture` (ISCED-F 0821).

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
- **No act hauls the bole** — it persists where it fell (`followCustody`,
  [forestry.md § `fell`](../../subsystems/forestry.md)), but moving one
  is the transport pack's day.
