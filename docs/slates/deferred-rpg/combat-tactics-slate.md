# Combat tactics & engagement model (working slate)

> **Status: both theses SHIPPED; the ranged surface is what remains.**
> Thesis 1 (combat as an engagement graph, not geometry) shipped as the
> multi-party combat build's `CombatGraph`; Thesis 2 (party-level
> presets) shipped as the **combat-formations build** — renamed
> *formations* ("tactics" is DA:O's word for the per-character gambit
> scripting this design rejects), with the preset roster minus Skirmish,
> Master-Apprentice's reward knobs **superseded by the emergent
> economy** (no credit transfer, no scaling — see
> [combat-formations.md](../../subsystems/combat-formations.md), which is
> now the source of truth for everything party-strategy). What this slate
> still uniquely holds is **Thesis 1's ranged-as-relationship model**
> (kite / close / artillery over engaged-status, the `physical` conduit
> transmissivity channel, cover-as-status) — the design surface the
> deferred ranged-engagement build consumes. §"Thesis 2", the preset
> table, and the integration sketch below are historical; read them as
> the design record, not the current shape.

Working slate for **combat tactics**: the party-as-a-whole meta-strategy
layer, the abstract engagement model it rides, and why this — not
geometric ranged combat — is where a text game shines.

> **The combat system itself now has its own slate.** This slate's two
> theses — combat-as-engagement-graph and party-level tactic presets — are
> the *spatial* and *party-strategy* halves. The **terms/consent/blame
> frame, the loadout/affordance model, the expressive layer, and the
> moment-to-moment poise minigame** live in
> [combat-slate.md](./combat-slate.md), which was written after this one and
> supersedes its "combat system itself… not yet designed" deferral. This
> slate's *engagement graph* is that slate's *threat graph*; its
> Master-Apprentice preset is validated there against the poise economy.

The starting provocation was ranged combat. The conclusion was that
ranged combat *is* possible without sub-room geometry (it's an
abstraction problem, not a coordinate problem), but it isn't where games
like this shine. Chasing the same thread the other direction — *what
does* a text/multiplayer/AI-hosted world do better than a Unity
action-RPG? — lands on coordinated, legible, social party strategy. That
reframe is the point of this slate.

See also:

- [docs/subsystems/activity.md](../../subsystems/activity.md) — the shipped
  engagement framework (engagement slots `body`/`hands`/`attention`/
  `voice`, `SchedulerApi`, `SustainedEngagement`, abort reasons). A
  melee-lock *is* an engagement; a tactic is a sustained party-level
  engagement that allocates the individual ones. Read this first.
- [grouping subsystem](../../subsystems/grouping.md) — the party is a
  self-managed group (model B); a tactic is a property of the party.
  Combat/instance participants are an activity-bound group.
- [docs/slates/locomotion-as-activity-slate.md](../tails/locomotion-as-activity-slate.md)
  — the sibling "promote a synchronous system onto the activity
  framework" slate; combat would follow the same shape.
- [docs/design-philosophy.md](../../design-philosophy.md) — the "How this
  lands for ranged actions" and "hiding/cover as status, not position"
  sections are the spatial groundwork this slate builds on. Cover and
  flanking are *statuses*, not coordinates.
- [docs/interaction-philosophy.md](../../interaction-philosophy.md) — text is
  serial, not parallel; the keystone that the human interface *is* the AI
  interface. Both are load-bearing for why party tactics suit this medium.
- [docs/standard-model.md](../../standard-model.md) — tactics want to be
  authored `Idea` singletons (one per preset), parallel to
  `LocomotionMode`. Not a registry.

---

## Principle

1. **Combat is a relationship graph, not a coordinate space.** The atomic
   fact is "actor A is *engaged* with actor B" — a single edge between two
   actors, no position. Everything tactical (who can hit whom, who's
   protected, who's free) is a property of that graph.
2. **Codify emergent behavior; don't fight it.** Players will
   power-level, kite, and exploit. In a multiplayer world you can't stop
   them — so name it, rule it, and tune its rewards. Make them do it *by
   your rules.*
3. **Tactics are party-level presets, not per-character scripts.** One
   legible choice the party adopts, not a wall of per-actor IF/THEN
   gambits. Legibility is a text-medium requirement, not a nicety.
4. **It rides existing substrate.** Engagement framework + grouping +
   status effects + `Idea` singletons. No new geometry, no new
   coordinate model, no registry.

---

## Thesis 1 — Combat as engaged relationships (the spatial answer)

The provoking belief was "ranged combat needs sub-room geometry, which is
a different model — we might as well switch to Unity." Two claims hide in
that, and only one is true:

- **Geometric/ballistic ranged combat** (real coordinates, line-of-sight
  tracing, cover angles, distance-as-calculation) *is* a different model
  and a Unity-tier rabbit hole. Refuse it.
- **Ranged combat as a feeling** (archers plink from afar, skirmishers
  kite, melee must close, mages are artillery) does **not** need
  geometry. Tabletop has shipped it gridless for decades. It's an
  abstraction problem.

The reframe that makes it cheap: ranged isn't a *spatial* problem, it's a
*relationship* problem. One status does almost all the work — **"locked
in melee with X."**

- A **ranged** weapon can target anyone in the room (or through an open
  conduit). It imposes no lock.
- A **melee** weapon requires you be *engaged* with your target. Engaging
  is an action; an archer can't be hit until someone closes on them.
- **Kiting** = break engagement, move, fire. **Closing** = spend an
  action to engage. **Artillery** = fire from an adjacent room through a
  doorway you can't be meleed through.

That delivers the whole archer/skirmisher/mage fantasy with *zero*
geometry — just a binary engaged-status between actors. The machinery
already exists:

- **Engagement framework** (`activity.md`) — the `body` slot is exactly
  the shape a melee-lock wants; a combat round is a sustained engagement.
- **Room size** — `Location` already carries a size; "harder to hit
  across a big room" is a skill-check modifier, not a distance
  calculation.
- **Conduit transmissivity** — already channel-keyed for light and sound;
  `physical` is one more channel for "do arrows pass through this
  doorway / window / portcullis." (See design-philosophy "How this lands
  for ranged actions.")
- **Cover & flanking as status** — the two things that *seem* to demand
  geometry are already solved elsewhere as status, not position: hiding is
  a `Stealthing` perception-shadow; cover is the same trick — a
  `Covering` status that lowers hit chance — not "I'm behind the pillar at
  (4,7)."

It layers the way the rest of the engine does: engaged-vs-ranged within a
room (nearly free) → cross-room shots via conduit `physical` passability
(uses the room graph as the spatial model) → opt-in range bands for the
rare room that wants real tactical depth (the philosophy's "tagged
regions" tier, authored per-location, never global).

**Worth deleting the false belief, not just the feature.** The thing to
purge from the docs isn't "ranged combat" — it's the implied "...which
would force sub-room geometry," because that's the lie that makes the
only options look like "no ranged" or "rewrite in Unity."

---

## Thesis 2 — Party tactics (the marquee feature)

If combat is a graph of engaged relationships, then **a party tactic is a
policy over that graph** — rules about who's allowed to hold an
engagement, who intercepts when, who stays free. That's Dragon Age:
Origins' gambit system lifted from per-character scripting up to one
party-level choice.

### Lineage

- **Dragon Age: Origins** — real-time-with-pause plus per-character
  gambit AI ("IF enemy targets mage THEN taunt"). The keeper idea is
  *set policy, then watch it execute.* The discard is per-character
  scripting — a menu wall.
- **Ara: History Untold** — units adopt one of several configurations,
  each strong in different situations. The keeper idea is *a preset is a
  bundle with situational tradeoffs.*

Saxonberg's synthesis: **set-policy-then-watch, simplified from
per-character gambits to one party-level preset.** This is the crucial
move for *text*: DA:O's gambits are a wall of IF/THEN rows; a named
formation is one legible line — *"the party adopts Master-Apprentice"* —
and you read the consequences unfold. Text is bad at moment-to-moment
twitch and great at set-policy-then-watch; the "pause" is just the
natural cadence of prose.

### The standout preset — Master-Apprentice (codified power-leveling)

The behavior you can't stop: a veteran drags a newbie through content to
farm XP. The move from Principle 2: don't fight it — codify it. And in an
*educational* world, master-apprentice is **literally a teaching
relationship**, so the thing you'd normally nerf is the exact social
dynamic the product wants to manufacture. The exploit and the product
goal become the same act.

The mechanic:

- The **apprentice** (lower level) holds the primary engagement and takes
  the credit / killing blow → gets the XP.
- The **master** intercepts high-threat engagements ("defends from big
  stuff") → keeps the apprentice alive. (Interception = a
  status-reassignment trigger: when a high-threat enemy would engage the
  apprentice, the master auto-takes that engagement.)
- Because it's codified, you attach **rules and tradeoffs**: reward curve
  scaled so it reads as *teaching, not farming* (the master earns reduced
  rewards; maybe the apprentice earns a learning bonus — pedagogy again);
  a level-gap cap beyond which the tactic degrades or content scales.
  "Your rules" is the whole value: you get to set the knobs.

### The preset table (illustrative, not final)

A real design space, not one trick:

| Preset | Policy over the engaged-graph | Shines when |
|---|---|---|
| **Master-Apprentice** | junior holds engagement + credit; senior intercepts threats; rewards scaled | mentorship; mixed-level parties |
| **Focus Fire** | whole party piles engagement on one target | bursting priority threats |
| **Phalanx** | everyone covers everyone; low damage, high survivability | retreats; bad odds |
| **Skirmish / Kite** | ranged-led; refuse engagements; whittle | when Thesis 1's ranged model drives it |
| **Vanguard** | front line eats all engagements; back line free to nuke | glass-cannon alpha |
| *(none)* | no coordination; each-for-themselves | the default |

A preset is a named bundle: role assignments + interception rules +
reward/tradeoff knobs. Few and legible — resist a config-screen wall.

### Why this is text/social/AI-native

- **Legible** — one prose line per tactic, watched unfolding. Matches the
  serial medium instead of fighting it.
- **Social** — a party-level decision creates coordination, role
  negotiation, leadership: the social fabric the project leans on.
- **AI-native** — a mixed human+AI party can run a formation, each member
  reading the tactic and playing its role through the same command bus.
  In Master-Apprentice, *the master could be an AI tutor* — the
  "human interface is the AI interface" keystone and the education
  vertical, expressed through combat.

This is also the answer to "ranged isn't where these games shine": party
tactics is. If a combat sentence ever goes in the README or the
philosophy docs, it should be this, not arrows.

---

## Shape of the integration (sketch, not a build)

- **`CombatTactic`** as an authored `Idea` singleton, one template per
  preset (parallel to `LocomotionMode`). Carries the policy: role slots,
  interception predicate, reward modifiers. Not a registry.
- **The party** (a self-managed group, grouping subsystem model B) holds the
  active tactic and the role→member assignment.
- **A combat round** is a `SustainedEngagement` on the activity
  framework; the tactic is the policy the round consults when allocating
  individual engagements and resolving interceptions.
- **Engaged-status** is the atomic relationship (Thesis 1) the tactic
  operates on.
- **Cover / Stealthing** statuses supply flanking/cover without geometry.

---

## Open questions

1. **Combat exists first.** This whole slate presumes a combat system
   that isn't designed. The engagement model (Thesis 1) could be
   prototyped ahead of full combat; tactics (Thesis 2) cannot.
2. **Reward balance.** Codifying power-leveling means the master-apprentice
   reward curve must not be strictly better than playing straight.
   Requires actual numbers, i.e. requires combat to exist.
3. **Preset count.** How many presets before it's a menu wall? Lean few;
   add only when content asks.
4. **Interception resolution order.** When multiple party members could
   intercept, who wins? Probably a role-priority field on the tactic.
5. **Solo play.** Tactics are party-level; what does a solo actor get?
   Probably the `(none)` default plus self-targeted statuses.
6. **NPC / enemy tactics.** Do enemy groups adopt tactics too (symmetry),
   or is it player-only in v1? Symmetry is cleaner but doubles the design.

---

## What this slate does NOT cover

- **The combat system itself** — stats, damage, initiative, turn cadence,
  resolution math. All game-design-phase, not yet designed (combat ships;
  these specifics aren't pinned down).
- **Geometric/ballistic ranged combat** — explicitly refused (Unity
  territory).
- **The activity framework** — already shipped (`activity.md`).
- **The party/grouping subsystem** — its own slate.
- **Per-character behavior scripting** (DA:O-style gambits) — deliberately
  *not* the model; party-level presets replace it. A gambit layer could
  return later if players demand per-character control, but it's not the
  v1 thesis.

---

## Once shaped into formal requirements

When combat reaches the design phase, this slate boils down to:

- An **engaged-status** primitive between actors (melee-lock), ranged
  weapons that impose none, and the kite/close/artillery consequences —
  riding the `body` engagement slot.
- A **`physical` conduit transmissivity** channel for cross-room shots
  (one dimension alongside light/sound).
- **Cover** as a `Covering` status (sibling to `Stealthing`), supplying
  flanking without geometry.
- **`CombatTactic`** `Idea` singletons (one per preset) carrying policy;
  the party holding an active tactic + role assignment.
- The **preset set** (Master-Apprentice, Focus Fire, Phalanx, Skirmish,
  Vanguard, none) with their interception rules and reward knobs.
- **Master-apprentice reward scaling** + level-gap cap as the worked
  codify-don't-fight case.
- Tests: engaged-status gates melee but not ranged; an archer is
  untargetable by melee until engaged; a tactic reassigns an engagement
  on interception; master-apprentice routes credit to the apprentice with
  scaled rewards.

Geometric fidelity, per-character gambits, and enemy-side tactics wait
for their own waves — if they're ever asked for at all.
