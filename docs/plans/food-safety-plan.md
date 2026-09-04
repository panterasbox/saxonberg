# Food safety — implementation plan

Executes [food-safety-requirements.md](../requirements/food-safety-requirements.md).
Adds a second, silent microbial population to the shipped spoilage core,
moves water activity off the Material and onto the instance so
preservation becomes an act, turns cooking from a temperature threshold
into a temperature **held for a time**, cuts the path from a killed
animal to meat, and grows an ingested pathogen inside its host.

**Kind:** feature. **Lead end:** kernel-led — the growth law, the gauge
and the condition reconcile all change. ⚠ A kernel-led build names its
first consumer: **the Hearthworks cookhouse** (the cooking build's
kitchen, already standing, already lit) is where every wave is proven,
and `trade-cooking` is the pack that affords the new verbs.

---

## Grounding

Verified by opening files on `design/food-safety` at `8ead7ed76`
(branched from `origin/master` `2d55aca58`).

**The spoilage core** — `packages/server/src/mud/lib/material/Freshness.ts`,
654 lines.

- `Freshness.growthRate(material, tempK)` (:203) — Arrhenius `f_T` ×
  linear-ramp `f_aw`, returning a **flat** negative dial above `killK`
  (:208). No temperature dependence on the kill side.
- `Freshness.waterActivityOf(material)` (:241) — **takes a Material and
  nothing else.** This is the D7 seam.
- `Freshness.advance(load, elapsedS, material, tempK)` (:268) —
  closed-form logistic/exponential, and floors the load at
  `Math.max(clamp01(load), Freshness.inoculum())` while the rate is
  positive. This is the D6 seam.
- `FRESHNESS_CHANNELS = ['vision', 'smell']` (:120) — the augmenter's
  sense filter. This is the D4 seam.
- `declare module '../bulk/Bulkable'` (:188) adds
  `freshness?: { load: number; stamp: number }` to `BulkPayload` by
  declaration merging, from the folder that owns the concept. The
  established pattern for every field below.
- `FreshnessMixin` (:544) — `fieldMeta` is exactly two persisted fields
  (`_microbialLoad`, `freshnessClockStamp`), plus a
  `_reconcilingFreshness` reentry guard and `reconcileFreshness()`
  ordering perishability **before** the clock read.

**Hosts, counted.**

| mixin | composes onto | count |
|---|---|---|
| `FreshnessMixin` | `Provision` | **1** |
| `VitalsMixin` | `Creature` | **1** |
| `OrganismMixin` | `Creature`, `Plant` | 2 |
| `ServiceableMixin` | `Cutlery`, `CraftVessel` | 2 |
| `ToolMixin` | `ToolItem`, `CocktailShaker`, `WateringCan`, `Tap`, `Still`, `CookPot` | 6+ |

`Provision` is
`CraftedMixin(FreshnessMixin(ThermalMixin(DetailedMixin(Thing))))` —
so a discrete Provision **already carries a `maker`** through
`CraftedMixin`. The attribution gap (D8) is bulk-only.

**Conditions** — `packages/server/src/mud/platform/idea/Condition.ts`.

- `ProgressionSpec` (:338) is `{ intervalMs: number }` with the comment
  *"no live scheduler is built here."* Authored by three shipped rows
  (`starvation` 3600000, `dehydration` 1800000, `recovering` 3600000)
  and read by nothing.
- `ContagionSpec` (:548) is `{ vector: string }`, *"RESERVED, no
  consumer in this build."* **Untouched by this build.**
- `TraumaBehavior` (:357) — `onset / tick / resolve / reopen / describe`,
  co-located with the value, driven by `VitalsMixin.reconcileConditions`
  in game-time. The carrier pattern.
- `toxinBehavior` on the row models a burden that decays, with
  `absorptionRate` / `clearanceRate` / `potency` / `bands`.
- The class docstring still says *"ZERO content ships"*; **fifteen rows
  ship** (10 under `metabolism/`, 2 `thermal/`, 1 each `magic/`×2,
  `mortality/`, `respiration/`).

**Death and corpses** — `ConditionLogic.mintCorpseFrom` (:515), reached
from two death paths (:469, :771), clones
`TemplatePaths.mortalityCorpse`. `Corpse` is `class Corpse extends
Creature {}`; one row ships at
`generic-objects/content/stuff/agent/Corpse.yaml`.
**No path exists from a corpse to meat** — `Harvestable`/`Fruiting` is
plant-side (`lib/husbandry`).

⚠ **The corpse is produced by every death path, including combat's** —
which is what makes requirement D14 a real gate rather than a nicety:
without it, `butcher` reads a fallen patron in Dave's Bar.

⚠⚠ **A corpse ALREADY HAS A DECAY CLOCK, and it is not the spoilage
clock.** `lib/mortality/Postmortem.ts` carries `sinceDeath()` and
banded decay stages off `MORTALITY_DEFAULTS.DECAY_STAGE_SEC`, starting
at `'fresh'`. It is a **forensic** gauge — mortality.md: *"decay
degrades evidence while the cause stamp stays ground truth"* — on its
own cadence, for its own purpose, and `Creature` composes no
`FreshnessMixin`. See D15.

**The species taxonomy, and ⭐⭐ the flag D14 needs — which already
exists.** A Species row carries `_parentCladePath` (e.g. the bullfrog's
`/stuff/idea/species/animalia`), and the playable species sit under
`.../animalia/chordata/mammalia/primates/hominidae/homo/`. It **also**
carries `sentient: boolean` — `Species.ts:263`, persistent at
`fieldMeta:326`, public `isSentient()` at :357 — documented as *"self-
aware moral persons whose killing is a lawful act with consequences, as
opposed to a beast whose culling is not,"* and already read through the
shipped **`SpeciesApi.isSentient(stuff)`** (`SpeciesLogic.ts:84`), whose
load-bearing consumer is combat's cull-vs-coup severity keying. All
sixteen playable species author `sentient: true`.

⭐⭐ **So D14's gate is one existing call — and the clade walk is not
merely the more expensive limb, it is the WRONG one.**
`species/constructa/metallica/tutor-bot/mk-iv.yaml` is `sentient: true`
and sits nowhere near `hominidae`; a clade walk would cheerfully let a
player butcher the tutor-bot. `sentient` is already the line this game
draws for lawful killing, which is precisely the consistency D14's
rationale claims for itself.

⚠ An earlier revision of this plan asserted no such flag existed and
left W3 to choose between walking the clade and authoring one. **It was
wrong, and there is no choice to make.** Recorded rather than quietly
deleted: the near-miss is that both limbs of a fork can be offered
without either being checked against the tree.

**Crafting & serviceware** — `CraftedMixin` stamps `maker` (a durable
templatePath) at craft-resolve from the execution context.
`ServiceableMixin` carries `soiled: boolean` + `technique: string`;
`wash` ships as a platform verb
(`content/platform/cmd/crafting/wash.yaml` +
`platform/idea/cmd/crafting/WashController.ts`).

**⚠⚠ The ingest seam — the one link this plan did not name.** Both arms
of `eat` funnel into the same call,
`BulkableApi.ingestSolid(giver, material, portion, payload)`
(`platform/idea/cmd/bulk/EatController.ts:86` discrete, `:157` from a
dish). The **dish** arm passes `Freshness.ingestPayloadOf(slot)` — the
stored payload with the spoilage dose folded in. The **discrete** arm has
no stored payload at all and synthesizes a transient one,
`Freshness.withDose(null, material, load)` (:85), *"so a bowl of stew and
the roast it came from poison by identical arithmetic."* That transient
payload carries the spoilage dose **and nothing else** — no pathogen
loads (they do not exist yet) and **no `maker`**. Every route from food
into a body passes through these two lines. See W1, W2 and W4.

**⚠⚠ Cooking is a THRESHOLD today, not a hold.**
`CraftingLogic.outputMicrobialLoad` (:~690) resets the load to zero when
the working's `effectiveHeatK` crossed the kill temperature and otherwise
blends the inputs' loads by mass. A recipe declares `heatedToK`
(`CraftingLogic.ts:1332`, `:1361`) and **no duration anywhere**; the heat
gate at :1663 asks only whether the reachable furnace can supply it.
`cook` is a one-shot craft-resolve
(`trade-cooking/src/idea/cmd/crafting/CookController.ts`) with no
engagement and no elapsed time. The Arrhenius kill in `Freshness.advance`
runs on the **passive** reconcile and never executes during a craft. So
requirement D5 has no home in this plan as written. See P7.

**⚠ There is no butcher's knife, and the one knife a player can buy is a
`Weapon`.** `Cutlery` is serviceware — a horn spoon, a table fork, a
table knife, *"holding nothing, ever"* — not a working blade. The general
store sells `clasp-knife.yaml`, class `/platform/thing/equipment/Weapon`,
`constructionForm: bladed`. Every kitchen and work implement in the packs
(`kitchen-sieve`, `fruit-press`, `billhook`, `tongs`, `shovel`, …) is a
**`ToolItem`** — the class, which is one of `ToolMixin`'s six hosts and
not the same set. See P8.

**Content** — 30 of 107 materials tabulate `spoilActivationEnergy` +
`waterActivity`. Salt ships at
`trade-cooking/…/idea/material/salt.yaml` (a_w 0.15, tagged
`seasoning`). 14 cooking recipes, **none** a cure/dry/smoke. One toxin
Condition ships (`ptomaine`). `specializes:` is a live Discipline field
(`blades`, `bartending`, `horticulture`, `retail-sales`, …).

---

## Plan-level decisions

### P1 — Cure state is its own mixin, not two more fields on `FreshnessMixin`

`moisture` and `solute` describe **the matter**; the microbial load
describes **a population living in it**. New `CuredMixin` in
`lib/material/`, composed on `Provision` alongside `FreshnessMixin`.

Host sets coincide *today* (both are `Provision`), so this buys nothing
immediately — it buys the next consumer. Leather, timber and grain are
all dried and none of them rot on a microbial curve; folding water
activity into the spoilage gauge would make a tannery compose a
microbial load to express drying. **Lens 2 chose:** the split is what
lets an author dry a thing without claiming it ferments.

⚠ Naming is a judgement call and reversible — `CuredMixin` reads well
through `MixinApi.isCured`, and takes the `FreshnessMixin` precedent
that the mixin is named for the **axis**, not for the state (fresh meat
composes `CuredMixin` at `moisture: 1.0, solute: 0`).

### P2 — ⭐⭐ The pathogen load needs a host a KNIFE can compose

**The requirements did not settle this, and it is the plan's most
load-bearing decision.** D2 settled the *payload* side; D1 settled the
*in-host* side. Neither covers the food-side discrete gauge — and
requirement D3 puts a pathogen load on a **board, a knife, a hand**,
none of which are food.

So the pathogen population **cannot** live on `FreshnessMixin`, whose
host is `Provision` and whose whole design (`lint:perishable`, the
material-gated inertness) is about *food that rots*.

New `ContaminableMixin` in `lib/material/`, composed **per class** on
the things that actually participate. `Provision` and `CraftVessel` are
settled here; **which class carries the blade is P8**, and it is not the
enumeration this section first wrote — `Cutlery` is serviceware and
cannot butcher anything.

⚠ **Not on `ToolMixin` wholesale** — that mixin's host set includes
`WateringCan` and `Tap`, and composing there would be the exact
widening the cooking build spent four review rounds undoing. (Irrigation
contamination is a real route and a real future consumer; it is not this
build's, and the mixin composes onto a watering can the day someone
wants it.) ⭐ P8 keeps that refusal intact by composing on the **class**
`ToolItem`, which is one of those six hosts and not the mixin.

⚠ **A hand is not a host, and that is a cut.** D3 names *"a board, a
knife, a hand and a vessel"*. `Creature` would be the carrier for a hand,
which widens a host set of exactly 1 for a route no drive step exercises
(step 13 is knife → vegetables, and `wash` already answers it). Recorded
under Deferred seams rather than left looking covered — an unhosted
requirement clause reads as delivered right up until the MR.

### P2a — ⚠ A vessel then carries TWO loads, and they are different facts

`CraftVessel` is
`ServiceableMixin(VesselKindMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(DetailedMixin(Thing)))))))`
— it is **Bulkable**, so its contents already carry their own load in
the payload. Composing `ContaminableMixin` gives the vessel a **surface**
load as well.

That is correct and honest — *a dirty pot* and *a bad stew* are
genuinely different facts, and only one of them survives emptying the
pot — but the interaction must be authored, not left to fall out:

- **Filling a contaminated vessel contaminates its contents.** This is
  the entire reason `wash` matters and the mechanism behind drive step
  13.
- **Emptying does not clean.** The surface load survives the pour, which
  is what makes a single unwashed pot a chain of poisonings.
- **Washing clears the surface, never the contents.** Washing a pot of
  bad stew is not a cure for the stew.

⚠ Same shape holds for `Provision` (which is not Bulkable) — a discrete
cut has one load and no ambiguity. The two-load case is vessels only.

### P3 — Two stamps are correct; co-location on the payload is for a different reason

Requirement D2's *decision* stands — the pathogen load lives inside the
existing `freshness` record on `BulkPayload` — but the stated reason
(*"stamps drift"*) is weaker than it reads. Two independently-stamped
populations each integrate correctly from their own last-reconcile;
drift is not a correctness bug.

The real reasons to co-locate on the payload, which the plan relies on:

1. **The pour blend** (`Freshness.blendLoads`) must move both
   populations together, mass-weighted, or decanting launders one.
2. **The material shadow** (`Freshness.materialShadow`) must synthesize
   both or a `payload ?? material` reader silently drops one.
3. One reconcile pass per clock read.

On the **discrete** side `ContaminableMixin` carries its own stamp (P2
forces a separate mixin), which is fine under the same reasoning.

⚠ Recording this rather than quietly re-deciding it: the requirement's
conclusion is right, its rationale needs the above substituted. No scope
reopens.

### P4 — Pathogen identity is a `Condition` row; the load is a keyed map

A pathogen is authored as a `Condition` (the existing Kind-A affliction
Idea) carrying a new `pathogenBehavior` block beside the existing
`toxinBehavior`: growth constants, `killSurvivalFraction`,
`germinationK`, `infectiousDose`, `channels: []`.

The per-instance state is `Record<pathogenKey, number>` — a map, not a
scalar — because a carcass can carry more than one and they must not
average. Sparse by construction: an empty map is the default and costs
one field.

### P4a — ⚠⚠ A population must be able to produce a TOXIN instead of an infection

The field list above can only describe an organism that infects you,
and **two of the five roster entries do not**. Requirement D10 says it
at product level — *"some hazards make a toxin rather than infecting
you, and the two behave differently"* — and the roster names both:
*Staph aureus* (a heat-stable toxin: kill the population, keep the
poison) and *C. botulinum* (a heat-**labile** one: boiling saves you).

So `pathogenBehavior` needs a **reach discriminator**: on ingestion this
population either

- **infects** — seeds an in-host load (W4's path), or
- **intoxicates** — has already deposited a formed toxin in the food,
  which rides the **shipped** `formedToxins` channel on the payload and
  the shipped `labileAtK` field.

⭐ The intoxication arm needs almost no new machinery: the cooking build
already deposits a derived dose as a formed toxin when heat kills a
population, and `labileAtK` already separates a raw bean's lectin from
ptomaine. This is that seam gaining a second producer.

⚠ **And botulinum is BOTH** — a spore-former (P6) whose surviving spores
germinate as food cools and then produce the toxin. The two mechanisms
compose on one row; neither is a special case of the other. A build that
treats "spore-former" and "toxin-producer" as alternatives cannot author
the roster it was given.

### P5 — Butchering ships in `trade-cooking`, with a named spin-out seam

A butcher is a real vocation and will want `trade-butchery` when
ranching brings volume. For this build it would be a pack holding one
verb, and `trade-cooking` already ships salt, the recipes and the
kitchen. Verb + controller land there under
`content/trade/cooking/cmd/` + `src/idea/cmd/`.

**The seam:** `butchery` is its own Discipline row (requirement D9), so
the spin-out later moves a verb and a controller, not a skill model.

### D15 — ⚠⚠⚠ Butchering must carry the corpse's age into the meat

**The defect this review found.** A corpse already runs a decay clock
(Grounding), and it is a *forensic* one on its own cadence. If
butchering stamps the cuts' microbial clock at the moment of the
**butchering**, then:

> A player kills a boar, leaves it lying for three days, comes back,
> butchers it — and gets **fresh meat**.

That is a free lunch of exactly the shape the cooking build closed when
it made a kill step deposit the dose the population had already earned.
*Heat kills the population but not what it made*; here, **a knife must
not reset a clock that has been running since the animal died.**

The cuts' initial state derives from `sinceDeath()` at the moment of
butchering: a microbial load advanced over that elapsed time at the
carcass's own temperature, plus whatever contamination the butchering
act itself adds. A carcass left in the sun is meat that was never worth
cutting; one dragged into the cellar within the hour is prime.

⭐ Which is the right lesson anyway — *field dressing is time-critical*
is the first thing any hunter learns, and it makes the cellar earn its
keep from the very first kill.

⚠ **The two clocks stay separate.** Postmortem decay keeps being
forensic and keeps its own stages; this reads `sinceDeath()` and derives
from it. Do not fuse them, and do not compose `FreshnessMixin` onto
`Creature` to get this — that widens a mixin whose host count is
deliberately 1.

### P6 — The kill step becomes a survival fraction, not a reset

`Freshness.advance` currently returns to zero above `killK` at a flat
rate. It gains a per-population Arrhenius death rate (requirement D5)
and, for spore-formers, a floor: the surviving fraction never falls
below `killSurvivalFraction`. Germination is not a separate mechanism —
it is the population's rate turning positive again as the host cools
below `germinationK`, which the shipped Newton cooling already drives.

⚠ P6 alone does **not** deliver D5, because this arithmetic lives on the
passive reconcile and a craft never runs it. P7 is the other half.

### P7 — ⭐⭐ D5 is a recipe's `(heat × hold)` pair, not a new engagement

**The second defect this review found.** Requirement D5 — *"a long hold
at a lower heat and a brief moment at a higher one achieve the same
kill… a simmer, a sear and a lazy warm-through become genuinely
different acts"* — had no home in any wave. W2 listed it; P6 implements
a rate in the passive reconcile; the craft path still **thresholds**
(Grounding). A player could not express a hold at all.

Three limbs:

1. **the recipe gains a hold**, and craft-resolve integrates the kill
   over `(heatedToK, holdS)`;
2. **`cook` becomes a durative engagement** the player can cut short;
3. leave the threshold and let D5 ride only the passive hearth path.

**Lens 2 chose limb 1.** A sear and a simmer become two recipe rows with
different `(heatedToK, holdS)` pairs — *different acts, authored as
data*, which is exactly the "the ordinary case is entirely data" test the
requirements set for this build. Limb 2 is honest and is a wave of its
own (an engagement, an abort reason, a partial-cook output, a whole new
failure surface); it is the right shape the day someone wants to pull a
roast early, and nothing here forecloses it. Limb 3 does not deliver the
requirement.

So: `heatedToK` gains a sibling `holdS` on the recipe, and
`outputMicrobialLoad` stops thresholding — it integrates the
per-population death rate over the hold at the working's heat, which is
the **same arithmetic P6 already builds**. One function, two callers: the
craft calls it with the recipe's hold, the reconcile calls it with
elapsed game-time. That shared call is the point; two kill curves that
drift apart is the bug this avoids.

⭐ **A recipe authoring no `holdS` behaves exactly as it does today** —
which is what keeps requirement 19 true of all fourteen shipped recipes,
and should be pinned by a test rather than assumed (the same identity W0
pins for `moisture: 1.0`).

⭐ The thermometer D5 asks for follows for free and is a **content row**:
it reads the vessel's `ThermalMixin` temperature. ⚠ Check
[instrumentation-slate](../slates/builds/instrumentation-slate.md) before
designing its surface — it is a `measure` stanza on a shipped view, not a
new verb.

### P8 — ⚠⚠ The blade: compose on `ToolItem` + `Weapon`, gate the ACT on `bladed`

**The third defect.** P2 named `Cutlery` and *"the butchering
implement/surface added in W3"*, and neither can carry the drive:
`Cutlery` is table serviceware, and drive step 13 requires **the same
knife** to butcher and then chop vegetables, so the carrier cannot be a
bespoke butchering class. The knife a player actually owns is a `Weapon`;
the kitchen's implements are `ToolItem`s (Grounding).

**Decided:** `ContaminableMixin` composes on `ToolItem` and `Weapon`
alongside `Provision` and `CraftVessel`, and the **`butcher` verb gates
on `constructionForm: 'bladed'`** — already authored on the clasp knife,
and already the thing that opens a carcass.

⭐ This keeps P2's refusal exactly intact rather than reopening it.
`ToolItem` is a **class**, and one of `ToolMixin`'s six hosts;
`WateringCan`, `Tap`, `Still`, `CookPot` and `CocktailShaker` are
siblings and stay out. What P2 refused was a load on a mixin whose host
set is wrong, not a broad host set for a mixin that describes every
member of it honestly — *"this can carry pathogens between things"* is
true of a billhook and a clasp knife and false of a tap.

⚠ The two facts stay apart, and the split is the whole decision:
**carrying** contamination is a property of a surface that touches food
(the mixin, composed broadly); **butchering** is an affordance of an edge
(the verb, gated on the construction). Collapsing them gives you either a
sieve that can butcher or a knife that cannot chop.

### P9 — Butchery yield is authored on the Species row

Nothing said where *"a boar gives N cuts of what"* lives, and the
requirements set the test explicitly: *"a second butcher, a second cured
product and a second pathogen are all content rows."*

**Decided:** a `butcheryYield` block on the **Species** row —
`[{ cut: <template path>, units: n }]` — with the meat's material coming
from the species' existing `_defaultMaterialPath`. The Species row is
already the field guide for the animal (`diet`, `lifespanMin`,
`naturalAttacks`, `vitalProfile`), already the row `SpeciesApi` reads,
and already where `sentient` lives — so a new huntable animal is **one
row**, and the second-instance test passes. A separate butchery `Idea`
would add a row in strict 1:1 with the Species row plus a second
catalogue to warm, for no gain.

⚠ 23 animal species ship. W3 authors yields for the huntable ones near
Hearthworks and **leaves the rest empty** — an empty yield is *"there is
nothing here worth cutting,"* authored and worlded, not a crash and not a
`TODO`.

---

## Host placement

| new thing | host | what composing it claims |
|---|---|---|
| `CuredMixin` (`moisture`, `solute`) | `Provision` | "this matter has a water state that acts can change." True of all food; will be true of hide and timber. Does **not** claim it rots. |
| `ContaminableMixin` (`_pathogenLoads`, stamp) | `Provision`, `CraftVessel`, `ToolItem`, `Weapon` (P8) | "this can carry pathogens between things." True of food and of anything that touches it. ⚠ The **classes** — `ToolMixin`'s other five hosts (`WateringCan`, `Tap`, `Still`, `CookPot`, `CocktailShaker`) stay out. ⚠ Not `Cutlery` (serviceware, touches a mouth not a carcass) and **not** `Creature` (P2: the hand is cut). |
| `holdS` on the recipe (P7) | the Recipe document, beside `heatedToK` | "a working has a duration, not only a temperature." Absent = today's behaviour exactly. |
| `butcheryYield` (P9) | `Species` (Idea) | "a field guide says what an animal yields." Sits beside `diet` and `sentient`; empty = not butcherable. |
| `pathogenBehavior` | `Condition` (Idea) | "an affliction can be a population, not only a burden." Sits beside `toxinBehavior`; rows opt in. |
| pathogen arm of the reconcile | `VitalsMixin` (host set **1**: `Creature`) | "a body reconciles infections like it reconciles wounds." Plants excluded for free — `OrganismMixin` is the wider one and is untouched. |
| `maker` on `BulkPayload` | the payload, by declaration merging from `lib/craft/` | "bulk matter remembers who made it," matching what `CraftedMixin` already claims for discrete. |
| `butchery` Discipline | a content row, `specializes: cooking` | no host question — data. |

**Nothing needs a guard that re-narrows its host set.** The one place
that would have — a pathogen load on `FreshnessMixin`, guarded to
exclude non-food — is what P2 avoids by splitting.

---

## Convention conformance

- **Module categories** — two mixins in `lib/material/` (the subsystem
  that owns the concern); no new Api, no logic singleton, no free helper.
  The butchering controller is `trade-cooking`'s at
  `src/idea/cmd/<category>/`.
- **`<root>/<branch>/`** — new rows at `/trade/cooking/…`; the Discipline
  at `/platform/idea/Discipline/butchery`. Nothing instances `/lib/`.
- **Mixin file naming** — `Cured.ts`, `Contaminable.ts` (no `Mixin`
  suffix in filenames); `_mixinName` markers; entries in `Mixins`.
- **Verbs on objects** — the acts are methods on their hosts, never
  `XApi.verb(host, …)`. `lint:object-verbs` census stays zero.
- **Module scope declares** — no executable statements at module scope.
- **Import boundary** — `lib/material/` imports nothing outside
  `src/mud/`; the pack imports the kernel by package specifier only.
- **Locations, not rooms** — no new location classes expected.
- **Inter-Stuff contract** — methods, not fields, across objects.

**Gates this build must pass:** `lint:perishable` · `lint:instanceable`
· `lint:census` · `lint:untitled` · `lint:topics` · `lint:imports` ·
`lint:module-scope` · `lint:schema` · `lint:object-verbs` ·
`lint:gates` · `lint:test-bootstrap`.

---

## Waves

Each independently landable.

### W0 — Per-instance water activity
**Implements** requirement D7, plan P1.
`lib/material/Cured.ts`; `moisture`/`solute` onto `BulkPayload` by
declaration merging; `Freshness.waterActivityOf` gains a per-instance
carrier and `growthRate` threads it; blend-by-mass on transfer.
`Provision` composes `CuredMixin`.

⭐ **Defaults are `moisture: 1.0`, `solute: 0`**, deriving exactly the
Material's tabulated `a_w`. That identity is what makes requirement 19
true — every existing row in the Hearthworks pantry, the general store
and Dave's Bar behaves on day one precisely as it does today — and it
should be pinned by a test, not assumed.

⚠ **Criterion 4 needs a surface, and W0 must name it.** *"Treated food
is legible as treated, without a number"* is a rendering, and the cure
state has none — it rides the **same augmenter the freshness bands
already use** (`FRESHNESS_CHANNELS`, the D4 seam), adding a cured-state
phrase to `look`/`smell`. ⚠⚠ It must NOT be a fifth freshness band: the
population and the water state are different facts (P1), and one gauge
reporting both is how the split gets quietly undone at render time.
**Acceptance:** requirements 1–4. **Ends at** `feat(spoilage): water
activity is per-instance — moisture and solute over the material base`.

> ✅ **DONE.** `lib/material/Cured.ts` ships `CureState` (`moisture` +
> `solute`), the `Cure` policy statics and `CuredMixin`, composed on
> `Provision` inside `CraftedMixin`. `Freshness.waterActivityOf` /
> `growthRate` / `advance` all take an optional cure and derive
> `a_w = a_w(material) · moisture · (1 − solute)`; the transfer blend in
> `BulkableLogic` moves the water state by mass beside the load.
>
> **Decisions this wave made:**
> - **The formula is multiplicative** (`base · moisture · (1 − solute)`),
>   which is what makes drying and salting stack rather than compete and
>   makes `moisture: 1, solute: 0` the exact identity. Pinned by the first
>   two tests in `Cured.test.ts` — requirement 19's day-one half.
> - ⭐⭐ **The passive arm is ONE-WAY: it only ever RAISES moisture.**
>   Nothing dries by itself. A two-way equilibrium would have quietly
>   preserved every ration in the pantry (breaking requirement 19) and
>   would have made drying a thing that happens rather than a thing you
>   do. Rehydration toward the ambient equilibrium delivers criterion 3's
>   asymmetry on its own; curing simply has no passive arm.
> - **A treatment takes the STRONGER of each axis** (`min` moisture,
>   `max` solute), so re-running a weaker cure never un-cures — the
>   asymmetry as arithmetic rather than as a guard, and what lets two
>   separate acts (salt it, then dry it) stack.
> - **Ambient dampness is read synchronously** through a new
>   `BiomeApi.localHumidityFor`, which walks the containment chain's
>   authored overrides + biome defaults and terminates at the root biome.
>   `BiomeLogic.runChainWalk`'s steps 1–4 were extracted into
>   `syncChainWalk` so the two share one walk; the sync read deliberately
>   skips the async Zone tier and the weather deviation, and says so.
>   A reconcile-on-read gauge runs off a getter and cannot await.
> - **Criterion 4 rides its OWN augmenter** on `CuredMixin`, filtered to
>   the same `vision`/`smell` channels the freshness band uses — a
>   separate line, never a fifth band. Two axes, band words, no numbers.
> - **`Cured.ts` duplicates the six-line `nowSeconds` clock guard** rather
>   than importing `Freshness`, to keep `lib/material` acyclic:
>   `Freshness` reads the cure state, so the dependency runs one way.
>
> **Surprise:** the sparse-storage ordering fell out for free — an
> untreated instance has nothing to regain, so `reconcileCure` returns
> before it touches the clock and a `look` at a shipped pantry cut writes
> no stamp at all. Pinned by a test.
>
> Gates: all 25 green · `pnpm test:near` 326 files / 3516 tests green.

### W1 — The preservation crafts, and the maker stamp
**Implements** requirements 5, D8.
Cure / dry / smoke recipes in `trade-cooking`; salt as a cure input;
`maker` onto `BulkPayload`, stamped at craft-resolve from the execution
context exactly as `CraftedMixin` does.

⚠⚠ **And the stamp must reach the mouth.** `CraftedMixin` already carries
`maker` on a discrete `Provision`, but `EatController`'s discrete arm
synthesizes its payload with `Freshness.withDose(null, material, load)`
and **drops everything the mixin knew** (Grounding). Drive step 15 — Odo
serves a dish, the record names Odo — dies on that line. W1 widens the
discrete→payload bridge to carry `maker`; W2 widens the same bridge for
the pathogen loads. **One seam, two waves, and the second must not
re-invent it.**
**Acceptance:** requirement 5 (and the maker stamp W4's criterion 18
depends on). **Ends at** `feat(cooking): curing, drying and smoking —
salt stops being a seasoning`.

> ✅ **DONE.** Three recipes (`salt-cure` · `air-dry` · `smoke-cure`),
> one output row (`/trade/cooking/thing/treated-cut`), three verbs
> (`cure`/`salt`, `dry`/`hang`, `smoke`) over one `PreserveController`
> base in the pack, afforded by `CookPot` beside `cook`/`plate`.
> `Recipe` gains a `cure: { moisture?, solute? }` block; `maker` is
> declared onto `BulkPayload` from `lib/craft/Crafted.ts` and stamped at
> craft-resolve.
>
> **Decisions this wave made:**
> - ⭐⭐ **The preserving acts are VERBS, not `cook <recipe>`.** The plan's
>   wiring table said "existing craft verbs — no new verb"; that is not
>   reachable in practice, because `cook` is **deed-gated** on a can-make
>   deed earned by working a recipe by hand, and the cooking branch's
>   by-hand path banks contributions into a pot — the wrong shape for a
>   transform that turns one discrete cut into another. A gate whose key
>   does not exist is a lock. The requirements are the tie-breaker: they
>   call these **acts**, and list "no verb preserves anything" as the gap
>   the build exists to close. So: three verbs in the pack that affords
>   them (CLAUDE.md, *"a verb lives with the pack whose content affords
>   it"*), **not** deed-gated (they follow `order`, not `cook`).
> - **One `PreserveController` base + three six-line subclasses**, each
>   naming only a recipe id and its prose. A fourth treatment is a recipe
>   row plus six lines; a fourth *strength* is a recipe row alone.
> - ⭐ **`CraftRequest.target`** — a new, general field: the item an act is
>   performed ON, preferred for any input slot it satisfies. Without it
>   `dry` could pick a plain cut off the table instead of the one you had
>   just salted, and **criterion 2 (hurdles stack) would be
>   unreachable by a player** even though the arithmetic supported it.
>   A preference, not a gate.
> - ⭐ **`applyTangibleOutput` now carries the matter's own state through
>   the transform** — the microbial load (killed by the working's heat or
>   blended through) and the water state (input's, then the recipe's
>   treatment, stronger-axis-wins). It carried neither before, which was
>   invisible while every tangible recipe made a metal tool out of ore
>   and would have made curing a way to **launder rotten meat**.
> - **ONE output row for every treatment**, not one per state. The state
>   lives on the instance (W0), the material flows from the input, so a
>   treated cut of beef is still beef and can be treated again.
> - **`smoke-cure` requires 320 K — 13 K under the kill.** Smoking must
>   preserve without sterilising, or "cure it or cook it" collapses into
>   one lesson. That number is a decision, not a dial.
> - **The discrete ingest bridge is one private method**,
>   `EatController.ingestPayloadFor` — the seam W2 widens again for the
>   pathogen loads rather than re-inventing. It carries the spoilage dose
>   and now the `maker`.
>
> **Surprise:** `tsc -p packages/server` reports two **pre-existing** type
> errors in `packages/content` (`arcana/src/lib/ManaPowered.ts:402`,
> `tpa/src/__tests__/RegisterController.test.ts:161`) and **still exits
> 0** — a gate that ships broken and silently passes, the metal-chain
> lesson again. Neither is this build's; flagged in the MR.
>
> Gates: all 25 green · `test:near` 338 files / 3612 tests · trade-cooking
> 16/16.

### W2 — The silent population
**Implements** requirements D4, D5, D6, D10, D11, plan P2, P4, P6, **P7**,
**P8**.
`lib/material/Contaminable.ts` (composed per P8); `pathogenBehavior` on
`Condition`; per-population inoculum and channels; Arrhenius kill rate
with a spore survival floor; the pathogen half of the payload record.

⚠⚠ **The ingest bridge** — the pathogen loads must ride
`BulkPayload` through **both** arms of `eat` into
`BulkableApi.ingestSolid` (Grounding): the dish arm through
`Freshness.ingestPayloadOf`, the discrete arm through the transient
payload W1 already widened for `maker`. A pathogen that cannot cross this
line is a build whose unit tests all pass and whose drive step 8 does
nothing.

⚠ **D5's other half (P7)** — `holdS` on the recipe, and
`outputMicrobialLoad` integrating the kill over the hold instead of
thresholding, sharing P6's one death-rate function. A recipe with no
`holdS` must be byte-identical in behaviour to today.
**Acceptance:** requirement 9 in full. ⚠ **Criterion 10 (a contaminated
item is indistinguishable from a clean one) cannot be shown in W2** —
nothing can contaminate anything until W3, so W2 proves it in tests
against a directly-seeded load and the *player-observable* half lands
with W3. 11–13 advance to the point the food behaves correctly; the
illness they end in is W4's.
**Ends at** `feat(spoilage): the second population — silent,
event-seeded, its own kill curve`.

> ✅ **DONE.** `lib/material/Contaminable.ts` ships `PathogenBehavior`,
> the `Contamination` policy statics and `ContaminableMixin`, composed on
> `Provision` · `CraftVessel` · `ToolItem` · `Weapon` (P8, exactly).
> `pathogenBehavior` sits on `Condition` beside `toxinBehavior`; five
> roster rows ship under `/platform/idea/Condition/pathogen/` (which the
> shipped `ConditionCatalogue.warm` already stands up — no boot risk) plus
> two toxin rows under `metabolism/`. The loads ride `BulkPayload`, blend
> on every pour, survive both craft paths, and cross **both** arms of the
> ingest bridge.
>
> **Decisions this wave made:**
> - ⭐⭐ **The kill became an Arrhenius RATE on both populations** (P6+P7).
>   `Freshness.killRatePerHourAt` replaces a flat dial that made boiling no
>   better than warming; `Freshness.killOver` and
>   `Contamination.killOver` are the two callers of the same curve, so they
>   cannot drift.
> - ⭐ **`holdS: 0` means "as long as it needed", not "held for no time".**
>   That is what keeps requirement 19 exactly true — all fourteen shipped
>   recipes author no hold and behave identically — and it is pinned by a
>   test that walks the catalogue rather than trusting the reading.
> - **Two new recipes author the `(heat × hold)` pair**: `seared-cut`
>   (500 K / 10 s — a complete kill) and `warmed-through` (335 K / 120 s —
>   **less than half**). The second is authored as a trap, and it is the
>   row that makes D5 a thing a player can be wrong about.
> - ⭐⭐ **`BlendLabel.toxicityOf` now applies `labileAtK` to FORMED toxins
>   too.** It skipped the filter "by construction"; ptomaine authors no
>   lability so nothing changes for it, but without this staph's
>   heat-stable poison and botulinum's heat-labile one were the same
>   thing, and requirement D10 was unreachable.
> - **`wash` stopped being a glassware verb.** It was `instanceof
>   CraftVessel`, so a knife — the one implement that most needs washing,
>   and criterion 17's whole counterplay — could not be washed at all. It
>   now takes anything `Serviceable` or `Contaminable`.
> - **A new gate, `lint:pathogens`** (the plan's suggested
>   `lint:contaminable`), and it was **proved to fail** on a deliberately
>   broken row before being trusted. It catches the silent one: an
>   `intoxicate` row whose `toxin.type` resolves to no `Condition` deposits
>   a dose that `resolveToxinBehavior` returns null for and the caller
>   skips — green suite, poisoned food, healthy eater. It also refuses a
>   non-empty `channels`, so D4's silence is a gate rather than a habit.
>   ⭐ `lint:family` went 25 → 26 with no list edited anywhere.
> - **Roster calibration** is fitted against what ships (D13): the two new
>   toxin rows use ptomaine's band shape and its `dose × potency / mass`
>   arithmetic. Salmonella's `infectiousDose` sits **at** the inoculum a
>   contaminating event deposits — honest (its real dose is famously low)
>   and what makes the raw-meat lesson land first try.
> - ⚠ **Staph's `awFloor: 0.86` is authored and not yet exercised**: the
>   cures this build ships take a_w to ≈0.45, well under it. Recorded
>   rather than quietly tuned — the property is correct and waits for a
>   lighter cure.
>
> **Surprise:** the germination mechanism needed no code of its own.
> `germinationK` is a second ceiling on *growth*, so a cooling dish crosses
> it and the survivors' rate simply turns positive again — D11 falls out
> of the rate law instead of being a special case.
>
> Gates: **26** green · `test:near` 367 files / 3854 tests · trade-cooking
> 18/18 · `Contaminable.test.ts` 22/22.

### W3 — Butchering and cross-contamination
**Implements** requirements D3, D9, **D14**, plan P5, **D15**.
`butcher` verb + controller in `trade-cooking`; `Corpse` → cuts as
`Provision` rows with the clock stamped at the kill; the `butchery`
Discipline row; contamination on gut spillage scaled by competence;
transfer on contact; `wash` clears a contaminated implement.

⚠ **D14 — a sentient corpse is not butcherable.** The gate is
**`SpeciesApi.isSentient(corpse)`**, shipped, already the line combat
draws between a cull and a coup (Grounding). ⚠ **Not** a clade walk: the
tutor-bot is sentient and is not a primate. The refusal must be a
**worlded message**, not a validator's "you can't do that."

⚠ **Two small exposures W3 needs**, both one-liners and both worth
naming so they are not discovered as surprises:
`Postmortem.sinceDeath()` is **`private`** and D15 reads it (expose the
method — do not read the public `diedAtGameSec` field across objects,
which is the inter-Stuff contract), and the yields come from P9's new
`butcheryYield` on the Species rows, authored for the huntable animals
near Hearthworks. The verb gates on `constructionForm: 'bladed'` (P8).

**Acceptance:** requirements 6, 7, 8, 17. **Ends at** `feat(cooking):
butchering — the clock starts at the kill`.

### W4 — In-host infection
**Implements** requirements D1, D12, and the `ProgressionSpec` fill.
⚠ **Where the infection starts:** `BulkableApi.ingestSolid` is the one
place food becomes body (Grounding). The pathogen loads W2 put on the
payload are read there, compared against `infectiousDose`, and seeded as
an in-host Condition — the **intoxication** arm needs nothing new, because
a formed toxin on the same payload already reaches metabolism today
(P4a).
The infection arm of `reconcileConditions`, shaped on `TraumaBehavior`;
the Part-5 pathogen roster as Condition rows; symptoms off
`observableSigns`; the accountability row at `ConditionApi.inflict`;
`starvation` / `dehydration` / `recovering` progressing on their
already-authored cadences.
**Acceptance:** requirements 14, 15, 16, 18, and the illness half of
11–13. **Ends at** `feat(vitals): infections grow in the host —
ProgressionSpec filled`.

### W5 — Docs, gates and the drive
Subsystem doc updates; the `CLAUDE.md` map line (**one line**); the
requirements doc's drive script run against the live game and recorded
below.

⚠⚠ **The doc obligation this build must not skip** —
[spoilage.md](../subsystems/spoilage.md) currently says the dose onset
sits inside the tainted band on purpose, so *"the gauge teaches before
it punishes."* That stays true of the spoilage flora and becomes
**false of the system** the moment a silent population exists. The doc
must say both, or it actively misleads the next reader. (This was
requirement 24 before the requirements doc was slimmed to
player-observable acceptance; it is the plan's now.)

**Acceptance:** requirement 19, plus the whole drive script green.

---

## Reachability wiring

Each link fails closed and **silent**.

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| curing / drying / smoking | existing craft verbs — no new verb | ⚠ the recipes must be **afforded by the vessel/implement class as a static**, never by a row's `commandContributions:` (residences build: that field is dead silently) | recipe rows + salt as input + `waterActivity` on cured outputs | recipes install with the pack |
| butchering | `butcher` (new, `trade-cooking`) | ⚠ afforded by the **implement class** (`ToolItem` / `Weapon`, P8), gated on `constructionForm: 'bladed'`; a corpse affording its own butchering is the alternative and stays open | `Corpse` row, cut rows, `butcheryYield` on the Species rows (P9), the `butchery` Discipline row | pack install; ⚠ Discipline catalogue must **warm** the new row |
| ingestion → illness | `eat` / `drink` (shipped) | shipped | n/a | ⚠⚠ **not a boot risk — a bridge risk.** `BulkableApi.ingestSolid` must receive the pathogen loads on the payload from **both** arms of `eat`, or nothing that follows can fire |
| contamination | none — it is a consequence | n/a | pathogen `Condition` rows | ⚠ `ConditionCatalogue` must warm them, or every read is null forever (`reference-ideas-inert-at-boot`, 3× recurrence) |
| infection | `treat` / the medic path (shipped) | shipped | the roster rows + `resolution.by` | same catalogue warm |
| washing | `wash` (shipped) | shipped on `Serviceable` | n/a | n/a |

⚠⚠ **The single highest-risk link is the catalogue warm.** A pathogen
row that nothing warms reads null, the load never seeds, and the whole
build passes its unit tests while doing nothing in the game. That is
exactly how `feel`/`taste` shipped without ever running.

---

## Acceptance-criteria coverage

Against the **player-observable** criteria in the slimmed requirements
doc (1–19).

| criterion | wave |
|---|---|
| 1 · 2 · 3 · 4 — curing works, stacks, is asymmetric, is legible | W0 |
| 5 — salt is consumed and worth buying | W1 |
| 6 · 7 · 8 — butchering yields, refuses a person, answers to skill | W3 |
| 9 · 10 — nothing self-contaminates; the hazard is undetectable | W2 |
| 11 · 12 · 13 — cook-and-eat is safe, cook-and-leave is not, curing keeps the hazard | W2 (the food) + W4 (the illness) |
| 14 · 15 · 16 — delayed onset, legible symptoms, the dying arc | W4 |
| 17 — a dirty implement carries it; `wash` clears it | W3 |
| 18 — the record names the cook | W1 (the stamp) + W4 (the harm row) |
| 19 — nothing already in the world behaves differently on day one | W5 |

All 19 mapped; no gap. ⚠ The three criteria that straddle two waves
(11–13, 18) are the ones to re-check at each wave's end — a wave that
half-satisfies a criterion and moves on is how a build arrives at the MR
with a hole in it.

⚠ **11 and 12 are where D5 actually lands.** *"Cooked properly and eaten
promptly"* vs *"cooked properly and left out"* both presuppose that
"properly" is a heat **and** a hold (P7). Under today's threshold the two
criteria are satisfiable by a build in which cooking is a single boolean,
which would pass the letter and teach nothing.

---

## Test & gate strategy

**Unit** — the arithmetic: the a_w derivation and its ramp, hurdle
stacking, rehydration asymmetry, **the two day-one identities** (a
`moisture: 1.0, solute: 0` instance derives the Material's tabulated
`a_w` exactly; a recipe with no `holdS` kills exactly what today's
threshold kills — together these are requirement 19, and both are
assumptions until pinned), **the zero-load invariant**
(criterion 9 — no food self-contaminates over arbitrary elapsed time at
any temperature), the spore survival floor, blend-by-mass for all four
scalars, the in-host curve. Criterion 10 is the
two-renderings-are-**equal** assertion — assert a contaminated item's
`look`/`smell`/`taste` output equals a clean one's, never assert the
words twice.

**Only the drive can prove** — that the verbs are reachable, that the
recipes are afforded, that the catalogue warmed, that the pathogen and
the `maker` actually crossed the ingest bridge in the **discrete** arm as
well as the dish arm, and that a player who does the wrong thing actually
gets sick. *Tests build state; they never
use it.* Nine builds shipped with one `drive(` commit between them;
every build that was driven found defects the suite could not.
⭐ The requirements doc's steps **4, 8 and 13** are the three the unit
suite structurally cannot reach.

**Gates** — the eleven above, every wave. `pnpm test:near` + the lints
per wave; the **full suite at exactly two moments**: before the MR
opens, and at `/finalize`. Never backgrounded.

**Drive** — the requirements doc's story is the exit criterion for the
build phase, run before the MR opens, recorded below.

---

## Risks & opens

- ⚠⚠ **The catalogue warm** (above). Verify by cold boot on a dropped
  DB, not by test.
- ⚠⚠ **The two clocks on a corpse** (D15). The failure is silent and
  reads as generosity: butchering a stale carcass yields prime meat and
  nothing complains. Pin it with a test that butchers an *aged* corpse.
- ⚠ **The toxin-producing reach** (P4a). A build that ships only the
  infection arm can author three of the five roster entries and will
  look finished.
- ⚠ **`origin/master` moved during this cycle** — MR !242 (the workflow
  overhaul) merged after this branch was cut. Catch the branch up before
  W0, and take the tracked `.claude/skills/` + `.claude/agents/` with
  it (⚠ a sibling worktree needs `rm .claude/skills` once, or checkout
  blocks on the old symlink).
- ⚠ **`Provision` gains a third and fourth mixin.** It is now
  `Crafted(Contaminable(Cured(Freshness(Thermal(Detailed(Thing))))))`.
  Watch the TS declaration-merging problem its docstring already
  records — a nested generic mixin drops an inner surface statically.
- ⚠ **The sparse-storage ordering.** `ContaminableMixin` must check
  before it stamps, or the first `look` at an anvil writes a stamp
  forever. This shipped wrong for one review round on `Freshness`; two
  tests pin it there and the new mixin needs its own.
- ⚠ **`lint:perishable` has no pathogen twin.** A pathogen row on a
  class that cannot carry a load fails silently. Consider
  `lint:contaminable` in W2 — cheap, and the metal-chain lesson is that
  gates ship broken and silently pass.
- ⚠⚠ **The ingest bridge** (Grounding, W1/W2/W4). Every route from food
  into a body is two lines in `EatController`, and the discrete arm's
  transient payload drops everything the discrete mixins knew. A pathogen
  or a `maker` that does not cross it fails **silently and completely**:
  the suite is green, the food is contaminated, the eater is fine.
- ⚠ **D5's kill is a threshold today** (P7). Not a risk so much as a
  requirement that had no wave; recorded here because "cooking already
  kills the population" reads true and is the reason it was missed.
- ⚠ **`butchery` yields are content, and content can be forgotten.**
  P9's `butcheryYield` is empty on 23 species by default. That is the
  designed answer for a rat, and it is also how the boar ships
  unbutcherable. Drive step 2 is the check.
- **Calibration** — D13 is a *method*, not a deferral: the roster's bands
  are **fitted against the authored seeds that already ship**, the way
  the existing poisoning content was, and never invented. (An earlier
  revision of this line said calibration was "deferred," which reads as
  scope dropped.) What genuinely defers is *tuning*, and only after the
  drive.
- ⚠ **No `sapient` flag exists** — ~~a W3 decision~~ **RESOLVED, and it
  was never a decision**: `Species.sentient` + `SpeciesApi.isSentient`
  ship and already gate combat's cull-vs-coup (Grounding). Kept as a
  struck line, not deleted, because the failure mode is the interesting
  part: a fork was written with two costed limbs and neither limb was
  checked against the tree first.
- **Open, for the user:** the `CuredMixin` name (P1); whether butchering
  is afforded by the implement or by the corpse (wiring table). Both are
  reversible; neither blocks W0. ⭐ **P7, P8 and P9 are decided rather
  than opened** — each names the limb that chose and records the
  alternative, so a veto costs one paragraph, not a redesign.

---

## Deferred seams

Clean attach points, each leaving a slate:

- **`ContagionSpec`** — untouched, for
  [disease-slate](../slates/builds/disease-slate.md).
- **`f_pH`** — the fourth lever; a `FermentProfile` row plus a read.
  ⚠ Inherits the unresolved `Vat` collision.
- **Molds** — `ContaminableMixin` is the attach point; a mold is a
  visible surface population. Slate: food-safety-slate Part 10.
- **`trade-butchery`** — P5's spin-out.
- **Irrigation contamination** — `ContaminableMixin` composes onto
  `WateringCan` when someone wants it.
- **Hands** — D3 names one; this build ships no host for it (P2). The
  attach point is `Creature`, and the consumer is the disease build,
  which needs a body-side carrier for transmission anyway.
- **A durative `cook`** — P7 limb 2. The day someone wants to pull a
  roast early, the engagement is the honest shape and `holdS` becomes its
  default rather than its ceiling.
- **Rancidity** — its own small law, not a term here.

---

## Critical files

Read first, in order:

1. `packages/server/src/mud/lib/material/Freshness.ts` — the whole core.
2. `packages/server/src/mud/platform/idea/Condition.ts` — `ProgressionSpec`,
   `ContagionSpec`, `TraumaBehavior`, `toxinBehavior`.
3. `packages/server/src/mud/platform/thing/Provision.ts` — the host.
4. `packages/server/src/mud/lib/bulk/Bulkable.ts` — `BulkPayload` and the
   declaration-merging seam.
5. `packages/server/src/mud/platform/idea/api/ConditionLogic.ts` —
   `mintCorpseFrom`, `inflict`, the accountability hand-off.
6. `packages/server/src/mud/lib/craft/Crafted.ts` — the maker stamp to
   mirror.
7. `packages/server/src/mud/lib/craft/Serviceable.ts` + `WashController.ts`.
8. `packages/server/src/mud/platform/idea/cmd/bulk/EatController.ts` —
   ⚠ **the ingest seam**, both arms (:86, :150–157). The plan shipped one
   revision without this file in the list.
9. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts` —
   `outputMicrobialLoad` + `applySpoilage`: the threshold P7 replaces,
   and the formed-toxin deposit P4a's second producer joins.
10. `packages/server/src/mud/platform/idea/species/Species.ts` —
    `sentient` (:263, :357) and where P9's `butcheryYield` lands.
11. `packages/server/src/mud/lib/mortality/Postmortem.ts` —
    `sinceDeath()`, D15's input, currently `private`.
12. `docs/subsystems/spoilage.md` — and the doc obligation in W5.

---

## Drive record

*(appended at build time)*
