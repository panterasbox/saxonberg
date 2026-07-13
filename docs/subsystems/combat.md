# Combat

The **1v1 fight** — a witnessed, terms-bound session that runs a fast
tactical minigame (**poise**) at an **emergent tempo**, writes every
consequence through the shipped substrate ([vitals](./vitals.md),
[harm](./harm.md), [materials-response](./materials-response.md)), and
narrates each beat per-viewer. Combat is a **consumer**, not a new physics:
it computes no damage and stores nothing lasting on the `Creature`. It
picks a *mechanism* (a `Channel`), a *site*, and an *energy*, and routes
them through `ConditionApi.inflict`; the covering stack returns the trauma
type and severity. The one genuinely-new engine piece is **poise**; the
rest is a combat-specific arrangement of existing seams.

This doc is the source of truth for **cycle 1, build 1** (the terminal 1v1
core). The consequence/progression half — the blame ledger, two-stage
death, `isSentient`, combat `Discipline`s, `assess` — is **cycle-1 build 2**
(deferred, see [§ Deferred](#deferred)). Multi-party / threat-graph and the
client pane are later cycles. Design surface lives in
[combat-slate](../slates/deferred-rpg/combat-slate.md) +
[combat-experience-slate](../slates/deferred-rpg/combat-experience-slate.md).

## The session — a `SustainedEngagement`, the dialogue twin

A **combat session** (`lib/combat/CombatSession.ts`) is a plain class
implementing `SustainedEngagement` — a near-exact structural clone of
`DialogueConversation` ([npc-dialogue](./npc-dialogue.md)). It is **not**
`Stuff`, never `StuffApi.create`d; it lives in the `SchedulerRegistry`
active set keyed to a combatant, exactly like `DialogueConversation` /
`RespirationDrain`. It holds the two combatants, their `CombatTerms`, each
side's transient `CombatantState`, the beat counter, and the resolution.

Two-sided, like a conversation: the session holds the `body` slot on
combatant A, and a companion `CombatPartnerHold` holds `body` on combatant
B (so both are genuinely occupied — movement is vetoed — and destroying or
aborting either tears the whole fight down through mutual-idempotent
cancel). The fight drives itself on a **fixed game-time cadence** via one
recurring `ScheduledEmission` (`combat.tickSeconds`, the `RespirationDrain`
precedent) — the emission fires inside `runRootGuarded(SchedulerApi,
'emission', …)`, so `tick()` has a well-defined root but **no** `commandId`
(the narration mints its own). Resolution/teardown routes through a single
`onAbort`; combat augments the `AbortReasonRegistry` (`combat-resolved`)
from its own module (the declaration-merge pattern).

The session is deliberately **thin**: it owns lifecycle + state and forwards
every *rule* (exchange resolution, poise mutation, narration, resolution)
to the gated `CombatApi`/`CombatLogic` pair. `tick()` is the only per-beat
entry; it calls `CombatApi.advance(this)`.

## Poise — the one new subsystem

`lib/combat/Poise.ts` — a fast, **session-scoped, banded** tactical gauge,
one per combatant, that evaporates at session end and **never touches the
`Creature`**. The model:

- Base autocombat **erodes** both sides each exchange.
- Committing a gambit **spends** the actor's own poise (overextend) —
  aggression has a price.
- Crossing the break floor arms a **binary, timed opening**
  (`{open, expiresAtTick}`) — the combatant reads `open` for a bounded
  number of ticks, then, unexploited, the window lapses.
- Defensive/reactive play (a **defend** beat) **restores** poise, capped by
  the `endurance` reserve ([metabolism](./metabolism.md) / `lib/reserve.ts`)
  — a gassed fighter can't buy it back.

**Bands, not numbers** across the whole surface: the raw scalar is private;
the only readout is `band()` (`steady | pressed | reeling | broken | open`)
and the binary `isOpen()`. Band thresholds + magnitudes are injected by the
session from `combat.*` AppSettings, so `Poise` stays a pure, tunable state
machine with no I/O (unit-tested standalone).

## Tempo — emergent cadence

`lib/combat/Tempo.ts` — **no attacks-per-round scalar**. Each combatant
accrues tempo at a *derived* rate and acts when the accumulator crosses a
whole exchange; the fractional remainder **carries**, so a faster fighter
simply acts more often (combat-slate #15). The rate is a pure product of
the three inputs that exist today — **encumbrance × endurance ×
competence** — times **weapon balance**, a neutral-default data hook
(`balanceFactor` on `lib/equipment/Weapon`) the deferred weapon-playstyle
cycle populates from construction without touching the function. Competence
is neutral in build 1 (combat `Discipline`s land in build 2); the seam is
live. The shape lives as one function so the load-bearing competence→cadence
curve is isolated and `combat.*`-tunable.

## Terms & consent

`lib/combat/CombatTerms.ts` — a value-object holding **lethality**
(non-lethal / lethal) × **stop-condition** (first-blood / yield /
incapacitation / death) × free-text **stakes** + the consent/initiation
record. Terms are consented like introductions: standing combat settings
pre-answer the handshake silently, and the pure `reconcile(mine, theirs)`
returns `agreed` (fold silently) or `conflict` (prompt) — conflict is
*only* a lethality mismatch (someone brings lethal to your non-lethal). A
frictionless bar scuffle opens with no prompt. `AttackController` runs the
reconcile, prompts a live defender's `Interactive` on conflict, and — when
the defender is an NPC with no session to consent — **imposes** the terms
`consented: false` (the crime marker build 2's blame ledger reads).

## The exchange — consequence through materials-response

`CombatLogic.commitInflict` builds an `InflictSpec {mechanism: Channel,
site, energy}` and calls `ConditionApi.inflict` ([harm](./harm.md)). Combat
picks the **channel** (from the resolved instrument — a wielded weapon's
delivery channel, or a species' innate attack), the **site** (torso by
default; a called shot to the head on an open window), and an **energy**
derived from the target's **poise band** at the moment of the blow (an open
window earns the hardest hit — a `combat.energy.*` dial). It computes **no
damage**; `inflict` resolves the covering stack outside-in and returns the
trauma type + severity, or `null` (deflected). Armor coverage measurably
changes the outcome (a plated torso turns an edge a bare one wouldn't) —
that is entirely materials-response, not combat.

The outcome is **deterministic given information** (poker, not slots): the
exchange result is a function of poise + instruments, never a die roll. An
overextended actor **whiffs** (self-opens); a steady, armed defender
**parries** (and may **riposte** — see reactive dispatch); an open window is
**exploited** (the decisive break → the target is downed). The "crit" is an
*earned* opening, not a dice event.

## Gambits — affordances, attempt-time gated

`lib/combat/Gambit.ts` — the demonstrative set (`strike` / `disarm` /
`subdue` / `shove` + the reactive `riposte`) as **descriptors**, not a
bespoke registry: a gambit asserts a `{capability, band}` requirement
(channels-not-nouns) and whether it routes through `inflict`. Instruments =
body parts + a wielded weapon; a strike needs a **usable melee instrument**
(a wielded weapon in a functional, non-`disarmed` grip, or a
species-declared innate attack via `Combatant.getNaturalAttackChannel`).

**Attempt-time cross-gating** (`CombatApi.eligibilityFor`): a gambit needing
an impaired slot is *rejected when attempted* (`Vitals.isSlotImpairedByTrauma`
→ the wielding grip's `bodyPart`), and `disarm` is rejected when the
opponent is unarmed. This is the "injury edits the menu" behaviour — the
visible menu-greying is a client-pane concern, deferred with the pane; the
terminal build needs only the reject. Humanoids declare **no** innate attack
(fisticuffs deferred), so a disarmed or fractured-grip humanoid genuinely
loses `strike`, while a natural-weapon beast keeps it.

`lib/combat/CombatFlags.ts` — the session-scoped flag set (`disarmed` /
`prone` / `grappled` / `inspired`), set by control gambits, gone at session
end.

**Reactive dispatch (X)** — the session consults a defender's reactive
affordances at `parried` / `whiff` / `grab`. "Reactive" is a net-new
notion (every `CommandDefinition` is actor-initiated); combat carries the
marker on the `Gambit` descriptor and filters eligibility. A parry fires the
defender's `riposte` (an offensive counter, weapon-only — a disarmed
defender can't riposte).

## Narration — the fight as an arc

`lib/combat/CombatNarration.ts` — the adapter that turns a resolved exchange
into **per-viewer** prose (Thesis 17). Per the plan's [VERIFIED-CORRECTION],
a single `Scene` fans by audience *bucket* and gives every peer the same
body (only per-viewer *naming* is automatic), so the adapter **loops the
room's witnesses and emits one `Scene` per perception tier**
(`MessageApi.scene(viewer).topic('world.combat.exchange').meta({commandId}).
toSelf(body).send()`, the `SocialLogic` presence-relay pattern) — combatants
read the precise band, bystanders a hedged clause. It mints its own
`commandId` (`SecurityApi.uuid()` — the beat runs in a detached scheduler
root) and calls `ReactionApi.noteReactableAct` itself on **dramatic beats
only** (`world.combat.exchange` is in `REACTABLE_TOPICS`; tick/pressed stay
silent).

The line is composed from the **tactical state** so the feed reads as a
**beginning → middle → end** arc, not a repeating template:

- It **escalates with the defender's poise band** — feeling-out (a composed
  guard) → pressure (`reeling under it`) → the break
  (`Its guard breaks wide — … through the gap`). The poise arc *is* the arc.
- Phrasing **rotates by beat** (channel verbs, wound words, parry lines) and
  verbs **conjugate per tier** (no "a wolf *land* a blow"); the defender's
  possessive is a **pronoun** for a combatant viewer (no name repetition).
- **State changes are surfaced**: an exploited opening reads as the break, a
  freshly-cracked guard is called out, control gambits name the flag.
- The **resolution names the cause** of the fall, read from the victim's
  worst wound (`bled white` / `skull broken` / `beaten past enduring`) —
  **every** resolution announces itself through one `endWith()` chokepoint,
  so a fight never just stops (the silent bleed-out gap, fixed).

The **flavor lookup** (`lib/combat/CombatFlavor.ts`) is a `{aspect, key,
channel, outcome}` table (`aspect ∈ material | species | gear | biome`) —
**NOT** fields on `Material` (which has a closed `persistentFields` list,
and one lookup serves material *and* species/gear/biome fragments layered by
generality). A miss is the common case and costs nothing — the frame is
always complete without a fragment (graceful default). Build 1 realises the
table as an authored code constant with the content-pack schema; migrating
it to a boot-warmed content catalogue is a follow-up (no consumer change).

## The enemy — a combat brain, invoked directly

`lib/behavior/combatant.ts` — the default enemy fighter (the `brain`
category). Unlike witness/cadence brains, the session invokes it **directly**
at its decision points by hand-building a minimal `BrainContext` and calling
`act` (bypassing `_runAct`'s slot-contention / presence machinery —
acceptable, the session owns its own concurrency). Asymmetric by design: the
full directed-autocombat loop is player-side; the enemy is brain-driven and
simply *picks a gambit* through `CombatApi.queueGambit`, holding fire when
overextended so the engine's defend-and-recover default takes over. A
non-player combatant (no live `Interactive`) is auto-detected as
brain-driven.

## Command surface — `attack` + `fight`

New command category **`combat`**. Two verbs (consolidated from the
initial seven per MR review — see [§ History](#history)):

- **`attack <target> [--lethal] [--to <stop>]`** (`AttackController`) —
  opens a fight; runs the terms handshake.
- **`fight`** (`FightController`, dispatch-on-subcommand, the `bank`/`chat`
  precedent) — everything *inside* a fight: bare `fight` (or `fight status`)
  is the at-a-glance read (own poise/condition/flags/wounds at full fidelity
  + the banded, perception-gated opponent read — all bands, never numbers);
  `fight strike | disarm | subdue | shove` are the gambits (queued intent,
  resolved on the next beat); `fight yield` concedes.

Both verbs are contributed by **`CombatantMixin`** (`lib/combat/Combatant.ts`,
composed on `Character`) as static `self` affordances; the gambit
subcommands reject at attempt-time. `CombatantMixin` also carries the
species-declared `naturalAttackChannel` (innate-attack hook) and a banded,
perception-safe `look` augmenter (the combat-state line while a fight is
live). The `wield`/`unwield` affordance — shipped as verbs with the
"Weapon is holdable" build but deferred at the affordance layer — is wired
here on `WieldableMixin` (arming yourself is a combat prerequisite;
[embodiment](./embodiment.md)).

## The demonstrator — the treeline cull

`attack` a brain-driven **wolf** (`/lib/species/wolf` quadruped +
`/domain/newbie-wilds/npc/wolf`, a `wolfshead` bounty) in **the treeline**
(`/domain/newbie-wilds/crossroads/treeline`, off the crossroads hub, reached
via the char-gen `startLocation` override, no inbound exit wired — content-
area standup stays clean). Pick up + wield the dropped steel dagger, `attack
wolf --lethal`, and the poise/gambit fight runs to a lethal resolution
(non-sentient → no consent, no blame; the cull). This is the "reachable in a
demonstrator context" acceptance, live in shipped content.

## `CombatApi` / `CombatLogic`

The gated pair (`api/combat.ts` + `obj/api/CombatLogic.ts` at
`/obj/api/combat`, `FromModule('/api/combat#CombatApi')`) is the **sole
entry** to lifecycle / gambit-resolution / poise-mutation / advance /
narration, mirroring `ConditionApi ↔ ConditionLogic`. `CombatLogic`'s class
methods are thin gated entry points; the rules engine lives in
module-private functions (the `ConditionLogic` precedent — nothing routes
through the instance proxy mid-algorithm). All tuning is `combat.*`
AppSettings seeded from `config/app-settings.yaml` (no code defaults):
tick, poise thresholds/costs, tempo shape, per-band inflict energy,
max-beats.

## Deferred

Named at their sites; nothing inherited:

- **Consequence & progression (cycle-1 build 2)** — the derive-on-read
  **blame ledger** (append-only `combat_attribution_events`, the
  `RenownEvent`/`AuthoringEvent` shape), **two-stage death** (defeat →
  `unconscious` is separate from a slow, interruptible, telegraphed **coup**
  `DurativeActivity` on the downed body under lethal terms), **`isSentient`**
  (the three-case severity keying), combat **`Discipline`**s + per-exchange
  `ActSignature` minting ([advancement](./advancement.md)), and **`assess`**
  (a costed engaged perception act). The consented-duel demo.
- **Later cycles** — multi-party / the threat graph (this melee edge goes
  plural), weapon playstyle (reach/guard/balance-as-derived; `balanceFactor`
  populated from construction), full morale / de-escalation, stealth, the
  chase, non-humanoid bestiary, death/recovery + moderation, the client
  `CombatPane` (and the contextual gambit affordances — terse verbs afforded
  only in a fight — that supersede the static ones), and the **combat gym**
  balance harness.
- **Known engine seams from the live demo** — combat's tick is **game-time**,
  so `tickSeconds` doubles as pace *and* bleed-per-beat; a **real-time tick**
  (`ScheduleApi.recurring`) would decouple pace from the world-clock scale.
  A steady armed defender *always* parries and acting-first overextends into
  that guard first, so blind aggression loses to patience — wants attention
  in the experience pass. The `world.combat.exchange` topic wants a client
  font-register mapping. Unlike the metabolism/thermal drivers the beat loop
  has **no presence-freeze** — a fight ticks on against a linkdead combatant
  until `combat.maxBeats` forces a draw (bounded, not a leak; a presence-gate
  is a small follow-up, though "you can't rage-quit a fight" may be wanted).

## Cross-references

- **Substrate consumed:** [vitals](./vitals.md), [harm](./harm.md),
  [materials-response](./materials-response.md), [activity](./activity.md),
  [reactions](./reactions.md), [metabolism](./metabolism.md),
  [behavior](./behavior.md), [belief](./belief.md),
  [messaging](./messaging.md), [prose](./prose.md).
- **Structural precedent:** [npc-dialogue](./npc-dialogue.md) (the
  `DialogueConversation` `SustainedEngagement` twin).
- **Design surface:** [combat-slate](../slates/deferred-rpg/combat-slate.md),
  [combat-experience-slate](../slates/deferred-rpg/combat-experience-slate.md),
  [combat-tactics-slate](../slates/deferred-rpg/combat-tactics-slate.md),
  [party-slate](../slates/deferred-rpg/party-slate.md). Cycle-1 plan:
  `docs/plans/combat-core-plan.md` (build 2 pending).

## History

- **Cycle 1, build 1** (`feature/combat-core`, MR !131) — the terminal 1v1
  core: the session/hold/tick, `Poise`/`Tempo`/`CombatTerms`/`CombatFlags`/
  `Gambit`, the exchange-through-`inflict`, gambits-as-affordances +
  attempt-time gating + reactive dispatch, the arc-driven per-viewer
  narration + flavor lookup, the `combatant` brain, `CombatApi`/`CombatLogic`,
  the `attack` + `fight` command surface, and the treeline cull demonstrator.
  Incidental fixes forced by the live demo: the `wield`/`unwield` affordance
  (`WieldableMixin`), the missing `/obj/ParcelRegistry` seed (a latent
  fresh-DB bootstrap failure), the silent-fight-end bug, and the flat
  narration. `CombatantMixin` was composed onto `Character`; `Weapon` gained
  `balanceFactor`; `world.combat.exchange` joined `REACTABLE_TOPICS`.
