# Food safety — requirements

Food already goes off in a way you can smell. This build adds the thing
that actually hurts you: **a second microbial population that is
invisible to every sense**, that no clock starts on its own, and that
grows inside you after you swallow it. Alongside it, the counterplay the
[preservation slate](../slates/builds/preservation-slate.md) has been
waiting on since 2026-07-31 — salting, drying and curing, made possible
by moving water activity off the Material and onto the instance.

Seeded by [food-safety-slate](../slates/builds/food-safety-slate.md),
which absorbs the *endeavour* half of
[preservation-slate](../slates/builds/preservation-slate.md) (its
*mechanism* half shipped with the cooking build, MR !231 →
[spoilage.md](../subsystems/spoilage.md)). The two shipped rules this
build sits between:

> *Heat kills the population; it does not destroy what the population
> made.* — [spoilage.md](../subsystems/spoilage.md), shipped
>
> **Curing suspends the population; it does not kill it.** — this build

Neither half of "cook it or cure it" is safe alone. Knowing which one a
given piece of food needs is the curriculum.

---

## Goals

- **Water activity is a per-instance property**, so the same material
  can be fresh, dried, cured, or both — and hurdle stacking works
  without a combinatorial explosion of Material rows.
- **Preservation is an act a player performs.** Curing, drying and
  smoking exist as crafts; salt stops being a seasoning and becomes the
  keystone commodity mining already decided it was.
- **A second, silent microbial population** rides the shipped growth
  law, emits on no sense channel, and starts at zero until an event
  seeds it.
- **Contamination is an event with a source.** Butchering is that
  source: a path from a killed animal to meat, with the clock starting
  at the kill and the yield answering to skill.
- **Cross-contamination is real and object-scoped** — a board, a knife,
  a hand — and the shipped `wash` verb becomes the counterplay.
- **An ingested pathogen grows inside its host**, filling the reserved
  `ProgressionSpec` slot, with symptoms banding off the load and the
  shipped rescuable `dying` clock as the ceiling.
- **Thermal death answers to temperature.** `killRatePerHour` stops
  being flat, making a simmer and a sear different acts and giving the
  thermometer a job.
- **A served dish is attributable.** Bulk food records who made it, so
  the accountability ledger can express who poisoned whom.
- **The cause is knowable by procedure, never by sense** — and the
  procedure is teachable, which is what keeps an invisible hazard from
  being unfair.

## Non-goals

- **Transmission.** `ContagionSpec` is left untouched; no room-to-room
  spread, no vectors, no host range. That is
  [disease-slate](../slates/builds/disease-slate.md)'s, and it
  correctly requires a **push** tick (nobody reads an empty room) that
  this build's reconcile-on-read shape cannot provide.
- **Acquired immunity / prior exposure.** Needs a memory model; the
  disease build's.
- **Room-borne contamination.** A filthy kitchen as a load-bearing
  surface is the push-tick shape again. Objects only.
- **Molds and fungi.** A genuine third microbial idiom (visible,
  surface-borne, spreading by contact, sometimes desirable). Deferred
  whole, with aflatoxin and ergot held for it — see slate Part 10.
- **Medicine and pharmacology.** This build *creates* the demand for a
  diagnostician and deliberately does not supply one.
  [pharma-slate](../slates/builds/pharma-slate.md) owns it, and
  penicillin wants the mold build first.
- **Rancidity / oxidative staling.** Not a microbial story; wants its
  own small law. The deferral is already recorded in
  [spoilage.md](../subsystems/spoilage.md).
- **Acidity (`f_pH`).** The fourth and last lever, still absent, still a
  `FermentProfile` row plus a read when a consumer wants pickling.
- **Oxygen / sealing physics.** Sealing stays binary. Botulinum arrives
  as a toxin row, not as an aerobe/anaerobe flora split.
- **Livestock, herds, husbandry.** This build takes only the *hunting*
  side of the seam [ranching-slate](../slates/builds/ranching-slate.md)
  explicitly left open.
- **Rendering the non-meat carcass** (hide, bone, fat beyond the shipped
  `render-tallow`). Adjacent;
  [rendering-slate](../slates/builds/rendering-slate.md)'s.

---

## Surface decisions

### D1 — The infection gauge composes nowhere new

**Question:** where does a host-side infection state live —
`OrganismMixin`, `VitalsMixin`, or its own mixin?

**Answer: there is no host question.** `VitalsMixin` composes onto
exactly **one** class, `Creature`, and `reconcileConditions` — the
game-time, reconcile-on-read driver that already runs wounds — is
already there. The infection is a **new arm of the existing
reconcile**, over the existing `conditions` record. No new mixin, no new
host set, no new persistence field group.

⭐ The count is the answer, per the four-round lesson from MR !231:
*answer it with the host-set count, not by argument.*

Corollary worth stating: `OrganismMixin` is the wider one (`Creature` +
`Plant`), so **a plant cannot get food poisoning**, which is correct and
falls out rather than needing a guard.

### D2 — The pathogen load extends the existing `freshness` record

**Question:** does the second population ride a sibling field on
`BulkPayload`, or the existing one?

**Answer: it extends the existing record.** The shipped shape is
`freshness?: { load: number; stamp: number }`, declared onto
`BulkPayload` from `lib/material/Freshness.ts` by declaration merging.
The second population goes **inside** that record.

**Because the stamp must be shared.** Two sibling fields means two
stamps, which can drift; a drifted stamp means the two populations
integrate over different elapsed windows from the same clock read, and
a cook could launder one by touching the other. One stamp, one reconcile
pass, both populations advanced together.

### D3 — Cross-contamination is object-scoped

A pathogen load may sit on any object that touches food — a board, a
knife, a hand, a vessel. **Rooms carry nothing.** A room-borne load is
the push-tick shape `disease-slate` reserved, and taking it here would
breach the transmission boundary through the back door.

The counterplay is the **shipped `wash` verb** over `ServiceableMixin`,
which landed with the cooking build's serviceware tier. It is about to
mean something.

### D4 — No sense channel for contamination; the risk is legible from history

**Question:** can a player perceive contamination at all, or is
procedure the only route?

**Answer: procedure only — no channel, no augmenter, no tell.** The
shipped `FRESHNESS_CHANNELS = ['vision', 'smell']` becomes a property of
the population; the pathogen's list is **empty**.

⭐ **What dissolves the fairness worry is that the risk is legible even
though the load is not.** A player can see that the meat is raw, that
the board was used to gut something, that the stew has been sitting out
since morning. **The information is in what you did, not in the
object** — so a careful player is not guessing, they are reasoning. That
is derivability, and it is the whole lesson: *invisible to the senses,
knowable by procedure.*

### D5 — Thermal death becomes temperature-dependent

`Freshness.growthRate` currently returns a **flat** negative dial above
`killK` (`Freshness.ts:208`), so every temperature past the threshold
kills at one rate. It becomes Arrhenius, symmetric with the growth term
directly above it.

**Because the actual lesson is that it is not a temperature, it is a
temperature held for a time.** A long hold at 60 °C and an instant at
71 °C are the same kill; a flat rate cannot say that, and without it the
thermometer and the hold time are decoration.

### D6 — The inoculum becomes per-population

`advance()` floors the load at the seed population whenever the rate is
positive (`Math.max(clamp01(load), Freshness.inoculum())`). Correct for
spoilage — the flora really is everywhere — and **fatal for pathogens**,
which would spontaneously appear in every piece of food in the world.

The inoculum moves from a global dial to a property of the population,
and the pathogen's is **zero**.

> ⭐⭐⭐ **Spoilage is a clock. Contamination is an event.** This is the
> design's spine and the reason it is not miserable: food never
> spontaneously becomes dangerous. Something *happened* to it.

It is also the Law-2 clearance, twice over — preservation-slate's *"the
clock starts at an act, never at ownership"* holds even harder here,
because the pathogen clock does not start at all without one.

### D7 — Two per-instance scalars, and not on `WetMixin`

`Freshness.waterActivityOf(material)` takes a Material and nothing else
(`Freshness.ts:241`), which is why salting cannot touch it. It gains a
per-instance carrier holding **two** scalars:

- **`moisture`** — water content relative to the material's native value
  (1.0 = as-harvested, lower = dried).
- **`solute`** — cure loading actually taken up (salt, sugar, honey).

`a_w` derives from both plus the material's tabulated base. Both land
symmetrically on **both halves** of the shipped gauge — the mixin's
`fieldMeta` and the `BulkPayload` record — because brined pork is bulk
and a hanging ham is not, and both blend by mass on transfer exactly as
the load already does.

**Two and not one collapsed effective-a_w**, because of a reversibility
asymmetry a single scalar cannot express: **drying comes back and curing
does not.** Jerky in a damp cellar rehydrates; a salted ham does not
un-salt.

⚠ **And not on `WetMixin`**, which
[preservation-slate](../slates/builds/preservation-slate.md) proposed as
*"free — already universal"*. It models **surface** saturation and
**drains toward ambient by design**. Hang a_w on it and a dried fish
walks through fog and comes back fresh. The honest coupling runs the
other way and is weaker: humid storage slowly *raises* `moisture`, which
is what makes a dry store worth building.

### D8 — `BulkPayload` gains a maker

**Verified gap.** `CraftedMixin` already stamps a `maker` (the maker's
durable templatePath, derived at craft-resolve from the execution
context) on discrete crafted items. `BulkPayload` carries `recipeId`,
`appearance`, `keywords`, `cookedAtK` and `composition` — **and no
maker**. A dish in a pot does not know who cooked it.

It needs one, because `ConditionApi.inflict` takes an optional
`accountability` supplied **by the producer** (*"the ledgers never
infer"*), and a food-poisoning affliction cannot fill that row if the
food has forgotten who made it. Without this, serving contaminated food
to a paying customer is mechanically identical to eating it alone, and
lens 4 has nothing to say.

Same declaration-merging seam as `freshness`; same rule as the cooking
build's — **the payload carries what cannot be derived**.

### D9 — Mint a `butchery` Discipline, specializing `cooking`

The yield and cleanliness of a butchering act answer to skill: gut
spillage is the dominant real contamination route, and it is precisely
what a bad butcher does. A Discipline is the project's unit of skill, so
the act needs one or it teaches nothing.

`specializes:` is a shipped field on the `Discipline` schema (used by
`blades`, `bartending`, `horticulture`, `retail-sales` and others), so
this is a **content row**, not a new tree — the same move
`baking specializes: cooking` settled in
[trade-roster-slate](../slates/builds/trade-roster-slate.md).

### D10 — Botulinum is a toxin, not an infection

*C. botulinum* does not touch the in-host path. It rides the **shipped**
`formedToxins` channel and, because botulinum toxin is genuinely
heat-labile, the **shipped** `labileAtK` field — which already
distinguishes a raw bean's lectin (labile) from ptomaine (not).

> Two reaches coexisting is the model being right about a real
> distinction: **some things poison you, some things infect you, and
> boiling fixes exactly one of them.**

### D11 — Spore-formers get two constants, and the danger zone is free

The danger zone is **not a new concept**: it is the region where
`growthRate > 0`, between `freezingK` (273 K) and `killK` (333 K), and
`ThermalMixin` already does Newton cooling. A pot left out cools through
it on wholly shipped machinery.

A spore-former needs exactly two authored constants — a **survival
fraction** through the kill step and a **germination threshold** — to
make *"cool it fast"* a real mechanic. That yields the most common real
food poisoning there is: **you get sick from food you cooked
properly.**

### D12 — Host resistance stays thin

A scalar read off vitals/nutrition, matching disease-slate's *"good
husbandry **is** immunity"* in shape without building it. No immune
memory, no exposure history.

### D13 — Calibration is fitted, not invented

Deferred to a running game as ever, but with the discipline the shipped
work already demonstrated: the ptomaine dose curve was fitted against
the **authored** `ptomaine` seed's bands and clearance rate, and the two
agreed without either being tuned to the other. Pathogen bands are
fitted against authored Condition seeds the same way.

---

## Lens pass

**1 · Pedagogy.** Disciplines exercised: **`cooking`** (the kill step —
temperature *and hold time*, now that D5 makes the distinction real),
**`butchery`** (new, D9 — clean separation as a skill), and
**`medicine`** (diagnosis, D4's procedure). Everything derives from one
equation the player can internalise: a population grows between two
temperatures, faster when warm and wet, and dies above 60 °C. From that
alone a player can predict that a cured ham keeps, that a cooked stew
left out is worse than the raw stock was, and that boiling fixes
botulism but not staph. ⭐ Nothing is rolled: **which** pathogen a
carcass carries is environmental (a fact about the world, legitimate per
[uncertainty.md](../uncertainty.md)); **what your knife did** is not.

**2 · Expression.** The ordinary case is entirely data: a new pathogen
is a `Condition` row plus constants; a new cure is a recipe; a new
perishable is a Material with an `Ea`, an `a_w`, and now a moisture
response. **No code for any of it.** The bespoke case is the hurdle
stack — an author combining salt, smoke and time gets a correct answer
without anyone having enumerated "salt cod", because the levers compose.
⚠ The one gap: the spore constants (D11) are engine-side, so a
*genuinely novel* survival mechanism would still need a kernel edit. Two
constants is a narrow enough surface to accept.

**3 · Immersion.** The whole build refuses a gauge — there is no
contamination meter, and by D4 there is no reading at all. What the
simulation affords without scripting: hanging meat in a cold cellar
because you understand why; keeping a separate board because you got
burned once; a cook who insists on washing between jobs, and a customer
who notices. ⭐ The strongest immersion property is that **the anxiety is
real and correctly placed** — you are not watching a number approach a
threshold, you are remembering what you did with that knife.

**4 · Values.** The choice forced is **whether to serve it.** Eating
your own risky food is a private gamble; putting it on a menu is a
choice about other people, and D8 is what makes the difference legible.
Who confers standing: the **polity, through the shipped accountability
ledger** — `accountability_events` with derive-on-read blame, filled by
the producer at `ConditionApi.inflict`. A cook who poisons patrons is
visible as having done so, without a reputation stat and without anyone
scripting a consequence. ⭐ This is the reason food safety is a *civic*
system and not merely a survival one.

**5 · Epochs.** The mechanism is microbial growth and thermal death,
which is identical in prehistory and in a modern kitchen. What changes
is **dynamics only**: the medieval rung has salt, smoke, and a cold
cellar; the industrial rung adds canning; the modern rung adds
refrigeration and pasteurisation; the future rung adds irradiation.
Every one of those is a parameter on the existing levers — none is a
different machine. ⭐ Nothing about the cellar has to be rewritten to
become a fridge; `AtmosphericMixin` already carries the override, and
temperature is temperature.

---

## Constraints

- ⚠⚠ **`ContagionSpec` must not be touched.** It is the scope boundary
  and the disease build's property. A reviewer should be able to confirm
  the boundary held by `git diff` on one interface.
- **`ProgressionSpec` is currently a stub** —
  `{ intervalMs: number }` with *"no live scheduler is built here"*.
  Three shipped Conditions (`starvation` 1 h, `dehydration` 30 min,
  `recovering` 1 h) already author a cadence that **nothing reads**.
  Filling the slot must fix those three, not leave them dead beside a
  new path.
- **Reconcile-on-read, game-time, no scheduler**, matching
  `reconcileConditions`. ⚠ And matching
  [spoilage.md](../subsystems/spoilage.md)'s **two deliberate
  divergences**: no far-past guard and no linkdead freeze on the food
  side. In-host, the existing condition behaviour governs.
- ⚠⚠ **The sparse-storage ordering must be preserved.**
  `reconcileFreshness` checks perishability *before* reading the clock,
  so inert matter reads and writes nothing. A second population must not
  re-introduce a write on first look at an anvil — this shipped wrong
  for one review round already.
- **No new Mongo collections.** Per project rule; the load rides
  existing per-instance state and the existing `conditions` record.
- **No migrations.** A field-shape change means dropping the dev DB.
- ⚠ **`requiresWizard` is TypeScript access only.** No verb, validator
  or test in this build may reach for the wizard axis; a blocked gate is
  a finding about a missing seat, not a licence.
- **Banding is presentation.** Bands are never a number to the player;
  the shipped band vocabulary is the model.
- ⚠ **Do not widen a mixin to serve rows.** If a class turns out to be
  the wrong host, move the rows. Count hosts first
  (`grep -rl "XMixin("`).
- **The fermentation/spoilage collision on `Vat` is inherited, not
  resolved.** It stays open (see Findings); nothing in this build may
  tabulate a spoilage constant on a fermentable without settling it.

---

## Acceptance criteria

**Water activity & preservation**

1. A perishable's effective `a_w` derives from per-instance `moisture`
   and `solute` over the Material's tabulated base, on **both** the
   mixin gauge and the `BulkPayload` record.
2. Drying and salting the same material reach a comparable `a_w` by
   different routes, and **stack**: a salt-and-dry cure reaches a lower
   `a_w` than either alone.
3. Rehydration is asymmetric — humid storage raises `moisture` over
   time; nothing lowers `solute`. A test pins that a cured item cannot
   be un-cured by weather.
4. `moisture` and `solute` blend by mass on transfer, like the load.
5. At least one cure, one dry and one smoke recipe ship, and salt is an
   input to the cure.
6. Tests cover the a_w ramp at the floor: partial curing scales the rate
   proportionally, and crossing 0.60 stops growth entirely.

**The pathogen population**

7. A pathogen load emits on **no** sense channel — `look`, `smell` and
   `taste` on a contaminated-but-fresh item are byte-identical to the
   same item clean. A test asserts the two renderings are **equal**
   rather than asserting the words twice.
8. A zero pathogen load stays zero over arbitrary elapsed time at any
   temperature. **No food is ever spontaneously contaminated.**
9. Thermal death rate rises with temperature; a long hold at a low
   supra-kill temperature and a short hold at a high one reach the same
   surviving fraction.
10. Spore-formers survive a kill step at their authored fraction and
    germinate when the host cools below their threshold — a stew cooked
    properly, then left out, ends contaminated.
11. Curing a contaminated item **suspends and does not clear** its
    pathogen load; the item is shelf-stable and still dangerous after an
    arbitrary interval.
12. The two populations advance from **one** shared stamp in one
    reconcile pass.

**Butchering & contamination events**

13. A `Corpse` yields cuts; the cuts carry a running freshness clock
    from the moment of the kill.
14. Butchering yield and contamination answer to the `butchery`
    Discipline, which ships as a row specializing `cooking`.
15. A contaminated implement transfers load to food it processes, and
    `wash` clears it.
16. A `butchery` Discipline row exists and is exercised at butcher-resolve.

**In-host infection**

17. An ingested pathogen produces **no immediate symptom**, then bands
    into an affliction after an incubation that emerges from the growth
    curve rather than from a tuned delay.
18. `ProgressionSpec` is consumed, and `starvation`, `dehydration` and
    `recovering` progress on their already-authored cadences.
19. A severe untreated infection drives vitals into the shipped
    rescuable `dying` arc; nothing in this build adds a death path.
20. `ContagionSpec` is unmodified — verifiable by diff.
21. Treatment resolves through the authored `resolution.by` seam.

**Attribution**

22. `BulkPayload` carries a `maker`, stamped at craft-resolve from the
    execution context like `CraftedMixin`'s.
23. A food-poisoning affliction traceable to a served dish supplies an
    `accountability` row naming that maker.

**Docs & gates**

24. `docs/subsystems/spoilage.md` is updated — it currently states the
    gauge is one population and that the onset sits inside the tainted
    band so *"the gauge teaches before it punishes"*. That remains true
    of the spoilage flora and is now **false of the system**; the doc
    must say both.
25. A subsystem doc covers the pathogen half, the preservation levers,
    and butchering — either as a new doc or as sections owned by
    existing ones, with the `CLAUDE.md` map entry a **single line**.
26. `pnpm lint:perishable` still passes, and the lint family is green.
27. The live drive runs the acceptance story end to end: **kill →
    butcher → too much meat → cure some, cook some, leave some → the
    cured keeps, the left-out spoils visibly, and the contaminated one
    makes you sick hours later with nothing having warned you.**

---

## Findings inherited (not this build's to fix)

- **`Condition`'s class docstring is stale** — *"ZERO content ships —
  the class + field shape only; the catalog is a later wave."* Fifteen
  rows ship. Cheap to correct in passing; not a goal.
- **The fermentation/spoilage collision on `Vat`** —
  [spoilage.md](../subsystems/spoilage.md) calls it *"luck resting on a
  decision, not a guard."* Now on its second slate. It belongs to
  whoever builds `f_pH`.

---

## Cross-references

**Seeding slates** — [food-safety-slate](../slates/builds/food-safety-slate.md)
· [preservation-slate](../slates/builds/preservation-slate.md)
· [disease-slate](../slates/builds/disease-slate.md) (the boundary)
· [ranching-slate](../slates/builds/ranching-slate.md) (the seam this cuts)
· [rendering-slate](../slates/builds/rendering-slate.md) (adjacent)
· [pharma-slate](../slates/builds/pharma-slate.md) (the demand created)
· [health-vertical-slate](../slates/builds/health-vertical-slate.md)
· [sampling-and-labs-slate](../slates/builds/sampling-and-labs-slate.md)

**Subsystem docs** — [spoilage.md](../subsystems/spoilage.md)
· [metabolism.md](../subsystems/metabolism.md)
· [vitals.md](../subsystems/vitals.md) · [harm.md](../subsystems/harm.md)
· [mortality.md](../subsystems/mortality.md)
· [thermal.md](../subsystems/thermal.md)
· [crafting.md](../subsystems/crafting.md) · [bulk.md](../subsystems/bulk.md)
· [accountability.md](../subsystems/accountability.md)
· [advancement.md](../subsystems/advancement.md)

**Doctrine** — [design-lenses.md](../design-lenses.md)
· [uncertainty.md](../uncertainty.md) · [measurement.md](../measurement.md)
· [antipatterns.md](../antipatterns.md)
