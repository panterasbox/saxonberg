# Recovery â implementation plan

Executes [recovery-requirements.md](../requirements/recovery-requirements.md)
(seeded by [recovery-slate.md](../slates/builds/recovery-slate.md)).
**Kind:** feature. **Lead end:** kernel-led â the first consumer is the
shipped injury system (MR !260) and the Terminus infirmary. Content tails
in `trade-medicine` (instruments, prosthetics, the nurse's brain) and
`terminus` (the infirmary upgrade).

The one-line build: turn *"a body that heals on read at a flat rate"* into
*"care buys recovery rate; every wound is treatable; recovery runs offline;
the clinic practises; wounds fester without hygiene; magic mends by
spending the caster; the bill fits the harm; a body keeps its scars, its
re-breaks and its lost limbs."*

â­ **The keystone (D1âD3):** one per-body **convalescence factor** `k`, read
by every trauma's new `mend` law. A bed, a carer and a spell are three
payers of that one number. Everything in Stage A hangs off it; L1 is a
fourth consumer of it and needs **no new effect kind**.

---

## Sequencing â read this before branching

> ✅ **GATE RESOLVED 2026-09-23.** build-3 (nutrition-fitness) **MERGED** to
> master (`81caf517f`); this branch is caught up (merge `049608a20`). The
> overlap below is now **in the base** — branch `build/recovery` off current
> master and it already carries build-3's Vitals/Metabolic changes and
> `Exerting.ts` (verified present). **No rebase dance.** ⚠ The line numbers in
> this plan predate the merge and shifted — `coupledRecovery` 994→1154,
> `reconcileConditions` 1848→1865, the `expireDying` call 2172→2189,
> `ownFunction` 977→993, `POSTURE_BASE` 240→244, `applyAntidote` 1448→1608,
> `severPart` 1404→**1421**, `afflict` 2416→2433 — re-confirm from source
> (§ Critical files). The mortality fix `e9ebffd41` (dying window anchors at
> `beginDying`) does **not** affect D3/D19: death is still derive-on-read and
> the dying arm still keeps its linkdead-exemption.

â â  **build-3 (`design/nutrition-fitness`, 142 files, +6851) edits the same
kernel surface.** Verified against `origin/design/nutrition-fitness` this
cycle. The requirements say this build begins **after that one merges**,
and the plan holds to it: **branch `build/recovery` off `master` only once
`nutrition-fitness` is on it.** Do not start from this design branch's
base.

What build-3 touches that we touch, by file (their hunk â ours):

| file | build-3's change | this build's change | overlap |
|---|---|---|---|
| `lib/vitals/Vitals.ts` | one 12-line hunk at ~766 (`floorEffect !== null` guard in the band feed) | `reconcileConditions` (1848â2200), `ownFunction` (977), new fields + methods | same file, disjoint hunks â a clean rebase, but **re-run `Vitals.bandFeed.test.ts`** after |
| `lib/metabolism/Metabolic.ts` | +172 (lean/wind/protein/vitamin-c/tolerance; `integrateSlice` callers) | **one line**: `POSTURE_BASE` becomes a re-reference to the hoisted table (D2) | trivial |
| `lib/reserve.ts` | +5 biological reserves | none (the mend spell spends `endurance`, which exists) | none |
| `lib/creature/Creature.ts` | +213 (build phrase, mirror) | compose `HygieneMixin` into the chain | same file; ours is one line in the mixin stack |
| `platform/idea/cmd/perception/AssessController.ts` | +23 | scar / prosthesis / sepsis lines in the wound block (232â262) | same file, likely the same region â **hand-merge** |
| `lib/exertion/Exerting.ts` | **new file** | L3's re-injury hook calls into it (D15) | L3 cannot be built before the merge |
| `platform/idea/SchedulerRegistry.ts` | `effortW` at completion | none | none |

**Stance:** W-A0 is the merge check. Stage B (L3 specifically) is
now **buildable** — `Exerting.ts` is on master (build-3 merged 2026-09-23).

---

## Grounding

Facts verified this cycle by opening the files (paths are under
`packages/server/src/mud/` unless stated; content under `packages/content/`).

### The wound engine

- `platform/idea/Condition.ts` (1300 lines). `Trauma` @154 carries
  `type Â· site Â· severity Â· bleeding? Â· dressed? Â· mechanism? Â· inflictedBy?
  Â· magicOrigin? Â· agentActive? Â· maimAllowed? Â· tickedAt?`. `TraumaType`
  @103 is the closed nine. `TraumaBehavior` @660: `onset / tick(host, t,
  elapsedSec) / resolve / reopen / describe` + optional `signature` and
  `resolution`. `TRAUMA_BEHAVIOR` @1109.
- **Every heal is a flat constant inside `tick`.** `LACERATION_BEHAVIOR.tick`
  @733: an open undressed bleed drains `bloodVolume` and *holds* severity;
  otherwise decays by `DRESSED_HEAL_PER_SEC` (0.02) or
  `LACERATION_HEAL_PER_SEC` (0.003). `decayingBehavior(rate)` @780 is the
  shared no-bleed decay (contusion 0.02, fracture 0.0015, burn 0.006,
  frostbite 0.004). `CAUSTIC_BEHAVIOR.tick` @1060 *grows* while
  `agentActive`, then decays at burn's rate. No multiplier anywhere.
- **`resolve` is a no-op for fracture, burn, frostbite and rupture**
  (`decayingBehavior` sets `resolve: noop`; `RUPTURE_BEHAVIOR.resolve: noop`
  @1000 with the comment *"you cannot put pressure on a liver"*). Only the
  bleed family and caustic have a live `resolve`. `resolution` tokens:
  laceration/puncture/avulsion `dressing`, contusion + fracture `rest`,
  burn `fluid`, rupture `surgery`, frostbite `warmth`, caustic `rinsing`.
- `HARM_DEFAULTS` @220: `MAX_REASONABLE_GAP_SEC` 4h, `CLOT_SEVERITY` 0.5,
  `FRACTURE_IMPAIR_SEVERITY` 0.5, `SEVER_SEVERITY` 4.0, `CLEARED_SEVERITY`
  0.01, `FUNCTION_LOSS_PER_SEVERITY` per type. Rates are a const-object,
  not `AppSettings` dials (no `harm.*` key exists in
  `lib/config/AppSettings.ts` â verified by grep).
- `Condition` (Kind A) @1150: `name Â· signature Â· progression Â· resolution
  Â· observableSigns Â· contagion Â· toxinBehavior Â· pathogenBehavior Â·
  mentalBands`, all in `fieldMeta`. `ResolutionSpec { by, atStage? }`
  @1120. Authored `resolution.by` tokens on rows today (grep of
  `platform/content/platform/idea/Condition/**`): `rest`, `warmth`
  (hypothermia, torpor), `cooling` (hyperthermia), `air`, `fresh-air`,
  `antitoxin` (botulinum, ptomaine), `fluid` (hypovolemic-shock), `food`,
  `water`.

### The read path

- `lib/vitals/Vitals.ts` (2454 lines). `reconcileConditions` @1848. Order:
  burden law + circulation derive above the clock guard; anatomy death
  floor; the all-empty guard; `linkdead` @1979; then **one loop per kind**
  â traumas @1991 (first-touch stamp, linkdead re-stamp, `elapsed <= 0`,
  far-past drop, `carried = severity` â `tick` â `applyEffects(signature,
  carried, elapsed)`), shocks @2037, sustained @2098, afflictions @2128,
  the clear-at-`CLEARED_SEVERITY` sweep @2142, dying @2145 (**no linkdead
  re-stamp, no far-past drop**, with the comment that copying the
  linkdead block *is* the bug), then the blood and heart death floors.
- â â  **`lint:condition-arms` counts every `forâ¦of` over a bound condition
  subset that references a game-time cursor as an ARM, and the census may
  never rise** (`packages/server/scripts/check-condition-arms.ts`). A
  "mend pass" as a second trauma loop would fail the gate. The offline
  carve must live **inside the existing trauma loop**, on a second stamp.
- `fieldMeta` @600: `conditions` and `bodyPartDeltas` are `{persistent,
  runtimeState}` â a new key on a `Trauma` record persists for free.
- `ownFunction(key)` @977: `missing â 0`, else `1 â Î£ severity Ã loss`.
  `conduitFunction` @1000. `capacityScalar` @1107 (governs = min, serves =
  mean). `isSlotDisabledByAnatomy` @1451. `severPart` @1404 is the one
  writer of `BodyPartDelta.missing` (`BodyPartDelta` @160 = `{missing?}`
  only). `beginDying` @690, `isDying` @713, `stabilize` @725.
- `afflict` @2416 (veto layer + inflicter stamp), `relieve` @2446.
- `progressAffliction` @1635 dispatches on `progression.law` (`stage Â·
  decay Â· logistic Â· burden`), then `applyEffects(row.signature, â¦)`, then
  self-clears a `by: rest` row at `atStage`. `progressInfection` @1763:
  constants via `MaterialApi.pathogenBehaviorOf(key)` (â
  `Contamination.behaviorOf`), growth `inHostPerHour` vs
  `INFECTION_CLEARANCE_PER_HOUR Ã infectionResistance(band)`, closed-form
  logistic, incubation gate on `record.symptomsAt`, stage 1â3 from load.
- **The one shipped infection producer** is `Metabolic.ingest` @1340:
  `afflict({ kind:'affliction', templatePath, stage:0, elapsed:0,
  pathogenLoad, symptomsAt: nowS + incubationSec })`. The sepsis seed
  mirrors this shape exactly.
- `Metabolic.reconcileMetabolism` @579 has the same guards **plus a
  `@hook integratesLongAbsence()`** @675 (true iff chattel-stamped â a
  kept animal's clock runs while its owner is away). That is the
  shipped precedent for "this body integrates its absence".
- `Metabolic.coupledRecovery` @994 reads `POSTURE_BASE` @240 (lie 1.0 /
  sit 0.6 / kneel 0.5 / stand 0.2 / mounted 0.3) Ã `currentRestQuality()`
  @1524 (`Posed.getRestingOnPath()` short-circuit â `getOccupiedHost()` â
  `Postured.getRestQuality()`), **endurance only**. `restorePlasma` @917
  caps at `PLASMA_RESTORE_CEILING_FRAC` 0.85 â **untouched by this build**.
- `applyAntidote(toxinType)` @1448 crashes a burden by
  `ANTIDOTE_CRASH_FRACTION` 0.9. Only tests call it.
- `lib/slot/Postured.ts` @78: `fieldMeta { restQuality, warmth }`, both
  authorable; `restQuality` default 1.0, setter-validated `> 0`.
- `lib/character/Posed.ts`: `restingOnPath` persisted @118. Whether a
  restored body **re-occupies** its rest surface on materialize is not
  verified â W-A2 must prove it (the offline rate depends on it).

### The medical surface â and a finding

- Views `packages/content/platform/content/platform/cmd/medical/{treat,
  rinse,undress}.yaml`; controllers `platform/idea/cmd/medical/`.
  `treat.yaml` args: `target` (`[VisibleMixin, VitalsMixin]`), `with`
  (`requires: any`, deliberately), `for` (string).
- `TreatController` (659 lines): `Treatment` union @154 (`dressing Â· fluid
  Â· medicine Â· <token>`), `resolutionOf` @170, `mismatchLine` @183 with
  the word table `dressing Â· fluid Â· medicine Â· rest Â· warmth Â· cooling Â·
  air Â· rinsing`; refuses rupture with *"It wants surgery."* by falling
  through the table. `pickTreatable` @520 filters by `resolutionOf(t) ===
  by`. `outcomeFor(band, quality)` @128. Mechanical effect @400: dressing
  â `TRAUMA_BEHAVIOR[type].resolve`, fluid â `pourInto` (drunk). Deed
  credit @441/467. `tendInfection` @590 knocks `pathogenLoad` by band.
- â â  **FINDING â nothing affords `treat` / `bind` / `dress` / `undress`.**
  A grep of every `commandContributions` in `packages/server/src` and
  every pack `src/` names `medical/rinse.yaml` exactly once
  (`platform/thing/WaterFixture.ts:56`) and **never** `treat.yaml` or
  `undress.yaml`. `VitalsMixin` contributes no verbs. The injury wire
  test (`packages/wire/tests/injury.wire.test.ts:178, 432`) only ever ran
  `help treat` â the catalogue, not the affordance. `command-routing.md Â§
  There is ONE record of verb affordances` is explicit: a verb no class
  contributes is unreachable. **W-A0 proves this on the wire and fixes it
  (D6).** The body-layer precedent is `Metabolic.ts:477` â
  `self: ["platform/cmd/bulk/eat.yaml", â¦]`.
- `OrderController` `treatment` @245 â `treatWorst` @309: resolves only a
  `dressing`-token wound (or knocks a `pathogenLoad`). Duplicates the
  treat primitive by hand.
- `platform/thing/Tariff.ts`: `SERVICE_KINDS = ['repair','treatment',
  'burial']` @69; `PricedOfferMixin.priceFor(key)` (`lib/commerce/
  PricedOffer.ts:66`) takes **no customer**; `collect(key, reason)` @108
  reads it. The infirmary row prices `treatment: 12, repair: 8`.
- `lib/vitals/Dressing.ts`: `dressingQuality` 0..1, default 1; header
  names splint/suture as *"named-but-deferred seams â no sibling mixins
  here"*. `platform/thing/Bandage.ts` = `DressingMixin(Thing)`.
- `lib/craft/Serviceable.ts`: `soiled` (one-way `soil()`, gated
  `setSoiled`, `wash()` back) â **vessels/implements only**. No cleanliness
  state on any body.
- `wash.yaml` (crafting) requires `CraftedMixin`; `WashController`
  branches on `isServiceable / isContaminable / isDyed`. `lint:verb-
  collisions` (`KNOWN_COLLISIONS` @87) already carries `dress` (treat vs
  butcher); **`set Â· splint Â· operate Â· surgery Â· warm Â· cool Â· dose Â· tend
  Â· scrub Â· fit` are claimed by no view** (grep of every `verbs:` line).

### Content

- `terminus/content/world/terminus/infirmary/`: `ward.yaml` (props:
  tariff, cot, dressing-cabinet; cast: physician), `thing/cot.yaml`
  (`/platform/thing/Chair`, slot `surface` postures `[lying, sitting]`,
  **`restQuality: 0.7`**), `thing/tariff.yaml`, `thing/dressing-cabinet.
  yaml` (a `/platform/thing/Chest`, empty â the bandages are prose),
  `agent/physician.yaml` (Aldis Verrow, `Cast`, `competence medicine
  proficient`, `behaviors: [{brain: /lib/behavior/shifts}]`),
  `business.yaml` (position `physician`, wageRate 6, hours 7â19).
  `generic-objects/.../fixture/bed.yaml` `restQuality: 2.0`, slot
  `'lie:1'` postures `[lie, sit]`.
- `terminus/package.json` does **not** depend on `trade-medicine`;
  `trade-medicine/pack.yaml` root `/trade/medicine`, ships two
  controllers (`analyze patient/postmortem`) and no `thing/`, no
  `behavior/`. Pack brain precedent: `trade-tailoring/.../tailor.yaml:39`
  `brain: /trade/tailoring/behavior/tailors`; pack tool precedent:
  `trade-smithing/src/thing/Whetstone.ts` (`ToolItem` +
  `commandContributions.environment` + `capabilities: ['whetstone']`),
  its view `content/trade/smithing/cmd/crafting/sharpen.yaml` with the
  instrument arg `default: "me:i:[capability.whetstone]"`.
- Hazards that wound a player deterministically (the drive's sources):
  `generic-objects/.../traps/spike-pit.yaml` (point, torso+feet, `drop` â
  `pit-below` + blunt on landing at `hazard.dropFallEnergy`),
  `step-dart.yaml` (point + **venom 4** â the poison source),
  `lime-seep.yaml` (corrosion, in `pit-below`), `pressure-blade.yaml`
  (edge). **No shipped hazard delivers `blunt` to a torso** â nothing can
  produce a rupture without a wizard (D18).
- Species/body plan: `species-and-names/.../BodyPlan/biped.yaml`. Slots
  @37â56: `legs` / `feet` / `hands` / `head` / `torso` are **`covers`
  slots with no `bodyPart`**; only `finger:*`, `hand:*` (Wieldable) and
  `cranial` bind a `bodyPart`. Parts: hands `serves: [manipulation]`,
  legs `serves: [locomotion]`, feet serve nothing. All limbs `severable`.
- `lib/slot/Slotted.ts` `canOccupy` @328: Part 0 = anatomy + trauma gate
  (`isSlotDisabledByAnatomy || isSlotImpairedByCondition`); `occupy`
  @367 / `vacate` @428 fire `onSlotOccupied / onSlotReleased` on the
  candidate. `lib/slot/Wearable.ts` `slotClaims` @258 (per body-plan),
  `fitsSlot` @488 (candidate-side hook: claim includes slot).

### Magic

- `lib/magic/Effect.ts`: the invariant @4 (*an Effect exists iff a gated
  Api already does that work*); `EFFECT_KINDS` @267; `self` @77;
  `validate` @410. `afflict` â `Vitals.afflict`; `adjust-reserve` executor
  in `MagicLogic.executeOne` @1218 lands a negative delta on `landsOn ??
  ctx.actor` for any reserve the target `hasReserve` (positive charge/mana
  refused). `execAfflict` @1545 mints `{kind:'affliction', templatePath,
  stage, elapsed:0, magicOrigin: tag}`.
- `resolveCastImpl` @700 spends **mana** (`cost Ã fade`) at completion;
  overchannel â `overchannel-strain`. `Spell` rows: `spellId Â· name Â· verb
  Â· noun Â· cost Â· castingProfile Â· targeting (none|self|object|creature|
  any) Â· effects Â· description`; the shipped rows live in
  `arcane-library/content/stuff/idea/magic/Spell/*.yaml` (18), warmed by
  class. `Grid.ts` has noun `body` @50; `arcana/.../Discipline/magic-body.
  yaml` reads *"flesh, wounds, healing"*.
- `Condition/magic/overchannel-strain.yaml` and `mortality/recovering.yaml`
  are the row shapes for a self-clearing condition (`law: decay` /
  `law: stage + atStage`).

### Activity, behavior, chronicle, wire

- `api/scheduler.ts`: `Engagement { engagementId, type, actor, startedAt,
  slots, interruptibleBy, cancelable, onStart, onAbort, getHost? }`;
  `SchedulerApi.start / cancel / complete`. `EngagementSlot = body | hands
  | attention | voice`. `lib/attendant/AttendanceEngagement.ts` is the
  exemplar of a sustained lease on **the server's `attention` slot**, with
  `onAbort` as the single teardown.
- `lib/behavior/brain.ts`: `BrainStatics { label, claims?, requiresFree?,
  presenceGated?, ambient?, act(ctx) }`; `BrainContext { host, config,
  state, trigger, say/emote }`. `shifts.ts` is the on-shift poller
  (`host.shiftState()`, `presenceGated = false`, `ambient = false`).
- `lib/character/Persona.ts:268` `recordDeed(fields)` (`ChronicleEntryFields
  { text | template+vars, when, where, who, tags, key }`).
- `packages/wire/tests/injury.wire.test.ts` is the drive shape;
  `world-scan.dirty.wire.test.ts:238` proves `Session.open(handle)` twice
  is a log-out/log-back-in for a guest (location persisted).
- `Employed.getEmployments()` â `Employment { organizationPath,
  positionKey, status, onShiftSince }`; `Organization.getPosition(key)`
  â `Position.wageRate`.

---

## Plan-level decisions

**D1 â The seam is a per-body convalescence factor read by a new `mend`
law, not a severity-reducing method.** `TraumaBehavior` gains
`mend(host, t, elapsedSec, k): void` â the HEALING half of today's
`tick`, multiplied by `k`. `tick` keeps only what HARMS (the bleed drain,
the burn weep via signature, caustic growth). `Vitals.convalescenceFactor()`
computes `k` once per reconcile. A bed, a carer and a spell are three
payers of one number; `assess` can say *"mending well / mending slowly"*
from the same read. (Qa, option i â the `restQuality` parallel.)

**D2 â `k` and where its inputs live.**
`k = POSTURE_REST_BASE[posture] Ã surface.restQuality Ã surface.convalescence
Ã (1 + carerBonus) Ã Î  conditionFactors`, floored at
`HARM_DEFAULTS.CONVALESCENCE_FLOOR` (0.2 â standing on bare ground still
heals; *time is the free heal*).
- Posture and surface are read on `VitalsMixin` directly through the
  `Posed` / `Slottable` / `Postured` surfaces (`getRestingOnPath()`,
  `getOccupiedHost()`, `getRestQuality()`), the same three reads
  `Metabolic.currentRestQuality` makes â **not** by calling into
  `MetabolicMixin`, which composes *outside* Vitals and is build-3's
  file. `POSTURE_BASE` is **hoisted** from `METABOLIC_DEFAULTS` to
  `lib/character/Posed.ts` as `POSTURE_REST_BASE` (the posture vocabulary
  owns the posture table); `METABOLIC_DEFAULTS.POSTURE_BASE` becomes a
  one-line re-reference so metabolism is byte-identical.
- `convalescence` is a **new authorable field on `PosturedMixin`**
  (default 1.0, setter `> 0`), read only by wound mending. The cot
  authors `restQuality: 1.5, convalescence: 2.0`; a home bed keeps
  `restQuality: 2.0` and no `convalescence` (1.0). Lying on the cot: `k =
  1.0 Ã 1.5 Ã 2.0 = 3.0`; the home bed: `2.0`; the floor: `1.0`. This
  fixes the inversion **without** making a clinic cot a better night's
  sleep than a four-poster (stamina recovery keeps reading `restQuality`
  alone). â  A second field rather than raising `restQuality` â flagged
  for the user (Â§ Risks).
- `carerBonus` by the carer's medicine band: `untrained 0 Â· novice 0.25 Â·
  competent 0.5 Â· proficient 0.75 Â· expert 1.0` (`HARM_DEFAULTS.
  CARER_BONUS_BY_BAND`) â applied only while D8's engagement is live.
- `conditionFactors`: every active affliction whose row `signature`
  carries the new `{ kind: 'convalescence', factor }` effect (D12). A
  fever could author `factor: 0.5`; the mend spell authors `3`.

**D3 â The offline carve is a second stamp inside the one trauma arm.**
`Trauma` gains `mendedAt?: number` beside `tickedAt`. In the existing
trauma loop, after the harm block (unchanged guards: first-touch, linkdead
re-stamp, far-past drop), a mend block runs on `mendedAt` with **no
linkdead re-stamp and no far-past drop** â the dying arm's discipline
(`Vitals.ts:2145`), for the opposite reason: being away must never *cost*
you, and mending is never a cost. The harm block still freezes, so a
linkdead body neither bleeds nor knits *wrong*. â  Not a second `forâ¦of`:
`lint:condition-arms` would count it. `k` for an absence is whatever the
body reads on return (its surface if re-seated, else the floor) â no
synthetic "away rate". The treated-rate dials (`*_TREATED_HEAL_PER_SEC`)
and the natural rates both go through `mend`.

⭐ **Sleep-as-logout, made explicit.** The offline mend IS the shipped *sleep-as-logout* mechanism, not a new one: recovery adds no rest state and no `sleep` verb (circadian is deferred, `Species.ts:412`). A body lying on a rest surface while logged off mends as it already restores stamina — giving beds and bedrooms a new **convalescence** purpose (home bed `k = 2.0`, clinic cot `3.0`, floor `1.0`). ⚠ It depends on the body re-occupying its rest surface on restore (§ Risks, item 3); if it does not, sleeping-in-your-bed silently degrades to floor rate.

**D3a — Convalescence requires *safety*, identical online and offline (the intent-agnostic answer to combat-logging).** `convalescenceFactor()` returns **0** (overriding `CONVALESCENCE_FLOOR`) whenever the body is in a live `CombatSession` **or** was harmed within `HARM_DEFAULTS.CONVALESCENCE_SAFE_DELAY` — a new transient `Vitals._lastHarmedAt`, stamped wherever `applyInflict`/`afflict` land harm. ⭐ This is **not** an anti-combat-log rule: intent is undetectable (an escaper force-quits and reads as a bad connection), so we never adjudicate it. A body mends only when *actually safe*, and the rule is the **same** whether the player is present, linkdead, or logged off — so a body dropped mid-fight heals nothing (recently harmed) exactly as an online body would, a body safe in a bed heals, and the bad-connection player and the escaper are treated identically, the *situation* deciding the outcome. The feature survives: the gate only delays the *start* of mending by `CONVALESCENCE_SAFE_DELAY`, invisible across an hours-long logout. The fuller conduct of the absent body — an autonomic-defense stance — is **out of scope**; see Deferred seams / the [absent-body slate](../slates/tails/absent-body-slate.md). Wires into W-A1 (the `k` read) and W-A5-adjacent `lastHarmedAt` stamp; no new wave.

**D4 â `Trauma.dressed` generalizes to "its treatment is on it".** No
rename (persisted key; `describe` reads it). `resolve` becomes live for
every treatable type: fracture (set â `dressed`), rupture (surgery â
`dressed`, `bleeding = false`), burn (cooled â `dressed`), frostbite
(rewarmed â `dressed`). `reopen` (undress) un-sets a fracture (the splint
comes off) and stays `noop` for rupture / burn / frostbite (you cannot
un-cool a burn). `mend` reads `dressed` to pick the treated rate.
`describe` grows the treated phrasing (*"a set fracture of â¦"*, *"a
closed rupture of â¦"*, *"a cooled burn on â¦"*, *"rewarmed frostbite of
â¦"*).

**D5 â One treatment primitive on the BODY.** `Vitals.applyTreatment(wound,
{ by, efficacy, treater? }): TreatmentResult` â runs `resolve`, stamps
`Trauma.careQuality = efficacy` (0..1; `mend` scales the treated rate by
`0.5 + 0.5 Ã careQuality`), and runs the infection seed (D11).
`TreatController`, `OrderController.treatWorst` and the nurse's brain all
call it; the deed credit and the prose stay caller-side. Replaces the
hand-rolled `treatWorst` body. Verbs stay on objects (`lint:object-verbs`).

**D6 â Verb placement, by who affords.** *The instrument affords the verb;
the body affords its own first aid.*
- **`VitalsMixin.commandContributions.self`** gains
  `medical/treat.yaml`, `medical/undress.yaml` (the finding), and the new
  `medical/tend.yaml`, `medical/dose.yaml` â the `Metabolic` `eat`
  precedent. Anything with a body can dress, undress, sit with, and dose
  a body; the controller declines diegetically.
- **`WaterFixture.commandContributions.peers`** gains `medical/cool.yaml`
  and `medical/scrub.yaml` beside `rinse.yaml`.
- **`FurnaceMixin.commandContributions.peers`** gains `medical/warm.yaml`;
  a campfire-class fixture that is not a Furnace gets the same line
  (verify `platform/thing/Campfire.ts` composes `Furnace`; if not, add
  the line there too).
- **`trade-medicine`** affords its own steps from its instruments:
  `Splint` â `trade/medicine/cmd/medical/set.yaml` (`set`, `splint`);
  `SurgicalKit` â `trade/medicine/cmd/medical/operate.yaml` (`operate`,
  `surgery`). Environment bucket = carried (the Whetstone note).
- All views are category `medical`.

**D7 â An antidote is a MATERIAL with a tag.** `dose <patient> with
<vessel>`: the vessel's bulk material carries `tags: ['antidote:venom']`
(Material tags are free-form, `lib/material/Material.ts:21`); the
controller reads `antidote:<toxinType>` tags against the patient's live
burdens and calls `applyAntidote(type)` for each match, debiting a dose
(`DOSE_LITRES` 0.05). Rows: `/trade/medicine/idea/material/antivenin`
(`MaterialCatalogue` warms any root's `/idea/material/` infix) and a
`thing/antivenin-vial.yaml` (`/platform/thing/Vessel`, interior
antivenin), stocked at the infirmary (D16's shelf). No new mixin.

**D8 â A carer is an ENGAGEMENT, not a room scan.** `lib/vitals/
TendingEngagement.ts` â a `SustainedEngagement` on the **carer's**
`attention` slot (the `AttendanceEngagement` shape; type
`medical-tending`; `cancelable`; `getHost()` = carer). `onStart` links
`patient._setCarer(carer)`; `onAbort` clears it. The link is a
**transient field on `VitalsMixin`** (`_carer`, not persisted â a carer
is a live fact). `convalescenceFactor()` counts it only while the carer is
in the same container, conscious, and still holds the engagement
(`carer.getEngagementByType('medical-tending')`); otherwise it reads as
absent without needing the abort to have fired. `tend <patient>` starts
it; `cancel` ends it; walking away ends it on the next read.

**D9 â Aldis gets a `nurses` brain in trade-medicine.** `trade-medicine/
src/behavior/nurses.ts` (pack brain, `presenceGated: false`, `ambient:
false`, `claims: ['attention']`). On cadence, when `host.shiftState() ===
'on-shift'`: rank the bodies in the room by **triage** â dying first, then
open bleeds, then untreated wounds by severity, then infections by load â
deterministic, no roll. For the top patient: if a treatable wound and the
supply is to hand (a `Dressing` in the room's containers â the cabinet â
or bare hands for an illness), `applyTreatment` with `efficacy = band Ã
dressingQuality Ã hands` and credit her deed; else start a
`TendingEngagement` on them. The graded diagnosis (`treat â¦ for`) is
**not** built here â medic-judgment's. `physician.yaml` gains the brain
line; the cabinet row gains real `contents:` (a bandage stack) so the
supply is real and runs out; `terminus/package.json` gains
`@saxonberg/content-trade-medicine` (`pnpm install` after).

**D10 â Body cleanliness is `HygieneMixin` on `Creature`.** `lib/vitals/
Hygiene.ts`, `Mixins.Hygiene`. One persisted field `washedAt: number |
null` (game-seconds; `null` = never). Derived
`handsCleanliness(): number` = `max(0, 1 â (now â washedAt) /
HYGIENE_SOIL_SEC)` (6 game-hours), `0` when null. `soil()` sets
`washedAt = null` (one-way, the Serviceable shape); `scrub()` stamps now
(called by the verb; the `WaterFixture` affords it). Producers of `soil()`
this build: `applyTreatment` on a bleeding or septic wound soils the
treater. Consumers: `applyTreatment`'s effective quality
(`dressingQuality Ã (0.5 + 0.5 Ã hands)`) and the seed (D11). Composed on
`Creature` beside `VitalsMixin` â every body can be dirty, an animal
never treats, no guard.

**D11 â Wound infection is the shipped infection arm with a new SOURCE.**
Row `platform/idea/Condition/pathogen/wound-sepsis.yaml`, `reach: infect`,
`progression.law: logistic`, `incubationSec` 6h, `inHostPerHour` tuned so
an untended seed reaches stage 3 in ~2 game-days, `signature:
[{reserve: hydration, pctPerHour: â4}, {vital: coreTemperature, perHour:
+0.3}]`, `observableSigns: [feverish, swollen, foul-smelling]`,
`resolution: { by: medicine }`. Every `lint:pathogens` constant authored
(the food-growth ones are honest-but-unexercised for a wound organism â
say so in the row). Two deterministic seeds, no roll:
1. `applyTreatment` with `hands < 0.5` or `dressingQuality < 0.5` on a
   bleed-family wound â `afflict` the record with `pathogenLoad =
   SEPSIS_INOCULUM Ã (1 â effectiveCleanliness)` (the `Metabolic.ingest`
   shape), `symptomsAt = now + incubationSec`; an existing record adds
   load.
2. The harm block: a bleed-family wound above `CLOT_SEVERITY`, undressed
   for longer than `SEPSIS_OPEN_ONSET_SEC` (12 game-hours, tracked by a
   new `Trauma.openSince`), seeds once (`Trauma.septicSeeded = true`).
The deadline is the logistic growth: stage 3 drains hydration into the
shipped dehydration â dying cascade â *nothing new kills anyone*.
Resolution: `treat` with bare hands (the shipped illness arm) knocks the
load by band, **scaled by the treater's hands** and re-seeding when they
are dirty. `assess` reads *"the wound is festering"* when a sepsis record
is past `symptomsAt`.

**D12 â The mend spell is rows plus one VitalEffect kind â no new Effect
kind.** `VitalEffect` gains `{ kind: 'convalescence', factor }`, read by
`convalescenceFactor()` over active afflictions (D2); `applyEffects`
ignores it (it is a read-time modifier, like `function`). Row
`platform/idea/Condition/magic/mending.yaml`: `signature: [{kind:
convalescence, factor: 3}]`, `progression: { law: stage, intervalMs:
3600000 }`, `resolution: { by: rest, atStage: 4 }` (four game-hours of
tripled mending), `observableSigns: [flushed, warm-to-the-touch]`. Spell
row `arcane-library/.../Spell/mend.yaml`: `verb: control, noun: body,
targeting: creature, cost: 12` (the mana toll), `effects: [ {kind:
afflict, conditionPath: /platform/idea/Condition/magic/mending}, {kind:
adjust-reserve, reserveKey: endurance, delta: â35, self: true} ]` â the
freight is the caster's **vigour** (`endurance`; the adjust-reserve
executor's own report is *"Something is drawn away"*), which metabolism
rebuilds from satiation + hydration: magic spends *you*. Dispellable via
`magicOrigin` â honest. `lint:conditions` learns the kind. No wand row
this build (a `/system/arcana/thing/Wand` row naming `mend` is a
one-liner later; `lint:blessed-bands` would then demand bands).

**D13 â Labour-priced care is a `Tariff` read.** `Tariff` gains
`labourIndexed: boolean` (authorable, default false). When true,
`priceFor(key)` for a `treatment` service = `base Ã (1 + LABOUR_INDEX Ã
wage / REFERENCE_WAGE Ã shortfall)`, where `wage` is the acting
principal's highest current `Position.wageRate` (via
`ExecutionContextApi.getActingAuthor()` â `Employed.getEmployments()` â
`Organization.getPosition`; unemployed â the flat base) and `shortfall =
1 â min(capacityScalar over BODY_CAPACITIES)` of the patient. The pure
`labourIndexFor(body)` is unit-tested; `priceFor` composes it. `menu`
therefore quotes *your* price. The clinic-near-the-mine emerges from who
walks in. The humane floor needs no code: unpaid bodies mend at `k â¥
CONVALESCENCE_FLOOR`, and W-B2 pins it with a test. â  `PLASMA_RESTORE_
CEILING_FRAC` stays 0.85.

**D14 â Scars are body state; the chronicle gets the deed.** `Trauma`
gains `peak?: number` (max severity seen, stamped at `inflict` and raised
in the arm). At the clear sweep, a wound with `peak â¥ SCAR_SEVERITY`
(1.5) of a scarring type (laceration, puncture, avulsion, burn, caustic,
frostbite, rupture, fracture) pushes `{ site, type, peak, at }` onto
`VitalsMixin.scars: ScarRecord[]` (`{persistent, runtimeState}`) and, when
the host `isPersona`, fires `recordDeed({ text, tags: ['scar', site],
where })` (the `expireDying â die` fire-and-forget precedent). `assess`
lists scars; `look` at a creature appends one sentence (*"A pale scar
crosses the left forearm."*) via a `Creature`-level override of the
Visible long-description read. Never a penalty: scars contribute nothing
to `ownFunction`.

**D15 â Re-injury rides `Exerting.exert`.** `Vitals.stressStructures(
powerW): Trauma[]` â every fracture with `0 < severity <
FRACTURE_IMPAIR_SEVERITY` (function back, structure not) and `powerW â¥
REBREAK_POWER_W` (350 W â tune against `Exerting.felt-cost.test.ts`'s
pinned watts so a walk never and a pick swing always) is re-broken:
`severity = max(severity, REBREAK_SEVERITY 1.0)`, `dressed = false`,
`careQuality` cleared, `peak` raised. `Exerting.exert` (build-3's file)
calls it after its endurance step and narrates the result (*"Something
gives in your arm."*). Deterministic; no roll.

**D16 â The prosthetic is a Wearable that stands in for a missing part;
function is DERIVED, never stored.** Kernel `lib/slot/Prosthetic.ts`,
`ProstheticMixin` (`Mixins.Prosthetic`): `forParts: string[]` (the parts
it can stand in for), `restores: number` (0..1). `fitsSlot` override:
super's claim check **and** the host is `isVitals` with at least one
`forParts` entry `missing`. `Vitals.ownFunction(key)`: when missing, return
the `restores` of any worn occupant that `isProsthetic` and names `key`
(scan the host's occupied slots â only on missing parts, which is rare).
No `BodyPartDelta` field, no fit/unfit writers, nothing to desync on
restore. `Slotted.canOccupy`'s anatomy gate needs **no change for the
shipped rows** (`legs` and `hands` are `covers` slots with no `bodyPart`,
so a missing leg never disables them â verified in `biped.yaml`); the
gate change the brief listed is deferred with its seam named (Â§ Deferred).
Class `trade-medicine/src/thing/Prosthesis.ts` = `ProstheticMixin(
WearableMixin(DetailedMixin(Thing)))`; rows `peg-leg.yaml` (`slotClaims:
{<biped>: [legs]}`, `forParts: [body.leg.left, body.leg.right]`,
`restores: 0.6`) and `hook-hand.yaml` (`hands`, both hands, `0.35`). Sold
from a new infirmary `Stock` counter row (`thing/fitting-shelf.yaml`,
`/platform/thing/Stock`) beside the tariff. `assess` reads *"a peg leg
stands in for the left leg"*.

**D17 â Staging and MR shape: ONE MR (user-decided 2026-09-19).** Stage A (W-A0â¦W-A8) is *"the
clinic works"* and satisfies acceptance lines 1â5 alone; Stage B (W-B1â¦
W-B5) is the identity/economic layer and touches a different reviewer
surface (`Exerting`, `Slotted`/`Wearable`, `Tariff`). Land Stage A as one
MR, then Stage B on a fresh branch off master â the farming precedent
(Stage A â MR !213, Stage B off fresh master). If the user prefers one
MR, nothing in the waves changes. ⭐ DECIDED 2026-09-19: **one MR.** The Stage A/B split is retained only as wave ordering and review structure on a single branch; the two-MR recommendation above is superseded — the merge is one MR.

**D18 â The drive's wound sources are content, not a wizard.** Fracture:
the spike-pit `drop` (blunt on landing) â W-A0 verifies it actually
yields a `fracture` at the shipped `hazard.dropFallEnergy`; if it yields
a contusion, W-A0 adds one generic `traps/deadfall.yaml` (blunt,
`siteSelector: [body.torso, body.leg.left, body.leg.right]`, energy past
the fracture and rupture thresholds) placed in `delve/corridor-3.yaml`.
Rupture: the same deadfall (blunt torso past `ruptureThreshold`) â there
is no other reachable source. Poison: `step-dart` (venom 4). The wire
drive is `.dirty.` (traps are one-shot).

**D19 — The notify layer: an alarm, never a heartbeat.** Recovery's new
mechanics (offline mend, the infection deadline, convalescence) advance
*silently* under pure derive-on-read — a body changes only when
`reconcileConditions` runs (a `look`/`assess`). That makes the infection
**deadline** invisible until manually inspected, which guts C5's teaching. The
fix is a **notification**: book a one-shot read at the next interesting
transition and push a message (*"the wound has festered / has knit / your fever
broke"*).

⭐ **It is an ALARM, not a heartbeat — the distinction is load-bearing and
contractual:**
- **One-shot, per pending transition** — `ScheduleApi.schedule(msUntilNext, cb)`
  (precedent: `CombatLogic.ts:5051`'s window-expiry and `RenownLogic.ts:414`'s
  seed-fold — *one-shots*), booked when a wound is dressed or a sepsis seed
  lands, held on a `ScheduleHandle`, canceled and rebooked when state changes.
  ⚠ **Never `ScheduleApi.recurring`, never a cadence, never a per-body sweep.**
  A body with nothing pending books nothing.
- **The callback calls ONLY `reconcileConditions` + the message push** — no
  bespoke advance logic on the fired path; it computes nothing a `look` wouldn't.
- **Correctness is independent of it firing.** Death itself is already pure
  derive-on-read — `Vitals.expireDying` is called *inside*
  `reconcileConditions` (`Vitals.ts:2172`) when the window has elapsed; there is
  no death scheduler, a dying body resolves on its next read. So the notify
  layer adds **no authority**: dropped, delayed or never-fired, the next real
  read computes the same truth. It buys **timeliness, never validity.**
- **Never persisted as authority; rebuildable from state** — the
  next-interesting-time is a pure function of current condition state.

⚠ **The acceptance gate that keeps it from drifting into a heartbeat:**
*delete the scheduler and the game is still correct, only less timely.* Encoded
as a test (a wound reconciled with the alarm dropped reaches the identical state
on the next manual read) plus a check that the notify callback body calls only
`reconcileConditions` / the message API. The 'what it is / what it isn't'
contract is written into `harm.md` at doc time (W-A8).

⭐ **Verified correction:** an earlier assumption that mortality *books* death
via the scheduler is false (death is derive-on-read, `Vitals.ts:2172`) — which
makes recovery's notify purely a courtesy on top of an already-correct lazy
model, the safest possible shape.


---

## â­â­ Host placement

Every new field, mixin and class; what composing it claims about the rest
of the host set. The test: if a guard re-narrows the host set, the host is
wrong.

| new thing | host | what composing it claims | narrowing guard? |
|---|---|---|---|
| `TraumaBehavior.mend`, `Trauma.mendedAt / careQuality / peak / openSince / septicSeeded` | the `Trauma` value + the closed behavior table (`Condition.ts`) | every wound has a heal law and a treatment quality â true of all nine | none |
| `Vitals.convalescenceFactor()`, `applyTreatment()`, `stressStructures()`, `_carer`, `_setCarer()`, `scars`, `commandContributions.self` (treat/undress/tend/dose) | `VitalsMixin` (composed on `Creature` â every body) | every body heals at a rate, can receive a treatment, can be stressed, can be tended, can scar, affords its own first aid | none â a frog can be dressed by a player; its own `self` verbs are inert without a `CommandGiver`, exactly as `Metabolic`'s `eat` is |
| `POSTURE_REST_BASE` | `lib/character/Posed.ts` (the posture vocabulary) | the postureârest table is a fact about postures, read by two drivers | none |
| `Postured.convalescence` | `PosturedMixin` (chairs, beds, cots, a campfire log) | any rest surface may be clinical; default 1.0 is silent | none |
| `HygieneMixin { washedAt }` | `Creature` (beside Vitals) | every body can be clean or dirty | none â a wolf never treats; the read is only made of a treater |
| `TendingEngagement` | the carer's `attention` slot (`Engaged`) | a carer's attention is one thing, exclusive â the attendant precedent | none |
| `wound-sepsis` row | `/platform/idea/Condition/pathogen/` | the shipped infection arm grows it; the shipped `treat` knocks it | none |
| `VitalEffect.convalescence` | the effect vocabulary (`Condition.ts`), read by `convalescenceFactor` | any condition row may speed or slow mending | none |
| `mending` Condition row, `mend` Spell row | `/platform/idea/Condition/magic/`, `arcane-library` Spell rows | rows only | n/a |
| `Tariff.labourIndexed`, `labourIndexFor()` | `Tariff` (platform/thing) | a tariff may index a service to the customer | none |
| `ProstheticMixin { forParts, restores }` | kernel `lib/slot/` â its **reader** is `Vitals.ownFunction` (kernel), so the mixin cannot be pack `lib/` (the `Dressing` rule) | a worn thing may stand in for a part; `fitsSlot` refuses a part the host still has â candidate-side, not a host guard | none |
| `Splint`, `SurgicalKit`, `Prosthesis` classes; `antivenin` material; rows | `trade-medicine/src/thing/`, `content/trade/medicine/{thing,idea/material}/` | the trade owns its instruments (the Whetstone rule) | none |
| `nurses` brain | `trade-medicine/src/behavior/` | the medic's work is the trade's | none |
| views `tend Â· dose Â· warm Â· cool Â· scrub` | `platform/content/platform/cmd/medical/` | any body / any water / any fire | none |
| views `set Â· operate` | `trade-medicine/content/trade/medicine/cmd/medical/` | the trade's own steps | none |

**Rejected placements, and why:** `convalescenceFactor` on `MetabolicMixin`
(it is build-3's file, composes outside Vitals, and wound rate is the
wound driver's read); cleanliness on `Serviceable` (vessels only â the
guard would be `isOrganism`); a stored `BodyPartDelta.prosthetic` (a
second writer of anatomy state that must be cleared on every vacate path
and re-fitted on every restore â derive it); a mend `Effect` kind + `exec
Mend` (a new mechanism where `afflict` already is one â the Effect
invariant); `set`/`operate` in the kernel (a trade's own steps ship with
the trade â the `forge`/`hew` rule).

---

## Convention conformance

Checked at plan time against the current tree.

- **`props:` / `cast:`** â `ward.yaml` uses both; new rows (fitting shelf)
  go under `props:`. `populates:` is retired.
- **Locations, not rooms** â no new location. The deadfall (if added) is a
  `props:` entry on an existing `SingletonCartesianLocation`.
- **The `<root>/<branch>/` pattern** â kernel classes at `/platform/thing/`
  and `lib/`; trade rows at `/trade/medicine/thing/*`, `/trade/medicine/
  idea/material/*`; controllers at `<root>/idea/cmd/medical/*Controller`,
  views at `<root>/cmd/medical/*.yaml`; the brain at `/trade/medicine/
  behavior/nurses`; the sepsis row under the kernel's `/platform/idea/
  Condition/pathogen/` because `lint:pathogens` and `Contamination.
  behaviorOf` read that directory.
- **Module scope declares; lifecycles initialize** â no module-scope
  statements; `HARM_DEFAULTS` grows const entries only.
- **Import boundary** â pack code imports the kernel by package specifier
  (`@saxonberg/server/mud/â¦`, the `AnalyzePatientController` style);
  nothing in `src/mud/lib/**` imports outside `src/mud/`.
- **Module categories** â new files are: mixins (`Hygiene.ts`,
  `Prosthetic.ts`), an engagement class (`TendingEngagement.ts`, the
  `AttendanceEngagement` category, in `lib/vitals/`), controllers, a pack
  brain, pack Stuff classes, rows. **No new Api, no logic singleton, no
  free helper, no new module category.** Pure helpers fold into the
  owning class or `HARM_DEFAULTS`.
- **Verbs on objects** â `applyTreatment`, `stressStructures`,
  `convalescenceFactor`, `applyAntidote` live on the body; no `XApi.verb(
  host, â¦)`. `ConditionApi` is untouched.
- **No `isWizard` anywhere.**
- **Inter-Stuff contract** â every cross-object read is a method (`carer.
  getEngagementByType`, `host.getRestQuality`).
- **`Mixins` registry** â add `Hygiene`, `Prosthetic` + their refusal
  lines (`lint:mixin-names`).
- **`#`-privacy** â none in domain code; `_carer` is a TypeScript-private
  transient (the proxy rule).

**Lint gates this build must satisfy** (run `pnpm -C packages/server
lint:family` at every wave):
`lint:condition-arms` (the census must not rise â D3's single-loop rule)
Â· `lint:conditions` (the new `convalescence` kind is vocabulary; the
`mending` and `wound-sepsis` rows validate) Â· `lint:pathogens` (every
constant on the sepsis row) Â· `lint:unconsumed-seams` (every new
authorable field has a reader: `convalescence`, `labourIndexed`,
`forParts`, `restores`) Â· `lint:verb-collisions` (none of the ten new
verbs is claimed) Â· `lint:instrument-args` + `lint:capabilities` (`set`
declares `[capability.splint]`, `operate` `[capability.surgery]`; the rows
declare them; no controller walks the room) Â· `lint:arg-kinds` Â·
`lint:binder-models` Â· `lint:object-verbs` (stays 0) Â· `lint:module-scope`
Â· `lint:imports` Â· `lint:instanceable` (every trade class at a
`/trade/medicine/<branch>/` path; the kernel mixins never instanced) Â·
`lint:mixin-names` Â· `lint:lib-statics` (a ratchet: add no static
*methods* in `lib/`) Â· `lint:gates` Â· `lint:field-meta` Â·
`lint:test-bootstrap` Â· `lint:drive-scripts` (the drive is a wire file) Â·
`lint:spell-cost` (the mend row has no `joules` â outside jurisdiction) Â·
`lint:blessed-bands` (no wand row, so not triggered) Â· `lint:schema`
(no new collection).

---

## Waves

Every wave is independently landable and ends at
`build(recovery W-<n>): â¦`. Keep this doc current as each lands.

### Stage A â the wiring core: the clinic works

#### W-A0 â Merge, the affordance finding, the drive's wound sources ✅ DONE
**Goal:** a branch that can be built on, and proof the medical verbs are
reachable at all.

> ✅ **W-A0 landed (2026-09-23).** Base caught up to master (fishing merged â
> `pnpm install` was required; stale `node_modules` failed every pack suite at
> collection with a `content-trade-fishing` "Cannot find module" â the known
> pack-rename trap). `Exerting.ts` confirmed present. **Affordance finding
> CONFIRMED by grep** â nothing contributed `medical/treat.yaml` /
> `medical/undress.yaml`; `VitalsMixin` had no `commandContributions` at all.
> Fixed per D6: `VitalsMixin.commandContributions = { self: [treat, undress] }`
> (the `MetabolicMixin.eat` shape). 126 vitals tests green.
>
> **D18 refined â the wound sources, corrected from empirical anatomy.**
> `HazardDelivery.resolveSite` is **first-anatomy-match, deterministic**, and
> the spike-pit's selector leads with `body.torso`, so its point delivery
> reaches the liver → an **undressable interior rupture** (its whole
> documented character). It is therefore the **rupture** source, never a
> fracture. The **fracture** source is a **new `traps/deadfall.yaml`** (blunt,
> energy 6, `siteSelector: [body.leg.left, body.leg.right]` â a leg carries
> bone and has no interior organ, so a blunt blow past the 1.5 fracture
> threshold BREAKS it), placed in `delve/corridor-3.yaml`. So the drive's
> step 1 (fracture) springs the **deadfall** and step 5 (rupture) springs the
> **spike-pit** â the reverse of the plan-time guess; W-A8 confirms both
> energies on the wire and tunes if needed.
- `git merge origin/master` — the base already includes nutrition-fitness (merged `81caf517f`); confirm
  `lib/exertion/Exerting.ts` exists; `pnpm install`; `pnpm test:near`
  on `lib/vitals`.
- **Wire probe** (a throwaway `it` that becomes the drive's step 0):
  `player.cmd('treat')` on a guest at the crossroads. Expect a
  `controller-rejected` note (`no-wound`), **not** `unknown-verb`. Record
  the result in Â§ Drive record. Expected: unknown-verb.
- Fix per D6: `VitalsMixin.commandContributions = { self: [treat, undress]
  }` (the `Metabolic` shape). Re-probe.
- Verify the fracture source (D18): a wire probe walks the delve, drops
  through the spike pit, `assess`. If the landing blow is a contusion, add
  `generic-objects/.../traps/deadfall.yaml` + place it in `corridor-3`.
  Either way the plan records which.
- **Files:** `lib/vitals/Vitals.ts` (contributions), maybe two content
  rows.
- **Acceptance:** `treat` answers from the wire; a fracture is reachable
  by a player. **Commit:** `build(recovery W-A0): treat was never afforded
  â the body affords its own first aid`.

#### W-A1 â The convalescence seam (D1, D2) ✅ DONE

> ✅ **W-A1 landed.** The keystone split: `TraumaBehavior.mend(host, t,
> elapsedSec, k)` carries the severity decay (the healing half), `tick`
> keeps only HARM (the bleed drain, the caustic's growth). Every behavior
> got `mend`; the three composed ones (avulsion/puncture/rupture) reuse
> `LACERATION_BEHAVIOR.mend`. `Vitals.convalescenceFactor()` computes `k`
> once per reconcile = `postureBase × restQuality × convalescence ×
> carer(1) × conditions(1)`, floored at `CONVALESCENCE_FLOOR` (0.2). The
> reconcile loop calls `mend(this, t, elapsed, k)` after `tick`.
>
> **D3a wired in this wave** (the plan said it would): `_lastHarmedAt`
> transient stamped in `afflict` for trauma/shock kinds; `isConvalescenceSafe`
> returns false in a live `CombatApi.sessionFor` OR within
> `CONVALESCENCE_SAFE_DELAY` (300s) of harm → `k = 0`. Intent-agnostic,
> identical online/linkdead/logged-off.
>
> **Hoist:** `POSTURE_REST_BASE` now lives in `lib/character/Posed.ts`;
> `METABOLIC_DEFAULTS.POSTURE_BASE` re-references it (byte-identical —
> metabolism suite green). `PosturedMixin.convalescence` field added
> (default 1.0, setter > 0). `cot.yaml`: `restQuality 0.7 → 1.5`,
> `convalescence: 2.0`, and its slot postures `[lying,sitting] → [lie,sit]`
> (a latent bug — the cot was un-liable). `assess` gains a mending-pace
> line from `k`. Tests: `Vitals.convalescence.test.ts` (5, incl. cot>bed and
> the D3a resume); `Trauma.behaviors`/`RinseController` updated for the
> split. 498 affected tests green; all 46 lint gates pass (condition-arms
> did NOT rise — mend is inside the existing loop).

- `Condition.ts`: `TraumaBehavior.mend(host, t, elapsedSec, k)`; move every
  severity-decay line out of `tick` into `mend` (laceration family: the
  open-bleed hold stays in `mend` as *no decay while bleeding-undressed*;
  `decayingBehavior` gains `mend`; caustic's post-rinse decay moves to
  `mend`, its growth stays in `tick`). `HARM_DEFAULTS` gains
  `CONVALESCENCE_FLOOR`, `CARER_BONUS_BY_BAND`, the `*_TREATED_HEAL_PER_
  SEC` family (fracture 0.006, rupture 0.004, burn 0.012, frostbite 0.01;
  laceration keeps `DRESSED_HEAL_PER_SEC`).
- `lib/character/Posed.ts`: `POSTURE_REST_BASE`; `Metabolic.ts` one-line
  re-reference.
- `lib/slot/Postured.ts`: `convalescence` field + setter + `fieldMeta`.
- `Vitals.ts`: `convalescenceFactor()` (posture Ã surface Ã carer stub
  returning 1 until W-A6 Ã condition factors stub until W-B1); in the
  trauma loop, after `tick`, call `mend(this, t, elapsed, k)` under the
  **same guards** for now (the carve is W-A2). `assess` gains one line:
  *"mending well / steadily / slowly"* from `k`.
- Content: `cot.yaml` â `restQuality: 1.5, convalescence: 2.0`.
- **Tests:** `Trauma.behaviors.test.ts` (each type's `mend` Ã k; `tick`
  no longer heals); `Vitals.convalescence.test.ts` (floor / bed / cot
  ordering; the cot beats the bed; `restQuality` alone still drives
  endurance â `Metabolic.coupled.characterization.test.ts` stays green).
- **Commit:** `build(recovery W-A1): the convalescence seam â a bed, a
  carer and a spell pay one number`.

#### W-A2 â The offline carve (D3)
- `Trauma.mendedAt`; the mend block in the trauma loop moves onto it with
  no linkdead re-stamp and no far-past drop; the harm block untouched.
  `ConditionLogic.inflict` stamps `mendedAt` beside `tickedAt` (@1019,
  @1100, @1163).
- Verify the re-seat: does a restored body re-occupy its `restingOnPath`
  surface? If not, `Posed`'s materialize path re-occupies (find the
  restore hook `Posed` already uses for `restingOnPath`; it persisted the
  path for exactly this).
- **Tests:** `Vitals.offline-mend.test.ts` â the `Vitals.dying-disconnect.
  test.ts` shape: a linkdead body with a dressed laceration bleeds nothing
  and knits; a 3-day gap heals a fracture; a bleeding undressed wound
  across the same gap loses no blood (far-past still drops harm).
  `lint:condition-arms` count unchanged.
- **Commit:** `build(recovery W-A2): mending runs while you are away â
  harm still freezes`.

#### W-A3 â Every wound treatable, kernel side (D4, D5, D7) + `dose Â· warm Â· cool`
- `Condition.ts`: live `resolve`/`reopen`/`describe` for fracture,
  rupture, burn, frostbite; `Trauma.careQuality`; `mend` reads `dressed`
  and `careQuality`.
- `Vitals.applyTreatment(wound, { by, efficacy, treater })`.
- `TreatController`: mechanical effect â `applyTreatment`; `mismatchLine`
  words gain `setting: 'setting, with a splint'`, `surgery: 'surgery'`;
  the `Treatment` union grows the new tokens. `OrderController.treatWorst`
  â the primitive, over every token the house can supply (`dressing`,
  `setting`, `surgery`, `cooling`, `warmth`, `medicine`).
- Fracture's `resolution` becomes `setting`; burn keeps `fluid` for
  `treat` (drinking) and `cool` addresses it directly by type.
- New platform views + controllers: `medical/dose.yaml` +
  `DoseController` (patient, `with` vessel `default: "reachable:[mixin.
  BulkableMixin]"`, narrows on the material's `antidote:*` tags â state,
  not identity); `medical/warm.yaml` + `WarmController` (patient; `source`
  `default: "reachable:[mixin.CombustibleMixin]"`, narrows on
  `isBurning()`; resolves frostbite and `by: warmth` afflictions â
  hypothermia, torpor, which today nothing offers); `medical/cool.yaml` +
  `CoolController` (patient; water like `rinse`; resolves burn by type and
  `by: cooling` afflictions â hyperthermia). Affordances per D6.
- Rows: `trade-medicine` `idea/material/antivenin.yaml` (tags
  `[antidote:venom]`), `thing/antivenin-vial.yaml`.
- **Tests:** `TreatController.test.ts` (set/surgery mismatch lines),
  `DoseController.test.ts` (venom crashed, alcohol untouched, empty vial
  refused), `WarmController.test.ts`, `CoolController.test.ts`,
  `OrderController.treatment.test.ts` (a fracture at the counter).
- **Commit:** `build(recovery W-A3): every wound has a treatment â dose,
  warm, cool, and the one primitive`.

#### W-A4 â The instruments: `set` and `operate` (trade-medicine)
- `trade-medicine/src/thing/Splint.ts`, `SurgicalKit.ts` (`ToolItem` +
  `AudibleMixin` per Whetstone; `capabilities: ['splint']` /
  `['surgery']`; `commandContributions.environment` = their view).
- Views `content/trade/medicine/cmd/medical/set.yaml` (`set`, `splint`;
  patient + `splint` arg `default: "me:i:[capability.splint]"`) and
  `operate.yaml` (`operate`, `surgery`; patient + `kit` arg
  `[capability.surgery]`); controllers `src/idea/cmd/medical/
  SetController.ts`, `OperateController.ts` + their controller YAMLs
  (the `AnalyzePatientController.yaml` shape). `operate` requires the
  patient lying and the surgeon at least `competent` in medicine (refused
  below, by name â *"You do not know how."*); both call `applyTreatment`
  and credit the deed. `undress` on a set fracture takes the splint off
  (`reopen`).
- Rows `thing/splint.yaml`, `thing/surgical-kit.yaml`; the infirmary's
  `ward.yaml` `props:` gains both (Aldis's kit) and `terminus/package.json`
  gains the trade-medicine dependency (`pnpm install`).
- **Tests:** the pack's own vitest (`src/__tests__/set.test.ts`,
  `operate.test.ts`); `pnpm -C packages/content/trade-medicine test`.
- **Commit:** `build(recovery W-A4): a splint and a surgeon's kit â the
  trade's own steps`.

#### W-A5 â Hygiene and the festering wound (D10, D11)
- `lib/vitals/Hygiene.ts` + `Mixins.Hygiene`; compose on `Creature`.
- `medical/scrub.yaml` + `ScrubController` (water like `rinse`); afforded
  by `WaterFixture`. The ward already has a basin in prose â `ward.yaml`
  gains a `props:` water fixture row (reuse the shipped basin class the
  lounge's glass alley uses).
- `wound-sepsis.yaml`; the two seeds in `applyTreatment` and the harm
  block; `Trauma.openSince / septicSeeded`; hands in `tendInfection`'s
  knock; `assess`'s *festering* line.
- **Tests:** `Hygiene.test.ts` (decay, soil, scrub); `Vitals.sepsis.test.ts`
  (dirty treat seeds, clean treat does not, the undressed-onset seed, the
  deadline reaches stage 3, a clean re-treat clears); `lint:pathogens`
  green.
- **Commit:** `build(recovery W-A5): clean hands â a wound can go bad on
  a clock`.

#### W-A6 â Nursing and the physician who practises (D8, D9)
- `lib/vitals/TendingEngagement.ts`; `Vitals._carer`, `_setCarer`, the
  carer term in `convalescenceFactor`; `medical/tend.yaml` (`tend`,
  `nurse`) + `TendController` (starts the engagement; refuses a body
  that is not wounded).
- `trade-medicine/src/behavior/nurses.ts`; `physician.yaml` gains
  `{ brain: /trade/medicine/behavior/nurses, cadenceMs: 20000 }`;
  `dressing-cabinet.yaml` gains `contents:` (a bandage stack â the
  glass-alley `Bandage` row).
- **Tests:** `TendingEngagement.test.ts` (attention slot exclusivity;
  abort clears the link; walking away drops the bonus on read);
  `nurses.test.ts` in the pack (triage order is deterministic; she
  treats the dying first; she runs out of bandages honestly).
- **Commit:** `build(recovery W-A6): a carer buys rate â and Aldis finally
  practises`.

#### W-A7 — The notify layer (the alarm, not a heartbeat) (D19)
- `Vitals.nextInterestingAt(): number | null` — a **pure read** returning the
  soonest transition time across active conditions (a wound reaching
  `CLEARED_SEVERITY`, a sepsis record crossing `symptomsAt` / a stage boundary,
  the `mending` spell ending), or `null` when nothing is pending. Mutates
  nothing.
- Book a one-shot on every state change that moves the horizon —
  `applyTreatment`, the sepsis seed, `inflict`/`relieve` — via a
  `ScheduleHandle` held transiently on `VitalsMixin` (`_notifyHandle`), canceled
  and rebooked each time. The callback runs `reconcileConditions` and, for any
  transition it *observes*, pushes an MML line to the body's observers
  (present-but-not-looking players; a logged-off player derives the same state on
  next read). Reuse the `ScheduleApi.schedule` + `ScheduleHandle` cancel shape
  (`CombatLogic.ts:5051`).
- ⚠ **No `recurring`, no cadence, no sweep. A healthy body holds no handle.**
- **Tests:** `Vitals.notify.test.ts` — the alarm fires the message at the
  transition; ⭐ **the drop-the-alarm test** (cancel the handle; a manual
  `reconcileConditions` at the same clock reaches the identical state — proves
  timeliness-not-validity); the callback mutates nothing beyond what a read does;
  a body with no pending transition books no handle.
- **Commit:** `build(recovery W-A7): the body tells you when it changes — an
  alarm, never a heartbeat`.


#### W-A8 â Stage A docs and the drive (steps 1â7)
- `docs/subsystems/harm.md` Â§ *Recovery* (the seam, the carve, the
  treatments, hygiene, the carer); `vitals.md` (the new fields);
  `attendant.md` one-line cross-ref; `content-packs.md`'s trade-medicine
  line; the `trade-medicine/pack.yaml` description (it now ships more
  than a read).
- `packages/wire/tests/recovery.dirty.wire.test.ts` â drive steps 1â7 (Â§
  Drive record below lists each checkpoint and what it must be able to
  fail on). Run it; record the output.
- `pnpm test` once; open the Stage A MR.
- **Commit:** `build(recovery W-A8): Stage A docs, and the drive proves the
  clinic works` then `drive(recovery): â¦`.

### Stage B â the lens extensions (a second MR off master)

#### W-B1 â Magic mends by spending the healer (D12)
- `Condition.ts`: `VitalEffect` gains `convalescence`; `convalescenceFactor`
  reads it; `applyEffects` skips it; `check-conditions.ts` vocabulary.
- `mending.yaml`, `mend.yaml`. `arcana`'s `magic-body` Discipline already
  reads healing; no Discipline change.
- **Tests:** `Vitals.convalescence.test.ts` gains the condition term;
  `MagicLogic.mend.test.ts` (the caster's endurance drops; the target
  carries `mending`; the target's `k` triples; dispel removes it).
- **Commit:** `build(recovery W-B1): mend â a bill paid in self`.

#### W-B2 â The bill fits the harm (D13)
- `Tariff.labourIndexed`, `labourIndexFor(body)`, the `priceFor` override;
  the infirmary `tariff.yaml` authors `labourIndexed: true`.
- **Tests:** `Tariff.labour.test.ts` (a wage-6 body with a failing leg
  pays more than an unemployed one with the same wound; an unhurt body
  pays base; a penniless wounded body still reads `k â¥ floor`).
- **Commit:** `build(recovery W-B2): care priced by the labour it
  restores â and the free floor stays free`.

#### W-B3 â Structure remembers: scars and re-injury (D14, D15)
- `Trauma.peak`; `Vitals.scars`; the clear-sweep scar write + deed;
  `assess` scars; the `Creature` description sentence.
- `Vitals.stressStructures`; the call + narration in `Exerting.exert`.
- **Tests:** `Vitals.scars.test.ts` (a grave laceration scars, a bruise
  does not, the deed lands, `ownFunction` unchanged);
  `Vitals.rebreak.test.ts` (a half-knit fracture at 400 W re-breaks and
  un-sets; at 150 W nothing; a fully healed bone never).
- **Commit:** `build(recovery W-B3): a body remembers â scars, and the
  bone that was not ready`.

#### W-B4 â What is gone: the prosthetic (D16)
- `lib/slot/Prosthetic.ts` + `Mixins.Prosthetic`; `Vitals.ownFunction`'s
  derived read; `Prosthesis.ts`, `peg-leg.yaml`, `hook-hand.yaml`,
  `fitting-shelf.yaml` (a `Stock` counter stocking both + the antivenin
  vial + a splint); `assess`'s stands-in line.
- **Tests:** `Vitals.prosthesis.test.ts` (a peg leg on a severed leg lifts
  `locomotion` from 0.5 to 0.8; on a whole leg `fitsSlot` refuses; taking
  it off drops the read with no residue; the sever's vacate leaves the
  derive honest); the pack's `prosthesis.test.ts`.
- **Commit:** `build(recovery W-B4): time heals everything except what is
  gone â and a peg leg`.

#### W-B5 â Stage B docs and the drive (steps 8â10)
- `magic.md` (the `mend` working, the convalescence effect), `retail.md`
  (labour-indexed tariff), `harm.md` (scars, re-injury, prosthetics),
  `embodiment.md` (`ProstheticMixin`); the wire file gains steps 8â10.
- `pnpm test` once; open the Stage B MR.
- **Commit:** `build(recovery W-B5): Stage B docs and the drive`.

---

## Reachability wiring

Five links per capability â verb Â· affordance Â· data Â· boot Â· arg gate â
each fails closed and silent.

| capability | verb (view) | affordance (a static on a class) | data | boot | arg gate (`requires:` the real target composes) |
|---|---|---|---|---|---|
| dress / undress (the finding) | `medical/treat.yaml`, `undress.yaml` | **`VitalsMixin.self`** (new) | bandage rows exist | none | `[VisibleMixin, VitalsMixin]` â every Creature |
| sit with a body | `medical/tend.yaml` | `VitalsMixin.self` | â | none | patient `VitalsMixin`; self-target refused in the controller |
| dose | `medical/dose.yaml` | `VitalsMixin.self` | `antivenin` material + vial row; stocked on the shelf | `MaterialCatalogue` warms `/trade/medicine/idea/material/` by infix â | `with` = `BulkableMixin` (the vial is a `Vessel`) |
| warm | `medical/warm.yaml` | `FurnaceMixin.peers` (+ campfire class if not a Furnace) | â | none | `source` = `CombustibleMixin`; narrows on `isBurning()` |
| cool | `medical/cool.yaml` | `WaterFixture.peers` | â | none | `water` = `BulkableMixin` (the `rinse` shape) |
| scrub | `medical/scrub.yaml` | `WaterFixture.peers` | the ward gains a basin row | none | `water` = `BulkableMixin` |
| set | `trade/medicine/cmd/medical/set.yaml` | `Splint.environment` | `splint.yaml` in the ward's `props:` | pack installed; terminus depends on trade-medicine | `splint` arg `[capability.splint]` â the row declares it |
| operate | `â¦/operate.yaml` | `SurgicalKit.environment` | `surgical-kit.yaml` in `props:` | as above | `kit` `[capability.surgery]` |
| the clinic's treatment | `retail/order.yaml` (shipped) | `Tariff` (shipped) | `services: treatment` (shipped) | business stands up lazily (shipped) | n/a |
| the nurse | â (a brain) | `behaviors:` on `physician.yaml` | cabinet `contents:` | `shifts` keeps her on the roster; the brain resolves by path at pack discovery | n/a |
| mend | `system/arcana/cmd/magic/cast.yaml` (shipped) | `CasterMixin` (shipped) | `mend.yaml` Spell row + `mending.yaml` Condition row | `SpellCatalogue` warms by class â; `ConditionCatalogue` warms `/platform/idea/Condition/**` â | `targeting: creature` |
| sepsis | â | â | `wound-sepsis.yaml` | `ConditionCatalogue` â; `Contamination.behaviorOf` reads the pathogen dir â | n/a |
| prosthetic | `inventory/wear.yaml` (shipped) | `WearableMixin` (shipped) | `peg-leg.yaml`, `hook-hand.yaml`; stocked on the shelf | pack installed | `slotClaims` names `legs` / `hands` â `covers` slots, never anatomy-disabled |

â  The arg-gate column is the binder: a `requires:` naming a mixin the
real target does not compose is refused before any controller runs and no
controller test can see it. Every new view is exercised from the wire.

---

## Acceptance-criteria coverage

| requirements acceptance line | waves |
|---|---|
| bare ground vs clinic cot show different, watchable recovery; a carer shortens it further | W-A1 (k), W-A6 (carer), drive 2â3 |
| every wound the world can inflict has a treatment that resolves it | W-A3 (dose/warm/cool + resolve bodies), W-A4 (set/operate), drive 1, 5, 6 |
| dress or splint, log off, return further along | W-A2, drive 4 |
| the infirmary measurably shortens recovery â the physician's presence does real work | W-A6, W-A1 (cot), drive 3 |
| dirty hands â fester later; clean â not; the player can tell | W-A5, drive 7 |
| a caster who mends visibly pays (their vigour drops) while the patient improves | W-B1, drive 8 |
| the bill differs by whose work it interrupts; the destitute still recover | W-B2, drive 9 |
| a survived grave wound leaves a scar in the description; hard work re-injures a half-healed break; a lost limb can be replaced by a worn prosthetic | W-B3, W-B4, drive 10 |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (per wave, `pnpm test:near` + the touched pack's vitest):** every
  law change in `Condition.ts` / `Vitals.ts` is pinned by a test that
  advances a manual clock (the `Trauma.behaviors` / `dying-disconnect`
  shapes). Controller tests prove prose and refusals only â they skip the
  binder.
- **Drive-only claims:** that `treat` is afforded (W-A0); that a
  restored body re-seats on its cot (W-A2); that a fracture is reachable
  from content (D18); that the nurse acts in a booted room; that `menu`
  quotes the customer's price; that a peg leg is buyable and wearable.
- **The drive** is `packages/wire/tests/recovery.dirty.wire.test.ts` and
  every checkpoint must be able to fail: assert the **refusal note is
  absent** and the state changed (a severity read from `assess` before
  and after), never that a string is defined.
- **`pnpm test` runs twice:** before the Stage A MR opens, before the
  Stage B MR opens (and at each `/finalize`). Nothing in between.
- **`lint:family`** at every wave; the specific gates in Â§ Convention
  conformance are the ones expected to bite.

---

## Risks & opens

1. â  **`Postured.convalescence` as a second field** (D2) versus raising
   the cot's `restQuality` past 2.0. The plan chose the field so a clinic
   cot is not a better night's sleep than a home bed. If the user would
   rather have one number, set `cot restQuality: 2.5` and drop the field
   â a 10-line change in W-A1.
2. â  **The `treat` affordance finding** is a shipped-defect claim from a
   grep; W-A0 proves it on the wire before fixing it. If the wire says
   `treat` already answers, find who affords it and record that instead.
3. **Re-seat on restore** (W-A2): if a materialized body does not re-occupy
   its rest surface, the promise *"log off on the cot, come back mended
   at cot rate"* degrades to floor rate. The fix is on `Posed`'s restore
   path; scope it in W-A2, do not fudge `k`.
4. **`Exerting.exert`'s final shape** on master (D15) â read it after the
   merge; the hook goes where the endurance step already reads the body.
5. **The fracture source** (D18): if the spike-pit landing is a contusion
   and a deadfall must be added, that is a newbie-wilds content change â
   small, but the user may want to place it.
6. **The deed text for scars and the `look` sentence** are prose; keep
   them one line each and never numeric.
7. **`Contamination.behaviorOf`** may key on a material catalogue entry
   rather than the Condition row â read `lib/spoilage/Contamination.ts`
   in W-A5 and give the sepsis organism whatever the food pathogens have. ✔ RESOLVED at plan time: resolution is `MaterialApi.pathogenBehaviorOf(key)` (Metabolic.ts:1326, Vitals.ts:1775); a `Condition/pathogen/` row carries `pathogenBehavior:` INLINE — `staph-aureus.yaml` (Critical file 14) is the exact template (`signature: [{kind: reserve, reserve: hydration, pctPerHour}]`, `progression.law: logistic`, `contagion: null`). No `Contamination.ts` read needed; D11 mirrors it.
8. **Two MRs** (D17) vs the one-MR-per-build habit. The plan recommends two
   for review size and because L4 is the slate's "first to cut".

No fork here needs a user answer before the build starts; each is a
decision with a named fallback.

---

## Deferred seams

Clean attach points, each leaving as the slate that owns it.
- **The absent body's conduct** (an autonomic-defense stance for a linkdead/unpiloted body; the combat-log-vs-bad-connection dilemma, where intent is undetectable) → [absent-body-slate](../slates/tails/absent-body-slate.md). Recovery ships only the intent-agnostic *convalescence-requires-safety* gate (D3a); the body's conduct under threat is combat + connection's.

- **Part-as-Stuff promotion** (a severed limb as an object; transplants) â
  `physiology-slate` Â§ 7h. Seam: `severPart` and the derived
  `ownFunction` read; the prosthetic never stored anatomy state, so
  promotion changes no persistence.
- **The anatomy gate admitting a prosthesis on a `bodyPart`-bound slot**
  (a hook that re-enables `hand:left` wielding) â `sever-gameplay-slate`.
  Seam: `Slotted.canOccupy` Part 0 + `ProstheticMixin.forParts`.
- **The temporary limp from an un-set fracture** â `physiology-slate`
  (the requirements declined it). Seam: `mend` reads `dressed`; a
  `structuralIntegrity` derived from `careQuality Ã time` would feed
  `capacityScalar`.
- **A clearance-capacity pharma multiplier** (`BodyCapacity.ts:27` has
  the read and no multiplier) â `pharma-slate`. Seam: the `convalescence`
  effect kind is the shape a drug's rate effect would take.
- **Protein â healing** (build-3's `protein` reserve comment: *"Healing
  may read the same pool later"*) â `metabolism-slate`. Seam: one more
  term in `convalescenceFactor`.
- **A wand of mending** â `magic-items` (one row, plus its bands).
- **Contagion from a septic wound** â `disease-slate`. Seam: the
  sepsis row's `contagion: null`.
- **Soiling producers beyond treatment** (butchering, mining, the sewer)
  â `bathroom-slate`. Seam: `HygieneMixin.soil()`.
- **Graded clinical judgment for the nurse** â `medic-judgment-slate`.
  Seam: the brain calls `applyTreatment` and never `treat â¦ for`.

---

## Critical files

Read first, in this order:

1. `docs/requirements/recovery-requirements.md`
2. `packages/server/src/mud/platform/idea/Condition.ts` â `Trauma` @154,
   `HARM_DEFAULTS` @220, `TraumaBehavior` @660, the nine behaviors
   @721â1100, `Condition` @1150
3. `packages/server/src/mud/lib/vitals/Vitals.ts` â `reconcileConditions`
   @1848â2200, `ownFunction` @977, `capacityScalar` @1107, `severPart`
   @1404, `afflict` @2416
4. `packages/server/scripts/check-condition-arms.ts` â the rule D3 obeys
5. `packages/server/src/mud/platform/idea/cmd/medical/TreatController.ts`
6. `packages/server/src/mud/platform/idea/cmd/retail/OrderController.ts`
   @245â332
7. `packages/server/src/mud/lib/metabolism/Metabolic.ts` @240 (`POSTURE_
   BASE`), @579â700 (the guards + `integratesLongAbsence`), @994
   (`coupledRecovery`), @1340 (the infection producer), @1448
   (`applyAntidote`)
8. `packages/server/src/mud/lib/slot/Postured.ts`, `lib/character/Posed.ts`,
   `lib/slot/Slotted.ts` @328â470, `lib/slot/Wearable.ts` @247â500
9. `packages/server/src/mud/lib/attendant/AttendanceEngagement.ts`,
   `api/scheduler.ts` @60â160, `lib/behavior/brain.ts`, `lib/behavior/
   shifts.ts`
10. `packages/server/src/mud/lib/craft/Serviceable.ts`, `lib/vitals/
    Dressing.ts`, `platform/thing/WaterFixture.ts` @49â60, `lib/fire/
    Furnace.ts` @109
11. `packages/server/src/mud/lib/magic/Effect.ts` @255â300, `platform/idea/
    api/MagicLogic.ts` @700â760, @1205â1260, @1545â1590;
    `packages/content/arcane-library/content/stuff/idea/magic/Spell/
    transfer.yaml`
12. `packages/server/src/mud/platform/thing/Tariff.ts`, `lib/commerce/
    PricedOffer.ts`
13. `packages/content/terminus/content/world/terminus/infirmary/*`;
    `packages/content/trade-medicine/{pack.yaml,package.json,src/**}`;
    `packages/content/trade-smithing/src/thing/Whetstone.ts` + its
    `sharpen.yaml`; `packages/content/trade-tailoring/.../tailor.yaml`
14. `packages/content/platform/content/platform/idea/Condition/pathogen/
    staph-aureus.yaml`, `magic/overchannel-strain.yaml`, `mortality/
    recovering.yaml`; `packages/server/scripts/check-pathogens.ts`
15. `packages/content/species-and-names/.../BodyPlan/biped.yaml`
16. `packages/wire/tests/injury.wire.test.ts`, `world-scan.dirty.wire.
    test.ts` @238
17. After the merge: `packages/server/src/mud/lib/exertion/Exerting.ts`

---

## Drive record

*(appended at build time)*

The checkpoints the wire file must carry, and what each must be able to
fail on:

0. `treat` on a guest â a `no-wound` refusal, not `unknown-verb`.
1. Fall through the spike pit (or spring the deadfall) â `assess` shows
   `a fracture of â¦`; `treat` says *"It wants setting, with a splint."*;
   at the infirmary, `set <self> with splint` â `assess` shows `a set
   fracture`.
2. Read severity on the floor after N game-minutes, then lying on the cot
   for the same N â the cot's delta is larger; a home bed's is between.
3. `tend` from a second session with medicine competence (or Aldis on
   shift) â the delta grows again; walking out of the room â it does not.
4. Close the session with a set fracture; reopen after M game-hours â
   severity is lower than at close by at least the floor rate Ã M.
5. Spring the deadfall (torso) â `a rupture of â¦`; `treat` says *"It wants
   surgery."*; `operate` at the infirmary â `a closed rupture`.
6. Tread the step-dart â `assess` shows venom signs; `dose` with the vial
   â the signs clear on the next `assess`.
7. Two sessions, each cut on the glass alley: one dressed by a treater who
   has not scrubbed, one by a treater who has â after the incubation, the
   first reads *festering*, the second does not.
8. A caster casts `mend` at a wounded session â the caster's `spells` /
   `assess` shows endurance dropped; the patient's `assess` reads *mending
   well*.
9. `menu` at the infirmary from an employed session and an unemployed one
   â different `treatment` prices; the unemployed, unpaid body's severity
   still falls.
10. Swing a pick (or any 350 W act) on a half-knit set fracture â `assess`
    shows the fracture worse and un-set; a session whose grave laceration
    has cleared â `look` shows the scar; a peg leg bought at the shelf is
    refused on a whole leg and worn on a severed one (the sever itself is
    unit-proven â a wizard cannot be the drive).
