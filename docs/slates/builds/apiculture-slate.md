# Apiculture slate — the last RGO family, and the one that gives to the commons

> **Status: UNBUILT** — the `Apis mellifera` species row and clover ship
> (farmstead authored them and then cut the wave);
> [ranching.md § ⚠ Not built: bees (D34–D39)](../../subsystems/ranching.md)
> records the cut and states that **AC 14 is not met and is the follow-on's
> first item**.
> **Left:** the colony record + the drafted queen · the hive as a stack of
> boxes · the beekeeping year and the supering deadline · the acquisition
> ladder (rob · catch a swarm · buy a nuc · split) · forage range over the
> flowering census, and the crowding read · honey character + mad honey ·
> wax and its consumer · temperament and queen rearing · the sting (trauma +
> burden, the crisis shape, the suit) · the allergy seam · mead ·
> **thermoregulation as the winter equation** · **foulbrood** (varroa
> deferred) · **robbing and absconding**
> **Size:** a build

> **Captured 2026-09-25**, in the design conversation after the extraction
> build merged (MR !291). Extraction took three of the four remaining RGO
> families — stone/clay/limestone, salt, coal/peat — so **apiculture is the
> last one**, and the census had already flagged it as the only remaining
> family that is a genuinely *new shape*: every shipped RGO derives yield
> from the parcel, reach or stand under your feet, and a hive derives it
> from **a neighbourhood you do not own**.
>
> Not scheduled yet: the envelope build and then a dedicated **template
> inheritance** build land first (hive types are a textbook `extends:` case —
> skep, movable-frame and nuc share most of their fields).

Substrate: [ranching.md](../../subsystems/ranching.md) ·
[husbandry.md](../../subsystems/husbandry.md) ·
[spoilage.md](../../subsystems/spoilage.md) ·
[maturation.md](../../subsystems/maturation.md) ·
[hazard.md](../../subsystems/hazard.md) ·
[textiles.md](../../subsystems/textiles.md) ·
[embodiment.md](../../subsystems/embodiment.md) ·
[smallholding.md](../../subsystems/smallholding.md) ·
[field-substrate-slate](../tails/field-substrate-slate.md) ·
[discovery-slate](./discovery-slate.md) (foraging) ·
[lineage-slate](./lineage-slate.md) (the allergy endowment) ·
[rgo-unification-slate](./rgo-unification-slate.md).

---

## ⭐⭐⭐ The thesis: bees are the game's first positive externality

Every extractive trade shipped so far **takes** — the forager depletes the
patch, the miner empties the seam, the fisher draws down the reach. A hive
**pollinates**: it raises the yield of ground nobody owns, whether or not
anyone asked.

That single fact is what earns the depth:

- it **forces a contract to exist** that is unlike any other in the game —
  the orchard pays the beekeeper to *park hives*, not to deliver a good;
- it makes forage a **commons two beekeepers crowd each other out of**;
- it puts valuable movable capital on ground nobody is watching.

⭐ And against foraging it is the sharpest teaching case in the design: put
a forager and a beekeeper on the same wild patch and they have **opposite
signs on the same field** — one taking, one giving, neither with title.

## The embodiment call — the herdbook minus the individual end, except one

The shipped species row already commits to it: *"the colony is the herdbook
with the individual end amputated (D34). You never draft a bee."* Individual
bees are a read and ambient prose, never agents. Castes come out as
**derived fractions of strength and season**, not as separate things — you
never act on a forager bee, so a forager bee is not an object.

⭐ **One amendment from this pass: the queen survives the amputation.** She
is singular, she is what you buy, requeen, and lose to a swarm, and the
brood pattern is how you read her. So a colony is a record with strength,
stores, a brood fraction, a temperament — and **one drafted individual**.
(A queen you *bought* arrives in a cage, which is an object at the point of
sale and a record afterwards.)

## ⭐⭐ The biology that matters — and ⚠ NOT because they are insects

⚠ **Bees are not the first insect, and the engine has no notion of phylum
anyway.** `animalia/arthropoda/insecta/orthoptera/gryllidae/gryllus/tenebrarum`
— the **delve cricket** — shipped with the mining damps work, and its row is
the precedent worth reading: *"⭐ Its SILENCE is a reading … they are not an
instrument anybody installed."*

The taxonomy is thinner than the paths suggest: **only four Clade rows exist**
(`animalia` · `plantae` · `fungi` · `constructa`), and **every species points
`_parentCladePath` straight at `animalia`** — the bee and the cricket included.
So `arthropoda/insecta` are **directories, not clades**, and *"true of all
insects"* has nowhere to be said today. What varies per animal is the
**BodyPlan** (six shipped: `avian · biped · crustacean · fish · quadruped ·
sessile`) plus a few species fields.

⭐ **So this build needs NO BodyPlan work.** Both insects use `sessile`, which
in practice is the plan for *a creature never embodied as an agent*. A fully
specified `crustacean` plan already exists (slots, locomotion modes,
`breathableMedia`, sensory ports, per-part tissues), so if an individual insect
ever must be an agent it is **one row of that shape** — not now. ⚠ A Clade row
for `insecta` is what insect-wide facts (exoskeleton, ectothermy, tracheal
respiration) would need, and nothing here needs them.

### ⭐⭐ Honey is a tap, and the tap vocabulary is ALREADY KERNEL

Found on the post-envelope merge: **`TapSpec` ships in the kernel** at
`platform/idea/species/Species.ts:332`, with `protected production: TapSpec[]`
and `getProduction()` / `setProduction()` on `Species`. So **honey is a
`production:` block on the `Apis mellifera` row** — not new substrate, and much
cheaper than this slate first assumed.

⚠ What is still pack-side is **`ProducingMixin`** (the host face, in
`trade-ranching/src/lib/`), and its promotion is now tracked by
[tapping-slate](./tapping-slate.md), which lists it under Left. Bees is the
third consumer, not the owner of that move — see
[rgo-unification-slate](./rgo-unification-slate.md).

### ⭐ The rung bees actually add: the colony IS the organism

`embodiment-follows-scale` says animal = agent, plant = thing, microbe =
material. Bees add a rung that is not on that list: **a colony is a herd-shaped
record whose members sit below the agency line** — the superorganism. That is
what the species row means by *"the herdbook with the individual end
amputated"*, and it is this build's genuinely new embodiment claim. Everything
below follows from taking it seriously, **not** from bees being arthropods.

### ⭐⭐⭐ The colony is warm-blooded even though the insect is not

An individual bee is ectothermic. A **colony** is not: it holds the brood nest
near **308 K** by clustering and shivering, and it **burns honey to do it.**

`ThermalMixin` is Newton cooling — so **winter consumption is a function of
ambient temperature and hive insulation**, which means the question at the
centre of the whole trade (*how much do I leave her?*) has a **computable
answer that varies by winter and by hive.** Not a constant, not a dial.

### ⭐⭐⭐ And as of the envelope build (merged 2026-09-25) it is FREE

The envelope build shipped exactly the substrate this needs, and **not only for
rooms**:

- **`EnclosedMixin`** (`lib/spatial/Enclosed.ts`) — `EnclosureSpec { material,
  thicknessM }`, whose doctrine is the one this build wants: *"You cannot author
  'well-insulated'; you author granite and the physics decides."*
- **`AtmosphericMixin`** (`lib/biome/Atmospheric.ts`) holds the envelope state
  (`envelopeTemperatureK` / `envelopeClockStamp` / `envelopeOutsideK`) and
  reconciles it.
- ⭐⭐ **`Vessel = AtmosphericMixin(ContainerMixin(Thing))`** — so **a container
  THING already holds an envelope**, with a default wall (`VESSEL_WALL_M`,
  0.01 m) and the comment *"handing a crate a wall like a wall would make it a
  thermos."*
- `U_enclosure = A / (t/k + R_films)` — conduction in series with the still-air
  films either side (~0.17 m²K/W), and `C = C_air + ρ·c·A·activeDepth` for the
  mass. **A U-value is an effect and is never authored.**

> **A hive is an enclosed Vessel.** One authored line —
> `enclosure: { material: <pine>, thicknessM: 0.019 }` — and the winter honey
> burn is the colony's heat output against `U_enclosure`, integrated against the
> weather. **Two numbers on a row, and the surplus equation closes itself.**

⭐ So *"a thin box and a thick one are different winters"* stops being a design
aspiration and becomes arithmetic already in the tree. It also makes the skep →
movable-frame ladder carry a second real difference beyond whether the comb
survives: **straw and wood are different materials, so they are different
winters too.**

⚠ Only two content rows declare `enclosure:` today (the woodshed and the
smithy), so the authored surface is young — the substrate is general, the
precedent is thin.

### Two nutrients, not one

Nectar is **carbohydrate** (fuel); pollen is **protein** (brood). ⭐ So a
colony can **starve for protein while full of honey**, which is why a pollen
dearth stops brood rearing cold. [exertion.md](../../subsystems/exertion.md)
already carries `protein` as a slow stock, so the vocabulary exists: one field,
and a far more honest model than a single food number.

### Metamorphosis is stock-and-flow, not lifecycle states

Both insect rows declare `lifecycleStates: ["alive", "dead"]`, and that is
right here: since individuals are not agents, **brood is a fraction of the
colony record** — eggs → larvae → pupae → workers, with a ~21-day lag.

⭐ That one lag produces several behaviours: a queenless colony dies on a
clock, varroa breeds on the brood cycle, and a split takes three weeks to
become a colony. ⚠ And **foulbrood eats larvae specifically**, so
brood-as-a-stock is what the disease consumes — the stages are not decoration.

### ⭐⭐ Haplodiploidy is already declared, and the MATING is the economics

The row ships `sexDeterminationSystem: haplodiploid` — unfertilised eggs become
drones. The load-bearing fact is the mating: **a queen mates once, in flight,
with many drones, and stores sperm for life.** So **you cannot control what
your queen mated with unless you isolate the mating** — hence island mating
stations, and later instrumental insemination. An epoch ladder on reproduction.

⭐⭐⭐ And per [uncertainty.md](../../uncertainty.md) that is a **legal
epistemic draw**: you do not know what she mated with, which is a fact about
the world rather than about your action. One of the cleanest legitimate uses of
randomness available — and it is what makes a queen breeder's **controlled**
mating a product somebody would pay for.

### ⚠ One concrete row fix

`lifespanMin: 0, lifespanMax: 1`. A worker lives about six weeks; **a queen
lives two to five years.** If the queen is drafted the row is wrong for her —
and the gap is the point: **the colony persists while its members turn over**,
which is *why* the colony is the organism and not the bee.

### ⭐ A third free environmental read

The cricket shipped as an instrument nobody installed. A hive is the same: bees
fly when the weather permits, so **a hive that stops flying is telling you
about the day, and a hive that dwindles is telling you about the landscape.**
The anti-gauge again, alongside the canary and the crickets — with a political
edge, since a district whose hives fail is a district that can *notice*.

## ⭐⭐ The year — and the clock says it is the most seasonal trade yet

`time.md`: default scale **12×**, so 2 real hours = 1 game day, a season is
90 game days and a year is 360.

| | game | real |
|---|---|---|
| a day | 1 | 2 hours |
| the main nectar flow | ~30–40 days | **~2.5–3.5 days** |
| winter dearth | 90 days | **7.5 days** |
| the beekeeping year | 360 days | **30 days** |

⚠ `time.md` already knows this shape — it warns that at 6× *"winter becomes
a 15-real-day dead season."*

⭐⭐ **The finding: the deadline belongs on the PREPARATION, not the
harvest.** Honey sits in the hive and keeps, so arriving late to harvest
costs only what the bees ate meanwhile. What you cannot be late for is
**supering** — give the colony no room and it fills the brood nest and
swarms, and the crop is gone before the flow ends. The punishing deadline
lands on the act that rewards foresight; the forgiving one lands on mere
collection. Accurate beekeeping, and the right way round for a game people
log into irregularly.

⭐⭐ **And the dead season answers "what does a beekeeper do for 7.5 real
days of winter?"** — exactly what real ones do: build and wire frames,
render wax, bottle and sell, and feed syrup through the dearth. **The
wax/woodenware loop is what makes the trade playable in the three quarters
of the year that is not a flow**, which is the second independent argument
for wax, and it is where the sugar half of the build earns its place.

## The acquisition ladder — and the swarm is the best thing in here

Four rungs, a wealth ladder and an epoch ladder at once:

1. **Rob a wild nest** — no equipment, the colony is destroyed, honey and
   wax once. This is honey *hunting*, and it belongs to foraging.
2. **Catch a swarm** — free, but you do not choose when. A swarm hangs in a
   tree for a day; whoever boxes it owns it.
3. **Buy a nucleus** — money instead of luck. Somebody has to be selling.
4. **Split your own** — the self-financing rung.

⭐ **The swarm is the direct payoff of "swarming is derived, not rolled."**
Swarms come out of *somebody's under-supered hive*, so a neighbour's
husbandry failure is your free colony, the swarm has a traceable source, and
a careless beekeeper visibly stocks the district. Nobody scripts it. It is
also the trade's one public event: first come.

## The hive as an object — a stack of boxes, literally

A `Slotted` thing whose slots take frames, with supers added on top as the
colony grows. Three things fall out for free:

- **Supering is `place`** — the deadline act is an ordinary placement on
  shipped furnishing/slot substrate.
- **Inspecting is containment.** You pull a frame and look at it; a frame is
  a `Containable` reading as brood, stores or empty comb. No inspect verb.
- **Hefting is a read on the box**, which is where weight already lives.

## Forage range — the flowering census is already shipped

`GrowingMixin` ships **`isFlowering()`**, reconciling on read, with a
flowering latch, the `onFloweringLatched` hook and prose (*"It is fully
grown, and in flower."*). So the forage query is a walk over live existing
state, not new bookkeeping — and **a forager picking wildflowers reduces
honey yield with no coupling code at all**, because both trades read the
same state.

⚠ **Open: the metric.** Range as graph hops (the `stepOutwardForPin`
pattern, this being its fourth copy) or real distance where a zone has
coordinates. Bees fly a radius; the world is a graph with Cartesian patches.
Lean: hops with a per-edge cost, so it degrades honestly in both — but this
is the one piece that wants deciding properly rather than asserted.

⚠⚠ **Crowding must be PERCEIVABLE.** Forage stays a commons with no title
(deliberate — see the lens pass), but a worked-over range that silently
halves the crop is a hidden penalty, not a lesson. A read, never a gauge.

## Honey — three levels of derivation from one authoring act

Authored flower → derived honey character → derived mead character. An
author who adds a flowering plant gets a new honey **for nothing**, and no
honey row is written for heather.

⭐⭐ **Mad honey, and negative knowledge inverted.** Honey's character
derives from what is in flower, so honey off a poisonous bloom **is
poisonous honey** (rhododendron and mountain laurel → grayanotoxin; people
are hospitalized by this in life). Foraging's skill is knowing what not to
pick; **the beekeeper's negative knowledge is about the LANDSCAPE, not the
specimen** — you must know what is blooming in range, and you cannot inspect
the jar to find out. Nearly free: `Material.toxicity` and the banded
conditions already exist. It is the bee version of the death cap.

⚠⚠ **Honey must NOT satisfy `category: sugar`.** If it did, bees alone
would close the census's unresolved `sugar` demand root and the sugar chain
would lose its demand case. It is also simply true that honey syrup and
simple syrup are different drinks. Distinct materials, distinct categories;
recipes that say sugar mean sugar.

## The harvest fork IS the technology ladder

- **Crush and strain** — no capital, comb destroyed, you get **wax** and
  less honey, and the colony must rebuild before it stores again.
- **Extract** — a centrifugal extractor is real capital, comb survives, more
  honey and **no wax**, colony productive immediately.

⭐⭐ Lens 5 decided the staging here: the mechanism never changes, only
**whether the comb survives the harvest**, which is a *parameter of the hive
type*. Fixed comb (skep, log hive) is the medieval rung; movable frames
(1852) and the extractor (1865) are the advance. **Trades ship medieval** —
so ship the skep, and the frame + extractor is what you earn.

## Wax — and its consumer is not optional

⚠ **There is no wax and no candle anywhere in the tree today** (verified:
zero rows; the shipped light sources are a sconce-lamp, a torch and a
lantern). Wax that nothing consumes is a material an author cannot compose
with, which fails lens 2 outright — so **the candle is required, not
cuttable**. Wax enters an existing market (interiors are pitch black, light
demand is real), which is the legitimate shape.

Other consumers, in rough order of cheapness: comb **foundation** (a capital
good made from your own byproduct — the loop closes), sealing wax, waxed
thread, waterproofing.

## Temperament, and queen rearing

Defensiveness is a colony record field, and a queen breeder selects for
docility — so **breeding is how you stop getting stung**, which makes a
queen-rearing vocation real and gives the sting model a skill-based answer
rather than "wear more clothes."

⚠ Heritability proper stays [lineage-slate](./lineage-slate.md)'s; ship
temperament as a colony field with the genetics seam left clean.

## Stings — the same delivery as a dart, and emphatically not a fight

**Identical delivery:** a puncture through the covering stack plus
`MetabolicMixin.introduceToxin` landing a dose past digestion — which
`hazard.md` documents as *"the bloodstream seam a poisoned dart / needle
uses."* A sting is its third consumer. **Different in two ways that
matter:** a trap fires **once** on traversal; a colony **responds
continuously and escalates while you stay.** A trap is a device with a
trigger; a colony is an animal deciding.

So a sting is neither the trap path nor the combat path. It is the shape
`respiration.md` ships: an *"event-triggered scheduled-engagement crisis"* —
one engagement, lifecycle-parameterized, that **ends when the situation
does** (there, surfacing or a tank refill). Standing in a cloud of angry
bees is structurally being underwater.

### ⭐ The dose already exists, and the bands are already right

`platform/idea/Condition/metabolism/venom.yaml` ships, and its first line
reads *"Envenomation — a fast, potent acute poison (**a bite / sting**)"*:

```yaml
toxinBehavior:
  toxinType: venom
  absorptionRate: 8    clearanceRate: 0.05    potency: 2
  bands: [{ threshold: 3, severity: 1 }, { threshold: 8, severity: 2 },
          { threshold: 15, severity: 3 }]
resolution: { by: antivenin }
```

At ~0.5 burden per sting: six stings crosses severity 1, sixteen crosses 2,
thirty sits in 3. **"One sting sucks, thirty is a real problem" is a single
tuning number, not a design.**

⭐ **But split the two systems, because a dose of 0.5 is below threshold 3
and one sting does in fact hurt:**

- **the sting is a TRAUMA** — local, immediate, always, through the puncture
  channel and the covering stack. One sting = this and nothing else.
- **the venom is a BURDEN** — systemic, dose-summed, banded. Thirty stings =
  thirty traumas *and* a severity-3 burden.

Each system doing what it is for, and the transition from "ow" to "this is a
medical event" emerges from arithmetic.

### How many stings is DERIVED

Colony temperament × whether you smoked × how long it was open × weather
(bees are defensive in cold, rain and dearth). **Smoke suppresses the alarm
response** — the mechanism, and the reason `smoke` is the skill. ⭐ And the
honest detail worth keeping: **a honeybee dies when it stings**, so a badly
handled hive weakens itself; the punishment for clumsiness is not only on
your body.

### ⭐ You cannot fight a swarm, and the refusal is the feature

1. The species row declares `_bodyPlanPath: sessile` — a colony is not a
   mover, so it cannot be a combatant. **The content decided this before we
   asked.**
2. Combat is a **session between combatants** with terms, consent, a
   `CombatantState` each, poise and beats. A colony has none of that shape.
3. You cannot defeat thirty thousand of something, and pretending otherwise
   is the fudge lens 1 refuses.

What you get instead is three real answers — **withdraw, smoke, or be
covered** — each a different kind of preparation.

⚠ Two edges: **a single bee is a nuisance, not a crisis** (swatting one is
trivially allowed, and it costs the colony a bee); and the crisis should
**decay with distance rather than end at a room boundary**, because bees
pursue.

⚠ **Blame.** A sting generates none — it is a hazard, like weather.
*Unless* a hive was sited beside a public path, at which point the keeper's
liability for their animals is a real doctrine and the accountability ledger
is the shipped place for it.

## ⭐⭐ The suit — coverage is the entire model

A sting is a puncture with **almost no energy behind it**, so material
toughness is irrelevant. That is why real bee suits are loose, pale and
smooth rather than thick: they are about **gaps and standoff**.

No bespoke anything is needed. The step-dart already resolves *"a puncture
through the covering stack (a boot mitigates)"*, and `insulationAt(part)` /
`bodyInsulation()` show the covering model already resolves **per body part**
and sums surface-weighted. So:

> **How many stings you take derives from which parts are uncovered.**

A veil, gloves and tucked trousers is a **player-assembled** answer out of
interoperating garments, with no "beekeeper's suit" object needed to make it
work — lens 2 at its top grade, with a bespoke suit still allowed as a
convenience.

⚠⚠ **The open question, and it is a genuine stress test.** Stings go for the
face, neck, wrists and ankles — *the gaps*. A `head` slot exists in the
content; whether the part vocabulary separates a **veiled face from a bare
neck** is the thing to check at plan time. **This is the first case in the
game where a garment's entire value is in its gaps**, so if the covering
ladder is too coarse the mechanic collapses to a binary and dies.

⭐⭐ **And the inversion that makes the suit a choice rather than an
upgrade: it is hot.** `clo` derives and is never authored, thermal
regulation is shipped, `hyperthermia` is already a Condition seed — and
**the flow is in high summer.** Cover up and cook; work light and get stung.
Nobody dials anything.

Smoke is then the third, separable lever: it does not block stings, it
**reduces how many are attempted**.

## The toolkit — and ⭐ the verb collision DISSOLVES

The toolkit is **instruments carrying capabilities** — the spade/pick
`DIGGING`/`WINNING` split from the extraction build is the precedent, and the
rule is *the instrument affords the verb, not the furniture*, two rungs per
verb as rows. But two of these afford **nothing**, and that is the finding:

| instrument | its role |
|---|---|
| ⭐ **smoker** | **not a verb** — a held instrument that changes the outcome of opening the hive |
| **veil · gloves · suit** | **not a verb** — worn covering that changes the same outcome |
| **hive tool** | prising apart boxes and frames propolised shut |
| **frames · supers** | the room you give the colony; **supering is `place`** |
| **extractor** | spinning honey out without destroying comb (the advance rung) |

### ⭐⭐⭐ The smoker is not a verb, so `smoke` never collides

⚠ `trade-cooking` ships `content/trade/cooking/cmd/crafting/smoke.yaml` —
smoking food is a preservation act — and **a second view claiming a shipped
verb SHADOWS the first silently** (the consequence build paid for that once).
That hazard **disappears** once the smoker is modelled as what it actually is:

> **A held instrument that mitigates, exactly as worn covering does.** Two
> mitigations, one shape, **no new verb**, and nothing to shadow.

It is also the more honest model — you puff smoke *continuously while you
work*, not as a discrete act — and it makes the sting count a single
computation over **what you are holding and what you are wearing**. This
removes a verb from the build *and* removes the risk.

### ⭐⭐ The honey harvest verb is `harvest` — by precedent

`harvestTool` is a real authored field on slot-plants, and `CLAUDE.md`
describes forestry's coppice cut as *"the platform's `harvest` told its tool by
the plant."* So **`harvest <hive>`, with the hive declaring its tool**, gives
crush-vs-extract for free and with **no second verb**. `gather` stays
ranching's, and `extract` would have named only the capital rung.

## Pollination as a contract — what makes it verifiable

The shipped work-contract substrate wants a **verifiable condition**, and
pollination has a clean one: **N hives present on the parcel across the bloom
window.** Not "yield went up" (which the grower cannot attribute and the
beekeeper cannot control) — presence over a window, which both parties can
check and neither can fake. The payment is for the *parking*, which is what a
real pollination contract buys.

## The allergy seam — the consumer lineage has been waiting for

Two slates already committed to allergies, and both are blocked on the same
thing:

- [lineage-slate](./lineage-slate.md) sets the endowment rule — *"⭐⭐ Endow
  what creates a relationship. Never endow what creates a ranking"* — and
  names allergies as passing (*"they cost without ranking"*). Its **open
  question 4** is literally *"Does anything else become endowed with this
  build, or does blood type ship alone? Allergies and metabolic quirks pass
  the rule and **would each need a consumer**."*
- [vitals-slate](../tails/vitals-slate.md) names the delivery path in its
  side-effect vector: *"an allergen → a reaction."*

⭐ And the structural precedent is **shipped**: `transfusion-reaction.yaml`
— an ABO-typed immune response in which a normally life-saving substance
harms *this* body because of an inherited type. **That is an allergy
already**, generalized off blood onto any substance.

Bee venom is the ideal first allergen: canonical in life, delivered by the
same build, and it costs without ranking — an allergic character cannot keep
bees safely, which is a *relationship* (you need a beekeeper; someone needs
to stock the remedy), not a stat penalty.

**Scoped hard:**

1. **A seeded per-body sensitivity list**, as blood type is seeded at
   identity. ⚠ **No genetics** — heritability stays lineage's.
2. ⭐ **Sensitization on exposure.** Real immunology: the first sting is
   usually mild, the *second* is dangerous, because the first is what
   teaches the body. The allergy is created by play rather than printed on a
   sheet — and it lines up with *disclosure is discovery*.
3. **One new Condition seed, `anaphylaxis`** — a sibling to
   `transfusion-reaction`, **not** a rescaled envenomation: the signature
   differs (airway and circulatory collapse; `asphyxiation` and
   `hypovolemic-shock` both exist as shapes) and so does the resolution. The
   shipped `resolution: { by: … }` seam takes `epinephrine` exactly where
   envenomation takes `antivenin`.

**Why it belongs here rather than in pharma:** it gives pharma its **first
indication** — a condition a drug is *for*, time-critical and with a correct
treatment, which is the shape clinical pedagogy needs. Drug allergy
(penicillin the archetype) is then the same substrate with a different
allergen, so pharma **inherits** instead of designing under deadline.
Epinephrine appears nowhere in the codebase today; "adrenaline" occurs once,
in a passing line in [physiology-slate](./physiology-slate.md).

⚠ **Four cautions to hold the build to:** anaphylaxis must be **rescuable**
through the shipped `dying` clock, never an instant kill · **seeded, never
chosen** (a chargen menu offering "bee allergy" is a trap and violates the
endowment rule) · **knowable once known** — no hidden recurring ambush · and
the accurate model (rapid, disproportionate to dose, reversible with the
right drug in time) is also the respectful one for a real condition real
players have.

**Explicitly out:** heritability (lineage's), the allergen roster (pharma's),
food allergies (same substrate later, no new work).

## Mead — honey's high-value outlet, and one profile row

**Whose trade: `trade-winemaking`.** `rum-dark.yaml` states the rule in its
own comment — *"by the generic drain rule: the trade whose PROCESS makes it
ships it."* Brewing's distinctive process is **mashing**; mead skips it
entirely and ferments a sugar solution like a fruit wine. ⭐ The edge case
proves the rule: **braggot** is honey *and* malt, so it is mashed, so it is
brewing's.

**The cost is one `MaturationProfile` row.** White wine's, shipped, is the
shape:

```yaml
key: white-wine        mechanism: microbial
inputCategory: white-must
stallBelowK: 283   happyK: 290   damageAboveK: 301   killK: 310
ratePerDay: 0.12
productMaterial: …/white       turnedMaterial: …/wine-vinegar   turnDays: 3
leesFraction: 0.04             leesMaterial: …/wine-lees
```

So mead is: a `honey-must` material, a `mead` material, one profile row with
a slower `ratePerDay`, and a recipe that makes the must. Vessel, clock,
cellar, lees, work boards and turn-to-vinegar all already exist.

⚠⚠ **A shipped trap for the plan.** The brine profile warns: *"it authors
no strain, which is the whole point of `requiresFlora` … Two shipped
profiles (retting, bleaching) were silently frozen by the strain gate before
this build; a third would have been."* **A microbial profile with no strain
authored does nothing, silently.** Mead needs its culture named;
`wine-culture.yaml` is the precedent.

⭐⭐ **Mead is the water-activity hurdle run backwards.** Honey keeps
because `a_w ≈ 0.6` — the solute term in `a_w = base · moisture · (1 −
solute)`, the model renamed `WaterActivityMixin` in !291. Dilute it and
`a_w` crosses what yeast needs. **Making mead is deliberately breaking the
hurdle that makes honey keep**, and one model explains both facts: a player
who understands the first derives the second.

⭐ **So the defect and the product are the same event.** Damp honey ferments
on its own; wine left too long becomes vinegar (`turnedMaterial`,
`turnDays`). Intent and control are the only difference — and the substrate
already says so.

**Styles are recipes, not classes:** traditional · melomel (fruit) · cyser
(apple — `trade-farming` ships rosales) · metheglin (spice) · braggot
(brewing's). Combination, not enumeration.

⭐ **Mead is the game's first store of value that is not money.** White
wine's `ratePerDay: 0.12` is ~8 game days ≈ **16 real hours**; mead is the
slowest common ferment, and a year in the cask is **30 real days**. So the
beekeeper chooses between honey that keeps forever and sells today, and mead
that locks that honey up for weeks and sells for more — liquidity versus
return, from an honest fermentation rate, with the cellar and the ledger
already built.

A **meadery is a venue binding, not a pack** (trade is mechanism, locality is
expression), so an apiary that also makes mead needs zero pack code.
Historically the beekeeper *was* the meadmaker, so the vertical integration
is authentic and free.

## The husbandry half — disease, robbing, absconding

### ⭐⭐ Foulbrood is CONTAMINATION, not contagion — which is why it is affordable

⚠ `Condition.contagion` **is still `null` with no consumer** —
[disease-slate](./disease-slate.md)'s own Left block says so. If bee disease
needed host-to-host contagion, this build would drag in a chunk of that one.

It does not. **Foulbrood lives in the comb**, which is a *material in a
container*, so it rides `ContaminableMixin`, which shipped. And then this, from
`lib/material/Contaminable.ts`:

> *"⭐ Spore-former: **the fraction of the population a kill can never take
> below.** `0` (the default) = no spores, cooking removes it entirely."*

⭐⭐ **That is American foulbrood exactly.** AFB spores survive decades and
survive boiling — you cannot cook it out — which is why beekeepers **burn the
hive**. The survival fraction plus the germination ceiling *is* the model, and
the brutal consequence falls out of arithmetic rather than being scripted:

> **The only cure is destroying your own capital.**

And it splits honestly into the two real diseases with the two real answers:
**European** foulbrood has no spores, so scorching frames works; **American**
foulbrood has them, so nothing works and you burn. Same mechanism, one number
apart.

⭐ The best part is *where it lives*: in the **equipment**, not the bees. So
**secondhand equipment is how it spreads**, which is historically the main
vector and a genuinely good economic lesson — **the cheapest input carries the
risk.** A bargain box of frames is how you lose an apiary.

### ⏸ Varroa is a PARASITE, and it is deferred — which is the setting, not a cut

A mite population living on the colony and feeding on brood is a **second
population on the host with its own growth rate** — structurally the
two-population split that disease-slate says shipped as spoilage, but hosted on
a **colony record** rather than a food item, which is new.

> **The line: contamination is shipped substrate; parasitism is not.**

⭐⭐ And deferring it is not a concession — **it is the setting.** Varroa
reached western beekeeping in the **1980s**; before it you genuinely could leave
hives alone for years, and after it beekeeping became a treadmill. So *a realm
without varroa IS the medieval rung*, correctly, and whether a region has it
becomes a **realm-level parameter, not a mechanism change** — lens 5 passing
with nobody doing anything.

When it does land, the treatment ladder is four different kinds of answer:
drone-brood trapping (husbandry, free, pure skill) · a screened board
(equipment) · miticide (⭐ another pharma indication) · and **breeding for
hygienic behaviour**, which lands back on the queen breeder alongside docility.
Two traits, one vocation, both colony record fields. And varroa's harm is
**indirect** — it vectors viruses, so mites and infection together are what
kill, which teaches something true and slightly counterintuitive about
parasites.

### Robbing — the field again, one level down

When nectar is scarce, strong colonies raid weak ones. That is **a stock with an
owner and an extractor that does not respect title** — ⚠ **derived** from
dearth × a strength differential × exposed stores, **never rolled**. It makes a
dearth genuinely dangerous, it punishes careless feeding (open syrup starts a
frenzy, which is true), and a weak colony beside a strong one dies.

⭐ **And it is the disease vector.** Robbing moves contaminated honey between
hives — so robbing and foulbrood compose into an outbreak **without either
mechanism knowing about the other.** That is what you get from modelling two
things honestly instead of wiring a third.

### Absconding — the colony's exit option

Worth keeping distinct from swarming: **swarming is reproduction** (half stay;
you lose increase), **absconding is abandonment** (all leave; you lose
everything). Triggers are starvation, persistent disturbance, and pests.

⭐ It is the honest punishment for neglect that is not a number going down —
**your asset walks away** — and it sits on the pets doctrine that an animal is
*difficult, not feral*, and gets to decide.

## ⭐ The apiary is the first land use that consumes no land capability

The land uses are a **closed six** — `residential · agricultural ·
commercial · industrial · civic · wild` — each declaring a cultivation
ceiling of `none · bed · field`.

⚠ **A hive cultivates nothing.** It occupies a footprint and draws its yield
from land it has no relationship with, so the cultivation ceiling has
nothing to say about an apiary and **backyard beekeeping on a residential lot
is legal by default** — which is exactly why real municipalities have bee
ordinances. An apiary is also a **LULU** in
[settlement-model.md](../../settlement-model.md)'s existing taxonomy (bees
sting neighbours). The code has no criterion here, so **the polity needs one
(tier C)** — governance arriving because the simulation produced the problem
first.

## Lens pass

1. **Pedagogy** — `apiculture` is **its own Discipline**, decided by
   precedent rather than preference: `trade-quarrying`'s own row says *"⚠ Its
   own Discipline, not a band of `mining`. Every RGO trade ships one."*
   (Sugar gets none — it is not an RGO, and `milling` already exists.) The
   derivable core is one equation: **a colony stores a surplus and you may
   take the surplus**; take more and it dies in February. ⚠ **Swarming must
   be DERIVED, not drawn** — `uncertainty.md` bans rolling what your action
   did, and a rolled swarm turns the whole skill into luck. The only legal
   draw is epistemic: you do not know the queen until you read the brood.
2. **Expression** — honey character derives from the flowering census, so a
   new flower is a new honey with no row written; the toolkit is instruments
   carrying capabilities (the spade/pick `DIGGING`/`WINNING` split is the
   precedent); a second apiary needs **zero pack code**. ⚠ The lens
   **promotes the candle to required**: wax with no consumer is enumeration
   with no permutation.
3. **Immersion** — ⭐ **hefting the hive is the anti-gauge** (weight tells
   stores, traffic tells strength, comb tells brood) — bees' version of
   tasting: expertise *is* discrimination and you advance by perceiving more.
   Never a strength number. ⚠ Bees as wandering individual agents would be
   noise; they are a read plus ambient prose.
4. **Values** — the forced choice is **how much honey to take**, with the
   consequence a season away and no rule stopping you (the stewardship
   `tend` shape). Then crush vs extract, and how many hives to crowd onto a
   range. Standing is conferred by **the farmers who rehire you**, on the
   shipped contract substrate — not by throughput.
5. **Epochs** — the cleanest ladder in the game: honey hunting → skep (comb
   destroyed) → movable frame + extractor → migratory pollination for hire →
   unchanged under magic. Only **whether the comb survives** changes, and
   that is a parameter. Lens 5 rarely decides anything; here it decided the
   staging.
6. **Economy & governance** — **produces** honey, wax, **pollination**
   (capacity, landing on someone else's land), colonies as capital, and
   information about forage; **consumes** time, woodenware, and ⭐ **sugar
   syrup for dearth feeding**, so the two halves of the build are each
   other's customer. **Demand existed first, verifiably:** `category: sugar`
   is consumed by simple-syrup, mojito and old-fashioned and produced by
   nothing; `rum-dark.yaml` calls itself *"molasses-heavy"* with no molasses
   in existence; `fruitSetCount` is already shipped at `Growing.ts:147` and
   is already the pollination hook. ⚠ Honest caveats: **mead is the one piece
   of genuinely new demand**, and wax enters an existing market as new
   supply. **Who can be wronged:**

   | the wrong | criterion | appeal |
   |---|---|---|
   | hive theft | chattel chain-of-title (`_chattelId`, `ownerOf`) + accountability events | the record |
   | placement refused | parcel title (`AccessApi` / `ParcelApi`) | the owner's word, readable |
   | pollination unpaid | the contract clause, verifiable | the board |
   | **forage crowded out** | **none — unowned and rivalrous, deliberately** | **none** |

   ⚠⚠ The fourth is the finding: the commons stays untitled because that is
   the lesson, **but a hidden penalty is not a lesson** — crowding must be
   perceivable.

### What the pass changed

1. `apiculture` is its own Discipline (precedent, not preference).
2. Swarming is derived from crowding, never drawn.
3. Hefting is the read; no strength number anywhere.
4. The candle is **required**, not cuttable.
5. Crush-vs-extract **is** the epoch ladder — ship the skep first.
6. Sugar syrup feeds bees, so the two chains are each other's customer.
7. Forage stays a commons, but crowding must be perceivable.
8. The queen is **drafted** (lenses 1 and 4 agreed).

## Pollination — the coupling, and where it attaches

A **multiplier on `fruitSetCount` at SET** (`Growing.ts:147`), never a sixth
limiting factor: poor pollination gives **fewer fruits, not slower ones**,
and `_fruitFill` already scales by `limiting`. Diminishing returns as the
forage saturates.

## Open questions

⭐ Three of the original questions closed by precedent during the design
conversation and are recorded in place above, not here: **the honey harvest
verb is `harvest`** (`harvestTool` + the coppice precedent), **the smoker is not
a verb** (so the `smoke` collision dissolves), and **the forage metric is hops
with a per-edge cost**, where a Cartesian zone contributes real distance as its
edge cost — which unifies graph and coordinate space, stays derivable for a
player (*about an hour's flight*), and is the induced-set pattern the lane
doctrine mandates: *you do not draw a road.*

What is left:

1. ⚠ **The covering part vocabulary** — does it separate a **veiled face from a
   bare neck**? A `head` slot exists; if the parts are coarser than
   face/neck/wrists/ankles the suit collapses to a binary and the mechanic
   dies. **A code check at plan time, not a decision.**
2. **Honey's sweetener category** — settled negatively here (**not** `sugar`),
   but the positive vocabulary is a cross-build decision across sugar, honey
   and maple; see [rgo-unification-slate](./rgo-unification-slate.md).
3. **Wax's consumers after the candle** — which of foundation, sealing wax and
   waxed thread ships with it? (The candle itself is required, not cuttable.)
4. **`ratePerDay` for mead**, and whether aged variants are separate rows.
5. **Where the tap promotion lands** — honey is a tap; see
   [rgo-unification-slate](./rgo-unification-slate.md).
6. **Does the brood stock ship as four stages or as one lag?** Eggs → larvae →
   pupae → workers is honest, but only the lag is load-bearing for swarming,
   requeening and splits; foulbrood is the one consumer that needs *larvae*
   specifically.

## Not in this slate

- ⏸ **Varroa** — the parasite-population-on-a-host shape is new, and a realm
  without varroa is the correct medieval rung. See the husbandry half above.
  (**Foulbrood is IN**; robbing and absconding are IN.)
- **An `insecta` Clade row** — nothing in this build needs insect-wide facts,
  and only kingdom-level clades exist today.
- **An insect BodyPlan** — `sessile` is right while no individual bee is an
  agent; the `crustacean` plan is the shape to copy if that ever changes.
- **Honey hunting** — foraging's, see [discovery-slate](./discovery-slate.md).
- **Sugar's chain** (cane, the mill, the boiling house, molasses) — the other
  half of the same build; the refining step is the saltern's pan and brine
  hearth with a different feedstock, and `milling` is its Discipline. ⚠ The
  plantation history is authorable honestly (the mechanism — cut cane inverts
  within hours, so the mill and the field must be co-located, so labour
  concentrates — is what drove the history) but it is a deliberate authoring
  choice, not one to stumble into.
