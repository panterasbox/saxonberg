# Combat system (working slate)

> **Status: committed launch feature, design-phase.** Combat ships — the
> game won't launch without it — but the *rules* are still being designed.
> Nothing here is a build. This slate captures **the combat system itself**
> — the piece [combat-tactics-slate.md](./combat-tactics-slate.md)
> explicitly deferred ("stats, damage, initiative, turn cadence, resolution
> math… not yet designed"). It is the product of a long design pass and
> exists so that design doesn't evaporate in a chat log.
>
> **Read the two siblings first.** This slate owns the *terms-and-consent
> frame*, the *loadout/affordance model*, the *expressive layer*, and the
> *moment-to-moment minigame loop*. It does **not** re-derive:
> - [combat-tactics-slate.md](./combat-tactics-slate.md) — combat as an
>   **engagement graph** (the no-geometry spatial answer) + **party-level
>   tactic presets**. Its "engaged relationship graph" **is** the *threat
>   graph* this slate leans on; its Master-Apprentice preset is validated
>   here against the poise economy.
> - [../../subsystems/vitals.md](../../subsystems/vitals.md) — the
>   **consequence** substrate combat writes into (vital signs, anatomy /
>   `BodyPart` / tissue, the two-kind condition system incl. `Trauma`, the
>   `getConsciousness`/`getConditionBand` derived readouts, the death seam).
>   **No HP scalar** — combat honors that.

The one-sentence thesis: **combat is a consented, terms-bound, contracted
activity that is subordinate to the social contract — not a survival
loop.** Everything below is a consequence of taking that seriously.

See also:

- [../../subsystems/activity.md](../../subsystems/activity.md) — a combat
  session is a `SustainedEngagement` coroutine on the engagement framework
  (the `DialogueConversation` precedent in
  [../../subsystems/npc-dialogue.md](../../subsystems/npc-dialogue.md) is
  the near-exact structural twin: a terms-bound state machine pumping over
  game-time, detached choice-loop via `ScheduleApi` + `runRoot`).
- [../../subsystems/advancement.md](../../subsystems/advancement.md) —
  combat skills are `Discipline`s; each exchange mints an `ActSignature`
  ({discipline, difficulty, outcome}); competence is derived, bands-only.
- [economy-slate](../builds/economy-slate.md) + the employment engine —
  combat is one thing an **employment contract** asks for; coin flows from
  the contract, never from loot.
- [../../subsystems/reactions.md](../../subsystems/reactions.md),
  [../../subsystems/emotes.md](../../subsystems/emotes.md),
  [../../subsystems/messaging.md](../../subsystems/messaging.md),
  [../../subsystems/behavior.md](../../subsystems/behavior.md),
  [../../subsystems/trait.md](../../subsystems/trait.md),
  [../../subsystems/scripting.md](../../subsystems/scripting.md) — the
  **expressive layer** is authored on these, not on a bespoke combat-VFX
  system.
- [capability-magic-slate](./capability-magic-slate.md) — the
  channels-not-nouns "mechanism of injury meets material" decomposition;
  the magic-side mirror of the same affordance grammar.
- [materials-response-slate.md](./materials-response-slate.md) — the
  `mechanism × material × construction` response substrate combat is the
  first consumer of: armor mitigation (coverage × construction × material,
  layered) + `Trauma` generation from one function; weapon capabilities
  derived from construction.
- [party-slate.md](./party-slate.md) — the **party** the tactic, sides, and
  coup attribution all operate over (first-class Stuff; captain + roles;
  party-vs-combat-side; the guild≠party≠corp wall; reputation + odometer
  progression). Combat is the heaviest consumer of the party axis.
- [combat-experience-slate.md](./combat-experience-slate.md) — the
  **felt-experience companion**: the dramatic arc + beat-punctuation, the
  **poker-not-slots** randomness stance (epistemic not aleatory, the fog is
  the dice), earned crits, luck-as-emotional-weather, the loadout as a bag
  of portable reagents + genre-as-costume, the chemistry-set reagent shelf +
  composition rules, and how a determinism-first system gets balanced (the
  **combat gym** headless matchup-sweep). This slate owns the *mechanism*;
  that one owns the *experience*.

---

## Principle

1. **Terms-first, not HP-first.** A fight ends when the *agreed
   stop-condition* is met, not when a pool hits zero. Death is a term you
   opt into **and** must be authorized for; the default resolution is
   yield / subdual / incapacitation — which the vitals substrate already
   gives free (`getConsciousness → unconscious` is recoverable; `dead` is
   a separate lifecycle flip a driver must deliberately pull).
2. **Combat serves the economy; it does not feed a loot loop.** No
   kill-for-coin. A slime has no coin — the *contract to clear the slimes*
   pays, funded by whoever wants them gone. Gear is **bought or crafted**,
   an investment against future contracts, not the reward of the last kill.
3. **The mechanical core is a deliberately-boring commodity; the product
   is the reactive/expressive layer.** A text MUD cannot out-spectacle a
   3D MMO on the swing — so it doesn't try. It wins on the swing *meaning
   something, being witnessed, and reading differently to every observer*.
   That layer is an **authoring surface on existing substrate**, not engine
   work.
4. **One new subsystem, resting on four already-built layers.** The only
   genuinely new mechanism is the fast, session-scoped **poise** contest.
   Consequence (vitals/trauma), fatigue (metabolism reserves), affordances
   (augmentation / command-contribution), and the expressive layer
   (reactions / emotes / scene / brains / traits) already exist.

---

## Thesis 1 — The combat session (terms, consent, blame)

The load-bearing object is not a `Weapon` or a damage formula. It is the
**combat session** — a direct specialization of the *Contract* abstraction
(bounded terms, attribution, escrow-of-stakes, resolution). A session
carries:

- **Sides** — who is aligned with whom (parties, Thesis 5). Not just
  individuals.
- **Terms** — two knobs: **lethality** (non-lethal / lethal) and
  **stop-condition** (first-blood / yield / incapacitation / objective-met
  / death), plus **stakes** (what changes on resolution — coin, an item,
  standing, or nothing but bruises).
- **Consent** — who *proposed* the terms and who *accepted*. **Modeled
  like introductions** ([../../subsystems/npc-dialogue.md](../../subsystems/npc-dialogue.md)
  auto-introduce): your standing combat settings **pre-answer** the
  handshake silently; an explicit prompt surfaces **only when terms
  conflict** (someone brings lethal to your non-lethal). Bar fights stay
  frictionless; escalation is the thing that forces a decision.
- **Blame** — **derived, never a stat.** A record built from the session's
  initiation events: who escalated, who consented to what. The victim of a
  non-consented lethal attack never agreed to lethal terms, so the
  aggressor owns the blame — objectively, from the consent ledger. This is
  the [provenance](../builds/provenance-slate.md) move (attribution derived
  from events, un-spoofable) applied to violence.
- **Resolution** — how it ended, who yielded, the stakes-transfer.

The session runs as a `SustainedEngagement` on every participant.

### The severity model (the anti-murderhobo spine)

"Dead only for non-sentient things, otherwise stops when the contract
says" becomes a clean three-case rule keyed on **sentience** (already
available via species animacy):

1. **Non-sentient target** (vermin, beast, construct): lethal is the
   natural resolution — no consent, no blame. This is baseline newbie
   combat.
2. **Sentient target, consented**: a death-duel or a bar brawl — both
   parties agreed the terms, so even a lethal outcome is legitimate.
3. **Sentient target, non-consented lethal**: **the crime.** Not forbidden
   by a hard rule — you *can* — but it is legible, blame attaches, and the
   **world reacts** (standing/regard collapse, institutional response, the
   social-graph presence layer surfacing "X killed Y"). Murder is expensive
   because it is *seen and attributed*, not because a flag blocks it.

The **purge** is case 2 scaled up: an **institutional declaration**
(governance / office layer — a state of emergency) that temporarily makes
lethal force against a class of target *authorized*. It is content and a
rare event, never a baseline mode. This is how "no one runs around
murdering everyone" holds **without ever writing "you cannot attack."**

---

## Thesis 2 — Combat lives in the employment economy

Combat is a **skill vertical parallel to crafting**, never privileged. The
loop:

1. Take an **employment contract** (the economic frame; coin lives here).
2. The objective may *require* combat — or offer it as **one pathway among
   several** (the immsim multi-pathway principle: the bouncer who talks the
   drunk down and the one who subdues him complete the *same* contract —
   different skills, one state-change; **de-escalation is a combat skill**).
3. Exchanges mint `ActSignature`s → Transcript evidence → competence bands
   rise ([advancement](../../subsystems/advancement.md)).
4. Higher competence opens harder / better-paying contracts. Coin,
   reputation, and competence compound.

A pacifist can run a full career on non-combat contracts; a mercenary runs
combat ones. Both are valid — "specialization is the engine."

### Contract kinds that touch combat

Every one has an **authorizer, terms, and a stop-condition** — the
guardrail is baked into the economic frame, not bolted on as a rule.

| Contract | Combat shape | Default terms |
|---|---|---|
| **Pest / cull** | non-sentient targets | lethal-ok, no blame |
| **Guard / escort** | reactive — fight only if attacked; success = *the thing survives*, not enemies dead | non-lethal preferred |
| **Bouncer / peacekeeping** | subdual, ejection | non-lethal; stop at yield/removal |
| **Bounty / apprehension** | bring them in | **alive** default; dead-or-alive a gated, costlier variant |
| **Sparring / duel / training** | consented | non-lethal, first-blood/yield — the **safe, repeatable advancement engine**; where Master-Apprentice lives |
| **Arena / exhibition** | spectacle | consented (gladiatorial lethal *or* prizefight non-lethal); ties to the broadcast/capital layer |
| **Sanctioned purge / war** | institutionally declared | the rare authorized-lethal free-for-all |

None is "wander out and kill for loot."

### Party-shape and staffing (from the employment engine)

The **contract** declares a **party-shape requirement**
(satisfiable-by-an-individual vs requires-a-crew, with a size/role spec).
For a crew contract the **issuer** picks a **staffing model**:
**hire-a-formed-crew** (take an existing durable party as one unit) or
**hire-and-compose** (pick individuals, the issuer assembles the crew).
That choice sets **who the contracting party is**, which sets **payout and
blame flow**: hire-a-crew → the group is the party, payout+blame land on it
and split internally; hire-and-compose → each individual is a separate
contracting party.

---

## Thesis 3 — Loadout & affordances (what a gambit is made of)

A **gambit** is a deliberate combat move (Thesis 6). Gambits are ordinary
**affordances** — the engine already has a fully-built "where does a
capability come from" model, and combat invents no new one. Four conferral
channels map one-to-one onto the loadout layers:

- **Body / species** → `Species.innateMixins` intrinsic conferral
  ([augmentation](../../subsystems/augmentation.md)). Claws, horns, mass,
  a troll's resilience. Always-active, fixed.
- **Learned / skills** → the advancement **conferral seam**
  (`AdvancementMixin` re-pushes Catalog-declared verbs onto the affordance
  stack, **band-gated** via `Discipline.conferrals`). "Reach journeyman
  Blades → unlock disarm." The knowing→doing seam.
- **Worn / wielded** → `commandContributions` / the `InstanceContributor`
  per-instance seam ([command-routing](../../subsystems/command-routing.md)).
  A wielded weapon contributes its gambits while held.
- **Installed / augments** → `AugmentMixin.confers()` + aether-as-host — a
  combat implant confers gambits exactly like the wallet/comms/forums apps
  confer verbs. On-theme for the corpo world.

**The loadout is the union of your active affordance sources**, resolved
like every other verb menu.

### Instruments expose capabilities; gambits require them

Apply the channels-not-nouns discipline (the `ToolCapability` pattern in
[../../subsystems/crafting.md](../../subsystems/crafting.md) — "weapon" is a
*role*, not a type). Do **not** hardcode "sword → disarm":

- **Instruments expose capabilities** — `edge`, `point`, `blunt`, `reach`,
  `leverage`, `guard`, `entangle`. Equipment exposes them; **body parts are
  innate instruments** (fist = blunt, claw = edge/rend, horn = point, bulk
  = leverage/shove).
- **A gambit requires `{capability + skill-band}`** — "disarm" needs an
  instrument with `leverage` *and* disarm-competence. Any leverage
  instrument then affords it; skill gates execution. Additive, emergent —
  no weapon×move table.

### Three timescales, a live-editing menu

- **Fixed (body/species)** — innate instruments **and** the stat floor
  (mass → leverage/shove, reach, vital-band resilience). Species is *dual*:
  an affordance source and the stat substrate.
- **Durable (skills)** — the unlocks + the execution quality (competence
  weighting) + instrument-independent gambits (feint, read-the-opponent,
  tempo, **de-escalation**, command/tactics).
- **Swappable (equipment/augments)** — what you *bring*; the pre-fight
  decision; the economy hook (buy/craft your kit). Lights up the "loadout"
  concept [advancement](../builds/advancement-slate.md) left deferred.

**Union surface, cross-gated at attempt-time.** The gambit *menu* is the
union of all sources, but each gambit is **greyed out** unless the rest of
the loadout satisfies it (capability present + band met + the wielding part
still functional) — exactly how `@RequiresActive` gates an augment-verb, or
a credential record gates the verb its card affords.

**Injury edits the menu live.** Because body parts are instruments and the
anatomy substrate already disables slots on a `missing`/impaired part: a
laceration to the sword arm → the part impairs → the slot disables → the
wielded weapon drops from active instruments → its gambits grey out. Combat
**degrades your own affordances as it runs** — no special-casing, reusing
vitals machinery. This also reframes **armor** (the `SlotSpec.covers`
hit-location seam): armor **protects your affordances**, it does not inflate
an HP pool. You armor the sword arm to keep its gambits. Armor's *mitigation*
model — coverage × construction × material, **layered** — is its own
substrate ([materials-response-slate.md](./materials-response-slate.md));
"same steel, different form" (mail vs plate) is why it can't be a stat.

---

## Thesis 4 — The affordance taxonomy (three axes)

- **Activation**: **passive** (always-on) · **reactive/triggered**
  (auto-fires on an event — riposte-on-parry, counter-on-grab, rally-on-
  ally-down; this is "induces reactions" as a mechanic and is what makes a
  fight *branch* instead of loop) · **active** (the gambit), split by
  target — **self** (stance, brace, second-wind), **target** (disarm,
  press, subdue), **ally** (cover, feed-opening — the party moves), and
  **field** (parley, rally, formation shift — acts on the *threat graph*,
  the no-geometry substitute for "area" effects).
- **Effect domain**: **mechanical** (the thin resolution math — commodity)
  · **combat-state** (transient, session-scoped: staggered, off-balance,
  disarmed, prone, inspired — where the minigame's texture lives) ·
  **vitals/trauma** (the *lasting* residue + exit condition) ·
  **expressive/narrative** (emote, reaction, standing/regard/blame — the
  **differentiated product**, all existing substrate).
- **Persistence**: instant · **windowed** (opens a timed opportunity —
  reactive affordances + openings live here) · sustained (a stance with
  upkeep) · lasting (trauma).

Two variety levers, cleanly separated: **reactive-triggers + transient
state** give *systemic/emergent* variety (the engine owns the scaffold);
**authored decoration** gives *expressive* variety (creators own the
content).

---

## Thesis 5 — The expressive layer is the product (and it's already built)

The engine ships a **fair-but-boring resolution + a dense set of labeled
hook points**; content creators clothe the skeleton through the surfaces
they already use for everything else. Combat's job is to *emit the right
acts at the right hooks* and route them through existing substrate.

### One "boring" gambit, fanned out — a bar-fight shove

Only steps 2–3 (and the interaction in 4) are new engine code; everything
expressive is reuse:

1. **Afford/gate** — active-on-target, needs `leverage` (body qualifies),
   trivial skill floor. *(affordance stack — built)*
2. **Resolve** — thin: your leverage/mass vs their balance. *(new — core)*
3. **State** — on success impose transient **off-balance**; open a *window*
   (next gambit against them gets the opening bonus). *(new — transient
   layer)*
4. **React** — a `sure-footed` passive instead triggers *their* reactive
   counter. *(reactive affordance — new interaction, existing hook)*
5. **Express** — the shove is an **act** → the reaction producer → the
   packed bar's witness reactions aggregate, **volume-gated** ("the crowd
   roars," collapsed count). The victim emotes a stumble. *(reactions +
   `SoulMixin` — built)*
6. **Narrate** — composed per-viewer via MML: shover, victim, and bystander
   each get a different, perception-gated, register-styled line. *(scene
   composer + augmenters — built)*
7. **Consequence** — repeated shoving dents regard; the bouncer NPC's brain
   (witness trigger) moves to intervene; its **CK3 traits** decide warn-vs-
   subdue. *(brains + traits + regard — built)*
8. **Authored flavor** — "Dockside Mary plants a boot and heaves," a
   signature move hung on the on-commit hook. *(scripting/CMS — built)*

### The engine/creator boundary (state once)

- **Engine owns**: the fair resolution, the transient-state model, the
  threat graph, reactive-trigger dispatch, and — most importantly — the
  **hook points** and the reaction/emote/scene substrate they fire into.
- **Creators own**: everything hung on the hooks — signature moves, NPC
  combat personalities (brains), trait-driven expression, weapon/species
  flavor, scripted set-pieces, viewer-relative narration. **The
  personalization and RP reinforcement is theirs**, authored via
  CMS/scripting/brains/emotes/traits — not engine work.

This is the "systems not content, and the content is where the soul is"
doctrine, applied to combat's most spectacle-adjacent surface. The
discipline is to **resist building spectacle into the engine.**

---

## Thesis 6 — The poise minigame (the one new subsystem)

The moment-to-moment loop. Real-time, text, no geometry, competence-
dominant, and legible.

### The core move: one transient gauge, not a pile of states

Unify the *quantitative* transient state into a single session-scoped gauge
— **poise** (footing / guard / composure; the soulslike-posture lineage) —
and keep a *small* set of discrete **flags** for the qualitative states
(disarmed, prone, grappled, inspired). Why this cut:

- **Separates the minigame from the consequence.** Poise is fast,
  recoverable, **session-scoped** — it evaporates when the fight ends and
  never touches the `Creature`. Vitals/trauma stays the slow, lasting
  residue. You *win the exchange* by breaking poise; the trauma inflicted
  while a guard is broken is the lasting part and what trips the
  stop-condition.
- **Non-lethal and lethal are the same mechanic.** Both fights are a
  contest to break the other's poise. A bar fight cashes broken poise into
  a **yield**; a lethal fight cashes it into **trauma toward the death
  seam**. The terms decide only what an opening is *worth*.
- **Poise IS the tempo currency** — no separate "initiative points."

### The four-timescale stack (only the middle is new)

| Layer | Speed | Scope | Status |
|---|---|---|---|
| Vitals / trauma | slow | on the body | built (vitals) |
| **Endurance reserve** | medium | on the body | built (metabolism) — you *tire*; caps poise recovery |
| **Poise** | fast | on the session | **new** — the tactical contest |
| **Flags** (disarmed/prone/grappled/inspired) | fast | on the session | **new** — qualitative branches |
| **Threat graph** (who's on whom) | fast | on the session | from combat-tactics — the no-geometry tactical space |

### The economy: poise is both the target and the fuel (kills spam without cooldowns)

- **Base autocombat** (your tactic's policy, auto-ticking) slowly **erodes**
  both sides' poise — so fights trend toward a break, never stalemate.
- **Committing a gambit spends your own poise** (the *overextend* rule): a
  parried/whiffed attack leaves *you* open. Aggression is a **read**, not a
  spam. **[Decided: yes.]**
- **Exploiting an opening is cheap** — someone already paid to make it. A
  break opens a **binary, timed window** (open/not, N ticks) where
  committed gambits land hard / inflict real trauma / set a flag.
  **[Decided: binary-with-a-timer.]**
- **Defensive/reactive gambits restore poise but cost tempo.**

The loop: *press until you overextend → break their guard → exploit the
opening → back off to recover footing → re-engage.* Whoever **reads the
poise state better wins** — competence-dominant, judgment over reflexes.

**One gauge, not stanced/directional. [Decided: one]** — the threat graph
already supplies positional richness; a second axis is complexity a text
fight can't display cheaply.

### Tempo — the cadence (not "attacks per round")

The classic MUD round is a **legible narration beat** worth keeping — but its
lockstep drumbeat and its **"N attacks per round" scalar** are the crude
parts (the scalar is the flat-number lie — XP in armor). Replace the scalar
with an **emergent tempo rate** (the roguelike energy model): each combatant
accrues tempo at a rate and acts when it's ready, so a faster fighter simply
**acts more often** — no counted attacks, no leveled cadence.

The rate is **derived from dimensions already in the model**, not a new
lever: **tempo = weapon balance × encumbrance × endurance × competence.** The
light-weapon-is-fast / heavy-weapon-is-committal axis from
[materials-response-slate.md](./materials-response-slate.md) *is* the tempo
input; encumbrance and a draining endurance reserve slow it (a long fight
**decelerates the exhausted** — metabolism feeding cadence); competence makes
it economical. "Attacks per round" (a stored scalar you grind) becomes a
**derived, dynamic** rate — same familiar shape, honest provenance, no
scalar.

Two payoffs snap in: **tempo advantage = poise-pressure advantage** (more
actions erode a guard faster — the same pressure as reach-control and
focus-fire), and tempo governs the whole **directed-autocombat** loop (your
tactic auto-acts and your gambit windows arrive *at your tempo rate* — a
faster fighter gets more base exchanges *and* more gambit openings; still
character-paced, never APM).

### The tick loop (on the engagement coroutine)

The tick is the **narration beat, not the mechanical quantum** — resolve
finely, narrate coarsely (exactly what a text medium needs). The session is a
`SustainedEngagement` coroutine on the game clock (~a few game-seconds/tick —
readable in text). Each tick:

1. Resolve base exchanges on every active threat edge — **each combatant gets
   the exchanges its tempo affords this beat** (fractional tempo accumulates
   and carries, so a fast fighter resolves >1 and a slow one <1 per beat;
   competence-weighted poise trades, per each side's tactic). The scene
   composer collapses the beat's flurry into one readable prose chunk.
2. Apply **queued gambits** — **non-blocking**: you queue an intent and it
   lands next tick; ignore it and your tactic auto-plays. This is *directed
   autocombat* — trustable semi-attended, meaningfully better fully-
   attended, never twitchy.
3. Check for breaks → open/close windows; set/clear flags.
4. Fire **reactive triggers** on poise events (a parry restores your poise
   *and* opens the attacker — **defense is generative**).
5. Fire hooks + broadcast the per-viewer scene (Thesis 5).

### Concurrency — a cooperative coroutine, never a worker

Combat runs on the **single game thread as a cooperative coroutine** (the
scripting/activity model), **not** on a worker thread — a settled decision so
nobody reopens it. Three reasons:

- **JS can't share the object graph.** `worker_threads` share only
  `SharedArrayBuffer` bytes or structured-clone copies; the mutable Stuff
  graph (Characters, vitals, loadout, live-ref threat edges, the Location)
  can't cross a thread. Threading combat would mean an isolate-with-a-copy
  (serialize in / merge out) — and the merge is the trap below.
- **The boundary is intrinsically fluid.** Combat *merges* (a third party /
  guard joins across two fights), *splits* (the chase fragments the party),
  and *leaks into the world* every beat (flee / pursue / an item breaks /
  someone walks in). A concurrency model needs a *stable* boundary to lock
  around; combat has the least stable boundary in the game — so it's the
  **worst** threading candidate, not the best. The minigame-ness makes it a
  clean **coroutine**, not a clean thread. And on the single thread, splits
  and merges are *trivial* (a synchronous combine, no locking) precisely
  because nothing else runs during them.
- **There's no CPU pressure to relieve.** A beat is microseconds of
  band/poise arithmetic + a scene compose, every few seconds; the bottleneck
  is I/O, and combat state is in-memory-transient (only outcomes persist).

Async ≠ parallel: the coroutine already gives non-blocking interleaving and
logical isolation with **zero race surface**. If long-running commands ever
detach, they detach as **background coroutines on this thread**, never
workers (thread only the *stateless, CPU-heavy pure computations* — procgen,
rendering — never world-entangled game logic). The **only** discipline this
needs, in place of a concurrency model, is **bounded beats**: no single tick
does unbounded work (already ensured by volume-gated reaction fan-out, small
parties, a bounded threat graph; a beat may yield mid-resolution if ever
needed).

### Legibility

Poise shows **banded and perception-gated** ("steady / pressed / reeling /
broken / open"), never a number — the condition-band doctrine. You read
your own footing precisely; you read the **enemy's** only as well as your
competence allows (an unskilled fighter misreads a feint as a real opening
and gets countered on the commit). **Reading the fight is itself a skill
expression** ([belief](../../subsystems/belief.md)/perception gating).
Openings surface as **previewed-command affordances** in the combat pane
("*Mary is open — [disarm] [subdue] [strike]*").

### Multi-party, tactics, and Master-Apprentice fall out

The **threat graph** is the geometry substitute, and poise makes it matter:
being **focus-fired splits your guard** (poise erodes faster with more
incoming edges; you **can't recover** while focus-fired). That single rule
generates the tactics — peel, focus-fire, protect-the-VIP — and validates
combat-tactics-slate's Master-Apprentice preset against the economy:

> **The hard case:** the master spends poise to make openings they *don't*
> cash, and absorbs threat — under naive rules they'd bleed out first,
> which is backwards.
>
> **It holds emergently**, from three rules already in the model:
> **(1)** defense is generative (parry restores poise + opens the
> attacker); **(2)** openings are **ally-exploitable** (the apprentice
> cashes the master's break); **(3)** **competence is the exchange rate**
> (a veteran erodes less, recovers faster, breaks guards with smaller
> commits). Result: master and apprentice run the *same* counter tactic —
> **sustainable for the veteran, suicidal for the newbie, purely because
> competence sets the rate.** Mentorship is *access to a playstyle you
> can't yet run yourself, executed on your behalf.* No exception in the
> rules.
>
> **Bonus feature — teaching is mechanically rewarding.** No credit
> transfer: each actor banks their **own** `ActSignature`s. The apprentice
> cashes openings → *offensive* signatures; the master parries / creates
> openings / holds the graph / commands → *defensive / tactical / command*
> signatures. The master advances the exact disciplines that make them a
> better master — and those are otherwise the hardest to train (you can't
> grind command solo). **The game pays veterans to invest in newbies, in a
> currency they can't earn any other way** — a pro-social incentive for
> free, dead-on for the cooperative north-star.
>
> **Honest crediting — difficulty is per-act, not per-enemy.** *Creating*
> the opening is the hard act (credited to the master, high difficulty);
> *exploiting* an already-broken guard is easier (credited to the
> apprentice at the lower "exploit" difficulty). Assisted finishes earn
> **real but modest** evidence — enough to climb, not enough to skip
> graduation. No "assisted-kill discount" hack; the world-grounded
> per-sub-check difficulty already does it.

### Stop-condition reads the stack (ties terms + traits together)

The agreed **terms** decide which layer's threshold ends it: first-blood
reads trauma; a bar fight reads broken-poise-plus-a-will-check (and
**traits** decide — a brave NPC fights on with a broken guard, a craven one
yields the moment it cracks); to-the-death reads the vitals death seam. No
special cases.

---

## Thesis 7 — Resolution & exits (how a fight ends)

A fight is a **race between the parties' competing goals**, not a march to
one shared stop-condition. Split the two:

- **Terms** = the consented *shared frame* (lethality, is-this-a-duel,
  stakes) — Thesis 1.
- **Goals** = *per-party objectives within the frame*, and they diverge. A
  bounty hunter's goal is *capture alive*; the quarry's is *escape*. A
  bouncer's is *drive out*; the drunk's is *stay and drink*. A duelist's is
  *break guard → take the yield*.

The session resolves the instant **any party reaches its goal** — which
unifies with the contract model: **contract → goal → stop-condition.** Goals
include the non-offensive ones (**escape / survive-until-help /
hold-position / drive-off / capture-alive / protect-VIP**), exactly what a
contract-driven world needs. So **fleeing is pursuing the "escape" goal, not
failing** — the reframe that makes flight first-class.

### The three exit families

A session ends when **any** fires:

| Family | How | Outcome |
|---|---|---|
| **Resolution** | a party reaches its goal | achieved / yield-taken / incapacitation / first-blood / death / **escaped** |
| **Withdrawal** | a party opts out | **yield** (concede — accept the outcome) or **flight** (refuse — leave unresolved) |
| **Dissolution** | nobody wins | **draw** (mutual exhaustion / disengage) · **interruption** (third-party / environment / authority / linkdead) · **objective-moot** |

**Failure is normal and non-catastrophic** — a draw has no winner and no
stakes transfer; an individual goal can fail inside a resolution (botched
flight → caught; botched capture → escaped). "The target got away" is a
contract/narrative input, not a game-over.

### Fleeing — a contestable maneuver, not a button

Flight is a **multi-step sequence** (2+ ticks), contestable at each step:
**break engagement** (shed the melee edges locking you — the engager
contests) → **transition + traverse** (move out, possibly switching
locomotion mode) → **get out of reach** (pursuers must re-close). Two costs
keep it honest:

- **Poise-state cost — punished if you run badly.** Breaking away exposes
  you; fleeing *composed* is a clean disengage, fleeing *reeling* eats a
  free hit (the poise-native opportunity attack). *When* you run is a skill.
- **Terms/standing cost.** Fleeing a consented duel is dishonor; a contract
  you took, breach; a lethal ambush, mere survival. An exit with a social
  price scaled by the frame.

### The chase — a persistent pursuit-session on a decaying tether

Two layers; conflating them is the trap:

- **The melee edge** (a threat-graph lock) is **location-local** — it breaks
  the instant you traverse out.
- **The pursuit** (the session) is the **persistent meta-engagement** — "A
  is hunting B" survives the room change.

The chase is the session in a **second mode**, and the **contest axis
flips**: a stand-up fight is a *poise* contest; a chase is an **endurance +
mobility + navigation** contest. Poise *recovers* while running (both sides)
— the question is whether you can *lose them or outlast them*, gated by
locomotion mode + encumbrance (the plate knight can't sustain the chase; the
skirmisher can always leave — the emergent balance from Thesis 6).

It ends on **loss of the contact tether**, which decays three ways:

- **Escape (contact lost)** — open a lead, break line-of-sight at a branch
  (**perception-gated** — did they see which way you went? a crowd / corner
  / darkness helps), a **mode escape** (into water / up a wall / on the wing
  they can't follow — instant break), or reach a **sanctuary**.
- **Corner** — dead-end / closed gap → a melee edge reforms, poise contest
  resumes with whatever endurance remains.
- **Abandon** — the pursuer's cost exceeds the value → they break off.

Guaranteed to terminate (the tether decays, endurance floors). Multi-room
but self-limiting.

### Two-stage death — the anti-instakill keystone

You cannot kill a sentient in one blow, or even one continuous action. Death
is **two stages**:

- **Stage 1 — defeat:** win the poise contest → break guard → down them →
  **unconscious** (recoverable). This *ends the fight* (incapacitation).
  They're alive, at your mercy.
- **Stage 2 — execution:** a **separate, deliberate, slow, interruptible,
  telegraphed** coup-de-grâce on the downed body — *only* under
  lethal-authorized terms (an unauthorized one is murder → the blame
  ledger). A durative engaged act ("X stands over Y, blade raised…") anyone
  present can interrupt.

The elegant property: **the window always exists, but it only *bites* where
there are witnesses/interveners.** On an empty field, down ≈ dead (finish at
leisure, no clunk); in a crowded street, the down→coup gap is where the
world piles in. **Anti-instakill friction ∝ social density** — cities safe,
wilderness deadly — for free. Non-sentient targets (vermin) skip Stage 2.
This does **triple duty**: it enables guard intervention (below), protects
players from street-ganks, and reinforces consent/blame (killing is a
visible, deliberate, blameable *choice made over a body*, not a burst).

### Coup attribution — tactic-governed, except blame

Who finishes a downed foe (and who bears it) is **governed by the party's
tactic** — three facets:

1. **The right/permission** — the tactic gates *who may* coup, killing the
   "everyone stabs the body" scrum and making the finish a **role-assigned
   deliberate act** (which also gives a guard/ally one clear cooper to stop).
2. **The credit** (deed → advancement/renown) — routed by the *same role
   structure that cashes openings* (master-apprentice → the apprentice banks
   it).
3. **The decision authority** (mercy vs execution — the *call*) — a
   **command function**: a hierarchical tactic gives the leader the call over
   the fallen, an egalitarian one leaves it to whoever's engaged. Deciding
   the fate of the fallen is leadership, and it advances the command
   disciplines.

**The exception is blame** — institution-derived, never tactic-decided (the
"engine = facts, institutions = legitimacy" line). The engine *records the
facts* (striker + tactic + directive + roles + authorization, including that
a directed tactic implies **command responsibility**); the guard/law/court
*derives* blame per its rules. So **credit and blame can diverge**: under an
unlawful master-apprentice kill the apprentice earns the *deed* while the
master bears the *command responsibility* — a real accountability model that
falls out of the tactic logging the directive. (Solo: you own your own coup.
The fallen's allies can contest it — their tactic matters too.)

### Guards — an application, not an engine feature

City guards that stop fights and deter them are **content** (a `guards`
brain — see [../../subsystems/behavior.md](../../subsystems/behavior.md)),
and the engine-guaranteed intervention window is what *makes them possible*.
Everything they need exists: **detection is free** (combat is loud/witnessed
— the reactions substrate; a patrol's witness trigger catches it; lethal
escalation is extra-telegraphed); they **read the blame ledger** to act
against the *aggressor* (legitimacy over the engine's facts); they
**intervene** with existing tools (interpose / redirect threat edges /
demand a cease / **arrest** as a capture goal → **pursue** the fleeing
aggressor via the chase); **presence deters** (initiation is a witnessed
act, so a guard witnessing the *start* steps in before blows); and their
real weapon is **legitimacy** (fighting the law is a massive blame
escalation, so most yield — the guard out-legitimizes rather than
out-fights). Instakills would collapse this chain, which is why Stage-2
death is load-bearing.

### Mechanically

Rides the hook catalog: `combat.session.resolved` carries an **outcome
discriminator** (`achieved | yielded | escaped | draw | dissolved`); flight
is `combat.graph.broken` + a locomotion traverse + a **pursuit-decision** the
engager's tactic answers; the pursuit persists as the session across
`combat.graph.*` re-engagements until the tether breaks; the coup is a
durative engaged act with its own commit/interrupt hooks. New first-class
state: **per-party goals** on the session, the **pursuit/contact tether**,
and the **downed/coup** sub-state.

---

## The hook-point catalog (the engine deliverable)

The small, knowable engine surface: the labeled points a combat session
fires so the **expressive/authoring layer** (Thesis 5) has somewhere to
attach. Get this right and the content surface writes itself.

### Governing principles

1. **Session-scoped seams + message frames — NOT new global events.**
   Honors [behavior.md](../../subsystems/behavior.md)'s "no new global
   events." A hook fires *inside* the session state machine to (a) the
   participants' attached brains / per-instance contributors and (b) the
   witness set via ordinary `MessageApi.scene` frames — which already carry
   `meta.commandId`, so the existing **witness → reaction → narration** path
   consumes them for free. A hook becomes a *global* signal only where a
   global consumer already exists: a reactable act (`ReactionFiredEvent`),
   a death (the social-graph presence relay), a contract completion
   (employment).
2. **Every hook is two-faced.** *Outward* = a per-viewer broadcast
   (narration + reaction). *Inward* = an extension call the combatants'
   own brains / scripted responders / instance contributors answer.
3. **Narration is always per-viewer and perception-gated** — identity via
   `RecognitionApi`, poise banded, trauma severity perception-gated
   ([belief.md](../../subsystems/belief.md)).
4. **Only the dramatic beats are reactable.** The ticky substrate
   (`pressed`, `tick`, graph churn) is narration-only or silent; the
   reaction substrate is volume-gated but you still don't route every poise
   tick through it.
5. **Small canonical emit-set; convenience triggers are derived filters.**
   `first-blood`, `ally-down`, and `on-witness` are *views* over the
   canonical hooks, not separate emits.

### Consumer classes (the legend)

| | Class | Backed by (mostly built) |
|---|---|---|
| **N** | Narrate — per-viewer scene line | scene composer + MML + `markupAugmenters`; authorable Liquid via `ProseApi` (the `social.presenceFormat` precedent) |
| **R** | React — witnessable act | `noteReactableAct` (producer-site subject capture) → `react` verb + `ReactionFiredEvent` → renown |
| **X** | Reactive — engine consults attached reactive affordances (riposte/counter) | **new dispatch point**; affordances are content over the conferral channels |
| **B** | Brain — NPC picks next tactic/gambit/emote | [behavior.md](../../subsystems/behavior.md) witness/engage triggers (needs a **combat-brain trigger set**) |
| **A** | Author — decoration hung on the hook (signature emote / scripted set-piece) | scripting/CMS + `InstanceContributor` |
| **L** | Ledger — mints a record | advancement `ActSignature` · renown `RenownEvent` · standing/regard · chronicle `recordDeed` · **the blame ledger (new)** |

### Session lifecycle

| Hook | Fires when | Payload | Consumers |
|---|---|---|---|
| `combat.session.proposed` | terms proposed (handshake opens) | proposer, invitees, proposedTerms | N · B(accept/counter/decline) · A |
| `combat.session.opened` | terms accepted; sides enter engagement | sides, terms, initiation record | N · B(opening tactic) · **L(blame: record initiator/aggressor)** |
| `combat.session.tick` | each coroutine pump | tickIndex, batched edge results | engine only; scene batches — silent unless a beat fires |
| `combat.session.resolved` | a party reaches its goal / withdraws / dissolves | **outcome**{`achieved`\|`yielded`\|`escaped`\|`draw`\|`dissolved`}, yielder, stakesTransfer, termsHonored | N · L(blame finalize · standing · renown) · contract-completion · chronicle |
| `combat.session.aborted` | external interrupt (linkdead/flee/3rd-party) | reason (`ScriptAbortReason`-like) | N · engagement cleanup · B |

### Threat graph (the no-geometry tactical space)

| Hook | Fires when | Payload | Consumers |
|---|---|---|---|
| `combat.graph.engaged` | A locks onto B (melee lock) | attacker, defender, instrument | N · B · tactic policy |
| `combat.graph.broken` | engagement released (kite/peel) | who, why | N · B |
| `combat.graph.redirected` | interception (master absorbs an edge / taunt) | fromTarget, interceptor | N · B · (Master-Apprentice) |
| `combat.graph.focus` | a target becomes / ceases focus-fired | target, incomingCount | N(on cross) · B(call peel) · poise-erosion rate |

### Exchange (the core loop)

| Hook | Fires when | Payload | Consumers |
|---|---|---|---|
| `combat.exchange.committed` | a gambit is thrown, pre-resolution | actor, gambit, target/ally/field, instrument, poiseSpent | N(wind-up) · A(signature move) · X(target's reactive window) · B |
| `combat.exchange.resolved` | outcome computed | actor, target, gambit, outcome, poiseΔ(both), openingOpened?, flagSet?, trauma? | N · R · L(offensive `ActSignature`, per-act difficulty) · B |
| ↳ `outcome: parried` | defender parried | + riposte window **on the attacker** | X(defense-is-generative) · N · R |
| ↳ `outcome: miss/whiff` | committer overextended | committer poise spent, self-open | N · X(counter window) |
| `combat.exchange.pressed` | base-autocombat poise erosion (per edge/tick) | actor, Δ, band | N **only** on band-boundary cross; else silent |
| `combat.exchange.broken` | poise crosses to broken → **opening** opens (binary/timed) | actor(open), window, breaker | N(dramatic) · R · B(**ally-exploit**) · affordance surfacing ("*Mary is open — [disarm][subdue]*") |
| `combat.exchange.expired` | opening window closed unexploited | actor recovered | N · B |
| `combat.exchange.recovered` | footing restored (backed off / not focus-fired) | actor | N(on cross) · B |

### State flags (qualitative branches)

| Hook | Fires when | Payload | Consumers |
|---|---|---|---|
| `combat.state.set` | disarmed / prone / grappled / inspired applied | actor, flag, source | N · R(disarm/prone are beats) · **affordance recompute (the menu edit)** · B |
| `combat.state.cleared` | stood up / rearmed / broke grapple | actor, flag | N · affordance recompute |

### Body (the consequence bridge into vitals)

| Hook | Fires when | Payload | Consumers |
|---|---|---|---|
| `combat.body.trauma` | a `Trauma` is afflicted | target, trauma{type,site,severity}, inflicter, mechanism, **first?** | N(severity-banded, perception-gated) · R · `vitals.afflict` · affordance recompute(limb impaired → menu edit) · L(offensive `ActSignature` · renown · blame if lethal-on-non-consent) |
| `combat.body.condition` | condition band changes (hurt→serious→critical) | target, band | N · B(yield input) |
| `combat.body.downed` | target unconscious (**the common non-lethal terminus** — recoverable) | target, cause | N · stop-condition(incapacitation) · engagement cleanup · B · **ally-down** trigger |
| `combat.body.death` | lifecycle flip to `dead` (**lethal-authorized only**) | target, causeOfDeath, killer, termsContext | N · L(**blame — crime unless authorized** · standing collapse · renown · chronicle deed/crime) · social presence relay ("X killed Y") · contract-completion |

### Terms (the consented exits)

| Hook | Fires when | Payload | Consumers |
|---|---|---|---|
| `combat.terms.yieldOffered` | a combatant offers to yield / calls parley | yielder, toWhom | N · B/settings of recipient(accept vs press — **traits decide**) |
| `combat.terms.yieldResolved` | accepted or refused | yielder, recipient, accepted? | N · session.resolved(if accepted) · L(blame if refused-and-pressed under non-lethal) |
| `combat.terms.violated` | a blow after an accepted yield, or lethal exceeding non-lethal terms | aggressor, victim, termViolated | **L(blame — crime marker)** · N · standing collapse · R |

### Derived triggers (filters over the canonical set — not emits)

- **first-blood** = the first `combat.body.trauma` with `first: true` (both
  a stop-condition and a beat).
- **on-ally-down** = `combat.body.downed`/`death` filtered to same-side
  viewers (the rally trigger).
- **on-witness** = the *consumption* side (`SensorMixin`) of any **R** hook
  — how bystander brains and the crowd react. Not an emit; it's the
  existing witness path.

### The blame ledger's feed

Blame is **derived by replaying attribution hooks**, never a stamped stat
(the [provenance](../builds/provenance-slate.md) move). Exactly three hooks
write attribution: `combat.session.opened` (initiator/aggressor from the
initiation record), `combat.terms.violated` (the crime marker), and
`combat.body.death` under non-consent/unauthorized terms (the heavy crime).

### What's actually new here

Routing combat's hooks into existing consumers is most of the work; the
catalog surfaces only **three genuinely new engine pieces**:

1. **The reactive-affordance dispatch point** (X) — the engine consulting
   attached riposte/counter affordances at `parried`/`whiff`/`grab` points.
2. **The combat-brain trigger set** (B) — extending the witness trigger
   vocabulary so brains fire on combat hooks.
3. **The derived blame ledger** (L) — a replay-reader over the three
   attribution hooks.

Everything else (N/R/A + most of L) is reuse.

### A sequenced trace (a non-lethal duel)

Shows the hooks firing in legible order and covering the loop:

```
session.proposed (non-lethal, stop=yield) → session.opened
 → [ exchange.pressed ×n ]                       (base autocombat erodes poise)
 → A: exchange.committed (press)
 → B parries → exchange.resolved (parried) + riposte window on A   (X)
 → B: exchange.committed (riposte into A's open guard)
 → exchange.resolved (hit) → A's poise breaks → exchange.broken (A open)
 → B: exchange.committed (disarm into the opening)
 → exchange.resolved (hit, flagSet=disarmed) → state.set (disarmed; A's blade gambits grey)
 → A: terms.yieldOffered → B accepts → terms.yieldResolved (accepted)
 → session.resolved (B wins; non-lethal honored)
 → L: both bank their own ActSignatures; renown updates; NO blame (consented)
```

---

## The client experience (UX tiers)

Structure only — the arrangement/density is playtest + A/B territory. What's
settled is *which surfaces exist, what each reads, and the discipline they
obey.*

### Combat is a summoned overlay, NOT a layout swap

Two tiers, both server-authoritative (the client owns **zero** command
semantics):

- **Default — a summary pane**, summoned on `combat.session.opened` and
  dismissed on `combat.session.resolved` (the `SettingsPane` summoned-pane
  tier; additive, degrades gracefully). One glanceable box: terms, the graph
  in miniature, your state, the gambit bar. **The world/prose stream stays
  primary** — the fight happens *in the room*, and the per-viewer combat
  narration *is* that stream. We do **not** hide the prose behind a
  video-game combat screen; the prose is the game.
- **Opt-in — `layout combat`**, a dedicated control-deck arrangement (the
  `streamer` layout precedent) for the rich multi-display view. Promoted via
  the `layout` verb, **never automatic** (honors no-auto-switch — summoning
  an additive overlay ≠ reorganizing the workspace).

### The panel inventory

Each is a live-subscribed view + previewed-command affordances; **every
button previews its real command on hover** (the global rule — the bar is
the training-wheels view of the CLI: a newbie clicks `[disarm]`, sees
`disarm mary`, learns the verb; a veteran just types it; same bus).

- **Engagement/threat graph** — nodes = combatants (identity via
  `RecognitionApi`), edges = who's locked on whom, sides tinted, focus-fire
  visible; each node a *banded* condition color + *banded* poise ring,
  **perception-gated by the server** (you read enemies only as well as your
  competence allows; the client never receives hidden data). Small +
  glanceable, not an MMO minimap. Clicking a node previews a targeting
  command.
- **Selected-target read + hit-location** — coarse target state, drilling
  into a **body silhouette** (the `SlotSpec.covers` map) showing armored /
  injured / exposed parts; during an **opening**, the exposed parts light up
  and clicking one previews a **called-shot** gambit. *Hit-location is core,
  not a frill* — it's the targeting surface for the coverage-based armor
  model ([materials-response-slate.md](./materials-response-slate.md)).
- **Your own vitals** — full fidelity (you know your own body): condition
  band, poise band, active flags, endurance reserve, and **impaired parts**
  (which double as *why* some gambits are greyed).
- **Terms banner** — always visible: lethality (color-coded), stop-condition,
  stakes, and **your blame status** (aggressor? within authorized terms?).
  The **consent handshake** surfaces here on conflicting terms.
- **Gambit bar** — the currently-affordable gambits (cross-gated live; greyed
  when capability/band/state fails), the **opening** affordances with their
  timer, the **tactic** selector, the **queued** gambit (directed-autocombat),
  and the always-available `[yield] [parley] [disengage]`.

All honesty doctrines hold: **bands not numbers**, enemy state hedged /
your own precise, buttons that are really verbs.

---

## Settled decisions (this pass)

1. **One poise gauge** — not stanced/directional.
2. **Gambits cost your own poise** (the overextend rule) — the self-
   limiting economy, no cooldowns.
3. **Openings are binary-with-a-timer** — open/not + N-tick window.
4. **Consent works like introductions** — settings pre-answer, prompt only
   on conflicting terms.
5. **Severity is sentience-keyed three-case** — non-sentient lethal-ok /
   sentient-consented / sentient-non-consented-lethal = the attributed
   crime; purge = institutional authorization.
6. **Blame is derived from initiation events** (the provenance move), never
   a stat.
7. **Each actor banks their own `ActSignature`s**; per-act (not per-enemy)
   difficulty.
8. **Combat is a summoned summary pane by default; `layout combat` is an
   opt-in denser arrangement** — not a layout swap; the world/prose stays
   primary; the client owns zero command semantics.
9. **Hit-location is core, not deferred** — believable armor is coverage,
   not a stat; the mitigation model is its own substrate
   ([materials-response-slate.md](./materials-response-slate.md)).
10. **Combat is a race between per-party goals** — terms = the shared frame,
    goals = per-party objectives; contract → goal → stop-condition; it ends
    on the first goal reached, a withdrawal (yield/flight), or dissolution.
    Fleeing = pursuing the escape goal, not failing.
11. **Two-stage death (anti-instakill)** — defeat (down → unconscious, ends
    the fight) is separate from execution (a deliberate, slow, interruptible,
    telegraphed coup, lethal-terms-only); the window always exists, bites
    only where witnessed (friction ∝ social density); non-sentient skips it.
12. **The chase is a persistent pursuit-session on a decaying contact
    tether** (contest-axis flipped to endurance/mobility/navigation); ends on
    contact-loss / corner / abandon; multi-room, self-limiting; fleeing
    punished if reeling.
13. **Coup attribution: the tactic governs the right, the credit, and the
    decision-authority; blame is institution-derived from the tactic-recorded
    facts** (command responsibility) — so credit and blame can diverge.
14. **Guards are content** (an npc-behavior brain reading the blame ledger
    and using the engine-guaranteed intervention window), not an engine
    feature.
15. **Cadence is emergent tempo, not attacks-per-round** — action frequency
    is a *derived, dynamic* rate (weapon balance × encumbrance × endurance ×
    competence), fractional-accumulated per beat; the tick is a **narration
    beat** (resolve finely, narrate coarsely), not a lockstep drumbeat or a
    grindable scalar.
16. **Combat is a single-thread cooperative coroutine, never a worker** — JS
    can't share the Stuff graph, combat's split/merge boundary is
    intrinsically fluid (the *worst* threading candidate, not the best), and
    there's no CPU pressure to relieve; **bounded beats** is the only
    discipline needed (no concurrency model).

---

## Open questions

1. **The competence→exchange-rate curve** — *the* load-bearing tuning knob.
   Must be steep enough that defensive play flips from fatal to generative
   across the mentoring band, shallow enough that high-level fights don't
   trivialize. Estimator/tuning territory (the advancement-slate residual).
   The **structure is sound; the numbers are the risk.** *De-risking
   approach:* the **combat gym** — because the session is a
   deterministic-given-information single-thread coroutine, run it headless
   at scale (skill × loadout × terrain matchup sweeps) and read the outcome
   distribution to find the numbers before players do. See
   [combat-experience-slate.md](./combat-experience-slate.md) Thesis 9.
   (RNG, crits, and luck are also resolved there: poker-not-slots, earned
   crits, luck-as-emotional-weather — not open questions.)
2. **Tick tempo** — how many game-seconds per tick balances readability vs
   responsiveness in text.
3. **Transient-state storage** — session-scoped state object vs a third
   kind in the vitals condition collection. Lean **session-scoped** (poise
   is a fact of *this fight*).
4. **The hook-point catalog** — **resolved: see § The hook-point catalog**
   above. The canonical emit-set (session / graph / exchange / state / body
   / terms), the six consumer classes, the derived triggers, the blame
   feed, and the three genuinely-new engine pieces (reactive-affordance
   dispatch · combat-brain trigger set · derived blame ledger).
5. **NPC/enemy tactic symmetry** — do enemy groups run tactics + gambits
   too (cleaner, doubles the design), or is the full loop player-side v1
   with brain-driven enemies? (Brains already pick tactics/gambits/emotes
   reactively; see [behavior](../../subsystems/behavior.md).)
6. **De-escalation as a first-class resolution path** — the verbs/skills
   that end a combat contract *without* combat; how "talked them down"
   mints advancement evidence.
7. **Group payout/blame split** — the mechanics of internal division for a
   hire-a-crew contract (reuses the banking remittance-split seam).
8. **How the terms handshake renders** — the client surface for propose /
   counter / accept / yield / parley (the prompt-stack + previewed-command
   surfaces).

---

## What this slate does NOT cover

- **The engagement graph + party tactic presets** — owned by
  [combat-tactics-slate.md](./combat-tactics-slate.md) (its graph *is* the
  threat graph; its preset table is the tactic vocabulary this loop
  consults).
- **The vitals consequence substrate** — owned by
  [vitals.md](../../subsystems/vitals.md) (Trauma, anatomy, death seam,
  condition bands). Combat *writes into* it; it isn't re-specified here.
- **The capability/mechanism-of-injury channel decomposition** — owned by
  [capability-magic-slate](./capability-magic-slate.md) ("damage type" is
  explicitly not the model).
- **The `mechanism × material × construction` response substrate** — armor
  mitigation + trauma generation, the construction vocabulary, layered
  coverage, weapon-capability-from-construction — owned by
  [materials-response-slate.md](./materials-response-slate.md). Combat is its
  first consumer.
- **Specific numbers** — all resolution constants, band thresholds, the
  exchange-rate curve. Game-design/tuning, deferred to a running game.
- **Geometric/ballistic ranged combat** — refused (combat-tactics Thesis 1;
  ranged is a *relationship* problem, not a coordinate one).

---

## Once shaped into formal requirements

The buildable spine, in rough order:

1. The **combat session** object — sides, terms (lethality × stop-condition
   × stakes), the consent handshake (settings-pre-answer + conflict
   prompt), derived **blame**, resolution — as a `SustainedEngagement`
   coroutine (the `DialogueConversation` shape).
2. The **poise** transient layer — one session-scoped banded gauge, the
   overextend spend, binary timed **openings**, base-autocombat erosion,
   focus-fire-gated recovery, endurance-reserve cap — and the **flags** set
   (disarmed/prone/grappled/inspired) that edit affordances.
3. The **threat graph** as the tactical space (from combat-tactics) + the
   tick loop with **non-blocking queued gambits**.
4. **Gambits as affordances** over the four conferral channels;
   instruments-expose-capabilities + `{capability + band}` gates;
   attempt-time cross-gating; injury-edits-the-menu.
5. The **hook-point catalog** + routing combat acts through the reaction /
   emote / scene / brain / trait substrate (the expressive layer).
6. The **severity rule** (sentience three-case + institutional
   authorization for the purge) and the sentience/animacy gate.
7. Advancement wiring — combat `Discipline`s, per-exchange `ActSignature`s,
   per-act difficulty, the Master-Apprentice credit split.
8. **Resolution & exits** — per-party goals on the session; the three exit
   families; fleeing (multi-step, punished-if-reeling) + the chase
   (pursuit-session, decaying tether, endurance/mobility/navigation);
   two-stage death (defeat vs interruptible coup); coup attribution
   (tactic-governed right/credit/decision, institution-derived blame); the
   `guards` brain as the first intervention consumer.

Tests gating: a non-consented lethal attack attributes blame to the
initiator; terms auto-resolve when settings agree and prompt when they
conflict; poise breaks open a timed window an ally can exploit; a committed
gambit spends the actor's poise; a disarmed/lost limb greys its gambits; a
witnessed act fans reactions volume-gated; Master-Apprentice routes the
finish to the apprentice while both bank their own signatures; a
non-sentient target resolves lethal with no blame while a sentient one
defaults to non-lethal yield; a downed sentient cannot be killed except by a
separate interruptible coup a bystander can stop; fleeing while reeling is
punished while a composed disengage is clean; a chase ends when the contact
tether breaks (lead / mode-escape / lost sight); a guard witnessing an
unlawful fight intervenes against the aggressor.

Numbers, enemy-side tactic symmetry, and the full de-escalation verb suite
wait for their own waves.
