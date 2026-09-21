# Slate-compaction pass — logistics batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `logistics.md` only
(six inserts, all below). Line numbers are the ORIGINAL file's. Originals
saved under the scratch dir `logistics/orig/`; the retired
`logistics-plan.md` (W0–W9, every wave `✅`) and
`logistics-requirements.md` (D1–D21 + the non-goals list) were recovered
from `6a9263350^` into the same scratch dir and used as the build record.
Code verified in `packages/content/transport/`, `packages/content/
trade-haulage/`, the corridor packs (`terminus`, `rejection`,
`newbie-wilds`, `hearts-delight`, `world-seed`) and the kernel; every
class below names the file that decided it. A previous agent's
unledgered partial diff was read as a hint only; every call here was
re-verified and several differ from it (Part 3 kept as doctrine, Part 4's
colony-games section kept, Part 5's encumbrance paragraph kept as
contradicted).

Four things a reviewer should know first:

1. **Both slates' `Left` lists were too short, not wrong.** The bodies
   carried far more open design than the stamps admitted (freight: 7
   items → 18; logistics: 12 → 15). Nothing in either `Left` was false on
   arrival — every named item is genuinely unbuilt, confirmed against the
   retired requirements doc's *Non-goals* list, which names each and
   where it lands (the border build, the contested road build, the
   warehouse build, the returns build, ranching, the standards build).
2. **The one code fact that contradicts the slates:** freight's
   *Disciplines* table lists *husbandry (existing)* for draft animals.
   `teamstering.yaml` says in as many words that this is *an ERROR in the
   slate* — all 46 shipped Disciplines were checked and animal handling
   is not among them; draft animals ride `teamstering`. Kept in the table
   (paragraph rule), flagged under Uncertain, and the correction is in
   the `logistics.md` insert.
3. **Three shipped things the doc did not carry**, now graduated: the
   depot's shape and siting (`DepotCounter` = attendant + shipment desk +
   `Business`; `Warehouse` = bailee; sited where two lanes meet), the
   `teamstering` information/capability split (`measure passage`,
   `analyze load`, `requiredBand`; `RigHandling.test.ts:152` asserts no
   conferral makes the same act better), and the *why* behind two shipped
   decisions (the cost surface's no-tech-ladder; duration priced in
   vulnerability).
4. **Two things declared and never fired**, kept as open: `team-exhausted`
   is in `abort-reasons.ts` and nothing raises it; the `journey` readout's
   docstring says *competence tightens the window* but
   `JourneyController.report` prints one exact number
   (`Journey.estimateRemainingGameMinutes` reads no band).

---

## docs/slates/builds/freight-slate.md — 1104 → 892 · Status PARTIAL → PARTIAL

The substrate half of this slate shipped in the logistics build and is
documented; the *politics* half (barricade, tollgate, turnpike trust,
antitrust arc, drovers, navigation) is entirely unbuilt — grep for
`barricade`/`turnpike`/`tollgate`/`customs`/`drover`/`wainwright`/
`piracy` under `packages/server/src/mud` + `packages/content` finds
only comments naming them as gaps (`terminus/pack.yaml:63`,
`general-store/counter.yaml:152`, `delight-road/drove.yaml:7`). The
requirements doc's non-goals list names every one of them and the build
each lands in.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"direction set, nothing built"* (16–19, 4) — history; the canonical block is kept and re-stamped
- `### Pedestrians stay synchronous; vehicles become durative` (98–121, 24) — code: `transport/src/lib/journey/Journey.ts` (a sustained engagement, `TICK_GAME_MINUTES`, the beat issues `traverse`), `JourneyController.ts`; doc: `logistics.md § The Journey: a sustained engagement whose beat is one leg`. Heading `## The vehicle-in-a-room question` + pointer left, because the `####` invariant below it is kept
- `## ⭐ The road network is emergent, not authored` body + `### The one real dependency` (197–214, 18) — code: `Lane.ts` (induced over `allowsMode` + `Exitable.wheelPassable`), `LaneCatalogue.ts`; `CartesianLocation.ts:175` (`extent` override, ranged build); doc: `logistics.md § The lane: an edge set, induced`, `ranged.md § extent`. Heading + pointer left
- `## Navigation` → bullet 1 *pathfinding must be mode-parameterized* (218–219, 2) — code: `LaneCatalogue.planRoute` (one BFS per lane); doc: `logistics.md § Routing`. Struck-through pointer bullet left; bullets 2–3 KEPT
- `## What is already free (check before building)` (440–447, 8) — a gig with a custody clause → `CONDITION_TEMPLATES` `delivery`/`supply` (`logistics.md § The condition vocabulary is CLOSED`); custody in transit → the chattel-stamped crate (`§ The bill of lading`); the `hauls` brain → `trade-haulage/src/behavior/hauls.ts` (`§ The labor market`). Whole section removed
- `### ⭐ The coverage walk already answers "who polices the road"` body (525–533, 9) — code: `AddressApi.coverageChainOf`; doc: `logistics.md § Addresses, and the jurisdictional gap` (the Delight road under no `Locality`, the Kestrel road Rejection's). Heading + pointer left; the three bullets (highway robbery, police vehicles, pursuit) KEPT
- `## Named gaps` → *"Plus, from this pass: the teleport ripple defect … and the per-location extent override"* (614–615, 2) — both shipped (below / `ranged.md`)
- `## The Journey — the durable activity, designed` → `### Shape` + `### The journey never moves anything itself` + `### Slot: hands` (619–672, 54) — code: `Journey.ts` (`JOURNEY_SLOTS = ['hands']`, `interruptibleBy = new Set()`), `SchedulerApi.complete` (`api/scheduler.ts:205`); doc: `logistics.md § The Journey` (the `hands` table, arrival-is-a-completion, the escort consequence). Heading + pointer left
- `### Ownership, cadence, and the transaction boundary` → bullets 2–4 (681–689, 9) — beat interval from exit data → `Exit.edgeMinutes × modeFactor × loadFactor` (`§ The metronome and the score`); on game time ✓; the per-leg re-check → `§ Fault tolerance` (shipped with named reasons rather than `preconditions-changed` — a shape difference, noted). Bullet 1 KEPT (it carries the runaway deferral)
- `### ⭐ Combat is NOT in `interruptibleBy`` (699–711, 13) — code: `Journey.ts:118`, `abort-reasons.ts` header; doc: `logistics.md § The Journey` (*being shot at does not stop your wagon*). Its consequence (*bandits have to physically block the road*) survives verbatim as `## The barricade`'s first paragraph
- `### No auto-replan in v1` (723–728, 6) — code: `JourneyController` (`route-blocked` ends the trip, no replan); doc: `logistics.md § Blocked means blocked`, `§ Routing` (*there is no cross-lane routing*)
- `### Two smaller calls` → *the NPC `hauls` brain uses the same Journey object* (734–736, 3) — code: `hauls.ts` issues `journey to … via …`; doc: `§ The labor market` (*on the same `Journey` object a player drives*)
- `### ⭐ Lawfulness is already answered` body (785–793, 9) — code: `ParcelApi.ownerOf`, land-use `civic`/`wild`; doc: `logistics.md § Land use: no seventh entry` (*the `civic`/`wild` split IS the toll-versus-obstruction distinction*), `§ Addresses`. Heading + pointer left
- `### Two smaller notes` → *check whether a road corridor fits the closed land-use vocabulary* (1077–1080, 4) — answered: no seventh entry; a corridor is its own parcel. Struck-through pointer bullet left
- Open question 3 *Load model* (1093–1094) → `HaulageRig = Bulkable(Haulable(Vessel))` (`transport/src/thing/HaulageRig.ts`; `logistics.md § The vehicles`). Pointer line left
- Open question 6 *Rates* (1100–1102) → the rate card + the gig board (`RateBoard.ts`, `RateCardRegistry.ts`; `logistics.md § The rate card`, *two pricing mechanisms coexist*). Pointer line left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### The recommendation` (318–323, 6) + `### It sells two different things` (332–336, 5) + `### The smaller pieces` → the *Siting: a depot exists where transport MODES CHANGE* bullet (409–412, 4) — code: `trade-haulage/src/thing/DepotCounter.ts` (`ShipmentDeskMixin(AttendantMixin(Vessel))`, affords `ship`), `Warehouse.ts` (`deposit`, `baileePath`), `depot-business.yaml` (*sells exactly ONE product*), `terminus/…/estuary/lower-towpath.yaml:30-48` (the depot on the quay where the water lane and the wheeled road both reach), `delight-road/crossroads.yaml:1` (*a depot SITE, and nothing…*) → inserted at `logistics.md` as a new `## The depot: three known things standing where two lanes meet` before `## The paper` (16 lines: the composition, handling-not-storage, sited where modes change, point-to-point and depots emerge because it pays). Headings + pointers left
- `## Disciplines` → nothing cut (the table is mixed — see Uncertain), but the shipped half is undocumented: `teamstering.yaml`, `MeasurePassageController.ts`, `AnalyzeLoadController.ts` (stanzas on the platform's `measure`/`analyze` views — `measure.yaml:250`, `analyze.yaml:169`), `wagon.yaml:30-31` / `dray.yaml:17-18` (`requiredDiscipline` + `requiredBand`), `RigHandling.test.ts:152` → inserted at `logistics.md § Handling` after *Band 0 must be able to earn* (11 lines: information vs capability, the error-bar ladder, no conferral makes the same act better, draft animals ride teamstering not husbandry)

### Superseded — cut
- `### ⭐⭐ The warehouse receipt — where it stops being a building` (340–362, 23) — by the code: the receipt is a RECORD only; the `BearerReceipt` `Thing` was cut before merge as *proof of nothing* (`Warehouse.ts:52-65`, `WaybillRegistry.ts:125`); it returns with `withdraw` → `logistics.md § The warehouse receipt`. Heading + note left. The bailee/document-of-title/collateral doctrine in the cut text is carried by `logistics.md § The warehouse receipt` (*a bailee's acknowledgement, and a document of title*) — the collateral/commodity-exchange history is not, and is recoverable from git
- `## The TPA question — RESOLVED` body (450–463, 14) — by `logistics-slate` D4 and the code: the TPA is one of two incumbent networks, not a special case; the `tpa` lane row was deleted (`logistics.md § There is no `tpa` lane`). The two gates the section named still stand (`teleport.yaml:46-47` `requiresAnimate`; the wallet-bound clearance, `fasttravel.md`). Heading + note left
- `### ⚠ Two live defects this surfaced` (467–484, 18) — by the code: a teleport **severs** a coupling and tells both sides, rather than refusing (`Mobile.teleport` via `unhitch` / `Slotted.vacate`) → `conveyance.md § teleport ripples what is on you`, `logistics.md § The teleport defect, fixed`. Heading + note left

### Kept (UNBUILT)
- the status block (re-stamped) · the captured-from paragraph · *Sibling, not overlap* · *Related*
- `## Live cargo walks; dead cargo rides` + `### The marquee: refrigeration relocates an industry` — no `drover`/`shrinkage`/`refrigerat*` mechanism anywhere; requirements non-goals → ranching / the preservation thread
- `## Navigation` → bullets 2 (knowledge-gated routing, cartography — no map gate, no `navigation` Discipline) and 3 (see Uncertain — half shipped)
- `## Topology` → all of it except `### The recommendation` (doctrine: single-source vs multi-commodity flow; hub-and-spoke as emergent; the monopoly at the hub; *Munn*) — see Doctrine
- `## The depot as a business` → `### The monopoly is a different KIND` · `#### Which demands a different remedy` · `### It is where labor has maximum leverage` · `### The smaller pieces` (three bullets: the bailee's duty adjudicable, two capacities, trust as the quality signal) · `### Three rungs, and the second variant` (forwarder, corpo network, cold store, grain elevator, impound yard)
- `### The line is capacity, not goods` · `### For vehicles: site terminals where wheels can't go` — see Doctrine
- `## Crime, police, and jurisdiction` → the three bullets (highway robbery + escort, police vehicles, pursuit as scheduling)
- `## Disciplines` (see Uncertain) · `## Economy and lore` + `### The freight monopoly is the legislature's first natural antitrust case` (no legislature-facing rate record, no caucus/bill machinery — `civics.md`: *no statute engine*)
- `## Named gaps in the shipped substrate` (driver-external vehicles, multi-actor crews — `conveyance.md § What v1 doesn't cover` still lists both)
- `## The Journey` → `### Ownership…` bullet 1 (the runaway) · `### Abort reasons` (see Uncertain) · `### Observability` (see Uncertain) · `### Two smaller calls` → the linkdead driver (see Uncertain)
- `## The barricade` — all subsections except `### Lawfulness` (cut above); `### Open questions` (erect via crafting? which verb clears? exits vs directions)
- `## The tollgate` — all of it · `## The turnpike trust as a business` — all of it (`### Two smaller notes` → congestion pricing kept)
- `## Open questions` → 1 (the residual: scheduler churn on very long routes), 4 (shrinkage), 5 (does the wagon spoil-shield), 7 (NPC haulier density — see Uncertain)

### Uncertain — kept
- `## Why the design already closes it, and closes it exactly far enough` (152–166) — **contradicted by a shipped decision**: it claims *"the durative journey removes wall-clock from the bulk path entirely"* and *"a fast typer shuttling packs can never reach commercial scale"*, but `logistics.md § The cost surface is OPT-IN` records that ordinary `go` is instantaneous and free **with a hitched rig and its cargo following** — the Journey is opt-in and an `msh` script opts out. Kept verbatim so requirements reconcile it (the *make the rig the gate* option is parked pending playtest there) rather than inherit it
- `## Disciplines` table (549–563) — mixed: `teamstering` shipped (`trade-haulage/…/Discipline/teamstering.yaml`); `navigation` unbuilt (requirements non-goal: *a discipline needs somewhere to get lost*); *husbandry (existing) — draft animals* is **wrong per the code** (`teamstering.yaml`: *"that is an ERROR in the slate… animal handling is not among [the 46]"*); *crafting — wainwright* unbuilt; *preservation (existing)* — no `preservation` Discipline row found under `packages/content` or `packages/server/src`. The *Deliberately NOT a discipline: logistics* rule holds (no such row). One table, kept whole
- `## Navigation` → bullet 3 *Competence buys information, not outcomes* — shipped for passage/load (`measure passage`, `analyze load`), NOT for ETAs or spoilage margins. Kept
- `### Observability` (712–721) — position and the ETA readout shipped (`JourneyController.report`), but *competence tightens the ETA* did not: the docstring at `JourneyController.ts:158-160` claims it and the body prints one exact figure; `Journey.estimateRemainingGameMinutes` reads no band. Kept as the open half; ⚠ the docstring overstates — code, not my remit, flagged for the coordinator
- `### Abort reasons` (691–697) — `route-blocked`, `vehicle-disabled`, `team-exhausted` all declared (`abort-reasons.ts`, plus `displaced` and `driver-incapable` the slate did not foresee) and `combat` reused as designed; but **nothing fires `team-exhausted`** (grep: the literal appears only in its declaration; `DraftHorse.ts` has no reserve drain feeding it). Kept; the `Left` names it
- `### Two smaller calls` → *a linkdead driver halts the journey* — no linkdead handling touches engagements (`grep -i linkdead packages/server/src/mud/lib/activity` → nothing; `activity.md` says nothing); the shipped behaviour is that the metronome keeps ticking until the avatar is reaped. Kept as open, and it is the version the slate itself marks *open to argument*
- Open question 7 *NPC haulier density* — half answered: the carter covers postings nobody took inside its window (demand-driven, not a fixed circuit — `logistics.md § The labor market`), but *how much* background freight is authored data (`haulage.npcRatePerKgMinor`, the par sheet) with no density dial. Kept
- Overlaps for the cluster pass: the barricade / tollgate / turnpike ↔ `logistics-slate` Part 9–10 and § 12 Q4/Q9 (same open thing, kept in both); warehousing rungs ↔ `logistics-slate` Part 11.5 (the design lives there; this slate keeps the rungs and the variants); the free-movement module ↔ `logistics-slate` Part 6 D9 + `amendment-library-slate`; police vehicles / pursuit ↔ `policing-slate`, `prison-slate`; the reefer ↔ the preservation thread (`spoilage.md` ships none)

### Doctrine — kept, labelled
- `## Why the industry exists at all` (von Thünen; the closed land-use vocabulary expresses it)
- `#### The invariant this actually protects: no economic rate may be wall-clock` + `## Audited: every production system already complies — except movement` + `## The legal implication: this one CANNOT be a statute` — the rule lives in no subsystem doc (grep `wall-clock` in `logistics.md`/`measurement.md`/`uncertainty.md`/`activity.md`: only incidental uses); `connection-quality-slate` cites it as *the freight slate's*. A candidate for `measurement.md` or `docs/design-philosophy.md`; not added by this pass
- `## Topology — freight is NOT hub-and-spoke (but it becomes it)` — the whole argument (utilities are trees; freight is an O-D matrix; hub-and-spoke is emergent; the switch is capacity; three networks; the monopoly is at the hub; two things that fall out free)
- `### The line is capacity, not goods` (the TPA moves people and what they can carry — mail fast, freight slow) · `### For vehicles: don't write an exclusion — site terminals where wheels can't go` (a cart-access terminal as a world-changing event the world may decide; *costs nothing to leave open*)
- `## Economy and lore` → *transport cost is a spread* · *both a guild and a corpo*

### Handoff (belongs in a doc outside my list)
- → `conveyance.md § What v1 doesn't cover` — nothing to add; the two gaps the slate names are still listed there verbatim
- → `contract.md` — nothing; the *gig with a custody clause* landed as the `delivery`/`supply` conditions, which `logistics.md § The condition vocabulary is CLOSED` carries
- → `address.md` — nothing; the coverage-gap derivation is `logistics.md § Addresses`
- ⚠ code, not docs, for the coordinator: `transport/src/idea/cmd/movement/JourneyController.ts:158-160` docstring says *competence tightens the window a teamster is shown* — the body does not (see Uncertain)

### Status block
- Status line: added the depot, `teamstering`, and *the teleport ripple ships as a SEVER, not a refusal* with the `conveyance.md` pointer
- Left: *the barricade · the tollgate + turnpike trust · warehousing as a business · the wainwright · rail + timetables · navigation as a discipline · customs and tariffs* → *the barricade (exits vs lane edges · the clearing verb · erect via crafting?) · the tollgate + the turnpike trust (the toll schedule as a `parameter` clause · the road inspector · the sunset · toll or tax) · the depot's antitrust arc (the duty to serve · the strike · the forwarder · the cold store · the impound yard · warehousing rungs — the design is logistics-slate § 11.5) · live cargo and drovers + the refrigerated wagon · highway robbery, escort, police vehicles, pursuit · navigation as a discipline (knowledge-gated routing · cartography · the competence-tightened ETA) · the wainwright · the teamsters' guild vs the freight corpo · driver-external vehicles + multi-actor crews · the runaway team + `team-exhausted` (declared, never fired) · the linkdead driver · internal tariffs / the free-movement module (customs proper is logistics-slate's) · scheduler churn on very long routes · shrinkage · NPC haulier density*. ⚠ **`rail + timetables` REMOVED** — this slate's body has no rail section (only the hub/spoke doctrine); `logistics-slate` owns it. *customs and tariffs* narrowed to the one section this body has (internal tariffs / the Commerce Clause module) with a pointer to the owner
- Size: a build → a build

---

## docs/slates/builds/logistics-slate.md — 1057 → 772 · Status PARTIAL → PARTIAL

The parent slate. Parts 0, 2, 4 and the inventory describe the build
that shipped (retired `logistics-plan.md`: W0–W9 every wave `✅`; the
contiguity test `world/__tests__/logistics-corridors.test.ts` AC1/AC2/
AC3/AC4 green on the tree). Parts 6–11.5 are the border build, the
returns build, the standards build, the contested road build and the
warehouse build — none started: no `checkpoint`/`customs`/`tariff`
(the only `Tariff.ts` is retail's menu), no `barricade`, no `piracy`,
no index/basket document, no slot-dimension standard, no
`canRest`-based warehouse capacity. The requirements doc's *Non-goals*
list names each and where it lands.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation settled. Requirements not written."* (23–25, 3) — history; requirements were written and retired
- `# Part 0 — The finding: the supply chain already runs on teleport` body (78–101, 24) — code: `consigns` walks (`lib/behavior/consigns.ts:296-308` — `LaneCatalogue.planRoute` by shape over the `city` lane; *there is no `teleport` in this brain at all*), `restocks` posts (`lib/behavior/restocks.ts` — `job post` onto the receiving bench); the contiguity test; doc: `logistics.md` intro (*zero exits crossed a locality boundary … this build delivers both halves*), `§ The forcing function`. Heading + pointer left
- `# Part 2` → the D1 user quote + the Saxonberg-by-decree paragraph (127–134, 8) — doc: `logistics.md § The forcing function` (*the Lounge stays off the map … the Compact's seat is served by the Authority's network*) + the corridors insert below carries the *by decree* clause. Nothing left; the map table follows the pointer
- `## Two corridors carry the whole economy` body (172–184, 13) — code: `world-seed/…/Lane/spine.yaml` (wheeled), `Lane/estuary.yaml` (sailed); doc: `logistics.md § Three lanes ship` (the estuary row quotes the gorge). Heading + pointer left
- `## ⭐ What "enough geography" means — the corridor` body (188–198, 11) — the four things a corridor needs → `Lane.mode`, `Exit.edgeMinutes`, `AddressApi.coverageChainOf`; doc: `logistics.md § The corridors` (*length is an event budget, not a distance*), `§ Addresses, and the jurisdictional gap`. Heading + pointer left; the Delight/Kestrel inconsistency paragraph KEPT
- `# Part 4 — D5: how a mode manifests` → the user quote (311–317) + `## ExitableVessel is a railway carriage` (319–338) + `## The dial is on the lane, not on the traveller` (340–365) + `## Route = an ordered node sequence + a stop set` (367–378) + `## The four experiences — and they are four verbs` (380–396) (86 lines) — code: `transport/src/thing/Coach.ts` (`Drivable(Sealable(Mobile(ExitableVessel)))`), `Lane.stops` + `Exit.edgeMinutes` (the two dials), `lib/journey/Route.ts` + `ServiceRoute.ts` (`spine-express`/`spine-local` rows), `journey.yaml` / `ship.yaml` / `go <vehicle>` + `out` / `teleport.yaml`; doc: `logistics.md § The vehicles` (*the consumer `ExitableVessel` had been waiting for*; *perception out of a vehicle needs no code*), `§ The Route` (*express versus local is ONE LANE with two stop sets*), `§ There is no `tpa` lane` (the limit-case claim, stated not stored), `§ The labor market` (the four-verbs table), `§ Players and NPCs do not travel the same way`. Part heading + one pointer left; `## What the colony games teach` KEPT (Doctrine)
- `# Part 5` → the user quote + *"The competition is not what it looks like…"* + the *service never has to beat walking* rule (434–444, 11) and *"Then the rule that sets the number…"* through the wall-clock compose note (452–464, 13) — game minutes shipped (`TICK_GAME_MINUTES`, `edgeMinutes`); the why was undocumented → graduated (below). Pointer left; the encumbrance paragraph KEPT (see Uncertain)
- `## A border is derived, not authored` body (476–484, 9) — code: `AddressApi.resolveLocalityFor` / `coverageChainOf`, `GovernmentApi.governmentAt`; doc: `logistics.md § Addresses, and the jurisdictional gap`, `address.md § the longest-prefix resolve walk`. Heading + pointer left
- `## You do not build reporting` → the *reports are queries over instruments* quote (612–614) + *D10: the bill of lading ships in wave 1* (624–625) — code: `WaybillRegistry.freightOf` / `trafficOf`, `HouseFreightController.ts`; doc: `logistics.md § Reporting is a query over the paper`. Folded into the one note that also carries the superseded bearer split (below). Intro + document table KEPT (the customs declaration row is unbuilt)
- `# Part 11 — inventory` → `## Already shipped (verified in this pass)` + `## New in this build` (958–987, 30) — every row verified: `Hauler`/`Haulable`/`hitch` (`lib/slot/`), `Handcart`, `LocomotionMode` rows, `Vessel`/`ExitableVessel`, the ripple in `Mobile.traverse`, `CartesianLocation.extent`, `lib/encumbrance/`, `api/address.ts`, gigs, chattel, attendant, `Business`, the Hinkley valley road, the hydrology; new: corridors, `Lane`+`Route`, `Journey`, the bill of lading + receipt, the depot, wagon/team/barge, the teleport fix — all shipped; the **checkpoint** row is the one exception and its design is Part 6's. Heading + note left
- Open questions 1 (rates → `RateBoard.ts`, `§ The rate card`), 2 (load model → `HaulageRig.ts`, `§ The vehicles`), 5 (duration → `§ The metronome and the score`), 8 (perceive out of a vessel → `MixinApi.isOpenContainer`, `§ The vehicles`) — pointer lines left; 3, 4, 6, 7, 9, 10 KEPT

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## The map, and most of it was already drawn` → intro + the spine diagram + *"one line on the map carrying the watershed, the freight route and the founding"* (138–152, 15) — code: the corridor rooms' `destination:` chain (`newbie-wilds/crossroads/hub` ↔ `rejection/kestrel-road/yard-gate` ↔ `tips` ↔ `the-pass` ↔ `upper-climb` ↔ `lower-climb` ↔ `terminus/delight-road/crossroads` ↔ `flats` ↔ `drove` ↔ `milestone` ↔ `ford` ↔ `terminus/wharfside/bank`; `crossroads` → `hearts-delight/location/valley-gate`; `wharfside/bank` → `estuary/lower-towpath` → `reach` → `estuary-mouth`), `logistics-corridors.test.ts` AC1/AC4 → inserted at `logistics.md § The corridors` after the event-budget paragraph (10 lines: the walk end to end; the Lounge and Saxonberg TPA-only by design, Saxonberg because it is the Compact's seat built by decree). The place table KEPT (see Uncertain)
- `# Part 3` → the user quote (212–215) + `## The realm is not medieval, and Heart's Delight already proved it` (217–230) + `## ⭐⭐ The resolution` (232–248) (37 lines) — code: `Lane.operator` (`null` = the public highway; a ref for a corpo/authority lane), `Lane/ferrow-tram.yaml` (`edges[]`, `operator: ""`), no player-operable rail anywhere → inserted at `logistics.md § The lane` after *The operator is a ref, and may be nobody* (14 lines: *why an incumbent, and why no tech ladder* — capacity and reach move in opposite directions; the low ladder is permanent; *trades ship medieval* is about a practitioner's KIT; every anachronism must be economically motivated). Part heading + pointer left; `## The cost surface, and why every rung survives` · `## The second axis is your economic ladder` · `## The one guard` KEPT (Doctrine — the argument the decision rests on)
- `## ⭐ No ghost logistics` (398–407, 10) — code: `trade-haulage/…/idea/carrier-business.yaml` (`carter` + `dispatcher` positions with `wageRate`), `depot-business.yaml` (`warehouseman`), `hauls.ts` driving the literal verb → inserted at `logistics.md § The labor market` after the `job`/`appoint` paragraph (6 lines: *every service is a payroll*; a strike stops something)
- `# Part 5` → the vulnerability rule + its derivation (452–464, inside the Part 5 cut) — code: `Exit.edgeMinutes` per edge, the Journey spending it → inserted at `logistics.md § The metronome and the score` after *length here is an event budget* (10 lines: *why the number is what it is* — the window in which cargo can be taken, taxed, inspected or lost; derivable from *someone must be able to reach the road*; a service competes with walking-with-forty-crates; riding buys comfort and safety, not time)

### Superseded — cut
- `## You do not build reporting` → *"the warehouse receipt is the freight slate's borrowable instrument, so the bearer/registered split … applies unchanged: a bearer receipt is a Thing you can steal"* (616–622, 7) — by the code: the receipt is a RECORD only; `BearerReceipt` was cut before merge (`Warehouse.ts:52-65`) → `logistics.md § The warehouse receipt`. One note left (shared with the Cut entry above)
- `# Appendix — the six networks, updated` → intro + the nine-row table (1037–1050, 14) — by the build: *roads: three rooms → this build* and *freight: designed → this build* are done; rail is designed only (`edges[]`). Note left; the *Information is a complete graph. Goods are a star* quote + closing paragraph KEPT (Doctrine). ⚠ `settlement-model.md § 8` is still stale → Handoff

### Kept (UNBUILT)
- the status block (re-stamped) · the captured-from paragraph · `## Relationship to the two existing slates` (spine; ⚠ its *"freight-slate is still the detail doc for the Journey engagement"* is now stale — the Journey is `logistics.md`'s — left as spine, one clause) · Substrate / Doctrine / Localities lists
- `# Part 1` decisions table (see Uncertain — mixed)
- `# Part 2` → the place table (see Uncertain) · *Cold Fell is not a place* · *One inconsistency to resolve before it hardens*
- `# Part 6` — everything except *A border is derived*: the user quote, *The border is everywhere; the checkpoint is somewhere* (no checkpoint object), *The four powers* (registration · tariff · prohibition · inspection — none enacted; `civics.md`: no statute engine), *The tariff rate sets the smuggling rate*, *D9 — ship it broken, on purpose*, *Three things that stay genuinely fraught*
- `# Part 7` — *They go together for a reason* · *The coverage gap is the feature* · *You do not build reporting* intro + table · *What falls out* (see Uncertain — mixed) · *Freight is the denominator* · *Two doctrine constraints* · *Rival indices* (no basket/index Document kind in `DocumentKinds`) · *D10 — returns are public by default* (no returns exist) · *The operator half, and the one metric*
- `# Part 8 — D11: standards` — all of it (no slot-dimension standard, no official measure, no weighbridge; requirements non-goal → *its own small build*)
- `# Part 9 — contested ways, turmoil, piracy` — all of it
- `# Part 10 — The train robbery is the integration test` — all of it (the one new thing it needs, a barricade on a lane edge, has no code)
- `# Part 11.5 — Warehousing` — all of it, including its own *Status: design captured, deliberately DEFERRED* note (a section-level status, true, not a duplicate slate stamp). ⚠ Two of its findings are already stated in shipped code and doc as *reasons the warehouse did not ship* — `Warehouse.ts:5-16` and `logistics.md § What is deliberately not here` carry *capacity is a property of a bearer's BODY* and *mass is the metric when it lands* — but the mechanism they describe is unbuilt, so the section is kept whole rather than partly graduated
- `# Part 12` → 3, 4, 6, 7, 9, 10 and the intro note

### Uncertain — kept
- `# Part 1` decisions table (109–121) — mixed: D1/D2/D5/D6/D7 shipped; D3/D4 shipped in substrate (`operator`, `edges[]`) with the thesis graduated; D8/D9/D11 unbuilt; D10 half (the bill of lading ships; *returns public by default* and *rival indices* do not). One table, kept
- `# Part 2` place table (154–163) — *Heart's Delight — designed, unbuilt* is stale: `packages/content/hearts-delight/` ships a valley gate, a farmstead, a barn and a millsite (farm + mill businesses) but NOT *the crossroads, the depot, the packing house* — the crossroads is Terminus's and is a depot SITE only (`crossroads.yaml:1`). *Moor · Practicum · Substation · Hearthworks — user will purge or reshape* is still open (`packages/content/hearthworks/` exists). Kept; both are in `Left`
- `# Part 5` → *"Encumbrance already draws that line … so the incentive to script the walk evaporates"* (446–450) — **contradicted by a shipped decision**: `logistics.md § The cost surface is OPT-IN` — `go` is instantaneous with a hitched rig and its cargo following, and an `msh` script opts out of the whole cost surface; the *make the rig the gate* option is parked pending playtest. Kept verbatim under a pointer that says so, for requirements to reconcile
- `## What falls out` table (629–637) — mixed: *carrier market share* and *rates paid per carrier per route* are answerable today (`WaybillRegistry.freightOf` by prefix; the superseding rate card); the *O-D matrix* is `trafficOf` per edge, not by commodity and period; *duty revenue* / *trade balance* need declarations that do not exist; the two `PricedOffer` price reports have no query surface. One table, kept
- `## Relationship to the two existing slates` — says the freight slate is *still the detail doc* for the Journey; after this pass the Journey design lives in `logistics.md` and the freight slate holds only its unbuilt residue. Spine, kept; the cluster pass should re-point it
- Overlaps for the cluster pass: Parts 9–10 + Q4/Q9 ↔ `freight-slate` § The barricade / § The tollgate / § The turnpike trust (the detail); Part 6 D9 ↔ `amendment-library-slate` (the free-movement module) and `balance-slate` (entrenchment tiers); Part 7 rival indices ↔ `balance-slate` (*every global ledger is a currency*); Part 8 ↔ `quantities.md` (the Unit catalog) and the standards build; Part 11.5 ↔ `freight-slate` § Three rungs; the reefer / cold store ↔ the preservation thread; Heart's Delight the town ↔ `staging/hearts-delight.md`

### Doctrine — kept, labelled
- `# Part 3` → `## The cost surface, and why every rung survives` (the seven-row table; *capacity and reach move in opposite directions, monotonically*; magic as a point on the surface) · `## The second axis is your economic ladder` (rate discrimination arrives unauthored) · `## ⚠ The one guard that keeps this from reading as slop` — the argument the graduated decision rests on; the decision itself is now in `logistics.md § The lane`
- `# Part 4` → `## What the colony games teach` (the industry's gameplay is siting and routing; driver → operator is Banished → Transport Fever)
- `# Part 7` → `## They go together for a reason, not by coincidence` (*the checkpoint is the instrument*) · `## ⭐⭐ Freight is the denominator` · `## ⚠ Two doctrine constraints, from measurement.md`
- `# Appendix` → *Information is a complete graph. Goods are a star* + the closing paragraph

### Handoff (belongs in a doc outside my list)
- → `settlement-model.md § 8` (the six networks table, rows *roads* and *freight*; currently *roads — a graph, walkable, costly — ⚠ three rooms* and *freight — — — designed*), the corrected rows, verbatim from the cut appendix with the state column brought to the tree:

  > | network | shape | state |
  > |---|---|---|
  > | **roads** | a graph, walkable, costly | ✅ ships — the Delight road, the Kestrel road, the estuary towpath ([logistics.md](./subsystems/logistics.md) § The corridors) |
  > | **freight** | lanes over the road graph | ✅ ships — `Lane` / `Route` / the Journey, the haulage trade ([logistics.md](./subsystems/logistics.md)) |
  > | **rail** | ⭐ a sparse lane, incumbent-owned | designed — the `edges[]` authored-lane hatch, proved by the Ferrow tramway; no line ships |

  and, if the section wants the thesis line: *⭐⭐⭐ Information is a complete graph. Goods are a star. Perfect information, imperfect delivery.*
- → `conveyance.md`, `contract.md`, `address.md` — nothing from this slate; every shipped mechanism it names is `logistics.md`'s or already stated in those docs (the teleport sever in `conveyance.md § teleport ripples what is on you`; the `supply` condition in `contract.md`'s closed vocabulary; the coverage walk in `address.md`)

### Status block
- Status line: added `coach` and `teamstering` to the shipped list
- Left: *piracy · live cargo and drovers · infrastructure politics — tollgate, turnpike trust, barricade, banditry, congestion, road wear · rail and the ore train · customs and tariffs · warehousing as a business · the wainwright · navigation as a discipline · a passenger market · the entrenchment tier for free movement · the Delight/Kestrel inconsistency* → *piracy + turmoil · live cargo and drovers · infrastructure politics — tollgate, turnpike trust, the barricade on a lane edge, banditry, congestion, road wear · rail and the ore train (+ the train robbery as its integration test; ship with trains or arrive as a shock) · the operator rung — scheduled lines over `ServiceRoute` rows (nothing runs them yet) and a passenger market · customs and tariffs — the placed checkpoint, registration + tariff, forfeiture, the smuggling rate · D9 + the entrenchment tier for free movement · trade reporting — customs returns, the O-D matrix, rival indices, returns public by default, the operator view + the coverage ratio · standards (D11) · warehousing as a business · Heart's Delight the town · the demo-content purge · the Delight/Kestrel inconsistency*. ⚠ **`the wainwright` and `navigation as a discipline` REMOVED** — this slate's body has no section on either (they were carried in from the requirements non-goals); `freight-slate` owns both and keeps them in its `Left`. The body wins: Parts 7, 8, 9–10, the map table's two open rows and the `ServiceRoute` operator rung were unrepresented and are now named
- Size: a build → a build

---

## Batch totals

| | freight | logistics | total |
|---|---|---|---|
| lines | 1104 → 892 | 1057 → 772 | −497 |
| cut (SHIPPED · DOCUMENTED) | 15 entries | 10 entries | 25 |
| graduated → `logistics.md` | 2 inserts (depot 16 lines · teamstering 11) | 4 inserts (corridors 10 · cost surface 14 · payroll 6 · vulnerability 10) | 6 inserts, 72 lines |
| superseded | 3 | 2 | 5 |
| kept UNBUILT | ~28 sections | ~24 sections | — |
| uncertain | 8 | 5 | 13 |
| doctrine | 5 groups | 4 groups | 9 |
| handoff | 0 doc edits (one code docstring flag) | 1 (`settlement-model.md § 8`) | 1 |

`git diff --stat` on the batch's files: `freight-slate.md` −282/+… ·
`logistics-slate.md` −367/+… · `logistics.md` +72 · this ledger new.
No file outside the four was touched.
