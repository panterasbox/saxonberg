# Combat (core, 1v1) — implementation plan (two-build, terminal-only)

*Cycle 1 of the combat build. **Both builds are now built** — build 1 is merged (MR !131); build 2 (consequence & progression) landed on `feature/combat-consequence`. The source of truth for what shipped is [`docs/subsystems/combat.md`](../subsystems/combat.md) (builds 1+2); this plan is now historical and retires at the build-2 pre-merge sweep. Design: `docs/slates/deferred-rpg/combat-slate.md` (mechanism) + `combat-experience-slate.md` (experience, 17 theses). This plan re-cuts the original 7 phases into **two big-swing, terminal-only builds** (cleared between). The client `CombatPane` and the threat-read are **excised to later cycles**. This is the 1v1 foundation only — the full roadmap is `combat-experience-slate.md` → "Corpus & build order".*

## 1. Architecture in one screen

A **combat session** is a plain class implementing `SustainedEngagement` (`packages/server/src/mud/api/scheduler.ts:82`), a near-exact structural clone of `DialogueConversation` (`packages/server/src/mud/lib/npc/DialogueConversation.ts`). It is **not** Stuff, never `StuffApi.create`d — it lives in the `SchedulerRegistry` active set keyed to a combatant, exactly like `DialogueConversation`/`RespirationDrain`. It holds two combatants, their `CombatTerms`, the consent/initiation record, each side's `Poise` gauge + flags, and the resolution.

Everything the fight *consequences* flows out through existing gated seams; combat computes no damage and stores nothing lasting on the `Creature`:

| Concern | Seam it rides | Reference |
|---|---|---|
| Detached tick loop | `ScheduleApi.schedule(0, …)` → `runRoot` | `DialogueConversation.ts:203`, `schedule.ts:68` |
| Two-sided hold + teardown | `DialoguePartnerHold` + single `onAbort` | `DialogueConversation.ts:81,161` |
| Engagement slots / HMR | `EngagedMixin` (`body` slot), `SchedulerApi.registerActivity` | `Engaged.ts:54`, `DialogueConversation.ts:422` |
| Trauma | `ConditionApi.inflict(target, {mechanism: Channel, site, energy})` | `condition.ts:104`; covering-stack in `materials-response.md` |
| Narration (per-viewer) | `MessageApi.scene(...)` + `RecognitionApi.describe` + `ProseApi` Liquid + MML | `messaging.md`, `belief.md`, `prose.md`, `social-graph.md` |
| Witnessed acts / reactions | `noteReactableAct` (auto on reactable topics) | `Vocal.ts:177`, `reaction.ts:183` |
| Advancement | `AdvancementApi.recordSignature(owner, ActSignature)` | `advancement.ts:80`, `ActSignature.ts:87` |
| Endurance cap on recovery | metabolism `endurance` reserve | `lib/reserve.ts:44,115` |
| Consciousness / death | `getConsciousness`, `setLifecycleState('dead')` | `Vitals.ts:395,614` |
| Enemy decisions | brain category, invoked **directly** by the session | `behavior.md` (`BrainStatics.act`) |
| Tuning dials | `combat.*` AppSettings, no code defaults | `app-settings.md` |

**Terminal-only.** The at-a-glance interface is the verbs `status`/`look`/`assess` (§ Build 1/2); there is **no client pane** this cycle.

### Genuinely-new engine pieces (everything else is reuse)

1. **Poise** — the session-scoped banded gauge + overextend economy + binary timed openings (`lib/combat/Poise.ts`).
2. **Emergent-tempo fractional accumulation** — the derived per-combatant rate + carry (`lib/combat/Tempo.ts`).
3. **The reactive-affordance dispatch point (X)** — the session consulting attached riposte/counter affordances at `parried`/`whiff`/`grab`.
4. **The narration adapter (`CombatNarration`)** — resolve an exchange → gather condition-keyed flavor fragments from the flavor lookup → render via `ProseApi` → **emit one Scene per perception tier** (per-viewer *content* needs the witness loop; only per-viewer *naming* is automatic) → call `noteReactableAct` on dramatic beats. Fragments are content-pack data; the frame + fan-out are existing stack. (Thesis 17; see §1.5 for the two verified corrections.)
5. **The combat-brain decision invocation (B)** — the session invoking an attached brain directly at its decision points, not via a global witness-trigger set.
6. **The derived blame ledger (L)** — an append-only attribution collection + a derive-on-read reader (`renown_events`/`authoring_events` shape).

Everything under N (narrate transport), R (react), A (author), and most of L (advancement, renown, chronicle, presence) is existing substrate combat merely *emits into*.

## 2. Module taxonomy (no new categories)

```
lib/combat/
  CombatSession.ts        # the SustainedEngagement (the DialogueConversation twin)
  CombatPartnerHold.ts    # the two-sided body-slot hold (DialoguePartnerHold twin)
  Poise.ts                # value-object: banded gauge + overextend + openings
  CombatTerms.ts          # value-object: lethality × stop-condition × stakes + consent
  CombatFlags.ts          # value-object: disarmed/prone/grappled/inspired set
  Tempo.ts                # value-object: derived rate + fractional accumulation
  Gambit.ts               # the affordance descriptor + capability requirement
  CombatNarration.ts      # value-object: the frame + condition-keyed fragment weave (Thesis 17)
  CombatAttributionEvent.ts  # the append-only blame-ledger Document (renown_events shape)
  Coup.ts                 # the DurativeActivity for stage-2 execution
mud/cmd/combat/*.yaml            # verbs (attack, gambits, yield, coup, status, look/assess ext…)
obj/command/combat/*Controller.ts
seeds/obj/command/combat/*.yaml
obj/api/combat/  → CombatApi (api/combat.ts) + CombatLogic (obj/api/CombatLogic.ts)
seeds/lib/advancement/Discipline/combat/*   # combat Disciplines as data
mud/config/app-settings.yaml     # combat.* dials
# flavor lookup {aspect,key,channel,outcome} → content-pack data (NOT fields on Material); CombatNarration consults (Build 1)
```

The gated `CombatApi`/`CombatLogic` pair is the sole entry to lifecycle / gambit-resolution / poise-mutation / narration / blame-read (`FromModule('/api/combat#CombatApi')`), mirroring `ConditionApi`↔`ConditionLogic` (`condition.ts:73`). Resolution/abort reasons extend the vocabulary by **declaration merging** `AbortReasonRegistry` from a combat module (`Engaged.ts:44`). Verb category `combat` is new — allowed (a category is not a module-taxonomy violation); add it to `CLAUDE.md` at finalize.

---

# BUILD 1 — "A fight happens" (the live core loop, terminal)

**Folds original phases 1–5.** Outcome: you `attack` a brain-driven NPC → a full poise/gambit fight runs at emergent tempo, exchanges route through `inflict`/materials-response, injury greys your gambits live, and every beat is honestly narrated per-viewer in the terminal. Ends green with **the cull demo** (a non-sentient beast — no consent/blame needed yet). Internally ordered as the steps below; ship as one build.

### 1.1 Session skeleton + terms/consent + the tick loop
- `lib/combat/CombatSession.ts` — clone `DialogueConversation`'s spine: `engagementId/type/actor/slots(=['body'])/interruptibleBy/cancelable`, `onStart`, single-teardown `onAbort` (`:161`), `getHost`, `launch()` via `ScheduleApi.schedule(0, …)` (`:203`), `end()` → `SchedulerApi.cancel`. Two-sided via `CombatPartnerHold` (the `DialoguePartnerHold` twin, `:81`), mutual-idempotent-cancel (`:167`).
- `lib/combat/CombatTerms.ts` — `lethality`(non-lethal|lethal) × `stopCondition`(first-blood|yield|incapacitation|death) × `stakes` + the consent record; pure `reconcile(mine, theirs)` → `agreed|conflict`.
- `api/combat.ts` + `obj/api/CombatLogic.ts` — the gated pair; `openSession`/`resolve`/`abort`; `SchedulerApi.registerActivity('combat-session', CombatSession)` at load.
- `mud/cmd/combat/attack.yaml` + `AttackController` + seed — resolves terms from standing `EnvironmentMixin` settings, prompts on conflict via `PromptApi.choice` to the defender's Interactive (`:249`), calls `openSession`.
- `AbortReasonRegistry` merge block in `lib/combat/`.
- Seed `combat.tickSeconds` (+ placeholders) into `app-settings.yaml`/`AppSettingKeys`.

### 1.2 Poise + the exchange through `inflict`
- `lib/combat/Poise.ts` — banded gauge (`steady/pressed/reeling/broken/open`), **bands not numbers** across the Api; `erode/spend(overextend)/restore/band/isOpen` + binary `{open, expiresAtTick}`; recovery capped by `endurance` (`reserve.ts:44`); session-scoped, never on the `Creature`.
- `CombatLogic.commitGambit` — on a landed hit builds `InflictSpec{mechanism: InsultKind, site, energy}` (combat passes a `Channel`; `Channel ⊂ InsultKind`, `condition.ts:47`) and calls `ConditionApi.inflict` (resolves the covering stack, returns trauma type+severity). Combat picks the **channel** (instrument delivery-form / innate part) + **site**; computes **no damage**; energy derives from poise-state (open window → more).

### 1.3 Emergent tempo + queued gambits
- `lib/combat/Tempo.ts` — derived rate `f(encumbrance × endurance × competence × balanceFactor)`, fractional-carry (slate #15); `competence` = combat `Discipline` band; `balanceFactor` a per-weapon **neutral-default data hook** on `lib/equipment/Weapon`.
- `CombatSession.tick()` drives exchanges/windows off accumulated tempo; `CombatApi.queueGambit` sets next-tick intent (non-blocking; tactic auto-plays if ignored). Bounded-beats discipline.

### 1.4 Gambits as affordances + flags + injury-edits-the-menu + reactive dispatch
- `lib/combat/Gambit.ts` — a gambit requires `{capability, band}` (channels-not-nouns); instruments = body parts + wielded weapon (`commandContributions`/`InstanceContributor`). No weapon×move table.
- `lib/combat/CombatFlags.ts` — disarmed/prone/grappled/inspired.
- Gambit verbs (`strike/disarm/subdue/shove`) + **attempt-time cross-gating** (capability + band + functional part). **[VERIFIED-CORRECTION] Injury-edits-the-menu is NOT an existing auto-recompute seam** — `isSlotImpairedByTrauma` (`Vitals.ts:500`) + `canOccupy` (`Slotted.ts:259`) gate only *new* occupancy; nothing ejects an already-wielded weapon on trauma, and affordances don't recompute on vitals changes. So combat gates **at attempt-time**: a gambit needing an impaired slot is *rejected when attempted* (check `isSlotImpairedByTrauma`). The visible "menu greys itself" is a client-pane affordance concern — **deferred with the pane**; terminal-only combat just needs the attempt-time reject. (Optional later: a `vacate()`-on-trauma hook / a weapon `InstanceContributor` that drops its commands.)
- The **reactive-affordance dispatch (X)** in `CombatLogic` at `parried/whiff/grab`. **[VERIFIED-CORRECTION] "reactive affordance" is a net-new concept** — no `reactive`/`trigger` flag exists on `CommandDefinition` (every verb is actor-initiated). Combat defines the marker (a spec flag or a separate descriptor), a filter over `MixinApi.getActiveMixins`/`getAffordances` (`mixin.ts:304`), and the eligibility guard. Reuses the enumeration substrate; the reactive *notion* is new.

### 1.5 The narration adapter + the material flavor seam
- `lib/combat/CombatNarration.ts` — the value-object that turns a resolved exchange into narration. Build the algorithmic frame from `{actor, gambit, outcome, poise-band, trauma, site}`; **gather condition-keyed fragments** (attacker weapon+species+signature, target struck-material+species, biome) from the **flavor lookup** (below); render via `ProseApi.format(template, vars)` → `Mml`. **[VERIFIED-CORRECTION] Per-viewer *content* is NOT one Scene** — a Scene fans by *audience bucket* and gives every peer the same body; only per-viewer *naming* is automatic (late-bound `Mml` refs → `RecognitionApi.describe`, `mml.ts:267`). So the adapter **loops over witnesses in perception tiers and emits N Scenes** — one per tier (`MessageApi.scene(viewer)…send()`), the `SocialLogic` presence-relay pattern (`obj/api/SocialLogic.ts:660,702`). This is what perception-gates the opening-flag/severity-band per viewer (server-authoritative; no hidden data to client). **[VERIFIED-CORRECTION] `noteReactableAct` is not automatic** on `Scene.send` — combat calls `ReactionApi.noteReactableAct({commandId, subject, scope})` itself at the producer site (`api/reaction.ts:183`), like `Vocal`/`Soul` do. Only *dramatic* beats reactable (`pressed`/tick silent).
- **The flavor lookup — `[VERIFIED-CORRECTION] a content-pack data table, NOT fields on `Material`.** `Material` has a *closed* `persistentFields` list (`lib/material/Material.ts:347`); a `flavor.*` row on it would be dropped by the Hydrator. Instead flavor lives in a **flavor-lookup keyed by `{aspect, key, channel, outcome}`** (`aspect ∈ material|species|gear|biome`) — content-pack data consulted by `CombatNarration`, `Material` engine class untouched. This is *better*: one lookup serves material **and** species/gear/biome fragments, layered by generality. Nothing required — the frame is complete without any fragment (graceful default). (One small engine cost: a boot-warmed flavor catalogue / content-kind handler to load the table; still no change to `Material`.)

### 1.6 The brain-driven NPC + minimal assessment
- Combat-brain decision invocation (B): the session invokes an attached `combatant` brain by **hand-building a minimal `BrainContext`** (`{host, config, state, perceived: undefined, trigger, say, emote, emoteFree}`, `brain.ts:58`) and calling `act` directly. **[VERIFIED-NUANCE] this bypasses `_runAct`'s machinery** (`Behaved.ts:353`) — no slot-contention, presence-gating, or persisted brain state for free; acceptable, since the combat session owns its own concurrency + state. Asymmetric (full loop player-side, brain-driven enemy).
- `mud/cmd/combat/status.yaml` (own, **full fidelity**: condition/poise bands, flags, endurance, wounds) + extend `look` with the competence-layered tactical read (enemy state **banded/hedged/server-gated**; obvious loadout visible, concealed deferred to `search`/`frisk`).

**New vs reuse.** New: session state machine, `Poise`/`Tempo`/`Terms`/`Flags`/`Gambit`/`CombatNarration`, the reactive + brain dispatch seams, the material flavor-table schema. Reuse: the entire `SustainedEngagement`/hold/teardown/detached-loop machinery, `ConditionApi.inflict` + all of materials-response, the scene composer + `RecognitionApi` + `ProseApi` + MML + `noteReactableAct`, `PromptApi`, the brain category, AppSettings, the endurance reserve, the vitals impaired-slot path.

**Tests (gating).** Session opens holding both combatants; conflicting terms prompt / agreeing don't; a committed gambit spends the actor's poise; a whiff self-opens; poise→broken opens a timed window that a gambit exploits and that expires unexploited; a landed gambit routes through `inflict` and **armor coverage measurably changes trauma type/severity** (assert `MaterialApi.resolveTrauma` at equal energy); a disarmed/impaired-limb combatant loses exactly the affected gambits; a parry fires the target's riposte; faster tempo yields strictly more exchanges+openings over a fixed span; a witnessed beat fans reactions volume-gated with distinct per-viewer lines; **the material flavor fragment for a given `{channel×outcome}` appears in the narration**; a brain-driven NPC runs the loop to a resolution; **the cull demo** (player vs. a brain-driven non-sentient beast) runs to a lethal resolution end-to-end.

**Risks isolated.** competence→exchange-rate curve + all thresholds/energy = `combat.*` AppSettings (seeded-literal fallback, the `response.*` precedent); tempo shape = one pure function in `Tempo.ts`; perception-gated enemy read = confined to `CombatNarration`'s per-viewer step; bounded-beats enforced in `tick()`.

---

# BUILD 2 — "Consequence & progression" (the spine + the duel)

**Folds original phases 6–7 (minus the client pane).** Outcome: a lawful/blameable sentient duel that advances you, plus the full non-lethal-default spine. Ends green with **the consented-duel demo**.

### 2.1 Severity three-case + `isSentient`
- Add `SpeciesApi.isSentient` (a Clade/Species flag; only `isAnimate` exists today, `species.ts:122`). Three-case: non-sentient → lethal natural, no consent/blame, **skips stage 2**; sentient+consented → legitimate; sentient+non-consented-lethal → blame attaches, world reacts.

### 2.2 The blame ledger (derive-on-read)
- `lib/combat/CombatAttributionEvent.ts` — append-only `Document` in `combat_attribution_events` (the `RenownEvent`/`AuthoringEvent` shape); **three** writers only: `session.opened` (initiator+terms), `terms.violated` (crime marker), `body.death` under authorization state.
- `CombatLogic.blameFor(...)` — a **replay reader** (earliest-row derivation, `ProvenanceApi.authorOf` precedent), never a stamped stat; principal is context-derived (`ExecutionContextApi.getActingAuthor`), never a param.

### 2.3 Two-stage death
- `lib/combat/Coup.ts` — the stage-2 execution as a `DurativeActivity` (`ManualBuildStep`/`BehaviorBeat` precedent): deliberate/slow/telegraphed, **interruptible by any present party**, lethal-authorized-terms only; on completion pulls `setLifecycleState('dead')` (`Vitals.ts:614`).
- Defeat terminus: win the poise contest → down → `unconscious` (free from `getConsciousness`, `:395`) = incapacitation stop-condition; death is the separate `Coup`.

### 2.4 Resolution consumers + witness polish
- At `session.resolved`: standing/regard, `ChronicleApi.recordDeed` (deed/crime), the social-presence "X killed Y" relay — all existing substrate.
- Polish the witness/reaction fan-out (the crowd) over Build 1's narration.

### 2.5 Advancement + `assess`
- `seeds/lib/advancement/Discipline/combat/*` — combat `Discipline`s as **data** (the `bartending` seed shape), `conferrals` band-gating a couple of gambit verbs.
- Per-exchange `ActSignature{discipline, difficulty, outcome}` with **per-act difficulty** (`:64,87`) → `AdvancementApi.recordSignature`; self-credit only (Master-Apprentice deferred).
- `assess` (the deep, **costed engaged act** — spends a beat, competence-graded, mints a signature) extending the perception surface (`harm.md`).

### 2.6 Demo + artifacts
- **The consented-duel demo** — sentient opponent: handshake (Build 1) + blame ledger + two-stage death (defeat→yield, or authorized coup; term-violation → the crime leg).
- `docs/subsystems/combat.md` (source of truth, linked from `CLAUDE.md`); `CombatApi`/`CombatLogic` pass `lint:gates`/`lint:pm`; `combat.*` AppSettings seeded; `combat` category added to `CLAUDE.md`.

**New vs reuse.** New: the blame ledger + reader, the two-stage `Coup`, `isSentient`, the combat Discipline seed. Reuse: the ledger *shape* (renown/provenance), `DurativeActivity`, the death seam, chronicle, standing/regard, the presence relay, the `ActSignature` mint.

**Tests (gating).** Non-sentient resolves lethal with no blame; sentient defaults to non-lethal yield; a non-consented lethal attack attributes blame to the initiator via the replay reader; a downed sentient cannot be killed by the winning blow; a coup under lethal terms kills; a present bystander interrupts the coup; each exchange mints the actor's own `ActSignature` (per-act difficulty, bands-only competence); **the consented-duel demo** runs to resolution (yield and coup paths + the term-violation crime leg).

**Risk isolated.** `isSentient` = one predicate; blame entirely derived (re-legislating re-scores history without a migration).

---

## Cross-build risks / test strategy / critical files

| Risk | Isolation |
|---|---|
| competence→exchange-rate curve (load-bearing) | `combat.*` AppSettings + pure functions in `Tempo`/`Poise`; the **combat gym** (headless matchup-sweep) is the eventual de-risk (deferred). |
| narration fragment composition | `CombatNarration` is a pure value-object over authored data + `ProseApi`; the frame is complete without any fragment (graceful default). |
| perception-gated enemy read | confined to `CombatNarration`'s per-viewer step + the `look`/`assess` gating; client never receives hidden data. |
| bounded beats | enforced per-tick; volume-gated reaction fan-out bounds the expensive path. |

**Test strategy.** Value-objects (`Poise`/`Tempo`/`CombatTerms`/`CombatNarration`/blame-reader) unit-tested pure (no Stuff). `CombatSession` driven through `SchedulerRegistry` the way `DialogueConversation.test.ts` does. Armor-changes-trauma reuses `MaterialApi.resolveTrauma` at fixed energy. Build 2 asserts blame by replaying the ledger. Each build ends green; the demo of each build runs end-to-end under test.

**Critical files.**
- `packages/server/src/mud/lib/npc/DialogueConversation.ts` — the `SustainedEngagement` twin.
- `packages/server/src/mud/api/condition.ts` — `inflict` + `InflictSpec` (the materials-response covering stack).
- `packages/server/src/mud/api/scheduler.ts` + `lib/activity/Engaged.ts` — the engagement interface, `start()`, `registerActivity`, the `body` slot, the `AbortReasonRegistry` merge.
- `packages/server/src/mud/api/message.ts` / `belief.md` / `prose.md` seams — the Scene composer + `RecognitionApi.describe` + `ProseApi` the narration adapter rides.
- `packages/server/src/mud/lib/standing/RenownEvent.ts` (+ `RenownLogic`, `reaction.ts`) — the ledger + reader shape + `noteReactableAct`.
- `packages/server/src/mud/lib/advancement/ActSignature.ts` (+ `advancement.ts`) — the per-exchange mint.

## Beyond cycle-1 (the roadmap this foundation carries)

These two builds are the 1v1 base. Everything after is a **retrofit onto shipped substrate**, ordered in `combat-experience-slate.md` → "Corpus & build order": multi-party / threat-graph (the edge built here goes plural) → weapon-playstyle + hand-slots → full morale + de-escalation → stealth / concealment → wayfaring + the chase → non-humanoid bestiary → death / recovery + moderation. The **combat gym** (balance harness) and **numbers** ride alongside throughout.
