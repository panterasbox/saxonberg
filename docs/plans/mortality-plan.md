# Mortality — implementation plan

> **Phase 3 input.** This plan is written for a fresh-context build agent.
> Read [`docs/requirements/mortality-requirements.md`](../requirements/mortality-requirements.md)
> first — it is the closed scope and every decision in it is agreed. Then
> read [`CLAUDE.md`](../../CLAUDE.md), [`docs/architecture.md`](../architecture.md),
> [`docs/antipatterns.md`](../antipatterns.md), and these subsystem docs:
> [vitals](../subsystems/vitals.md) · [harm](../subsystems/harm.md) ·
> [race](../subsystems/race.md) · [sandbox](../subsystems/sandbox.md)
> (§ *The crossing (as built)*, § *The write-path policy table*) ·
> [persistence](../subsystems/persistence.md) ·
> [connection](../subsystems/connection.md) ·
> [residency](../subsystems/residency.md) ·
> [chronicle](../subsystems/chronicle.md) ·
> [accountability](../subsystems/accountability.md) ·
> [chattel](../subsystems/chattel.md) ·
> [perception](../subsystems/perception.md) ·
> [concealment](../subsystems/concealment.md).
>
> All paths below are relative to `packages/server/src/mud/` unless they
> start with `docs/` or `e2e/`.

---

## Orientation — what is reused, what is genuinely new

### Reused, unchanged (do not re-derive any of this)

| Machinery | Where | What death uses it for |
|---|---|---|
| Reconcile-on-read condition driver | `lib/vitals/Vitals.ts` `reconcileConditions` | the `dying` clock is a fifth arm in the same loop |
| Affliction dwell→lethal pattern | `lib/respiration/Respiration.ts` `reconcileAnoxiaCascade` | the shape `dying` generalizes |
| `ForkableMixin` fork slices | `lib/persistence/Forkable.ts` | corpse (material, fork-only) + shade (shell, merge-capable) |
| Wire-body crossing choreography | `obj/api/SandboxLogic.ts` `enterImpl`/`exitImpl` | the shade mint + per-Interactive transfer under an omni root, run backwards |
| `WireBody` class shape | `lib/sandbox/WireBody.ts` | the `Shade` is a near-copy: `shouldPersist()→false`, identity thread, no autosave |
| Self-persistence spine | `PersistableMixin` / `PersistableLogic` / `holder_snapshots` | the durable arc position rides the identity's existing record |
| `ThermalMixin` passive drift | `lib/thermal/Thermal.ts` (`Thermal.corpse.test.ts`) | algor mortis — **free**, no new code |
| Residency `canEvict` veto | `lib/stuff/Stuff.ts`, `ResidencyLogic` | the corpse's decay terminus |
| Concealment/detection gate | `PerceptionApi.perceives` + `ConcealableMixin` | shade perceptibility scaled by `awareness` competence — **no new mechanism** |
| Medic loop | `cmd/medical/treat.yaml`, `TreatController`, `AssessController`, `AdvancementApi.bandFor` | stabilization + the competence-scaled clock readout |
| Chattel chain-of-title, `Container.cleanupOnDestruct` evacuation | `lib/chattel/`, `lib/spatial/Container.ts` | looting record + terminal-decay item evacuation |
| `Creature` composition | `lib/creature/Creature.ts` | **is** the corpse tier — Container + Containable + Vitals + Organism + BodyPlanSlots + Thermal, already |
| Employment mixin-conferral seam | `MixinApi.collectAugmentConferralNames` → `getConferredMixinNames()` | the shade's **intrinsic** attunement, no implant, no Species mutation |
| Command-validator pattern | `lib/command/validators/requiresAnimate.ts` etc. | `requiresEmbodied` is the fourth sibling |

### Genuinely new

- One new condition **kind** — `DyingRecord` (`kind: 'dying'`) in `lib/vitals/Condition.ts`, joining trauma / affliction / shock / sustained. Additive: nothing switches exhaustively on `ActiveCondition['kind']` (verified — 191 `.kind ===` sites, all filters).
- One new `ConditionBand` value — `'dying'`, between `critical` and `dead`.
- Four new **fork slices** on `VitalsMixin` (`Vitals`, `Trauma`, `CauseOfDeath`, `Anatomy`) and **one non-`mergeSlice_` applier**, `adoptMaterialState` (see § *The material-slice protocol*, which resolves an ambiguity in the requirements).
- A new subsystem folder `lib/mortality/` with four modules: `Postmortem.ts` (mixin), `Incorporeal.ts` (mixin), `Shade.ts` (class), `MortalArc.ts` (value-object + `MORTALITY_DEFAULTS`).
- New methods on the **existing** `ConditionApi` / `ConditionLogic` pair: `die`, `embodyForSession`, `reembody`. **No new Api class.**
- One new validator (`requiresEmbodied`), one new verb MVC triple (`passage`), one new seeded `Condition` Idea (`/lib/mortality/conditions/dying`).
- One predicate in `AccountabilityEvent.deriveBlame` (circle-marked rows) + one persisted field to make the mark readable.

---

## Ground truth — where the real code differs from the requirements' citations

**Read this section before touching anything.** Each item was verified against
the tree on this branch. The requirements' *decisions* stand; these are
corrections to the *citations* they rest on.

1. **The bricking defect is not at `Avatar.ts:1003/1013`.** Those lines are
   `forkSlice_Embodiment` / `mergeSlice_Embodiment` (the sandbox fork), not
   capture/materialize. The real mechanism is
   `OrganismMixin.persistentFields = ['_speciesPath', 'age', 'lifecycleState']`
   (`lib/species/Organism.ts:45`): `lifecycleState` is a declared persistent
   field, so `PersistableApi.capture` writes it to `holder_snapshots` and
   `materialize` restores it. `@runtimeState` is a **doc tag only** — it does
   not filter persistence. The defect is real; the fix site is different.

2. **`Avatar.shouldPersist()` breaks `markForRevert()`.**
   `obj/Avatar.ts:380` is `return !this.isGuest;` — it does **not** chain to
   `super`, so `PersistableMixin._reverting` is dead for Avatars. Death needs
   revert-before-destruct, so this must be fixed to
   `return !this.isGuest && super.shouldPersist();` (Wave 0).

3. **"Consciousness needs no change" is wrong for six of the nine drivers.**
   `VitalsMixin.getConsciousness()` (`lib/vitals/Vitals.ts:436`) reads only
   blood volume, SpO₂ and head trauma. A body dying of hypothermia,
   hyperthermia, starvation, dehydration, toxin or electrocution reads
   `conscious`. Wave 1 must add `if (this.isDying()) return 'unconscious';`
   or animate verbs keep dispatching on a dying body.

4. **`Species.intrinsicMixins` does not exist.** The real field is
   `Species.innateMixins` (`lib/species/Species.ts:246`, getter
   `getInnateMixins`). It is **species-level reference data**, boundary-exempt
   and never mutated at runtime — so the shade cannot use it. The correct seam
   is `getConferredMixinNames()` (`lib/employment/Employed.ts:124`, composed on
   `Character`), which `MixinApi.collectAugmentConferralNames` reads
   structurally. `Shade` overrides it to union `'AetherMixin'`. Same outcome,
   zero engine change.

5. **`AccountabilityEvent` cannot see `circleScope` today.** PM stamps it on
   the raw document (`backend/PersistenceManager.ts:694`), but
   `Document.fromDocument` only reads declared `persistentFields`
   (`lib/persistence/Document.ts:198`), so the mark never reaches the
   instance. `deriveBlame` therefore needs the field declared *and* kept off
   field-side rows (see Wave 7).

6. **`SandboxApi.respawnWireBody` exists and has no production caller**
   (`obj/api/SandboxLogic.ts:800`, `api/sandbox.ts:221`, exercised only by
   `api/__tests__/sandbox.crossing.test.ts:204`). The requirements replace its
   behavior ("a circle death **ejects**"), so it is deleted in Wave 7.

7. **A corpse is not a `holder_snapshots` host and does not need to be.**
   `Location` does not compose `PersistableMixin` (only `Avatar`, `Plant`,
   `DormRoom`, `ConsignmentShelf` do). The corpse's durability is
   **in-memory residency** — it vetoes `canEvict` until terminal decay. That
   is consistent with the requirements' own "no passage route may require the
   corpse to exist" and with "the corpse decays and can be looted while the
   player is away." **Do not** give the corpse a template row or a snapshot;
   mint it with `StuffApi.create` so it carries no `templatePath` and cannot
   collide in `byTemplatePath`.

8. **`ConditionBand` is consumed by total records.**
   `lib/encumbrance/LoadBearing.ts:276` indexes
   `LOAD_BEARING_DEFAULTS.CONDITION_BAND_MARGIN[band]`, and
   `lib/husbandry/Growing.ts` re-declares the type. Adding `'dying'` makes
   `tsc` enumerate every consumer for you — let it.

---

## The invariant board

Pin these five on the wall. Every wave references them.

| # | Invariant | The mistake it prevents |
|---|---|---|
| **I1** | **Nothing ever persists `lifecycleState: 'dead'` on a player body.** The durable death marker is `Avatar.mortalArc` on the identity's `holder_snapshots` record. | the live bricking defect, and its re-introduction wearing an arc-shaped hat |
| **I2** | **`dying` opts OUT of the linkdead freeze and OUT of the far-past gap guard.** Every other arm of `reconcileConditions` opts in. | disconnect-cures-death — *the build's most likely quiet defect*, because copying the four adjacent `if (linkdead)` blocks produces it |
| **I3** | **No material slice implements `mergeSlice_`.** Material state reaches a corpse through `adoptMaterialState`, never through `applyForkedState`. | a reanimatable corpse, by one plausible-looking edit |
| **I4** | **Capture-or-suppress before the flip; unstamp before the re-stamp.** The identity snapshot is written *before* the body is drained/destructed; the old Avatar is destructed *before* any new body registers at `/obj/Avatar/<playerId>`. | a `dead` autosave; a `byTemplatePath` / `PlayerApi` registry collision |
| **I5** | **`undead` means "not a living body", not "dead".** Every lifecycle branch reads `isAlive()` / `isDead()`, never `!== 'alive'` meaning dead. | a shade that starves, freezes, suffocates and dies twice |

---

## The material-slice protocol (resolves an ambiguity — read before Wave 4)

The requirements state two things that are in tension against the shipped
`ForkableMixin`:

- *"merge allowlist: **none**"* / *"No material slice implements `mergeSlice_`
  — asserted by a test"*; and
- the corpse **receives** the material slices.

In `lib/persistence/Forkable.ts`, `applyForkedState` applies a slice by
calling `mergeSlice_<Name>` **on the target** — so a corpse that received
state through the protocol would need `mergeSlice_Vitals`, which
`VitalsMixin` puts on *every* body, corpse and living alike. That is exactly
the escape hatch the requirements forbid. (The shipped `HasInteractive`
comment "Fork-only, deliberately — there is no `mergeSlice_`" is contradicted
three lines later by `mergeSlice_ClientState`; there, "fork-only" means
"absent from the merge-back allowlist".)

**Resolution — the literal reading, which is also the stronger one:**

- The **fork** side rides the protocol verbatim. `VitalsMixin` implements
  `forkSlice_Vitals`, `forkSlice_Trauma`, `forkSlice_CauseOfDeath`,
  `forkSlice_Anatomy`. They are discovered by `collectForkSlices()`.
- The **apply** side is **not** a `mergeSlice_`. `VitalsMixin` gains
  `adoptMaterialState(slices: Record<string, unknown>): void`, gated
  `@CallSecurity(FromModule('/api/condition#ConditionApi'))`. Only the death
  choreography can call it.
- Consequence, and this is the payoff: **`PersistableApi.forkRuntimeState`
  carries exactly the shell and nothing else, automatically.** Minting the
  shade is one unmodified `forkRuntimeState(dyingAvatar, shade)` call — the
  material slices are offered and silently dropped because the shade
  implements no applier for them. And `forkRuntimeState(corpse, newBody)` is
  structurally a no-op: **un-reanimatable by protocol.**
- `export const MATERIAL_FORK_SLICES = ['Vitals','Trauma','CauseOfDeath','Anatomy'] as const;`
  lives in `lib/vitals/Vitals.ts` beside `VITAL_SIGNS`. The Wave 4 test walks
  the prototype chains of `Creature`, `Character`, `Avatar` and `Shade` for
  `mergeSlice_*` names and asserts the intersection with
  `MATERIAL_FORK_SLICES` is empty.

Flagged in *Open concerns* in case the user wants the other reading.

---

# Wave 0 — Unbrick, and make `undead` safe

**Delivers.** The player-bricking defect closed, and the three survival
guards corrected. **Ordered first because the requirements demand it** ("the
bricking fix is the first landable slice; it must not wait on the corpse, the
shade, or the passage") and because everything downstream is safer once
`markForRevert` actually works and `undead` stops being lethal. Zero new
feature surface; this wave is pure defect repair and lands on its own.

### Changes

**`lib/species/Organism.ts`** — no field changes. Add TSDoc on
`lifecycleState` recording that it **is** persisted and that a persistence
host must never let `'dead'` round-trip (points at I1).

**`obj/Avatar.ts`**

1. `shouldPersist()` → `return !this.isGuest && super.shouldPersist();`
   (Ground-truth #2). This is what makes `markForRevert()` real for Avatars
   and is a prerequisite for Wave 5.
2. New persistent field **`mortalArc: MortalArc | null = null`**, added to
   `Avatar.persistentFields`. Plain-serializable scalars only, so no
   marshaller (`docs/antipatterns.md` § *Persistent Fields Default to
   Scalars*). Method surface `getMortalArc()` / `setMortalArc(arc)` /
   `isDeceased()` (inter-Stuff contract: methods, never fields).
   In this wave the field is **written by nothing** — it exists so the
   materialize-side normalizer has an authority to consult, and so Wave 5 is
   a pure addition.
3. New `private async reconcileMortalState(): Promise<void>`, called in
   `postRegister` **immediately after** `PersistableApi.materialize(this, spineKey)`
   and **before** `installDefaultLoadout()`:

   ```
   if (getLifecycleState() !== 'dead') return;          // fast path
   // A snapshot may never resurrect a dead body (I1). Until the arc
   // ships (Wave 5) the only honest exit is to heal the snapshot.
   setLifecycleState('alive');
   setCauseOfDeath(null);
   resetVitalsToSpeciesBaseline();
   clear every condition;
   ChronicleApi.recordDeed(this, { template: '…returned to the world…', tags: ['death','recovery'] });
   await PersistableApi.capture(this, spineKey);        // heal the record, not just memory
   ```

   Wave 5 extends this method (it becomes the arc-driven branch); it is never
   deleted — it stays as the **terminal backstop** that makes I1 unfalsifiable.
4. `resetVitalsToSpeciesBaseline()` — a small `protected` helper on
   `Creature` (not Avatar; Wave 4's corpse split reuses it), writing each
   `VITAL_SIGNS` entry from `getVitalBand(sign).baseline` through
   `setVitalSign`.

**`lib/metabolism/Metabolic.ts:807`, `lib/respiration/Respiration.ts:327`,
`lib/thermal/ThermalRegulation.ts:277`** — replace
`getLifecycleState() === "dead"` with `!isAlive()` (I5). Each site already
has an `MixinApi.isOrganism` narrowing or a typed host; `isAlive()` is on
`OrganismMixin` (`lib/species/Organism.ts:91`). Leave
`ThermalRegulation.ts:277`'s local name `dead` but rename it `notLiving` so
the next reader isn't misled.

> **Do not touch `lib/vitals/Vitals.ts:391/442/593` in this wave.** Those
> three read `=== 'dead'` and are *correct* for `undead` (a shade's band and
> consciousness should compute normally, and it has no conditions to
> reconcile). Wave 1 revisits them for `dying`, not for `undead`.

### Tests

| Test file | Asserts | AC |
|---|---|---|
| `obj/__tests__/Avatar.mortal-snapshot.test.ts` | An Avatar captured with `lifecycleState: 'dead'` materializes **alive**, at baseline vitals, with a healed record (a second materialize also reads alive). | *"A dead player who logs out and back in is not stuck"* |
| `obj/__tests__/Avatar.mortal-snapshot.test.ts` | `markForRevert()` → `shouldPersist()` is `false` → `PersistableApi.capture` writes nothing. | prerequisite for I4 |
| `lib/vitals/__tests__/undead-survival-guards.test.ts` | An `undead` Creature driven across a long elapsed gap: metabolic, respiratory and thermal reconciles all no-op; `getLifecycleState()` is still `'undead'`; no `causeOfDeath`. | *"A shade does not starve, suffocate, freeze, or die a second time … the three guards read `!isAlive()`"* |

### Risks / ordering hazards

- **Do not delete `lifecycleState` from `OrganismMixin.persistentFields`.**
  `obj/Plant.ts` is a persistence host and `lib/husbandry/Growing.ts:630`
  legitimately persists a dead plant. The fix is Avatar-local, deliberately.
- `reconcileMortalState` runs inside `postRegister`, before
  `installDefaultLoadout` — the loadout's cranial-occupancy guard reads
  restored gear, and healing must not race it.
- `resetVitalsToSpeciesBaseline` needs the species resolvable; `materialize`
  already preloads anatomy between the field hydrate and slot occupancy
  (`PersistableLogic.restoreState` step 3 comment). Call it after materialize,
  and degrade silently (`UNIVERSE_DEFAULT_VITAL_PROFILE`) when no species
  resolves.

---

# Wave 1 — `dying`: a rescuable state with a clock

**Delivers.** The `dying` condition, the band, the consciousness coupling,
and every lethal driver rerouted from "flip to dead" to "enter dying with a
driver-supplied window". Ordered here because it is the substrate every later
wave stands on, and because it is independently playable: bodies now enter a
recoverable state and die on a clock. Nothing yet mints a corpse — the clock's
expiry still calls each driver's existing `applyDeath` until Wave 2 collapses
them.

### Changes

**`lib/vitals/Condition.ts`** — add condition **Kind E**:

```ts
/** Kind E — the dying clock. The body has crossed a lethal threshold; the
 *  WINDOW, not the threshold, kills. Exempt from the linkdead freeze and
 *  the far-past guard (see Vitals.reconcileConditions) — inheriting either
 *  makes disconnecting a cure for death. */
export interface DyingRecord {
  kind: 'dying';
  /** The cause stamped at expiry (`exsanguination`, `hypothermia`, …). */
  cause: string;
  /** Game-seconds from onset to death — supplied by the driver that knows
   *  the physics (the RESPIRATION_DEFAULTS.ANOXIA_LETHAL_SEC precedent). */
  windowSec: number;
  /** Game-seconds accrued. */
  elapsed: number;
  /** Game-time anchor; `undefined` until first touch. */
  tickedAt?: number;
  /** Caller-supplied blame facts (Wave 2) — the producer that knows the
   *  fact supplies it. Plain scalars; persists free. */
  accountability?: AccountabilityFields;
}
```

Add to the `ActiveCondition` union. Add to `HARM_DEFAULTS`:
`DYING_WINDOW_SEC_DEFAULT: 180` (the "drivers that don't care" default).

**Per-driver windows** — each driver's own `*_DEFAULTS` grows one entry, so
the physics stays with the physics:

| Constant | Home | Used by |
|---|---|---|
| `HARM_DEFAULTS.EXSANGUINATION_DYING_WINDOW_SEC` | `lib/vitals/Condition.ts` | the bleed floor |
| `HARM_DEFAULTS.ELECTROCUTION_DYING_WINDOW_SEC` | `lib/vitals/Condition.ts` | the fibrillation floor |
| `THERMAL_DEFAULTS.DYING_WINDOW_SEC` | `lib/thermal/Thermal.ts` | hypo/hyperthermia |
| `RESPIRATION_DEFAULTS.DYING_WINDOW_SEC` | `lib/respiration/Respiration.ts` | the asphyxiation family |
| `METABOLIC_DEFAULTS.DYING_WINDOW_SEC` | `lib/metabolism/Metabolic.ts` | starvation / dehydration / toxin |

**`lib/vitals/Vitals.ts`** — the centre of this wave.

1. `ConditionBand` union grows `'dying'` between `'critical'` and `'dead'`.
   Let `tsc` enumerate consumers; add a `dying` row to
   `LOAD_BEARING_DEFAULTS.CONDITION_BAND_MARGIN` (same value as `critical`)
   and re-check `obj/Plant.ts:101`'s switch and
   `obj/api/CombatLogic.ts:3939` / `FightController.ts:75` (both render the
   band as text — no change needed).
2. New `Vitals` interface methods:
   - `beginDying(cause: string, windowSec?: number, blame?: AccountabilityFields): void`
     — idempotent (a body already dying keeps its first record and window;
     a later call may **only** attach `blame` if absent). This is the
     object-owned mutation drivers call directly (the shipped precedent:
     harm.md — "internal drivers keep calling the body methods directly").
   - `isDying(): boolean`
   - `getDyingRemainingSec(): number | null` — `windowSec - elapsed`, reconciled.
   - `stabilize(): boolean` — relieve the `dying` record; `true` if one was
     present. Wave 3's `treat` calls this.
   - `adoptMaterialState(slices): void` — declared here, implemented in Wave 4.
3. `getConditionBand()` — insert `if (this.isDying()) return 'dying';`
   immediately after the `'dead'` lifecycle check, and **change the floored
   blood-volume read from `'dead'` to `'dying'`** (a floored vital is a dying
   substrate state; only the lifecycle flip means dead — "the clock, not the
   threshold, kills").
4. `getConsciousness()` — insert `if (this.isDying()) return 'unconscious';`
   after the `'dead'` check. **Ground-truth #3: without this, six of the nine
   drivers leave a dying body walking and talking.**
5. `reconcileConditions()` — a **fifth arm**, and the one place I2 lives.
   Write it with the divergence commented loudly at the site:

   ```ts
   // ── the dying clock ──────────────────────────────────────────────
   // DELIBERATELY UNLIKE the four arms above: `dying` does NOT re-stamp
   // on `linkdead` and does NOT bail on the far-past guard. A body that
   // crossed a lethal threshold keeps dying while its player is offline
   // — inheriting either freeze would make disconnecting a cure for
   // death (mortality-requirements § "The dying clock runs while
   // disconnected"). Do not "fix" this by copying the block above.
   for (const d of dyings) {
     if (d.tickedAt === undefined) { d.tickedAt = nowS; continue; }
     const elapsed = nowS - d.tickedAt;
     d.tickedAt = nowS;
     if (elapsed <= 0) continue;          // clock ran backwards only
     d.elapsed += elapsed;                // NO linkdead re-stamp, NO gap cap
     if (d.elapsed >= d.windowSec) { this.expireDying(d); }
   }
   ```

   Two mechanical points:
   - the `dyings` filter must join the existing
     `traumas.length === 0 && …` early-return so a body with only a `dying`
     record still reconciles;
   - `expireDying(d)` in this wave stamps `setCauseOfDeath(d.cause)`,
     relieves the record, and calls `self.setLifecycleState('dead')`
     (the existing behavior, now in one place). Wave 2 replaces its body with
     `void ConditionApi.die(...)`.

**The nine driver sites** — each replaces its lethal flip with `beginDying`:

| Site | Change |
|---|---|
| `lib/vitals/Vitals.ts:~757` (bleed floor) | `this.beginDying('exsanguination', HARM_DEFAULTS.EXSANGUINATION_DYING_WINDOW_SEC)` |
| `lib/vitals/Vitals.ts:~775` (heart floor) | `this.beginDying('electrocution', HARM_DEFAULTS.ELECTROCUTION_DYING_WINDOW_SEC)` |
| `lib/thermal/ThermalRegulation.ts:536` `applyDeath` | body becomes `host.beginDying(cause, THERMAL_DEFAULTS.DYING_WINDOW_SEC)`; keep the method name and the `if (!host.isAlive()) return;` idempotency guard |
| `lib/respiration/Respiration.ts:549` `applyDeath` | ditto with `RESPIRATION_DEFAULTS.DYING_WINDOW_SEC` |
| `lib/metabolism/Metabolic.ts:804` `applyDeath` | ditto with `METABOLIC_DEFAULTS.DYING_WINDOW_SEC` |
| `obj/api/CombatLogic.ts:2864` `killImpl` | **unchanged in this wave.** The cull and the coup are deliberate finishing blows and kill outright — the requirements pin `handleDown`'s three-case branch as shipped. `killImpl` is rewritten in Wave 2 to call `ConditionApi.die`, never `beginDying`. |
| `lib/husbandry/Growing.ts:630` | **untouched** — the plant path is explicitly excepted. |

Also add `AppSettingKeys.mortalityDyingWindowSec` + a
`config/app-settings.yaml` entry as the operator dial over
`DYING_WINDOW_SEC_DEFAULT`, read with the seeded-literal fallback idiom
(`elecDial` in `Vitals.ts`).

**Seed** `seeds/lib/mortality/conditions/dying.yaml` — a
`class: /lib/vitals/Condition` Idea (mirroring
`seeds/lib/respiration/conditions/asphyxiation.yaml`) with
`observableSigns` so `assess` and future prose have something honest to
read. Register `TemplatePaths.mortalityDying` in `lib/paths.ts`.
*(The `DyingRecord` is a value, not an `AfflictionRecord`; the Idea exists
for observable signs and future staged prose, and is looked up by `assess`.)*

### Tests

| Test file | Asserts | AC |
|---|---|---|
| `lib/vitals/__tests__/Vitals.dying.test.ts` | Band ordering: a dying body reads `'dying'`, not `'dead'`; `getConsciousness()` is `'unconscious'`; `requiresAnimate` still passes (alive) but `requiresConscious` refuses. | *"`getConditionBand()` grows `dying`"*, *"animate verbs stop dispatching"* |
| `lib/vitals/__tests__/Vitals.dying.test.ts` | Clock: at `windowSec - ε` still `dying`; at `windowSec` the lifecycle flips and the cause is stamped. | *"dies only when its window elapses"* |
| **`lib/vitals/__tests__/Vitals.dying-disconnect.test.ts`** | **I2, both halves.** (a) A dying host whose `isLinkdead()` is `true` still accrues and dies on schedule; a *bleeding* host in the same fixture still freezes (proving the divergence is deliberate, not a global regression). (b) A single elapsed step **larger than `HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC`** kills, where the trauma arm integrates nothing. | *"A dying character who disconnects still dies on schedule: a test pins `dying` against both the linkdead freeze and the far-past gap guard"* |
| `lib/vitals/__tests__/dying-per-driver.test.ts` | **One case per driver** — exsanguination, electrocution, hypothermia, hyperthermia, asphyxiation, starvation, dehydration, toxin — each enters `dying` with its own window and none flips straight to `dead`. | *"Covered by tests per driver"* (8 of 9; combat is the 9th, Wave 2) |
| existing `obj/api/__tests__/CombatLogic.test.ts` | **must stay green untouched** — the cull test (`:355`) and the 2v1 (`:497`). | combat is regression surface |

### Risks / ordering hazards

- **I2 is the whole wave.** Write the dying arm *last*, after the other four,
  and put the comment in before the code. Reviewers should be able to see the
  divergence without reading the surrounding loop.
- `getConditionBand` returning `'dying'` where it used to return `'dead'` at
  the blood floor is a **behavioral change**. Grep the four band consumers and
  the `AssessController` prose table before landing.
- `getConsciousness()` now short-circuits on `isDying()`, which calls
  `reconcileConditions()` — the `_reconcilingConditions` reentrancy guard
  already covers this, but `isDying()` must read `this.conditions` directly
  (not via `getConditions()`) to avoid a second reconcile inside the guard.
- Combat's `checkVitalsResolution` reads `getConsciousness()`. A dying body
  reads `unconscious` — which it already did below `bvFraction < 0.7`, so the
  attrition path is unchanged. Verify with the existing suite; do not
  restructure `checkVitalsResolution` in this wave.

---

# Wave 2 — `ConditionApi.die`: one transition, two ledgers

**Delivers.** The seven duplicated flips collapse to a single call, and every
death — not just combat's — feeds `chronicles` and `accountability_events`.
Scoped to the **NPC / creature path only**: the same Stuff becomes the corpse,
exactly as race.md says, so this wave is landable without any of the PC split.

### Changes

**`api/condition.ts`** — add the call shape + one static (thin forwarding
shell only; no logic here):

```ts
/** Caller-supplied facts. The ledger never infers consent — the producer
 *  that knows it supplies it (accountability.md § Producers). */
export interface DeathSpec {
  /** Fully-formed accountability row. Combat builds one; hypothermia
   *  passes none and `die` writes the environmental default. */
  accountability?: AccountabilityFields;
  /** Skip the dying stage entirely — a deliberate finishing blow (the
   *  cull, the coup). Default false. */
  immediate?: boolean;
}
public static die(host: Stuff, cause: string, spec?: DeathSpec): Promise<void>
```

**`obj/api/ConditionLogic.ts`** — `die`, gated
`@CallSecurity(FromModule('/api/condition#ConditionApi'))`, with its sub-logic
in module-private free functions (the `SandboxLogic` / `RenownLogic` shape, so
there are no intra-singleton `this.x()` calls to trip the gate).

**The synchronous death prefix.** `die` returns a Promise, but everything that
must be atomic happens **before the first `await`** (the
`PersistableApi.capture` precedent):

```
1. re-entrancy guard (a module-private Set<stuffId>);
2. if (!MixinApi.isOrganism(host) || host.isDead()) return;
3. host.setCauseOfDeath(cause);  relieve any DyingRecord (capturing its
   `accountability` payload if `spec.accountability` is absent);
4. branch:
   • no player identity        → host.setLifecycleState('dead');   // THIS WAVE
   • circle-scoped player body → Wave 7
   • field player body         → Wave 5
```

**The async tail (this wave):**

```
5. ChronicleApi.recordDeed(host, {
     template: '{{ who | name }} died of {{ cause }}.',  where, tags:['death']
   })                                    // no-ops without a durable owner key
6. AccountabilityApi.record(spec.accountability ?? environmentalRow(host, cause))
```

`environmentalRow` (module-private): `kind: 'death'`, `sessionId` a
`SecurityApi.uuid()`, `initiator`/`opponent`/`killer` `''`, `victim`
`durableIdOf(host)`, **`lethality` omitted** (defaults `'non-lethal'`, so an
environmental death is structurally never a crime), `consented: false`,
`sentient: SpeciesApi.isSentient(host)`.

**`lib/vitals/Vitals.ts`** — `expireDying(d)` becomes
`void ConditionApi.die(this, d.cause, { accountability: d.accountability })`
(fire-and-forget from the sync reconcile; the sync prefix does the
lifecycle-visible work, the tail is ledger I/O). Delete the direct
`setLifecycleState('dead')`.

**`lib/thermal/ThermalRegulation.ts` / `Respiration.ts` / `Metabolic.ts`** —
delete the three now-empty `applyDeath` bodies' flip; they already only call
`beginDying` after Wave 1. Keep the methods (they are the driver-local names
their reconciles read well with).

**`obj/api/CombatLogic.ts`** — three sites, preserving byte-identical blame:

1. Rename `recordDeath(...)` → **`buildDeathRow(...)`**: same body, but
   `return`s the `AccountabilityFields` object instead of calling
   `noteAttribution`. It keeps `formationPath` / `killerRole` / `directedBy`.
2. `killImpl(target, cause)` → `void ConditionApi.die(target, cause, { accountability: row, immediate: true })`.
   Call sites:
   - `handleDown` cull (`:2846`) — `killImpl(victim, 'slain')` with
     `buildDeathRow(session, attacker, victim)`; **delete** the adjacent
     `recordDeath(...)` call. The three-case branch itself is untouched.
   - `completeCoup` (`:3591`) — same with `directedBy`.
3. `checkVitalsResolution` — two edits:
   - in the `c === 'unconscious' && !s.down` branch, **stamp the dying
     record with combat's blame facts** if the combatant `isDying()` and
     carries no payload yet:
     `s.combatant.beginDying(<its own cause>, undefined, buildDeathRow(session, killer, s.combatant))`
     (idempotent — `beginDying` only attaches `blame` when absent);
   - in the `c === 'dead'` branch, **delete** the `recordDeath(...)` call:
     `die` already wrote exactly one row, using the payload stamped above.
     Everything else (`endWith`, `runResolutionConsumers`) is unchanged.

   This is what keeps `deriveBlame` byte-identical: the ledger still gets one
   `death` row per death, carrying combat's terms, from combat's own
   `buildDeathRow`.

### Tests

| Test file | Asserts | AC |
|---|---|---|
| `obj/api/__tests__/ConditionLogic.die.test.ts` | A non-player Creature: `die` flips `lifecycleState` **synchronously**, stamps the cause, relieves `dying`, and is idempotent under a double call. | *"One transition path"* |
| `obj/api/__tests__/ConditionLogic.die.test.ts` | A hypothermia death (no killer) writes an `accountability_events` `death` row with `killer: ''` and `crime === false`; a chronicle `deed` tagged `death` lands on the victim's `owner`. | *"Death mints a chronicle deed and an `accountability_events` row from a non-combat driver"* |
| `obj/api/__tests__/CombatLogic.test.ts` (existing) | **Unchanged and green** — the cull resolves to `death` with exactly one dead loser; the 2v1; the blame regression. | *"combat's blame derivation is unchanged — pinned by the existing regression"* |
| `obj/api/__tests__/CombatLogic.dying.test.ts` (new) | A combat bleed-out: the victim enters `dying` with combat's row stamped on the record; at expiry exactly **one** `death` row exists and `deriveBlame` yields combat's verdict (crime iff lethal + non-consented + sentient). | AC per-driver (combat), *"byte-identical blame"* |
| `scripts`-free lint check | `grep -rn "setLifecycleState('dead')" src/mud --include=*.ts` outside `__tests__` returns **only** `Growing.ts:630` and `ConditionLogic.ts`. Add it as an assertion in `obj/api/__tests__/ConditionLogic.die.test.ts` reading the source tree via `SourceTreeApi.readResource`. | *"No non-test code writes `setLifecycleState('dead')` outside the single transition path"* |

### Risks / ordering hazards

- **Combat's `recordDeath` → `buildDeathRow` refactor is the risk.** Do it as
  a pure rename-and-return first, with the existing suite green, and only
  then rewire `killImpl`.
- `die` is async but is called from a sync reconcile. The re-entrancy guard
  must be entered in the sync prefix, not after an `await`, or a second read
  on the same tick re-enters.
- `ChronicleApi` / `AccountabilityApi` both no-op when Mongo is disconnected —
  unit fixtures stay quiet. Do not add a connection check in `die`.

---

# Wave 3 — Stabilization: the medic decides a fight

**Delivers.** `treat` clears `dying`; `assess` reports the remaining window at
competence-scaled fidelity. Small, self-contained, and the first time a
non-combat Discipline changes a life-or-death outcome. Ordered after Wave 1
because it needs the condition, and before the corpse because it is the thing
that stops corpses happening.

### Changes

**`obj/command/medical/TreatController.ts`**
- Before `pickWound`, add the stabilization branch: if
  `target.isDying()`, a successful outcome (`outcome !== 'failure'`) calls
  `target.stabilize()` — the body drops to `critical`, **rescued, not healed**
  (the wound is still there and still bleeds unless also dressed).
- The graded `ActSignature` is minted as today; difficulty for a dying body
  is `'formidable'` (or derived from `getDyingRemainingSec()` — less time,
  harder), a world-measurement, not a tag.
- Prose: `You drag ${name} back from the edge.` / peers line.
- `pickWound` returning `null` is no longer a hard failure when the target is
  dying (a hypothermia death has no wound to dress); in that case the dressing
  is **not** consumed and the outcome grades off competence alone.

**`cmd/medical/treat.yaml`** — help text gains the stabilization paragraph.
Validators unchanged (`requiresAnimate` + `requiresConscious` +
`mustHaveDressing`) — note that `mustHaveDressing` must be relaxed for the
no-wound dying case; either drop it from the view and check in the controller,
or leave it (a dressing is a fair price). **Leave it** — smaller diff, and the
requirements scope this to "the already-shipped medic loop".

**`obj/command/perception/AssessController.ts`**
- New readout block when `target.isDying()`, gated on the already-resolved
  `medBand`:
  - `novice` → "They're dying."
  - `apprentice` → "They're dying — {{cause family}}."
  - `proficient`+ → the cause and the remaining window in game-time
    (`getDyingRemainingSec()` rendered through the existing time formatting).
- **Competence buys information, never outcomes** — no roll, no effect.

**`cmd/perception/assess.yaml`** — help text.

### Tests

| Test file | Asserts | AC |
|---|---|---|
| `obj/command/medical/__tests__/Treat.stabilize.test.ts` | A second character with a dressing and `proficient` medicine clears `dying` on a dying body; band drops `dying → critical`; an `ActSignature` is minted with the `medicine` discipline. | *"A second character stabilizes a dying one with `treat`"* |
| same | A `novice` treater's `failure` outcome does **not** clear `dying` (the dressing is still spent). | *"the outcome is graded by `medicine` competence"* |
| `obj/command/perception/__tests__/Assess.dying.test.ts` | Novice reads a bare "dying"; proficient reads the cause **and** a remaining window within one step of the true value. | *"`assess` reports the remaining window at competence-scaled fidelity"* |

### Risks

- `stabilize()` must not also clear the underlying condition (the
  hypothermia affliction, the bleeding trauma) — otherwise a rescued body
  never re-enters `dying` and the medic becomes a cure. The next
  `reconcileConditions` re-arms `dying` if the driver's threshold is still
  crossed. **That is correct**: stabilizing in a snowdrift buys you time, not
  a life. Pin it with a test.

---

# Wave 4 — The corpse

**Delivers.** The material fork slices, `adoptMaterialState`, and
`PostmortemMixin` (staged decay, forensic degradation, the `canEvict`
terminus). Still **NPC/creature path only** — the same Stuff becomes the
corpse. This is the whole forensic object, provable without any player
machinery.

### Changes

**`lib/vitals/Vitals.ts`** — the fork side (§ *The material-slice protocol*):

```ts
export const MATERIAL_FORK_SLICES = ['Vitals','Trauma','CauseOfDeath','Anatomy'] as const;

forkSlice_Vitals(): unknown        // { [sign]: rawValue } for VITAL_SIGNS
forkSlice_Trauma(): unknown        // structuredClone of `conditions`, minus any DyingRecord
forkSlice_CauseOfDeath(): unknown  // { causeOfDeath }
forkSlice_Anatomy(): unknown       // structuredClone of `bodyPartDeltas`

/** Adopt a forked material record. NOT a `mergeSlice_`: material state has
 *  no path through `applyForkedState`, which is what makes a corpse
 *  un-reanimatable by PROTOCOL rather than by policy (antipatterns.md).
 *  Gated to the death choreography. */
@CallSecurity(FromModule('/api/condition#ConditionApi'))
adoptMaterialState(slices: Record<string, unknown>): void
```

**`lib/mortality/MortalArc.ts`** (new — named value-object / vocabulary):

```ts
export interface MortalArc {
  /** Game-time seconds of death. */
  diedAt: number;
  cause: string;
  /** Runtime handle to the corpse; NEVER load-bearing (a corpse may decay
   *  or be lost to a restart — no route may require it). */
  corpseStuffId?: string;
  /** Where the body fell, for the shade's reappearance fallback. */
  whereTemplatePath?: string;
}

export const DECAY_STAGES = ['fresh','stale','decomposed','spent'] as const;
export type DecayStage = (typeof DECAY_STAGES)[number];

export const MORTALITY_DEFAULTS = {
  DECAY_STAGE_SEC: 3600,          // game-seconds per stage
  /** Forensic readability multiplier per stage (assess fidelity). */
  FORENSIC_READABILITY: { fresh: 1, stale: 0.6, decomposed: 0.25, spent: 0 },
} as const;
```

**`lib/mortality/Postmortem.ts`** (new — `PostmortemMixin`, `Mixins.Postmortem`,
`MixinApi.isPostmortem`), composed onto **`Creature`** (so an NPC corpse *is*
the same Stuff, and a PC's freshly-minted corpse Creature gets it for free):

- persistent fields `diedAtGameSec`, `decayStamp`; derived `decayStage`.
- `markDeceasedAt(gameSec)` — set once by `ConditionLogic.die`.
- `private reconcileDecay()` — reconcile-on-read, game-time,
  **stamp-and-integrate like every other driver**; runs at the top of
  `getDecayStage()`, `getForensicReadability()`, `getPostmortemProgressions()`
  and `canEvict()`. This one **does** inherit the far-past guard? **No** —
  decay is a clock on a dead object with no player; skip the linkdead check
  (a corpse has no Interactive) and skip the gap cap (a corpse should be
  rotten when you come back). Comment the divergence with a pointer to I2's
  reasoning.
- `getForensicReadability(): number` — `MORTALITY_DEFAULTS.FORENSIC_READABILITY[stage]`.
- `override getPostmortemProgressions(): readonly string[]` — fills the seam
  `vitals.md` reserved; returns the reached stage names.
- `override canEvict(ctx)` — `{ ok: false, reason: 'a body still lies here' }`
  while `isDead() && stage !== 'spent'`; otherwise `super.canEvict(ctx)`.
  Inert for a living Creature.
- No `mergeSlice_` anything.

**`lib/creature/Creature.ts`** — compose `PostmortemMixin` outermost-but-inside
`ConcealableMixin` (it reads lifecycle + world clock only; placement is
immaterial to the ordered body stack). Document the placement in the existing
composition comment block. Add `Mixins.Postmortem` to `lib/mixin.ts`.

**`obj/api/ConditionLogic.ts`** — `die`'s non-player branch grows:

```
host.setLifecycleState('dead');
host.markDeceasedAt(WorldClockApi.getNow().rawValue());
// Algor mortis needs no code: ThermalRegulation.integrateThermalSlice
// already drifts a non-endotherm/dead body toward ambient.
```

Plus a module-private `mintCorpseFrom(body): Promise<Stuff & Creature>` used
by the **player** branch in Wave 5 and proven by a test here:

```
const corpse = await StuffApi.create(() => new Creature());   // NO templatePath — I4
corpse.setSpecies(body.getSpecies());
corpse.setName(`the body of ${body.getPresentation()}`);      // presentation is imperative
corpse.setShortDescription(...); corpse.setLongDescription(...);
corpse.adoptMaterialState(pick(body.collectForkSlices(), MATERIAL_FORK_SLICES));
corpse.setLifecycleState('dead');
corpse.markDeceasedAt(now);
// loadout: worn first (release each slot), then carried
for (const item of body.getContents()) ContainmentApi.move(item, corpse);
ContainmentApi.move(corpse, body.getContainer());
```

> `StuffApi.create` without a template is normally an antipattern
> (`docs/antipatterns.md` § *`StuffApi.create()` Instead of a Template*). The
> corpse is the sanctioned exception for the same reason `WireBody` is: it is
> a **runtime-only, per-instance, non-authored** object whose identity is the
> body it came from. Record it in the sweep next to `WireBody`.

### Tests

| Test file | Asserts | AC |
|---|---|---|
| **`lib/persistence/__tests__/material-slices.no-merge.test.ts`** | Walk the prototype chains of `Creature`, `Character`, `Avatar`, `Shade` (Wave 5) collecting `mergeSlice_*` names; assert the intersection with `MATERIAL_FORK_SLICES` is **empty**. Also assert `forkRuntimeState(corpse, freshCreature)` leaves the fresh Creature's vitals at baseline. | *"No material slice implements `mergeSlice_` — asserted by a test"* (**I3**) |
| `lib/mortality/__tests__/Postmortem.decay.test.ts` | Stage progression over game-time; `getForensicReadability` falls monotonically; `canEvict` vetoes until `'spent'` then permits. | *"decays through stages that degrade forensic readability; at terminal decay it permits eviction"* |
| `lib/mortality/__tests__/Postmortem.decay.test.ts` | At `'spent'`, `StuffApi.destruct(corpse)` evacuates its items to the room (not destroyed) and their chattel rows survive. | *"its items evacuate"* |
| `obj/api/__tests__/ConditionLogic.corpse.test.ts` | An NPC killed by exsanguination: the **same Stuff** is the corpse, carries the cause stamp, the wound map (`getConditions()` has the trauma), and its loadout; it cools toward ambient over game-time. | *"A corpse persists as a `Creature` with the cause stamp, the wound map, and the loadout; it cools toward ambient"* |
| `obj/api/__tests__/ConditionLogic.corpse.test.ts` | `mintCorpseFrom` on a plain Creature produces a second Creature with the material state and the loadout, and the donor is left at baseline. | prerequisite for Wave 5 |

### Risks / ordering hazards

- **`ContainmentApi.move` of worn items** — a worn item occupies a slot;
  moving it out must release the slot. Use the shipped remove path
  (`SlotApi` / `Slotted.release`) before the move, or the corpse gets items
  that still think they're worn on the deceased. Check `Slotted`'s
  `cleanupOnDestruct` for the existing evacuation idiom and reuse it.
- **Do not** give the corpse a `_chattelId`. Chattel composes at the `Thing`
  tier; a `Creature` carries none, which is the requirements' decision
  ("custody of a *body* is the deferred coroner economy"). Do not add
  `ChattelMixin` to `Creature`.
- Residency ships in **observe** mode (`residency.eviction.mode`), so a spent
  corpse is not culled in production. That is fine and is not this build's
  call to change; test the `canEvict` contract directly and note it in
  `docs/subsystems/mortality.md`.

---

# Wave 5 — The PC split and the shade

**Delivers.** The doctrinal split (a PC's body divides; the identity leaves),
the durable arc, the `Shade`, `requiresEmbodied`, intrinsic attunement, the
shade-perception axis, and login-as-a-shade. **This is the largest wave and
the one with every ordering hazard in it.**

> **Land Wave 5 and Wave 6 back-to-back.** Wave 5 alone leaves a dead player
> as a shade with no way back. Each is independently *testable*; only the pair
> is playable.

### Changes

**`lib/mortality/Incorporeal.ts`** (new — `IncorporealMixin`,
`Mixins.Incorporeal`, `MixinApi.isIncorporeal`):

- One field, `revocationReason: string` (default: "Your hand passes through
  it."), so the same lever re-skins for the deferred prison build
  (mortal-vessel Thesis 4) without a second mixin.
- `getRevocationReason()` / `setRevocationReason()`.
- `static commandContributions = { self: ['charactergen/passage'] }` — the
  affordance seam (the `PersonaMixin` → `chronicle` precedent). Wired in
  Wave 6; declare the mixin here.

**`lib/command/validators/requiresEmbodied.ts`** (new — the fourth sibling of
`requiresAnimate` / `requiresConscious`):

```ts
const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  if (!MixinApi.isIncorporeal(giver)) return undefined;
  return giver.getRevocationReason();
};
```

Sync, no preload. Tag it on the **material** verb views. The tagging is by
category, and a pinned test makes drift impossible:

| Category | `requiresEmbodied` | Rationale |
|---|---|---|
| `inventory`, `crafting`, `bulk`, `device`, `boundary`, `combat`, `medical`, `retail`, `banking`, `posture`, `magic` | **tagged** (every view) | acts on matter |
| `movement`, `social`, `perception`, `system`, `shell`, `author`, `charactergen`, `governance`, `civics`, `stream`, `work`, `tpa` | **untagged** | the shade walks and speaks; platform acts ride the Participant |
| `domain/**/cmd/*.yaml` (content verbs) | untagged | content's call; note in `command-spec.md` |

`tpa` is deliberately untagged — a shade holds no travel credential, so the
shipped credential gate refuses it without a special case (the same argument
as locks). `magic` **is** tagged: casting is a bodily act, and "being unseen
grants nothing exploitable" rests on the shade having no material powers.

**`lib/mortality/Shade.ts`** (new — the `WireBody` sibling; read
`lib/sandbox/WireBody.ts` beside it):

```ts
export default class Shade extends IncorporealMixin(Avatar) {
  constructor(playerId?: string, species?: Species | null)   // WireBody's exact reasoning:
                                                             // species before postRegister or
                                                             // the body plan is missing
  override async postRegister(ctx) {
    if (this.shadeSpecies) this.setSpecies(this.shadeSpecies);
    await super.postRegister({ ...ctx, playerId: undefined });  // NOT registered here — I4
    this.shadePlayerId = playerId;
    this.setLifecycleState('undead');
    this.setConcealment(shadeConcealmentBand());      // the perception dial
  }
  override shouldPersist() { return false; }
  override startAutoSave() { /* no-op */ }
  override getPlayerId() { return this.shadePlayerId; }
  override getIdentityPath() { return Avatar.getTemplatePath(this.shadePlayerId); }
  /** Intrinsic attunement — no implant, no slot occupancy. Ground-truth #4. */
  override getConferredMixinNames() { return [...super.getConferredMixinNames(), 'AetherMixin']; }
  /** The shell fork carries the deceased's `alive` lifecycle; force it. */
  override mergeSlice_Embodiment(slice) { super.mergeSlice_Embodiment(slice); this.setLifecycleState('undead'); }
  /** No credential wallet — that is what confines a shade to the commons. */
  override defaultHostedUpdatePaths() { return [TemplatePaths.commsUpdate, TemplatePaths.forumsUpdate]; }
  /** Transient: reaped on disconnect, exactly as WireBody is. */
  override onLinkdead() { StuffApi.destruct(this); }
  override onDestruct() { this.stopAutoSave(); PlayerApi.unregisterAvatar(this);
                          for (const i of [...this.getInteractives()]) ConnectionApi.detach(i); }
}
```

**`obj/Avatar.ts`** — one small refactor to open the loadout seam:

- extract the three hosted-update clone paths in `installDefaultLoadout` into
  `protected defaultHostedUpdatePaths(): string[]` (returns comms, forums,
  wallet). `Shade` narrows it. No behavior change for Avatar/WireBody.
- `reconcileMortalState()` (from Wave 0) grows its arc branch: when
  `mortalArc !== null`, do **not** heal — leave the body untouched and let
  `Login` swap it for a shade (below).

**`obj/api/ConditionLogic.ts`** — the player branch of `die`, in this exact
order. **Every step here is I4.**

```
sync prefix (after the shared prefix):
  a. avatar.stopAutoSave();                     // kill the timer that could capture a dead body
  b. const material = pick(avatar.collectForkSlices(), MATERIAL_FORK_SLICES);
  c. avatar.setMortalArc({ diedAt, cause, whereTemplatePath: room?.getTemplatePath() });
  d. avatar.resetVitalsToSpeciesBaseline(); clear conditions; setCauseOfDeath(null);
     //  the avatar is NEVER flipped to 'dead'  ← I1
async tail:
  e. await avatar.save();                       // ← CAPTURE, before anything is destructed
  f. corpse = await mintCorpseFrom(avatar, material);   // Wave 4 helper; moves the loadout
     avatar.setMortalArc({ ...arc, corpseStuffId: corpse.stuffId });
  g. ledgers (Wave 2)
  h. if (avatar.isConnected()) {                // true for a directly-connected OR a parked body
       shade = await mintShade(avatar);         // StuffApi.create(() => new Shade(pid, species))
       await PersistableApi.forkRuntimeState(avatar, shade);   // shell only — I3 makes it so
     }
  i. avatar.markForRevert();                    // Wave 0 made this real
     PlayerApi.unregisterAvatar(avatar);
     await StuffApi.destruct(avatar);           // ← UNSTAMP before the re-stamp
  j. if (shade) {
       PlayerApi.registerAvatar(shade);         // ← only now; the slot is free
       ExecutionContextApi.runRoot(null, 'mortality.transfer', () => {
         for (const i of [...held]) ConnectionApi.transfer(i, shade);   // per-Interactive,
       }, { circleScope: OMNI_SCOPE });                                  // omni root
       for (const i of held) { await shade.enter(i); MqlSubscriptionApi.refreshForInteractive(i); }
     }
```

Notes on the ordering:
- **(e) before (f)** — the snapshot records a clean body *and* the arc; the
  corpse takes the gear afterwards, so the snapshot cannot resurrect it.
- **(i) before (j)** — `PlayerApi.registerAvatar` warns-and-returns when the
  slot is taken (`PlayerLogic.ts:89`), and `byTemplatePath` throws on two
  live objects at one path. Unregister/destruct first, always.
- **(h) is `isConnected()`, not "has Interactives"** — `Avatar.isConnected()`
  is `true` for a **parked** body (its sockets are on a wire vessel). This is
  what makes the Wave 7 "field body died while parked → exit as a shade" case
  fall out with no extra plumbing: the shade already exists and holds the
  registry slot when `SandboxLogic.exitImpl` looks for it.
- **Known window:** between (c) and (j) the drained Avatar is briefly alive
  and holding sockets. Commands are serialized per socket and the body is a
  healthy baseline body, so the worst case is one innocuous command. Record
  it as an accepted risk in `docs/subsystems/mortality.md`.

**`obj/api/ConditionLogic.ts` — `embodyForSession(avatar): Promise<Avatar>`**
(the single lazy-mint seam; gated to `ConditionApi`):

```
if (!avatar.isDeceased()) return avatar;
shade = await StuffApi.create(() => new Shade(pid, avatar.getSpecies()));
await PersistableApi.forkRuntimeState(avatar, shade);        // shell only
place shade at: corpse (StuffApi.findById(arc.corpseStuffId), if live)
                else arc.whereTemplatePath, else defaultStartLocation
avatar.markForRevert(); PlayerApi.unregisterAvatar(avatar); await StuffApi.destruct(avatar);
PlayerApi.registerAvatar(shade);
return shade;
```

**`obj/Login.ts` `playCharacter`** — one line, after the avatar resolves and
**before** `ConnectionApi.transfer`:

```ts
const body = await ConditionApi.embodyForSession(avatar);
ConnectionApi.transfer(this.interactive, body);
await body.enter(this.interactive);
```

**`obj/api/PerceptionLogic.ts` — the shade-perception axis.** Two edits, both
in `perceivesImpl`, **before** the `isConcealable` short-circuit:

```ts
// The shade plane (mortality). Content authored on the shade plane
// resolves ONLY for an incorporeal viewer; the material plane is
// unchanged for everybody, so a shade still sees the tavern it cannot
// drink in. THIS BUILD AUTHORS NOTHING ON THE SHADE PLANE.
const plane = MixinApi.isConcealable(target) ? target.getPerceptualPlane() : 'material';
if (plane === 'shade' && !MixinApi.isIncorporeal(viewer)) return false;
```

**`lib/concealment/Concealable.ts`** — one authored field
`perceptualPlane: 'material' | 'shade'` (default `'material'`, validated on
set, `@authorable`, added to `persistentFields`), plus
`getPerceptualPlane()` / `setPerceptualPlane()`. Inert for every existing
thing.

**Shade perceptibility itself needs no new code.** A `Shade` sets its
`concealment` band from a dial (`AppSettingKeys.mortalityShadeConcealment`,
default `'hidden'`) in `postRegister`; `PerceptionApi.perceives` then resolves
it through `effectivePerception = awareness-band capacity + attention +
light`, and the shipped honest-fog seams (`LookController.visibleContents`,
`SenseController`, `Exitable.obviousExitsFor`, MQL `isVisible`,
`Container.contents` projection) hide it from a viewer who does not clear the
bar. Because a `Shade` has no `templatePath`, `getDiscoveryKey()` returns
`undefined`, so a find is **never** recorded as a sticky belief discovery —
each encounter re-resolves. That is the correct behavior for a transient body
and it falls out for free.

**The `undead` audit** (I5) — beyond the three guards fixed in Wave 0, grep
and inspect every lifecycle branch:

```
grep -rn "getLifecycleState\|isAlive()\|isDead()\|isUndead()" src/mud --include=*.ts | grep -v __tests__
```

Known set at time of writing (12 non-test sites); each must be classified in
the plan's execution notes as *correct for undead* / *fixed*:

| Site | Verdict |
|---|---|
| `Vitals.ts:391,442,593` | correct (`=== 'dead'`; a shade's readouts should compute) |
| `Vitals.ts:761,778` | rewritten by Wave 1 |
| `requiresAnimate.ts:32` | correct (message tailoring only; `isAnimate` already admits `undead`) |
| `ThermalRegulation.ts:277,538`, `Respiration.ts:327,552`, `Metabolic.ts:807` | fixed in Wave 0 |
| `CombatLogic.ts:3622,3626` (`coupEligible`) | **audit**: an `undead` shade is not a valid coup victim; but a shade cannot be attacked (no `requiresEmbodied` on the attacker's side means the *attacker* can try). Change both to `!isAlive()` so a shade is never coup-eligible. |
| `SpeciesLogic.ts:75` (`isAnimate`) | correct — this is the shipped `alive \|\| undead` rule the shade depends on |
| `ProfileLogic.ts:158` | audit (a display string) |
| `Growing.ts:630` | out of scope |

Add `'undead'` to the `lifecycleStates` array of the seeded humanoid species
so a future validating setter does not reject a shade
(`seeds/lib/species/**.yaml`). Data-only, no code.

### Tests

| Test file | Asserts | AC |
|---|---|---|
| `lib/mortality/__tests__/Shade.composition.test.ts` | `shouldPersist()` false; never captures; `getIdentityPath()` is `/obj/Avatar/<pid>`; `lifecycleState === 'undead'`; `SpeciesApi.isAnimate` true; `MixinApi.isActive(shade,'AetherMixin')` true **with `getOccupants('cranial').size === 0`**; composes `Container` + `Slotted` and holds nothing. | *"A shade is animate, is attuned with no implant occupying a slot, and holds nothing — while still composing `Container`/`Slotted`"* |
| `lib/command/validators/__tests__/requiresEmbodied.test.ts` | Refuses an incorporeal giver with the revocation prose; passes a normal Avatar; passes a non-Organism. | — |
| **`cmd/__tests__/embodied-tagging.test.ts`** | Enumerate every `cmd/**/*.yaml`; assert the material categories all carry `/lib/command/validators/requiresEmbodied` and the platform categories carry none. A pinned inventory — drift fails the build. | *"tagged on material verbs and absent from platform ones"* |
| `obj/api/__tests__/Shade.verbs.test.ts` | In one test: a shade is refused `get`/`wear`/`wield`/`open`/`eat`, and served `say`, `go`, `look`, `who`, a chat post, and a forum read. | *"refused every `requiresEmbodied` verb and served every platform verb … in the same test"* |
| `obj/api/__tests__/Shade.boundary.test.ts` | A shade traverses into a public room; a locked/credentialed exit refuses it through the ordinary `Lockable`/credential path — **assert no mortality code is on the stack** (the refusal prose is the shipped boundary prose). | *"refused at a locked/credentialed boundary, by the ordinary machinery (no bespoke check)"* |
| `obj/api/__tests__/PerceptionLogic.shade.test.ts` | A `novice`-awareness viewer does not perceive a shade; a `proficient` viewer does; the shade's `stuffId` appears in **no** emitted frame or MQL projection for the novice (the shipped wire-leak assertion shape). A fixture object with `perceptualPlane: 'shade'` is invisible to a living viewer and visible to the shade. | *"perceptible … at fidelity scaled by awareness competence, and the shade-perception axis is exercised by a test fixture"* |
| `obj/api/__tests__/ConditionLogic.pc-death.test.ts` | Player death: the Avatar is destructed, a corpse Creature holds the loadout and the wound map, the shade holds the sockets, the identity's `holder_snapshots` record carries `mortalArc` and **`lifecycleState: 'alive'`**. | **I1**, *"the drained Avatar is destructed"* |
| same | Registry: at no point are two live objects at `/obj/Avatar/<pid>`; `PlayerApi.findAvatarByPlayerId` returns the shade after death. | **I4** |
| `obj/__tests__/Login.shade.test.ts` | A deceased identity logging in gets a `Shade`, not a living body; it appears **at its corpse** when the corpse is alive and **at the wake point** when it is not. | *"A shade who logs out and back in returns a shade … and reappears at its corpse when one survives"* |
| `lib/mortality/__tests__/survivals.test.ts` | Across death: chronicle entries, transcript/competence, traits, beliefs, renown, contacts and chattel titles all resolve for the identity on the new body; **gear is on the corpse, vitals are baseline**. | *"the new body carries the shell slices and … chronicle, transcript, renown, contacts and chattel titles survive"* (completed in Wave 6) |

### Risks / ordering hazards

- **The whole of I4 lives in this wave.** Write the `die` player branch with
  the step letters as literal comments so a reviewer can check the order.
- `PersistableApi.forkRuntimeState` collects under an omni sub-root and
  applies in the ambient context — for the shade both sides are field, so
  there is nothing to scope. Do not wrap it.
- **`Shade.onLinkdead` destructs the body.** `Avatar.onLinkdead` emits
  presence and handles `leaveIntent`; the override skips all of it. Make sure
  a shade's disconnect does **not** emit `PlayerLoggedOut` twice (it should
  emit once — chain `super` only for the event, or emit explicitly).
- **Import cycles.** `ConditionLogic` must reach `Shade` and `Creature` by
  `await import(...)` (the `SandboxLogic` precedent), and must never
  `import Avatar` statically. Detect a player body structurally
  (`MixinApi.isHasInteractive(host) && host.getPlayerId?.() !== ''`), not by
  `instanceof`.
- **Import boundary.** `lib/mortality/*` may import only from within
  `src/mud/`. `pnpm lint:imports` gates it; the exception registry stays
  empty.

---

# Wave 6 — Re-embodiment

**Delivers.** The transition back — one gated Api method and one floor verb.
Ordered last of the arc because it consumes everything before it; it is the
wave that makes a player playable again.

> **Scope note (decided 2026-07-31, replacing an earlier draft).** There is
> **no `PassageRoute`, no `PassageTerms`, and no registry.** An earlier
> version of this wave specified them; they were cut as a schema for content
> that does not exist yet. Being a ghost is an authoring space, and a
> vocabulary written today would constrain it rather than serve it — the
> first author who wants a term the interface didn't anticipate is blocked by
> the abstraction. **Do not reintroduce them.** The engine owns two
> transitions (`die`, `reembody`); everything between is content built on
> shipped systems — banking charges, containment gives and takes, a quest
> gates however it likes, and each finishes by calling `reembody`.

### Changes

**`obj/api/ConditionLogic.ts` — `reembody(shade, container): Promise<Avatar>`**
(gated to `ConditionApi`; the single transition back, callable by content):

```
1. refuse unless MixinApi.isIncorporeal(shade) and its identity isDeceased()
2. held = [...shade.getInteractives()]
3. PlayerApi.unregisterAvatar(shade); await StuffApi.destruct(shade);   // ← unstamp, I4
4. avatar = (await PlayerApi.loadAvatarsForUser(user))                  // clone + materialize
            .find(a => a.getPlayerId() === pid)
   //  materialize restores the baseline body written at death, plus the arc
5. ContainmentApi.move(avatar, container)        // the CALLER chose where
6. avatar.setMortalArc(null)                     // the arc is cleared ONLY here
7. await avatar.save()                           // the identity is alive and unmarked again
8. ChronicleApi.recordDeed(avatar, { template: '…returned…', tags:['death','passage'] })
9. omni-root per-Interactive ConnectionApi.transfer(i, avatar); await avatar.enter(i);
   MqlSubscriptionApi.refreshForInteractive(i)
```

Step 3 before step 4 is I4: `loadAvatarsForUser` registers at
`/obj/Avatar/<pid>` and would collide with a still-live shade holding the
`PlayerApi` slot.

**`reembody` never reads the corpse.** Nothing in the signature or the body
mentions it — which is how "no path back may depend on the corpse existing"
stops being a rule anyone has to remember. Regression-tested below.

What the caller decides, and the engine does not model: **where** you wake
(the `container` argument), **what you keep** (content moves items with
`ContainmentApi` — the corpse's contents are ordinary containment), and
**what it costs** (content charges through banking, takes a credential,
consumes an item, whatever it is). Diminishment, when designed, rides a
condition or a trait.

**`cmd/charactergen/passage.yaml` + `obj/command/charactergen/PassageController.ts`**
— the MVC pair (category chosen to sit beside `chronicle`, the other
identity-lifecycle verb; see *Open concerns*). **The floor, and the only
engine-side caller of `reembody`.** No arguments, no subcommands: it resolves
the wake point and calls `reembody`. It exists so that "no content is
available" can never strand a player — the snapshot defect's failure class
wearing a third costume.

The wake point is `AppApi.setting(AppSettingKeys.defaultStartLocation)`, read
**read-only**, resolved through `ContainmentApi.resolveLanding` (the same
Warren-or-room decision `Avatar.applyStartLocation` uses). A comment names
the seam where *"wake at your residence"* plugs in later — **zero coupling to
the live residences build.**

Validators: **none** — a shade is `undead` (passes `requiresAnimate`) but the
verb must also work for a shade that is somehow unconscious, and it is
emphatically *not* `requiresEmbodied`. Afforded by
`IncorporealMixin.commandContributions.self`, so only a shade sees it.

Controller uses the response envelope (`ctx.note` + `MessageApi.scene`),
returns `void`, and never returns a `{success}` object
(`docs/subsystems/response-envelope.md`).

### Tests

| Test file | Asserts | AC |
|---|---|---|
| `obj/command/charactergen/__tests__/Passage.test.ts` | `passage` mints a new Avatar at `defaultStartLocation`, transfers the sockets, and clears the arc. | *"`passage` re-embodies a shade at the wake point"* |
| same | **`ConditionApi.reembody` called directly with a different container** lands the new body there — proving content can drive the transition without the verb, and that nothing about the destination is hardcoded. | *"a test calls `ConditionApi.reembody` directly with a different container"* |
| **`obj/command/charactergen/__tests__/Passage.no-corpse.test.ts`** | Destruct the corpse, then re-embody: it completes. | *"`reembody` completes with no corpse in the world"* — *"that is the bricking failure mode in a new costume"* |
| `lib/mortality/__tests__/survivals.test.ts` (completed) | End-to-end: death → corpse → shade → `passage` → new body, in one session, with the shell slices (name, aliases, settings, cockpit layout) intact and the durable ledgers resolving. | *"A player can die and play again in the same session"* |
| `e2e/tests/mortality.spec.ts` | Browser pass: die, see the shade's world pane, walk somewhere public, be refused a locked door, `passage`, wake. Assert on the **location pane heading**, never the append-only feed (the sandbox battery's hard-won lesson). | end-to-end AC |

### Risks

- Step 4 re-runs `Avatar.postRegister`, which calls `reconcileMortalState()`
  — and the arc is still set at that moment. Make `reconcileMortalState`'s arc
  branch a **no-op when the caller is `reembody`** (simplest: `reembody`
  clears the arc at step 6, and `reconcileMortalState` only *swaps to a shade*
  when `Login` asks — i.e. keep the swap in `embodyForSession`, which
  `reembody` does not call). Do not put the swap inside `postRegister`.
- `loadAvatarsForUser` needs a `User`; hold it off the shade
  (`Shade` inherits `getUser()`; forward it at mint).

---

# Wave 7 — The circle: in-circle death and the forgeable-evidence hole

**Delivers.** A wire body's death staged and discarded inside a circle, the
eject-not-respawn correction, the parked-body-died-while-away exit path, and
the `deriveBlame` circle predicate. Independently landable; the two halves are
independent of each other.

### Changes — in-circle death

**`obj/api/ConditionLogic.ts`** — the third branch of `die`:

```
const scope = host.getCircleScope();
if (scope !== null && scope !== OMNI_SCOPE) {
  // Real inside the circle and discarded with it — that is the point of a
  // holodeck, and it is what lets an author test a lethal trap.
  corpse = await mintCorpseFrom(host, material);   // ambient context is the circle root,
                                                   // so StuffApi.create stamps it circle-born
  // ledgers ride the shipped PM policy table (PASS(mark)) — NO bespoke suppression
  await SandboxApi.exit(host);                     // eject to the parked field body
  return;                                          // no shade, no arc, no passage, no snapshot
}
```

The circle-scope receiver stamp (`Stuff.getCircleScope()`) is the
discriminator — not `instanceof WireBody` — so a future circle vessel of
another class behaves identically.

**`obj/api/SandboxLogic.ts`**

- **Delete `respawnWireBody`** (and `api/sandbox.ts:221`). Rewrite
  `api/__tests__/sandbox.crossing.test.ts`'s respawn case as an eject case.
- `exitImpl` — the "exit must not assume the parked body is alive" fix. Today
  it does `PlayerApi.findAvatarByPlayerId(playerId)` and guards `if (avatar)`.
  Wave 5's `die` already registers the **Shade** in that slot when the field
  body dies while parked (because `Avatar.isConnected()` is `true` while
  parked), so `exitImpl` finds a body and the existing choreography just
  works. Add:
  - an explicit comment at the lookup naming the case;
  - a defensive branch: when `avatar` is `null` **and** the identity is
    deceased, `await ConditionApi.embodyForSession(...)` to mint the shade
    before transferring. (Reachable only if the parked avatar died while
    momentarily disconnected.)
  - `avatar.setParked(false)` is harmless on a Shade; leave it.

### Changes — circle-marked rows produce no crime

**`lib/accountability/AccountabilityEvent.ts`**

```ts
/** The epistemic wire mark PM stamps on a row written from circle context
 *  (PASS(mark), sandbox.md § the policy table). Declared so it ROUND-TRIPS
 *  — `Document.fromDocument` only reads declared persistentFields — and
 *  kept OFF field-side rows by the toDocument override below, so a field
 *  row stays byte-identical to today's. */
circleScope: string | null = null;
// …added to persistentFields

protected override toDocument(): Record<string, unknown> {
  const doc = super.toDocument();
  if (doc.circleScope == null) delete doc.circleScope;   // PM stamps it; we never do
  return doc;
}

static deriveBlame(rows) {
  // A killing staged inside a private circle its owner controls is not
  // evidence about anyone. Derive-on-read re-legislates history without
  // rewriting a row — which is what this ledger was built for.
  const field = rows.filter((r) => !r.circleScope);
  const terminal = field.filter((r) => r.kind === 'death' || r.kind === 'harm');
  … unchanged from here …
}
```

`eventsForSession` is **unchanged** — readouts may lens the mark; only the
crime derivation ignores it. Chronicle keeps writing the marked deed ("you
died in a holodeck" is a true thing about you).

### Tests

| Test file | Asserts | AC |
|---|---|---|
| `lib/accountability/__tests__/AccountabilityEvent.circle.test.ts` | A `death` row with `circleScope` set yields `deriveBlame → null`; the identical row without it yields the existing verdict. The shipped field-side blame regression is **unmodified**. | *"A death staged inside a circle produces no crime … with the existing field-side blame regression unchanged"* |
| `lib/accountability/__tests__/AccountabilityEvent.circle.test.ts` | Round-trip: a saved field row's document has **no** `circleScope` key. | no schema drift |
| `api/__tests__/sandbox.crossing.test.ts` (rewritten case) | A wire body's death mints a **circle-scoped** corpse (its `getCircleScope()` is the session scope), leaves the field body untouched (`lifecycleState 'alive'`, gear intact), and ejects the player to it. | *"a wire body's death in a circle mints a circle-scoped corpse, leaves the field body untouched, and ejects the player to it"* |
| `api/__tests__/sandbox.parked-death.test.ts` | Kill the parked field avatar mid-visit, then exit: the player exits **as a shade**, sockets attached, no throw. | *"a player whose field body died while parked exits as a shade"* |
| existing escape battery (`pnpm test:escape`) | green | boundary regression |

### Risks

- The corpse minted in-circle is discarded by
  `discardScopeImpl`'s runtime reap — verify it dies with the session
  (`closeSessionImpl` → the circle's rooms are circle-born and reaped). Assert
  it in the test.
- **Do not** add a `circleScope` index or a read filter to
  `accountability_events`. PASS collections get zero read injection (the
  checkable inertness criterion); the filter is in the pure `deriveBlame`.
- The near-miss the requirements record — a dying player crossing into a
  circle would get a healthy wire body — stays closed by accident (`dying`
  reads `unconscious`, so `go wardrobe` fails `requiresConscious`). Add a
  one-line regression in `api/__tests__/sandbox.crossing.test.ts` so it stops
  being an accident.

---

# Wave 8 — Docs, the antipattern entry, and the gates

**Delivers.** The permanent record. Run last; the sweep (`/finalize`) will
audit it.

- **`docs/subsystems/mortality.md`** (new) — the arc, the two clocks, the
  three objects, the Api surface, the dials, the invariant board, the
  accepted-risk notes (the drained-avatar window; residency observe mode).
- **`docs/subsystems/race.md`** — amend the *death ≠ destruction* rule with
  the doctrinal split (one rule, two mechanisms; NPC = same Stuff, PC = the
  body divides and the identity leaves). **Amend, never silently contradict.**
- **`docs/subsystems/vitals.md`** — `dying` band + condition Kind E; the
  postmortem seam is now filled; `getConsciousness` reads a dying body as
  unconscious.
- **`docs/subsystems/harm.md`** — the stabilization seam on `treat`; the
  dying-window constants; `ConditionApi` grew `die`.
- **`docs/subsystems/sandbox.md`** — replace the *"Death inside:
  `SandboxApi.respawnWireBody`"* bullet with the eject rule; add the reverse
  crossing to § *The crossing (as built)*; note the material slice family.
- **`docs/subsystems/chronicle.md`** — the death + passage minters join the
  three demo minters.
- **`docs/subsystems/accountability.md`** — `die` is the single `death`-row
  writer; `deriveBlame` ignores circle-marked rows.
- **`docs/subsystems/chattel.md`** — looting is recorded by chain-of-title, not
  by an accountability kind; no chattel row on a body.
- **`docs/subsystems/residency.md`** — the corpse joins the veto roster.
- **`docs/subsystems/perception.md`** / **`concealment.md`** — the
  `perceptualPlane` axis; shade perceptibility rides the awareness gradient.
- **`docs/antipatterns.md`** — new entry: **"A `mergeSlice_` for a material
  fork slice"**, with the correct alternative (`adoptMaterialState`, gated) and
  the reason (un-reanimatability is enforced by protocol, not policy).
  A second short entry: **"`StuffApi.create` without a template"** gains the
  corpse as a recorded, bounded exception beside `WireBody`.
- **`CLAUDE.md`** — one-line subsystem-map pointer:
  `- [mortality.md](./docs/subsystems/mortality.md) — the dying arc: the `dying` clock, `ConditionApi.die`, the corpse as a forensic Creature, the shade, `reembody` + the `passage` floor`.
  Also add the new command category note if the user approves one (see
  *Open concerns*).
- **Gates.** `pnpm test`, `pnpm lint`, `pnpm lint:imports`,
  `pnpm lint:gates`, `pnpm lint:boundary`, `pnpm lint:module-scope` all green.
  Specifically watch:
  `lint:imports` (`lib/mortality/*` imports nothing outside `src/mud/`),
  `lint:gates` (the new `FromModule('/api/condition#ConditionApi')` strings on
  `adoptMaterialState` and the `ConditionLogic` additions must resolve).

---

## File inventory

**New**

```
lib/mortality/MortalArc.ts            value-object + MORTALITY_DEFAULTS + DECAY_STAGES
lib/mortality/Postmortem.ts           PostmortemMixin  (→ Creature)
lib/mortality/Incorporeal.ts          IncorporealMixin (→ Shade)
lib/mortality/Shade.ts                Shade class (Avatar subclass)
lib/command/validators/requiresEmbodied.ts
cmd/charactergen/passage.yaml
obj/command/charactergen/PassageController.ts
seeds/lib/mortality/conditions/dying.yaml
seeds/obj/command/charactergen/PassageController.yaml   (controller seed)
docs/subsystems/mortality.md
```

**Modified**

```
lib/vitals/Condition.ts               DyingRecord; per-driver window defaults
lib/vitals/Vitals.ts                  band; consciousness; the dying arm (I2); fork slices;
                                      adoptMaterialState; MATERIAL_FORK_SLICES
lib/creature/Creature.ts              compose PostmortemMixin; resetVitalsToSpeciesBaseline
lib/species/Organism.ts               TSDoc only
lib/mixin.ts                          Mixins.Postmortem, Mixins.Incorporeal
lib/paths.ts                          TemplatePaths.mortalityDying
lib/config/AppSettings.ts             mortality.* dials
config/app-settings.yaml              the dials' values
lib/thermal/ThermalRegulation.ts      !isAlive(); beginDying
lib/respiration/Respiration.ts        !isAlive(); beginDying
lib/metabolism/Metabolic.ts           !isAlive(); beginDying
lib/concealment/Concealable.ts        perceptualPlane
lib/accountability/AccountabilityEvent.ts   circleScope + deriveBlame predicate
lib/encumbrance/LoadBearing.ts        CONDITION_BAND_MARGIN.dying
obj/Avatar.ts                         shouldPersist chain; mortalArc; reconcileMortalState;
                                      defaultHostedUpdatePaths seam
obj/Login.ts                          embodyForSession seam
api/condition.ts                      die / embodyForSession / reembody
obj/api/ConditionLogic.ts             the whole death choreography
obj/api/CombatLogic.ts                buildDeathRow; killImpl → die; coupEligible !isAlive()
obj/api/SandboxLogic.ts               delete respawnWireBody; exitImpl deceased-parked path
api/sandbox.ts                        delete respawnWireBody
obj/api/PerceptionLogic.ts            the shade-plane predicate
obj/command/medical/TreatController.ts     stabilization branch
obj/command/perception/AssessController.ts the dying readout
cmd/medical/treat.yaml, cmd/perception/assess.yaml   help text
cmd/{inventory,crafting,bulk,device,boundary,combat,medical,retail,banking,posture,magic}/*.yaml
                                      + requiresEmbodied
seeds/lib/species/*.yaml              lifecycleStates gains 'undead'
```

---

## Acceptance-criteria ↔ test map

| Requirements AC | Wave | Test |
|---|---|---|
| No non-test `setLifecycleState('dead')` outside one path | 2 | `ConditionLogic.die.test.ts` (source scan) |
| Each shipped driver enters `dying`, dies on its window | 1, 2 | `dying-per-driver.test.ts`, `CombatLogic.dying.test.ts` |
| `treat` clears `dying`, graded, mints `ActSignature`; `assess` reports the window | 3 | `Treat.stabilize.test.ts`, `Assess.dying.test.ts` |
| Die and play again in the same session, end-to-end | 6 | `survivals.test.ts`, `e2e/tests/mortality.spec.ts` |
| A dead player who logs out is not stuck | 0 | `Avatar.mortal-snapshot.test.ts` |
| A shade who logs out returns a shade, at its corpse | 5 | `Login.shade.test.ts` |
| A dying character who disconnects dies on schedule | 1 | `Vitals.dying-disconnect.test.ts` |
| `reembody` completes with no corpse in the world | 6 | `Passage.no-corpse.test.ts` |
| Circle death: circle-scoped corpse, field body untouched, eject; parked-death exits as a shade | 7 | `sandbox.crossing.test.ts`, `sandbox.parked-death.test.ts` |
| Circle death produces no crime; field regression unchanged | 7 | `AccountabilityEvent.circle.test.ts` |
| Corpse: cause stamp, wound map, loadout, cools, decays, evicts, items evacuate | 4 | `ConditionLogic.corpse.test.ts`, `Postmortem.decay.test.ts` |
| No material slice implements `mergeSlice_` | 4 | `material-slices.no-merge.test.ts` |
| Shade refused at a credentialed boundary by ordinary machinery | 5 | `Shade.boundary.test.ts` |
| Shade refused every embodied verb, served every platform verb | 5 | `Shade.verbs.test.ts`, `embodied-tagging.test.ts` |
| Shade does not starve/suffocate/freeze/die twice | 0 | `undead-survival-guards.test.ts` |
| Shade animate, attuned without an implant, holds nothing, keeps Container/Slotted | 5 | `Shade.composition.test.ts` |
| Shade perceptible by awareness competence; shade-plane fixture | 5 | `PerceptionLogic.shade.test.ts` |
| `passage` re-embodies at the wake point; `reembody` called directly by content | 6 | `Passage.test.ts` |
| Chronicle deed + non-combat accountability row; combat blame unchanged | 2 | `ConditionLogic.die.test.ts`, existing `CombatLogic.test.ts` |
| Docs | 8 | — |
| All six gates green | every wave | CI |

---

## Open concerns for the user

These are places where reading the real code contradicted, or under-determined,
something the requirements assume. **None was silently deviated from** — each
has a decision recorded above.

> **Items 1, 2 and 6 were ruled on by the user on 2026-07-31 and are CLOSED**
> — the decisions the plan already takes were confirmed. They are kept here
> with their reasoning so the build agent knows they were considered, not
> overlooked. **Do not reopen them.** Items 3–5 and 7–10 stand as recorded.

1. **[CLOSED — strict reading confirmed]** **`mergeSlice_` for material slices is unavoidable *if* the corpse receives
   state through `applyForkedState`.** `ForkableMixin.applyForkedState` calls
   `mergeSlice_<Name>` on the target, and both a corpse and a living body are
   `VitalsMixin` hosts — so a shared `mergeSlice_Vitals` *is* the "trusted
   mixin escape" the design forbids. **Decision taken:** the material family is
   fork-only in the strict sense; the corpse's applier is a gated
   `adoptMaterialState`, not a `mergeSlice_`. This satisfies the acceptance
   criterion literally and makes `forkRuntimeState(corpse, body)` a structural
   no-op. The alternative reading — "fork-only means absent from the merge
   allowlist," which is what the shipped `HasInteractive` and `Avatar` slices
   actually do — would keep one protocol but weaken the guarantee to policy.
   **Ruling:** strict. The criterion is then literally checkable (walk the
   chains) rather than an assertion about an allowlist constant one string
   away from being wrong, and `forkRuntimeState(corpse, newBody)` is a
   *structural* no-op — un-reanimatable even by calling the protocol
   incorrectly. The cost (two mechanisms; a gated method that resembles a
   protocol member) is paid down by the name and the antipatterns entry.

2. **[CLOSED — register it]** **The shade must be registered with `PlayerApi`.** The requirements' table
   says "never registered," copied from `WireBody`, whose rationale is *"the
   parked field avatar keeps the slot."* In the death case **there is no field
   avatar** — it is destructed. If the shade is unregistered, then
   `ChannelCatalogue.audienceFor` (which enumerates `PlayerApi.getAllAvatars()`),
   the presence relay, `who`, and `tell` all stop reaching a dead player —
   directly violating *"platform acts ride the Participant and are never
   severed."* **Decision taken:** the shade **is** registered (it is the
   player's only body while dead), explicitly *after* the old Avatar is
   destructed. Everything else in the table (no persistence, identity thread,
   `undead`, intrinsic attunement) holds.
   **Consequence for the I5 audit:** a registered avatar is no longer
   necessarily a *living* body. Every `getAllAvatars()` consumer that assumes
   one needs the same sweep as the lifecycle guards — same class of
   assumption, different surface. Add it to the Wave 5 audit list.

3. **`Species.intrinsicMixins` does not exist; `innateMixins` is species-level
   reference data.** A shade cannot be born-attuned without mutating shared,
   boundary-exempt Species data. **Decision taken:** the shade overrides
   `getConferredMixinNames()` (the employment conferral seam
   `MixinApi.collectAugmentConferralNames` already reads structurally) to
   confer `AetherMixin`. Same observable outcome, no Species mutation. If you
   prefer, the alternative is a per-instance conferral list on `AugmentMixin`'s
   collector — a wider engine change.

4. **"Consciousness needs no change" is false for six drivers.**
   `getConsciousness()` reads only blood volume, SpO₂ and head trauma, so a
   body dying of cold/heat/hunger/thirst/toxin/electrocution stays fully
   animate. **Decision taken:** `isDying()` forces `unconscious`. This is a
   one-line addition, but it means *dying is itself an incapacitation*, which
   is slightly stronger than "it happens to read that way."

5. **The floored-blood-volume band flips from `'dead'` to `'dying'`.**
   `getConditionBand()` currently returns `'dead'` from the substrate at
   `bloodVolume <= survivableMin` with no lifecycle transition. Keeping that
   would mean a rescued body still reads `dead`. **Decision taken:** it reads
   `'dying'`. Small, but it changes an existing observable readout.

6. **[CLOSED — `charactergen`]** **The `passage` verb's command category.**
   There is no `mortality` category and CLAUDE.md forbids inventing module
   categories without sign-off. **Ruling:** `charactergen`. It already owns
   the moment a body comes into existence for an identity (`enroll`'s
   commit/spawn atomicity) and the identity verbs — `cmd/charactergen/`
   holds `chronicle`, `competence`, `traits`, `play`, `enroll` — and
   `passage` is the second time a body is minted for an identity. A
   `mortality` category was deliberately **not** spent here; it remains a
   one-line category-list edit plus a folder move if it is ever wanted.

7. **`ConditionApi` becomes mortality's Api home** (`die`,
   `embodyForSession`, `reembody`). No new Api class, per the constraint —
   but "embody this identity for a session" is a body-registry concern that
   arguably belongs on `PlayerApi`, and `reembody` is neither a condition nor
   a player-registry act. This is the one place the no-new-Apis rule produces
   a slightly odd home. It matters a little more now that `reembody` is the
   **content-facing** seam a resurrection service will call — an author will
   read `ConditionApi.reembody` and blink. Flagging, not contesting.

8. **The drained-Avatar window.** Between setting the arc and transferring
   the sockets to the shade, the dying player's body is briefly *alive at
   baseline* and still holds its Interactives. Per-socket command
   serialization makes an interleaved command unlikely and harmless (a healthy
   body doing an ordinary thing), but it is a real window. Closing it fully
   would need a socket-parking step. **Accepted as a documented risk;** say if
   you want it closed.

9. **Residency ships in `observe` mode**, so a `spent` corpse permits eviction
   but is never actually culled in production. The AC is satisfied at the
   `canEvict` contract level. Flipping `residency.eviction.mode` to `enforce`
   is a separate operational decision this build does not make.

10. **Seeded species `lifecycleStates` do not include `undead`**
    (`seeds/lib/species/wolf.yaml` is `["alive","dead"]`; `Species.ts:148`
    notes validation is "when validation lands"). Nothing validates today, so a
    shade works — but the data is now wrong. **Decision taken:** add `'undead'`
    to the humanoid seeds. Note that `race.md:486` deliberately gives the Ghoul
    `alive/dead` only ("the undead framing is slander"), so leave that one
    alone.
