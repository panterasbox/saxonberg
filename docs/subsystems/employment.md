# Employment

The **employment engine** — a real, actor-agnostic model of jobs, shifts,
wages, and tips, replacing the NPC-only placeholder at Dave's Bar
(forced-teleport "shifts" + manual operator wages + intrinsic-`Crafter`
capability faked by location). Lives in `lib/employment/` with the gated
`EmploymentApi`/`EmploymentLogic` pair. NPCs are the v1 consumer; players
are supported at the *relationship* layer for free and blocked only at the
*capability* layer by a named, deferred seam.

## The governing decision — Business is its own entity

The thing that owns the proprietor, the positions, the roster, the account,
and the operating locations is a dedicated **`Business` `Idea`** — *not* a
mixin on the venue `Location`. The Bar stays a dumb `Location` with **zero**
employment data. This is what lets a job span locations, a proprietor be
absent, and (the clincher) the business **outlive its proprietor** — the
Dave→Augie→Mara succession the cast implies needs the business standalone
with the proprietor as a replaceable edge.

Routing falls out cleanly: order/tip resolution finds the **present agent
with an active `Maker` capability** — it never consults the room about a
business. The house **account keys on the Business's own path**
(`getAccountPath()` = its `templatePath`), so order income and shift wages
settle on one P&L account that survives a venue move. Reverse lookups (room
→ business) go through the `EmploymentLogic` **business index**, never a
field on the room.

## Data model (`lib/employment/`)

Four value objects + two mixins + the concrete entity:

- **`Position`** — a job's terms: `{ key, label, wageRate /* minor units
  per game-hour */, confers /* mixin names */ }`. The `Money`/`Charge`
  precedent (data + `serialize`/`fromData`). `confers` is the knowing→doing
  seam — the mixins an on-shift holder's Position grants (v1:
  `['MakerMixin']` for the bartender).
- **`Employment`** — one actor's relationship to one Business:
  `{ businessPath, positionKey, status, hiredAt, onShiftSince }`. Immutable
  value object (`withStatus` returns a copy). `EmploymentStatus` vocabulary
  = `employed | on-shift | off-shift | quit | fired` (+ `EMPLOYMENT_STATUSES`
  validation array).
- **`Roster`** — a Business's schedule: ordered `RosterAssignment
  { positionKey, assignee /* templatePath */, schedule: ShiftEntry[] }`;
  `ShiftEntry { days: number[], hours: [start, end) }`. `evaluate(assignment,
  date)` is the pure day/hour-window match lifted verbatim from what the
  `shifts` brain read inline before this build.
- **`Business`** — `BusinessMixin` (marker `_mixinName='BusinessMixin'`) +
  the concrete **default-export `BusinessEntity`** (`class BusinessEntity
  extends BusinessMixin(PostRegistrationMixin(Idea))`). The concrete class
  name differs from the `Business` **interface** + `BusinessMixin` on purpose
  (the `Bank`→`BankCounter` convention — a same-named class+interface+mixin
  triad recurses as a base type). Persistent fields `['proprietorPath',
  'positions', 'rosterSlots', 'operatingLocations']` are stored as the raw
  seed shapes; the accessors (`getPositions`/`getRoster`/…) wrap them in the
  value objects on read (the `Biome` field-plus-getter precedent).
  `canDestruct()` refuses (seeded singleton-style).
- **`EmployedMixin`** — on `Character` (actor-agnostic; sparse null-default
  `employments` field — the `BeliefStore`/`Status` precedent, so an
  unemployed Character carries nothing). Pure storage + the derived
  conferral read. The privileged mutators (`_setEmploymentStatus` /
  `_upsertEmployment` / `_removeEmployment`) carry a **participant
  contract** — the caller must be the **Business party to the record**
  (`FromMixin(Mixins.Business)` + a relational `where` requiring the
  written record key to be the calling business's own path), with a
  narrow `FromTemplate('/obj/api/employment')` janitorial arm (lazy
  standup means a `quit` can outlive its business's live Idea). The
  employment *transitions* live on `BusinessMixin` itself — `hire` /
  `endEmployment` / `ensureRostered` / `beginShift` / `endShift` /
  `beginCover` / `endCover` (gated `AnyOf(SelfOnly,
  FromTemplate('/obj/api/employment'))`) — so the business acts on its
  own employee records and the engine keeps orchestration (roster
  evaluation, wage settlement, the clock).
  `getConferredMixinNames()` = the `confers` of every **on-shift**
  Employment's Position — the augment substrate's conferral seam (below).

## The gated Api/Logic pair

`EmploymentApi` (`api/employment.ts`, thin forwarding shell) →
`EmploymentLogic` (`obj/api/EmploymentLogic.ts`, `@internal @Unshadowable
extends Idea` at `/obj/api/employment`, HMR-able; every method gated
`FromModule('/api/employment#EmploymentApi')`). Surface:
`employmentOf` / `isProprietorOf` / `hire` / `fire` / `quit` / `businessAt`
/ `businessOfProprietor` / `beginCover` / `endCover` / `tipRecipientFor` /
`shiftStateOf` / `settleShiftWage` / `tickRoster` / `boot`.

- **Proprietor authority** = the direct `proprietorPath` edge, checked by
  `isProprietorOf` (subject templatePath === proprietor **OR**
  `AccessApi.isAuthor` as the orthogonal operator override). Not a Zone
  `ownerGroup` — `AccessApi` cannot represent an NPC owner.
- **Business index** — businesses are found by the `BusinessMixin` marker
  (the `SlotLogic`/`LocomotionLogic` enumerate-by-scan precedent), cached on
  the **singleton instance** (a `StuffApi.clearAll` recreates the singleton
  → fresh cache; rebuilt on a miss). `businessAt(locationPath)` /
  `businessOfProprietor(subject)` read it.
- **Fixture-keyed attribution + derived lazy standup.** `operatingLocations`
  names the **fixture** a Business operates (a terminal / vending unit), not the
  room — so two venues sharing a room each resolve their *own* operator
  (`businessAt(fixture)` is a sound 1:1; two businesses claiming one fixture is
  an authoring error). `ensureOperatorAt(fixturePath)` is the async lookup that
  stands the operator up **lazily** if it isn't live yet — derived from the
  Business's own `operatingLocations` template data via a cached reverse index
  (`operatingLocation → BusinessTemplatePath`, filtered cheaply by the field's
  presence, `isBusiness`-verified after standup). This retires the per-venue
  standup hooks: **no** manifest entry, **no** `Bar.postRegister` /
  `TicketClerk` clone — the first `businessAt`-style query at a fixture (an
  order, a fare) stands the Business up. Consumers: `OrderController` (the bar)
  and `TeleportController.settleFare` (the transit fare) call `ensureOperatorAt`;
  the roster tick's live-scan then processes it.

## Roster-driven on-shift state (`runTick`, on the game clock)

`EmploymentApi.boot()` (wired in `AppBootstrap` **after** `BankingApi.boot()`
— wages call banking) runs one immediate pass then self-registers a
recurring game-time tick (`WorldClockApi.every(1 game-hour)` — freezes with a
paused world, so accrual freezes too). Each pass enumerates every Business
and, per roster assignment:

- **lazy-materializes** an `Employment` on the assignee (the roster is the
  single source of truth — the seeds carry no employment block);
- **off→on**: stamps `onShiftSince = now`;
- **on→off**: settles the shift wage off the captured record *before*
  clearing `onShiftSince`, then flips to off-shift;
- a `quit`/`fired` record is left alone (an explicit exit is never
  resurrected by the seed roster).

The pure logic lives in the private `runTick`; the gated public `tickRoster`
and the schedule callback both delegate to it (no intra-singleton gated
`this.x()` call trips the gate).

## Capability grant — the on-shift Maker (and the leak fix)

On-shift confers the Position's duties via the **augment-confers-mixin**
substrate; off-shift revokes. `MakerMixin` sets `static _augmentGated =
true`, and **`MixinApi.isMaker` routes through `isActive`** (activeness), not
`hasMixin` (composition). `api/mixin.ts#collectAugmentConferralNames` gains
the **employment leg** — a structural soft-lookup of
`getConferredMixinNames()` (no import of the employment layer, cycle-safe).

So a bar `Crafter` composes `MakerMixin` always but is a *maker* only while
its on-shift Position confers it. The two `isMaker` consumers —
`CraftingLogic.resolveMaker` (order fulfilment) and
`BankingControllerBase.presentBartender` (the house representative) —
thereby resolve **only the on-shift bartender**; an off-shift or
never-employed `Crafter` is inert. This is the fix for the pre-employment
order-routing leak (any present `Crafter` fulfilled orders). Crafting/served
test doubles confer `MakerMixin` directly to stand in for on-shift.

## Wage settlement at shift-end

The wage is a **lump paid once, at the on→off transition** — `wageRate ×
(offTime − onShiftSince)` game-hours — not a continuous sweep (the *shift* is
the settlement unit, as *completion* is the gig's). Rides the roster tick's
off-transition, so there is no separate wage schedule; a deliberate
clock-out is an early off-transition → pays the partial; a paused clock
accrues nothing. `settleShiftWage` **skips the proprietor's own cover**
(no self-wage) and pays from `business.getAccountPath()` via
`BankingApi.ensureVenueAccount` + `payWage`. `house payroll` stays the
operator override (a one-off bonus), now redundant for the normal loop.

`OrderController` income **and** `HouseController` pnl/payroll re-key to the
Business account (`EmploymentApi.businessAt(location)?.getAccountPath()`), so
income and wages roll up into one deficit P&L.

**Worker-account guard.** `settleShiftWageImpl` provisions the worker's
account if absent (`ensureVenueAccount(employeeKey, employeeKey, '')`) before
`payWage` — NPC workers never opened one, and `payWage` throws without it.
Additive + general; closes the same gap in the bar loop.

**Second employment consumer — the Terminus city budget.** Terminus's
**municipal city-budget `Business`** (proprietor-absent, `/domain/terminus/
budget`) is the second consumer after Dave's Bar: it lists the operational
departure gate in `operatingLocations` (so the transit fare's city share
attributes to it, un-spoofably), pays the **terminal clerk** (a bounded roster
shift so the wage settles at the boundary), and closes the conserved fare-in →
wage-out loop. The budget Business stands up **lazily** — derived from its own
`operatingLocations`, on the first `ensureOperatorAt(fixture)` query (a fare at
the gate) — no `TicketClerk`/`Bar.postRegister` clone. See
[fasttravel.md](./fasttravel.md) § Terminus.

## The `shifts` + `covers` brains

Presence is a **consequence** of employment state, kept in brains so it
stays hot-swappable:

- **`shifts`** — reads `EmploymentApi.shiftStateOf(host)` (sync) and
  teleports on-shift → `config.behindBar`, off-shift → `config.offstage`.
  The game-clock schedule match is **gone** (the schedule lives on the
  Business roster now). Not presence-gated (off-stage cast must move out
  before a player arrives). config: `{ behindBar, offstage, railStool? }` —
  `railStool` is a reserved key for the deferred off-shift-at-the-rail
  presence (v1 presence is binary).
- **`covers`** — the proprietor covers gaps. On a presence-gated cadence, if
  **no other active on-shift maker is present** in the proprietor's location,
  `EmploymentApi.beginCover(self, business)` upserts a **transient, on-shift**
  Employment against the first Position — reusing the whole on-shift→confer
  path, so the covering proprietor gains `MakerMixin` and an `order` still
  finds a fulfiller. Unpaid by construction (the wage settlement skips a
  proprietor-held Employment, and the tick never governs the proprietor).
  `endCover` drops it when a real bartender is back. v1 = clause-unheld only
  (demand has no measure yet); `beginCover` does **not** verify
  proprietorship — the brain gates on `businessOfProprietor`.

## Tips — the tip jar (`tip` / `collect`)

Tips are **physical cash**, two routes, never the bar's P&L:

- **`TipJar`** — a `Container` `Thing` fixture (`domain/lounge/`) that holds
  `Coin`, `Detailed` so it fills visibly. Affords `tip` + `collect` from the
  environment bucket (the `Menu` affordance pattern). Populated onto the
  bar's back-bar.
- **`tip <amount> [--eft]`** — **cash** (default): `BankingApi.settle` cash
  moves coin patron→jar, off every ledger (anonymous, the under-the-counter
  take). **EFT** (`--eft`, or the automatic fallback when the patron lacks
  coin): `BankingApi.transfer` patron→the on-shift server's account —
  recorded on the *server's* ledger, the bar account untouched. The patron
  is never blocked; the cash/EFT choice is the anonymous-vs-recorded story.
- **`collect`** — the on-shift bartender scoops the whole jar into their
  holdings, gated on `MixinApi.isMaker` (on-shift-aware). Per-shift
  attribution falls out — whoever's on shift empties it. NPC auto-collect at
  shift-end is a deferred beat.
- **`tipRecipientFor(patron)`** — the present on-shift server (the
  `resolveMaker` scan, one cardinality across), shared by the EFT route and
  `collect`'s gate.

## The Business stands up lazily (derived, no hook)

A Business is **not** stood up by a `postRegister` hook (the old
`Bar.postRegister` / `TicketClerk` clones are gone) nor a manifest entry. It
stands up **lazily**, derived from its own `operatingLocations`, on the first
`ensureOperatorAt(fixture)` query — an order at the bar, a fare at a terminal
(see **Fixture-keyed attribution + derived lazy standup** above). Idempotent
(`singletonOrClone`); the roster tick's live-scan processes it once live. A
context with no Business template for a fixture resolves to null and falls
back gracefully. The **city budget** (Terminus) and the **frontier settlement
budget** (the newbie-wilds crossroads) both stand up this way — each names its
own terminal fixture in `operatingLocations`.

## Fixture resolution goes through MQL

The affording-fixture resolvers enumerate the room via the MQL **`peers`
seed** and filter by **type/capability**, not a hand-rolled containment
scan: `TipJar.resolveIn` / `Menu.resolveIn` statics
(`MqlApi.resolveMany('peers').stuff.find(instanceof …)`, commandSource
affordance fast-path kept) and `BankingControllerBase.resolveBank` /
`presentBartender` (`.find(isBank / isMaker)`). Matching by type means a
honey jar on the same back-bar can't win on the `jar` keyword; the
`instanceof`/capability filter is the interim type check a future MQL
type-predicate subsumes. `resolveVenue` stays `context.location` (the room
the actor stands in), not a scan.

## Cast (`domain/lounge/`)

Dave → pure **proprietor** (the `proprietorPath` edge on the Business seed;
`covers` brain, no `shifts` schedule). The four staff (Mara/Remy/Sloane/
Augie) → roster **assignees** (schedules lifted verbatim from the old NPC
seeds, incl. Sloane's midnight-wrap two-window shift); each keeps
`class: /lib/character/Crafter` (composes the gated `MakerMixin`), drops its
`shifts` schedule, carries no employment block (materialized by the tick).
The Business seed (`/domain/lounge/business`) authors the `bartender`
Position (`confers: [MakerMixin]`, `wageRate` a tuning placeholder), the
roster, and `operatingLocations: [/domain/lounge/bar]`.

## Deferred seams (named, not placeholders)

- **Player tending** — blocked only by build-time `MakerMixin` composition on
  `Avatar` (runtime mixin-composition is its own deferred thing). The
  `EmployedMixin` *relationship* is already actor-agnostic; only the
  capability waits.
- **Hire/fire drivers** beyond Dave's cover (a fuller management brain) — the
  `hire`/`fire` Api exists; v1 driver is seed authoring + `covers`.
- **The `patronize`/recirculation loop** — off-shift staff at the rail
  ordering/paying/tipping; restores the three-way presence (`railStool`).
- **Shift-change ritual** (count-out / reconcile / handoff), **per-drink tip
  attribution** (route to the `CraftedMixin.maker` of the last drink),
  **multi-tender coverage** (`required-on-shift > 1`), and NPC
  **auto-collect** at shift-end.

## History

Built phase-by-phase (Jul 2026, `3785a763..4f24c15a`) from a since-retired
plan. Notable design→implementation shifts:

- `MixinApi.isMaker` was **not** active-aware (the plan's one load-bearing
  assumption); the fix routes it through `isActive` (flipping both consumers
  at once) rather than the surgical fallback.
- The `EmployedMixin` mutators were first gated `ApiOnly`; the antipattern
  sweep (Jul 2026) re-gated them to the participant contract above and
  moved the transitions onto `BusinessMixin`.
- `OrderController` income re-keyed to the Business account too (the plan
  only named `HouseController`) — required for a combined P&L.
- The Business stands up **lazily** (derived from `operatingLocations` via
  `ensureOperatorAt`) rather than a bootstrap manifest entry or a
  `postRegister` clone, and fixture resolution moved to MQL `peers` + type
  filter (both from MR review; the lazy standup finalized in the Terminus
  build).
