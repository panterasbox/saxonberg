# Farming slate (working doc)

> **Status: PARTIAL** — the growth model + smallholding (2026-08-01),
> Stage A's perennials/market (2026-09-01) and the farmstead build's
> field, winter and pasture (sward only — nothing sows a field yet) →
> [husbandry.md](../../subsystems/husbandry.md) ·
> [soil.md](../../subsystems/soil.md) · compacted 2026-09-19
> (ledger: `docs/plans/slate-compaction/husbandry.md`)
> **Left:** the arable field crop — the aggregate density (`sow`/`water`/
> `harvest field`; no verb sows a `Field`) · plant genetics — `Genome`,
> `express` reaction norms, `pollinate`, cultivars and fixed-vs-segregating
> seed lots, the husbandry-wide breeding substrate · the environment-control
> tier (greenhouse glass + hydroponics) · the sun→ambient light driver ·
> per-stage stress sensitivities + yield scaling + the composition output ·
> ⭐ **the plantation crop family** (coffee · tea · cocoa · tobacco · cotton ·
> spices · sugar — needs no new mechanism, but ⚠ **no warm biome exists**,
> 2026-09-25) ·
> the automation ladder (a hireable hand on YOUR ground, the irrigation
> rung, metered compute) · weeds/pests as an adversarial reserve, thorns as
> hazards, hedges as a grown boundary · the compound effect layer (*magic
> as pharmacology* — contradicted by `magic.md`, to reconcile) · the
> computed-chemistry brewing layer · the University teaching seam (the
> teaching unit, the external-mastery adapter) · a farming district at
> scale (Stage B1's hectare-band plat) · per-locality season (weather's
> seam)
> **Size:** a build

Working slate for **farming** — how a player grows crops, breeds
cultivars, and turns a harvest into food, materials, and (with the right
biology) magic. It is deliberately **Stardew on the surface, real science
underneath**: a cozy daily ritual whose optimization ceiling is genuine
agronomy, genetics, and pharmacology, taught through the game's honest
models.

See also:

- [docs/slates/builds/daves-bar-slate.md](../builds/daves-bar-slate.md) — the
  **precedent integrating vertical.** Farming is its sibling and its
  **upstream supplier**: crops are the primary production that feeds the
  bar's kitchen and the reagent economy.
- [docs/slates/tails/crafting-slate.md](../builds/crafting-slate.md) — the
  **transformation stage** the harvest flows into. Brewing/synthesis is
  a *new transform branch* of the same craft engine; the maker's-mark,
  quality-as-verdict, tools, and conservation rules all carry over.
- [docs/slates/builds/economy-slate.md](../builds/economy-slate.md) — the
  conservation spine. Farming is a **source node**: primary production
  entering the one conserved economy.
- [docs/slates/builds/property-slate.md](../builds/property-slate.md) — **the
  parent.** Land ownership, the titled **parcel**, tenure, and the
  **compute-allowance** scarcity all live there; farming *consumes* it. A
  farm's field-rooms are parcels carrying a compute allowance (which is
  what the maintenance/upkeep drain below is priced against); this slate
  owns only the *spatial subdivision + biology*, not the title or the
  meter. The "assume I already have the land" premise is property's.
- [docs/slates/builds/disease-slate.md](../builds/disease-slate.md) — **blight, and
  rotation's second reason.** Farming is disease's **first proving ground**
  (simplest host, lowest stakes); disease gives crop rotation its truer
  historical reason (breaking the pathogen cycle) alongside the nutrient one
  this slate already has, and resistance is the Mendelian marker trait the
  Genetics section already names.
- [docs/slates/builds/stewardship-slate.md](../builds/stewardship-slate.md) — **the
  gate.** Land use decides whether a parcel admits cultivation and at what
  density (none / a bed / a field); the allowance cascade decides how much
  liveness the locality funds. Also the home of the residence ladder the
  houseplant on-ramp sits at the bottom of.
- [docs/slates/builds/ranching-slate.md](../builds/ranching-slate.md) — **the
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
- [docs/slates/builds/advancement-slate.md](../builds/advancement-slate.md) —
  Farming is a `Discipline`; competence bands, declared-focus deliberate
  practice, the knowledge ladder gate the depth.
- [docs/subsystems/chronicle.md](../../subsystems/chronicle.md) — the
  known-of→can-make ladder gating recipes/techniques; deed-vs-claim by
  provenance (the external-mastery seam reuses it).
- [docs/slates/deferred-rpg/capability-magic-slate.md](../builds/capability-magic-slate.md)
  — the **thaumic-channel** magic model. This slate's *pharmacological* magic is
  a distinct, biology-grounded vector; the two **compose** (a farmed compound
  restores a mana `Reserve`; a reagent feeds spellcraft), and neither adds a
  "magic" engine word.

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
   presence-freeze** — crops grow while nobody's online. ⚠ **And it does NOT
   inherit the bodies-only far-past guard** — see [ranching § The
   clock](../builds/ranching-slate.md); bound long absences with a step cap, not a
   time cap.
   > **Generalized 2026-07-30** — this is no longer a farming-specific
   > divergence from metabolism; it is the **family-wide clock**, shared
   > with ranching and pets: *things you own reconcile against world time;
   > the body you inhabit reconciles against played time.* The avatar's own
   > metabolic clock still freezes on logout (you can't hire someone to eat
   > for you). Owned assets never do — offline decay is made fair by the
   > **automation ladder** below, whose limit is that *automation maintains
   > your assets; it cannot maintain your relationships.* Owner:
   > [ranching-slate § The clock](../builds/ranching-slate.md).
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

## The clock — what the player actually experiences **[DECIDED 2026-07-31]**

> *Compacted 2026-09-19.* The 12× clock (1 game day = 2 h, a season 7.5 real days, a year 30) →
> [time.md](../../subsystems/time.md); *a daily player skips 12 game days*
> and what it did to the cadence lean → [husbandry.md § Calibration](../../subsystems/husbandry.md).
> *The rule: design cadence around the login* shipped as the calibration
> itself → same section (*every threshold is calibrated against the login,
> not the game-day; the reserve is sized against the login*).

Corollaries worth holding:

- **A multi-season breeding program is a real-month commitment** (a game year is
  30 real days). Fine for crops; see ranching for the animal-side tension, where
  generation interval is the whole pedagogical point *and* the whole cost.
- *Ranching's correction landed as the residual: a stock move is a READ*
  *(move at residual, return at recovery), not a 1–3-day timer →*
  *[soil.md § Residual and recovery](../../subsystems/soil.md).*

### Implementation note — read weather, don't trust the room

> *Compacted 2026-09-19 — superseded by the code.* The elapsed-window
> read exists: `WeatherApi.precipitationBetween(t0, t1, locality)` is a
> **sum over segments**, integrated by the soil on its next read
> ([weather.md § `precipitationBetween`](../../subsystems/weather.md),
> [soil.md § Two checkpoints, and the tri-state](../../subsystems/soil.md)); temperature
> reaches the ground and the plant through `BiomeApi.resolveTemperatureFor`
> restamped on the host, never the room's stamp
> ([husbandry.md § A fifth limiting factor: `cold`](../../subsystems/husbandry.md)).

---

## The three axes **[DECIDED 2026-07-31]**

This slate had a **density** axis and nothing else. Two more make the space
explicit, and every combination is a real farm type read off **one engine with
different parameters** — the slate's own *"one biology, many farms — content,
not code."*

| Axis | Range | What it varies |
|---|---|---|
| **Density** | aggregate matter → slotted individual → single carved plant | how much *identity* a plant has |
| **Environment** | open field → greenhouse → hydroponics | how much *variance* you have bought away |
| **Time horizon** | annual crop → perennial orchard | how long the *commitment* runs |

Worked examples: a staple field is *(aggregate, open, annual)*. A pharma herb
lab is *(slotted, hydroponic, annual)*. An orchard is *(slotted, open,
perennial)*. A houseplant is *(single, indoor, perennial)*.

### The environment axis is a variance-reduction ladder

Each rung trades money for control — and this is real horticulture, not a game
progression invented for the occasion:

| Rung | Removes | Costs |
|---|---|---|
| **Open field** | nothing | free; fully at weather's mercy; strictly seasonal |
| **Greenhouse** | temperature + most weather | build + **fuel** (the thermal/fire economy) |
| **Hydroponics** | **soil entirely** (nutrients become a controlled solution) | equipment + precise inputs; maximum control |

**Greenhouses are what winter is for.** Without a hard season nobody builds one,
which is the strongest argument for keeping winter hard (below). Hydroponics is
where the numeric instrument tier finally pays off — the one environment precise
enough that exact numbers beat bands.

**Substrate check (2026-07-31):** heating is *better* supported than expected —
`AtmosphericMixin.setTemperature()` on a `Location` is a room-scope override
that **terminates the resolve chain** and fans out a restamp to everything
inside, so a heated greenhouse works cleanly. The awkward half is light:
**`SkyExposed` is a property of the biome template, not the room** — no per-room
override, no partial value — so "sheltered but lit" is a binary chosen by which
biome you hang. The `Window` boundary (`baseTransmissivity`, `colorTint`,
implementing `LightConduit`) is the right seam for glass, but it propagates flux
*from an adjacent room*, and **no room has sun-derived flux yet** (see
*Substrate mapping*).

### Orchards — the perennial, and the tenure hook

> *Compacted 2026-09-19.* The perennial shipped: monocarp vs polycarp, a crop as a pulse, the
> verdict window re-seeded at the set → [husbandry.md § The fruit cycle](../../subsystems/husbandry.md).

> **The orchard is the mechanic that makes land tenure emotionally real.** You
> only plant trees on ground you are confident you will still hold in five
> years. Nothing else in the design ties a player to a specific parcel that way
> — which makes it [property](../builds/property-slate.md)'s best gameplay argument.

> *Compacted 2026-09-19.* The standing tap shipped on the **flowering latch**, not the residency
> reset sweep → [husbandry.md § The fruit cycle](../../subsystems/husbandry.md).

### Houseplants — farming's on-ramp **[DECIDED]**

> *Compacted 2026-09-19.* Shipped as phase 1 → [husbandry.md](../../subsystems/husbandry.md)
> (the pot as the density dial at N = 1; the starter pot on every dorm
> desk; *no bond, no regard — a plant cannot hold an opinion of you*, § Deferred seams).

---

## Winter **[DECIDED 2026-07-31]**

> *Compacted 2026-09-19.* Season is global (one `CAMPUS_LATITUDE`) → [weather.md § Season](../../subsystems/weather.md);
> the per-locality climate bias shipped as `Locality._climateLean` (weather
> distribution only — [weather.md § The coexistence resolve](../../subsystems/weather.md)).

### Keep it hard — winter is why preservation exists

> *Compacted 2026-09-19.* Graduated → [soil.md § Winter](../../subsystems/soil.md) (the
> mechanism: cold + short days at a place, the greenhouse falls out free;
> and now the *why hard*: preservation, the shared world event).

### What a player actually does, in ascending cost

1. **Process what you stored.** Winter is when the *transform chain* runs —
   cheese, cloth, preserves, tool repair. The harvest→crafting coupling stops
   being a footnote and becomes the season's activity.
2. **Buy your way out** — the greenhouse rung.
3. **Own land somewhere milder** — blocked on the reserved per-locality climate
   seam.

### Two honest problems

- ~~**Spoilage is the hard dependency.**~~ Shipped → [spoilage.md](../../subsystems/spoilage.md)
  (the microbial load, curing, the kill curve); winter is an economy now.
- **7.5 real days of no outdoor growth could bounce a farming-only player.** The
  mitigation is that mining, fishing, and crafting are live enough to absorb
  them — which makes this a **sequencing dependency**, not something the farming
  design solves alone. Name it; don't pretend it's handled.

---

## The land model — farmland without sub-room geometry

> *Compacted 2026-09-19.* Title, the land draw and the holding are documented → [parcel.md](../../subsystems/parcel.md),
> [smallholding.md](../../subsystems/smallholding.md), [holding.md](../../subsystems/holding.md);
> the compute allowance stays inert (`property-slate`).

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

> *Compacted 2026-09-19.* The N-slot bed shipped (`GardenBed`, `CultivableMixin` over the shared
> soil) and the contents-AND-slot caveat is documented →
> [husbandry.md § A slotted plant lives in the pot's contents *and* its slot](../../subsystems/husbandry.md),
> [smallholding.md](../../subsystems/smallholding.md).

### A field-room is a land-use choice — and grazing is one of them

> *Compacted 2026-09-19.* Shipped → [soil.md § The sward, and the land uses
> nobody declares (D7)](../../subsystems/soil.md) — the four-row table, *fertility follows
> the mouths*, `mow` and grazing as one draw on one reserve. ⚠ The *crop*
> row has no producer yet: nothing sows a `Field` (see *The land model*).

---

## The growth model (the engine)

### The checkpoint

> *Compacted 2026-09-19 — superseded by the shipped state.* The plant
> carries `growthClockStamp`, stage, vigor, `_worstLimiting`, `_fruitFill`
> and the light/ambient samples ([husbandry.md § The reconcile contract](../../subsystems/husbandry.md));
> the **ground** carries its own checkpoint and reserves
> ([soil.md § Two checkpoints](../../subsystems/soil.md)). No `genome` (see *Genetics*),
> no `stress`/`pressure` slots.

### `reconcile(plot, now)` — the keystone

> *Compacted 2026-09-19.* Shipped → [husbandry.md § The reconcile contract](../../subsystems/husbandry.md)
> (sync, read-triggered, idempotent; step cap never time cap; the minimum
> over water · light · root · nutrient · **cold**), [§ Durability](../../subsystems/husbandry.md)
> (checkpointing, not an event log; a mutating act captures its host).
> ⚠ Not as written: there is **no `gddAccum`** — maturity accrues by
> *good time* above `husbandry.goodAt` and temperature enters as the
> `cold` factor — and weeds/pests are absent (see *Pests* below). The
> elapsed-window weather read is `precipitationBetween` (*The clock*).

### Soil — six reserves, six lessons

> *Compacted 2026-09-19 — superseded by the code.* Soil shipped as **four**
> reserves — moisture · nitrogen · organic matter · structure — with
> legume fixation in and leaching out → [soil.md § The four reserves](../../subsystems/soil.md).
> **pH is not a reserve**: it is the seeded `GroundCharacter.nativePh`,
> offset by `lime`/marl, and it prices *improvement*, never availability
> → [§ Ground character](../../subsystems/soil.md), [§ D55](../../subsystems/soil.md). P · K · tilth did not
> ship (bone meal's row says phosphorus is *"the second thing a field runs
> out of"* — a stated seam, no reserve behind it).

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

> *Compacted 2026-09-19.* Harvest mints a `Crop` — a `Provision` carrying the maker's mark, a
> `Grade` off the worst limiting stretch and the spoilage gauge →
> [husbandry.md § Content](../../subsystems/husbandry.md), [§ The fruit cycle](../../subsystems/husbandry.md).

---

## Maintenance & the automation ladder (anti-idle)

The loop is **earn → automate → but the automation costs**, so idle income
is structurally impossible. Each rung just changes *who pays*, never *whether*:

> *Compacted 2026-09-19.* The struck real-time-upkeep note is history: owned things run on ONE
> clock, world time → [husbandry.md § The clock rule](../../subsystems/husbandry.md).

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
never removes the floor** — and per the family rule, automation buys
*reliability at a quality penalty*: a hired hand runs a cadence, a player runs
the read.

### Irrigation, and the one commons inside private farming

Irrigation is the automation rung for watering, under the same
cap-at-the-boring- reward rule (a fixed schedule cannot read the soil). The
*interesting* half is the **source**, because water rights are the classic
commons problem of real agriculture — and it cuts against the family's property
line, where farm/ranch renewal is **private** while mining and fishing are
**commons**. Water would be the exception: **a commons living inside the private
system** — upstream and downstream, a shared draw, a real fight between the
Grange and the Landwrights. Excellent polity-paper material.

> *Compacted 2026-09-19.* The finite-source premise is overtaken: the water pack shipped flow as
> a **takeable volume**, `StorageNode` levels, and rights as *volume per
> window + priority date* (prior appropriation records · riparian derives)
> → [watershed.md § Flow is a TAKEABLE volume](../../subsystems/watershed.md),
> [§ Storage and control](../../subsystems/watershed.md), [§ Rights](../../subsystems/watershed.md).
> The household tap stays deliberately unlimited (*"rivalry lives at
> agricultural and industrial scale"*); `UnboundedSource`'s docstring still
> names the regenerating well as deferred.

### Pests, thorns, and navigability

- **Pests are entirely net-new.** Verified absent — no `vermin`/`pest`/`infest`
  anywhere in the tree, and no brain consumes, removes, or damages world
  objects. The design above (adversarial reserve) stands; it just has no
  substrate to lean on. Worth one cross-system note: **the vermin eating your
  crop are the vermin eating your stored grain**, which makes storage a real
  concern and feeds straight back into *Winter*.
- **Thorns are cheap, with one gotcha.** `HazardMixin` is self-resolving and the
  locus is free — compose it on a `Location` for a bramble *room*, or author a
  `/lib/hazard/Trap` instance with `trigger: traversal` and a `point`-channel
  delivery. **The gotcha: `resolveTraversal` skips anyone who perceives the
  hazard, so an *obvious* hazard never fires.** A visible bramble patch would
  never hurt anyone — author a low concealment band, or add an always-fires
  path. Separately, "reaching into the bramble hurts" is *absent*:
  `SearchController` never touches hazards; it is one call at `SearchActivity`
  completion.
- **Crops should not obstruct movement.** No terrain- or contents-derived
  traversal cost exists anywhere (`LocomotionMode.costMultiplier` is authored
  and has **no reader**), and adding one is a new primitive for thin payoff.
- **Tall crops granting cover is free — and crude.** `coverScoreOf` literally
  counts the non-`Mobile` contents of the hider's container (capped at 6), so a
  maize field grants cover today with zero new code — **and so does a room with
  six chairs.** The real gap is that cover has **no per-object weight**; nothing
  distinguishes standing wheat from furniture. That is a stealth-wide problem,
  **not farming's to fix** — but a hedge-and-cornfield build would be its most
  visible customer.
- **Hedges are a boundary you *grow*.** The one navigability-adjacent thing
  worth building: a living fence is cheap in materials and expensive in *time*
  (it must establish before it works), which is a genuine third option in
  [ranching](../builds/ranching-slate.md)'s fencing tradeoff alongside built fence and
  hired labor.

---

## Numbers, instruments, competence

> *Graduated 2026-09-21.* The first two bullets — world quantities read with
> error bars; competence sharpens instruments and never multiplies yield —
> → [husbandry.md § Why competence sharpens instruments and never multiplies
> yield](../../subsystems/husbandry.md) and [soil.md § D5 — the survey is
> per-viewer](../../subsystems/soil.md).

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
[ranching slate](../builds/ranching-slate.md) flags a probable net-new gap: a
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
  identical offspring → a stackable `Stackable`. F2 seed → heterogeneous →
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
  [ranching](../builds/ranching-slate.md) **feed loop**: crops → feed → livestock
  → products → crafting → market). One primary-production node, three
  downstream chains — food, magic, and livestock — all under the same
  conservation.
- **Relation to the [capability-magic
  slate](../builds/capability-magic-slate.md):** that slate's
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
  explainers (the [help](../builds/help-slate.md) player→contributor on-ramp) are
  genuine knowledge.

---

## Substrate mapping (what's reused)

> **Audited 2026-07-31.** Most rows hold. **The `sun / light` row did not** —
> corrected below, and it is the single biggest under-estimate in this slate.

| Farming need | Shipped substrate |
|---|---|
| crop maturing over time | metabolism's reconcile-on-read over game-time |
| weather driving growth | weather's stateless procedural field — ⚠ **via the resolved read, NOT `weatherAt`** (that would drop authored pins); needs the time-parameterised resolve, see *The clock* |
| **temperature** | thermal — **real** (GDD = `∫thermal`, Q10); `AtmosphericMixin` even gives a room-scope override that fans out a restamp |
| **sun → light** | ⚠ **NET-NEW, farming owns it.** `setAmbientFlux` has **zero non-test callers**; `CelestialApi.sunAltitude`/`isDayAt` are fully implemented but consumed only by readout verbs and weather generation. **Nothing derives a room's ambient light from the sun.** `obj/Lamp.ts` (an hourly `WorldClockApi.every` flipping a light at dusk/dawn) is the pattern to copy. Crops need light, so this is a hard prerequisite — and it also blocks the greenhouse glass story (`Window`/`LightConduit` propagates flux *from an adjacent room*, and no room has sun-derived flux to propagate) |
| **seasons** | built but **unused** — `CelestialApi.currentSeason` has two consumers (a readout verb, weather generation); **no object's state is keyed to a season**, and `atNextSunrise`/`atNextSunset`/`atNextFullMoon` have **zero callers**. Cheap wiring, but not free |
| **plant taxonomy** | the hook exists and the shelf is empty — `seeds/lib/body-plans/sessile.yaml` is documented for "plants, corals, mushrooms," but `seeds/lib/species/` contains only `wolf.yaml`. **Farming authors the first plant species** |
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

> *Compacted 2026-09-19 — shipped, in three stages and a different shape.*
> The houseplant pre-v1 → [husbandry.md](../../subsystems/husbandry.md); the bed on ground you
> own, `feed`, the weakest-link harvest → [smallholding.md](../../subsystems/smallholding.md); the
> field, `plot`/`grub`/`ditch`/`lime`/`plough`/`mow`, four soil reserves,
> the survey ladder → [soil.md](../../subsystems/soil.md). `till` did not ship (clearing is
> `grub`/`plough`); `sow` is an alias of `plant`; the "hard prerequisite"
> sun→ambient light driver was NOT needed — rooms author `ambientIntensity`
> and the field reads photoperiod for its sward — and it is still open
> (see *Substrate mapping*).

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

- ~~**Tending cadence tuning**~~ → resolved (Q1 below; `husbandry.md § Calibration`).
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
- ~~**Spoilage / perishability**~~ → shipped, [spoilage.md](../../subsystems/spoilage.md).
- ~~**Numeric calibration**~~ → every rate is an `AppSetting` dial, declared
  placeholders for a running game → [husbandry.md § Calibration](../../subsystems/husbandry.md).
- ~~**A full farming design doc**~~ → `husbandry.md` · `soil.md` · `smallholding.md`.

---

## Open questions

1. *Q1 resolved 2026-07-31: sparse-and-buffered, one login = one tend*
   *decision → [husbandry.md § Calibration](../../subsystems/husbandry.md) (every threshold*
   *is calibrated against the login, not the game-day).*
2. *Q2 resolved by the code: yes — a survey reading is a number with an*
   *error band the eye earns, recomputed at read time (`pH 6.2 ± 0.15`),*
   *while the self-estimate stays a band → [soil.md § The survey ladder](../../subsystems/soil.md),*
   *[§ D5 — the survey is per-viewer](../../subsystems/soil.md).*
3. **First teaching unit** — course / mentor / treatise. *Lean: course
   (mints a known-of claim) as the diegetic study.com analogue.*
4. *Q4 resolved (2026-07-30): one catalog shape — the `Species`/`Clade` tree*
   *spans `plantae`; `trade-farming` ships 25 plant species rows under*
   *`content/stuff/idea/species/plantae/` → [race.md](../../subsystems/race.md).*

---

## ⭐ Stage B, salvaged from the retired farming plan

*Extracted 2026-09-06 when `farming-plan.md` was retired. Deferred
design does not live in a plan — the plan is an execution artifact
and gets deleted at the sweep; this is the surface that outlived
it. Verbatim below.*

## Stage B (after residences Waves 0–5 land; B0 gates the rest)

> *Compacted 2026-09-19.* B0 (re-ground + rebase) was a plan checkpoint and is history.

### Wave B1 — The `hearts-delight` pack + the district

Per P9/P8: pack scaffold (the locality-pack shape); the cartesian
district zone (rural cells), Murphy's Station + the lane, the
generative plat book (branched plan; hectare bands; raw lots cheap,
the pre-sold worked holding priced as old ground) + holder rows;
the fields `SphericalZone` row; title claims
(`landUse: agricultural`); the walk-in wiring (station ↔ lane ↔ the
crossroads/TPA end — the cash-and-carry both-sides-explicit pattern;
exact host edge per B0's landed map). **Tests:** pack annex tests —
claims, plan shape, rows resolve; fresh-DB boot installs.

### Waves B2–B5

> *Compacted 2026-09-19 — superseded by the farmstead build, in a
> different shape.* **B2** (spherical fields, ring-packing) → `plot`
> breaks a keyed `Field` out of a holding's yard, ground key stamped from
> where the plotter stood ([soil.md § `Field`](../../subsystems/soil.md), [§ `plot`](../../subsystems/soil.md),
> [smallholding.md § The field arrived](../../subsystems/smallholding.md)). **B3** → the
> `hearts-delight` pack shipped as a **static authored farm** (its README:
> content-only, a source node not a faucet) and the campus farm
> (`eternal-university/…/campus-farm`) is the managed exemplar; the farmer
> row runs `introduces`/`idles`, not the `farms` brain. **B4** did NOT
> happen and is superseded by that ruling — the trade-farming packing
> floor + Wen still stand at target through the distribution sweep, and
> the counter is a faucet that *admits to being one*. **B5** → the drives
> ran (`farmstead.dirty.wire.test.ts`), the docs are `husbandry.md` /
> `soil.md` / `ranching.md`.

---

## Acceptance-criteria coverage · Risks & opens

> *Compacted 2026-09-19.* Plan artifacts of a retired plan: the A-waves
> shipped (`husbandry.md § The fruit cycle`, `§ Content`), the four opens
> were resolved by default on 2026-08-31, and the B rows are superseded
> per *Stage B* above.

---

## Checkpoint A — the drive record (appended at build time, 2026-08-31)

> *Compacted 2026-09-19.* Stage A's drive record (grow→pick live end to end; the two dispatch
> crashes; the unbuyable pot) is history — `e2e/tests/drive-farming.spec.ts`.
> The drive-found seams below are kept for the slates they belong to.

Drive-found defects fixed in this build: two unguarded
`getInteractives().size` reads that crashed command dispatch (one rode
every display refresh), and the large pot being unbuyable by keyword.
Drive-found seams for the slates: substring keyword matching makes
compound nouns ambiguous (`pot` ⊂ "potting soil" ⊂ "plot" — MQL's
"which target?" prompt then swallows the next commands); a fresh bed
ships capacity but no soil (the pour-the-soil flow is the true first
act — its prose should stop claiming otherwise); and dev-preflight's
kill-by-kind reaches across worktrees.

> *Compacted 2026-09-19.* The post-checkpoint brain ruling is documented → `behavior.md` l.197,
> `content-packs.md § trade-farming` (the brain ships at
> `/trade/farming/behavior/farms`). ⚠ No row names it yet — see the ledger.


---

## ⭐⭐ 2026-09-25 — the plantation family needs a PLACE, not a mechanism

From the RGO forward pass
([rgo-unification-slate](./rgo-unification-slate.md) § *The forward pass*).
The question asked was whether a plantation is fundamentally different from a
farm. **It is not** — checked every way it might have been:

| a plantation's distinctive fact | status |
|---|---|
| perennial bearing over years | ✅ ships — the polycarp cycle bears repeatedly |
| a warm-climate requirement | ✅ ships — `LimitingFactor` includes **warmth**, with a Kelvin threshold *and* a growing-degree-day sum, so a coffee bush declares a higher threshold and a cold place limits it automatically |
| processing within hours of cutting (cane inverts; coffee cherries must be pulped; tea must be withered) | ✅ ships — the same *the works co-locates with the field* fact as milk, on spoilage + maturation |
| a long haul to market | ⏳ [logistics-slate](./logistics-slate.md), already designed |

⚠⚠ **What is actually missing is somewhere to grow them.** There are only
about eight biome rows and **every one is temperate or indoor**: baseline ·
indoor · outdoor · meadow · woodland · underground · upper-workings ·
cafeteria · universe. **No tropical, warm, arid or coastal biome exists.**

> ⭐ So the colonial crop family's prerequisite is **a warm place on the map**
> — a world-building decision, not a platform one. Which means **all those
> crops can ship together** whenever there is somewhere for them to grow, and
> the sequencing question is a map question.

⚠ Three of them are already **demanded and unproduced**: `sugar` (the census's
one unresolved root after salt shipped), and `coffee` + `tea`, whose
**materials ship with no plant and no producer** (no `coffea`, no `camellia`
species row). `tobacco`, `cotton`, `cocoa` and spices do not exist at all —
and **cotton is the industrial revolution's fibre**, while textiles ships wool
and flax only.

⚠ The family carries the same authoring sensitivity as sugar (plantation
labour), which is an argument for treating it as **one family with one
decision** rather than five separate content gaps. The honest mechanism — a
crop that must be processed within hours, so the works and the field must be
co-located, so labour concentrates — is what drove the history, and it is
already expressible.
