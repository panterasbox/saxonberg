# Combat hooks — implementation plan

The **wizard-facing extension grammar for combat**: a declared roster of
`@hook` seams across three surfaces — **instrument** (`CombatReactiveMixin`),
**participant** (`CombatantMixin` no-op terminals), and **venue** (optional
Location hooks) — at fixed points of the beat lifecycle, modeled on the
`Mobile.traverse` choreography. The build migrates the one existing barnacle
(the `isEnergized` branch in `commitInflict`) onto the instrument seam
byte-identically, and lint-locks the engine against the next one
(`check-combat-dynamics`). Three approved scope expansions ride along:
the **`CombatApi.influence`** external-instruction bridge (Phase 5),
**non-mechanical innates** (Phase 6), and the **species combat
vocabulary** (Phase 7) — with shadow-composed enchantment verified as a
test-and-docs deliverable (DECISION I). Read the requirements
(`docs/requirements/combat-hooks-requirements.md`) in full before starting —
scope is closed; this plan implements its decisions.

All line references are as of `master` `c2391f79`.

## Grounding (facts established by investigation)

- **The engine** (`obj/api/CombatLogic.ts`, ~2800 lines): `CombatLogic` is a
  thin gated class; all rules are **module-private free functions** (the
  `ConditionLogic` precedent) — new dispatch helpers follow that shape, never
  new exports. The beat is `advanceImpl` (~1179): interception pass →
  weapon-switch advance → brain intents → the **reach-sorted** exchange loop
  (a stable sort of `getStates()` by `reachOrderScore`; targeting + opening
  credit) → `s.poise.tick(beat)` per state → `checkVitalsResolution`.
- **`resolveExchange`** (~1256) resolves one exchange: erosion, then
  `decideOutcome` (~1488, a **pure** function → `OutcomeKind`, 8 kinds), then
  a `switch` in which every case `return`s after narration
  (`whiff`/`parried` also run `reactiveDispatch` ~1519 — the riposte, which
  itself calls `commitInflict`).
- **`commitInflict`** (~1587) — signature
  `(actorState, targetState, bandForEnergy, energyScale, shieldFacing)`; **no
  `session` param today** (call sites: `resolveExchange` ×2,
  `reactiveDispatch` ×1 — all hold `session`). It builds the spec, calls
  `ConditionApi.inflict(target, {mechanism, site, energy, shieldFacing})`,
  stamps `targetState.lastStruckBy` when afflicted, and then holds **the
  barnacle** (~1619):
  `if (weapon && MixinApi.isEnergized(weapon)) ElectricityApi.shockContact(weapon, target);`
  The instrument comes from `resolveInstrument` (~1943): wielded weapon
  (`{channel, materialKey, weapon}`) else the species innate attack
  (`{channel}` — **no `weapon` field**) else null.
- **Resolution chokepoints**: `endWith` (~1655) is the single fight-ending
  funnel (narrates then `session.resolve`; `victim`/`killer` optional).
  `handleDown` (~1690) stamps `targetState.down = true`;
  `checkVitalsResolution` (~1747) stamps the attrition/unconscious `down`.
  The coup: `beginCoup` → (deferred tick) `governCoup` → `startCoup` (~2411,
  fires `narrateCoupTelegraph` only after `SchedulerApi.start(coup).ok`).
  **After `endWith` the session's `states` map empties** (dissolve → hold
  `onAbort` → `removeParticipant`), so coup-time contexts have no
  `CombatantState`.
- **First blood**: `session.markBloodDrawn()` (CombatSession.ts:286) returns
  `true` exactly once, at three call sites — `resolveExchange` `exploit`
  (~1430), `land` (~1448), and `reactiveDispatch` (~1560).
- **`MixinApi.is*` inventory in the scan scope** (`CombatLogic.ts` +
  `lib/combat/*.ts`, tests excluded): `isSlotted`, `isSlottable`,
  `isWieldable`, `isConstructed`, `isEngaged`, `isLoadBearing`,
  `isPartyMember`, `isHasInteractive`, `isVitals`, `isOrganism`, `isVocal`,
  `isCombatant`, `isContainer`, `isContainable`, `isTangible`, `isSensor` —
  plus the one dynamic predicate, `isEnergized` (~1619), which this build
  deletes. `lib/combat/CombatNarration.ts` uses only
  `isContainable`/`isContainer`/`isSensor`/`isVitals`.
- **The choreography model** (`lib/spatial/Mobile.ts` traverse ~337–519):
  optional hooks dispatch via `callTraverseHook` (presence check + apply,
  ~861); the marker-mixin scan is `MixinApi.isHazard(cand) →
  cand.resolveTraversal(mover, mode)` (~489). The optional hooks are
  *declared* on the `Exitable` interface as `onEntered?/onExited?`
  (`lib/boundary/Exitable.ts:127–129`).
- **The slot witness chain** (`lib/slot/Slotted.ts`): `vacate` (~318) and
  `vacateSole` (~341) fire the optional occupant-side witness
  `candidate.onSlotReleased(host, slot)` (declared `onSlotReleased?` on
  `Slottable`, ~62). **`occupy` (~290) fires nothing** — the one-sided chain.
  `cleanupOnDestruct` routes through `vacate` (its comment already
  anticipates an `onUnwielded` in the witness chain). Combat's `performSwap`
  (~2035) calls `actor.occupy`/`actor.vacate` **directly** (not through
  `SlotApi.occupyAll`), and the persistence spine re-wears restored gear via
  `SlotApi.occupyAll` — so the arming witness must live at
  `Slotted.occupy`/`vacate`, not in `WieldController`, to catch all three
  paths.
- **The consequence funnel**: `ConditionApi.inflict(target, spec)` with
  `InflictSpec = EnergyInflictSpec | ShockInflictSpec` (`api/condition.ts`);
  the **inflicter is context-derived** inside `ConditionLogic`
  (`ExecutionContextApi.getActingAuthor` — the *command-stack giver*, not the
  immediate frame), so applying queued consequences from the engine's frame
  preserves attribution byte-identically. Authored conditions land via the
  object-owned `victim.afflict(condition)` (`VitalsMixin`, the sanctioned
  direct-call surface; `ConditionApi` has **only** `inflict`).
  `ElectricityApi.shockContact(source, victim)` — the facade static is
  **Public** (`decorateApiClass` default); the `FromModule('/api/electricity#ElectricityApi')`
  gate on `ElectricityLogic` sees the Api class as caller. So today's
  provenance chain is: CombatLogic frame → Public facade → gate admits. The
  context-mediation rule is **doctrine** (single funnel, deterministic
  ordering, no hook-frame side effects), not a workaround for a gate that
  would otherwise deny.
- **`EnergizedMixin`** (`lib/electricity/Energized.ts`) — pure potential
  (`getVoltage`), no combat knowledge. `StunBaton`
  (`lib/electricity/StunBaton.ts`) `= SwitchableMixin(EnergizedMixin(Weapon))`.
  `shockContactImpl` (`ElectricityLogic.ts` ~471) already no-ops on a
  dead/switched-off source (`effectiveVoltage ≤ 0`), so the hook can queue
  the shock unconditionally — same guard, same place, byte-identical.
- **Mixin machinery**: `MixinApi.hasMixin` walks the constructor chain
  reading each level's own `_mixinName` (api/mixin.ts ~314), so a **nested
  factory** (`EnergizedMixin` returning
  `class … extends CombatReactiveMixin(Base)`) yields both markers.
  Registry constants live in `lib/mixin.ts` (`Combatant: 'CombatantMixin'`,
  `Energized: 'EnergizedMixin'` at ~189/196); predicates in `api/mixin.ts`.
- **The gym** (`scripts/combat-gym.ts` + `scripts/__tests__/combat-gym.test.ts`):
  headless deterministic matchups (`runMatchup(a, b, cap, resetState)` →
  `{winner, beats}`); the **pinned-regression suite** (test ~331: exact
  winner + beat counts captured on pre-change master — the
  formation-build byte-parity precedent) and the **byte-identical A/B cell**
  (test ~512: same cell with/without the variable, `winner`+`beats` equal).
  Gym fighters are `class GymFighter extends Character` (composes
  `CombatantMixin`) in `ContainerMixin(Idea)` rooms (no Location — venue
  dispatch must be presence-checked, absent → skipped). Loadouts build
  `Weapon` instances from `{form, mass, length, shield?}`.
- **The lint precedent** (`scripts/check-inert-weapon.ts` +
  `check-does-nothing.ts`): a standalone tsx script, `EXIT_ON_FINDINGS =
  true`, wired as `packages/server/package.json` `lint:*` + a line in the
  `.gitlab-ci.yml` `lint:` job (~80–101). Scripts may export (combat-gym.ts
  is imported by its test — the unit-test seam).
- **The author surface**: `@hook` block tag → the **extension** tier of
  `pnpm docs:project`; authored **once** on the canonical declaration,
  override sites matched by name (CLAUDE.md § the author-surface projection).
- **Shadow dispatch reaches hook methods.** Every instance method the
  engine calls on a Stuff reference goes through the security-gate
  interceptor (`api/security.ts` ~600–666): after the entry policy, the
  gate checks `ShadowApi._shadowsFor(ctx.proxy, ctx.prop)` and, when
  shadows are attached to that method name, the shadow chain **fully
  replaces** the raw call (the `next()` branch is skipped) — the base
  method runs only if the top shadow continues via `Shadow.callDown`
  (`api/shadow.ts` ~295, ALS-walked, bottoming out through a one-shot
  bypass re-entry). The engine holds proxies everywhere (occupants from
  `getAllOccupants`, combatants, rooms), and shadow lookup is
  **proxy-keyed** (`attach` stored the proxy) — so a shadow attached over
  `augmentInflict`/`onStruck`/a participant hook genuinely intercepts the
  engine's dispatch. The shadow body runs in a frame whose target is the
  **shadow** (`ExecutionContextApi.run(caller, top, …)`) — irrelevant to
  the context's consequence queue (plain un-gated object methods; the
  drain runs later in the engine's frame regardless), and the inflicter
  still derives from the command stack (`getActingAuthor`), not the frame
  target.
- **Instance-level `hasMixin` walks shadows** (`api/mixin.ts` ~295–307,
  the documented Witness pattern): `MixinApi.isCombatReactive(weapon)` is
  **true when a shadow composing `CombatReactiveMixin` is attached** to a
  host that doesn't compose it — an enchantment shadow can confer the
  whole instrument seam on a mundane weapon, not just reshape an existing
  hook.
- **`Poise` has no arm-window mutator.** The opening arms only inside
  `lower()` on the *crossing* into `brokenAt` (`Poise.ts` ~165–176); the
  public mutations are `erode`/`spend` (lowering), `restore`
  (endurance-capped, disarms a live window above the floor), `tick`
  (lapses an expired window), `consumeOpening` (single-spend). An
  external "expose" therefore needs one additive `Poise` method; the
  window then lives entirely inside the existing tick/consume/lapse
  economy.
- **The unarmed fallback inventory** (the seams DECISION L's derivation
  replaces): `reachRankOf` → `0` when `actorWeaponProfile` is null
  (~451); `balanceFactorOf` → `1` (~1172); `resolveExchange`'s
  `poiseDamageFactor() ?? 1` / `overextendFactor() ?? 1` (~1312) and
  `reactiveDispatch`'s twins (~1546–1556); `defenderGuardFactor` keeps
  `NOMINAL_NATURAL_GUARD = 1` for a natural-attack instrument (~336,
  untouched by this build). Byte-parity for existing species means the
  derived natural profile must equal exactly `(tempo 1, poiseDamage 1,
  overextend 1, reachRank 0)` for every currently-seeded body.
- **The innate filter + species fields.** `resolveInstrument` (~1970)
  admits an innate only when `Channels.isMechanicalChannel(ch)`; the
  comment reserves the electric-eel case for `ElectricityApi`.
  `CombatantMixin.naturalAttackChannel` (persistent, `@authorable`,
  validated against the full `CHANNELS` — `shock` included) is the only
  natural-attack authoring surface today. `Species`
  (`lib/species/Species.ts`, `persistentFields` ~262) has no combat
  fields; `BodyPlan` carries `baseMass` (persistent) + `slots` +
  `bodyParts` (per-part tissue masses) but **no limb-length datum**.
  `Species.innateMixins` confers mixins through the augmentation
  *active-mixin* substrate (activation-gated), not class composition —
  not a reliable carrier for `EnergizedMixin` narrowing; a
  shock-innate creature class composes `EnergizedMixin` directly.
- **Gambit affordance merge point.** `eligibilityImpl` (~1888) gates
  `needsInstrument` (via `resolveInstrument`), then `affordedByForm`
  (wielded weapon's construction form ∈ `spec.affordedByForm`), then
  `affordedByShield` (`wieldedShield`). `GambitSpec` (`Gambit.ts` ~44)
  carries `affordedByForm?: DeliveryForm[]` / `affordedByShield?:
  boolean`. Species affordance slots in as an *alternative satisfier* of
  those two equipment gates only.
- **Shock-severity primitives are public**: `MaterialApi.resolveShock
  (current)` → the local contact-burn trauma and
  `MaterialApi.severityToBand` (`api/material.ts` ~236, ~310) — enough to
  build an honest `InflictReport` for a shock-only delivery without
  touching `ConditionLogic`.
- **`CombatApi` facade shape** (`api/combat.ts`): public statics
  forwarding to `CombatLogic` methods, each gated
  `@CallSecurity(CombatApiCallers)` (`FromModule("/api/combat#CombatApi")`),
  facade Public via `decorateApiClass` — `influence` joins this roster
  identically.

Constraints honored throughout: no new module categories (the mixin + the
context value-object live in `lib/combat/`); methods-only inter-Stuff
contract; no `#` instance state in mixin bodies (proxy dispatch — CLAUDE.md
§ Member Privacy hard constraint 2); the hook grammar carries zero
AppSettings (the influence Api + natural-profile threshold add exactly
four dials, DECISIONS J/L); accountability
writers untouched; double quotes/2-space (server code under `obj|lib` here
uses the file's existing quote style — match each file).

---

## Decisions

- **DECISION A — one marker, seven instrument hooks, no-op terminals.**
  `CombatReactiveMixin` (`lib/combat/CombatReactive.ts` — mixin filename
  rule: no `Mixin` suffix) with `_mixinName = 'CombatReactiveMixin'`, no
  persistent fields, no settings. Hooks (all `@hook`-tagged, all with
  default bodies so overriders compose via `super` — the `onDestruct`
  no-op-terminal shape): `onWielded(host, slot)` / `onUnwielded(host, slot)`
  (plain args, mirroring `onSlotReleased` — these fire outside any session),
  and the ctx-taking five: `augmentInflict(spec, ctx): InflictSpec`
  (identity default — `return spec`), `onStrikeResolved(ctx)` (the striking
  carrier hears its own exchange outcome — fired from `witnessExchange`,
  see DECISION E), `onStruck(ctx)`, `onParry(ctx)`,
  `onBypassed(ctx)`. Registry: `Mixins.CombatReactive` in `lib/mixin.ts`;
  `MixinApi.isCombatReactive(obj): obj is Stuff & CombatReactive` in
  `api/mixin.ts`. The engine's only new narrowing is
  `isCombatReactive` at the declared scan points. Hooks are
  **deliberately shadowable** — none of the hook methods (instrument,
  participant, venue) may ever carry `@Final` or `@Unshadowable`; the
  proxy's shadow chain over a hook *is* the temporary-enchantment
  substrate (DECISION I). The `@hook` TSDoc on `augmentInflict` and the
  participant terminals notes it ("shadowable by design — a temporary
  effect attaches a shadow over this method; detach ends the effect").
- **DECISION B — the context is a plain `lib/combat/` value-object with a
  queue the engine drains.** `CombatHookContext`
  (`lib/combat/CombatHookContext.ts`, named-value-object category — the
  `Poise`/`Gambit` shape: plain class, not Stuff, not proxied). Read surface
  (readonly, nullable where a seam lacks it): `session`, `beat`, `actor`,
  `target`, `actorState`/`targetState` (`CombatantState` views), `gambit:
  GambitSpec | null`, `outcome: ExchangeOutcomeKind | null`, `channel`,
  `site`, `deflected`, `instrument: Stuff | null`, `venue: Stuff | null`,
  `resolution: CombatResolution | null`. Consequence surface (queue-only —
  consequences on others never execute in the hook frame; **self-state
  mutation is sanctioned** — a hook mutates its own host directly, under
  the determinism contract), eight methods (sized by the requirements'
  three coverage exercises): `attachRider(spec: InflictSpec, on?)`,
  `afflict(condition: ActiveCondition, on?)`,
  `introduceToxin(type: string, amount: number, on?)`,
  `adjustReserve(key: string, delta: Quantity, on?)` (drained via the
  recipient's `Reserved` surface — `MixinApi.isReserved` narrowing),
  `wearInstrument(on, amount: number)` (drained onto the recipient's
  resolved wielded instrument via the `DurableMixin` condition gauge —
  `MixinApi.isDurable` narrowing; no wielded instrument → the
  consequence is inert),
  `influence(instruction: CombatInfluence, on?)` (drained through the
  same module-private `influenceImpl` as `CombatApi.influence` —
  DECISION J's economy, one vocabulary for hooks and the external
  bridge),
  `deliverShock(source: Stuff & Energized)`, `attachFlavor(line: string)`.
  `on?: 'attacker' | 'defender'` (default `'defender'`) resolves against
  the ctx's own actor/target pair — recipient-constrained, never arbitrary
  targeting; `attach*` throws when the resolved recipient is null.
  **Uniform drain rule: every dispatched ctx is drained** — witness-hook
  ctxs carry consequences too (a fear aura afflicts at
  `onSessionEntered`). The engine constructs the ctx, dispatches the
  hook(s), then **drains** (`_drain()`, `@internal`, seals the context —
  post-drain `attach*` throws, closing the stashed-context determinism
  hole) and applies each consequence **from its own frame in queue order**:
  rider → `ConditionApi.inflict(recipient, spec)` (stamping
  `targetState.lastStruckBy` when the recipient is the exchange target,
  like the engine's own inflict);
  afflict → `MixinApi.isVitals(recipient) && recipient.afflict(condition)`;
  toxin → `MixinApi.isMetabolic(recipient) &&
  recipient.introduceToxin(type, amount)` (the hazard-dart seam, funneled;
  add `isMetabolic` to the lint allowlist);
  shock → `ElectricityApi.shockContact(source, target)`;
  flavor → queued lines emitted via a module-private `narrateFlavor`
  reusing `CombatNarration`'s witness loop, **after** the exchange's own
  narration beat, in queue order (deterministic; attributed to the
  instrument's host frame, `world.combat.exchange` topic). Provenance is
  therefore **identical to today's engine calls** (CombatLogic frame →
  Public facade → `FromModule` gate sees the Api class; inflicter still
  derives from the command stack via `getActingAuthor`). A rogue
  hook-constructed context is inert — only the engine drains the one it
  built. `ExchangeOutcomeKind` (the current module-private `OutcomeKind`
  union) **moves** into `CombatHookContext.ts`; `CombatLogic` re-aliases it
  locally (`type OutcomeKind = ExchangeOutcomeKind`) so nothing else churns.
- **DECISION C — arming witnesses fire at the `Slotted` chokepoint,
  per-slot.** `Slotted.occupy` gains (after the successful `set.add`) the
  marker scan `if (MixinApi.isCombatReactive(candidate))
  candidate.onWielded(this, slot)`; `vacate`/`vacateSole` gain the twin
  `onUnwielded(this, slot)` **after** the existing `onSlotReleased`
  dispatch (generic witness first, combat witness second — documented
  order). This catches all three arming paths (`WieldController` →
  `SlotApi.occupyAll`, combat's `performSwap` direct `occupy`/`vacate`, and
  `cleanupOnDestruct`) and deliberately does **not** add a generic
  `onSlotOccupied` (no consumer; addable later without disturbing this). A
  two-slot (2H) weapon hears the pair once **per slot** — symmetric with
  the release side; documented in the `@hook` contract. Persistence restore
  (`occupyAll` on materialize) fires `onWielded` — correct ("the fresh clone
  is being armed") and documented; hook bodies must be cheap + idempotent.
  Type-only import of `CombatReactive` in `Slotted.ts` (erased), predicate
  via the already-imported `MixinApi`.
- **DECISION D — instrument scan points and the innate carrier.**
  `commitInflict` gains a `session` first param (all three call sites hold
  it) and becomes the augment seam:
  1. Resolve the **augment carrier** — exactly one, never both (the
     double-fire guard): `instrument?.weapon` when armed; else (innate /
     bare path) the **attacker itself** when
     `MixinApi.isCombatReactive(attacker)`; else none.
  2. Build the `EnergyInflictSpec` as today; if a carrier exists, build the
     ctx and `spec = carrier.augmentInflict(spec, ctx)` (validate: the
     returned spec must be an energy spec — `mechanism` any non-`shock`
     `InsultKind` (the funnel's own `Exclude<InsultKind, 'shock'>`
     vocabulary: heat/tearing legal, a flaming blade may re-channel its
     primary), `site` a string, `energy` a finite number — a malformed
     return falls back to the pre-augment spec with a
     `console.warn`, never a throw mid-beat).
  3. `ConditionApi.inflict` + the `lastStruckBy` stamp — byte-identical.
  4. **Drain** the ctx queue (this is where the deleted `isEnergized`
     branch sat, ~1619 — same sequence position, so the Energized migration
     is order-identical).
  5. `onStruck`: enumerate the CombatReactive covering gear over the struck
     site — a module-private `coveringGearAt(target, site, shieldFacing):
     Stuff[]` mirroring `ConditionLogic.resolveCoveringStack`'s *item
     selection* (worn `Constructed`+`Wearable` armor on
     `getSlotsCovering(site)` slots, plus any wielded armor-construction
     item when `shieldFacing`), outside-in by `getLayerDepth()` — and fire
     `gear.onStruck(ctx)` on each CombatReactive item, whether the blow
     landed or was fully attenuated (`ctx.deflected` says which — "the
     shield took the blow" is the point). Each `onStruck` gets its own ctx,
     drained after dispatch.
- **DECISION E — outcome witnesses fire from `resolveExchange`, never
  inside the pure `decideOutcome`.** Immediately after
  `decideOutcome` returns (before the switch): `outcome === 'parried'` →
  `onParry(ctx)` on the defender's guarding instrument
  (`resolveInstrument(targetState)?.weapon`, else the `wieldedShield`);
  offensive outcome that landed past a **steady but guardless** defender
  (`targetState.poise.band() === 'steady' && !targetCanParry` and outcome
  ∈ {`land`, `exploit`}) → `onBypassed(ctx)` on the defender's resolved
  instrument (the flail that couldn't guard). `control-resisted` is not a
  parry (nothing turned a blow) — excluded, documented.
  `witnessExchange(session, actorState, targetState, spec, outcome, beat)`
  (module-private) fires **once per `resolveExchange`**, at the tail of
  each outcome case (called before each `return` — after
  `reactiveDispatch` in the `whiff`/`parried` cases, so the witness sees
  the fully-resolved exchange including any riposte; the riposte itself
  does not re-fire it). It dispatches, in order: the participant
  `onExchangeResolved(ctx)` actor-first then target (narrowed via
  `MixinApi.isCombatant`), then the **instrument `onStrikeResolved(ctx)`
  on the actor's augment carrier** (same carrier rule as DECISION D-1 —
  the weapon, else the bare CombatReactive attacker; a combo weapon
  hears its own land/whiff/parried, `ctx.outcome` set). Each ctx drained
  per the uniform rule.
- **DECISION F — the remaining participant terminals + call sites.** Added
  to `CombatantMixin` (and the `Combatant` interface) as no-op public
  methods: `onSessionEntered(ctx)` — fired on each combatant as it enters
  a session: `openSessionImpl` success tail (initiator then defender,
  before the venue `onCombatOpened`) and `joinImpl` success tail (the
  joiner only). `onDefeatedFoe(ctx)` — the victor-side twin: fired in
  `endWith` on the named `killer` (when one is named — the attrition
  death names it via `lastStruckBy`), immediately after the victim's
  `onDefeated` and before `session.resolve` (states still live; on-kill
  dynamics — heal-on-fell, chronicle-adjacent gear). `onPoiseBandChanged(ctx)` — fired from `advanceImpl` as a
  **per-beat net transition**: snapshot `poise.band()` per state right after
  `getStates()` at beat-top; after the `poise.tick` loop compare and fire in
  roster (`states`) order — one comparison per combatant per beat, ordering
  independent of the reach sort. `onDowned(ctx)` — both `down = true`
  sites: `handleDown` (after the stamp, before the terms branch) and the
  `checkVitalsResolution` unconscious path. `onDefeated(ctx)` — in
  `endWith`, on the named `victim`, after `narrateResolution` and **before**
  `session.resolve` (states still live). `onCoupBegun(ctx)` — in
  `startCoup`, only after `SchedulerApi.start(coup).ok`, alongside
  `narrateCoupTelegraph`; fired on the executioner then the victim
  (ctx `actorState`/`targetState` are null there — the session has already
  dissolved its states; documented).
- **DECISION G — venue hooks are optional, presence-dispatched, declared on
  a `CombatVenue` interface.** `CombatVenue` (exported from
  `CombatHookContext.ts` — the types the module's surface speaks) declares
  `onCombatOpened?(ctx)`, `onBloodDrawn?(ctx)`, `onCombatResolved?(ctx)`,
  each `@hook`-tagged. Dispatch is a module-private `callVenueHook(room,
  name, ctx)` in `CombatLogic` (the `callTraverseHook` shape: presence check
  + apply — the sanctioned optional-Location-hook idiom; the base `Location`
  is untouched). Venue resolution: the anchor combatant's
  `getContainer()` guarded by `isContainable`/`isContainer` (a gym
  `ContainerMixin(Idea)` room simply has no hooks → skipped). Call sites:
  `openSessionImpl` success tail (after `recordOpening`, anchor =
  initiator); the three `firstBlood === true` sites via a shared
  `dispatchBloodDrawn(session, actorState, targetState, beat)` helper,
  fired **after** the narrate call (the roar precedes the witness —
  deterministic either way, this is the documented order); `endWith` after
  `narrateResolution` / after `onDefeated`, before `session.resolve`
  (anchor = victim ?? first combatant). One venue event each; `join` does
  not re-fire `onCombatOpened`.
- **DECISION H — the Energized migration is a nested-factory composition.**
  `EnergizedMixin` becomes
  `return class EnergizedMixin extends CombatReactiveMixin(Base) { … }` —
  every source is CombatReactive (a `LiveWire` too — harmless: it is never
  resolved as an instrument, so its hooks never fire), which reproduces
  today's semantics exactly ("*any* energized wielded weapon shocks").
  It overrides `augmentInflict(spec, ctx)`: `ctx.deliverShock(this);
  return super.augmentInflict(spec, ctx);` — no switch check (the
  `effectiveVoltage ≤ 0` guard inside `shockContactImpl` is the same guard
  the old branch relied on, unmoved). The `isEnergized` branch in
  `commitInflict` is **deleted**; `MixinApi.isEnergized` and the
  `ElectricityApi` import remain in `CombatLogic` only via the drain
  (`ElectricityApi` stays imported; `isEnergized` disappears). The
  `hasMixin` per-level `_mixinName` walk makes the nested composition
  narrowable as both `Energized` and `CombatReactive` (verified,
  api/mixin.ts ~314).
- **DECISION I — enchantment is a shadow over a hook (verified, tests +
  docs only — no engine code).** `ShadowApi.attach(host, shadow)` with the
  hook method in the shadow's intercepted set makes the engine's own
  dispatch run the enchantment; `detach` restores baseline byte-identically.
  Verified mechanics (Grounding): interception is real for engine-held
  proxies; the chain **replaces** the base call, so an enchantment that
  wants the base behavior (almost always — `augmentInflict` must preserve
  the `super`-composition semantics) continues via `Shadow.callDown`; the
  shadow frame's target is the shadow (provenance-neutral — consequences
  queue on the plain ctx and drain in the engine frame, identically);
  instance-`hasMixin` shadow-walking means a `CombatReactiveMixin`-composing
  shadow **confers the whole seam on a mundane weapon** (the scan point
  lights up while attached, goes dark on detach). The determinism contract
  binds shadow bodies exactly as it binds overrides. No new module; the
  build ships the verification tests (Phase 2) and the doc section
  (Phase 9). **BUILD DEVIATION (Phase 2, empirical):** the
  mundane-weapon conferral is **dispatch-limited** — instance-`hasMixin`
  shadow-walking lights `isCombatReactive` on a mundane host, but the
  proxy get-trap returns `undefined` for a method the host itself
  doesn't define, so a shadow **reshapes** existing hooks (chain +
  `callDown`) and cannot **add** one. The engine guards hook presence
  (skip-silently), the shadow suite pins both the boundary and the
  working shape (a shadow over a `CombatReactive`-composing host whose
  no-op terminals are the base), and Phase 9's § 6b must state this
  boundary: full enchant-a-mundane-weapon requires the host to compose
  the mixin (no-op terminals are cheap — a future sweep may compose
  `CombatReactiveMixin` into the base `Weapon` if enchant-anything is
  wanted).
- **DECISION J — `CombatApi.influence` + the closed `CombatInfluence`
  vocabulary.** The bridge for external systems (magic, scripts) to issue
  state-instructions into a live session — "Effect iff gated Api" made real
  for combat state. **`lib/combat/CombatInfluence.ts`** (named
  value-object/vocabulary category): `INFLUENCE_KINDS = ['stagger',
  'expose', 'steady'] as const` + the closed union
  `CombatInfluence = {kind:'stagger', intensity:'light'|'heavy'} |
  {kind:'expose'} | {kind:'steady'}` (+ `InfluenceResult = {ok, reason?}`).
  `CombatApi.influence(combatant, instruction): InfluenceResult` — facade
  static → `CombatLogic.influence` (`@CallSecurity(CombatApiCallers)`) →
  module-private `influenceImpl`. **The gate is the standard combat-mutator
  shape** (Public facade, `FromModule`-gated logic): callers reach it from
  their *own* gated logic (a future `MagicLogic`, the script interpreter's
  dispatch) — the CombatApi/CombatLogic pair is itself the "gated Api" the
  Effect doctrine demands; no bespoke caller allowlist. Semantics — every
  instruction routes through the **existing poise/opening economy**,
  deterministic, bands-not-numbers at the surface:
  - `stagger` → `state.poise.erode(amount × focusMult, beat)` where
    `focusMult` is the same edge-count focus-fire multiplier
    `resolveExchange` applies to a pressed target (an already-pressed
    target staggers harder — the engine's own economy), and `amount` is
    banded: light = `combat.influence.staggerLightErode` (seeded 0.12, the
    exchange-erosion literal), heavy = `combat.influence.staggerHeavyErode`
    (seeded 0.3). A crossing into `broken` arms the normal opening via
    `lower()` — influence never sets `down` (only an exchange exploiting
    the contest does).
  - `expose` → a new additive `Poise.exposeWindow(currentTick): void`
    (value-object change: arms `{open: true, expiresAtTick: tick +
    config.openingTicks}` without moving the gauge; idempotent while
    already open) — the window then ticks, lapses, and is consumed by the
    **existing** exploit machinery; `openingArmedBy` is left null (an
    external window is ownerless — any attacker cashes it, no command
    deed).
  - `steady` → `state.poise.restore(combat.influence.steadyRestore
    (seeded 0.15, the defense-restore literal), enduranceRatio(combatant))`
    — endurance-capped like any recovery, and **suppressed under
    focus-fire** exactly like the defend-pin (`incoming ≥
    combatFocusFireSuppressRecoveryAt` → `{ok:false, reason:
    'suppressed'}`), so influence can't out-recover a gang-up the verb
    can't.

  `{ok:false, reason:'not-in-combat'}` when the target has no active
  session; `'downed'` when down. Band changes influence causes are
  witnessed by the existing `onPoiseBandChanged` per-beat net comparison —
  no new hook. **Three new `combat.influence.*` AppSettings** (a scoped,
  declared deviation from the hooks grammar's zero-settings constraint —
  the *grammar* still carries no magnitudes; the influence Api does, and
  magnitude-in-dials is the doctrine). Spells/scripts using it are
  explicitly out of scope (the magic build's job).
- **DECISION K — non-mechanical innates ride the delivery split (and the
  shock innate IS the instrument seam).** `resolveInstrument`'s innate
  branch stops filtering to mechanical channels: it returns the resolved
  natural attack's channel as-is (`ResolvedInstrument.channel` widens to
  `Channel` for the innate case; the wielded-weapon path stays
  `MechanicalChannel`). `commitInflict` splits on the channel exactly as
  the weapon doctrine already states:
  - **mechanical** innate → today's `EnergyInflictSpec` path, byte-identical;
  - **heat** (and any other non-shock `InsultKind`) innate →
    `EnergyInflictSpec` with that `mechanism` (`inflict`'s insulation
    fold / passthrough already handles it; magnitude = `energyFor(band)` as
    today);
  - **shock** innate → **no** mechanical spec is built and
    `ConditionApi.inflict` is **not** called for the primary. The creature
    class composes `EnergizedMixin` directly (which, post-Phase-3, *is*
    `CombatReactive` — Grounding: `innateMixins` conferral is
    activation-gated and not relied on). The innate carrier rule
    (DECISION D) fires `augmentInflict` on the creature; the `Energized`
    override queues `deliverShock(this)`; the drain delivers the one shock
    via `ElectricityApi.shockContact(creature, target)` — **the shock
    innate needs no bespoke delivery path; it falls out of the migrated
    seam, single-fire by construction** (the delivery split never also
    calls `shockContact` directly — that would be the double-fire). The
    `InflictReport` for a shock-only strike is built from the drained
    outcome: `deflected = outcomes.length === 0`; when it landed, `band =
    MaterialApi.severityToBand(...)` over the
    `MaterialApi.resolveShock(currentThrough)` trauma severity, and
    `lastStruckBy` is stamped (deterministic, honest, no `ConditionLogic`
    change — `applyConsequences` returns per-consequence results so
    `commitInflict` can read the shock outcome). A shock innate on an
    `Energized`-less creature truthfully delivers nothing (`deflected`) —
    an authoring error surfaced by the Phase 6 tests and documented.
- **DECISION L — the species combat vocabulary: `naturalAttacks[]`, the
  body-derived natural profile, species-afforded gambits.**
  - **`naturalAttacks[]`** — `Species` gains a persistent `@authorable`
    `naturalAttacks: NaturalAttackSpec[]` (+ `getNaturalAttacks`/
    `setNaturalAttacks`, joined to `persistentFields`).
    `NaturalAttackSpec` lives in **`lib/combat/NaturalAttack.ts`** (named
    value-object): `{key: string; channel: Channel; reach?: ReachClass;
    massKg?: number; lengthM?: number}` — the profile hints are the two
    magnitudes the weapon curves already speak plus an optional explicit
    reach band. Resolution: module-private `naturalAttacksFor(actor):
    NaturalAttackSpec[]` — the species list when non-empty, **else the
    legacy `CombatantMixin.naturalAttackChannel` synthesized as a
    one-entry list** (key `'natural'`, no hints — the byte-preserving
    fallback; the mixin field stays, documented as the legacy single-attack
    surface), else `[]`. **Rotation is deterministic beat-keyed**: the
    striking attack is `attacks[(session.getBeat() - 1) % attacks.length]`,
    selected in `commitInflict` (which holds `session` after Phase 2);
    presence-only reads (`eligibilityImpl`'s `needsInstrument`,
    `defenderGuardFactor`) use entry 0 — channel identity is irrelevant
    there. No randomness, no per-state counter to drift.
  - **The natural profile** — `NaturalAttack.deriveProfile(spec,
    bodyPlan)` (a static on the value-object) yields the four numbers the
    unarmed fallbacks currently hard-code: `{tempoFactor, poiseDamageFactor,
    overextendFactor, reachRank}`. Derivation: authored hints win
    (`massKg`/`lengthM` fed through the same exponent curves as
    `WeaponProfile` — reusing `weaponProfileConfig()`'s dials, no new
    settings; `reach` maps directly to a rank); absent hints, a **banded
    body-scale term from `BodyPlan.baseMass`** whose thresholds are chosen
    so every currently-seeded body derives exactly the neutral quadruple
    `(1, 1, 1, 0)` — concretely: neutral below
    `combat.natural.largeBodyMassKg` (seeded **150** — wolves ~40 kg and
    humanoids ~70–90 kg stay neutral; the pin proves it), one reach rank +
    the heavy-balance factors (via the existing weapon curves at an
    effective limb mass/length) at/above it ("an ogre punches at ogre
    reach"). Engine wiring: a module-private `actorStrikeProfile(state):
    {tempo, poiseDamage, overextend, reachRank}` resolves the weapon
    profile when armed, else the natural profile of the *current* attack,
    else neutral — and the five fallback sites (Grounding bullet) swap
    their `?? 1` / `: 0` literals for it. `defenderGuardFactor`'s
    `NOMINAL_NATURAL_GUARD` is **untouched** (guard is not part of this
    vocabulary). One new dial (`combat.natural.largeBodyMassKg`) — declared
    alongside DECISION J's three.
  - **Species-afforded gambits** — `Species` gains persistent `@authorable`
    `affordedGambits: string[]` (existing gambit keys only — no new kinds;
    unknown keys are inert). `eligibilityImpl`: a module-private
    `speciesAffords(actor, key)` (Creature-contract species read, the
    `enduranceRatio` precedent) short-circuits the **two equipment gates
    only** (`affordedByForm`, `affordedByShield`) — a tailed species
    affords `sweep` bodily; `needsInstrument` still stands (satisfied by
    the species' natural attack), and every other gate (down, terms,
    injury) is untouched.

---

## Phase 1 — Substrate: the mixin, the context, the registry

No engine wiring — pure additive substrate; every existing suite green
untouched.

### Files

**`mud/lib/combat/CombatHookContext.ts`** (new — named value-object):
- `ExchangeOutcomeKind` (the 8-kind union, moved from `CombatLogic`).
- `CombatConsequence` = discriminated union over the eight kinds
  (DECISION B): `{kind:'rider', spec, on} | {kind:'afflict', condition,
  on} | {kind:'toxin', type, amount, on} | {kind:'reserve', key, delta,
  on} | {kind:'wear', amount, on} | {kind:'influence', instruction, on} |
  {kind:'shock', source} | {kind:'flavor', line}`.
- `CombatHookContext` — readonly read surface (DECISION B), the eight
  consequence queue methods (throw when the resolved recipient is null
  or after seal), the
  `@internal _drain()`. TS `private` state (plain class — no proxy, but no
  `#` needed; note the one-line rationale if any flag warrants `#`).
- `CombatVenue` interface (three optional `@hook` members, DECISION G).
- Class TSDoc carries the shared determinism contract once; each `@hook`
  member's TSDoc restates: **synchronous, deterministic, cheap** — no
  `await`, no wall-clock, no randomness, bounded work per beat.

**`mud/lib/combat/CombatReactive.ts`** (new — mixin): `CombatReactive`
interface + `CombatReactiveMixin` factory per DECISION A. Each hook's
`@hook` TSDoc names its exact firing point ("invoked by the combat engine
at `commitInflict`, on the striking instrument, before
`ConditionApi.inflict` …"), the composition rule (`super`-chain), and the
determinism contract. `augmentInflict` documents the reshape-and-return
contract + the context-mediated consequence rule ("never call gated Apis
from this frame — queue through the context").

**`mud/lib/mixin.ts`** — `CombatReactive: 'CombatReactiveMixin'` with the
two-line comment (next to the `Combatant` entry).

**`mud/api/mixin.ts`** — `isCombatReactive` predicate (+ the
`CombatReactive` type import), placed with the combat predicates.

### Tests (`lib/combat/__tests__/CombatReactive.test.ts`, `CombatHookContext.test.ts`)

- Default hook bodies are no-ops; `augmentInflict` returns its input
  identically; an overrider composing via `super` sees the base behavior.
- `MixinApi.isCombatReactive` true for a test composition, false for a bare
  `Weapon`; nested composition (a `CombatReactiveMixin` under another
  mixin) still narrows.
- Context: the eight queue methods accumulate in order; `on: 'attacker'`
  resolves the recipient against the ctx pair (default `'defender'`);
  `_drain` returns the queue and seals; post-seal `attach*` throws;
  `attach*` with a null resolved recipient throws; `attachFlavor`
  accepts a non-empty string only.

**Invariant kept green**: everything — nothing consumes the substrate yet.

---

## Phase 2 — The engine wired: instrument, participant, venue seams

All dispatch sites land with only no-op/absent consumers in the tree, so
this phase's gate is **byte parity**: the existing gym pinned-regression
suite (exact winners + beat counts) and every combat suite pass unchanged.

### Files

**`mud/obj/api/CombatLogic.ts`** — the call sites (DECISIONS D–G):
- `commitInflict(session, …)` (threaded param): carrier resolution →
  `augmentInflict` → inflict → drain → `onStruck` walk, in that order; the
  module-private `coveringGearAt` + `applyConsequences(ctx, session,
  actorState, targetState)` + `witnessExchange` + `dispatchBloodDrawn` +
  `callVenueHook` helpers (module-private free functions — the established
  file shape).
- `resolveExchange`: `onParry`/`onBypassed` after `decideOutcome`;
  `witnessExchange` at each case tail; `dispatchBloodDrawn` at the two
  `firstBlood` sites; ditto the third site in `reactiveDispatch`.
- `advanceImpl`: beat-top band snapshot → post-tick compare →
  `onPoiseBandChanged` in roster order.
- `handleDown` + `checkVitalsResolution`: `onDowned`.
- `endWith`: `onDefeated` (victim), then `onDefeatedFoe` (the named
  killer, when one is named), then venue `onCombatResolved` — all before
  `session.resolve`.
- `openSessionImpl`: participant `onSessionEntered` (initiator then
  defender) then venue `onCombatOpened`, on the success tail;
  `joinImpl`: `onSessionEntered` on the joiner.
- `startCoup`: `onCoupBegun` after a successful scheduler start.
- `type OutcomeKind = ExchangeOutcomeKind` local alias; delete the old
  inline union.

**`mud/lib/combat/Combatant.ts`** — the seven no-op terminals on the mixin
class + the `Combatant` interface, each `@hook`-tagged with its lifecycle
moment (session entered = open/join; band change = per-beat net
transition; downed = the poise-loss OR attrition stamp; defeated = named
victim at resolution; defeated-foe = the named killer, right after;
coup begun = the telegraph moment; exchange
resolved = once per exchange, riposte included in its parent's dispatch).

**`mud/lib/slot/Slotted.ts`** — the `occupy`/`vacate`/`vacateSole`
dispatches (DECISION C). Canonical `@hook` docs for
`onWielded`/`onUnwielded` live on `CombatReactiveMixin` (authored once);
the Slotted comment points there.

### Tests

- **`obj/api/__tests__/CombatLogic.test.ts`** additions + a new
  `CombatLogic.hooks.test.ts` (whichever fits the file's current size): a
  **test-fixture dynamic** — `class ReactiveTestBlade extends
  CombatReactiveMixin(Weapon)` recording every hook fire into an instance
  log — proves, seam by seam: `augmentInflict` fires on the striking weapon
  with the pre-inflict spec (and its reshaped return is what `inflict`
  receives — assert via trauma delta, including a heat-mechanism return —
  the non-mechanical relax); `onStrikeResolved` fires on the actor's
  carrier with the exchange outcome (land AND parried — the combo-weapon
  case); `onStruck` fires on a CombatReactive
  worn armor + wielded shield covering the struck site (and on a
  full deflection with `ctx.deflected`); `onParry` on the parried outcome's
  guarding instrument; `onBypassed` on a steady-but-guardless (flail-form)
  defender; a rider `attachRider` lands a second trauma through
  `ConditionApi.inflict` after the primary and stamps `lastStruckBy`;
  an `on: 'attacker'` rider from an `onStruck` fixture (thorn mail) lands
  its trauma on the ATTACKER and does NOT stamp `lastStruckBy`;
  `introduceToxin` queued by a fixture raises the recipient's toxin
  burden (Metabolic spy — the hazard-dart parity);
  `attachFlavor` emits exactly one witness-loop line after the exchange
  narration (Scene spy, order asserted);
  `adjustReserve` queued `on: 'attacker'` by a lifesteal fixture drains
  the defender's endurance and restores the attacker's (two queued
  consequences, order preserved);
  `wearInstrument` queued `on: 'attacker'` by a rust-monster-shaped
  participant fixture degrades the striking weapon's `DurableMixin`
  condition (and is inert against a bare-handed attacker);
  `influence({kind:'stagger'})` queued by a concussive-maul fixture
  erodes the defender's poise through `influenceImpl` (same result as
  the external call — one economy; this test LANDS IN PHASE 5's suite —
  the drain arm activates there, see the phase-ordering note);
  `deliverShock` queued by a fixture routes to `ElectricityApi.shockContact`
  (spy) **after** the primary inflict; a sealed context throws on late
  `attach*`; a consequence queued from a witness ctx (the uniform drain
  rule — an `onSessionEntered` afflict) lands; `onDefeatedFoe` fires on
  the killer (poise-contest kill AND attrition kill via `lastStruckBy`),
  after the victim's `onDefeated`, states still live.
- **Innate path**: an unarmed natural-attack creature composing
  `CombatReactiveMixin` gets `augmentInflict` on **itself**; an armed
  CombatReactive creature wielding a CombatReactive weapon fires the
  **weapon only** (the double-fire guard).
- **Participant + venue**: a scripted fight observing `onSessionEntered`
  (open pair + a mid-fight joiner), `onExchangeResolved`
  (both sides, actor first), `onPoiseBandChanged` (net transition only),
  `onDowned`, `onDefeated` (victim only, before dissolve), `onCoupBegun`
  (lethal sentient path); a hook-bearing test room observing
  `onCombatOpened` / `onBloodDrawn` (exactly once, at the crossing) /
  `onCombatResolved`; a hook-less `ContainerMixin(Idea)` room is skipped
  silently.
- **Slot chain** (`lib/slot/__tests__/`): `onWielded` on `occupy` (per
  slot — a 2H claim fires twice), `onUnwielded` on `vacate`/`vacateSole`
  **after** `onSlotReleased`, and via `cleanupOnDestruct`; a
  non-CombatReactive occupant fires nothing.
- **NPC≈PC parity**: one test running the same fixture fight brain-driven
  vs. policy-driven asserting identical hook logs.
- **The enchantment verification suite** (DECISION I; a sibling
  `CombatReactive.shadow.test.ts`):
  - A "blessing" shadow (a `Shadow` subclass intercepting
    `augmentInflict`, continuing via `Shadow.callDown` with a reshaped
    spec) attached to the fixture weapon's proxy: the engine's next
    exchange lands the reshaped spec (trauma delta observed **through
    the engine's own dispatch**, not a direct call); `ShadowApi.detach`
    → the following exchange is byte-baseline (same trauma as the
    unshadowed fixture).
  - A shadow body that queues a consequence through the ctx
    (`ctx.deliverShock` spy) proves the queue-and-drain path is
    identical from a shadow frame (the drain fires from the engine
    frame; ordering unchanged).
  - A `CombatReactiveMixin`-composing shadow attached to a **mundane**
    `Weapon` lights `MixinApi.isCombatReactive(weapon)` (the Witness
    pattern) and the scan point fires while attached; detach → the seam
    goes dark and the fight is byte-baseline (the temporary-enchantment
    round-trip).
  - A shadowed hook under the determinism contract: two identical runs
    of the shadowed matchup produce identical outcomes
    (winner/beats/fire counts).

**Invariant kept green**: the gym pinned-regression suite byte-identical
(no-op terminals may add calls, never behavior); all existing combat +
slot + persistence suites.

---

## Phase 3 — The Energized migration (pin first, then flip)

### Step 3a — capture the pin (pre-migration commit)

**`scripts/__tests__/combat-gym.test.ts`** — extend `GymLoadout` with
`energized?: boolean` (an energized hafted baton: build a
`StunBaton`-shaped weapon — `SwitchableMixin(EnergizedMixin(Weapon))` is
importable directly as `StunBaton` — set material/construction/mass/length
per a new `Loadouts.stunBaton`, `setVoltage`, switch **on**). Add:
- a pinned cell `stunbaton-vs-sword@competent` in the PINS table with the
  winner + beat count **captured by running it against the pre-migration
  engine** (this commit), plus an assertion on the loser's post-fight
  condition roster containing the shock contact burn (the "same shock"
  half of the pin — winner/beats alone wouldn't notice a dropped shock);
- a unit-level ordering test in `CombatLogic` tests: on a landed energized
  hit, `ConditionApi.inflict(mechanical)` precedes
  `ElectricityApi.shockContact(weapon, target)` (spies), once each.

Both green against the **unmigrated** engine — they are the fixture the
flip must preserve.

### Step 3b — the flip

**`mud/lib/electricity/Energized.ts`** — DECISION H: compose
`CombatReactiveMixin`, override `augmentInflict` (queue `deliverShock(this)`,
return `super.augmentInflict(spec, ctx)`), TSDoc updated ("the stun-baton
seam — the instrument grammar's first consumer").

**`mud/obj/api/CombatLogic.ts`** — delete the `isEnergized` branch
(~1619) and its comment; `MixinApi.isEnergized` no longer appears in the
file.

**`mud/lib/electricity/StunBaton.ts`** — composition unchanged
(`CombatReactive` arrives via `Energized`); TSDoc updated to name the seam
instead of the deleted branch.

### Tests

- Step 3a's pin + ordering test stay green across the flip (the
  byte-identical evidence: same shock, same ordering — narration is
  untouched because no narrate call moved).
- Electricity suites (`lib/electricity/__tests__/`) green; a new assertion:
  `MixinApi.isCombatReactive(new StunBaton())` and a switched-**off** baton
  still lands only the mechanical blow (the `effectiveVoltage` guard,
  unmoved).
- `grep`-level acceptance: `MixinApi.isEnergized` absent from
  `CombatLogic.ts` (Phase 4's lint makes this permanent).

**Invariant kept green**: the stun-baton pin byte-identical; all Phase-2
parity pins.

---

## Phase 4 — `check-combat-dynamics`: the lint lock

### Files

**`scripts/check-combat-dynamics.ts`** (new — the
`check-inert-weapon`/`check-does-nothing` script shape): scans
`src/mud/obj/api/CombatLogic.ts` + `src/mud/lib/combat/*.ts` (tests
excluded) — the two homes dynamics could leak into (`CombatNarration` et
al. are engine modules; `lib/electricity` etc. are *consumers*, out of
scope by design). Mechanics: exported pure
`scanCombatDynamics(source: string, file: string): Finding[]` matching
`MixinApi.is<Predicate>` occurrences against the **physics allowlist**
(final — the Phase-3-adjusted inventory plus the three drain-narrowing
predicates):

```
isCombatReactive, isCombatant, isConstructed, isContainable, isContainer,
isDurable, isEngaged, isHasInteractive, isLoadBearing, isMetabolic,
isOrganism, isPartyMember, isReserved, isSensor, isSlottable, isSlotted,
isTangible, isVitals, isVocal, isWieldable
```

(`isMetabolic`/`isReserved`/`isDurable` enter via the drain's
consequence narrowing — toxin/reserve/wear arms, engine physics, not
dynamics; verify the exact predicate names in `api/mixin.ts` at build.)

Any other predicate → a finding whose message points at the grammar
("dynamics come through the CombatReactive hooks — see
docs/subsystems/combat-hooks.md"), `EXIT_ON_FINDINGS = true`. `main()` at
module bottom walks the real files (scripts are outside the module-scope
lint).

**`packages/server/package.json`** — `"lint:combat-dynamics": "tsx
scripts/check-combat-dynamics.ts"`.

**`.gitlab-ci.yml`** — the `lint:` job gains
`- pnpm -C packages/server lint:combat-dynamics` with a one-line comment
("The combat engine branches on physics; dynamics come through hooks.").

### Tests (`scripts/__tests__/check-combat-dynamics.test.ts`)

- A seeded-violation source string (`MixinApi.isEnergized(weapon)`) → one
  finding; every allowlisted predicate → none; a predicate in a comment /
  string literal — decide with a plain line-scan and document that a
  commented predicate flags too (matching the sibling scripts' pragmatic
  text-scan posture) or strip `//` comments first — pick the latter only if
  the real files force it.
- The real scan over the live tree returns zero findings (the
  self-regression that fails the moment a barnacle lands).

**Allowlist note for Phases 5–7**: the later phases add
`lib/combat/CombatInfluence.ts` and `lib/combat/NaturalAttack.ts` to the
scan scope automatically (the `lib/combat/*.ts` glob); neither uses
`MixinApi` narrowing, `influenceImpl` uses only allowlisted predicates
(`isEngaged`/`isVitals`), and the shock-innate path narrows nothing (the
drain calls `shockContact` only with the `Energized`-typed source the
hook itself supplied) — the allowlist above is final; no later phase
touches it.
The lint's unit test gains one fixture asserting `isEnergized` in a
`lib/combat/` source string still flags (the migration stays locked from
both homes).

**Invariant kept green**: CI lint job passes on the migrated tree; red on a
seeded violation (proven by the unit test, not by breaking CI).

---

## Phase 5 — `CombatApi.influence`: the external-instruction bridge

### Files

**`mud/lib/combat/CombatInfluence.ts`** (new — named
value-object/vocabulary): `INFLUENCE_KINDS`, `CombatInfluence`,
`InfluenceResult` per DECISION J, TSDoc carrying the determinism contract
("synchronous, deterministic; magnitudes from `combat.influence.*`
dials").

**`mud/lib/combat/Poise.ts`** — the additive `exposeWindow(currentTick)`
mutator (DECISION J; arms without lowering, idempotent while open, TSDoc
names the external-window semantics).

**`mud/api/combat.ts`** — `influence(combatant, instruction):
InfluenceResult` static (TSDoc: the Effect-iff-gated-Api bridge; callers
route through their own gated logic; no spell ships here) + the
`CombatInfluence`/`InfluenceResult` type re-exports.

**`mud/obj/api/CombatLogic.ts`** — `CombatLogic.influence`
(`@CallSecurity(CombatApiCallers)`) → module-private `influenceImpl`
(session lookup via `sessionForImpl`; the three kind branches per
DECISION J; focus-fire scaling/suppression reads the same
`edgeCount`/dial reads `resolveExchange` and the defend-pin use).

**AppSettings** — the three `combat.influence.*` keys in the
`AppSettingKeys` vocabulary + `config/app-settings.yaml` seeds
(`combat.natural.largeBodyMassKg` lands with Phase 7 — keep each key
with its consuming phase).

### Tests

- `lib/combat/__tests__/CombatInfluence.test.ts` +
  `Poise.test.ts` additions: `exposeWindow` arms a window that `band()`
  reads `open`, lapses via `tick` at `openingTicks`, single-consumes via
  `consumeOpening`, and is disarmed by recovery above the floor;
  idempotent while open.
- `CombatLogic` tests: `stagger` erodes with the focus-fire multiplier
  (2-attacker cell erodes more than 1v1); a heavy stagger crossing the
  floor arms a normal opening and the next exploit downs — but influence
  alone never sets `down`; `expose` → the very next eligible exchange
  resolves `exploit` and `consumeOpening` fires, `openingArmedBy` stays
  null (no command deed minted); `steady` restores endurance-capped and
  returns `{ok:false, reason:'suppressed'}` under the focus-fire pin;
  `{ok:false}` reasons for out-of-combat and downed targets; band changes
  from influence surface through `onPoiseBandChanged` on the following
  beat (no new hook).
- **Gym cell** (`scripts/__tests__/combat-gym.test.ts`): a policy wrapper
  injecting `CombatApi.influence(foe, {kind:'stagger', intensity:
  'heavy'})` at a fixed beat — two runs identical (winner/beats), and the
  influenced cell differs from the uninfluenced pinned cell (the
  instruction is real).

**Phase-ordering note**: the ctx's `influence(instruction, on?)`
consequence *method* exists from Phase 1 (queue-only), but its drain arm
activates **here** — Phase 2's `applyConsequences` ships it as a
documented no-op-with-warn until `influenceImpl` lands, and the Phase-2
concussive-maul test moves to this phase's suite.

**Invariant kept green**: all PINS (no influence call → no code path
touched); the full combat suite.

---

## Phase 6 — Non-mechanical innates

Depends on Phase 3 (the Energized/CombatReactive composition) and
Phase 2's carrier rule.

### Files

**`mud/obj/api/CombatLogic.ts`** — `resolveInstrument`: the innate branch
returns any valid `Channel` (comment updated — the eel case is now
armed); `ResolvedInstrument.channel` widens for the innate case.
`commitInflict`: the delivery split per DECISION K (mechanical/heat →
`EnergyInflictSpec`; shock → skip primary, report built from the drained
shock outcome; `applyConsequences` returns per-consequence results to
feed it).

**`mud/lib/electricity/Energized.ts`** — TSDoc note only: the innate
shock (an Energized creature striking bare) delivers through the same
`augmentInflict` override the stun baton uses.

### Tests

- **The electric eel** (acceptance example): a test creature composing
  `EnergizedMixin` (voltage set) with a `shock` natural attack lands an
  exchange → exactly **one** `ElectricityApi.shockContact(creature,
  target)` (spy — the single-fire proof), no mechanical
  `ConditionApi.inflict`, the target carries the contact burn, the
  `InflictReport` reads landed with the shock-derived band, first-blood
  and `lastStruckBy` behave.
- A **heat** innate builds `{mechanism:'heat'}` and wounds through the
  insulation fold.
- A shock innate on an `Energized`-less creature truthfully deflects
  (nothing delivered — the documented authoring error).
- A **mechanical** innate (the wolf shape) is byte-identical pre/post the
  split (covered again by Phase 7's unarmed pin).

**Invariant kept green**: all PINS (every pinned cell is armed or
mechanical-innate — untouched paths); the stun-baton pin (the weapon
shock path didn't move).

---

## Phase 7 — The species combat vocabulary

Pin first, then build (the Phase-3 discipline).

### Step 7a — the unarmed-innate pin (pre-change commit)

`scripts/__tests__/combat-gym.test.ts`: an **unarmed** gym matchup — two
fighters whose `CombatantMixin.naturalAttackChannel = 'blunt'` (the
legacy surface), no weapons — pinned winner + beats against the
pre-Phase-7 engine. This is the byte-parity fixture for both the
`naturalAttacks[]` fallback and the neutral-band derivation.

### Step 7b — the vocabulary

### Files

**`mud/lib/combat/NaturalAttack.ts`** (new — named value-object):
`NaturalAttackSpec` + `NaturalAttack.deriveProfile(spec, bodyPlan,
config)` per DECISION L (reusing `weaponProfileConfig()`'s curve dials;
the `combat.natural.largeBodyMassKg` threshold; unit-testable pure).

**`mud/lib/species/Species.ts`** — `naturalAttacks: NaturalAttackSpec[]`
+ `affordedGambits: string[]`, both `@authorable`, persisted, with the
method surface (`getNaturalAttacks`/`setNaturalAttacks`/
`getAffordedGambits`/`setAffordedGambits`); TSDoc cross-refs
combat-hooks.md / race.md.

**`mud/lib/combat/Combatant.ts`** — `naturalAttackChannel` TSDoc marked
the legacy single-attack fallback (field and behavior kept).

**`mud/obj/api/CombatLogic.ts`** — `naturalAttacksFor` (species-first,
legacy-fallback), the beat-keyed rotation in `commitInflict` (index
`(session.getBeat() - 1) % n`; entry 0 for presence-only reads),
`actorStrikeProfile` replacing the five unarmed fallback literals
(DECISION L), `speciesAffords` short-circuiting the two equipment gates
in `eligibilityImpl`.

**AppSettings** — `combat.natural.largeBodyMassKg` (seeded 150) in the
`AppSettingKeys` vocabulary + `config/app-settings.yaml`.

### Tests

- `NaturalAttack.test.ts`: authored-hint derivation rides the weapon
  curves; hint-less derivation is **exactly neutral** `(1,1,1,0)` below
  the threshold (a 40 kg wolf body, a 90 kg biped) and shifted above it
  (a 400 kg ogre body: reach rank 1, heavier balance).
- Multi-attack **rotation determinism**: a two-attack species
  (`bite`/`tail`) alternates channels by beat — two identical runs, the
  identical channel sequence (assert via the trauma-type sequence); the
  single-entry species and the legacy-fallback species are byte-identical
  to each other and to the pre-change pin.
- **Ogre-reach gym cell**: big-body innate vs. neutral-body innate opens
  at `reach` (differing ranks), the reach-holder resolves first, the
  matchup is reproducible and differs from the neutral-vs-neutral cell.
- **Tail-sweep eligibility**: a species with `affordedGambits: ['sweep']`
  and a natural attack passes `eligibilityFor(actor, 'sweep')` unarmed;
  without the species entry it rejects `wrong-weapon`; `needsInstrument`
  still rejects when the natural attack is absent too; a bogus key in
  `affordedGambits` is inert.
- **Byte-parity pins**: Step 7a's unarmed pin green across 7b; the
  existing armed PINS untouched (armed paths read `actorStrikeProfile`'s
  weapon branch — identical values).

**Invariant kept green**: Step 7a's pin + all prior PINS; the treeline /
existing species suites.

---

## Phase 8 — Gym: hooked-session determinism cell

**`scripts/__tests__/combat-gym.test.ts`** — the hooked determinism cell: a
test-scoped `class GymReactiveBlade extends CombatReactiveMixin(Weapon)`
whose `augmentInflict` attaches a small deterministic rider (a fixed-energy
`tearing` spec — magnitude-only, no new vocab) and whose witnesses count
fires. Loadout plumbing: a `reactive?: boolean` axis (or a `make`-level
weapon factory param — follow whichever the `energized` axis landed as).
Assertions:
- **two runs, identical transcripts**: `runMatchup` twice with `resetState`
  → same winner, same beats, same hook-fire counts (the requirements'
  "hooked sessions remain deterministic" criterion);
- the A/B shape of the formation precedent: the reactive cell *differs*
  from the bare cell (the rider is real), while the **no-hook cell remains
  pinned** (the PINS re-asserted in the same run — byte-parity default
  alongside a live hooked cell). The full PINS table now re-asserted in
  one run includes the stun-baton pin (Phase 3), the unarmed-innate pin
  (Phase 7a), and the ogre-reach + influence + shadowed-matchup
  reproducibility cells — the byte-parity default and every
  hooked/influenced/derived variation deterministic side by side.

**Invariant kept green**: all PINS; the new cell reproducible.

---

## Phase 8b (optional) — demo dynamics

Two real `/obj/` items proving the grammar on shipped content (the
requirements mark this optional, not acceptance-gating — build it if the
cycle has room, else it's a clean follow-on):

- **`/obj/armor/bramble-mail`** (`lib/`-composed class + seed under
  `seeds/obj/armor/`): `CombatReactiveMixin` over the mail-form armor
  composition; `onStruck` queues a small fixed-energy `point` rider
  `on: 'attacker'` + an `attachFlavor` line. Exercises: recipient
  targeting, deflected-vs-landed reads, flavor.
- **`/obj/arms/ember-edge`**: `CombatReactiveMixin(SwitchableMixin(...))`
  over a bladed Weapon; while switched on, `augmentInflict` re-channels
  the primary to `heat` (the validation-relax case) + flavor on
  `onWielded`. Exercises: spec reshaping, the switch interplay, arming
  witnesses.

Each gets a gym cell (deterministic, two-run identical) and a pinned
winner/beats row. Naming/placement follows the `/obj/arms`/`/obj/armor`
relocation convention from the weapon-playstyle build.

---

## Phase 9 — Documentation (acceptance) + surface check

**`docs/subsystems/combat-hooks.md`** (new) — owns the choreography
(combat.md is at size; it gets a pointer). Outline:
1. **What this is** — the wizard-facing extension tier; the
   movement-grammar lineage (veto/witness/compute; combat ships
   witness + compute, vetoes pre-exist).
2. **The choreography** — a seam-by-seam table (hook × surface × kind ×
   exact engine moment, in beat order: wield → open → beat-top → exchange
   (augment → inflict → drain → struck/parry/bypassed → exchange-resolved)
   → band-change → blood-drawn → down → defeat → resolve → coup), the
   `Mobile.traverse` table as the stylistic model.
3. **The three surfaces** — `CombatReactiveMixin` (the one marker, the
   scan rule, the innate-carrier rule + double-fire guard),
   `CombatantMixin` terminals (NPC≈PC structural parity), `CombatVenue`
   optional hooks (presence dispatch, non-Location containers skipped).
4. **`CombatHookContext`** — read surface, the queue-and-drain consequence
   funnel, why consequences are context-mediated (call-security doctrine +
   determinism + accountability; the engine-frame provenance facts from
   Grounding), the sealed-context rule.
5. **The determinism contract** — sync/deterministic/cheap, gym-enforced;
   the byte-parity default and the pinned cells.
5b. **Author patterns** (the coverage-exercise cookbook): read-freely /
   consequence-through-ctx / self-state-sanctioned; **deterministic
   procs** (every-Nth-hit combo counters via `onStrikeResolved`,
   threshold-conditional reads — never RNG); session-keyed transient
   state (`ctx.session`); the oil pattern (a consumable attaches a timed
   shadow); shadow stacking order = attach order.
6. **The first consumer** — the Energized migration as the worked example
   (before/after of the deleted branch).
6b. **Enchantment via shadows** — the verified dispatch mechanics
   (chain-replaces-call, `callDown` for base behavior, proxy-keyed
   attach, shadow-conferred `CombatReactive` via instance-`hasMixin`),
   the never-`@Final`/`@Unshadowable` rule, the determinism contract
   binding shadow bodies, detach-restores-baseline.
6c. **External influence** — `CombatApi.influence` + the closed
   `CombatInfluence` vocabulary, the routed-through-the-economy
   semantics (focus-fire scaling/suppression, ownerless external
   windows), the Effect-iff-gated-Api doctrine, the `combat.influence.*`
   dials, "no spell ships here."
6d. **The species vocabulary** — `naturalAttacks[]` + beat-keyed
   rotation, the natural profile derivation (neutral-band byte-parity
   posture + `combat.natural.largeBodyMassKg`), the shock/heat innate
   delivery split (the eel as the seam's second consumer),
   species-afforded gambits (existing kinds only), the legacy
   `naturalAttackChannel` fallback.
7. **The lint** — `check-combat-dynamics`, the physics allowlist, what to
   do when it fires (implement a hook, don't grow the allowlist).
8. **Graduation posture** (recorded, not scoped) — converged hook shapes
   fold into `@authorable` data mixins later; the magic-items envelope is
   the sibling build.
9. Cross-references + history note.

**`docs/subsystems/combat.md`** — a short "Extension hooks" pointer
section (the seams exist; the choreography lives in combat-hooks.md) +
History entry; the `commitInflict` prose loses the stun-baton special-case
sentence; the innate-attack paragraph updated (multi-attack,
non-mechanical delivery, the derived natural profile) with the pointer.
**`docs/subsystems/electricity.md`** — the StunBaton paragraph
repointed from "Wired in `CombatLogic.commitInflict`" to the instrument
seam; the eel case moves from "anticipated in a comment" to shipped.
**`docs/subsystems/race.md`** — a short "combat vocabulary" pointer (the
two new `Species` authorable fields → combat-hooks.md § 6d).
**`CLAUDE.md`** — doc-map bullet for combat-hooks.md.

**Surface acceptance**: run `pnpm docs && pnpm docs:project` and verify
every seam (`onWielded`…`onCombatResolved`, `augmentInflict`, the
`CombatVenue` members) lands in the **extension** tier of
`author-surface.json` (spot-check the JSON; the `@hook` tag on the
canonical declarations is the mechanism — if interface members fail to
project, the fallback is documented `@hook` on the `CombatReactiveMixin` /
`CombatantMixin` class methods, which are the canonical homes for all but
the venue trio; resolve venue projection at build time and note the
outcome in combat-hooks.md).

Run `/finalize` at sweep to retire this plan + the requirements doc.

---

## Risks & tricky spots (build-time watchlist)

- **Hook ordering vs. the reach-sorted beat loop.** Never derive dispatch
  order from anything but the existing deterministic orders: exchange-scoped
  hooks fire inline where the engine already stands; per-beat participant
  hooks fire in `getStates()` roster order (insertion-ordered `Map`), NOT
  the reach sort. Don't hoist any dispatch above `runInterceptionPass` or
  between the sort and the loop.
- **Double-fire on the innate path.** The carrier rule is exactly one of
  weapon / creature (DECISION D-1). The riposte's `commitInflict` runs the
  same rule for the *defender's* instrument — fine, but don't also fire the
  parent exchange's carrier again.
- **`onStruck` attribution + drift vs. `resolveCoveringStack`.** The
  engine-side `coveringGearAt` mirrors ConditionLogic's *item selection*
  (Constructed+Wearable armor on covering slots; wielded armor when
  `shieldFacing`; outside-in by layer depth) but must not try to mirror the
  attenuation math. Guard with the parity unit test (same items the fold
  consults). `ctx` names attacker/target; the gear's host is the target —
  don't let a hook mistake the shield for a combat participant.
- **Post-resolution contexts.** After `endWith`/`resolve` the session's
  state map empties — `onCoupBegun` (and any late venue ctx) must tolerate
  null `actorState`/`targetState`. Fire `onDefeated`/`onCombatResolved`
  **before** `session.resolve` for exactly this reason.
- **`markBloodDrawn` is consumed at three sites** — route all three through
  `dispatchBloodDrawn`; never call `markBloodDrawn` a second time to
  "check" (it's a latch; the boolean local `firstBlood` is the truth).
- **HMR/proxy rules for hook bodies.** Hooks are instance methods
  dispatched through the security proxy: `this` is the proxy, so **no `#`
  instance state in mixin bodies** (CLAUDE.md hard constraint 2 — TS
  `private` only); hooks are public + ungateable (`super`-chain), which is
  precisely why they carry `@hook` instead of a policy. The context class
  is a plain object (never proxied) — keep it that way; don't make it a
  Stuff.
- **`Slotted.occupy` fires during persistence restore and clone
  hydration** (`SlotApi.occupyAll` on materialize) — `onWielded` @hook doc
  must state it, and the Phase-2 slot tests should include a restore-path
  fire so nobody "fixes" it later as a surprise.
- **Byte-parity is the standing gate, not a one-time check.** The gym PINS
  (including the new stun-baton pin) run in every phase's suite; any
  drift in winner/beats is a regression in *this* build, not a rebalance.
  If a no-op dispatch measurably changes nothing but a pin still moves,
  suspect an accidental extra `markBloodDrawn`/`poise` touch in a helper.
- **Malformed `augmentInflict` returns** — validate-and-fallback (warn,
  keep the pre-augment spec); a throw mid-beat would kill the tick for
  every participant.
- **Shadow-chain replacement is total.** An enchantment that forgets
  `Shadow.callDown` silently swallows the base hook (and, over
  `augmentInflict`, the `super`-composition of the host's own dynamic) —
  the doc section and the Phase-2 test both model the callDown form.
- **`exposeWindow` vs. the tick clock.** The external window's
  `expiresAtTick` is beat-relative (`session.getBeat() + openingTicks`);
  an influence issued between beats is live for the *next* beat's
  exchanges and lapses through the ordinary `tick` — never invent a
  second clock.
- **Rotation index reads the session beat, nowhere else** — a per-state
  counter would drift under tempo variance and break the two-run
  transcript equality; presence-only reads must use entry 0, not the
  rotated entry (they run at un-beat-anchored moments like
  attempt-time eligibility).
- **The neutral band is load-bearing.** `combat.natural.largeBodyMassKg`
  (and the hint-less derivation path) must yield exactly `(1,1,1,0)` for
  every seeded body — the Step-7a pin is the tripwire; if a future body
  seed crosses 150 kg its combat feel *changes by design* (document in
  race.md).
- **Shock-innate single-fire depends on the carrier rule.** The delivery
  split must never call `shockContact` directly for an innate — the
  drain is the only deliverer (DECISION K); the Phase-6 spy test (exactly
  one call) is the guard.
- **`innateMixins` is not composition.** Conferral through the
  augmentation substrate is activation-gated; a shock-innate species'
  creature class composes `EnergizedMixin` directly — relying on
  `innateMixins` for the `Energized` narrowing is the documented trap.
- **The influence-consequence drain is state mutation, never dispatch.**
  An `influence` consequence applied mid-drain mutates poise through
  `influenceImpl` — it must never re-enter `resolveExchange` or fire
  hooks of its own inside the same drain (no recursion by construction:
  `influenceImpl` is pure state + the drained ctx is sealed). A band
  change it causes surfaces through the beat-top `onPoiseBandChanged`
  comparison like any other.
- **`onDefeatedFoe` needs the killer named.** `endWith`'s `killer` is
  optional (a draw names none) — the hook fires only when it is; the
  attrition path's `lastStruckBy` edge is what names it, so the
  Phase-2 test must cover both the contest kill and the attrition kill.

---

## Deferred seams (clean attach points, not stubs)

- **Data-driven dynamics** — the graduation posture (combat-hooks.md § 8);
  the magic-items build owns the consumable/effect envelope.
- **New veto surfaces / an event bus / ranged-thrown** — explicitly out
  (requirements Non-goals); the veto family already exists at terms /
  eligibility / flee.
- **A generic `onSlotOccupied`** — the occupancy-side generic twin of
  `onSlotReleased`; DECISION C deliberately ships only the CombatReactive
  witnesses. Addable adjacent, zero interference.
- **Defense-side compute** (`augmentMitigation` — reactive armor changing
  what the covering fold returns): materials-response territory, named in
  the requirements' Non-goals. The `onStruck` witness is the v1 boundary.
- **The worn-gear augment chain** — v1 is single-carrier (DECISION D-1);
  the multi-carrier chain over worn CombatReactive gear (ordered like the
  covering stack) is the named extension when a totem-shaped dynamic
  demands it.
- **Ally-aura modifiers** (recovery/poise-math buffs) — the
  composure/`Sharpness` seam's sibling; no hook shapes poise recovery.
- **Magic-cast / attendant-loop hook audits** — future siblings reusing
  this grammar.
- **A `LiveWire`-style non-instrument Energized in a grip slot** — today it
  would shock like a baton (any energized weapon shocks); unchanged by the
  migration, by design.

---

## Critical files for implementation

- `packages/server/src/mud/obj/api/CombatLogic.ts` — every engine call
  site: `commitInflict` (the augment/drain/struck seam + the deleted
  `isEnergized` branch ~1619), `resolveExchange`/`decideOutcome`/`reactiveDispatch`,
  `advanceImpl`, `handleDown`/`checkVitalsResolution`/`endWith`/`startCoup`,
  `openSessionImpl`.
- `packages/server/src/mud/lib/combat/CombatReactive.ts` +
  `lib/combat/CombatHookContext.ts` (new) — the marker mixin and the
  context value-object + `CombatVenue`/`ExchangeOutcomeKind`.
- `packages/server/src/mud/lib/combat/Combatant.ts` +
  `lib/slot/Slotted.ts` — the participant no-op terminals; the
  `onWielded`/`onUnwielded` chokepoint beside `onSlotReleased`.
- `packages/server/src/mud/lib/electricity/Energized.ts` — the migration
  (compose `CombatReactiveMixin`, override `augmentInflict`).
- `packages/server/scripts/check-combat-dynamics.ts` (new) +
  `scripts/__tests__/combat-gym.test.ts` — the lint lock and the
  byte-parity / determinism pins (with `packages/server/package.json` +
  `.gitlab-ci.yml` wiring).
- `packages/server/src/mud/api/combat.ts` +
  `lib/combat/CombatInfluence.ts` (new) — the influence bridge (facade
  static + the closed instruction vocabulary + the `Poise.exposeWindow`
  addition).
- `packages/server/src/mud/lib/combat/NaturalAttack.ts` (new) +
  `lib/species/Species.ts` — the species combat vocabulary
  (`naturalAttacks[]`/`affordedGambits` + the body-derived natural
  profile).
