# Cast in winter — implementation plan

This plan executes
[cast-in-winter-requirements](../requirements/cast-in-winter-requirements.md).
**Kind:** feature. **Lead end:** kernel. It replaces the body's comfort band
with a heat budget solved in closed form, makes bodies and herds warm the room
they share, makes null timeless by one rule, gives every NPC three needs in the
deliberation it already has, declares supply on houses and a town's commons,
settles an unwatched NPC by arithmetic, authors the supply and warming places
the shipped cast needs, and then deletes `Vitals.diesOfNeglect`.

Paths: `S/` = `packages/server/src/mud/`, `C/` = `packages/content/`.

> ⚠ **Read "Requirements conflicts" (next section) before W0.** Four of them
> change what a drive step can mean. They are flagged for the owner; each has a
> plan default so the build does not stall.

## Requirements conflicts

Planning found these. None is absorbed silently; each states the plan default.

1. **There are no cattle bodies.** The Delight's herd is a tally on two
   `Herdbook` props in the byre (`dairy-book` tally 6, `calf-register` tally 3),
   grazing a field of the pasture by reference. Nothing is "in" the byre and
   nothing can be "moved out". Drive step 1 and the second acceptance criterion
   assume bodies. **Plan default (D6):** the herd's book answers the room-heat
   protocol for the head it holds while the herd is *in*; "in" is a new stated
   fact on the book. Step 1's "move the cattle out" is turning the herd out.
2. **Hesper Vane holds no shift.** She is the dairy's appointing authority and
   has no roster slot; the dairy's one slot is the dairy lad's, with no
   station. Step 3 ("the dairywoman comes on shift") cannot happen. **Plan
   default:** W8 gives her a roster slot of her own (a proprietor on her own
   roster is supported, `S/platform/idea/api/EmploymentLogic.ts` § reconcileCover).
3. **The rule being deleted also spares every unowned animal** (3 `Beast`, 3
   `KeptAnimal`, 3 `DraftAnimal`, 3 `WorkingAnimal`, 2 `Livestock`, 6 `Fish`,
   the silkworm, plus zone `stocks:` spawns). The requirements name only Cast
   and Extra. Nothing feeds or waters a stray. **Plan default (D17):** an
   unowned animal is a *role* body (fresh when it comes into view), the same
   declared route an Extra takes; an owned animal is unchanged (it already
   dies of neglect). ⚠ This is a product call the owner should confirm.
4. **"The creamery hearth is their fire"** — `creamery/thing/hearth` is class
   `Oven`, which does not compose `SpaceHeatingMixin`, so it warms no room.
   **Plan default:** W8 verifies; if an Oven answers no room heat, the creamery
   floor gains a `/stuff/thing/Hearth` and the dairy's warmth names that room.
5. **"Supply is declared by places."** The plan puts the *declaration* on the
   house and the town (D11) and lets a place supply through what stands in it
   (its `props:`), so no key is added to every Location. A kind of place
   carries supply by `extends:` on the place row's props and the house row.
   If the owner wants a `supply:` key on place rows, that is a host-placement
   change to make now, not in review.
6. **A logged-out player's carried goods stop aging.** The requirements say
   players are unchanged, and that null is timeless for the whole held
   subtree. Both cannot hold for a carried pail of milk: today it sours while
   its carrier is logged out. The plan follows the timeless rule (the newer,
   more general ruling). The body is unchanged; its goods now wait.
7. **Counts.** The census finds 75 `Business` rows, 11 with `offShift: out`
   (one is a test fixture), 117 Cast/Extra rows, and 36 outdoor roster slots.
   The requirements' 89/10/79 are stale; nothing depends on them.
8. **The death report expires.** `diagnostics` rows have a 7-day TTL. The
   corpse stays where it fell and the identity's chronicle keeps the death, so
   the report is "somewhere a person reads" without a new store.

## Grounding

Verified this cycle by opening the files named.

**Body heat.** `S/lib/thermal/ThermalRegulation.ts` (1361 lines).
`reconcileThermalRegulation` (l.634) loops 60 s slices
(`integrateThermalSlice`, l.710), capped at `REG_MAX_STEPS` 720. The slice is a
comfort band: `lowBand = setpoint − 8 − clo·CLO_TO_KELVIN`; below it satiation
is spent at `COLD_SPEND_PER_DEGREE` up to a gap of
`maxCoverableGapK()` (20 K), past which the core drifts toward
`ambient + coveredGap` (`driftCore`, τ from `Thermal.getTau` × `1 + clo/SHED_BODY_CLO`).
There is no metabolic watts term. Work heat arrives as joules on `heatLoadJ`
(`absorbHeatLoad`, l.213, called from `Exerting.depositWorkHeat`,
`S/lib/exertion/Exerting.ts:573`, at `1 − η` of `powerW × durationS`) and is
read only in the in-band and covered-cold branches (`shedAndOffset`); the
losing branch ignores it. Wind, wet and warming seats are folded into one
scalar, `effectiveAmbientK`, by `effectiveAmbient()` (l.880), cached at
`restamp()` (l.1051). `baseAmbientK()` (l.602) returns the setpoint for a null
container. The cascade (`reconcileThermalCascade`, l.1101) spawns hypothermia
below `survivableMin` and kills after `THERMAL_LETHAL_SEC` dwell.

**A wake already exists.** Each living body arms `thermalWakeAtS` on the game
clock at its projected next threshold crossing, never more than one game hour
out (`armThermalWake`, l.537; `secondsToNextCrossing` probes slices). So today
every living body in the world is brought current at least hourly, watched or
not. `billsTheGap()` (l.466) is the thermal twin of metabolism's long-absence
skip.

**The backstop.** `Vitals.diesOfNeglect` (`S/lib/vitals/Vitals.ts:1649`) is true
for an interactive body or a stamped chattel. Three call sites gate four
deaths: `ThermalRegulation.ts:1138` (hypothermia), `:1176` (hyperthermia),
`S/lib/metabolism/Metabolic.ts:1382` (starvation and dehydration). The skip:
`Metabolic.ts:762` drops any gap over `MAX_REASONABLE_GAP_SEC` (4 h) unless
`integratesLongAbsence()` (l.836, true for stamped chattel). The same far-past
guard is in Respiration, Vitals' conditions, Caster and Combustible (census
below). Basal drains: satiation 0.02 %/min, hydration 0.03 %/min;
`STARVATION_LETHAL_SEC` 24 h, `DEHYDRATION_LETHAL_SEC` 8 h. Metabolism also
slices at 60 s, `MAX_STEPS` 720.

**Clothing.** `Wearable.getClo()` (`S/lib/slot/Wearable.ts:524`) is cloth only.
`Attired.insulationAt` (`S/lib/slot/Attired.ts:909`) adds
`textiles.clo.enclosedAir` (0.5 local clo per worn layer, dried out by
wetness) and a fit penalty; `bodyInsulation()` weights parts by surface share.
Coverage comes from the body plan's slot `covers:` list. The biped plan
(`C/species-and-names/content/stuff/idea/species/BodyPlan/biped.yaml`) has
`head, torso, legs, feet, hands` each `capacity: 4`, `torso` covering
`body.torso` only; **no slot covers `body.arm.*` above the hand**, and `neck`
has no `covers`. A garment claims slots by `slotClaims` per body plan, and a
multi-slot claim is atomic (`Wearable.ts` header). Garments:
`C/generic-objects/content/stuff/thing/clothes/` (13 rows; jumper `[torso]`,
greatcoat `[torso, legs]`, hood `[head]`, work-gloves `[hands]`). Loft is on
the construction-form rows (`C/platform/content/fabrics/`), not the garment.

**Rooms.** `S/lib/biome/Atmospheric.ts`: `reconcileEnvelope()` (l.1724) is
closed-form per piece and records breakpoints in a `TrajectoryLog`
("so bodies can read the curve back"). Occupant heat is read by shape:
`envelopeHeatBudget()` (l.2019) calls `roomHeatExchange()` on any occupant
that has one. Two implementers: `SpaceHeatingMixin`
(`S/lib/thermal/SpaceHeating.ts:115`) and `Store` (`S/lib/storage/Store.ts:1277`).
The interface is `S/lib/thermal/RoomHeatExchange.ts`. The envelope reads the
occupants as they are at reconcile time for the whole gap (the header admits a
burnt-out hearth over-credits one read).

**Deliberation.** `S/lib/behavior/Behaved.ts`: one beat per agent
(`_deliberate`, ~l.600); candidates answer `urgency(ctx)`;
`Urgency` (`S/lib/behavior/Urgency.ts`) has four bands and five kinds.
**"Watched" is already defined**: `_hasAudience()` (l.1015) = a body with a
live session, not Behaved, in the same room. Unwatched, the beat still fires on
`behavior.beatNightlyMs` and consults only `presenceGated = false` brains.
`calledToAt(nowS)` (l.256) asks brains for a visit window. `_runAct` runs a
brain under `runAsSelf`. Brains: `eats.ts` (342 lines, 2 rows use it), `stokes.ts`
(160 lines, 3 rows: smith, potter, tinker; finds a `Burner` in the room and
fuel loose in the room or carried; presence-gated), `homes.ts` (animals),
`frequents.ts` (8 rows), `BrainMoves.ts` (the shared walk).

**Employment.** `S/platform/idea/api/EmploymentLogic.ts`: `tickBusiness`
(l.1766) runs hourly per house; `moveForShift` (l.1001) teleports a hand to its
station; `placeOffShift` (l.1073) takes a hand of an `offShift: out` house to
null with *"… leaves."*, unless `calledToAt` names a place.
`Business.offShift` (`S/platform/idea/Business.ts:204`) accepts only `'out'` or
nothing. `RosterAssignment` (`S/lib/employment/Roster.ts:40`) carries
`positionKey, assignee, schedule[{days, hours, season?}], station?`.
`Position` has no effort field.

**NPC classes.** `S/lib/npc/NPC.ts` = `PropsMixin(CostumedMixin(BehavedMixin(Character)))`;
`S/platform/agent/Cast.ts` = `CastMixin(NPC)`; `S/platform/agent/Extra.ts`
extends `NPC`. `Character` composes `EmployedMixin`, `CarryingMixin` over
`Actor`; `Creature` composes thermal, metabolic, vitals, attired.
Animals do not extend `NPC` (`Beast` = `BehavedMixin(Actor)`).
`CostumedMixin` (`S/lib/stuff/Costumed.ts`) applies once under `_costumeWorn`.

**Supply-shaped content.** Water: `WaterFixture` with `suppliedBy`
(`S/platform/thing/WaterFixture.ts`); the market standpipe draws on the city
intake, the fountain is `continuous`. Food: `Stock` counters with `stockLines`
and `prices` (`S/lib/retail/Stock.ts`); the bread counter is self-service.
Fire: 15 places hold a Hearth/Brazier; four are authored lit. Kept containers:
`S/platform/thing/Locker.ts`; `Container.isKept()` (furnishing.md).
There is no `supply`, `kit` or `uniform` key anywhere.
`Locality` (`S/platform/idea/Locality.ts`) is a row with its own `fieldMeta`.

**The Delight dairy.** `byre.yaml` is a `PersistentHall`, no `enclosure:` or
`roof:` keys, no heater, door prose "propped open", a `water-butt` prop, the
two herd books, cast = dairywoman and dairy lad. Both wear the student
costume plus a field jacket.

**Outdoor posts.** 36 roster slots stand under open sky or an open-sided roof.
The table is in W8. Hollow Mere has no heater of any kind.

**Derive-on-read clocks.** About 40 mixins hold a game-second stamp as a plain
`{persistent: true}` field. Bodies: Thermal, ThermalRegulation, Metabolic,
Respiration, Vitals (per-condition `tickedAt`), Caster, Memorized (per-entry),
Organism (`bornAt`, `diedAt`), Postmortem. Things: Freshness, Contaminable,
Dosed, Ripening, Maturing, Wet, Moist, Greenware, Percolating, Faced,
SelfHeating, Combustible, Burner, Charged, Battery, MechanicalMovement, Mould,
Pumping, Fractionating, Bilge, Handling, Producing, Growing, Soilable (arrays),
Launcher (`readyAtS`); packs: ManaPowered (arcana), Colony (apiculture),
Rearing/EggLot/Cocoons (sericulture), Finishing (textiles), Tanning, Clay
(quarrying). No generic rebase exists. `ContainmentLogic.move`
(`S/platform/idea/api/ContainmentLogic.ts:605`) fires `onContainableRemoved`,
`onContainableAdded` and the item's `onMoved(from, to)`; `Thermal.onMoved`
skips its restamp when `to` is null. The world clock persists
`elapsedGameTimeS`, so downtime adds no game time.

**Staging tools.** `testharness` (`C/platform/content/platform/cmd/system/testharness.yaml`,
controllers `S/platform/idea/cmd/system/TestHarness*Controller.ts`) has
`clock`, `clock-advance` (one game day at most outside soak), `weather-pin`
(a weather *kind*, no temperature), `daylight-pin`, `body` (reads core,
conditions), `body-kill`, `afflict`, `vanish <id>`. Nothing reads a heat
budget, a presence route or watched state, and nothing sets the season.

**Diagnostics.** `DiagnosticApi.record(RuntimeDiagnostic)`
(`S/api/diagnostics.ts`; type in `packages/types/src/index.ts:5437`) appends a
row and pushes it; `channel: 'content-error'` routes the row to whoever holds
title over `path`. Readers: the `errors` verb and the CMS pane.

**In flight.** Tropes (`origin/build/tropes`, plan D1/D25) plants
`metadata.actId` in `Behaved._runAct` beside `runAsSelf`. A brain that runs
through `_runAct` carries it with no code of its own.

## ⭐⭐ New substrate

Every item, with its reuse-ledger row. The P9–P14 line for each is in
*Convention conformance*.

| # | item | ledger row |
|---|---|---|
| N1 | The heat budget inside `ThermalRegulationMixin`: `heatBudget()` and a segment solver replacing the slice. The band constants are deleted | *a body's core temperature* — generalize. *work heat* — reuse. *reconcile on read* — generalize |
| N2 | `ThermalRegulationMixin.roomHeatExchange()` and `Herdbook.roomHeatExchange()` (third and fourth implementers of the shipped protocol); `reconcileEnvelope(untilS?)` | *room temperature* — generalize |
| N3 | An `arms` slot on the biped plan, `covers` on `neck`; seven garment rows | *arm coverage* — generalize; *clothing insulation* — reuse. Data only |
| N4 | `clock` on `FieldMeta`; `Stuff.rebaseClocks(deltaS)` `@hook`; `Containable.outOfStorySinceS`; the walker in `ContainmentLogic.move`; `lint:clock-fields` | *null is timeless* — genuinely new as a rule (the ledger says so) |
| N5 | `AbortReason` member `left-story` | **genuinely new.** Searched `AbortReasonRegistry` in `packages/types`; W4 confirms no existing member means "the actor is no longer anywhere" |
| N6 | `Creature.isWatched()` and `Creature.comeIntoView()` | *watched / unwatched* — reuse: `Behaved._hasAudience` moves here and is deleted there |
| N7 | `presence` and `home` fields on `lib/npc/NPC`; `Business.offShift` gains `here` | *off shift*, *a role whose body is fresh* — reuse |
| N8 | `Supply` value object (`S/lib/npc/Supply.ts`); `supply` on `Business`, `commons` on `Locality` | *supply on places* — extend the declarations; no document kind. *the commons* — reuse, marked |
| N9 | Needs on `lib/npc/NPC` (methods, not a mixin): levels, `useSupply`, kit on and off, `settleUnwatched` | *one deliberation*, *outdoor kit*, *reconcile on read* |
| N10 | One brain, `/lib/behavior/needs`; `eats` is deleted; `stokes` reads supply | *eating* — fold; *keeping a fire* — reuse, widened; *one deliberation* — reuse |
| N11 | `Burner.tendedUntil(fromS, toS, fuel)` | *keeping a fire* — generalize (the same stoke arithmetic over a span) |
| N12 | `Vitals.refreshBody()` | *a role whose body is fresh* — the Extra rung's body half |
| N13 | `testharness body` budget lines; subcommands `presence`, `air-pin`, `herd` | owed tooling (workflow § staged) |
| N14 | `lint:supply` | genuinely new gate; searched `S/package.json` `lint:*` |
| N15 | Rows: `coat-pegs` fixture, warming places, a business kind parent, test fixtures, reason rows, setting keys | content |
| — | The death report | *the death report* — reuse `DiagnosticApi.record`; nothing new |
| — | `Vitals.diesOfNeglect`, `integratesLongAbsence`, `billsTheGap`, `MAX_REASONABLE_GAP_SEC` body guards | *the backstop* — **delete** |
| — | Act identity per turn | *act identity* — coordinate (D18) |

**No new Api, logic singleton, registry, document kind, Mongo collection,
module category or exported helper.** No new mixin: N9 lives on the one class
that would compose it.

## Plan-level decisions

**D1 — The body is one node with a heat budget.** Per segment (inputs held):

```
A      = body surface, m²            (the body plan's Meeh surface)
C      = mass · c                    (bodyHeatCapacityJPerK, shipped)
R      = 0.155·(I_tissue + I_cl) + R_air(v)        m²K/W
G      = A / R · (1 + wetAmp)                      W/K
M      = M_rest · (1 + effort)                     W
usable = (1 − f_resp) · M                          W
need   = G · (T_set − T_air)                       W to hold the setpoint
```

`I_cl` is `bodyInsulation() + coatInsulation()` exactly as shipped (clo).
`I_tissue` is a setting (`thermal.tissueClo`, start 0.5). `R_air(v)` is
`1 / (h_c(v) + h_r)` with `h_c = 8.3·v^0.6` (floor 3.1 in still air) and
`h_r = 4.7` W/m²K (the ASHRAE Fundamentals forms); the shipped `windproofing()`
scales `v`. `wetAmp` is the shipped `wetHeatLossAmplifier()`. `M_rest` is
`thermal.restWPerKg075 · mass^0.75` (start 3.5, so 70 kg rests at 85 W).
`f_resp` is 0.25. `effort` is D3.

Regimes, in order:

1. **Surplus** (`usable + stored ≥ need`): the core holds the setpoint. The
   surplus is shed by the shipped `shedAndOffset` rule (sweat, wet-bulb
   ceiling, clo damping, hydration cost); what cannot be shed accumulates on
   `heatLoadJ` and reads as a core offset, as now.
2. **Deficit**: `heatLoadJ` pays first (this is *work heat counts while you are
   losing*). Then shivering, `S = min(need − usable, S_max)`,
   `S_max = (COLD_SPEND_MAX_BASAL_MULT − 1) · M_rest`. Shivering costs
   satiation on metabolism's own scale: `BASAL_SATIATION_PER_MIN` buys `M_rest`
   watts for a minute, so `S` watts cost `S / M_rest` times that. No satiation,
   no shivering.
3. **Losing** (`usable + S_max < need`): the core relaxes exactly,
   `T(t) = T_ss + (T_0 − T_ss)·e^(−t/τ)`, `T_ss = T_air + (usable + S)/G`,
   `τ = C/G` (`Decay.toward`).

Ectotherms and bodies that run no living processes drift with `usable = 0`, as
now. Immersion keeps its shipped fold (`exchangeWithWater`) as the segment's
`T_air`; the underwater tests must stay green.

**D2 — Reconcile is segments, not slices.** A segment ends at the first of: a
breakpoint in the room's `TrajectoryLog`; `heatLoadJ` reaching zero
(`J / deficit`); satiation or hydration reaching zero (linear); the core
crossing a line the cascade reads (solve the exponential for `t`); the lethal
dwell completing; `now`. Each is O(1). `REG_STEP_SEC`, `REG_MAX_STEPS`,
`probeFrom`'s slice walk and `secondsToNextCrossing`'s probe are replaced by
the same solver asked "when is the next crossing". The `_probe` scratch and the
`_reconcileClo` cache go with the slices. Deleted constants:
`BAND_HALF_WIDTH_K`, `COLD_SPEND_PER_DEGREE`, `CLO_TO_KELVIN`,
`WIND_CHILL_PER_MS` and the wind/wet half of `effectiveAmbient()`
(`effectiveAmbientK` remains as the cached room air plus seat warmth and
working offset). Cues are unchanged: *shivering* when `S > 0`, *sweating* when
shedding.

**D3 — Effort is what the body is doing.** Discrete acts keep arriving through
`Exerting.exert` → `absorbHeatLoad` (unchanged). A sustained post has no acts,
so `ThermalRegulationMixin` gets a `@hook sustainedEffort(): number` (default
0, a multiple of rest). Two implementers: `EmployedMixin` returns the seat's
effort while `isFulfilling()` (`Position.effort`, optional number; default from
setting `employment.shiftEffort`, start 1.0, i.e. 2 met), and `NPC` returns 0
while it is at a warming place. W8 authors `effort` on the heavy seats (hewer,
cane cutter, ice crew, setter: 2.0).

**D4 — The calibration is ISO 11079 and ASHRAE 55.** Two tables in the bench:

- *Ensembles* (ASHRAE Standard 55, clothing-ensemble table): trousers and a
  long-sleeved shirt 0.61 clo; with a jacket 0.96; with a long-sleeved sweater
  1.01. The shipped rows composing those ensembles must read within **±0.15
  clo**. This is the test `textiles.clo.enclosedAir` takes: it stays a
  setting, and its value is whatever fits this table. Record the fitted value
  in the wave commit. (Deriving it from fit is textiles-slate's.)
- *Required insulation* (ISO 11079, IREQ-neutral, still air): the clothing at
  which the model stops shivering, at 70, 115 and 175 W/m² and at +10, 0, −10
  and −20 °C. Tolerance **±0.4 clo or ±20 %**, whichever is larger. The build
  transcribes the rows from the standard and cites the edition in the test
  header. ⚠ I did not have the standard open. The dry heat balance it is
  built on (`I_total = (33 − t_a) / (0.155 · 0.75·M)`, less about 0.7 clo of
  still air) gives these, which the transcribed rows should sit near: 175 W/m²
  → 0.45 / 0.9 / 1.4 / 1.9 clo; 115 W/m² at −10 °C → about 2.5; 70 W/m² at
  +10 / 0 °C → about 2.1 / 3.4. If the standard cannot be obtained, pin to
  these with the formula cited and say so in the MR.
- Anchor: 1 clo, 1 met, 21 °C, still air is neutral (the definition of the
  clo). One row, tolerance ±1 K.

Tuning knobs, in order: `thermal.tissueClo`, `textiles.clo.enclosedAir`,
`f_resp`. `M_rest` and `S_max` are physiology and are not tuned to fit.

**D5 — A body warms its room by conductance.** `roomHeatExchange()` on the
regulation mixin answers `{fixedW: 0, conductanceWperK: G, anchorK: core}`
using the `G` cached at the body's last reconcile (no slot walk, O(1)). The
room then gains exactly what the body's budget loses, and a crowd cannot heat
a room above skin temperature. A dead body answers its drift conductance, so a
corpse cools into the room honestly. Cost: one multiply per occupant per
envelope piece, on a loop the envelope already runs.

Occupancy is a breakpoint: `AtmosphericMixin`'s `onContainableAdded` /
`onContainableRemoved` reconcile the envelope up to now **with the occupant
set that held during the gap** (on removal, the departing item's exchange is
counted for the closing segment). W2 confirms where those hooks live for a
place and adds them if a place has none.

**D6 — A herd warms its byre through its book.** `Herdbook` (trade-ranching)
implements the kernel `RoomHeatExchanging` interface (imported by package
specifier): `fixedW = tally × herdHeatW(species)` while the herd is in, else
0. `herdHeatW` is `thermal.restWPerKg075 · mass^0.75 · thermal.herdMaintenance`
(start 2.0), usable share only. *In* is a new authored and runtime field on
the book, `housed: boolean` (default false; the two Delight books author
`true`). Turning out and bringing in are a `testharness herd <book> in|out`
staging call in this build; the verbs for it belong to ranching and leave as a
line in backstops-owed-slate (see Deferred seams). See conflict 1.

**D7 — Null is timeless by declared clocks and one walker.**

- `FieldMeta` gains `clock?: 's'` — "this field is a game-second instant".
  Every stamp field in the census declares it, `bornAt`, `diedAt`,
  deadlines (`readyAtS`, `thermalWakeAtS`) included.
- `Containable` gains `outOfStorySinceS` (persistent, runtime, **not** a
  clock field). A thing is *out of the story* when the root of its container
  chain is not a place and that root's container is null.
- In `ContainmentLogic.move`, after the move: story → out: stamp the moved
  item `outOfStorySinceS = now`. Out → story: `Δ = now − s`, where `s` is the
  nearest `outOfStorySinceS` on the moved item or up its **old** chain; walk
  the moved subtree; for each node add its own Δ (a node with its own later
  stamp uses that) to every `clock: 's'` field that is non-zero, call
  `rebaseClocks(Δ)`, clear the node's stamp. No stamp found → Δ = 0 (a fresh
  clone placed for the first time).
- `Stuff.rebaseClocks(deltaS)` is an `@hook`, no-op terminal, for clocks the
  walker cannot see: `Vitals` (per-condition `tickedAt`), `Memorized`
  (per-entry), `Soilable` (`washes[].atS`, `heat`, `bath`), `Thermal` (its
  trajectory log), `ThermalRegulation` and any other wake holder (re-arm),
  `Atmospheric` is a place and is never rebased.
- `lint:clock-fields` (census then ratchet at zero): in `lib/**` and every
  pack `src/`, a persistent numeric field whose name matches
  `Stamp|AtS$|At$|Since|CheckedS|ToS$|DueS$` on a class or mixin that is not a
  place must declare `clock`, or carry `clock: false` with a reason in a
  trailing comment. That gate is what makes this one rule and not forty
  choices.

Leaving first ends what the leaver was doing: on a story → out move of an
`Engaged` item, `ContainmentLogic` cancels its engagements with
`left-story`, and the engagement's own abort line is what the room reads
(step 7a's "stops with a line saying why"). Time-triggered schedules a host
holds (`WorldClockApi.at … {host}`) do not fire for a host out of the story;
they are re-armed by `rebaseClocks`.

Not rebased, deliberately: records (bank, contracts, employment), places, and
anything unloaded (it is still in its place). An empty room is in the story.

**D8 — The far-past guards go.** With D7 an absent body is frozen by where it
is, not by a gap test. Delete the `MAX_REASONABLE_GAP_SEC` branch in
`Metabolic`, `ThermalRegulation` (`billsTheGap`), `Respiration`, `Vitals`
conditions and `Caster`, and `integratesLongAbsence`. `Combustible`'s is a
thing's and is left (noted in Deferred seams). Linkdead freezing is unchanged.
Metabolism keeps its 60 s slices; its `MAX_STEPS` collapse now runs for long
unwatched gaps, so W4 replaces the collapse with exact stepping to the next
*event* (D15 never asks it to cross more than one).

**D9 — Watched is one predicate on the body.** `Creature.isWatched()`: a body
with a live session stands in this body's room (itself included). It is
`Behaved._hasAudience` moved down one class; Behaved calls it. A body arms its
thermal wake only while watched or while `presence` is `live`; an unwatched
body holds no timer at all. A place's `onContainableAdded`, when the arrival
has a live session, calls `comeIntoView()` on each living occupant: reconcile
now, arm the wake, pull the beat forward (`requestBeat`). When the last such
body leaves, nothing is torn down eagerly: the next wake finds itself
unwatched and does not re-arm, and the beat does the same (D10).

**D10 — An unwatched NPC's brain does not beat.** In `Behaved._scheduleBeat`,
a host that is not watched and whose `presence` is not `live` schedules
nothing; `comeIntoView()` restarts it. The `presenceGated = false` brains
(`cellars`, `feeds`, `homes`, `restocks`' unwatched leg) are the exception the
shipped design already made: a host that composes one keeps the nightly beat
for those brains only. W5 lists them and leaves them; moving unwatched
production into arithmetic is unobserved-economy-slate's.

**D11 — Supply is a value on the house and the town.** `Supply` parses

```yaml
supply:
  warmth: <place path | here>
  fire:   <burner row path>        # the house fire to keep
  fuel:   <keyword>                # optional, as stokes' config
  water:  <thing row path>
  food:   <thing row path>         # a Stock counter
  kit:    <thing row path>         # a kept container of garments
```

on `Business.supply`, and the same shape minus `kit`/`fire` on
`Locality.commons`. An entry is either an absolute path of a standing thing or
place, or a **kind** (a row path such as `/stuff/thing/fixture/coat-pegs`)
that resolves to the thing in the hand's station place, then the house's
operating locations, whose template path is that row or `extends:` it. That
is what lets a business kind parent row carry supply for every instance, and
a second dairy inherit it. `Supply.resolve(need, hand)` walks house → the
commons of the Locality the hand's station addresses (longest prefix,
`AddressableMixin`) → null. Paths load on use (`StuffApi.singleton`); nothing
is searched and nothing boots.

**D12 — Three needs, one brain.** `NPC` answers `needLevel(need): Urgency` for
`cold`, `thirst`, `hunger`:

| need | wanted | pressing | critical |
|---|---|---|---|
| cold | shivering | core below setpoint − 1 K | below `survivableMin` + 1 K |
| thirst | hydration < 50 % | < 30 % | < 15 % |
| hunger | satiation < 50 % and a meal hour | < 30 % | < 15 % |

Thresholds are settings (`needs.*`). `/lib/behavior/needs` is `kind: body`,
`claims: ['body']`; its `urgency` is the worst level with its `because`
("rubs her hands and makes for the fire"); its `act` calls
`host.tendNeed(need)`: walk to the supply (`BrainMoves`), `useSupply`, walk
back to the station. `NPC.onCreate` adds the spec
`{brain: /lib/behavior/needs, trigger: candidate}` when the row does not list
it, so no row authors it. `stokes` is added the same way and reads
`supply.fire`/`supply.fuel` when its config names none; its presence gate
stays (unwatched tending is D15's). `eats.ts` is deleted; its
purse-chooses-the-loaf rule moves into `useSupply('hunger')` unchanged, with
`spendFraction` a setting; the two rows drop their spec.

**D13 — `useSupply` is the one effect, called by both paths.** On `NPC`:

- `thirst`: draw from the fixture by the call `DrinkController` makes on the
  model, to full. The fixture's own supply chain is debited by that call.
- `hunger`: buy by the call `BuyController` makes on the `Stock` (the hand's
  account pays the house through the bank chokepoint), then eat by
  `EatController`'s model call. No counter stock or no money: the need stays
  and the hand says the hungry line (shipped behavior).
- `cold`: be at the warm place until the core is back at the setpoint.
- A supply that resolves to nothing: the need stays. That is the honest path
  to step 9.

W6 names the three model calls after reading the controllers. If any decision
lives in a controller, it moves to the model first (P5) in that wave.

**D14 — Weather kit is dressed from the peg and goes back.** At shift start,
and on each `cold`/heat deliberation while on shift, `NPC.dressForPost()`
asks the budget, at the station's air, whether the body holds its setpoint
without shivering. If not, it takes from `supply.kit` the garment that adds
the most insulation and fits a free slot, moves it to itself and wears it (the
model call `wear` makes), and repeats until it holds or the peg is empty.
If the body is shedding (regime 1 with sweat) it takes kit off, most
insulating first, and hangs it back. Kit worn is remembered as
`kitWorn: string[]` of chattel ids (persistent; survives restart). Before
leaving the story (`placeOffShift`) and at `refreshBody`, `returnKit()` hangs
every remembered piece back. Kit garments are stamped to the house
(`ChattelApi`) when the peg is first stocked from its row. Each on and off is
an `act.deed` line to the room.

**D15 — An unwatched NPC is settled by events.** `NPC.settleUnwatched()` runs
at the head of the NPC's `reconcileMetabolism` and
`reconcileThermalRegulation` overrides (reentry-guarded), so every read of an
NPC sees settled state, not only an arrival. From its last settle time to now:

1. If it was on shift and `supply.fire` resolves in its room: compute
   `t_out = fire.tendedUntil(from, now, looseFuelHere)` without mutating;
   `room.reconcileEnvelope(t_out)`; apply the fuel consumption and, if
   `t_out < now`, put the fire out; then `room.reconcileEnvelope()`.
2. Loop: ask the three stocks' solvers for the next time a need reaches
   `pressing` (heat: D2's crossing solve against the room's log; thirst and
   hunger: metabolism stepped to its next threshold). Advance all three
   clocks to that instant. Call `useSupply(need)`. For `cold`, the body's air
   becomes the warm place's (read off that place's own log) until the core
   recovers, then the station's again. Kit is re-decided at each event (D14).
3. Stop at `now`. If the last cold event was still warming, the body is moved
   to the warm place (`teleport`, as a shift move is); otherwise it is at its
   station.
4. A death found on the way stops the loop at its instant: `beginDying` with
   the real time of death, the body left where it was, and D16's report.

It never estimates: every stock is advanced by the same solver the watched
path uses, and every debit is `useSupply`. The loop is bounded by events (a
drink every few hours, a meal a day, a warm-up cycle per chill), a few dozen
per game day.

**D16 — A neglect death is reported once.** At `ConditionApi.die` for the
causes hypothermia, hyperthermia, starvation and dehydration, when the body
has no live session, `DiagnosticApi.record({ path: <the body's template path>,
channel: 'content-error', severity: 'error', message: … })` naming the cause,
the place, the house and which supply resolved to nothing. The corpse stays.
No new log.

**D17 — Presence.** On `lib/npc/NPC`: `presence: 'live' | 'watched' | 'role'`
(authored; default from `defaultPresence()`: `Cast` → `watched`, `Extra` →
`role`) and `home: <place path>` (optional).

- `live`: always wakes and beats; never taken out of the story.
- `watched`: D9/D10/D15. Off shift: walks to `home` if authored, else out.
- `role`: as `watched` on shift; at each shift start `refreshBody()` (full
  reserves, setpoint core, neglect conditions cleared, costume re-applied) and
  it is always out off shift.

`Business.offShift` accepts `out` (now the default when absent) and `here`
(hands stay); the eleven explicit `out` rows keep working. `placeOffShift`
reads: house `here` → nobody moves; NPC `live` → nobody moves; a
`calledToAt` window → there; `home` → walk there by `BrainMoves` when watched,
`teleport` when not; else `returnKit()`, the departure line, null. The lounge
cast are authored `presence: live` in W8.

Animals: `Beast` and the kept-animal base call `refreshBody()` in
`comeIntoView()` when nobody owns them (not a stamped chattel). See conflict 3.

**D18 — Tropes.** The `needs` and `stokes` turns run through `_runAct` and
carry the act id with no code here. `settleUnwatched` wraps each
`useSupply` in `ExecutionContextApi.runAsSelf`; when tropes has merged,
it plants one `metadata.actId` per settled event by the same call `_runAct`
uses. Whichever branch merges second takes a three-line conflict in
`Behaved._runAct`/`_scheduleBeat`; D10's edit is in `_scheduleBeat` only.

**D19 — Sleeves.** The biped plan gains
`{ name: arms, accepts: WearableMixin, capacity: 4, covers: [body.arm.left, body.arm.right] }`
and `neck` gains `capacity: 4, covers: [body.neck]` if the plan has that part
(W3 checks the part list; if there is no neck part the scarf claims `head`).
A sleeved garment claims `[torso, arms]`. No code: multi-slot claims are
atomic already. W3 checks every other humanoid plan that copies biped's slots.

## ⭐⭐ Host placement

| new thing | host | what composing it claims of the host's other composers |
|---|---|---|
| heat budget, `sustainedEffort` hook, `roomHeatExchange` | `ThermalRegulationMixin` (on `Creature`) | Every creature has a heat budget and warms its room. True of every living and dead body; an ectotherm answers with no production. No narrowing guard |
| `isWatched`, `comeIntoView` | `Creature` | Every body can be seen or not. A player's own body is watched by itself, so nothing changes for it |
| `refreshBody` | `VitalsMixin` | "This body can be set to its kind's baseline." Meaningful for any body; called only by a role |
| `presence`, `home`, needs, kit, `settleUnwatched` | `lib/npc/NPC` (class body) | Claims it for Cast and Extra and the six locality NPC subclasses (Tinker, TicketClerk, Realtor, Walter, Editor, Katie, Pilot). All are people with posts. Not on `Character` (a player has no route), not on `Behaved` (a cat has no house) |
| `Position.effort` | `Position` value | Every seat has an effort; the default is honest for most (light work) |
| `supply` | `Business` | Every house may supply its hands. Most will answer yes once authored (36 outdoor slots, every heated shop). Not on `Organization` (a government or a company with no premises supplies nothing) |
| `commons` | `Locality` | Every town may have public water, food and warmth. A locality with none answers none, and its cast then has nothing: correct, and `lint:supply` says so |
| `housed`, `roomHeatExchange` | `Herdbook` (trade-ranching) | Every herd is in or out. True |
| `outOfStorySinceS` | `ContainableMixin` | Everything containable can be out of the story. True by definition of null |
| `clock` | `FieldMeta` | A declaration, not a capability |
| `tendedUntil` | `Burner` | Every burner can be tended over a span. True |
| `arms` slot | the biped plan row | Every biped has arms to cover |
| `kit` flag on garments | none | Kit is decided by the peg it hangs on and its title, not by a field on every garment |

Rejected hosts, recorded so review does not re-open them: a `supply:` key on
`Location` (most places would answer nothing; conflict 5); needs on `Actor`
(animals and players would answer "no"); presence on `Employed` (a route is
about the body, and `live` cast have no shift); a `NeedingMixin` (one
composer).

## Convention conformance

Checked at plan time against `CLAUDE.md` and the tree.

- **`props:` / `cast:`**: new fixtures are placed by their place's `props:`;
  no `container:`, no `populates:`.
- **Locations, not rooms**: warming places are `Hall`/`Room` class rows under
  `<locality>/place/`; prose says "place".
- **Paths**: kernel code under `S/lib/thermal`, `S/lib/npc`, `S/lib/behavior`;
  content rows under `/stuff/thing/...` (generic-objects), `/world/...`
  (venues), `/platform/...` (settings, views). No pack gains a root.
- **Module scope declares**: the default `needs`/`stokes` specs are added in
  `NPC.onCreate`, not at module scope.
- **Import boundary**: trade-ranching imports `RoomHeatExchange` by
  `@saxonberg/server/mud/lib/thermal/RoomHeatExchange`; W2 adds it to the
  server `exports` map if absent.
- **Module categories**: one value object (`Supply`, named for its concept, in
  `lib/npc/`), one brain, no helper functions, no new `lib/` folder.
- **Verbs on objects**: every new act is a method on the body, the burner or
  the book. No `XApi.verb(host)`.
- **P3 refuse / skip / throw**: a supply that resolves to nothing is a skip
  with the need standing, and a death is reported (D16). A `supply` entry
  naming a row that does not exist throws at hydrate (`setSupply`) and fails
  `lint:supply`. A walk with no route is a `content-error` diagnostic and the
  need stands. `rebaseClocks` on a non-finite Δ throws.
- **P4 no duck typing**: `Herdbook implements RoomHeatExchanging` by import.
  The envelope's shipped shape read (`roomHeatExchange?.()`) stays as it is
  (storage-and-ice D5); this build adds implementers, not casts.
  `BodyRegulation → Employed` goes through the `sustainedEffort` hook, not a
  narrowing.
- **P5 the mixin decides**: the `needs` brain picks nothing; `NPC` decides
  level, supply and effect. Controllers are untouched except where W6 moves a
  decision out of one.
- **P6 persistence per content**: the coat pegs are a kept container in each
  place (a `Locker`-class row); kit is live content, stocked once from the
  row. `kitWorn` keys on chattel ids. `outOfStorySinceS` and `presence`
  ride the host's own record. No class persists what it hosts.
- **P7 load on use**: supply resolves by authored reference; the commons by
  the hand's own address; no roster of supplies, no boot entry.
- **P8 names**: `Supply` (the common word; nothing ships with it), `needs`
  (one brain, one word), `left-story`, `housed`, `effort`, `presence`, `home`
  (`homes` brain reads its own `home` config; W5 checks the two do not
  collide on one row).
- **P9–P14, per item:**

| item | P9 predictable | P10 doc? | P11 no dest. branch | P12 no synonym | P13 right mixin | P14 nothing invisible |
|---|---|---|---|---|---|---|
| N1 budget | `help warmth` gains the budget's terms; `testharness body` prints them | n/a, physics | n/a | replaces the band; band deleted | regulation's header is "the living body's heat" | cues unchanged |
| N2 room heat | `analyze rooms` lists occupants' heat (W2 adds the line) | n/a | envelope asks one protocol | same protocol | regulation; the book is the herd | no |
| N3 arms slot | `look`/`outfit` show the slot | a plan row | n/a | n/a | body plan | no |
| N4 clocks | not a command | `clock` is meta on fields | the walker is inside `move`; no caller branches | no new move | Containable = "can be in a container" | ⚠ `move` now ends engagements and shifts stamps; both are stated in spatial.md and the leaver's line is shown |
| N5 `left-story` | the abort line names it | vocabulary member | n/a | W4 confirms | n/a | no |
| N6 watched | not a command | n/a | n/a | replaces `_hasAudience` | Creature | no |
| N7 presence | row keys; `help authoring cast` | fields on the NPC | n/a | n/a | NPC | off-shift move has a line |
| N8 supply | row keys; `lint:supply` | ⭐ a value on two rows that code reads by field, not a table read by name: not a Document, and not an Idea class | resolve is inside `Supply` | n/a | Business / Locality | no default supply; nothing resolves → nothing |
| N9 needs on NPC | a watcher reads the `because` line | n/a | `useSupply` asks the supply by its own protocol | n/a | NPC | choice among kit garments is by one stated rule and is shown |
| N10 `needs` brain | brain `summary` | n/a | n/a | `eats` deleted | brain | implicit spec is documented in behavior.md and visible in the studio's composed row |
| N11 `tendedUntil` | n/a | n/a | n/a | it is `stoke` over a span; calls `stoke` | Burner | no |
| N12 `refreshBody` | n/a | n/a | n/a | n/a | Vitals | the role route is authored |
| N13 harness | the view's help text | n/a | n/a | subcommands, one word each | n/a | no |

- **Lint gates this build must pass**: `lint:family` whole. Specifically
  touched: `lint:instanceable`, `lint:module-scope`, `lint:imports`,
  `lint:idle-cadence` (new candidate brain declares the full set),
  `lint:mixin-clusters` (NPC is a class, not counted; ThermalRegulation's
  cluster shrinks), `lint:lib-statics`, `lint:view-keys` and `lint:one-word`
  (harness subcommands), `lint:command-views`, `lint:identity`,
  `lint:openings`, `lint:biome-sky` (the byre's enclosure lowers it),
  `lint:schema`, `lint:data-ideas`, `lint:perishable`, plus the two new gates.
  No ceiling rises are planned. If one is needed, do the caller audit first.

## Waves

Each ends at one commit and is landable alone. `pnpm test:near`, the touched
packs' vitest and `lint:family` gate every wave.

### W0 — Tools and the bench as a target

Goal: the staging tools exist and the bench states the published target.

- `testharness body` prints: mass, surface, clo, G, M, shiver W, regime,
  steady-state core, τ, watched, presence, out-of-story-since. (Budget lines
  read "n/a" until W1.)
- `testharness air-pin <K> [--at <place>]` / `air-unpin`: holds a Locality's
  outdoor air temperature (beside the weather pin, same persistence). Skip if
  W0 finds the weather pin can already carry a temperature.
- `testharness presence <npc>`: prints route, watched, last settle, kit worn.
- Re-pin `S/lib/thermal/__tests__/Thermal.cold.gym.test.ts` to D4's three
  tables, with real garment rows, not clo overrides. It fails now; mark the
  two tables `it.fails` with the reason so the gym job stays green until W1
  and W3 flip them.

Files: the harness view and controllers, `TestHarnessLogic.ts`, the bench.
Acceptance: `testharness body <cast>` prints; the bench runs.
Commit: `build(cast-in-winter W0): the staging tools and the bench's target`.

### W1 — The heat budget (D1–D4)

Files: `S/lib/thermal/ThermalRegulation.ts`, `Thermal.ts` (constants),
`S/lib/employment/Employed.ts` + `Position.ts` (`effort`, `sustainedEffort`),
`C/platform/content/settings/thermal.yaml` (+ `AppSettingKeys`),
the regulation tests (`ThermalRegulation.*.test.ts` are rewritten to the
budget; `wake.test.ts` to the solver), thermal.md.

Acceptance: the IREQ table and the anchor pass in the bench; a unit test
shows a hauling body (`exert`) outlasting an idle one in the same air and
clothes (step 2's arithmetic); a 6-hour reconcile is one call with fewer than
ten segments in constant air; `rg BAND_HALF_WIDTH_K` is empty.
Commit: `build(cast-in-winter W1): a body keeps a heat budget`.

### W2 — Bodies and herds warm the room (D5, D6)

Files: `ThermalRegulation.ts` (`roomHeatExchange`), `S/lib/biome/Atmospheric.ts`
(`reconcileEnvelope(untilS?)`, occupancy breakpoints),
`C/trade-ranching/src/thing/Herdbook.ts` (`housed`, the protocol),
the `herd` harness subcommand, the `rooms` reading row (occupant heat line),
thermal.md, ranching.md.

Acceptance: unit: a sealed test hall with six bodies settles warmer than
empty by the closed form; removing them, it falls; a housed book of six
warms it and a turned-out one does not.
Commit: `build(cast-in-winter W2): people and animals warm the room`.

### W3 — Sleeves and the winter catalogue (D19, D4 ensembles)

Files: the biped plan (and humanoid plans that copy its slots);
`C/generic-objects/content/stuff/thing/clothes/`: edit `jumper`,
`student-shirt`, `field-jacket`, `greatcoat`, `tweed-jacket`, `blazer`,
`lab-hoodie`, `white-coat` to claim `arms` where sleeved; new rows `wool-cap`
(`[head]`), `scarf` (`[neck]`), `wool-socks` (`[feet]`), `mittens` (`[hands]`),
`oilskin` (`[torso, arms, legs]`, a close-woven oiled shell: high
windproofing, sheds rain), `work-shirt` and `work-jacket` (`[torso, arms]`,
wool). Each names an existing material and construction form; add a form row
only if none is honest (oiled cloth). `C/platform/content/settings/textiles.yaml`
(the fitted `enclosedAir`). textiles.md, slot.md.

Acceptance: the ensemble table passes in the bench; a unit test wears the
jumper and reads `bodyInsulation()` up by the arms' share; `grep` shows every
`slotClaims` row still names real slots (review B4).
Commit: `build(cast-in-winter W3): sleeves cover the arms`.

### W4 — Null is timeless (D7, D8)

Files: `S/lib/mixin.ts` (`FieldMeta.clock`), `S/lib/stuff/Stuff.ts`
(`rebaseClocks`), `S/lib/spatial/Containable.ts`,
`S/platform/idea/api/ContainmentLogic.ts`, every census mixin (one meta line
each; the five structured ones implement the hook), the packs' clocked
classes (arcana, apiculture, sericulture, textiles, tanning, quarrying),
`packages/types` (`left-story`), `S/scripts/lint-clock-fields.ts` +
`package.json`, the guard deletions, spatial.md, persistence.md,
lint-family.md.

Order inside the wave: write the lint as a census first and commit its count
in the wave message; declare; ratchet to zero.

Acceptance (unit, all on a test world): a body moved to null and back after
a 12 h clock advance reads the same core, satiation, hydration, wound stage
and age; a pail of milk it carried reads the same freshness and temperature;
the same pail left on the floor of an empty place has aged 12 h; an engaged
body moved to null has no engagement and the room got the abort line; a
restart while out of the story keeps the stamp. Players: logout and login
across a clock advance reads the same body (the old guard's test, now passing
for the new reason).
Commit: `build(cast-in-winter W4): out of the story is out of time`.

### W5 — Watched, and the presence routes (D9, D10, D17 less needs)

Files: `S/lib/creature/Creature.ts`, `S/lib/behavior/Behaved.ts`
(`_hasAudience` → `isWatched`, `_scheduleBeat`), the place base's
`onContainableAdded`, `S/lib/npc/NPC.ts` (`presence`, `home`,
`defaultPresence`), `S/platform/agent/Extra.ts`, `S/lib/vitals/Vitals.ts`
(`refreshBody`), `Business.ts` (`offShift: here`), `EmploymentLogic.ts`
(`placeOffShift`, shift-start refresh), `ThermalRegulation.ts` (wake only when
watched or live), behavior.md, employment.md, identity.md, residency.md.

⚠ The off-shift default flips for 64 houses in this wave. Before committing,
run the wire flows of the trades whose hands serve at night and fix by
authoring `offShift: here` or a roster hour, never by reverting the default.

Acceptance: unit: an unwatched Cast holds no wake and no beat handle; a
player entering arms both; an Extra's body is at baseline at shift start; a
Cast with `home` is at home off shift; a `live` Cast never leaves.
`lint:idle-cadence` unchanged or lower.
Commit: `build(cast-in-winter W5): fidelity follows attention`.

### W6 — Supply and the needs (D11–D14)

Files: `S/lib/npc/Supply.ts`, `Business.ts`, `Locality.ts`, `NPC.ts`
(`needLevel`, `tendNeed`, `useSupply`, `dressForPost`, `returnKit`),
`S/lib/behavior/needs.ts`, `stokes.ts`, delete `eats.ts` and its tests, the
two `eats` rows, `C/generic-objects/content/stuff/thing/fixture/coat-pegs.yaml`,
`C/platform/content/settings/needs.yaml`, reason and line rows,
`S/scripts/lint-supply.ts`, test-fixtures rows (a house with full supply, a
house with none, a testbed commons). behavior.md (the `eats` section becomes
the hunger need), a new `docs/subsystems/needs.md` (leave the CLAUDE.md index
line to the sweep).

`lint:supply`: every `supply`/`commons` path resolves to a row; a `kit`
resolves to a kept container; every roster slot whose station is under open
sky has a `warmth` that resolves (house or commons) and is not itself under
open sky.

Acceptance: wire flow on the testbed, watched: a chilled hand walks to the
fire and back; a thirsty one drinks; a hungry one buys and eats; a hand with
no house supply uses the commons; kit goes on in the cold and back on the peg
at shift end; a fire is laid and lit from supply. Each checkpoint is made to
fail once (B2).
Commit: `build(cast-in-winter W6): needs in the deliberation, supply on the house`.

### W7 — Settling the unwatched (D15, D16)

Files: `NPC.ts` (`settleUnwatched` and the two reconcile overrides),
`S/lib/fire/Burner.ts` (`tendedUntil`), `Metabolic.ts` (step to next
threshold), `S/platform/idea/api/ConditionLogic` or wherever `die` lands (the
report), needs.md, mortality.md, diagnostics.md.

Acceptance (unit, arithmetic): six unwatched winter hours at a supplied post
leave the hand alive, the fuel lower by burn rate × lit hours within one
item, water drawn equal to drain ÷ per-drink, money down by the meals due;
the **agreement test**: the same six hours run watched (a silent observer
body in the room, beats driven) and unwatched end within tolerance of each
other on core (±0.5 K), reserves (±5 points), fuel and water (±1 unit), and
place; a hand with no supply and no warm place is dead at the solver's time
of death and one diagnostic row exists; seven days is fewer than 500 events.
Commit: `build(cast-in-winter W7): an unwatched hand is settled honestly`.

### W8 — Content

Every row below, then `lint:supply` at zero.

- **Commons.** `Locality` rows for Terminus's districts get `commons:` — water
  the market standpipe, food the bread counter, warmth a new public warming
  room. The lounge bar's free water is the lounge locality's `commons.water`.
- **A business kind parent** `/stuff/idea/business/dairy` with
  `supply: { kit: /stuff/thing/fixture/coat-pegs, water: /stuff/thing/fixture/water-butt, warmth: … }`;
  the Delight dairy `extends:` it. This row is the second-instance proof.
- **The Delight dairy.** Byre: `enclosure:` (whitewashed brick) and `roof:`
  authored, the door a real boundary shut at night, coat pegs stocked
  (two each of work-jacket, wool-cap, scarf, mittens, oilskin), both herd
  books `housed: true`. Hesper Vane gets a roster slot (station the byre),
  the lad's slot a station. Warmth per conflict 4. Costumes: both swap the
  field jacket for the work shirt.
- **Lit fires.** The shop hearths stay unlit in their rows; `supply.fire` on
  each house whose station holds a Hearth or Brazier, and fuel props where
  the census shows none (chandlery, colorman, lower-towpath stove,
  goods-yards brazier).
- **Lounge cast** `presence: live`. Houses that serve at night: `offShift: here`.
- **Warming places for the 36 outdoor slots.** Existing where the census
  found one; authored where it did not. Each new place is an enclosed `Hall`
  with a Hearth or Brazier, fuel, coat pegs, a light source, and an exit to
  the post.

| slots | post | house | warmth |
|---|---|---|---|
| 1–3 | delight-road crossroads ×2, valley-gate | tinker's round | **new**: a roadmender's hut at the crossroads |
| 4 | tinker's yard | tinker's round | chandlery floor (light its hearth) |
| 5–6 | estuary lower-towpath | haulage depot, Nesbit ferry | **new**: a ferry hut; move the towpath stove into it |
| 7 | campus home-field | campus farm | **new**: a field bothy |
| 8–9 | goods-yards farm yard, goods-yards yard | farm outfit, ash round | rubber-works stove-house if title allows, else **new**: a yard cabin holding the yard's brazier |
| 10–11 | brickfield clamp-ground, weathering-ground | brickmaster | potters-shop (lit) |
| 12–13 | ditch bank ×2 | ditch company | **new**: a ditch-rider's hut |
| 14 | farmstead-yard | Delight farm | **new**: the farmstead kitchen (or an existing farmhouse room if W8 finds one) |
| 15 | sawmill | sawmill | **new**: a saw-pit shed |
| 16 | public-works yard | public works | **new**: the works office |
| 17–18 | Hollow Mere shore ×2 | ice company | **new**: a warming shanty by the shed, the realm's coldest post; `effort: 2.0` |
| 19 | market square | market | **new**: the public warming room (also the commons') |
| 20–21 | valley-road towpath, Mayfield Row street | painter's round | colorman's shop (light its hearth) |
| 22–23 | ashery, glasshouse | Rejection ashery, glasshouse | the lean-to: enclose it and light its hearth |
| 24–25 | fringe-claim, fuel-yard | fringe outfit, fuel yard | the-dry (lit) |
| 26 | put-in landing | put-in outfit | **new**: the outfitter's shack |
| 27–29 | cane-piece ×2, mill-yard | Waponi Woo estate | **new**: an estate cookhouse (winter there is mild; W8 checks whether warmth is needed at all at its coldest pin, and authors water and food regardless) |
| 30–33, 36 | wharfside bank ×3, ropewalk, lavoir | diving, harbor works, ropewalk, laundry | chandlery floor or dyehouse floor (light one), by route length |
| 34 | woodyard landing | woodyard | **new**: a woodhawk's cabin |
| 35 | testbed plaza | test venue | testbed shop (hearth) |

  The necropolis ground and the Rejection adit read as not under sky; W8
  re-checks both with `testharness body` at the winter pin and adds them if
  the census was wrong.
- **Water and food** on every house in the table: a water butt or pump at the
  post or warming place, else the commons by silence. Bread is the market's.

Acceptance: `lint:supply` zero; every new place walked at night with a light
(step 15, R5); `lint:biome-sky` not higher.
Commit per pack is fine; the wave's last is
`build(cast-in-winter W8): the world supplies its cast`.

### W9 — The staged winter night, then the backstop comes out

1. Write `packages/wire/tests/cast-in-winter.dirty.wire.test.ts` (blocking
   steps) and `cast-in-winter.soak.wire.test.ts` (16–18), following the
   naming in `docs/testing.md`. Add the cast-survival check to the
   existing soak drives; their `dress()` stays.
2. Run the staged winter night (air pin 268 K at Terminus, 261 K at Hollow
   Mere, clear, pre-dawn): every outdoor Cast holds its core watched, and
   `settleUnwatched` over the night leaves all alive. Fix by content.
3. **Only then** delete `diesOfNeglect`, its three call-site conditions and
   its interface member; the animal rule (D17) lands in the same commit.
4. Docs: thermal.md, vitals.md, metabolism.md, mortality.md; strike §§ 1, 2, 4
   from backstops-owed-slate (leave the sweep to compact it).
5. The browser walk `e2e/tests/cast-in-winter-walk.spec.ts`: steps 3, 4, 5, 12.

Acceptance: the blocking drive green; `rg diesOfNeglect` empty; the full
suite (this is the code-complete moment).
Commit: `build(cast-in-winter W9): the backstop comes out`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| heat budget | none (physics); read by `testharness body`, `look`'s body line, the cues | every Creature | settings `thermal.*` | settings warm with app-settings | n/a |
| room heat from bodies | `analyze rooms` | any place with an envelope | none | n/a | n/a |
| herd heat | `testharness herd` (staging) | the book | `housed` on the book rows | the book is a prop of the byre | book resolves by MQL in the room |
| sleeves | `wear`, `outfit` | the garment | `slotClaims` naming `arms`; the plan's slot | plan loads with the species | `wear` binds the garment as before |
| timeless null | none | `ContainmentApi.move` | `clock` meta | n/a | n/a |
| watched | none | place arrival hook | none | n/a | n/a |
| presence | none | roster tick | `presence`, `home`, `offShift` | `home` loads on use (`StuffApi.singleton`) | n/a |
| needs | none (the NPC's own) | implicit spec from `NPC.onCreate`; ⚠ a locality NPC subclass that overrides `onCreate` must call `super` | `needs.*` settings | brain resolves by path at wire time | n/a |
| supply | none | `Business.supply`, `Locality.commons` | W8 rows | each path loads on use; ⚠ a supply place nobody stands in must stand up when a hand is settled there (`singleton`, not `findByTemplatePath`) | `setSupply` validates keys |
| kit | `wear` (model call) | the pegs in the station place | pegs row + stocked garments | pegs are a prop | n/a |
| death report | `errors` | `ConditionApi.die` | none | n/a | n/a |
| harness tools | `testharness body|presence|air-pin|air-unpin|herd` | the harness's existing withholding | view keys | view document | each subcommand's args have defaults or are required with a refusal that says so (instrumentation.md's silent-arg warning) |

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| A winter week, no players, every Cast alive; the rule gone | W7 (arithmetic), W8, W9; soak 16 |
| A cold room with bodies is warmer | W2; step 1 |
| Clothing needs match published figures, resting and working | W0, W1, W3; step 13 |
| A sleeved garment changes the reading | W3; step 10 |
| A watcher sees the hand warm itself; a Cast drinks and eats in a day | W6, W8; steps 4, 5 |
| Back after hours: cast where physics puts them, supplies used | W7; step 8 |
| A post that cannot keep you: found dead, reported | W7, W9; step 9 |
| A hot day: no winter layers | W6 (D14); step 11 |
| Back from off shift no hungrier, colder or older; goods unaged; pegs full | W4, W5, W6; steps 7, 7a |
| Empty room is in the story; out of the story is not | W4, W5; steps 7a, 8 |
| A newcomer feels it and fixes it with the offered coat | W1, W3; step 12 |
| A second dairy with no code | W6 (kinds), W8 (the parent row); proved by a test-fixtures second dairy that only `extends:` |

Nothing is unmapped.

## Test & gate strategy

**Unit** (colocated `__tests__/`, each importing `test-bootstrap` where it
touches the runtime): the budget's regimes and crossings; the bench tables
(gym job); room heat; the rebase walker per clock family (one parametrized
test over the census list, so a new clock without a case fails); `Supply`
resolution; need levels; kit on and off; the settle arithmetic and the
watched/unwatched agreement test; the death report.

**Only the drive can prove**: the walk to the fire and back as a player sees
it; restart; light; the newcomer's path.

**The drive.** Wire file `packages/wire/tests/cast-in-winter.dirty.wire.test.ts`. Pace and staging per step:

| step | pace | staged by |
|---|---|---|
| 1 byre warm | staged | `air-pin 268`, `herd … in/out`, `measure` air in yard and byre |
| 2 work warms | short | `air-pin`, two bodies, one `exert`ing by hauling; `testharness body` |
| 3 dress | short | clock to shift start; `look` |
| 4 to the fire | short | `air-pin`, player stands at the quay; `afflict`-free: chill comes from the pin and `clock-advance 30m` steps |
| 5 drink and eat | short | `clock-advance` in hours, player at the post then at the square |
| 6 fire kept | short | `vanish` the fuel items; `measure` air |
| 7, 7a off shift | short | clock to shift end and start; `testharness presence`, `body`; the milk's freshness by `look`/`smell` |
| 8 nobody watching | short | walk away, `clock-advance 6h`, walk back; `testharness presence` and counts |
| 9 no supply | staged | the fixture Cast; `clock-advance 12h`; `errors` |
| 10 sleeves | instant | `wear`; the insulation reading |
| 11 summer | staged | `air-pin 305`, clear |
| 12 newcomer | short | a new character; `air-pin` |
| 13 calibration | instant | the bench run by name |
| 14 restart | short | harness restart mid-shift |
| 15 light | instant | `daylight-pin` night; `look` in each new place |

Blocking: 1–15 and 7a. Soak (`cast-in-winter.soak.wire.test.ts`, named in the MR, never
run by the build): 16, 17, 18. Staged twins: 16 → steps 8 and 9 plus W7's
seven-day arithmetic test; 17 → step 11 plus a unit test stepping the air pin
from 268 to 290 K and asserting kit comes off piece by piece; 18 → step 6
plus W7's no-fuel settle test. Log the drive's own bodies out across any
advance they are not part of.

**Full suite**: at W9 code-complete and at `/finalize` only.

## Risks & opens

- **W1 moves every thermal number.** Hyperthermia in hot work (the brickmaker,
  ceramics drive A), immersion, bath and coat tests all sit on the band.
  Expect wide red in `lib/thermal/__tests__` and the trades' wire flows; fix
  by the budget's dials, never by re-adding a band.
- **The agreement test (W7) is the build's keel.** If watched and settled runs
  disagree, a player will see a contradiction. Do not loosen its tolerance to
  pass; find the path that differs.
- **`comeIntoView` cost on a crowded place.** Settling N hands when a player
  walks in is N event loops. Budget: under 5 ms for a 20-hand place after a
  game day. If it is over, settle lazily per body on first perception, not on
  arrival, and say so in the MR.
- **The off-shift flip (W5)** will break drives that expect a hand at night.
  That is the requirement; fix by content.
- **Rebase and wall-clock fields.** `BehaviorBeat.startedAt` and
  `_intention.since` are `Date.now()`; they are not game clocks and are not
  declared. The lint's name pattern must not catch them (they are not
  persistent).
- **Roster and an out hand's wage.** Wages are records and keep running; the
  shift settle already happens before the hand leaves. Confirm in W5.
- **House card issue** moves a card into a hand that may be out of the story;
  D7's rule (a thing entering a timeless subtree is stamped) covers it. Test it.
- **Stop and ask** (do not guess): if the ISO 11079 rows disagree with D4's
  formula values by more than the tolerance; if `lint:clock-fields`' census
  is over 80 fields; if any locality's cast cannot be kept alive at its pin
  with period-honest supply (that is a physics conversation, per the slate).
- **Owner decisions pending**: conflicts 1, 3, 5, 6.

## Deferred seams

- **Herd turn-out and bring-in as play** (a verb, a dusk routine) →
  add a line to backstops-owed-slate § "left" naming `Herdbook.housed`.
- **Unwatched production** (`cellars`, `restocks`, `feeds` keep a nightly
  beat) → unobserved-economy-slate; the attach point is `settleUnwatched`'s
  event loop.
- **Homes and sleep** → sleep-slate, household-lifecycle-slate; the attach
  point is `NPC.home` and `placeOffShift`.
- **Enclosed air derived from fit** → textiles-slate § insulation.
- **`Combustible`'s far-past guard** and the remaining thing-side gap guards →
  a line in soak-lane-slate.
- **The student costume parent** → row-composition-slate's agents pass; W8's
  costume edits are its evidence.
- **Animal needs** (a stray that forages and drinks) → vocations or
  husbandry slate, with D17's role default as the thing to replace.

## Critical files

Read first, in this order:

1. `docs/requirements/cast-in-winter-requirements.md`
2. `S/lib/thermal/ThermalRegulation.ts`, `S/lib/thermal/Thermal.ts` l.141–330
3. `S/lib/biome/Atmospheric.ts` l.1700–2060, `S/lib/thermal/RoomHeatExchange.ts`
4. `S/platform/idea/api/ContainmentLogic.ts` (the move), `S/lib/spatial/Containable.ts`
5. `S/lib/behavior/Behaved.ts`, `Urgency.ts`, `stokes.ts`, `eats.ts`, `BrainMoves.ts`
6. `S/platform/idea/api/EmploymentLogic.ts` l.960–1100 and l.1750–1900
7. `S/lib/npc/NPC.ts`, `S/platform/agent/{Cast,Extra}.ts`, `S/lib/stuff/Costumed.ts`
8. `S/lib/metabolism/Metabolic.ts` l.700–850, l.1370–1390; `S/lib/vitals/Vitals.ts` l.1620–1660
9. `S/lib/slot/Attired.ts` l.895–1000, `S/lib/slot/Wearable.ts`
10. `C/trade-ranching/src/thing/Herdbook.ts`
11. `C/hearts-delight/content/world/terminus/hearts-delight/dairy/` and `idea/dairy-business.yaml`
12. `docs/subsystems/`: thermal, behavior, employment, spatial, persistence, testing

## Drive record

*(appended at build time)*
