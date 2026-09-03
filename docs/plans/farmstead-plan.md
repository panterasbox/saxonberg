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
| reserve keys `moisture`, `nitrogen` (theme `cultivation`) | `Cultivable.ts:71,73` | W9 adds two more |
| `ChattelMixin` composed in **exactly one place** | `lib/stuff/Thing.ts:50` | W7 is one line + fallout |
| `Creature extends Agent` | `lib/creature/Creature.ts:165` | nothing alive is ownable today |
| `setAge` has **zero non-test callers**; `ageCurve` is a reserved comment | `lib/species/Organism.ts`, `platform/idea/species/Species.ts:102` | maturation is greenfield |
| `reproductiveMode` authored on 6 rows, **no reader** | `Species.ts:168` | W8's attachment point |
| `integratePrecipitation` | `platform/idea/api/WeatherLogic.ts:430` | the ∫weather dependency is **closed** |
| `CelestialApi` has declination, hour angle, `nextSunrise`/`nextSunset`; **no `dayLength`** | `api/celestial.ts` | photoperiod is arithmetic on two shipped calls (W6) |
| `fruitSetCount`, `_flowering`, `onFloweringLatched` | `lib/husbandry/Growing.ts:120,275,767` | the pollination hook (W13) |
| `PitPony` proves draught needs **no new mechanism** — capacity is body mass | `trade-mining/src/agent/PitPony.ts` | W11 is a row + a brain |
| `BrandedMixin` is Thing-only (`NeonSign`, `GradedReceptacle`), MQL-visible via `subscribableFields` | `lib/corpo/Branded.ts` | W7 moves it with chattel |
| `WorldClockApi.DEFAULT_SCALE = 12` | `api/worldclock.ts:108` | 1 game day = **2 real hours** |
| `lint:locations` keeps **enumerated** `MINTED_ROWS` / `FURNISHED` rosters | `scripts/check-location-classes.ts:203,214` | a new field class is a **deliberate roster diff** |
| land use `agricultural` → cultivation `field`, band 1 000–4 000 000 m² — **and nothing consumes the `field` ceiling** | `lib/parcel/LandUse.ts:116` | W3 is its first consumer |
| `trade-fuel` ships the coppice + `ash` (thing **and** material) | `packages/content/trade-fuel/` | D63's firewood supply; D68's potash needs no new row |
| `tannin.yaml` ships (textiles) | `trade-dyeing/…/material/tannin.yaml` | hide → leather has its reagent |
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

### P2 — the field is `Field extends PersistentCartesianLocation`

`platform/location/Field.ts`. It plots (`coords:` is membership — every location
plots), it persists (soil state is per-instance), and it composes
`SoilMixin` + `ReservedMixin`. It is **not** a `FurnishableRoom` — that class is
the furnishing archetypes' base.

It goes on `lint:locations`' `MINTED_ROWS` roster, which is a deliberate,
reviewer-visible diff answering *"is this a KIND of place?"* — yes.

### P3 — ⚠ ground character is a KERNEL field, and needs the user's nod

`lib/husbandry/GroundCharacter.ts` — the third seeded field after weather and
`Deposit`, following the shipped pattern exactly: hash/mix/roll derived from the
covering Locality's address prefix, **storing nothing**.

**Kernel, not a pack**, because `GardenBed` is a kernel class and a kernel class
cannot import a pack — the same argument that forces `SoilMixin` into the kernel.
⚠ This is the one placement where the mining precedent points the other way
(`Deposit` lives in `trade-mining`), so it deserves an explicit call rather than
an assumption. **Per D6 it re-implements the ~30 lines rather than importing
weather's.**

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

### P7 — ⚠ what condition reads

D24 says condition is *derived, never stored*, but derivation needs a substrate.
Two options:

- **(a) a rolling energy-balance buffer** on the animal, the way metabolism
  already keeps a digestion buffer — cheap, bounded, and the precedent exists;
- **(b) reconstruct from reserve trajectory** — no new state, but requires
  keeping a trajectory, which is state by another name.

**Recommendation (a)**, explicitly bounded (a fixed-length ring, not a log), and
the same step/sample cap the constraints require for long absences. ⚠ Sign-off.

### P8 — ⚠ band vocabularies are CONTENT, and need a home

D86 and AC 50 make ~10 band vocabularies a first-class deliverable, and nothing
in the repo has a home for "a percept-shaped phrase per band". Candidates:
`AppSettings` keys (wrong — these are prose, not dials), a new `DocumentKinds`
member (a real but heavyweight option), or **authored rows in the platform pack
beside the topic descriptors**.

**Recommendation: authored content rows**, one per banded quantity, harvested the
way help topics are. ⚠ Sign-off, because it is the one genuinely new *authoring*
surface in the build.

### P9 — the pack cut, restated as file moves

- **Kernel** — `SoilMixin`, `GroundCharacter`, `Field`, the maturation driver on
  `Organism`, the `ChattelMixin` + `BrandedMixin` moves, `HandlingMixin`,
  `CelestialApi.dayLength`.
- **`trade-ranching`** (new pack) — the **herd registry branch and its title claim** (P4), `draft`/`shear`/`milk`/
  `muck`, the farmstead venue archetype, the hand's brain, the ranching
  disciplines.
- **The commons** (`species-and-names`) — the five species rows. *A sheep exists
  whether or not anybody ranches.*
- **`trade-farming`** — barley, clover, turnips, saffron, `plough`, reclamation
  verbs.
- **`eternal-university`** — ⚠ **P10**, the campus farm.

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

P3, D2, D4, D5, D55. The seeded field; `analyze ground`'s second channel; the
ribbon test as an act; the per-viewer survey record. **Green:** deterministic
across a cold boot with nothing stored; two characters who have sampled
differently see different surveys of one piece of ground (AC 2, 4).

### W3 — `Field`, and `plot`

P2, D3. The Warren satellite, the gate, the land draw against the parcel's
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

### W7 — Livestock core

D19–D24, D27, D29, D98. `ChattelMixin` and `BrandedMixin` onto the Creature
stack; the maturation driver; `HandlingMixin`; the herdbook as a registry
document (P4) **with its read-side prefix check**; draft and
return with seeded materialisation; condition derived (P6, P7). **Green:** head
*n* drafted twice is the same animal; returning folds condition into the mean;
condition bands by eye and yields a precise score only through a handling act
(AC 9, 10).

### W8 — Taps, breeding, slaughter

D25, D26, D28, D93. Production-slice taps with three distinct neglect failures;
photoperiod breeding with parentage-seeded heritability; butchering into the
cooking and textiles chains. **Green:** wool reaches the textiles chain and
meat/tallow the cooking chain from a real animal, and `wool.yaml` carries a
`biologicalSource` (AC 11, 12).

### W9 — The nitrogen ledger closes

D14–D18, D65, D66, D68. N × 6.25 joining soil nitrogen to dietary protein; four
reserves; manure, legumes, leaching; poaching; lime and marl; the scale rule.
**Green:** no path credits nitrogen from nowhere; a bed's composition can be set
by what is put in it and a field's texture cannot (AC 6, 32, 33).

### W10 — The roster, the crops, and the pack cut

D30–D33, D43, D44, D67, P9. Five species as commons rows; `trade-ranching`;
barley, clover, turnips, saffron; the farmstead archetype. **Green:** the
four-course sustains yield with **no fallow year**, verifiable from the ledger;
malt has a crop behind it (AC 13, 34, 35).

### W11 — The university farm, teaching, and the on-ramp

D102–D105, P10. The campus farm as authored content; help topics for **concepts**
as well as verbs; the labourer rung. **Green:** ⭐ the campus farm needs **zero
pack code** (AC 62 — D33's test), and a new character with no land and no money
can do real husbandry acts for pay in their first session (AC 63).

---

## Tier 2 — the working farm

### W12 — Draught, dogs, and the working animals

D40–D42, D50. `plough` costing draught power; the dog's four jobs (herd, guard,
deter, and bond-gated competence). **Green:** an ox works ground a person cannot
at the same rate; a poorly handled dog works badly (AC 15).

### W13 — Hazard and failure

D45–D53, D95–D101. **Start with D48 (hay fire)** — it reads the moisture reserve,
the fermentation heat model and `FireApi`, all shipped, and is the cheapest
high-value item in the build. Then the damps and the rescue trap, ragwort,
handling injury, predators, and the adversarial surface. **Green:** a manure pit
kills an unprotected rescuer; hay above a moisture threshold self-heats; a fox
kills more than it takes (AC 24, 25, 26).

### W14 — Bees ⭐ CUTTABLE

D34–D39. The colony as the herdbook without draft; pollination modifying
`fruitSetCount`; forage range by graph hops; swarming. **Cut this wave whole if
the build is running long** — it is severable by construction.

### W15 — Drives, docs, finalize runway

A live wire drive of the whole loop against a real database (per the standing
rule that a drive finds what the suite cannot). Subsystem docs: **`soil.md`** and
**`ranching.md`** new; `husbandry.md`, `smallholding.md`, `time.md` updated; the
field-substrate slate's register gains *soil quality — shipped*. The three slate
`[DECIDED]` corrections. One full `pnpm test`.

---

## Acceptance-criteria coverage

AC 1–35 and 48–65 map to W1–W15 as marked above. **AC 36–40 and 43–47 are tier 3
and do not gate this MR.** Two carry unusual weight:

- **AC 50** (band vocabularies distinguishable in prose) — P8, and it is authoring
  work spread across every wave rather than a task in one.
- **AC 62** (the campus farm needs zero pack code) — W11, and **failing it is a
  design finding to report, not a problem to code around.**

## Risks & opens

1. ⚠ **P7 (what condition reads), P8 (where bands are authored) and P3 (kernel
   placement) want sign-off before W2.** *(P4 is settled — see its entry.)*
2. ⚠ **P4's read-side prefix check is load-bearing and easy to skip.** A herd
   read that trusts the `kind` tag reopens the forgery the path titling closes.
   It belongs in W7's tests, not in a later hardening pass.
3. **W1 is a refactor of 871 lines of shipped, tested code** on a branch that
   will absorb two merges. Do it first, prove it with unchanged tests, and never
   mix feature work into it.
4. **Wave count is high (16).** If the build runs long, the cut order is: W14
   (bees), then saffron and turnips out of W10, then W12 — **never** W11, because
   a build nobody can start is not shippable.
5. **The band vocabularies are the most likely thing to be skimped**, and
   skimping them fails silently — two bands that read alike collapse the whole
   honest-opacity model.
6. **Tier 3's three forward obligations** (D79 record legibility, D82 quality
   levers, D74 not foreclosing profits à prendre) must be honoured in W7 and W9
   or tier 3 becomes a rewrite.
