# Combat — the experience/feel pass — implementation plan

Implements [combat-experience-requirements.md](../requirements/combat-experience-requirements.md)
over the merged combat engine (1v1 core builds 1+2 + multi-party cycle 2).
Five pieces: **the feint gambit**, **the fog/read**, **the combat gym**,
**beat-intensity + crowd-roar**, and **the composure modulation seam**.
Terminal 1v1 focus; NPC≈PC; zero new aleatory randomness.

Branch: `feature/combat-experience` (off current master, `46143d72`).

Every claim below is grounded in the real code (file:line). Follows the
build-1/2/cycle-2 rhythm: **pure value-objects unit-tested standalone,
engine wiring integration-tested through `CombatApi`, validated by a live
demo.** Style: match each touched file's existing quotes — `lib/combat/` is
**double-quoted**; **never run prettier**.

---

## Design resolutions (the load-bearing investigations)

### 1. Determinism — the exchange path is ALREADY deterministic; lock it, don't seed it

A full audit of the beat/exchange/tempo/poise path (`lib/combat/*` +
`CombatLogic.ts`) for nondeterminism found:

- **No `Math.random` anywhere in combat.** None.
- The only `Date.now()` calls are outcome-irrelevant telemetry/ledger
  (`CombatSession.ts:311` hold `startedAt`; `Coup.ts:87`;
  `CombatLogic.ts:1115` attribution `realAt`) — none feeds
  `decideOutcome`/poise/tempo.
- The only `SecurityApi.uuid()` calls are identity strings (`sessionId`,
  narration `commandId`) — not the mechanic.
- Ordering is deterministic: `CombatSession.states` is insertion-ordered
  (`getStates()` → `[...values()]`, `CombatSession.ts:202`);
  `CombatGraph.edges` is an array with stable filters; `pickTarget`
  (`CombatLogic.ts:389-405`) walks insertion-ordered collections.
- `Tempo` fractional carry (`Tempo.ts:109-114`) is pure float arithmetic —
  reproducible.
- **The one live hazard is async brain intent.** `invokeBrain`
  (`CombatLogic.ts:882-911`) tolerates a returned promise; if a brain queued
  intent asynchronously, the beat reading `queuedGambit` could race. The
  shipped `combatant` brain (`lib/behavior/combatant.ts:28-62`) is fully
  synchronous, so today it's safe.

**Verdict:** a single session with fixed inputs already resolves bit-for-bit
identically for the mechanically-relevant state. No RNG seeding. The plan
must only (a) add a **single-session-determinism guard test**, (b) establish
the invariant **combat brains + gym policies resolve intent synchronously**
(doc + the new feint policy honors it), (c) keep the feint's "bite vs read"
a pure function of competence-derived sharpness + fog (never a die), and (d)
**snapshot competence synchronously at open** (§5) so the fog band lands at a
deterministic beat.

### 2. The feint mechanic — closes rock-paper-scissors: strike ▸ feint ▸ defend ▸ strike

The exchange lives in `resolveExchange` (`CombatLogic.ts:479-591`) →
`decideOutcome` (`601-617`). The two existing outcomes that matter:

- **`parried`** (`553-560`, `decideOutcome:614-616`): a `steady`+armed
  defender turns the blow (`steadyGuard = band()==='steady' &&
  targetCanParry`), the attacker pays `overextendCost`, then
  `reactiveDispatch` (`619-643`) fires the defender's `riposte`. **This is
  the turtle seam** — an always-steady armed defender parries + ripostes
  every strike, so patience dominates.
- **`exploit`** (`572-581`): when `targetState.poise.isOpen()`, the strike
  consumes the opening (`Poise.consumeOpening`, `Poise.ts:159-163`) and
  `commitInflict`s at `energyFor("open")` (the hardest hit), then
  `handleDown`. **The opening IS the earned crit.**

**The feint** (chosen mechanic — two-beat, reuses the exploit path):
- A `feint` gambit **presents as bait**. Its resolution reads the defender's
  *commitment*: committed iff they would parry (`band()==='steady' &&
  targetCanParry`) or have a defensive/reactive gambit queued.
- A committed defender who **fails to read** it (sharpness below the feint's
  read gate, hedged by fog — §3) → new outcome **`feint-bit`**: spend a large
  chunk of the *defender's* poise (`combat.poise.feintBitPenalty`), driving
  them across the break floor and **arming their opening** via the existing
  `Poise.lower` crossing (`Poise.ts:165-176`). The attacker pays only
  `combat.poise.feintCost` (bait is cheap → aggression rewarded vs a turtle).
  The feinter's **next strike** lands through the **unchanged** `exploit`
  path — no new inflict site.
- A defender who **reads** it (sharpness ≥ gate) or is **not committed** (a
  mid-strike aggressor, not turtling) → **`feint-read`**: the feint fizzles,
  attacker eats `feintCost` for nothing. This is why a pure aggressor beats a
  feinter (strike ▸ feint), and why skill lets you not be baited.

Slots in with: one new `GambitSpec` (`Gambit.ts:69`), two new `OutcomeKind`s
(`feint-bit`/`feint-read`, `CombatLogic.ts:593-599`), two `resolveExchange`
switch arms, a narration outcome. **No base-class change, no new Stuff**,
reuses `eligibilityImpl` (`924-943`) + the opening/exploit machinery.
*Decision (was a flagged risk): the two-beat arming is chosen over a
one-beat immediate-inflict feint — the latter adds an inflict site and risks
a strictly-better-than-strike degenerate the gym would flag.*

### 3. The fog/read — a real extension (assess has NO competence hedge today)

`assessImpl` (`CombatLogic.ts:1518-1537`) → `CombatAssessResult`
(`combat.ts:37-48`) returns the opponent's **raw** `poiseBand`
(`oppState.poise.band()`) — there is **no competence hedge yet** (the
requirements slightly overstated this; the `wrong-band` token exists only as
a `GambitEligibility` reason at `combat.ts:59`, not in assess). So the fog is
a genuine extension.

**`lib/combat/CombatFog.ts`** (new pure value-object) —
`CombatFog.perceive(trueBand, sharpness, feinting) → { band, tell }`, a
**deterministic distortion**:
- sharpness ≥ `combat.fog.clearSharpness` → true band; a feinting opponent
  flagged (`tell: "feint"`). "Sees signal."
- low sharpness → band shifted one step toward `steady` (opponent looks
  calmer than they are), and a **feinting opponent reads as `open`**
  (bait-as-real-opening — the trap). Deterministic step, no die.

`assessImpl` + the `FightController` status read resolve the actor's
sharpness (§5) and pass the opponent's true band through `CombatFog`;
`poiseBand` becomes the *fogged* band (true numeric poise never leaves
`Poise`). **The same `CombatFog`/sharpness gate decides whether a defender
bites a feint (§2)** — fog and feint-read are one mechanism. Two-tier tested
by seeding `state.sharpness` directly.

### 4. The gym — headless, loops `CombatApi.advance`, no scheduler

`CombatApi.advance(session)` (`combat.ts:92` → `CombatLogic.advance:96-98` →
`advanceImpl:437-471`) drives exactly one beat synchronously. **The unit
tests already loop it to resolution with no scheduler** (`CombatLogic.test.ts:321-323`,
`:449-451`, `:483-487`: `while (session.isActive() && beats<200)
CombatApi.advance(session)`). This is the gym's driver verbatim.

Fights stand up **fully headless — no Mongo, no real room**: `makeFighter`
(`CombatLogic.test.ts:81-131`) builds `Character`+`Species`+`BodyPlan` via
`makeStuff`, moves into a `TestRoom` (`ContainerMixin(Idea)`), occupies a
`Weapon`. Beat async touches are all fire-and-forget + error-swallowed
(`mintExchangeSignature` `.catch`, `recordAttribution`, `runResolutionConsumers`
try/catch) — none blocks the beat. Boot need: `bootRegistry` +
`installV1QuantityMarshallers` + `SchedulerApi` reset (`CombatLogic.test.ts:133-190`).

**Gym architecture** (`scripts/` dev harness — NO Api, verb, or world state):
- **`scripts/combat-gym.ts`** — pure exported logic: `MatchupSpec` (loadout ×
  terrain-modifier × per-side `Policy`), `Policy = (state) => gambitKey`,
  `runMatchup(makeSideA, makeSideB, opts)` that opens a session and each beat
  **pre-queues each combatant's policy gambit then calls `CombatApi.advance`**
  to resolution, returning `CombatResolution` + beat count + final condition
  bands. `runMatrix(specs, N)` tallies the **outcome distribution** + win-rate
  **bands**. Variation across runs is by **matchup index** (loadout/policy
  permutation), never RNG. Takes fighter-factory callbacks as inputs, so it
  imports nothing from `__tests__` (sealed-subdir lint).
  - Pre-queuing overrides the brain because `advanceImpl:449-450` only invokes
    a brain when `!s.queuedGambit`; a fully-specified policy leaves no gap.
- **`scripts/__tests__/combat-gym.test.ts`** — colocated vitest bench
  (precedent: existing `scripts/__tests__/*.test.ts`). Provides the headless
  fighter factory (reusing `lib/security/__tests__/test-setup` the way
  `CombatLogic.test.ts` does), wires `runMatrix`, and asserts the acceptance
  bands: (a) turtle-vs-aggression+feint is a **contested** band, not ~100/0
  (**the parry seam is dead**); (b) a mirror matchup is symmetric within band
  (**NPC≈PC parity**); (c) a degeneracy check (no loadout/policy never
  loses); (d) single-session determinism (same spec → identical outcome
  twice). Runs in the normal suite in seconds.

### 5. The composure/sharpness seam — one scalar, competence-only today

`deriveState` currently hardwires `competence: 1` (`CombatLogic.ts:352-354`).
Introduce **`lib/combat/Sharpness.ts`** (new pure value-object):
`Sharpness.resolve({ competenceBand, composure? }) → number` in `(0,1]`,
shaped `f(competence) * g(composure)` with `g ≡ 1` today (composure
absent/defaulted). This one scalar modulates **both**:
- **poise recovery** — `resolveExchange`'s `defend` branch
  (`CombatLogic.ts:504-506`) scales `restorePerDefense` by sharpness;
- **the read-fog** — the sharpness fed to `CombatFog` (§3) + the feint-read
  gate (§2).

`traits-stress` later fills `composure` (the second input) **without touching
`resolveExchange`/`decideOutcome`** — it only supplies `g`. A unit test seeds
a stubbed composure and asserts the factor composes (present-but-inert).

**Competence snapshotted synchronously at open** (determinism): `AdvancementApi.bandFor`
is async (`advancement.ts:120`), unreadable mid-beat. `AttackController.execute`
is already async (`AttackController.ts:82`): it `await`s each side's
`melee-combat` band and passes them into `openSession` via a new optional
`CombatOpenOptions { competenceBands?: Map<durableId, CompetenceBandName> }`;
`deriveState` seeds `state.competenceBand` (default **`untrained`** when
absent — bare/test/gym/NPC-vs-NPC). `joinImpl` mirrors for the joiner.
Tests/gym seed `competenceBand`/`sharpness` directly (deterministic,
two-tier-testable, no Mongo).

### 6. Beat-intensity + crowd — grade the flat `dramatic` boolean

Narration is emitted per beat by `narrate` (`CombatLogic.ts:847-878`) →
`CombatNarration.narrate` (`CombatNarration.ts:118-152`), which pokes
reactions **only when `report.dramatic`** (`141-150`) via
`ReactionApi.noteReactableAct`. `world.combat.exchange` is already in
`REACTABLE_TOPICS` (`reaction.ts:48`).

**Beat-intensity** replaces the flat boolean with a graded
`intensity: "silent" | "murmur" | "roar"` computed where `narrate` is called,
from deltas already in hand:
- **roar** — first-blood (first session trauma), the **break**
  (`openingCracked`/`openingExploited`, already at `CombatLogic.ts:874`), the
  down/kill (`handleDown`/`endWith`).
- **murmur** — ordinary landed hit / a `pressed`/`reeling` escalation.
- **silent** — whiff / clean parry with no state change.

Add a session `bloodDrawn` flag (`CombatSession.ts`, set on first landed
trauma) for the first-blood roar. Thread `intensity` on `ExchangeReport`
(`CombatNarration.ts:64-93`). `CombatNarration`:
- **scales prose** — a roar adds the swell register `composeExchangeLine`
  (`CombatNarration.ts:426-514`) already supports; a murmur stays flat;
- **volume-gates reactions** — replace the `report.dramatic` gate with
  `intensity !== "silent"`, so ordinary beats stay silent and murmur/roar
  beats note the reactable act. **This is the existing `noteReactableAct`
  seam — no parallel broadcast path.**

*Scope note (flagged risks 3+4): the reactions substrate carries no per-act
intensity weight — its "volume" is reactor-count fan-out suppression. So
beat-intensity gates **whether** `noteReactableAct` fires and scales the
**narration** swell; the murmur/roar distinction lives in prose, not in the
reaction tally. In an empty-room duel the "crowd roar" is primarily the
narration swell (the reactable-act seam lets present players/NPCs react); an
automated crowd is a bystander-brain concern, out of scope.*

Thresholds live as `combat.intensity.*` dials.

---

## Phased plan

### Phase 0 — Determinism guard (lock the §1 verdict)
- **Test only** (`CombatLogic.test.ts`): a fixed matchup run to resolution
  twice → identical `getResolution()`, beat count, each side's final
  `getConditionBand()`. Assert/comment the sync-intent invariant.
- No production change — codifies determinism before feint/fog perturb the path.

### Phase 1 — The feint gambit
- **`lib/combat/Gambit.ts`** — add a `feint` `GambitSpec` (`kind:"feint"`,
  extend `GambitKind` `:27`; `needsInstrument:true`, `offensive:false`,
  read-gate note).
- **`obj/api/CombatLogic.ts`** — `decideOutcome`: `feint-bit`/`feint-read`
  (+ `OutcomeKind` union `:593-599`); `resolveExchange`: two switch arms
  (feint-bit spends `feintBitPenalty` on defender + arms opening via
  `Poise.lower`, `feintCost` on actor; feint-read spends only `feintCost`); a
  `readsFeint(defenderState, actorFeinting)` helper delegating to
  `CombatFog`/`Sharpness` (lands in P3/P4).
- **`lib/behavior/combatant.ts`** — feint policy: feint a steady/armed
  (turtling) foe instead of striking into the guard; hold when overextended.
  Synchronous.
- **Command surface:** `FightController.ts` add `feint` to `GAMBITS` (`:33`);
  `cmd/combat/fight.yaml` `feint` subcommand + help.
- **`lib/combat/CombatNarration.ts`** — feint outcome lines (bait / read-through).
- **Tests:** `Gambit` catalog unit (feint present); `CombatLogic.test.ts` (a
  committed low-sharpness defender bites → opening armed → next strike
  exploits → down; a high-sharpness defender reads it → no opening);
  `CombatNarration.test.ts` feint lines.

### Phase 2 — The fog / the read
- **`lib/combat/CombatFog.ts`** (new pure value-object) — deterministic
  distortion; unit-tested standalone (two tiers × feint on/off), no I/O.
- **`obj/api/CombatLogic.ts`** — `assessImpl` runs `oppState.poise.band()`
  through `CombatFog` with the actor's sharpness; add optional `tell`/`read`
  to `CombatAssessResult` (`combat.ts:37-48`) so a clear read surfaces "you
  see the feint."
- **`obj/command/combat/FightController.ts`** — the banded opponent line uses
  the fogged band (same helper).
- **Tests:** `CombatFog` units; `CombatLogic.test.ts` assess at two seeded
  sharpness tiers.

### Phase 3 — The composure / sharpness seam
- **`lib/combat/Sharpness.ts`** (new pure value-object) —
  `resolve({competenceBand, composure?})`, `f(competence)*g(composure)`,
  `g≡1`. Unit-tested incl. a stubbed composure that composes.
- **`obj/api/CombatLogic.ts`** — `CombatantState` (`CombatSession.ts:76-103`)
  gains `competenceBand: CompetenceBandName` (+ optional `sharpness` cache);
  `deriveState` (`345-370`) seeds it; `sharpnessFor(state)` used by
  defend-recovery scaling (`504-506`) + the fog/feint-read.
- **`obj/command/combat/AttackController.ts`** — `await AdvancementApi.bandFor`
  both sides, pass via `CombatOpenOptions` into `openSession` (`combat.ts:83-89`
  + `CombatLogic.ts:87-93`); `joinImpl` mirrors for the joiner.
- **Tests:** `Sharpness` unit; `CombatLogic.test.ts` (a sharper fighter
  recovers more poise per `defend`).

### Phase 4 — The combat gym harness
- **`scripts/combat-gym.ts`** (new) — pure `MatchupSpec`/`Policy`/`runMatchup`/
  `runMatrix`; distribution + win-rate bands + degeneracy check; registers
  nothing.
- **`scripts/__tests__/combat-gym.test.ts`** (new) — headless factory + the
  reference matrix + the acceptance-band asserts (turtle-not-dominant,
  mirror-symmetric, no never-losing loadout, single-session determinism).

### Phase 5 — Beat-intensity + crowd-roar
- **`lib/combat/CombatSession.ts`** — `bloodDrawn` flag (getter/setter).
- **`obj/api/CombatLogic.ts`** — compute `intensity` at the `narrate` call
  (`847-878`) from first-blood/break/down; set `bloodDrawn` on first trauma.
- **`lib/combat/CombatNarration.ts`** — `ExchangeReport.intensity` (`:64-93`);
  `narrate` gates `noteReactableAct` on `intensity !== "silent"` (replacing
  `dramatic`, `:141-150`); `composeExchangeLine` scales register by intensity.
- **Tests:** intensity signal unit (first-blood/break/down → roar; whiff →
  silent); reactions-poke test (silent → no poke; roar → poked) reusing the
  reaction test seams (`reaction.ts:271-299`).

### Phase 6 — AppSettings dials
- **`config/app-settings.yaml`** (`:302-368`) + **`lib/config/AppSettings.ts`**
  (`:384-434`) — add: `combat.poise.feintCost`, `combat.poise.feintBitPenalty`,
  `combat.feint.readSharpness`, `combat.fog.clearSharpness` (+ distortion-step
  if needed), `combat.sharpness.min`/`max` (the competence→sharpness curve),
  `combat.intensity.murmur`/`roar` gates. All via the `dial()` numeric
  fallback (`CombatLogic.ts:188-197`); band/sharpness gates stored as numeric
  thresholds in `[0,1]`, not band strings.
- **`src/backend/__tests__/AppSettingsSeeder.test.ts`** — bump `expect(added)`
  (currently `101`, `:44`) to `101 + N` and add the fully-populated
  idempotent-row keys (`:60-80+`). *Move both together or the seeder test fails.*

### Phase 7 — Live demo + docs (finalize-adjacent)
- **Live demo:** a duel where an aggression+feint player visibly beats a
  turtling defender, with the crowd roaring at the break (the build-1/2/cycle-2
  integration-by-demo pattern). Reuse the headless-driver approach if useful.
- **Docs:** `docs/subsystems/combat.md` — the feint gambit, the fog/read, the
  beat-intensity arc, the gym as the balance tool, the composure seam; move
  the matching `§ Deferred` items out (`combat.md:459-481`: "the combat gym",
  the "steady armed defender always parries" seam); tick the realized theses
  in `combat-experience-slate.md`; doc-map + architecture entries at finalize.

---

## New / changed files (representative)

**New**
- `src/mud/lib/combat/CombatFog.ts` — deterministic banded/competence-hedged read.
- `src/mud/lib/combat/Sharpness.ts` — the composure/luck modulation scalar (competence-only).
- `scripts/combat-gym.ts` + `scripts/__tests__/combat-gym.test.ts` — headless matchup runner + bench.
- `src/mud/lib/combat/__tests__/CombatFog.test.ts`, `Sharpness.test.ts`.

**Changed**
- `src/mud/lib/combat/Gambit.ts` — `feint` spec + `GambitKind`.
- `src/mud/obj/api/CombatLogic.ts` — feint outcomes, fog in assess, sharpness
  modulation, intensity, `CombatOpenOptions`.
- `src/mud/lib/combat/CombatSession.ts` — `CombatantState.competenceBand`, `bloodDrawn`.
- `src/mud/lib/combat/CombatNarration.ts` — feint lines, `intensity` + reaction gate.
- `src/mud/api/combat.ts` — `CombatOpenOptions`, `CombatAssessResult.tell/read`.
- `src/mud/lib/behavior/combatant.ts` — feint policy.
- `src/mud/obj/command/combat/{FightController.ts,AttackController.ts}` + `src/mud/cmd/combat/fight.yaml`.
- `src/mud/config/app-settings.yaml`, `src/mud/lib/config/AppSettings.ts`,
  `src/backend/__tests__/AppSettingsSeeder.test.ts`.
- `src/mud/obj/api/__tests__/CombatLogic.test.ts`.
- `docs/subsystems/combat.md`, the slate.

---

## Verification
- **Targeted vitest:** `CombatLogic.test.ts`, `CombatFog.test.ts`,
  `Sharpness.test.ts`, `Gambit.test.ts`, `CombatNarration.test.ts`,
  `scripts/__tests__/combat-gym.test.ts`, `AppSettingsSeeder.test.ts`; then the
  full server suite.
- **The gym bench** is the balance regression guard (turtle-not-dominant band,
  mirror symmetry, no never-losing loadout, single-session determinism).
- **`tsc --noEmit`** (noUncheckedIndexedAccess on — index every new array/map
  access defensively).
- **`pnpm lint:gates`** (no new gate strings expected; `CombatApi` reused) +
  the sealed-subdir rule (the gym script imports nothing from `__tests__`).
- **`pnpm lint`** clean (match per-file quote style; never prettier).
- **Live demo** — the feint-beats-turtle duel with the crowd roar.

---

## Decisions taken (from Plan-phase risk flags)
1. **Quote style** — match each touched file; `lib/combat/` is double-quoted;
   never run prettier (no config exists).
2. **Feint = two-beat** (arm the opening → exploit on the next strike, reusing
   the exploit path) — over a one-beat immediate-inflict feint (extra inflict
   site + degenerate risk the gym would flag).
3. **Volume-gate fidelity** — intensity gates *whether* `noteReactableAct`
   fires + scales narration prose; it does NOT inject a weight into the
   reaction counter (the substrate has none).
4. **The "crowd" in an empty room** = the narration swell; the reactable-act
   seam lets present witnesses react; an automated crowd is out of scope.
5. **Competence snapshot** is "real" for player-initiated fights (the
   controller awaits `bandFor`); other open sites (join, gym, NPC-vs-NPC)
   default to `untrained` sharpness — accepted for v1; the join path is wired
   too.
6. **Dial count** (~8–10 `combat.*` keys) firms up in Phase 6; the seeder
   literal + idempotent-row key list move together.

## Deferred (named, not built)
The composure/luck axis itself (→ `traits-stress`), a broader deception menu,
weapon playstyle, any in-world gym surface, final number-tuning, and
aftermath/morale/stealth/bestiary — per the requirements' Non-goals.
