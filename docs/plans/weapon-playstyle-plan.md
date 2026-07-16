# Weapon playstyle & the hand-slot economy — implementation plan

Implements [weapon-playstyle-requirements.md](../requirements/weapon-playstyle-requirements.md)
over the merged combat engine (1v1 + multi-party + the experience pass) and
the built materials-response substrate. A weapon becomes a **derived
playstyle bundle** from `Construction` × `Material` × dimensions, each
property wired into a system we already have.

Branch: `feature/weapon-playstyle` (off master `cec19acd`).

> **This is a large, interlocking build** — nine phases, ~20 files, three
> big net-new pieces (the reach range tier, the shield-in-the-covering-stack,
> the dynamic hand-slot economy). It is scoped this way deliberately (the
> "never half-grown" law — complete the whole allocation game). **Recommended
> delivery: sequential MRs at the natural seams** — (A) Phases 1–3 (the
> derived bundle going live end-to-end), (B) Phase 4 (reach), (C) Phases 5–6
> (shield + hand-slot economy), (D) Phases 7–9 (weapon-gambits + gym + docs) —
> rather than one giant branch. One plan, staged landings.

Every claim is grounded in the real code (file:line). Follows the combat
rhythm: **pure value-objects unit-tested standalone, couplings integration-
tested through the headless harness + the gym, validated by a live demo.**
Style: **match each file's existing quotes** (`lib/combat/` double-quoted,
some areas single); **never run prettier**.

---

## Design resolutions (the load-bearing investigations)

### 1. The derived bundle + the `balanceFactor` migration

**The authoring model (decision D1, resolved).** The delivery vocab
(`bladed`/`pointed`/`hafted`, `Construction.ts:42`) is too coarse to
distinguish reach/handedness alone (a dagger and a spear are both
pointed/bladed). But most of the bundle is **already derivable from existing
inputs**, so only *one* new authored field is needed:

- **Handedness** ← the `slotClaims` count (existing): the dagger claims
  `["hand:right"]` (1H, `steel-dagger.yaml:18`); a 2H weapon claims both
  `hand:left` + `hand:right` (`biped.yaml:30-31`). No new authoring.
- **Balance** ← `Tangible.getMass()` (`Tangible.ts:304`; the dagger authors
  `mass: 0.3`, `steel-dagger.yaml:12`) × delivery form — heavy mass = a
  slow **guard-breaker**, light mass = a fast **exploiter**.
- **Guard** ← delivery form × material (crossguard/hafted parry well; a
  flail/whip form has `guard: none`).
- **Delivery** ← the existing `Construction` delivery profile.
- **Reach** ← the **one new authored input, a real magnitude**: a `length`
  `Quantity<'m'>` on `Weapon` (dagger ≈ 0.25 m, arming sword ≈ 0.9 m, spear
  ≈ 2.4 m) — **symmetric with `mass`** (mass→balance, length→reach), so every
  playstyle axis is grounded in a real authored dimension × real material
  physics, never a free-floating band. The reach *class*
  (`short | medium | long`) is a **banded projection of the real length**
  (`WeaponProfile` thresholds off `combat.weapon.reach*` dials); the combat
  *range state* stays discrete (§2, geometry-free). `length` **defaults from
  the delivery form × mass** when unauthored (bladed/heavier → medium,
  pointed → long, etc.) so a bare weapon still yields a working profile (the
  universe-default / zero-tuning rule). A spear out-reaches a dagger because
  it is *actually longer*, not because someone typed "long."

**The bundle lives in a pure value-object.** New `lib/combat/WeaponProfile.ts`
(named value-object, the `Poise`/`Tempo`/`Sharpness` category). Pure, no I/O:
`WeaponProfile.derive(inputs, config) → { reach, balance, guard, handedness,
delivery }` surfaced as **bands** (bands-not-numbers, the `Poise.band()`
doctrine), with narrow numeric getters (`tempoFactor()`,
`overextendFactor()`, `poiseDamageFactor()`, `guardFactor()`) that CombatLogic
multiplies in — the seam `balanceFactor` occupies today. Default-literal
config keeps it unit-testable standalone (the `DEFAULT_TEMPO_CONFIG`
precedent, `Tempo.ts:53`). `WeaponProfile.isInert()` powers the lint.

**Config injection.** `getProfile()` needs `combat.weapon.*` dials, so the
live read is **`CombatApi.weaponProfileOf(weapon)`** → `CombatLogic` (which
owns `dial()`, `CombatLogic.ts:200`). `Weapon.getProfile()` may exist as a
default-config convenience for tests; the live path goes through CombatApi.

**The `balanceFactor` migration (persistence-safe).** Today
`Weapon.balanceFactor: number = 1` is stored (`Weapon.ts:53`,
`persistentFields = ['balanceFactor']`, `Weapon.ts:55`), read via
`getBalanceFactor()`, consumed at `CombatLogic.balanceFactorOf`
(`CombatLogic.ts:495-502`) → `deriveState.inputs.balanceFactor`
(`CombatLogic.ts:402`) → `Tempo.rateFor` (`Tempo.ts:84`). Migration that
**cannot break hydration**:
- **Keep** the field in `persistentFields` (removing it is the breaking
  move; keeping it is inert). **Reinterpret** it as an *optional authored
  override* — a weapon that wants a hand-set balance number still may.
- Retarget `balanceFactorOf` to return `weaponProfileOf(weapon).tempoFactor()`
  (derived), consulting the stored literal only when a weapon flags an
  explicit override. `Tempo.rateFor` is **untouched** ("goes live without
  touching the function").
- Seeds drop the magic `balanceFactor` and carry `mass` + `length` instead
  (the dagger's fast tempo + short reach become *derived* from `0.3 kg` +
  `0.25 m`).
- Old rows hydrate unchanged; the derived value supersedes the inert stored
  one. `AppSettingsSeeder.test.ts:44` key-count (`107`) moves by the new
  `combat.weapon.*` dial count.

### 2. The reach range tier on `CombatGraph`

**Finding.** `ThreatEdge` (`CombatGraph.ts:22-30`) is
`{ attacker, defender, instrument?, terms }`; edges are **directed** (a 1v1
is two edges, `CombatLogic.ts:315-316`). The beat loop (`advanceImpl`,
`CombatLogic.ts:506`) iterates states, each acting `tempo.advance()` times
against `pickTarget` (`CombatLogic.ts:458`) via `resolveExchange`→
`decideOutcome` (`701`).

**Mechanism — a per-pair `range: 'reach' | 'close'` state + a `close` gambit.**
- Add `range` to `ThreatEdge` (`CombatGraph.ts:23`). Range is physically
  symmetric per *pair* but edges are directed → add
  `CombatGraph.setRange(a, b, range)` writing **both** directed edges, and
  `rangeBetween(a, b)` reading either. Default range at edge creation
  (`openSessionImpl`/`joinImpl`/`pickTarget`, `CombatLogic.ts:315`/`366`/`470`)
  = derived from the **longer** of the two combatants' reach classes
  (spear-vs-dagger opens at `reach`; dagger-vs-dagger opens at `close`).
- **Who-acts-first + strike-advantage.** Before the per-state action loop in
  `advanceImpl` (`CombatLogic.ts:526`), **stable-sort actors by reach
  advantage on their live edges** (deterministic, no RNG) so a reach-
  advantaged actor resolves first while the foe is at `reach`. In
  `decideOutcome` (`701`) + the energy pick (`energyFor`/`commitInflict`,
  `264`/`778`), add a **reach term**: at `range==='reach'` the longer weapon
  strikes at advantage (poise/energy bonus; the shorter weapon penalized); at
  `range==='close'` the term **reverses** (dagger/unarmed advantaged, spear
  penalized). All keyed off `WeaponProfile.reach` — deterministic.
- **Closing = a tempo-costed opposed beat.** Add a `close` gambit to
  `Gambit.ts:75` (`kind: 'control'`, `needsInstrument: false` — anyone can
  close). `resolveExchange` grows a `close` branch (sibling of `defend`/
  `assess`, `CombatLogic.ts:564-588`): spend tempo/poise (`combat.reach.closeCost`)
  and flip the pair to `close` **opposed** — the reach-holder can contest
  (a reciprocal keep-at-bay, resolved by comparing reach classes + poise;
  deterministic). A `reset` (or the reach-holder's `defend` while `close`)
  pushes back to `reach`.
- **Multi-party.** Range lives per edge/pair, so a 2v1 naturally has one foe
  at `reach` and one at `close`; `pickTarget` already iterates per-edge.
  `merge`/`join`/`removeParticipant` must preserve/clean range edges
  (`CombatSession.ts:154`, `CombatLogic.ts:344`).

### 3. Balance → tempo/poise (guard-breaker vs exploiter)

**Finding.** `balanceFactor` already flows into tempo (`Tempo.rateFor`,
`Tempo.ts:84`; assembled `CombatLogic.ts:402`). Overextend/erode/whiff are
flat dials in `resolveExchange` (`overextendCost` `609`, `erodePerExchange`
`594`, `whiffPenalty` `610`) applied via `poise.spend`/`erode`.

**Mechanism.** Replace the flat reads with **profile-scaled** values:
- Tempo: `balanceFactorOf` → `profile.tempoFactor()` (guard-breaker <1 slow,
  exploiter >1 fast) — a pure retarget of the existing hook.
- Poise: in the `land`/`exploit`/`control-land` cases (`645-665`) scale the
  *target's* erosion / inflict energy by `poiseDamageFactor()` (guard-breaker
  high) and the *actor's* `overextend` spend by `overextendFactor()`
  (guard-breaker expensive, exploiter cheap). Guard-breaker *creates*
  openings faster at higher self-cost; exploiter *cashes* them. Complementary,
  gym-tuned — never hard-coded dominance.

### 4. Guard → parry/riposte

**Finding.** Parry: `targetCanParry = resolveInstrument(targetState) !== null`
(`CombatLogic.ts:611`) → `steadyGuard = band==='steady' && targetCanParry`
(`725`) → `parried` arms the reactive `riposte` via `reactiveDispatch`
(`631`/`732`; `Gambit.reactiveFor('parried')`, `Gambit.ts:149`).

**Mechanism — ride the existing seam, no new dispatch.** Replace the binary
`targetCanParry` with a **guard-graded** read off the defender's
`WeaponProfile.guard`: an excellent-guard weapon parries reliably (and
ripostes); a **flail/whip (`guard: none`) can't self-guard** → `steadyGuard`
false even when armed → a guard-breaker **bypasses** the steady defender's
parry. A wielded shield adds a large guard bonus (§6). All in
`decideOutcome`/`resolveInstrument`; the reactive machinery is unchanged.

### 5. The hand-slot economy (switch / sidearm-draw / dual-wield)

**Finding.** Hands are `hand:left`/`hand:right` `WieldableMixin` slots
(`biped.yaml:30-31`); a weapon's `slotClaims` names which it occupies
(`Wieldable.ts:22-29`) — **multi-slot claim = handedness**. `wield`/`unwield`
are `Wield`/`UnwieldController` calling `Slotted.occupy`/`vacate`
(`Slotted.ts:289`/`318`). `resolveInstrument` scans occupants for the first
non-impaired weapon grip (`CombatLogic.ts:1092-1145`); disarm sets the
`disarmed` flag (consumed `1097`). The durative substrate exists: `Coup` is a
`DurativeActivity` holding `body` for a game-time window with `onComplete`/
`onAbort` (`Coup.ts:57-104`); `ManualBuildStep`/`BehaviorBeat` are siblings.

**Mechanisms:**
- **Switch (vulnerable durative beat).** New `lib/combat/WeaponSwitch.ts` (the
  `Coup` clone) holding `body` for `combat.switch.seconds`. During it
  `resolveInstrument` is suppressed (guard down, can't strike — a read); on
  `onComplete` it swaps grips. Triggered by `fight switch <weapon>`
  (`FightController.ts:33`) and by the `combatant` brain on a range transition
  (spear→dagger once `close`). Reuses `SchedulerApi.start`/`cancel` as
  `beginCoup` does (`CombatLogic.ts:1310-1338`).
- **Sheathed sidearm fast-draw (the disarm answer).** A `sidearm`/belt
  `Slottable` carry slot on `biped.yaml`. `fight draw` (or auto on disarm)
  does a **fast** switch (short window) re-arming from the sheath — so
  `disarm` becomes a **tempo setback, not a fight-ender**. A *dropped* weapon
  (unwield to floor) is a slow contested pickup (the existing `get` + re-wield;
  optional detail).
- **Dual-wield (band-gated).** Two 1H weapons in both grips is already legal
  (two `slotClaims`). Extend `resolveInstrument` so the off-hand contributes a
  small parry/guard bonus (sword-and-dagger's off-hand = a "tiny shield") and
  both reach classes are carried (the anti-switching build). **Band-gate**
  via the experience-pass `Sharpness`/competence seam (`sharpnessFor`,
  `CombatLogic.ts:253`; `state.competenceBand`, `304`): a **novice** dual-
  wielder is penalized (off-hand hurts more than helps below a band), a
  **proficient** one gains — gated by `CompetenceBand.rank` (the
  `Sharpness.resolve` precedent).

### 6. Shield = wielded armor-construction

**Finding.** The covering stack (`resolveCoveringStack`,
`ConditionLogic.ts:73-96`) keeps occupants that are `Constructed` armor **AND
`Wearable`** (`80`), sorted by `getLayerDepth()` (`92`), reading coverage from
`getSlotsCovering(partKey)` (`75`; the slot `covers` edge). Focus-fire count
is `graph.edgeCount(target)` (`CombatGraph.ts:115`), already used for erosion.

**Mechanism.** A shield is an armor-`Construction` (`ConstructedMixin`) but
**`Wieldable`, not `Wearable`** → it joins the covering stack via a wielded
path:
- Augment `resolveCoveringStack` to also include `hand:*` occupants that are
  `Constructed` armor + `Wieldable` (a shield), **gated on directionality**:
  the shield covers a *facing* attacker only. Facing derives from the graph —
  strong 1v1 (`edgeCount(target)===1` → shield applies), **weak under
  focus-fire** (`edgeCount>1` → covers only one incoming edge; the others
  bypass). `InflictSpec` gains an optional attacker/edge hint (combat computes
  it at `commitInflict`, `778`).
- **High guard**: the shield contributes a large `guardFactor()` to its holder
  (§4).
- **Costs a hand**: occupies a `hand:*` slot (a `slotClaims` fact).
- **Sunderable**: the shield composes `DurableMixin` (already on `Armor`,
  `Armor.ts:35`); a shield-bash/sunder applies `wear()` (`Durable.ts:64`); at
  `condition→0` it breaks.

### 7. Weapon-shaped gambits ("the weapon edits the menu")

**Finding.** Gambits are descriptors in `GAMBITS` (`Gambit.ts:75`),
attempt-gated at `eligibilityImpl` (`CombatLogic.ts:1055`).

**Mechanism.** Add `shield-bash` (blunt/leverage) and `sweep` (hafted) to
`GAMBITS` with a `affordedBy?` weapon-form predicate, checked in
`eligibilityImpl` alongside the existing gates. `WeaponProfile.affordedGambits`
(derived from form) lists a weapon's extra moves — "the weapon edits the
menu" beside "injury edits the menu." Pure descriptor + gate, no new dispatch.
Unit-tested via `eligibilityFor`.

### 8. Legibility (mandatory ship-blocker; decision D2 resolved)

**Finding.** `analyze response <target>` renders bands over
`MaterialApi.previewBand` (`AnalyzeResponseController.ts:92`); per-item pips
are a `markupAugmenter` on `ConstructedMixin` (`Constructed.ts:81-135`). The
inert lint is `scripts/check-does-nothing.ts` over `Construction.doesNothing()`
(CI-wired `lint:does-nothing`).

**Mechanism — a combat-owned surface (clean layering; playstyle is combat-
domain, config under `combat.weapon.*`).**
- **Preview**: a new `analyze weapon <target>` (`AnalyzeWeaponController` in
  `obj/command/combat/` + YAML + seed) rendering the derived bundle as bands
  (`reach medium · guard good · balance heavy · two-handed`) via
  `CombatApi.weaponProfileOf`. Bands must match the resolved couplings (the
  `previewBand`-matches-`inflict` discipline).
- **Pips augmenter**: a playstyle-pips line (`reach ●●●○ · guard ●●○○`) via a
  **combat-owned** augmenter on `WieldableMixin`/`CombatantMixin` (combat
  already wires affordances onto `WieldableMixin`), reading
  `CombatApi.weaponProfileOf` — not touching the materials-response
  `Constructed` augmenter.
- **Inert lint**: extend the lint (or a sibling `check-inert-weapon`) to
  assert every derived `WeaponProfile` is non-inert (`WeaponProfile.isInert()`
  fixture-tested; the `Construction.doesNothing` precedent). CI-wire it.

### 9. Determinism

The exchange path has **no `Math.random`/`Date.now`** (the gym relies on it).
`WeaponProfile.derive` is pure; the reach state machine is a deterministic
function of tactical state; switch/draw/coup windows use `ScheduleApi`
game-time, not RNG (`Date.now` appears only in `onStart` timestamps that
don't feed outcomes). **No new aleatory randomness**; a single session stays
bit-for-bit reproducible with weapons in play.

---

## Phased plan

Natural MR seams marked **(A)–(D)** (see the delivery note up top).

### (A) Phase 1 — The derived bundle + legibility (foundation)
- **New** `lib/combat/WeaponProfile.ts` (+ `__tests__/WeaponProfile.test.ts`):
  `derive`/bands/factors/`isInert`, default-config.
- **Changed** `lib/equipment/Weapon.ts` — an authored `length`
  `Quantity<'m'>` (form/mass-defaulted; a `QuantityMarshaller` persistent
  field, the `mass` precedent), `balanceFactor` reinterpreted as an optional
  override, a `getProfile()` convenience.
- **Changed** `api/combat.ts` + `obj/api/CombatLogic.ts` —
  `weaponProfileOf(weapon)` (config-injecting); retarget `balanceFactorOf` →
  `profile.tempoFactor()`.
- **New** `obj/command/combat/AnalyzeWeaponController.ts` (+ `cmd/combat/…yaml`
  + seed); the combat-owned playstyle-pips augmenter.
- **New/extended** inert-weapon lint + `WeaponProfile.isInert` fixtures.
- **Config**: `combat.weapon.*` dials (`app-settings.yaml` + `AppSettings.ts`
  + `AppSettingsSeeder.test.ts` count bump). **Seeds**: drop magic
  `balanceFactor`; author `mass` + `length`.

### (A) Phase 2 — Balance → poise/tempo
- **Changed** `CombatLogic.resolveExchange`/`decideOutcome` — scale
  overextend/erode/energy by `poiseDamageFactor`/`overextendFactor` (§3).
  Integration tests via the headless harness (`CombatLogic.test.ts`).

### (A) Phase 3 — Guard → parry/riposte
- **Changed** `decideOutcome`/`resolveInstrument` — guard-graded parry; flail
  bypass (§4). Exchange test.

### (B) Phase 4 — Reach range tier (largest / signature)
- **Changed** `CombatGraph.ts` — `range` on `ThreatEdge`, `setRange`/
  `rangeBetween` pair-sync (+ unit tests).
- **Changed** `Gambit.ts` — `close` (+ optional `reset`).
- **Changed** `CombatLogic` — default range at edge creation, reach-ordered
  actors in `advanceImpl`, the reach term in `decideOutcome`/energy, the
  `close` branch. Per-edge + 2v1 mixed-range tests.
- **Config**: `combat.reach.*` dials.

### (C) Phase 5 — Shield
- **New** a `Shield` compose-and-name class (or `Armor` seed with `Wieldable`)
  + seed.
- **Changed** `ConditionLogic.resolveCoveringStack` + `InflictSpec` — wielded-
  shield directional coverage keyed off edge count (§6); shield guard bonus.
- Tests through `inflict` (coverage), the graph (focus-fire), `DurableMixin`
  (sunder).

### (C) Phase 6 — Hand-slot economy (switch / sidearm / dual-wield)
- **New** `lib/combat/WeaponSwitch.ts` (`DurativeActivity`) + tests; a
  `sidearm` slot on `biped.yaml`.
- **Changed** `FightController` — `fight switch`/`fight draw`; `CombatLogic` —
  switch/draw APIs, disarm-answer wiring, dual-wield off-hand + band-gate (§5);
  `combatant` brain — range-transition switch policy.
- One test each: switch vulnerability, sidearm-after-disarm, novice-vs-
  proficient dual-wield.

### (D) Phase 7 — Weapon-shaped gambits
- **Changed** `Gambit.ts` (`shield-bash`, `sweep` + `affordedBy`) +
  `eligibilityImpl` gate (§7). `eligibilityFor` tests.

### (D) Phase 8 — Gym matrix + NPC≈PC
- **Changed** `scripts/combat-gym.ts` — a **weapon × allocation** matrix axis
  (`GymSide.make` builds a fighter, `combat-gym.ts:49`; add loadout/weapon
  params). **Changed** `scripts/__tests__/combat-gym.test.ts` — assert no
  weapon/allocation strictly dominant (spear beats dagger at reach, loses
  closed; 2H beats 1H+shield in some matchups, not others) + single-session
  determinism with weapons.

### (D) Phase 9 — Tests, live demo, docs
- Colocated `__tests__` for each value-object/coupling; a live reach-duel +
  shield/sidearm exchange in the demonstrator (`treeline`/`hollow`). Update
  `combat.md` + `materials-response.md`; tick the realized Thesis 14 items in
  the slate; doc-map + architecture entries at finalize.

---

## New / changed files (representative)

**New:** `lib/combat/WeaponProfile.ts` (+test); `lib/combat/WeaponSwitch.ts`
(+test); `obj/command/combat/AnalyzeWeaponController.ts` (+ YAML + seed); a
`Shield` seed (+ optional class); the inert-weapon lint logic.

**Changed:** `lib/equipment/Weapon.ts`; `api/combat.ts` + `obj/api/CombatLogic.ts`
(profile read, balance/guard/reach couplings, switch/draw/dual-wield, `close`
branch); `lib/combat/CombatGraph.ts` (range); `lib/combat/Gambit.ts`
(`close`/`shield-bash`/`sweep`); `obj/api/ConditionLogic.ts` (wielded shield in
the covering stack) + `InflictSpec`; `obj/command/combat/FightController.ts`;
`lib/behavior/combatant.ts`; the combat playstyle-pips augmenter home
(`lib/combat/Combatant.ts` or `WieldableMixin`); `config/app-settings.yaml` +
`lib/config/AppSettings.ts` + `backend/__tests__/AppSettingsSeeder.test.ts`;
`seeds/lib/body-plans/biped.yaml` (sidearm slot); arms seeds;
`scripts/combat-gym.ts` + test; `docs/subsystems/combat.md` +
`materials-response.md`.

## Verification
- **Unit**: `WeaponProfile` (bands/factors/isInert, default-config),
  `CombatGraph` range pair-sync, `WeaponSwitch` complete/abort.
- **Integration (headless `CombatLogic.test.ts`)**: guard-breaker-vs-exploiter,
  guard/flail parry, reach control + closing + 2v1 mixed range, shield
  coverage/focus-fire/sunder, switch/sidearm/dual-wield band-gate,
  `eligibilityFor` weapon gambits.
- **Gym bench**: no dominant weapon/allocation; single-session determinism with
  weapons; NPC≈PC.
- **Lints**: `lint:does-nothing` + inert-weapon; `tsc --noEmit`; `lint:gates`;
  `AppSettingsSeeder.test.ts` count; `pnpm lint`.
- **Live demo**: a reach duel + a shield/sidearm exchange in the demonstrator.

## Decisions taken (from Plan-phase flags)
1. **D1 — authoring input.** One new authored field, a **real magnitude**:
   `length` `Quantity<'m'>` on `Weapon` (symmetric with `mass`), form/mass-
   defaulted. Reach *class* is a banded projection of the real length; the
   combat range *state* stays discrete. Handedness ← `slotClaims` count;
   balance ← `mass` × form; guard ← form × material; delivery ← existing.
   Every playstyle axis is grounded in a real dimension (mass, length) ×
   material physics; bands are only the readout. Keeps "a bare form yields a
   working weapon."
2. **D2 — legibility layering.** A combat-owned `analyze weapon` surface +
   a combat-owned pips augmenter (playstyle is combat-domain), not an
   extension of the materials-response `analyze response`/`Constructed`
   surfaces — clean layering over a downward dependency.
3. **`balanceFactor` persistence** — keep the field (inert override), retarget
   the live read to the derived `tempoFactor()`; never remove it (removal
   breaks hydration).
4. **Delivery as sequential MRs** at seams (A)–(D) — one plan, staged
   landings; the reach tier (B) and the hand-slot economy (C) are big enough
   to review on their own.

## Risks / open items
- **Reach + the real-time tick + multi-party.** The per-beat actor **ordering**
  by reach is new control flow in `advanceImpl` (`CombatLogic.ts:526`) — keep
  it a stable, deterministic sort (no wall-clock) and don't starve a slow
  fighter. Verify `merge`/`join`/`removeParticipant` preserve/clean range
  edges and a 2v1 keeps independent ranges.
- **The shield edge-hint threading.** `resolveCoveringStack` is materials-
  response and currently attacker-agnostic; passing an optional attacker/edge
  hint through `InflictSpec` is a small cross-subsystem seam — keep it optional
  and zero-impact when absent (non-combat inflicts unchanged).
- **Phase sizing.** (B) reach and (C) hand-slot economy are each a substantial
  MR; if either grows, split further (e.g. land switch before sidearm +
  dual-wield). (A) is the coherent first MR (the bundle live end-to-end).

## Deferred (named, not built)
Ranged/thrown weapons (the next weapon build), the deep grapple/choke control
game, spatial formation/geometry, a weapon crafting/repair economy, and final
number-tuning (the gym finds them) — per the requirements' Non-goals.
