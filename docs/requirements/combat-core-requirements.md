# Combat (core, 1v1) — requirements

This is **cycle 1** of the combat build described in
[docs/slates/deferred-rpg/combat-slate.md](../slates/deferred-rpg/combat-slate.md).
Combat is a launch feature; the substrate it consumes (vitals, harm,
materials-response, the activity/engagement framework, reactions,
advancement, metabolism reserves) is all shipped. This cycle delivers
the **1v1 vertical slice**: a witnessed, terms-bound combat session that
runs the poise minigame, writes trauma through the materials-response
covering stack, resolves on a per-party goal, and attributes blame from
the consent record — the whole anti-murderhobo *thesis* made playable at
single-combatant scale. The expensive multi-party machinery (party,
threat graph, focus-fire, Master-Apprentice, the chase) is deliberately
out; it all rides on abstractions that don't exist yet, and the thesis
is fully demonstrable without it.

The one genuinely new subsystem is **poise** (a fast, session-scoped,
banded tactical gauge). Everything else is a combat-specific consumer of
built substrate: the session is a `SustainedEngagement` cloned from the
`DialogueConversation` shape; consequence flows through
`ConditionApi.inflict`; witnessed acts ride `noteReactableAct`; each
exchange mints an `ActSignature`.

## Goals

- **A combat session exists** as a `SustainedEngagement` coroutine
  (the `DialogueConversation` structural twin — detached loop via
  `ScheduleApi.schedule(0, …)`, two-sided hold, single `onAbort`
  teardown, `getHost()`), holding two combatants, their agreed terms,
  the consent/initiation record, and the resolution. Transient; nothing
  about the fight persists except its ledgered outcomes.
- **Terms are consented like introductions.** A session carries
  lethality (non-lethal / lethal) × stop-condition (first-blood / yield /
  incapacitation / death) × stakes. Standing combat settings pre-answer
  the handshake silently; an explicit prompt surfaces **only when terms
  conflict** (someone brings lethal to your non-lethal). Bar fights stay
  frictionless.
- **Poise is the tactical contest.** One session-scoped banded gauge
  (steady / pressed / reeling / broken / open), per combatant. Base
  autocombat erodes both sides; committing a gambit spends the actor's
  own poise (overextend); a break opens a binary, timed window; exploiting
  an opening is cheap; defensive/reactive play restores poise. Poise
  evaporates at session end and never touches the `Creature`.
- **Cadence is emergent tempo.** Each combatant accrues tempo at a
  *derived* rate and acts when ready — no attacks-per-round scalar. The
  tick is a narration beat (resolve finely, narrate coarsely); fractional
  tempo accumulates and carries so a faster fighter simply acts more often.
- **The exchange writes consequence through materials-response.** A
  landed gambit calls `ConditionApi.inflict`, which resolves the covering
  stack outside-in into the tissue, yielding trauma type + severity.
  Combat inflicts no damage of its own; it routes a mechanism (channel)
  through the existing function.
- **Severity is sentience-keyed (three-case).** Non-sentient target →
  lethal is the natural resolution, no consent, no blame. Sentient +
  consented → legitimate even if lethal. Sentient + non-consented lethal →
  the attributed crime: legible, blame attaches, the world reacts.
- **Two-stage death is the anti-instakill keystone.** Defeat (win the
  poise contest → down → `unconscious`, recoverable) *ends the fight* and
  is separate from execution (a deliberate, slow, interruptible,
  telegraphed coup on the downed body, lethal-authorized terms only).
  Non-sentient targets skip stage 2.
- **Blame is derived, never a stat.** Attribution facts (initiation
  under which terms; a term violation; a death under which authorization)
  are recorded to an append-only ledger; blame is a replay-reader over it
  (the provenance move). At resolution, blame drives standing/regard, a
  chronicle entry, and the social-presence "X killed Y" relay.
- **Gambits are affordances.** A minimal demonstrative set resolves as
  ordinary affordances gated at attempt-time by `{capability + skill-band +
  functional part}`. Instruments expose capabilities (body parts are
  innate instruments; a wielded weapon contributes via
  `commandContributions`); injury that impairs a slot greys its gambits
  live, reusing the vitals machinery.
- **Advancement is wired.** Each exchange mints an `ActSignature`
  ({discipline, difficulty, outcome}) with per-act difficulty; a small
  seed set of combat `Discipline`s exists; competence stays derived,
  bands-only. Self-credit only this cycle.
- **NPC combatants fight back.** A combat brain drives at least one
  enemy through the loop (asymmetric: the full directed-autocombat loop is
  player-side; the enemy is brain-driven).
- **A minimal combat pane** is summoned on `combat.session.opened` and
  dismissed on `resolved` (server-authoritative, additive, degrades
  gracefully): terms banner + consent handshake, your own poise/vitals/
  flags, the opponent read (banded, perception-gated), and the gambit bar
  (buttons preview real commands). The per-viewer prose stream stays
  primary.
- **Two demonstrable paths ship:** a **cull** (player vs a brain-driven
  non-sentient combatant; lethal-ok, no consent, no blame) and a
  **consented duel** (sentient, handshake + blame ledger + two-stage
  death), reachable in a demonstrator context — exercising the full
  severity three-case.

## Non-goals

- **Party / sides / multi-party.** v1 is 1v1. The threat graph collapses
  to a single "current opponent" melee edge. Multi-party, focus-fire
  poise-erosion, peel/protect tactics, and Master-Apprentice credit-split
  land when [party-slate.md](../slates/deferred-rpg/party-slate.md) +
  [combat-tactics-slate.md](../slates/deferred-rpg/combat-tactics-slate.md)
  land. (Design-only today; nothing inherited.)
- **The threat graph as a structure.** No node/edge graph this cycle —
  just per-combatant "engaged with X." The full engagement graph is
  combat-tactics-slate's.
- **The chase / flight beyond a clean disengage.** Basic exits ship
  (yield / incapacitation / death / draw / disengage). The multi-step
  contestable flight, the pursuit-session, the decaying contact tether,
  and the endurance/mobility/navigation contest are deferred (combat-slate
  Thesis 7 residual).
- **Full gambit breadth.** Only a minimal demonstrative set (enough to
  show the affordance model + cross-gating + injury-edits-the-menu). The
  four-channel loadout breadth and instrument-independent gambits (feint,
  read, command/tactics) come later.
- **Weapon playstyle inputs.** Reach, guard, balance-as-derived,
  shield-as-armor, unarmed/grapple depth — deferred in
  [materials-response-slate.md](../slates/deferred-rpg/materials-response-slate.md)
  and not reopened here. Weapon **balance** as a tempo input is a neutral-
  default data hook this cycle (see Surface decisions).
- **Guards / intervention content.** The `guards` brain is content built
  on the (deferred) mature blame ledger + intervention window; the
  engine-guaranteed two-stage window that *makes it possible* ships, the
  brain does not.
- **Ranged / thrown / geometric combat.** Refused by design (a
  relationship problem, not a coordinate one).
- **De-escalation verb suite.** "Talk them down as a combat skill" is a
  real pathway but its verbs/skills + advancement minting are a later wave
  (combat-slate OQ6).
- **Group payout/blame split.** Needs party + the banking remittance
  seam (combat-slate OQ7).
- **A Contract abstraction.** The session is a transient
  `SustainedEngagement`, not a persisted Contract. The unified Contract
  (employment + bounty + combat) is deferred to when those converge.
- **Enemy-side tactic symmetry.** Enemies are brain-driven, not running
  the full player tactic/gambit engine (combat-slate OQ5).
- **Final numbers.** All resolution constants, band thresholds, and the
  competence→exchange-rate curve are `combat.*` AppSettings with sane
  defaults; tuning is deferred to a running game (combat-slate OQ1).

## Surface decisions

### Sides — 1v1 only; "current opponent," not a graph
The session binds exactly two combatants. Engagement is a single melee
edge modeled as per-combatant session state ("engaged with X"), riding a
`body`-slot engagement. No graph structure is built. This folds cleanly
into the multi-party graph later without rework: the graph is the plural
of this edge.

### Tempo — emergent, derived from the three built inputs
Cadence is the settled emergent-tempo model (combat-slate #15): a derived,
dynamic rate with fractional accumulation per beat, **not** an
attacks-per-round scalar. The rate derives from
**encumbrance × endurance × competence** — the three inputs that exist
today. **Weapon balance** (the fourth input) was deferred in
materials-response; this cycle exposes it as a per-weapon `balanceFactor`
data hook defaulting to neutral, consumed by the tempo function so the
seam is live but reopening the weapon-playstyle fork is not required. When
the weapon-playstyle cycle lands it populates `balanceFactor` from
construction and nothing else changes.

### Tick tempo — a `combat.*` AppSetting
The tick is the narration beat (a few game-seconds), an AppSetting
(`combat.tickSeconds`), tuned for readability-vs-responsiveness in text.
Tempo accrues fractionally within/across ticks; the scene composer
collapses a beat's flurry into one readable prose chunk.

### Transient state — session-scoped, never on the `Creature`
Poise and combat flags (disarmed / prone / grappled / inspired) live on
the **session** state object, not in the vitals condition collection.
They evaporate at session end. Only outcomes (trauma via `inflict`,
attribution via the ledger, `ActSignature`s, standing/regard) persist.
(Resolves combat-slate OQ3; leans as the slate leaned.)

### Two-stage death in; chase out
Defeat→unconscious (free from `getConsciousness`) ends the fight; the
coup is a **separate durative engaged act** (the activity framework's
`DurativeActivity`), interruptible by any present party, gated to
lethal-authorized terms. The window always exists but only bites where
witnessed. The multi-step flight and the pursuit-session/tether chase are
deferred.

### Blame — derived-by-replay over an append-only ledger
A new append-only collection records exactly the three attribution facts
(`session.opened` initiator/terms, `terms.violated`, `body.death` under
authorization state) — the `authoring_events` / `renown_events` shape.
Blame is a **derive-on-read reader** over it, never a stamped stat. v1's
consumers are the resolution-time reactions (standing/regard collapse, a
chronicle crime/deed entry, the social-presence relay). The guards-brain
reader is deferred but the ledger it will read ships now.

### Demonstrable scope — a cull and a consented duel
Both the non-sentient path (no consent/blame, lethal-ok) and the
sentient-consented path (handshake + blame + two-stage death) ship, so
the severity three-case is exercised end-to-end. Specific demonstrator
content (which creature, which sparring context) is a build-time choice,
not enumerated here — one non-sentient brain-driven combatant and one
consented-duel path, reachable in a demonstrator context.

### Enemy AI — asymmetric, brain-driven
The full directed-autocombat loop (tactic + queued gambits) is player-
side; enemies are driven by a combat brain that picks
tactic/gambit/emote reactively. The session invokes the brain directly at
its decision points — no dependency on a global combat witness-trigger set
(that plumbing is a later nicety). (Resolves combat-slate OQ5 for v1.)

### Client — a minimal summoned pane
The summoned summary pane ships (settled #8): terms banner + handshake,
own poise/vitals/flags, opponent read (banded + perception-gated by the
server), gambit bar with previewed-command affordances and the opening
timer. The full threat-graph panel and `layout combat` defer with
multi-party. The prose stream stays primary. (Partially resolves OQ8;
the propose/counter render is the pane's handshake row.)

### Perception-gating — banded, hedged for the enemy
You read your own poise/vitals precisely; the enemy's is banded and
perception-gated (`belief`/perception). The competence-modulated
misread-a-feint subtlety is a later refinement — v1 hedges the enemy read
to bands and does not yet actively deceive.

### Determinism — poker, not slots (no aleatory RNG)
Combat resolution is **deterministic given information**; uncertainty is
**epistemic** (hidden enemy state, intent/feints, other agents), never a
die roll. No random damage rolls, no to-hit dice, no crit dice — severity
is `channel × coverage × site × poise-state × energy` through the
materials-response function, and the "crit" is an *earned* opening + called
shot. The bright line: randomness may add narration texture and rare
environmental chaos, but it is never the reason a skilled plan failed. (See
[combat-experience-slate.md](../slates/deferred-rpg/combat-experience-slate.md)
Theses 3–4; luck/emotional-weather is deferred to `traits-stress`.)

## Constraints

- **No HP scalar.** Consequence is vitals/trauma only; defeat is
  `getConsciousness → unconscious` (recoverable), death is the separate
  `dead` lifecycle flip a driver deliberately pulls. Honor
  [vitals.md](../subsystems/vitals.md).
- **Single-thread cooperative coroutine, never a worker** (settled #16).
  The session runs on the game thread like scripting/dialogue. The only
  discipline is **bounded beats** — no tick does unbounded work.
- **Go through the Api layer.** Session lifecycle, gambit resolution,
  poise mutation, and blame reads are a gated `CombatApi`/`CombatLogic`
  pair (`/obj/api/combat`, `FromModule('/api/combat#CombatApi')`).
  Trauma goes through `ConditionApi.inflict`; movement/engagement through
  the existing seams; nothing pokes internal mechanism directly.
- **Module taxonomy — no new categories.** New subsystem folder
  `lib/combat/` for the session class (a plain class implementing
  `SustainedEngagement`, the `DialogueConversation` precedent — **not**
  Stuff, not `StuffApi.create`d), the `Poise` and `CombatTerms`
  value-objects, and combat-session state. New command category `combat`
  (`mud/cmd/combat/*.yaml` + `obj/command/combat/*Controller.ts`). Gambits
  are affordances via `commandContributions` / advancement conferral, not
  a bespoke registry. Combat `Discipline`s are data. No free-floating
  helper modules; no `lib/mixins/`.
- **Bands, not numbers.** Poise, condition, and enemy state surface as
  bands, never raw scalars (the condition-band doctrine). Tuning
  constants are operator `combat.*` AppSettings seeded from
  `config/app-settings.yaml`, no code defaults.
- **Methods-only inter-Stuff contract.** The session reads/writes
  combatant state via method surface; poise/flags are session-owned.
- **Reuse the engagement lifecycle.** Register via
  `SchedulerApi.registerActivity('combat-session', …)` for HMR; branch on
  the five-outcome `start()` contract; extend the abort-reason vocabulary
  by declaration merging (e.g. resolution reasons) rather than inventing a
  parallel teardown.
- **Hooks are session-scoped seams + message frames, not new global
  events** (behavior.md's rule). A hook fires inside the session state
  machine to attached brains/contributors and to the witness set via
  `MessageApi.scene` frames (which carry `meta.commandId`, so the existing
  witness→reaction→narration path consumes them free). A signal becomes
  global only where a global consumer already exists (a reactable act, a
  death→presence relay).
- **Per-viewer, perception-gated narration** via the scene composer +
  MML + `markupAugmenters`; identity via `RecognitionApi`; authorable
  Liquid via `ProseApi` (the `social.presenceFormat` precedent).

## Acceptance criteria

Behavioral (the combat-slate gating tests, cut to v1):

- A committed gambit spends the actor's own poise; a
  parried/whiffed commit leaves the actor open.
- Poise crossing to *broken* opens a binary, timed window; a committed
  gambit into an open window lands hard / inflicts real trauma / sets a
  flag; the window expires unexploited after N ticks.
- A landed offensive gambit routes through `ConditionApi.inflict` and the
  materials-response covering stack — armor coverage measurably changes
  the trauma type/severity (an armored site deflects where a bare one
  wouldn't).
- A disarmed or impaired-limb combatant loses the gambits that need the
  affected instrument/slot (the menu edits live).
- Terms auto-resolve when standing settings agree and prompt only when
  they conflict (lethal-vs-non-lethal).
- A non-sentient target resolves lethal with **no** blame; a sentient
  target defaults to non-lethal yield.
- A non-consented lethal attack attributes blame to the initiator via the
  replay reader over the attribution ledger.
- A downed sentient cannot be killed by the winning blow; only a separate,
  interruptible coup under lethal-authorized terms kills, and a present
  bystander can interrupt it.
- Faster tempo yields more base exchanges *and* more gambit openings over
  the same span (emergent-tempo, fractional accumulation).
- A witnessed exchange fans reactions volume-gated through
  `noteReactableAct`; each viewer gets a perception-gated, register-styled
  line.
- Each exchange mints the actor's own `ActSignature` with per-act
  difficulty; competence surfaces bands-only.
- An NPC combatant, brain-driven, runs the loop against a player through
  to a resolution.
- The combat pane summons on `session.opened`, shows terms/own-state/
  opponent-read/gambit-bar, and dismisses on `resolved`; buttons preview
  their real commands.

Artifacts:

- A subsystem doc `docs/subsystems/combat.md` exists, is the source of
  truth for the session/poise/tempo/hook model, and is linked from
  `CLAUDE.md`'s documentation map.
- `lib/combat/` holds the session class + value-objects; `combat` command
  category exists; `CombatApi`/`CombatLogic` pass `lint:gates` /
  `lint:pm`; `combat.*` AppSettings are seeded.
- The two demonstrable paths (cull + consented duel) are reachable and
  covered by tests.

## Cross-references

- **Seeding slate:** [combat-slate.md](../slates/deferred-rpg/combat-slate.md)
  (the full design; this doc cuts cycle 1 from its buildable spine,
  §"Once shaped into formal requirements").
- **Substrate consumed:**
  [vitals.md](../subsystems/vitals.md),
  [harm.md](../subsystems/harm.md),
  [materials-response.md](../subsystems/materials-response.md),
  [activity.md](../subsystems/activity.md),
  [reactions.md](../subsystems/reactions.md),
  [advancement.md](../subsystems/advancement.md),
  [metabolism.md](../subsystems/metabolism.md),
  [behavior.md](../subsystems/behavior.md),
  [belief.md](../subsystems/belief.md).
- **Structural precedent:**
  [npc-dialogue.md](../subsystems/npc-dialogue.md) (the
  `DialogueConversation` `SustainedEngagement` twin).
- **Deferred siblings (later combat cycles):**
  [party-slate.md](../slates/deferred-rpg/party-slate.md),
  [combat-tactics-slate.md](../slates/deferred-rpg/combat-tactics-slate.md).
