# Harm driver — implementation plan

**Requirements:** `docs/requirements/harm-driver-requirements.md` (authoritative, closed)
**Branch slug:** `harm`
**Artifact lifetime:** ephemeral; retired at pre-merge sweep.
**Status:** build-ready. All design decisions are locked (see "Settled
decisions"); no open questions remain.

This plan is self-contained for a fresh-context build agent who has read
the requirements doc plus `vitals.md`, `metabolism.md`, `respiration.md`,
`advancement.md`, and CLAUDE.md's Module Categories. It fills in the
parked "behaviors" wave over the vitals substrate. Nothing here re-opens
a closed requirements decision; genuine gaps/collisions are called out in
the final section.

## Grounding facts established by exploration

These are load-bearing and were verified in-tree, not assumed:

- **Foot part keys** are `body.leg.left.foot` / `body.leg.right.foot`
  (`seeds/lib/body-plans/biped.yaml`). The footwear slot is `feet`, which
  couples to the parts via **`covers: [body.leg.left.foot,
  body.leg.right.foot]`**, NOT `bodyPart`. `BodyPlan.getSlotsCovering(partKey)`
  (`lib/species/BodyPlan.ts:405`) is the correct reverse query for
  coverage; `getSlotsAt` (line 400, `bodyPart`-keyed) is wrong for
  multi-part wear slots. (Requirements text says "`SlotSpec.bodyPart`
  couples slot↔part" — for feet it's `covers`. Flagged below.)
- **`Container.onEntered(mover, exit)`** is a duck-typed hook fired on the
  destination by `Mobile.traverse` (`lib/spatial/Mobile.ts:461` via
  `callTraverseHook`). This is the movement/presence trigger for the
  hazard. Teleport arrival uses `autoSenseOnArrival` (line 472), NOT
  `onEntered` — so a teleported body won't trip the hazard, matching
  respiration's `onTraversed` precedent. Acceptable; proof content is
  walked-into.
- **The LocomotionApi limp seam** is `LocomotionLogic.engageAround`
  (`obj/api/LocomotionLogic.ts:405-407`) — the universal self-powered
  traverse chokepoint that already calls `actor.drainForTraversal()` for
  `LoadBearing`. The limp drain composes here identically, narrowed by
  `MixinApi.isVitals`. The raw move (`Mobile.traverse`) stays
  encumbrance/harm-free.
- **`SlottedMixin.canOccupy`** (`lib/slot/Slotted.ts:253`) already
  consults `host.isSlotDisabledByAnatomy(slot)` narrowed by
  `MixinApi.isVitals`. Fracture impairment extends exactly this consult.
- **The death stamp** is `setCauseOfDeath(cause)` +
  `setLifecycleState('dead')`, idempotent-guarded on
  `getLifecycleState() === 'dead'` (metabolism `Metabolic.ts:768`,
  respiration mirrors it). There is **no shared `applyDeath` helper** —
  each driver stamps its own. Harm stamps `'exsanguination'`.
- **`getConsciousness()`** already returns `unconscious` when
  `bloodVolumeFraction < 0.7` (`Vitals.ts:372`) and `dead`/`critical`
  band already reads a floored `bloodVolume` (line 312). So the
  `conscious → unconscious → dead` waypoint falls out **for free** once
  the bleed drives `bloodVolume` down — harm writes only the sign.
- **The reconcile/presence-freeze idiom** to copy verbatim is
  `Metabolic.reconcileMetabolism` (`Metabolic.ts:412-470`): first-touch
  stamp seeding, linkdead re-stamp (`MixinApi.isHasInteractive(self) &&
  self.isLinkdead()`), `elapsed <= 0` guard, far-past guard
  (`MAX_REASONABLE_GAP_SEC = 4h`), game-time now from
  `WorldClockApi.getNow()` (null when no clock → idle no-op).
- **Gated Api/Logic shape** to copy: `api/regard.ts` +
  `obj/api/RegardLogic.ts` — the `logic()` `StuffApi.singletonSync` +
  `HotReloadApi.getCurrentExport` forwarder; `@Unshadowable` class
  `extends ApiLogic`; each public method
  `@CallSecurity(FromModule('/api/harm#HarmApi'))`;
  `SecurityApi.decorateApiClass(HarmApi)` at the tail.
- **Actor-from-context** is `ExecutionContextApi.getActingAuthor()`
  (`execution-context.ts:341`) — command-frame giver when non-forced +
  single-consistent giver, else the REST `tagActingAuthor` stamp, else
  `null`. This is the inflicter resolver; never a parameter.
- **Advancement surface** for treatment:
  `AdvancementApi.recordDeed(owner, {discipline, difficulty, outcome},
  opts?)` and `bandFor(owner, disciplineKey)` (bands
  `untrained|novice|competent|proficient|expert`). Disciplines are seeds
  under `seeds/lib/advancement/Discipline/`.
- **Capability-mixin registration template** (for `DressingMixin`) is
  `ToolMixin`, verified end-to-end:
  - Declaration `lib/craft/Tooled.ts` — `export interface Tooled {...}` +
    `export function ToolMixin<TBase extends MixinConstructor>(Base) {
    return class ToolMixin extends Base implements Tooled { static
    _mixinName = 'ToolMixin'; static persistentFields = [...]; ... }; }`.
  - Registry `lib/mixin.ts:121` — one line `Tool: 'ToolMixin',` in the
    `Mixins` const (`Dressing: 'DressingMixin'` goes in the vitals cluster
    near line 71).
  - Predicate `api/mixin.ts:829` — `public static isTool(obj: Stuff): obj
    is Stuff & Tooled { return this.hasMixin(obj, Mixins.Tool); }` (the
    `isDressing` shape).
- **`Bandage = DressingMixin(Thing)` composes cleanly** — the identical
  shipped precedent is `obj/Coin.ts` (`const CoinBase =
  GlobbableMixin(Thing); export default class Coin extends CoinBase {}`)
  and `BrandedBottle` (`export default class BrandedBottle extends
  BrandedMixin(Thing) {}`). Thing + one capability mixin is ordinary.
- **Consumption** is `StuffApi.destruct` (`api/stuff.ts:742`); the
  consumable precedent is `EatController.ts:86` (`await
  StuffApi.destruct(target)` — await it).
- **Reachable-item validator template** is `requiresTravelCredential.ts`:
  a `CommandValidator` calling `ContainmentApi.findReachable(commandGiver,
  location, (s): s is Stuff & X => MixinApi.isX(s) && <extra>)`.
  `mustHaveDressing` swaps in `MixinApi.isDressing`. No existing `undress`
  verb exists (the wearable verbs are `remove`/`wear` in `cmd/inventory/`),
  so `undress` in `cmd/medical/` collides with nothing.

---

## Phase 0 — The `inflict` producer spine (`HarmApi` + `HarmLogic`)

The foundation every later phase and all future combat calls. Ship it
first, alone, gated and tested.

**Files added:**
- `packages/server/src/mud/api/harm.ts` — `HarmApi`: thin forwarding
  shell. Public static `inflict(target: Stuff, spec: InflictSpec):
  InflictOutcome`. Exports the class + the call-shape types (`InflictSpec
  { mechanism; site: string; energy: number }`, `InflictOutcome`, a
  `Mechanism` vocabulary + validation array). Ends with
  `SecurityApi.decorateApiClass(HarmApi)`. Mirrors `api/regard.ts`
  `logic()` forwarder to `/obj/api/harm`. (Also grows `rearmWoundTicks`
  in Phase 1 — same shell.)
- `packages/server/src/mud/obj/api/HarmLogic.ts` — `HarmLogic extends
  ApiLogic`, `@Unshadowable`, `@internal`. Method `inflict` gated
  `@CallSecurity(FromModule('/api/harm#HarmApi'))`. Builds the `Trauma`
  and calls `target.afflict(trauma)` (narrowed via `MixinApi.isVitals`).
  (This singleton also grows the wound-tick driver in Phase 1 and the
  death stamp — keep the class here.)

**Key design decisions the implementer makes:**
- **Gating policy — which sanctioned callers.** `inflict` is a powerful
  primitive. Gate `HarmLogic.inflict` on `FromModule('/api/harm#HarmApi')`
  (only `HarmApi` forwards in). `HarmApi.inflict` stays reachable by
  trusted producer sites — the demonstrator room (Phase 5), and
  later combat; treatment verbs never call it. This follows the
  `BulletinApi`/`ProvenanceApi` precedent — the Api static is reachable,
  the *inflicter* is un-spoofable because it comes from context. The
  acceptance test "rejected un-gated call" targets `HarmLogic.inflict`
  called from outside `HarmApi` (a raw singleton reach), which the
  `FromModule` gate denies. (Settled — see Settled decision 8.)
- **Inflicter from context.** Resolve via
  `ExecutionContextApi.getActingAuthor()`. The `Trauma` value in
  `Condition.ts` has no inflicter field today. **Decision:** add an
  optional `inflictedBy?: string` (durable `templatePath`) to the
  `Trauma` interface — the combat-forward-compat "inflicter" the blame
  ledger needs, additive/serializable. When `getActingAuthor()` is null
  (environmental/far-cause), leave it undefined. (Recording the
  templatePath, not resolving blame, satisfies "ready for combat's blame
  ledger without harm owning blame".)
- **Severity magnitude function.** `energy → severity` via a v1
  magnitude-only map in `HARM_DEFAULTS` (const-object, the
  `METABOLIC_DEFAULTS` precedent). The caller passes a `mechanism` (e.g.
  `'sharp'`, `'blunt'`, `'thermal'`); `HarmLogic` maps mechanism→`TraumaType`
  (`sharp→laceration`, `blunt→contusion`, `thermal→burn`, …) via a small
  switch and records the raw mechanism on a new optional
  `Trauma.mechanism?: Mechanism` field (additive, for the deferred
  materials-response function to read later). No `type→number` table —
  that antipattern is explicitly barred.

**Files edited:**
- `packages/server/src/mud/lib/vitals/Condition.ts` — extend the `Trauma`
  interface additively: `inflictedBy?`, `mechanism?`. Keep `TraumaType` a
  closed union.

**Tests (`obj/api/__tests__/HarmLogic.test.ts`, `api/__tests__/harm.test.ts`):**
- `inflict` produces a `Trauma` on the target's `getConditions()` with
  the mapped `type`, `site`, severity from `energy`.
- Inflicter derived from a command frame's giver; `null`/undefined when
  forced or cross-actor.
- A raw call to `HarmLogic.inflict` from outside `HarmApi` throws.

**Risks/unknowns:** getting the gate string exactly right (`lint:gates`
catches a typo). Keep the mechanism→type mapping minimal and additive.

---

## Phase 1 — Laceration bleed, the wound-tick driver, and death by exsanguination (RISKIEST)

The flagship loop and the subtlest engineering: a recurring driver that
must freeze on absence, re-arm on hydrate, and never persist its handle.

**Files edited:**
- `packages/server/src/mud/lib/vitals/Condition.ts`:
  - Widen `TraumaBehavior.tick` to `tick(host: Vitals, t: Trauma,
    elapsedSec: number): void` (additive; the driver owns elapsed).
  - **Add `reopen(host: Vitals, t: Trauma): void` to the `TraumaBehavior`
    interface** (settled sub-choice — see Settled decision 7a). Give
    `NOOP_BEHAVIOR.reopen = noop` so the `Record<TraumaType,
    TraumaBehavior>` roster stays total and closed; only `laceration`
    (and `avulsion`, which delegates to it) does real work. This keeps
    `UndressController` behavior-agnostic — it calls
    `TRAUMA_BEHAVIOR[t.type].reopen(host, t)` uniformly, exactly as
    `TreatController` calls `.resolve`.
  - Implement `TRAUMA_BEHAVIOR.laceration`: `onset` sets `t.bleeding =
    true`; `tick` drains `host.setVitalSign('bloodVolume', max(0, current
    − BLEED_PER_SEC·severity·elapsedSec))` while `bleeding && !dressed`,
    and decays severity while `dressed` (or naturally clotted), clearing
    the wound at severity ≤ 0 via the driver relieving it. **The clot
    gate:** `resolve` (the `dress` action) sets `dressed = true`, clears
    `bleeding`; `reopen` (the `undress` action) clears `dressed` and, iff
    `severity > HARM_DEFAULTS.CLOT_SEVERITY`, re-sets `bleeding = true`.
    Below the clot threshold a wound is closed (safe to undress).
    `describe` per requirements (dressed vs. open phrasing). Rates
    (`BLEED_PER_SEC`, `DRESSED_HEAL_PER_SEC`, `CLOT_SEVERITY`) in a module
    `HARM_DEFAULTS` const-object.
    - Note the clot gate is a pure boolean-flag machine on the `Trauma`
      value: `dressed`/`bleeding` are flipped by `resolve`/`reopen` and
      read by `tick`. It has **no dependency** on the `DressingMixin`,
      the `Bandage` item, or the `treat`/`undress` verbs (all Phase 4) —
      those are the *consumers* that call `resolve`/`reopen`. So Phase 1's
      clot behavior is fully unit-testable here by setting the flags /
      calling the strategy methods directly, and the DressingMixin/undress
      work lands cleanly in Phase 4 (no reordering needed).
- `packages/server/src/mud/obj/api/HarmLogic.ts` — the **driver**:
  - `armWoundTick(host)` — idempotent. If `host` has ≥1 active
    (unresolved) trauma and no live handle, `ScheduleApi.recurring(HARM_DEFAULTS.TICK_INTERVAL_MS,
    cb)`, storing the handle in an **in-memory `Map<hostKey,
    ScheduleHandle>`** on the singleton (NOT persisted — the Condition.ts
    "re-arm on hydrate" invariant). Cancel + delete the handle when the
    host has no active trauma left.
  - the recurring callback: read game-time via `WorldClockApi.getNow()`
    (idle no-op if no clock); **presence-freeze** exactly as
    `Metabolic.reconcileMetabolism` (first-touch stamp, linkdead
    re-stamp, `elapsed<=0`, far-past guard — reuse
    `HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC`, 4h); for each active trauma
    call `TRAUMA_BEHAVIOR[t.type].tick(host, t, elapsedSec)`; relieve
    resolved wounds; then check the **bleed→death floor**: if
    `bloodVolume <= survivableMin`, stamp
    `setCauseOfDeath('exsanguination')` + `setLifecycleState('dead')`
    (idempotent guard) and cancel the tick. Consciousness (`unconscious`)
    needs no code — `getConsciousness()` already reads `bloodVolume`.
  - a per-host game-time stamp for the driver (`_harmClockStamp`) — held
    in the same in-memory map entry (transient), not on the host, so
    nothing new persists.
  - `HarmLogic.inflict` (Phase 0) now calls
    `TRAUMA_BEHAVIOR[type].onset(host, trauma)` then
    `this.armWoundTick(host)` after `afflict`.
  - `HarmLogic.armWoundTick` is exposed to producers via a public
    `HarmApi.rearmWoundTicks(host)` forwarder (used by the hydrate seam
    below and by `UndressController` in Phase 4).

**Re-arm-on-hydrate seam (settled — see Settled decision 5).** The handle
is transient; the *bleeding trauma* persists (in `VitalsMixin.conditions`).
On restore the driver must re-arm. Re-arm from the seam that already runs
when a body comes live:
- `Avatar.enter()` for players — a one-line `HarmApi.rearmWoundTicks(this)`
  (the body-warm hook; `enter()` is `obj/Avatar.ts:351`).
- `PostRegistrationMixin.postRegister` for NPC `Creature`s — chain
  `super.postRegister()` then `HarmApi.rearmWoundTicks(this)`.
Add the public `HarmApi.rearmWoundTicks(host)` forwarding to
`HarmLogic.armWoundTick`. Idempotent, cheap, explicit. A bare `Creature`
with no `PostRegistrationMixin` won't auto-re-arm — a documented
degenerate, mirroring respiration's "bare frog holds no drain"; the proof
body is an Avatar. (Lazy re-arm on read and a global boot-sweep were both
rejected.)

**Tests (`obj/api/__tests__/HarmLogic.bleed.test.ts`):**
- Full bleed→death: inflict a bleeding laceration, advance the world
  clock across ticks, assert `bloodVolume` falls, `getConsciousness()`
  passes through `unconscious`, then death with `getCauseOfDeath() ===
  'exsanguination'` and `getLifecycleState() === 'dead'`.
- Presence-freeze: linkdead body and a far-past gap integrate no drain.
- Re-arm on hydrate: a bleeding body serialized/restored (or
  `rearmWoundTicks` invoked post-restore) resumes draining; the handle is
  absent from persisted state.
- Dressed laceration stops draining and heals to cleared (set `dressed` /
  call `resolve` directly — no verb/item needed here).

**Risks/unknowns (why this is the riskiest phase):**
- **Real-timer vs game-time.** `ScheduleApi.recurring` fires on a Node
  real timer; the drain must be computed from *game-time elapsed* so it
  freezes with a paused clock and honors presence. Getting the
  stamp/elapsed bookkeeping right (and the far-past guard) is the crux;
  copy `Metabolic` precisely.
- **Handle lifecycle & idempotency.** Double-arming, arming a dead body,
  failing to cancel on resolve/death → leaked timers. `armWoundTick`/cancel
  discipline must be airtight and unit-tested for idempotency.
- **Where the handle lives.** In-memory Map on the HMR singleton means a
  `dest /obj/api/harm` reload must not orphan timers — follow the
  RenownLogic/ProducerLogic recompute-handle precedent (they hold
  `recomputeHandle` on the singleton; a reload re-runs boot). Confirm the
  reload path.
- **NPC re-arm gap** (documented degenerate above).

---

## Phase 2 — The remaining four trauma behaviors + natural healing

Fills the rest of the `TRAUMA_BEHAVIOR` roster and the healing half of
the driver.

**Files edited:**
- `packages/server/src/mud/lib/vitals/Condition.ts`:
  - `contusion` — mild, no bleed; `tick` decays severity toward 0 over
    time (self-resolves); driver relieves at ≤0.
  - `fracture` — `tick` slow natural heal (much slower than contusion);
    the impairment is a *read*, not a tick effect (below); `resolve`/heal
    clears it.
  - `burn` — real behavior: severity, a pain/impair contribution, slow
    heal (own rate). Non-no-op `describe`.
  - `avulsion` — delegates to the `laceration` behavior (including its
    `reopen`) with a severity floor ("severe laceration"); a code comment
    + the harm.md doc name the deferred sever/part-promotion at this exact
    site.
- `packages/server/src/mud/lib/vitals/Vitals.ts`:
  - Add `isSlotImpairedByTrauma(slot: string): boolean` — resolve the
    slot's `bodyPart` (via the same `getSpecies().getBodyPlan().getSlots()`
    walk `isSlotDisabledByAnatomy` uses), return true if an active
    `fracture` trauma sits at that part above
    `HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY`. Keeps anatomy the resolver
    home.
- `packages/server/src/mud/lib/slot/Slotted.ts` (`canOccupy`, ~line 253):
  extend the consult to `isSlotDisabledByAnatomy(slot) ||
  isSlotImpairedByTrauma(slot)`, both under the existing
  `MixinApi.isVitals(host)` narrow.

**Key decisions:**
- Fracture impairment is a *derived read* of trauma through the existing
  `canOccupy` seam, so clearing/healing the fracture restores the
  affordance with no separate un-impair step — the "impair + restore"
  test passes by construction.
- Natural healing lives in the same recurring driver from Phase 1; a body
  with any non-bleeding active trauma keeps the tick armed until all
  wounds clear, then disarms.

**Tests:**
- Fracture at a `bodyPart`-keyed slot (e.g. a hand/finger part) disables
  the coupled slot's occupancy (`canOccupy` false); healing/relieving
  restores it.
- `contusion`, `burn`, `avulsion` each carry non-no-op behavior;
  `avulsion` behaves as a severe laceration (bleeds).

**Risks:** choose a `body.*` site for the fracture test whose slot has a
single `bodyPart` edge (e.g. `hand:left` → `body.arm.left.hand`) rather
than a multi-part `covers` slot — so the impair read is unambiguous.

---

## Phase 3 — The limp (LocomotionApi seam) + coverage-presence read

Two couplings that compose over existing seams; the move substrate and
embodiment stay agnostic.

**Files edited:**
- `packages/server/src/mud/lib/vitals/Vitals.ts` — add `drainForLimp()`
  (or `traversalPenaltyFromWounds()`): sum severity-gated locomotion
  penalties from active `laceration`/`avulsion` traumas at a locomotor
  site (`body.leg.*`, incl. `.foot`); apply an `endurance` reserve drain
  scaling with severity (narrow `this` to `Reserved`, mirror
  `LoadBearing.drainForTraversal`). Clears automatically as wounds
  dress/heal (derived from live conditions). Rates in `HARM_DEFAULTS`.
- `packages/server/src/mud/obj/api/LocomotionLogic.ts` (`engageAround`,
  ~line 405): after the `isLoadBearing` drain, add `if
  (MixinApi.isVitals(actor)) actor.drainForLimp();`. Same universal
  self-powered chokepoint; conveyance riders and raw/forceMove skip it
  structurally.
- **Coverage-presence read** — put it on the harm surface so it's
  reusable and gated-clean: `HarmApi.isSiteCovered(host, partKey):
  boolean` → forwards to `HarmLogic.isSiteCovered`, which resolves
  `getSpecies().getBodyPlan().getSlotsCovering(partKey)` and returns true
  iff any covering slot has an occupant that is a worn item
  (`MixinApi.isWearable` occupant via `Slotted.getOccupants(slot.name)`).
  Binary only; no materials/degree. (Placing it on `HarmApi` avoids a
  free-floating helper and keeps `SlottedMixin`/`BodyPlan` unchanged.)

**Key decisions:**
- The limp is an **endurance drain** at traverse time (graded movement
  cost), distinct from fracture's slot-disable. The seam already exists;
  harm adds one narrowed call.
- Coverage uses **`getSlotsCovering`** (the `covers` edge), not
  `getSlotsAt` (the `bodyPart` edge) — see grounding facts. This is the
  one place the requirements' prose ("`SlotSpec.bodyPart`") is imprecise
  for feet; the plan uses `covers`. (Settled decision 1.)

**Tests:**
- Limp: an active foot laceration imposes an endurance penalty via
  `engageAround` that scales with severity and clears on dress/heal.
  Drive an actual traverse through `LocomotionLogic.engageAround`.
- Coverage read: `isSiteCovered` false for a barefoot body, true when the
  `feet` slot is occupied by a worn item (the end-to-end cut/no-cut is
  Phase 5).

**Risks:** `engageAround` is async and central to movement — the added
call must be a cheap sync narrowed read, never throwing for non-Vitals
actors (carts, NPCs without wounds).

---

## Phase 4 — `assess` + `treat`/`bind`/`dress` + `undress` + `Bandage` + medicine Discipline

The medic vertical; first non-combat advancement consumer.

**New command category:** `medical` (the requirements sanction "a
treatment category"; `governance`/`employment` set the precedent for
adding a category directory — this is not inventing a *module* type). Add
`medical` to the File-Naming-Conventions category list in CLAUDE.md at
sweep.

**Files added:**
- `packages/server/src/mud/cmd/perception/assess.yaml` +
  `obj/command/perception/AssessController.ts` — `assess <target>`. Reads
  `target.getConditionBand()` / `getConditions()` / `getInjuredParts()`.
  **Perception gating:** full fidelity when `viewer === target`; on
  others, band + perception-gated wound detail via the
  `RecognitionApi`/perception layer (belief.md pattern — viewer-aware
  `Stuff & Sensor`). Treater competence sharpens detail via
  `AdvancementApi.bandFor(viewer, 'medicine')` (novice → "bleeding badly";
  expert → site + severity). **A dressed wound reads "dressed / bleeding
  controlled" and gates precise severity behind the dressing** — a
  high-competence assessor may judge through it, else `undress` to see.
  Validators: `mustBeVisible`, `canReach` (soft) — not `requiresConscious`
  (you can assess a downed body).
- `packages/server/src/mud/lib/vitals/Dressing.ts` — **`DressingMixin`**,
  a capability mixin (`_mixinName = 'DressingMixin'`, export
  `DressingMixin()`), copying the `ToolMixin` skeleton (`Tooled.ts`):
  `export interface Dressing {...}` + the factory + `static
  persistentFields`. Carries `dressingQuality` (a grade/scalar feeding
  outcome) and **single-use** semantics (settled sub-choice 7b — plain
  consumable, not `Globbable`). Register `Mixins.Dressing = 'DressingMixin'`
  in `lib/mixin.ts` (vitals cluster) and add `MixinApi.isDressing` in
  `api/mixin.ts` (the `isTool` shape). This is the first-aid **dressing**
  branch; instrument/medicine branches are deferred (no sibling mixins in
  v1).
- `packages/server/src/mud/obj/Bandage.ts` — `Bandage =
  DressingMixin(Thing)`, concrete content at top-level `/obj/` (the
  `Coin`/`BrandedBottle` precedent: `export default class Bandage extends
  DressingMixin(Thing) {}`), the canonical dressing. A simple single-use
  consumable. Seed a few into the demonstrator content (Phase 5) and a
  bar/first-aid spot.
- `packages/server/src/mud/lib/command/validators/mustHaveDressing.ts` —
  a `CommandValidator` modeled on `requiresTravelCredential.ts`:
  `ContainmentApi.findReachable(context.commandGiver, context.location,
  (s): s is Stuff & Dressing => MixinApi.isDressing(s))`; rejects with "you
  have nothing to dress the wound with" when none is reachable. (If the
  controller supports `--with <item>`, the validator confirms *a* dressing
  is reachable; the controller resolves the specific one.)
- `packages/server/src/mud/cmd/medical/treat.yaml` (verbs: `[treat, bind,
  dress]`) + `obj/command/medical/TreatController.ts` — target a wounded
  body (or self). **Consumes a reachable dressing item** — gated by
  `MixinApi.isDressing`, NOT `instanceof Bandage` (explicit `--with
  <item>` or auto-select a reachable dressing via
  `ContainmentApi.findReachable(...isDressing)`); on success calls
  `TRAUMA_BEHAVIOR[type].resolve(host, trauma)` (sets `dressed`, arrests
  bleed) and spends the item via `await StuffApi.destruct(item)`. Outcome
  quality graded by the item's `dressingQuality` ×
  `AdvancementApi.bandFor(actor, 'medicine')` (clot speed / dressed heal
  rate / how well it holds); grades map to `Outcome`
  (`failure|partial|success|critical`). On a graded outcome, **mint**
  `AdvancementApi.recordDeed(actor, { discipline: 'medicine', difficulty,
  outcome })` into the Transcript. Validators: `requiresConscious`
  (treater), `requiresAnimate`, `mustBeVisible`, `canReach`,
  `mustHaveDressing`. Difficulty derived from wound severity/site (a
  world-measurement, not a tag — advancement's rule).
- `packages/server/src/mud/cmd/medical/undress.yaml` + `UndressController.ts`
  — remove the dressing from a wound (verb `undress`, NOT `remove` — that
  is the wearable-slot verb in `cmd/inventory/`; `undress` here targets a
  wound, not worn gear, and collides with no existing verb). Calls
  `TRAUMA_BEHAVIOR[t.type].reopen(host, trauma)` (clears `dressed`; if
  `severity > HARM_DEFAULTS.CLOT_SEVERITY`, re-sets `bleeding`), then —
  because the tick may have been cancelled when the wound resolved —
  **re-arms the wound-tick via `HarmApi.rearmWoundTicks(host)`**. The
  bandage is spent, not recovered. Validators: `mustBeVisible`, `canReach`.
- `packages/server/src/mud/seeds/lib/advancement/Discipline/medicine.yaml`
  — a `Discipline` leaf (`key: medicine`, `channel: skill`, an `iscedf`
  code — `'0913'` Nursing and midwifery is the honest anchor;
  `conferrals` optional). Hang under a health `services`/health ISCED-F
  node if authoring the spine, else a bare leaf like the bar seeds.

**The tangible-dressing model (in scope per requirements).** Dressing
consumes a `Bandage` (any `isDressing` item) and sets `dressed`
(bare-handed care may clean/reduce severity but cannot durably arrest a
bleed). The `Trauma` clot gate lives in the laceration behavior (Phase 1):
while `dressed`, `bleeding` is suppressed and severity decays; below
`HARM_DEFAULTS.CLOT_SEVERITY` the wound has clotted (safe to remove);
`undress` above that threshold reopens it (`reopen`). The dressing is a
**consumable-into-state**, NOT a worn item occupying the wound's coverage
slot — that would entangle with the Phase-3 coverage-presence check and
the embodiment slot system. A distinct `undress` verb, not `remove`.

**Key decisions:**
- **Discipline key** is `'medicine'` (durable key ≠ templatePath).
- **assess** is a perception readout, not an instrument (non-goal); no
  stethoscope. Dressed wounds gate severity detail (above).
- **Dressing is a capability, not a class.** `DressingMixin` (in
  `lib/vitals/`, `Mixins.Dressing` + `MixinApi.isDressing`) is the gate;
  `Bandage` = `DressingMixin(Thing)` at `/obj/Bandage.ts` is the first
  concrete item (any dressing-capable item — gauze, rag — qualifies). One
  new mixin; instrument/medicine branches deferred (no sibling mixins).
  `treat`/`undress` gate on the capability, never `instanceof`. Homes
  confirmed with user.

**Tests:**
- `assess` self vs other fidelity split; dressed-vs-undressed readout
  difference (under `obj/command/perception/__tests__/`).
- `treat`: the dressing item is consumed on dress; low-vs-high competence
  outcome difference; the deed is written to the treater's Transcript
  (`AdvancementApi.entriesFor`) (under `obj/command/medical/__tests__/`).
  Use a `Bandage` as the test item, but assert the gate is `isDressing`
  (a second dressing-capable item also satisfies it).
- `undress`: premature removal (severity above clot threshold) re-arms
  bleeding and re-arms the tick; safe removal after clot does not; a
  dressed wound heals to zero and auto-clears.

**Risks:** perception-gating detail for non-self targets — reuse the
belief/perception seam rather than inventing a readout gate. Threading
`AdvancementApi` (async) through a controller cleanly. The `undress`
re-bleed path must re-arm the wound-tick (a resolved-then-reopened wound
whose tick was cancelled) — route it through `HarmApi.rearmWoundTicks`.

---

## Phase 5 — The demonstrator floor-glass hazard + integration

Proves the full loop in shipped, reachable content.

**Files added:**
- A **one-off demonstrator room class** (NO new mixin — decided against a
  `HazardMixin`; see Settled decision 9). A concrete room `Stuff` class
  extending the domain room base, overriding `onEntered(mover, exit)`:
  narrow `mover` to a Vitals body, resolve a foot `site` (pick
  `body.leg.left.foot`/`right.foot`, or random), gate on
  `HarmApi.isSiteCovered(mover, site)` — barefoot → `HarmApi.inflict(mover,
  { mechanism: 'sharp', site, energy })`; shod → no-op. Mechanism / energy
  / candidate sites are **class constants**, not authored data (it's one
  room, not a reusable capability). **Home:** it's domain content, so it
  lives in the domain area it's placed in (e.g. `domain/<area>/`, the
  `domain/lounge/` precedent for concrete area classes) — NOT `lib/`, and
  NOT a new mixin. Build agent picks the area (see caveats).
- `packages/server/src/mud/seeds/domain/<area>/…` — the seed instantiating
  the room, reachable from shipped content (respiration used
  `seeds/domain/eternal/…`; place near the newbie-wilds/lounge so it's
  walkable). The broken glass is diegetic scenery on the room's own
  description; the harm is the room's `onEntered`. **Also stock a few
  `Bandage`s** in reach (on the floor / a first-aid spot / behind the bar)
  so the treat→dress loop is playable in-world.

**Key decisions:**
- **No `HazardMixin`.** A capability mixin scored 0/3 (no multi-host reuse,
  no consumer narrows on `isHazard`, no composition) and the "environment
  harms you" space is already claimed body-side by thermal (heat) and
  respiration (medium) — the residual (mechanical/contact trauma) has
  heterogeneous triggers on different hosts (room-entry / traverse / climb
  / trap) that don't unify under one Location mixin. The reusable
  abstraction is `inflict` itself; the demonstrator's trigger is a one-off.
  A real hazard/trap taxonomy is a separate future build over the same
  seam. (Settled decision 9.)
- The trigger is **movement/presence** (`onEntered`), not "handle the
  object" — makes coverage legible (feet meet floor), per requirement.
- The room calls **`inflict`, never `afflict` directly** (constraint).

**Tests (integration, near the demonstrator room, e.g.
`domain/<area>/__tests__/…integration.test.ts`):**
- Barefoot target walks in → laceration inflicted through `inflict`; shod
  target (feet slot occupied) → no cut.
- step → bleed → `dress` (consumes a bandage) → arrested → heals to clear.
- step → bleed → dress → `undress` while still open → re-bleeds; dress
  again after clot → safe.
- step → bleed → (untreated, advance clock) → death by `'exsanguination'`.

**Risks:** building a minimal but real reachable room + a body wearing
footwear in a test harness; ensuring `onEntered` fires through the real
`Mobile.traverse` path (not a raw containment move). Reuse existing
spatial test helpers.

---

## Phase 6 — Documentation (finalize deliverable)

**Files added/edited (at finalize/sweep):**
- `docs/subsystems/harm.md` — the driver + the `inflict` contract
  (signature, gating, inflicter-from-context, severity magnitude-only,
  mechanism recorded-not-resolved), the five behaviors, the recurring
  wound-tick + presence-freeze + re-arm-on-hydrate, the death stamp, the
  limp + coverage couplings, the tangible-dressing capability model
  (`DressingMixin`/`Bandage`, clot gate, `undress`), and the two named
  deferred seams at their sites: **materials-response severity function**
  and **avulsion sever/part-promotion**.
- `docs/subsystems/vitals.md` — cross-link harm.md; update the "What's
  deferred" list (the `inflict` producer seam, the bleed tick, the
  death-watcher are now shipped) and the Death/consciousness "Update"
  note (harm is the driver that moves `bloodVolume` to the death seam,
  mirroring respiration's `spo2` note).
- CLAUDE.md — add `medical` to the command-category list; add the harm.md
  line to the Documentation Map (at sweep).

**Test:** doc-existence + cross-link is an acceptance criterion; verified
by the sweep, not a Vitest.

---

## Ordering dependencies

- **Phase 0 is foundational** — 1–5 all call `HarmApi.inflict`.
- **Phase 1 (driver) before 2** (natural healing reuses the driver) and
  **before 3/4/5** (limp reads lacerations; treat arrests the bleed;
  hazard produces one). Phase 1 also lands the `TraumaBehavior` interface
  changes (`tick` widening + `reopen`) that Phase 4's `TreatController`
  and `UndressController` consume.
- **Phase 3's `isSiteCovered` before Phase 5** (the hazard's coverage gate).
- **Phase 4 before Phase 5's integration** (the step→treat→arrested and
  step→undress→re-bleed tests drive the treat/undress verbs).
- The Phase-4 `DressingMixin`/`Bandage`/`undress` work does **not** need to
  move earlier: Phase 1's clot gate is a pure boolean-flag machine on the
  `Trauma` value (flipped by `resolve`/`reopen`, read by `tick`) with no
  dependency on the mixin, item, or verbs. It is unit-tested in Phase 1 by
  calling the strategy methods directly. The verbs/item that *drive* those
  flags land cleanly in Phase 4.
- **Phase 6 last** (finalize).
- Phases 2 and 3 are independent of each other after Phase 1.

## Acceptance-criteria coverage

Every acceptance criterion maps to a phase + its tests:

| Criterion | Phase | Test locus |
|---|---|---|
| `inflict` gated, inflicter-from-context, produces Trauma; rejected un-gated call | 0 | `HarmLogic.test.ts` / `harm.test.ts` |
| Bleed→death (`exsanguination`, through `unconscious`) + presence-freeze | 1 | `HarmLogic.bleed.test.ts` |
| Tick handle not persisted, re-armed on hydrate | 1 | `HarmLogic.bleed.test.ts` |
| Fracture impairs slot affordances; heal restores | 2 | `Slotted`/`Vitals` trauma tests |
| `assess` perception-gated, self-vs-other split | 4 | `perception/__tests__/` |
| `treat` consumes `isDressing` item, sets `dressed`, grades by quality×competence, mints `ActSignature` | 4 | `medical/__tests__/` |
| `undress` clot gate: premature reopen / safe-after-clot / heal-to-clear | 4 (behavior 1) | `medical/__tests__/` + `HarmLogic.bleed.test.ts` |
| Dressed wounds hide detail in `assess` | 4 | `perception/__tests__/` |
| Demonstrator hazard: barefoot cut, step→bleed→treat / →death | 5 | demonstrator-room integration test |
| Coverage gate: barefoot cut / shod not | 5 (read 3) | demonstrator-room integration test |
| Limp: severity-gated locomotion penalty, clears | 3 | limp traverse test |
| `contusion`/`burn`/`avulsion` non-no-op; avulsion = severe laceration | 2 | trauma-behavior tests |
| `harm.md` exists, cross-linked, deferred seams named | 6 | sweep (doc-existence) |

## Riskiest phase

**Phase 1 — the wound-tick driver + bleed→death.** It concentrates every
subtle invariant: a real-time `ScheduleApi.recurring` handle whose
*drain* is computed in game-time and must freeze on linkdead/far-past
(presence-freeze parity), a handle that is **never persisted** and must
**re-arm on hydrate** through the right body-warm seam, idempotent
arm/cancel around inflict/resolve/death without leaking timers across HMR
reloads, and the death stamp path. Everything else composes over a seam
that already exists; this phase builds the new stateful machinery. The
Phase-4 additions (DressingMixin/undress) do not change this — they are
verb/item consumers over seams Phase 1 already defines.
Mitigation: copy `Metabolic.reconcileMetabolism`'s freeze idiom and the
RenownLogic/ProducerLogic recurring-handle lifecycle verbatim, and test
idempotency + freeze + re-arm explicitly.

---

## Settled decisions (record)

All items below are **locked** — recorded for the build agent, not open
for re-litigation. Where the requirements are imprecise or collide with a
convention, the resolution is stated.

1. **Coverage query uses `covers`, not `bodyPart`.** Requirements prose
   says "`SlotSpec.bodyPart` slot↔part coupling" for coverage, but the
   `feet` slot couples via `covers`. The plan uses
   `BodyPlan.getSlotsCovering(partKey)`. Prose imprecision, not a scope
   change. **Settled.**
2. **New `medical` command category.** A directory grouping (like
   `governance`/`employment` were added), not a new *module category*.
   Name is `medical` (verbs `treat`/`bind`/`dress`/`undress`; `assess`
   stays in `perception`). **Settled.**
3. **`Trauma` gains `inflictedBy` + `mechanism` fields.** Additive to the
   closed `Trauma` interface, serializable; combat-forward-compat. No
   `type→number` table. **Settled.**
4. **Death stamp is harm-owned, not a shared helper.** The "seam" is the
   `setCauseOfDeath('exsanguination')` + `setLifecycleState('dead')` pair
   each driver stamps itself; harm's lives in `HarmLogic`. **Settled.**
5. **Re-arm-on-hydrate seam.** Re-arm from `Avatar.enter()` (players) +
   `PostRegistrationMixin.postRegister` (NPCs) via
   `HarmApi.rearmWoundTicks`. A bare `Creature` without
   `PostRegistrationMixin` won't auto-re-arm — a documented degenerate;
   the proof body is an Avatar. Global boot-sweep rejected. **Settled
   (ACCEPTED).**
6. **Foot `site` key** is `body.leg.left.foot` / `body.leg.right.foot`
   (biped roster). A non-biped entering the hazard has no matching foot
   part and takes no cut (graceful). **Settled.**
7. **Tangible dressing is IN scope, modeled as a capability.** A new
   **`DressingMixin`** (in `lib/vitals/`, `Mixins.Dressing` +
   `MixinApi.isDressing`) marks any dressing-capable item; `Bandage` =
   `DressingMixin(Thing)` (`/obj/Bandage.ts`) is the canonical one;
   `treat`/`undress` gate on `isDressing`, not `instanceof`. Dressing sets
   `dressed`; a distinct `undress` verb removes it; premature removal
   (severity above `HARM_DEFAULTS.CLOT_SEVERITY`) reopens the bleed; a
   dressed wound hides severity in `assess`. First-aid taxonomy: only the
   **dressing** branch is built; **instruments** (splint/suture →
   `ToolMixin`) and **medicines** (→ bulk/metabolism) are named-but-deferred
   seams, no sibling mixins in v1. **Two prior sub-choices, now resolved:**
   - **(a) `reopen` on the `TraumaBehavior` interface** (not
     laceration-specific). Added as a required method with
     `NOOP_BEHAVIOR.reopen = noop`, so the roster stays total/closed,
     `avulsion` reuses it, and the `UndressController` stays
     behavior-agnostic (calls `.reopen` uniformly, exactly as
     `TreatController` calls `.resolve`). **Resolved.**
   - **(b) `Bandage` is single-use**, a plain `DressingMixin(Thing)` spent
     via `StuffApi.destruct` — not `Globbable`. The spec fixes DressingMixin
     as "dressingQuality + single-use"; per-instance quality doesn't stack
     cleanly (`GlobbableMixin.canMerge` vetoes on differing state), and the
     treat→destruct path needs no split/merge bookkeeping. Stacking is a
     free later increment (the `Coin = GlobbableMixin(Thing)` path) if
     playtest wants a "roll of gauze." **Resolved.**
   The dressing is a consumable-into-state, deliberately NOT a worn item on
   the wound's coverage slot (avoids entangling with the Phase-3 coverage
   check). **Settled.**
8. **`inflict` caller-gating breadth.** Gate `HarmLogic.inflict` on
   `FromModule('/api/harm#HarmApi')` and keep `HarmApi.inflict` reachable
   by trusted producers (hazard, later combat), un-spoofable via
   context-derived inflicter (the `BulletinApi`/`ProvenanceApi` precedent).
   No stricter caller allowlist on `HarmApi.inflict` itself — the
   demonstrator room calls it directly. **Settled (ACCEPTED).**
9. **Demonstrator is a one-off room, not a `HazardMixin`.** A capability
   mixin scored 0/3 (no multi-host reuse; nothing narrows on `isHazard`;
   no composition), and the environment-harms-you space is already claimed
   body-side by thermal + respiration, leaving a residual (mechanical
   contact trauma) whose triggers are heterogeneous across hosts and don't
   unify under one Location mixin. So the demonstrator is a concrete
   domain room class overriding `onEntered` → `inflict`, config as class
   constants. The reusable abstraction is `inflict`; any hazard/trap
   taxonomy is a separate future build over that seam. **Settled
   (ACCEPTED).**

---

## Standing caveats (not defects — build-time confirmations)

- **Demonstrator room home + placement** — the one-off room class and its
  seed live in a domain area (`domain/<area>/`); the build agent picks the
  area near walkable shipped content (newbie-wilds/lounge) and the room
  base class to extend.
