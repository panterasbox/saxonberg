# Farming slate (working doc)

> **Status: design captured, not built.** Farming is an **integrating
> vertical** (the [Dave's Bar](./daves-bar-slate.md) precedent) — it is
> ~90% *composition* of shipped substrate (metabolism, thermal, weather,
> reserves, crafting, the Warren, slots, bulk, advancement, chronicle,
> augmentation) plus two genuinely-new primitives: a **plant/soil
> biology** engine and a **genetics** layer. Its magic vector —
> biosynthesized compounds resolved as pharmacology — is the biology-
> grounded realization of the [capability-magic
> slate](../deferred-rpg/capability-magic-slate.md)'s "magic is honest
> science" claim: *magic is what sufficiently interesting biochemistry
> looks like.*

Working slate for **farming** — how a player grows crops, breeds
cultivars, and turns a harvest into food, materials, and (with the right
biology) magic. It is deliberately **Stardew on the surface, real science
underneath**: a cozy daily ritual whose optimization ceiling is genuine
agronomy, genetics, and pharmacology, taught through the game's honest
models.

See also:

- [docs/slates/builds/daves-bar-slate.md](./daves-bar-slate.md) — the
  **precedent integrating vertical.** Farming is its sibling and its
  **upstream supplier**: crops are the primary production that feeds the
  bar's kitchen and the reagent economy.
- [docs/slates/tails/crafting-slate.md](../tails/crafting-slate.md) — the
  **transformation stage** the harvest flows into. Brewing/synthesis is
  a *new transform branch* of the same craft engine; the maker's-mark,
  quality-as-verdict, tools, and conservation rules all carry over.
- [docs/slates/builds/economy-slate.md](./economy-slate.md) — the
  conservation spine. Farming is a **source node**: primary production
  entering the one conserved economy.
- [docs/slates/builds/property-slate.md](./property-slate.md) — **the
  parent.** Land ownership, the titled **parcel**, tenure, and the
  **compute-allowance** scarcity all live there; farming *consumes* it. A
  farm's field-rooms are parcels carrying a compute allowance (which is
  what the maintenance/upkeep drain below is priced against); this slate
  owns only the *spatial subdivision + biology*, not the title or the
  meter. The "assume I already have the land" premise is property's.
- [docs/slates/builds/ranching-slate.md](./ranching-slate.md) — **the
  sibling** (the animal half of agriculture). Two couplings to reconcile:
  the conserved **feed loop** (crops → feed → livestock → products →
  crafting → market), and a **shared breeding substrate** — the `Genome`/
  reaction-norm genetics below is *husbandry-wide*, not crop-only (see
  Genetics § shared substrate). Both halves also share the `Business` +
  labor wrapper and land tenure.
- [docs/subsystems/metabolism.md](../../subsystems/metabolism.md) — the
  **model the growth engine copies** (lazy sub-stepped reconcile-on-read
  over game-time; the toxin/BAC dose model the effect layer reuses) —
  and the **consumer** (eating the crop).
- [docs/subsystems/thermal.md](../../subsystems/thermal.md) — the heat
  integral (GDD = accumulated heat) and the `Flask` thermos, which *is*
  the extraction/reaction vessel.
- [docs/subsystems/weather.md](../../subsystems/weather.md) — the
  stateless procedural field integrated over a crop's growth window; the
  fog the genetics is read through (G×E). Weather's own slate names
  farming as its deferred "far economy."
- [docs/subsystems/reserve.md](../../subsystems/reserve.md) — soil is a
  set of `Reserve` instances (fertility/moisture/tilth/OM); the same axis
  mana rides.
- [docs/subsystems/race.md](../../subsystems/race.md) — the `Material`
  substrate (crop matter, extract composition) + the `Species`/`Clade`
  pure-data-`Idea` pattern the crop catalog copies.
- [docs/subsystems/location.md](../../subsystems/location.md) — the
  **Warren** elastic graph (a farm buds field-rooms as it grows) +
  Localities (a farm sits under one).
- [docs/subsystems/slot.md](../../subsystems/slot.md) — the
  `Slotted`/`Slottable` beds for the discrete boutique density.
- [docs/subsystems/bulk.md](../../subsystems/bulk.md) — solvents,
  extracts, potions are bulk liquids; watering is a `BulkableApi.transfer`.
- [docs/subsystems/augmentation.md](../../subsystems/augmentation.md) —
  augment-confers-mixin: a compound can confer a *capability* (flight, a
  sense), not just a stat.
- [docs/slates/builds/advancement-slate.md](./advancement-slate.md) —
  Farming is a `Discipline`; competence bands, declared-focus deliberate
  practice, the knowledge ladder gate the depth.
- [docs/subsystems/chronicle.md](../../subsystems/chronicle.md) — the
  known-of→can-make ladder gating recipes/techniques; deed-vs-claim by
  provenance (the external-mastery seam reuses it).
- [docs/slates/deferred-rpg/capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md)
  — the **thaumic-channel** magic model. This slate's *pharmacological*
  magic is a distinct, biology-grounded vector; the two **compose** (a
  farmed compound restores a mana `Reserve`; a reagent feeds spellcraft),
  and neither adds a "magic" engine word.

---

## The spine (non-negotiable)

Every decision below is bound by these:

1. **Integrating vertical, not a new engine.** Reach for composition
   first; introduce a new primitive only where the biology genuinely has
   no substrate (the plant/soil growth model and the genome). Everything
   else is a *consumer* of shipped systems.
2. **One biology, many farms — content, not code.** There is no
   `FoodFarm`/`ChemFarm`/`PharmaFarm` class. The **engine** is a
   `PlantMixin` growth model + a soil-as-reserves holder + the genetics.
   A **farm** is that engine reading a different **crop catalog** and
   feeding a different **recipe catalog**. Feasibility is emergent (the
   crafting "location-agnostic" rule). A new crop is a data row.
3. **Derive-on-read, no tick, no presence freeze.** Crop state is a pure
   function of `(plantedAt, now, ∫weather, soil, interventions)`,
   reconciled lazily on read (the metabolism pattern). A field **does not
   presence-freeze** — crops grow while nobody's online. The only bound is
   the far-past guard.
   > **Generalized 2026-07-30** — this is no longer a farming-specific
   > divergence from metabolism; it is the **family-wide clock**, shared
   > with ranching and pets: *things you own reconcile against world time;
   > the body you inhabit reconciles against played time.* The avatar's own
   > metabolic clock still freezes on logout (you can't hire someone to eat
   > for you). Owned assets never do — offline decay is made fair by the
   > **automation ladder** below, whose limit is that *automation maintains
   > your assets; it cannot maintain your relationships.* Owner:
   > [ranching-slate § The clock](./ranching-slate.md).
4. **Genes encode reaction norms, not trait values.** A "drought-tolerance
   allele" bends the *shape* of the moisture→satisfaction curve; it never
   adds a number to yield. The phenotype only exists once the environment
   is run through the genome-set curves. This is what makes G×E fall out
   *correct and for free* — and why there is no universal best cultivar.
5. **Conservation.** The harvest is transformed matter; brewing mass-
   balances every reaction (the crafting/banking ethos). Nothing is minted
   from nothing.
6. **Science is the skill ceiling, not the entry fee.** The cozy loop is
   fully playable with zero theory; the science is the optimization layer,
   revealed by progressive disclosure. Cozy and rigorous are the *same
   code* at different altitudes.
7. **Measure the world in numbers; keep the self-estimate a band.**
   Physical quantities (°C, GDD, ppm, pH, MPa) are numeric and instrument-
   read *with error bars* — reasoning about them *is* the game. The
   character's own Farming competence (θ) stays a hidden band (θ-as-
   spoiler). The world is quantitative; *you* are described qualitatively.
8. **Magic is pharmacology.** No magic engine word. A "magical" effect is
   the dose-dependent, half-life-governed perturbation of shipped
   substrates (vitals/augmentation/perception/thermal/reserve/comms) by a
   compound the plant biosynthesized. "Casting a spell" is running a
   synthesis you understand.

---

## The land model — farmland without sub-room geometry

> **Ownership is [property](./property-slate.md)'s, not this slate's.** The
> titled parcel, the author↔owner un-fusing, transfer/rent, and the
> per-parcel **compute allowance** are the property substrate. Here we own
> only the *spatial subdivision + the biology that runs on it*. A field-room
> is a **parcel** — which is exactly why the upkeep drain (below) has
> something real to be priced against: a farm is persistent simulation you
> chose to keep alive.

The room model has no intra-room coordinates, and the two constraints are
"more than one plant per room" *and* "more than one room per farm." The
resolution is a three-tier structure with **two densities of the same
biology**:

- **Farm = a Warren** ([MultiLocation](../../subsystems/location.md)). The
  elastic graph *buds a new field-room as you expand* — that is the
  "level up your farm" mechanic, already built. A beginner's single
  field-room is a one-node Warren; it grows into a multi-room operation
  with no separate "small vs big farm" code. The Warren host's runtime
  role is also a natural upkeep hook.
- **Field = a room**, its `Floor` carrying the cultivation state (soil
  reserves + what's planted).
- **Two densities, chosen by whether individual-plant identity matters:**
  - **Aggregate (default).** Don't instance plants. The room's soil is
    planted as a *continuous crop* (species + `plantedAt` + coverage +
    reserves), modeled like `Floor` **surface-bulk** — matter, not
    objects. "Many plants per room" = coverage, not a Stuff count. You
    `water field` / `harvest field`. Scales cozily; no 40-object room, no
    per-object `look` spam. **Staples live here.**
  - **Bed / slot (opt-in, boutique).** For per-plant-quality crops
    (pharma herbs, a prize pumpkin) a "garden bed" is a
    [`Slotted`](../../subsystems/slot.md) fixture with N slots; each plant
    is a `Slottable`. Slots are the abstraction over "spots in the room"
    *without* coordinates — capacity is the density cap. **High-touch
    crops live here.**

Both densities run the identical `PlantMixin` growth model — the aggregate
instances it once per field, the bed once per slot.

---

## The growth model (the engine)

### The checkpoint

A cultivated plot (aggregate field *or* one bed-slot — same code) carries:

```
species      (crop-catalog Idea)
genome       (Genome value-object — see Genetics)
plantedAt    (game-time)
lastSeenAt   (game-time — the reconcile cursor)
stage        germination | vegetative | flowering | filling | ripe | senescing
gddAccum     (accumulated heat units)
soil:        { moisture, N, P, K, pH, tilth, organicMatter }   ← Reserves
stress:      { waterDeficitDays, heatDays, ... }               ← quality erosion
pressure:    { weeds, pests }                                   ← adversarial reserves
```

### `reconcile(plot, now)` — the keystone

On **any read or action**, walk game-time from `lastSeenAt → now` in
sub-steps (the metabolism lazy-sub-step + far-past guard). Per sub-step:

1. `WeatherApi.weatherAt(t, locality)` — rain tops up `moisture`;
   temperature feeds `gddAccum` and drives evapotranspiration.
2. **Reserves:** `moisture += rain − ET(temp,humidity,stage) −
   uptake(stage)`; `N,P,K −= uptake(stage)`; weeds/pests grow if pressure
   is high, stealing from the same reserves.
3. **Growth rate = `base(stage) × limitingFactor`**, where
   `limitingFactor = min` over the normalized satisfactions of {moisture,
   N, P, K, temp-in-band, light}. That `min` is **Liebig's Law of the
   Minimum = the weakest-link `Grade`** the crafting slate already uses.
4. Accumulate maturity; accumulate `stress` when a factor is critically
   starved (erodes quality — never an instant kill; **forgiveness** is the
   cozy contract).
5. Cross a `gddAccum` threshold → advance `stage`.
6. Checkpoint: write back reserves/gdd/stage, `lastSeenAt = now`.

**Path-dependence is solved by checkpointing, not an event log.** A
player intervention (water, feed) mutates the checkpoint at the moment it
happens, then reconciles forward. Between actions only weather drives it,
and weather is free and procedural.

### Soil — six reserves, six lessons

| Reserve | Leash | In / Out | Real concept taught |
|---|---|---|---|
| **moisture** | daily | rain + watering / ET + uptake | evapotranspiration (hot dry days drink fast) |
| **N / P / K** | seasonal | fertilizer/compost/legume / growth uptake | heavy vs light feeders; **crop rotation** (a legume writes N back — emergent) |
| **pH** | slow | amendments | gates nutrient *availability*, not supply ("well-fertilized plot still failing, *why?*") |
| **tilth** | per-till | tilling / rain compaction | soil structure, infiltration (keeps tilling in the loop) |
| **organic matter** | multi-season | compost, cover crops | the long game — buffers moisture, slow-releases N; why a master's plot out-yields a novice's on identical weather (**permanence as world-distribution**) |

### Stages teach *when*, not just *whether*

Needs shift per stage, giving each crop a personality: heavy N in
**vegetative**; P-sensitivity in **flowering** (stress → blossom drop);
K + water in **filling** (stress → small fruit); GDD finishes **ripe**
(overwater → split fruit). A drought at flowering costs fruit *count*; the
same drought at filling costs fruit *size*. Timing dominates.

### The harvest — three outputs, one per idea

- **Yield (quantity)** = coverage/slot-count × per-unit mass, scaled by
  how vegetative + filling went.
- **Quality (`Grade` band)** = weakest-link over the *whole window*. One
  sustained drought week during filling caps the grade. Farming rewards
  your *worst* moment, not the average.
- **Composition (the pharma hook)** = secondary metabolites accumulate
  under *specific* stress (controlled drought → higher compound X — real
  plant chemistry). The same species babied for food (big, bland) vs
  stressed for medicine (small, potent) → different products. "Different
  farms, same biology," down to the molecule.

Harvest mints matter stamped with a `CraftedMixin` maker's-mark (grew on
*this* plot, by *this* hand) → an input to the crafting stack.

---

## Maintenance & the automation ladder (anti-idle)

The loop is **earn → automate → but the automation costs**, so idle income
is structurally impossible. Upkeep is a **real-time drain** (the
[participation](../../subsystems/participation.md) "a human showed up"
divergence — wall-clock, not game-time), and each rung just changes *who
pays*, never *whether*:

| Rung | Who shows up | The cost |
|---|---|---|
| **Hand-farming** | you | your real-time attention (participation) |
| **Farmhand (NPC)** | a `Behaved` brain (employment engine) | **wages out of your account** (conserved economy) |
| **Script** | the command-native interpreter | **metered compute** (the one genuine scarcity) |

Plus honest sinks: tool wear (crafting `ToolMixin`), irrigation repair,
soil-structure/OM decay, and **weeds/pests as an *adversarial* reserve**
(pressure that rises when untended and competes for the same soil). Design
rule: upkeep should be *fought* (weeds you clear feel like farming), never
an HP bar (a fence gauge is a chore). **Automation raises the ceiling; it
never removes the floor.**

---

## Numbers, instruments, competence

- **World quantities are numeric, read with error bars.** A cheap
  thermometer reads ±3 °C; a master's calibrated rig reads ±0.1 °C *and*
  can measure soil water potential the novice can't access at all.
  Leveling buys **precision + coverage**, teaching measurement under
  uncertainty (calibration, precision-vs-accuracy, the limiting
  instrument) — real experimental science.
- **Competence sharpens instruments and widens access — it never
  multiplies yield.** The field always obeys physics; the human always
  supplies the reasoning. (Reject "Farming Lv20 = +40% yield" — it lets
  you grind *past* the science instead of *through* it.)
- **What stops it becoming a wiki-lookup game:** procedural weather
  variance (no memorizable "plant on day 3" — you must read *this*
  season) + the fact that a known equation *still* needs this plot's live
  measurements plugged in. Knowledge is portable; the work isn't skippable.
- **The learning loop is the scientific method:** observe (banded
  outcome) → hypothesize (shade → light-limited?) → instrument (probe the
  light integral) → intervene → confirm. Rewarded with real yield, because
  the engine ran the real model.
- **The two flagship agronomy concepts fall out of shipped substrate:**
  **Growing Degree Days** = the `∫thermal` integral (Q10 seam);
  **Liebig's minimum** = the weakest-link `Grade`. Learn them on tomatoes;
  they transfer to every crop, because it's the same physics.

---

## Genetics & breeding

The vein with the most gold: it turns farming from a seasonal chore into a
multi-season **research program**, and it fits the engine's deepest idea.

### The frame: genotype hidden, phenotype measured

Genetics' central distinction *is* the existing architecture wearing a lab
coat: the **genotype** (alleles) is the hidden truth (like θ, like the
crop's internal state); the **phenotype** is what instruments read. You
never *see* alleles — you **infer** them from expression and from
offspring. That inference *is* the gameplay, and it is exactly what a
genetics course teaches.

### Two layers, because that's how it's taught

- **Simple Mendelian (the on-ramp)** — single-locus, dominant/recessive,
  Punnett squares, 3:1 ratios (the intro-Bio curriculum). Use for marker
  traits: flower color, a disease-resistance gene, a metabolite on/off
  switch. A player can even run **chi-square** on observed vs expected
  offspring ratios (the stats thread).
- **Quantitative / polygenic (the depth)** — additive over many loci →
  the bell curve, **regression to the mid-parent**, **heritability (h²)**.
  The traits that matter (yield, days-to-maturity, hardiness) live here.
  Capstone: the **breeder's equation `R = h²·S`** (response = heritability
  × selection differential) — the player predicts the mean shift from
  selecting the top tail, then grows it out and checks. Real, computable,
  teachable; the natural home for the advanced course content.

### The substrate

- **`Genome` value-object** (a named value-object, like `Quantity`/`Grade`)
  — a map of `locus → allele pair`, diploid, lives on `PlantMixin`. Does
  **meiosis** on `pollinate` (draw one allele per locus from each parent —
  honest segregation).
- **The `Species` gene model** (authored pure-data on the crop-catalog
  `Idea`) declares which loci exist, which alleles are possible, dominance,
  additive tallies, and **pleiotropy**. "Tomato genetics" is content.
- **`express(genome, species) → GrowthParams`** — a pure derive-on-read
  function producing the plant's **reaction norms** (curve shapes, T_base,
  stage GDD thresholds, harvest index, metabolite base + stress
  coefficient, uptake rates, resistance coefficients). `GrowthParams` is a
  value-object the *same* reconcile loop reads.

> **The architectural punchline:** the growth model was *always*
> parameterized. Genetics adds no new engine — it just replaces "copy the
> species constants" with "compute them from this plant's genome." A gene
> never touches an outcome; it only bends the curves the environment is run
> through.

**Shared substrate — this breeds livestock too.** The
[ranching slate](./ranching-slate.md) flags a probable net-new gap: a
reproduction/breeding driver and "selective breeding / stock quality."
That is *this same substrate.* An animal already has a `Species` +
`BodyPlan` + vital-profile parameters; genes-as-reaction-norms bend *those*
curves exactly as they bend a crop's `GrowthParams` (a "hardy" allele
lowers the cold-stress threshold on a cow the same way it does on a
tomato). So the `Genome` value-object, meiosis, `express`, the two-layer
Mendelian/quantitative model, and the breeder's equation are a
**husbandry-wide** layer — *build it once, for crops and livestock both*
(the `lib/standing/` precedent). The only divergence is the surface verb
(`pollinate` vs mate/gestation over `WorldClock`) and which parameter set
the genome bends.

### The breeding loop

`pollinate <A> with <B>` (engaged activity) → meiosis → **seed carrying a
specific genome + provenance**. Grow it out (**a generation is a season** —
time is the real cost, tying to the participation/maintenance ethos),
measure, select the best, cross again. Over generations you drive alleles
to **homozygous ("fixed")** and the line **breeds true**. Emergent payoffs:

- **A fixed line is fungible; a segregating one isn't.** Homozygous seed →
  identical offspring → a stackable `Globbable`. F2 seed → heterogeneous →
  can't cleanly stack. The genetics decides the item behavior.
- **A stabilized cultivar is a named, provenance-stamped, world-
  distributable artifact** ("Bobalu's Drought-King tomato") — sold, gifted,
  traded. Player-authored crops entering the shared world: the cooperative
  content model, in seeds.

### The G×E interlock (why the environmental sim is load-bearing)

**phenotype = genotype + environment + noise.** A superb genome in bad
soil yields poorly, so you *cannot* read genotype off phenotype. The
breeder must **replicate, control, and compare against the mid-parent** —
**heritability is exactly the genetic fraction of phenotypic variance**,
and the weather/soil sim is the *noise the genetics is read through.*
Because genes bend curves, an allele's value is **environment-dependent**
and can even flip sign (crossover G×E): drought-tolerance is invisible in
wet soil and actively harmful if it carries a yield cost. **No universal
best cultivar — only best-for-this-niche.** This dissolves the copy-the-
meta-build problem at the root, and it's biologically true.

### Depth dials

- **Antagonistic pleiotropy (v1)** — an allele contributes `+` to one
  parameter and `−` to another (early maturity ↔ lower yield; big fruit ↔
  fewer fruit; high metabolite ↔ slow growth). Makes breeding genuine
  multi-objective optimization with no free lunch.
- **Linkage (deferred, v2)** — nearby loci co-segregate (linkage drag);
  needs a chromosome/position structure on the `Genome`. Ship independent
  assortment first.

---

## Magic as pharmacology

Magic integrates *scientifically* by not being integrated at all — it
**emerges from chemistry**. The rule "magic is never an engine word" is the
whole trick, not a limitation.

- **A plant biosynthesizes active compounds;** genetics + cultivation set
  *which* and *how much* (metabolite loci — just more loci, no separate
  magic-genetics engine). Extraction/synthesis concentrate and combine
  them. The effect is a **lawful, dose-dependent, half-life-governed
  perturbation** of shipped substrates. The exemplar already ships:
  alcohol → BAC → the toxin-burden model. A potion is *that, everywhere.*
- **Why it's the whole shebang, not stat potions:** a compound is a key
  that fits locks all over the engine, and the locks are **capabilities**,
  not numbers:

| Substrate the compound hooks | Magic it reads as |
|---|---|
| **augmentation** (augment-confers-mixin) | temporary `Flyable` (levitation), a new `SenseChannel` (nightsight, detect-life), an `AetherHosted` capability (telepathy) — real new ability |
| **vitals / metabolism** | healing (accelerated repair), poison, stimulant, sedative |
| **perception + belief** | invisibility as disguise/perception gating |
| **thermal regulation** | fire ward (setpoint shift); overdose → hyperthermia |
| **reserve** | restores/expands an authored magical reserve — the capability-magic slate's mana seam, finally lit |

- **Dual layer keeps it honest *and* magical.** The engine sees *"compound
  M-7: setpoint +ΔK, half-life 40 min, toxic above dose D, biosynthesis
  gated on loci {…}"*; the content calls it *"Salamander's-Blood, a Fire
  Ward tincture."* The MML/theme/thematic-seam discipline: honest
  mechanics under evocative names.
- **North-star closure:** farming is now **the primary production of
  magical materials** feeding synthesis, brewing, and enchantment
  (compound-impregnated `Material`) — the same sentence as "food farm
  feeds the kitchen" and "grain feeds the herd" (the
  [ranching](./ranching-slate.md) **feed loop**: crops → feed → livestock
  → products → crafting → market). One primary-production node, three
  downstream chains — food, magic, and livestock — all under the same
  conservation.
- **Relation to the [capability-magic
  slate](../deferred-rpg/capability-magic-slate.md):** that slate's
  thaumic-channel/affinity/spellcraft model is a *distinct* magic vector;
  the pharmacological one **composes** with it (a compound refills a mana
  `Reserve`; a farmed reagent is spellcraft input). Neither adds a magic
  engine word.

---

## The synthesis / brewing layer

Brewing is the **next transform branch** of the craft engine (the slate
already declared "assembly/cooking/smithing are new branches"). It reuses
recipe-resolve, the maker's-mark, tools, control, `Grade`-as-weakest-link,
conservation, and the by-hand engaged path (`pour`/`stir`/`strain` from the
bar). It adds **one** idea:

> In cooking, the recipe *fixes* the output. In brewing, **the output
> composition is computed from the input chemistry × the process** — so
> the same recipe with a different cultivar yields a different potion.

That is the causal spine of the whole magic system: **genetics →
cultivation → harvest profile → brew → effect**, unbroken. The recipe
describes the *process*; the engine runs the *chemistry*.

### Three sub-stages, each teachable chemistry on shipped substrate

1. **Extraction** — pull compounds out of plant matter. **Polarity decides
   selectivity** ("like dissolves like"); **temperature** speeds extraction
   but degrades fragile compounds (decarboxylation, denaturation). Choose
   solvent + temperature + time + grind to lift the target and leave the
   junk. Substrate reuse: the **`Flask` thermos is the vessel** (holds and
   blends temperature calorimetrically on `BulkableApi.transfer`; heated on
   a `Campfire`, read with `feel`/a thermometer; degradation thresholds are
   thermal bands). Output: an extract (bulk liquid) with a compound profile.
2. **Reaction / synthesis** — compounds react into new compounds (the
   effect neither had alone). Needs **conditions** (heat, pH, catalyst,
   time) and obeys **stoichiometry** — mass balance *asserted* (the
   conservation rule). The **reaction network is authored data** — the
   combinatorial magic, in a table, not code.
3. **Purification / formulation** — impurities (unreacted/degraded matter)
   carry their own (usually toxic) effects. Filter/distill/recrystallize →
   **potency (`Grade`) up, toxic margin up**; set concentration → the
   **dose**. Novice brews are cloudy, weak, gut-burning; masters produce
   clean, potent, safe extracts. **Purity is the quality axis** — real
   chemistry, not a slider.

### Discovery is the research loop

The engine **runs the chemistry whether or not you know the recipe**, so
off-recipe brewing gives a real result (garbage or a discovery). The
by-hand path (engaged `ManualBuild` steps + `mintFromBuild` reverse-
matching) is how you *experiment*; the **known-of→can-make ladder** gates
the named, repeatable recipe; the `Transcriber` demonstration-capture banks
a new one. The University teaches the **reaction principles** so you
*predict* a route instead of brute-forcing 200 brews (mirrors the breeding
loop; the advanced course pays off here).

### Control & dosing

Every process parameter (solvent, temperature, pH, time, grind, ratio) is a
dial — the crafting `fixed control` input, blown out into a rich space.
Instruments read them with error bars; competence buys precision + which
reactions you can attempt. The finished potion is bulk liquid at a known
concentration: `drink` vs `sip` + the `:{N unit}` measure grammar = **dose
control**, running straight into metabolism/toxin (microdose mild-and-safe,
chug strong-and-toxic; half-life, tolerance, interactions come along). The
vial carries a maker's-mark; **potency = the BUC-style quality axis** (clean/
potent vs cursed/impure — earned, not a coin flip).

---

## The University & the external-mastery seam (pedagogy)

The University is the **diegetic skin over a teaching/credential seam** —
the platform's reason for being, and farming is a clean first vehicle.

- **The shop sells the instrument; the University sells the meaning.**
  Anyone can buy a thermometer and read 18 °C; knowing that tomatoes
  accumulate GDD above a 10 °C base and computing days-to-harvest is
  *taught*. Raw measurement is ungated; the **models that turn
  measurements into decisions** are the University's product.
- **The number-vs-meaning gate** as the core teaching mechanic: you can
  always *see* `−0.8 MPa`; you can't *act on it well* until a course mints
  the model (a chronicle *known-of* claim). Draw the line at depth — basic
  reads (cold, dry) ungated; the models (water potential, stoichiometry,
  controlled-stress metabolite yield) are the taught layer.
- **The external-mastery seam (the north star).** The University is the
  diegetic representation of an external learning model: **complete real
  course material → get trained in-game; demonstrate real, proctored
  mastery → that feeds capability back into the world.** This is the
  strongest resolution of the *two-learners* problem (character competence
  vs. human understanding): **real mastery collapses them honestly** — the
  character advances because the human genuinely learned. The character's
  skill is *earned in reality*; the honesty firewall taken to its end.
  - **Build the seam, not the dependency.** External mastery is *one
    issuer* behind the existing [credential
    substrate](../../subsystems/credential.md) (a mastery cert is a
    `Credential` — a *presentation* whose validity is *derived* from an
    issuer; the deferred issuer-authorization ledger is exactly this
    shape). The seam is fed by in-game teaching by default; an external
    provider plugs in as an adapter. Either way the game is whole.
  - **Deed vs claim maps cleanly:** course completion = a `claim`
    (known-of); proctored mastery = a `deed` (can-do, verified) — the
    chronicle already distinguishes them by provenance, and the ladder does
    the rest.
  - **Un-spoofable:** the attestation arrives through a verified server-
    side seam, never player-claimable (the gated-API actor-from-context /
    provenance discipline).
  - **Real mastery raises the ceiling; it never gates the floor.** The
    game is fully fun on in-game learning + doing alone; external mastery
    is a *premium unlock* for the deep tier (the advanced-genetics course
    unlocks the marker assay and turns a 20-season campaign into 5).
- **Because the math is real, the teaching is real.** GDD, Liebig,
  Mendel, stoichiometry, the breeder's equation are *true outside the
  game* — the curriculum is genuine education, and player-authored
  explainers (the [help](./help-slate.md) player→contributor on-ramp) are
  genuine knowledge.

---

## Substrate mapping (what's reused)

| Farming need | Shipped substrate |
|---|---|
| crop maturing over time | metabolism's reconcile-on-read over game-time |
| weather driving growth | weather's stateless procedural field |
| sun / temperature | light + thermal (GDD = `∫thermal`, Q10) |
| water / irrigation | bulk (`fill`/`pour`/transfer/drain) |
| soil fertility/moisture/tilth | `Reserve` instances |
| tools wearing out | crafting `ToolMixin` + `GradedMixin` |
| harvest → product | crafting `Recipe`/`craft` (+ brewing branch) |
| eating / dosing | metabolism macro routing + toxin/BAC dose model |
| selling produce | banking + the conserved economy |
| getting better | advancement (`Discipline`, declared-focus, bands) |
| owning the land | tenure + address/`Locality` |
| farm structure | the Warren elastic graph (buds field-rooms) |
| discrete plants | `Slotted`/`Slottable` beds |
| magical effects | augmentation / vitals / perception / thermal / reserve |
| technique/recipe gating | chronicle known-of→can-make ladder |

---

## Buildable-now — the staple loop (v1)

Enough is settled to ship a cozy first slice with **no genetics and no
magic**:

- **A farm = a one-node Warren** under a `Locality`; **field = a room**,
  soil as `Reserve` instances on its `Floor`; the **aggregate** density
  only.
- **The tend loop:** `till` (hoe-afforded engaged activity → unlocks
  `plant` via per-instance affordance), `sow`, `water` (`BulkableApi`
  transfer from a can), `feed`, `harvest`.
- **Reconcile-on-read growth** (no tick, no presence freeze): GDD + the
  Liebig weakest-link over the six soil reserves + the ∫weather integral;
  stage progression; **forgiveness** (starvation lowers quality, never an
  instant kill).
- **Harvest mints matter** stamped with a maker's-mark + a `Grade` band,
  feeding the **existing crafting + metabolism loop** (grow → cook/mix →
  eat/drink — a complete cycle with zero new consumer needed).
- **One authored crop** (a staple, e.g. a grain or tomato) as the
  crop-catalog seed; **band-only surface** by default, one cheap
  instrument (a soil probe) as the first progressive-disclosure step.

What v1 deliberately does **not** ship: genetics, the brewing/synthesis
branch, the magic effect layer, and the University teaching seam.

---

## Phases

1. **Staple loop** (buildable now) — the land model + growth engine + the
   tend loop + harvest-into-crafting. Proves the vertical.
2. **Genetics & breeding** — `Genome` + the Species gene model +
   `express` reaction norms + `pollinate`/breeding loop + the numeric
   instrument tier (the breeder's equation).
3. **Synthesis / magic** — the brewing transform branch (extraction /
   reaction / purification) + the compound effect layer over shipped
   substrates + discovery.
4. **University teaching seam** — the number-vs-meaning gate + the
   external-mastery credential adapter (in-game issuer first; external
   provider as a swap).

---

## Prior art

| Source | What we take |
|---|---|
| **Stardew Valley** | the cozy daily ritual, **forgiveness** (no hard-fail), and the automation ceiling (sprinklers → *our* scripting + farmhands) |
| **Dwarf Fortress** | the band-word-not-a-number quality verdict (inherited via crafting) |
| **Real agronomy** | GDD, Liebig's minimum, evapotranspiration, crop rotation, pH availability — the science that *is* the depth |
| **Quantitative + Mendelian genetics** | genotype/phenotype, Punnett + heritability, the breeder's equation `R = h²S`, G×E |
| **Mewgenics** | breeding *for effects* (not just stats) — but grounded in real biochemistry, effects across substrates |
| **Eco** | economy + governance + real material constraints — the combination |
| **Andy Weir** | the engine actually runs the real science; the player *derives* the answer |

---

## Open problems & deferred

- **Tending cadence tuning** — moisture-drain vs rainfall frequency, and
  how early automation unlocks (high-touch/cozy/small-scale vs low-touch/
  scaling). *An open question below.*
- **Effect-resolution detail** — exactly how a compound's profile fires
  across vitals/augmentation/perception when consumed (the "what the potion
  does to you" end). Sketched; not specified.
- **The teaching unit** — course (one-to-many, mints a claim) vs mentor
  (one-to-one, faster) vs treatise (asynchronous artifact). Which ships
  first. *An open question below.*
- **The external-mastery adapter** — contingent on a learning-provider
  partnership; the *seam* is designed here, the concrete adapter is a swap.
- **Genome linkage / chromosomes (v2)** — the position structure behind
  linkage drag.
- **Spoilage / perishability** — the harvest decaying post-pick; rides the
  [metabolism tail](../tails/metabolism-slate.md).
- **Numeric calibration** — every rate, threshold, and curve constant.
  Deferred to a running game to tune against.
- **A full farming design doc** — this slate is the surface; surviving
  design graduates to `docs/subsystems/` once a slice ships.

---

## Open questions

1. **Tending cadence** — a *frequent* small ritual (high-touch, cozy,
   caps plot count) or a *sparse* one (low-touch, scales, leans on
   weather)? *Lean: frequent-but-forgiving early, automation-relieved
   late — the Stardew arc.*
2. **How far do numbers surface** — do high-competence instruments cross
   from bands into real quantities for the deep player? *Lean: yes — world
   quantities are numeric with error bars; only the self-estimate (θ)
   stays a band.*
3. **First teaching unit** — course / mentor / treatise. *Lean: course
   (mints a known-of claim) as the diegetic study.com analogue.*
4. ~~**Crop catalog as `Species`-family or its own tier**~~ **RESOLVED
   2026-07-30 — reuse the existing tree.** The `Species`/`Clade` taxonomy
   already spans `animalia` *and* `plantae` (a sessile peace-lily row is
   the proof token), so crops, livestock, and pets are **one catalog
   shape** — which is what makes the husbandry-wide genome coherent. This
   overturns the earlier lean toward a sibling catalog. *Caveat: the
   peace-lily row is documentation-only today — `race.md` lists it, but no
   seed exists in the tree, so the first real `plantae` row is farming's to
   author.*
