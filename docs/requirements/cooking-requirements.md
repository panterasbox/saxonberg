# Cooking — requirements

The cooking build makes food a **real substance with a clock**. Today
food is inert: a dish is minted from nothing, keeps forever, and records
nothing about what happened to it. This build gives perishable matter a
microbial load that grows by real predictive microbiology, makes
**cooking the act that resets it** (the kill step — the cook's product is
*time*), derives **cooking method from medium × temperature** rather than
declaring it, and folds dinnerware into the one vessel-reuse loop the bar
already runs.

It absorbs the [spoilage design pack](../slates/builds/spoilage-design-pack.md)
as **Wave 0** — that pack is planner-ready and is *not* re-designed here;
this doc records only the decisions it left open plus the deviations
reality forced. The seeding design is
[cooking-slate](../slates/builds/cooking-slate.md) (Parts 1–10, settled).

> **Why one build and not two.** A clock with no counter is not drivable
> ("watch the meat rot"); a counter with no clock is inert ("a crafting
> branch grew a rename"). The spoilage core is wave-sized — a ~120-line
> mixin off `Wet.ts`'s skeleton, tabulated Material constants, one
> reach into the ingest rung, **zero new verbs**.

## Goals

- **Perishable matter carries a microbial load** that grows over
  world-time at a rate set by its temperature and water activity,
  reconciled on read, readable as a band on `look`/`smell`, and
  surviving persistence (the offline gap integrates at the stored rate).
- **Eating spoiled food poisons you through the shipped chain** — a
  ptomaine dose into the digestion pool, the vomit window, the burden,
  the banded `food-poisoning` Condition. No new machinery downstream.
- **Cooking resets the clock**: heat past the kill threshold zeroes the
  load, so the cook turns perishable inputs into a dish with a fresh
  clock — and leftovers spoil again.
- **Method derives, never declares**: a recipe gates on **medium** and
  **heat**, and the medium imposes its own temperature cap, so water
  cannot brown and a fat can carry heat past water's boil. No method
  enum, no new verbs.
- **The fat method exists end to end** — the Materials, a bootstrap
  recipe that renders one from an animal input, and a `smokePoint`
  ceiling on the Material.
- **Dinnerware and glassware are one abstraction**: a dish is *claimed*
  from a pool of clean vessels, soiled at fill, washed, and reused —
  never minted per meal. A leftover is a persistent vessel holding a
  residue.
- **Tasting reads composition, filtered by the taster's competence** —
  the same act tells a novice and a master different things.
- **You eat with tools** — cutlery exists, joins the same reuse loop as
  the dishes, and `eat` uses it when it can. Eating with your hands
  still works and is observable.
- **The trade is `cooking` everywhere**, with no dangling dependents in
  sibling packs, the kernel, or the docs.
- **The roster teaches the method vocabulary** across a difficulty
  ladder, with one ingredient rendered by three media.

## Non-goals

Each names where it lands instead.

- **Tending, doneness, scorching, burning, and the grease fire.** All
  require a pan whose temperature evolves while unattended (seams S1 +
  S2). ⚠ Consequence to state plainly: **v1 cooking cannot fail
  *interestingly* — it can only refuse or mint off-spec.** → the tending
  wave (slate Part 4.5, whose kernel seam bill is already written).
- **Free cooking** (minting without a recipe) and **process memory**
  (what *this attempt* did). Under recipe-gate v1 the recipe stamp *is*
  the process record. → tending wave.
- **Sequencing / combination methods** (braise as sear-then-stew) and
  the **skill seam** (`control` stays fixed). → tending wave; the
  crafting branch already declares control-unfixed as its next wave.
- **Cold storage.** → the [fridge pack](../slates/builds/fridge-design-pack.md),
  the next build in the family, which this build supplies with demand.
- **Preservation: curing, salting, drying, smoking, the a_w counterplay.**
  → the [victualler](../slates/builds/preservation-slate.md). This build
  buys *days* (the temperature term + the kill); they buy *seasons* (the
  water-activity term). Solid salt already exists as a Material; the
  curing *recipe* is theirs.
- **Compost and the spoiled-food sink.** → hearth-and-larder Part 3;
  this build is its long-missing **producer**. Until then, pouring out
  spoiled bulk is the honest minimum.
- **Baking, dough, leavening, milling, and staling.** → the baker pack.
  ⚠ Staling is **not** spoilage (retrogradation peaks near 4 °C) and must
  not reuse this gauge.
- **Butchery, fishing, foraging, hunting, ranching** and their Materials
  (fish, eggs, dairy, cereal). → their own builds; cooking consumes their
  outputs by category tag, which already works.
- **The antitoxin.** → the apothecary/medic vertical, whose demand this
  build creates. Today the plays are `vomit` in the window or ride out
  the clearance.
- **Nutrient deficiency wiring** (scurvy), **prep acts and scrap
  objects**, **kitchen-mess room condition**, **utilities**, **magic
  food**. Each is designed in the slate and deliberately unscheduled.
- ⚠ **The tableware toxin vector** (pewter and lead-glaze leaching into
  acidic food) — *designed, and blocked on a term we deferred on
  purpose*: leaching needs **acidity**, acidity is `f_pH`, and
  terms-not-methods assigns `f_pH` to the victualler build. Lead also
  ships as a toxin type with *chronic content deferred*, so the arc is
  months long and not drivable in W3. When `f_pH` lands, the vector
  lights up for pewter plates and lead-glazed pottery together.

## Surface decisions

### The gauge is composed universally, but stores sparsely

`FreshnessMixin` composes like `WetMixin` — on every `Thing` — rather
than opt-in per class, because opt-in means every future food row must
*remember*, and the residences build already paid for that class of
mistake. The pack flagged the cost (a persisted field on every object);
the resolution is the **toxin-burden storage pattern**: the slot is
*created on first exposure and absent until the load is non-zero*, so
inert hosts persist nothing. Universal capability, sparse storage.

### The material constant is an Arrhenius activation energy

Not a shelf-life time constant. It is the honest form, it reuses
thermal's Q10 idiom, and it is **already required by contract**: the
pack's own item-generator hooks are written as *"Fish at 20 °C, `a_w`
0.99, `Ea` = X — hours to the hazard band?"*, which a shelf-life scalar
cannot answer. Paired with a water-activity threshold below which
`f_aw → 0` (the shelf-stable floor).

### Load and rate are two different quantities

Surfaced by the pack's interop section: cooking's kill **resets the
load** (`N → ~0`), but the cooked product may spoil *faster* than its
raw inputs. So they are modelled separately — the kill zeroes the load;
the **rate afterward comes from the output Material's own constant**
(the cooked blend base), not from the inputs. This is why cooking
matters past nutrition, and it is what makes leftovers a real hazard.

### Freshness rides the payload for bulk, the mixin for items

Settles the pack's open bulk-vs-item question. For bulk contents the
load lives on the **`BulkPayload`** and **transfers carry it**; a
discrete item carries the mixin gauge. Vessel-borne freshness would be
the **pour-to-reset exploit** (decant spoiling stew into a fresh crock,
clock resets). Mixing blends loads **mass-weighted** — dilution is
honestly how concentration works.

### Medium reads from contributions and input slots, not vessel bulk

`CookPot` is **not `Bulkable`** — a build vessel banks transient
`BuildContribution`s. So the medium gate reads the **build's banked
contributions** (by-hand path) or a **matched input slot**
(craft-resolve path): a wet recipe requires water as an input like any
other; a fat recipe requires tallow or oil. Consequence: **stew recipes
gain a water slot they do not have today.**

### Recipe-gate stays; the toxin-kill is the one process fact recorded

Craft-resolve mints only through recipes. The single exception to "no
process memory" is the **toxin-kill write** in `applyEdibleOutput`,
against the shipped `payload?.toxicity ?? material.getToxicity()`
override — so cooking-as-detoxification is real, at the cost of one
field write and no new substrate.

### Dinnerware rides the shipped glass pool

`Dish extends CraftVessel` (**subclass, do not dissolve** — the
nutrition-label and quality-verdict food face is real), inheriting
`soiled`, `wash`, `Thermal` and `Container`. Dinnerware categories
(`plate`, `bowl`, `mug`, `platter`) join the vessel-kind vocabulary, and
the **`edible` branch claims instead of cloning** — clone-per-meal was
crockery *ex nihilo*, a Law-2 leak and a garbage problem.

⭐ **But `no-dish` never blocks dinner — the pot is the dish of last
resort.** No clean dish in reach → the meal stays in the cook vessel and
you eat from the pot. Plating is *service*, never the licence to eat.
The bar's hard `no-glass` decline stays hard; the asymmetry is
deliberate and is what keeps camp cooking working.

### The v1 taste slice ships

`taste` on a dish or build returns its **composition filtered by the
taster's competence** — a novice reads "salty", a competent cook names
the juniper. This needs no tending (the payload and the build's
contributions both exist today), it is the **anti-gauge** doctrine's
first shipped appearance (*there is no doneness bar; there is a spoon*),
and it retires the standing fact that `taste` has never really run.
Taste is **derived, never authored per dish** — a per-dish flavour
string would be a second copy of the composition. Tasting for
**doneness** waits for tending.

### The v1 perishable is the shipped food roster, not fish

A forced deviation from the pack, whose v1 scope names *"one perishable
class (**fish** — fishing is the stated driver)"*: **no fish Material
exists.** W0 therefore proves the gauge over the ~69 shipped edible
Materials (meat, roots, the cooked blends). This *generalises* the
pack's scope rather than narrowing it, and leaves fishing's own
perishability driver already satisfied when that build arrives.

### Cutlery is in, because objects and use are inseparable

Added on review (2026-09-03) after being cut. Both halves of the
original non-goal were weak: **smithing already mints small metal
goods** (`belt-knife` is a shipped recipe), so a table knife is
authorable today and the missing carver blocks only *wooden* spoons;
and the "changes a core verb" worry is answered by the design itself —
**never a gate, always a read**.

The structural argument that settles it: **cutlery-as-objects and
cutlery-in-use cannot be split.** If utensils exist and join the wash
loop, something must dirty them, and that something is eating. Half-in
is incoherent, so it is both halves or neither.

In scope: utensil categories (`spoon` · `fork` · `table-knife`) join
the vessel-kind vocabulary — the same edit already being made for
`plate`/`bowl`/`mug`; metal rows minted by smithing plus a wood/horn
spoon row; and **`eat` claims a clean reachable utensil, soils it, and
narrates it** — none reachable → you eat with your hands, which works
fine and is *observable*. The act always succeeds; only the reading
changes.

### The rename is its own work item with a dependents checklist

`/trade/hearth-cooking` → `/trade/cooking` touches **49 files**, and
they are not all in the pack: two in `trade-smithing`, two in
`hearthworks`, six in the kernel (`platform/thing`, api tests, world
tests, a script), plus docs. This is exactly the shape of the water
build's lesson — ⭐⭐⭐ *a rename breaks the **dependents**, not what you
edited* (`arcane-library`, missed by 22 lint gates and 6 pack suites).
It must move together: the pack directory, the namespace root, the
`requires.title` claim, the group name, and every dependent reference.

### No consumable buffs, ever

Stat-food is the single door through which both god-farming and
min-maxed cuisine enter. The codebase already decided this (`Dish`'s
verdict is *"a felt, diegetic difference, never a stat buff"*); this
build must not reopen it. Food **feeds**; it does not heal.

## Constraints

- ⚠ **Post-OO-sweep vocabulary.** The api-oo-sweep landed 2026-09-03 and
  **retired `ThermalApi`**; the heat gate now reads
  `MixinApi.isThermal(maker) ? maker.reachableHeatK() : 0`. Verbs live
  **on the objects** — see [[oo-calling-conventions]] and
  [antipatterns.md](../antipatterns.md). Any new surface follows suit;
  the `XApi`↔`XLogic` split remains mandatory where an Api survives.
- **No new Mongo collections.** Parcel-local persistence is the document
  tree; the gauge is a mixin field on the host, and `holder_snapshots`
  carries self-persistence.
- **No migrations.** No users, no data — a rename means dropping the DB,
  never writing compatibility code.
- **The lint family is CI-gating** and must stay green:
  `lint:instanceable`, `lint:census`, `lint:untitled`, `lint:topics`,
  `lint:schema`, `lint:imports`, `lint:module-scope`, `lint:locations`,
  `lint:gates`, `lint:test-bootstrap`, `lint:test-content`. ⚠ The metal
  chain's lesson applies to any gate touched here: **assert the gate
  FIRES**, because a broken gate ships silently passing.
- **Pack rules.** A capability pack holds its own namespace root
  (`classFileOf` resolves by longest prefix), ships only the module
  categories a pack may ship, imports the kernel by package specifier
  only, and **must never require a kernel list edit**.
- **The uncertainty doctrine.** No resolutional randomness — spoilage is
  a deterministic integral, not a roll; hazards are states with
  consequences. Seeded, never drawn.
- **The no-gauge reading rules.** Freshness reads as a *band* in prose,
  and doneness gets no bar at all.
- **Law 2 / conservation.** Macros in = macros out; the dish pool exists
  precisely so crockery is not minted from nothing.
- **Test discipline.** Anything touching the wired runtime imports
  `test-bootstrap`; kernel tests do not name shipped content. `pnpm test`
  runs at exactly two moments — before the MR and at `/finalize`;
  everything between is `test:near` plus the touched packs' own vitest
  plus the lints.

## Acceptance criteria

**W0 — the spoilage core**

1. `FreshnessMixin` exists in `lib/material/`, reconciles on read, has
   no far-past guard, and persists nothing while the load is zero.
2. The rate is `μ_max · f_T(T) · f_aw(a_w)` with an Arrhenius
   temperature term and a water-activity threshold, read from tabulated
   `Material` constants; tests cover the three regimes (cold slows,
   frozen pauses, hot kills) and the shelf-stable floor.
3. Perishable hosts carry a temperature (`ThermalMixin` composed where
   it was missing).
4. A spoiled item's load reaches the ingest path as a ptomaine dose
   through the existing per-instance toxicity override, and a test drives
   spoiled → eat → burden → `food-poisoning`.
5. Freshness round-trips through persistence, integrating the offline
   gap at the stored rate.

**W1 — the trade**

6. `/trade/cooking` is the namespace root; **zero** references to
   `hearth-cooking` remain in `packages/`, and the dependents checklist
   (sibling packs, kernel, scripts, docs) is discharged file by file.
7. A recipe may declare `medium`; craft-resolve declines diegetically
   when the medium is absent, and a wet recipe cannot exceed its
   medium's `boilingPoint`.
8. `smokePoint` exists on `Material`; tallow and an oil ship with real
   values; the fat method resolves end to end.
9. `applyEdibleOutput` writes payload toxicity, and a test proves
   raw-toxic → cooked-safe.
10. `Dish extends CraftVessel`; the `edible` branch **claims** a clean
    vessel of the output's kind; **no clone-per-meal path remains**; a
    test proves the full loop (claim → soil → wash → reclaim) and a test
    proves the **pot-as-last-resort** fallback at a campfire with no
    crockery.
11. `taste` on a dish returns its composition, and the reading differs
    by the taster's competence band.
11a. Utensil categories exist; `eat` soils a claimed utensil when one is
    reachable and **succeeds bare-handed when none is**, with the
    difference visible in the scene — proven both ways by test.

**W2 — content**

12. Nine new recipes span the method × difficulty grid, including the
    root-vegetable spine (boiled · mashed · roasted · fried) and
    `render tallow` as the fat method's bootstrap; every recipe resolves
    in a test.

**W3 — the drive and the record**

13. A live drive runs the story end to end: buy meat → it is on the
    clock → cook (kill step, clock resets) → leave the leftovers out →
    `ptomaine`. Defects found are fixed, not noted.
14. The ptomaine band thresholds are reviewed now that exposure is
    routine, not authored-trap-only.
15. `docs/subsystems/` gains the permanent home for spoilage + the
    cooking method vocabulary; the slate is retired or reduced per the
    sweep rules; `pnpm test` is green.

## Cross-references

- **Seeding slates** — [cooking-slate](../slates/builds/cooking-slate.md)
  (Parts 1–10) · [spoilage-design-pack](../slates/builds/spoilage-design-pack.md)
  (**W0, absorbed as designed**) · [preservation-slate](../slates/builds/preservation-slate.md)
  (the victualler boundary; *terms not methods*)
- **Adjacent, sequenced after** — [fridge](../slates/builds/fridge-design-pack.md) ·
  [hearth-and-larder](../slates/builds/hearth-and-larder-design-pack.md) (compost) ·
  [trade-roster](../slates/builds/trade-roster-slate.md) (baker, butcher, potter)
- **Subsystem docs** — [crafting](../subsystems/crafting.md) ·
  [metabolism](../subsystems/metabolism.md) · [thermal](../subsystems/thermal.md) ·
  [fire](../subsystems/fire.md) · [bulk](../subsystems/bulk.md) ·
  [senses](../subsystems/senses.md) · [content-packs](../subsystems/content-packs.md) ·
  [advancement](../subsystems/advancement.md)
- **Doctrine** — [uncertainty](../uncertainty.md) (the abstraction law; no
  resolutional randomness) · [measurement](../measurement.md) (the no-gauge
  reading rules) · [antipatterns](../antipatterns.md)
