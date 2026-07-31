# Houseplant — requirements

The first build of the living-world family: **a thing that grows.** You buy a
pot, fill it with soil, plant a seed, and keep it alive — water, light, and
enough root room. Tend it well and it matures, flowers, and gives you a seed to
plant again. Neglect it and it dies.

Nothing is harvested for money and nothing is farmed. The plant exists to prove
the family's biggest new primitive — the **growth model** — at the smallest
scale that can carry it, and to prove it on the **object shape the rest of the
family inherits**: a pot is a `Slotted` fixture holding one `Slottable` plant,
which is exactly what farming's garden bed is at N > 1.

This is **phase 1** of
[living-world-roadmap.md](../living-world-roadmap.md), which picks it first
because it dodges every dependency the rest of the family carries: no land use,
no parcels, no Warren, no weather, no sun→light driver. What it *does* carry is
the whole **care model** — the five shared conventions that bind farming,
ranching and pets — so the conventions get their first code contact here, where
a mistake costs one YAML file instead of a vertical.

Seeded by [farming-slate § Houseplants](../slates/builds/farming-slate.md) and
governed by [ranching-slate § The five shared
conventions](../slates/builds/ranching-slate.md).

---

## Goals

- **A living thing reconciles its own state against world time.** A plant's
  condition is a pure function of `(profile, plantedAt, now, water, light,
  root room, interventions)`, computed lazily on read. No tick, no scheduler,
  no presence gate — the plant advances whether or not anyone is logged in.
- **The family clock is real in code, not just in a doc.** Owned things
  integrate the full absence; the far-past guard stays bodies-only. A player
  away three real days comes back to a plant that lived those three days.
- **Three inputs combine by the limiting factor.** Water, light and root room
  each produce a satisfaction, and growth runs at the *minimum* of them —
  Liebig's law, at the smallest scale it can be demonstrated. This is the exact
  expression phase 4's field evaluates over six inputs.
- **The pot is a real object and the plant lives in it.** Pot, soil, seed and
  plant are separate things you assemble. The pot is a `Slotted` host with one
  plant slot and a soil volume; the plant is its `Slottable` occupant.
- **Outgrowing the pot is a legible, self-teaching state.** A root-bound plant
  stalls and says so, and repotting is the fix. No tutorial explains this —
  the cause line does.
- **Care produces a legible outcome, and neglect produces a legible one.** The
  condition reads as a band on `look`; the *cause* of a bad band reads
  separately, so a player observes a symptom and infers a reason.
- **The loop closes without an economy.** A well-kept plant flowers and sets a
  seed. That seed plants a second plant. Propagation needs no money.
- **Sustained neglect kills it,** on a long fuse, terminally.
- **The model is parameterized by content, not hardcoded.** Two plant species
  ship with genuinely different curves, so "one biology, many plants" is
  demonstrated rather than asserted.
- **The plant owns its state and takes it with it.** It is its own persistence
  host, keyed per instance, carrying its own location — so it keeps growing
  when it leaves the dorm, and nothing about its durability is wired to dorm
  code. Two plants from one template hold independent state. A watering is
  captured when it happens, so a restart cannot lose it.

---

## Non-goals

Each is named because someone could reasonably assume it's in scope, and each
has an owner.

- **No harvest for value, no yield, no `Grade` on an output.** The plant
  produces a seed, not a commodity. Yield shapes are
  [ranching](../slates/builds/ranching-slate.md) (phase 5); the harvest that
  mints tradeable matter is phase 2.
- **No genetics.** No `Genome`, no `express`, no meiosis, no cross-pollination.
  A seed grows into its parent's species, full stop — it carries no inherited
  variation. Farming slate § Genetics.
- **Seeds do not stack.** A seed is a discrete `Thing`, matching the general
  store's stated convention ("goods are all discrete Things, never `Globbable`,
  so each carries a chattel stamp on buy"). `Globbable` seed lots arrive with
  genetics, where fixed-vs-segregating lines make stacking meaningful.
- **No soil *quality*.** Soil is a volume and a prerequisite, not a nutrient
  model. No N/P/K, no pH, no tilth, no organic matter, no fertilizer, no
  compost. The six-reserve soil is phase 2/4.
- **No multi-plant pots.** One plant slot. N-slot beds are phase 2.
- **No sun→ambient-light driver.** Room ambient light is *authored data* here.
  Deriving room light from `CelestialApi` is net-new and is phase 4's.
- **No weather, no outdoor growing.** Indoors only. Phase 4.
- **No land use, no parcel, no Warren.** Phase 2.
- **No general maturation driver.** This build advances *one plant's own*
  growth stage. `Organism.age` is stamped so a general driver has something to
  generalize from, but the driver is phase 5's.
- **No `Species` schema change.** The growth profile is authored on the object
  template. Adding fields to `Species` is phase 5's, by roadmap assignment.
- **No disease, no `ContagionSpec`, no blight.** Phase 6. The condition value
  this build computes is what phase 6's resistance factor will read, but
  nothing reads it here.
- **No spoilage, no freshness gauge.** Phase 3.
- **No chattel stamp, no ownership, no chain-of-title** on the plant itself.
  Store goods get stamped on buy by the shipped retail path; this build adds no
  ownership logic. Chattel was evaluated as the *durability* mechanism and
  rejected — chattel.md is explicit that a stamped good "culled loose in a
  transient room" **releases** its row. It is identity and ownership, not a
  persistence spine. Chattel on the `Creature` stack is phase 5's.
- **No bond, no attention need, no regard.** A plant cannot hold an opinion of
  you — the family's stated asymmetry and
  [pets](../slates/builds/pets-slate.md)' whole divergence.
- **No automation ladder.** No hired hand, no self-watering pot, no script.
  Needs the employment engine and a production brain (phase 8).
- **No competence gate, no instruments, no error bars.** Science is the skill
  ceiling, not the entry fee; v1 is the entry.
  > **Amended during the build (2026-07-31).** The original non-goal also read
  > "no Discipline … and this build does not author one", routing the
  > agricultural rows to the parallel content track. Reversed on request: the
  > `agriculture` + `horticulture` rows now ship, and the three husbandry
  > verbs mint world-graded evidence into `horticulture`. The *gate* half of
  > the non-goal stands unchanged — nothing reads the band, and the Discipline
  > confers no verbs, because the natural conferral is phase 7's diagnosis
  > surface. See husbandry.md § Advancement.
- **No new Api.** Reads live on the objects. The one addition is a static on
  the *existing* `PersistableApi`.

---

## Surface decisions

### The object model — four things, not one

| Object | What it is |
|---|---|
| **Pot** | a `Slotted` host with one `plant` slot **and** a bulk interior holding soil. Its **soil volume is the root ceiling.** Ships in two sizes. |
| **Soil** | a bulk `Material`. A bag of potting soil is an ordinary bulk holder; you pour it into the pot with the shipped `pour`. |
| **Seed** | a discrete `Thing` naming the plant template it grows into. Bought, or set by a flowering plant. Consumed on planting. |
| **Plant** | a `Slottable` `Organism` carrying `GrowingMixin` — **all the state, and the persistence host.** |

**This is the density dial's smallest instance, not a special case.** The
farming slate already specifies the boutique density as *"a garden bed is a
`Slotted` fixture with N slots; each plant is a `Slottable`."* **A pot is that
at N = 1**, so phase 2's bed is the same code with a bigger N. A monolithic
pot-and-plant object would have been thrown away at phase 2; this one isn't.

### Root room is the third limiting factor

`min(satWater, satLight, satRoot)`, where `satRoot` is a curve over
`potSoilVolume ÷ the stage's root demand`. Two behaviours fall out of the one
curve with no special-casing:

- **A root-bound plant stalls.** Maturity accrues only above a satisfaction
  threshold, so a pot-bound plant stops advancing stages.
- **A root-bound plant does not die.** `satRoot` is **floored** by the curve's
  shape (it never returns 0), so being pot-bound depresses condition to a
  visible band and holds there. That is honest — real pot-bound plants look
  rough for years.

`getLimitingFactor()` returns `'root'`, and the cause line reads *"it has
outgrown its pot."* **That is the entire tutorial for transplanting.**

### `fitsSlot` gates the transplant, and needs no new field

`Slottable.fitsSlot(host, slot)` is already the **candidate-side** acceptance
test — the *plant* decides whether it fits. It compares its current stage's
root demand against the pot's soil volume, so a mature plant refuses a thimble.
**No new `SlotSpec` field**; the pot's soil volume is just its bulk interior
capacity.

### Moisture lives on the plant, not the pot

The physically prettier model puts water in the soil. It is rejected because it
splits one checkpoint across two objects, and the reconcile, the clock stamp
and the persistence record are all the plant's. **The pot supplies volume; the
plant owns its root-zone moisture `Reserve`.** Watering a pot with nothing
planted in it says so and changes nothing.

### Two verbs, both genuinely new

No generic "put a `Slottable` into a `Slotted`" verb ships — `wear`, `wield`
and `mount` are each bespoke controllers. So:

- **`plant <seed> in <pot>`** — requires soil in the pot and an empty slot;
  mints the plant from the seed's named template, occupies the slot, consumes
  the seed.
- **`repot <plant> into <pot>`** — requires soil and an empty slot in the
  destination and passes `fitsSlot`; vacates and re-occupies.

`water` is a third, but tool-afforded (below). Filling a pot with soil needs no
verb — it is `pour <bag> into <pot>` on the shipped bulk path.

Verb names verified free of collisions across every shipped `cmd/` tree.

### `water` is tool-afforded through the capability table

`water <plant>` is conferred by a watering can **in your inventory**, via
`ToolMixin.getInstanceContributions` over the closed `TOOL_CAPABILITIES`
vocabulary:

```
watering: { verbs: ['bulk/water.yaml'], placement: 'carried' }
```

`placement: 'carried'` is the whetstone's personal-capital rule as data — the
verb appears only while you hold a can. This is a deliberate extension of a
validated vocabulary, not drift, and it is the standing "instruments confer
working verbs" rule getting its first non-crafting consumer. `pour` continues
to work as the manual path.

### Flowering sets a seed — the loop closes with no money

At `mature` **and** sustained good condition the plant flowers, and one seed
appears in its pot, once per flowering episode. The player takes it with the
shipped `get`. So: keep it well → it flowers → you get a seed → pot it → two
plants. **Propagation requires no store, no currency and no new verb**, and
flowering stops being decoration.

### Acquisition — a starter in the dorm, the rest at the store

Every dorm room is seeded with a **small pot with soil, a plant already in it,
a watering can, and a tap** (`populates:` data, the same field the bed and desk
use). Nobody has to shop before meeting the growth model.

Everything else is at the shipped Terminus general store, as **content only**:
a small pot, a large pot, a sack of potting soil, and a snake-plant seed. The
store is fully data-driven (`stockLines` + `prices`), and `itemTemplatePath`
takes any path — so the pots and the seed are stocked straight from the `/obj/`
templates the build already creates, and only the sack is new. No code.

**The large pot is the first thing a player has a reason to buy**, and the
reason is legible before the purchase (*"it has outgrown its pot"*).

### Death — long fuse, terminal, not re-seeded

A neglected plant reaches `dead`, sets `lifecycleState: 'dead'` (already in the
species' declared states), stops reconciling, and changes its description. It
does not auto-destruct and does not respawn — the dorm spine restores captured
state rather than re-running `seedBornWith`, so a dead plant stays dead until
the player discards it. The fuse is **real days of total neglect**.

Farming's forgiveness contract governs the *slope*, not the *floor*:
degradation is gradual and recoverable at every band above `dead`.

### Two species ship, not one

The peace lily (*Spathiphyllum wallisii*) row **already exists** in the
`species-and-names` content pack — sessile plan, `diet: photosynthesis`,
material `plant-tissue`. It is not documentation-only, as the farming slate
currently claims.

A **snake plant** (*Dracaena trifasciata*) ships alongside: drought-tolerant
and low-light-tolerant, so it inverts *both* curves at once and "same engine,
different plant" is visible side by side. It is also the store's seed, which is
how a player gets a second species.

### Legibility — a condition band, and the cause read separately

> `thriving` · `healthy` · `stressed` · `failing` · `dead`

Appended to the long description by a `markupAugmenter`, band only, never a
number. The **cause** is a separate line naming the limiting factor in plain
language ("the soil is dry", "it is not getting enough light", "it has outgrown
its pot"), omitted when nothing is limiting.

Symptom banded, cause inferable — deliberately the shape phase 7's diagnosis
surface generalizes, and why the band vocabulary describes *state* rather than
cause.

### Growth — four stages

`seedling → young → established → mature`, advanced by accumulated *good* time
rather than wall-clock age, so a badly-kept plant stalls rather than growing
sickly. Each stage carries a **root demand**, which is what makes the pot
matter.

### The growth profile lives on the plant template, for now

The reaction-norm parameters (target moisture, drought tolerance, light
requirement, per-stage root demand, days-to-stage) are authored on the plant
template's `data`. They do *not* go on the `Species` row: adding fields to
`Species` is phase 5's assigned work and four docs want to add fields to it
independently. One owner, later. The migration is expected and gets recorded in
the subsystem doc.

### Light content must be authored — it does not ship

**No seed anywhere sets `ambientIntensity`.** `AmbientLitMixin` ships; zero
content uses it, so every room reads 0 lumens. The roadmap's phase-1 note that
"indoor ambient light is authored and ships" is wrong about the second half.

This build authors ambient light on the rooms the plant can reach and must
supply **at least one genuinely darker place** so the light axis is exercisable
rather than constant. A plant inside a closed container is the free lever
(`VisionModality.signalAt` takes any `Container` and does not climb to the
parent) — verify it, and if it climbs, room-to-room placement carries the axis
instead.

---

## Constraints

### `Wet.ts` is the skeleton — copy it, with one deliberate divergence

`lib/wetness/Wet.ts` is the closest shipped analogue: decomposed scalar
persistence (value + game-seconds clock stamp, no marshaller), a reentry guard
so a reconcile never recurses through a read, a **content-derived rate** rather
than a fudge factor, banded presentation via a `markupAugmenter`, `AppSetting`
dials with seeded literal fallbacks, sparse defaults.

> ### ⚠ The one divergence: **no far-past guard.**
>
> `Wet.ts` drops any interval longer than `MAX_REASONABLE_GAP_SEC` (4 real
> hours) because real absence must not dry you out. **A plant is not a body.**
> Owned things integrate the full gap — that is the entire point of the family
> clock, and inheriting the guard would silently negate it.
>
> Bound long absences with a **step/sample cap**, never a time cap. The guard
> is per-consumer, not global — `Metabolic.ts` uses 4 hours,
> `MechanicalMovement.ts` uses 90 days.
>
> The plant must also **not** inherit the `isHasInteractive() && isLinkdead()`
> freeze branch. It has no interactive; copying it in is the same bug in a
> different hat.

### The cadence — one login, one meaningful decision

`DEFAULT_SCALE` is 12×; the calendar is 360 days (12 × 30) with four 90-day
seasons. One game day is two real hours, so **a daily player skips 12 game
days.** Every threshold is calibrated against the login, not the game-day: the
moisture reserve buffers on the order of a real day, the death fuse runs about
a real week. Concrete numbers are dials, not constants.

### Persistence — the plant owns its own state

`Plant` composes `PersistableMixin` outermost and is its own persistence host,
keyed per instance. `PersistedRecord.place` — a Containable host's own durable
location, restored through `ContainmentApi.resolveLanding` — already exists for
exactly this and is the path `Avatar` rides.

Two verified facts shape the work:

1. **The growth mixin needs no `captureSlice`.** `PersistableLogic.captureState`
   captures declared `persistentFields` for any contributor without one; custom
   slices exist only for `Container` / `Slotted`, which encode cross-references
   by index.
2. **⚠ The spine assumes nested hosts are singletons, and this build lifts
   that.** A nested host is captured as `{ ref: templatePath }` with **no key**,
   and `cloneHost` dedups via `findByTemplatePath` — so two plants from one
   template would collapse into one on restore. `PersistableLogic`'s own
   comment states the invariant. The fix is `{ ref, key }` across four sites,
   keyless behaviour unchanged, and **records written before the change must
   restore unchanged** — there is live data. This is the same unlock phase 5
   needs for pets and livestock.

**Growing ⇒ cultivated ⇒ durable.** There is no "ambient plant" class:
decorative greenery is scenery, an ordinary `Thing` with a description.
`shouldPersist()` is the existing per-instance hatch for a throwaway clone.

**A cultivated plant left loose in a transient room is abandoned** — durable in
any persistable host, culled with the room if left on a public floor, exactly
as chattel.md already specifies for owned goods. One rule across all owned
things; no rescue registry, no boot walk.

**Capture is event-driven, not periodic, and not at shutdown.** Autosave is
Avatar-only; `AppBootstrap.shutdown()` persists the world clock and nothing
else. This is survivable because **reconcile-on-read derives state from a clock
stamp rather than accumulating it** — a rolled-back checkpoint re-derives the
elapsed time. What a rollback loses is the player's *interventions*, so a
mutating act must capture its host. This build adds
`PersistableApi.captureHostOf` — a new static on an existing facade, not a new
Api — which every later phase reuses.

### House rules that bite here

- `TOOL_CAPABILITIES` is a **closed, author-validated vocabulary**. Adding
  `watering` is sanctioned; a parallel table is not.
- **`NamedMixin` is proper names only.** The plant is a
  `Visible.shortDescription` ("a peace lily"), never `Named`.
- **Banding is presentation, never security.** Nothing gates on a band.
- **Every rate, threshold and curve constant is an `AppSetting` dial** with a
  seeded literal fallback, per `Wet.ts`. Numeric calibration is deferred to a
  running game.
- **`PersistableMixin` composes outermost.** Non-negotiable host rule.
- **Module scope declares; lifecycles initialize** (`pnpm lint:module-scope` is
  CI-gating).
- **No `.js` extensions in imports.** 80 columns, 2-space indent, trailing
  commas. **Never run `prettier --write`** — quote style is mixed by area.
- New exported helper functions are drift; a would-be helper folds into the
  mixin, the class, or a value-object.

### Not a `Creature`

The plant is a `Thing` composing `OrganismMixin`, which is already written for
this: its docstring says "Plant-Things … compose it on their own concrete
class", and `getSex()` returns `null` "for v1 plants". No `Creature`, no
anatomy beyond the shipped `sessile` body plan, no vitals, no `MetabolicMixin`.

---

## Acceptance criteria

**The object model**

1. Pot, soil, seed and plant are four separate objects. A pot with no soil
   refuses planting and says why; a pot with an occupied slot refuses a second
   plant.
2. `pour <bag of soil> into <pot>` fills the pot through the shipped bulk path,
   with no new verb.
3. `plant <seed> in <pot>` mints the plant named by the seed, occupies the
   slot, and consumes the seed.
4. `repot <plant> into <pot>` moves it; `fitsSlot` refuses a pot whose soil
   volume cannot carry the plant's current stage, with a legible message.

**Growth and care**

5. `look` shows species, size stage and condition band. The band is a word; no
   raw number is ever rendered.
6. When a factor is limiting, the description names it in plain language.
7. `water` is absent from the command surface until a watering can is in
   inventory, and present while it is. A can on the floor does not confer it.
8. `water <plant>` moves water out of the can and raises soil moisture; the can
   empties and refills from the tap.
9. Moving the plant somewhere darker degrades its light satisfaction
   observably.
10. **A plant in a pot too small stalls, says "it has outgrown its pot", and
    does not die** — it holds at a visible band indefinitely. Repotting into a
    larger pot resumes maturation.
11. A plant left unwatered degrades through every band in order and reaches
    `dead` on the calibrated fuse; a plant watered each login stays `healthy`
    or better.
12. A plant kept in good condition advances all four stages, flowers at
    maturity, and **sets exactly one seed per flowering episode**.
13. That seed plants a second plant, with no money involved.
14. The two shipped species behave measurably differently under identical
    treatment — the snake plant survives a watering gap that kills the peace
    lily, and tolerates a light level that stresses it.

**The clock**

15. A plant reconciles across a simulated multi-real-day gap — it does **not**
    inherit the far-past guard. This is the single most important test in the
    build.
16. The reconcile is bounded by a step cap, not a time cap: an absurd gap (a
    simulated year) completes in bounded work and produces a sane result.
17. Growth advances with no player present and no scheduler running — driven
    entirely by reads.

**Persistence**

18. A potted plant survives a dorm reap/restore cycle with its moisture, growth
    stage, condition, pot and `restingOn` surface intact.
19. **Carried out of the dorm, it stays yours.** Moved into the avatar's
    inventory and restored with the avatar, the plant returns with its own
    state, reached by `{ref, key}` — with no dorm code anywhere in the path.
20. **Two plants cloned from one template hold independent state** across a
    full capture/restore cycle, in two different hosts.
21. A dead plant is still dead after restore, and is not re-seeded.
22. A cultivated plant left loose in a transient room is culled with it and
    does not return — the abandonment rule is asserted, not merely documented.
23. `water` captures the plant's own record, so a watering survives a restore
    from a record written before it. Both halves of the rollback property are
    asserted: a watering *without* the capture is lost, and the elapsed time is
    not.
24. `PersistableApi.captureHostOf` captures a persistable target directly,
    walks to the nearest persistable ancestor otherwise with the correct
    `(scope, key)`, no-ops cleanly when there is none, and terminates on a
    containment cycle.
25. **A record written before the `{ref, key}` change restores unchanged**, and
    keyless nested hosts (`DormRoom`, `ConsignmentShelf`) show no behaviour
    change.

**Commerce**

26. Pot (two sizes), potting soil and a snake-plant seed are buyable at the
    Terminus general store through the shipped `buy` path, at prices consistent
    with the store's existing ladder, and the counter restocks them to par.

**Code shape**

27. `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm lint:gates` and
    `pnpm lint:module-scope` are all green.
28. No new `*Api` class. No new exported helper functions. No new
    `eslint-disable no-restricted-syntax`.
29. Every rate and threshold is an `AppSetting` key with a seeded literal
    fallback, seeded in the app-settings content.
30. The `watering` capability is added to `TOOL_CAPABILITIES` and its table,
    and nothing else in the crafting surface changes.
31. `Wet.ts`'s docstring claim that `Reserve` is Creature-coupled is corrected.

**Documentation**

32. `docs/subsystems/husbandry.md` exists and is the source of truth for the
    growth model: the reconcile contract, the profile schema, the band
    vocabularies, the clock rule and why the far-past guard is excluded, the
    pot/plant object shape and its relationship to farming's N-slot bed, the
    durability model, and the calibration dials.
33. `docs/subsystems/persistence.md` documents the `{ref, key}` entry and the
    keyed nested-host restore — a real spine capability, not a houseplant
    detail.
34. `CLAUDE.md`'s documentation map gains a one-line pointer to
    `husbandry.md`.
35. The farming slate's claim that the peace-lily row is documentation-only is
    corrected, and the roadmap's claim that indoor ambient light "ships" is
    corrected.
36. The subsystem doc names, for phase 5, that pets and livestock are the same
    keyed-nested-host shape; and for phase 6, that the condition value computed
    here is the intended resistance term — *good husbandry is immunity*.

---

## Cross-references

**Seeding slates**

- [farming-slate](../slates/builds/farming-slate.md) — §Houseplants, §The three
  axes, §The growth model, §The land model (the N-slot bed this generalizes to)
- [ranching-slate § The five shared
  conventions](../slates/builds/ranching-slate.md) — the conventions owner, and
  the far-past-guard correction
- [stewardship-slate](../slates/builds/stewardship-slate.md) — the residence
  ladder that grants the dorm rung a houseplant
- [pets-slate](../slates/builds/pets-slate.md) — the divergence this build
  deliberately omits (bond, attention, the un-delegable outcome)

**Sequence**

- [living-world-roadmap.md](../living-world-roadmap.md) — phase 1 of nine

**Subsystem docs the build touches**

- [persistence.md](../subsystems/persistence.md)
  · [residence.md](../subsystems/residence.md)
  · [spatial.md](../subsystems/spatial.md) · [slot.md](../subsystems/slot.md)
  · [bulk.md](../subsystems/bulk.md) · [light.md](../subsystems/light.md)
  · [race.md](../subsystems/race.md) · [crafting.md](../subsystems/crafting.md)
  · [retail.md](../subsystems/retail.md)
  · [command-routing.md](../subsystems/command-routing.md)
  · [command-spec.md](../subsystems/command-spec.md)
  · [time.md](../subsystems/time.md)
  · [metabolism.md](../subsystems/metabolism.md)
  · [content-packs.md](../subsystems/content-packs.md)

**Downstream phases whose enablers this build deliberately does not land**

- phase 2 (land use, the N-slot bed, soil quality) · phase 3 (the growth term)
  · phase 4 (sun→light, the weather resolve) · phase 5 (chattel on `Creature`,
  maturation, the condition score, `Species` schema) · phase 6
  (`ContagionSpec`) · phase 7 (diagnosis) · phase 8 (a production brain) ·
  phase 9 (the allowance meter)
