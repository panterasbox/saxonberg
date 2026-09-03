# Farmstead — implementation plan

**Input:** [farmstead-requirements.md](../requirements/farmstead-requirements.md)
— 106 decisions, 65 acceptance criteria, staging decided. **This plan covers
tiers 1 and 2 only**; tier 3 (D70–D74, D79–D83) is a follow-on build.

Read alongside: [husbandry.md](../subsystems/husbandry.md) ·
[smallholding.md](../subsystems/smallholding.md) ·
[persistence.md](../subsystems/persistence.md) ·
[residency.md](../subsystems/residency.md) · [location.md](../subsystems/location.md)
· [zone.md](../subsystems/zone.md) · [parcel.md](../subsystems/parcel.md) ·
[chattel.md](../subsystems/chattel.md) · [race.md](../subsystems/race.md) ·
[vitals.md](../subsystems/vitals.md) · [metabolism.md](../subsystems/metabolism.md)
· [reserve.md](../subsystems/reserve.md) · [time.md](../subsystems/time.md) ·
[weather.md](../subsystems/weather.md) · [content-packs.md](../subsystems/content-packs.md)
· [card-surface.md](../subsystems/card-surface.md).

**Build discipline.** One MR spanning both tiers. `pnpm test:near` + every
touched pack's own vitest + the full lint family **per wave**; **one** full
`pnpm test` before the MR opens and one at `/finalize`. No migrations — content
edits and drop the DB. Stage by name, never `git add -A`. Push every turn.

⚠ **Three cross-cutting rules from the requirements govern every wave and are
not a wave of their own:**

- **D89** — no shipped period is an unqualified "daily". Game days or real days,
  in code, content and prose. *(The requirements doc itself breached this twice;
  expect to.)*
- **D84–D87** — nothing renders a hidden quantity on `look`; farm state never
  enters a room description; the read is the **delta**, on a card.
- **D45** — slopes for absence, cliffs for presence, and weather is neither.
- ⭐⭐ **Documents you author versus records about you.** The store holds both,
  and they take **different ownership models**. A document you author lives on
  **your** branch (`/home/<self>`, your parcel) and `canAtPath` is exactly right.
  A **record about you** lives on an **institution's** branch, because its value
  depends on its subject not being able to edit it. **The test:** *if being able
  to rewrite it would be an exploit, it is not yours to hold.* See P4 — it binds
  the herdbook, and it will bind credentials, transcripts and title.

---

## Grounding — verified at plan time

| Fact | Where | Consequence |
|---|---|---|
| `CultivableMixin` is **871 lines**, host `Stuff & Container & Bulkable & Slotted & Populates & Reserved` | `lib/husbandry/Cultivable.ts` | a Location cannot compose it (W1) |
| soil state to lift: `soilClockStamp`, `_soilMeanMoisture`, `reconcileSoil()`, its reentry guard, **and** the sky-edge half (`restampWatershed`, its tri-state resolved flag, the walk) | same file, ~lines 133–560 | W1's exact surface |
| composers today: **`PlantPot`, `GardenBed` only** | `platform/thing/` | two recompositions, no others |
| reserve keys `moisture`, `nitrogen` (theme `cultivation`) | `Cultivable.ts:71,73` | W10 adds two more |
| `ChattelMixin` composed in **exactly one place** | `lib/stuff/Thing.ts:50` | W8 is one line + fallout |
| `Creature extends Agent` | `lib/creature/Creature.ts:165` | nothing alive is ownable today |
| `setAge` has **zero non-test callers**; `ageCurve` is a reserved comment | `lib/species/Organism.ts`, `platform/idea/species/Species.ts:102` | maturation is greenfield |
| `reproductiveMode` authored on 6 rows, **no reader** | `Species.ts:168` | W9's attachment point |
| `integratePrecipitation` | `platform/idea/api/WeatherLogic.ts:430` | the ∫weather dependency is **closed** |
| `CelestialApi` has declination, hour angle, `nextSunrise`/`nextSunset`; **no `dayLength`** | `api/celestial.ts` | photoperiod is arithmetic on two shipped calls (W6) |
| `fruitSetCount`, `_flowering`, `onFloweringLatched` | `lib/husbandry/Growing.ts:120,275,767` | the pollination hook (W14) |
| `PitPony` proves draught needs **no new mechanism** — capacity is body mass | `trade-mining/src/agent/PitPony.ts` | W12 is a row + a brain |
| `BrandedMixin` is Thing-only (`NeonSign`, `GradedReceptacle`), MQL-visible via `subscribableFields` | `lib/corpo/Branded.ts` | W8 moves it with chattel |
| `WorldClockApi.DEFAULT_SCALE = 12` | `api/worldclock.ts:108` | 1 game day = **2 real hours** |
| `lint:locations` keeps **enumerated** `MINTED_ROWS` / `FURNISHED` rosters | `scripts/check-location-classes.ts:203,214` | a new field class is a **deliberate roster diff** |
| land use `agricultural` → cultivation `field`, band 1 000–4 000 000 m² — **and nothing consumes the `field` ceiling** | `lib/parcel/LandUse.ts:116` | W3 is its first consumer |
| `trade-fuel` ships the coppice + `ash` (thing **and** material) | `packages/content/trade-fuel/` | D63's firewood supply; D68's potash needs no new row |
| `tannin.yaml` ships (textiles) | `trade-dyeing/…/material/tannin.yaml` | hide → leather has its reagent |
| `archetype` is a shipped **document kind**; rows are pure YAML under `content/archetypes/`; `ArchetypeCatalogue` warms them read-only | `DocumentKinds.ts:64`, `platform/idea/ArchetypeCatalogue.ts`, `trade-mining/content/archetypes/mining.yaml` | **AC 62 is satisfied by construction** (P12) |
| ⚠ **`cordwood.yaml` says "hazel" and carries `_materialPath: …/wood/oak`**, and **oak is the only wood material** | `trade-fuel/…/thing/cordwood.yaml` | a one-line fix to take in passing (W0) |

---

## Plan-level decisions

### P1 — `SoilMixin` is lifted whole; `CultivableMixin` becomes its consumer

`lib/husbandry/Soil.ts`, exporting `SoilMixin`. It carries both checkpoints —
the soil reconcile **and** the sky edge — because they were built self-contained
precisely so they could travel. Host constraint drops to `Stuff & Reserved`.

`CultivableMixin` then composes `SoilMixin` rather than containing it, so
`PlantPot`/`GardenBed` change **by one factory call and nothing else**. The wave
is a pure refactor: **every existing husbandry and smallholding test must pass
unchanged, with no test edits.** That is the wave's acceptance test.

### P2 — `Field` is a PACK location class, in `trade-farming`

**Corrected 2026-09-03.** An earlier draft put it in `platform/location/` without
checking whether location classes live in packs. **They do:** `trade-mining`
ships `MineRoom` (a location class), `MineWarren`, `AuthoredWorking` and
`Deposit` — an entire land-use vertical inside a pack, working.

`packages/content/trade-farming/src/location/Field.ts`, extending
`PersistentCartesianLocation` and composing the **kernel** `SoilMixin` (P1) plus
`ReservedMixin`. It plots (`coords:` is the membership operation — every location
plots) and it persists, because soil state is per-instance.

It is **not** a `FurnishableRoom` — that class is the furnishing archetypes'
base. It goes on `lint:locations`' minted-`CartesianLocation` roster, which the
lint family reaches because it walks every pack's `src/` as well as the kernel;
that entry is a deliberate, reviewer-visible diff answering *"is this a KIND of
place?"* — yes.

### P3 — `GroundCharacter` is the PACK's, beside `Field`

**Decided 2026-09-03**, reversing an earlier recommendation whose premise did not
hold.

The earlier argument was *"kernel, because `GardenBed` is a kernel class and
cannot import a pack."* That requires a **bed to have ground character**, and by
**D65 it does not** — a bed's soil is *imported*, which is the entire scale rule
and the reason a bed's texture is free while a field's is fixed. A pot certainly
has none. **So no kernel class needs character; its only consumer is the field.**

⭐ **The two halves of soil have different consumer sets, and that is the whole
decision:**

| | Consumers | Home |
|---|---|---|
| **derived** — moisture, nitrogen, the checkpoint, the sky edge | `GardenBed`, `PlantPot` **and** `Field` | **kernel** (P1, unchanged — the argument was sound *for this half*) |
| **seeded** — texture, drainage, aspect, depth, native pH | **only `Field`** | **`trade-farming`** |

So: `packages/content/trade-farming/src/idea/GroundCharacter.ts`. It follows the
shipped seeded-field pattern exactly — hash/mix/roll derived from the covering
Locality's address prefix, **storing nothing** — and per **D6 it re-implements
those ~30 lines rather than importing weather's.** `Deposit` is now a **sibling**
rather than a counter-example.

⚠ **Not `/system/soil`, yet.** The axis test passes — soil is true whether or not
anyone farms it, exactly like `/system/water` — but the field-substrate slate's
own rule governs: **"two instances is where a pattern is NAMED, not factored,"**
which is why it resisted a `FieldApi` at two consumers. Two sibling trades in one
build is not enough to mint a system pack.

⭐ **And deferring costs nothing here specifically:** a move is a path rename, and
the standing rule is *no migrations ever — a rename is a DB drop*. Promote to
`/system/soil` when a **third, non-farming** consumer appears.

**Consequence, stated plainly: `trade-ranching` depends on `trade-farming`.**
That is honest rather than awkward — *pasture is a field*, so the ranching pack
building on the farming pack is the dependency the design already asserts, and
pack-to-pack dependency is the metal chain's shipped shape
(mining → fuel → smelting).

### P4 — the herdbook is a DOCUMENT on the trade's branch, not the holder's

**Decided 2026-09-03**, reversing an earlier recommendation twice over.

**The kind:** a new `DocumentKinds` entry — `herd`, **path-keyed**
(`naturalKey: null`), `contentDir: 'herds'`, `onVanish: 'keep'`. The precedent
is `water-right`, and it matches feature for feature: *a record — dated,
transferable, and meaningless if it can be quietly lost.* Adding a kind is a
**platform act** needing a code consumer and a go-live hook; that gate is
working, not friction.

**The path:** `/trade/ranching/herds/<…>`, on a branch **titled to the ranching
trade's group** — the shape the four-namespace table already blesses
(*`/trade/<industry>` … held by the trade's own group*) and the shape water
rights already use (`/system/water/rights/…`, titled to the `water` group, owned
by an office). ⚠ **This is the security requirement, not a filing convenience.**

> **A record about you lives on a branch titled to somebody else. You file; you
> do not hold the pen.**

⚠⚠ **Two earlier candidates are refused, and for the same reason:**

- **`/home/<self>`** — the shipped base case gives an owner their whole home
  branch with no broader grant, so the subject could rewrite their own pedigree.
  D79 makes the herdbook a **sales document**; this is the lemons fraud with the
  engine supplying the pen.
- **The owning parcel** — same hole, one step out: a landholder can write
  documents on their own parcel.

**This bug class was closed once already in this repo** and must not be
reopened: land use lives in the gated `parcels` collection rather than on the
zone template because *"a content author could rezone their own land — the
precise forgery the retired `data.ownerGroupName` stamps were removed to close."*

*(`holder_snapshots` via `PersistableMixin` was the earlier recommendation. It is
sound but points at a collection when the standing direction is documents, and it
does not answer the custody question at all.)*

⭐ **It is also historically exact.** Real herdbooks are kept by **breed
societies**, not by the animals' owners — Coates's Herd Book, 1822, worked
because it was independent of the men selling the bulls. The record is
trustworthy *because* its subject cannot edit it, which is the same sentence as
the security requirement. Three things fall out free:

- custody of the **record** is separate from ownership of the **herd** — you own
  the cattle, the society keeps the book;
- **transfer is a registry act, not a file edit**, which is where D79's sale and
  the warranty slate attach;
- **filing is a gated act**, so *who may register a herd* becomes a live question
  the polity can answer.

⚠ **Read-side verification is mandatory**, not optional hardening. The store is
shared and the kind tag is forgeable — `document-store.md` is explicit that
*"`kind: 'release'` is a tag anyone who can write a document can apply, so every
read re-verifies what the transport guarantees."* **Every herd read must verify
the document actually sits under the registry prefix**, or somebody writes
`kind: 'herd'` on their own home branch and it counts.

⚠ **Two sources, deliberately.** The document holds **composition, ownership and
claimed home**; **containment holds position**. Their disagreement *is* D95's
straying — derivable on read, needing no new event, and the reason a herd has a
jurisdictional anchor at all. Without one, nothing bounds where livestock can be.

### P5 — the sward is a third `Reserve` on the field

Key `forage`, theme `cultivation`, beside `moisture` and `nitrogen`. Grown by the
soil reconcile (weather × soil × season), drawn down by occupants and by cutting.
**Residual and recovery (D9) is a floor on the reserve below which the regrowth
*rate* is penalised until it rebuilds** — not a second stock.

### P6 — the partitioning cascade is a method on the animal

Per the OO conventions the census keeps at zero: `animal.partition(dt)`, not
`RanchApi.partition(animal, dt)`. Order is fixed and authored nowhere:
maintenance → thermoregulation → growth → production → reproduction.

**Condition (D24) derives from the cascade's running balance**, which means the
animal needs a small energy-balance history — ⚠ **P7**.

### P7 — body condition is a RESERVE (`flesh`), not a derived buffer

**Decided 2026-09-03.** Both options I first offered were wrong, because I had
the physics wrong: **body condition score measures fat cover, which is a stock,
not a summary of history.** It is a reserve in exactly the sense the engine
already means, and the substrate is not merely available — it is already
biological:

> `BIOLOGICAL_RESERVE_KEYS = ['endurance', 'satiation', 'hydration']`, each a
> `Quantity<'%'>`, `theme: 'biological'`, with a `floorEffect`. **Every living
> body installs them in the `Creature` constructor.** Metabolism drives them;
> flooring one spawns the named `Condition` and clears it on recovery.

**So: a fourth key, `flesh`, `floorEffect: 'emaciation'`.**

**D24's "derived, never stored" resolves — the tension was mine.** The **reserve
is stored; the band is derived**, which is the relationship soil moisture already
has and is the honest-opacity model exactly: one real number underneath, three
fidelities of reading over it (by eye → **palpation** → a scale, D24's ladder).

**P6's cascade gets its bottom line.** Intake is spent in priority order; the
surplus **deposits** and a shortfall **withdraws**. That is why production dies
before condition does — production is priority 4 and the store is what is left
over.

⭐ **And it lands three things for free:**

- **Starvation stops being a special case** — the shipped `floorEffect`
  machinery spawns the condition on D45's slope.
- **D29 becomes true rather than asserted** — player, pet and livestock share one
  physiological model, and the family clock already decides whose clock freezes.
- **Chronic under-nutrition degrades acute body state with no wiring**, because
  `VitalsMixin.getConditionBand` already *"adds load for each biological reserve
  at/below its floor."*

⚠ **The name collides, and the shipped one keeps the word.**
`VitalsMixin.getConditionBand` already means something different — how degraded a
body is **right now** from floored reserves. Body condition is **weeks of
nutrition**. Two real concepts, one word, so the reserve key is `flesh` and
*"body condition"* stays the player-facing term. It is not a coinage: **"in good
flesh"** is stockman's language for precisely this, and it sits beside
`satiation` / `hydration` / `endurance` without reading like a stat.

> **`satiation` is hours; `flesh` is months.** Satiation is the flow; flesh is
> the stock the flow deposits into.

⚠ **Blast radius: this is a substrate edit, not a ranching one** — it touches
every living body, vitals, metabolism and the floor effects. It gets **its own
wave (W7)** with its own tests, and must not ride inside the livestock wave.

### P8 — bands follow the SHIPPED split; there is no new authoring surface

**Decided 2026-09-03.** I flagged this as "the one genuinely new authoring
surface in the build" and offered three homes. All three were wrong: the pattern
already ships, in `lib/husbandry/Growing.ts` and `lib/craft/Grade.ts`.

**Three parts, and they live in three different places on purpose:**

| Part | Where | Why |
|---|---|---|
| **the vocabulary** | a typed `const` array in code (`GRADE_BANDS`) | closed, ordinal, part of the type surface |
| **the phrases** | an **exhaustive** `Record<Band, string>` in code (`CONDITION_PHRASE`, `STAGE_PHRASE`, `CAUSE_PHRASE`) | interface contract, like any verb's output |
| **the thresholds** | `AppSettings` dials (`husbandry.band.thrivingAt`) | *where* a band starts is a balance dial, and balance is content |

> **The number where a band begins is content. The word is code.**

⭐ **The exhaustive `Record` is a compile-time completeness guarantee.** You
cannot add a band without writing its phrase, so **AC 50's coverage half is
enforced by the compiler** — no lint needed, and no separate authoring pass to
forget.

⭐⭐ **And D86's percept rule is already implemented.** `CAUSE_PHRASE` is *"the
plain-language cause line per limiting factor"* — `water: 'The soil is dry.'` —
and husbandry.md's own heading is *"Legibility — size, condition, and the cause
read separately."* So the shipped shape is:

> **a state band says what it looks like; a cause line says why; they read
> separately.**

**Every band this build adds copies that shape**, which is what stops a band
being a number in words. Adopt it verbatim rather than inventing a percept
convention.

⚠ **What is NOT automated, and stays a review obligation.** The compiler
guarantees every band *has* a phrase. It cannot guarantee adjacent bands are
**distinguishable**, which is the half of AC 50 that actually matters — two bands
that read alike collapse the honest-opacity model silently. The reviewer's test,
stated so it is checkable:

> **Can a reader who does not know the underlying number tell this band from the
> one on either side of it?**

That is a human read at MR time, on ~10 vocabularies, and it is the item most
likely to be skimped (risk 5).

**Pack-local bands** ship their phrases in the pack's own source, the same way
the trade packs already carry their own vocabulary. **Species-specific reads**
(does a sheep in poor flesh read differently from a cow?) are a **seam, not
scope** — one phrase set per quantity in this build, with the `Record` keyed so a
per-species override could layer later without changing callers.

### P9 — the pack cut, restated as file moves

Revised by P2/P3: **the field and its character are the farming pack's**, and
only genuinely shared substrate stays in the kernel.

- **Kernel** — `SoilMixin` (P1: beds and pots compose it), the **`flesh`**
  reserve and the maturation driver on `Organism`, the `ChattelMixin` +
  `BrandedMixin` moves onto the `Creature` stack, `HandlingMixin`,
  `CelestialApi.dayLength`, and the `herd` entry in `DocumentKinds` *(a kind is a
  platform act by construction)*.
  ⭐ Every one of these has **composers with no common pack ancestor** — which is
  the actual test, and the reason `Field` and `GroundCharacter` fail it.
- **`trade-farming`** — ⭐ **`Field`** (P2), **`GroundCharacter`** (P3), the
  sward, the land-use derivation, reclamation and `plough`, barley, clover,
  turnips, saffron, and the **`farm` archetype row** (P12).
- **`trade-ranching`** (new pack, **depends on `trade-farming`**) — the herd
  registry branch and its title claim (P4), `draft`/`shear`/`milk`/`muck`, the
  **`byre` archetype row** (P12), the hand's brain, the ranching disciplines.
- **The commons** (`species-and-names`) — the five species rows. *A sheep exists
  whether or not anybody ranches.*
- **`eternal-university`** — ⚠ **P10**, the campus farm.

⚠ **The dependency is new and load-bearing:** `trade-ranching` → `trade-farming`,
because *pasture is a field*. That is the metal chain's shipped shape
(mining → fuel → smelting) and it must be declared in the pack manifest, not
assumed.

### P10 — ⚠ the university farm ships as content in `eternal-university`

D33's acceptance test (AC 62) is that it needs **zero pack code**. So it must be
authored rows in an existing pack, and the university pack is its home. ⚠ If it
turns out to need `src/`, **stop and report** — that is the archetype failing its
test, and it is a design finding, not a licence to add code.

### P11 — `analyze ground` gains a second reading, no new verb

The stanza ships and `trade-mining` owns `AnalyzeGroundController`. Farmland is a
second channel on it (the instrumentation split), and **the ribbon test is a
separate physical act** with a tool prerequisite — a procedure is a verb, a
reading is a channel.

### P12 — the archetypes: TWO rows, no code, and one deliberate empty slot

An earlier draft named "the farmstead venue archetype" three times without
saying what one is. It is a **shipped document kind**, and that fact is what
satisfies AC 62.

**The machinery, verified:** `archetype` is a `DocumentKinds` entry
(`naturalKey: 'archetypeId'`, `contentDir: 'archetypes'`,
`onVanish: 'delete'`); rows live at
`packages/content/<pack>/content/archetypes/<id>.yaml`; `ArchetypeCatalogue`
(a singleton `Idea` at `/platform/idea/ArchetypeCatalogue`) warms a transient
cache from `documents {kind: 'archetype'}` and resolves by id, **read-only and
ungated** — *an archetype is public knowledge, the floor an industry states*.

> ⭐⭐ **An archetype is a YAML row and nothing else.** So AC 62 — *the campus
> farm needs zero pack code* — is satisfied **by construction**, not by
> discipline. If W12 finds itself writing `src/`, the archetype is the wrong
> shape, and that is the finding to report (P10).

**Three rules taken verbatim from `mining.yaml`, which is the exemplar:**

1. **Needs are stated in capabilities the kernel already checks, never in
   furniture** — `{ lightLux: 20 }`, `{ presence: pony }`,
   `{ bulkSource: timber }`, `{ tool: assay-scale }`.
2. ⭐⭐ **Reported, never enforced.** A farm missing a slot is a *legal, visible
   state*, and **nothing multiplies off a satisfaction.** This is the no-gauge
   rule at venue scale, and it is the single easiest thing here to get wrong.
3. **A default names the trade's own row only where the trade genuinely owns
   it.** Whose barn and whose ox is a fact about the *place*, so those bind at
   the locality.

**Two archetypes, not one.** The requirements say "a farmstead archetype"
(D33); the pack cut says otherwise, and the pack cut is right — mining, brewing,
distilling and winemaking each ship their own, and **a holding that only grows
crops must not fail a byre slot**:

| | Pack | Slots |
|---|---|---|
| **`farm`** | `trade-farming` | ground (the `field` cultivation ceiling) · **water** · storage · traction · a way to market |
| **`byre`** | `trade-ranching` | shelter (D12's winter) · enclosure · **water** · feed store · somewhere the muck goes (D68) |

A mixed farmstead satisfies both, which is the honest reading of a mixed farm —
and it gives the university farm **two** bindings to prove rather than one.

⭐ **`water` is the divergence slot, and it ships with NO DEFAULT** — the
`light`-in-a-mine move, and the reason it is the right choice: every farm needs
water and **no two places answer the same way.** A stream, a well, a cistern,
a pond, roof catchment, or a piped supply off the shipped `Conduit` ladder. The
archetype names none of them.

**Traction takes a modest default** (`trade-farming`'s plough) because the trade
genuinely owns the implement — while the *animal* pulling it binds at the
locality, exactly as haulage does for the mine.

---

## Tier 1 — the spine

### W0 — Re-ground (mandatory checkpoint)

Textiles (!236) and cooking (!231) will have merged. **Re-verify every row of the
Grounding table before writing code**, merge `origin/master`, and take the
fallout. Log any grounding fact that has moved. Fix the `cordwood.yaml`
hazel/oak mismatch in passing. **No feature work in W0.**

### W1 — The soil split (pure refactor)

P1. Lift `SoilMixin`; `CultivableMixin` composes it; `PlantPot`/`GardenBed`
unchanged in behaviour. **Green:** the whole existing husbandry + smallholding
suite passes with **no test edits**. That is the only acceptance this wave has,
and it is a strong one.

### W2 — Ground character + the survey ladder

P3 (**in `trade-farming`, not the kernel**), D2, D4, D5, D55. The seeded field; `analyze ground`'s second channel; the
ribbon test as an act; the per-viewer survey record. **Green:** deterministic
across a cold boot with nothing stored; two characters who have sampled
differently see different surveys of one piece of ground (AC 2, 4).

### W3 — `Field`, and `plot`

P2 (**a pack location class, following `MineRoom`**), D3. The Warren satellite, the gate, the land draw against the parcel's
declared area, the first consumer of `LandUse`'s `field` ceiling. **Green:** plot
a field on agricultural ground you hold, walk to it through its gate (AC 1).

### W4 — Reclamation: clear, treat, improve, revert

D54–D61. The improvement axis (P2's class gains it), clearing, the stone→wall
closure, reversion when unmaintained, and **forage as the reclamation income**
(D61 — consuming `discovery-slate`'s model, not redesigning it). **Green:** newly
plotted ground is **not plantable**; two plots of different character demand
measurably different work; leaving a field alone takes it back (AC 21, 22, 28).

### W5 — The sward and the derived land uses

P5, D7–D9. Standing biomass, growth, grazing draw by occupants, cutting hay,
residual and recovery. **No `use` field anywhere.** **Green:** graze below
residual and recovery measurably slows; hay cut and carried leaves the field
poorer than grazing it did (AC 5).

### W6 — Winter and photoperiod

D10–D13, D63, D94. `CelestialApi.dayLength`; growth answering to temperature and
daylength at a place; the stockpile → hay → bought-feed sequence; firewood demand
met from `trade-fuel`'s shipped coppice. **Green:** sward growth reaches zero in
winter, hens stop laying, and **a plant in a warm lit room keeps growing**
(AC 7).

### W7 — The `flesh` reserve (substrate — its own wave for a reason)

P7. A **fourth biological reserve**, and the blast radius is every living body in
the game, so it does not ride inside the livestock wave.

`BIOLOGICAL_RESERVE_KEYS` gains `flesh`; `floorEffect: 'emaciation'`; the
metabolism reconcile gains a **deposit/withdraw leg** so surplus intake banks and
a shortfall draws down. Nothing ranching-specific — a starving player character
loses flesh on the same model, which is what makes D29's *one mortality rule for
every kept animal* true rather than asserted.

**Green:** every existing vitals and metabolism test passes; a body fed above
maintenance gains flesh and one fed below it loses flesh over game-weeks;
flooring it spawns `emaciation` and recovery clears it; ⭐ a floored `flesh`
shows up in the **existing** `VitalsMixin.getConditionBand` load with no new
wiring, because that read already sums floored biological reserves.

### W8 — Livestock core

D19–D24, D27, D29, D98. `ChattelMixin` and `BrandedMixin` onto the Creature
stack; the maturation driver; `HandlingMixin`; the herdbook as a registry
document (P4) **with its read-side prefix check**; draft and
return with seeded materialisation; condition derived (P6, P7). **Green:** head
*n* drafted twice is the same animal; returning folds condition into the mean;
condition bands by eye and yields a precise score only through a handling act
(AC 9, 10).

### W9 — Taps, breeding, slaughter

D25, D26, D28, D93. Production-slice taps with three distinct neglect failures;
photoperiod breeding with parentage-seeded heritability; butchering into the
cooking and textiles chains. **Green:** wool reaches the textiles chain and
meat/tallow the cooking chain from a real animal, and `wool.yaml` carries a
`biologicalSource` (AC 11, 12).

### W10 — The nitrogen ledger closes

D14–D18, D65, D66, D68. N × 6.25 joining soil nitrogen to dietary protein; four
reserves; manure, legumes, leaching; poaching; lime and marl; the scale rule.
**Green:** no path credits nitrogen from nowhere; a bed's composition can be set
by what is put in it and a field's texture cannot (AC 6, 32, 33).

### W11 — The roster, the crops, and the pack cut

D30–D33, D43, D44, D67, P9. Five species as commons rows; `trade-ranching`;
barley, clover, turnips, saffron; the farmstead archetype. **Green:** the
four-course sustains yield with **no fallow year**, verifiable from the ledger;
malt has a crop behind it (AC 13, 34, 35).

### W12 — The university farm, teaching, and the on-ramp

D102–D105, P10, P12. The campus farm as authored content **binding both
archetypes** (`farm` and `byre`) at small scale; help topics for **concepts**
as well as verbs; the labourer rung. **Green:** ⭐ the campus farm needs **zero
pack code** (AC 62 — D33's test), and a new character with no land and no money
can do real husbandry acts for pay in their first session (AC 63).

---

## Tier 2 — the working farm

### W13 — Draught, dogs, and the working animals

D40–D42, D50. `plough` costing draught power; the dog's four jobs (herd, guard,
deter, and bond-gated competence). **Green:** an ox works ground a person cannot
at the same rate; a poorly handled dog works badly (AC 15).

### W14 — Hazard and failure

D45–D53, D95–D101. **Start with D48 (hay fire)** — it reads the moisture reserve,
the fermentation heat model and `FireApi`, all shipped, and is the cheapest
high-value item in the build. Then the damps and the rescue trap, ragwort,
handling injury, predators, and the adversarial surface. **Green:** a manure pit
kills an unprotected rescuer; hay above a moisture threshold self-heats; a fox
kills more than it takes (AC 24, 25, 26).

### W15 — Bees ⭐ CUTTABLE

D34–D39. The colony as the herdbook without draft; pollination modifying
`fruitSetCount`; forage range by graph hops; swarming. **Cut this wave whole if
the build is running long** — it is severable by construction.

### W16 — Drives, docs, finalize runway

A live wire drive of the whole loop against a real database (per the standing
rule that a drive finds what the suite cannot). Subsystem docs: **`soil.md`** and
**`ranching.md`** new; `husbandry.md`, `smallholding.md`, `time.md` updated; the
field-substrate slate's register gains *soil quality — shipped*. The three slate
`[DECIDED]` corrections. One full `pnpm test`.

---

## Acceptance-criteria coverage

AC 1–35 and 48–65 map to W1–W16 as marked above. **AC 36–40 and 43–47 are tier 3
and do not gate this MR.** Two carry unusual weight:

- **AC 50** (band vocabularies distinguishable in prose) — P8, and it is authoring
  work spread across every wave rather than a task in one.
- **AC 62** (the campus farm needs zero pack code) — W12, and **failing it is a
  design finding to report, not a problem to code around.**

## Risks & opens

1. ✅ **Every plan-level decision is settled** (P1–P12). P2 and P3 were
   corrected after the fact — a location class and a seeded field both belong to
   the farming pack, following `trade-mining`'s shipped vertical.
2. ⚠ **`trade-ranching` depends on `trade-farming`** (P9). Declare it in the
   manifest; a missing pack dependency fails at install, not at build.
3. ⚠ **P4's read-side prefix check is load-bearing and easy to skip.** A herd
   read that trusts the `kind` tag reopens the forgery the path titling closes.
   It belongs in W8's tests, not in a later hardening pass.
4. **W1 is a refactor of 871 lines of shipped, tested code** on a branch that
   will absorb two merges. Do it first, prove it with unchanged tests, and never
   mix feature work into it.
5. **Wave count is high (17).** If the build runs long, the cut order is: W15
   (bees), then saffron and turnips out of W11, then W13 — **never** W12, because
   a build nobody can start is not shippable.
6. ⚠ **The archetype is *reported, never enforced* (P12)** — the easiest thing
   in this build to get wrong, because a satisfaction score is the obvious next
   step and it is forbidden. **Nothing multiplies off a slot.**
7. **The band vocabularies are the most likely thing to be skimped**, and
   skimping them fails silently — two bands that read alike collapse the whole
   honest-opacity model.
8. **Tier 3's three forward obligations** (D79 record legibility, D82 quality
   levers, D74 not foreclosing profits à prendre) must be honoured in W8 and W10
   or tier 3 becomes a rewrite.
