# Injury — implementation plan

Executes [injury-requirements.md](../requirements/injury-requirements.md).
**Kind:** feature. **Leads from:** kernel (Stages A + B), content (Stage C).
**First consumer:** the newbie-wilds crossroads + the Sunken Delve (shipped
content that wounds people today). **Stage C is the declared cut line.**

What is being built: a wound that costs a **capacity** rather than a
number, over an anatomy that finally has a brain, a spine and a liver;
wounds that are **interior** (invisible, undressable, bleeding into a
cavity); blood loss that produces **falling pressure and shock** before
the dying window; a limb that can be **severed** and stays severed across
a login; two new ways to be hurt — **cold** (a heat pump that cooks the
caster) and a **caustic** (burns without heat, keeps working until washed
off) — each a real channel through the same door everything else uses;
and, in Stage C, delivery past the medieval (a bow, a firearm) with
`penetration` finally given its armour consumer.

⭐ **D21 — ONE MR.** All fourteen waves (A0–A5, B0–B4, C0–C2) land on one
branch and open one MR. Stage A alone is six waves — above the ~4-wave
ceiling the requirements warned about — and the planner proposed two
MRs on that ground; **the user heard it and chose one review** (*"one MR,
not two. just give me one thing to review."*). Recorded as their call.
⭐ **With one MR, the cut line is the only release valve left:** if the
build runs hot the MR ships **A + B** and Stage C (W-C0…W-C2) is cut —
a build-scope decision, never a second MR. Nothing in B is cut before C;
the frost spell is the falsifiable-prediction content and stays. *Why C
is the cut and not B:* C is the lens-5 stage — the mechanism holds across
epochs and only the delivery changes — while A + B carry lenses 1–4.
Cutting C loses the **demonstration** of lens 5, never the property.

---

## Grounding

Every fact below was verified by opening the file this cycle on
`design/harm-survey`. Paths are repo-relative; `mud/` means
`packages/server/src/mud/`. Line numbers are current at plan time.

### The pipeline (what an insult goes through today)

- **`InflictSpec`** — `mud/api/condition.ts`. Two variants only:
  `EnergyInflictSpec { mechanism: Exclude<InsultKind,'shock'>, site,
  energy, shieldFacing? }` and `ShockInflictSpec { mechanism:'shock',
  site, current: Quantity<'A'> }`. `InflictOutcome = { trauma, afflicted }`
  — no layer trace, no residual.
- **`ConditionLogic.inflict`** — `mud/platform/idea/api/ConditionLogic.ts:221-235`
  forks three ways: `shock` first (`inflictShock`, skips the fold), else
  `Channels.isChannel` → `inflictThroughStack` (`:890-975`), else
  `inflictPassthrough` (`:984-1010`, `'tearing'` only, hard-codes
  `avulsion`).
- **`resolveCoveringStack`** is a module-private function at
  `ConditionLogic.ts:116-142`, over `Attired.coveringAt`
  (`mud/lib/slot/Attired.ts:578-612`, outside-in by `LAYER_DEPTH`).
- ⚠⚠ **`onset()` runs BEFORE `canAfflict`/`afflict`** at all three sites:
  `ConditionLogic.ts:968`, `:1005`, `:1046` call
  `TRAUMA_BEHAVIOR[t].onset(target, trauma)` then `target.afflict(trauma)`.
  The veto lives inside `Vitals.afflict` (`mud/lib/vitals/Vitals.ts:1804-1809`)
  immediately before `conditions.push` (`:1830`). Every shipped `onset`
  mutates only the `Trauma` value (`t.bleeding = true`;
  `t.severity = max(…)`) — none touches the host — so reordering to
  afflict-then-onset is behaviour-preserving for a landed wound.
- **`channelDefaultType`** — `ConditionLogic.ts:58-74`, an exhaustive
  `switch` with no default: **adding a channel is exactly one compile
  error**. Everything else is silent: `materialHeight`'s `default:` arm
  (`mud/platform/idea/api/MaterialLogic.ts:333`, ratio 0 → floor 0.6),
  `attenuateImpl`'s non-mechanical passthrough (`:420`),
  `resolveTraumaImpl`'s `return null` (`:451`), and
  `DeliveryProfile.toInflictSpec` (`mud/lib/combat/DeliveryProfile.ts:218`,
  `heat → null`; anything else falls to the mechanical arm).
- **`Construction.responseFor`** throws for any non-mechanical channel
  (`mud/lib/material/Construction.ts:507-522`); `attenuateImpl` intercepts
  thermal channels first (`MaterialLogic.ts:403-412`).
- **The fold has three architectures:** mechanical = token table × property
  height × grade/condition (`attenuateImpl :394-429`); thermal = inverted
  conductivity × layer depth (`heatAttenuationFraction :370-392`, keyed on
  `Channels.isThermalChannel`); electrical = series resistance upstream,
  bypasses the fold. Dials: `packages/content/platform/content/settings/response.yaml`
  (24 keys, `response.*`; heat's are `response.heat.baseAttenuation` /
  `insulationRefConductivity` / `depthFactor`); shock's live in
  `settings/electricity.yaml`. Keys are declared by hand in
  `mud/lib/config/AppSettings.ts` (`AppSettingKeys`, e.g. `:676`, `:728`).
- **Legibility precedent gap:** `AnalyzeResponseController.ts:129`
  (`mud/platform/idea/cmd/perception/`) and the pip line
  (`mud/lib/material/Constructed.ts:114`) both iterate
  `MECHANICAL_CHANNELS` only. `previewBandImpl` (`MaterialLogic.ts:480-495`)
  itself calls `attenuateImpl`/`resolveTraumaImpl`, which already handle
  thermal channels — the omission is in the two loops, not the chokepoint.
- **`Channel.ts`** (`mud/lib/material/`): `CHANNELS = ['edge','point','blunt','shock','heat']`,
  `MECHANICAL_CHANNELS`, `THERMAL_CHANNELS = ['heat']`, static holder
  `Channels` with `isChannel` / `isMechanicalChannel` / `isThermalChannel`.

### Trauma + the body

- **`TraumaType`** — `mud/platform/idea/Condition.ts:103-109`:
  `laceration | puncture | fracture | contusion | avulsion | burn`.
  `InsultKind = Channel | 'tearing'` (`:127`). `Trauma` (`:130-169`): nine
  fields, **no severed/missing field**.
- **`TraumaBehavior`** (`:493-518`): `onset/tick/resolve/reopen/describe` +
  `signature?: readonly VitalEffect[]` + `resolution?: string`.
- **`VitalEffect`** (`:406-445`) is a four-kind union: `vital` (perHour on a
  sign), `reserve` (pctPerHour), **`capability { disables:'slots-at-site',
  aboveSeverity }`** (read by `Vitals.isSlotImpairedByCondition`
  `:1005-1035`, table-driven), `expression { bands }`. Used by
  `FRACTURE_BEHAVIOR` (`:656`, `aboveSeverity: FRACTURE_IMPAIR_SEVERITY`)
  and `BURN_BEHAVIOR` (`:687`, `aboveSeverity: 1`). **No Kind-A `Condition`
  row authors a `capability` effect** (grep of `packages/content`), so the
  kind has exactly two engine-table users.
- **`HARM_DEFAULTS`** (`:179-242`): `BLEED_PER_SEC 0.002`, `CLOT_SEVERITY
  0.5`, `FRACTURE_IMPAIR_SEVERITY 0.5`, `AVULSION_SEVERITY_FLOOR 2`,
  `LIMP_DRAIN_PER_SEVERITY 4`, `EXSANGUINATION_DYING_WINDOW_SEC 120`,
  `MAX_REASONABLE_GAP_SEC 4h`. **No sever threshold exists.**
- **`LACERATION_BEHAVIOR`** (`:552-585`): an open bleed holds severity and
  drains `BLEED_PER_SEC · severity · s`; it does **not** self-clot;
  `resolve` (dress) arrests it; `reopen` re-arms above `CLOT_SEVERITY`.
  `AVULSION_BEHAVIOR` (`:702-718`) floors severity then delegates to
  laceration; the documented sever seam is its `onset`.
- ⚠ **`avulsion` is unreachable from `resolveTraumaImpl`** — the edge
  channel always yields `laceration` (`MaterialLogic.ts:453-455`); avulsion
  arrives only via `'tearing'`, which no combat, trap, spell or natural
  attack produces (`NaturalAttackSpec.channel: Channel`,
  `mud/lib/combat/NaturalAttack.ts`; `HazardDelivery.channel: Channel`,
  `mud/lib/hazard/HazardDelivery.ts:56`).
- **`VitalsMixin`** (`mud/lib/vitals/Vitals.ts`): `bodyPartDeltas:
  Record<string, BodyPartDelta>` (`:515`, `fieldMeta` `{persistent,
  runtimeState}` `:480` — so it rides `PersistableApi.capture` and survives a
  login). **`BodyPartDelta` has one field, `missing?: boolean`**
  (`:156-159`). `getParts()` (`:869-878`) re-resolves the plan per call;
  `getPart(key)` (`:880-882`) is a linear find, called once per blow
  (`ConditionLogic.ts:938`). **Nothing writes `missing: true`.** Readers:
  `getInjuredParts()` (`:885`, misnamed — returns *missing* parts),
  `isSlotDisabledByAnatomy` (`:899`), and the one downstream consumer
  `Slotted.canOccupy` (`mud/lib/slot/Slotted.ts:337`) — which gates only
  **new** occupancy: a severed hand keeps its sword. `Slotted.occupy`
  throws a bare `Error` on `!canOccupy` (`Slotted.ts:383`).
- **`drainForLimp`** (`:830-845`) sums leg laceration/avulsion severity
  and never consults `missing`; called from
  `mud/platform/idea/api/LocomotionLogic.ts:402`.
- **`getConditionBand()`** (`:736-783`) loops every `VITAL_SIGNS` entry
  and adds +1 severity per out-of-band sign — driving a currently-dead
  sign counts immediately. **`getConsciousness()`** (`:790-826`) reads
  `bvFraction < 0.7`, `spo2 ≤ min`, and a hard-coded
  `site.startsWith('body.head') && severity ≥ 0.5`.
- **`reconcileConditions()`** (`:1302-1600`), in order: burden stages;
  clock gate; partition; trauma arm (`:1373`, presence-freeze); shock arm
  (`:1421`); sustained arm (`:1480`); affliction arm (`:1512`); trauma sweep
  (`:1530`); dying clock (`:1552`, no freeze/gap guard); **bleed → dying
  floor** (`:1567`, `bv ≤ survivableMin → beginDying('exsanguination')`);
  electrocution floor (`:1584`). `applyEffects` (`:923-963`) integrates
  `vital`/`reserve` rates; `capability`/`expression` are no-ops there.
- **`Vitals.afflict`** (`:1804-1832`): `canAfflict` veto → stamp
  `inflictedBy` for afflictions → `conditions.push`.
- **`VITAL_SIGNS`** (`:91-101`): seven. **Confirmed undriven:
  `respiratoryRate`, `bloodPressureSystolic`, `bloodPressureDiastolic`** —
  every `setVitalSign` writer enumerated (`Condition.ts:538` bloodVolume,
  `ThermalRegulation.ts:558` coreTemperature, `Respiration.ts:453/:504`
  spo2, `Metabolic.ts:932`, `Vitals.ts:1462` heartRate). Defaults
  (`UNIVERSE_DEFAULT_VITAL_PROFILE :202-210`): BP 120/80 with
  survivableMin 70/40; bloodVolume baseline 5 L, survivableMin 3.2 L —
  i.e. the dying window opens at **36 % loss**.
- `check-condition-arms.ts` gates the arm count at **5** (`ARM_CEILING`,
  `packages/server/scripts/check-condition-arms.ts:84`) — an arm is a
  bound subset of the collection advanced over time (`:220-228`).

### Anatomy

- **`BodyPart`** — `mud/platform/idea/species/BodyPlan.ts:82-111`
  (NOT `lib/`): `{ key, parent, tissues, governs?: string[], severable?,
  innervatedBy?, suppliedBy? }`. ⭐ **The `governs` rename already
  shipped** (zero `governsVital` anywhere); its own comment says *"Vital-
  sign keys today; capacity keys later, which is physiology's axis."*
- ⭐ **`governs` is already the interiority predicate and nothing reads
  its value.** All five production readers are
  `if (part.governs?.length) continue;` — `BodyPlan.getPartSurfaceFraction:477`
  and `Attired.ts:646/660/685/705` (`bodyInsulation`, `windproofing`,
  `concealmentOffset`, `attentionFactor`).
- `innervatedBy` / `suppliedBy`: **zero authored rows, zero readers.**
  `severable`: authored on every limb + head in `biped.yaml`, **zero
  production readers.** `setBodyParts` (`BodyPlan.ts:374-405`) validates
  key/duplicate/tissues/parent only — it does **not** validate `governs`
  values.
- **`biped.yaml`** — `packages/content/species-and-names/content/stuff/idea/species/BodyPlan/biped.yaml`:
  12 parts; organs `body.torso.heart governs:[heartRate]` (muscle 0.3 kg),
  `body.torso.lungs governs:[respiratoryRate]` (flesh 1 kg). Covering slots
  head/torso/legs/feet/hands all `capacity: 4`; `hand:left`/`hand:right`
  (Wieldable) attach at `body.arm.*.hand`; `cranial` at `body.head`.
  ⚠ `body.arm.left`/`right` are covered by nothing (no sleeves).
  **`quadruped.yaml`** (`:45-92`): torso, head, four legs, heart, lungs.
- `SlotSpec` (`mud/lib/slot/Slotted.ts:86-94`); its `:84` comment claims
  `covers` has "no consumer this build" — **false**, four live consumers
  via `getSlotsCovering` (`BodyPlan.ts:447`).
- Tissue materials ARE authored with the mechanical pair
  (`packages/content/base-library/content/stuff/idea/material/tissue/bone.yaml`:
  hardness 100 MPa, toughness 6; muscle 2/3; flesh 1/1) and nothing in the
  body model reads them; `_tissueMaterial` is threaded to
  `resolveTraumaImpl` and dropped (`MaterialLogic.ts:434`).
- **Combat's site choice** — `CombatLogic.siteFor` (`mud/platform/idea/api/CombatLogic.ts:2606-2611`):
  `body.torso` by default, `body.head` on an `open` band. The blow's energy
  (`:2436-2440`) is `energyFor(band) × energyScale × instrumentDeliveryScale
  × naturalMassScale`; band energies (`settings/combat.yaml:110-123`):
  steady 1.2 · pressed 1.6 · reeling 2.2 · broken 3 · open 4.5.
  `naturalAttacksFor` (`:574-583`) prefers `Species.naturalAttacks`, else
  the legacy `CombatantMixin.naturalAttackChannel`. `wieldedWeapon`
  (`:4082-4102`) skips a grip slot `isSlotImpairedByCondition` reports.
- **Natural attacks:** 16 `homo/*` species author `[{key: fist, channel:
  blunt, massScaled: true}]`; **the wolf species row authors none** —
  `newbie-wilds/.../agent/wolf.yaml` carries the legacy
  `naturalAttackChannel: point`.
- **Traps** (`packages/content/generic-objects/content/stuff/thing/traps/`):
  spike-pit `point 3` at the feet (placed `delve/corridor-2.yaml` props),
  step-dart `point 2` + venom (corridor-1), pressure-blade `edge 2`
  (corridor-3). **No water source exists anywhere in newbie-wilds**
  (`UnboundedReceptacle` rows: `fixture/basin`, `fixture/water-butt`,
  `vessel/urn`, hospitality's `water-tap`, Duncan Hall's `tap`).

### Surfaces

- **`assess`** — `mud/platform/idea/cmd/perception/AssessController.ts`:
  band phrase → dying readout → affliction readout (signs vs names by
  competence, `:145-197`) → wound list (`TRAUMA_BEHAVIOR[t].describe`,
  severity shown to `precise` readers, `:199-213`). **It lists no parts.**
  `precise = isSelf || medBand ∈ {proficient, expert}`; `named =
  competent || precise`.
- **`treat`** — `mud/platform/idea/cmd/medical/TreatController.ts`:
  `resolutionOf` (`:130-137`) reads `TraumaBehavior.resolution`;
  `mismatchLine` (`:140-155`) has a word table (`dressing, fluid, medicine,
  rest, warmth, cooling, air`) and **falls back to the raw token** for an
  unknown one — so a new token reads "It wants surgery." with no code.
  `pickWound` filters by `resolutionOf(t) === by` (`:492`).
- **`wash`** — `platform/content/platform/cmd/crafting/wash.yaml` →
  `mud/platform/idea/cmd/crafting/WashController.ts`: afforded by a
  reachable water source (`UnboundedReceptacle` environment
  contribution); washes anything soiled or dirty.
- **`equip`** — `mud/platform/idea/cmd/inventory/EquipController.ts`
  claims slots via `giver.occupyAll` (`:545`) inside a `try` whose
  `catch` (`:149`) discards the reason; refusals are `controller-rejected`
  notes (`:274`, `:592`, `:644`).
- **`analyze patient`** lives in the `trade-medicine` pack
  (`packages/content/trade-medicine/src/idea/cmd/perception/AnalyzePatientController.ts`).

### Magic + thermal

- **`InjectChannelEffect`** — `mud/lib/magic/Effect.ts:46-78`: `channel,
  energy?, voltage?, locus?, joules?, site?, resist?, self?`. Author-legality
  of a channel is one edit: `Effect.ts:424-431` validates against `CHANNELS`.
- **`MagicLogic.execInjectChannel`** (`mud/platform/idea/api/MagicLogic.ts:1327-1397`):
  shock arm (inside `deliverAt`); body arm (inside `deliverAt`, `inflict`
  with `energy × potency`, stamps `magicOrigin`); ⚠ **object arm
  (`:1391-1396`) is outside `deliverAt`** — no reachability, no band gate,
  no provenance.
- ⚠⚠ **No caster thermal seam runs.** `absorbWasteHeat` (`:903-919`)
  early-returns unless `MixinApi.isCharged(endpoint)`; its only call is the
  item-discharge path (`:880`); `resolveCastImpl` (`:628`) never calls it.
  `magic.wasteHeatFraction` (0.1) is unused on the cast path.
- **Thermal primitives:** `Thermal.depositHeat(joules)` accepts negative
  joules (`mud/lib/thermal/Thermal.ts:354`). ⚠⚠ **But a deposit does not
  reach core temperature.** `ThermalRegulationMixin` (`mud/lib/thermal/ThermalRegulation.ts`)
  drives `coreTemperature` per 60-s slice (`integrateThermalSlice`): an
  endotherm whose effective ambient is within `[setpoint − 8 − clo,
  setpoint + 8]` is **pinned to the setpoint** (`setCore(setpoint)`) at
  zero cost; heat stress spends hydration and pins; only out-of-fuel/
  out-of-water bodies drift. The mixin has no internal heat-production
  term, so heat put into the body is erased on the next slice.
  `setSetpointK` (`:149`) has **zero callers** outside `lib/thermal/`.
  `THERMAL_DEFAULTS` (`Thermal.ts:62`): `SETPOINT_K 310`, `BAND_HALF_WIDTH_K
  8`, `HEAT_SPEND_PER_DEGREE 0.06`, `DEFAULT_SPECIFIC_HEAT 4186`,
  `REG_STEP_SEC 60`. Hyperthermia spawns above `survivableMax` (315 K)
  via `reconcileThermalCascade` (`docs/subsystems/thermal.md:197-203`).
- **Cost:** `SPELL_COST_MODELS = ['potential']` (`mud/platform/idea/magic/Spell.ts:60`);
  `costOf` (`MagicLogic.ts:594-604`) has one arm; the catalogue drops a row
  naming an unknown model (`SpellCatalogue.ts:235-242`). Spell `cost` is
  otherwise unvalidated (`numberOr(d.cost, 0)`, `:258`); firebolt authors
  `cost: 20` against `joules: 900000`.
- **Spell rows live in the `arcane-library` pack**
  (`packages/content/arcane-library/content/stuff/idea/magic/Spell/*.yaml`,
  root `/arcane-library`), NOT `arcana` (`/system/arcana`, whose own
  `pack.yaml` says *"a class or row that exists for one spell is the arcane
  library's"*). `arcana` ships the `magic.*` dials
  (`packages/content/arcana/content/settings/magic.yaml`).
- **The cooling prediction** — `docs/arcane-science.md:436-482`:
  `W ≥ Q · (T_hot − T_cold) / T_cold`; realistic device at 40 % of Carnot;
  near-ambient COP ≈ 7 (100 kJ moved ≈ 14 τ); the caster absorbs **Q + W**;
  *"Destroy·Fire is limited by thermoregulation, not by mana."*

### Stage C

- `DeliveryProfile.ts:30-33`: `penetration` "deliberately absent … pending
  an armor consumer" — satisfied now. `ENERGY_SOURCES = ['muscle',
  'stored-elastic','chemical']` (`EnergySource.ts:33`), only `muscle` has a
  caller (`ThrowController.ts:186` builds the profile and calls
  `ConditionApi.inflict`; `throw … at` initiates through `CombatApi.initiate`).
  No launcher class, no `shoot` verb, no projectile row exists
  (`grep deliveryProfile|energySource|projectile` over content: nothing).
- **Every torso armour piece is placed nowhere** — `generic-objects/.../armor/
  {padded-gambeson, mail-hauberk, steel-breastplate, bronze-breastplate,
  hide-jerkin, leather-boots}.yaml` are referenced by no `props:`, `cast:`
  or `stockLines`. The Terminus counter
  (`packages/content/terminus/content/world/terminus/general-store/counter.yaml`)
  stocks the clasp knife at 6 (the only weapon sold anywhere); the fog
  hollow's rack (`newbie-wilds/.../crossroads/hollow.yaml`) holds a spear,
  sword, shield and whip. The long meadow (`crossroads/longmeadow.yaml`)
  has `extent: 12` and nothing in it.
- `COVERING_PROFILES` already says `mail × point = fail` and `plate × point
  = resist` — so a thrust already beats mail; what a round adds over a
  sword is the **plate** case and the *degree*, which is what
  `penetration` scales.

### Conventions checked this cycle

- `props:` / `cast:` are the designations in every row read (`counter.yaml`,
  `shop-floor.yaml`, the delve corridors); `populates:` appears nowhere.
- Locations are `SingletonCartesianLocation` (the meadow, the hollow, the
  corridors); no new room is created by this build.
- The lint roster (`packages/server/package.json`) has 39 `lint:*` scripts;
  `pnpm -C packages/server lint:family` runs them all. Gates this build
  moves are named under *Test & gate strategy*.

---

## Plan-level decisions

Numbered so waves and commits can cite them. Q-numbers refer to the eleven
engineering questions the plan was asked to close.

**D1 — Sever/veto ordering (Q3): afflict first, then onset.** At all three
sites (`ConditionLogic.ts:968`, `:1005`, `:1046`) swap to
`const landed = target.afflict(trauma); if (landed)
TRAUMA_BEHAVIOR[type].onset(target, trauma);`. Every shipped `onset`
mutates only the value, and the pushed record is the same object, so a
landed wound is byte-identical; a vetoed one now sees no `onset` — and
therefore no sever. Side effect worth a line in the commit: the veto now
sees an avulsion's pre-floor severity. Pinned by a test that vetoes an
avulsion and asserts the part is still present.

**D2 — How an avulsion happens (Q4): the edge ladder, not a tearing
channel.** `resolveTraumaImpl` gains the blunt ladder's sibling on `edge`:
residual `≥ response.edge.avulsionThreshold` (seed 3.0) → `avulsion`, else
`laceration`. The `'tearing'` passthrough stays byte-identical (a
passthrough retires by acquiring a mechanism; nothing here needs it to).
`AVULSION_BEHAVIOR.onset` severs when `t.severity ≥
HARM_DEFAULTS.SEVER_SEVERITY` (seed 4.0) **and** the plan marks the part
`severable` (the first production reader of that field). Reachable in
combat: a bladed weapon at the `open` band (4.5) or the wolf's `worry`
(D19) — the drive tunes the two dials. *Why not a `tearing` channel
(confirmed by both deciding lenses, do not re-litigate):* it would ship
with **no deliverer** — nothing a person wields tears; that is what a bear
or a machine does — which is the dead-feature pattern this repo keeps
paying for; and the edge ladder mirrors the blunt→fracture shape players
already understand.

**D3 — The sever is a Vitals verb: `severPart(key)`.** Writes
`bodyPartDeltas[k].missing = true` for the part **and every descendant**
(finding 3 of the physiology slate: sever the arm, lose the hand), then
releases the occupants of every slot whose `SlotSpec.bodyPart` is in the
severed subtree — `MixinApi.isSlotted(self)` narrowing, `ContainmentApi.move`
each occupant to the host's container (a severed hand drops its sword).
Persistence needs nothing: `bodyPartDeltas` is already
`{persistent, runtimeState}` and rides the Anatomy fork slice into a
corpse. `getInjuredParts()` is renamed `getMissingParts()` (its one
reader is itself).

**D4 — Interiority (Q2): confirmed in spirit, widened by one clause,
centralised in one method.** `BodyPlan.isInterior(key)` =
`governs.length > 0 || key is referenced by any part's innervatedBy /
suppliedBy` (a conduit is inside you). The five inline
`part.governs?.length` readers become `plan.isInterior(part.key)`. This is
what lets the spine — which governs nothing and conducts everything — be
interior without a field nobody else needs. `BodyPlan` precomputes the
conduit set in `setBodyParts`.

**D5 — The capacity vocabulary (Q1): a new vocabulary module, not a widened
signature entry.** `mud/lib/vitals/BodyCapacity.ts` — `BODY_CAPACITIES =
['consciousness','locomotion','manipulation','circulation','respiration',
'clearance'] as const`, `FUNCTION_BANDS = ['full','impaired','failing','lost']
as const`, thin `BodyCapacities` static holder (the `Channel.ts` shape).
Named **`BodyCapacity`**, never `Capability`/`Capacity`: `Archetype.CapabilitySlot`
(`mud/lib/archetype/Archetype.ts:154`) and `SlotSpec.capacity` both already
own those words. `governs` values must be `VITAL_SIGNS ∪ BODY_CAPACITIES`
— validated in `setBodyParts` (a typo is a throw at registration, not an
inert organ). `BodyPart` gains **`serves?: string[]`** — the exterior
twin of `governs`: what a limb is *for* (`body.leg.* serves:[locomotion]`,
`body.arm.*.hand serves:[manipulation]`) without making it interior. Both
fields gain readers in the same wave (D6), so `lint:unconsumed-seams`
falls rather than rises.

**D6 — The function axis: two tiers, min along the path, bands at the
surface.** On `VitalsMixin`:
- `functionAt(key): FunctionBand` — internal scalar `f ∈ [0,1]`:
  `own(p) = missing ? 0 : clamp(1 − Σ_traumas-at-p (severity ×
  lossPerSeverity(type)), 0, 1)`; `conduit(q) = missing ? 0 : 1 −
  clamp((worstSeverityAt(q) − CONDUIT_TOLERANCE) / CONDUIT_RANGE, 0, 1)`;
  `f(p) = min(own(p), conduit(parent-chain…), conduit(innervatedBy…),
  conduit(suppliedBy…))`. The parent chain is walked because *for limbs the
  tree is the supply path* (a crushed arm cuts the hand); the root
  contributes nothing (a chest cut does not weaken your hands). Bands:
  `full ≥ 0.75 > impaired ≥ 0.4 > failing > 0 = lost`.
- `capacity(k: BodyCapacity): FunctionBand` — `min(f over parts whose
  governs ∋ k) × mean(f over parts whose serves ∋ k)`; a capacity nothing
  governs or serves reads `full`. One brain → min; two legs → mean (one
  leg gone is a hobble, not a halt).
- Predicates everything else calls: `canGrip(slot)` (the slot's
  `bodyPart` function ≥ impaired), `canBearWeight()` (locomotion ≥
  failing), `isConscious()` is not added — `getConsciousness()` already
  exists and is rewired (D7).
- The per-type weight is a signature term: `{ kind:'function',
  lossPerSeverity: number }` **replaces** `capability` (its two engine
  users, fracture and burn, are re-authored; no content row uses it;
  `check-conditions.ts:40` `EFFECT_KINDS` updated). Weights (in
  `HARM_DEFAULTS`): fracture 1.2 (a 0.5 fracture crosses `impaired`, the
  shipped threshold), avulsion 1.0, burn 0.6, frostbite 0.6, caustic 0.6,
  laceration 0.2, puncture 0.25, contusion 0.1, rupture 0.3. Dials
  `CONDUIT_TOLERANCE 1.0`, `CONDUIT_RANGE 2.0`.

**D7 — Consumers rewired onto the axis (no new guards).**
`isSlotImpairedByCondition(slot)` → `!canGrip(slot)` for a slot with a
`bodyPart` (the anatomy gate `isSlotDisabledByAnatomy` folds into the same
read since `missing → f = 0`); `Slotted.canOccupy` keeps its two calls.
`drainForLimp` → `LIMP_DRAIN_PER_SEVERITY × (1 − locomotionScalar) ×
LIMP_SCALE` (a missing leg finally drains; a healed one stops).
`getConsciousness()` → `functionAt('body.head.brain') ≤ failing` when the
plan has a part governing `consciousness`, else the shipped head-site rule
(a plan without a brain is a data fact, not a guard). `MagicLogic.ts:445`
and `CombatLogic.ts:4093` keep calling `isSlotImpairedByCondition`.
**Wield refusal says why:** `Vitals.slotRefusalReason(slot): string | null`
("your left hand cannot grip — a fracture of body.arm.left.hand");
`EquipController` consults it before `occupyAll` and emits
`controller-rejected reason:'cannot-grip'` + the prose.

**D8 — The roster: four parts, two plans, innervation authored only where
it diverges from the tree.** biped + quadruped gain
`body.head.brain governs:[consciousness]` (flesh 1.3),
`body.torso.spine.upper` (bone 0.6; parent torso),
`body.torso.spine.lower` (bone 0.5; parent `spine.upper`),
`body.torso.liver governs:[clearance]` (flesh 1.5). Arms
`innervatedBy:[body.torso.spine.upper]`, legs
`innervatedBy:[body.torso.spine.lower]` (quadruped: all four legs on
`lower`). Heart/lungs unchanged. `clearance` has a read (`capacity`) and
an `assess` line this build; the toxin-clearance multiplier is pharma's
(deferred seam). Head/limb `severable` stays; organs are not severable.

**D9 — Interior reach (Q10): a depth ladder by cross-section, and
`rupture` is the seventh trauma type.** In `inflictThroughStack`, after
the exterior trauma resolves with severity `s`: if the site has interior
children (`plan.isInterior` ∧ `parent === site`) and `s ≥
response.depth.reachThreshold` (seed 2.0), the excess `s − threshold`
reaches them **largest cross-section first**, one per
`response.depth.stepPerOrgan` (seed 1.0): organ k (0-based) is reached
with severity `excess − k·step` while that is `> response.noWoundThreshold`.
⭐ **The principle is cross-sectional area, not mass:** a bigger organ
presents more cross-section to whatever is coming through, which is *why*
it is reached first. Area is Meeh's `mass^(2/3)` — the formula
`BodyPlan.getPartSurfaceFraction` (`BodyPlan.ts:473-487`) already
computes — so factor it into one `BodyPlan.partArea(key)` that the
surface-fraction walk and the ladder both call, rather than a second
expression of the same idea. ⚠ **Call `partArea`, never
`getPartSurfaceFraction`, for an organ:** that walk opens with
`if (part.governs?.length) continue;` — the interiority predicate — so it
returns **0 for every interior part** by construction. The fraction is
exterior-only on purpose (it answers *"how much of the skin is bare"*);
the ladder wants the raw area. ⚠ The resulting order is **identical** to
raw-mass order (the map is monotonic): this is justification and one
shared method, not a behaviour change — nobody should "optimise" it back
to mass. *Lens 2 is the real win:* an author tunes which organ is reached
first by authoring its **mass**, a physical fact they author anyway — no
list, no enumeration, no code.
Interior type: `point → puncture`, `edge → laceration`, `blunt → rupture`
when the interior severity `≥ response.blunt.ruptureThreshold` (seed 1.0)
else `contusion` (a concussion, a bruised liver). `rupture` = an interior
bleed: `RUPTURE_BEHAVIOR` delegates `onset/tick/reopen` to laceration,
`resolve` is a no-op, `resolution: 'surgery'` (nothing offers it;
`mismatchLine` already renders the raw token). Each interior trauma is a
separate `Trauma` at the organ's key, landed through the same
`afflict` door, returned on a widened `InflictOutcome.reached?: Trauma[]`.
No roll anywhere: the biggest organ under a site is hit first, a deeper
wound reaches more, and a student can derive both from `assess`.

**D10 — Interior wounds are invisible and undressable, by read.**
`assess`: for a wound at an interior site, an untrained/novice observer
sees nothing; self sees one line *"Something is wrong inside; you cannot
tell what."*; `competent` names the organ; `precise` adds severity —
the shipped competence rule, one clause wider. `treat` with a dressing
excludes interior sites in `pickWound` and, when only interior wounds
remain, refuses with *"There is nothing to dress — the wound is inside."*
Blood lost from an interior bleed drains `bloodVolume` exactly as an
exterior one (the cavity is the floor you cannot see).

**D11 — Circulation (Q8): a derived write in the existing bleed-floor
tail, not a new arm.** In `reconcileConditions` immediately before the
`bv ≤ survivableMin` check: `loss = 1 − bv/baseline`; systolic =
`baseline × (1 − SHOCK_BP_SLOPE × max(0, loss − SHOCK_COMPENSATED_LOSS))`
— ⭐ the compensated plateau is the single most important fact about
haemorrhage and it is modelled on purpose: *a patient can be seriously
bled with a normal blood pressure right up until they are not* (ATLS
class II holds, class III drops). **Diastolic gets its own term, not
"likewise":** `baseline × (1 + SHOCK_DIASTOLIC_RISE × min(loss,
SHOCK_COMPENSATED_LOSS) / SHOCK_COMPENSATED_LOSS − SHOCK_BP_SLOPE ×
max(0, loss − SHOCK_COMPENSATED_LOSS))` (seed rise 0.08) — in class II
the diastolic *rises* while the systolic holds, so the **pulse pressure
narrows**; that narrowing is the earliest sign and the first thing a
clinician reads, and falling both by one slope would teach a simpler,
false thing. Then both fall together. (`SHOCK_COMPENSATED_LOSS 0.15`,
`SHOCK_BP_SLOPE 1.5`, all in `HARM_DEFAULTS`.) Spawn the affliction `/platform/idea/Condition/circulation/hypovolemic-shock`
when `loss ≥ SHOCK_LOSS_FRACTION` (0.30), relieve below `0.25` (the
thermal `ensureAffliction`/`clearAffliction` hysteresis shape, written as
two private Vitals methods). Dying opens at 36 % loss, so shock precedes
it by ~0.3 L — at `BLEED_PER_SEC × severity 2` that is ~75 s of window.
The row: `progression: null` (the driver is here), `signature:
[{kind:reserve, reserve:endurance, pctPerHour:-20}]`, `observableSigns:
[pale, clammy, faint]`, `resolution: {by: fluid}`. Heart rate is **not**
written (the shock arm drives it toward arrest; two writers on one sign is
the two-owners defect `lint:condition-arms` exists for) — deferred seam.
`check-condition-arms --list` must still print 5.

**D12 — `assess` lists the anatomy.** After the band line: one line per
exterior part (and interior parts for `competent`+ observers): key,
function band, and the covering stack outside-in (`coveringAt`), e.g.
`torso — full — steel breastplate over mail hauberk over padded gambeson`.
Self reads all bands; others by the shipped competence rule. This is the
surface that closes AC 8's "see all three counted, outside-in" **in Stage
A**, not C.

**D13 — A missing part shows in the description.** A `markupAugmenters`
contribution on `VitalsMixin` (the `ConstructedMixin` pip precedent,
`Constructed.ts:~95-140`) appends *"missing the left hand"* to the long
description for every missing part with no missing ancestor.

**D14 — `cold` joins `THERMAL_CHANNELS`; `frostbite` is the eighth trauma
type (Q5, Q9).** `CHANNELS` += `'cold'`, `THERMAL_CHANNELS = ['heat','cold']`;
`channelDefaultType` gains the arm (the compile error); `resolveTraumaImpl`'s
thermal branch returns `channel === 'cold' ? 'frostbite' : 'burn'` with
severity `residual × response.cold.severityPerResidual` (seed 1). The
insulation fold is one function and stays one: cold reuses
`response.heat.*` (the dials describe the *covering*, not the direction of
flow); `response.cold.severityPerResidual` is the only new key, in
`response.yaml` (heat's home — electricity's separate file exists because
electricity is its own physics home, and cold is not). `FROSTBITE_BEHAVIOR`:
decaying at `FROSTBITE_HEAL_PER_SEC 0.004`, `signature: [{kind:'function',
lossPerSeverity:0.6}]` (a numb hand cannot grip), `resolution: 'warmth'`
(already in `mismatchLine`'s table). `DeliveryProfile.toInflictSpec`
returns `null` for any `Channels.isThermalChannel` (both), never by name.

**D15 — The frost spell is a heat pump, and the caster pays in heat.**
- `SPELL_COST_MODELS` += `'heat-pump'`; `costOf` gains the arm: `Q` = the
  `inject-channel` effect's `joules`; `T_hot` = the caster's core
  (`getVitalSign('coreTemperature')`); `T_cold` = the target's temperature
  minus `Q / thermalCapacity(target)` (`Thermal.thermalCapacity`), floored
  at 1 K; `W_τ = (Q/1000) × max(0, T_hot − T_cold) / T_cold /
  magic.heatPump.carnotFraction` (seed 0.4, in arcana's `magic.yaml`);
  cost = authored floor + `W_τ`. Downhill pumping costs the floor only.
- **The caster absorbs `Q + W`.** `ThermalRegulationMixin` gains
  `heatLoadJ` (`fieldMeta {persistent, runtimeState}`) and
  `absorbHeatLoad(joules)`; `integrateThermalSlice`'s pinned/heat-stress
  branches shed `min(load, HEAT_SHED_W × slice)` (seed 400 W; zero past
  the wet-bulb ceiling or with no hydration; each joule shed spends
  hydration on the shipped `HEAT_SPEND_PER_DEGREE` scale) and set
  `core = setpoint + heatLoadJ / (mass × cp)` instead of `setpoint`.
  `absorbWasteHeat` (`MagicLogic.ts:903`) gains the body endpoint:
  `isThermalRegulation(endpoint) → absorbHeatLoad(wasteJ + heatMovedJ)`,
  and **is finally called from `resolveCastImpl`** — so a firebolt warms
  its caster by its 10 % waste (≈ 0.02 K, invisible, honest) and a frost
  cast by everything it moved. The body arm of `execInjectChannel` records
  `heatMovedJ` on the context for a cold channel; the object arm moves
  **inside `deliverAt`** (the reachability fix) and cools by
  `depositHeat(−joules × potency)` + `reconcilePhase()` (water freezes —
  the arcane-science's *ice is dear*).
- The row: `arcane-library/.../Spell/frost.yaml` — `verb: destroy, noun:
  fire` (the science's own cell), `cost: 4`, `costModel: {kind: heat-pump}`,
  effect `{kind: inject-channel, channel: cold, energy: [1, 2, 4], joules:
  [60000, 120000, 240000]}`, `requiredBand: novice`. Disciplines
  `magic-destroy` / `magic-fire` already exist in arcana.
- **D16 — the hyperthermia onset moves to `setpoint + 2.5 K`. Settled by
  the lenses, not escalated.** The arithmetic: per τ of mana a
  near-ambient pump puts `COP + 1 ≈ 8 kJ` into the caster, so a mid-depth
  pool (120 τ) absorbs ≈ 1 MJ ≈ **+3.3 K** on a 70 kg body — never the
  shipped onset at `survivableMax` (315 K, +5 K). But the shipped constant
  names the condition at the wrong temperature: **315 K (42 °C) is heat
  *stroke*; clinical hyperthermia is a core above ~38.3 °C.** *Lens 1
  decides:* a player who knows physiology predicts onset near 38.5 °C and
  the shipped model would surprise them *wrongly* — the exact failure
  mode. *Lens 2 agrees independently:* keyed to `setpoint + ONSET_K`, a
  species authors its setpoint and gets a correct onset free, whereas
  keyed to `survivableMax` an author tuning **survivability** silently
  moves the onset of a **different condition**; the fix separates "when
  do I get sick" from "when do I die" into two independently authorable
  facts. Both limbs point the same way, so there was never a fork. So:
  `reconcileThermalCascade` spawns `hyperthermia` at `setpoint +
  THERMAL_DEFAULTS.HYPERTHERMIA_ONSET_K` (seed 2.5); the **lethal dwell
  stays keyed to `survivableMax`** (the build verifies the dwell reads the
  temperature, not the condition's presence; if it reads presence, split
  it). With that, ~92 τ of a 120 pool reaches the row with 28 left —
  drive step 13 as written. Thermal tests and Hearthworks' sealed cellar
  are the collision to re-run, not a decision to revisit.

**D17 — `corrosion` is a third fold branch keyed on what the covering IS,
and `caustic` is the ninth trauma type (Q6, Q9).** `CHANNELS` +=
`'corrosion'` (neither mechanical nor thermal; `Channels.isCorrosion`).
- The **agent** carries its chemistry: `Material` gains one authored field
  `corrosiveTo?: string[]` (material tags it attacks — the closed tag
  vocabulary already authored on every row: `metal`, `organic`,
  `leather`, `textile`, `tissue`…) with `getCorrosiveTo()`. A caustic row
  is content: `base-library/.../material/caustic/quicklime.yaml`
  (`corrosiveTo: [organic, tissue, leather, textile]`, tags
  `[mineral, caustic, alkali]`). The spec carries it: a third
  `InflictSpec` variant `CorrosionInflictSpec { mechanism:'corrosion', site,
  energy, corrosiveTo: string[] }`.
- **A layer resolves by two reads, no hardness anywhere:** if its
  material's tags intersect `corrosiveTo`, the layer is **consumed** —
  `wear(response.corrosion.wearPerContact)` (seed 0.2) and the full
  energy passes; else if `waterAbsorptionCapacity > response.corrosion.
  shedAbsorptionMax` (seed 5 %) the layer **wicks** and passes
  `energy × (1 − response.corrosion.wickAttenuation)` (seed 0.3); else it
  **sheds** and passes `energy × (1 − response.corrosion.shedAttenuation)`
  (seed 0.95). A steel breastplate sheds lye (0.2 % absorption, not
  attacked) — *and is eaten by an acid whose row says `corrosiveTo:
  [metal]`*; a linen shirt wicks it through; a waxed hide sheds. Thick is
  irrelevant; the right material is everything.
- `CAUSTIC_BEHAVIOR`: `onset` sets a new `Trauma.agentActive = true`;
  `tick` grows severity by `CAUSTIC_GROWTH_PER_SEC × elapsed` (seed 0.01)
  while active, capped at `CAUSTIC_MAX_SEVERITY` (4), else decays at
  `BURN_HEAL_PER_SEC`; `resolve` clears `agentActive`; `signature`
  = burn's (function loss 0.6 + the weep); `resolution: 'wash'`.
- **`wash` reaches a body.** `platform/cmd/crafting/wash.yaml` gains a
  second stanza whose target is a person/self, routed to
  `mud/platform/idea/cmd/medical/RinseController.ts` (one view, two
  stanzas, two controllers — the `analyze` precedent; ⚠ never widen the
  glass arg's `requires:`, see antipatterns). Afforded by the same water
  source. It calls `TRAUMA_BEHAVIOR.caustic.resolve` on every active
  caustic wound on the target and says so.
- **The source in the world:** `generic-objects/.../traps/lime-seep.yaml`
  — a `HazardMixin` fixture, **obvious** (never concealed; it is a white
  crust you can see), `delivery: {channel: corrosion, energy: 1.5,
  siteSelector: [feet…], corrosiveTo: [organic, tissue, leather, textile]}`
  (`HazardDeliveryOptions` gains `corrosiveTo?`; `toInflictSpec` emits the
  corrosion variant). Placed in `newbie-wilds/.../delve/pit-below.yaml`
  props (the pit floor is where runoff pools). **And water to wash it
  off:** `/stuff/thing/fixture/water-butt` added to `crossroads/hub.yaml`
  props — the first water in newbie-wilds, which also gives `treat … with
  water` a supply there (a shipped-gap fix in its own right).
- Legibility (Q7, D18 below) covers corrosion.

**D18 — Legibility (Q7): yes, in scope — the loops iterate every folded
channel.** `Channels.FOLDED = [...MECHANICAL, ...THERMAL, 'corrosion']`
(everything that resolves through the covering fold; shock stays
hand-rolled because it resolves by circuit). `AnalyzeResponseController`
and the `Constructed` pip line iterate `FOLDED`; `previewBandImpl` needs
no change (it already calls the branchy `attenuateImpl`/`resolveTraumaImpl`)
except the corrosion preview, which reads a reference agent
(`response.corrosion.previewCorrosiveTo`, seed `organic`). Heat's missing
column is the precedent this breaks.

**D19 — Content wiring in Stage A.** The wolf **species** row authors
`naturalAttacks: [{key: bite, channel: point}, {key: worry, channel: edge}]`
and the agent row drops the legacy `naturalAttackChannel` (the one
content user; the kernel fallback stays for now — deferred cleanup). The
spike pit's `siteSelector` becomes `[body.torso, body.leg.left.foot,
body.leg.right.foot]` (a fall onto spikes takes the gut — the requirements'
own collision line). The Terminus counter stocks `padded-gambeson` (14),
`hide-jerkin` (12), `mail-hauberk` (40), `steel-breastplate` (55),
`leather-boots` (8) — priced against the shipped ladder (bed 45, wagon 95).
Layering is already possible (`capacity: 4` on the torso slot); this is
the reachability that AC 8 lacks.

**D20 — Stage C: `penetration`, one `Launcher` class, one `shoot` verb,
projectiles as stackables.**
- `DeliveryProfile.penetration` = `energyJ / (π (calibreM/2)²)` normalised
  against `response.penetration.referenceJPerM2` (seed 2e6); the profile
  gains `calibreM` from the projectile's `length`-sibling field `calibre`
  (a thrown rock has none → penetration 1). `EnergyInflictSpec.penetration?`
  (default 1) divides the mechanical attenuation fraction: `atten / max(1,
  penetration)`. A musket ball (`point`, ~1.5 kJ, 16 mm) at plate: the
  `resist` token's 0.7 falls toward `fail`; a sword thrust does not.
- `mud/lib/combat/Launcher.ts` — `LauncherMixin` (fields `energySource:
  EnergySourceKind`, `muzzleSpeed: Quantity<'m/s'>`, `projectileTemplate:
  string`, `readySeconds: number`; `Mixins.Launcher` + `MixinApi.isLauncher`)
  composed on **`mud/platform/thing/equipment/Launcher.ts`** = `LauncherMixin(Weapon)`
  — a concrete instanceable class, **never on `Weapon`** (a knife does not
  launch). A bow's melee form is `hafted` so `lint:inert-weapon` passes.
- `mud/platform/thing/equipment/Projectile.ts` — the stackable ammunition
  class (compose the shipped stackable exemplar — verify against `Coin`
  / `lib/stacks` before writing); rows `generic-objects/.../arms/
  {arrow, musket-ball}.yaml` with `mass`, `calibre`, `constructionForm:
  pointed`.
- `shoot <target> [with <launcher>]` — `platform/cmd/combat/shoot.yaml` →
  `mud/platform/idea/cmd/combat/ShootController.ts`, afforded by
  `LauncherMixin` on the wielded launcher (a verb affordance is a static on
  a class). Initiates through `CombatApi.initiate` like `throw … at`; a
  readiness engagement of `readySeconds` (bow 3, crossbow 9, musket 12 —
  the family's tactical point in one number, the full W3/W4 model stays
  slated); consumes one projectile from the shooter's inventory; builds
  the `DeliveryProfile` from projectile mass × muzzle speed; band envelope
  through `CombatApi.bandBetween` (`far` only where the arena affords it —
  the meadow). No NPC shoots (out of scope).
- Rows: `generic-objects/.../arms/{hunting-bow, flintlock-musket}.yaml`;
  Terminus counter stocks bow (18), arrows ×20 (4), musket (70), balls ×10
  (6); the sentry gains a bow? **No** — content behaviour is out of scope.

**D21 — One MR (reversed 2026-09-16).** The header has the decision and
its provenance: the size concern was raised and overruled by the user.
The only remaining lever is the requirements' own cut line — Stage C
leaves the MR's scope if the cycle runs hot; the MR count never changes.

**D22 — Spell costs become honest, and a gate keeps them so.** The
grounding found firebolt authoring `cost: 20` (20 kJ committed) against
`joules: [300000, 900000, 1800000]` (J delivered) — η ≈ 45 at the
uncursed band, against `arcane-science.md` rules 1 and 6 (η ≤ 1). The
census (run by the coordinator, verified here): **firebolt is the only
one of the thirteen spells that declares `joules`**; the other twelve
declare no real-unit delivery. So the fix is one row, one target, and one
gate.
- ⭐ **Why it is cheap:** `joules` feeds the **object arm only**
  (`MagicLogic.execInjectChannel :1391-1396` → `depositHeat` +
  `tryAutoignite`); the **body arm** uses `energy: [1,2,4]`, an abstract
  channel token on the covering-fold scale. Correcting `joules` changes
  what a firebolt does to *things*, not to *people*.
- **The band ladder expresses efficiency** (magic-items: *"blessed means
  EFFICIENT, not benevolent"*): cursed η 0.5 · uncursed η 0.85 (the price
  list's heat row; the science's own worked firebolt is 35.2 τ → 29.9 kJ)
  · blessed η 1.0.
- ⚠ **Verified against the fire substrate — and the real culprit is the
  ignition model, which this build is NOT fixing.** The casting-yard
  dummy (`packages/content/world-seed/content/world/practicum/practice-dummy.yaml`)
  is **1.5 kg of oak** (C = 1.5 × 2000 = 3000 J/K; 293 → 570 K needs
  ≈ **831 kJ**) — its own comment says the mass was chosen so *"one
  competent firebolt's deposit carries it past oak's 570 K"*, i.e. the
  content was tuned to the violation. No `cost` rescues it (831 τ
  against a 120-pt pool) and no mass rescues it either: bulk-heating
  1.5 kg of *anything* to autoignition is hundreds of kJ (straw ≈ 520 kJ).
  **The error is `tryAutoignite`'s model** — it asks whether the whole
  mass reached autoignition (`FireLogic.ts:176-178` + the threshold), and
  real fire ignites a *spot*: a match lights a bonfire. **The local-
  hotspot ignition model is the actual fix, it is a fire-subsystem
  build, and it is deferred (see Deferred seams). Nothing below is that
  fix; it is content the shipped model can represent honestly.**
- **Decision — and it is a compromise, not a clean result:** this build
  is **authoring content around a known model error** — choosing a 40 g
  ignition target because that is what a bulk-temperature check can
  light. Better than an absurd dummy mass, recorded with its arithmetic
  in Deferred seams, and not to be read as the answer. `cost: 30` (a real
  raise, under the science's 35.2 τ worked example) with
  `joules: [15000, 25500, 30000]`; **the dummy stays 1.5 kg and stays a
  dummy** — a firebolt scorches and chars it (real
  `heat` → `depositHeat`, the fuel reserve intact) and does **not** set it
  alight, which is correct under both the physics and the shipped model
  and a better demonstrator: *hit the target* and *set it alight* are
  now different things, which is exactly the distinction the price list
  draws. **One new content row:** a **tinder bundle** ≈ 0.04 kg
  (`world-seed/content/world/practicum/tinder-bundle.yaml`, class
  `/platform/thing/Firewood`, `_materialPath` oak — the one row with an
  `autoignitionTemperature`; C = 80 J/K → 22 kJ to 570 K) added to the
  casting yard's `props:` beside the dummy. The band ladder reads in
  play: a cursed bolt (15 kJ) fails to light it, an uncursed one
  (25.5 kJ) lights it, a blessed one (30 kJ) lights it with margin.
  Forty grams of tinder is correct; forty grams of man-shaped dummy is
  not (a reader would "fix" the mass back and silently restore the bug —
  a number that has to stay wrong-looking to keep a test green is not a
  fix).
- **Second-instance proof:** the tinder is a row of an existing class
  (`Firewood`, the `dry-log`/`wet-log`/dummy class) with a mass and a
  material — a second flammable target is another row, zero code.
- The dummy's stale comment (it explains the violation as a design
  choice) is rewritten to the arithmetic above; its `_materialPath`
  (oak) vs prose (straw) mismatch stays, noted in the comment — a straw
  `Material` row is base-library content nobody has needed yet.
- **Tests that pin the violation, fixed not preserved:**
  `packages/server/src/mud/world/practicum/__tests__/practicum.integration.test.ts:198`
  (*"firebolt ignites the dummy"*, comment *"900 kJ into 1 kg of oak"*)
  becomes two assertions — the dummy is scorched and **not** burning; the
  tinder **is** burning — and the fixture gains `tinderIn(yard)`. No other
  test pins it (`Combustible.test.ts` and `fermentation-distilling.test.ts`
  only mention the words).
- **The gate — `lint:spell-cost`**, `packages/server/scripts/check-spell-cost.ts`,
  the census-then-ratchet shape (`check-does-nothing` precedent: a
  standalone WARN/ERROR script walking every `Spell`-class row across
  every pack root; joins `lint:family` by being a `lint:*` script, no
  list to edit). ⚠⚠ **Channel-aware, never a flat η ≤ 1:**
  - **delivery** (`inject-channel` with `joules` on a channel that
    *deposits* — `heat`, and any future depositing channel): require
    `joules ≤ cost × 1000 × η(channel)` at the blessed band, η from the
    price list (heat 1.0 as the ceiling; the script carries the table
    with the doc section cited beside it).
  - **cooling** (`channel: cold`): **not an η check** — a COP above 1 is
    what a heat pump *means*. Require instead that the row **declares a
    lift**: `costModel: {kind: heat-pump}` present (rule 4: *"cooling has
    no fixed price"* — a flat-cost cold spell is itself the physics
    error). The binding constraint is the caster's thermal budget, which
    W-B2 builds.
  - rows with no `joules` (twelve today) are out of the gate's
    jurisdiction — nothing dimensional to check; `energy` tokens are not
    joules and are not checked.
  - **Ceiling today = 1** (firebolt); the same wave drives it to **0**
    and pins the ceiling at 0.
- Sequenced **before** the frost spell (W-B1 before W-B2) so frost is
  authored under a live gate rather than retrofitted into one.
- Wave references elsewhere in this plan: the frost spell is **W-B2**,
  the caustic **W-B3**, Stage B docs + drive **W-B4**.

---

## ⭐⭐ Host placement

| New thing | Host | What composing it claims |
|---|---|---|
| `BodyPart.serves`, `isInterior()`, conduit set, `governs` validation | `BodyPlan` (`platform/idea/species/BodyPlan.ts`) — data + one method | nothing about hosts; a plan without organs reads every part exterior and every capacity `full` |
| `functionAt` / `capacity` / `canGrip` / `canBearWeight` / `severPart` / `slotRefusalReason` / `getMissingParts` / circulation derive / `markupAugmenters` | `VitalsMixin` (`lib/vitals/Vitals.ts`) | every body has a function axis — a wolf, a frog, a corpse (whose lifecycle makes it moot). Composed on `Creature` only (`lib/creature/Creature.ts:162`); no guard needed because the read degrades to `full` on a plan with no capacities |
| `BODY_CAPACITIES`, `FUNCTION_BANDS` | `lib/vitals/BodyCapacity.ts` (vocabulary module) | — |
| `rupture` / `frostbite` / `caustic` behaviours, `SEVER_SEVERITY`, `lossPerSeverity` weights, `Trauma.agentActive` | the closed engine table in `platform/idea/Condition.ts` | a burn is a burn everywhere; authors write Kind-A rows |
| `hypovolemic-shock` | a `Condition` row in the platform pack (`content/platform/idea/Condition/circulation/`) | warmed by `ConditionCatalogue` like the other 23 |
| `cold`, `corrosion`, `Channels.FOLDED` | `lib/material/Channel.ts` | closed kernel vocabulary — a pack cannot add a channel, by design |
| `corrosiveTo` | `Material` (`lib/material/Material.ts`) | every material *may* say what it attacks; absent = inert, which is every shipped row |
| `CorrosionInflictSpec`, `EnergyInflictSpec.penetration?`, `InflictOutcome.reached?` | `api/condition.ts` | — |
| `heatLoadJ`, `absorbHeatLoad` | `ThermalRegulationMixin` (`lib/thermal/ThermalRegulation.ts`) | every regulating body can carry an internal heat load — true, and exertion will want it next |
| `'heat-pump'` cost model | `platform/idea/magic/Spell.ts` + `MagicLogic.costOf` | a closed union grew by one; a third model is still a conversation |
| `LauncherMixin` | `lib/combat/Launcher.ts`, composed on `platform/thing/equipment/Launcher.ts` **only** | a launcher is a weapon that also launches; `Weapon` itself claims nothing new |
| `Projectile` | `platform/thing/equipment/Projectile.ts` | ammunition is a stackable tangible; nothing else changes |
| `RinseController`, `ShootController` | `platform/idea/cmd/medical/`, `platform/idea/cmd/combat/` | kernel verbs: any water source / any launcher confers them, so they are the platform pack's |
| the frost row, the caustic row, the seep, the launchers, the ammunition, the stock lines | `arcane-library`, `base-library`, `generic-objects`, `newbie-wilds`, `terminus` | content; each is the second-instance proof — a second frost spell / caustic / firearm / armour is a row |

⭐ **The test applied:** no wave adds a guard that re-narrows a host. The
two places that looked like they wanted one — `getConsciousness` on a
plan without a brain, `capacity()` on a plan that authors no `serves` —
are data facts that read as `full`/the legacy rule, not `if (isBiped)`.
The one host deliberately refused: `LauncherMixin` on `Weapon`.

---

## Convention conformance

- **`props:` / `cast:`** — the seep, the water butt and the wolf use the
  designations every read row uses.
- **Locations, not rooms** — no new location; placements are `props:` in
  existing `SingletonCartesianLocation` rows.
- **`<root>/<branch>/`** — kernel classes at `platform/thing/equipment/`;
  rows at `/stuff/thing/…` (generic-objects), `/stuff/idea/material/caustic/…`
  (base-library), `/arcane-library/…/Spell/…`, `/platform/idea/Condition/…`.
  Controllers at `platform/idea/cmd/<category>/`, views at
  `content/platform/cmd/<category>/`.
- **Module scope declares; lifecycles initialize** — `BodyCapacity.ts` and
  `Launcher.ts` are declarations + `as const` tuples; the conduit set is
  computed in `setBodyParts` (a lifecycle), never at module scope.
- **Import boundary** — nothing new imports outside `src/mud/`. `BodyPlan.ts`
  imports only types from `lib/` today (`:30-35`) and its `governs` comment
  says it is kept free of `lib/vitals` **class** imports; validating
  `governs`/`serves` needs the two `as const` tuples, so `BodyPlan` takes a
  **value import of `VITAL_SIGNS` and `BODY_CAPACITIES`** (vocabulary
  tuples, no class, no cycle — `Vitals.ts:88-90` already names this exact
  use). If a cycle appears, move both tuples into `lib/vitals/BodyCapacity.ts`
  and have `Vitals.ts` re-export `VITAL_SIGNS` from there.
- **Verbs on objects** — `severPart`, `functionAt`, `absorbHeatLoad`,
  `isInterior` are instance methods; no `XApi.verb(host, …)` anywhere;
  `lint:object-verbs` stays at zero.
- **No new module category, no free helper** — the only new mixin is
  `LauncherMixin`; `RinseController`/`ShootController` are controllers;
  every helper folds into the owning class or the existing module-private
  functions in `ConditionLogic.ts`/`MaterialLogic.ts`.
- **No `isWizard`** anywhere in this build.
- **No new collection, no migration** — `heatLoadJ` and the widened
  `bodyPartDeltas` ride `holder_snapshots` through existing `fieldMeta`.
- **Money** — prices are stock-line data on the counter, nothing else.

**Lint gates this build must satisfy** — run
`pnpm -C packages/server lint:family` at every wave (never a subset). The
gates whose *numbers* this build moves, and the direction each must go:
`lint:condition-arms` (stays 5), `lint:unconsumed-seams` (falls:
`severable`, `innervatedBy`, `suppliedBy`, `serves`, `corrosiveTo`,
`penetration` all gain readers in the wave that adds or first reads
them), `lint:conditions` (`EFFECT_KINDS` edit + the new row),
`lint:does-nothing` (unchanged — new channels are not covering-profile
columns), `lint:inert-weapon` (the two launchers), `lint:census` (stock
lines + props resolve), `lint:field-meta` (`heatLoadJ`, `corrosiveTo`,
launcher fields declared), `lint:instanceable` (`Launcher`, `Projectile`
under `platform/thing/`), `lint:verb-collisions` (`shoot`; the `wash`
stanza), `lint:test-content`, `lint:object-verbs` (0), `lint:module-scope`,
`lint:imports`, `lint:drive-scripts` (the drive is a wire file), and the
**new `lint:spell-cost`** (D22 — born at W-B1 with ceiling 1, driven to 0
in the same wave; channel-aware, never a flat η check).

---

## Waves

Each wave is independently landable and ends at one commit
`build(injury W-<id>): <what>`; `pnpm test:near` + every touched pack's
vitest + `lint:family` gate each. `pnpm test` runs once before each MR.

### Stage A — a wound means something

**W-A0 — a limb can be lost.** ✅ **DONE** *(D1, D2, D3, D13, D19-wolf)*
> **Build note.** Landed as planned; no premise moved. Three things worth
> the next reader's time:
> - ⚠ **`pnpm install` was required before anything ran.** Every suite
>   failed at collection with `Cannot find module
>   '@saxonberg/content-trade-medicine/package.json'` — the stale-
>   `node_modules` symptom, which reads like a repo defect and is not one.
> - **`severable` is not tracked by `lint:unconsumed-seams`** — it is a
>   field on the `BodyPart` *interface*, and that gate walks class fields.
>   So the census does not fall at this wave; the reader it gained is real
>   (`AVULSION_BEHAVIOR.onset`), the gate just never counted it.
> - **The limp needed a missing-part term of its own.** `drainForLimp`
>   sums WOUND severity, and a severed part carries none — the avulsion
>   that took the leg heals and clears, and the body would then walk off a
>   missing leg. `LIMP_MISSING_SEVERITY` stands in, counting only the
>   topmost missing part of a severed subtree (a leg and its foot are one
>   loss). W-A2 replaces the whole sum with the function axis and retires
>   the constant.
- Reorder afflict/onset at `ConditionLogic.ts:968/:1005/:1046`.
- `resolveTraumaImpl`: the edge → avulsion ladder; `response.edge.avulsionThreshold`
  in `response.yaml` + `AppSettingKeys`.
- `HARM_DEFAULTS.SEVER_SEVERITY`; `AVULSION_BEHAVIOR.onset` calls
  `host.severPart(t.site)` when severable and at/above it.
- `Vitals.severPart` (cascade + slot release), `getMissingParts` rename,
  `drainForLimp` counts a missing locomotor part (interim: severity-equivalent
  `LIMP_MISSING_SEVERITY` until W-A2 rewires it), the description augmenter.
- Wolf species `naturalAttacks` (bite/worry); agent row drops the legacy field.
- Tests: `lib/vitals/__tests__/Vitals.sever.test.ts` (cascade, slot release,
  persistence round-trip through `PersistableApi.capture/materialize`,
  vetoed avulsion does not sever); `platform/idea/api/__tests__/material-response.inflict.test.ts`
  gains the edge ladder; `GlassAlley.integration.test.ts` unchanged and green
  (AC 9 regression).
- Acceptance: a severe edge blow severs; the hand's sword is on the floor;
  the arm's slots refuse; a relog still shows the part missing.

**W-A1 — the anatomy stops being decorative.** ✅ **DONE** *(D4, D5, D8)*
> **Build note.** Two decisions the plan did not make:
> - ⚠⚠ **No `BodyCapacities` static holder.** D5 specified the `Channel.ts`
>   shape — tuples plus a thin static holder — and `lint:lib-statics`
>   refused it: the non-Api static census is a census-then-ratchet at 337
>   and my four statics made it 341. The gate's own rule is *"the ceiling
>   may fall; it may never rise."* All four were honest type-level
>   value-statics and that is **still** the right answer — the compliant
>   path is to fold, not to raise. Validation is one `includes` inline in
>   `BodyPlan.setBodyParts`; band ordering is `indexOf` on `VitalsMixin`
>   where the axis lives. `BodyCapacity.ts` carries the reasoning so nobody
>   re-adds the holder.
> - **Heart and lungs now govern a CAPACITY as well as their rate**
>   (`[heartRate, circulation]`, `[respiratoryRate, respiration]`). The
>   plan left them "unchanged", but a capacity nothing governs reads `full`
>   forever, so `circulation` and `respiration` would have been two dead
>   vocabulary entries. The `governs` validation vocabulary is the UNION of
>   `VITAL_SIGNS` and `BODY_CAPACITIES` precisely because a lung honestly
>   does both.
- `lib/vitals/BodyCapacity.ts`; `BodyPart.serves`; `BodyPlan.isInterior`,
  conduit set, `governs`/`serves` validation in `setBodyParts`.
- Replace the five inline readers (`BodyPlan.ts:477`, `Attired.ts:646/660/685/705`).
- biped + quadruped: brain, spine ×2, liver; `innervatedBy` on limbs;
  `serves` on legs/hands. Fix the `SlotSpec.covers` comment (`Slotted.ts:84`).
- Tests: `Vitals.anatomy.test.ts` (interiority incl. the spine, validation
  throws), `Attired` surface-fraction tests still pass with organs excluded.
- Acceptance: `getParts()` lists 16 parts on a biped; the spine is interior;
  a typo in `governs` throws at registration.

**W-A2 — a wound costs a capacity.** ✅ **DONE** *(D6, D7)*
> **Build note.** The wave landed as designed, plus one correction to D6's
> formula and two consequences worth knowing about.
> - ⭐⭐ **D6's conduit walk had to become TRANSITIVE**, and the plan's own
>   acceptance is what caught it. As written, `f(p) = min(own(p),
>   conduit(parent-chain…), conduit(innervatedBy…))` reads only `p`'s own
>   edges — and the **arm** names the spine, the hand names nothing. So a
>   severed spine left the hand gripping happily, which is the one case the
>   axis exists to model. `upstreamFunction` now recurses (with a visited
>   set), which is also what makes D8's *"author innervation only where it
>   diverges from the tree"* actually true.
> - ⭐⭐ **Quadriplegia and paraplegia fell out for free.** The lower spine
>   hangs off the upper, so a HIGH cut takes the arms and the legs and a LOW
>   cut takes only the legs. Nobody authored that; it is two `parent` edges
>   and a `min`. Pinned by a test.
> - ⚠ **The band comparison needs an epsilon.** `1 − 3 × 0.2` is
>   `0.3999999999999999`, which lands a hair under the `impaired` edge — so
>   a wound would band differently depending on whether its severity arrived
>   as one number or as a sum. `bandOf` compares with `1e-9`.
> - ⚠ **The limp changed shape and the avian plan nearly lost it silently.**
>   `drainForLimp` was a sum over `laceration|avulsion` at sites matching the
>   string `body.leg*`, which missed a FRACTURED leg, a MISSING leg and a
>   spine wound that paralysed both. It is now `1 − capacityScalar
>   ('locomotion')`, which catches all three — but it reads `serves`, so the
>   **avian** plan (which has legs) needed `serves: [locomotion]` authored or
>   it would have silently stopped limping. Authored on its wings too: a bird
>   gets about on those.
> - `LIMP_MISSING_SEVERITY` (the W-A0 interim) retired, replaced by
>   `LIMP_SHORTFALL_SCALE`.
- `functionAt` / `capacity` / `canGrip` / `canBearWeight` /
  `slotRefusalReason`; `{kind:'function'}` replaces `capability` on the
  table and in `check-conditions.ts`; `isSlotImpairedByCondition`,
  `drainForLimp`, `getConsciousness` rewired; `EquipController` says why.
- Tests: `Vitals.function.test.ts` (min-along-path: a spine wound zeroes a
  healthy hand; one missing leg = `impaired` locomotion; a 0.5 fracture
  greys the slot exactly as before), `Slotted` tests, `EquipController` test
  for the reason prose.
- Acceptance: drive steps 5–6.

**W-A3 — interiority.** ✅ **DONE** *(D9, D10)*
> **Build note.** One gap the plan did not see, and one interface widened.
> - ⭐⭐ **`treat` had to gate on the SITE, not the trauma type.** D10 said
>   `pickWound` excludes interior sites; the reason turned out to be
>   sharper than "tidiness". A `rupture` announces itself (it resolves by
>   `surgery`, which nothing offers, so `treat` already refused it) — but
>   an interior **puncture** or **laceration** resolves by `dressing` like
>   any other bleed, so without the gate a player could bandage a punctured
>   liver. What makes a wound undressable is WHERE it is.
> - `BodyPlan` gained `partArea(key)` **and** `interiorChildrenOf(key)` —
>   the ladder wanted the ordering, and putting the sort on the plan (which
>   owns the anatomy) kept `ConditionLogic` free of a second walk.
> - `InflictOutcome.reached?: Trauma[]` is populated only when something
>   landed, so every existing caller reads identically.
- Depth ladder in `inflictThroughStack`; `rupture`; `response.depth.*`,
  `response.blunt.ruptureThreshold`; `InflictOutcome.reached`.
- `assess` interior clause; `treat` interior refusal.
- Tests: `ConditionLogic.interior.test.ts` (a 4.5 torso point blow reaches
  the liver with 2.5, not the heart; blunt at 3 → rib fracture + liver
  contusion; blunt at 4.5 → rupture that bleeds; the reached trauma is
  vetoable), `AssessController`/`TreatController` tests for the two prose
  lines.
- Acceptance: drive steps 7–8.

**W-A4 — blood loss reaches shock.** ✅ **DONE** *(D11)*
> **Build note.** The derive is right where D11 said in spirit and NOT
> where it said in code, and it exposed a shipped hole.
> - ⭐⭐ **The derive runs ABOVE the clock guard**, beside
>   `reconcileBurdenStages`, not in the bleed-floor tail. The tail sits
>   behind the world-clock guard AND the all-empty guard, so a body that
>   had just been bled would have read a textbook 120/80 until enough
>   game-time passed. Blood pressure is a live read of present volume, not
>   an integration — the burden law's comment says exactly this about
>   drunkenness, and it is the same case.
> - ⚠⚠ **It has to arm `_reconcilingConditions` by hand.** That flag is not
>   set until far below, so everything above it runs unguarded — and this
>   derive WRITES where the burden law only reads.
> - ⭐⭐⭐ **The bleed→dying floor was UNREACHABLE for a body whose only
>   problem was lost blood.** It sits under the all-empty guard, so with no
>   wound record, no affliction and no trauma — just a low volume — the
>   reconcile returned before it. A shipped characterization test bled a
>   body to **50 %** (past the 36 % survivable floor) and then had it walk
>   the loss back by drinking, which only worked because nothing was
>   processing it. Spawning shock at 30 % puts an affliction in the list
>   whenever the loss is anywhere near lethal, so the floor is now
>   reachable in exactly the cases that matter; the fixture moved to 30 %
>   loss, which is what that test was always about.
> - `check-condition-arms` still reads **5** — a derived write, not an arm.
- The circulation derive + the `hypovolemic-shock` row; `check-condition-arms
  --list` before and after (5 → 5).
- Tests: `Vitals.circulation.test.ts` (systolic holds and diastolic rises
  through 15 % loss — pulse pressure narrows, the earliest sign; both fall
  past it; shock at 30 % before dying at 36 %; hysteresis;
  `getConditionBand` reads the out-of-band pressure; an electrocution
  fixture's heart drive is untouched).
- Acceptance: drive step 9.

**W-A5 — reachable and legible.** ✅ **DONE** *(D12, D19-store/pit)*
> **Build note.** The drive found two things, and one of them was a real
> gameplay defect nothing else could have caught — see *Drive record*.
- `assess` anatomy + covering listing; Terminus armour stock lines +
  prices; spike-pit site selector; `docs/subsystems/harm.md` +
  `vitals.md` sections for the axis (the doc grows, the CLAUDE.md blurb
  does not).
- The drive file is started here: `packages/wire/tests/injury.wire.test.ts`
  steps 1–11 (dirty: it buys stock). Run it green; do **not** open the
  MR — Stage B continues on the same branch.
- Acceptance: drive steps 1–11 green; AC 1–5, 8, 9, 10.

### Stage B — two new ways to be hurt, and honest spell costs

**W-B0 — channel plumbing + legibility.** ✅ **DONE** *(D14 vocabulary
half, D17 vocabulary half, D18)*
> **Build note.** The exhaustive `switch` did its job: adding two channels
> produced exactly one compile error, and widening `CHANNELS` then produced
> **four more** at the places that built an `InflictSpec` from a bare
> `Channel`. Every one was a real hole — `DeliveryProfile`, `HazardDelivery`
> and two `CombatLogic` sites would all have coerced a corrosive contact
> into a mechanical spec with no agent, which sheds off every layer in the
> game. Each now refuses it in its own words, with the reason: **a
> corrosive insult carries the AGENT'S chemistry, and an energy-and-site
> producer has none to give.** `DeliveryProfile` also stopped naming
> `heat` and started asking `Channels.isThermalChannel`, which is how
> `cold` would otherwise have silently become a mechanical insult.
> - ⚠ **No `Channels.isCorrosionChannel`** — `lint:lib-statics` again (the
>   ratchet counts static METHODS; `FOLDED` is a field and is free). With
>   one member the predicate is `channel === 'corrosion'`, and the file
>   says so and says to add both together when a second one lands.
> - `previewBandImpl` needed two fixes the plan did not foresee: a
>   **reference agent** for the corrosion column (*"how does this answer
>   corrosion"* is not well-formed without saying against what), and a
>   guard because `deliveryFor` is the mechanical shape table and **throws**
>   on anything else. `textDial` is `dial`'s sibling for a word-valued
>   setting. `cold` + `corrosion` in `Channel.ts`; `FOLDED`;
`channelDefaultType` arms; `resolveTraumaImpl` branches; `toInflictSpec`
by predicate; the two loops iterate `FOLDED`; `frostbite`/`caustic` types
+ behaviours; `CorrosionInflictSpec`; `Material.corrosiveTo`; dials.
Tests: `MaterialLogic.cold.test.ts` (leather insulates cold as it
insulates heat; plate does not), `MaterialLogic.corrosion.test.ts` (the
three layer outcomes), `Construction.test.ts` (`responseFor('cold')` still
throws), `AnalyzeResponseController` test shows five columns.

**W-B1 — spell costs, and the gate that keeps them honest.** ✅ **DONE**
*(D22)*
> **Build note.** Landed exactly as D22 designed it, arithmetic confirmed
> by the test: an honest bolt **chars** the 1.5 kg dummy (ΔT ≈ 8.5 K
> against the 277 K it would need) and **lights** the 40 g tinder. The
> gate joined `lint:family` by existing — the roster went 39 → 40 with no
> list edited, which is the derived-roster claim working.
> - The cursed backfire's `joules` needed correcting too (250 kJ → 15 kJ);
>   the plan named the main effect and the self-effect is the same row.
> - `lint:spell-cost`'s own test pins the DESIGN, not just the arithmetic:
>   a flat-cost cold spell fails, one declaring `heat-pump` passes however
>   much it moves, and a row with no `joules` is out of jurisdiction.
>   Gates ship broken and silently pass; this one is provably not.
`scripts/check-spell-cost.ts` + the `lint:spell-cost` script entry in
`packages/server/package.json` (it joins `lint:family` by existing);
firebolt → `cost: 30`, `joules: [15000, 25500, 30000]`; the practice
dummy keeps `mass: 1.5` and gets its comment rewritten to the arithmetic
in D22; new row `world-seed/.../practicum/tinder-bundle.yaml` (0.04 kg
`Firewood`, oak) added to `casting-yard.yaml` `props:`; `magic.md`'s
demonstrator prose (`:280-281`) names the tinder as the ignition target
and the dummy as the burn target; `docs/arcane-science.md` rules 1/4/6
gain a one-line *"enforced by `lint:spell-cost`"* note. Ceiling 1 → 0 in
the same commit. Tests: the gate's fixture test (a delivering row over η
fails; a cooling row with a flat cost fails; a cooling row declaring
`heat-pump` passes; a row with no `joules` is ignored);
`practicum.integration.test.ts:198` rewritten (dummy scorched, not
burning; tinder burning; cursed band leaves the tinder unlit);
`MagicLogic` body-arm tests unchanged (the `energy` token did not move).
Acceptance: `lint:spell-cost` green at 0; in the Practicum an uncursed
firebolt lights the tinder and chars the dummy without lighting it.

**W-B2 — the frost spell cooks its caster.** ✅ **DONE** *(D15, D16)*
> **Build note.** Four seams, three of which were declared-and-dead:
> - ⭐⭐ **`absorbWasteHeat` had no body arm and no caller on the cast
>   path.** It early-returned unless the endpoint was `Charged`, and
>   `resolveCastImpl` never called it — so the η < 1 losses arcane-science
>   puts squarely IN THE CASTER had nowhere to land and never landed
>   anywhere. Both fixed; a firebolt now warms its caster by ≈ 0.02 K
>   (invisible and honest) and frost hands them the whole load.
> - ⭐⭐ **The regulation model erased internal heat.** A body inside its
>   comfort band was pinned to the setpoint at ZERO cost on every slice,
>   so `depositHeat` worked on objects and did nothing at all to a person.
>   `shedAndOffset` had to go in **all three** regulated branches, not the
>   two the plan named — the cold branch pins too, and a caster working in
>   a cold room is still carrying what they absorbed.
> - **The object arm moved inside `deliverAt`** (the reachability fix):
>   heating a thing with a spell needed no reachability check, no band
>   gate, and left no provenance. Cooling is the same call with the sign
>   reversed — `depositHeat` has always taken negative joules, so *ice is
>   dear* needed no second path.
> - `Effect.ts` needed **no edit at all** for `cold`: it validates against
>   `CHANNELS`, so widening the vocabulary was the whole change. The
>   plan's "author-legality is one edit" claim was right, and the edit
>   turned out to be zero.
> - ⚠ `MixinApi.isThermalRegulation` is a new predicate (a static METHOD
>   on an *Api* class, which `lint:lib-statics` does not count — that
>   ratchet is non-Api classes only). `heatLoadJ` +
`absorbHeatLoad` + shedding; `'heat-pump'`; `costOf` arm; `absorbWasteHeat`
body endpoint + the `resolveCastImpl` call; object arm inside `deliverAt`;
hyperthermia onset dial; `frost.yaml`. Tests: `ThermalRegulation.heat-load.test.ts`
(a 1 MJ load raises core 3.4 K and sheds at 400 W; no shedding past
wet-bulb), `MagicLogic.heat-pump.test.ts` (COP arithmetic pins the
arcane-science numbers: 100 kJ at 17 K lift ≈ 14 τ; `dispel` still costs
20), the catalogue accepts the model. Acceptance: drive steps 12–14.

**W-B3 — the caustic.** ✅ **DONE** *(D17 content half)*
> **Build note.** ⚠⚠ **D17's `wash`-second-stanza plan does not work, and
> Risk 7 named the fallback correctly.** Three separate rules forbid it:
> `wash`'s arg is `requires: CraftedMixin` and widening it to also accept
> a body would DELETE a check (the arg-alternation antipattern); a second
> view claiming the `wash` verb shadows the first silently, which
> `lint:verb-collisions` exists to catch; and the `analyze` precedent
> D17 cited is **subcommands**, which would change the phrasing anyway.
> So: **`rinse`, its own verb in `medical/`**, afforded by the same
> `WaterFixture` in the same `peers` bucket — you learn it by standing at
> water exactly as you learn `wash`.
> - `CAUSTIC_BEHAVIOR.resolution` is `'rinsing'`, not `'wash'`: the token
>   is rendered raw by `treat`'s mismatch line, and *"It wants wash"* is
>   not a sentence. `mismatchLine`'s table names it properly.
> - ⭐ **Two reachability links the plan did not list**, both caught by
>   gates rather than by me: a controller needs a **seed template row** on
>   disk (`controller-seeds.integrity`), and a controller's `TOPIC` must
>   be an **authored topic key** (`lint:topics` refuses one nothing
>   authored — which is how a muted-by-default channel gets caught).
> - The seep ships **unconcealed**, deliberately: every other hazard in
>   the pack is something somebody hid, and a world where all danger is a
>   trap teaches that danger is always somebody's fault. quicklime row, the seep,
`HazardDelivery.corrosiveTo`, the `wash` stanza + `RinseController`, the
water butt at the hub, pit-below props. Tests: `HazardDelivery` corrosion
spec, `RinseController` test, `Hazard` integration (stepping onto the seep
lands a growing caustic wound; rinsing stops it). Acceptance: drive steps
15–16.

**W-B4 — Stage B docs + drive.** ✅ **DONE** `materials-response.md` (five channels,
three fold branches), `magic.md` (the second cost model, the caster's
heat, the cost gate), `thermal.md` (the heat load, the onset), `harm.md`
(nine types), `lint-family.md` (the new gate's rationale). Wire steps
12–16 appended to the drive file. ⭐ **If Stage C is being cut, this is
where the build runs `pnpm test`, pushes and opens the MR.**

### Stage C — past the medieval (the cut line)

**W-C0 — `penetration`.** ✅ **DONE** *(D20 first bullet)*
> **Build note.** The ranged build's own comment said `penetration` was
> held back because it *"only earns its keep against armor, and armor is a
> later wave — adding it now would mean authoring a number with no
> consumer to keep it honest."* That wait was right, and W-A5 made armour
> buyable, so the consumer exists.
> - ⭐ It is **derived, never authored**: an author writes a `calibre`,
>   which is a fact about the projectile they would write anyway. Nobody
>   maintains an "armour-piercing: 3" by hand.
> - ⭐⭐ **An arrow reads barely penetrative, and that is the honest
>   answer.** ~50 J over a broad head is nowhere near a round's pressure.
>   An arrow beats mail by being a POINT — the channel — not by arriving
>   at firearm pressure, and conflating the two would have made every bow
>   a gun. Pinned by a test. `DeliveryProfile.penetration`
+ `calibre`; `EnergyInflictSpec.penetration`; the divisor in
`attenuateImpl`; `response.penetration.referenceJPerM2`. Tests:
`DeliveryProfile.penetration.test.ts`, the inflict test (a 1.5 kJ 16 mm
`point` defeats plate; a 200 J thrust does not).

**W-C1 — a launcher and `shoot`.** ✅ **DONE** *(D20 bullets 2–4)*
> **Build note.** The heaviest wave, and one design decision changed.
> - ⭐⭐ **Readiness is a CLOCK READ, not an engagement.** D20 said "a
>   readiness engagement of `readySeconds`", and `SchedulerApi.start`
>   wants a fully built `Engagement` — a great deal of machinery for one
>   number, and it would have made readiness a thing that can be
>   interrupted, cancelled and lost. Instead the launcher stamps
>   `readyAtS` and `shoot` reads it against the world clock: the same
>   reconcile-on-read discipline as every other clock in the engine, and
>   a body that logs out mid-reload comes back ready because time passed.
>   `readySeconds` gets a real reader either way, which was the point.
> - `CombatLogic.resolveShot` is `resolveThrown`'s sibling rather than a
>   generalisation of it: a throw derives speed from a dial (an arm is an
>   arm) while a shot reads the launcher's muzzle speed and the
>   projectile's mass and calibre. Merging them would be one function
>   with two disjoint halves and a flag.
> - ⭐ **Two more reachability links caught by gates, not by me:**
>   `lint:arg-kinds` refused `LauncherMixin` for having no refusal phrase
>   (the arg would have declined with a generic sentence), and
>   `lint:census` refused `projectileTemplate` for holding a template path
>   `refsOf` did not read — a rowless or misspelt one is a bow that can
>   never be loaded, refusing forever and naming no cause. Taught `refsOf`
>   to read it rather than listing it, because that list only shrinks.
> - ⚠ No `yew`/`ash`/`walnut`/`lead` materials existed. The wooden parts
>   use `oak` rather than inventing three rows; **lead is worth its own
>   row** and got one — density is the entire point of a bullet, and its
>   castability over a cooking fire is the real reason shot was lead for
>   five hundred years. `LauncherMixin`,
`Launcher`, `Projectile`, `shoot.yaml` + `ShootController`, `Mixins.Launcher`.
Tests: `Launcher.test.ts`, `ShootController` test (consumes one arrow;
refuses with none; refuses `far` in a 3 m room; readiness engagement per
family). ⚠ The heaviest single wave in the build.

**W-C2 — content + drive.** ✅ **DONE** Bow, arrows, musket, balls; Terminus stock;
`ranged.md` W2/W3/W4 table updated to what shipped; wire steps 17–19;
`pnpm test`; push; open **the** MR.

---

## Reachability wiring

Each link fails closed and silent. **verb · affordance · data · boot.**

| Capability | verb | affordance | data | boot |
|---|---|---|---|---|
| Sever | none new — combat/hazard `inflict` | `AVULSION_BEHAVIOR.onset` on the engine table | `severable: true` on biped/quadruped limbs; wolf `naturalAttacks` | nothing to warm; `bodyPartDeltas` persists via existing `fieldMeta` |
| Function axis | `wield`/`wear` (refusal), `go` (limp), every conscious-gated verb | `Slotted.canOccupy` → `canGrip`; `LocomotionLogic:402` → `drainForLimp` | `serves`/`governs`/`innervatedBy` on the two plans | `SpeciesApi.preloadAnatomy` already stands plans up |
| Interior reach | `assess`, `treat` | `inflictThroughStack` | organs authored with masses (the ladder's order) | — |
| Shock | `assess` | `reconcileConditions` tail | `circulation/hypovolemic-shock.yaml` | `ConditionCatalogue.warm` (`ConditionCatalogue.ts:86-95`) walks every descendant of `TemplatePathPrefixes.condition` and keeps rows of class `Condition` — a new subfolder needs no edit |
| Assess anatomy | `assess` (exists) | — | — | — |
| Armour | `buy` (exists), `wear` | `Stock` stock lines | 5 `stockLines` + `prices` on the counter | the counter resets to par at standup |
| `cold` | `cast frost` | `SpellCatalogue` warms by class from any root | `arcane-library/.../Spell/frost.yaml` | `arcane-library` in `SAXONBERG_PACKS` (it already is: firebolt lives there) |
| Caster heat | `cast` (any spell) | `resolveCastImpl` → `absorbWasteHeat` | dial `magic.heatPump.carnotFraction` in arcana's `magic.yaml` | settings merge-missing at install |
| `corrosion` | walking (hazard trigger); `wash` | `HazardMixin` traversal trigger; `UnboundedReceptacle` environment contribution confers `wash` | `traps/lime-seep.yaml` + `pit-below` props; `material/caustic/quicklime.yaml` (`MaterialApi.boot` warms `/stuff/idea/material/**`); `fixture/water-butt` in `hub` props | — |
| `shoot` | `shoot` (new view) | `LauncherMixin` static contribution on `Launcher` | launcher + projectile rows; stock lines | — |

⚠ The one *known* dead-affordance trap: a `props:` edit never reaches a
booted world (the once-guard) — the drive runs against a **fresh** DB.

---

## Acceptance-criteria coverage

| AC | Satisfied by |
|---|---|
| 1 — seen to be injured by somebody else | W-A5 (`assess` on another), W-A0 (description augmenter) |
| 2 — a wound stops a specific, predictable thing | W-A2 (`canGrip`, the refusal prose names the hand and the wound) |
| 3 — hurt in a way you cannot see; a stranger reads more | W-A3 |
| 4 — shock before death, with a window | W-A4 |
| 5 — lose a limb, keep playing, do most things | W-A0 + W-A2 (one hand still grips; locomotion `impaired`, not `lost`) |
| 6 — frozen and caustic-burned, each unlike fire | W-B0/B2/B3 (`frostbite` numbs and wants warmth; `caustic` grows until washed) |
| 7 — an over-caster injures themselves, and can tell it was heat | W-B2 (`assess`/`measure temperature` show the rising core; the sweat cue fires; the `hyperthermia` row lands at +2.5 K with mana to spare — D16) |
| *(added scope, D22 — not a requirements AC)* a firebolt's authored cost and delivery obey the price list, and a gate holds it | W-B1 (`lint:spell-cost` at 0; the uncursed bolt lights the tinder and chars the dummy without lighting it; the cursed one lights neither) |
| 8 — buy armour, wear three layers, see the layers matter | W-A5 (stock + the outside-in listing) |
| 9 — bare-foot-on-glass unchanged | W-A0 regression assertion; W-A2 keeps the 0.5 laceration limp equivalent |
| 10 — nothing in the lounge can hurt anyone | untouched; the wire drive asserts no hazard/combat affordance in the lounge rooms |
| 11 — fight with a non-medieval weapon; armour answers differently | W-C0–C2 |

Unmapped: none. Drive steps 17–19 are Stage C's and go with the cut; AC
11 goes with them, and the MR description must say so if it does.

---

## Test & gate strategy

- **Unit (per wave, named above).** Pure value objects and the fold are
  unit-tested in milliseconds (`MaterialLogic.*`, `DeliveryProfile.*`,
  `BodyCapacity`, `Launcher`); the axis, the sever and circulation are
  `lib/vitals/__tests__` fixtures with the manual clock (the
  `Trauma.behaviors.test.ts` / `Vitals.dying-disconnect.test.ts` shapes,
  and every wired test imports `test-bootstrap`).
- **What only the drive can prove:** that a verb is reachable at all
  (`shoot`, the `wash` stanza), that a `props:` edit landed in a fresh
  boot, that `assess` *renders* the anatomy on the card, that the caster's
  core visibly rises on the client, that the store sells what the counter
  says. The drive is `packages/wire/tests/injury.wire.test.ts`
  (started at W-A5 with steps 1–11; W-B4 appends 12–16; W-C2 appends
  17–19), the `consequence.dirty.wire.test.ts` shape. Steps needing
  game-hours (a fracture healing) are pinned by unit tests, not faked with
  a wizard clock.
- **Gates:** `pnpm -C packages/server lint:family` every wave;
  `pnpm test:near` + touched packs' vitest every wave; `pnpm test` exactly
  twice (before the MR opens, at `/finalize`). Never backgrounded.
- **Ratchets to read before and after every wave:**
  `check-condition-arms.ts --list` (5), `check-unconsumed-seams.ts --list`
  (must fall at W-A1/A2, B0, C0), and from W-B1 on
  `check-spell-cost.ts --list` (1 → 0 inside W-B1, then 0; the frost row
  in W-B2 must pass it by declaring `heat-pump`).

---

## Risks & opens

1. **D16 is settled (lenses 1 + 2), but it is a thermal-subsystem
   change.** Lowering the `hyperthermia` onset to `setpoint + 2.5 K`
   touches `reconcileThermalCascade`, `ThermalRegulation.test.ts` and
   Hearthworks' sealed-cellar heat tests. Any test asserting onset at
   `survivableMax` was asserting heat-stroke under hyperthermia's name —
   fix the test. The lethal dwell must keep reading `survivableMax`; if
   it turns out to ride the condition's presence, split it in W-B2.
2. **Combat's site vocabulary is two words — and that is honest by
   omission, not an unexamined gap.** `siteFor` returns torso/head; every
   interior reach in a fight starts there; the wolf never bites a leg.
   ⭐ *Lens 1 forbids the obvious fix:* a surface-fraction-**weighted**
   site pick is a roll deciding what your action *did*, which
   `uncertainty.md` bans outright (resolutional randomness). The honest
   fix is **aim-derived and deterministic** (a called shot the attacker
   chooses, priced in poise/tempo), and that is a combat build — recorded
   below. A weighted roll would be strictly worse than the current
   simplification.
3. ⚠⚠ **A new character cannot afford any of the new goods, and the
   drive cannot prove they ever could.** The onboarding stipend is **20**;
   the cheapest new item is the leather boots at 8, the gambeson is 14,
   the bow 18, a breastplate 55 and a musket 70. So the armour ladder and
   the tech curve are **aspirational purchases**, reachable only through
   wages (4–6 per game-hour) — which is arguably the right design and is
   certainly not what AC 8 ("a player can buy armour") assumes on day one.
   ⭐ **This wants your eye**, and it is a pricing decision rather than a
   code one: either the bottom of the ladder comes down to stipend range,
   or AC 8 is understood as "after a day's work". Nothing in the build
   depends on the answer.
4. **Balance of the two sever dials.** `avulsionThreshold 3.0` and
   `SEVER_SEVERITY 4.0` against band energies (open = 4.5 × delivery
   scale) mean severing needs an `open` foe and a real blade — the drive
   tunes them; the plan fixes only the *order* (avulsion before sever).
4. **`reconcileThermalCascade`'s dwell keying** (verify — see D16).
5. **Firebolt's correction changes what the Practicum demonstrates
   (D22).** The dummy no longer catches fire — it chars — and a new
   tinder row is what ignites. `practicum.integration.test.ts:198` is the
   one test pinning the old 900 kJ ignition and is rewritten, not
   preserved. ⚠ The workaround is content the shipped bulk-temperature
   `tryAutoignite` can represent honestly; **the actual fix is a local-
   hotspot ignition model in the fire subsystem, deferred** — do not
   mistake the tinder row for it.
6. **Corrosion's tag matching** depends on rows carrying honest tags;
   the base-library census shows `metal`/`organic`/`textile`/`tissue`
   present on the rows that matter. A row with no tags sheds everything —
   the closed-and-silent case; the corrosion test enumerates every shipped
   covering material's outcome against quicklime.
7. **The `wash` stanza mechanics.** Read `docs/subsystems/command-spec.md`
   and the `analyze` view before writing it; if a second stanza on one
   view cannot route to a second controller, the fallback is a `rinse`
   verb in `medical/` — not a widened arg.
8. **W-C1 size.** If Stage C is cut, W-C0 (`penetration`) may still land
   alone: it has a unit-testable consumer (armour) and no verb.
9. **Build stop conditions (real ones):** a worktree hazard; a credential
   the drive needs and cannot get; `Projectile`'s stackable base not
   matching the shipped exemplar (read `stacks.md`, then compose it —
   never invent a second stack shape).

---

## Deferred seams

Clean attach points, each leaving as a slate line — never a plan section.

- **Heart-rate compensation + the electrocution writer** → `blood-slate`
  (one owner per sign; the shock arm holds `heartRate` today).
- **Pulse-pressure narrowing as a cue-without-a-name** — D11 models it;
  nothing yet *reads* it back to a medic as the sign it is (a novice sees
  "pale", a clinician should see a thready pulse before the pressure
  falls) → `medic-judgment-slate`.
- **Clearance × toxin clearance** (`Metabolic.reconcileToxinConditions`
  scaled by `capacity('clearance')`) → `pharma-slate`.
- **Called shots / surface-fraction site selection** in `siteFor` →
  `combat-slate`.
- **`CombatantMixin.naturalAttackChannel` retirement** (zero content users
  after W-A0) → the antipattern-sweeps branch.
- ⭐ **A local-hotspot ignition model — the ACTUAL fix behind D22, and a
  fire-subsystem build, not this one.** `tryAutoignite` asks whether the
  whole mass reached autoignition; real fire ignites a spot, and a match
  lights a bonfire. Until it exists, an honest ~25 kJ pulse can light
  tinder and only char a log, which is what D22's content says →
  `fire.md`'s deferred list (with this plan's arithmetic: 831 kJ for a
  1.5 kg oak dummy, 22 kJ for 40 g of tinder).
- **The price list as data** — `check-spell-cost.ts` carries the η table
  in code beside the doc citation; a later build may lift it into an
  authored row so the wiki and the gate read one source →
  `capability-magic-slate`.
- **Readiness as committed actions, dry-fire, the bow's hold window,
  reliability, pattern keys, NPC archers** → `ranged-slate` W3/W4 (W-C1
  ships one `readySeconds` per family and nothing else).
- **Surgery** as a resolution — `rupture` names it; nothing offers it →
  `health-vertical-slate`.
- **Scars as recognition features; prosthetics re-enabling a slot** →
  `physiology-slate` §7c, `augmentation-slate` (the slot read is now
  function-based, so a prosthetic sets a part's function, not a flag).
- **Exertion as a heat load** — `absorbHeatLoad` is the seam → `thermal`
  doc's non-goals list.

---

## Critical files

Read these first, in this order.

1. `docs/requirements/injury-requirements.md`
2. `mud/platform/idea/Condition.ts` — the trauma table, `VitalEffect`, `HARM_DEFAULTS`
3. `mud/platform/idea/api/ConditionLogic.ts` — `inflict`, the covering stack, the three sites
4. `mud/lib/vitals/Vitals.ts` — anatomy resolver, `reconcileConditions`, `afflict`, the couplings
5. `mud/platform/idea/species/BodyPlan.ts` + `packages/content/species-and-names/.../BodyPlan/{biped,quadruped}.yaml`
6. `mud/platform/idea/api/MaterialLogic.ts` — the three fold branches; `mud/lib/material/Channel.ts`; `mud/lib/material/Construction.ts`
7. `mud/lib/slot/Slotted.ts` (`canOccupy`, `occupy`), `mud/lib/slot/Attired.ts` (`coveringAt`, the four readers)
8. `mud/platform/idea/cmd/perception/AssessController.ts`, `mud/platform/idea/cmd/medical/TreatController.ts`, `mud/platform/idea/cmd/inventory/EquipController.ts`
9. `mud/platform/idea/api/CombatLogic.ts:2395-2500, :2604` — the blow and `siteFor`
10. `mud/lib/thermal/ThermalRegulation.ts`, `mud/lib/thermal/Thermal.ts` (`THERMAL_DEFAULTS`)
11. `mud/platform/idea/api/MagicLogic.ts` — `costOf`, `resolveCastImpl`, `absorbWasteHeat`, `execInjectChannel`; `mud/platform/idea/magic/Spell.ts`; `mud/platform/idea/SpellCatalogue.ts`
12. `mud/lib/combat/DeliveryProfile.ts`, `EnergySource.ts`, `NaturalAttack.ts`; `mud/platform/idea/cmd/inventory/ThrowController.ts`
13. `mud/lib/hazard/HazardDelivery.ts`; `packages/content/generic-objects/content/stuff/thing/traps/spike-pit.yaml`
14. `packages/content/terminus/content/world/terminus/general-store/counter.yaml`
15. `packages/server/scripts/check-condition-arms.ts`, `check-unconsumed-seams.ts`, `check-conditions.ts`, `check-does-nothing.ts` (the shape `check-spell-cost.ts` copies), `pack-roots.ts`
15a. `packages/content/arcane-library/content/stuff/idea/magic/Spell/firebolt.yaml`, `packages/content/world-seed/content/world/practicum/{practice-dummy,casting-yard}.yaml`, `packages/server/src/mud/world/practicum/__tests__/practicum.integration.test.ts:198`, `packages/content/generic-objects/content/stuff/thing/items/dry-log.yaml` (the `Firewood` row shape the tinder copies), `docs/arcane-science.md` (the 8 content rules + `:425-485`), `docs/subsystems/magic-items.md` (the band-means-efficiency rule), `docs/subsystems/magic.md:280-281`
16. `packages/wire/tests/consequence.dirty.wire.test.ts` — the drive shape
17. `docs/subsystems/harm.md`, `vitals.md`, `materials-response.md`, `magic.md`, `thermal.md`, `ranged.md`, `command-spec.md`, `docs/arcane-science.md:425-485`

---

## Drive record

`packages/wire/tests/injury.wire.test.ts`, `WIRE_BOOT=1` (an owned
world on 2012), run at the end of Stage A.

**First run — 3 of 10 failed. Both findings were real.**

⭐⭐ **1. An untrained body could not see its own organs.** The headline
surface of the whole build — *"`assess` yourself and see a head, a spine
and a liver that were not there before"*, drive step 2 — rendered ten
exterior parts and stopped. The cause was mine and one line long:
`renderAnatomy` gated interior parts on `named`, and W-A3 had just
(correctly) made `named` read the observer's REAL medicine competence
rather than the self→expert shortcut. So the D10 rule *"you cannot
diagnose your own insides"* had quietly swallowed *"you know you have a
liver"*, which is not a diagnosis at all.

The fix keeps both: on yourself an organ is **listed and not banded** —
present, with nothing said about how it is doing. A competent reader gets
the band; a stranger with no training gets no organ, because they cannot
see inside you. ⚠ Every unit test passed through this: they asserted the
strings and the competence rule separately, and neither could see that
together they hid the roster.

**2. `goto <path>` is not a verb.** The drive tried to walk to the
Terminus counter with one, the refusal was swallowed by a `.catch`, and
both armour assertions then failed at the crossroads for a reason that
had nothing to do with armour. Placement is the harness's job: a second
session opens with `startLocation: SHOP`. A test defect, but exactly the
kind that would have been written up as "armour is unreachable".

**Second run — 10 of 10 green**, in 157 s over an owned boot.

**Stage B appended (steps 12–16) — 15 of 15 green, first run.** What it
proves that no unit test can: `frost` **reached the catalogue** (which
DROPS a row naming an unknown cost model and only *warns* — a `heat-pump`
the union had not grown to accept would have produced a spell that simply
was not there, with no error anywhere), `rinse` is a verb a booted world
knows (four links: view, controller seed row, `WaterFixture` peers
contribution, authored topic key), and the crossroads has water — so the
seep's answer exists rather than being a consequence with no response.

⚠ One assertion was replaced before the run counted: a
`expect(true).toBe(true)` placeholder I left while wiring the suite.
It asserted nothing and would have read as a passing check forever.

---

**Stage C appended (steps 17–19) — and it found the build's worst
defect and one of my own.**

⭐⭐⭐ **1. `shoot` was afforded to NOBODY.** `help shoot` answered
perfectly. `ShootController`'s unit tests passed. The view was on disk,
the seed row existed, the class resolved, `lint:arg-kinds` and
`lint:census` were green — and typing `shoot` returned *"I don't
understand 'shoot'."* `Launcher` had no `commandContributions`, so the
verb was conferred on no one, anywhere. **Every other check in the build
read green straight through it.** This is precisely the *verb nothing
affords* link, and precisely why the drive is the build's exit criterion
rather than the suite.

⭐⭐ **2. Nothing in this drive could ever buy anything — and my own
assertion hid it.** A wire session is a **guest**, and the onboarding
stipend is issued at char-gen *commit*, so these characters have no money
at all. The AC-8 check asserted that the reply to `buy padded gambeson`
contained the word *"gambeson"* — which the refusal *"you can't cover a
padded gambeson just now"* satisfies. A green check over an unbuyable
item: the exact failure this file exists to catch, committed by the file
itself. The file also carried a `dirtyReason` about spending coin it
never spent, so it is now `injury.wire.test.ts` and **clean**.

What the drive can honestly prove about armour and arms is the
reachability that was actually missing — the row on disk, the stock line
resolving, the par stocked at standup, the price listed, and `buy`
reaching the retail branch and naming the item. ⚠ **What it cannot prove
is the purchase**, and that is the one thing in this build that still
wants the user's eye: see *Risks & opens*.

**Final run — 20 of 20 green**, on a freshly reset database.

---

### The full suite, and the one thing it caught

**10,789 passed, 1 failed** — and the failure was
`wiki-spoiler-fields.snapshot`, the **enumerating wiki audit**, doing
precisely the job its header describes: *"adding one shows up as a diff a
reviewer has to look at, rather than as a leak in production that nobody
notices."*

Eight new fields appeared. Seven were correctly level 0 — the launcher's
numbers and the projectile's calibre are a weapon's **dimensions**, and
`Weapon.length` / `mass` / `balanceFactor` are all 0 for the same reason.
The bow-versus-musket trade is *meant* to be legible.

⭐⭐ **One was wrong: `Material.corrosiveTo` is a spoiler**, now
`spoiler: 1, spoilerName: 0`. It looked like `tags` (a level-0
classification) and it is not — it is a **response property**, the same
kind of fact as `hardness` and `autoignitionTemperature` sitting beside
it, and more sharply it is *the list of what this defeats*, which is the
audit's own worked example of a spoiler ("a creature's weakness is").
The corrosion channel's whole teaching is that you must learn which agent
eats which material; publishing it free on the wiki would have deleted
the discovery on the day it shipped. The name still shows, so you can see
that quicklime *has* a corrosive list without being told what is on it.

⚠ **A machine note, not a code one.** The first two attempts at the full
suite were killed by heavy swap — vitest's default fan-out put 13 workers
at ~400 MB on a 16 GB box, and the run slowed to 3 KB of output in nine
minutes. Capped at four workers it completed in 618 s. Worth knowing
before anyone reads a hung suite as a broken one.

What it proves that no unit test can:

- both body plans **stand up in a booted world** after `governs` became
  validated-at-registration — a plan that throws takes every species
  wearing it down with it;
- `assess` **renders** the anatomy to the card (textiles found three
  defects at exactly this seam), with bands and no raw scalar;
- ⭐⭐ **the armour is BUYABLE.** Six rows had shipped months ago named by
  no `props:`, `cast:` or stock line, so the entire outside-in covering
  model had nothing a player could reach. The counter now sells the
  padded → mail → plate ladder, and the content-hash reconcile carried the
  edit into a booted world with no DB reset.

⚠ **Not driveable, and deliberately not faked:** steps 3–10 need a fought
wound — two wolf bites, a torso blow deep enough to reach an organ, a
bleed carried to 30 % of volume, an avulsion past the sever threshold.
None is deterministic against a brain-driven animal inside a test, and
driving them would mean a wizard turning a dial, which proves something
no player can do. They are pinned exactly by `Vitals.sever.test.ts`,
`Vitals.function.test.ts`, `ConditionLogic.interior.test.ts`,
`Vitals.circulation.test.ts` and the two controller suites. The file's
header names each one against the step it stands in for.
