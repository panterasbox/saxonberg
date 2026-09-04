# Living-world roadmap — from a houseplant to the whole family

> **What this is.** A **dependency-ordered build sequence** for the family of
> systems designed across the 2026-07-30/31 sessions: things that **grow**, are
> **kept**, **sicken**, **spoil**, and are **worked**. Nine phases, each ending
> in something playable.
>
> **What it is not.** Not a slate (no design surface — that lives in the slates
> below), not requirements, not a plan. [roadmap.md](./roadmap.md) is the
> project-wide navigation aid organized *by area*; this is one family's work
> organized *by order*. Where they disagree, this doc is narrower and newer.
>
> **Status: phases 1–3 are SHIPPED. Phases 4–9 are a direction.** See
> *The honest part*.

**Member slates:** [farming](./slates/builds/farming-slate.md) ·
[ranching](./slates/builds/ranching-slate.md) ·
[pets](./slates/builds/pets-slate.md) ·
[preservation](./slates/builds/preservation-slate.md) ·
[disease](./slates/builds/disease-slate.md) ·
[health-vertical](./slates/builds/health-vertical-slate.md) ·
[stewardship](./slates/builds/stewardship-slate.md) ·
[livelihood § 9](./slates/builds/livelihood-slate.md) ·
[weather (tail)](./slates/tails/weather-slate.md).
**Conventions owner:** [ranching § The five shared
conventions](./slates/builds/ranching-slate.md).

---

## The spine

| # | Phase | What ships | The enabler it lands |
|---|---|---|---|
| **1** | **A thing that grows** | the houseplant in your dorm | *(none — dodges everything)* |
| **2** | **Ground you own** | a garden bed + a harvest | **land use** |
| **3** ✅ | **Food that doesn't keep** | spoilage · salt · curing | **the growth term** |
| **4** | **The field** | farming's staple loop | **sun→light** · **the weather resolve** |
| **5** | **Animals** | pets, then ranching | **chattel-on-`Creature`** · **maturation** · **the condition score** |
| **6** | **Sickness** | blight → herd disease | **`ContagionSpec`** · host range |
| **7** | **The clinic** | diagnosis + cure | **the diagnosis surface** |
| **8** | **The economy of it** | seasonal labor · the public floor | **piece-rate** · **a production brain** |
| **9** | **The ladder** | the residence progression | **the allowance meter** · region parcels |

**Each phase is one workflow cycle** — slate(s) → `/requirements` → plan → build
→ MR → `/finalize` sweep → merge. Each closes only *its own* open questions.

---

## Phase 1 — A thing that grows

**Ships:** a potted plant in the dorm room. You water it; it thrives or it
doesn't.

**Why first:** it proves the family's **biggest new primitive** — the plant
growth model — at the smallest possible scale, and it **dodges every
dependency**: no land use, no parcels, no weather, no economy, and *not* the
sun→light driver (indoor ambient light is *authored data*).

**Proves:** reconcile-on-read on a new owned host · the family clock (world
time, **no** far-past guard) · a `Material`-driven rate · banded legibility ·
the care→outcome model.

**Needs building:** the growth model itself · a `water` act over shipped bulk
transfer.

> ### ✅ SHIPPED 2026-07-31 — see [husbandry.md](./subsystems/husbandry.md)
>
> Two claims above were half wrong, and the build corrected both:
>
> - **"indoor ambient light … ships"** — the *mixin* shipped, but no
>   location class composed `AmbientLitMixin` and no seed set
>   `ambientIntensity`, so every room in the game read pitch-black. This
>   build composed it on `Location` (inert by default) and authored the
>   tree's first ambient values, across Duncan Hall.
> - **"the first `plantae` species row (the shelf is empty)"** — the peace
>   lily already shipped in the `species-and-names` pack. The build added a
>   snake plant beside it so the two curves could diverge.
>
> It also **lifted a stated limitation in the persistence spine**: a nested
> host was assumed to be a singleton, so two plants from one template would
> have collapsed into one on restore. Nested refs now carry a per-instance
> key — which is the same unlock **phase 5 needs for pets and livestock**.
> Three further spine bugs surfaced and were fixed: by-reference field
> capture, born-with `props` re-running on a restore clone, and
> `fitsSlot` vetoing its own restore. See husbandry.md § Durability.
>
> It additionally **opened the Catalog's agricultural branch** —
> `agriculture` + `horticulture`, with the husbandry verbs minting
> world-graded evidence into it. No conferrals: the knowing→doing seam for
> growing things is diagnosis, which is phase 7's.

**Verified clear:** the dorm room is a keyed persistable host, `Bed`/`Desk` are
`Surfaced` with **free placement**, and `ContainerMixin.captureSlice` records
*which surface* an item rests on — so a plant on the desk round-trips exactly
where you left it.

**Open questions to close:** almost none. That is the other reason to start
here.

---

## Phase 2 — Ground you own ✅ SHIPPED

> **Built as Hinkley Hills** (2026-07-31). The subsystem reference is
> [smallholding.md](./subsystems/smallholding.md); the growth-model half
> stayed in [husbandry.md](./subsystems/husbandry.md).
>
> **Two things this section got wrong, both worth recording:**
>
> 1. It expected the bed to be a *"second point on the density dial"* —
>    a second class. It is not: `CultivableMixin` is the pot's own
>    surface lifted whole, and **N is one authored number** (the plant
>    slot's `capacity`). The shipped pot seeds needed no change.
> 2. It planned to keep phase 1's *"moisture lives on the plant"*
>    decision. That was **reversed** on request, and the reversal
>    required a different design than a swap: the soil got a checkpoint
>    of its own (its own stamp, reconcile and reentry guard) so the
>    phase-1 objection — a checkpoint split across two objects — never
>    applies. Water competition and the absence of a read-order artifact
>    both fell out for free.
>
> Also shipped beyond this section's scope: nitrogen as a **fourth**
> limiting factor, `_worstLimiting` as the quality substrate (harvest
> grades on your worst moment, not your average), and the `title` verb —
> the player-facing act the property build had left unbuilt.

**Ships:** a garden bed in a yard, and a harvest.

**The step from 1:** the same engine plus two things — a **second point on the
density dial** (the slotted bed; `seeds/stuff/thing/Campfire.yaml`'s `staticSlots` is
the template) and a **harvest** that mints matter.

**Lands the enabler: land use.** A closed six-entry vocabulary on
`ParcelRecord`, read through `ParcelApi` on the existing longest-prefix walk.
**No new Api.** A garden is the smallest possible consumer, so the gate that
unblocks three verticals arrives cheap and on something that barely needs it.

**Land use itself needs nothing hard** — it requires neither the un-designed
allowance meter nor the deferred region parcel.

> ⚠ **But phase 2 has a persistence cost this doc missed** *(found during phase
> 1 planning, 2026-07-31)*. **Persistence is opt-in per host and only three
> classes opted in** — `Avatar`, `DormRoom`, `ConsignmentShelf`. Everything
> else is a transient runtime clone re-seeded from template.
>
> **Phase 1 pays for the *movable* half.** A cultivated plant becomes its own
> keyed persistence host carrying its own location, so it stays durable
> wherever it is carried — and lifting that required extending the spine's
> nested-host entry to `{ ref, key }`, because it had assumed one live instance
> per template. **Pets and livestock inherit that unlock directly** (phase 5 is
> the same shape: many instances of one template, each its own keyed host).
>
> **Phase 2 must pay for the *ground* half, and it is a different pattern.** A
> garden bed or a Warren-budded field-room is a **room**, not a movable — so it
> needs a keyed holder driving seed-vs-restore over `(scope, key)`, the
> `DormWarren.admit` pattern, not the plant's self-hosting one. Phase 4's
> field-rooms are unambiguously this. Budget for it here rather than
> discovering it in phase 4.
>
> Related: capture is **event-driven, not periodic and not at shutdown**
> (autosave is Avatar-only; `AppBootstrap.shutdown` persists only the world
> clock). Reconcile-on-read absorbs this well — a rolled-back checkpoint
> re-derives the elapsed time — but **player interventions must capture their
> host at the moment they happen.** Phase 1 adds
> `PersistableApi.captureHostOf` for exactly this, and the whole family reuses
> it.

---

## Phase 3 — Food that doesn't keep ✅ SHIPPED

> **Shipped 2026-09-04** by the food-safety build, on top of the spoilage
> gauge the cooking build landed. See
> [spoilage.md](./subsystems/spoilage.md).
>
> ⭐ **The enabler landed as specified: the growth term.** A toxin burden
> only decays; a pathogen *replicates*, and one positive term is the whole
> difference. `PathogenBehavior` sits beside `ToxinBehavior` on the same
> `Condition` row and carries the term — in the food (`ContaminableMixin`)
> and again in the host (`VitalsMixin`'s infection arm). **Phase 6 inherits
> it already working**, exactly as this phase promised.
>
> ⚠ **Two things this phase predicted that came out differently.** The
> *"third wear axis beside `Durable` and `Keen`, copying `Wet.ts`"* became
> **three** gauges, not one: the population that grows on its own
> (`FreshnessMixin`), the water it has to grow in (`CuredMixin`), and the
> population somebody *put* there (`ContaminableMixin`). And the headline
> is the distinction between the last two — *spoilage is a clock,
> contamination is an event* — which this phase's own framing ("spoilage is
> disease without transmission") did not anticipate.
>
> The `ThermalMixin` cost the phase flagged never materialized: `Provision`
> already composed it from the cooking build, and it is still the only
> discrete food class.

**Ships:** spoilage, salt as a Material, and one curing recipe.

**The step from 2:** a harvest that never spoils is inert. Preservation is what
makes the harvest **matter** — and it turns mining's salt from a rock into a
commodity that is also a bodily need and a historic tax lever.

**Lands the enabler: the growth term.** A toxin burden only decays; a pathogen
*replicates*. One positive term makes `ToxinBehavior` a strict subset of a
`PathogenBehavior` — and **phase 6 inherits it already working.** Spoilage is
**disease without transmission**, so it is the ideal first consumer.

**Also lands:** a **freshness gauge** — a third wear axis beside `Durable` and
`Keen`, copying `Wet.ts`'s reconcile skeleton.

**Watch:** wetness is universal on every `Thing`, but **`ThermalMixin` is opt-in
(~11 classes)** — composing it on perishables is the real cost of this phase.

**Falls out free:** the agricultural year (summer produces but doesn't keep;
winter keeps but doesn't produce), which also solves the fridge problem.

---

## Phase 4 — The field

**Ships:** farming's staple loop — soil reserves on the `Floor`, the Warren
budding field-rooms, the tend loop, weather-driven growth.

**Lands two enablers:**
- **sun→ambient light** — genuinely net-new; `setAmbientFlux` has zero non-test
  callers and nothing derives room light from the sun. Farming owns it.
  `Lamp.ts` is the pattern.
- **the time-parameterised weather resolve** — ~2 lines, because every internal
  weather function already takes a time and only the public entry reads the
  clock. Three consumers want it; settle it here.

**This is the economy faucet** the launch worklist has been waiting on.

---

## Phase 5 — Animals

**Ships:** **pets first** (smaller, more legible, and adoption is the on-ramp),
then **ranching** scaling to the aggregate herd.

**Why together:** they share four enablers. Build them once.

**Lands the enablers — including both currently-unowned ones:**
- **`ChattelMixin` on the `Creature` stack** — one composition line; gives pets,
  livestock *and* aquaculture per-instance ownership with chain-of-title.
- **the maturation driver** — `age`/`lifecycleState` are persistent fields with
  *no driver* (`setAge` has zero callers anywhere). Ranching forces it; pets
  inherits it.
- **the condition score** — three docs consume it today and none says where it
  is computed or stored. It gets its home here.
- **`Species` schema fields** — `domesticability`, `homeRange`, `hostRange`,
  `ageCurve`. Four docs add fields independently; one owner, here.
- **the accept/refuse hook** — load-bearing for the pet care acts, and shared
  with `give`→`offer`.

---

## Phase 6 — Sickness

**Ships:** blight, then herd disease.

**Inherits** the growth term (phase 3) and the animals (phase 5), so the slate's
proving order — **crops → herds → people** — works without reordering.

**Lands:** `ContagionSpec` (routes · infectivity · infectious window · **host
range** · reservoir) and the **push-tick spread** copying `FireLogic`'s one-hop
attenuated exit walk.

⚠ **Two idioms, not one.** Within-host load is reconcile-on-read; **room-to-room
spread must be a push tick and must NOT ride the presence gate** — propagation
has to happen where nobody is looking. Applying weather's "prefer pull" rule
here would build a propagation that cannot propagate.

**The keystone:** good husbandry *is* immunity — the resist factor reads live
off host state, so phase 5's condition score becomes the resistance term.

---

## Phase 7 — The clinic

**Ships:** diagnosis and cure — the health vertical.

**Lands the biggest single gap in the family: there is no diagnosis surface at
all.** `assess` reads, but nothing lets a player record, commit to, or be
evaluated on a hypothesis. `treat` filters to `kind === 'trauma'` and cannot see
an affliction. `resolution.by` is authored on every Condition and **has no
dispatcher** — dead prose, and therefore a free, well-shaped hook.

**Read positively:** treatment is near-greenfield, so it can be designed *as
clinical practice* rather than retrofitted around a healing-potion economy that
does not exist.

**This is where the education payoff lands** — and where **quarantine** finally
gets an owner (no doc owns it today, though two cite it).

---

## Phase 8 — The economy of it

**Ships:** seasonal labor, seasonal gig postings, the public-works floor.

**Needs phases 4–5 first** — a labor market needs producers to employ.

**Lands:** **piece-rate as an authorable term** (`settlePiecework` is built and
unconsumed) · seasonal postings (`WorldClockApi.cron` has a `month` field over a
calendar whose 12×30 months align exactly to the four 90-day seasons) · **the
public-works floor** · and ⚠ **a production brain** *(⭐ shipped early —
farming Stage A's `farms` brain tends, picks and consigns, so an NPC now
produces; the rest of this phase stands)* — before it, **no NPC produced
anything** and a hired hand drew wages and harvested nothing.

**The cheapest seam in the substrate lives here:** `EmploymentLogic.runTick`
already decomposes the date and **throws the month away**.

---

## Phase 9 — The ladder

**Ships:** the residence progression and the allowance cascade.

**Last because it has two hard blockers**, both outside this family:
- **the allowance meter** — `ParcelRecord.allowance` ships inert; property Phase
  1's entire budget/degradation design is un-designed. The cascade is *policy
  over a meter that must exist first.*
- **region parcels** — dense suburbia is the one thing today's parcel=zone model
  cannot express, and it is exactly what the ladder's middle rungs need.

**The frontier path is unblocked, though** — a smallholding is a single
`FolderZone` parcel, so *dorm → go west and farm* is reachable long before
*apartment → townhome → suburb*.

---

## The honest part

**Phases 1–3 are SHIPPED. Phases 4–9 are a direction.**

The early phases are well-specified, carry few open questions, and touch
substrate that has been verified directly against the code. The later ones carry
most of the ~40 open questions and all of the unowned gaps.

> ### Do not design phases 6–9 further until 1–3 are built.

The evidence is a measured rate, not a hunch. Across the design sessions,
**every substrate audit corrected something that had been confidently designed**
— chattel was `Thing`-tier not `Creature`-tier · `ConditionApi` is inflict-only
· the medic vertical is bandage-only · `SealedCellar` is not a cellar ·
`ThermalMixin` is not universal · climate lean is built, not deferred ·
forecasting already ships · wages are not solvency-checked · no NPC produces
anything · `Grade` should not erode · the weather resolve was two lines, not a
subsystem.

A **cross-document audit then found a dozen internal contradictions on top** —
including the far-past guard silently negating the family clock **inside the doc
that owns it.**

**Design that runs ahead of code contact decays, and it compounds.** Each built
phase is also the cheapest possible audit of the design behind it.

**The sequence will change.** Treat the ordering as load-bearing and the
contents of phases 5+ as provisional.

---

## The gaps are unscheduled, not orphaned

Every gap the audit flagged as *"two docs assume it, no doc owns it"* has a
natural home above:

| Gap | Owner |
|---|---|
| the condition score | **phase 5** |
| the maturation driver | **phase 5** |
| `Species` schema fields | **phase 5** |
| the accept/refuse hook | **phase 5** |
| the time-parameterised weather resolve | **phase 4** |
| quarantine as a power | **phase 6–7** |
| the diagnosis surface | **phase 7** |
| a production brain | **phase 8** — ⭐ shipped early (farming Stage A: `/trade/farming/behavior/farms`) |
| the allowance meter | **phase 9** |
| durable movable hosts (keyed nested `{ref, key}`) | **phase 1** — pets/livestock inherit it |
| durable owned *ground* (the keyed-holder pattern) | **phase 2**, used again in **phase 4** |

None needs a home invented for it. They were unscheduled, which reads like an
orphan until the sequence exists.

---

## What runs alongside

**Content authoring is genuinely parallel and needs no build cycle** — it is
pure data, and it unblocks builds without competing with them:

- the first `plantae` species rows (`seeds/lib/species/` holds only `wolf.yaml`)
- the **agricultural Disciplines** — ~~39 ship and **none are agricultural**~~
  **partly done (phase 1):** `agriculture` (the ISCED-F narrow-field spine
  node) and `horticulture` (the practised plant leaf) now ship, so the branch
  is open and the remaining rows have a parent. Farming's crop rows,
  ranching's animal husbandry and stewardship's land care are still to author
- preservation recipes · pet/livestock species rows

**Code builds stay sequential.** These verticals share five conventions, so two
concurrent builds would independently rediscover the same convention flaws — and
might diverge on them, which is exactly what the far-past-guard bug looks like
across documents rather than branches.

**Never interlace.** Alternating slices maximises context-switching, delays any
complete loop, and violates the standing *never half-grown — complete each
system* rule.

---

## Decide before phase 5 (cheaper to settle now)

**The dorm-companion collision.**
[stewardship](./slates/builds/stewardship-slate.md)'s ladder grants the dorm **a
houseplant but not a companion**; [pets](./slates/builds/pets-slate.md) still
lists *"does the dorm admit a companion?"* as open and flags it as blocking the
Wave 1 on-ramp **for every new player**. Two docs, opposite states, neither
aware of the other.

Either the dorm rung changes, or pets' acquisition path waits for the apartment
— which stewardship's own build order pushes further out still. **Nothing blocks
phase 1 either way**, but this decides phase 5's shape.
