# Combat formations — implementation plan

The **party-strategy layer over the built combat engine**: a `CombatFormation` is a named, party-level **policy over the threat graph** — who holds which engagement, who intercepts what, who finishes the fallen — chosen once by the captain and then watched unfolding. Read the requirements (`docs/requirements/combat-formations-requirements.md`) in full before starting; scope is closed there. This plan rides shipped substrate end to end: the `CombatGraph` melee (combat.md § Cycle 2), the Party Idea + the narrow `sideOf`/`areAllied` seam (party.md), advancement `ActSignature`s (advancement.md), and the accountability ledger (accountability.md).

**The one governing shape:** the formation is consulted through a **total resolution chain** on the party face (active formation → the authored default preset), and it governs **exactly three hooks** — `pickTarget` allocation, policy-triggered `CombatGraph.redirect` interception, and coup governance. The default preset byte-preserves today's behavior (a pinned gym regression, the accountability-migration precedent). No `FormationRegistry`, no `if (formation)` branch in the exchange loop, no new randomness.

## Grounding (facts established by investigation)

- **`pickTarget`** (`obj/api/CombatLogic.ts:806`) is a module-private function called from the exchange loop inside `advanceImpl` (`CombatLogic.ts:909`, the `while (n-- > 0)` tempo loop). Its current policy: prefer a still-live foe the actor already has an edge onto (`graph.targetsOf`, **insertion order**), else open an edge onto any live foe off the actor's frozen `side`. This exact body becomes the default preset's allocation branch — extracted verbatim.
- **The beat** (`advanceImpl`, `CombatLogic.ts:862`): max-beats guard → weapon-switch advance → brain intent queueing → the reach-ordered exchange loop → `poise.tick` → `checkVitalsResolution`. The interception pass slots in **after the max-beats guard, before the switch/brain loops**, so an edge opened on beat N is redirected at the top of beat N+1 — the "lands next beat" acceptance falls out structurally.
- **`CombatGraph.redirect(attacker, from, to)`** (`lib/combat/CombatGraph.ts:169`) already moves an edge preserving terms/instrument/range — the `defend <ally>` primitive (`defendAllyImpl`, `CombatLogic.ts:2002`). Interception is the *policy-triggered* invocation of the same primitive, run by `CombatLogic` on the session's own graph — content never touches the graph.
- **The coup is engine-initiated, not actor-initiated.** There is **no coup verb**: `beginCoup` (`CombatLogic.ts:1905`) is called from `handleDown` (`:1379`, poise-contest down) and `checkVitalsResolution` (`:1428`, attrition), with the downing attacker / `lastStruckBy` killer as the fixed executioner; `startCoup` builds the `Coup` `DurativeActivity` and `intervene`/`defend <fallen>`/walking away are the only levers. **This is a requirements↔as-built mismatch, flagged below (Decision E).**
- **Sides are frozen at open/join** (`safeSideOf`, `CombatLogic.ts:792` — note its try/catch solo fallback for an unbooted party subsystem, the precedent for formation-resolution's fallback). The formation must **not** be frozen: it is re-read each beat through the chain, which is what makes a mid-fight switch land next beat with no extra machinery.
- **The open window is already ally-exploitable**: `{open, expiresAtTick}` lives on the *defender's* `Poise` (`lib/combat/Poise.ts`); `decideOutcome` (`:1168`) returns `exploit` for **any** attacker whose target `isOpen()`. The MA economy needs no engine change — only a pin test.
- **`PartyApi.sideOf`/`areAllied`** are the only party imports in combat (`CombatLogic.ts` imports `PartyApi` alone; `combatant.ts`/`backs-up.ts` likewise). The party stores `activePartyPath` on `PartyMemberMixin` (Avatar + `Mercenary` only, `lib/party/PartyMember.ts`), resolves the Party Idea sync via `StuffApi.findByTemplatePath`, and mirrors durable state to `PartyRecord` (`parties` collection). Captain gating lives in `PartyLogic` (`not-the-captain` reason); `PartyController` (`obj/command/social/PartyController.ts`) is a thin subcommand switch over `cmd/social/party.yaml`.
- **`LocomotionMode`** is the Idea-singleton precedent: class at `lib/locomotion/LocomotionMode.ts`, seeds at `seeds/lib/locomotion/<name>.yaml` (`class: /lib/locomotion/LocomotionMode`), **sync** resolution via `LocomotionLogic.modeOf` → `StuffApi.findByTemplatePath`, **async** warm via `loadMode` → `StuffApi.singleton(path)`, verbs preloading before sync reads. `Discipline` seeds (`seeds/lib/advancement/Discipline/<key>.yaml`) show the same shape with a per-key directory — the formation seeds follow it.
- **Discipline seeding**: pure-data leaf under `seeds/lib/advancement/Discipline/`, harvested by the `DisciplineCatalogue` at boot (`awareness`/`stealth` are the no-`conferrals` exemplars). The new `command` Discipline is one YAML file.
- **`mintExchangeSignature`** (`CombatLogic.ts:2187`) **skips brain-driven actors** (`if (actorState.brainPath) return`). Gym fighters have no live `Interactive` → `brainPath` set → **gym matchups mint nothing**. The MA signature-banking acceptance is therefore proven by **unit tests with `AdvancementApi` spies**, not gym cells (flagged in Phase 4).
- **`AccountabilityEvent`** (`lib/accountability/AccountabilityEvent.ts`): `AccountabilityFields` + `persistentFields` are additive-friendly (optional fields, harmless defaults); `deriveBlame` is a pure static with its own pinned tests. `recordDeath` (`CombatLogic.ts:1874`) is the single death-row writer; writes are fire-and-forget via `AccountabilityApi.record`.
- **The gym** (`scripts/combat-gym.ts` + `scripts/__tests__/combat-gym.test.ts`): headless deterministic matchups — `runMatchup` loops `CombatApi.advance` with policy-queued gambits; the test harness supplies the fighter factory + per-cell world reset. Existing suites: parry-seam, balance matrix, determinism + NPC≈PC, weapon matrix. Party wiring for formation cells is async setup the *test* does before the sync fight loop.
- **AppSettings**: `combat.*` dials in `mud/config/app-settings.yaml` (commented blocks per build) + camelCase constants in `lib/config/AppSettings.ts` (`AppSettingKeys`), read via the `dial()` helper in `CombatLogic`.
- **The demonstrator substrate exists whole**: `seeds/domain/newbie-wilds/npc/sellsword.yaml` (a `Mercenary` with `arms` + `backs-up` brains), the duelist in the hollow, `party form`/`party enlist`. Vanguard is demonstrable with **zero new NPC content** (Decision H).

Constraints honored throughout: module categories only (no new taxonomy entries — every new file below is a Stuff class, a seed, an Api addition, a controller/YAML edit, or a colocated test); no free-floating exported helpers; Apis end with `SecurityApi.decorateApiClass`; logic methods gated `FromModule`; combat→party stays one-way; bands not numbers; zero new aleatory randomness.

---

## Decisions

- **DECISION A — `CombatFormation` = an authored-data Idea; the *interpreter* lives in `CombatLogic`.** `lib/combat/CombatFormation.ts` (`SingletonMixin(Idea)`, the `LocomotionMode` shape) carries only **declared shape**: `name`, `roles: string[]` (ordered — the assignment vocabulary), `allocation: 'sustain' | 'called' | 'primary'`, `interception: { protects: string[], interceptors: string[] /* priority order */, trigger: 'none' | 'any' | 'high-threat' }`, `coupRight: 'engaged' | <role>`, `coupCall: 'engaged' | 'captain'`. One template per preset, no registry, discovered by `templatePath` (`/lib/combat/CombatFormation/<name>`). All *behavior* (what `'called'` means, what `high-threat` measures) is `CombatLogic` module-private code; all *magnitudes* are `combat.formation.*` dials. A read method `policy()` returns a frozen plain value so the beat never re-reads fields mid-exchange.
- **DECISION B — the total chain lives on the party face, as strings.** Three new pure, sync, gated statics join `sideOf`/`areAllied` on `PartyApi` (forwarding to `PartyLogic`): **`formationPathOf(combatant): string`** (active party's `formationPath` when set, else the `DEFAULT_FORMATION_PATH` constant `'/lib/combat/CombatFormation/default'` — NEVER `''`, NEVER null; the `sideOf` solo-rung / `defaultModeFor` walk-rung mirror), **`roleOf(combatant): string`** (the member's assigned role, `''` when unassigned — vacant is inert, not an error), and **`isCaptain(combatant): boolean`** (the called-target + directive authority read; resolves the member ref internally, where the playerId-vs-templatePath duality already lives). Party stores and returns **path strings only** (ref-shapes Pattern A) — `PartyLogic` never imports anything from `lib/combat/`, preserving the one-way discipline. Combat resolves path → Idea on its own side.
- **DECISION C — combat resolves the formation per-beat through one total resolver.** `resolveFormationFor(state)` (module-private in `CombatLogic`): `PartyApi.formationPathOf` → sync `StuffApi.findByTemplatePath<CombatFormation>` → `.policy()`; when the Idea is not resident it returns the **built-in default policy value** (the `safeSideOf` try/catch precedent — bare unit tests and a cold boot never crash), and a test asserts that fallback is value-equal to the seeded default preset. Warm points: `AttackController` awaits `StuffApi.singleton(formationPath)` for both sides before open (the `competenceBands` pre-open await precedent); `PartyLogic.setFormation` awaits the singleton before accepting the switch — so a mid-fight switch is always resident by its next beat. **The formation is deliberately NOT frozen at open** (unlike `side`) — per-beat consult is what makes "switch lands next beat" true by construction, with no pending-state machinery.
- **DECISION D — the three hooks, placed exactly.** (1) **Allocation**: `pickTarget` becomes a dispatch on `resolveFormationFor(actorState).allocation` — `'sustain'` is today's body extracted verbatim (the byte-parity branch); `'called'` targets the captain's called target (below), falling back to `'sustain'` when there is no live call (captain absent/down/no target — the degrade rung); `'primary'` (MA) targets the side's primary engagement — the apprentice's sustained target (the apprentice itself runs `'sustain'`; every other member allocates onto the apprentice's current target, falling back to `'sustain'` when no apprentice stands). (2) **Interception**: `runInterceptionPass(session)` at the top of `advanceImpl` (after the max-beats guard): snapshot `graph.allEdges()` in insertion order; for each edge whose defender's side-formation protects the defender's role and whose trigger fires (`'any'`, or `'high-threat'` = incoming edges on the protected defender ≥ `combat.formation.ma.highThreatEdges`), redirect to the first **eligible** member walking the formation's `interceptors` roles in priority order, members within a role in party-roster (`memberIds`) order — eligible = in this session, standing, not the defender, and pressed by fewer than `combat.formation.intercept.maxIncoming` incoming edges (the "past a pressure threshold" clause). Redirect via the session's own graph inside `CombatLogic` (no content-facing mutation surface); narrate + (Phase 4) mint. Deterministic throughout — insertion order, roster order, no dice. (3) **Coup governance**: Decision E.
- **DECISION E — coup governance re-points the engine's executioner and adds a captain-directive hold. ⚠ Requirements↔as-built mismatch, resolved here, not silently.** The requirements' language ("who *may* coup", "the everyone-stabs-the-body scrum") presumes an actor-initiated coup; as-built the coup **auto-begins** with an engine-chosen executioner and no verb (Grounding). There is no scrum to kill — so the governance lands as: at `beginCoup`, resolve the executioner by the **victor side's** formation `coupRight` — `'engaged'` = the passed attacker (default preset, byte parity); a role name = the highest-priority standing, co-present holder of that role (MA → the apprentice performs and therefore **banks the deed** — credit routes by role structure with **no credit transfer**), falling back to the engaged attacker when the role is vacant. Where `coupCall: 'captain'`, the coup does **not** auto-begin: it is **held** (a transient pending-coup entry in `CombatLogic`, keyed on the victim) awaiting the captain's directive — **`fight finish`** (a new `FightController` subcommand, the one surface addition beyond the decided `party` subcommands; it lives on the existing combat verb, no new category — flagged for user sign-off in Phase 3) — and expires spared after `combat.formation.coup.directiveWindowSeconds` (mercy by default). Mercy needs no new surface: `intervene` / `defend <fallen>` / the window lapsing already are it. `coupEligible` re-checks are unchanged.
- **DECISION F — the called target is derived, not verb-called.** The decided captain surface is `party adopt` + `party assign` only; there is no `party call` verb in requirements. So Focus Fire's call is **implicit**: each combatant's state gains a transient `deliberateTarget` stamped at their own open/join (inert under every other preset); the side's called target = the captain's `deliberateTarget` while it lives, else the captain's first sustained edge. The captain leads by attacking — deterministic, zero new verbs. (If review wants an explicit call verb it is a clean later addition to the same read.) Solo Focus Fire falls out: captain = self, and allocation pins the deliberate target over `'sustain'`'s edge-insertion-order preference — the target-discipline acceptance.
- **DECISION G — accountability grows facts, blame grows one derived field.** `AccountabilityFields`/`AccountabilityEvent` gain three **optional** fields on the death row: `formationPath` (killer's side formation in force), `killerRole`, `directedBy` (durable id of the captain whose directive began the coup; `''` when unbidden). `recordDeath` fills them; writes stay fire-and-forget. `BlameVerdict` gains `commandResponsible: string` (`''` when none), derived on read: the earliest terminal `death` row with `crime && directedBy` → `commandResponsible = directedBy`. `deriveBlame`'s existing crime rule is untouched byte-for-byte (its pinned tests extend additively) — the apprentice earns the deed, the master bears command responsibility, both from the same rows. No new collection.
- **DECISION H — the demonstrator is Vanguard on the existing 2v1; MA is gym-proven.** Requirements accept "Vanguard (or MA)". The shipped newbie-wilds content already carries the whole loop: `party form`, `party enlist the sellsword`, `party adopt vanguard`, `party assign front sellsword`, `party assign back <self>`, walk west, `attack the gentleman --lethal` — the duelist's edge onto the player (back) is intercepted to the sellsword (front) on the next beat, witnessed. **No new NPC**; the phase ships seed-prose touches + an end-to-end verification, keeping content risk at zero. The MA emergent claim is the gym's job (its acceptance criterion is stated as gym matchups).
- **DECISION I — `party assign` stores without cross-importing.** `PartyLogic` cannot import `CombatFormation` to validate role names (Decision B). Roles are validated **structurally**: `PartyLogic` resolves the party's current formation Idea through `StuffApi.findByTemplatePath` and duck-reads `getRoles()` via a local structural interface (no `lib/combat` import); an unknown role is rejected at the verb with the formation's role list; a role assignment that a later formation switch orphans is simply **inert** (the vacant-role rule run backwards). Assignments live as `roleAssignments: Record<string /*memberId*/, string /*role*/>` on `Party` + `PartyRecord`.
- **DECISION J — vocabulary: "formation", verb `party adopt` (user ruling).** The slate's "tactic" was renamed at requirements: class `CombatFormation`, seeds `seeds/lib/combat/CombatFormation/`, dials `combat.formation.*`, party fields `formationPath`/`roleAssignments`, seam statics `formationPathOf`, topic `world.party.formation`, subsystem doc `combat-formations.md`. The subcommand is **`party adopt <name>`** — not `party formation` — to avoid the `party form` adjacency. Rationale in the requirements' naming decision ("Tactics" evokes the rejected DA:O gambit-scripting model; "formation" matches the role vocabulary and shift narration).
- **DECISION K — roles are sets, not seats (user ruling, generalizing Decision D's tiebreak).** A role is multi-occupant by default; no cardinality schema, no composition table, no validation beyond role-name existence (Decision I). The two interpretation rules are universal across every policy clause: **vacant → inert/degrade** (the fallback rung), **plural → party-roster order, first standing holder** wherever exactly one referent is needed (the interception walk; MA's primary apprentice). Tests in Phases 1–2 must cover the plural case explicitly (two `front`s, two `apprentice`s), not just vacancy.

---

## Phase 1 — The formation substrate: `CombatFormation`, the total chain, the byte-parity pin

The load-bearing phase: after it, every fight in the game resolves a formation every beat — and nothing observable changes.

**Order inside the phase matters:** land the **pin first** (a gym regression test recording today's canonical matchup outcomes — winner + beat counts — plus the existing determinism suite), commit it green, *then* land the substrate under it.

### Files

- **`packages/server/src/mud/lib/combat/CombatFormation.ts`** — the Idea singleton class (Decision A): `SingletonMixin(Idea)`, `persistentFields` for the authored shape, validating setters (closed `allocation`/`trigger`/`coupCall` vocabularies; `roles` unique non-empty — the `LocomotionMode` setter style), `getRoles()`, and `policy(): FormationPolicy` (a frozen value type exported from the same module — the module's one concept + its surface types). Exports `DEFAULT_FORMATION_POLICY` as a class static (the fallback value, Decision C).
- **`packages/server/src/mud/seeds/lib/combat/CombatFormation/default.yaml`** — the default preset: `roles: []`, `allocation: sustain`, `interception.trigger: none`, `coupRight: engaged`, `coupCall: engaged`. (New `seeds/lib/combat/` directory — the `seeds/lib/locomotion/` sibling.)
- **`packages/server/src/mud/lib/party/Party.ts`** — `formationPath: string = ''` + `roleAssignments: Record<string,string> = {}`, both in `persistentFields`, accessors, `toRecord`/`applyRecord` mirror; `formationPath` joins `subscribableFields` (MQL-visible like `combatSide`).
- **`packages/server/src/mud/lib/party/PartyRecord.ts`** — the two mirrored fields.
- **`packages/server/src/mud/api/party.ts`** — `DEFAULT_FORMATION_PATH` const + the seam statics `formationPathOf` / `roleOf` / `isCaptain` (sync) and the lifecycle statics `setFormation(captain, name)` / `assignRole(captain, role, targetId)` (async, captain-gated) forwarding to logic.
- **`packages/server/src/mud/obj/api/PartyLogic.ts`** — the implementations: `formationPathOfImpl` (the total chain — active party's `formationPath` || `DEFAULT_FORMATION_PATH`), `roleOfImpl`, `isCaptainImpl` (reusing the module's member-ref helpers), `setFormationImpl` (captain gate → resolve `/lib/combat/CombatFormation/<name>` via `StuffApi.singleton` await → set + `persistParty` + `fireChange`), `assignRoleImpl` (captain gate → structural role validation per Decision I → store + persist). No `lib/combat` imports.
- **`packages/server/src/mud/obj/api/CombatLogic.ts`** — `resolveFormationFor(state)` (Decision C); `pickTarget` refactored to the allocation dispatch with **only** the `'sustain'` branch (extracted verbatim — diff-review this hunk character-by-character); `runInterceptionPass(session)` wired at the top of `advanceImpl` but structurally inert for `trigger: 'none'`; `CombatantState.deliberateTarget` stamped in `openSessionImpl`/`joinImpl` (inert this phase, Decision F).
- **`packages/server/src/mud/lib/combat/CombatSession.ts`** — the `deliberateTarget: (Stuff & Engaged) | null` field on `CombatantState`.
- **`packages/server/src/mud/obj/command/combat/AttackController.ts`** — pre-open warm: await `StuffApi.singleton` of both sides' `PartyApi.formationPathOf` (beside the existing `bandFor` await).

### Tests

- `lib/combat/__tests__/CombatFormation.test.ts` — setter validation, `policy()` shape, `DEFAULT_FORMATION_POLICY` value-equals the default seed's data (the fallback-honesty pin).
- `obj/api/__tests__/PartyLogic.test.ts` (extend) — chain totality: partyless → default path; party-that-never-chose → default; `setFormation`/`assignRole` captain-gated; assignments persist through the record round-trip; `roleOf` `''` for unassigned.
- `obj/api/__tests__/CombatLogic.test.ts` (extend) — **byte-parity**: existing 1v1/2v1 session tests unchanged; a new test running a canonical fight with the substrate resident and asserting the identical exchange trace (winner, beat count, resolution).
- `scripts/__tests__/combat-gym.test.ts` — the **pinned regression** (landed first): the canonical matrix's exact winners + beat counts as literal expectations; stays green through the phase.

**Risk/ordering notes.** The `pickTarget` extraction is the riskiest hunk — it must be a pure move. `resolveFormationFor` runs per pick/per pass; it is two map lookups + a frozen-value read — no allocation-per-beat concerns, but keep `policy()` memoized on the Idea. Suite green at the boundary.

---

## Phase 2 — The presets: Focus Fire, Vanguard, Master-Apprentice (allocation + interception live)

### Files

- **`packages/server/src/mud/seeds/lib/combat/CombatFormation/focus-fire.yaml`** — `roles: []`, `allocation: called`, `trigger: none`, `coupRight: engaged`, `coupCall: captain` (the hierarchical preset).
- **`packages/server/src/mud/seeds/lib/combat/CombatFormation/vanguard.yaml`** — `roles: [front, back]`, `allocation: sustain`, `interception: {protects: [back], interceptors: [front], trigger: any}`, `coupRight: engaged`, `coupCall: engaged`.
- **`packages/server/src/mud/seeds/lib/combat/CombatFormation/master-apprentice.yaml`** — `roles: [master, apprentice]`, `allocation: primary`, `interception: {protects: [apprentice], interceptors: [master], trigger: high-threat}`, `coupRight: apprentice`, `coupCall: captain`.
- **`packages/server/src/mud/obj/api/CombatLogic.ts`** — the `'called'` + `'primary'` allocation branches (Decision D/F, each degrading to `'sustain'` when their premise is vacant); `runInterceptionPass` made real (trigger evaluation, priority walk, eligibility dial, roster-order tiebreak, `graph.redirect`, narration call); `calledTargetFor(session, side)` helper reading the captain's state via `PartyApi.isCaptain`.
- **`packages/server/src/mud/lib/combat/CombatNarration.ts`** — `narrateInterception(interposer, protectee, attacker)` — a murmur-intensity beat (per-viewer scene loop, own `commandId`, `noteReactableAct` per the exchange precedent).
- **`packages/server/src/mud/lib/behavior/combatant.ts`** — role-aware gambit bias through the same chain a player resolves (NPC≈PC): a `master`-role brain prefers the feint/guard-breaking line against the primary target (it *creates* openings) and holds the coup-adjacent aggression; every other role keeps today's logic (the apprentice's press already cashes openings). Read via `PartyApi.roleOf` + `CombatApi`-surfaced formation read — the brain touches no graph.
- **`packages/server/src/mud/api/combat.ts`** — a thin read `CombatApi.formationStandingOf(actor)` (resolved formation name + own role, bands-only-shaped) for the brain and the Phase-5 `fight` status; forwards to a gated `CombatLogic` method.
- **`packages/server/src/mud/config/app-settings.yaml`** + **`packages/server/src/mud/lib/config/AppSettings.ts`** — `combat.formation.intercept.maxIncoming` (default `2` — an interceptor already pinned at the focus-fire suppress threshold shouldn't eat more) and `combat.formation.ma.highThreatEdges` (default `2`), with comment blocks per house style.

### Tests

`obj/api/__tests__/CombatLogic.test.ts` (extend; deterministic scripted sessions, no scheduler):

- Focus Fire: a 2v2 side on `called` converges both members' edges onto the captain's deliberate target; `edgeCount ≥ 2` mid-fight (the shipped erosion multiplier compounds); captain down → allocation degrades to `sustain`.
- Solo Focus Fire: a 1v2 where a second foe's join reorders edge insertion — `sustain` would press the first-inserted edge, `called` holds the deliberate target (the target-discipline pin).
- Vanguard: a foe edge onto a `back` member is redirected to the standing `front` member at the top of the next beat; two front members → priority = roster order; no front standing → no redirect (degrade to default); an over-pressed front (≥ `maxIncoming`) is ineligible.
- MA: no redirect below the high-threat threshold; redirect to the master at it; **ally-exploitability pin** — an opening armed on a foe by one ally is cashed by the other ally's next strike through the unchanged `exploit` path.
- Totality: a party of 1 on each preset runs clean (vacant roles inert); determinism — the same scripted multi-party session twice, identical traces.
- `lib/behavior/__tests__/combatant.test.ts` (extend) — role bias reads through the chain; a role-less member behaves exactly as today.

**Risk/ordering notes.** Interception must not fight `defendAllyImpl` — both are `graph.redirect`; the pass runs only at beat-top on a snapshot, so a player interpose mid-beat is never un-done within the same beat (it can be re-triggered next beat, which is correct policy behavior). Gym pin stays green — default-formation paths never enter the new branches.

---

## Phase 3 — Coup governance: right, call, and the accountability facts

### Files

- **`packages/server/src/mud/obj/api/CombatLogic.ts`** — `beginCoup` gains the governance resolution (Decision E): resolve the victor side's formation → executioner by `coupRight` (role-holder standing + co-present, else the engaged attacker); `coupCall: 'captain'` → a module-private pending-coup map (victim-keyed, carrying session/executioner/expiry `ScheduleHandle`) + telegraph narration variant; `orderCoupImpl(captain, target?)` — authority = `PartyApi.isCaptain` on the executioner's side, re-check `coupEligible`, then `startCoup` with the directive recorded; window expiry → spared (`narrateCoupStayed`) + pending cleanup; `recordDeath` fills `formationPath`/`killerRole`/`directedBy` (Decision G). `completeCoup`/`abortCoup`/`coupEligible`/`intervene` untouched.
- **`packages/server/src/mud/api/combat.ts`** — `CombatApi.orderCoup(captain)`.
- **`packages/server/src/mud/obj/command/combat/FightController.ts`** + **`packages/server/src/mud/cmd/combat/fight.yaml`** — the **`fight finish`** subcommand (the captain's execution directive; rejects when no held coup / not the captain). ⚠ *This is the one surface beyond the requirements' decided verb list — necessitated by the engine-initiated-coup mismatch (Decision E). Get explicit sign-off at build start; the fallback design (auto-begin + captain-only `intervene`-window) is noted in the file header if rejected.*
- **`packages/server/src/mud/lib/accountability/AccountabilityEvent.ts`** — the three optional fields on `AccountabilityFields` + `persistentFields` + instance defaults (`''`); `BlameVerdict.commandResponsible` + the derivation line in `deriveBlame` (additive; the crime expression untouched).
- **`packages/server/src/mud/obj/api/AccountabilityLogic.ts`** — pass-through of the new fields (defaults at the append seam).
- **`packages/server/src/mud/config/app-settings.yaml`** + **`AppSettings.ts`** — `combat.formation.coup.directiveWindowSeconds` (default `12` — twice the coup window; long enough for a call, bounded).

### Tests

- `obj/api/__tests__/CombatLogic.test.ts` — default preset: coup auto-begins with the downing attacker, byte-identical (existing tests untouched); MA: the apprentice (not the downing master) becomes executioner; vacant apprentice → engaged attacker; `coupCall: captain`: no auto-begin, `orderCoup` by a non-captain rejected, directive → kill lands, window expiry → spared; attrition path (`checkVitalsResolution`) governed identically.
- `lib/accountability/__tests__/AccountabilityEvent.test.ts` — existing verdict pins unchanged; the divergence case: an unlawful directed MA kill derives `crime: true`, `killer` = apprentice (the deed), `commandResponsible` = master (the responsibility); an undirected kill derives `commandResponsible: ''`.

**Risk/ordering notes.** The pending-coup hold interacts with session teardown (`beginCoup` already `schedule(0)`s past resolution) — the pending map is keyed off the session's lifetime deliberately (the fight has resolved; the body is the referent), with `coupEligible` re-checks doing the safety work exactly as today. Note in passing (do **not** change — byte parity): `completeCoup` computes crime from `session.getTerms()` rather than the per-edge `termsFor`; the new fields ride `recordDeath`, which already uses `termsFor`.

---

## Phase 4 — The `command` Discipline + credit routing

### Files

- **`packages/server/src/mud/seeds/lib/advancement/Discipline/command.yaml`** — key `command`, channel `skill`, `synergizes: [melee-combat]`, no `conferrals` (the `awareness` precedent: competence grades, it doesn't gate); prose: reading a fight and directing others through it.
- **`packages/server/src/mud/obj/api/CombatLogic.ts`** — mint sites (all fire-and-forget, player-driven actors only, the `mintExchangeSignature` parity): `mintCommandDeed(actor, difficulty, outcome)` helper; called from (a) a completed **interception** (the interceptor), (b) a **created opening cashed by an ally** — `CombatantState.openingArmedBy` stamped when an actor's exchange crosses the target into `open`, cleared on consume/lapse; on an `exploit` by a *different, allied* attacker, the armer mints (the master's created-openings), (c) the **called target going down** under `'called'` allocation (the captain's target call, minted once per call at `handleDown`), (d) the **coup directive** (`orderCoupImpl` — the captain's call).
- **`packages/server/src/mud/lib/combat/CombatSession.ts`** — the `openingArmedBy` transient field.
- **`packages/server/src/mud/obj/api/PartyLogic.ts`** — the **formation shift** mints: `setFormationImpl` fire-and-forgets `AdvancementApi.recordDeed(captain, { discipline: 'command', … })` (a new party→advancement import — acyclic, advancement never imports party).

### Tests

- `obj/api/__tests__/CombatLogic.test.ts` — spy `AdvancementApi.recordSignature`/`recordDeed`: interception mints `command` for a player-driven interceptor and nothing for a brain-driven one; the armer-≠-exploiter allied cash mints the armer; the MA division pinned — the apprentice's exchanges mint offensive `melee-combat` sub-checks, the master's mints are `command`-shaped; the default preset mints exactly today's set (no new mints — parity).
- `obj/api/__tests__/PartyLogic.test.ts` — `setFormation` mints the captain's deed; failures never block the switch.

**Risk/ordering note.** The gym cannot witness minting (Grounding: brain-pathed fighters skip it) — the acceptance's signature claims are carried entirely by these spy tests; say so in the MR description.

---

## Phase 5 — The captain surface: `party adopt` / `party assign`, witnessed narration, `fight` status

### Files

- **`packages/server/src/mud/cmd/social/party.yaml`** — subcommands `adopt` (`args: name`; help lists the four presets) and `assign` (`args: role`, `target` — reachable/online object, the `kick` shape).
- **`packages/server/src/mud/obj/command/social/PartyController.ts`** — `executeAdopt` / `executeAssign` branches → `PartyApi.setFormation`/`assignRole`; new `reasonText` entries (`unknown-formation`, `unknown-role`, `not-the-captain` reused); on success the **witnessed narration beat**: one room-scoped `MessageApi.scene` (topic `world.party.formation`, the formation-shift line — "the line reforms around <captain>"), `meta({commandId})` from the context + `ReactionApi.noteReactableAct` (the producer-site capture rule) — the crowd can react to the shift. Mid-fight needs no special casing: the mechanical effect lands next beat via Decision C.
- **`packages/server/src/mud/obj/command/combat/FightController.ts`** — the bare-`fight`/`status` read gains two lines via `CombatApi.formationStandingOf`: `Formation: vanguard` / `Role: front` (own side only; the enemy's formation stays unread — the fog non-goal).

### Tests

- `obj/api/__tests__/PartyLogic.test.ts` — verb-level invariants already covered; add unknown-role rejection with the formation's role list (Decision I).
- `obj/api/__tests__/CombatLogic.test.ts` — the **integration pin**: open a fight on default, `setFormation('vanguard')` mid-fight, assert the very next beat's interception pass acts on it (lands-next-beat).
- A `PartyController`-level test (the controller test convention in `obj/command/**/__tests__` where present, else the Logic-level test carries it) — captain-gating surfaces the right refusal text; the narration scene fires with the command's `commandId`.

---

## Phase 6 — The gym formations matrix

### Files

- **`packages/server/scripts/combat-gym.ts`** — additive: `GymPartySide` (fighters + formation name + role map + band per fighter) and `runPartyMatchup(a, b, …)` — same shape as `runMatchup` but N fighters per side, opening via `openSession` + `join`s, reading per-fighter `down` states; a `setup?: () => Promise<void>` seam so the **test** does the async party wiring (`PartyApi.form`/`enlist`/`setFormation`/`assignRole`) before the sync loop. The gym module still imports nothing from `__tests__` and registers nothing.
- **`packages/server/scripts/__tests__/combat-gym.test.ts`** — a new `describe("combat-gym — the formations matrix")`:
  - **Default byte-parity**: the Phase-1 pinned cells re-asserted with parties formed on the default formation — identical winners + beats to the partyless pins (the "a party that never chose" acceptance) — and the untouched original pins still green.
  - **Focus-Fire convergence**: 2v2 called-side downs the called target in strictly fewer beats than the same matchup on default (the erosion compounding, observable); the solo 1v2 target-discipline cell.
  - **Vanguard interception**: the back-role fighter's incoming edge count stays 0 while a front stands; front down → edges reach the back (degrade).
  - **MA emergent**: (a) `master` band `expert`-tier + `apprentice` `untrained` vs two `standard` foes → the side sustains (apprentice never downed, fight won); (b) the same roles both `untrained` → the side loses; (c) a solo `untrained` fighter under MA (vacant apprentice) vs the same foes → downed. No reward knobs anywhere — the cells prove the economy holds on poise + competence alone.
  - Determinism: one formation cell run twice, bit-identical.

**Risk/ordering note.** Each cell runs in the harness's clean-world reset (the weapon-matrix precedent) — party Ideas from a prior cell must be reset with the rest of the registry, or formed fresh per cell (the `setup` hook makes this the test's explicit responsibility).

---

## Phase 7 — Demonstrator + documentation

### Demonstrator (Decision H — no new NPC)

- **`packages/server/src/mud/seeds/domain/newbie-wilds/npc/sellsword.yaml`** — prose touch only: the long description + an idle line acknowledge line-holding ("she takes the front and holds it"), and the file's comment header documents the Vanguard demo script (recruit → `party adopt vanguard` → `party assign front sellsword` → `party assign back` self → `attack the gentleman --lethal` in the hollow → watch the duelist's edge onto you intercepted to her next beat, narrated).
- End-to-end verification against a live server is part of this phase's definition of done (the interception narration, the `fight` status lines, the witnessed formation-shift beat, the coup governance on the duelist's fall).

### Documentation

- **`docs/subsystems/combat-formations.md`** (new; finalize may fold it into combat.md §, per the requirements' finalize's-call) — the formation Idea + the total chain, the three hooks with their exact seats, the presets, coup governance + the command-responsibility derivation, the `command` Discipline, the gym matrix, the deferred list (Skirmish/ranged, Phalanx, enemy-formation `assess` read, explicit call verb, shift-cost knobs, `CombatPane` selector).
- **`docs/subsystems/combat.md`** — drop "party tactic-roles" from § Deferred; add the cross-reference + a History entry.
- **`docs/subsystems/party.md`** — the seam grows (`formationPathOf`/`roleOf`/`isCaptain`), the two new fields, the two new subcommands; drop "tactic-preset roles" from § Deferred.
- **`docs/subsystems/accountability.md`** — the death-row context fields + `commandResponsible`.
- **`docs/subsystems/advancement.md`** — the `command` leaf joins the seeded roster.
- **`CLAUDE.md`** doc-map line for the new subsystem page.

---

## Rollups

### New AppSettings dials (all `combat.formation.*`; shape in code, magnitudes here)

| Key | Default | Meaning |
|---|---|---|
| `combat.formation.intercept.maxIncoming` | `2` | An interceptor already pressed by this many incoming edges is ineligible (the pressure-threshold eligibility clause) |
| `combat.formation.ma.highThreatEdges` | `2` | MA's `high-threat` trigger: intercept when the protected role's incoming edge count reaches this |
| `combat.formation.coup.directiveWindowSeconds` | `12` | How long a captain-call coup is held awaiting `fight finish` before the fallen is spared |

### Collections

**None new.** `accountability_events` rows gain three optional fields (`formationPath`, `killerRole`, `directedBy`) with `''` defaults — additive, no migration (pre-release dev-DB posture per the accountability precedent). `parties` records gain the two mirrored party fields — same posture.

### Acceptance criteria → phase traceability

| Acceptance criterion | Phase |
|---|---|
| Party of 1 / any preset / vacant roles inert / partyless → default, no null branch | 1 (chain + totality), 2 (per-preset totality tests) |
| Default-formation combat byte-identical (gym pin) | 1 (pin landed first), 6 (re-asserted with parties) |
| Focus Fire convergence + erosion compounds + solo target discipline | 2 (unit), 6 (gym) |
| Vanguard next-beat redirect + priority + no-front degrade | 2 (unit), 6 (gym), 7 (in-world) |
| MA emergent claim + signature division + ally-exploitability pin | 2 (exploit pin), 4 (signature spies), 6 (gym cells) |
| Coup: role-holder only, captain's call, death-row context, credit/blame divergence | 3 |
| `party adopt`/`assign` captain-gated; next-beat switch; witnessed beat; `fight` shows formation+role | 5 (verb + narration; switch mechanics from 1/Decision C) |
| `command` Discipline seeded; interceptions + calls mint | 4 |
| In-world demonstrator, newbie-wilds-reachable | 7 |
| Subsystem doc + combat.md Deferred drop | 7 |
| Full suite + gym determinism green | every phase boundary |

### Flagged mismatches / sign-offs for the build agent

1. **The coup is engine-initiated as-built** (no coup verb, one auto-selected executioner) — governance re-points the auto-selection and adds the captain-directive hold + the **`fight finish`** subcommand (Decision E). The subcommand is the one surface beyond the requirements' decided verb list; confirm with the user before Phase 3.
2. **The Focus-Fire "called target" is derived** from the captain's own deliberate engagement (Decision F) — no call verb exists in the decided surface; flag if an explicit call is wanted.
3. **Gym matchups mint no signatures** (brain-driven actors skip minting) — the signature acceptance is proven by unit-test spies (Phase 4), the sustainability acceptance by gym cells (Phase 6).
