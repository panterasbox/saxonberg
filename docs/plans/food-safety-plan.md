# Food safety — implementation plan

Executes [food-safety-requirements.md](../requirements/food-safety-requirements.md).
Adds a second, silent microbial population to the shipped spoilage core,
moves water activity off the Material and onto the instance so
preservation becomes an act, cuts the path from a killed animal to meat,
and grows an ingested pathogen inside its host.

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

**The species taxonomy** — a Species row carries `_parentCladePath`
(e.g. the bullfrog's `/stuff/idea/species/animalia`), and the playable
species sit under `.../animalia/chordata/mammalia/primates/hominidae/homo/`.
⚠ There is **no `sapient` flag** anywhere; the distinction exists
structurally in the clade tree and nowhere else. W3 either walks the
clade or authors the flag — a decision with a real cost either way, and
not one to make by accident.

**Crafting & serviceware** — `CraftedMixin` stamps `maker` (a durable
templatePath) at craft-resolve from the execution context.
`ServiceableMixin` carries `soiled: boolean` + `technique: string`;
`wash` ships as a platform verb
(`content/platform/cmd/crafting/wash.yaml` +
`platform/idea/cmd/crafting/WashController.ts`).

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
the things that actually participate: `Provision`, `Cutlery`,
`CraftVessel`, and the butchering implement/surface added in W3.

⚠ **Not on `ToolMixin` wholesale** — that host set includes
`WateringCan` and `Tap`, and composing there would be the exact
widening the cooking build spent four review rounds undoing. (Irrigation
contamination is a real route and a real future consumer; it is not this
build's, and the mixin composes onto a watering can the day someone
wants it.)

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

---

## Host placement

| new thing | host | what composing it claims |
|---|---|---|
| `CuredMixin` (`moisture`, `solute`) | `Provision` | "this matter has a water state that acts can change." True of all food; will be true of hide and timber. Does **not** claim it rots. |
| `ContaminableMixin` (`_pathogenLoads`, stamp) | `Provision`, `Cutlery`, `CraftVessel`, W3's implement + surface | "this can carry pathogens between things." True of food and of anything that touches it. ⚠ Explicitly **not** `ToolMixin`'s six hosts. |
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
**Acceptance:** requirements 1–4. **Ends at** `feat(spoilage): water
activity is per-instance — moisture and solute over the material base`.

### W1 — The preservation crafts, and the maker stamp
**Implements** requirements 5, D8.
Cure / dry / smoke recipes in `trade-cooking`; salt as a cure input;
`maker` onto `BulkPayload`, stamped at craft-resolve from the execution
context exactly as `CraftedMixin` does.
**Acceptance:** requirement 5 (and the maker stamp W4's criterion 18
depends on). **Ends at** `feat(cooking): curing, drying and smoking —
salt stops being a seasoning`.

### W2 — The silent population
**Implements** requirements D4, D5, D6, D10, D11, plan P2, P4, P6.
`lib/material/Contaminable.ts`; `pathogenBehavior` on `Condition`;
per-population inoculum and channels; Arrhenius kill rate with a spore
survival floor; the pathogen half of the payload record.
**Acceptance:** requirement 9 in full. ⚠ **Criterion 10 (a contaminated
item is indistinguishable from a clean one) cannot be shown in W2** —
nothing can contaminate anything until W3, so W2 proves it in tests
against a directly-seeded load and the *player-observable* half lands
with W3. 11–13 advance to the point the food behaves correctly; the
illness they end in is W4's.
**Ends at** `feat(spoilage): the second population — silent,
event-seeded, its own kill curve`.

### W3 — Butchering and cross-contamination
**Implements** requirements D3, D9, **D14**, plan P5, **D15**.
`butcher` verb + controller in `trade-cooking`; `Corpse` → cuts as
`Provision` rows with the clock stamped at the kill; the `butchery`
Discipline row; contamination on gut spillage scaled by competence;
transfer on contact; `wash` clears a contaminated implement.

⚠ **D14 — a sapient corpse is not butcherable.** The gate reads the
species taxonomy (`_parentCladePath` on the Species row places `homo`
under hominidae); whether it reads the clade walk or an authored flag is
a W3 call, but the refusal must be a **worlded message**, not a
validator's "you can't do that."

**Acceptance:** requirements 6, 7, 8, 17. **Ends at** `feat(cooking):
butchering — the clock starts at the kill`.

### W4 — In-host infection
**Implements** requirements D1, D12, and the `ProgressionSpec` fill.
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
| butchering | `butcher` (new, `trade-cooking`) | ⚠ afforded by the **implement class**; a corpse affording its own butchering is the alternative and must be chosen deliberately | `Corpse` row, cut rows, the `butchery` Discipline row | pack install; ⚠ Discipline catalogue must **warm** the new row |
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

---

## Test & gate strategy

**Unit** — the arithmetic: the a_w derivation and its ramp, hurdle
stacking, rehydration asymmetry, **the zero-load invariant**
(criterion 9 — no food self-contaminates over arbitrary elapsed time at
any temperature), the spore survival floor, blend-by-mass for all four
scalars, the in-host curve. Criterion 10 is the
two-renderings-are-**equal** assertion — assert a contaminated item's
`look`/`smell`/`taste` output equals a clean one's, never assert the
words twice.

**Only the drive can prove** — that the verbs are reachable, that the
recipes are afforded, that the catalogue warmed, and that a player who
does the wrong thing actually gets sick. *Tests build state; they never
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
- **Calibration** is deferred (requirement D13) but the roster's bands
  must be fitted against authored seeds, not invented.
- ⚠ **No `sapient` flag exists** (Grounding). W3's D14 gate either walks
  the clade tree or authors a new Species field. Walking is free and
  couples the gate to taxonomy shape; a flag is explicit and touches
  every species row. **Decide it deliberately in W3** — this is the kind
  of choice that gets made by whichever is easier to type.
- **Open, for the user:** the `CuredMixin` name (P1); whether butchering
  is afforded by the implement or by the corpse (wiring table); and the
  D14 gate above. All three are reversible; none blocks W0.

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
8. `docs/subsystems/spoilage.md` — and requirement 24 against it.

---

## Drive record

*(appended at build time)*
