# Stealth & deployables — implementation plan

The **player-facing half of concealment**: hiding *yourself* (`hide`), moving under cover (motion-degrades), ambushing from concealment, and planting *your own* traps — completing the vertical the [concealment & detection build](../subsystems/concealment.md) opened. The keystone is a **unified harm-consent / accountability substrate** that combat, ambush, and traps all feed, so "you hurt someone who didn't agree to be hurt" is *one* derived crime however the hurt was delivered. It leans end-to-end on shipped substrate — the per-viewer detection engine (`PerceptionApi.perceives`), the concealment gate (`ConcealableMixin`, now given a *derived* level for actors), combat's blame ledger (**generalized, combat migrates onto it byte-identically**), the hazard `Trap`, the behavior/brain system, the parcel property gate, and the `advancement` `Discipline` seed. Read the requirements (`docs/requirements/stealth-deployables-requirements.md`) in full before starting. The staged shape lands the **riskiest piece first** — the accountability extraction + combat migration, proven byte-identical in isolation — then layers hide, motion, ambush, the `wary` brain, and the trapper on top of that stable spine.

---

## Grounding (facts established by investigation)

- **The blame ledger is combat-owned but already shaped as a generic dumb-store/smart-consumer.** `CombatAttributionEvent` (`lib/combat/CombatAttributionEvent.ts`) is a plain `Document` in `Collections.CombatAttributionEvents` (`combat_attribution_events`, class line 89). It records objective facts and **derives** accountability on read: `deriveBlame(rows)` (line 137) takes the earliest `death` row and returns `crime = lethality === 'lethal' && !consented && sentient` (lines 146–148). Three writers only: `opened` / `violated` / `death`. The fields are already harm-agnostic-ish — `initiator`, `opponent`, `victim`, `killer`, `consented`, `sentient`, `locality`, `at`/`realAt`, plus the two combat-specific `lethality`/`stopCondition`.
- **Combat's writers are three module-private functions** in `obj/api/CombatLogic.ts`: `recordOpening` (line 1875, writes `opened` + conditionally `violated`), `recordDeath` (line 1899, writes `death`), funneled through `noteAttribution` → `recordAttributionImpl` (fire-and-forget, line 1848/1853). `blameForImpl` (line 1919) queries `CombatAttributionEvent.find({victim})` and calls `deriveBlame`. `CombatApi.blameFor`/`attributionFor` (`api/combat.ts:177`/`182`) are the read surface. This is the entire migration surface — a small, well-isolated set of call sites.
- **`ConditionApi.inflict` is the common harm chokepoint, and it already stamps the inflicter.** `inflict(target, spec)` (`api/condition.ts:137`) resolves the inflicter from execution context (`ExecutionContextApi.getActingAuthor`, `ConditionLogic.ts:161`), never a param, and stamps `Trauma.inflictedBy` (`lib/vitals/Condition.ts:98`; set at `ConditionLogic.ts:289/323/360`). It does **not** know consent — consent is the caller's knowledge (combat's `CombatTerms`, a trap's non-consented default). This is the load-bearing constraint on where accountability rows get written (below).
- **The detection engine is pure, sync, and per-viewer.** `PerceptionLogic.perceives(viewer, target, attention?)` (line 205 → `perceivesImpl` 552): a non-concealable or `obvious` target is always present; a discovered-in-belief target sticks; otherwise `effectivePerception ≥ requirementFor(level)`. `effectivePerceptionImpl` (514) = `capacityOf(viewer) + attention + lightConditionsFor`. `capacityOf` (473) reads the **sync `awarenessBandCache`** warmed by the async `preloadForSenseGate` (187–201) — the solved sync-boundary the actor-face reuses. `modeAttentionImpl` (444) + `modeModifier` (449) is the care↔speed self-side already lit; its **observer-side sibling** does not exist yet.
- **`ConcealableMixin` holds a static authored `concealment` field** (`lib/concealment/Concealable.ts:69`); `getConcealment()` (82) returns it verbatim; `getDiscoveryKey()` (107) defaults to `templatePath`. **Creature composes `ConcealableMixin` outermost** (`lib/creature/Creature.ts:105`) and `PosedMixin` (the actor-side posture *state*, `lib/character/Posed.ts` — a persistent string field with `get/setPosture`) deeper in. `Character`'s chain (`lib/character/Character.ts:83–96`) wraps `Creature` with `AdvancementMixin` outermost. **Any Character-level mixin is composed *outside* Creature's `ConcealableMixin`, so it can override `getConcealment()` and call `super`.** This is the exact seam the dynamic actor-level rides.
- **Posture is the precedent for a self-hiding state.** `PosedMixin` is a persistent per-actor string (`posture`, default `stand`) with a plain `get/set` surface — the shape a `hiding`/`hiddenLevel` actor-state mirrors.
- **A locomotion mode is per-traverse, not a persistent actor field.** `SneakController` (`obj/command/movement/SneakController.ts`) commits a mode name for one move; `HazardMixin.resolveTraversal(mover, mode)` receives it. There is no standing "current movement mode" on the actor — so motion-degrade is resolved *at the traverse*, with the mode in hand, exactly where `modeAttention` already enters.
- **Ambush's combat seam is `CombatOpenOptions` + `openSessionImpl`, not a literal `session.opened` field.** `CombatOpenOptions` is `{ competenceBands? }` (`api/combat.ts:46`); `openSessionImpl` (`CombatLogic.ts:621`) builds each side's `CombatantState` (poise via `poiseConfig()`), records the opening (`recordOpening`, line 676), and snapshots per-combatant competence via `bandFromOpts` (773). Poise bands (`lib/combat/Poise.ts`: `steady|pressed|reeling|broken|open`, break at `brokenAt`) are the gauge an ambush denies. The "reserved awareness seam" is realized as a new `CombatOpenOptions.ambush` flag consumed at open.
- **Brains are path-resolved strategy modules** (`lib/behavior/`, `export const brain = class {…} satisfies BrainStatics`); `BrainContext` gives `host`/`config`/`state`/`perceived`/emission helpers; witness + cadence triggers, no new events (behavior.md). A new `wary` brain is authored data + one code module — no engine change.
- **`ParcelApi.ownerOf(path)` (`api/parcel.ts:57`)** is the property gate (title → self-home → `core`); the anti-grief substrate consumed as-is.
- **`Trap = HazardMixin(DetailedMixin(Thing))`** (`lib/hazard/Trap.ts`); already `Concealable` via `Thing`; `spring()` sets `sprung` first (reentrancy guard) then `deliverHarm` → `ConditionApi.inflict`. Triggered from `Mobile.traverse`'s post-move scan. The trap is the genuinely-new accountability producer.
- **The `Discipline` seed path is pure data.** `seeds/lib/advancement/Discipline/awareness.yaml` (`channel: skill`, an `iscedf` code, no `conferrals`) is harvested by `DisciplineCatalogue` at boot; `AdvancementApi.bandFor(actor, key)` reads the band (async). `stealth` is its opposed sibling, seeded identically.

Constraints honored throughout: **no new module categories**; the accountability substrate in its own `lib/<name>/` + gated `*Api`/`*Logic` (`SecurityApi.decorateApiClass` / `FromModule` gate); hide as an **actor mixin/state**, not a controller behemoth; the level-derivation *rule* on the existing `PerceptionApi` (no parallel `DetectionApi`/`StealthApi`); the `stealth` Discipline + `wary` brain as data/strategy modules; the `TrapKit` a `Thing`; **no prose in the gated Api layer** (all hide/ambush/trap narration on the object interface or controller); actor/consent from `ExecutionContextApi`, never a param; deterministic — no `Math.random`; all tunables `AppSettings` dials; single quotes, no `.js`, `noUncheckedIndexedAccess`.

---

## Design resolutions

### DECISION A — The accountability substrate: a ledger of interpersonal harm; crime is one derive-on-read consumer; combat migrates onto it byte-identically
A new `lib/accountability/` home + gated `AccountabilityApi` (`api/accountability.ts`) / `AccountabilityLogic` (`obj/api/AccountabilityLogic.ts`). The **mandate is broad — the record of *who harmed whom and under what consent*** — not the narrow "culpability" a dedicated crime-Api would imply (crime is a *read*, not the substrate). It is a **dumb append-only ledger of harm facts** with **derive-on-read consumers**, of which `crime`/`blame` is the *only one this build ships* (the chronicle / belief / renown "dumb store, smart consumers" shape). `CombatAttributionEvent` **generalizes and moves** into `lib/accountability/AccountabilityEvent.ts` (an append-only `Document`): the row gains a `kind: 'harm'` value and makes the combat-specific `lethality`/`stopCondition` **optional** (default-safe for non-combat rows); everything else (`initiator`/`victim`/`killer`/`consented`/`sentient`/`locality`/`at`/`realAt`) is already harm-agnostic. Keyed on the victim's durable `templatePath`. **The collection is renamed `combat_attribution_events` → `accountability_events`** (the substrate is no longer combat-specific; pre-release, so the dev-DB reseed is trivial, and the byte-identity guarantee is about the *derivation logic* — unaffected by the physical name; update the CLAUDE.md collections list).

- **Dumb store, smart consumers — one built, the rest reserved seams.** `crime`/`blame` (harm to a non-consenting sentient) is this build's *only* consumer. Named-but-unbuilt reads over the **same** ledger: **reputation impact** (a crime dents renown/regard), **self-defense / grievance**, **bounties** (the newbie-wilds Law↔Chaos thread), and **courts / adjudication** (the jury-pool primitive's docket). We ship the ledger + the one read — **not** a speculative justice framework (loose-now, tight-seams-reserved).
- **Derivation branches on `kind`, which is why combat stays byte-identical.** `deriveBlame` keeps the *exact* `death`-row rule (`lethal && !consented && sentient`, unchanged from `CombatAttributionEvent.ts:146`). A `harm` row (trap) derives `crime = !consented && sentient` (any harm to a non-consenting sentient — there is no "lethal terms" concept for a snare). Because combat rows keep their kind + fields and the reader dispatches on kind, **no combat verdict changes**.
- **Producers, not a single chokepoint.** The requirements float `ConditionApi.inflict` as "the natural producer site." Resolved decision: **`inflict` stays the harm *mechanism* + `inflictedBy` stamp; accountability rows are appended by the harm *source that knows consent*** — because `inflict` has no consent context and folding it in would sweep non-attributable environmental/thermal/metabolic harm into the crime ledger (the rejected blast radius). The producers are: **combat** (the three writers, retargeted to `AccountabilityApi.record` — its `opened`/`death` rows are session-lifecycle events that a per-inflict seam can't express) and **the trap** (a single `harm` row at spring, co-located with its `deliverHarm`/`inflict` call — so for the trap the producer site *is* the harm chokepoint, honoring the requirement's intent). The **ambush kill needs no new producer**: it routes through combat's normal death path with `consented: false` (imposed terms) → crime derives through the same ledger already.
- **Surface:** `AccountabilityApi.record(fields)` (append, actor/inflicter from context or the row's durable ids), `blameFor(victimId)` (the generalized `deriveBlame`), `crimeFor(victimId)`. `CombatApi.blameFor`/`attributionFor` become thin delegations to `AccountabilityApi`. **Rationale:** the mandate is the *record of harm*, not "culpability" (a read); one dumb ledger with `kind`-branched derivations keeps combat byte-identical (a pinned regression) **and** gives reputation / bounty / courts a home to plug into without a rewrite — a broad-mandate substrate, not a one-concern Api.

### DECISION B — `hide` is a Character-level actor state; the *level* derives on `PerceptionApi`, snapshotted at entry
A new `HidingMixin` (`lib/concealment/Hiding.ts`, `_mixinName = 'HidingMixin'`, registered `Mixins.Hiding`) composed on **`Character`** *outside* Creature's `ConcealableMixin` (the seam established above). It holds two persistent fields — `hiding: boolean` and `hiddenLevel: ConcealmentLevel` — the `PosedMixin` precedent. It **overrides `getConcealment()`**: return `hiddenLevel` while `hiding`, else `super.getConcealment()` (the authored static field). So the shipped `perceives` gate, honest-fog enumeration seams, and `search` reveal all resolve an actively-hiding actor **for free** — a hidden actor is a concealable like any other.

- **The level derivation is a rule → it lives on the gated engine, not the mixin or a controller.** `PerceptionApi.hideLevelFor(actor): ConcealmentLevel` (sibling of `effectivePerception`/`modeAttention` on `PerceptionLogic`) is a **pure, deterministic** `f(stealth competence band, room cover, light, stillness/posture)` → a `ConcealmentLevel` band, dial-weighted. **Snapshot at entry:** the `hide` verb `await`s `AdvancementApi.bandFor(actor, 'stealth')` (async, at command time — never mid-gate), calls `hideLevelFor`, and stashes the resulting band into `hiddenLevel` (the combat "snapshot competence at open" precedent). `getConcealment()` then reads the snapshot synchronously — no async at the perceive gate. Re-entering `hide` in a darker/better-cover room recomputes. **Rationale:** keeps the gate sync + deterministic; reuses the exact `awarenessBandCache`-style solved boundary without a new one; puts the level math on the engine that owns detection (no parallel `StealthApi`, mirroring "no `DetectionApi`").
- **Break conditions, each at its natural hook:**
  - *Motion* — global break, resolved at `Mobile.traverse` with the mode in hand (DECISION C): `sneak` holds, `walk` degrades, `run` clears `hiding`. Hooked where `resolveTraversal` already reads the mode.
  - *Attacking* — `AttackController` / `openSessionImpl` clears the attacker's `hiding` (you reveal yourself by striking) — and reads it *first* for the ambush check (DECISION D).
  - *Search* — **per-viewer, free.** `PerceptionApi.resolveSearch` already records a per-viewer `DISCOVERY` for any concealable it beats; a hiding actor is one such candidate, so a searcher who beats `hiddenLevel` gets a sticky per-viewer reveal with zero new code.
- **Verbs:** `hide` / `unhide` (thin controllers; **narration on the controller, not the Api**). Category `perception` — hiding is the actor-face of the concealment contest, the sibling of `search` (which lives there); `sneak`/`run` stay in `movement`.

### DECISION C — Motion-degrades is the observer-side sibling of the shipped `movement.attention.*` dials
New `movement.concealment.{sneak,walk,run}` dials, read by a new `PerceptionApi.motionExposure(mode)` (the mirror of `modeAttentionImpl`). At the traverse/perceive seam, a moving hider's effective concealment to onlookers is degraded by the mover's mode: `sneak` ≈ 0 (hold), `walk` = a positive observer bump (degrade), `run` = a hard break (clears `hiding` outright — you can't run and stay hidden). Applied as an observer-side attention delta (making the mover easier to perceive), symmetric with how `modeAttention` already feeds `perceives`. **Rationale:** lights the observer-side of the care↔speed axis the concealment build explicitly deferred ("no test asserts others-can't-see-a-sneaker"), reusing the same mode→dial→`perceives` plumbing.

### DECISION D — Ambush denies the poise contest via a new `CombatOpenOptions.ambush` flag
`CombatOpenOptions` gains `ambush?: boolean`. `AttackController` resolves it: the attacker is currently `hiding` **and** the defender does not perceive the attacker (`!PerceptionApi.perceives(defender, attacker)`) → `ambush: true`. `openSessionImpl` consumes it: when ambush, the defender's `Poise` opens at/below the break floor (a `combat.ambush.poisePenalty` drop, arming the opening immediately) — surprise **denies** the opening poise contest, it is not a damage multiplier. The `opened` attribution row already records the initiator as aggressor (feeding the unified crime layer). A non-ambush open is unchanged. **Rationale:** rides combat's reserved awareness seam with one flag + one poise mutation at open; no new session type; the awareness *input* is computed by the shipped `perceives` engine.

### DECISION E — The `wary` brain: a detect→react strategy module, reusing everything
`lib/behavior/wary.ts` (`export const brain = class`, the canned-brain contract). On a presence-gated cadence (and/or witness `arrival`), it runs the shipped detection against its room occupants (`PerceptionApi.perceives` with the NPC as viewer, or a periodic `resolveSearch`) and, on a **state-change to detected** (a per-`state` seen-set delta, the `greets`/`introduces` precedent), reacts through the existing emission/`CombatApi.openSession` seams (alert emote → approach → attack, config-driven); on fail it stays oblivious. Claims `attention`. **Rationale:** detection is free (the NPC is already a valid `perceives` viewer); the only new surface is behavior, and it reuses `BrainContext`, the perception engine, the seen-set delta pattern, and combat-open — no new global machinery.

### DECISION F — `TrapKit` + `arm`: a carried `Thing`, concealment = placer's `stealth`, property-gated, anti-grief shipped inline
A `TrapKit` (`Thing`, authored/purchasable — **thin acquisition, no recipe loop**; the crafting substrate is touched only if a one-line "assemble a kit" seam is trivial, else authored content). `arm <kit> [here | on <exit>]` (`device` category, the `disarm` sibling; controller-only machinery, **object/controller narration**) deploys a concealed `Trap` clone whose `concealment` band = `PerceptionApi.hideLevelFor(placer)` / the placer's `stealth` band (the shared spine with self-hiding), and stamps the Trap's new durable **`placedBy`** field (the placer's `templatePath`). **Placement gate:** `ParcelApi.ownerOf(here)` — free on property you hold; a **public/shared** space is *allowed but crime-marked*. **Crime-marking is inherent, not a flag:** the trap's `spring`/`deliverHarm` appends a `harm` accountability row (actor = `placedBy`, victim = mover, `consented: false`, `sentient = isSentient(mover)`) → `crime` derives iff it harmed a non-consenting sentient (DECISION A). **Pick-up-own:** the placer may `get` their own un-sprung placed trap (identity check on `placedBy`); no rearm (one-shot v1). **Rationale:** reuses the hazard `Trap`, the parcel gate, and the unified ledger; anti-grief (property gate + crime-marking) ships *with* the loop per the completeness requirement.

### DECISION G — A `stealth` Discipline, seeded as pure data
`seeds/lib/advancement/Discipline/stealth.yaml` (`key: stealth`, `channel: skill`, an `iscedf` code — e.g. security/protective-services `1032`, chosen at build; sibling of `awareness`'s `0288`), **no `conferrals`** (`hide`/`arm` are universally afforded; competence only grades). Grades `hideLevelFor` and the trap-set concealment. **Rationale:** the opposed face of `awareness` — one contest, two competences; no new advancement machinery.

---

## Phasing

### Phase 1 — The accountability substrate + combat migration (byte-identical) — LAND FIRST, ISOLATED

The riskiest piece, delivered before anything layers on it. No hide, no traps — just the extraction, proven to change zero combat behavior.

**Outcome** (→ requirement "The crime layer is unified" + "combat's own crime outcomes are byte-identical"): one ledger, one derivation, combat as its first consumer.

**New files:**
- `mud/lib/accountability/AccountabilityEvent.ts` — the generalized `Document` (from `CombatAttributionEvent`): `kind: 'opened'|'violated'|'death'|'harm'`; `lethality`/`stopCondition` optional; the branch-on-kind `deriveBlame` (combat rule unchanged; `harm` rule = `!consented && sentient`). Collection renamed `Collections.CombatAttributionEvents` -> `Collections.AccountabilityEvents` (`accountability_events`); pre-release, a trivial dev-DB reseed.
- `mud/api/accountability.ts` (`AccountabilityApi`) — thin shell, `SecurityApi.decorateApiClass`: `record(fields)`, `blameFor(victimId)`, `crimeFor(victimId)`.
- `mud/obj/api/AccountabilityLogic.ts` — gated singleton (`FromModule('/api/accountability#AccountabilityApi')`): `recordImpl` (append, fire-and-forget), `blameForImpl` (query `{victim}` + `deriveBlame`).

**Edited files:**
- `mud/lib/combat/CombatAttributionEvent.ts` — re-export from / thin-alias to `AccountabilityEvent` (or delete after retargeting imports); keep `BlameVerdict` export shape.
- `mud/obj/api/CombatLogic.ts` — `recordOpening`/`recordDeath`/`noteAttribution` (1848–1917) call `AccountabilityApi.record`; `blameForImpl` (1919) delegates to `AccountabilityApi.blameFor`.
- `mud/api/combat.ts` — `blameFor`/`attributionFor` (177/182) delegate.
- `mud/lib/mixin.ts` — none yet (no mixin this phase).

**Tests** (`lib/accountability/__tests__/`, `obj/api/__tests__/`):
- Port `lib/combat/__tests__/CombatAttributionEvent.test.ts` → `AccountabilityEvent.test.ts`; every existing combat verdict identical.
- **The pinned regression** (acceptance): a consented duel kill (no crime), an imposed lethal kill (crime), a beast cull (no crime) — verdicts byte-identical pre/post migration through `CombatApi.blameFor`.
- A `harm` row on a non-consenting sentient → `crime: true`; on a beast → `crime: false`.

**Risks / deps:** none upstream; **this is the headline risk** (see Open risks). Everything else depends on it.

### Phase 2 — Dynamic `hide` (the actor level) + the `stealth` Discipline

**Outcome** (→ "`hide` works per-observer and the world breaks it"): an actor enters a `hidden` state whose level derives deterministically and resolves per-observer through the shipped engine.

**New files:**
- `mud/lib/concealment/Hiding.ts` — `HidingMixin` (`hiding`/`hiddenLevel` persistent; `getConcealment()` override; `enterHide(level)`/`breakHide()`/`isHiding()` method surface).
- `mud/cmd/perception/hide.yaml` + `unhide.yaml`, `mud/obj/command/perception/HideController.ts` / `UnhideController.ts` — thin; `await AdvancementApi.bandFor(actor,'stealth')`, call `PerceptionApi.hideLevelFor`, `enterHide`; **narration on the controller**.
- `seeds/lib/advancement/Discipline/stealth.yaml` (DECISION G).

**Edited files:**
- `mud/obj/api/PerceptionLogic.ts` + `mud/api/perception.ts` — add `hideLevelFor(actor)` (pure derivation; a `stealth` band read warmed exactly like `awarenessBandCache`, or resolved at command time and passed in) with dial weights + fallbacks (the existing `dialNumber` idiom).
- `mud/lib/character/Character.ts` — compose `HidingMixin` (outside `Creature`).
- `mud/lib/mixin.ts` — `Mixins.Hiding = 'HidingMixin'`.
- `mud/api/mixin.ts` — `MixinApi.isHiding` narrowing (sibling of `isConcealable`, `api/mixin.ts:663`).
- `mud/lib/config/AppSettings.ts` + `mud/config/app-settings.yaml` — the `stealth.hide.*` dials.

**Tests** (`lib/concealment/__tests__/Hiding.test.ts`, `obj/api/__tests__/PerceptionLogic.detection.test.ts`):
- Deterministic per-observer: a hidden actor perceived by a high-`awareness` viewer, not by a low one, same scene (→ acceptance).
- Attacking / an observer's `search` beating the level reveals (search reveal falls out of `resolveSearch`).
- The **honest-fog wire test** extended to a hiding actor: `LookController`/projection emit no `stuffId`/`displayName` for an unperceiving viewer (reuses `__tests__/concealment/honest-fog.test.ts`).
- Level derivation monotone in cover/light/stillness/competence.

**Deps:** none on Phase 1 (independent); orderable in parallel, but Phase 1 lands first for risk.

### Phase 3 — Motion-degrades (observer-side)

**Outcome** (→ "Motion degrades concealment"): sneak holds, walk degrades, run breaks.

**Edited files:**
- `mud/obj/api/PerceptionLogic.ts` + `mud/api/perception.ts` — `motionExposure(mode)` (mirror of `modeAttentionImpl`, 444).
- `mud/lib/spatial/Mobile.ts` (the `traverse` post-move site) — apply the mode: `run` → `breakHide()`; `walk`/`sneak` feed `motionExposure` into the observer-side exposure for the move window.
- `mud/lib/config/AppSettings.ts` + `app-settings.yaml` — `movement.concealment.{sneak,walk,run}`.

**Tests:** a `sneaking` hider stays hidden to a mid-perception viewer; a `walk` degrades; a `run` clears `hiding` (deterministic).

**Deps:** Phase 2.

### Phase 4 — Ambush → combat

**Outcome** (→ "Ambush denies the poise contest"): opening from undetected concealment starts the target pressed/broken.

**Edited files:**
- `mud/api/combat.ts` — `CombatOpenOptions.ambush?: boolean` (line 46).
- `mud/obj/command/combat/AttackController.ts` — resolve `ambush` via `hiding && !PerceptionApi.perceives(defender, attacker)`; `breakHide(attacker)`.
- `mud/obj/api/CombatLogic.ts` — `openSessionImpl` (621): when `ambush`, drop the defender's poise by `combat.ambush.poisePenalty` (arm the opening) at open.
- `app-settings.yaml` + `AppSettings.ts` — `combat.ambush.poisePenalty`.

**Tests** (`lib/combat/__tests__/`): an ambush open → defender starts `broken`/`open`; a normal open unchanged; the `opened` row records the ambusher as initiator; an ambush **kill** derives `crime` through Phase 1's ledger (the unified-crime acceptance leg).

**Deps:** Phases 1 + 2.

### Phase 5 — The `wary` brain + the sneak-past/get-caught path

**Outcome** (→ "Sneak past / get caught"): a hidden actor traverses past a `wary` NPC that fails to perceive them; a detected one triggers the brain.

**New files:** `mud/lib/behavior/wary.ts` (DECISION E); `mud/lib/behavior/__tests__/wary.test.ts`.

**Edited files:** the demonstrator NPC seed (Phase 7).

**Tests:** through the real perception + behavior paths — a low-detection `wary` NPC does not react to a sneaker; a high-detection one alerts/attacks on the seen-set→detected transition.

**Deps:** Phase 2 (+ Phase 4 if the reaction is `attack`).

### Phase 6 — Player-trapper (`TrapKit` + `arm`) with anti-grief inline

**Outcome** (→ "Plant a trap"): `arm` deploys a concealed `Trap` at the placer's `stealth` concealment, property-gated, crime-marked, pick-up-own.

**New files:**
- `mud/obj/arms/trap-kit.yaml` (or `/obj/traps/`) — the `TrapKit` `Thing`.
- `mud/cmd/device/arm.yaml` + `mud/obj/command/device/ArmController.ts` — deploy; `ParcelApi.ownerOf` gate; stamp `placedBy`; **controller narration**.

**Edited files:**
- `mud/lib/hazard/Trap.ts` — a durable `placedBy?: string` field (persistent).
- `mud/lib/hazard/Hazard.ts` — `spring`/`deliverHarm` appends the `AccountabilityApi.record` `harm` row (actor `placedBy`, victim = mover, `consented: false`, sentient via `SpeciesApi.isSentient`).
- `mud/obj/command/inventory/…` (or the `get` controller) — allow pick-up of an un-sprung trap whose `placedBy` == actor.

**Tests** (`obj/command/device/__tests__/`, `lib/hazard/__tests__/`):
- `arm` deploys a `Trap` with `concealment` = placer's `stealth` band; refused/allowed by the property gate.
- A public-placed trap that springs on a non-consenting sentient → `crime` via `AccountabilityApi.blameFor` (the same substrate combat uses — the unified-crime acceptance).
- Placer picks up their own un-sprung trap; a non-placer cannot.

**Deps:** Phase 1 (the ledger), Phase 2 (`hideLevelFor` for the concealment band).

### Phase 7 — Demonstrator + docs + sweep

**Outcome** (→ "A reachable demonstrator" + "Docs"): the whole loop reachable; subsystem docs written.

**New content** (see The demonstrator): a `wary` sentry NPC + a plantable `TrapKit`, hung off newbie-wilds by one plain ground exit, asserting no exit counts.

**Docs:** per the Docs section below.

**Deps:** all prior.

---

## The demonstrator

A reachable scene in the **newbie-wilds locality**, placed by the GlassAlley/Sunken-Delve lesson so it pulls into **no** standup/fast-travel test:

- A **`wary` sentry NPC** (`/domain/newbie-wilds/npc/sentry`) in a **watchpost room** hung off the crossroads hub by a **single ordinary ground exit** (or dropped into an existing treeline/hollow room). The player `hide`s, then either **sneaks past** (the sentry fails to perceive) or **ambushes** (`attack` from undetected concealment → the sentry starts broken).
- A **`TrapKit`** the player obtains (authored/purchasable) and `arm`s in the **Sunken Delve** (existing trap-bearing content, now under `/domain/newbie-wilds/delve/`) or the watchpost — for **another agent** to spring, deriving `crime` if the room is public and the victim non-consenting.

**Standup safety, concretely** (the three ways GlassAlley broke, all avoided): the watchpost is reached via the char-gen `startLocation`/spawn-override path, **not** a boot cascade; it **asserts no exit count** (an added exit pulls in nothing); it composes **no `FastTravelMixin`** and appears in **no TPA manifest** (no fast-travel cascade). The sentry is one hand-built NPC; the `TrapKit` is one authored `Thing`. Content-only additions.

---

## AppSettings dials (the seeder key-count move)

New keys to add to `AppSettingKeys` (`lib/config/AppSettings.ts`) + `config/app-settings.yaml`:

| Group | Keys |
|---|---|
| Hide-level weights | `stealth.hide.competencePerBand`, `stealth.hide.coverWeight`, `stealth.hide.lightWeight`, `stealth.hide.stillnessBonus` |
| Hide-level band thresholds | `stealth.hide.band.subtle`, `stealth.hide.band.hidden`, `stealth.hide.band.deep`, `stealth.hide.band.buried` (score → `ConcealmentLevel`) |
| Motion-degrade (observer-side) | `movement.concealment.sneak`, `movement.concealment.walk`, `movement.concealment.run` |
| Ambush | `combat.ambush.poisePenalty` |
| Trapper | `stealth.trap.concealmentFloor` (optional guard; placement uses no dial — the parcel gate is boolean; crime-marking uses no dial — the derivation is pure) |

Each dial-read uses the shipped `dialNumber` seeded-literal fallback idiom (`PerceptionLogic.ts:415`) so pre-warm / unit reads are safe. No hard key-count assertion exists in the seed tests, but the new keys are enumerated here so the seeder addition is planned, not discovered.

---

## Docs to write at build/finalize

- **`docs/subsystems/stealth.md`** — the actor-face: `HidingMixin` + the derived actor concealment level, `PerceptionApi.hideLevelFor`, break conditions, motion-degrades (observer-side), the ambush seam, the `TrapKit`/`arm` trapper + property gate + pick-up-own, the `wary` brain, the `stealth` Discipline. (Folding into `concealment.md` is the alternative; a sibling doc is cleaner given the volume.)
- **`docs/subsystems/accountability.md`** — the unified harm-consent / crime substrate: the `AccountabilityEvent` ledger, branch-on-`kind` `deriveBlame`, the producers (combat / trap), the "crime is derived, never stored" discipline, keyed on the victim's `templatePath`.
- **`docs/subsystems/combat.md`** — a **§ History migration note**: the blame ledger extracted into `lib/accountability/`, combat now a consumer, outcomes byte-identical (the pinned regression).
- **`docs/subsystems/concealment.md`** — tick the deferred "hiding half of stealth" bullet; cross-link `stealth.md`; note the observer-side of `sneak`/`run` is now lit.
- **`docs/subsystems/hazard.md`** — the player-placed `Trap` (`placedBy` + the accountability `harm` row) as a new consumer; anti-grief note.
- **`docs/subsystems/advancement.md`** — the `stealth` Discipline (sibling of `awareness`).
- **`CLAUDE.md` doc-map + `docs/architecture.md`** — entries for `stealth.md` and `accountability.md`.
- **`docs/slates/deferred-rpg/concealment-detection-slate.md`** — tick **Thesis 2**; the knowledge economy stays named-deferred.

Run `finalize` to graduate the plan + requirements and settle slate retention.

---

## Sequencing & MR shape

**One feature branch** (`feature/stealth-deployables`), phases landed as independently-reviewable commits in order **1 → 7**. Phase 1 (the accountability extraction + combat migration) is committed and green **before** any consumer lands, so the byte-identity regression is reviewable in isolation. Phases 2/3 (hide + motion) are a natural pair; Phase 4 (ambush) needs 1+2; Phase 5 (wary) needs 2 (+4 for attack-reaction); Phase 6 (trapper) needs 1+2; Phase 7 (demonstrator + docs) closes. If review pressure demands, Phase 1 can split into its own preparatory MR (it touches only combat + the new substrate and is provably behavior-preserving).

---

## Open risks for the builder

- **The combat byte-identity (the headline).** Combat is a large, live subsystem whose blame is written from three fire-and-forget sites and read from `blameFor`. The migration must be *pure retarget* — same fields, same `kind`, same `death`-row derivation. Mitigation: keep the physical collection name; keep `BlameVerdict` shape; port the existing attribution test verbatim and add the pinned pre/post regression **before** touching a consumer. If any combat verdict shifts, the extraction is wrong — stop and reconcile.
- **`getConcealment()` override reach.** `HidingMixin` must sit outside Creature's `ConcealableMixin` in the composition chain (verified: any Character-level mixin qualifies). A test must assert `super.getConcealment()` returns the authored field when not hiding (no accidental shadowing of authored concealment on NPCs).
- **The sync-gate for the *hider's* stealth band.** `hideLevelFor` needs the hider's `stealth` band; resolved at command time and snapshotted (not at the gate). Confirm no code path calls `hideLevelFor` synchronously mid-gate — the gate reads only the stored `hiddenLevel`.
- **Ambush poise-denial magnitude.** `combat.ambush.poisePenalty` must be large enough to arm the opening (cross `brokenAt`) but is a tunable; the gym/tests pin the *mechanism* (defender starts `open`), not the number.
- **`inflict`-as-producer temptation.** The requirements lean toward the harm chokepoint; the decision routes combat's session-lifecycle rows through `AccountabilityApi.record` directly and only the *trap* co-locates its `harm` row at the inflict site. If a reviewer insists on a single seam, note that combat's `opened`/`death` semantics can't ride a per-inflict hook without loss — the decision is grounded, not incidental.
- **Trap `placedBy` at spring time.** The placer is absent from the execution context when the victim springs the trap; the `placedBy` stamp (set at `arm`) is the durable actor id the `harm` row uses — verify it survives persistence/re-clone of the placed `Trap`.

---

## Critical files for implementation

- `packages/server/src/mud/lib/accountability/AccountabilityEvent.ts` + `api/accountability.ts` + `obj/api/AccountabilityLogic.ts` — the unified ledger + derivation (generalized from `lib/combat/CombatAttributionEvent.ts`); Phase 1's core.
- `packages/server/src/mud/obj/api/CombatLogic.ts` — the three attribution writers (`recordOpening` 1875 / `recordDeath` 1899) + `blameForImpl` (1919) + `openSessionImpl` (621, the ambush poise-denial); the migration + ambush surface.
- `packages/server/src/mud/lib/concealment/Hiding.ts` + `lib/character/Character.ts` — the `HidingMixin` actor state + its composition seam (the `getConcealment()` override).
- `packages/server/src/mud/obj/api/PerceptionLogic.ts` + `api/perception.ts` — `hideLevelFor` + `motionExposure` (siblings of `effectivePerception`/`modeAttention`, 444/514).
- `packages/server/src/mud/lib/hazard/Hazard.ts` + `lib/hazard/Trap.ts` + `obj/command/device/ArmController.ts` — the player-placed trap, `placedBy`, the spring-time `harm` accountability row, the property gate.
- `packages/server/src/mud/lib/behavior/wary.ts` + `seeds/lib/advancement/Discipline/stealth.yaml` — the detect→react brain + the opposed Discipline seed.
