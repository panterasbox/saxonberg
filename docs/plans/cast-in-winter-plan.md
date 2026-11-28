# Cast in winter — implementation plan

This plan executes
[cast-in-winter-requirements](../requirements/cast-in-winter-requirements.md).
**Kind:** feature. **Lead end:** kernel. It replaces the body's comfort band
with a heat budget solved in closed form, makes bodies and herds warm the room
they share, makes null timeless by one rule, lets every NPC fend for itself (cold, heat, thirst, hunger) in the
deliberation it already has, declares amenities on houses and towns,
settles an unwatched NPC by arithmetic, authors the amenities and warming
places the shipped cast needs, and then deletes `Vitals.diesOfNeglect`.

Paths: `S/` = `packages/server/src/mud/`, `C/` = `packages/content/`.

> ⚠ **Read "Requirements conflicts" (next section) before W0.** They change
> what some drive steps mean. The owner decided all of them on 2026-11-28.

## ⛔ Sequencing: the agents pass comes first (owner, 2026-11-28)

The owner's rule: *anything done to every agent in the game needs
discussion, even if it is correct.* The first version of this plan added
`fends` and `stokes` as **implicit** behavior on every NPC from
`NPC.onCreate`. That is invisible to an author reading a row and impossible
to remove, which is "enable authors, never impose" broken in code.

**Decided:** no implicit behavior. Looking after your own body is declared
once on a **person kind** row that every NPC inherits, where it's visible and
an author can override it. Keeping the house fire is **a job, so it's
declared on the seat** whose work it is (owner, 2026-11-28: *put job behaviors
on the seat*). Whoever holds that seat tends the fire on shift, and the
seat's **kit** is the work clothes (the dairy's outdoor layers among them).
The person kind and seat-declared work and kit both come from the **agents
pass of the template taxonomy refactor**
([agent-taxonomy-requirements](../requirements/agent-taxonomy-requirements.md),
on `reqs/agent-taxonomy`). It runs before this build, retires
`/stuff/agent/costume/student`, and makes behaviors merge entry by entry, so
an inherited `fends` survives a row that lists its own behaviors and a row
can visibly remove it.

- **W0–W5 do not depend on it** and may proceed in parallel. They cover the
  heat budget, room heat, sleeves, timeless null, watched and presence.
- **W6 and later wait** for the agents pass to merge. `fends` then goes on
  the person kind row, and `stokes` on the seats that tend a fire, not in
  `NPC.onCreate`. W6's kit work builds on the seat's kit: the agents pass
  makes a holder wear the seat's kit; this build turns that into dressing
  from the peg with the weather and the shift (D14's `dress()`). It is the
  same declaration, not a second one (C2). Every
  "`NPC.onCreate` adds the spec" below is superseded by this section.

### Exception cases W6 must resolve (owner review, 2026-11-28)

Defaults are given so the build doesn't stall. ⚠ marks the ones to put to
the owner when W6 starts.

1. **Posts players depend on** (Gus at the crossing, doormen, the ticket
   clerk, patrols, enforcers: about 17 rows). `fends` yields to the post's
   work below *severe*. A severe need is covered by the house's proprietor
   (`reconcileCover`), and a post with no cover says why it is empty.
2. **An NPC engaged with a player** (dialogue, combat, a service queue).
   `fends` never preempts an engagement below *critical*.
3. **The lounge cast** (`as: live`): the bar is their amenity, so they never
   leave the lounge to meet a need. ⚠
4. **The Mercenary** has no house. ⚠ The open question is whether the hiring
   party's leader supplies it, or it fends from the nearest amenity and can
   die in the wilds.
5. **NPCs not on a roster, or in a place with no town amenities** (Hollow
   Mere, Rejection, Waponi Woo, the wilds). `lint:amenities` checks **every**
   NPC, not just rostered posts under open sky: each one's needs must resolve
   somewhere, or the row must say why not.
6. **Ship crew:** the ship is the house; its amenities are aboard.
7. **`stokes` tends its own house's declared fire only.** The "first burner
   in the room" fallback is deleted, so a visitor never feeds another
   house's fire from that house's fuel.
8. **`stokes` only on seats whose job tends a fire.** It isn't a universal
   spec, and it runs only while its holder is on shift.
9. **Species:** W1 reads every NPC species' vital profile (sapiens,
   sensitivus, semiorcus, khazadicus, infernalis). If any differs, the bench
   calibrates it too.
10. **A confined NPC** (the prison, when built) can't walk to supply; the
    confining house supplies it. This is recorded for moderation-slate; no
    content in this build.
11. **The act vocabulary.** ⚠ `fends` emits drank / ate / warmed-up acts with
    act ids. The vocabulary is "closed, versioned, changed deliberately", and
    adding these changes what the Compact counts. Put the new act kinds to the
    owner, coordinated with tropes.
12. **Drives** assert an NPC's state and presence, not a fixed position.
    Wherever a drive needs a hand at its station, it stages the hand's needs
    met first.
13. **A sandbox copy** resolves amenities inside its own circle scope and
    never draws on the real town's supply.

## Requirements conflicts

Planning found these. None is absorbed silently; each states the plan default.

1. **There are no cattle bodies.** The Delight's herd is a tally on two
   `Herdbook` props in the byre (`dairy-book` tally 6, `calf-register` tally 3),
   grazing a field of the pasture by reference. Nothing is "in" the byre and
   nothing can be "moved out". Drive step 1 and the second acceptance criterion
   assume bodies. **✅ Decided (owner, 2026-11-28), D6:** the herd's book answers the room-heat
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
   and Extra. Nothing feeds or waters a stray. **✅ Decided (owner,
   2026-11-28): let them die.** An unowned animal is not spared and gets no
   fresh-body route: it dies of neglect where it is, and its death is reported
   like a Cast's (D16). What feeds a stray is content's job. Expect reported
   deaths in soak until that content exists. Each one is a finding for the
   owning trade, not a defect to hide (D17).
4. **"The creamery hearth is their fire"** — `creamery/thing/hearth` is class
   `Oven`, which does not compose `SpaceHeatingMixin`, so it warms no room.
   **Plan default:** W8 verifies; if an Oven answers no room heat, the creamery
   floor gains a `/stuff/thing/Hearth` and the dairy's warmth names that room.
5. **"Supply is declared by places."** The plan puts the *declaration* on the
   house and the town (D11, where the key is named `amenities`) and lets a place
   provide through what stands in it
   (its `props:`), so no key is added to every Location. A kind of place
   carries supply by `extends:` on the place row's props and the house row.
   **✅ Decided (owner, 2026-11-28): house + commons.**
6. **~~A logged-out player's carried goods stop aging.~~ Withdrawn: players
   are never in null.** (The owner, 2026-11-28: *"they dont live in null
   they're destructed."*) A signed-out body is saved and **destructed**, then
   materialized from its record at the next login. A dropped connection
   leaves the body standing where it was, linkdead (connection.md § a drop
   lingers, a sign-out leaves). Neither is in null, so the timeless rule never
   touches a player or what a player carries, and players are unchanged. The
   requirements' line saying a logged-out body sits in null was wrong and has
   been corrected.
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
| N7 | `Presence` value (`S/lib/npc/Presence.ts`) as ONE `presence` field on `lib/npc/NPC`. `Business.offShift` is **deleted** | *off shift*, *a role whose body is fresh* — reuse, collapsed into one declaration (C2) |
| N8 | `Amenities` value (`S/lib/npc/Amenities.ts`); one `amenities` field on `Business` and on `Locality` (a town's are its commons) | *supply on places* — extend the declarations; no document kind. *the commons* — reuse, marked |
| N9 | On `lib/npc/NPC` (methods, not a mixin): `discomfort(kind)`, `seeTo(kind)`, `useAmenity(kind)`, `dress()`, `hangUp()`, `settleUnwatched()` | *one deliberation*, *outdoor kit*, *reconcile on read* |
| N9a | `Character.putOn(garment)` — the one seating call, extracted from `wearGarments` | *outdoor kit* — reuse: the ledger asked whether a kept container plus `wear` covers it. It does |
| N10 | One brain, `/lib/behavior/fends`; `eats` is deleted; `stokes` stays as the house's fire work and loses its `fire`/`fuel` config to `amenities` | *eating* — fold; *keeping a fire* — reuse, widened; *one deliberation* — reuse |
| N11 | `Burner.tendedUntil(fromS, toS, fuel)` | *keeping a fire* — generalize (the same stoke arithmetic over a span) |
| N12 | `Vitals.refreshBody()` | *a role whose body is fresh* — the Extra rung's body half |
| N13 | `testharness body` budget lines; subcommands `presence`, `air-pin`, `air-unpin`, `herd` | owed tooling (workflow § staged) |
| N14 | `lint:amenities` | genuinely new gate; searched `S/package.json` `lint:*` |
| N15 | Rows: `coat-pegs` fixture, warming places, a business kind parent, test fixtures, reason rows, setting keys | content |
| — | The death report | *the death report* — reuse `DiagnosticApi.record`; nothing new |
| — | `Vitals.diesOfNeglect`; the NPC-sparing part of `integratesLongAbsence` / `billsTheGap` (D8); `eats.ts`; `Business.offShift`; `stokes`' `fire`/`fuel` config; the band constants | *the backstop* — **delete**; the rest are the specific things this build generalizes (P1) |
| — | Act identity per turn | *act identity* — coordinate (D18) |

**No new Api, logic singleton, registry, document kind, Mongo collection,
module category, verb or exported helper.** No new mixin: N9 lives on the one
class that would compose it. Two value classes (`Amenities`, `Presence`).

## ⭐⭐⭐ The surface, by kind

The whole code shape in one place. Each entry: its host, and why it is not a
new thing doing an old job (P1), a new name for an existing call (P12) or a
concept on the wrong host (P13).

**Api statics.** None. No new Api. `DiagnosticApi.record`,
`ContainmentApi.move`, `StuffApi.singleton` and `ExecutionContextApi.runRoot`
are called as they stand.

**Mixin and class methods.**

| method | on | host set today | not P1 / P12 / P13 because |
|---|---|---|---|
| `heatBudget()` (private solver), `sustainedEffort()` `@hook` | `ThermalRegulationMixin` | `Creature` | replaces `integrateThermalSlice`, which is deleted; the hook has two implementers (`Employed`, `NPC`) |
| `roomHeatExchange()` | `ThermalRegulationMixin`; `Herdbook` | `Creature`; the ranching book | the shipped protocol's third and fourth implementers, no new protocol |
| `reconcileEnvelope(untilS?)` | `AtmosphericMixin` | every place with an envelope | one optional parameter on the shipped method, not a second reconcile |
| `rebaseClocks(deltaS)` `@hook` | `Stuff` | everything | five implementers at birth (Vitals, Memorized, Soilable, Thermal, ThermalRegulation); nothing shifted a stamp before |
| `isWatched()`, `comeIntoView()` | `Creature` | every body | `isWatched` is `Behaved._hasAudience` moved down and deleted there |
| `refreshBody()` | `VitalsMixin` | `Creature`, `Corpse` | no reset of a body to its kind's baseline exists; chargen builds one, it does not reset one |
| `putOn(garment)` | `Character` | players and NPCs | cut out of `wearGarments`; must be `wear`'s own model call if there is one (D14) |
| `discomfort(kind)`, `seeTo(kind)`, `useAmenity(kind)`, `dress()`, `hangUp()`, `settleUnwatched()`, `defaultPresence()` | `lib/npc/NPC` | Cast, Extra, seven locality NPC classes | the NPC's own decisions; `useAmenity` calls the shipped drink / buy / eat model calls and adds none |
| `tendedUntil(fromS, toS, fuel)` | `Burner` | every firebox | `stoke` over a span; it calls `stoke` |
| `getAmenities` / `setAmenities` | `Business`, `Locality` | houses; towns | field accessors |
| `getPresence` / `setPresence` | `lib/npc/NPC` | as above | field accessors |

No new mixin.

**Protocols.** `RoomHeatExchanging` (shipped): implemented by `SpaceHeating`,
`Store`, and now `ThermalRegulation` and `Herdbook`; asked by
`AtmosphericMixin` only. `BrainStatics` (shipped): `fends` implements it.

**Value classes.**

| class | concept | built |
|---|---|---|
| `Amenities` (`S/lib/npc/Amenities.ts`) | where a hand's cold, thirst and hunger are answered, for a house or a town | by `setAmenities` at hydrate |
| `Presence` (`S/lib/npc/Presence.ts`) | how an NPC is simulated and where it is off shift | by `setPresence` at hydrate, over the rung's default |

`Discomfort` is a closed string union in `NPC.ts`, not a class.

**Documents, kinds, catalogues.** None. Both values are fields on rows that
code reads by field, so neither is a Document and neither is an Idea.

**Fields.**

| field | host | empty on what share of hosts |
|---|---|---|
| `presence` | NPC rows | authored on about 10 of 117 (the lounge cast, night hands, any with a home); the rest take the rung default, which is a real answer, not an empty one |
| `borrowed` | NPC (runtime) | empty off shift and for every indoor hand; it is state, not a declaration |
| `amenities` | `Business` rows | W8 authors it on about 45 of 75 (every house with an outdoor slot or a fire); the rest fall to the town's |
| `amenities` | `Locality` rows | authored on each town, about 8; none on a wilderness locality |
| `effort` | `Position` | authored on about 6 heavy seats; the rest take the setting |
| `housed` | `Herdbook` rows | authored on the 2 Delight books; false on any other herd, which is a true answer |
| `outOfStorySinceS` | every `Containable` (runtime) | zero on everything in the story; that is its meaning |
| `clock` | `FieldMeta` entries | present on every stamp field by the gate |
| `arms` slot, `neck` covers | the biped plan | n/a (one row) |
| `thermal.*`, `fending.*`, `employment.shiftEffort` | settings | n/a |

**Retired** (deleted in this build, each `rg`-checked in its wave's
acceptance):

- `integrateThermalSlice`, `probeFrom`, `_probe`, `_reconcileClo`,
  `maxCoverableGapK`, `wornInsulationKelvin`, `billsTheGap` (the NPC half)
- constants `BAND_HALF_WIDTH_K`, `COLD_SPEND_PER_DEGREE`, `CLO_TO_KELVIN`,
  `WIND_CHILL_PER_MS`, `REG_STEP_SEC`, `REG_MAX_STEPS`
- `Vitals.diesOfNeglect` and its three call-site conditions
- `Metabolic.integratesLongAbsence` as it spares an unowned NPC (D8)
- `Behaved._hasAudience`
- `Business.offShift`, `getOffShift`, `setOffShift`, and the key on 11 rows
- `S/lib/behavior/eats.ts`, its tests, its spec on 2 rows
- `stokes`' `fire` and `fuel` config keys, and their use on the potter's row

**The command layer.** No new verb, view, controller, option or affordance
for players. A player sees the difference only in the world: the cast dress,
move, drink, eat and can be found dead; `look`'s body line and the cues read
off the new budget. Changed surfaces:

| surface | change | player sees it |
|---|---|---|
| `testharness` view + controllers | subcommands `presence`, `air-pin`, `air-unpin`, `herd`; `body` prints budget lines | no (withheld outside test worlds) |
| the `rooms` reading row (`analyze rooms`) | one line: occupants' heat | yes, a new line |
| `wear` / `outfit` | none in the view; a sleeved garment now claims `arms` | yes: the arms show as covered |
| `help` topics | `warmth`, `authoring cast` gain text | yes |
| `DrinkController`, `BuyController`, `EatController`, `WearController` | ⚠ none planned. If W6 finds any of them *deciding* (not just IO), the decision moves to the model in W6 and is listed in the MR as a finding | no |

**Names.** Each checked against `docs/subsystems/`, the command categories in
CLAUDE.md, `S/api/` and the content row keys.

| name | check | verdict |
|---|---|---|
| `Amenities` / `amenities` | no hit in any subsystem doc, class or key | free. Replaces the draft's `Supply` (collides with `SupplyState`, `lib/supply/`, water-supply, `suppliedBy`) and `commons` (CLAUDE.md's word for `/stuff`) |
| `fends` (brain), `fending.*` (settings) | no hit | free. Replaces `needs` (settlement-model's sixteen needs, build-4's `house-needs`, wellbeing-slate) |
| `Discomfort`, `discomfort()` | no hit in code or subsystem docs | free |
| `seeTo` | no hit | free; chosen over `relieve`, which is Vitals' verb for ending an affliction |
| `useAmenity` | no hit | free |
| `dress`, `hangUp`, `putOn` | `dress()` is the soak drives' own helper name (a test function, same meaning); `putOn` no hit | acceptable; W6 confirms no model method named `dress` exists |
| `borrowed` | no field of that name | free |
| `Presence` / `presence` | ⚠ "presence" is used in prose for social presence relay (social-graph.md) and the `presence` form of a noun phrase (presentation.md) | **collision in prose, and one in code**: an archetype's need can be `{ presence: <who> }` (`S/lib/archetype/Archetype.ts:169`), a different key on a different row kind. No NPC field or row key is named `presence`. Kept because it is the requirements' own word; ⚠ the owner may prefer another (`staging` is taken by staging-slate; `attendance` is the attendant queue's) |
| `isWatched`, `comeIntoView` | `watch` is the stream verb; `isWatched` no hit | acceptable: a predicate, not a verb |
| `left-story` | W4 reads `AbortReasonRegistry` | free unless a member already means it, then reuse that |
| `housed`, `effort`, `rebaseClocks`, `outOfStorySinceS`, `tendedUntil`, `refreshBody` | no hits (`Voyaging.rebase` is a different method on a different host) | free |
| `air-pin`, `herd` (harness) | `weather-pin`, `daylight-pin` are the pattern | fits |

## ⭐⭐⭐ Convergence and divergence

**C1 — What already does this?**

| new | sits beside | answer |
|---|---|---|
| the heat budget | the comfort band; `Thermal`'s Newton cooling; the room envelope | replaces the band. Shares `Decay.toward` with the other two (C4) |
| body room heat | hearths and cold stores answering `roomHeatExchange` | joins them |
| `Amenities` | `parLines`, `purchases`, `fulfills`, `stockLines`, `suppliedBy` | none of those says where a hand's own discomfort is answered (D11). Fuel restock stays `parLines`' |
| `fends` | `eats`, `feeds`, `stokes`, `frequents`, `homes` | `eats` folds in. `feeds` is an animal's ingest from a Feeder and stays. `stokes` is work, not a body task, and stays (D12). `frequents` is a timed visit and stays (D17) |
| `dress()` | `Costumed`, `Wardrobe`, `wearGarments` | D14 |
| `Presence` | `Business.offShift`, the rung, `calledToAt` | D17 |
| timeless null | linkdead freeze, the player's away guard, `Thermal.onMoved`'s null skip, `Battery`'s limbo return | generalizes the last two; the first two are the player's and stay (D8) |
| `isWatched` | `_hasAudience`, the beat's nightly dial, the thermal wake | one predicate for all three |
| the death report | `DiagnosticApi`, the chronicle, the corpse | uses all three as shipped |

**C2 — Unifying, or adding a head?** Every *replaces*, and whether the old
one is gone when this build merges:

| replaced | gone in this build? | survivor and its retirement |
|---|---|---|
| comfort band | yes (W1) | none |
| `_hasAudience` | yes (W5) | none |
| `Business.offShift` | yes (W5) | none |
| `eats` | yes (W6) | none |
| `stokes` config for the fire | yes (W6) | none |
| `diesOfNeglect` | yes (W9) | none |
| the NPC long-absence skip | yes (W4) | the **player's** away guard survives on purpose; retired by absent-body-slate's build |
| three ways to dress | one seating call, one NPC decision (W6) | `Costumed` survives as stocking only → the agents pass of row-composition-slate. `Wardrobe` is not a head (player's saved names over the same call) |
| four knobs for off shift | one `presence` (W5) | `calledToAt` survives as a brain's timed call (C5) |
| slices for body heat | yes for heat (W1) | metabolism's slices survive → C4 |

**C3 — Generic names.** `Supply` and `needs` were generic and already
carried; both are renamed (Names table). `Presence` is the remaining generic
word; its prose collisions are listed there. `Amenities` says what it is.

**C4 — Look-alikes after this build.**

- **Body heat in closed form, metabolism in 60 s slices.** Two reconcile
  shapes on one body. **Debt, not intended.** Converting metabolism (digestion
  buffer, coupled recovery, toxin clearance, 2,054 lines) is its own build;
  doing it here would double this one. What this build does to stop it
  spreading: D15 asks metabolism only "step to your next threshold", through
  one method, so the settle does not care which shape is underneath.
  Destination: **thermal-slate**, as "one reconcile shape for the body's
  stocks"; the sweep adds the line.
- **A thing cools by Newton (`ThermalMixin`); a body keeps a budget
  (`ThermalRegulationMixin`).** **Intended.** A thing has no heat source and
  no regulation, so its budget is the body's regime 3 with zero production:
  the same equation and the same primitive (`Decay.toward`), with fewer
  terms. A body composes both mixins already (`Thermal` for what it is made
  of, regulation for being alive). They are not unified because a mug has no
  setpoint to defend.
- **The room envelope and the body budget** are both "steady state plus time
  constant". **Intended**: they are coupled through one protocol (the body's
  conductance is the room's gain) and share the primitive.
- **`Amenities` on a house and on a town.** One class, one key, two hosts.
  Intended: it is what makes "the town is the fallback" one walk.
- **`stokes` and `fends`** ~~are two implicit brains on every NPC~~ —
  **superseded (owner, 2026-11-28):** both are declared on kind rows from the
  agents pass. `fends` goes on the person kind, `stokes` on the fire-tending
  seats. Nothing is implicit (see § Sequencing).
- **`presenceGated = false` brains keep a nightly beat while `fends` is
  settled by arithmetic.** Two answers to "what happens unwatched". **Debt**:
  destination unobserved-economy-slate.

**C5 — Deliberate divergence.**

- Players are not settled, dressed or given a presence: a player is their own
  chooser.
- Animals get no presence and no amenities (owner, conflict 3).
- `Wardrobe` is not folded into `dress()`: names versus weather.
- `calledToAt` is not folded into `Presence`: a brain's hours versus a
  standing answer.
- A place gets no `amenities` key (owner, conflict 5).
- The far-past guard on `Combustible` is left: a thing's, out of scope.

**C6 — Fault lines for the Api pass.** api-normalization-slate Part 8 is on
`origin/build/tropes`, not on master, so this plan carries the entries and
**the `/finalize` sweep copies them into Part 8** once that slate change has
landed (or adds Part 8's first cast-in-winter entries if it has not):

- **A body has no single "bring me current".** Thermal, metabolism,
  respiration, conditions, faculty and memory each have their own
  `reconcileX`, and `comeIntoView` calls them in a fixed order by hand. The
  pass should ask whether a body reconciles through one door.
- **The envelope reads `roomHeatExchange` by shape**, now with four
  implementers, one of them in a pack. It wants a declared predicate
  (`MixinApi.isRoomHeatExchanging`) or a registered protocol.
- **Programmatic drink, buy and eat.** `useAmenity` needs the model call
  under each controller. W6 records what it found: where a clean model call
  existed, and where a controller had to give one up.
- **`DiagnosticApi` is being used for a world event** (a death), on the
  `content-error` channel. It is the right reader today; the pass should ask
  whether "the world reports something to whoever maintains this row" is
  diagnostics' job or its own surface.
- **Stamps read `WorldClockApi.getNow()` directly in about forty mixins.**
  The `clock` field meta now names them; a later pass could give them one
  read.
- **Chokepoints that stamp only "now".** Any record W7 finds unable to carry
  the event's own game time (D15).
- **`runRoot` for an act settled late.** This build is the first caller that
  opens a root frame for a choice made at an earlier game time. The pass
  should ask whether the act context wants an explicit "as of".

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
while it is away from its station warming itself. W8 authors `effort` on the heavy seats (hewer,
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

**D8 — The NPC's long-absence skip goes; the player's guard stays.** With D7
an off-shift NPC is frozen by where it is (null), and an unwatched one is
settled by D15, so the rule that drops long gaps for bodies nobody owns
(`integratesLongAbsence` and whatever branch of the `MAX_REASONABLE_GAP_SEC`
guards exists only to spare them) is deleted. ⛔ **The guard that protects a
signed-out player stays exactly as it is.** A player is never in null. Their
body is destructed at sign-out and materialized from its record at login, and
that guard is what stops a week offline being billed as a week of hunger
(connection.md, metabolism.md § until absent-body builds). W4 reads each
guard (`Metabolic`, `ThermalRegulation` `billsTheGap`, `Respiration`, `Vitals`
conditions, `Caster`) and deletes only the part that spares an unowned NPC.
Where one branch serves both, it is narrowed to the player, never removed.
`Combustible`'s is a thing's and is left (noted in Deferred seams). Linkdead
freezing is unchanged.
Metabolism keeps its 60 s slices in this build (C4 says why and where that
debt goes); its `MAX_STEPS` collapse would now run for long unwatched gaps,
so W4 replaces the collapse with exact stepping to the next *event* (D15
never asks it to cross more than one).

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
a host that is not watched and whose presence is not `live` schedules
nothing; `comeIntoView()` restarts it. The `presenceGated = false` brains
(`cellars`, `feeds`, `homes`, `restocks`' unwatched leg) are the exception the
shipped design already made: a host that composes one keeps the nightly beat
for those brains only. W5 lists them and leaves them; moving unwatched
production into arithmetic is unobserved-economy-slate's.

**D11 — Amenities: one value, on the house and on the town.** What a house
gives its hands, and what a town gives everyone, is one shape under one key.
`Amenities` parses

```yaml
amenities:
  warmth: <place path | here>
  fire:   <burner row path>        # the house fire a hand keeps (stokes)
  fuel:   <keyword>                # what that fire is fed, when not tagged fuel
  water:  <thing row path>
  food:   <thing row path>         # a Stock counter
  pegs:   <thing row path>         # a kept container of the house's garments
```

on `Business.amenities` and on `Locality.amenities` (a town's are its commons;
`fire`, `fuel` and `pegs` are refused there at hydrate). An entry is either
the absolute path of a standing thing or place, or a **kind** (a row path such
as `/stuff/thing/fixture/coat-pegs`) that resolves to the thing in the hand's
station place, then the house's operating locations, whose template path is
that row or `extends:` it. That is what lets a business kind parent row carry
amenities for every instance, and a second dairy inherit them.
`Amenities.resolve(kind, hand)` walks house → the Locality the hand's station
addresses (longest prefix, `AddressableMixin`) → null. Paths load on use
(`StuffApi.singleton`); nothing is searched and nothing boots.

Why this is not a shipped house key (C1): `parLines` are what the house keeps
*in stock to sell or work with*, by category and level, restocked by a buyer;
`purchases` says a seat may spend the house's money; `fulfills` says which
disciplines a seat serves; `stockLines` belong to a counter. None says *where
a hand's own cold, thirst and hunger are answered*. Amenities point at
fixtures and places that already exist and carry no quantity. The seam between
them is kept clean: **fuel is restocked through `parLines`**, never through
amenities (W8 adds a fuel par line where a supplier ships).

The name was checked (C3). `Supply` is taken three times over
(`lib/supply/SupplyState.ts`, the water-supply subsystem, `suppliedBy`), and
`commons` is CLAUDE.md's word for the `/stuff` namespace. `amenities` appears
in no subsystem doc, no class, no row key. The product word "the commons"
stays in prose for a town's amenities.

**D12 — Three discomforts, one brain.** The word "needs" is taken (the
settlement model's sixteen needs, build-4's `house-needs`, wellbeing-slate's
"the body's needs"), so the code says what the body feels. `Discomfort` is
the closed union `cold | heat | thirst | hunger`. `NPC.discomfort(kind)`
answers an `Urgency`:

| kind | wanted | pressing | critical |
|---|---|---|---|
| cold | shivering | core below setpoint − 1 K | below `survivableMin` + 1 K |
| heat | sweating in borrowed layers | core above setpoint + 1 K | above onset + 1 K |
| thirst | hydration < 50 % | < 30 % | < 15 % |
| hunger | satiation < 50 % and a meal hour | < 30 % | < 15 % |

Thresholds are settings (`fending.*`). `/lib/behavior/fends` ("fends for
itself") is `kind: body`, `claims: ['body']`; its `urgency` is the worst
discomfort with its `because` ("rubs her hands and makes for the fire"); its
`act` calls `host.seeTo(kind)`: `dress()` first (D14); if that does not
answer it, walk to the amenity (`BrainMoves`), `useAmenity`, walk back to the
station. `NPC.onCreate` adds the spec
`{brain: /lib/behavior/fends, trigger: candidate}` when the row does not list
it, so no row authors it. `eats.ts` is deleted; its purse-chooses-the-loaf
rule moves into `useAmenity('hunger')` unchanged, with `spendFraction` a
setting; the two rows drop their spec.

**`stokes` stays, and stays separate (C1, C5).** Keeping the house fire is
*work for the house* (`kind: work`): the smith's forge is for the mend, the
potter's stove for the ware, and neither is lit because the hand is cold.
`fends` is `kind: body`. The arbiter ranks the two kinds differently, and a
single brain could not be both. What changes: `stokes` no longer has two
places to name its fire. Its `fire` and `fuel` config keys are **retired**;
it reads `amenities.fire` / `amenities.fuel` of the hand's house, and with
neither it tends the first burner in the room as now. The potter's row moves
its two values onto the pottery house. `NPC.onCreate` adds the `stokes` spec
the same way as `fends`; it is idle for a hand whose room has no burner. Its
presence gate stays (unwatched tending is D15's).

**D13 — `useAmenity` is the one effect, called by both paths.** On `NPC`:

- `thirst`: draw from the fixture by the call `DrinkController` makes on the
  model, to full. The fixture's own supply chain is debited by that call.
- `hunger`: buy by the call `BuyController` makes on the `Stock` (the hand's
  account pays the house through the bank chokepoint), then eat by
  `EatController`'s model call. No counter stock or no money: the discomfort
  stays and the hand says the hungry line (shipped behavior).
- `cold`: be at the warm place until the core is back at the setpoint.
- An amenity that resolves to nothing: the discomfort stays. That is the
  honest path to step 9.

W6 names the three model calls after reading the controllers. If any decision
lives in a controller, it moves to the model first (P5) in that wave.

**D14 — One way to dress (C2).** Three things touch what a body wears today
or would have after the first draft of this plan: `Costumed` (the row's
clothes, once), a kit path, and the player's `Wardrobe`. They become one
seating call and one decision.

- **One seating call.** `Character.wearGarments(paths)` today clones each
  garment and seats it by its claim. The seating half becomes
  `Character.putOn(garment)`; `wearGarments` is "clone, then `putOn`". W6
  reads `WearController`: if `wear` already calls a model method that seats
  by claim, `putOn` **is** that method and `wearGarments` calls it; there is
  one, either way.
- **`Costumed` is stocking, not dressing.** It mints the NPC's *own* clothes
  onto it once, as `props:` mints what it carries. It makes no later
  decision. It survives as that; its retirement, with the student parent, is
  the agents pass of row-composition-slate (a requirements non-goal here).
- **One decision, `NPC.dress()`.** It asks the budget, at the air the NPC is
  about to stand in, whether the body holds its setpoint without shivering
  or sweating. Too cold: `putOn` the garment that adds the most insulation
  and fits, from what it may wear: its own clothes that it carries, then the
  house's on `amenities.pegs`. Too warm: take off the most insulating
  outer piece: one of its own goes into its carry, one of the house's back on
  the peg. Repeat until it holds or nothing is left. There is no kit-specific
  wear path: a Cast that carries its own jumper through July puts it back on
  in October by the same method.
- **The house's pieces go back.** `borrowed: string[]` (chattel ids,
  persistent) remembers what came off a peg. `hangUp()` returns every one;
  `placeOffShift` calls it before the hand leaves the story and
  `refreshBody` calls it for a role. The peg's garments are stamped to the
  house when the peg is first stocked from its row.
- **`Wardrobe` is not a dressing mechanism.** It is a player's saved *names*
  for sets of keywords, replayed through the same `wear`. It composes on
  `Avatar` only and is untouched. An NPC decides from the weather and has no
  names to save (C5).

Each on and off is an `act.deed` line to the room. `dress()` runs at shift
start and inside `seeTo('cold' | 'heat')`.

**D15 — An unwatched NPC is settled by events.** `NPC.settleUnwatched()` runs
at the head of the NPC's `reconcileMetabolism` and
`reconcileThermalRegulation` overrides (reentry-guarded), so every read of an
NPC sees settled state, not only an arrival. From its last settle time to now:

1. If it was on shift and `amenities.fire` resolves in its room: compute
   `t_out = fire.tendedUntil(from, now, looseFuelHere)` without mutating;
   `room.reconcileEnvelope(t_out)`; apply the fuel consumption and, if
   `t_out < now`, put the fire out; then `room.reconcileEnvelope()`.
2. Loop: ask the stocks' solvers for the next time a discomfort reaches
   `pressing` (heat and cold: D2's crossing solve against the room's log;
   thirst and hunger: metabolism stepped to its next threshold). Advance all
   clocks to that instant. Call `seeTo(kind)`'s effect half: `dress()`, then
   `useAmenity(kind)`. For `cold`, the body's air becomes the warm place's
   (read off that place's own log) until the core recovers, then the
   station's again.
3. Stop at `now`. If the last cold event was still warming, the body is moved
   to the warm place (`teleport`, as a shift move is); otherwise it is at its
   station.
4. A death found on the way stops the loop at its instant: `beginDying` with
   the real time of death, the body left where it was, and D16's report.

It never estimates: every stock is advanced by the same solver the watched
path uses, and every debit is `useAmenity`. The loop is bounded by events (a
drink every few hours, a meal a day, a warm-up cycle per chill), a few dozen
per game day.

⭐ **A settled act is the NPC's act, on the ordinary records (measurement.md
A17, A18; the Standard Model contract).** Buying bread, drawing water and
burning the house's fuel are in-fiction choices. Settling them late does not
change whose they are or where they are written:

- **Chooser.** Each settled event runs in its own root frame with **the NPC
  as the actor** (`ExecutionContextApi.runRoot` under tropes' actor rule;
  `runAsSelf` until tropes merges). It is never attributed to the player
  whose arrival triggered the settle, to the author of the row, or to a
  system. The triggering command is not its cause: the frame is a new root,
  so `causeId` is empty, as it is for a brain's own turn.
- **Act id.** Each event plants its own `metadata.actId` by the call
  `Behaved._runAct` uses (tropes D1/D25). One id per event, not one per
  settle: six hours with two drinks and a loaf is three acts.
- **Same records.** `useAmenity` is the only writer on both paths, so a
  settled purchase is a `postTransaction` row in `bank_ledger` (the hand
  pays, the house is paid) and a title move in `chattel_events`, a settled
  drink is the fixture's own draw, and settled fuel is `Burner.stoke`. There
  is no adjustment row, no bulk debit, no write that the watched path does
  not also make. ⛔ A "settlement" entry of any kind is a defect.
- **Descriptive only (A18).** The records say what changed. Nothing here
  writes a trait, a regard or a reading of the hand.
- **When it happened.** The record's game time is the event's instant inside
  the gap, not the moment of the settle, wherever the record carries a game
  time. W7 checks each chokepoint; one that stamps only "now" is logged as a
  fault line (C6), not worked around.

What proves it: W7's agreement test compares the *rows*, not only the
balances (same collections, same kinds, same parties, an act id on each);
drive step 8 reads the hand's ledger after the six hours and finds the bread
purchases as ordinary purchases by the hand, each with its own act id, and no
row whose actor is empty, the player or a system.

**D16 — A neglect death is reported once.** At `ConditionApi.die` for the
causes hypothermia, hyperthermia, starvation and dehydration, when the body
has no live session, `DiagnosticApi.record({ path: <the body's template path>,
channel: 'content-error', severity: 'error', message: … })` naming the cause,
the place, the house and which amenity resolved to nothing. The corpse stays.
No new log.

**D17 — Presence is one declaration (C2).** Where an NPC is and how it is
simulated was about to be said in four places: a new `presence`, a new
`home`, the house's `offShift`, and the Extra rung. It is one field on
`lib/npc/NPC`, parsed by the `Presence` value:

```yaml
presence: watched                              # the short form: just `as`
presence: { as: watched, offShift: /world/…/cottage }
```

- `as`: `live` · `watched` · `role`.
  - `live`: always wakes and beats; never leaves the story.
  - `watched`: D9/D10/D15.
  - `role`: as `watched` on shift; at each shift start `refreshBody()` (full
    reserves, setpoint core, neglect conditions cleared, its own clothes
    re-stocked) after `hangUp()`.
- `offShift`: `out` · `here` · a place path (its home: it walks there by
  `BrainMoves` when watched, `teleport` when not). A `role` is always `out`.
- **Defaults come from the rung, and the rung is not a knob**:
  `NPC.defaultPresence()` is overridden by `Cast` (`watched`, `out`) and
  `Extra` (`role`, `out`). An author who writes nothing gets the rung's.

**`Business.offShift` is deleted in this build.** Its one value, `out`, is
now every rung's default, so the eleven rows drop the key and
`getOffShift`/`setOffShift` go; `lint:instanceable`'s applier refusal catches
a leftover key. A house whose hands should be there at night says so on the
hands: `presence: { offShift: here }` on each, or once on the parent row they
`extends:`. ⚠ The requirements say "a house … says so"; this moves the
sentence from the house row to the hands' rows so there is one place to look.

`placeOffShift` reads the hand, in this order: `as: live` → nobody moves;
`offShift: here` → nobody moves; a `calledToAt` window open → there; a place
→ home; else `hangUp()`, the departure line, null. The lounge cast are
authored `presence: live` in W8.

`calledToAt` (the `frequents` brain's visit hours) survives beside this on
purpose (C5): it is a *timed* call a brain declares with its own hours, not a
standing answer, and it already enters through the same ladder.

Animals (owner, 2026-11-28, conflict 3): **no presence and no refresh**. An
unowned animal lives by the same physics and dies of neglect where it is,
reported by D16. When it comes into view it is reconciled like any body, so
a stray's death is found when someone looks.

**D18 — Tropes.** The `fends` and `stokes` turns run through `_runAct` and
carry the act id with no code here. The settled events take theirs as D15
states. Whichever branch merges second takes a small conflict in
`Behaved._runAct`/`_scheduleBeat`; D10's edit is in `_scheduleBeat` only.
If this build merges first, D15's "plants its own act id" is one line added
at the catch-up merge, and W7's row comparison gains the `actId` column then;
the MR says which state it merged in.

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
| `presence` (one field), `borrowed`, `discomfort`/`seeTo`/`useAmenity`/`dress`/`hangUp`/`settleUnwatched` | `lib/npc/NPC` (class body) | Claims it for Cast and Extra and the locality NPC subclasses (Tinker, TicketClerk, Realtor, Walter, Editor, Katie, Pilot). All are people with posts. Not on `Character` (a player has no presence to declare), not on `Behaved` (a cat has no house) |
| `putOn` | `Character` (beside `wearGarments`, which it is cut from) | Every character can have a garment seated on it. True; players reach it through `wear` |
| `Position.effort` | `Position` value | Every seat has an effort; the default is honest for most (light work) |
| `amenities` | `Business` | Every house may provide for its hands. Most will answer yes once authored (36 outdoor slots, every heated shop). Not on `Organization` (a government or a company with no premises provides nothing) |
| `amenities` | `Locality` | Every town may have public water, food and warmth. A locality with none answers none, and its cast then has nothing: correct, and `lint:amenities` says so. The same key and value as the house's, so there is one shape to learn |
| `housed`, `roomHeatExchange` | `Herdbook` (trade-ranching) | Every herd is in or out. True |
| `outOfStorySinceS` | `ContainableMixin` | Everything containable can be out of the story. True by definition of null |
| `clock` | `FieldMeta` | A declaration, not a capability |
| `tendedUntil` | `Burner` | Every burner can be tended over a span. True |
| `arms` slot | the biped plan row | Every biped has arms to cover |
| a flag on garments for the house's pieces | none | A piece is the house's by the peg it hangs on and its title, not by a field on every garment |

Rejected hosts, recorded so review does not re-open them: an `amenities:`
key on `Location` (most places would answer nothing; conflict 5); discomforts
on `Actor` (animals and players would answer "no"); presence on `Employed` (it
is about the body, and `live` cast have no shift); presence split across the
house and the hand (two places to look, C2); a mixin for N9 (one composer).

## Convention conformance

Checked at plan time against `CLAUDE.md` and the tree.

- **`props:` / `cast:`**: new fixtures are placed by their place's `props:`;
  no `container:`, no `populates:`.
- **Locations, not rooms**: warming places are `Hall`/`Room` class rows under
  `<locality>/place/`; prose says "place".
- **Paths**: kernel code under `S/lib/thermal`, `S/lib/npc`, `S/lib/behavior`;
  content rows under `/stuff/thing/...` (generic-objects), `/world/...`
  (venues), `/platform/...` (settings, views). No pack gains a root.
- **Module scope declares**: nothing is added at module scope. The
  `fends` and `stokes` specs are rows on the agents pass's kinds (§ Sequencing).
- **Import boundary**: trade-ranching imports `RoomHeatExchange` by
  `@saxonberg/server/mud/lib/thermal/RoomHeatExchange`; W2 adds it to the
  server `exports` map if absent.
- **Module categories**: two value objects (`Amenities`, `Presence`, each named
  for its concept, in `lib/npc/`), one brain, no helper functions, no new
  `lib/` folder.
- **Verbs on objects**: every new act is a method on the body, the burner or
  the book. No `XApi.verb(host)`.
- **P3 refuse / skip / throw**: an amenity that resolves to nothing is a skip
  with the discomfort standing, and a death is reported (D16). An `amenities`
  entry naming a row that does not exist throws at hydrate (`setAmenities`)
  and fails `lint:amenities`. A leftover `offShift` on a Business row is
  refused by the applier. A walk with no route is a `content-error`
  diagnostic and the discomfort stands. `rebaseClocks` on a non-finite Δ throws.
- **P4 no duck typing**: `Herdbook implements RoomHeatExchanging` by import.
  The envelope's shipped shape read (`roomHeatExchange?.()`) stays as it is
  (storage-and-ice D5); this build adds implementers, not casts.
  `BodyRegulation → Employed` goes through the `sustainedEffort` hook, not a
  narrowing.
- **P5 the mixin decides**: the `fends` brain picks nothing; `NPC` decides
  level, amenity and effect. Controllers are untouched except where W6 moves a
  decision out of one.
- **P6 persistence per content**: the coat pegs are a kept container in each
  place (a `Locker`-class row); the house's garments are live content, stocked
  once from the row. `borrowed` keys on chattel ids. `outOfStorySinceS` and `presence`
  ride the host's own record. No class persists what it hosts.
- **P7 load on use**: an amenity resolves by authored reference; the town's by
  the hand's own address; no roster of amenities, no boot entry.
- **P8 names**: every new name was checked against the subsystem docs, the
  command categories, the Api list and the row keys; the table is in *The
  surface, by kind* § Names. Two first-draft names were collisions and are
  gone: `Supply` and `needs`.
- **P15 a fork is an option, not an imposition**: this build adds no player
  verb and changes no player verb's behavior, so there is no fork to hand the
  player. The harness subcommands take their one varying input as an argument
  (`herd <book> in|out`, `air-pin <K> --at`). The author-facing forks are all
  options with a default: `presence` (default by rung), `amenities` (default:
  the town's), `effort` (default: the setting). Nothing asks the owner
  "X or Y"; the only defaults chosen here are the two rung defaults, which the
  requirements set.
- **P9–P14, per item:**

| item | P9 predictable | P10 doc? | P11 no dest. branch | P12 no synonym | P13 right mixin | P14 nothing invisible |
|---|---|---|---|---|---|---|
| N1 budget | `help warmth` gains the budget's terms; `testharness body` prints them | n/a, physics | n/a | replaces the band; band deleted | regulation's header is "the living body's heat" | cues unchanged |
| N2 room heat | `analyze rooms` lists occupants' heat (W2 adds the line) | n/a | envelope asks one protocol | same protocol | regulation; the book is the herd | no |
| N3 arms slot | `look`/`outfit` show the slot | a plan row | n/a | n/a | body plan | no |
| N4 clocks | not a command | `clock` is meta on fields | the walker is inside `move`; no caller branches | no new move | Containable = "can be in a container" | ⚠ `move` now ends engagements and shifts stamps; both are stated in spatial.md and the leaver's line is shown |
| N5 `left-story` | the abort line names it | vocabulary member | n/a | W4 confirms | n/a | no |
| N6 watched | not a command | n/a | n/a | replaces `_hasAudience` | Creature | no |
| N7 `Presence` | one row key; `help authoring cast` | a value on the NPC row that code reads by field: not a Document | `placeOffShift` reads one value in one ladder | replaces `Business.offShift`, deleted | NPC | off-shift move has a line; defaults are the rung's and are stated in identity.md |
| N8 `Amenities` | one row key on two row kinds; `lint:amenities` | ⭐ a value on two rows that code reads by field, not a table read by name: not a Document, and not an Idea class | resolve is inside `Amenities`; no caller asks "house or town?" | not `parLines`/`purchases`/`fulfills` (D11) | Business / Locality | no default amenity; nothing resolves → nothing |
| N9 fending on NPC | a watcher reads the `because` line | n/a | `useAmenity` asks the fixture by its own protocol | `seeTo`, not `relieve` (Vitals' word for an affliction) | NPC | the garment choice is by one stated rule and each piece on or off is a line |
| N9a `putOn` | it is what `wear` does | n/a | n/a | ⚠ must BE `wear`'s model call if one exists (D14), never a second | Character, beside `wearGarments` | no |
| N10 `fends` brain | brain `summary` | n/a | n/a | `eats` deleted; `stokes` is a different kind of task (D12) | brain | implicit spec is documented in behavior.md and visible in the studio's composed row |
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
- `testharness presence <npc>`: prints its presence, watched, last settle, and
  what it has borrowed.
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
restart while out of the story keeps the stamp. Players are unchanged:
sign-out, a clock advance and login read the same body for the old reason
(the player's guard, D8), and a dropped connection lingers linkdead as
before.
Commit: `build(cast-in-winter W4): out of the story is out of time`.

### W5 — Watched, and presence (D9, D10, D17)

Files: `S/lib/creature/Creature.ts`, `S/lib/behavior/Behaved.ts`
(`_hasAudience` → `isWatched`, `_scheduleBeat`), the place base's
`onContainableAdded`, `S/lib/npc/Presence.ts`, `S/lib/npc/NPC.ts` (`presence`,
`defaultPresence`), `S/platform/agent/{Cast,Extra}.ts`, `S/lib/vitals/Vitals.ts`
(`refreshBody`), `Business.ts` (**delete** `offShift` and its accessors),
the eleven Business rows that author it (drop the key; grep all of
`packages/content`, review B4), `EmploymentLogic.ts` (`placeOffShift` reads
the hand; shift-start refresh), `ThermalRegulation.ts` (wake only when
watched or live), behavior.md, employment.md, identity.md, residency.md.

⚠ Off shift now means out of the story for the hands of 64 more houses.
Before committing, run the wire flows of the trades whose hands serve at
night and fix by authoring `presence: { offShift: here }` on those hands (or
their parent row) or a roster hour, never by reverting the default.

Acceptance: unit: an unwatched Cast holds no wake and no beat handle; a
player entering arms both; an Extra's body is at baseline at shift start; a
Cast whose `offShift` names a place is there off shift; a `live` Cast never
leaves; `rg offShift packages/server/src/mud/platform/idea/Business.ts` is
empty.
`lint:idle-cadence` unchanged or lower.
Commit: `build(cast-in-winter W5): fidelity follows attention`.

### W6 — Amenities and fending (D11–D14)

Files: `S/lib/npc/Amenities.ts`, `Business.ts`, `Locality.ts`,
`S/lib/character/Character.ts` (`putOn`, cut from `wearGarments`), `NPC.ts`
(`discomfort`, `seeTo`, `useAmenity`, `dress`, `hangUp`, `borrowed`),
`S/lib/behavior/fends.ts`, `stokes.ts` (config keys retired; the potter's row
moves its two values to the pottery house), delete `eats.ts` and its tests,
the two `eats` rows,
`C/generic-objects/content/stuff/thing/fixture/coat-pegs.yaml`,
`C/platform/content/settings/fending.yaml`, reason and line rows,
`S/scripts/lint-amenities.ts`, test-fixtures rows (a house with every
amenity, a house with none, a testbed Locality with public ones).
behavior.md (the `eats` section becomes the hunger discomfort), a new
`docs/subsystems/amenities.md` (leave the CLAUDE.md index line to the sweep).

`lint:amenities`: every `amenities` path resolves to a row; `pegs` resolves
to a kept container; `fire`/`fuel`/`pegs` do not appear on a Locality; every
roster slot whose station is under open sky has a `warmth` that resolves
(house or town) and is not itself under open sky.

Acceptance: wire flow on the testbed, watched: a chilled hand walks to the
fire and back; a thirsty one drinks; a hungry one buys and eats; a hand whose
house declares nothing uses the town's; pieces go on in the cold and the
house's are back on the peg at shift end; a fire is laid and lit from the
house's declaration; `rg "wearGarments|putOn" S/lib` shows one seating
implementation. Each checkpoint is made to fail once (B2).
Commit: `build(cast-in-winter W6): amenities on the house, fending in the deliberation`.

### W7 — Settling the unwatched (D15, D16)

Files: `NPC.ts` (`settleUnwatched` and the two reconcile overrides),
`S/lib/fire/Burner.ts` (`tendedUntil`), `Metabolic.ts` (step to next
threshold), `S/platform/idea/api/ConditionLogic` or wherever `die` lands (the
report), amenities.md, mortality.md, diagnostics.md.

Acceptance (unit, arithmetic): six unwatched winter hours at a supplied post
leave the hand alive, the fuel lower by burn rate × lit hours within one
item, water drawn equal to drain ÷ per-drink, money down by the meals due;
the **agreement test**: the same six hours run watched (a silent observer
body in the room, beats driven) and unwatched end within tolerance of each
other on core (±0.5 K), reserves (±5 points), fuel and water (±1 unit), and
place; ⭐ **and on the records** (D15, A17): the two runs write rows of the
same collections and kinds with the same parties, every settled event has
the hand as its actor and its own act id (the `actId` column once tropes has
merged), and no row exists on the settled side that the watched side has no
twin of; a hand with no amenity and no warm place is dead at the solver's
time of death and one diagnostic row exists; seven days is fewer than 500
events.
Commit: `build(cast-in-winter W7): an unwatched hand is settled honestly`.

### W8 — Content

Every row below, then `lint:amenities` at zero.

- **The commons.** `Locality` rows for Terminus's districts get `amenities:` —
  water the market standpipe, food the bread counter, warmth a new public
  warming room. The lounge bar's free water is the lounge locality's
  `amenities.water`.
- **A business kind parent** `/stuff/idea/business/dairy` with
  `amenities: { pegs: /stuff/thing/fixture/coat-pegs, water: /stuff/thing/fixture/water-butt, warmth: … }`;
  the Delight dairy `extends:` it. This row is the second-instance proof.
- **The Delight dairy.** Byre: `enclosure:` (whitewashed brick) and `roof:`
  authored, the door a real boundary shut at night, coat pegs stocked
  (two each of work-jacket, wool-cap, scarf, mittens, oilskin), both herd
  books `housed: true`. Hesper Vane gets a roster slot (station the byre),
  the lad's slot a station. Warmth per conflict 4. Costumes: both swap the
  field jacket for the work shirt.
- **Lit fires.** The shop hearths stay unlit in their rows; `amenities.fire` on
  each house whose station holds a Hearth or Brazier, and fuel props where
  the census shows none (chandlery, colorman, lower-towpath stove,
  goods-yards brazier). Where a fuel supplier ships, the house also gets a
  fuel `parLines` entry so the fire's fuel is restocked by the shipped route.
- **Lounge cast** `presence: live`. Hands that serve at night:
  `presence: { offShift: here }`.
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
| 19 | market square | market | **new**: the public warming room (also the town's) |
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
  post or warming place, else the town's by silence. Bread is the market's.

Acceptance: `lint:amenities` zero; every new place walked at night with a light
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
   its interface member; unowned animals lose the spare in the same commit (conflict 3: they die of neglect, reported).
4. Docs: thermal.md, vitals.md, metabolism.md, mortality.md; strike §§ 1, 2, 4
   from backstops-owed-slate (leave the sweep to compact it). List C6's
   fault lines, with what W6 and W7 actually found, in the MR description
   for the sweep to carry into api-normalization-slate Part 8.
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
| presence | none | roster tick | the one `presence` key | an `offShift` place loads on use (`StuffApi.singleton`) | `setPresence` refuses an unknown `as` or a `role` with a home |
| fending | none (the NPC's own) | declared on the agents pass's person kind row, inherited by every NPC row (§ Sequencing); no implicit spec | `fending.*` settings | brain resolves by path at wire time | n/a |
| amenities | none | `Business.amenities`, `Locality.amenities` | W8 rows | each path loads on use; ⚠ a warm place nobody stands in must stand up when a hand is settled there (`singleton`, not `findByTemplatePath`) | `setAmenities` validates keys |
| dressing | `wear`'s own model call (`putOn`) | the pegs in the station place; the NPC's own carried clothes | pegs row + stocked garments | pegs are a prop | n/a |
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
| A hot day: no winter layers | W6 (D14, the `heat` discomfort); step 11 |
| Back from off shift no hungrier, colder or older; goods unaged; pegs full | W4, W5, W6; steps 7, 7a |
| Empty room is in the story; out of the story is not | W4, W5; steps 7a, 8 |
| A newcomer feels it and fixes it with the offered coat | W1, W3; step 12 |
| A second dairy with no code | W6 (kinds), W8 (the parent row); proved by a test-fixtures second dairy that only `extends:` |

Nothing is unmapped.

## Test & gate strategy

**Unit** (colocated `__tests__/`, each importing `test-bootstrap` where it
touches the runtime): the budget's regimes and crossings; the bench tables
(gym job); room heat; the rebase walker per clock family (one parametrized
test over the census list, so a new clock without a case fails); `Amenities`
resolution and `Presence` parsing with rung defaults; discomfort levels;
`dress()` on and off and `hangUp()`; the settle arithmetic and the
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
| 8 nobody watching | short | walk away, `clock-advance 6h`, walk back; `testharness presence` and counts; ⭐ the hand's bank ledger shows each loaf as an ordinary purchase by the hand with its own act id, and no row by the player, a system or nobody (D15) |
| 9 nothing provided | staged | the fixture Cast; `clock-advance 12h`; `errors` |
| 10 sleeves | instant | `wear`; the insulation reading |
| 11 summer | staged | `air-pin 305`, clear |
| 12 newcomer | short | a new character; `air-pin` |
| 13 calibration | instant | the bench run by name |
| 14 restart | short | harness restart mid-shift |
| 15 light | instant | `daylight-pin` night; `look` in each new place |

Blocking: 1–15 and 7a. Soak (`cast-in-winter.soak.wire.test.ts`, named in the MR, never
run by the build): 16, 17, 18. Staged twins: 16 → steps 8 and 9 plus W7's
seven-day arithmetic test; 17 → step 11 plus a unit test stepping the air pin
from 268 to 290 K and asserting the layers come off piece by piece; 18 → step 6
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
- **Off shift out by default (W5)** will break drives that expect a hand at night.
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
- **Owner decisions**: ✅ all taken 2026-11-28 (conflicts 1, 3, 5 decided;
  6 withdrawn).

## Deferred seams

- **Herd turn-out and bring-in as play** (a verb, a dusk routine) →
  add a line to backstops-owed-slate § "left" naming `Herdbook.housed`.
- **Unwatched production** (`cellars`, `restocks`, `feeds` keep a nightly
  beat) → unobserved-economy-slate; the attach point is `settleUnwatched`'s
  event loop.
- **One reconcile shape for the body's stocks** (metabolism off 60 s slices,
  onto events) → thermal-slate (C4); the attach point is the one
  "step to your next threshold" method W4 adds.
- **The Api pass's fault lines** → api-normalization-slate Part 8, copied
  from C6 by the sweep.
- **Homes and sleep** → sleep-slate, household-lifecycle-slate; the attach
  point is `presence.offShift` and `placeOffShift`.
- **Enclosed air derived from fit** → textiles-slate § insulation.
- **`Combustible`'s far-past guard** and the remaining thing-side gap guards →
  a line in soak-lane-slate.
- **The student costume parent** → row-composition-slate's agents pass; W8's
  costume edits are its evidence.
- **Animal needs** (a stray that forages and drinks) → vocations or
  husbandry slate. Until then unowned animals die of neglect, loudly, and
  each reported death is that trade's finding.

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
