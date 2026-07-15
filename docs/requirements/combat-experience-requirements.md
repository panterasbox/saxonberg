# Combat — the experience/feel pass — requirements

The first **experience-layer** build over the merged combat mechanism
(1v1 core builds 1+2 + multi-party cycle 2). The mechanism *works* — a
fight happens, resolves, and has consequences — but it doesn't yet *feel*
right, and we can't *prove* it's balanced. Two live demos exposed the same
seam: a steady armed defender **always** parries, so blind patience beats
aggression and the exchange has no read-and-react tension. This build makes
the exchange **poker, not slots** (uncertainty is epistemic — you lose
because you *misread*, never because a die spiked), lands the **combat gym**
(a headless balance harness that proves the fix and de-risks all future
combat tuning), and adds the **dramatic-arc punctuation** that makes the
poker layer *land* — the crowd roars when the guard breaks.

Seeded by [combat-experience-slate.md](../slates/deferred-rpg/combat-experience-slate.md)
(Theses 2, 3, 4, 9, 10; Thesis 5 left as a declared seam). Mechanism half:
[combat-slate.md](../slates/deferred-rpg/combat-slate.md) OQ1 (the
competence→exchange-rate curve — "structure sound, numbers are the risk";
the gym is how we find the numbers). Consequence engine (built):
[materials-response.md](../subsystems/materials-response.md).

## Goals

- **The exchange is a read-and-react contest, not a war of patience.** A
  predictable defender can be *punished*: committing to an obvious
  parry/counter every beat is exploitable, so aggression and patience each
  have a counter (the rock-paper-scissors closes). The dominant "turtle and
  wait" line is gone — provable in the gym.
- **The feint ships as the net-new gambit** — a real gambit that *presents
  as* an opening or bait, drawing the defender's committed parry/counter so
  the true blow lands into the gap they opened. Fills the `Gambit.ts`
  already-named-deferred `feint` seam (the "four-channel breadth
  feint/read/command" comment).
- **The read is fogged.** The opponent's poise/intent is surfaced *banded
  and competence-hedged* (extending the existing `assess` `poiseBand`):
  a low-competence reader sees noise (and can be shown a *wrong* band or a
  feint-as-opening); a high-competence reader sees signal. Skill shrinks the
  fog. **The fog is the only "dice."**
- **Uncertainty stays epistemic — zero new aleatory randomness.** No to-hit
  dice, no damage rolls, no crit dice. Severity stays the deterministic
  materials-response function; a "miss" stays a *caused* event (parried /
  overextended / misread). The crit stays **earned** — the opening *is* the
  crit, and a called-shot aims at the exposed gap during a break.
- **The combat gym exists and is CI-runnable.** A headless in-process
  harness spins up two Characters × loadout × terrain, drives the session to
  resolution synchronously (looping the existing `CombatLogic.advance`
  beat-step — no scheduler, no wall-clock), ×N, and reads the outcome
  distribution. It asserts win-rate **bands** for reference matchups and
  flags **degeneracies** (a dominant line, a never-losing loadout). It is
  the regression guard that keeps combat balanced as later builds land.
- **The dramatic arc is legible.** A per-beat **beat-intensity** signal
  drives narration and the **reactions substrate volume-gates to it** — a
  `pressed` beat is a murmur, first-blood / the break / the down are roars.
  "The crowd roars" *is* the engagement feedback telling the player the beat
  mattered.
- **NPC ≈ PC parity holds and is asserted.** The gym runs brain-vs-brain and
  confirms an NPC is beatable by exactly the means a PC is — one model, no
  hidden monster rules. The only divergence is who steers (brain policy vs
  player intervention).
- **The composure/luck axis is left as a clean seam, not built.** Poise
  recovery and read-fog take a pluggable modulation factor (competence
  supplies it today); the bidirectional composure state that later fills it
  is deferred to `traits-stress`.

## Non-goals

- **The composure/luck axis itself** (Thesis 5) — the bidirectional
  stress/inspiration emotional reserve. Deferred to the `traits-stress`
  build; this build leaves only the modulation seam. ([trait.md](../subsystems/trait.md))
- **A broader deception menu** — false-opening, guard-baiting, bluff-stacking.
  The feint is the one net-new read gambit this pass; the wider mind-game is
  deferred.
- **Weapon playstyle / hand-slot economy** (Thesis 14) — reach/guard/balance
  as derived, `balanceFactor` from construction. Its own later build.
- **An in-world gym surface** — no `CombatGymApi`/`gym` verb, no world state.
  The gym is a dev harness (`scripts/` + a bench test), invoked from the
  test runner, not in-game. (Decided below.)
- **Number-tuning to final values** — the gym *finds* the numbers; this
  build ships the tool + defensible reference bands, not a finished tuning
  table. Numbers stay deferred (the slate's standing rule).
- **Aftermath / de-escalation / morale** (Theses 11–13), stealth, the chase,
  the bestiary — other builds.

## Surface decisions

### The combat gym is a headless dev harness (no Api, no verb)
A `scripts/combat-gym.ts` bench plus a colocated vitest that instantiates
Characters + loadout + terrain in-process, drives sessions to resolution,
and asserts outcome-distribution bands. **No** `CombatGymApi`, **no** `gym`
verb, **no** world state — it rides the "determinism enables automated
balance-testing" property and lives with the other dev tooling
(`project-author-surface.ts`, `check-gate-strings.ts` precedent). Rationale:
cheapest, matches the tool's nature (a balance instrument, not a game
surface), and keeps the module taxonomy clean. A wizard-facing `gym` verb
was considered and rejected as unneeded surface for a dev tool.

### The poker layer is feint + fog (the minimum that kills the seam)
One net-new gambit (the **feint**) plus the competence-hedged banded
enemy-poise/intent **fog**. This is the smallest change that makes patience
exploitable and turns the exchange into read-and-react. The broader
deception menu is deferred — the feint alone closes the rock-paper-scissors
the seam is missing, and the gym proves it.

### The arc/crowd slice is in scope
The beat-intensity signal + reactions volume-gating ships now, not deferred.
Both substrates already exist (`CombatNarration` reads poise-band
escalation; the reactions substrate volume-gates fan-out), so it's cheap,
and it's the felt payoff that makes the poker layer read as a win rather
than an invisible mechanic change.

### The gym drives the session synchronously via the existing beat-step
The cycle-2 rewrite put the beat on a real-time `ScheduleApi.recurring`
tick. The gym must NOT wait wall-clock — it loops the already-public
`CombatLogic.advance(session)` beat-step (what the unit tests use) to
resolution. No new "step" surface is invented; if a thin deterministic
driver seam is needed it is a test-facing reuse of `advance`, not a new
scheduler mode. Bleed/game-time effects the gym needs are advanced through
the same synchronous path the tests already exercise.

### Composure is a pluggable modulation factor, filled by competence today
Poise-recovery and read-fog resolve a single scalar "sharpness" modulation.
This build wires competence into it (the existing hedge). The seam is shaped
so `traits-stress` can later add composure as a second input without
touching the exchange engine.

## Constraints

- **No new aleatory randomness anywhere** (the carved-in-stone slate line).
  Randomness may add rare *environmental* chaos (out of scope here) but may
  never be why a skilled plan failed. The feint's uncertainty is another
  mind's real choice + the competence-hedged fog, not a die. Any `Math.random`
  in the exchange path is a violation. (The gym itself may seed variation
  across runs — matchup/loadout permutation — but a *single* session stays
  deterministic given its inputs; note `Math.random`/`Date.now` are banned in
  workflow scripts, so the gym seeds variation by matchup index, not RNG.)
- **Bands, never numbers, at every readout** — the fog surfaces poise/intent
  as bands (the `banding = presentation not security` rule); the opponent's
  true numeric poise never leaks. The gym reads real distributions internally
  but reports banded win-rates.
- **The feint is a `Gambit`, composed into the existing catalog** — not a
  new Stuff class, not a base-class change. It reuses the reactive-dispatch
  and eligibility (`CombatApi.eligibilityFor`) machinery; injury still edits
  the menu.
- **NPC and PC run the identical model** (Thesis 10) — the feint and the fog
  apply to both; the `combatant` brain gains feint/read policy, but through
  the same `CombatApi` surface a player uses. No monster-only path.
- **The gym is dev-only and must not regress boot or ship a world surface** —
  it imports the combat engine and drives it headless; it registers nothing,
  seeds nothing, adds no collection.
- **All new dials are `combat.*` AppSettings** (the established combat
  convention) with the seeder key-count bumped; no code-literal constants.
- **Reuse, don't fork, the narration + reactions substrates** — beat-intensity
  extends `CombatNarration`'s existing witness walk and pokes the existing
  reactions volume-gate; no parallel broadcast path.

## Acceptance criteria

- **The parry seam is dead, provably.** In the gym, a "turtle" policy
  (always defend/parry) does **not** dominate an aggression-with-feint
  policy across the reference matchups; win-rate sits in a contested band,
  not ~100/0. Asserted in a bench test at fixed inputs.
- **The feint works end-to-end.** A player/brain can `feint`; a defender who
  commits to the obvious parry is punished (the true blow lands into the
  opened gap); a defender who *reads* the feint (competence-gated) is not.
  Covered by a unit test on the gambit resolution + reactive dispatch.
- **The fog is competence-graded.** `assess` / the read surfaces the
  opponent's poise/intent banded; a low-competence reader can be shown a
  wrong band or read a feint as a real opening, a high-competence reader
  sees through it. Unit-tested at two competence tiers.
- **Zero new randomness in a single session.** A given session with fixed
  inputs resolves **identically** every run (the gym relies on this to run
  N deterministic fights). Asserted: the same matchup seed → the same
  outcome, bit-for-bit. No `Math.random` in the exchange path.
- **The combat gym runs headless and CI-clean.** `scripts/combat-gym.ts`
  (or its bench test) runs N sessions across a skill × loadout × terrain
  matrix to resolution with no scheduler/wall-clock wait, emits an
  outcome distribution, and asserts the reference win-rate bands + a
  degeneracy check. Runs in the normal test suite in seconds.
- **The arc punctuates.** Narration + reaction volume scale to a per-beat
  intensity: first-blood / the break / the down read as swells (roars),
  ordinary beats stay murmurs. Observable in the live demo and unit-covered
  on the intensity signal.
- **NPC ≈ PC parity asserted.** A gym brain-vs-brain run confirms symmetric
  outcomes for a mirror matchup (no hidden monster advantage), within band.
- **The composure seam is present but inert.** Poise-recovery / read-fog
  resolve through a single modulation factor competence fills today; a test
  confirms the factor is consulted and that a stubbed second input would
  compose (the `traits-stress` hook), without shipping composure.
- **Docs.** [combat.md](../subsystems/combat.md) updated (the feint gambit,
  the fog/read, the beat-intensity arc, the gym as the balance tool, the
  composure seam); the corresponding `§ Deferred` items moved out; the
  combat-experience-slate updated (theses realized ticked, the deferred
  remainder kept). Doc-map + architecture entries at finalize.
- **Tests** cover the decidable pieces: feint resolution + reactive punish,
  fog competence-grading, single-session determinism, the gym's
  distribution + band assertions, the beat-intensity signal. Integration
  validated by a live demo (the build-1/2/cycle-2 precedent): a duel where a
  feint visibly beats a turtling defender, with the crowd roaring at the
  break.

## Cross-references

- Seeding slate: [combat-experience-slate.md](../slates/deferred-rpg/combat-experience-slate.md)
  (Theses 2/3/4/9/10 realized; 5 seam-only)
- Mechanism slate: [combat-slate.md](../slates/deferred-rpg/combat-slate.md) (OQ1, the curve the gym de-risks)
- Subsystem (source of truth): [combat.md](../subsystems/combat.md)
- Consequence engine: [materials-response.md](../subsystems/materials-response.md)
- The fog engine: [belief.md](../subsystems/belief.md), [perception.md](../subsystems/perception.md)
- The crowd: [reactions.md](../subsystems/reactions.md)
- The deferred composure axis: [trait.md](../subsystems/trait.md) (`traits-stress`)
- Related memory: [[combat-experience-design]], [[multi-party-combat-build]], [[banding-presentation-not-security]]
